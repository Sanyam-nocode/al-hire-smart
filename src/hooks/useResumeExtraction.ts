
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
        
        // Display the extracted data in the chat for the user to see
        if (data.extractedData) {
          console.log('=== SHOWING EXTRACTED DATA TO USER ===');
          const extractedInfo = data.extractedData;
          
          // Create a detailed summary of what was extracted
          let extractedSummary = '🎉 Resume successfully processed! Here\'s what I extracted:\n\n';
          
          // Personal Information
          if (extractedInfo.personal_info) {
            const personal = extractedInfo.personal_info;
            extractedSummary += '👤 **Personal Information:**\n';
            if (personal.full_name) extractedSummary += `• Name: ${personal.full_name}\n`;
            if (personal.email) extractedSummary += `• Email: ${personal.email}\n`;
            if (personal.phone) extractedSummary += `• Phone: ${personal.phone}\n`;
            if (personal.location) extractedSummary += `• Location: ${personal.location}\n`;
            if (personal.linkedin_url) extractedSummary += `• LinkedIn: ${personal.linkedin_url}\n`;
            if (personal.github_url) extractedSummary += `• GitHub: ${personal.github_url}\n`;
            if (personal.portfolio_url) extractedSummary += `• Portfolio: ${personal.portfolio_url}\n`;
            extractedSummary += '\n';
          }
          
          // Professional Summary
          if (extractedInfo.professional_summary) {
            const prof = extractedInfo.professional_summary;
            extractedSummary += '💼 **Professional Summary:**\n';
            if (prof.current_role) extractedSummary += `• Current Role: ${prof.current_role}\n`;
            if (prof.total_experience_years) extractedSummary += `• Experience: ${prof.total_experience_years} years\n`;
            if (prof.industry) extractedSummary += `• Industry: ${prof.industry}\n`;
            if (prof.summary) extractedSummary += `• Summary: ${prof.summary.substring(0, 200)}${prof.summary.length > 200 ? '...' : ''}\n`;
            extractedSummary += '\n';
          }
          
          // Skills
          if (extractedInfo.skills) {
            const skills = extractedInfo.skills;
            extractedSummary += '🛠️ **Skills:**\n';
            if (skills.technical_skills?.length) extractedSummary += `• Technical Skills: ${skills.technical_skills.slice(0, 10).join(', ')}${skills.technical_skills.length > 10 ? '...' : ''}\n`;
            if (skills.programming_languages?.length) extractedSummary += `• Programming Languages: ${skills.programming_languages.join(', ')}\n`;
            if (skills.tools_and_frameworks?.length) extractedSummary += `• Tools & Frameworks: ${skills.tools_and_frameworks.slice(0, 10).join(', ')}${skills.tools_and_frameworks.length > 10 ? '...' : ''}\n`;
            if (skills.soft_skills?.length) extractedSummary += `• Soft Skills: ${skills.soft_skills.join(', ')}\n`;
            extractedSummary += '\n';
          }
          
          // Education
          if (extractedInfo.education) {
            const edu = extractedInfo.education;
            extractedSummary += '🎓 **Education:**\n';
            if (edu.qualification) extractedSummary += `• Qualification: ${edu.qualification}\n`;
            if (edu.institution) extractedSummary += `• Institution: ${edu.institution}\n`;
            if (edu.graduation_year) extractedSummary += `• Graduation Year: ${edu.graduation_year}\n`;
            if (edu.additional_qualifications) extractedSummary += `• Additional: ${edu.additional_qualifications}\n`;
            extractedSummary += '\n';
          }
          
          // Work Experience
          if (extractedInfo.work_experience) {
            const work = extractedInfo.work_experience;
            extractedSummary += '💼 **Work Experience:**\n';
            if (work.current_company) extractedSummary += `• Current Company: ${work.current_company}\n`;
            if (work.current_position) extractedSummary += `• Current Position: ${work.current_position}\n`;
            if (work.companies?.length) extractedSummary += `• Companies: ${work.companies.slice(0, 5).join(', ')}${work.companies.length > 5 ? '...' : ''}\n`;
            if (work.roles?.length) extractedSummary += `• Roles: ${work.roles.slice(0, 3).join(', ')}${work.roles.length > 3 ? '...' : ''}\n`;
            if (work.key_achievements?.length) extractedSummary += `• Key Achievements: ${work.key_achievements.slice(0, 2).join(', ')}${work.key_achievements.length > 2 ? '...' : ''}\n`;
            extractedSummary += '\n';
          }
          
          // Additional Information
          if (extractedInfo.additional_info) {
            const additional = extractedInfo.additional_info;
            extractedSummary += '🏆 **Additional Information:**\n';
            if (additional.certifications?.length) extractedSummary += `• Certifications: ${additional.certifications.join(', ')}\n`;
            if (additional.awards?.length) extractedSummary += `• Awards: ${additional.awards.join(', ')}\n`;
            if (additional.projects?.length) extractedSummary += `• Projects: ${additional.projects.slice(0, 3).join(', ')}${additional.projects.length > 3 ? '...' : ''}\n`;
            if (additional.languages?.length) extractedSummary += `• Languages: ${additional.languages.join(', ')}\n`;
            extractedSummary += '\n';
          }
          
          extractedSummary += `✨ Extraction Method: ${data.extractionInfo?.method || 'Unknown'}\n`;
          if (data.extractionInfo?.ocrUsed) {
            extractedSummary += '🔍 Advanced OCR technology was used to read your resume.\n';
          }
          
          // Show the extracted data in a success toast
          toast.success('Resume data extracted successfully!', {
            duration: 8000,
          });
          
          // Log the extracted summary for the user to see
          console.log('=== EXTRACTED DATA SUMMARY ===');
          console.log(extractedSummary);
          
          // Display extracted data as a formatted message
          setTimeout(() => {
            toast.info('Your profile has been updated with the extracted information! Check the Profile tab to see the changes.', {
              duration: 10000,
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
