
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdf from "npm:pdf-parse";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OCR.space API integration for image-based PDFs
async function extractWithOCR(pdfBuffer: ArrayBuffer): Promise<string> {
  if (!ocrSpaceApiKey) {
    console.log('OCR.space API key not available, skipping OCR extraction');
    return '';
  }

  try {
    console.log('=== ATTEMPTING OCR EXTRACTION ===');
    
    // Convert PDF buffer to base64 for OCR.space API
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    
    const formData = new FormData();
    formData.append('base64Image', `data:application/pdf;base64,${base64PDF}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('filetype', 'PDF');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceApiKey,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      console.error('OCR API error:', ocrResponse.status);
      return '';
    }

    const ocrData = await ocrResponse.json();
    
    if (ocrData.IsErroredOnProcessing || !ocrData.ParsedResults?.[0]?.ParsedText) {
      console.error('OCR processing failed:', ocrData.ErrorMessage);
      return '';
    }

    const ocrText = ocrData.ParsedResults[0].ParsedText.trim();
    console.log('OCR extracted text length:', ocrText.length);
    console.log('OCR text preview:', ocrText.substring(0, 500));
    
    return ocrText;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return '';
  }
}

// Enhanced text cleaning function
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove PDF metadata and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove PDF-specific patterns and metadata
    .replace(/wkhtmltopdf.*?Qt.*?D:\d+.*?'/g, '')
    .replace(/\/[A-Z][a-zA-Z0-9]*\s+/g, ' ')
    .replace(/\b\d+\s+\d+\s+obj\b/g, '')
    .replace(/\bendobj\b/g, '')
    .replace(/\bstream\b[\s\S]*?\bendstream\b/g, '')
    .replace(/\bxref\b[\s\S]*?\btrailer\b/g, '')
    .replace(/\bstartxref\b[\s\S]*$/g, '')
    // Remove encoded strings and PDF artifacts
    .replace(/[^\x20-\x7E\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Function to check if text contains meaningful content
function isTextMeaningful(text: string): boolean {
  if (!text || text.length < 30) return false;
  
  // Check for common resume keywords
  const resumeKeywords = [
    'experience', 'education', 'skills', 'work', 'job', 'position',
    'university', 'college', 'degree', 'bachelor', 'master', 'phd',
    'project', 'software', 'developer', 'engineer', 'manager',
    'contact', 'email', 'phone', 'address', 'linkedin', 'summary',
    'objective', 'certification', 'award', 'achievement', 'internship'
  ];
  
  const lowercaseText = text.toLowerCase();
  const keywordCount = resumeKeywords.filter(keyword => 
    lowercaseText.includes(keyword)
  ).length;
  
  // Check for contact information patterns
  const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(text);
  const hasYear = /\b(19|20)\d{2}\b/.test(text);
  
  // Check for proper sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const hasProperSentences = sentences.length >= 2;
  
  // Text is meaningful if it has multiple indicators
  const meaningfulIndicators = [
    keywordCount >= 3,
    hasEmail,
    hasPhone,
    hasYear,
    hasProperSentences
  ].filter(Boolean).length;
  
  return meaningfulIndicators >= 2;
}

// Advanced PDF text extraction with multiple strategies
async function extractTextAdvanced(pdfBuffer: ArrayBuffer): Promise<string> {
  const strategies = [];
  
  console.log('=== STARTING MULTI-STRATEGY EXTRACTION ===');
  
  // Strategy 1: Standard pdf-parse
  try {
    console.log('=== STRATEGY 1: Standard pdf-parse ===');
    const parsed = await pdf(new Uint8Array(pdfBuffer));
    const cleanText = cleanExtractedText(parsed.text);
    
    console.log('Strategy 1 - Raw text length:', parsed.text?.length || 0);
    console.log('Strategy 1 - Clean text length:', cleanText.length);
    console.log('Strategy 1 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ 
        method: 'standard', 
        text: cleanText, 
        score: cleanText.length * 2, // Boost standard parsing
        quality: 'high'
      });
    }
  } catch (error) {
    console.error('Strategy 1 failed:', error);
  }
  
  // Strategy 2: pdf-parse with different options
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
      strategies.push({ 
        method: 'with-options', 
        text: cleanText, 
        score: cleanText.length * 1.8,
        quality: 'high'
      });
    }
  } catch (error) {
    console.error('Strategy 2 failed:', error);
  }
  
  // Strategy 3: OCR extraction (for image-based PDFs)
  try {
    console.log('=== STRATEGY 3: OCR extraction ===');
    const ocrText = await extractWithOCR(pdfBuffer);
    
    if (ocrText && ocrText.length > 50) {
      const cleanText = cleanExtractedText(ocrText);
      console.log('Strategy 3 - OCR text length:', cleanText.length);
      console.log('Strategy 3 - OCR text preview:', cleanText.substring(0, 500));
      
      if (isTextMeaningful(cleanText)) {
        strategies.push({ 
          method: 'ocr', 
          text: cleanText, 
          score: cleanText.length * 1.5, // OCR is good for image PDFs
          quality: 'medium'
        });
      }
    }
  } catch (error) {
    console.error('Strategy 3 OCR failed:', error);
  }
  
  // Strategy 4: Manual PDF parsing for complex PDFs
  try {
    console.log('=== STRATEGY 4: Manual PDF parsing ===');
    const uint8Array = new Uint8Array(pdfBuffer);
    let pdfString = '';
    
    // Convert to string with better encoding handling
    for (let i = 0; i < uint8Array.length; i++) {
      pdfString += String.fromCharCode(uint8Array[i]);
    }
    
    // Extract text between parentheses and brackets
    const textPatterns = [
      /\(([^)]{10,200})\)/g,  // Text in parentheses
      /\[([^\]]{10,200})\]/g, // Text in brackets
      /\/Title\s*\(([^)]+)\)/g, // PDF title
      /\/Subject\s*\(([^)]+)\)/g, // PDF subject
      /\/Keywords\s*\(([^)]+)\)/g // PDF keywords
    ];
    
    const extractedTexts = new Set<string>();
    
    textPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pdfString)) !== null) {
        const text = cleanExtractedText(match[1]);
        if (text && text.length > 5 && !/^[^a-zA-Z]*$/.test(text)) {
          extractedTexts.add(text);
        }
      }
    });
    
    const combinedText = Array.from(extractedTexts).join(' ');
    const cleanText = cleanExtractedText(combinedText);
    
    console.log('Strategy 4 - Manual extraction length:', cleanText.length);
    console.log('Strategy 4 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ 
        method: 'manual', 
        text: cleanText, 
        score: cleanText.length,
        quality: 'low'
      });
    }
  } catch (error) {
    console.error('Strategy 4 failed:', error);
  }
  
  // Strategy 5: Text stream extraction
  try {
    console.log('=== STRATEGY 5: Stream-based extraction ===');
    const uint8Array = new Uint8Array(pdfBuffer);
    let pdfString = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      pdfString += String.fromCharCode(uint8Array[i]);
    }
    
    // Look for BT/ET text blocks and Tj operations
    const textBlocks = pdfString.match(/BT\s*([\s\S]*?)\s*ET/g) || [];
    const allTexts = [];
    
    for (const block of textBlocks) {
      // Extract Tj operations
      const tjMatches = block.match(/\(([^)]+)\)\s*Tj/g) || [];
      for (const match of tjMatches) {
        const text = match.match(/\(([^)]+)\)/)?.[1];
        if (text && text.length > 2 && /[a-zA-Z]/.test(text)) {
          allTexts.push(cleanExtractedText(text));
        }
      }
    }
    
    const combinedText = allTexts.join(' ');
    const cleanText = cleanExtractedText(combinedText);
    
    console.log('Strategy 5 - Stream extraction length:', cleanText.length);
    console.log('Strategy 5 - Text preview:', cleanText.substring(0, 500));
    
    if (isTextMeaningful(cleanText)) {
      strategies.push({ 
        method: 'stream', 
        text: cleanText, 
        score: cleanText.length * 0.8,
        quality: 'low'
      });
    }
  } catch (error) {
    console.error('Strategy 5 failed:', error);
  }
  
  // Choose the best strategy
  if (strategies.length === 0) {
    throw new Error('All text extraction strategies failed to produce meaningful content. The PDF might be corrupted, password-protected, or contain only images without extractable text.');
  }
  
  // Sort by score and quality
  strategies.sort((a, b) => {
    // Prioritize by quality first, then by score
    const qualityOrder = { high: 3, medium: 2, low: 1 };
    const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality];
    if (qualityDiff !== 0) return qualityDiff;
    return b.score - a.score;
  });
  
  const bestStrategy = strategies[0];
  
  console.log('=== BEST STRATEGY SELECTED ===');
  console.log('Method:', bestStrategy.method);
  console.log('Quality:', bestStrategy.quality);
  console.log('Score:', bestStrategy.score);
  console.log('Final text length:', bestStrategy.text.length);
  console.log('Final text preview:', bestStrategy.text.substring(0, 1000));
  
  return bestStrategy.text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ADVANCED PDF PARSE REQUEST ===');
    
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

    // Advanced text extraction with multiple strategies including OCR
    console.log('=== STARTING ADVANCED MULTI-STRATEGY EXTRACTION ===');
    const extractedText = await extractTextAdvanced(pdfBuffer);

    if (!extractedText || extractedText.length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract meaningful text from PDF using any extraction method including OCR. The PDF might be corrupted, password-protected, heavily image-based without OCR capability, or contain only non-text elements.',
        success: false,
        debugInfo: {
          textLength: extractedText?.length || 0,
          textSample: extractedText?.substring(0, 500) || '',
          fileSize: pdfBuffer.byteLength,
          ocrAvailable: !!ocrSpaceApiKey
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
      message: 'PDF text extracted successfully using advanced multi-strategy extraction including OCR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ADVANCED PDF PARSE ERROR ===');
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
