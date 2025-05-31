
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

// Simplified but more effective PDF text extraction
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string for text extraction
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // Simple but effective text extraction patterns
    const textPatterns = [
      // Text in parentheses (most common)
      /\(([^)]+)\)/g,
      // Text after Tj operator
      /\(([^)]*)\)\s*Tj/g,
      // Text in brackets for TJ operator
      /\[([^\]]+)\]\s*TJ/g,
      // Simple readable text (fallback)
      /[A-Za-z][A-Za-z\s]{10,}/g,
    ];
    
    // Extract text using patterns
    for (const pattern of textPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        const text = match[1] || match[0];
        if (text && text.length > 2) {
          // Clean up the text
          const cleanText = text
            .replace(/\\n|\\r|\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanText && /[a-zA-Z]/.test(cleanText)) {
            extractedText += cleanText + ' ';
          }
        }
      }
    }
    
    // Final cleanup
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    console.log('Extracted text length:', extractedText.length);
    console.log('First 200 chars:', extractedText.substring(0, 200));
    
    if (extractedText.length < 50) {
      console.log('Very little text extracted, trying fallback...');
      // Fallback: look for any readable sequences
      const fallbackMatches = pdfString.match(/[A-Za-z][A-Za-z\s.,;:-]{20,}/g);
      if (fallbackMatches) {
        extractedText = fallbackMatches.join(' ').replace(/\s+/g, ' ').trim();
        console.log('Fallback extraction length:', extractedText.length);
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
    console.log('Sample text:', resumeText.substring(0, 500));

    if (!resumeText || resumeText.length < 20) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient text from PDF. Please ensure the PDF contains readable text.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI API
    console.log('=== CALLING OPENAI ===');
    const prompt = `Extract information from this resume text and return ONLY a JSON object with these exact fields:

Resume Text: "${resumeText}"

Return JSON with these fields (use null for missing data):
{
  "skills": ["skill1", "skill2"],
  "experience_years": 5,
  "title": "Job Title",
  "summary": "Professional summary",
  "education": "Degree and institution",
  "location": "City, State",
  "phone": "Phone number",
  "linkedin_url": "LinkedIn URL",
  "github_url": "GitHub URL", 
  "portfolio_url": "Portfolio URL"
}`;

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
            content: 'You are a resume parser. Extract data and return ONLY valid JSON with the requested fields. No markdown, no explanations, just JSON.'
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
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${openAIResponse.status}`,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', openAIData);

    if (!openAIData.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response');
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
      
      // Remove markdown code blocks if present
      content = content.replace(/```json\s*|\s*```/g, '');
      
      // Try to find JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      extractedData = JSON.parse(content);
      console.log('Parsed extracted data:', extractedData);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed:', openAIData.choices[0].message.content);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response as JSON',
        success: false,
        debugInfo: {
          rawResponse: openAIData.choices[0].message.content
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare update data
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Add fields to update with basic validation
    if (extractedData.skills && Array.isArray(extractedData.skills)) {
      updateData.skills = extractedData.skills.filter(skill => skill && typeof skill === 'string');
    }
    
    if (extractedData.experience_years && !isNaN(Number(extractedData.experience_years))) {
      updateData.experience_years = Number(extractedData.experience_years);
    }
    
    if (extractedData.title && typeof extractedData.title === 'string') {
      updateData.title = extractedData.title.trim();
    }
    
    if (extractedData.summary && typeof extractedData.summary === 'string') {
      updateData.summary = extractedData.summary.trim();
    }
    
    if (extractedData.education && typeof extractedData.education === 'string') {
      updateData.education = extractedData.education.trim();
    }
    
    if (extractedData.location && typeof extractedData.location === 'string') {
      updateData.location = extractedData.location.trim();
    }
    
    if (extractedData.phone && typeof extractedData.phone === 'string') {
      updateData.phone = extractedData.phone.trim();
    }
    
    if (extractedData.linkedin_url && typeof extractedData.linkedin_url === 'string') {
      updateData.linkedin_url = extractedData.linkedin_url.trim();
    }
    
    if (extractedData.github_url && typeof extractedData.github_url === 'string') {
      updateData.github_url = extractedData.github_url.trim();
    }
    
    if (extractedData.portfolio_url && typeof extractedData.portfolio_url === 'string') {
      updateData.portfolio_url = extractedData.portfolio_url.trim();
    }

    console.log('Update data prepared:', updateData);

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
    console.log('Updated profile:', updatedProfile);

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
