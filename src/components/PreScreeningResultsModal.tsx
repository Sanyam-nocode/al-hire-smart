
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { usePreScreening } from '@/hooks/usePreScreening';
import PreScreeningResults from './PreScreeningResults';

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

interface PreScreeningResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flags: PreScreenFlag[];
  questions: PreScreenQuestion[];
  candidateName?: string;
  candidateId?: string;
  candidate?: any;
}

const PreScreeningResultsModal: React.FC<PreScreeningResultsModalProps> = ({
  open,
  onOpenChange,
  flags,
  questions,
  candidateName = "Candidate",
  candidateId,
  candidate
}) => {
  const { runPreScreening, isLoading } = usePreScreening();

  const handleRegenerateReport = async () => {
    if (!candidateId || !candidate) {
      console.log('PreScreeningResultsModal: Missing candidateId or candidate data for regeneration');
      return;
    }
    
    console.log('PreScreeningResultsModal: Regenerating pre-screening for candidate:', candidateId, candidate);
    
    await runPreScreening(
      candidateId,
      candidate,
      candidate.resume_content || '',
      true // Pass regenerate flag
    );
  };

  // Show regenerate button if we have the required data
  const canRegenerate = candidateId && candidate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pre-Screening Report - {candidateName}</span>
            {canRegenerate && (
              <Button 
                onClick={handleRegenerateReport}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isLoading ? 'Regenerating...' : 'Regenerate Report'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Show a message if regeneration is not available */}
        {!canRegenerate && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Note: Report regeneration is not available for this view. Open from the candidate profile to regenerate.
            </p>
          </div>
        )}
        
        <PreScreeningResults
          flags={flags}
          questions={questions}
          candidateName={candidateName}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PreScreeningResultsModal;
