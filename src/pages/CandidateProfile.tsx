import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, FileText, Settings as SettingsIcon, LogOut, Upload, X, File, Download, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Settings from "@/components/Settings";
import { useResumeExtraction } from "@/hooks/useResumeExtraction";
import ProfileReviewDialog from "@/components/ProfileReviewDialog";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";
import { validateCandidateProfile } from "@/utils/profileValidation";

const CandidateProfile = () => {
  const { user, candidateProfile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewFromResume, setReviewFromResume] = useState(false);
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
  
  const { isExtracting, extractResumeData } = useResumeExtraction();

  // Update form data when candidateProfile changes
  useEffect(() => {
    if (candidateProfile) {
      console.log('Updating form data with candidate profile:', candidateProfile);
      setFormData({
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
      });
    }
  }, [candidateProfile]);

  // Close settings modal when component unmounts
  useEffect(() => {
    return () => {
      setSettingsOpen(false);
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      console.log('Starting logout process...');
      
      // Close settings modal before signing out
      setSettingsOpen(false);
      
      // Call the signOut function from context
      const { error } = await signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        toast.error("Error signing out. Please try again.");
        setIsSigningOut(false);
        return;
      }
      
      console.log('Successfully signed out, redirecting to home...');
      toast.success("Successfully signed out!");
      
      // Force navigation to home page
      navigate('/', { replace: true });
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      toast.error("Unexpected error during sign out");
      setIsSigningOut(false);
    }
  };

  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing profile...');
      await refreshProfile();
      toast.success("Profile refreshed successfully!");
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast.error("Failed to refresh profile");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveProfile = async (updateData?: any) => {
    if (!user || !candidateProfile) return;

    try {
      const dataToUpdate = updateData || {
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
        updated_at: new Date().toISOString()
      };

      // Add profile completion status
      const validation = validateCandidateProfile(dataToUpdate);
      dataToUpdate.profile_complete = validation.isValid;

      console.log('Updating profile with data:', dataToUpdate);

      const { error } = await supabase
        .from('candidate_profiles')
        .update(dataToUpdate)
        .eq('id', candidateProfile.id);

      if (error) {
        console.error('Profile update error:', error);
        toast.error("Failed to update profile");
        throw error;
      }

      console.log('Profile updated successfully, refreshing...');
      
      // Refresh the profile to get the latest data
      await refreshProfile();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
      throw error;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateFile = (file: File) => {
    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file only");
      return false;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return false;
    }

    return true;
  };

  const uploadResume = async (file: File) => {
    if (!validateFile(file) || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create file path: user_id/resume_filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/resume_${Date.now()}.${fileExt}`;

      console.log('Starting resume upload...');

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload resume");
        return;
      }

      setUploadProgress(30);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      setUploadProgress(50);

      // Update candidate profile with resume information
      const { data: updateData, error: updateError } = await supabase
        .from('candidate_profiles')
        .update({
          resume_url: urlData.publicUrl,
          resume_file_name: file.name,
          resume_file_size: file.size,
          resume_uploaded_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error("Failed to update profile with resume information");
        return;
      }

      setUploadProgress(70);

      // Extract resume data using AI
      if (updateData && updateData.id) {
        console.log('Starting AI extraction...');
        toast.success("Resume uploaded successfully! Extracting information...");
        
        const extractionResult = await extractResumeData(urlData.publicUrl, updateData.id);
        
        if (extractionResult && extractionResult.success) {
          setUploadProgress(100);
          console.log('Extraction successful, refreshing profile...');
          
          // Force refresh the profile to show updated data
          setTimeout(async () => {
            await refreshProfile();
            console.log('Profile refreshed after extraction');
            
            // Show the review dialog for extracted data
            setReviewFromResume(true);
            setShowReviewDialog(true);
            
            // Show detailed success message
            const updatedFields = extractionResult.updatedFields || [];
            if (updatedFields.length > 0) {
              toast.success(`Profile automatically updated with extracted data from your resume! Please review the information.`, {
                duration: 8000,
              });
            }
          }, 2000);
        } else {
          setUploadProgress(100);
          toast.info("Resume uploaded but data extraction failed. You can manually update your profile.");
        }
      }

    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error("Failed to upload resume");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 3000);
    }
  };

  const deleteResume = async () => {
    if (!user || !candidateProfile?.resume_url) return;

    try {
      // Extract file path from URL
      const urlParts = candidateProfile.resume_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'resumes');
      
      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        console.error('Invalid resume URL format:', candidateProfile.resume_url);
        toast.error("Invalid resume URL format");
        return;
      }
      
      const fileName = urlParts.slice(bucketIndex + 1).join('/');
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('resumes')
        .remove([fileName]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
      }

      // Update candidate profile to remove resume information
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({
          resume_url: null,
          resume_file_name: null,
          resume_file_size: null,
          resume_uploaded_at: null,
          resume_content: null
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error("Failed to update profile");
        return;
      }

      toast.success("Resume deleted successfully!");
      
      // Refresh the profile to show updated data
      await refreshProfile();

    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error("Failed to delete resume");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadResume(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadResume(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadResume = async () => {
    if (!candidateProfile?.resume_url || !user) return;

    try {
      console.log('Attempting to download resume from:', candidateProfile.resume_url);
      
      // Extract file path from URL
      const urlParts = candidateProfile.resume_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'resumes');
      
      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        console.error('Invalid resume URL format:', candidateProfile.resume_url);
        toast.error("Invalid resume URL format");
        return;
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      console.log('Extracted file path:', filePath);

      // Download the file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(filePath);

      if (downloadError) {
        console.error('Download error:', downloadError);
        toast.error("Failed to download resume");
        return;
      }

      if (!fileData) {
        console.error('No file data received');
        toast.error("No file data received");
        return;
      }

      // Create blob URL and open in new tab
      const blob = new Blob([fileData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error("Failed to open resume");
    }
  };

  if (!user || !candidateProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get current validation status
  const validation = validateCandidateProfile(candidateProfile);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Hire Al</h1>
              <Badge variant="secondary">Candidate Profile</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {candidateProfile.first_name}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshProfile}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Settings
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                trigger={
                  <Button variant="outline" size="sm">
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? 'Signing out...' : ''}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Banner */}
        <div className="mb-6">
          <ProfileCompletionBanner 
            validation={validation} 
            onEditProfile={() => {
              setReviewFromResume(false);
              setShowReviewDialog(true);
            }} 
          />
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="resume">
              <FileText className="h-4 w-4 mr-2" />
              Resume
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* AI-extracted data notice */}
            {candidateProfile.resume_content && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <p className="text-blue-800 font-medium">
                      AI-Enhanced Profile
                    </p>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Information below has been automatically extracted from your resume using AI technology.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Keep your profile up to date to get better job matches
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={formData.location}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Current Title</Label>
                    <Input 
                      id="title" 
                      value={formData.title}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input 
                      id="experience" 
                      type="number"
                      value={formData.experienceYears}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary Expectation</Label>
                    <Input 
                      id="salary" 
                      type="number"
                      value={formData.salaryExpectation}
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea 
                    id="summary" 
                    value={formData.summary}
                    readOnly
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Education</Label>
                  <Input 
                    id="education" 
                    value={formData.education}
                    readOnly
                    placeholder="e.g., Bachelor's in Computer Science, XYZ University, 2020"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {candidateProfile.skills && candidateProfile.skills.length > 0 ? (
                      candidateProfile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No skills added yet. Upload a resume to automatically extract skills.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input 
                      id="linkedin" 
                      value={formData.linkedinUrl}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub URL</Label>
                    <Input 
                      id="github" 
                      value={formData.githubUrl}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio URL</Label>
                    <Input 
                      id="portfolio" 
                      value={formData.portfolioUrl}
                      readOnly
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume">
            <Card>
              <CardHeader>
                <CardTitle>Resume Management</CardTitle>
                <CardDescription>
                  Upload and manage your resume to enhance your profile. AI will automatically extract information to improve your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {candidateProfile.resume_url ? (
                  // Resume exists - show current resume info
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center space-x-3">
                        <File className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">
                            {candidateProfile.resume_file_name || 'Resume'}
                          </p>
                          <p className="text-sm text-green-700">
                            {candidateProfile.resume_file_size && formatFileSize(candidateProfile.resume_file_size)} • 
                            Uploaded {candidateProfile.resume_uploaded_at && new Date(candidateProfile.resume_uploaded_at).toLocaleDateString()}
                          </p>
                          {candidateProfile.resume_content && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Sparkles className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600">AI-processed</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={downloadResume}>
                          <Download className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={deleteResume}>
                          <X className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Upload new resume section */}
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-medium mb-4">Upload New Resume</h3>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragActive 
                            ? 'border-blue-400 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Replace your resume</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          PDF files up to 10MB
                        </p>
                        <p className="text-xs text-blue-600 mb-4">
                          <Sparkles className="h-3 w-3 inline mr-1" />
                          AI will automatically extract and update your profile information
                        </p>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="resume-upload-replace"
                          disabled={isUploading || isExtracting}
                        />
                        <label htmlFor="resume-upload-replace">
                          <Button asChild disabled={isUploading || isExtracting}>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              {isUploading ? 'Uploading...' : isExtracting ? 'Processing...' : 'Choose File'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  // No resume - show upload area
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your resume</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      PDF files up to 10MB
                    </p>
                    <p className="text-xs text-blue-600 mb-4">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      AI will automatically extract and update your profile information
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="resume-upload"
                      disabled={isUploading || isExtracting}
                    />
                    <label htmlFor="resume-upload">
                      <Button asChild disabled={isUploading || isExtracting}>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : isExtracting ? 'Processing...' : 'Choose File'}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}

                {/* Upload/Processing Progress */}
                {(isUploading || isExtracting) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {isUploading && 'Uploading...'}
                        {isExtracting && 'Processing with AI...'}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                    {isExtracting && (
                      <p className="text-xs text-blue-600 text-center">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        Extracting information from your resume...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
                <CardDescription>
                  Set your job search preferences to get better matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-8">
                  Job preferences settings coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Review Dialog */}
      <ProfileReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        candidateProfile={candidateProfile}
        onSave={handleSaveProfile}
        extractedFromResume={reviewFromResume}
      />
    </div>
  );
};

export default CandidateProfile;
