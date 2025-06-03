
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import About from "@/pages/About";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import RecruiterDashboard from "@/pages/RecruiterDashboard";
import CandidateProfile from "@/pages/CandidateProfile";
import Demo from "@/pages/Demo";
import BookDemo from "@/pages/BookDemo";
import EmailWorkflows from "@/pages/EmailWorkflows";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import DashboardRedirect from "./DashboardRedirect";

const RouterWrapper = () => {
  useScrollToTop();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/book-demo" element={<BookDemo />} />
      <Route path="/email-workflows" element={<EmailWorkflows />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/recruiter-dashboard" 
        element={
          <ProtectedRoute>
            <RecruiterDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/candidate/:id" 
        element={
          <ProtectedRoute>
            <CandidateProfile />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RouterWrapper;
