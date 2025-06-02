
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CandidateInteraction {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  interaction_type: 'saved' | 'email_sent' | 'response_received' | 'interview_scheduled' | 'rejected' | 'hired' | 'pre_screening_completed';
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

  const loadInteractions = useCallback(async () => {
    if (!user || !recruiterProfile) {
      console.log('useCandidateInteractions: No user or recruiter profile');
      setInteractions([]);
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

      console.log('useCandidateInteractions: Query result:', { data: data?.length, error });

      if (error) {
        console.error('useCandidateInteractions: Error loading interactions:', error);
        toast.error('Failed to load interaction history');
        return;
      }

      // Type assertion since we know the database enforces the correct interaction_type values
      const loadedInteractions = (data as CandidateInteraction[]) || [];
      console.log('useCandidateInteractions: Setting interactions:', loadedInteractions.length);
      console.log('useCandidateInteractions: Pre-screening interactions found:', loadedInteractions.filter(i => i.interaction_type === 'pre_screening_completed').length);
      setInteractions(loadedInteractions);
    } catch (error) {
      console.error('useCandidateInteractions: Unexpected error loading interactions:', error);
      toast.error('Failed to load interaction history');
    } finally {
      setIsLoading(false);
    }
  }, [user, recruiterProfile]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  // Listen for custom pre-screening completion events
  useEffect(() => {
    const handlePreScreeningCompleted = (event: CustomEvent) => {
      console.log('useCandidateInteractions: Pre-screening completed event received:', event.detail);
      // Reload interactions when pre-screening is completed
      setTimeout(() => {
        loadInteractions();
      }, 1000); // Small delay to ensure the database transaction is committed
    };

    window.addEventListener('preScreeningCompleted', handlePreScreeningCompleted as EventListener);

    return () => {
      window.removeEventListener('preScreeningCompleted', handlePreScreeningCompleted as EventListener);
    };
  }, [loadInteractions]);

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
        console.error('useCandidateInteractions: Error adding interaction:', error);
        toast.error('Failed to add interaction');
        return;
      }

      console.log('useCandidateInteractions: Interaction added successfully, reloading...');
      
      // Reload interactions to get the updated list
      await loadInteractions();
      toast.success('Interaction added successfully!');
    } catch (error) {
      console.error('useCandidateInteractions: Unexpected error adding interaction:', error);
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
