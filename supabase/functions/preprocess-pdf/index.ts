
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced PDF text extraction with proper stream parsing
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('=== ADVANCED PDF TEXT EXTRACTION ===');
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    const extractedTexts = new Set<string>();
    
    // Convert to string for parsing
    let pdfString = '';
    try {
      // Try different encodings
      const decoder = new TextDecoder('latin1');
      pdfString = decoder.decode(uint8Array);
    } catch (error) {
      console.error('Encoding error:', error);
      return '';
    }
    
    console.log('PDF content length:', pdfString.length);
    console.log('PDF content sample:', pdfString.substring(0, 500));
    
    // Strategy 1: Extract from decompressed streams
    await extractFromStreams(pdfString, extractedTexts);
    
    // Strategy 2: Extract from text showing operators
    extractFromTextOperators(pdfString, extractedTexts);
    
    // Strategy 3: Extract from font and text objects
    extractFromTextObjects(pdfString, extractedTexts);
    
    // Strategy 4: Pattern-based extraction for common resume elements
    extractResumePatterns(pdfString, extractedTexts);
    
    // Combine and clean extracted texts
    const allTexts = Array.from(extractedTexts)
      .filter(text => text && text.length > 2 && isValidText(text))
      .sort((a, b) => calculateRelevanceScore(b) - calculateRelevanceScore(a));
    
    console.log('Total extracted segments:', allTexts.length);
    console.log('Sample segments:', allTexts.slice(0, 10));
    
    // Build final text
    let finalText = allTexts.join(' ').substring(0, 15000);
    
    // Clean and normalize
    finalText = cleanExtractedText(finalText);
    
    console.log('Final extracted text length:', finalText.length);
    console.log('Final text preview:', finalText.substring(0, 1000));
    
    return finalText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

// Extract text from PDF streams
async function extractFromStreams(pdfString: string, extractedTexts: Set<string>) {
  console.log('=== EXTRACTING FROM STREAMS ===');
  
  // Find all stream objects
  const streamRegex = /(\d+\s+\d+\s+obj[\s\S]*?stream\s*\n)([\s\S]*?)(endstream)/g;
  let streamMatch;
  let streamCount = 0;
  
  while ((streamMatch = streamRegex.exec(pdfString)) !== null && streamCount < 50) {
    streamCount++;
    const streamContent = streamMatch[2];
    
    if (streamContent && streamContent.length > 10) {
      // Try to find readable text patterns in the stream
      const readableText = extractReadableFromStream(streamContent);
      if (readableText) {
        extractedTexts.add(readableText);
      }
    }
  }
  
  console.log(`Processed ${streamCount} streams`);
}

// Extract readable text from stream content
function extractReadableFromStream(streamContent: string): string {
  const texts: string[] = [];
  
  // Look for text between parentheses (common in PDF text streams)
  const parenthesesRegex = /\(([^)]{3,100})\)/g;
  let match;
  while ((match = parenthesesRegex.exec(streamContent)) !== null) {
    const text = cleanPDFText(match[1]);
    if (text && isValidText(text)) {
      texts.push(text);
    }
  }
  
  // Look for text in arrays (TJ operator)
  const arrayRegex = /\[([^\]]{10,500})\]/g;
  while ((match = arrayRegex.exec(streamContent)) !== null) {
    const arrayContent = match[1];
    const stringRegex = /\(([^)]{2,100})\)/g;
    let stringMatch;
    while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
      const text = cleanPDFText(stringMatch[1]);
      if (text && isValidText(text)) {
        texts.push(text);
      }
    }
  }
  
  // Look for readable ASCII sequences
  const asciiRegex = /[A-Za-z][A-Za-z0-9\s@.,\-_]{4,100}[A-Za-z0-9]/g;
  while ((match = asciiRegex.exec(streamContent)) !== null) {
    const text = cleanPDFText(match[0]);
    if (text && isValidText(text) && !text.includes('Font') && !text.includes('Encoding')) {
      texts.push(text);
    }
  }
  
  return texts.join(' ').trim();
}

// Extract from text showing operators
function extractFromTextOperators(pdfString: string, extractedTexts: Set<string>) {
  console.log('=== EXTRACTING FROM TEXT OPERATORS ===');
  
  // BT/ET text objects
  const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let textMatch;
  let count = 0;
  
  while ((textMatch = textObjectRegex.exec(pdfString)) !== null && count < 100) {
    count++;
    const textContent = textMatch[1];
    
    // Extract Tj operations
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(textContent)) !== null) {
      const text = cleanPDFText(tjMatch[1]);
      if (text && isValidText(text)) {
        extractedTexts.add(text);
      }
    }
    
    // Extract TJ operations (text arrays)
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((tjMatch = tjArrayRegex.exec(textContent)) !== null) {
      const arrayContent = tjMatch[1];
      const stringRegex = /\(([^)]+)\)/g;
      let stringMatch;
      while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
        const text = cleanPDFText(stringMatch[1]);
        if (text && isValidText(text)) {
          extractedTexts.add(text);
        }
      }
    }
  }
  
  console.log(`Processed ${count} text objects`);
}

// Extract from general text objects and fonts
function extractFromTextObjects(pdfString: string, extractedTexts: Set<string>) {
  console.log('=== EXTRACTING FROM TEXT OBJECTS ===');
  
  // Look for any parentheses-enclosed text throughout the PDF
  const globalTextRegex = /\(([^)]{3,200})\)/g;
  let match;
  let count = 0;
  
  while ((match = globalTextRegex.exec(pdfString)) !== null && count < 1000) {
    count++;
    const text = cleanPDFText(match[1]);
    if (text && isValidText(text)) {
      extractedTexts.add(text);
    }
  }
  
  console.log(`Extracted ${count} potential text segments`);
}

