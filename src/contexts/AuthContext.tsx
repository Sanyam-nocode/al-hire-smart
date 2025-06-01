
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
        setRecruiterProfile(recruiterData);
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfiles(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfiles(session.user);
      } else {
        setCandidateProfile(null);
        setRecruiterProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setCandidateProfile(null);
      setRecruiterProfile(null);
    }
    return { error };
  };

  const value = {
    user,
    candidateProfile,
    recruiterProfile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
