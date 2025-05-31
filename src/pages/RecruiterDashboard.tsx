import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, UserCheck, LogOut, Settings, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RecruiterDashboard = () => {
  const { user, recruiterProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch candidate profiles
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      return data;
    },
  });

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

  const handleNotifications = () => {
    toast.info("Notifications functionality coming soon!");
  };

  const filteredCandidates = candidates?.filter(candidate => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      candidate.first_name?.toLowerCase().includes(query) ||
      candidate.last_name?.toLowerCase().includes(query) ||
      candidate.title?.toLowerCase().includes(query) ||
      candidate.location?.toLowerCase().includes(query) ||
      candidate.skills?.some(skill => skill.toLowerCase().includes(query))
    );
  });

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Candidate Search
            </TabsTrigger>
            <TabsTrigger value="saved">
              <UserCheck className="h-4 w-4 mr-2" />
              Saved Candidates
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Users className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Find Top Tech Talent</CardTitle>
                <CardDescription>
                  Search through our database of qualified candidates using AI-powered matching
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <Input
                    placeholder="Search candidates by name, skills, location, or job title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading candidates...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCandidates?.map((candidate) => (
                      <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-2">
                            {candidate.first_name} {candidate.last_name}
                          </h3>
                          <p className="text-gray-600 mb-2">{candidate.title}</p>
                          <p className="text-sm text-gray-500 mb-3">{candidate.location}</p>
                          {candidate.experience_years && (
                            <p className="text-sm text-gray-600 mb-3">
                              {candidate.experience_years} years experience
                            </p>
                          )}
                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {candidate.skills.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          <Button size="sm" className="w-full">
                            View Profile
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Candidates</CardTitle>
                <CardDescription>
                  Candidates you've bookmarked for future consideration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-8">
                  No saved candidates yet. Start searching to find and save potential hires.
                </p>
              </CardContent>
            </Card>
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
                <Button variant="outline">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
