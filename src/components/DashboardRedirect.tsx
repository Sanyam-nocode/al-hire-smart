
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const DashboardRedirect = () => {
  const { user, recruiterProfile, candidateProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Check which profile exists to determine user type
      if (recruiterProfile) {
        navigate('/recruiter/dashboard');
      } else if (candidateProfile) {
        navigate('/candidate/profile');
      } else {
        // If no profile exists yet, redirect to signup to complete profile
        navigate('/signup');
      }
    } else if (!loading && !user) {
      // If not logged in, redirect to login
      navigate('/login');
    }
  }, [user, recruiterProfile, candidateProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return null;
};

export default DashboardRedirect;
