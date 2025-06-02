import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreScreening } from '@/hooks/usePreScreening';
import { toast } from 'sonner';
import EnhancedCandidateCard from './EnhancedCandidateCard';
import PreScreeningResultsModal from './PreScreeningResultsModal';

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
  const { getPreScreenForCandidate } = usePreScreening();
  const [savedCandidates, setSavedCandidates] = useState<CandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreScreen, setSelectedPreScreen] = useState<any>(null);
  const [preScreenModalOpen, setPreScreenModalOpen] = useState(false);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>('');

  useEffect(() => {
    if (user && recruiterProfile) {
      loadSavedCandidates();
    } else {
      setIsLoading(false);
      setSavedCandidates([]);
    }
  }, [user, recruiterProfile]);

  const loadSavedCandidates = async () => {
    if (!user || !recruiterProfile) {
      console.log('SavedCandidatesTab: No user or recruiter profile');
      setIsLoading(false);
      return;
    }

    console.log('SavedCandidatesTab: Loading saved candidates for recruiter:', recruiterProfile.id);
    setIsLoading(true);
    
    try {
      // First, get all saved candidate records for this recruiter
      const { data: savedRecords, error: savedError } = await supabase
        .from('saved_candidates')
        .select('candidate_id')
        .eq('recruiter_id', recruiterProfile.id);

      console.log('SavedCandidatesTab: Saved records query result:', { savedRecords, savedError });

      if (savedError) {
        console.error('Error loading saved candidates records:', savedError);
        toast.error('Failed to load saved candidates');
        setIsLoading(false);
        return;
      }

      if (!savedRecords || savedRecords.length === 0) {
        console.log('SavedCandidatesTab: No saved records found');
        setSavedCandidates([]);
        setIsLoading(false);
        return;
      }

      // Get the candidate IDs
      const candidateIds = savedRecords.map(record => record.candidate_id);
      console.log('SavedCandidatesTab: Candidate IDs to fetch:', candidateIds);

      // Now fetch the candidate profiles
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .in('id', candidateIds);

      console.log('SavedCandidatesTab: Candidates query result:', { candidates, candidatesError });

      if (candidatesError) {
        console.error('Error loading candidate profiles:', candidatesError);
        toast.error('Failed to load candidate profiles');
        setIsLoading(false);
        return;
      }

      console.log('SavedCandidatesTab: Successfully loaded candidates:', candidates?.length || 0);
      setSavedCandidates(candidates || []);
    } catch (error) {
      console.error('Unexpected error loading saved candidates:', error);
      toast.error('Failed to load saved candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPreScreenReport = (candidate: CandidateProfile) => {
    const candidateName = `${candidate.first_name} ${candidate.last_name}`;
    
    console.log('SavedCandidatesTab: Opening pre-screen report for candidate:', candidate.id, candidate);
    
    // Get pre-screening data for this candidate
    const preScreenResult = getPreScreenForCandidate(candidate.id);
    
    if (preScreenResult) {
      console.log('SavedCandidatesTab: Found pre-screen result:', preScreenResult);
      setSelectedPreScreen({
        flags: preScreenResult.flags || [],
        questions: preScreenResult.questions || [],
        candidateId: candidate.id,
        candidate: candidate
      });
      setSelectedCandidateName(candidateName);
      setPreScreenModalOpen(true);
    } else {
      toast.error('No pre-screening report found for this candidate');
    }
  };

  if (!user || !recruiterProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Candidates</CardTitle>
          <CardDescription>
            Please log in as a recruiter to view saved candidates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
          {savedCandidates.map((candidate) => {
            const preScreenResult = getPreScreenForCandidate(candidate.id);
            const hasPreScreen = !!preScreenResult;
            
            return (
              <EnhancedCandidateCard
                key={candidate.id}
                candidate={candidate}
                onViewProfile={onViewProfile}
                onContact={onContact}
                hasPreScreen={hasPreScreen}
                onViewPreScreen={hasPreScreen ? () => handleViewPreScreenReport(candidate) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Pre-screening Results Modal */}
      {selectedPreScreen && (
        <PreScreeningResultsModal
          open={preScreenModalOpen}
          onOpenChange={setPreScreenModalOpen}
          flags={selectedPreScreen.flags}
          questions={selectedPreScreen.questions}
          candidateName={selectedCandidateName}
          candidateId={selectedPreScreen.candidateId}
          candidate={selectedPreScreen.candidate}
        />
      )}
    </div>
  );
};

export default SavedCandidatesTab;
