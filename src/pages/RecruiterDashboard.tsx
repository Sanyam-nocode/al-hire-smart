
import { useState } from "react";
import { Search, Filter, Star, MapPin, Calendar, Mail, Eye, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";

const RecruiterDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for candidates
  const candidates = [
    {
      id: 1,
      name: "Alex Chen",
      title: "Senior Full Stack Developer",
      location: "San Francisco, CA",
      experience: "5+ years",
      skills: ["React", "Node.js", "TypeScript", "AWS", "GraphQL"],
      availability: "Available",
      matchScore: 95,
      lastActive: "2 days ago",
      summary: "Experienced full-stack developer with expertise in React ecosystem and cloud architecture.",
    },
    {
      id: 2,
      name: "Sarah Rodriguez",
      title: "DevOps Engineer",
      location: "Austin, TX",
      experience: "4+ years",
      skills: ["Kubernetes", "Docker", "AWS", "Terraform", "Python"],
      availability: "Open to offers",
      matchScore: 88,
      lastActive: "1 week ago",
      summary: "DevOps engineer specializing in container orchestration and infrastructure automation.",
    },
    {
      id: 3,
      name: "Michael Kim",
      title: "AI/ML Engineer",
      location: "Seattle, WA",
      experience: "3+ years",
      skills: ["Python", "TensorFlow", "PyTorch", "MLOps", "Data Science"],
      availability: "Available",
      matchScore: 92,
      lastActive: "1 day ago",
      summary: "Machine learning engineer with focus on deep learning and production ML systems.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Next Hire
          </h1>
          <p className="text-gray-600">
            Search through thousands of qualified tech professionals using natural language
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Describe your ideal candidate... e.g., 'Senior React developer with AWS experience in San Francisco'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="lg">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Search Candidates
                </Button>
              </div>
            </div>
            
            {/* Quick Search Examples */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Try these searches:</p>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => setSearchQuery("Senior React developer with 5+ years experience")}
                >
                  Senior React developer with 5+ years experience
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => setSearchQuery("DevOps engineer familiar with Kubernetes")}
                >
                  DevOps engineer familiar with Kubernetes
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => setSearchQuery("AI engineer with Python and TensorFlow")}
                >
                  AI engineer with Python and TensorFlow
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <div className="space-y-2">
                    <Badge variant="outline">San Francisco, CA (12)</Badge>
                    <Badge variant="outline">Austin, TX (8)</Badge>
                    <Badge variant="outline">Seattle, WA (15)</Badge>
                    <Badge variant="outline">Remote (45)</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Experience Level</h4>
                  <div className="space-y-2">
                    <Badge variant="outline">0-2 years (5)</Badge>
                    <Badge variant="outline">3-5 years (18)</Badge>
                    <Badge variant="outline">5+ years (32)</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <div className="space-y-2">
                    <Badge variant="outline">Available now (28)</Badge>
                    <Badge variant="outline">Open to offers (47)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Candidate List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                Found <span className="font-semibold">75 candidates</span> matching your search
              </p>
              <select className="border rounded-md px-3 py-1 text-sm">
                <option>Sort by relevance</option>
                <option>Sort by experience</option>
                <option>Sort by last active</option>
              </select>
            </div>

            {candidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-gray-900">{candidate.name}</h3>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium text-gray-700 ml-1">
                              {candidate.matchScore}% match
                            </span>
                          </div>
                        </div>
                        <p className="text-lg text-gray-700 mb-2">{candidate.title}</p>
                        <div className="flex items-center text-gray-600 space-x-4 text-sm">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {candidate.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {candidate.experience}
                          </div>
                          <Badge 
                            variant={candidate.availability === "Available" ? "default" : "secondary"}
                            className={candidate.availability === "Available" ? "bg-green-100 text-green-800" : ""}
                          >
                            {candidate.availability}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{candidate.summary}</p>

                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">Last active: {candidate.lastActive}</p>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      View full profile →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More */}
            <div className="text-center py-8">
              <Button variant="outline" size="lg">
                Load More Candidates
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
