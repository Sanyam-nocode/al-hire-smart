
import { useState, useEffect } from 'react';
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

  // Load pre-screening results when the hook initializes
  useEffect(() => {
    if (user && recruiterProfile) {
      loadPreScreenResults();
    }
  }, [user, recruiterProfile]);

  const savePreScreeningToDatabase = async (candidateId: string, flags: PreScreenFlag[], questions: PreScreenQuestion[]) => {
    if (!user || !recruiterProfile) {
      console.log('usePreScreening: No user or recruiter profile for saving to database');
      return null;
    }

    console.log('usePreScreening: Saving pre-screening to database for candidate:', candidateId);
    
    try {
      const { data, error } = await supabase
        .from('pre_screens')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
          flags: flags,
          questions: questions,
          status: 'completed'
        })
        .select()
        .single();

      if (error) {
        console.error('usePreScreening: Error saving pre-screening to database:', error);
        return null;
      }

      console.log('usePreScreening: Pre-screening saved to database successfully:', data);
      return data;
    } catch (error) {
      console.error('usePreScreening: Unexpected error saving pre-screening to database:', error);
      return null;
    }
  };

  const addPreScreeningInteraction = async (candidateId: string, flags: PreScreenFlag[], questions: PreScreenQuestion[]) => {
    if (!user || !recruiterProfile) {
      console.log('usePreScreening: No user or recruiter profile for interaction');
      return false;
    }

    console.log('usePreScreening: Adding pre-screening interaction for candidate:', candidateId);
    
    const flagsCount = flags.length;
    const questionsCount = questions.length;
    const highSeverityFlags = flags.filter(flag => flag.severity === 'high').length;
    const mediumSeverityFlags = flags.filter(flag => flag.severity === 'medium').length;
    const lowSeverityFlags = flags.filter(flag => flag.severity === 'low').length;
    
    const notes = `Pre-screening analysis completed: ${flagsCount} flag(s) identified (${highSeverityFlags} high, ${mediumSeverityFlags} medium, ${lowSeverityFlags} low severity), ${questionsCount} interview question(s) generated`;
    
    // Create a comprehensive details object
    const details = {
      flags,
      questions,
      summary: {
        totalFlags: flagsCount,
        totalQuestions: questionsCount,
        flagsBySeverity: {
          high: highSeverityFlags,
          medium: mediumSeverityFlags,
          low: lowSeverityFlags
        },
        flagsByType: flags.reduce((acc, flag) => {
          acc[flag.type] = (acc[flag.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        questionsByCategory: questions.reduce((acc, question) => {
          acc[question.category] = (acc[question.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    try {
      const { data, error } = await supabase
        .from('candidate_interactions')
        .insert({
          recruiter_id: recruiterProfile.id,
          candidate_id: candidateId,
          interaction_type: 'pre_screening_completed',
          notes,
          details,
        })
        .select();

      if (error) {
        console.error('usePreScreening: Error adding pre-screening interaction:', error);
        return false;
      }

      console.log('usePreScreening: Pre-screening interaction added successfully:', data);
      return true;
    } catch (error) {
      console.error('usePreScreening: Unexpected error adding pre-screening interaction:', error);
      return false;
    }
  };

  const runPreScreening = async (candidateId: string, candidateProfile: any, resumeContent: string) => {
    if (!user || !recruiterProfile) {
      toast.error('You must be logged in as a recruiter to run pre-screening');
      return null;
    }

    console.log('usePreScreening: Starting pre-screening for candidate:', candidateId);
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
        console.error('usePreScreening: Pre-screening error:', error);
        toast.error('Failed to run pre-screening analysis');
        return null;
      }

      console.log('usePreScreening: Pre-screening completed successfully:', data);
      
      if (data) {
        const flags = Array.isArray(data.flags) ? data.flags : [];
        const questions = Array.isArray(data.questions) ? data.questions : [];
        
        console.log('usePreScreening: Processing pre-screening results - flags:', flags.length, 'questions:', questions.length);
        
        // Save to pre_screens table
        const savedPreScreen = await savePreScreeningToDatabase(candidateId, flags, questions);
        
        // Add interaction record
        const interactionAdded = await addPreScreeningInteraction(candidateId, flags, questions);
        
        if (savedPreScreen && interactionAdded) {
          console.log('usePreScreening: Pre-screening saved and interaction added successfully');
          toast.success('Pre-screening analysis completed and recorded!');
        } else if (interactionAdded) {
          console.log('usePreScreening: Interaction added but pre-screening save failed');
          toast.success('Pre-screening analysis completed!');
        } else {
          console.log('usePreScreening: Failed to save pre-screening or add interaction');
          toast.success('Pre-screening analysis completed!');
        }
        
        // Refresh the pre-screening results
        await loadPreScreenResults();
      }
      
      return data;
    } catch (error) {
      console.error('usePreScreening: Unexpected error during pre-screening:', error);
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

    console.log('usePreScreening: Loading pre-screening results for recruiter:', recruiterProfile.id);
    
    try {
      const { data, error } = await supabase
        .from('pre_screens')
        .select('*')
        .eq('recruiter_id', recruiterProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('usePreScreening: Error loading pre-screening results:', error);
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

      console.log('usePreScreening: Loaded pre-screening results:', transformedResults.length);
      setPreScreenResults(transformedResults);
    } catch (error) {
      console.error('usePreScreening: Unexpected error loading pre-screening results:', error);
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
