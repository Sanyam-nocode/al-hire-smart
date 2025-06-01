
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SavedCandidate {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  saved_at: string;
}

export const useSavedCandidates = () => {
  const { user, recruiterProfile } = useAuth();
  const [savedCandidateIds, setSavedCandidateIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && recruiterProfile) {
      loadSavedCandidates();
    } else {
      setSavedCandidateIds(new Set());
    }
  }, [user, recruiterProfile]);

  const loadSavedCandidates = async () => {
    if (!user || !recruiterProfile) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', recruiterProfile.id);

      if (error) {
        console.error('Error loading saved candidates:', error);
        return;
      }

      const candidateIds = new Set(data?.map(item => item.candidate_id) || []);
      setSavedCandidateIds(candidateIds);
    } catch (error) {
      console.error('Error loading saved candidates:', error);
    }
  };

  const saveCandidate = async (candidateId: string) => {
    if (!user || !recruiterProfile) {
      toast.error('You must be logged in as a recruiter to save candidates');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_candidates')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
        });

      if (error) {
        console.error('Error saving candidate:', error);
        
        if (error.message.includes('duplicate key')) {
          toast.error('Candidate is already saved.');
        } else {
          toast.error('Failed to save candidate');
        }
        return;
      }

      setSavedCandidateIds(prev => new Set([...prev, candidateId]));
      toast.success('Candidate saved successfully!');
    } catch (error) {
      console.error('Unexpected error saving candidate:', error);
      toast.error('Failed to save candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const unsaveCandidate = async (candidateId: string) => {
    if (!user || !recruiterProfile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_candidates')
        .delete()
        .eq('recruiter_id', recruiterProfile.id)
        .eq('candidate_id', candidateId);

      if (error) {
        console.error('Error unsaving candidate:', error);
        toast.error('Failed to unsave candidate');
        return;
      }

      setSavedCandidateIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
      toast.success('Candidate removed from saved list');
    } catch (error) {
      console.error('Error unsaving candidate:', error);
      toast.error('Failed to unsave candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const isCandidateSaved = (candidateId: string) => {
    return savedCandidateIds.has(candidateId);
  };

  return {
    savedCandidateIds,
    saveCandidate,
    unsaveCandidate,
    isCandidateSaved,
    isLoading,
    loadSavedCandidates
  };
};
