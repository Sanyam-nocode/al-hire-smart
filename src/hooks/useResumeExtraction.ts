
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
        
        // Display the extracted data directly in the chat
        if (data.extractedData) {
          console.log('=== SHOWING EXTRACTED DATA IN CHAT ===');
          
          // Create a comprehensive display of all extracted data
          const extractedInfo = data.extractedData;
          
          console.log('📋 EXTRACTED RESUME DATA:');
          console.log('========================');
          
          // Personal Information
          if (extractedInfo.personal_info) {
            console.log('👤 PERSONAL INFORMATION:');
            const personal = extractedInfo.personal_info;
            if (personal.full_name) console.log(`   Name: ${personal.full_name}`);
            if (personal.email) console.log(`   Email: ${personal.email}`);
            if (personal.phone) console.log(`   Phone: ${personal.phone}`);
            if (personal.location) console.log(`   Location: ${personal.location}`);
            if (personal.linkedin_url) console.log(`   LinkedIn: ${personal.linkedin_url}`);
            if (personal.github_url) console.log(`   GitHub: ${personal.github_url}`);
            if (personal.portfolio_url) console.log(`   Portfolio: ${personal.portfolio_url}`);
            console.log('');
          }
          
          // Professional Summary
          if (extractedInfo.professional_summary) {
            console.log('💼 PROFESSIONAL SUMMARY:');
            const prof = extractedInfo.professional_summary;
            if (prof.current_role) console.log(`   Current Role: ${prof.current_role}`);
            if (prof.total_experience_years) console.log(`   Experience: ${prof.total_experience_years} years`);
            if (prof.industry) console.log(`   Industry: ${prof.industry}`);
            if (prof.summary) console.log(`   Summary: ${prof.summary}`);
            console.log('');
          }
          
          // Skills
          if (extractedInfo.skills) {
            console.log('🛠️ SKILLS:');
            const skills = extractedInfo.skills;
            if (skills.technical_skills?.length) {
              console.log(`   Technical Skills: ${skills.technical_skills.join(', ')}`);
            }
            if (skills.programming_languages?.length) {
              console.log(`   Programming Languages: ${skills.programming_languages.join(', ')}`);
            }
            if (skills.tools_and_frameworks?.length) {
              console.log(`   Tools & Frameworks: ${skills.tools_and_frameworks.join(', ')}`);
            }
            if (skills.soft_skills?.length) {
              console.log(`   Soft Skills: ${skills.soft_skills.join(', ')}`);
            }
            console.log('');
          }
          
          // Education
          if (extractedInfo.education) {
            console.log('🎓 EDUCATION:');
            const edu = extractedInfo.education;
            if (edu.qualification) console.log(`   Qualification: ${edu.qualification}`);
            if (edu.institution) console.log(`   Institution: ${edu.institution}`);
            if (edu.graduation_year) console.log(`   Graduation Year: ${edu.graduation_year}`);
            if (edu.additional_qualifications) console.log(`   Additional: ${edu.additional_qualifications}`);
            console.log('');
          }
          
          // Work Experience
          if (extractedInfo.work_experience) {
            console.log('💼 WORK EXPERIENCE:');
            const work = extractedInfo.work_experience;
            if (work.current_company) console.log(`   Current Company: ${work.current_company}`);
            if (work.current_position) console.log(`   Current Position: ${work.current_position}`);
            if (work.companies?.length) {
              console.log(`   Companies: ${work.companies.join(', ')}`);
            }
            if (work.roles?.length) {
              console.log(`   Roles: ${work.roles.join(', ')}`);
            }
            if (work.key_achievements?.length) {
              console.log(`   Key Achievements:`);
              work.key_achievements.forEach((achievement, index) => {
                console.log(`     ${index + 1}. ${achievement}`);
              });
            }
            console.log('');
          }
          
          // Additional Information
          if (extractedInfo.additional_info) {
            console.log('🏆 ADDITIONAL INFORMATION:');
            const additional = extractedInfo.additional_info;
            if (additional.certifications?.length) {
              console.log(`   Certifications: ${additional.certifications.join(', ')}`);
            }
            if (additional.awards?.length) {
              console.log(`   Awards: ${additional.awards.join(', ')}`);
            }
            if (additional.projects?.length) {
              console.log(`   Projects: ${additional.projects.join(', ')}`);
            }
            if (additional.languages?.length) {
              console.log(`   Languages: ${additional.languages.join(', ')}`);
            }
            console.log('');
          }
          
          console.log('✨ EXTRACTION INFO:');
          console.log(`   Method: ${data.extractionInfo?.method || 'Unknown'}`);
          if (data.extractionInfo?.ocrUsed) {
            console.log('   OCR Technology: Used for text extraction');
          }
          console.log(`   Original Text Length: ${data.extractionInfo?.originalTextLength || 'Unknown'}`);
          console.log(`   Cleaned Text Length: ${data.extractionInfo?.cleanedTextLength || 'Unknown'}`);
          console.log('========================');
          
          // Also display the raw extracted data object for complete transparency
          console.log('🔍 RAW EXTRACTED DATA OBJECT:');
          console.log(JSON.stringify(extractedInfo, null, 2));
          
          toast.success('Resume data extracted successfully! Check the browser console to see all extracted information.', {
            duration: 8000,
          });
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
