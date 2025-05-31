
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

// Improved PDF text extraction function
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string for text extraction
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // More comprehensive text extraction patterns
    const textPatterns = [
      // Text in parentheses - most common PDF text format
      /\(((?:[^()\\]|\\[\\()nrtbf]|\\[0-7]{1,3})*)\)/g,
      // Text between BT (Begin Text) and ET (End Text) operators
      /BT\s+(.*?)\s+ET/gs,
      // Tj and TJ operators (show text)
      /\[(.*?)\]\s*TJ/g,
      /\((.*?)\)\s*Tj/g,
      // Text after font selection
      /\/F\d+\s+\d+\s+Tf\s+(.*?)(?=\/F\d+|\n|$)/g,
      // Direct text patterns (fallback)
      /[A-Za-z]{3,}[A-Za-z\s.,;:!?-]+/g,
    ];
    
    // Extract text using all patterns
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let text = match[1];
          // Clean up PDF escape sequences and encoding
          text = text
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\\[0-7]{1,3}/g, '') // Remove octal escape sequences
            .replace(/\s+/g, ' ')
            .trim();
          
          if (text && text.length > 2 && /[a-zA-Z]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Additional cleanup and formatting
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\@\-\(\)\+\#\:\/\%\&]/g, ' ')
      .replace(/\b[A-Z]{2,}\b/g, match => 
        match.length > 3 ? match.charAt(0) + match.slice(1).toLowerCase() : match
      )
      .trim();
    
    console.log('Extracted text length:', extractedText.length);
    console.log('Sample text (first 500 chars):', extractedText.substring(0, 500));
    
    // If we got very little text, try a simpler approach
    if (extractedText.length < 100) {
      console.log('Trying fallback text extraction...');
      // Look for any readable text patterns
      const fallbackText = pdfString.match(/[A-Za-z][A-Za-z\s.,;:!?-]{10,}/g);
      if (fallbackText) {
        extractedText = fallbackText.join(' ').replace(/\s+/g, ' ').trim();
        console.log('Fallback extracted text length:', extractedText.length);
      }
    }
    
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
        console.warn('Very little text extracted from PDF, trying direct approach...');
        // Try to extract any visible text
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const textAttempt = decoder.decode(new Uint8Array(pdfBuffer));
        const readableText = textAttempt.match(/[A-Za-z][A-Za-z\s.,;:!?-]{20,}/g);
        resumeText = readableText ? readableText.join(' ') : 'Unable to extract sufficient text from PDF.';
      }
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      resumeText = 'PDF content could not be extracted. Please ensure the PDF contains extractable text.';
    }

    console.log('Final resume text for AI processing:', resumeText.substring(0, 300));

    // Enhanced prompt specifically for candidate profile fields
    const prompt = `
    You are an expert resume parser. Extract structured information from the following resume text and return ONLY a valid JSON object.

    Resume Text:
    "${resumeText}"

    Extract the following information and return as JSON:

    REQUIRED FIELDS:
    - skills: Array of technical and professional skills (programming languages, tools, frameworks, soft skills)
    - experience_years: Number of years of work experience (calculate from dates or stated experience)
    - title: Current or most recent job title
    - summary: Professional summary or objective (2-3 sentences)
    - education: Highest degree, field of study, and institution
    - location: Current location or address
    - phone: Phone number if present
    - linkedin_url: LinkedIn profile URL if present
    - github_url: GitHub profile URL if present
    - portfolio_url: Portfolio or website URL if present

    RULES:
    1. Return ONLY valid JSON, no other text
    2. Use null for missing information
    3. For skills, include both technical (languages, frameworks) and soft skills
    4. For experience_years, calculate total years from employment history
    5. Extract qualifications and certifications into education field
    6. Be comprehensive but accurate - only extract what's clearly stated

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
            content: 'You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON with no additional formatting or text.' 
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
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
      
      // Clean up the response to extract JSON
      let cleanContent = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON object from the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      extractedData = JSON.parse(cleanContent);
      console.log('Successfully parsed extracted data:', extractedData);
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content that failed to parse:', openAIData.choices[0].message.content);
      
      // Return error instead of fallback to ensure we know when parsing fails
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response. Please try again.',
        success: false,
        rawResponse: openAIData.choices[0].message.content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare update data with better validation
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map extracted fields with validation
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      updateData.skills = extractedData.skills.filter(skill => skill && typeof skill === 'string');
    }
    
    if (extractedData.experience_years !== null && !isNaN(Number(extractedData.experience_years))) {
      updateData.experience_years = Math.max(0, Number(extractedData.experience_years));
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
    
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim()) {
      updateData.phone = extractedData.phone.trim();
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
      message: 'Resume data extracted and profile updated successfully',
      extractedFields: Object.keys(updateData).filter(key => key !== 'resume_content' && key !== 'updated_at')
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
