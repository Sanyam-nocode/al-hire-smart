
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

// Enhanced PDF text extraction with multiple strategies
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting enhanced PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string for text extraction with better encoding handling
    const pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    console.log('PDF string length:', pdfString.length);
    console.log('First 500 chars of PDF string:', pdfString.substring(0, 500));
    
    // Enhanced text extraction patterns - more comprehensive
    const textPatterns = [
      // Text in parentheses (most common in PDFs)
      /\(([^)]{2,})\)/g,
      // Text after Tj operator with better filtering
      /\(([^)]+)\)\s*Tj/g,
      // Text in square brackets for TJ operator
      /\[([^\]]+)\]\s*TJ/g,
      // Direct text patterns - look for words
      /[A-Za-z]{3,}(?:\s+[A-Za-z]{2,}){1,}/g,
      // Email patterns
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Phone patterns
      /[\+]?[(]?[\d\s\-\(\)]{10,}/g,
      // URL patterns
      /https?:\/\/[^\s)]+/g,
    ];
    
    // Extract text using all patterns
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1] || match[0];
        if (text && text.length > 1) {
          // Enhanced text cleaning
          text = text
            .replace(/\\n|\\r|\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s@.\-+()]/g, ' ')
            .trim();
          
          // Only add meaningful text (contains letters and reasonable length)
          if (text && text.length > 2 && /[a-zA-Z]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Additional fallback: try to extract any readable sequences
    if (extractedText.length < 100) {
      console.log('Primary extraction yielded little text, trying fallback methods...');
      
      // Look for sequences of readable characters
      const readableSequences = pdfString.match(/[A-Za-z0-9@.\-\s]{5,}/g);
      if (readableSequences) {
        for (const sequence of readableSequences) {
          const cleaned = sequence.replace(/\s+/g, ' ').trim();
          if (cleaned.length > 4 && /[a-zA-Z]/.test(cleaned)) {
            extractedText += cleaned + ' ';
          }
        }
      }
    }
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{4,}/g, '$1') // Remove repeated characters
      .trim();
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('Extracted text sample (first 1000 chars):', extractedText.substring(0, 1000));
    
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

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient text from PDF. Please ensure the PDF contains readable text.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI prompt with better instructions
    console.log('=== CALLING OPENAI ===');
    const prompt = `You are a professional resume parser. Extract information from this resume text and return a JSON object with the specified fields.

RESUME TEXT:
"${resumeText}"

INSTRUCTIONS:
- Extract ALL relevant skills mentioned in the resume (technical skills, programming languages, tools, frameworks, soft skills, etc.)
- Calculate experience years based on work history dates and current date
- Extract the most recent or primary job title
- Write a concise professional summary based on the resume content
- Extract education details (degree, institution, graduation year)
- Find contact information if available
- Be thorough and extract as much relevant information as possible
- If information is not clearly stated, infer reasonable values based on context
- For skills, include both explicitly mentioned skills and those implied by job descriptions

Return ONLY this JSON structure (no markdown, no explanations):
{
  "skills": ["skill1", "skill2", "skill3"],
  "experience_years": 5,
  "title": "Software Engineer",
  "summary": "Experienced professional with...",
  "education": "Bachelor's in Computer Science, XYZ University",
  "location": "City, State",
  "phone": "phone number",
  "linkedin_url": "LinkedIn URL",
  "github_url": "GitHub URL",
  "portfolio_url": "Portfolio URL"
}

IMPORTANT: 
- skills array should contain at least 5-10 skills if they exist in the resume
- experience_years should be calculated from work history
- title should be the most recent or relevant job title
- summary should be 2-3 sentences describing the candidate's background
- Use null only if information is completely unavailable`;

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
            content: 'You are an expert resume parser. Extract comprehensive information and return ONLY valid JSON. Be thorough in extracting skills, experience, and other details.'
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

    // Parse AI response with better error handling
    console.log('=== PARSING AI RESPONSE ===');
    let extractedData;
    try {
      let content = openAIData.choices[0].message.content.trim();
      console.log('Raw AI content length:', content.length);
      console.log('Raw AI content preview:', content.substring(0, 200));
      
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

    // Validate and add fields with enhanced validation
    if (extractedData.skills && Array.isArray(extractedData.skills) && extractedData.skills.length > 0) {
      const validSkills = extractedData.skills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 0)
        .map(skill => skill.trim());
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        console.log('Skills to update:', validSkills);
      }
    }
    
    if (extractedData.experience_years) {
      const expYears = Number(extractedData.experience_years);
      if (!isNaN(expYears) && expYears >= 0 && expYears <= 50) {
        updateData.experience_years = expYears;
        console.log('Experience years to update:', expYears);
      }
    }
    
    if (extractedData.title && typeof extractedData.title === 'string' && extractedData.title.trim()) {
      updateData.title = extractedData.title.trim();
      console.log('Title to update:', updateData.title);
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string' && extractedData.summary.trim()) {
      updateData.summary = extractedData.summary.trim();
      console.log('Summary to update:', updateData.summary.substring(0, 100) + '...');
    }
    
    if (extractedData.education && typeof extractedData.education === 'string' && extractedData.education.trim()) {
      updateData.education = extractedData.education.trim();
      console.log('Education to update:', updateData.education);
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
