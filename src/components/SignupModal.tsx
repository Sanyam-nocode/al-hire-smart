
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Brain, Users, Search, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SignupModal = ({ open, onOpenChange }: SignupModalProps) => {
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
  const { signUp } = useAuth();

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
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
              <Brain className="h-4 w-4 mr-2" />
              Join the AI Revolution
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Get Started with Hire Al
            </h2>
            <p className="text-gray-600 mt-2">
              Choose your account type and start transforming your hiring process today
            </p>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="recruiter" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>I'm a Recruiter</span>
            </TabsTrigger>
            <TabsTrigger value="candidate" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>I'm a Candidate</span>
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Benefits Section */}
            <div className="space-y-4">
              <TabsContent value="recruiter">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Search className="h-5 w-5 text-blue-600" />
                      <span>Recruiter Benefits</span>
                    </CardTitle>
                    <CardDescription>
                      Transform how you find and connect with top tech talent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Natural Language Search</h4>
                        <p className="text-xs text-gray-600">Search using plain English descriptions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">AI-Powered Ranking</h4>
                        <p className="text-xs text-gray-600">Get the best candidate matches first</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Personalized Outreach</h4>
                        <p className="text-xs text-gray-600">AI-generated messages that get responses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="candidate">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                      <span>Candidate Benefits</span>
                    </CardTitle>
                    <CardDescription>
                      Get discovered by top tech recruiters and companies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">AI Profile Enhancement</h4>
                        <p className="text-xs text-gray-600">Auto-extract skills from your resume</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Smart Matching</h4>
                        <p className="text-xs text-gray-600">Get matched with relevant opportunities</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Privacy Control</h4>
                        <p className="text-xs text-gray-600">Control your visibility and preferences</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Signup Forms */}
            <div>
              <TabsContent value="recruiter">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Create Recruiter Account</CardTitle>
                    <CardDescription>
                      Start finding top tech talent with AI-powered search
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm">First Name</Label>
                          <Input 
                            id="firstName" 
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            required
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                          <Input 
                            id="lastName" 
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            required
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm">Work Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm">Company</Label>
                        <Input 
                          id="company" 
                          placeholder="Company Name"
                          value={formData.company}
                          onChange={(e) => handleInputChange("company", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm">Password</Label>
                        <Input 
                          id="password" 
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <Button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        disabled={loading}
                      >
                        {loading ? "Creating Account..." : "Create Recruiter Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="candidate">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Create Candidate Profile</CardTitle>
                    <CardDescription>
                      Get discovered by top tech recruiters and companies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="candidateFirstName" className="text-sm">First Name</Label>
                          <Input 
                            id="candidateFirstName" 
                            placeholder="Jane"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            required
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="candidateLastName" className="text-sm">Last Name</Label>
                          <Input 
                            id="candidateLastName" 
                            placeholder="Smith"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            required
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="candidateEmail" className="text-sm">Email</Label>
                        <Input 
                          id="candidateEmail" 
                          type="email" 
                          placeholder="jane@email.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="candidateLocation" className="text-sm">Location</Label>
                        <Input 
                          id="candidateLocation" 
                          placeholder="San Francisco, CA"
                          value={formData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="candidatePassword" className="text-sm">Password</Label>
                        <Input 
                          id="candidatePassword" 
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <Button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        disabled={loading}
                      >
                        {loading ? "Creating Profile..." : "Create Candidate Profile"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
