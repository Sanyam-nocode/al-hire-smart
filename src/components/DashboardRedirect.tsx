
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
        // Use window.location for a full page navigation to ensure clean state
        window.location.href = '/recruiter/dashboard';
        return;
      } else if (candidateProfile) {
        console.log('DashboardRedirect: Redirecting to candidate profile');
        window.location.href = '/candidate/profile';
        return;
      } else {
        // If no profile exists yet, wait a bit longer for profiles to load
        console.log('DashboardRedirect: No profiles found, waiting for profiles to load...');
        const timeout = setTimeout(() => {
          console.log('DashboardRedirect: Still no profiles after timeout, redirecting to signup');
          window.location.href = '/signup';
        }, 2000); // Reduced to 2 seconds
        
        return () => clearTimeout(timeout);
      }
    } else if (!loading && !user) {
      console.log('DashboardRedirect: No user, redirecting to login');
      window.location.href = '/login';
    }
  }, [user, recruiterProfile, candidateProfile, loading]);

  // Show loading state while waiting for auth and profiles
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 mt-4">Redirecting to your dashboard...</p>
      {loading && <p className="text-sm text-gray-500 mt-2">Loading your profile...</p>}
    </div>
  );
};

export default DashboardRedirect;
