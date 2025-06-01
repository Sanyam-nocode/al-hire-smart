
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, User, MapPin, Mail, Phone, ExternalLink, Briefcase, GraduationCap, Award, Code } from "lucide-react";

interface ExtractedResumeDataProps {
  resumeContent: string;
}

const ExtractedResumeData = ({ resumeContent }: ExtractedResumeDataProps) => {
  let extractedData;
  
  try {
    extractedData = JSON.parse(resumeContent);
  } catch (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <p className="text-red-800">Unable to parse extracted resume data</p>
        </CardContent>
      </Card>
    );
  }

  const { personal_info, professional_summary, education, skills, work_experience, additional_info } = extractedData;

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">AI-Extracted Resume Data</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Here's what our AI extracted from your uploaded resume
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      {personal_info && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-600" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {personal_info.full_name && (
              <div>
                <span className="font-medium">Name:</span> {personal_info.full_name}
              </div>
            )}
            {personal_info.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{personal_info.email}</span>
              </div>
            )}
            {personal_info.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{personal_info.phone}</span>
              </div>
            )}
            {personal_info.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{personal_info.location}</span>
              </div>
            )}
            {personal_info.linkedin_url && (
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-gray-500" />
                <a href={personal_info.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  LinkedIn Profile
                </a>
              </div>
            )}
            {personal_info.github_url && (
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-gray-500" />
                <a href={personal_info.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  GitHub Profile
                </a>
              </div>
            )}
            {personal_info.portfolio_url && (
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-gray-500" />
                <a href={personal_info.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Portfolio
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professional Summary */}
      {professional_summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-gray-600" />
              <CardTitle>Professional Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {professional_summary.current_role && (
              <div>
                <span className="font-medium">Current Role:</span> {professional_summary.current_role}
              </div>
            )}
            {professional_summary.total_experience_years && (
              <div>
                <span className="font-medium">Experience:</span> {professional_summary.total_experience_years} years
              </div>
            )}
            {professional_summary.industry && (
              <div>
                <span className="font-medium">Industry:</span> {professional_summary.industry}
              </div>
            )}
            {professional_summary.summary && (
              <div>
                <span className="font-medium">Summary:</span>
                <p className="mt-1 text-gray-700">{professional_summary.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {skills && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Code className="h-5 w-5 text-gray-600" />
              <CardTitle>Skills</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.technical_skills && skills.technical_skills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Technical Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.technical_skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
            {skills.programming_languages && skills.programming_languages.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Programming Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.programming_languages.map((lang: string, index: number) => (
                    <Badge key={index} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </div>
            )}
            {skills.tools_and_frameworks && skills.tools_and_frameworks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tools & Frameworks</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.tools_and_frameworks.map((tool: string, index: number) => (
                    <Badge key={index} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>
            )}
            {skills.soft_skills && skills.soft_skills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Soft Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.soft_skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {education && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-gray-600" />
              <CardTitle>Education</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {education.qualification && (
              <div>
                <span className="font-medium">Qualification:</span> {education.qualification}
              </div>
            )}
            {education.institution && (
              <div>
                <span className="font-medium">Institution:</span> {education.institution}
              </div>
            )}
            {education.graduation_year && (
              <div>
                <span className="font-medium">Graduation Year:</span> {education.graduation_year}
              </div>
            )}
            {education.additional_qualifications && (
              <div>
                <span className="font-medium">Additional Qualifications:</span> {education.additional_qualifications}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Experience */}
      {work_experience && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-gray-600" />
              <CardTitle>Work Experience</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {work_experience.current_company && (
              <div>
                <span className="font-medium">Current Company:</span> {work_experience.current_company}
              </div>
            )}
            {work_experience.current_position && (
              <div>
                <span className="font-medium">Current Position:</span> {work_experience.current_position}
              </div>
            )}
            {work_experience.companies && work_experience.companies.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Companies</h4>
                <div className="space-y-1">
                  {work_experience.companies.map((company: string, index: number) => (
                    <div key={index} className="text-gray-700">• {company}</div>
                  ))}
                </div>
              </div>
            )}
            {work_experience.roles && work_experience.roles.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Roles</h4>
                <div className="space-y-1">
                  {work_experience.roles.map((role: string, index: number) => (
                    <div key={index} className="text-gray-700">• {role}</div>
                  ))}
                </div>
              </div>
            )}
            {work_experience.key_achievements && work_experience.key_achievements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Achievements</h4>
                <div className="space-y-1">
                  {work_experience.key_achievements.map((achievement: string, index: number) => (
                    <div key={index} className="text-gray-700">• {achievement}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      {additional_info && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-gray-600" />
              <CardTitle>Additional Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {additional_info.certifications && additional_info.certifications.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {additional_info.certifications.map((cert: string, index: number) => (
                    <Badge key={index} variant="outline">{cert}</Badge>
                  ))}
                </div>
              </div>
            )}
            {additional_info.awards && additional_info.awards.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Awards</h4>
                <div className="space-y-1">
                  {additional_info.awards.map((award: string, index: number) => (
                    <div key={index} className="text-gray-700">• {award}</div>
                  ))}
                </div>
              </div>
            )}
            {additional_info.projects && additional_info.projects.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Projects</h4>
                <div className="space-y-1">
                  {additional_info.projects.map((project: string, index: number) => (
                    <div key={index} className="text-gray-700">• {project}</div>
                  ))}
                </div>
              </div>
            )}
            {additional_info.languages && additional_info.languages.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {additional_info.languages.map((language: string, index: number) => (
                    <Badge key={index} variant="secondary">{language}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExtractedResumeData;
