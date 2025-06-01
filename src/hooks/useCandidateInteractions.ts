
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CandidateInteraction {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  interaction_type: 'saved' | 'email_sent' | 'response_received' | 'interview_scheduled' | 'rejected' | 'hired';
  interaction_date: string;
  details: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useCandidateInteractions = () => {
  const { user, recruiterProfile } = useAuth();
  const [interactions, setInteractions] = useState<CandidateInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && recruiterProfile) {
      loadInteractions();
    } else {
      setInteractions([]);
    }
  }, [user, recruiterProfile]);

  const loadInteractions = async () => {
    if (!user || !recruiterProfile) {
      console.log('useCandidateInteractions: No user or recruiter profile');
      return;
    }

    console.log('useCandidateInteractions: Loading interactions for recruiter:', recruiterProfile.id);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('candidate_interactions')
        .select('*')
        .eq('recruiter_id', recruiterProfile.id)
        .order('interaction_date', { ascending: false });

      console.log('useCandidateInteractions: Query result:', { data, error });

      if (error) {
        console.error('Error loading interactions:', error);
        toast.error('Failed to load interaction history');
        return;
      }

      // Type assertion since we know the database enforces the correct interaction_type values
      setInteractions((data as CandidateInteraction[]) || []);
    } catch (error) {
      console.error('Unexpected error loading interactions:', error);
      toast.error('Failed to load interaction history');
    } finally {
      setIsLoading(false);
    }
  };

  const addInteraction = async (
    candidateId: string,
    interactionType: CandidateInteraction['interaction_type'],
    notes?: string,
    details?: any
  ) => {
    if (!user || !recruiterProfile) {
      toast.error('You must be logged in as a recruiter to add interactions');
      return;
    }

    console.log('useCandidateInteractions: Adding interaction:', { candidateId, interactionType, notes });
    
    try {
      const { error } = await supabase
        .from('candidate_interactions')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
          interaction_type: interactionType,
          notes,
          details,
        });

      console.log('useCandidateInteractions: Add interaction result:', { error });

      if (error) {
        console.error('Error adding interaction:', error);
        toast.error('Failed to add interaction');
        return;
      }

      // Reload interactions to get the updated list
      await loadInteractions();
      toast.success('Interaction added successfully!');
    } catch (error) {
      console.error('Unexpected error adding interaction:', error);
      toast.error('Failed to add interaction');
    }
  };

  const getInteractionsByCandidate = (candidateId: string) => {
    return interactions.filter(interaction => interaction.candidate_id === candidateId);
  };

  return {
    interactions,
    addInteraction,
    getInteractionsByCandidate,
    isLoading,
    loadInteractions
  };
};
