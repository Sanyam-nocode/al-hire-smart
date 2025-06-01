
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Search, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import SignupModal from "@/components/SignupModal";

const Login = () => {
  const [activeTab, setActiveTab] = useState("recruiter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    console.log("Starting sign in process...");
    setLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        toast.error("Please enter both email and password");
        return;
      }

      console.log("Attempting to sign in with email:", email);
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error("Sign in error:", error);
        toast.error(error.message || "Failed to sign in");
      } else {
        console.log("Sign in successful");
        toast.success("Successfully signed in!");
        // Don't navigate here - let the useEffect handle it when user state updates
      }
    } catch (error) {
      console.error("Unexpected error during sign in:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      console.log("Resetting loading state");
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    console.log("Sign up here button clicked");
    setSignupModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
              <Brain className="h-4 w-4 mr-2" />
              Welcome Back
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign in to Hire Al
            </h1>
            <p className="text-gray-600">
              Continue your AI-powered hiring journey
            </p>
          </div>

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
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Recruiter Sign In</CardTitle>
                  <CardDescription>
                    Access your recruitment dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="john@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In as Recruiter"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="candidate">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Candidate Sign In</CardTitle>
                  <CardDescription>
                    Access your profile and opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="candidateEmail">Email</Label>
                      <Input 
                        id="candidateEmail" 
                        type="email" 
                        placeholder="jane@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidatePassword">Password</Label>
                      <Input 
                        id="candidatePassword" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In as Candidate"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <button 
                type="button"
                onClick={handleSignupClick}
                className="text-blue-600 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
                disabled={loading}
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>

      <SignupModal 
        open={signupModalOpen} 
        onOpenChange={setSignupModalOpen} 
      />
    </div>
  );
};

export default Login;
