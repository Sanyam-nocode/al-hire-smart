
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();
    console.log('=== ENHANCED RESUME EXTRACTION REQUEST ===');
    console.log('Resume URL:', resumeUrl);
    console.log('Candidate ID:', candidateId);

    if (!resumeUrl || !candidateId) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        error: 'Resume URL and candidate ID are required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== CALLING ENHANCED PDF PARSER ===');
    
    // Call the enhanced parseResume function first
    const { data: parseData, error: parseError } = await supabase.functions.invoke('parseResume', {
      body: { resumeUrl }
    });

    console.log('=== ENHANCED PARSE RESPONSE ===');
    console.log('Parse Data:', JSON.stringify(parseData, null, 2));
    console.log('Parse Error:', parseError);

    let resumeText = '';
    let extractionMethod = 'none';

    if (parseError || !parseData?.success) {
      console.log('=== STANDARD PARSER FAILED, TRYING PREPROCESSOR ===');
      
      // Try the preprocessing function as fallback
      const { data: preprocessData, error: preprocessError } = await supabase.functions.invoke('preprocess-pdf', {
        body: { resumeUrl }
      });

      console.log('=== PREPROCESSOR RESPONSE ===');
      console.log('Preprocess Data:', JSON.stringify(preprocessData, null, 2));
      console.log('Preprocess Error:', preprocessError);

      if (preprocessError || !preprocessData?.success) {
        console.error('Both parsing methods failed');
        return new Response(JSON.stringify({ 
          error: 'All PDF parsing methods failed. The PDF might be corrupted, password-protected, or in an unsupported format.',
          success: false,
          debugInfo: {
            parseError: parseError?.message || parseData?.error,
            preprocessError: preprocessError?.message || preprocessData?.error,
            parseData: parseData?.debugInfo,
            preprocessData: preprocessData?.debugInfo
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      resumeText = preprocessData.extractedText || '';
      extractionMethod = 'preprocessor';
    } else {
      resumeText = parseData.text || '';
      extractionMethod = 'standard-parser';
    }

    console.log('=== FINAL EXTRACTED TEXT ANALYSIS ===');
    console.log('Extraction method used:', extractionMethod);
    console.log('Text length:', resumeText.length);
    console.log('Text content preview (first 500 chars):', resumeText.substring(0, 500));
    console.log('Text content preview (middle 500 chars):', resumeText.substring(Math.floor(resumeText.length/2), Math.floor(resumeText.length/2) + 500));
    console.log('Text content preview (last 500 chars):', resumeText.substring(Math.max(0, resumeText.length - 500)));

    // Check if we have enough meaningful text
    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or heavily formatted.',
        success: false,
        debugInfo: {
          extractionMethod,
          textLength: resumeText.length,
          textSample: resumeText,
          recommendations: [
            'Try converting the PDF to text format first',
            'Ensure the PDF is not password-protected',
            'Check if the PDF contains selectable text (not just images)',
            'Try a different PDF if possible'
          ]
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced text cleaning for better AI processing
    const cleanedText = resumeText
      .replace(/[^\x20-\x7E\s]/g, ' ') // Remove non-printable characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    console.log('=== CLEANED TEXT FOR AI ===');
    console.log('Cleaned text length:', cleanedText.length);
    console.log('Cleaned text preview:', cleanedText.substring(0, 1000));

    // Enhanced OpenAI prompt with better instructions
    console.log('=== CALLING OPENAI WITH ENHANCED PROMPT ===');
    const prompt = `You are an expert resume parsing assistant. Extract information from the following resume text. 

IMPORTANT: The text below may contain some formatting artifacts or encoding issues. Please extract the meaningful information and ignore any garbled text.

Extract the following details and return as JSON (return ONLY valid JSON, no markdown):

{
  "personal_info": {
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin_url": "",
    "github_url": "",
    "portfolio_url": ""
  },
  "professional_summary": {
    "current_role": "",
    "summary": "",
    "total_experience_years": "",
    "industry": ""
  },
  "education": {
    "qualification": "",
    "institution": "",
    "graduation_year": "",
    "additional_qualifications": ""
  },
  "skills": {
    "technical_skills": [],
    "programming_languages": [],
    "tools_and_frameworks": [],
    "soft_skills": []
  },
  "work_experience": {
    "companies": [],
    "roles": [],
    "current_company": "",
    "current_position": "",
    "key_achievements": []
  },
  "additional_info": {
    "certifications": [],
    "awards": [],
    "projects": [],
    "languages": []
  }
}

Resume text to parse:
"${cleanedText}"

Additional context: This text was extracted from a PDF and may contain formatting artifacts. Focus on extracting meaningful information and ignore any garbled characters or encoding issues.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert resume parser. Extract information precisely from text that may contain formatting artifacts. Return only valid JSON without markdown formatting.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status);
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
    console.log('=== OPENAI RESPONSE RECEIVED ===');
    console.log('OpenAI response structure:', {
      choices: openAIData.choices?.length || 0,
      hasContent: !!openAIData.choices?.[0]?.message?.content
    });

    if (!openAIData.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure');
      return new Response(JSON.stringify({ 
        error: 'Invalid response from AI service',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response with enhanced error handling
    console.log('=== PARSING ENHANCED AI RESPONSE ===');
    let extractedData;
    const rawAIContent = openAIData.choices[0].message.content;
    
    console.log('=== RAW AI RESPONSE ===');
    console.log('AI content length:', rawAIContent.length);
    console.log('AI content preview:', rawAIContent.substring(0, 2000));
    
    try {
      let content = rawAIContent.trim();
      
      // Clean any markdown formatting more aggressively
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      content = content.replace(/^[^{]*/, ''); // Remove everything before first {
      content = content.replace(/[^}]*$/, ''); // Remove everything after last }
      
      // Find JSON object with better regex
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      console.log('=== CLEANED AI CONTENT FOR PARSING ===');
      console.log('Cleaned content:', content.substring(0, 1000));
      
      extractedData = JSON.parse(content);
      console.log('Successfully parsed enhanced extracted data:', JSON.stringify(extractedData, null, 2));
      
    } catch (parseError) {
      console.error('Enhanced JSON parse error:', parseError);
      console.error('Content that failed to parse:', rawAIContent);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to parse enhanced AI response as JSON',
        success: false,
        debugInfo: {
          rawResponse: rawAIContent,
          parseError: parseError.message,
          extractedText: cleanedText.substring(0, 1000),
          extractionMethod
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update database with extracted data
    console.log('=== UPDATING DATABASE WITH ENHANCED DATA ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map extracted data to profile fields
    const personal = extractedData.personal_info || {};
    const professional = extractedData.professional_summary || {};
    const education = extractedData.education || {};
    const skills = extractedData.skills || {};
    const work = extractedData.work_experience || {};
    const additional = extractedData.additional_info || {};

    // Update profile fields if data exists
    if (personal.email && typeof personal.email === 'string' && personal.email.includes('@')) {
      updateData.email = personal.email.trim().substring(0, 255);
    }
    
    if (personal.phone && typeof personal.phone === 'string') {
      updateData.phone = personal.phone.trim().substring(0, 20);
    }
    
    if (personal.location && typeof personal.location === 'string') {
      updateData.location = personal.location.trim().substring(0, 200);
    }
    
    if (personal.linkedin_url && typeof personal.linkedin_url === 'string') {
      updateData.linkedin_url = personal.linkedin_url.trim().substring(0, 500);
    }
    
    if (personal.github_url && typeof personal.github_url === 'string') {
      updateData.github_url = personal.github_url.trim().substring(0, 500);
    }
    
    if (personal.portfolio_url && typeof personal.portfolio_url === 'string') {
      updateData.portfolio_url = personal.portfolio_url.trim().substring(0, 500);
    }

    if (professional.current_role && typeof professional.current_role === 'string') {
      updateData.title = professional.current_role.trim().substring(0, 200);
    }
    
    if (professional.summary && typeof professional.summary === 'string') {
      updateData.summary = professional.summary.trim().substring(0, 1000);
    }
    
    if (professional.total_experience_years) {
      const experience = parseInt(professional.total_experience_years);
      if (!isNaN(experience) && experience > 0 && experience <= 50) {
        updateData.experience_years = experience;
      }
    }

    // Combine education information
    const educationParts = [];
    if (education.qualification) educationParts.push(education.qualification);
    if (education.institution) educationParts.push(education.institution);
    if (education.graduation_year) educationParts.push(education.graduation_year.toString());
    if (education.additional_qualifications) educationParts.push(education.additional_qualifications);
    
    if (educationParts.length > 0) {
      updateData.education = educationParts.join(' | ').substring(0, 500);
    }

    // Combine all skills
    const allSkills = [];
    if (skills.technical_skills && Array.isArray(skills.technical_skills)) {
      allSkills.push(...skills.technical_skills);
    }
    if (skills.programming_languages && Array.isArray(skills.programming_languages)) {
      allSkills.push(...skills.programming_languages);
    }
    if (skills.tools_and_frameworks && Array.isArray(skills.tools_and_frameworks)) {
      allSkills.push(...skills.tools_and_frameworks);
    }
    if (skills.soft_skills && Array.isArray(skills.soft_skills)) {
      allSkills.push(...skills.soft_skills);
    }
    if (additional.certifications && Array.isArray(additional.certifications)) {
      allSkills.push(...additional.certifications);
    }
    
    if (allSkills.length > 0) {
      const validSkills = allSkills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .filter((skill, index, arr) => arr.indexOf(skill) === index) // Remove duplicates
        .slice(0, 50);
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }

    console.log('Enhanced final update data:', JSON.stringify(updateData, null, 2));

    // Update candidate profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('candidate_profiles')
      .update(updateData)
      .eq('id', candidateId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update candidate profile', 
        details: updateError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== ENHANCED EXTRACTION SUCCESS ===');
    console.log('Profile updated successfully with enhanced extraction');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      extractionInfo: {
        method: extractionMethod,
        originalTextLength: resumeText.length,
        cleanedTextLength: cleanedText.length,
        originalTextSample: resumeText.substring(0, 500),
        cleanedTextSample: cleanedText.substring(0, 500),
        aiResponseSample: rawAIContent.substring(0, 1000)
      },
      message: 'Resume data extracted and profile updated successfully with enhanced debugging'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ENHANCED FUNCTION ERROR ===');
    console.error('Error details:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
