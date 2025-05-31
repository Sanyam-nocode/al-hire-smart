
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

// Improved PDF text extraction for Deno environment
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
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
    
    // Enhanced text extraction patterns for PDF operations
    const textPatterns = [
      // Standard text operations
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*Tj/g,
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*TJ/g,
      /\[((?:[^\[\]\\]|\\.|\\[0-7]{1,3})*)\]\s*TJ/g,
      // Text with positioning
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*[\d.-]+\s+[\d.-]+\s+Td/g,
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*[\d.-]+\s+[\d.-]+\s+TD/g,
      // Show text operations
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*'/g,
      /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*"/g,
      // Text in arrays (for complex layouts)
      /\[\s*\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*(?:[\d.-]+\s*)*\]\s*TJ/g,
    ];
    
    const foundTexts = new Set<string>();
    
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1];
        if (text && text.length > 0) {
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
          
          // Only add meaningful text
          if (text.length > 1 && /[a-zA-Z]/.test(text) && !isGibberish(text)) {
            foundTexts.add(text);
          }
        }
      }
    }
    
    // Join all found text pieces
    extractedText = Array.from(foundTexts).join(' ');
    
    // Additional text extraction from stream objects
    if (extractedText.length < 100) {
      console.log('Trying stream-based extraction...');
      const streamMatches = pdfString.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
      for (const match of streamMatches) {
        const streamContent = match[1];
        // Look for readable text in streams
        const readableText = streamContent.match(/[A-Za-z0-9\s.,!?;:'"()-]{10,}/g);
        if (readableText) {
          readableText.forEach(text => {
            const cleanText = text.trim();
            if (cleanText.length > 5 && !isGibberish(cleanText)) {
              foundTexts.add(cleanText);
            }
          });
        }
      }
      extractedText = Array.from(foundTexts).join(' ');
    }
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('Final extraction completed, length:', extractedText.length);
    console.log('Sample text (first 300 chars):', extractedText.substring(0, 300));
    
    return extractedText;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    return '';
  }
}

// Decode PDF text encoding issues
function decodePDFText(text: string): string {
  try {
    // Handle common PDF encoding issues
    text = text
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\([0-7]{3})/g, (_, code) => String.fromCharCode(parseInt(code, 8)))
      .replace(/\\([0-7]{1,2})/g, (_, code) => String.fromCharCode(parseInt(code, 8)));
    
    return text;
  } catch {
    return text;
  }
}

// Check if text appears to be gibberish
function isGibberish(text: string): boolean {
  // Reject text that's mostly non-alphanumeric
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.4) return true;
  
  // Reject text with too many repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(2, text.length / 6)) return true;
  
  // Reject very short fragments
  if (text.length < 2) return true;
  
  // Reject strings that are mostly numbers or symbols
  const letterRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (letterRatio < 0.3) return true;
  
  return false;
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
    console.log('=== EXTRACTING TEXT FROM PDF ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Extracted text length:', resumeText.length);

    if (!resumeText || resumeText.length < 20) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or have an unusual format.',
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

    // Call OpenAI for data extraction
    console.log('=== CALLING OPENAI FOR DATA EXTRACTION ===');
    const prompt = `You are an expert resume parser. Extract structured information from this resume text with high accuracy.

RESUME TEXT:
"${resumeText}"

Extract the following information ONLY if explicitly stated in the resume. Do not infer or generate information.

RULES:
- Skills: Only technical skills, programming languages, tools, frameworks explicitly mentioned
- Experience: Calculate years from employment dates if present, otherwise look for "X years experience" statements
- Title: Most recent job title or target position if clearly stated
- Summary: Extract existing professional summary/objective (do not create one)
- Education: Degree, field, institution if mentioned
- Contact: Extract as written

If information is not clearly present, use null.

Respond with ONLY this JSON format:
{
  "skills": ["skill1", "skill2"] or null,
  "experience_years": number or null,
  "title": "job title" or null,
  "summary": "professional summary" or null,
  "education": "degree and school" or null,
  "location": "location" or null,
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
            content: 'You are an expert resume parser that extracts accurate information. You only extract clearly visible information and never make assumptions. Always respond with valid JSON.'
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

    // Parse AI response
    console.log('=== PARSING AI RESPONSE ===');
    let extractedData;
    try {
      let content = openAIData.choices[0].message.content.trim();
      console.log('Raw AI content:', content);
      
      // Clean markdown formatting
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      
      // Extract JSON object
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

    // Prepare database update
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Validate and add fields
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .slice(0, 50); // Limit to 50 skills
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }
    
    if (extractedData.experience_years && typeof extractedData.experience_years === 'number' && extractedData.experience_years > 0 && extractedData.experience_years <= 50) {
      updateData.experience_years = extractedData.experience_years;
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim().length > 2) {
      updateData.title = extractedData.title.trim().substring(0, 200);
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim().length > 10) {
      updateData.summary = extractedData.summary.trim().substring(0, 1000);
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim().length > 5) {
      updateData.education = extractedData.education.trim().substring(0, 500);
    }
    
    if (extractedData.location && typeof extractedData.location === 'string' && extractedData.location.trim().length > 2) {
      updateData.location = extractedData.location.trim().substring(0, 200);
    }
    
    if (extractedData.phone && typeof extractedData.phone === 'string' && extractedData.phone.trim().length > 5) {
      const cleanPhone = extractedData.phone.trim().replace(/[^\d+\-\s\(\)]/g, '');
      if (cleanPhone.length >= 7) {
        updateData.phone = cleanPhone.substring(0, 20);
      }
    }
    
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string' && extractedData.linkedin_url.includes('linkedin')) {
      updateData.linkedin_url = extractedData.linkedin_url.trim().substring(0, 500);
    }
    
    if (extractedData.github_url && typeof extractedData.github_url === 'string' && extractedData.github_url.includes('github')) {
      updateData.github_url = extractedData.github_url.trim().substring(0, 500);
    }
    
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string' && extractedData.portfolio_url.includes('http')) {
      updateData.portfolio_url = extractedData.portfolio_url.trim().substring(0, 500);
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
    console.log('Profile updated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data extracted and profile updated successfully'
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
