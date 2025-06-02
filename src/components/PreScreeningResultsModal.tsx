
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}

const PreScreeningResultsModal: React.FC<PreScreeningResultsModalProps> = ({
  open,
  onOpenChange,
  flags,
  questions,
  candidateName = "Candidate"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Screening Report</DialogTitle>
        </DialogHeader>
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
