
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
  checkEmailExists: (email: string, userType: 'candidate' | 'recruiter') => Promise<{ exists: boolean; profileType?: string }>;
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

  const checkEmailExists = async (email: string, userType: 'candidate' | 'recruiter') => {
    try {
      console.log(`Checking if email ${email} exists for ${userType} profile`);
      
      // Check candidate profiles
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (candidateError && candidateError.code !== 'PGRST116') {
        console.error('Error checking candidate profile:', candidateError);
      }

      // Check recruiter profiles
      const { data: recruiterData, error: recruiterError } = await supabase
        .from('recruiter_profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (recruiterError && recruiterError.code !== 'PGRST116') {
        console.error('Error checking recruiter profile:', recruiterError);
      }

      // Determine if email exists and return appropriate profile type
      if (candidateData) {
        return { exists: true, profileType: 'candidate' };
      } else if (recruiterData) {
        return { exists: true, profileType: 'recruiter' };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('Error in checkEmailExists:', error);
      return { exists: false };
    }
  };

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
      console.log('AuthContext: User data:', userData);
      
      // Clean up any existing auth state first
      try {
        await supabase.auth.signOut();
        console.log('AuthContext: Cleaned up existing session');
      } catch (cleanupError) {
        console.log('AuthContext: No existing session to clean up');
      }
      
      // Get the current origin for redirect - using the actual domain
      const redirectUrl = window.location.origin + '/';
      console.log('AuthContext: Using redirect URL:', redirectUrl);
      
      // Attempt signup with improved configuration
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            ...userData,
            email: email.trim().toLowerCase() // Ensure consistency
          },
          emailRedirectTo: redirectUrl,
          // Force email confirmation even if it seems like user exists
          captchaToken: undefined
        }
      });
      
      console.log('AuthContext: Signup response data:', data);
      console.log('AuthContext: Signup response error:', error);
      
      if (error) {
        console.error('AuthContext: Signup error:', error);
        
        // Handle specific error cases more gracefully
        if (error.message?.toLowerCase().includes('user already registered') || 
            error.message?.toLowerCase().includes('already exists') ||
            error.message?.toLowerCase().includes('email address not confirmed')) {
          
          console.log('AuthContext: User exists but may need confirmation, attempting resend');
          
          // Try to resend confirmation email
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim().toLowerCase(),
            options: {
              emailRedirectTo: redirectUrl
            }
          });
          
          if (resendError) {
            console.error('AuthContext: Resend error:', resendError);
            return { error: { message: 'This email is already registered. If you haven\'t received a confirmation email, please check your spam folder or try signing in instead.' } };
          }
          
          console.log('AuthContext: Confirmation email resent successfully');
          return { error: null };
        }
        
        return { error };
      }
      
      // Check if user was created or already exists
      if (data.user) {
        console.log('AuthContext: User created/updated successfully:', data.user.email);
        console.log('AuthContext: Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        console.log('AuthContext: Session created:', data.session ? 'Yes' : 'No');
        
        if (!data.user.email_confirmed_at && !data.session) {
          console.log('AuthContext: User created, awaiting email confirmation');
        } else if (data.user.email_confirmed_at) {
          console.log('AuthContext: User already confirmed, signing in automatically');
        }
      } else {
        console.log('AuthContext: No user data returned from signup');
      }
      
      return { error: null };
      
    } catch (error) {
      console.error('AuthContext: Unexpected signup error:', error);
      return { error: { message: 'An unexpected error occurred during signup. Please try again.' } };
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
    checkEmailExists,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
