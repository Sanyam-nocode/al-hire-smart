
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
  const { user } = useAuth();
  const [savedCandidateIds, setSavedCandidateIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSavedCandidates();
    }
  }, [user]);

  const loadSavedCandidates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', user.id);

      if (error) {
        console.error('Error loading saved candidates:', error);
        return;
      }

      const candidateIds = new Set(data.map(item => item.candidate_id));
      setSavedCandidateIds(candidateIds);
    } catch (error) {
      console.error('Error loading saved candidates:', error);
    }
  };

  const saveCandidate = async (candidateId: string) => {
    if (!user) {
      toast.error('You must be logged in to save candidates');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_candidates')
        .insert({
          recruiter_id: user.id,
          candidate_id: candidateId,
        });

      if (error) {
        console.error('Error saving candidate:', error);
        toast.error('Failed to save candidate');
        return;
      }

      setSavedCandidateIds(prev => new Set([...prev, candidateId]));
      toast.success('Candidate saved successfully!');
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const unsaveCandidate = async (candidateId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_candidates')
        .delete()
        .eq('recruiter_id', user.id)
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
