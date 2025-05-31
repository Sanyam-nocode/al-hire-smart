
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

// Enhanced PDF text extraction
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting enhanced PDF text extraction, buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Convert to string using multiple encoding strategies
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
    
    // Enhanced text extraction patterns - more comprehensive
    const textExtractionPatterns = [
      // Basic text operations
      /\(([^)]*)\)\s*Tj/g,
      /\(([^)]*)\)\s*TJ/g,
      /\[([^\]]*)\]\s*TJ/g,
      
      // Text with positioning
      /\(([^)]*)\)\s*[\d.-]+\s+[\d.-]+\s+Td/g,
      /\(([^)]*)\)\s*[\d.-]+\s+[\d.-]+\s+TD/g,
      
      // Show text operations
      /\(([^)]*)\)\s*'/g,
      /\(([^)]*)\)\s*"/g,
      
      // Text in arrays with spacing
      /\[\s*\(([^)]*)\)\s*(?:[\d.-]+\s*)*\]\s*TJ/g,
      
      // More complex text operations
      /BT\s*(?:[^ET]*?)\s*\(([^)]*)\)[^ET]*?ET/g,
      
      // Extracted content between parentheses in streams
      /stream[\s\S]*?\(([^)]{3,})\)[\s\S]*?endstream/g,
      
      // Text between quotes
      /"([^"]{3,})"/g,
      /'([^']{3,})'/g,
    ];
    
    const foundTexts = new Set<string>();
    
    // Apply all patterns
    for (const pattern of textExtractionPatterns) {
      const matches = pdfString.matchAll(pattern);
      for (const match of matches) {
        let text = match[1];
        if (text && text.length > 0) {
          // Decode PDF text encoding
          text = decodePDFText(text);
          
          // Clean text
          text = cleanExtractedText(text);
          
          // Only add meaningful text
          if (text.length > 2 && isValidText(text)) {
            foundTexts.add(text);
          }
        }
      }
    }
    
    // Additional extraction from uncompressed streams
    const streamMatches = pdfString.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
    for (const match of streamMatches) {
      const streamContent = match[1];
      
      // Look for text that might be readable
      const textCandidates = streamContent.match(/[A-Za-z0-9@.,\-_\s]{10,}/g);
      if (textCandidates) {
        textCandidates.forEach(candidate => {
          const cleaned = cleanExtractedText(candidate);
          if (cleaned.length > 5 && isValidText(cleaned)) {
            foundTexts.add(cleaned);
          }
        });
      }
      
      // Extract text that looks like it's between text operators
      const betweenOperators = streamContent.match(/(?:BT|Tj|TJ)\s*.*?([A-Za-z][A-Za-z0-9\s.,\-@]{5,})/g);
      if (betweenOperators) {
        betweenOperators.forEach(text => {
          const cleaned = cleanExtractedText(text.replace(/(?:BT|Tj|TJ)\s*.*?/, ''));
          if (cleaned.length > 3 && isValidText(cleaned)) {
            foundTexts.add(cleaned);
          }
        });
      }
    }
    
    // Also try to find readable text in the entire PDF string
    const readableTextMatches = pdfString.match(/[A-Za-z][A-Za-z0-9\s.,\-@()]{15,}/g);
    if (readableTextMatches) {
      readableTextMatches.forEach(text => {
        const cleaned = cleanExtractedText(text);
        if (cleaned.length > 8 && isValidText(cleaned) && !isGibberish(cleaned)) {
          foundTexts.add(cleaned);
        }
      });
    }
    
    // Join all found text pieces
    extractedText = Array.from(foundTexts)
      .filter(text => text.length > 2)
      .join(' ');
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('Enhanced extraction completed, length:', extractedText.length);
    console.log('Sample text (first 500 chars):', extractedText.substring(0, 500));
    
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
      .replace(/\\([0-7]{1,2})/g, (_, code) => String.fromCharCode(parseInt(code, 8)))
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ');
    
    return text;
  } catch {
    return text;
  }
}

