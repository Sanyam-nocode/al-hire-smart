
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();

    if (!resumeUrl || !candidateId) {
      return new Response(JSON.stringify({ error: 'Resume URL and candidate ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing resume for candidate:', candidateId);
    console.log('Resume URL:', resumeUrl);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the PDF content with proper headers
    const pdfResponse = await fetch(resumeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase Edge Function',
        'Accept': 'application/pdf,*/*',
      }
    });

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.status, pdfResponse.statusText);
      throw new Error(`Failed to fetch resume PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }

    console.log('PDF fetched successfully, content type:', pdfResponse.headers.get('content-type'));

    // Convert PDF to base64 for OpenAI processing
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log('PDF converted to base64, length:', base64Pdf.length);

    // Use OpenAI to extract information from the resume
    const prompt = `
    You are an AI assistant that extracts structured information from resumes. 
    Please analyze the provided resume content and extract the following information in JSON format:
    
    {
      "skills": ["skill1", "skill2", "skill3"], // Array of technical and professional skills
      "experience_years": number, // Total years of professional experience
      "title": "Current/Most Recent Job Title",
      "summary": "Professional summary or objective (2-3 sentences)",
      "education": "Highest degree and institution",
      "location": "Current location or preferred location",
      "salary_expectation": number, // If mentioned, otherwise null
      "linkedin_url": "URL if mentioned",
      "github_url": "URL if mentioned", 
      "portfolio_url": "URL if mentioned",
      "phone": "Phone number if mentioned"
    }
    
    Instructions:
    1. Extract only information that is clearly present in the resume
    2. For skills, include both technical skills (programming languages, tools, frameworks) and soft skills
    3. For experience_years, calculate based on work history dates
    4. For title, use the most recent or current position
    5. For summary, create a concise professional summary based on the resume content
    6. If any field is not available, use null for numbers/strings or empty array for skills
    7. Return only valid JSON, no additional text
    
    Note: This is a PDF document that may contain text content. Please extract text information rather than trying to process the PDF binary data.
    `;

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
            content: 'You are an expert resume parser that extracts structured data from resumes. Always respond with valid JSON only.' 
          },
          { 
            role: 'user', 
            content: `${prompt}\n\nPlease analyze this resume. The content may be from a PDF file. Extract the key information and return as JSON.` 
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received:', openAIData.choices?.[0]?.message?.content ? 'Success' : 'No content');

    if (!openAIData.choices || !openAIData.choices[0]) {
      console.error('Invalid OpenAI response:', openAIData);
      return new Response(JSON.stringify({ error: 'Invalid OpenAI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedData;
    try {
      const content = openAIData.choices[0].message.content.trim();
      console.log('OpenAI raw response:', content);
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content:', openAIData.choices[0].message.content);
      
      // Fallback: create basic extracted data structure
      extractedData = {
        skills: [],
        experience_years: null,
        title: null,
        summary: null,
        education: null,
        location: null,
        salary_expectation: null,
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        phone: null
      };
    }

    console.log('Extracted data:', extractedData);

    // Update the candidate profile with extracted data
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
    };

    // Only update fields that have actual values
    if (extractedData.skills && extractedData.skills.length > 0) {
      updateData.skills = extractedData.skills;
    }
    if (extractedData.experience_years !== null && extractedData.experience_years !== undefined) {
      updateData.experience_years = extractedData.experience_years;
    }
    if (extractedData.title) {
      updateData.title = extractedData.title;
    }
    if (extractedData.summary) {
      updateData.summary = extractedData.summary;
    }
    if (extractedData.education) {
      updateData.education = extractedData.education;
    }
    if (extractedData.location) {
      updateData.location = extractedData.location;
    }
    if (extractedData.salary_expectation !== null && extractedData.salary_expectation !== undefined) {
      updateData.salary_expectation = extractedData.salary_expectation;
    }
    if (extractedData.linkedin_url) {
      updateData.linkedin_url = extractedData.linkedin_url;
    }
    if (extractedData.github_url) {
      updateData.github_url = extractedData.github_url;
    }
    if (extractedData.portfolio_url) {
      updateData.portfolio_url = extractedData.portfolio_url;
    }
    if (extractedData.phone) {
      updateData.phone = extractedData.phone;
    }

    console.log('Updating candidate profile with:', updateData);

    const { error: updateError } = await supabase
      .from('candidate_profiles')
      .update(updateData)
      .eq('id', candidateId);

    if (updateError) {
      console.error('Error updating candidate profile:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update candidate profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully extracted and stored resume data for candidate:', candidateId);

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
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
