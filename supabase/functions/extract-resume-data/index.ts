
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

// Completely rewritten PDF text extraction with robust content detection
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('=== ROBUST PDF TEXT EXTRACTION ===');
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let pdfString = '';
    
    // Convert to string with fallback encoding strategies
    try {
      pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch {
      try {
        pdfString = new TextDecoder('latin1').decode(uint8Array);
      } catch {
        // Fallback: byte-by-byte conversion
        pdfString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      }
    }
    
    console.log('PDF string length:', pdfString.length);
    console.log('PDF preview (first 1000 chars):', pdfString.substring(0, 1000));
    
    const extractedTexts = new Set<string>();
    
    // Strategy 1: Extract from stream objects (most common for text content)
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    let streamCount = 0;
    
    while ((streamMatch = streamRegex.exec(pdfString)) !== null && streamCount < 50) {
      streamCount++;
      const streamContent = streamMatch[1];
      
      if (streamContent && streamContent.length > 50) {
        console.log(`Processing stream ${streamCount}, length: ${streamContent.length}`);
        
        // Look for readable text patterns in the stream
        const readableTexts = extractReadableText(streamContent);
        readableTexts.forEach(text => extractedTexts.add(text));
        
        // Try to decode if it looks like compressed content
        if (streamContent.includes('FlateDecode') || streamContent.length > 200) {
          const decodedText = attemptTextDecoding(streamContent);
          if (decodedText) {
            const moreTexts = extractReadableText(decodedText);
            moreTexts.forEach(text => extractedTexts.add(text));
          }
        }
      }
    }
    
    // Strategy 2: Extract from text show operations (Tj, TJ operators)
    const textShowPatterns = [
      // Standard text show operations
      /\(([^)]{3,})\)\s*Tj/g,
      /\(([^)]{3,})\)\s*TJ/g,
      // Text arrays
      /\[([^\]]{10,})\]\s*TJ/g,
      // Text with positioning
      /\(([^)]{5,})\)\s*[\d\s.-]+\s*T[dm]/g,
    ];
    
    for (const pattern of textShowPatterns) {
      let match;
      while ((match = pattern.exec(pdfString)) !== null) {
        const text = match[1];
        if (text) {
          const cleanedTexts = cleanAndSplitText(text);
          cleanedTexts.forEach(t => {
            if (t.length > 2 && isValidResumeText(t)) {
              extractedTexts.add(t);
            }
          });
        }
      }
    }
    
    // Strategy 3: Look for content between BT/ET (text objects)
    const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let textObjectMatch;
    
    while ((textObjectMatch = textObjectRegex.exec(pdfString)) !== null) {
      const textObject = textObjectMatch[1];
      if (textObject && textObject.length > 20) {
        const readableTexts = extractReadableText(textObject);
        readableTexts.forEach(text => extractedTexts.add(text));
      }
    }
    
    // Strategy 4: Direct text pattern matching for common resume content
    const directTextPatterns = [
      // Email addresses
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      // Phone numbers
      /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      // Names (assuming they appear in specific contexts)
      /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,
      // Professional titles
      /\b(?:Software|Senior|Junior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist|Architect|Designer|Coordinator|Administrator|Supervisor|Executive|Assistant|Associate|Intern)\s+[A-Za-z\s]{3,30}\b/g,
      // Education keywords
      /\b(?:Bachelor|Master|PhD|MBA|BS|BA|MS|MA|BE|BTech|MTech|BSc|MSc|University|College|Institute|Degree|Diploma|Certificate)\b[^.]{0,50}/g,
      // Skills and technologies
      /\b(?:JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node|HTML|CSS|SQL|MongoDB|PostgreSQL|MySQL|AWS|Azure|Docker|Kubernetes|Git|Linux|Windows)\b/g,
      // Dates and durations
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/g,
      /\b\d{4}\s*[-–]\s*(?:\d{4}|Present|Current|Now)\b/g,
      // Experience statements
      /\d+\+?\s+years?\s+(?:of\s+)?experience/gi,
    ];
    
    for (const pattern of directTextPatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = cleanText(match);
          if (cleaned.length > 2 && isValidResumeText(cleaned)) {
            extractedTexts.add(cleaned);
          }
        });
      }
    }
    
    // Combine and organize extracted text
    const allTexts = Array.from(extractedTexts)
      .filter(text => text.length > 3 && isValidResumeText(text))
      .sort((a, b) => {
        // Prioritize longer, more meaningful text
        const aScore = calculateTextScore(a);
        const bScore = calculateTextScore(b);
        return bScore - aScore;
      });
    
    let finalText = allTexts.join(' ');
    
    // Final cleanup
    finalText = finalText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('=== EXTRACTION RESULTS ===');
    console.log('Total unique text segments found:', allTexts.length);
    console.log('Final text length:', finalText.length);
    console.log('Final text preview:', finalText.substring(0, 1500));
    
    return finalText;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    return '';
  }
}

