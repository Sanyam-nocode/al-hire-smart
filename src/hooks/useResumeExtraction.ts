
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
      
      // Show initial progress toast
      toast.info('Processing your resume with AI...', {
        duration: 5000,
      });

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
        
        // More specific error messages
        if (error.message?.includes('fetch')) {
          toast.error('Failed to download your resume. Please check the file and try again.');
        } else if (error.message?.includes('OpenAI')) {
          toast.error('AI processing failed. Please try again in a moment.');
        } else {
          toast.error(`Resume processing failed: ${error.message}`);
        }
        return false;
      }

      if (data?.success) {
        console.log('Resume extraction successful:', data);
        
        // Show what was extracted
        const extractedData = data.extractedData;
        let successMessage = 'Resume processed successfully!';
        
        if (extractedData) {
          const updates = [];
          if (extractedData.skills?.length > 0) updates.push(`${extractedData.skills.length} skills`);
          if (extractedData.title) updates.push('job title');
          if (extractedData.experience_years) updates.push('experience');
          if (extractedData.education) updates.push('education');
          
          if (updates.length > 0) {
            successMessage += ` Extracted: ${updates.join(', ')}.`;
          }
        }
        
        toast.success(successMessage, {
          duration: 7000,
        });
        return true;
      } else {
        console.error('Resume extraction failed:', data);
        
        // Handle specific failure cases
        if (data?.error?.includes('PDF')) {
          toast.error('Could not read PDF file. Please ensure it\'s a valid PDF document.');
        } else if (data?.error?.includes('OpenAI')) {
          toast.error('AI processing encountered an issue. Please try again.');
        } else {
          toast.error(`Resume processing failed: ${data?.error || 'Unknown error'}`);
        }
        return false;
      }
      
    } catch (error) {
      console.error('Error in resume extraction:', error);
      
      // Network or other errors
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`An error occurred: ${error.message}`);
        }
      } else {
        toast.error('An unexpected error occurred during resume processing. Please try again.');
      }
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