// Clean extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep printable ASCII and Unicode
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if text is valid (contains letters and meaningful content)
function isValidText(text: string): boolean {
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Must have reasonable character distribution
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.6) return false;
  
  // Shouldn't be mostly repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 8)) return false;
  
  // Shouldn't be common PDF artifacts
  const pdfArtifacts = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref'];
  if (pdfArtifacts.some(artifact => text.toLowerCase().includes(artifact))) return false;
  
  return true;
}

// Check if text appears to be gibberish
function isGibberish(text: string): boolean {
  // Reject text that's mostly non-alphanumeric
  const alphanumericRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / text.length;
  if (alphanumericRatio < 0.5) return true;
  
  // Reject text with too many repeated characters
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 8)) return true;
  
  // Reject very short fragments
  if (text.length < 5) return true;
  
  // Reject strings that are mostly numbers or symbols
  const letterRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (letterRatio < 0.4) return true;
  
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
    console.log('Extracted text preview:', resumeText.substring(0, 1000));

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or have an unusual format.',
        success: false,
        debugInfo: {
          extractedTextLength: resumeText.length,
          extractedTextSample: resumeText.substring(0, 300)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI prompt for comprehensive data extraction
    console.log('=== CALLING OPENAI FOR COMPREHENSIVE DATA EXTRACTION ===');
    const prompt = `You are an expert resume parser and data analyst. Please analyze this resume text thoroughly and extract comprehensive professional information.

RESUME TEXT:
"${resumeText}"

Please extract and summarize the following information with high accuracy. Look carefully for ALL details mentioned:

IMPORTANT: Extract actual values from the resume text. If information is not clearly stated, use "null" for that field.

Please provide the extracted information in this exact JSON format:

{
  "personal_info": {
    "full_name": "extracted full name or null",
    "email": "email address or null", 
    "phone": "phone number or null",
    "location": "city, state/country or null",
    "linkedin_url": "LinkedIn profile URL or null",
    "github_url": "GitHub profile URL or null",
    "portfolio_url": "portfolio/website URL or null"
  },
  "professional_summary": {
    "current_role": "most recent job title or null",
    "summary": "professional summary/objective or null",
    "total_experience_years": "calculated years of experience as number or null"
  },
  "education": {
    "qualification": "highest degree with field of study or null",
    "institution": "university/college name or null",
    "graduation_year": "year of graduation or null",
    "additional_education": "certifications, additional degrees or null"
  },
  "skills": {
    "technical_skills": ["list of technical skills"] or null,
    "programming_languages": ["list of programming languages"] or null,
    "tools_and_frameworks": ["list of tools and frameworks"] or null,
    "soft_skills": ["list of soft skills"] or null
  },
  "work_experience": {
    "companies": ["list of company names worked at"] or null,
    "roles": ["list of job titles held"] or null,
    "experience_summary": "brief summary of work experience or null"
  },
  "additional_info": {
    "salary_expectation": "mentioned salary range as text or null",
    "availability": "availability information or null",
    "notable_achievements": "key achievements or awards or null"
  }
}

EXTRACTION RULES:
- Extract only information that is explicitly mentioned in the resume
- For experience_years: Calculate based on work history dates or explicit statements
- For skills: Extract ALL mentioned technical skills, programming languages, tools, frameworks
- For education: Include degree type, field of study, institution, and year if available
- For contact info: Extract as written in the resume
- Use null for any field where information is not found
- Ensure all extracted data is accurate and directly from the resume text`;

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
            content: 'You are an expert resume parser that extracts comprehensive and accurate information from resume text. Always respond with valid JSON containing all the requested fields. Be thorough and accurate in your extraction.'
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
    console.log('=== PARSING COMPREHENSIVE AI RESPONSE ===');
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
      console.log('Successfully parsed comprehensive extracted data:', JSON.stringify(extractedData, null, 2));
      
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

    // Prepare comprehensive database update
    console.log('=== PREPARING COMPREHENSIVE DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map personal info
    if (extractedData.personal_info) {
      const personal = extractedData.personal_info;
      
      if (personal.email && typeof personal.email === 'string' && personal.email.includes('@')) {
        updateData.email = personal.email.trim().substring(0, 255);
        console.log('Adding email:', updateData.email);
      }
      
      if (personal.phone && typeof personal.phone === 'string' && personal.phone.trim().length > 5) {
        const cleanPhone = personal.phone.trim().replace(/[^\d+\-\s\(\)]/g, '');
        if (cleanPhone.length >= 7) {
          updateData.phone = cleanPhone.substring(0, 20);
          console.log('Adding phone:', updateData.phone);
        }
      }
      
      if (personal.location && typeof personal.location === 'string' && personal.location.trim().length > 2) {
        updateData.location = personal.location.trim().substring(0, 200);
        console.log('Adding location:', updateData.location);
      }
      
      if (personal.linkedin_url && typeof personal.linkedin_url === 'string' && personal.linkedin_url.includes('linkedin')) {
        updateData.linkedin_url = personal.linkedin_url.trim().substring(0, 500);
        console.log('Adding LinkedIn URL:', updateData.linkedin_url);
      }
      
      if (personal.github_url && typeof personal.github_url === 'string' && personal.github_url.includes('github')) {
        updateData.github_url = personal.github_url.trim().substring(0, 500);
        console.log('Adding GitHub URL:', updateData.github_url);
      }
      
      if (personal.portfolio_url && typeof personal.portfolio_url === 'string' && personal.portfolio_url.includes('http')) {
        updateData.portfolio_url = personal.portfolio_url.trim().substring(0, 500);
        console.log('Adding portfolio URL:', updateData.portfolio_url);
      }
    }

    // Map professional info
    if (extractedData.professional_summary) {
      const professional = extractedData.professional_summary;
      
      if (professional.current_role && typeof professional.current_role === 'string' && professional.current_role.trim().length > 2) {
        updateData.title = professional.current_role.trim().substring(0, 200);
        console.log('Adding current role/title:', updateData.title);
      }
      
      if (professional.summary && typeof professional.summary === 'string' && professional.summary.trim().length > 10) {
        updateData.summary = professional.summary.trim().substring(0, 1000);
        console.log('Adding professional summary:', updateData.summary.substring(0, 100) + '...');
      }
      
      if (professional.total_experience_years && typeof professional.total_experience_years === 'number' && professional.total_experience_years > 0 && professional.total_experience_years <= 50) {
        updateData.experience_years = professional.total_experience_years;
        console.log('Adding experience years:', updateData.experience_years);
      }
    }

    // Map education
    if (extractedData.education) {
      const education = extractedData.education;
      const educationParts = [];
      
      if (education.qualification) educationParts.push(education.qualification);
      if (education.institution) educationParts.push(education.institution);
      if (education.graduation_year) educationParts.push(education.graduation_year);
      if (education.additional_education) educationParts.push(education.additional_education);
      
      if (educationParts.length > 0) {
        updateData.education = educationParts.join(', ').substring(0, 500);
        console.log('Adding education:', updateData.education);
      }
    }

    // Map skills comprehensively
    const allSkills = [];
    if (extractedData.skills) {
      const skills = extractedData.skills;
      
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
    }
    
    if (allSkills.length > 0) {
      const validSkills = allSkills
        .filter(skill => skill && typeof skill === 'string' && skill.trim().length > 1)
        .map(skill => skill.trim())
        .slice(0, 50); // Limit to 50 skills
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
        console.log('Adding comprehensive skills:', validSkills.length, 'skills total');
      }
    }

    console.log('Final comprehensive update data:', JSON.stringify(updateData, null, 2));

    // Update candidate profile with comprehensive data
    console.log('=== UPDATING DATABASE WITH COMPREHENSIVE DATA ===');
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
    console.log('Profile updated successfully with comprehensive data');

    return new Response(JSON.stringify({ 
      success: true,
      extractedData,
      updatedProfile,
      message: 'Resume data comprehensively extracted and profile updated successfully'
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
