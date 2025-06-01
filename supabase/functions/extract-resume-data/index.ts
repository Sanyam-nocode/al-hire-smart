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

// Helper function to calculate years of experience from dates (now dynamic)
function calculateExperienceFromText(text: string): number {
  console.log('=== CALCULATING EXPERIENCE FROM TEXT (DYNAMIC DATE) ===');
  console.log('Text sample for calculation:', text.substring(0, 1000));
  
  // Get current date dynamically (when resume is uploaded)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
  
  console.log(`Dynamic current date: ${currentMonth}/${currentYear}`);
  
  // Patterns to match date ranges
  const datePatterns = [
    // MM/YYYY - Present, MM/YYYY - MM/YYYY
    /(\d{1,2})\/(\d{4})\s*[-–—]\s*(?:present|current|\d{1,2}\/\d{4})/gi,
    // YYYY - Present, YYYY - YYYY  
    /(\d{4})\s*[-–—]\s*(?:present|current|\d{4})/gi,
    // Month YYYY - Present, Month YYYY - Month YYYY
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\s*[-–—]\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi,
  ];
  
  let totalMonths = 0;
  const processedRanges = new Set();
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      
      // Skip if we've already processed this exact range
      if (processedRanges.has(fullMatch.toLowerCase())) continue;
      processedRanges.add(fullMatch.toLowerCase());
      
      console.log('Found date range:', fullMatch);
      
      let startYear: number;
      let startMonth = 1; // Default to January if month not specified
      let endYear: number;
      let endMonth = 12; // Default to December if month not specified
      
      if (match[1] && match[2]) {
        // MM/YYYY format
        startMonth = parseInt(match[1]);
        startYear = parseInt(match[2]);
      } else if (match[1]) {
        // YYYY format or Month YYYY format
        if (match[0].toLowerCase().includes('jan')) startMonth = 1;
        else if (match[0].toLowerCase().includes('feb')) startMonth = 2;
        else if (match[0].toLowerCase().includes('mar')) startMonth = 3;
        else if (match[0].toLowerCase().includes('apr')) startMonth = 4;
        else if (match[0].toLowerCase().includes('may')) startMonth = 5;
        else if (match[0].toLowerCase().includes('jun')) startMonth = 6;
        else if (match[0].toLowerCase().includes('jul')) startMonth = 7;
        else if (match[0].toLowerCase().includes('aug')) startMonth = 8;
        else if (match[0].toLowerCase().includes('sep')) startMonth = 9;
        else if (match[0].toLowerCase().includes('oct')) startMonth = 10;
        else if (match[0].toLowerCase().includes('nov')) startMonth = 11;
        else if (match[0].toLowerCase().includes('dec')) startMonth = 12;
        
        startYear = parseInt(match[2] || match[1]);
      }
      
      // Check if it's a "Present" or "Current" end date - USE DYNAMIC DATE
      if (fullMatch.toLowerCase().includes('present') || fullMatch.toLowerCase().includes('current')) {
        endYear = currentYear;
        endMonth = currentMonth;
        console.log(`Using dynamic current date for "Present": ${currentMonth}/${currentYear}`);
      } else {
        // Extract end date from the match
        const endDateMatch = fullMatch.match(/[-–—]\s*(\d{1,2}\/)?(\d{4})/);
        if (endDateMatch) {
          if (endDateMatch[1]) {
            endMonth = parseInt(endDateMatch[1].replace('/', ''));
          }
          endYear = parseInt(endDateMatch[2]);
        } else {
          // If no end date found, assume it's current (dynamic)
          endYear = currentYear;
          endMonth = currentMonth;
          console.log(`No end date found, using dynamic current date: ${currentMonth}/${currentYear}`);
        }
      }
      
      // Calculate months for this job
      const months = (endYear - startYear) * 12 + (endMonth - startMonth + 1);
      
      console.log(`Experience period: ${startMonth}/${startYear} to ${endMonth}/${endYear} = ${months} months`);
      
      if (months > 0 && months <= 600) { // Sanity check (max 50 years)
        totalMonths += months;
      }
    }
  }
  
  const totalYears = Math.round(totalMonths / 12);
  console.log(`Total calculated experience: ${totalMonths} months = ${totalYears} years`);
  
  return totalYears;
}

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
    console.log('=== ENHANCED RESUME EXTRACTION WITH DYNAMIC DATE CALCULATION ===');
    console.log('Resume URL:', resumeUrl);
    console.log('Candidate ID:', candidateId);

    // Get current date for dynamic calculations
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentMonthYear = `${currentMonth.toString().padStart(2, '0')}/${currentYear}`;
    
    console.log(`Dynamic current date for experience calculation: ${currentMonthYear}`);

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

    console.log('=== TRYING ENHANCED PDF PARSER FIRST ===');
    
    // Try the enhanced parseResume function first
    const { data: parseData, error: parseError } = await supabase.functions.invoke('parseResume', {
      body: { resumeUrl }
    });

    console.log('=== ENHANCED PARSE RESPONSE ===');
    console.log('Parse success:', parseData?.success);
    console.log('Parse error:', parseError);
    console.log('Text length:', parseData?.textLength);

    let resumeText = '';
    let extractionMethod = 'none';

    if (parseError || !parseData?.success || !parseData?.text || parseData.text.length < 100) {
      console.log('=== ENHANCED PARSER INSUFFICIENT, TRYING OCR.SPACE ===');
      
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
            error: 'All PDF extraction methods failed including enhanced parsing and OCR.space. The PDF might be corrupted, password-protected, or in an unsupported format.',
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
      extractionMethod = 'enhanced-parser';
    }

    console.log('=== FINAL EXTRACTED TEXT ANALYSIS ===');
    console.log('Extraction method used:', extractionMethod);
    console.log('Text length:', resumeText.length);
    console.log('Text preview (first 1000 chars):', resumeText.substring(0, 1000));

    // Check if we have enough meaningful text
    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from all methods');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF using any method including enhanced parsing and OCR.space.',
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
    console.log('Cleaned text sample:', cleanedText.substring(0, 500));

    // Calculate experience using our fallback method with dynamic date
    const fallbackExperience = calculateExperienceFromText(cleanedText);

    // Enhanced OpenAI prompt with dynamic current date
    console.log('=== CALLING OPENAI WITH DYNAMIC DATE PROMPT ===');
    const prompt = `You are an expert resume parsing assistant. Extract information from the following resume text and map it to profile fields.

CRITICAL INSTRUCTIONS FOR EXPERIENCE CALCULATION:
1. MANDATORY: You MUST calculate experience_years by finding ALL employment periods
2. Look for date patterns like "04/2022 - Present", "2020 - 2023", "Jan 2019 - Dec 2021"
3. IMPORTANT: For "Present" or "Current", use ${currentMonthYear} as the end date (this resume is being processed in ${currentMonthYear})
4. Add up ALL employment periods to get TOTAL experience
5. Convert to years (round to nearest integer)
6. Return ONLY valid JSON, no markdown formatting

EXPERIENCE CALCULATION EXAMPLES (FOLLOW EXACTLY WITH DYNAMIC DATE):
- "04/2022 - Present" = April 2022 to ${currentMonthYear} = ${Math.round(((currentYear - 2022) * 12 + (currentMonth - 4) + 1) / 12)} years
- "2020 - 2023" = 3 years  
- "Jan 2019 - Dec 2021" = 3 years
- Multiple jobs: "2018-2020" (2 years) + "2020-Present" (${Math.round(((currentYear - 2020) * 12 + currentMonth) / 12)} years) = ${2 + Math.round(((currentYear - 2020) * 12 + currentMonth) / 12)} years total

FIELD SPECIFICATIONS:
- phone: Phone number with country code if available (string)
- location: Current city/location (string)
- title: Current or most recent job title (string)
- experience_years: TOTAL years of work experience (integer) - CALCULATE THIS MANDATORY
- summary: Professional summary in 2-3 sentences (string)
- education: Education in format "Degree, Institution, Year" (string)
- linkedin_url: LinkedIn profile URL (string)
- github_url: GitHub profile URL (string)
- portfolio_url: Portfolio/website URL (string)
- skills: Array of technical skills, max 15 items (array of strings)

Return this EXACT JSON structure:
{
  "phone": null,
  "location": null,
  "title": null,
  "experience_years": 0,
  "summary": null,
  "education": null,
  "linkedin_url": null,
  "github_url": null,
  "portfolio_url": null,
  "skills": []
}

Resume text to analyze:
"${cleanedText}"

CRITICAL: You MUST calculate experience_years from employment dates using ${currentMonthYear} as "Present". Do not return null for experience_years. If no clear dates found, estimate based on job titles and descriptions.`;

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
            content: `You are an expert resume parser. Your PRIMARY task is to calculate years of experience from employment dates. NEVER return null for experience_years. Always calculate it from employment history using ${currentMonthYear} as the current date for "Present" positions.`
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
      
      // Clean any markdown formatting aggressively
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

    // Enhanced experience validation with fallback
    console.log('=== VALIDATING AND ENHANCING EXPERIENCE CALCULATION ===');
    if (!extractedData.experience_years || extractedData.experience_years === null || extractedData.experience_years === 0) {
      console.log('AI did not calculate experience properly, using fallback calculation');
      extractedData.experience_years = fallbackExperience;
      console.log('Fallback experience assigned:', fallbackExperience);
    } else {
      console.log('AI calculated experience:', extractedData.experience_years);
    }

    // Update database with extracted data - Enhanced field mapping
    console.log('=== UPDATING DATABASE WITH ENHANCED FIELD MAPPING ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    const mappedFields: string[] = [];

    // Direct mapping with validation
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim()) {
      updateData.phone = extractedData.phone.trim().substring(0, 20);
      mappedFields.push('phone');
      console.log('Mapped phone:', updateData.phone);
    }
    
    if (extractedData.location && typeof extractedData.location === 'string' && extractedData.location.trim()) {
      updateData.location = extractedData.location.trim().substring(0, 200);
      mappedFields.push('location');
      console.log('Mapped location:', updateData.location);
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim()) {
      updateData.title = extractedData.title.trim().substring(0, 200);
      mappedFields.push('title');
      console.log('Mapped title:', updateData.title);
    }
    
    // Enhanced experience_years mapping with guaranteed value
    if (extractedData.experience_years !== null && extractedData.experience_years !== undefined) {
      const experience = parseInt(extractedData.experience_years.toString());
      if (!isNaN(experience) && experience >= 0 && experience <= 50) {
        updateData.experience_years = experience;
        mappedFields.push('experience_years');
        console.log('Mapped experience_years:', updateData.experience_years);
      } else {
        console.log('Invalid experience_years value, using fallback:', extractedData.experience_years);
        updateData.experience_years = fallbackExperience;
        mappedFields.push('experience_years');
        console.log('Fallback experience_years mapped:', updateData.experience_years);
      }
    } else {
      console.log('No experience_years provided by AI, using fallback');
      updateData.experience_years = fallbackExperience;
      mappedFields.push('experience_years');
      console.log('Fallback experience_years mapped:', updateData.experience_years);
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim()) {
      updateData.summary = extractedData.summary.trim().substring(0, 1000);
      mappedFields.push('summary');
      console.log('Mapped summary:', updateData.summary);
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim()) {
      updateData.education = extractedData.education.trim().substring(0, 500);
      mappedFields.push('education');
      console.log('Mapped education:', updateData.education);
    }
    
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string' && extractedData.linkedin_url.trim()) {
      updateData.linkedin_url = extractedData.linkedin_url.trim().substring(0, 500);
      mappedFields.push('linkedin_url');
      console.log('Mapped linkedin_url:', updateData.linkedin_url);
    }
    
    if (extractedData.github_url && typeof extractedData.github_url === 'string' && extractedData.github_url.trim()) {
      updateData.github_url = extractedData.github_url.trim().substring(0, 500);
      mappedFields.push('github_url');
      console.log('Mapped github_url:', updateData.github_url);
    }
    
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string' && extractedData.portfolio_url.trim()) {
      updateData.portfolio_url = extractedData.portfolio_url.trim().substring(0, 500);
      mappedFields.push('portfolio_url');
      console.log('Mapped portfolio_url:', updateData.portfolio_url);
    }

    // Enhanced skills array mapping
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .filter((skill, index, arr) => arr.indexOf(skill) === index) // Remove duplicates
        .slice(0, 15); // Limit to 15 skills
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        mappedFields.push('skills');
        console.log('Mapped skills:', updateData.skills);
      }
    }

    console.log('Final update data:', updateData);
    console.log('Fields to be updated:', mappedFields);

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

    console.log('=== EXTRACTION SUCCESS WITH DYNAMIC DATE CALCULATION ===');
    console.log('Profile updated successfully with fields:', mappedFields);
    console.log('Experience years calculated using dynamic date:', updateData.experience_years);
    console.log('Current date used for calculation:', currentMonthYear);

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      mappedFields,
      extractionInfo: {
        method: extractionMethod,
        originalTextLength: resumeText.length,
        cleanedTextLength: cleanedText.length,
        fieldsUpdated: mappedFields.length,
        extractedUsing: extractionMethod,
        calculatedExperience: updateData.experience_years,
        fallbackExperienceUsed: !extractedData.experience_years || extractedData.experience_years === null,
        currentDateUsed: currentMonthYear,
        uploadDate: currentDate.toISOString()
      },
      message: `Resume data extracted and ${mappedFields.length} profile fields updated successfully. Experience calculated: ${updateData.experience_years} years using current date ${currentMonthYear}.`
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
