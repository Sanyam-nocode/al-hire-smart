
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
  const { user, recruiterProfile } = useAuth();
  const [savedCandidates, setSavedCandidates] = useState<CandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('SavedCandidatesTab useEffect triggered');
    console.log('User:', user?.email);
    console.log('Recruiter Profile:', recruiterProfile);
    
    if (user && recruiterProfile) {
      loadSavedCandidates();
    } else {
      console.log('Missing user or recruiter profile, not loading saved candidates');
      setIsLoading(false);
    }
  }, [user, recruiterProfile]);

  const loadSavedCandidates = async () => {
    if (!user || !recruiterProfile) {
      console.log('No user or recruiter profile found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading saved candidates for recruiter ID:', recruiterProfile.id);
      console.log('Recruiter profile details:', recruiterProfile);
      
      // First, get all saved candidate records for this recruiter
      const { data: savedRecords, error: savedError } = await supabase
        .from('saved_candidates')
        .select('*')
        .eq('recruiter_id', recruiterProfile.id);

      console.log('Saved candidates query result:');
      console.log('- Records found:', savedRecords?.length || 0);
      console.log('- Records data:', savedRecords);
      console.log('- Error:', savedError);

      if (savedError) {
        console.error('Error loading saved candidates records:', savedError);
        toast.error('Failed to load saved candidates');
        setIsLoading(false);
        return;
      }

      if (!savedRecords || savedRecords.length === 0) {
        console.log('No saved candidates found for recruiter:', recruiterProfile.id);
        setSavedCandidates([]);
        setIsLoading(false);
        return;
      }

      // Get the candidate IDs
      const candidateIds = savedRecords.map(record => record.candidate_id);
      console.log('Candidate IDs to fetch profiles for:', candidateIds);

      // Now fetch the candidate profiles
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .in('id', candidateIds);

      console.log('Candidate profiles query result:');
      console.log('- Profiles found:', candidates?.length || 0);
      console.log('- Profiles data:', candidates);
      console.log('- Error:', candidatesError);

      if (candidatesError) {
        console.error('Error loading candidate profiles:', candidatesError);
        toast.error('Failed to load candidate profiles');
        setIsLoading(false);
        return;
      }

      console.log('Setting saved candidates state with:', candidates || []);
      setSavedCandidates(candidates || []);
    } catch (error) {
      console.error('Unexpected error loading saved candidates:', error);
      toast.error('Failed to load saved candidates');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a manual refresh function for debugging
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    loadSavedCandidates();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Candidates</CardTitle>
          <CardDescription>
            Loading your saved candidates...
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
          <CardTitle className="flex items-center justify-between">
            Saved Candidates
            <button 
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Refresh
            </button>
          </CardTitle>
          <CardDescription>
            Candidates you've bookmarked for future consideration ({savedCandidates.length} saved)
            {recruiterProfile && (
              <div className="text-xs text-gray-500 mt-1">
                Recruiter ID: {recruiterProfile.id}
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {savedCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-gray-600 text-center">
              No saved candidates yet. Start searching to find and save potential hires.
            </p>
            <div className="text-xs text-gray-400 text-center mt-2">
              Debug: User logged in: {user ? 'Yes' : 'No'}, Recruiter profile: {recruiterProfile ? 'Yes' : 'No'}
            </div>
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
