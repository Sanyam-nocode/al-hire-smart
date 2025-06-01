
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
    console.log('useSavedCandidates useEffect triggered');
    console.log('User:', user?.email);
    console.log('Recruiter Profile ID:', recruiterProfile?.id);
    
    if (user && recruiterProfile) {
      loadSavedCandidates();
    } else {
      console.log('Clearing saved candidate IDs - no user or recruiter profile');
      setSavedCandidateIds(new Set());
    }
  }, [user, recruiterProfile]);

  const loadSavedCandidates = async () => {
    if (!user || !recruiterProfile) {
      console.log('Cannot load saved candidates - missing user or recruiter profile');
      return;
    }

    try {
      console.log('Loading saved candidate IDs for recruiter:', recruiterProfile.id);
      
      const { data, error } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', recruiterProfile.id);

      console.log('useSavedCandidates query result:');
      console.log('- Data:', data);
      console.log('- Error:', error);

      if (error) {
        console.error('Error loading saved candidates:', error);
        return;
      }

      console.log('Loaded saved candidate data:', data);
      const candidateIds = new Set(data?.map(item => item.candidate_id) || []);
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
      console.log('=== SAVE CANDIDATE DEBUG INFO ===');
      console.log('Current user:', {
        id: user.id,
        email: user.email,
        role: user.role
      });
      console.log('Recruiter profile:', {
        id: recruiterProfile.id,
        user_id: recruiterProfile.user_id,
        email: recruiterProfile.email
      });
      console.log('Candidate ID to save:', candidateId);
      
      // First, let's verify the recruiter profile exists and belongs to the current user
      const { data: profileCheck, error: profileError } = await supabase
        .from('recruiter_profiles')
        .select('*')
        .eq('id', recruiterProfile.id)
        .eq('user_id', user.id)
        .single();

      console.log('Profile check result:', { profileCheck, profileError });

      if (profileError || !profileCheck) {
        console.error('Recruiter profile validation failed:', profileError);
        toast.error('Invalid recruiter profile. Please try logging out and back in.');
        return;
      }

      // Now try to save the candidate
      console.log('Saving candidate:', candidateId, 'for recruiter:', recruiterProfile.id);
      
      const { data: insertData, error: insertError } = await supabase
        .from('saved_candidates')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
        })
        .select();

      console.log('Insert result:', { insertData, insertError });

      if (insertError) {
        console.error('Error saving candidate:', insertError);
        
        // Provide more specific error messages
        if (insertError.message.includes('violates row-level security')) {
          toast.error('Permission denied. Please ensure you are logged in as a recruiter.');
        } else if (insertError.message.includes('duplicate key')) {
          toast.error('Candidate is already saved.');
        } else {
          toast.error(`Failed to save candidate: ${insertError.message}`);
        }
        return;
      }

      setSavedCandidateIds(prev => new Set([...prev, candidateId]));
      toast.success('Candidate saved successfully!');
      console.log('Candidate saved successfully');
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
    console.log('Current saved IDs:', Array.from(savedCandidateIds));
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
