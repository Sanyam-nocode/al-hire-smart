
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
      
      toast.info('Analyzing your resume with AI technology...', {
        duration: 15000,
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

      if (error) {
        console.error('Extraction error:', error);
        toast.error(`Resume processing failed: ${error.message}`);
        return false;
      }

      if (data?.success) {
        console.log('=== FRONTEND: Extraction successful ===');
        console.log('Extracted data:', data.extractedData);
        console.log('Updated profile:', data.updatedProfile);
        console.log('Extraction method:', data.extractionInfo?.method);
        
        // Build detailed success message
        let successMessage = 'Resume analyzed successfully! ';
        const updates = [];
        
        // Add method-specific information
        if (data.extractionInfo?.method === 'ocr-space') {
          successMessage = '🔍 Resume processed using advanced OCR technology! ';
        } else if (data.extractionInfo?.method === 'standard-parser') {
          successMessage = '📄 Resume processed using PDF parsing! ';
        }
        
        if (data.extractedData) {
          const { personal_info, professional_summary, education, skills, work_experience } = data.extractedData;
          
          // Check what was extracted
          if (personal_info?.email) updates.push('contact info');
          if (personal_info?.location) updates.push('location');
          if (personal_info?.linkedin_url) updates.push('LinkedIn profile');
          if (professional_summary?.current_role) updates.push('current role');
          if (professional_summary?.summary) updates.push('professional summary');
          if (education?.qualification) updates.push('education details');
          
          // Count all skills
          const totalSkills = [
            ...(skills?.technical_skills || []),
            ...(skills?.programming_languages || []),
            ...(skills?.tools_and_frameworks || []),
            ...(skills?.soft_skills || [])
          ].length;
          
          if (totalSkills > 0) updates.push(`${totalSkills} skills`);
          if (work_experience?.companies?.length > 0) updates.push(`${work_experience.companies.length} companies`);
          if (work_experience?.roles?.length > 0) updates.push(`${work_experience.roles.length} roles`);
          
          if (updates.length > 0) {
            successMessage += `Extracted: ${updates.join(', ')}.`;
          } else {
            successMessage += 'Basic information extracted successfully.';
          }

          // Add special note for OCR processing
          if (data.extractionInfo?.ocrUsed) {
            successMessage += ' 🚀 Advanced OCR technology was used to read your resume.';
          }
        }
        
        // Show detailed success message
        toast.success(successMessage, {
          duration: 12000,
        });

        // Add additional notification about profile update
        if (data.updatedProfile) {
          setTimeout(() => {
            toast.info('Your profile has been automatically updated with the extracted information!', {
              duration: 8000,
            });
          }, 2000);
        }
        
        return true;
      } else {
        console.error('=== FRONTEND: Processing failed ===');
        console.error('Error details:', data);
        
        const errorMsg = data?.error || 'Unknown error occurred during processing';
        
        // Provide specific guidance for different types of failures
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
