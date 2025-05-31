
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

// Improved PDF text extraction with better content stream parsing
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting improved PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string with better encoding handling
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    console.log('PDF string length:', pdfString.length);
    
    // Strategy 1: Extract text from content streams
    const streamMatches = pdfString.matchAll(/stream\s*(.*?)\s*endstream/gs);
    for (const match of streamMatches) {
      const streamContent = match[1];
      if (streamContent && streamContent.length > 10) {
        
        // Look for text operations in the stream
        const textOperations = [
          // Text showing operations
          /\((.*?)\)\s*Tj/g,
          /\((.*?)\)\s*TJ/g,
          /\[(.*?)\]\s*TJ/g,
          // Text positioning with content
          /\((.*?)\)\s*Td/g,
          /\((.*?)\)\s*TD/g,
        ];
        
        for (const pattern of textOperations) {
          const matches = streamContent.matchAll(pattern);
          for (const textMatch of matches) {
            let text = textMatch[1];
            if (text && text.length > 1) {
              // Clean up the extracted text
              text = text
                .replace(/\\n/g, ' ')
                .replace(/\\r/g, ' ')
                .replace(/\\t/g, ' ')
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .replace(/\\\\/g, '\\')
                .replace(/\s+/g, ' ')
                .trim();
              
              // Only add if it contains meaningful content
              if (text.length > 2 && /[a-zA-Z]/.test(text)) {
                extractedText += text + ' ';
              }
            }
          }
        }
      }
    }
    
    // Strategy 2: Extract from annotation links (emails, URLs)
    const annotationMatches = pdfString.matchAll(/\/URI\s*\((.*?)\)/g);
    for (const match of annotationMatches) {
      const uri = match[1];
      if (uri && (uri.includes('@') || uri.includes('http'))) {
        extractedText += uri + ' ';
      }
    }
    
    // Strategy 3: Look for metadata and document info
    const infoMatches = pdfString.matchAll(/\/Title\s*\((.*?)\)|\/Author\s*\((.*?)\)|\/Subject\s*\((.*?)\)/g);
    for (const match of infoMatches) {
      const info = match[1] || match[2] || match[3];
      if (info && info.length > 2) {
        extractedText += info + ' ';
      }
    }
    
    // Strategy 4: Extract text from font encodings if available
    const fontMatches = pdfString.matchAll(/\/Differences\s*\[(.*?)\]/g);
    for (const match of fontMatches) {
      const differences = match[1];
      if (differences) {
        // Look for readable text in font differences
        const textInDiffs = differences.match(/\/[A-Za-z]+/g);
        if (textInDiffs) {
          for (const text of textInDiffs) {
            const cleanText = text.replace('/', '');
            if (cleanText.length > 2) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }
    }
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{3,}/g, '$1') // Remove excessive character repetition
      .trim();
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('Extracted text sample (first 500 chars):', extractedText.substring(0, 500));
    
    // If we still don't have much text, try a fallback method
    if (extractedText.length < 100) {
      console.log('Primary extraction failed, trying fallback method...');
      
      // Fallback: look for any sequence of readable characters
      const fallbackPattern = /[A-Za-z][A-Za-z0-9\s@.\-_]{4,}/g;
      const fallbackMatches = pdfString.match(fallbackPattern);
      
      if (fallbackMatches) {
        const cleanedMatches = fallbackMatches
          .filter(match => match.length > 4 && /[A-Za-z]/.test(match))
          .slice(0, 50); // Limit to prevent too much noise
        
        extractedText = cleanedMatches.join(' ');
        console.log('Fallback extraction result length:', extractedText.length);
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return 'Unable to extract text from PDF due to format limitations.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, candidateId } = await req.json();
    console.log('=== RESUME EXTRACTION REQUEST ===');
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

    console.log('=== DOWNLOADING PDF ===');
    
    // Extract file path from URL
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
    console.log('File path:', filePath);

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ 
        error: `Failed to download resume: ${downloadError?.message || 'No file data'}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract text from PDF
    console.log('=== EXTRACTING TEXT ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Extracted text length:', resumeText.length);

    if (!resumeText || resumeText.length < 20) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based or have formatting issues.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Improved OpenAI prompt with strict validation
    console.log('=== CALLING OPENAI ===');
    const prompt = `You are a professional resume parser. Analyze the following text extracted from a resume PDF and extract information ONLY if it clearly exists in the text.

RESUME TEXT TO ANALYZE:
"${resumeText}"

CRITICAL INSTRUCTIONS:
- ONLY extract information that is CLEARLY VISIBLE in the provided text
- If the text appears garbled or unreadable, return null values
- DO NOT make assumptions or infer information not explicitly stated
- If you cannot find specific information, use null instead of guessing
- Skills should ONLY be those explicitly mentioned in the text
- Experience years should be calculated from actual dates mentioned
- Education should be exactly as written in the text

Return ONLY this JSON structure (no markdown, no explanations):
{
  "skills": ["skill1", "skill2"] or null,
  "experience_years": number or null,
  "title": "exact job title from resume" or null,
  "summary": "brief summary based on actual content" or null,
  "education": "exact education from resume" or null,
  "location": "exact location mentioned" or null,
  "phone": "exact phone number" or null,
  "linkedin_url": "exact LinkedIn URL" or null,
  "github_url": "exact GitHub URL" or null,
  "portfolio_url": "exact portfolio URL" or null
}

VALIDATION RULES:
- If the extracted text contains mostly symbols, numbers, or garbled characters, return all null values
- Only include skills that are explicitly mentioned as skills or technologies
- Only include education if degree/institution names are clearly readable
- Only include experience years if you can identify actual work periods with dates

RESPOND WITH JSON ONLY:`;

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
            content: 'You are an expert resume parser that ONLY extracts information that clearly exists in the provided text. If text is garbled or unreadable, you return null values. You never make assumptions or generate fictional data.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 800,
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
    console.log('OpenAI response received');

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

    // Parse AI response with validation
    console.log('=== PARSING AI RESPONSE ===');
    let extractedData;
    try {
      let content = openAIData.choices[0].message.content.trim();
      console.log('Raw AI content length:', content.length);
      console.log('Raw AI content preview:', content.substring(0, 300));
      
      // Remove markdown code blocks if present
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      
      // Try to find and extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      extractedData = JSON.parse(content);
      console.log('Successfully parsed extracted data:', JSON.stringify(extractedData, null, 2));
      
      // Validate that we got meaningful data
      const hasValidData = extractedData.skills?.length > 0 || 
                          extractedData.title || 
                          extractedData.education || 
                          extractedData.experience_years;
      
      if (!hasValidData) {
        console.log('No meaningful data extracted, PDF might be unreadable');
        return new Response(JSON.stringify({ 
          error: 'Could not extract meaningful information from the resume. The PDF might be image-based, corrupted, or in an unsupported format.',
          success: false,
          debugInfo: {
            extractedTextLength: resumeText.length,
            extractedTextSample: resumeText.substring(0, 200)
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed to parse:', openAIData.choices[0].message.content);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response as JSON',
        success: false,
        debugInfo: {
          rawResponse: openAIData.choices[0].message.content,
          parseError: parseError.message
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare database update with stricter validation
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Only add fields if they contain meaningful data
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim());
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        console.log('Skills to update:', validSkills);
      }
    }
    
    if (extractedData.experience_years && typeof extractedData.experience_years === 'number' && extractedData.experience_years > 0 && extractedData.experience_years <= 50) {
      updateData.experience_years = extractedData.experience_years;
      console.log('Experience years to update:', extractedData.experience_years);
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim().length > 2) {
      updateData.title = extractedData.title.trim();
      console.log('Title to update:', updateData.title);
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim().length > 10) {
      updateData.summary = extractedData.summary.trim();
      console.log('Summary to update:', updateData.summary.substring(0, 100) + '...');
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim().length > 5) {
      updateData.education = extractedData.education.trim();
      console.log('Education to update:', updateData.education);
    }
    
    if (extractedData.location && typeof extractedData.location === 'string' && extractedData.location.trim().length > 2) {
      updateData.location = extractedData.location.trim();
    }
    
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim().length > 5) {
      updateData.phone = extractedData.phone.trim();
    }
    
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string' && extractedData.linkedin_url.includes('linkedin')) {
      updateData.linkedin_url = extractedData.linkedin_url.trim();
    }
    
    if (extractedData.github_url && typeof extractedData.github_url === 'string' && extractedData.github_url.includes('github')) {
      updateData.github_url = extractedData.github_url.trim();
    }
    
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string' && extractedData.portfolio_url.includes('http')) {
      updateData.portfolio_url = extractedData.portfolio_url.trim();
    }

    console.log('Final update data prepared:', JSON.stringify(updateData, null, 2));

    // Update candidate profile
    console.log('=== UPDATING DATABASE ===');
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

    console.log('=== SUCCESS ===');
    console.log('Updated profile successfully');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data extracted and profile updated successfully',
      debugInfo: {
        extractedTextLength: resumeText.length,
        extractedTextSample: resumeText.substring(0, 200)
      }
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
