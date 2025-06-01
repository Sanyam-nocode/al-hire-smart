
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OCR.space API integration
async function extractTextWithOCR(resumeUrl: string): Promise<string> {
  try {
    console.log('=== STARTING OCR.SPACE EXTRACTION ===');
    console.log('Resume URL for OCR:', resumeUrl);

    if (!ocrSpaceApiKey) {
      throw new Error('OCR.space API key not configured');
    }

    // Create form data for OCR.space API
    const formData = new FormData();
    formData.append('url', resumeUrl);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
    formData.append('filetype', 'PDF');

    console.log('Calling OCR.space API...');
    
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceApiKey,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR.space API error: ${ocrResponse.status}`);
    }

    const ocrData = await ocrResponse.json();
    console.log('=== OCR.SPACE RESPONSE ===');
    console.log('OCR Response structure:', {
      hasParseResults: !!ocrData.ParsedResults,
      resultsCount: ocrData.ParsedResults?.length || 0,
      isErroredOnProcessing: ocrData.IsErroredOnProcessing,
      ocrExitCode: ocrData.OCRExitCode,
      errorMessage: ocrData.ErrorMessage
    });

    if (ocrData.IsErroredOnProcessing) {
      throw new Error(`OCR processing failed: ${ocrData.ErrorMessage || 'Unknown OCR error'}`);
    }

    if (!ocrData.ParsedResults || ocrData.ParsedResults.length === 0) {
      throw new Error('No parsed results from OCR service');
    }

    const extractedText = ocrData.ParsedResults[0].ParsedText || '';
    console.log('=== OCR EXTRACTED TEXT ===');
    console.log('OCR text length:', extractedText.length);
    console.log('OCR text preview:', extractedText.substring(0, 1000));

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('OCR extracted insufficient text content');
    }

    return extractedText.trim();
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();
    console.log('=== ENHANCED RESUME EXTRACTION WITH OCR ===');
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

    console.log('=== TRYING STANDARD PDF PARSER FIRST ===');
    
    // Try the enhanced parseResume function first
    const { data: parseData, error: parseError } = await supabase.functions.invoke('parseResume', {
      body: { resumeUrl }
    });

    console.log('=== STANDARD PARSE RESPONSE ===');
    console.log('Parse success:', parseData?.success);
    console.log('Parse error:', parseError);

    let resumeText = '';
    let extractionMethod = 'none';

    if (parseError || !parseData?.success || !parseData?.text || parseData.text.length < 100) {
      console.log('=== STANDARD PARSER INSUFFICIENT, TRYING OCR.SPACE ===');
      
      try {
        resumeText = await extractTextWithOCR(resumeUrl);
        extractionMethod = 'ocr-space';
        console.log('OCR.space extraction successful');
      } catch (ocrError) {
        console.log('=== OCR.SPACE FAILED, TRYING PREPROCESSOR ===');
        console.error('OCR error:', ocrError);
        
        // Try the preprocessing function as final fallback
        const { data: preprocessData, error: preprocessError } = await supabase.functions.invoke('preprocess-pdf', {
          body: { resumeUrl }
        });

        if (preprocessError || !preprocessData?.success) {
          console.error('All extraction methods failed');
          return new Response(JSON.stringify({ 
            error: 'All PDF extraction methods failed including OCR.space. The PDF might be corrupted, password-protected, or in an unsupported format.',
            success: false,
            debugInfo: {
              parseError: parseError?.message || parseData?.error,
              ocrError: ocrError.message,
              preprocessError: preprocessError?.message || preprocessData?.error,
              suggestions: [
                'Ensure the PDF is not password-protected',
                'Try a different PDF format or quality',
                'Check if the PDF contains selectable text',
                'Consider converting the PDF to a higher quality format'
              ]
            }
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        resumeText = preprocessData.extractedText || '';
        extractionMethod = 'preprocessor-fallback';
      }
    } else {
      resumeText = parseData.text || '';
      extractionMethod = 'standard-parser';
    }

    console.log('=== FINAL EXTRACTED TEXT ANALYSIS ===');
    console.log('Extraction method used:', extractionMethod);
    console.log('Text length:', resumeText.length);
    console.log('Text preview (first 500 chars):', resumeText.substring(0, 500));

    // Check if we have enough meaningful text
    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from all methods');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF using any method including OCR.space.',
        success: false,
        debugInfo: {
          extractionMethod,
          textLength: resumeText.length,
          textSample: resumeText,
          recommendations: [
            'Try uploading a higher quality PDF',
            'Ensure the PDF is not password-protected',
            'Check if the PDF contains selectable or image-based text',
            'Consider manually entering the information'
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

    // Enhanced OpenAI prompt optimized for profile field mapping
    console.log('=== CALLING OPENAI WITH PROFILE-OPTIMIZED PROMPT ===');
    const prompt = `You are an expert resume parsing assistant. Extract information from the following resume text and map it specifically to the candidate profile fields.

CRITICAL INSTRUCTIONS:
1. Extract ONLY the information that is clearly present in the resume
2. Map the data to match the EXACT profile field structure
3. Return ONLY valid JSON, no markdown or explanations
4. Focus on accuracy over completeness - leave fields empty if unclear

Profile Field Mapping Requirements:
- phone: Extract phone number (include country code if present)
- location: Extract current location/city (e.g., "Gurgaon, India", "New York, NY")
- title: Extract current job title or most recent position
- experience_years: Calculate total years of experience as INTEGER
- summary: Create a concise professional summary (2-3 sentences max)
- education: Format as "Degree, Institution, Year" (e.g., "Bachelor's Computer Science, XYZ University, 2020")
- linkedin_url: Extract LinkedIn profile URL
- github_url: Extract GitHub profile URL  
- portfolio_url: Extract portfolio/website URL
- skills: Array of technical skills, programming languages, tools (max 20 items)

Return this EXACT JSON structure:
{
  "phone": "",
  "location": "",
  "title": "",
  "experience_years": null,
  "summary": "",
  "education": "",
  "linkedin_url": "",
  "github_url": "",
  "portfolio_url": "",
  "skills": []
}

Resume text:
"${cleanedText}"

IMPORTANT: Return ONLY the JSON object. Do not include any explanations, markdown formatting, or additional text.`;

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
            content: 'You are an expert resume parser. Extract information precisely and return only valid JSON without any markdown formatting.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
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
    console.log('=== PARSING AI RESPONSE ===');
    let extractedData;
    const rawAIContent = openAIData.choices[0].message.content;
    
    console.log('AI content length:', rawAIContent.length);
    console.log('Raw AI response:', rawAIContent);
    
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
      
      extractedData = JSON.parse(content);
      console.log('Successfully parsed extracted data:', extractedData);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed to parse:', rawAIContent);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response as JSON',
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

    // Update database with extracted data - Direct field mapping
    console.log('=== UPDATING DATABASE WITH MAPPED DATA ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Direct mapping from extracted data to database fields
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim()) {
      updateData.phone = extractedData.phone.trim().substring(0, 20);
      console.log('Mapping phone:', updateData.phone);
    }
    
    if (extractedData.location && typeof extractedData.location === 'string' && extractedData.location.trim()) {
      updateData.location = extractedData.location.trim().substring(0, 200);
      console.log('Mapping location:', updateData.location);
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim()) {
      updateData.title = extractedData.title.trim().substring(0, 200);
      console.log('Mapping title:', updateData.title);
    }
    
    if (extractedData.experience_years && typeof extractedData.experience_years === 'number') {
      const experience = parseInt(extractedData.experience_years.toString());
      if (!isNaN(experience) && experience > 0 && experience <= 50) {
        updateData.experience_years = experience;
        console.log('Mapping experience_years:', updateData.experience_years);
      }
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim()) {
      updateData.summary = extractedData.summary.trim().substring(0, 1000);
      console.log('Mapping summary:', updateData.summary);
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim()) {
      updateData.education = extractedData.education.trim().substring(0, 500);
      console.log('Mapping education:', updateData.education);
    }
    
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string' && extractedData.linkedin_url.trim()) {
      updateData.linkedin_url = extractedData.linkedin_url.trim().substring(0, 500);
      console.log('Mapping linkedin_url:', updateData.linkedin_url);
    }
    
    if (extractedData.github_url && typeof extractedData.github_url === 'string' && extractedData.github_url.trim()) {
      updateData.github_url = extractedData.github_url.trim().substring(0, 500);
      console.log('Mapping github_url:', updateData.github_url);
    }
    
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string' && extractedData.portfolio_url.trim()) {
      updateData.portfolio_url = extractedData.portfolio_url.trim().substring(0, 500);
      console.log('Mapping portfolio_url:', updateData.portfolio_url);
    }

    // Skills array mapping
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .filter((skill, index, arr) => arr.indexOf(skill) === index) // Remove duplicates
        .slice(0, 20); // Limit to 20 skills
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        console.log('Mapping skills:', updateData.skills);
      }
    }

    console.log('Final update data:', updateData);

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

    console.log('=== EXTRACTION SUCCESS WITH FIELD MAPPING ===');
    console.log('Profile updated successfully with fields:', Object.keys(updateData));

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      mappedFields: Object.keys(updateData).filter(key => key !== 'resume_content' && key !== 'updated_at'),
      extractionInfo: {
        method: extractionMethod,
        originalTextLength: resumeText.length,
        cleanedTextLength: cleanedText.length,
        fieldsUpdated: Object.keys(updateData).length - 2, // Exclude resume_content and updated_at
        ocrUsed: extractionMethod === 'ocr-space'
      },
      message: `Resume data extracted and ${Object.keys(updateData).length - 2} profile fields updated successfully using ${extractionMethod}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
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
