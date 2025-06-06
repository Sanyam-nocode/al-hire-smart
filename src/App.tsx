
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRedirect from "@/components/DashboardRedirect";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Demo from "./pages/Demo";
import BookDemo from "./pages/BookDemo";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateProfile from "./pages/CandidateProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ScrollToTopWrapper = ({ children }: { children: React.ReactNode }) => {
  useScrollToTop();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTopWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/book-demo" element={<BookDemo />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/recruiter/dashboard" 
                element={
                  <ProtectedRoute>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/candidate/profile" 
                element={
                  <ProtectedRoute>
                    <CandidateProfile />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ScrollToTopWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
