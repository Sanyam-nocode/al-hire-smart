
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

// Enhanced PDF text extraction with better algorithms
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('=== ENHANCED PDF TEXT EXTRACTION ===');
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert buffer to string with proper encoding handling
    let pdfString = '';
    try {
      // Try UTF-8 first
      pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch {
      try {
        // Fallback to latin1
        pdfString = new TextDecoder('latin1').decode(uint8Array);
      } catch {
        // Final fallback
        pdfString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      }
    }
    
    console.log('PDF string length after decoding:', pdfString.length);
    
    // Multiple extraction strategies for different PDF formats
    const extractedTexts = new Set<string>();
    
    // Strategy 1: Extract text from standard PDF text operations
    const textOperations = [
      // Basic text show operations
      /\(([^)]{3,100})\)\s*Tj/g,
      /\(([^)]{3,100})\)\s*TJ/g,
      /\[([^\]]{5,200})\]\s*TJ/g,
      
      // Text with positioning
      /\(([^)]{3,100})\)\s*[\d\s.-]+\s+T[dDm]/g,
      
      // Text in BT...ET blocks (text objects)
      /BT[\s\S]*?\(([^)]{3,100})\)[\s\S]*?ET/g,
      
      // Text arrays with spacing information
      /\[\s*\(([^)]{3,100})\)\s*(?:[\d.-]+\s*)*\]\s*TJ/g,
    ];
    
    for (const pattern of textOperations) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1];
        if (text && text.length > 2) {
          text = cleanPDFText(text);
          if (isValidText(text)) {
            extractedTexts.add(text);
          }
        }
      }
    }
    
    // Strategy 2: Extract from streams with better content detection
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
    const streamMatches = pdfString.matchAll(streamPattern);
    
    for (const match of streamMatches) {
      const streamContent = match[1];
      
      // Look for readable text patterns in streams
      const readablePatterns = [
        // Professional text patterns
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, // Names
        /\b[A-Z][a-zA-Z\s&]+(?:University|College|Institute|School)\b/g, // Education
        /\b(?:Bachelor|Master|PhD|MBA|BS|BA|MS|MA|BE|BTech|MTech)\b[^.]{0,50}/g, // Degrees
        /\b(?:Software|Senior|Junior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist)\b[^.]{0,50}/g, // Job titles
        /\b(?:JavaScript|Python|Java|React|Node|HTML|CSS|SQL|AWS|Docker|Git)\b/g, // Tech skills
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/g, // Dates
        /\b\d{4}\s*[-–]\s*(?:\d{4}|Present|Current)\b/g, // Date ranges
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Emails
        /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // Phone numbers
      ];
      
      for (const pattern of readablePatterns) {
        const matches = streamContent.match(pattern);
        if (matches) {
          matches.forEach(text => {
            const cleaned = cleanPDFText(text);
            if (cleaned.length > 2 && isValidText(cleaned)) {
              extractedTexts.add(cleaned);
            }
          });
        }
      }
    }
    
    // Strategy 3: Extract any remaining readable text
    const generalTextPattern = /[A-Za-z][A-Za-z0-9\s@.,\-_()]{8,100}(?=\s|$)/g;
    const generalMatches = pdfString.match(generalTextPattern);
    if (generalMatches) {
      generalMatches.forEach(text => {
        const cleaned = cleanPDFText(text);
        if (cleaned.length > 5 && isValidText(cleaned) && !isJunk(cleaned)) {
          extractedTexts.add(cleaned);
        }
      });
    }
    
    // Combine all extracted text
    extractedText = Array.from(extractedTexts)
      .filter(text => text.length > 3)
      .sort((a, b) => b.length - a.length) // Prioritize longer, more meaningful text
      .join(' ');
    
    // Final cleanup and structure
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('Enhanced extraction completed. Length:', extractedText.length);
    console.log('Sample extracted text:', extractedText.substring(0, 500));
    
    return extractedText;
  } catch (error) {
    console.error('Enhanced PDF extraction failed:', error);
    return '';
  }
}

