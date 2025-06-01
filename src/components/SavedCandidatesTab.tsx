
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import EnhancedCandidateCard from './EnhancedCandidateCard';

interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  location: string | null;
  skills: string[] | null;
  experience_years: number | null;
  summary: string | null;
  education: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  salary_expectation: number | null;
  resume_content: string | null;
}

interface SavedCandidatesTabProps {
  onViewProfile: (candidate: CandidateProfile) => void;
  onContact: (candidate: CandidateProfile) => void;
}

const SavedCandidatesTab = ({ onViewProfile, onContact }: SavedCandidatesTabProps) => {
  const { user } = useAuth();
  const [savedCandidates, setSavedCandidates] = useState<CandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedCandidates();
    }
  }, [user]);

  const loadSavedCandidates = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Loading saved candidates for user:', user.id);
      
      // First, let's check if there are any saved candidates records
      const { data: savedRecords, error: savedError } = await supabase
        .from('saved_candidates')
        .select('*')
        .eq('recruiter_id', user.id);

      console.log('Saved candidates records:', savedRecords);
      console.log('Saved candidates error:', savedError);

      if (savedError) {
        console.error('Error loading saved candidates records:', savedError);
        toast.error('Failed to load saved candidates');
        return;
      }

      if (!savedRecords || savedRecords.length === 0) {
        console.log('No saved candidates found');
        setSavedCandidates([]);
        return;
      }

      // Get the candidate IDs
      const candidateIds = savedRecords.map(record => record.candidate_id);
      console.log('Candidate IDs to fetch:', candidateIds);

      // Now fetch the candidate profiles
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .in('id', candidateIds);

      console.log('Fetched candidates:', candidates);
      console.log('Candidates error:', candidatesError);

      if (candidatesError) {
        console.error('Error loading candidate profiles:', candidatesError);
        toast.error('Failed to load candidate profiles');
        return;
      }

      setSavedCandidates(candidates || []);
    } catch (error) {
      console.error('Error loading saved candidates:', error);
      toast.error('Failed to load saved candidates');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Candidates</CardTitle>
          <CardDescription>
            Candidates you've bookmarked for future consideration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved Candidates</CardTitle>
          <CardDescription>
            Candidates you've bookmarked for future consideration ({savedCandidates.length} saved)
          </CardDescription>
        </CardHeader>
      </Card>

      {savedCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-gray-600 text-center">
              No saved candidates yet. Start searching to find and save potential hires.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedCandidates.map((candidate) => (
            <EnhancedCandidateCard
              key={candidate.id}
              candidate={candidate}
              onViewProfile={onViewProfile}
              onContact={onContact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedCandidatesTab;
