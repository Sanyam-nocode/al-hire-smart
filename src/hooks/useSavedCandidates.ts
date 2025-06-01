
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
    }
  }, [user, recruiterProfile]);

  const loadSavedCandidates = async () => {
    if (!user || !recruiterProfile) return;

    try {
      console.log('Loading saved candidate IDs for recruiter:', recruiterProfile.id);
      
      const { data, error } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', recruiterProfile.id);

      if (error) {
        console.error('Error loading saved candidates:', error);
        return;
      }

      console.log('Loaded saved candidate data:', data);
      const candidateIds = new Set(data.map(item => item.candidate_id));
      console.log('Saved candidate IDs set:', candidateIds);
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
      console.log('Saving candidate:', candidateId, 'for recruiter:', recruiterProfile.id);
      
      const { error } = await supabase
        .from('saved_candidates')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
        });

      if (error) {
        console.error('Error saving candidate:', error);
        toast.error('Failed to save candidate');
        return;
      }

      setSavedCandidateIds(prev => new Set([...prev, candidateId]));
      toast.success('Candidate saved successfully!');
      console.log('Candidate saved successfully');
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const unsaveCandidate = async (candidateId: string) => {
    if (!user || !recruiterProfile) return;

    setIsLoading(true);
    try {
      console.log('Unsaving candidate:', candidateId, 'for recruiter:', recruiterProfile.id);
      
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
      console.log('Candidate unsaved successfully');
    } catch (error) {
      console.error('Error unsaving candidate:', error);
      toast.error('Failed to unsave candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const isCandidateSaved = (candidateId: string) => {
    const isSaved = savedCandidateIds.has(candidateId);
    console.log('Checking if candidate', candidateId, 'is saved:', isSaved);
    return isSaved;
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
