
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, FileSearch } from 'lucide-react';
import { usePreScreening } from '@/hooks/usePreScreening';
import PreScreeningResults from './PreScreeningResults';

interface PreScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
}

const PreScreeningModal: React.FC<PreScreeningModalProps> = ({
  isOpen,
  onClose,
  candidate
}) => {
  const { runPreScreening, isLoading, getPreScreenForCandidate } = usePreScreening();
  const [results, setResults] = useState<any>(null);
  const [hasRun, setHasRun] = useState(false);

  // Check if pre-screening already exists for this candidate
  const existingPreScreen = getPreScreenForCandidate(candidate.id);

  const handleRunPreScreening = async () => {
    console.log('Running pre-screening for:', candidate);
    
    const result = await runPreScreening(
      candidate.id,
      candidate,
      candidate.resume_content || ''
    );

    if (result) {
      setResults(result);
      setHasRun(true);
    }
  };

  const handleClose = () => {
    setResults(null);
    setHasRun(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI-Powered Pre-Screening
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!hasRun && !existingPreScreen && (
            <div className="text-center py-8">
              <FileSearch className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Pre-Screen {candidate.first_name} {candidate.last_name}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Our AI will analyze this candidate's resume and profile to identify potential 
                verification flags and generate relevant pre-screening questions.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Analysis includes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Employment gap detection</li>
                  <li>• Skill and experience verification</li>
                  <li>• Education background check</li>
                  <li>• Tailored pre-screening questions</li>
                </ul>
              </div>

              <Button 
                onClick={handleRunPreScreening}
                disabled={isLoading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Run Pre-Screening Analysis
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Show results if just ran */}
          {hasRun && results && (
            <PreScreeningResults
              flags={results.flags || []}
              questions={results.questions || []}
              candidateName={`${candidate.first_name} ${candidate.last_name}`}
            />
          )}

          {/* Show existing results */}
          {!hasRun && existingPreScreen && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Pre-screening completed on {new Date(existingPreScreen.created_at).toLocaleDateString()}
                </p>
              </div>
              <PreScreeningResults
                flags={existingPreScreen.flags || []}
                questions={existingPreScreen.questions || []}
                candidateName={`${candidate.first_name} ${candidate.last_name}`}
              />
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Analyzing Candidate...</h3>
              <p className="text-gray-600">
                Our AI is reviewing the resume and profile. This may take a few moments.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreScreeningModal;
