
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

// Improved PDF text extraction using pdf-parse library
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction with pdf-parse, buffer size:', pdfBuffer.byteLength);
    
    // Use pdf-parse library for better text extraction
    const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
    
    const data = await pdfParse.default(new Uint8Array(pdfBuffer));
    
    console.log('PDF parsing completed');
    console.log('Number of pages:', data.numpages);
    console.log('Extracted text length:', data.text.length);
    console.log('PDF info:', JSON.stringify(data.info, null, 2));
    
    let extractedText = data.text;
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/\s{3,}/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    console.log('Cleaned extracted text length:', extractedText.length);
    console.log('Extracted text sample (first 500 chars):', extractedText.substring(0, 500));
    
    // If we still don't have much text, log more details
    if (extractedText.length < 100) {
      console.log('WARNING: Very little text extracted. Full text:', extractedText);
      console.log('PDF metadata:', JSON.stringify(data.metadata, null, 2));
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF with pdf-parse:', error);
    
    // Fallback to basic extraction if pdf-parse fails
    console.log('Falling back to basic text extraction...');
    return await basicPDFTextExtraction(pdfBuffer);
  }
}

// Fallback basic PDF text extraction
async function basicPDFTextExtraction(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Using fallback basic PDF text extraction');
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string with better encoding handling
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // Extract text from content streams
    const streamMatches = pdfString.matchAll(/stream\s*(.*?)\s*endstream/gs);
    for (const match of streamMatches) {
      const streamContent = match[1];
      if (streamContent && streamContent.length > 10) {
        
        // Look for text operations in the stream
        const textOperations = [
          /\((.*?)\)\s*Tj/g,
          /\((.*?)\)\s*TJ/g,
          /\[(.*?)\]\s*TJ/g,
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
              
              if (text.length > 2 && /[a-zA-Z]/.test(text)) {
                extractedText += text + ' ';
              }
            }
          }
        }
      }
    }
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Fallback extraction completed, length:', extractedText.length);
    return extractedText;
  } catch (error) {
    console.error('Error in fallback PDF extraction:', error);
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

    // Extract text from PDF using proper library
    console.log('=== EXTRACTING TEXT WITH PDF-PARSE ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Final extracted text length:', resumeText.length);
    console.log('Text sample:', resumeText.substring(0, 300));

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or corrupted.',
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

    // Enhanced OpenAI prompt with better instructions
    console.log('=== CALLING OPENAI ===');
    const prompt = `You are an expert resume parser. Extract information from this resume text with high accuracy.

RESUME TEXT:
"${resumeText}"

Extract the following information ONLY if clearly present in the text. If information is not found or unclear, use null.

IMPORTANT RULES:
- Only extract information that is explicitly stated in the resume
- Skills should be technical skills, programming languages, frameworks, tools, or professional competencies
- Calculate experience years from actual job dates mentioned
- Use exact text from the resume, don't rephrase or interpret
- If text seems corrupted or unreadable, return mostly null values

Respond with ONLY this JSON (no markdown formatting):
{
  "skills": ["skill1", "skill2"] or null,
  "experience_years": number or null,
  "title": "job title from resume" or null,
  "summary": "brief professional summary" or null,
  "education": "degree and institution" or null,
  "location": "location mentioned" or null,
  "phone": "phone number" or null,
  "linkedin_url": "LinkedIn URL" or null,
  "github_url": "GitHub URL" or null,
  "portfolio_url": "portfolio URL" or null
}`;

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
            content: 'You are an expert resume parser that extracts accurate information from resume text. You only extract information that is clearly visible and never make assumptions or generate fictional data.'
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
      console.log('Raw AI content:', content);
      
      // Remove any markdown formatting
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      
      // Try to find and extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      extractedData = JSON.parse(content);
      console.log('Successfully parsed extracted data:', JSON.stringify(extractedData, null, 2));
      
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

    // Prepare database update with validation
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Add validated fields
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim());
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }
    
    if (extractedData.experience_years && typeof extractedData.experience_years === 'number' && extractedData.experience_years > 0) {
      updateData.experience_years = extractedData.experience_years;
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim().length > 2) {
      updateData.title = extractedData.title.trim();
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim().length > 10) {
      updateData.summary = extractedData.summary.trim();
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim().length > 5) {
      updateData.education = extractedData.education.trim();
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

    console.log('Final update data:', JSON.stringify(updateData, null, 2));

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
        extractedTextSample: resumeText.substring(0, 300)
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
