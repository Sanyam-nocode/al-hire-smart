
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { validateCandidateProfile, ValidationResult } from "@/utils/profileValidation";
import { toast } from "sonner";

interface ProfileReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateProfile: any;
  onSave: (updatedData: any) => Promise<void>;
  extractedFromResume?: boolean;
}

const ProfileReviewDialog = ({ 
  open, 
  onOpenChange, 
  candidateProfile, 
  onSave,
  extractedFromResume = false 
}: ProfileReviewDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    experienceYears: '',
    salaryExpectation: '',
    summary: '',
    education: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    missingFields: [],
    completionPercentage: 0
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (candidateProfile && open) {
      const data = {
        firstName: candidateProfile.first_name || '',
        lastName: candidateProfile.last_name || '',
        email: candidateProfile.email || '',
        phone: candidateProfile.phone || '',
        location: candidateProfile.location || '',
        title: candidateProfile.title || '',
        experienceYears: candidateProfile.experience_years?.toString() || '',
        salaryExpectation: candidateProfile.salary_expectation?.toString() || '',
        summary: candidateProfile.summary || '',
        education: candidateProfile.education || '',
        linkedinUrl: candidateProfile.linkedin_url || '',
        githubUrl: candidateProfile.github_url || '',
        portfolioUrl: candidateProfile.portfolio_url || ''
      };
      setFormData(data);
      
      // Validate the profile data
      const validationResult = validateCandidateProfile(candidateProfile);
      setValidation(validationResult);
    }
  }, [candidateProfile, open]);

  // Re-validate when form data changes
  useEffect(() => {
    if (open) {
      const profileData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        title: formData.title,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        summary: formData.summary,
        education: formData.education,
        linkedin_url: formData.linkedinUrl,
      };
      
      const validationResult = validateCandidateProfile(profileData);
      setValidation(validationResult);
    }
  }, [formData, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        location: formData.location || null,
        title: formData.title || null,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        salary_expectation: formData.salaryExpectation ? parseInt(formData.salaryExpectation) : null,
        summary: formData.summary || null,
        education: formData.education || null,
        linkedin_url: formData.linkedinUrl || null,
        github_url: formData.githubUrl || null,
        portfolio_url: formData.portfolioUrl || null,
        profile_complete: validation.isValid,
        updated_at: new Date().toISOString()
      };

      await onSave(updateData);
      toast.success("Profile updated successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isMandatoryField = (fieldName: string) => {
    const mandatoryFields = ['firstName', 'lastName', 'email', 'phone', 'location', 'title', 'experienceYears', 'summary', 'education', 'linkedinUrl'];
    return mandatoryFields.includes(fieldName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {extractedFromResume && <Sparkles className="h-5 w-5 text-blue-600" />}
            <span>Review Your Profile</span>
          </DialogTitle>
          <DialogDescription>
            {extractedFromResume ? 
              "AI has extracted information from your resume. Please review and complete your profile." :
              "Please review and complete your profile information."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Validation Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Profile Completion: {validation.completionPercentage}%
            </span>
            {validation.isValid ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Complete</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{validation.missingFields.length} fields missing</span>
              </div>
            )}
          </div>
          <Progress value={validation.completionPercentage} className="w-full h-2" />
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center space-x-1">
                  <span>First Name</span>
                  {isMandatoryField('firstName') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={!formData.firstName ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center space-x-1">
                  <span>Last Name</span>
                  {isMandatoryField('lastName') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={!formData.lastName ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-1">
                  <span>Email</span>
                  {isMandatoryField('email') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={!formData.email ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-1">
                  <span>Phone</span>
                  {isMandatoryField('phone') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={!formData.phone ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center space-x-1">
                  <span>Location</span>
                  {isMandatoryField('location') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="location" 
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={!formData.location ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center space-x-1">
                  <span>Current Title</span>
                  {isMandatoryField('title') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="title" 
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={!formData.title ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience" className="flex items-center space-x-1">
                  <span>Years of Experience</span>
                  {isMandatoryField('experienceYears') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="experience" 
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                  className={!formData.experienceYears ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Expectation (Optional)</Label>
                <Input 
                  id="salary" 
                  type="number"
                  value={formData.salaryExpectation}
                  onChange={(e) => handleInputChange('salaryExpectation', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Professional Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary" className="flex items-center space-x-1">
                  <span>Professional Summary</span>
                  {isMandatoryField('summary') && <span className="text-red-500">*</span>}
                </Label>
                <Textarea 
                  id="summary" 
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  rows={4}
                  className={!formData.summary ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education" className="flex items-center space-x-1">
                  <span>Education</span>
                  {isMandatoryField('education') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="education" 
                  value={formData.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  placeholder="e.g., Bachelor's in Computer Science, XYZ University, 2020"
                  className={!formData.education ? 'border-red-300' : ''}
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          {candidateProfile.skills && candidateProfile.skills.length > 0 && (
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {candidateProfile.skills.map((skill: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Professional Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center space-x-1">
                  <span>LinkedIn URL</span>
                  {isMandatoryField('linkedinUrl') && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id="linkedin" 
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  className={!formData.linkedinUrl ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub URL (Optional)</Label>
                <Input 
                  id="github" 
                  value={formData.githubUrl}
                  onChange={(e) => handleInputChange('githubUrl', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio URL (Optional)</Label>
                <Input 
                  id="portfolio" 
                  value={formData.portfolioUrl}
                  onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col space-y-2">
          {!validation.isValid && (
            <p className="text-sm text-amber-600 text-center">
              Please complete all mandatory fields (marked with *) to become visible to recruiters.
            </p>
          )}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileReviewDialog;
