
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
    console.log('=== ADVANCED PDF TEXT EXTRACTION ===');
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    const allExtractedTexts = new Set<string>();
    
    // Convert buffer to string with multiple encoding attempts
    let pdfString = '';
    try {
      pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch {
      try {
        pdfString = new TextDecoder('latin1').decode(uint8Array);
      } catch {
        pdfString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      }
    }
    
    console.log('PDF string length:', pdfString.length);
    
    // Strategy 1: Extract from decompressed streams with FlateDecode
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(pdfString)) !== null) {
      const streamContent = streamMatch[1];
      
      // Look for FlateDecode markers and try to extract readable text
      if (streamContent.includes('FlateDecode') || streamContent.length > 100) {
        // Extract readable text patterns from streams
        const readableTextPatterns = [
          // Complete sentences and phrases
          /[A-Z][a-z]{2,}\s+[a-z]{2,}(?:\s+[a-z]{2,})*[.!?]/g,
          // Professional titles and company names
          /\b(?:Software|Senior|Junior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist|Architect|Designer|Coordinator|Administrator|Supervisor|Executive|Assistant|Associate|Intern)\s+[A-Za-z\s]{3,30}/g,
          // Education related terms
          /\b(?:Bachelor|Master|PhD|MBA|BS|BA|MS|MA|BE|BTech|MTech|BSc|MSc|Doctorate|Degree|Diploma|Certificate)\s+(?:of|in|of\s+Science|of\s+Arts|of\s+Engineering)?\s*[A-Za-z\s]{3,50}/g,
          // University and school names
          /\b[A-Z][a-zA-Z\s&]{5,}(?:University|College|Institute|School|Academy)\b/g,
          // Technical skills
          /\b(?:JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node|HTML|CSS|SQL|MongoDB|PostgreSQL|MySQL|AWS|Azure|Docker|Kubernetes|Git|Linux|Windows|Mac|iOS|Android)\b/g,
          // Company names (capitalized words)
          /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|LLC|Ltd|Corporation|Corp|Company|Co|Technologies|Tech|Systems|Solutions|Services|Group|International|Global)\b/g,
          // Job responsibilities starting with action verbs
          /\b(?:Developed|Built|Created|Designed|Implemented|Managed|Led|Coordinated|Supervised|Analyzed|Optimized|Maintained|Troubleshot|Collaborated|Achieved|Delivered|Executed|Planned|Organized)\s+[a-z][^.]{10,100}[.!]/g,
          // Contact information
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          // Location patterns
          /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/g, // City, State
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2}\b/g, // City Name, State
          // Date patterns
          /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/g,
          /\d{1,2}\/\d{4}/g,
          /\d{4}\s*[-–]\s*(?:\d{4}|Present|Current|Now)\b/g,
          // Experience durations
          /\d+\+?\s+years?\s+(?:of\s+)?experience/gi,
          // LinkedIn and GitHub
          /linkedin\.com\/in\/[a-zA-Z0-9-]+/g,
          /github\.com\/[a-zA-Z0-9-]+/g,
        ];
        
        for (const pattern of readableTextPatterns) {
          const matches = streamContent.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const cleaned = cleanExtractedText(match);
              if (isValidText(cleaned)) {
                allExtractedTexts.add(cleaned);
              }
            });
          }
        }
      }
    }
    
    // Strategy 2: Extract text from text show operations with better parsing
    const textOperations = [
      // Text in parentheses with Tj/TJ operators
      /\(([^)]{3,200})\)\s*T[jJ]/g,
      // Text arrays with positioning
      /\[([^\]]{10,300})\]\s*TJ/g,
      // Text with positioning commands
      /\(([^)]{5,150})\)\s*[\d\s.-]+\s*T[dm]/g,
      // Text objects
      /BT\s*([\s\S]*?)\s*ET/g,
    ];
    
    for (const pattern of textOperations) {
      let match;
      while ((match = pattern.exec(pdfString)) !== null) {
        const text = match[1];
        if (text) {
          // Split by common PDF text separators and clean each part
          const parts = text.split(/[\(\)\\]/);
          for (const part of parts) {
            const cleaned = cleanExtractedText(part);
            if (cleaned.length > 3 && isValidText(cleaned)) {
              allExtractedTexts.add(cleaned);
            }
          }
        }
      }
    }
    
    // Strategy 3: Look for plain text patterns that might be embedded
    const plainTextPattern = /\b[A-Z][a-zA-Z\s]{20,200}\b/g;
    const plainTextMatches = pdfString.match(plainTextPattern);
    if (plainTextMatches) {
      plainTextMatches.forEach(text => {
        const cleaned = cleanExtractedText(text);
        if (cleaned.length > 10 && isValidText(cleaned) && !isJunkText(cleaned)) {
          allExtractedTexts.add(cleaned);
        }
      });
    }
    
    // Strategy 4: Extract specific resume sections if they exist
    const sectionPatterns = [
      /EXPERIENCE[\s\S]{0,1000}/gi,
      /EDUCATION[\s\S]{0,1000}/gi,
      /SKILLS[\s\S]{0,500}/gi,
      /SUMMARY[\s\S]{0,1000}/gi,
      /OBJECTIVE[\s\S]{0,1000}/gi,
      /PROJECTS[\s\S]{0,1000}/gi,
      /CERTIFICATIONS[\s\S]{0,500}/gi,
    ];
    
    for (const pattern of sectionPatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(section => {
          const cleaned = cleanExtractedText(section);
          if (cleaned.length > 10) {
            allExtractedTexts.add(cleaned);
          }
        });
      }
    }
    
    // Combine all extracted text and create a coherent document
    const extractedTexts = Array.from(allExtractedTexts)
      .filter(text => text.length > 5)
      .sort((a, b) => {
        // Prioritize longer, more meaningful text
        if (a.length !== b.length) return b.length - a.length;
        // Prioritize text with more letters vs numbers/symbols
        const aLetters = (a.match(/[a-zA-Z]/g) || []).length;
        const bLetters = (b.match(/[a-zA-Z]/g) || []).length;
        return bLetters - aLetters;
      });
    
    let finalText = extractedTexts.join(' ');
    
    // Final cleanup and normalization
    finalText = finalText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .replace(/\b(\d{4})\s*[-–]\s*(\d{4}|\w+)\b/g, '$1-$2')
      .trim();
    
    console.log('Advanced extraction completed. Final length:', finalText.length);
    console.log('Number of unique text segments:', extractedTexts.length);
    console.log('Sample extracted text:', finalText.substring(0, 800));
    
    return finalText;
  } catch (error) {
    console.error('Advanced PDF extraction failed:', error);
    return '';
  }
}

