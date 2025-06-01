
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced PDF text extraction using multiple strategies
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('=== ENHANCED PDF TEXT EXTRACTION ===');
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Strategy 1: Look for readable text in PDF structure
    const extractedTexts = new Set<string>();
    
    // Convert to string for pattern matching
    let pdfString = '';
    try {
      // Try UTF-8 first
      pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch {
      // Fallback to latin1
      pdfString = new TextDecoder('latin1').decode(uint8Array);
    }
    
    console.log('PDF string length:', pdfString.length);
    
    // Extract text from BT/ET blocks (text objects)
    const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let textMatch;
    
    while ((textMatch = textObjectRegex.exec(pdfString)) !== null) {
      const textContent = textMatch[1];
      if (textContent) {
        // Extract parentheses-enclosed text (Tj operations)
        const tjRegex = /\(([^)]+)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(textContent)) !== null) {
          const text = cleanPDFText(tjMatch[1]);
          if (text && text.length > 2 && isValidText(text)) {
            extractedTexts.add(text);
          }
        }
        
        // Extract text arrays (TJ operations)
        const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
        while ((tjMatch = tjArrayRegex.exec(textContent)) !== null) {
          const arrayContent = tjMatch[1];
          // Extract strings from the array
          const stringRegex = /\(([^)]+)\)/g;
          let stringMatch;
          while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
            const text = cleanPDFText(stringMatch[1]);
            if (text && text.length > 2 && isValidText(text)) {
              extractedTexts.add(text);
            }
          }
        }
      }
    }
    
    // Strategy 2: Look for stream objects with text content
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    let streamCount = 0;
    
    while ((streamMatch = streamRegex.exec(pdfString)) !== null && streamCount < 20) {
      streamCount++;
      const streamContent = streamMatch[1];
      
      if (streamContent && streamContent.length > 100) {
        // Try to find readable text patterns
        const readableTextRegex = /[A-Za-z]{3,}(?:\s+[A-Za-z]{2,}){1,}/g;
        const matches = streamContent.match(readableTextRegex);
        
        if (matches) {
          matches.forEach(match => {
            const cleaned = cleanPDFText(match);
            if (cleaned && cleaned.length > 5 && isValidText(cleaned)) {
              extractedTexts.add(cleaned);
            }
          });
        }
      }
    }
    
    // Strategy 3: Direct pattern matching for common resume elements
    const patterns = [
      // Email addresses
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      // Phone numbers
      /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      // Dates
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
      /\b\d{4}\s*[-–]\s*(?:\d{4}|Present|Current)\b/g,
      // Years of experience
      /\d+\+?\s+years?\s+(?:of\s+)?experience/gi,
      // Education keywords with context
      /\b(?:Bachelor|Master|PhD|MBA|BS|BA|MS|MA|BE|BTech|MTech|BSc|MSc|University|College|Institute)\b[^.]{0,100}/gi,
      // Job titles with context
      /\b(?:Software|Senior|Junior|Lead|Principal|Manager|Director|Engineer|Developer|Analyst|Consultant|Specialist|Architect|Designer)\s+[A-Za-z\s]{3,50}\b/g,
      // Skills and technologies
      /\b(?:JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node\.?js|HTML|CSS|SQL|MongoDB|PostgreSQL|MySQL|AWS|Azure|Docker|Kubernetes|Git|Linux|Windows|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Scala|Go|Rust)\b/g,
    ];
    
    patterns.forEach(pattern => {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = cleanPDFText(match);
          if (cleaned && cleaned.length > 2 && isValidText(cleaned)) {
            extractedTexts.add(cleaned);
          }
        });
      }
    });
    
    // Strategy 4: Extract text between common PDF delimiters
    const delimiterPatterns = [
      /\(([^)]{5,200})\)/g,  // Parentheses
      /"([^"]{5,200})"/g,    // Quotes
      /\[([^\]]{10,200})\]/g, // Brackets
    ];
    
    delimiterPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pdfString)) !== null) {
        const text = cleanPDFText(match[1]);
        if (text && text.length > 5 && isValidText(text)) {
          extractedTexts.add(text);
        }
      }
    });
    
    // Convert set to array and sort by relevance
    const allTexts = Array.from(extractedTexts)
      .filter(text => text.length > 3)
      .sort((a, b) => calculateRelevanceScore(b) - calculateRelevanceScore(a));
    
    // Combine texts intelligently
    let finalText = '';
    const usedTexts = new Set<string>();
    
    // Prioritize contact info and key details
    const priorityTexts = allTexts.filter(text => 
      /@/.test(text) || 
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) ||
      /(?:Bachelor|Master|PhD|MBA|University|College)/i.test(text) ||
      /(?:Software|Engineer|Developer|Manager|Director)/i.test(text) ||
      /(?:JavaScript|Python|Java|React|Angular|Node)/i.test(text)
    );
    
    priorityTexts.forEach(text => {
      if (!usedTexts.has(text.toLowerCase())) {
        finalText += text + ' ';
        usedTexts.add(text.toLowerCase());
      }
    });
    
    // Add remaining relevant texts
    allTexts.forEach(text => {
      if (!usedTexts.has(text.toLowerCase()) && finalText.length < 10000) {
        finalText += text + ' ';
        usedTexts.add(text.toLowerCase());
      }
    });
    
    // Clean up the final text
    finalText = finalText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();
    
    console.log('=== EXTRACTION COMPLETE ===');
    console.log('Total unique segments:', extractedTexts.size);
    console.log('Final text length:', finalText.length);
    console.log('Final text preview:', finalText.substring(0, 1000));
    
    return finalText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
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
  if (!text || text.length < 3) return false;
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Check letter ratio
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  if (letterRatio < 0.3) return false;
  
  // Reject PDF artifacts
  const artifacts = [
    /^[^a-zA-Z]*$/,
    /obj|endobj|stream|endstream|xref|trailer|startxref/i,
    /Font|Encoding|Unicode|FlateDecode|ASCII85/i,
    /^\s*\d+\s*$/,
    /^[A-Z]{8,}$/,
    /BT|ET|Tj|TJ|Td|TD|Tm|q|Q|re|f|S|s|W|n/,
    /^\w{1,2}$/,
  ];
  
  return !artifacts.some(pattern => pattern.test(text));
}

// Calculate relevance score for sorting
function calculateRelevanceScore(text: string): number {
  let score = text.length;
  
  const lowerText = text.toLowerCase();
  
  // Bonus for resume keywords
  const keywords = [
    'experience', 'education', 'skills', 'work', 'university', 'college',
    'developer', 'engineer', 'manager', 'analyst', 'consultant',
    'bachelor', 'master', 'degree', 'certification',
    'javascript', 'python', 'java', 'react', 'angular', 'node'
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) score += 50;
  });
  
  // High bonus for contact info
  if (/@/.test(text)) score += 200;
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) score += 150;
  
  // Bonus for proper sentence structure
  if (/^[A-Z].*[.!?]$/.test(text)) score += 30;
  
  // Bonus for containing years
  if (/\b(19|20)\d{2}\b/.test(text)) score += 40;
  
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
    
    console.log('Extracted text length:', extractedText.length);
    console.log('Extracted text preview:', extractedText.substring(0, 1500));

    if (!extractedText || extractedText.length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient readable text from PDF. The PDF might be image-based or have complex formatting.',
        success: false,
        debugInfo: {
          extractedTextLength: extractedText.length,
          extractedTextSample: extractedText.substring(0, 500)
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
      message: 'PDF text extracted successfully'
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