// Extract readable text from content using multiple strategies
function extractReadableText(content: string): string[] {
  const texts = [];
  
  // Look for parentheses-enclosed text (common in PDF text operations)
  const parenRegex = /\(([^)]{3,200})\)/g;
  let match;
  while ((match = parenRegex.exec(content)) !== null) {
    const text = cleanText(match[1]);
    if (text.length > 2 && isValidResumeText(text)) {
      texts.push(text);
    }
  }
  
  // Look for quoted text
  const quoteRegex = /"([^"]{3,200})"/g;
  while ((match = quoteRegex.exec(content)) !== null) {
    const text = cleanText(match[1]);
    if (text.length > 2 && isValidResumeText(text)) {
      texts.push(text);
    }
  }
  
  // Look for words separated by spaces (potential readable content)
  const wordRegex = /\b[A-Za-z]{3,}(?:\s+[A-Za-z]{2,}){2,}\b/g;
  while ((match = wordRegex.exec(content)) !== null) {
    const text = cleanText(match[0]);
    if (text.length > 5 && isValidResumeText(text)) {
      texts.push(text);
    }
  }
  
  return texts;
}

// Attempt to decode potentially compressed or encoded text
function attemptTextDecoding(content: string): string | null {
  try {
    // Try to find and decode hex-encoded strings
    const hexMatches = content.match(/[0-9a-fA-F]{20,}/g);
    if (hexMatches) {
      for (const hex of hexMatches) {
        try {
          const decoded = hex.match(/.{2}/g)
            ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
            .join('');
          if (decoded && /[a-zA-Z]{5,}/.test(decoded)) {
            return decoded;
          }
        } catch {}
      }
    }
    
    // Try to decode octal sequences
    const octalDecoded = content.replace(/\\(\d{3})/g, (_, octal) => {
      try {
        return String.fromCharCode(parseInt(octal, 8));
      } catch {
        return '';
      }
    });
    
    if (octalDecoded !== content && /[a-zA-Z]{5,}/.test(octalDecoded)) {
      return octalDecoded;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Clean and split text into meaningful segments
function cleanAndSplitText(text: string): string[] {
  const cleaned = cleanText(text);
  
  // Split by common separators while preserving meaningful chunks
  const segments = cleaned.split(/[\(\)\\\/\[\]{}|<>]+/)
    .map(segment => segment.trim())
    .filter(segment => segment.length > 2);
  
  return segments;
}

// Clean text from PDF artifacts
function cleanText(text: string): string {
  return text
    // Handle common PDF escape sequences
    .replace(/\\([0-7]{3})/g, (_, octal) => {
      try {
        return String.fromCharCode(parseInt(octal, 8));
      } catch {
        return '';
      }
    })
    .replace(/\\[nrt]/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if text is valid resume content
function isValidResumeText(text: string): boolean {
  if (text.length < 3) return false;
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Check letter to total character ratio
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  if (letterRatio < 0.4) return false;
  
  // Reject obvious PDF artifacts
  const pdfArtifacts = [
    /^[^a-zA-Z]*$/,
    /obj|endobj|stream|endstream|xref|trailer|startxref/i,
    /CMap|Font|Encoding|Unicode|FlateDecode|ASCII85Decode/i,
    /^\s*\d+\s*$/,
    /^[A-Z]{10,}$/,
    /^\w{1,2}$/,
    /BT|ET|Tj|TJ|Td|TD|Tm|q|Q|re|f|S|s|W|n/,
  ];
  
  return !pdfArtifacts.some(pattern => pattern.test(text));
}

// Calculate text quality score for prioritization
function calculateTextScore(text: string): number {
  let score = text.length;
  
  // Bonus for containing common resume keywords
  const resumeKeywords = [
    'experience', 'education', 'skills', 'work', 'university', 'college',
    'developer', 'engineer', 'manager', 'analyst', 'consultant',
    'bachelor', 'master', 'degree', 'certification',
    'javascript', 'python', 'java', 'react', 'angular', 'node'
  ];
  
  const lowercaseText = text.toLowerCase();
  resumeKeywords.forEach(keyword => {
    if (lowercaseText.includes(keyword)) {
      score += 50;
    }
  });
  
  // Bonus for email addresses and phone numbers
  if (/@/.test(text)) score += 100;
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) score += 80;
  
  // Bonus for proper sentence structure
  if (/^[A-Z].*[.!?]$/.test(text)) score += 30;
  
  return score;
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

    // Extract text from PDF with robust algorithm
    console.log('=== ROBUST TEXT EXTRACTION ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Final extracted text length:', resumeText.length);
    console.log('Final extracted text preview:', resumeText.substring(0, 2000));

    if (!resumeText || resumeText.length < 50) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or have complex formatting. Please try uploading a text-based PDF.',
        success: false,
        debugInfo: {
          extractedTextLength: resumeText.length,
          extractedTextSample: resumeText.substring(0, 1000)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI prompt for better extraction
    console.log('=== CALLING OPENAI FOR DATA EXTRACTION ===');
    const prompt = `You are an expert resume parser. Extract ALL available information from this resume text and return it as valid JSON.

RESUME TEXT:
"${resumeText}"

Extract information carefully and return ONLY valid JSON in this exact structure (no markdown, no code blocks):

{
  "personal_info": {
    "full_name": "exact name found or null",
    "email": "email address or null",
    "phone": "phone number or null", 
    "location": "city, state/country or null",
    "linkedin_url": "LinkedIn URL or null",
    "github_url": "GitHub URL or null",
    "portfolio_url": "portfolio/website URL or null"
  },
  "professional_summary": {
    "current_role": "most recent job title or null",
    "summary": "professional summary/objective text or null",
    "total_experience_years": "number of years of experience or null",
    "industry": "primary industry/field or null"
  },
  "education": {
    "qualification": "highest degree with field or null",
    "institution": "university/college name or null", 
    "graduation_year": "graduation year or null",
    "additional_qualifications": "other degrees, certifications or null"
  },
  "skills": {
    "technical_skills": ["list of technical skills"],
    "programming_languages": ["programming languages"],
    "tools_and_frameworks": ["tools, frameworks, software"],
    "soft_skills": ["soft skills, interpersonal skills"]
  },
  "work_experience": {
    "companies": ["company names"],
    "roles": ["job titles"],
    "current_company": "most recent company or null",
    "current_position": "most recent position or null", 
    "key_achievements": ["achievements, accomplishments"]
  },
  "additional_info": {
    "certifications": ["certifications"],
    "awards": ["awards, honors"],
    "projects": ["project names/descriptions"],
    "languages": ["languages spoken"]
  }
}

Extract ALL information present in the resume. If information is not found, use null. Be thorough and accurate.`;

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
            content: 'You are an expert resume parser. Extract information accurately and respond only with valid JSON. Never use markdown formatting.'
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
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
      console.log('Raw AI content length:', content.length);
      console.log('Raw AI content preview:', content.substring(0, 500));
      
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

    // Update database with extracted data
    console.log('=== UPDATING DATABASE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map extracted data to profile fields
    const personal = extractedData.personal_info || {};
    const professional = extractedData.professional_summary || {};
    const education = extractedData.education || {};
    const skills = extractedData.skills || {};
    const work = extractedData.work_experience || {};
    const additional = extractedData.additional_info || {};

    // Update profile fields if data exists
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

    // Combine education information
    const educationParts = [];
    if (education.qualification) educationParts.push(education.qualification);
    if (education.institution) educationParts.push(education.institution);
    if (education.graduation_year) educationParts.push(education.graduation_year.toString());
    if (education.additional_qualifications) educationParts.push(education.additional_qualifications);
    
    if (educationParts.length > 0) {
      updateData.education = educationParts.join(' | ').substring(0, 500);
    }

    // Combine all skills
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
        .slice(0, 50);
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }

    console.log('Final update data:', JSON.stringify(updateData, null, 2));

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

    console.log('=== EXTRACTION SUCCESS ===');
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
