
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CandidateProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  title: string | null;
  summary: string | null;
  skills: string[] | null;
  experience_years: number | null;
  education: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  salary_expectation: number | null;
  resume_url: string | null;
  resume_file_name: string | null;
  resume_file_size: number | null;
  resume_uploaded_at: string | null;
  resume_content: string | null;
  created_at: string;
  updated_at: string;
}

interface RecruiterProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  job_title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  company_website: string | null;
  company_size: string | null;
  industry: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  candidateProfile: CandidateProfile | null;
  recruiterProfile: RecruiterProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async (user: User) => {
    console.log('AuthContext: Fetching profiles for user:', user.id, user.email);
    try {
      // Clear existing profiles first
      setCandidateProfile(null);
      setRecruiterProfile(null);

      // Try to fetch candidate profile first
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidateError && candidateError.code !== 'PGRST116') {
        console.error('AuthContext: Error fetching candidate profile:', candidateError);
      } else if (candidateData) {
        console.log('AuthContext: Found candidate profile:', candidateData);
        setCandidateProfile(candidateData);
        return;
      }

      // Try to fetch recruiter profile
      const { data: recruiterData, error: recruiterError } = await supabase
        .from('recruiter_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (recruiterError && recruiterError.code !== 'PGRST116') {
        console.error('AuthContext: Error fetching recruiter profile:', recruiterError);
      } else if (recruiterData) {
        console.log('AuthContext: Found recruiter profile:', recruiterData);
        setRecruiterProfile(recruiterData);
      } else {
        console.log('AuthContext: No profiles found for user');
      }
    } catch (error) {
      console.error('AuthContext: Error in fetchProfiles:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfiles(user);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('AuthContext: Sign in result:', { user: data.user?.email, error });
      
      if (data.user && !error) {
        setUser(data.user);
        // Fetch profiles immediately after successful login
        await fetchProfiles(data.user);
      }
      
      return { error };
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  useEffect(() => {
    console.log('AuthContext: Setting up auth listeners');
    
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }
        
        console.log('AuthContext: Initial session user:', session?.user?.email || 'No user');
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfiles(session.user);
          } else {
            setUser(null);
            setCandidateProfile(null);
            setRecruiterProfile(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session?.user?.email || 'No user');
      
      if (!mounted) return;
      
      if (session?.user && event === 'SIGNED_IN') {
        setUser(session.user);
        // Fetch profiles after sign in
        await fetchProfiles(session.user);
      } else if (!session?.user) {
        setUser(null);
        setCandidateProfile(null);
        setRecruiterProfile(null);
      }
      
      // Always ensure loading is false after auth state changes
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthContext: Signing out user...');
      
      // Clear local state first
      setUser(null);
      setCandidateProfile(null);
      setRecruiterProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Sign out error:', error);
        return { error };
      }
      
      console.log('AuthContext: Successfully signed out');
      return { error: null };
      
    } catch (error) {
      console.error('AuthContext: Unexpected error during sign out:', error);
      return { error };
    }
  };

  const value = {
    user,
    candidateProfile,
    recruiterProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
