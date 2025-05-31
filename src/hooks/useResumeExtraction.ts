
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResumeExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractResumeData = async (resumeUrl: string, candidateId: string) => {
    setIsExtracting(true);
    
    try {
      console.log('=== FRONTEND: Starting resume extraction ===');
      console.log('Resume URL:', resumeUrl);
      console.log('Candidate ID:', candidateId);
      
      toast.info('Processing your resume with AI...', {
        duration: 5000,
      });

      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: { 
          resumeUrl,
          candidateId 
        }
      });

      console.log('=== FRONTEND: Edge function response ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Resume processing failed: ${error.message}`);
        return false;
      }

      if (data?.success) {
        console.log('=== FRONTEND: Success ===');
        console.log('Extracted data:', data.extractedData);
        
        let successMessage = 'Resume processed successfully! ';
        
        // Show what was extracted
        if (data.extractedData) {
          const updates = [];
          if (data.extractedData.skills?.length > 0) {
            updates.push(`${data.extractedData.skills.length} skills`);
          }
          if (data.extractedData.title) updates.push('job title');
          if (data.extractedData.experience_years) updates.push('experience');
          if (data.extractedData.education) updates.push('education');
          if (data.extractedData.summary) updates.push('summary');
          
          if (updates.length > 0) {
            successMessage += `Extracted: ${updates.join(', ')}.`;
          }
        }
        
        toast.success(successMessage, {
          duration: 8000,
        });
        return true;
      } else {
        console.error('=== FRONTEND: Processing failed ===');
        console.error('Error details:', data);
        
        const errorMsg = data?.error || 'Unknown error occurred';
        toast.error(`Resume processing failed: ${errorMsg}`);
        return false;
      }
      
    } catch (error) {
      console.error('=== FRONTEND: Exception ===');
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
