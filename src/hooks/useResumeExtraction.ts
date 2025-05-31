
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResumeExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractResumeData = async (resumeUrl: string, candidateId: string) => {
    setIsExtracting(true);
    
    try {
      console.log('=== FRONTEND: Starting comprehensive resume extraction ===');
      console.log('Resume URL:', resumeUrl);
      console.log('Candidate ID:', candidateId);
      
      toast.info('Analyzing your resume with AI to extract comprehensive information...', {
        duration: 6000,
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
        console.log('Comprehensive extracted data:', data.extractedData);
        
        let successMessage = 'Resume analyzed successfully! ';
        
        // Show comprehensive extraction summary
        if (data.extractedData) {
          const updates = [];
          
          // Personal info
          if (data.extractedData.personal_info?.email) updates.push('contact info');
          if (data.extractedData.personal_info?.location) updates.push('location');
          
          // Professional info
          if (data.extractedData.professional_summary?.current_role) updates.push('current role');
          if (data.extractedData.professional_summary?.total_experience_years) updates.push('experience');
          if (data.extractedData.professional_summary?.summary) updates.push('professional summary');
          
          // Education
          if (data.extractedData.education?.qualification) updates.push('qualifications');
          
          // Skills
          const skillCount = [
            ...(data.extractedData.skills?.technical_skills || []),
            ...(data.extractedData.skills?.programming_languages || []),
            ...(data.extractedData.skills?.tools_and_frameworks || []),
            ...(data.extractedData.skills?.soft_skills || [])
          ].length;
          
          if (skillCount > 0) {
            updates.push(`${skillCount} skills`);
          }
          
          // Work experience
          if (data.extractedData.work_experience?.companies?.length > 0) {
            updates.push('work history');
          }
          
          if (updates.length > 0) {
            successMessage += `Extracted: ${updates.join(', ')}.`;
          }
        }
        
        toast.success(successMessage, {
          duration: 10000,
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