// Extract resume-specific patterns
function extractResumePatterns(pdfString: string, extractedTexts: Set<string>) {
  console.log('=== EXTRACTING RESUME PATTERNS ===');
  
  const patterns = [
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // Phone numbers (various formats)
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // Years and date ranges
    /\b(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)\b/g,
    // Educational institutions
    /\b(?:University|College|Institute|School)\s+(?:of\s+)?[A-Za-z\s]{5,50}/g,
    // Degree names
    /\b(?:Bachelor|Master|PhD|MBA|BS|BA|MS|MA|BE|BTech|MTech|BSc|MSc)\s+(?:of\s+)?[A-Za-z\s]{3,30}/g,
    // Job titles
    /\b(?:Software|Senior|Junior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist|Architect|Designer|Intern)\s+[A-Za-z\s]{3,40}/g,
    // Skills and technologies
    /\b(?:JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node\.?js|HTML|CSS|SQL|MongoDB|PostgreSQL|MySQL|AWS|Azure|Docker|Kubernetes|Git|Linux|Windows|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Scala|Go|Rust|Flutter|Django|Spring|Laravel|Express)\b/g,
    // Experience statements
    /\d+\+?\s+years?\s+(?:of\s+)?(?:experience|exp)\s+(?:in\s+)?[A-Za-z\s]{3,50}/gi,
    // Company names (look for common patterns)
    /\b(?:Inc|LLC|Ltd|Corp|Corporation|Company|Technologies|Solutions|Systems|Group|International|Global)\b/g,
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = pdfString.match(pattern);
    if (matches) {
      console.log(`Pattern ${index + 1} found ${matches.length} matches`);
      matches.forEach(match => {
        const cleaned = cleanPDFText(match);
        if (cleaned && isValidText(cleaned)) {
          extractedTexts.add(cleaned);
        }
      });
    }
  });
}

// Clean PDF text artifacts
function cleanPDFText(text: string): string {
  if (!text) return '';
  
  return text
    // Handle PDF escape sequences
    .replace(/\\([0-7]{3})/g, (_, octal) => {
      try {
        const charCode = parseInt(octal, 8);
        return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
      } catch {
        return ' ';
      }
    })
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
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
function isValidText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Check letter ratio - should be mostly readable
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  if (letterRatio < 0.4) return false;
  
  // Reject PDF artifacts and metadata
  const artifacts = [
    /^[^a-zA-Z]*$/,
    /obj|endobj|stream|endstream|xref|trailer|startxref/i,
    /Font|Encoding|Unicode|FlateDecode|ASCII85|Filter|Length|Width|Height/i,
    /^\s*\d+\s*$/,
    /^[A-Z]{8,}$/,
    /BT|ET|Tj|TJ|Td|TD|Tm|q|Q|re|f|S|s|W|n|cm|l|m|c|v|y/,
    /^\w{1,2}$/,
    /^[\d\s.]+$/,
    /Type\/|Subtype\/|BaseFont/i,
  ];
  
  if (artifacts.some(pattern => pattern.test(text))) return false;
  
  // Reject very short words or gibberish
  if (text.length < 3 && !/[@\d]/.test(text)) return false;
  
  return true;
}

// Clean the final extracted text
function cleanExtractedText(text: string): string {
  return text
    // Fix common PDF text issues
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase
    .replace(/(\d)([A-Za-z])/g, '$1 $2') // Add space between numbers and letters
    .replace(/([A-Za-z])(\d)/g, '$1 $2') // Add space between letters and numbers
    .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after sentences
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s([,.!?])/g, '$1') // Remove space before punctuation
    .trim();
}

// Calculate relevance score for sorting
function calculateRelevanceScore(text: string): number {
  let score = text.length;
  
  const lowerText = text.toLowerCase();
  
  // High bonus for contact information
  if (/@/.test(text)) score += 300;
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) score += 250;
  
  // Bonus for resume keywords
  const keywords = [
    'experience', 'education', 'skills', 'work', 'university', 'college',
    'developer', 'engineer', 'manager', 'analyst', 'consultant', 'designer',
    'bachelor', 'master', 'degree', 'certification', 'diploma',
    'javascript', 'python', 'java', 'react', 'angular', 'node', 'sql',
    'project', 'team', 'lead', 'senior', 'junior', 'intern'
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) score += 100;
  });
  
  // Bonus for years and dates
  if (/\b(19|20)\d{2}\b/.test(text)) score += 80;
  
  // Bonus for proper names (capitalized words)
  const capitalizedWords = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
  score += capitalizedWords * 20;
  
  // Penalty for very short text
  if (text.length < 5) score -= 50;
  
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl } = await req.json();
    console.log('=== PDF PREPROCESSING REQUEST ===');
    console.log('Resume URL:', resumeUrl);

    if (!resumeUrl) {
      return new Response(JSON.stringify({ 
        error: 'Resume URL is required',
        success: false 
      }), {
        status: 400,
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
    const extractedText = await extractTextFromPDF(pdfBuffer);
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('Final extracted text preview:', extractedText.substring(0, 2000));

    if (!extractedText || extractedText.length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based, encrypted, or have complex formatting.',
        success: false,
        debugInfo: {
          extractedTextLength: extractedText.length,
          extractedTextSample: extractedText.substring(0, 1000)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      extractedText,
      textLength: extractedText.length,
      message: 'PDF text extracted successfully with advanced parsing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== PREPROCESSING ERROR ===');
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
