
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResumeExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractResumeData = async (resumeUrl: string, candidateId: string) => {
    setIsExtracting(true);
    
    try {
      console.log('Starting resume data extraction for candidate:', candidateId);
      
      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: { 
          resumeUrl,
          candidateId 
        }
      });

      if (error) {
        console.error('Error calling extract-resume-data function:', error);
        toast.error('Failed to extract resume data. Please try again.');
        return false;
      }

      if (data.success) {
        toast.success('Resume data extracted and profile updated successfully!');
        return true;
      } else {
        toast.error('Failed to extract resume data');
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
