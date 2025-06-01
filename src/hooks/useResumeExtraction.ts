
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
      
      toast.info('Analyzing your resume with AI to extract comprehensive information...', {
        duration: 8000,
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
        console.log('Enhanced extracted data:', data.extractedData);
        
        // Build success message based on extracted data
        let successMessage = 'Resume analyzed successfully! ';
        const updates = [];
        
        if (data.extractedData) {
          const { personal_info, professional_summary, education, skills, work_experience } = data.extractedData;
          
          // Check what was extracted
          if (personal_info?.email) updates.push('contact info');
          if (personal_info?.location) updates.push('location');
          if (professional_summary?.current_role) updates.push('current role');
          if (professional_summary?.summary) updates.push('professional summary');
          if (education?.qualification) updates.push('education');
          
          // Count skills
          const totalSkills = [
            ...(skills?.technical_skills || []),
            ...(skills?.programming_languages || []),
            ...(skills?.tools_and_frameworks || []),
            ...(skills?.soft_skills || [])
          ].length;
          
          if (totalSkills > 0) updates.push(`${totalSkills} skills`);
          if (work_experience?.companies?.length > 0) updates.push('work history');
          
          if (updates.length > 0) {
            successMessage += `Extracted: ${updates.join(', ')}.`;
          } else {
            successMessage += 'Basic information extracted.';
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
