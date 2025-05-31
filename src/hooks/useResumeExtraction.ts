
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResumeExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractResumeData = async (resumeUrl: string, candidateId: string) => {
    setIsExtracting(true);
    
    try {
      console.log('Starting resume data extraction for candidate:', candidateId);
      console.log('Resume URL:', resumeUrl);
      
      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: { 
          resumeUrl,
          candidateId 
        }
      });

      console.log('Edge function response:', data);
      console.log('Edge function error:', error);

      if (error) {
        console.error('Error calling extract-resume-data function:', error);
        toast.error(`Failed to extract resume data: ${error.message}`);
        return false;
      }

      if (data?.success) {
        console.log('Resume extraction successful:', data);
        toast.success('Resume data extracted and profile updated successfully!');
        return true;
      } else {
        console.error('Resume extraction failed:', data);
        toast.error(`Failed to extract resume data: ${data?.error || 'Unknown error'}`);
        return false;
      }
      
    } catch (error) {
      console.error('Error in resume extraction:', error);
      toast.error('An error occurred during resume processing. Please try again.');
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
