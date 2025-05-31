import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Users, Calendar, Settings, BarChart3, Plus, Brain, Filter, MapPin, Briefcase, Video } from "lucide-react";
import Navbar from "@/components/Navbar";
import BookDemoForm from "@/components/BookDemoForm";

const RecruiterDashboard = () => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleTalentSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
    }, 2000);
  };

  const mockSearchResults = [
    {
      id: 1,
      name: "Sarah Chen",
      title: "Senior React Developer",
      location: "San Francisco, CA",
      experience: "5+ years",
      skills: ["React", "TypeScript", "Node.js", "AWS"],
      availability: "Available",
      source: "LinkedIn"
    },
    {
      id: 2,
      name: "Marcus Johnson",
      title: "Full Stack Engineer",
      location: "Austin, TX",
      experience: "4 years",
      skills: ["React", "Python", "PostgreSQL", "Docker"],
      availability: "Open to opportunities",
      source: "GitHub"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      title: "Frontend Developer",
      location: "Remote",
      experience: "3+ years",
      skills: ["React", "Vue.js", "JavaScript", "CSS"],
      availability: "Available in 2 weeks",
      source: "Indeed"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userProfile?.full_name || user?.email}
              </h1>
              <p className="text-gray-600">Manage your recruitment activities</p>
            </div>
            <div className="flex space-x-4">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Job Posting
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="talent-search" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Talent Search</span>
            </TabsTrigger>
            <TabsTrigger value="candidates" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Candidates</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Job Postings</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="book-demo" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Book Demo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">847</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">+8 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hires</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">+2 this month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sarah Johnson</p>
                        <p className="text-sm text-gray-600">Frontend Developer</p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Mike Chen</p>
                        <p className="text-sm text-gray-600">Backend Engineer</p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Emily Davis</p>
                        <p className="text-sm text-gray-600">UX Designer</p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Interview with Alex Smith</p>
                        <p className="text-sm text-gray-600">Today, 2:00 PM</p>
                      </div>
                      <Button variant="outline" size="sm">Join</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Interview with Lisa Brown</p>
                        <p className="text-sm text-gray-600">Tomorrow, 10:00 AM</p>
                      </div>
                      <Button variant="outline" size="sm">Schedule</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Interview with Tom Wilson</p>
                        <p className="text-sm text-gray-600">Friday, 3:30 PM</p>
                      </div>
                      <Button variant="outline" size="sm">Schedule</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="talent-search">
            <div className="space-y-6">
              {/* Search Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>AI-Powered Talent Search</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Use natural language to find the perfect candidates across multiple platforms
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., 'Find React developers with 3+ years experience in San Francisco who are open to remote work'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleTalentSearch()}
                    />
                    <Button 
                      onClick={handleTalentSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-500">Quick searches:</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSearchQuery("Senior Python developers with machine learning experience")}
                    >
                      ML Engineers
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSearchQuery("Frontend developers skilled in React and TypeScript")}
                    >
                      React Developers
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSearchQuery("DevOps engineers with AWS and Kubernetes experience")}
                    >
                      DevOps Engineers
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {(searchQuery || isSearching) && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Search Results</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                      <span className="text-sm text-gray-500">
                        {mockSearchResults.length} candidates found
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockSearchResults.map((candidate) => (
                        <div key={candidate.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-lg">{candidate.name}</h3>
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {candidate.availability}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center space-x-1">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{candidate.title}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{candidate.location}</span>
                                </div>
                                <span>• {candidate.experience}</span>
                                <span>• via {candidate.source}</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                {candidate.skills.map((skill) => (
                                  <span 
                                    key={skill}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <Button variant="outline" size="sm">
                                View Profile
                              </Button>
                              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                                Contact
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search Sources */}
              <Card>
                <CardHeader>
                  <CardTitle>Connected Sources</CardTitle>
                  <p className="text-sm text-gray-600">
                    Your search will include candidates from these platforms
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">LinkedIn</p>
                        <p className="text-xs text-gray-500">Connected</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <Search className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-xs text-gray-500">Connected</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Indeed</p>
                        <p className="text-xs text-gray-500">Connected</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg opacity-50">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <Plus className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">Add Source</p>
                        <p className="text-xs text-gray-400">Connect more</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Candidate management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Job Postings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Job posting management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Interview Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Interview scheduling features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="book-demo">
            <BookDemoForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default RecruiterDashboard;
