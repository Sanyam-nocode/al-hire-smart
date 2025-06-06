
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResumeExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractResumeData = async (resumeUrl: string, candidateId: string) => {
    setIsExtracting(true);
    
    try {
      console.log('=== FRONTEND: Starting enhanced resume extraction ===');
      console.log('Resume URL:', resumeUrl);
      console.log('Candidate ID:', candidateId);
      
      const analysisToastId = toast.info('Analyzing your resume with AI technology...', {
        duration: Infinity, // Keep it until manually dismissed
      });

      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: { 
          resumeUrl,
          candidateId 
        }
      });

      console.log('=== FRONTEND: Extraction response ===');
      console.log('Data:', data);
      console.log('Error:', error);

      // Dismiss the analysis toast
      toast.dismiss(analysisToastId);

      if (error) {
        console.error('Extraction error:', error);
        toast.error(`Resume processing failed: ${error.message}`);
        return false;
      }

      if (data?.success) {
        console.log('=== FRONTEND: Extraction successful ===');
        console.log('Extracted data:', data.extractedData);
        console.log('Updated profile:', data.updatedProfile);
        console.log('Mapped fields:', data.mappedFields);
        console.log('Fields updated count:', data.extractionInfo?.fieldsUpdated);
        
        const fieldsUpdated = data.extractionInfo?.fieldsUpdated || 0;
        const mappedFields = data.mappedFields || [];
        
        toast.success(
          `Resume processed successfully! ${fieldsUpdated} profile fields updated: ${mappedFields.slice(0, 3).join(', ')}${mappedFields.length > 3 ? '...' : ''}`, 
          {
            duration: 10000,
          }
        );
        
        return {
          success: true,
          updatedFields: mappedFields,
          extractedData: data.extractedData
        };
      } else {
        console.error('=== FRONTEND: Processing failed ===');
        console.error('Error details:', data);
        
        const errorMsg = data?.error || 'Unknown error occurred during processing';
        
        if (errorMsg.includes('OCR') || errorMsg.includes('ocr')) {
          toast.error(`OCR processing failed: ${errorMsg}. Please try uploading a clearer PDF.`, {
            duration: 10000,
          });
        } else if (errorMsg.includes('text')) {
          toast.error(`Text extraction failed: ${errorMsg}. Please ensure your PDF contains readable text.`, {
            duration: 10000,
          });
        } else {
          toast.error(`Resume processing failed: ${errorMsg}`, {
            duration: 8000,
          });
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('=== FRONTEND: Extraction exception ===');
      console.error('Error:', error);
      
      toast.error('An unexpected error occurred during resume processing. Please try again.');
      return false;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    isExtracting,
    extractResumeData
  };
};