// Clean PDF text from encoding issues
function cleanPDFText(text: string): string {
  return text
    // Handle PDF escape sequences
    .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if text is valid and meaningful
function isValidText(text: string): boolean {
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Must have reasonable letter to total character ratio
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  if (letterRatio < 0.4) return false;
  
  // Must have reasonable variety in characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 10)) return false;
  
  return true;
}

// Check if text is junk/artifacts
function isJunk(text: string): boolean {
  const junkPatterns = [
    /^[^a-zA-Z]*$/, // No letters
    /obj|endobj|stream|endstream|xref|trailer/i, // PDF artifacts
    /CMap|Font|Encoding|Unicode/i, // PDF metadata
    /^[\d\s.,-]+$/, // Only numbers and punctuation
  ];
  
  return junkPatterns.some(pattern => pattern.test(text));
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

    // Extract text from PDF with enhanced algorithm
    console.log('=== ENHANCED TEXT EXTRACTION ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Final extracted text length:', resumeText.length);
    console.log('Final extracted text preview:', resumeText.substring(0, 1000));

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based or corrupted.',
        success: false,
        debugInfo: {
          extractedTextLength: resumeText.length,
          extractedTextSample: resumeText.substring(0, 500)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI prompt for better extraction
    console.log('=== CALLING OPENAI WITH ENHANCED PROMPT ===');
    const prompt = `You are an expert resume parser. Extract information from this resume text with 100% accuracy. 

IMPORTANT INSTRUCTIONS:
- Extract EXACTLY what is written in the resume
- Use null only when information is genuinely not present
- For arrays, provide actual arrays even if empty []
- For experience years, calculate from work history dates
- Be precise with all data extraction

RESUME TEXT:
"${resumeText}"

Extract information in this EXACT JSON format:

{
  "personal_info": {
    "full_name": "Complete name from resume",
    "email": "Email address if found",
    "phone": "Phone number if found",
    "location": "City, State or location mentioned",
    "linkedin_url": "LinkedIn URL if found",
    "github_url": "GitHub URL if found",
    "portfolio_url": "Portfolio/website URL if found"
  },
  "professional_summary": {
    "current_role": "Most recent job title",
    "summary": "Professional summary or objective statement",
    "total_experience_years": "Calculate total years from work history",
    "industry": "Primary industry or field"
  },
  "education": {
    "qualification": "Highest degree with field (e.g., Bachelor of Science in Computer Science)",
    "institution": "University or college name",
    "graduation_year": "Year of graduation if mentioned",
    "additional_qualifications": "Other degrees or certifications"
  },
  "skills": {
    "technical_skills": ["List all technical skills mentioned"],
    "programming_languages": ["All programming languages"],
    "tools_and_frameworks": ["All tools, frameworks, software"],
    "soft_skills": ["All soft skills mentioned"]
  },
  "work_experience": {
    "companies": ["All company names worked at"],
    "roles": ["All job titles held"],
    "current_company": "Most recent company name",
    "current_position": "Most recent job title",
    "key_achievements": ["Major achievements mentioned"]
  },
  "additional_info": {
    "certifications": ["All certifications mentioned"],
    "awards": ["Any awards or recognitions"],
    "projects": ["Project names or descriptions"],
    "languages": ["Languages spoken if mentioned"]
  }
}

CRITICAL: Respond with ONLY the JSON object, no markdown formatting or explanations.`;

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
            content: 'You are a professional resume parser. Extract information accurately and respond only with valid JSON. Never use markdown formatting.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2500,
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
      console.log('Raw AI content:', content);
      
      // Clean any markdown formatting
      content = content.replace(/```json\s*|\s*```/g, '');
      content = content.replace(/```\s*|\s*```/g, '');
      
      // Find JSON object
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

    // Enhanced database update with comprehensive mapping
    console.log('=== PREPARING DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map all available data fields
    const personal = extractedData.personal_info || {};
    const professional = extractedData.professional_summary || {};
    const education = extractedData.education || {};
    const skills = extractedData.skills || {};
    const work = extractedData.work_experience || {};
    const additional = extractedData.additional_info || {};

    // Personal information
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

    // Professional information
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

    // Education
    const educationParts = [];
    if (education.qualification) educationParts.push(education.qualification);
    if (education.institution) educationParts.push(education.institution);
    if (education.graduation_year) educationParts.push(education.graduation_year.toString());
    if (education.additional_qualifications) educationParts.push(education.additional_qualifications);
    
    if (educationParts.length > 0) {
      updateData.education = educationParts.join(' | ').substring(0, 500);
    }

    // Skills - combine all skill arrays
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
        .slice(0, 50); // Reasonable limit
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
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
