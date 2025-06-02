
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PreScreenFlag {
  type: 'employment_gap' | 'skill_mismatch' | 'education_verification' | 'experience_inconsistency' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface PreScreenQuestion {
  category: 'technical' | 'behavioral' | 'experience' | 'education' | 'availability';
  question: string;
  importance: 'low' | 'medium' | 'high';
  expectedAnswerType: 'text' | 'yes_no' | 'multiple_choice';
}

interface PreScreenResult {
  id: string;
  candidate_id: string;
  recruiter_id: string;
  questions: PreScreenQuestion[];
  flags: PreScreenFlag[];
  status: string;
  created_at: string;
  updated_at: string;
}

export const usePreScreening = () => {
  const { user, recruiterProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preScreenResults, setPreScreenResults] = useState<PreScreenResult[]>([]);

  const runPreScreening = async (candidateId: string, candidateProfile: any, resumeContent: string) => {
    if (!user || !recruiterProfile) {
      toast.error('You must be logged in as a recruiter to run pre-screening');
      return null;
    }

    console.log('Starting pre-screening for candidate:', candidateId);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-candidate-prescreening', {
        body: {
          candidateId,
          resumeContent,
          candidateProfile
        }
      });

      if (error) {
        console.error('Pre-screening error:', error);
        toast.error('Failed to run pre-screening analysis');
        return null;
      }

      console.log('Pre-screening completed:', data);
      toast.success('Pre-screening analysis completed successfully!');
      
      // Refresh the pre-screening results
      await loadPreScreenResults();
      
      return data;
    } catch (error) {
      console.error('Unexpected error during pre-screening:', error);
      toast.error('Failed to run pre-screening analysis');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreScreenResults = async () => {
    if (!user || !recruiterProfile) {
      console.log('usePreScreening: No user or recruiter profile');
      return;
    }

    console.log('Loading pre-screening results for recruiter:', recruiterProfile.id);
    
    try {
      const { data, error } = await supabase
        .from('pre_screens')
        .select('*')
        .eq('recruiter_id', recruiterProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pre-screening results:', error);
        toast.error('Failed to load pre-screening results');
        return;
      }

      // Transform the database results to match our interface
      const transformedResults: PreScreenResult[] = (data || []).map(result => ({
        id: result.id,
        candidate_id: result.candidate_id,
        recruiter_id: result.recruiter_id,
        questions: Array.isArray(result.questions) ? (result.questions as unknown as PreScreenQuestion[]) : [],
        flags: Array.isArray(result.flags) ? (result.flags as unknown as PreScreenFlag[]) : [],
        status: result.status,
        created_at: result.created_at,
        updated_at: result.updated_at
      }));

      setPreScreenResults(transformedResults);
    } catch (error) {
      console.error('Unexpected error loading pre-screening results:', error);
      toast.error('Failed to load pre-screening results');
    }
  };

  const getPreScreenForCandidate = (candidateId: string): PreScreenResult | null => {
    return preScreenResults.find(result => result.candidate_id === candidateId) || null;
  };

  return {
    runPreScreening,
    loadPreScreenResults,
    getPreScreenForCandidate,
    preScreenResults,
    isLoading
  };
};
