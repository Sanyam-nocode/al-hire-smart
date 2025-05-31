
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

// Enhanced PDF text extraction with multiple parsing strategies
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting enhanced PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    // Strategy 1: Use pdf-parse library for better extraction
    try {
      const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
      const data = await pdfParse.default(new Uint8Array(pdfBuffer));
      
      console.log('PDF-parse extraction completed');
      console.log('Number of pages:', data.numpages);
      console.log('Extracted text length:', data.text.length);
      
      let extractedText = data.text;
      
      // Advanced text cleaning and normalization
      extractedText = extractedText
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace while preserving structure
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        // Fix common PDF extraction issues
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
        .replace(/(\w)(\d)/g, '$1 $2') // Add space between word and number
        .replace(/(\d)(\w)/g, '$1 $2') // Add space between number and word
        // Remove random single characters on separate lines
        .replace(/\n\s*[a-zA-Z]\s*\n/g, '\n')
        // Clean up bullet points and formatting
        .replace(/•/g, '- ')
        .replace(/▪/g, '- ')
        .replace(/◦/g, '- ')
        .trim();
      
      console.log('Cleaned extracted text length:', extractedText.length);
      console.log('Text sample (first 500 chars):', extractedText.substring(0, 500));
      
      if (extractedText.length > 100) {
        return extractedText;
      } else {
        console.log('pdf-parse extracted insufficient text, trying alternative method');
      }
    } catch (pdfParseError) {
      console.error('pdf-parse failed:', pdfParseError);
    }

    // Strategy 2: Enhanced manual extraction for difficult PDFs
    console.log('Using enhanced manual PDF text extraction');
    return await enhancedManualExtraction(pdfBuffer);
    
  } catch (error) {
    console.error('All PDF extraction methods failed:', error);
    return 'Unable to extract readable text from this PDF file. The file may be image-based, encrypted, or corrupted.';
  }
}

// Enhanced manual extraction with better text operation parsing
async function enhancedManualExtraction(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert PDF buffer to string with multiple encoding attempts
    let pdfString = '';
    try {
      pdfString = new TextDecoder('utf-8').decode(uint8Array);
    } catch {
      try {
        pdfString = new TextDecoder('latin1').decode(uint8Array);
      } catch {
        pdfString = new TextDecoder('windows-1252').decode(uint8Array);
      }
    }
    
    console.log('PDF string length:', pdfString.length);
    
    // Extract text from various PDF text operations
    const textPatterns = [
      // Standard text operations
      /\((.*?)\)\s*Tj/g,
      /\((.*?)\)\s*TJ/g,
      /\[(.*?)\]\s*TJ/g,
      // Text with positioning
      /\((.*?)\)\s*\d+\.?\d*\s+\d+\.?\d*\s+Td/g,
      /\((.*?)\)\s*\d+\.?\d*\s+\d+\.?\d*\s+TD/g,
      // Text with font changes
      /\/F\d+\s+\d+\.?\d*\s+Tf\s*\((.*?)\)\s*Tj/g,
      // Show text operations
      /\((.*?)\)\s*'/g,
      /\((.*?)\)\s*"/g,
    ];
    
    const foundTexts = new Set<string>();
    
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1];
        if (text && text.length > 1) {
          // Decode PDF text encoding
          text = decodePDFText(text);
          
          // Clean and validate text
          text = text
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Only add meaningful text (contains letters and reasonable length)
          if (text.length > 2 && /[a-zA-Z]/.test(text) && !isGibberish(text)) {
            foundTexts.add(text);
          }
        }
      }
    }
    
    // Join all found text pieces
    extractedText = Array.from(foundTexts).join(' ');
    
    // Additional cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('Enhanced manual extraction completed, length:', extractedText.length);
    console.log('Sample text:', extractedText.substring(0, 300));
    
    return extractedText;
  } catch (error) {
    console.error('Enhanced manual extraction failed:', error);
    return 'PDF text extraction failed due to file format limitations.';
  }
}

// Decode PDF text encoding issues
function decodePDFText(text: string): string {
  try {
    // Handle common PDF encoding issues
    text = text
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\([0-7]{3})/g, (_, code) => String.fromCharCode(parseInt(code, 8)));
    
    return text;
  } catch {
    return text;
  }
}

// Check if text appears to be gibberish
function isGibberish(text: string): boolean {
  // Reject text that's mostly non-alphanumeric
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.5) return true;
  
  // Reject text with too many repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(2, text.length / 4)) return true;
  
  // Reject very short fragments
  if (text.length < 3) return true;
  
  return false;
}

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

    // Enhanced text extraction from PDF
    console.log('=== EXTRACTING TEXT WITH ENHANCED METHODS ===');
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

    // Enhanced OpenAI prompt for better extraction accuracy
    console.log('=== CALLING OPENAI WITH ENHANCED PROMPT ===');
    const prompt = `You are an expert resume parser with high accuracy in extracting structured information from resume text.

RESUME TEXT:
"${resumeText}"

Extract the following information with maximum accuracy. Only extract information that is explicitly stated in the resume text. Do not infer, assume, or generate any information.

EXTRACTION RULES:
1. Skills: Extract only technical skills, programming languages, frameworks, tools, or professional competencies that are explicitly mentioned
2. Experience: Calculate years based on actual employment dates if mentioned, otherwise look for explicit experience statements
3. Title: Use the most recent job title or the title the candidate is seeking
4. Summary: Extract existing professional summary or objective statement (do not create one)
5. Education: Include degree, field of study, and institution if mentioned
6. Contact: Extract exactly as written in the resume
7. URLs: Include only if explicitly mentioned and properly formatted

If information is not clearly present, use null. Do not make assumptions or create content.

Respond with ONLY this JSON structure (no markdown formatting):
{
  "skills": ["skill1", "skill2"] or null,
  "experience_years": number or null,
  "title": "exact job title from resume" or null,
  "summary": "existing summary from resume" or null,
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
            content: 'You are an expert resume parser that extracts accurate information from resume text. You are precise, only extract information that is clearly visible, and never make assumptions or generate fictional data. You always respond with valid JSON.'
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

    // Parse AI response with enhanced validation
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

    // Enhanced data validation and preparation
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Add validated fields with enhanced validation
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }
    
    if (extractedData.experience_years && typeof extractedData.experience_years === 'number' && extractedData.experience_years > 0 && extractedData.experience_years <= 50) {
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
      const cleanPhone = extractedData.phone.trim().replace(/[^\d+\-\s\(\)]/g, '');
      if (cleanPhone.length >= 7) {
        updateData.phone = cleanPhone;
      }
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
    console.log('Updated profile successfully with enhanced extraction');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data extracted with enhanced accuracy and profile updated successfully',
      debugInfo: {
        extractedTextLength: resumeText.length,
        extractedTextSample: resumeText.substring(0, 300),
        extractionMethod: 'Enhanced PDF parsing with multiple strategies'
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
