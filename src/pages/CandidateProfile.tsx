import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, FileText, Settings, LogOut, Upload } from "lucide-react";
import { toast } from "sonner";

const CandidateProfile = () => {
  const { user, candidateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSettings = () => {
    toast.info("Settings functionality coming soon!");
  };

  if (!user || !candidateProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
              <Button variant="outline" size="sm" onClick={handleSettings}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Keep your profile up to date to get better job matches
                    </CardDescription>
                  </div>
                  <Button 
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "Save Changes" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      defaultValue={candidateProfile.first_name}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      defaultValue={candidateProfile.last_name}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      defaultValue={candidateProfile.email}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      defaultValue={candidateProfile.phone || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      defaultValue={candidateProfile.location || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Current Title</Label>
                    <Input 
                      id="title" 
                      defaultValue={candidateProfile.title || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input 
                      id="experience" 
                      type="number"
                      defaultValue={candidateProfile.experience_years || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary Expectation</Label>
                    <Input 
                      id="salary" 
                      type="number"
                      defaultValue={candidateProfile.salary_expectation || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea 
                    id="summary" 
                    defaultValue={candidateProfile.summary || ''}
                    readOnly={!isEditing}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {candidateProfile.skills?.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {(!candidateProfile.skills || candidateProfile.skills.length === 0) && (
                      <p className="text-gray-500 text-sm">No skills added yet</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input 
                      id="linkedin" 
                      defaultValue={candidateProfile.linkedin_url || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub URL</Label>
                    <Input 
                      id="github" 
                      defaultValue={candidateProfile.github_url || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio URL</Label>
                    <Input 
                      id="portfolio" 
                      defaultValue={candidateProfile.portfolio_url || ''}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education">Education</Label>
                    <Input 
                      id="education" 
                      defaultValue={candidateProfile.education || ''}
                      readOnly={!isEditing}
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
                  Upload and manage your resume to enhance your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your resume</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    PDF, DOC, or DOCX files up to 10MB
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
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
    </div>
  );
};

export default CandidateProfile;
