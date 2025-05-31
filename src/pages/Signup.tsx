import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Users, Search, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const Signup = () => {
  const [activeTab, setActiveTab] = useState("recruiter");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    location: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: activeTab === "recruiter" ? formData.company : null,
        user_type: activeTab
      };

      const { error } = await signUp(formData.email, formData.password, userData);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created successfully! Please check your email to confirm your account.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Brain className="h-4 w-4 mr-2" />
            Join the AI Revolution
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Started with Hire Al
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your account type and start transforming your hiring process today
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="recruiter" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>I'm a Recruiter</span>
              </TabsTrigger>
              <TabsTrigger value="candidate" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>I'm a Candidate</span>
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Benefits Section */}
              <div className="space-y-6">
                <TabsContent value="recruiter">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Search className="h-6 w-6 text-blue-600" />
                        <span>Recruiter Benefits</span>
                      </CardTitle>
                      <CardDescription>
                        Transform how you find and connect with top tech talent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Natural Language Search</h4>
                          <p className="text-sm text-gray-600">Search using plain English descriptions</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">AI-Powered Ranking</h4>
                          <p className="text-sm text-gray-600">Get the best candidate matches first</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Personalized Outreach</h4>
                          <p className="text-sm text-gray-600">AI-generated messages that get responses</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Resume Parsing</h4>
                          <p className="text-sm text-gray-600">Automatic skill extraction and analysis</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="candidate">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="h-6 w-6 text-purple-600" />
                        <span>Candidate Benefits</span>
                      </CardTitle>
                      <CardDescription>
                        Get discovered by top tech recruiters and companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">AI Profile Enhancement</h4>
                          <p className="text-sm text-gray-600">Auto-extract skills from your resume</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Smart Matching</h4>
                          <p className="text-sm text-gray-600">Get matched with relevant opportunities</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Privacy Control</h4>
                          <p className="text-sm text-gray-600">Control your visibility and preferences</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Direct Outreach</h4>
                          <p className="text-sm text-gray-600">Receive personalized messages from recruiters</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              {/* Signup Forms */}
              <div>
                <TabsContent value="recruiter">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Create Recruiter Account</CardTitle>
                      <CardDescription>
                        Start finding top tech talent with AI-powered search
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                              id="firstName" 
                              placeholder="John"
                              value={formData.firstName}
                              onChange={(e) => handleInputChange("firstName", e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                              id="lastName" 
                              placeholder="Doe"
                              value={formData.lastName}
                              onChange={(e) => handleInputChange("lastName", e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Work Email</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="john@company.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input 
                            id="company" 
                            placeholder="Company Name"
                            value={formData.company}
                            onChange={(e) => handleInputChange("company", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input 
                            id="password" 
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            required
                          />
                        </div>
                        <Button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          disabled={loading}
                        >
                          {loading ? "Creating Account..." : "Create Recruiter Account"}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          By signing up, you agree to our{" "}
                          <Link to="/terms" className="text-blue-600 hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-blue-600 hover:underline">
                            Privacy Policy
                          </Link>
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="candidate">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Create Candidate Profile</CardTitle>
                      <CardDescription>
                        Get discovered by top tech recruiters and companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="candidateFirstName">First Name</Label>
                            <Input 
                              id="candidateFirstName" 
                              placeholder="Jane"
                              value={formData.firstName}
                              onChange={(e) => handleInputChange("firstName", e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="candidateLastName">Last Name</Label>
                            <Input 
                              id="candidateLastName" 
                              placeholder="Smith"
                              value={formData.lastName}
                              onChange={(e) => handleInputChange("lastName", e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="candidateEmail">Email</Label>
                          <Input 
                            id="candidateEmail" 
                            type="email" 
                            placeholder="jane@email.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="candidateLocation">Location</Label>
                          <Input 
                            id="candidateLocation" 
                            placeholder="San Francisco, CA"
                            value={formData.location}
                            onChange={(e) => handleInputChange("location", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="candidatePassword">Password</Label>
                          <Input 
                            id="candidatePassword" 
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            required
                          />
                        </div>
                        <Button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          disabled={loading}
                        >
                          {loading ? "Creating Profile..." : "Create Candidate Profile"}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          By signing up, you agree to our{" "}
                          <Link to="/terms" className="text-blue-600 hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-blue-600 hover:underline">
                            Privacy Policy
                          </Link>
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
