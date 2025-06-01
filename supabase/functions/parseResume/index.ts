
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdf from "npm:pdf-parse";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PDF PARSE REQUEST ===');
    
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

    // Convert file to buffer for pdf-parse
    const pdfBuffer = await fileData.arrayBuffer();
    console.log('PDF buffer size:', pdfBuffer.byteLength);

    // Parse PDF using pdf-parse
    console.log('=== PARSING PDF WITH pdf-parse ===');
    const parsed = await pdf(new Uint8Array(pdfBuffer));
    
    console.log('PDF parsing completed');
    console.log('Number of pages:', parsed.numpages);
    console.log('Text length:', parsed.text.length);
    console.log('Text preview:', parsed.text.substring(0, 500));

    if (!parsed.text || parsed.text.trim().length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract sufficient text from PDF. The PDF might be image-based or have complex formatting.',
        success: false,
        debugInfo: {
          numpages: parsed.numpages,
          textLength: parsed.text?.length || 0,
          textSample: parsed.text?.substring(0, 500) || ''
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up the text
    const cleanText = parsed.text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim();

    console.log('=== EXTRACTION SUCCESS ===');
    console.log('Clean text length:', cleanText.length);

    return new Response(JSON.stringify({ 
      success: true,
      text: cleanText,
      textLength: cleanText.length,
      numpages: parsed.numpages,
      message: 'PDF text extracted successfully using pdf-parse'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== PDF PARSE ERROR ===');
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
