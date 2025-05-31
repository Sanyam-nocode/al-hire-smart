
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type RecruiterProfile = Database['public']['Tables']['recruiter_profiles']['Row'];
type CandidateProfile = Database['public']['Tables']['candidate_profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: Profile | null;
  recruiterProfile: RecruiterProfile | null;
  candidateProfile: CandidateProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfiles = async (userId: string, userType: string) => {
    try {
      // Fetch general profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      setUserProfile(profile);

      // Fetch specific profile based on user type
      if (userType === 'recruiter') {
        const { data: recruiterData } = await supabase
          .from('recruiter_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setRecruiterProfile(recruiterData);
        setCandidateProfile(null);
      } else if (userType === 'candidate') {
        const { data: candidateData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setCandidateProfile(candidateData);
        setRecruiterProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userType = session.user.user_metadata?.user_type;
        if (userType) {
          fetchUserProfiles(session.user.id, userType);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const userType = session.user.user_metadata?.user_type;
          if (userType) {
            setTimeout(() => {
              fetchUserProfiles(session.user.id, userType);
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          setRecruiterProfile(null);
          setCandidateProfile(null);
        }
        
        if (event !== 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    userProfile,
    recruiterProfile,
    candidateProfile,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
