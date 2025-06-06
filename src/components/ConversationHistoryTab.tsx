import { useState, useEffect, useMemo } from 'react';
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
import { useSavedCandidates } from '@/hooks/useSavedCandidates';
import { usePreScreening } from '@/hooks/usePreScreening';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Eye, Brain, RefreshCw, FileText } from 'lucide-react';
import PreScreeningResultsModal from '@/components/PreScreeningResultsModal';

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
  const { interactions, isLoading, loadInteractions } = useCandidateInteractions();
  const { savedCandidateIds } = useSavedCandidates();
  const { getPreScreenForCandidate, preScreenResults } = usePreScreening();
  const [candidatesMap, setCandidatesMap] = useState<Record<string, CandidateProfile>>({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPreScreen, setSelectedPreScreen] = useState<any>(null);
  const [preScreenModalOpen, setPreScreenModalOpen] = useState(false);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>('');

  // Debug logging
  useEffect(() => {
    console.log('ConversationHistoryTab: Component mounted/updated');
    console.log('ConversationHistoryTab: Total interactions:', interactions.length);
    console.log('ConversationHistoryTab: Saved candidates:', savedCandidateIds.size);
    console.log('ConversationHistoryTab: All interactions:', interactions);
    console.log('ConversationHistoryTab: Email sent interactions:', interactions.filter(i => i.interaction_type === 'email_sent'));
    console.log('ConversationHistoryTab: Pre-screening interactions:', interactions.filter(i => i.interaction_type === 'pre_screening_completed'));
    console.log('ConversationHistoryTab: Pre-screen results:', preScreenResults.length);
  }, [interactions, savedCandidateIds, preScreenResults]);

  // Set up real-time subscription to listen for new interactions
  useEffect(() => {
    if (!user || !recruiterProfile) return;

    console.log('ConversationHistoryTab: Setting up real-time subscription for interactions');
    
    const channel = supabase
      .channel('candidate_interactions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'candidate_interactions',
          filter: `recruiter_id=eq.${recruiterProfile.id}`
        },
        (payload) => {
          console.log('ConversationHistoryTab: New interaction detected via realtime:', payload);
          // Reload interactions when a new one is added
          loadInteractions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidate_interactions',
          filter: `recruiter_id=eq.${recruiterProfile.id}`
        },
        (payload) => {
          console.log('ConversationHistoryTab: Updated interaction detected via realtime:', payload);
          // Reload interactions when one is updated
          loadInteractions();
        }
      )
      .subscribe();

    return () => {
      console.log('ConversationHistoryTab: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, recruiterProfile, loadInteractions]);

  // Listen for custom email sent events to trigger immediate refresh
  useEffect(() => {
    const handleEmailSent = (event: CustomEvent) => {
      console.log('ConversationHistoryTab: Email sent event received:', event.detail);
      // Force reload interactions when email is sent
      setTimeout(() => {
        console.log('ConversationHistoryTab: Refreshing after email sent');
        loadInteractions();
      }, 500); // Small delay to ensure database transaction is committed
    };

    window.addEventListener('emailSent', handleEmailSent as EventListener);

    return () => {
      window.removeEventListener('emailSent', handleEmailSent as EventListener);
    };
  }, [loadInteractions]);

  // Memoize filtered interactions to prevent infinite re-renders
  const filteredInteractions = useMemo(() => {
    console.log('ConversationHistoryTab: Filtering interactions. Total:', interactions.length, 'Saved candidates:', savedCandidateIds.size);
    const filtered = interactions.filter(interaction => 
      savedCandidateIds.has(interaction.candidate_id)
    );
    console.log('ConversationHistoryTab: Filtered interactions:', filtered.length);
    console.log('ConversationHistoryTab: Filtered interactions details:', filtered);
    return filtered;
  }, [interactions, savedCandidateIds]);

  // Group interactions by candidate and prioritize the most important one
  const groupedInteractions = useMemo(() => {
    const grouped = filteredInteractions.reduce((acc, interaction) => {
      const candidateId = interaction.candidate_id;
      
      if (!acc[candidateId]) {
        acc[candidateId] = [];
      }
      
      acc[candidateId].push(interaction);
      return acc;
    }, {} as Record<string, any[]>);

    // For each candidate, select the most important interaction
    const prioritizedInteractions = Object.entries(grouped).map(([candidateId, candidateInteractions]) => {
      // Sort by priority: email_sent > pre_screening_completed > other types, then by date (newest first)
      const sortedInteractions = candidateInteractions.sort((a, b) => {
        // Priority order - email_sent should be high priority to show recent communications
        const priorityOrder = {
          'email_sent': 0,
          'hired': 1,
          'interview_scheduled': 2,
          'response_received': 3,
          'pre_screening_completed': 4,
          'rejected': 5,
          'saved': 6
        };
        
        const aPriority = priorityOrder[a.interaction_type as keyof typeof priorityOrder] ?? 7;
        const bPriority = priorityOrder[b.interaction_type as keyof typeof priorityOrder] ?? 7;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same priority, sort by date (newest first)
        return new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime();
      });
      
      return sortedInteractions[0]; // Return the highest priority interaction
    });

    console.log('ConversationHistoryTab: Grouped and prioritized interactions:', prioritizedInteractions.length);
    console.log('ConversationHistoryTab: Priority interactions by type:', prioritizedInteractions.reduce((acc, i) => {
      acc[i.interaction_type] = (acc[i.interaction_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    return prioritizedInteractions;
  }, [filteredInteractions]);

  // Memoize candidate IDs to prevent unnecessary re-fetching
  const candidateIds = useMemo(() => {
    return Array.from(new Set(groupedInteractions.map(i => i.candidate_id)));
  }, [groupedInteractions]);

  useEffect(() => {
    if (candidateIds.length > 0) {
      loadCandidateProfiles(candidateIds);
    } else {
      setCandidatesMap({});
    }
  }, [candidateIds]);

  const loadCandidateProfiles = async (candidateIdsToLoad: string[]) => {
    if (candidateIdsToLoad.length === 0) return;

    console.log('ConversationHistoryTab: Loading candidate profiles for saved candidates:', candidateIdsToLoad);
    setLoadingCandidates(true);
    
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, title, email')
        .in('id', candidateIdsToLoad);

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
      hired: 'Hired',
      pre_screening_completed: 'Pre-Screening Analysis'
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
      hired: 'bg-emerald-100 text-emerald-800',
      pre_screening_completed: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInteractionIcon = (type: string) => {
    if (type === 'pre_screening_completed') {
      return <Brain className="h-4 w-4" />;
    }
    return null;
  };

  const formatPreScreeningNotes = (interaction: any) => {
    if (interaction.interaction_type !== 'pre_screening_completed') {
      return interaction.notes || '-';
    }

    // Try to extract summary from details
    if (interaction.details && interaction.details.summary) {
      const summary = interaction.details.summary;
      const flagsText = summary.totalFlags > 0 
        ? `${summary.totalFlags} flag(s) (${summary.flagsBySeverity?.high || 0} high, ${summary.flagsBySeverity?.medium || 0} medium, ${summary.flagsBySeverity?.low || 0} low)`
        : 'No flags';
      const questionsText = `${summary.totalQuestions || 0} question(s)`;
      return `Analysis: ${flagsText}, ${questionsText} generated`;
    }

    // Fallback to notes
    return interaction.notes || 'Pre-screening analysis completed';
  };

  const handleViewPreScreenReport = (candidateId: string) => {
    const candidate = candidatesMap[candidateId];
    const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Candidate';
    
    console.log('ConversationHistoryTab: Opening pre-screen report for candidate:', candidateId, candidate);
    
    // First try to get from preScreenResults
    const preScreenResult = getPreScreenForCandidate(candidateId);
    
    if (preScreenResult) {
      console.log('ConversationHistoryTab: Found pre-screen result:', preScreenResult);
      setSelectedPreScreen({
        flags: preScreenResult.flags || [],
        questions: preScreenResult.questions || [],
        candidateId: candidateId,
        candidate: candidate,
        createdAt: preScreenResult.created_at,
        updatedAt: preScreenResult.updated_at
      });
      setSelectedCandidateName(candidateName);
      setPreScreenModalOpen(true);
    } else {
      // Try to get from interaction details
      const preScreenInteraction = interactions.find(
        i => i.candidate_id === candidateId && i.interaction_type === 'pre_screening_completed'
      );
      
      if (preScreenInteraction && preScreenInteraction.details) {
        console.log('ConversationHistoryTab: Found pre-screen interaction:', preScreenInteraction);
        setSelectedPreScreen({
          flags: preScreenInteraction.details.flags || [],
          questions: preScreenInteraction.details.questions || [],
          candidateId: candidateId,
          candidate: candidate,
          createdAt: preScreenInteraction.interaction_date,
          updatedAt: preScreenInteraction.updated_at
        });
        setSelectedCandidateName(candidateName);
        setPreScreenModalOpen(true);
      } else {
        toast.error('No pre-screening report found for this candidate');
      }
    }
  };

  // Helper function to get the report generation date for display
  const getReportDate = (candidateId: string) => {
    const preScreenResult = getPreScreenForCandidate(candidateId);
    if (preScreenResult) {
      return preScreenResult.updated_at || preScreenResult.created_at;
    }
    
    const preScreenInteraction = interactions.find(
      i => i.candidate_id === candidateId && i.interaction_type === 'pre_screening_completed'
    );
    
    return preScreenInteraction?.interaction_date;
  };

  const handleManualRefresh = async () => {
    console.log('ConversationHistoryTab: Manual refresh triggered');
    setRefreshing(true);
    try {
      await loadInteractions();
      toast.success('Interaction history refreshed!');
    } catch (error) {
      toast.error('Failed to refresh interaction history');
    } finally {
      setRefreshing(false);
    }
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
          <CardTitle className="flex items-center justify-between">
            Conversation History
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh} 
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Track interactions with your saved candidates ({groupedInteractions.length} candidates)
          </CardDescription>
        </CardHeader>
      </Card>

      {groupedInteractions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-gray-600 text-center">
              No interactions with saved candidates yet. Save some candidates and start interacting with them to see history here.
            </p>
            <div className="mt-4 text-sm text-gray-500 text-center">
              <p>Debug info: Total interactions: {interactions.length}, Saved candidates: {savedCandidateIds.size}</p>
              <p>Email sent interactions: {interactions.filter(i => i.interaction_type === 'email_sent').length}</p>
              <p>Pre-screening interactions: {interactions.filter(i => i.interaction_type === 'pre_screening_completed').length}</p>
            </div>
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
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedInteractions.map((interaction) => {
                  const candidate = candidatesMap[interaction.candidate_id];
                  const isPreScreening = interaction.interaction_type === 'pre_screening_completed';
                  const reportDate = isPreScreening ? getReportDate(interaction.candidate_id) : null;
                  
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
                          className={`${getInteractionTypeColor(interaction.interaction_type)} flex items-center gap-1`}
                        >
                          {getInteractionIcon(interaction.interaction_type)}
                          {getInteractionTypeLabel(interaction.interaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(interaction.interaction_date), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-sm">
                            {formatPreScreeningNotes(interaction)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                          {isPreScreening && reportDate && (
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPreScreenReport(interaction.candidate_id)}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View Report
                              </Button>
                              <div className="text-xs text-gray-500 text-center">
                                Generated: {format(new Date(reportDate), 'MMM d, HH:mm')}
                              </div>
                            </div>
                          )}
                          {isPreScreening && !reportDate && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPreScreenReport(interaction.candidate_id)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Report
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
          createdAt={selectedPreScreen.createdAt}
          updatedAt={selectedPreScreen.updatedAt}
        />
      )}
    </div>
  );
};

export default ConversationHistoryTab;
