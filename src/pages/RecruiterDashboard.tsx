
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, LogOut, Settings as SettingsIcon, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Settings from "@/components/Settings";
import AISearchComponent from "@/components/AISearchComponent";
import SavedCandidatesTab from "@/components/SavedCandidatesTab";
import CandidateProfileModal from "@/components/CandidateProfileModal";
import ContactCandidateModal from "@/components/ContactCandidateModal";
import ConversationHistoryTab from "@/components/ConversationHistoryTab";

interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  location: string | null;
  skills: string[] | null;
  experience_years: number | null;
  summary: string | null;
  education: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  salary_expectation: number | null;
  resume_content: string | null;
}

const RecruiterDashboard = () => {
  const { user, recruiterProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

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

  const handleViewProfile = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setProfileModalOpen(true);
  };

  const handleContact = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setContactModalOpen(true);
  };

  const handleEditProfile = () => {
    setProfileEditOpen(true);
  };

  if (!user || !recruiterProfile) {
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
              <Badge variant="secondary">Recruiter Dashboard</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {recruiterProfile.first_name}
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
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Candidate Search
            </TabsTrigger>
            <TabsTrigger value="saved">
              <UserCheck className="h-4 w-4 mr-2" />
              Saved Candidates
            </TabsTrigger>
            <TabsTrigger value="history">
              <Users className="h-4 w-4 mr-2" />
              Conversation History
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Users className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <AISearchComponent onViewProfile={handleViewProfile} onContact={handleContact} />
          </TabsContent>

          <TabsContent value="saved">
            <SavedCandidatesTab onViewProfile={handleViewProfile} onContact={handleContact} />
          </TabsContent>

          <TabsContent value="history">
            <ConversationHistoryTab onViewProfile={handleViewProfile} />
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Recruiter Profile</CardTitle>
                <CardDescription>
                  Manage your profile information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <p className="text-gray-900">{recruiterProfile.first_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <p className="text-gray-900">{recruiterProfile.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{recruiterProfile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company</label>
                    <p className="text-gray-900">{recruiterProfile.company}</p>
                  </div>
                  {recruiterProfile.job_title && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Job Title</label>
                      <p className="text-gray-900">{recruiterProfile.job_title}</p>
                    </div>
                  )}
                  {recruiterProfile.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <p className="text-gray-900">{recruiterProfile.location}</p>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={handleEditProfile}>
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CandidateProfileModal
        candidate={selectedCandidate}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onContact={handleContact}
      />

      <ContactCandidateModal
        candidate={selectedCandidate}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />

      {/* Profile Edit Modal */}
      <Settings
        open={profileEditOpen}
        onOpenChange={setProfileEditOpen}
        trigger={null}
      />
    </div>
  );
};

export default RecruiterDashboard;
