import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, FileText, Settings as SettingsIcon, LogOut, Upload, Save, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Settings from "@/components/Settings";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";
import ExtractedResumeData from "@/components/ExtractedResumeData";
import ProfileReviewDialog from "@/components/ProfileReviewDialog";
import FreeTrialBanner from "@/components/FreeTrialBanner";
import { validateProfile } from "@/utils/profileValidation";

const CandidateProfile = () => {
  const { user, candidateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    summary: "",
    experience_years: 0,
    skills: [] as string[],
    education: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    salary_expectation: 0
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
	const [extractedData, setExtractedData] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    if (candidateProfile) {
      setProfileData({
        first_name: candidateProfile.first_name || "",
        last_name: candidateProfile.last_name || "",
        email: candidateProfile.email || "",
        phone: candidateProfile.phone || "",
        location: candidateProfile.location || "",
        title: candidateProfile.title || "",
        summary: candidateProfile.summary || "",
        experience_years: candidateProfile.experience_years || 0,
        skills: candidateProfile.skills || [],
        education: candidateProfile.education || "",
        linkedin_url: candidateProfile.linkedin_url || "",
        github_url: candidateProfile.github_url || "",
        portfolio_url: candidateProfile.portfolio_url || "",
        salary_expectation: candidateProfile.salary_expectation || 0
      });
    }
  }, [candidateProfile]);

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setProfileData(prev => ({
      ...prev,
      skills: skills
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .update({
          ...profileData,
          skills: profileData.skills.length > 0 ? profileData.skills : null
        })
        .eq('id', candidateProfile?.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error("Error signing out");
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const handleNotifications = () => {
    toast.info("Notifications functionality coming soon!");
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      toast.success(`File "${file.name}" selected. Click 'Extract Data' to proceed.`);
    }
  };

  const handleExtractData = async () => {
		if (!resumeFile) {
			toast.error("Please upload a resume first.");
			return;
		}

		setLoading(true);
		try {
			const formData = new FormData();
			formData.append("resume", resumeFile);

			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extract-resume`, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			setExtractedData(result);
			toast.success("Resume data extracted successfully!");
      setReviewDialogOpen(true);
		} catch (error) {
			console.error("Error extracting resume data:", error);
			toast.error("Failed to extract resume data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

  const handleApplyExtractedData = async (approvedData: any) => {
    setLoading(true);
    try {
      // Update profileData with approvedData
      setProfileData(prev => ({
        ...prev,
        ...approvedData,
      }));

      // Save the updated profile to the database
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          ...profileData,
          ...approvedData,
          skills: approvedData.skills && approvedData.skills.length > 0 ? approvedData.skills : null
        })
        .eq('id', candidateProfile?.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated with extracted data!");
        setIsEditing(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred while applying extracted data.");
    } finally {
      setLoading(false);
      setExtractedData(null); // Clear extracted data after applying
      setReviewDialogOpen(false); // Close the dialog
    }
  };

  if (!user || !candidateProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const validation = validateProfile(candidateProfile);

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
              <Button variant="outline" size="sm" onClick={handleNotifications}>
                <Bell className="h-4 w-4" />
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
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Free Trial Banner */}
        <FreeTrialBanner userType="candidate" daysRemaining={14} />

        {/* Profile Completion Banner */}
        <ProfileCompletionBanner 
          validation={validation}
          onEditProfile={() => setIsEditing(true)}
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="resume">
              <FileText className="h-4 w-4 mr-2" />
              Resume
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Profile</CardTitle>
                <CardDescription>
                  Manage your profile information and visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">First Name</Label>
                    <Input 
                      value={profileData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                    <Input 
                      value={profileData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input 
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <Input 
                      value={profileData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Location</Label>
                    <Input 
                      value={profileData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Title</Label>
                    <Input 
                      value={profileData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">LinkedIn URL</Label>
                    <Input 
                      type="url"
                      value={profileData.linkedin_url}
                      onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">GitHub URL</Label>
                    <Input 
                      type="url"
                      value={profileData.github_url}
                      onChange={(e) => handleInputChange("github_url", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Portfolio URL</Label>
                    <Input 
                      type="url"
                      value={profileData.portfolio_url}
                      onChange={(e) => handleInputChange("portfolio_url", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Salary Expectation</Label>
                    <Input 
                      type="number"
                      value={profileData.salary_expectation}
                      onChange={(e) => handleInputChange("salary_expectation", Number(e.target.value))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Years of Experience</Label>
                    <Input
                      type="number"
                      value={profileData.experience_years}
                      onChange={(e) => handleInputChange("experience_years", Number(e.target.value))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Education</Label>
                    <Input
                      value={profileData.education}
                      onChange={(e) => handleInputChange("education", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Summary</Label>
                  <Textarea 
                    placeholder="Tell us about yourself"
                    value={profileData.summary}
                    onChange={(e) => handleInputChange("summary", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Skills</Label>
                  <ExtractedResumeData
                    data={{ skills: profileData.skills }}
                    onSkillsUpdate={handleSkillsChange}
                    disabled={!isEditing}
                  />
                </div>
                {isEditing ? (
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume">
            <Card>
              <CardHeader>
                <CardTitle>Resume Analysis</CardTitle>
                <CardDescription>
                  Upload your resume to extract data and enhance your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Input
                    type="file"
                    id="resume-upload"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                  <Label htmlFor="resume-upload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md">
                    <Upload className="h-4 w-4 mr-2 inline-block" />
                    Upload Resume
                  </Label>
                  <Button onClick={handleExtractData} disabled={!resumeFile || loading}>
                    {loading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Extract Data
                      </>
                    )}
                  </Button>
                </div>
                {extractedData && (
                  <Card className="mt-4">
                    <CardContent>
                      <h3 className="text-lg font-semibold mb-2">Extracted Data Preview</h3>
                      <pre>{JSON.stringify(extractedData, null, 2)}</pre>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ProfileReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        data={extractedData}
        onApprove={handleApplyExtractedData}
        onReject={() => {
          setExtractedData(null);
          setReviewDialogOpen(false);
        }}
      />
    </div>
  );
};

export default CandidateProfile;
