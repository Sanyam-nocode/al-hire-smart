import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, Users, Search, CheckCircle, Mail, AlertCircle, RefreshCw } from "lucide-react";
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
  const [resendLoading, setResendLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { signUp, resendConfirmation } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      const { error } = await resendConfirmation(submittedEmail);
      if (error) {
        toast.error(error.message || "Failed to resend confirmation email");
      } else {
        toast.success("Confirmation email has been resent! Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      console.error("Resend confirmation error:", error);
      toast.error("An unexpected error occurred while resending email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        toast.error("Please fill in all required fields");
        return;
      }

      if (activeTab === "recruiter" && !formData.company) {
        toast.error("Company name is required for recruiter accounts");
        return;
      }

      const userData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        company: activeTab === "recruiter" ? formData.company.trim() : null,
        location: activeTab === "candidate" ? formData.location?.trim() || null : null,
        user_type: activeTab
      };

      console.log("SignupModal: Attempting to sign up user with:", userData);
      
      const { error } = await signUp(formData.email, formData.password, userData);
      
      if (error) {
        console.error("SignupModal: Signup error:", error);
        
        // Check if this is a specific case where we should show the email confirmation screen
        if (error.message?.toLowerCase().includes('email') && 
            error.message?.toLowerCase().includes('already')) {
          // Show email confirmation screen even for existing users
          setSubmittedEmail(formData.email);
          setShowEmailConfirmation(true);
          toast.success("A confirmation email has been sent! Please check your inbox and spam folder.");
        } else {
          toast.error(error.message || "Failed to create account");
        }
      } else {
        console.log("SignupModal: Signup successful, showing email confirmation");
        setSubmittedEmail(formData.email);
        setShowEmailConfirmation(true);
        toast.success("Account created! Please check your email to confirm your account.");
        
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          location: "",
          password: ""
        });
      }
    } catch (error: any) {
      console.error("SignupModal: Unexpected signup error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowEmailConfirmation(false);
    onOpenChange(false);
  };

  if (showEmailConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-4">
                <Mail className="h-4 w-4 mr-2" />
                Check Your Email
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Confirm Your Account
              </h2>
            </DialogTitle>
            <DialogDescription className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <p className="text-gray-600 mb-2">
                  We've sent a confirmation email to:
                </p>
                <p className="font-semibold text-gray-900">{submittedEmail}</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the confirmation link in the email</li>
                  <li>Return to this page to sign in</li>
                </ol>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">Email not arriving?</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Check your spam/junk folder</li>
                      <li>• Make sure the email address is correct</li>
                      <li>• Wait a few minutes for delivery</li>
                      <li>• Use the resend button below</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="w-full"
                  variant="outline"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>
                
                <Button onClick={handleCloseModal} className="w-full">
                  Got it, I'll check my email
                </Button>
                
                <p className="text-xs text-gray-500">
                  If you still don't receive the email, try a different email address.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {showEmailConfirmation ? (
          <div className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-4">
                  <Mail className="h-4 w-4 mr-2" />
                  Check Your Email
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Confirm Your Account
                </h2>
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                
                <div>
                  <p className="text-gray-600 mb-2">
                    We've sent a confirmation email to:
                  </p>
                  <p className="font-semibold text-gray-900">{submittedEmail}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the confirmation link in the email</li>
                    <li>Return to this page to sign in</li>
                  </ol>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium">Email not arriving?</p>
                      <ul className="mt-1 space-y-1">
                        <li>• Check your spam/junk folder</li>
                        <li>• Make sure the email address is correct</li>
                        <li>• Wait a few minutes for delivery</li>
                        <li>• Use the resend button below</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="w-full"
                    variant="outline"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Confirmation Email
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={handleCloseModal} className="w-full">
                    Got it, I'll check my email
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    If you still don't receive the email, try a different email address.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
                  <Brain className="h-4 w-4 mr-2" />
                  Join the AI Revolution
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Get Started with Hire Al
                </h2>
              </DialogTitle>
              <DialogDescription className="text-center">
                Choose your account type and start transforming your hiring process today
              </DialogDescription>
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
                              <Label htmlFor="firstName" className="text-sm">First Name *</Label>
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
                              <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
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
                            <Label htmlFor="email" className="text-sm">Work Email *</Label>
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
                            <Label htmlFor="company" className="text-sm">Company *</Label>
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
                            <Label htmlFor="password" className="text-sm">Password *</Label>
                            <Input 
                              id="password" 
                              type="password"
                              placeholder="Choose a strong password"
                              value={formData.password}
                              onChange={(e) => handleInputChange("password", e.target.value)}
                              required
                              className="h-9"
                              minLength={6}
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
                              <Label htmlFor="candidateFirstName" className="text-sm">First Name *</Label>
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
                              <Label htmlFor="candidateLastName" className="text-sm">Last Name *</Label>
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
                            <Label htmlFor="candidateEmail" className="text-sm">Email *</Label>
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
                            <Label htmlFor="candidatePassword" className="text-sm">Password *</Label>
                            <Input 
                              id="candidatePassword" 
                              type="password"
                              placeholder="Choose a strong password"
                              value={formData.password}
                              onChange={(e) => handleInputChange("password", e.target.value)}
                              required
                              className="h-9"
                              minLength={6}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
