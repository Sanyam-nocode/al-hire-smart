
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidateInteractions } from '@/hooks/useCandidateInteractions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Eye, Plus } from 'lucide-react';

interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string;
}

interface ConversationHistoryTabProps {
  onViewProfile: (candidate: CandidateProfile) => void;
}

const ConversationHistoryTab = ({ onViewProfile }: ConversationHistoryTabProps) => {
  const { user, recruiterProfile } = useAuth();
  const { interactions, isLoading } = useCandidateInteractions();
  const [candidatesMap, setCandidatesMap] = useState<Record<string, CandidateProfile>>({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    if (interactions.length > 0) {
      loadCandidateProfiles();
    }
  }, [interactions]);

  const loadCandidateProfiles = async () => {
    const candidateIds = Array.from(new Set(interactions.map(i => i.candidate_id)));
    
    if (candidateIds.length === 0) return;

    console.log('ConversationHistoryTab: Loading candidate profiles for IDs:', candidateIds);
    setLoadingCandidates(true);
    
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, title, email')
        .in('id', candidateIds);

      if (error) {
        console.error('Error loading candidate profiles:', error);
        return;
      }

      const candidatesMap = (data || []).reduce((acc, candidate) => {
        acc[candidate.id] = candidate;
        return acc;
      }, {} as Record<string, CandidateProfile>);

      setCandidatesMap(candidatesMap);
    } catch (error) {
      console.error('Unexpected error loading candidate profiles:', error);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const getInteractionTypeLabel = (type: string) => {
    const labels = {
      saved: 'Saved',
      email_sent: 'Email Sent',
      response_received: 'Response Received',
      interview_scheduled: 'Interview Scheduled',
      rejected: 'Rejected',
      hired: 'Hired'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getInteractionTypeColor = (type: string) => {
    const colors = {
      saved: 'bg-blue-100 text-blue-800',
      email_sent: 'bg-green-100 text-green-800',
      response_received: 'bg-purple-100 text-purple-800',
      interview_scheduled: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      hired: 'bg-emerald-100 text-emerald-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!user || !recruiterProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>
            Please log in as a recruiter to view conversation history.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading || loadingCandidates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>
            Loading your conversation history...
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
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>
            Track all your interactions with candidates ({interactions.length} interactions)
          </CardDescription>
        </CardHeader>
      </Card>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-gray-600 text-center">
              No interactions recorded yet. Start by saving candidates or contacting them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Interaction Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((interaction) => {
                  const candidate = candidatesMap[interaction.candidate_id];
                  return (
                    <TableRow key={interaction.id}>
                      <TableCell>
                        {candidate ? (
                          <div>
                            <div className="font-medium">
                              {candidate.first_name} {candidate.last_name}
                            </div>
                            {candidate.title && (
                              <div className="text-sm text-gray-600">{candidate.title}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400">Loading...</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getInteractionTypeColor(interaction.interaction_type)}
                        >
                          {getInteractionTypeLabel(interaction.interaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(interaction.interaction_date), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {interaction.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewProfile(candidate)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationHistoryTab;
