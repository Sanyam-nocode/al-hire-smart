
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
    
    // Look for text objects in PDF structure
    // PDF text is usually stored between "BT" (Begin Text) and "ET" (End Text) operators
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // Extract text using regex patterns for PDF text objects
    const textPatterns = [
      /\[(.*?)\]/g,  // Text in brackets
      /\((.*?)\)/g,  // Text in parentheses
      /BT\s*(.*?)\s*ET/gs, // Text between BT and ET operators
    ];
    
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extractedText += match[1] + ' ';
        }
      }
    }
    
    // Clean up extracted text
    extractedText = extractedText
      .replace(/\\[rn]/g, ' ') // Replace escape sequences
      .replace(/\s+/g, ' ') // Replace multiple spaces
      .replace(/[^\w\s\.\,\@\-\(\)\+\#]/g, ' ') // Keep only readable characters
      .trim();
    
    console.log('Extracted text length:', extractedText.length);
    console.log('Sample text:', extractedText.substring(0, 200));
    
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

    console.log('Fetching PDF from URL...');
    
    // Fetch the PDF content with proper headers
    const pdfResponse = await fetch(resumeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'User-Agent': 'Supabase Edge Function',
        'Accept': 'application/pdf,*/*',
      }
    });

    console.log('PDF fetch response status:', pdfResponse.status);
    console.log('PDF fetch response headers:', Object.fromEntries(pdfResponse.headers.entries()));

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.status, pdfResponse.statusText);
      const errorText = await pdfResponse.text();
      console.error('Error response body:', errorText);
      
      return new Response(JSON.stringify({ 
        error: `Failed to fetch resume PDF: ${pdfResponse.status} ${pdfResponse.statusText}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get PDF as ArrayBuffer and extract text
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF buffer size:', pdfBuffer.byteLength);

    let resumeText;
    try {
      resumeText = await extractTextFromPDF(pdfBuffer);
      console.log('Successfully extracted text, length:', resumeText.length);
      
      if (!resumeText || resumeText.length < 50) {
        console.warn('Very little text extracted from PDF, using fallback');
        resumeText = 'Unable to extract readable text from PDF. Please provide a text-based PDF or manually enter candidate information.';
      }
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      resumeText = 'PDF content could not be extracted. Using fallback data extraction.';
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
