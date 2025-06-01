
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

// Enhanced text quality assessment
function assessTextQuality(text: string): number {
  if (!text || text.length < 20) return 0;
  
  const totalChars = text.length;
  const readableChars = (text.match(/[a-zA-Z0-9\s.,;:!?()@-]/g) || []).length;
  const readabilityRatio = readableChars / totalChars;
  
  // Check for common resume words
  const resumeWords = ['experience', 'education', 'skills', 'work', 'email', 'phone', 'name'];
  const foundWords = resumeWords.filter(word => text.toLowerCase().includes(word)).length;
  
  // Check for email patterns
  const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  
  // Calculate quality score (0-100)
  let score = readabilityRatio * 60;
  score += foundWords * 5;
  score += hasEmail ? 15 : 0;
  
  return Math.min(score, 100);
}

// Enhanced text cleaning function
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove PDF metadata and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove wkhtmltopdf artifacts
    .replace(/wkhtmltopdf.*?D:\d+.*?'/g, '')
    // Remove PDF-specific patterns and metadata
    .replace(/\/[A-Z][a-zA-Z0-9]*\s+/g, ' ')
    .replace(/\b\d+\s+\d+\s+obj\b/g, '')
    .replace(/\bendobj\b/g, '')
    .replace(/\bstream\b[\s\S]*?\bendstream\b/g, '')
    .replace(/\bxref\b[\s\S]*?\btrailer\b/g, '')
    .replace(/\bstartxref\b[\s\S]*$/g, '')
    // Clean up encoded text and artifacts
    .replace(/[^\x20-\x7E\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Function to check if text contains meaningful content
function isTextMeaningful(text: string): boolean {
  if (!text || text.length < 30) return false;
  
  const quality = assessTextQuality(text);
  console.log('Text quality score:', quality);
  
  return quality >= 40; // Require at least 40% quality score
}

// Advanced PDF text extraction with improved quality assessment
async function extractTextAdvanced(pdfBuffer: ArrayBuffer): Promise<string> {
  const strategies = [];
  
  console.log('=== STARTING MULTI-STRATEGY EXTRACTION ===');
  
  // Strategy 1: Standard pdf-parse
  try {
    console.log('=== STRATEGY 1: Standard pdf-parse ===');
    const parsed = await pdf(new Uint8Array(pdfBuffer));
    const cleanText = cleanExtractedText(parsed.text);
    const quality = assessTextQuality(cleanText);
    
    console.log('Strategy 1 - Raw text length:', parsed.text?.length || 0);
    console.log('Strategy 1 - Clean text length:', cleanText.length);
    console.log('Strategy 1 - Quality score:', quality);
    console.log('Strategy 1 - Text preview:', cleanText.substring(0, 500));
    
    if (quality >= 40) {
      strategies.push({ 
        method: 'standard', 
        text: cleanText, 
        score: quality * cleanText.length,
        quality: quality >= 70 ? 'high' : 'medium'
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
      disableCombineTextItems: true,
      max: 0
    });
    const cleanText = cleanExtractedText(parsed.text);
    const quality = assessTextQuality(cleanText);
    
    console.log('Strategy 2 - Text length:', cleanText.length);
    console.log('Strategy 2 - Quality score:', quality);
    console.log('Strategy 2 - Text preview:', cleanText.substring(0, 500));
    
    if (quality >= 40) {
      strategies.push({ 
        method: 'with-options', 
        text: cleanText, 
        score: quality * cleanText.length,
        quality: quality >= 70 ? 'high' : 'medium'
      });
    }
  } catch (error) {
    console.error('Strategy 2 failed:', error);
  }
  
  // Strategy 3: OCR extraction (try early if standard parsing fails)
  const shouldTryOCR = strategies.length === 0 || strategies.every(s => s.quality === 'low');
  
  if (shouldTryOCR) {
    try {
      console.log('=== STRATEGY 3: OCR extraction ===');
      const ocrText = await extractWithOCR(pdfBuffer);
      
      if (ocrText && ocrText.length > 50) {
        const cleanText = cleanExtractedText(ocrText);
        const quality = assessTextQuality(cleanText);
        
        console.log('Strategy 3 - OCR text length:', cleanText.length);
        console.log('Strategy 3 - OCR quality score:', quality);
        console.log('Strategy 3 - OCR text preview:', cleanText.substring(0, 500));
        
        if (quality >= 30) { // Lower threshold for OCR
          strategies.push({ 
            method: 'ocr', 
            text: cleanText, 
            score: quality * cleanText.length * 1.2, // Boost OCR slightly
            quality: quality >= 60 ? 'high' : 'medium'
          });
        }
      }
    } catch (error) {
      console.error('Strategy 3 OCR failed:', error);
    }
  }
  
  // Strategy 4: Enhanced manual parsing for text streams
  try {
    console.log('=== STRATEGY 4: Enhanced manual parsing ===');
    const uint8Array = new Uint8Array(pdfBuffer);
    let pdfString = '';
    
    // Convert to string with better encoding handling
    for (let i = 0; i < uint8Array.length; i++) {
      pdfString += String.fromCharCode(uint8Array[i]);
    }
    
    // Enhanced text patterns
    const textPatterns = [
      /\(([^)]{3,})\)\s*Tj/g,  // Text operations
      /\[([^\]]{3,})\]\s*TJ/g, // Array text operations
      /BT\s*(.*?)\s*ET/gs,     // Text blocks
      /\/Title\s*\(([^)]+)\)/g,
      /\/Subject\s*\(([^)]+)\)/g,
    ];
    
    const extractedTexts = new Set<string>();
    
    textPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pdfString)) !== null) {
        let text = match[1];
        if (text) {
          // Decode hex strings
          if (text.includes('<') && text.includes('>')) {
            text = text.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
              try {
                return String.fromCharCode(parseInt(hex, 16));
              } catch {
                return '';
              }
            });
          }
          
          const cleaned = cleanExtractedText(text);
          if (cleaned && cleaned.length > 2 && /[a-zA-Z]/.test(cleaned)) {
            extractedTexts.add(cleaned);
          }
        }
      }
    });
    
    const combinedText = Array.from(extractedTexts).join(' ');
    const cleanText = cleanExtractedText(combinedText);
    const quality = assessTextQuality(cleanText);
    
    console.log('Strategy 4 - Manual extraction length:', cleanText.length);
    console.log('Strategy 4 - Quality score:', quality);
    console.log('Strategy 4 - Text preview:', cleanText.substring(0, 500));
    
    if (quality >= 25) { // Lower threshold for manual extraction
      strategies.push({ 
        method: 'manual', 
        text: cleanText, 
        score: quality * cleanText.length,
        quality: quality >= 50 ? 'medium' : 'low'
      });
    }
  } catch (error) {
    console.error('Strategy 4 failed:', error);
  }
  
  // Choose the best strategy
  if (strategies.length === 0) {
    throw new Error('All text extraction strategies failed to produce meaningful content. The PDF might be corrupted, password-protected, or contain only images without extractable text.');
  }
  
  // Sort by quality first, then by score
  strategies.sort((a, b) => {
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

    // Enhanced text extraction with improved quality assessment
    console.log('=== STARTING ENHANCED MULTI-STRATEGY EXTRACTION ===');
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
      message: 'PDF text extracted successfully using enhanced multi-strategy extraction'
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
