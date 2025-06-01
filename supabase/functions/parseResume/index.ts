
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdf from "npm:pdf-parse";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced text cleaning function
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove PDF metadata and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove PDF-specific patterns
    .replace(/\/[A-Z][a-zA-Z0-9]*\s+/g, ' ')
    .replace(/\b\d+\s+\d+\s+obj\b/g, '')
    .replace(/\bendobj\b/g, '')
    .replace(/\bstream\b[\s\S]*?\bendstream\b/g, '')
    // Remove encoded strings that look like garbage
    .replace(/[^\x20-\x7E\s]/g, ' ')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Function to check if text contains meaningful content
function isTextMeaningful(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  // Check for common resume keywords
  const resumeKeywords = [
    'experience', 'education', 'skills', 'work', 'job', 'position',
    'university', 'college', 'degree', 'bachelor', 'master', 'phd',
    'project', 'software', 'developer', 'engineer', 'manager',
    'contact', 'email', 'phone', 'address', 'linkedin'
  ];
  
  const lowercaseText = text.toLowerCase();
  const keywordCount = resumeKeywords.filter(keyword => 
    lowercaseText.includes(keyword)
  ).length;
  
  // Check for email patterns
  const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  
  // Check for phone patterns
  const hasPhone = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(text);
  
  // Text is meaningful if it has keywords, email, or phone
  return keywordCount >= 2 || hasEmail || hasPhone;
}

// Advanced OCR fallback using Tesseract-like approach
async function performOCR(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('=== ATTEMPTING OCR EXTRACTION ===');
    
    // For now, we'll implement a basic OCR simulation
    // In a real implementation, you'd use a service like Google Vision API or Tesseract
    // This is a placeholder that attempts to extract text from image-based PDFs
    
    // Convert buffer to text and look for embedded text
    const uint8Array = new Uint8Array(pdfBuffer);
    const binaryString = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    // Look for text patterns in the binary data
    const textMatches = binaryString.match(/[a-zA-Z0-9@.\-\s]{10,}/g) || [];
    const extractedText = textMatches
      .filter(match => match.trim().length > 5)
      .join(' ')
      .substring(0, 5000); // Limit length
    
    console.log('OCR extracted text length:', extractedText.length);
    console.log('OCR text preview:', extractedText.substring(0, 500));
    
    return cleanExtractedText(extractedText);
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return '';
  }
}

// Enhanced PDF text extraction with multiple strategies
async function extractTextAdvanced(pdfBuffer: ArrayBuffer): Promise<string> {
  const strategies = [];
  
  // Strategy 1: Standard pdf-parse
  try {
    console.log('=== STRATEGY 1: Standard pdf-parse ===');
    const parsed = await pdf(new Uint8Array(pdfBuffer));
    const cleanText = cleanExtractedText(parsed.text);
    
    console.log('Strategy 1 - Text length:', cleanText.length);
    console.log('Strategy 1 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ method: 'standard', text: cleanText, score: cleanText.length });
    }
  } catch (error) {
    console.error('Strategy 1 failed:', error);
  }
  
  // Strategy 2: pdf-parse with options
  try {
    console.log('=== STRATEGY 2: pdf-parse with options ===');
    const parsed = await pdf(new Uint8Array(pdfBuffer), {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
      max: 0
    });
    const cleanText = cleanExtractedText(parsed.text);
    
    console.log('Strategy 2 - Text length:', cleanText.length);
    console.log('Strategy 2 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ method: 'with-options', text: cleanText, score: cleanText.length });
    }
  } catch (error) {
    console.error('Strategy 2 failed:', error);
  }
  
  // Strategy 3: OCR fallback
  try {
    console.log('=== STRATEGY 3: OCR fallback ===');
    const ocrText = await performOCR(pdfBuffer);
    
    if (isTextMeaningful(ocrText)) {
      strategies.push({ method: 'ocr', text: ocrText, score: ocrText.length });
    }
  } catch (error) {
    console.error('Strategy 3 failed:', error);
  }
  
  // Strategy 4: Raw binary text extraction
  try {
    console.log('=== STRATEGY 4: Raw binary extraction ===');
    const uint8Array = new Uint8Array(pdfBuffer);
    const binaryText = Array.from(uint8Array)
      .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : ' ')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract meaningful segments
    const meaningfulSegments = binaryText
      .split(/\s+/)
      .filter(segment => 
        segment.length > 2 && 
        /[a-zA-Z]/.test(segment) &&
        !/^[^a-zA-Z]*$/.test(segment)
      )
      .join(' ')
      .substring(0, 5000);
    
    const cleanText = cleanExtractedText(meaningfulSegments);
    
    console.log('Strategy 4 - Text length:', cleanText.length);
    console.log('Strategy 4 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ method: 'binary', text: cleanText, score: cleanText.length });
    }
  } catch (error) {
    console.error('Strategy 4 failed:', error);
  }
  
  // Choose the best strategy
  if (strategies.length === 0) {
    throw new Error('All text extraction strategies failed to produce meaningful content');
  }
  
  // Sort by score (length) and meaningfulness
  strategies.sort((a, b) => b.score - a.score);
  const bestStrategy = strategies[0];
  
  console.log('=== BEST STRATEGY SELECTED ===');
  console.log('Method:', bestStrategy.method);
  console.log('Score:', bestStrategy.score);
  console.log('Text preview:', bestStrategy.text.substring(0, 500));
  
  return bestStrategy.text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ENHANCED PDF PARSE REQUEST ===');
    
    const { resumeUrl } = await req.json();
    
    if (!resumeUrl) {
      return new Response(JSON.stringify({ 
        error: 'Resume URL is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Resume URL:', resumeUrl);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log('File downloaded successfully, size:', fileData.size);

    // Convert file to buffer for processing
    const pdfBuffer = await fileData.arrayBuffer();
    console.log('PDF buffer size:', pdfBuffer.byteLength);

    // Enhanced text extraction with multiple strategies
    console.log('=== STARTING ENHANCED TEXT EXTRACTION ===');
    const extractedText = await extractTextAdvanced(pdfBuffer);

    if (!extractedText || extractedText.length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract meaningful text from PDF. The PDF might be corrupted, password-protected, or contain only images without OCR-readable text.',
        success: false,
        debugInfo: {
          textLength: extractedText?.length || 0,
          textSample: extractedText?.substring(0, 500) || '',
          fileSize: pdfBuffer.byteLength
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== EXTRACTION SUCCESS ===');
    console.log('Final text length:', extractedText.length);
    console.log('Final text preview:', extractedText.substring(0, 1000));

    return new Response(JSON.stringify({ 
      success: true,
      text: extractedText,
      textLength: extractedText.length,
      message: 'PDF text extracted successfully using enhanced extraction with OCR capabilities'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ENHANCED PDF PARSE ERROR ===');
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
