
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const DashboardRedirect = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && userProfile) {
      // Redirect based on user type from their profile
      if (userProfile.user_type === 'recruiter') {
        navigate('/recruiter/dashboard');
      } else if (userProfile.user_type === 'candidate') {
        navigate('/candidate/profile');
      }
    }
  }, [user, userProfile, loading, navigate]);

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
