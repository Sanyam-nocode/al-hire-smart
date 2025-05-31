
import { useState } from "react";
import { Menu, X, Users, Search, Brain, User, LogOut, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SignupModal from "./SignupModal";
import LoginModal from "./LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, recruiterProfile, candidateProfile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleMobileNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleGetStarted = () => {
    setSignupModalOpen(true);
  };

  const handleMobileGetStarted = () => {
    setIsOpen(false);
    setSignupModalOpen(true);
  };

  const handleSignIn = () => {
    setLoginModalOpen(true);
  };

  const handleMobileSignIn = () => {
    setIsOpen(false);
    setLoginModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSettings = () => {
    toast.info("Settings functionality coming soon!");
  };

  const getUserDisplayName = () => {
    if (recruiterProfile) {
      return `${recruiterProfile.first_name} ${recruiterProfile.last_name}`;
    }
    if (candidateProfile) {
      return `${candidateProfile.first_name} ${candidateProfile.last_name}`;
    }
    return user?.email || 'User';
  };

  const getUserInitials = () => {
    if (recruiterProfile) {
      return `${recruiterProfile.first_name[0]}${recruiterProfile.last_name[0]}`;
    }
    if (candidateProfile) {
      return `${candidateProfile.first_name[0]}${candidateProfile.last_name[0]}`;
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserType = () => {
    if (recruiterProfile) return 'recruiter';
    if (candidateProfile) return 'candidate';
    return 'user';
  };

  const getDashboardPath = () => {
    if (recruiterProfile) {
      return '/recruiter/dashboard';
    }
    return '/candidate/profile';
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Hire Al
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {!user ? (
                <>
                  <Link
                    to="/features"
                    className={`text-sm font-medium transition-colors ${
                      isActive("/features")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    Features
                  </Link>
                  <Link
                    to="/pricing"
                    className={`text-sm font-medium transition-colors ${
                      isActive("/pricing")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/about"
                    className={`text-sm font-medium transition-colors ${
                      isActive("/about")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    About
                  </Link>
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="ghost" 
                      className="text-gray-700"
                      onClick={handleSignIn}
                    >
                      Sign In
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={handleGetStarted}
                    >
                      Get Started
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to={getDashboardPath()}
                    className={`text-sm font-medium transition-colors ${
                      isActive(getDashboardPath())
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    Dashboard
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 h-10">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-gray-700">{getUserDisplayName()}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-2">
                        <p className="text-sm font-medium">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{getUserType()}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(getDashboardPath())}>
                        <User className="h-4 w-4 mr-2" />
                        {recruiterProfile ? 'Dashboard' : 'Profile'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSettings}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-700 hover:text-blue-600"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                {!user ? (
                  <>
                    <Link
                      to="/features"
                      className="text-gray-700 hover:text-blue-600 px-2 py-1"
                      onClick={() => setIsOpen(false)}
                    >
                      Features
                    </Link>
                    <Link
                      to="/pricing"
                      className="text-gray-700 hover:text-blue-600 px-2 py-1"
                      onClick={() => setIsOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link
                      to="/about"
                      className="text-gray-700 hover:text-blue-600 px-2 py-1"
                      onClick={() => setIsOpen(false)}
                    >
                      About
                    </Link>
                    <div className="flex flex-col space-y-2 pt-4 border-t">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={handleMobileSignIn}
                      >
                        Sign In
                      </Button>
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                        onClick={handleMobileGetStarted}
                      >
                        Get Started
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to={getDashboardPath()}
                      className="text-gray-700 hover:text-blue-600 px-2 py-1"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <div className="flex flex-col space-y-2 pt-4 border-t">
                      <div className="px-2 py-2">
                        <p className="text-sm font-medium">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{getUserType()}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          setIsOpen(false);
                          navigate(getDashboardPath());
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        {recruiterProfile ? 'Dashboard' : 'Profile'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => {
                          setIsOpen(false);
                          handleSettings();
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600"
                        onClick={() => {
                          setIsOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <SignupModal 
        open={signupModalOpen} 
        onOpenChange={setSignupModalOpen} 
      />
      
      <LoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen} 
      />
    </>
  );
};

export default Navbar;
