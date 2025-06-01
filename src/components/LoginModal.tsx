
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Brain, Users, Search, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignup?: () => void;
}

const LoginModal = ({ open, onOpenChange, onSwitchToSignup }: LoginModalProps) => {
  const [activeTab, setActiveTab] = useState("recruiter");
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

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
      const { error } = await signIn(formData.email, formData.password, activeTab as 'recruiter' | 'candidate');
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Successfully signed in!");
        onOpenChange(false);
        // Let DashboardRedirect handle the routing based on user profile
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    onOpenChange(false);
    if (onSwitchToSignup) {
      onSwitchToSignup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
              <Brain className="h-4 w-4 mr-2" />
              Welcome Back
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Sign in to Hire Al
            </h2>
            <p className="text-gray-600 mt-2">
              Continue your AI-powered hiring journey
            </p>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="recruiter" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Recruiter</span>
            </TabsTrigger>
            <TabsTrigger value="candidate" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Candidate</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recruiter">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <LogIn className="h-5 w-5 text-blue-600" />
                  <span>Recruiter Sign In</span>
                </CardTitle>
                <CardDescription>
                  Access your recruitment dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recruiterEmail" className="text-sm">Work Email</Label>
                    <Input 
                      id="recruiterEmail" 
                      type="email" 
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recruiterPassword" className="text-sm">Password</Label>
                    <Input 
                      id="recruiterPassword" 
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <button type="button" className="text-sm text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Forgot password?
                    </button>
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="candidate">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <LogIn className="h-5 w-5 text-purple-600" />
                  <span>Candidate Sign In</span>
                </CardTitle>
                <CardDescription>
                  Access your profile and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <button type="button" className="text-sm text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Forgot password?
                    </button>
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <button 
              type="button"
              onClick={handleSignupClick}
              className="text-blue-600 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
            >
              Sign up here
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
