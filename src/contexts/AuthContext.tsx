
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
  signIn: (email: string, password: string, userType?: 'recruiter' | 'candidate') => Promise<{ error: any }>;
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
    console.log('Fetching profiles for user:', user.id);
    try {
      // Try to fetch candidate profile
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidateError && candidateError.code !== 'PGRST116') {
        console.error('Error fetching candidate profile:', candidateError);
      } else if (candidateData) {
        console.log('Found candidate profile:', candidateData);
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
        console.error('Error fetching recruiter profile:', recruiterError);
      } else if (recruiterData) {
        console.log('Found recruiter profile:', recruiterData);
        setRecruiterProfile(recruiterData);
      } else {
        console.log('No profiles found for user');
      }
    } catch (error) {
      console.error('Error in fetchProfiles:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      // Clear current profiles
      setCandidateProfile(null);
      setRecruiterProfile(null);
      
      // Fetch fresh profiles
      await fetchProfiles(user);
    }
  };

  const signIn = async (email: string, password: string, userType?: 'recruiter' | 'candidate') => {
    try {
      console.log('AuthContext: Attempting sign in with user type:', userType);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.log('AuthContext: Sign in error:', error);
        return { error };
      }

      // If userType is specified, check if the user has the correct profile
      if (userType && data.user) {
        console.log('AuthContext: Checking user profile for type:', userType);
        
        if (userType === 'recruiter') {
          const { data: recruiterData, error: recruiterError } = await supabase
            .from('recruiter_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (recruiterError || !recruiterData) {
            console.log('AuthContext: No recruiter profile found, signing out');
            await supabase.auth.signOut();
            return { error: { message: 'No recruiter account found with these credentials. Please check your email and try again.' } };
          }
        } else if (userType === 'candidate') {
          const { data: candidateData, error: candidateError } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (candidateError || !candidateData) {
            console.log('AuthContext: No candidate profile found, signing out');
            await supabase.auth.signOut();
            return { error: { message: 'No candidate account found with these credentials. Please check your email and try again.' } };
          }
        }
      }

      console.log('AuthContext: Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('AuthContext: Starting signup process for:', email);
      
      // Get the current origin for redirect
      const redirectUrl = `${window.location.origin}/`;
      console.log('AuthContext: Using redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        console.error('AuthContext: Signup error:', error);
        return { error };
      }
      
      console.log('AuthContext: Signup successful, confirmation email should be sent');
      return { error: null };
    } catch (error) {
      console.error('AuthContext: Unexpected signup error:', error);
      return { error };
    }
  };

  useEffect(() => {
    console.log('AuthContext: Setting up auth listeners');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session:', session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to defer profile fetching
        setTimeout(() => {
          fetchProfiles(session.user);
        }, 0);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session?.user?.email);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to defer profile fetching and prevent potential deadlocks
        setTimeout(() => {
          fetchProfiles(session.user);
        }, 0);
      } else {
        setCandidateProfile(null);
        setRecruiterProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Clear local state first
      setUser(null);
      setCandidateProfile(null);
      setRecruiterProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }
      
      console.log('Successfully signed out');
      return { error: null };
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
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
