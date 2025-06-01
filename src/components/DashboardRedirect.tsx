
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const DashboardRedirect = () => {
  const { user, recruiterProfile, candidateProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('DashboardRedirect: Auth state', { 
      user: user?.email, 
      candidateProfile: candidateProfile?.id, 
      recruiterProfile: recruiterProfile?.id,
      loading 
    });

    if (!loading && user) {
      console.log('DashboardRedirect: User authenticated, determining redirect...');
      
      // Check which profile exists to determine user type
      if (recruiterProfile) {
        console.log('DashboardRedirect: Redirecting to recruiter dashboard');
        // Use replace to prevent back navigation issues
        navigate('/recruiter/dashboard', { replace: true });
      } else if (candidateProfile) {
        console.log('DashboardRedirect: Redirecting to candidate profile');
        navigate('/candidate/profile', { replace: true });
      } else {
        // If no profile exists yet, wait a bit and then redirect to signup
        console.log('DashboardRedirect: No profiles found, waiting before redirecting to signup...');
        const timeout = setTimeout(() => {
          console.log('DashboardRedirect: Timeout reached, redirecting to signup');
          navigate('/signup', { replace: true });
        }, 3000); // Wait 3 seconds for profiles to load
        
        return () => clearTimeout(timeout);
      }
    } else if (!loading && !user) {
      console.log('DashboardRedirect: No user, redirecting to login');
      // If not logged in, redirect to login
      navigate('/login', { replace: true });
    }
  }, [user, recruiterProfile, candidateProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  return null;
};

export default DashboardRedirect;
