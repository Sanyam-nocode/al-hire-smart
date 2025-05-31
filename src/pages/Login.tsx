
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

const Login = () => {
  const [activeTab, setActiveTab] = useState("recruiter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Successfully signed in!");
        navigate('/dashboard');
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
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
