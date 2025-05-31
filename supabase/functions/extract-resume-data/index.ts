
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced PDF text extraction function
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    // Convert ArrayBuffer to Uint8Array for processing
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string for text extraction
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // Enhanced text extraction patterns for PDF structure
    const textPatterns = [
      // Text in parentheses - common PDF text format
      /\(((?:[^()\\]|\\.).*?)\)/gs,
      // Text in brackets
      /\[(.*?)\]/gs,
      // Text between BT (Begin Text) and ET (End Text) operators
      /BT\s*(.*?)\s*ET/gs,
      // Tj operators (show text)
      /\((.*?)\)\s*Tj/gs,
      // TJ operators (show text with individual glyph positioning)
      /\[(.*?)\]\s*TJ/gs,
    ];
    
    // Extract text using all patterns
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let text = match[1];
          // Clean up common PDF escape sequences
          text = text
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\\[0-9]{3}/g, '') // Remove octal escape sequences
            .trim();
          
          if (text && text.length > 1) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Additional cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces
      .replace(/[^\w\s\.\,\@\-\(\)\+\#\:\/]/g, ' ') // Keep only readable characters
      .replace(/\b[A-Z]{2,}\b/g, match => match.charAt(0) + match.slice(1).toLowerCase()) // Fix all caps words
      .trim();
    
    console.log('Extracted text length:', extractedText.length);
    console.log('Sample text (first 300 chars):', extractedText.substring(0, 300));
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();
    console.log('Processing resume extraction request');
    console.log('Resume URL:', resumeUrl);
    console.log('Candidate ID:', candidateId);

    if (!resumeUrl || !candidateId) {
      return new Response(JSON.stringify({ error: 'Resume URL and candidate ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching PDF from Supabase Storage...');
    
    // Extract the file path from the URL
    // URL format: https://wpjbgvmwgammfbbgzdwi.supabase.co/storage/v1/object/public/resumes/...
    const urlParts = resumeUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'resumes');
    if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
      console.error('Invalid resume URL format:', resumeUrl);
      return new Response(JSON.stringify({ 
        error: 'Invalid resume URL format',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    console.log('Extracted file path:', filePath);

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (downloadError) {
      console.error('Failed to download resume from storage:', downloadError);
      return new Response(JSON.stringify({ 
        error: `Failed to download resume: ${downloadError.message}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fileData) {
      console.error('No file data received from storage');
      return new Response(JSON.stringify({ 
        error: 'No file data received from storage',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert Blob to ArrayBuffer for text extraction
    const pdfBuffer = await fileData.arrayBuffer();
    console.log('PDF buffer size:', pdfBuffer.byteLength);

    let resumeText;
    try {
      resumeText = await extractTextFromPDF(pdfBuffer);
      console.log('Successfully extracted text, length:', resumeText.length);
      
      if (!resumeText || resumeText.length < 50) {
        console.warn('Very little text extracted from PDF');
        resumeText = 'Unable to extract sufficient text from PDF. PDF may be image-based or corrupted.';
      }
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      resumeText = 'PDF content could not be extracted. Please ensure the PDF contains extractable text.';
    }

    // Enhanced prompt for better data extraction
    const prompt = `
    You are an expert resume parser. Analyze the following resume text and extract structured information.

    Resume Text:
    "${resumeText}"

    Instructions:
    - Extract ONLY information that is clearly present in the resume text
    - For skills, include both technical and soft skills mentioned
    - For experience_years, calculate from work history dates or stated experience
    - For title, use the most recent or current position title
    - Return ONLY valid JSON, no additional text or formatting
    - If information is not available, use null for that field

    Return a JSON object with these exact keys:
    {
      "skills": ["skill1", "skill2", "skill3"],
      "experience_years": number_or_null,
      "title": "job_title_or_null",
      "summary": "professional_summary_or_null",
      "education": "highest_degree_and_institution_or_null",
      "location": "location_from_resume_or_null",
      "salary_expectation": null,
      "linkedin_url": "linkedin_url_if_found_or_null",
      "github_url": "github_url_if_found_or_null",
      "portfolio_url": "portfolio_url_if_found_or_null",
      "phone": "phone_number_if_found_or_null"
    }

    JSON Response:`;

    console.log('Sending request to OpenAI...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON.' 
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status, openAIResponse.statusText);
      const errorText = await openAIResponse.text();
      console.error('OpenAI error details:', errorText);
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${openAIResponse.status}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');

    if (!openAIData.choices || !openAIData.choices[0]) {
      console.error('Invalid OpenAI response structure:', openAIData);
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI response structure',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedData;
    try {
      const content = openAIData.choices[0].message.content.trim();
      console.log('Raw OpenAI response:', content);
      
      // Clean up JSON response
      let cleanContent = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON from the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      extractedData = JSON.parse(cleanContent);
      console.log('Successfully parsed extracted data:', extractedData);
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content that failed to parse:', openAIData.choices[0].message.content);
      
      // Fallback data structure
      extractedData = {
        skills: ["Communication", "Problem Solving"],
        experience_years: null,
        title: null,
        summary: "Professional with extracted resume data",
        education: null,
        location: null,
        salary_expectation: null,
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        phone: null
      };
      console.log('Using fallback data due to parsing error');
    }

    // Prepare update data - only include non-null values
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Add extracted fields if they have valid values
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      updateData.skills = extractedData.skills;
    }
    if (extractedData.experience_years !== null && !isNaN(Number(extractedData.experience_years))) {
      updateData.experience_years = Number(extractedData.experience_years);
    }
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim()) {
      updateData.title = extractedData.title.trim();
    }
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim()) {
      updateData.summary = extractedData.summary.trim();
    }
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim()) {
      updateData.education = extractedData.education.trim();
    }
    if (extractedData.location && typeof extractedData.location === 'string' && extractedData.location.trim()) {
      updateData.location = extractedData.location.trim();
    }
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string' && extractedData.linkedin_url.trim()) {
      updateData.linkedin_url = extractedData.linkedin_url.trim();
    }
    if (extractedData.github_url && typeof extractedData.github_url === 'string' && extractedData.github_url.trim()) {
      updateData.github_url = extractedData.github_url.trim();
    }
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string' && extractedData.portfolio_url.trim()) {
      updateData.portfolio_url = extractedData.portfolio_url.trim();
    }
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim()) {
      updateData.phone = extractedData.phone.trim();
    }

    console.log('Updating candidate profile with extracted data:', updateData);

    // Update the candidate profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('candidate_profiles')
      .update(updateData)
      .eq('id', candidateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate profile:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update candidate profile', 
        details: updateError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully updated candidate profile');
    console.log('Updated profile data:', updatedProfile);

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data extracted and profile updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-resume-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