// Enhanced text cleaning function
function cleanExtractedText(text: string): string {
  return text
    // Handle PDF escape sequences and encodings
    .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\[nrt]/g, ' ')
    // Remove PDF operators and commands
    .replace(/\b(?:BT|ET|Tj|TJ|Td|TD|Tm|T\*|q|Q|gs|re|f|S|s|W|n)\b/g, ' ')
    // Remove numbers that look like PDF coordinates
    .replace(/\b\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\b/g, ' ')
    // Remove control characters and normalize whitespace
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Enhanced text validation
function isValidText(text: string): boolean {
  if (text.length < 3) return false;
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Check letter to total character ratio
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  if (letterRatio < 0.3) return false;
  
  // Must have reasonable character variety
  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < Math.max(3, text.length / 15)) return false;
  
  // Should not be mostly numbers
  const numberCount = (text.match(/\d/g) || []).length;
  if (numberCount > letterCount) return false;
  
  return true;
}

// Enhanced junk detection
function isJunkText(text: string): boolean {
  const junkPatterns = [
    /^[^a-zA-Z]*$/,
    /obj|endobj|stream|endstream|xref|trailer|startxref/i,
    /CMap|Font|Encoding|Unicode|FlateDecode|ASCII85Decode/i,
    /^[\d\s.,-]+$/,
    /^\s*\d+\s*$/,
    /^[A-Z]{4,}$/,
    /^\w{1,3}$/,
    /^[\s\d.,:-]+$/,
  ];
  
  return junkPatterns.some(pattern => pattern.test(text)) || 
         text.length < 4 || 
         text.split(/\s+/).length < 2;
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

    // Extract text from PDF with advanced algorithm
    console.log('=== ADVANCED TEXT EXTRACTION ===');
    const pdfBuffer = await fileData.arrayBuffer();
    const resumeText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Final extracted text length:', resumeText.length);
    console.log('Final extracted text preview:', resumeText.substring(0, 1500));

    if (!resumeText || resumeText.length < 100) {
      console.error('Insufficient text extracted from PDF');
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, password-protected, or have complex formatting.',
        success: false,
        debugInfo: {
          extractedTextLength: resumeText.length,
          extractedTextSample: resumeText.substring(0, 800)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI prompt for comprehensive extraction
    console.log('=== CALLING OPENAI WITH COMPREHENSIVE PROMPT ===');
    const prompt = `You are an expert resume parser with 100% accuracy. Analyze this resume text thoroughly and extract ALL available information.

RESUME TEXT TO ANALYZE:
"${resumeText}"

EXTRACTION INSTRUCTIONS:
- Extract EXACTLY what is written in the resume text
- Find ALL sections: personal info, experience, education, skills, projects, etc.
- For missing information, use null (not empty strings)
- Be comprehensive - don't miss any details
- Calculate experience years from work history dates if available
- Include ALL skills mentioned anywhere in the resume

Respond with ONLY this JSON structure (no markdown):

{
  "personal_info": {
    "full_name": "Complete name from resume or null",
    "email": "Email address found or null",
    "phone": "Phone number found or null", 
    "location": "City, State/Country or null",
    "linkedin_url": "LinkedIn URL or null",
    "github_url": "GitHub URL or null",
    "portfolio_url": "Portfolio/website URL or null"
  },
  "professional_summary": {
    "current_role": "Most recent job title or null",
    "summary": "Professional summary/objective text or null",
    "total_experience_years": "Total years calculated from work history or null",
    "industry": "Primary industry/field identified or null"
  },
  "education": {
    "qualification": "Highest degree with field (e.g., Bachelor of Science in Computer Science) or null",
    "institution": "University/college name or null", 
    "graduation_year": "Graduation year if mentioned or null",
    "additional_qualifications": "Other degrees, certifications, courses or null"
  },
  "skills": {
    "technical_skills": ["All technical skills found"],
    "programming_languages": ["All programming languages found"],
    "tools_and_frameworks": ["All tools, frameworks, software found"],
    "soft_skills": ["All soft skills found"]
  },
  "work_experience": {
    "companies": ["All company names worked at"],
    "roles": ["All job titles held"],
    "current_company": "Most recent company or null",
    "current_position": "Most recent position or null", 
    "key_achievements": ["Major achievements, accomplishments found"]
  },
  "additional_info": {
    "certifications": ["All certifications found"],
    "awards": ["Awards, honors, recognitions found"],
    "projects": ["Project names, descriptions found"],
    "languages": ["Languages spoken if mentioned"]
  }
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
            content: 'You are an expert resume parser. Extract ALL information accurately and respond only with valid JSON. Never use markdown formatting. Be thorough and comprehensive.'
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

    // Parse AI response with robust error handling
    console.log('=== PARSING COMPREHENSIVE AI RESPONSE ===');
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
      console.log('Successfully parsed comprehensive extracted data');
      
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
    console.log('=== PREPARING COMPREHENSIVE DATABASE UPDATE ===');
    const updateData: any = {
      resume_content: JSON.stringify(extractedData),
      updated_at: new Date().toISOString(),
    };

    // Map all available data fields comprehensively
    const personal = extractedData.personal_info || {};
    const professional = extractedData.professional_summary || {};
    const education = extractedData.education || {};
    const skills = extractedData.skills || {};
    const work = extractedData.work_experience || {};
    const additional = extractedData.additional_info || {};

    // Personal information mapping
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

    // Professional information mapping
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

    // Education mapping - combine all education information
    const educationParts = [];
    if (education.qualification) educationParts.push(education.qualification);
    if (education.institution) educationParts.push(education.institution);
    if (education.graduation_year) educationParts.push(education.graduation_year.toString());
    if (education.additional_qualifications) educationParts.push(education.additional_qualifications);
    
    if (educationParts.length > 0) {
      updateData.education = educationParts.join(' | ').substring(0, 500);
    }

    // Skills - comprehensive combination of all skill categories
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
        .slice(0, 100); // Increase limit for comprehensive skills
      
      if (validSkills.length > 0) {
        updateData.skills = validSkills;
      }
    }

    console.log('Final comprehensive update data:', JSON.stringify(updateData, null, 2));

    // Update candidate profile
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

    console.log('=== COMPREHENSIVE EXTRACTION SUCCESS ===');
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
