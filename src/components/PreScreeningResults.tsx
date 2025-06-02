
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

interface PreScreeningResultsProps {
  flags: PreScreenFlag[];
  questions: PreScreenQuestion[];
  candidateName: string;
}

const PreScreeningResults: React.FC<PreScreeningResultsProps> = ({
  flags,
  questions,
  candidateName
}) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Pre-Screening Analysis</h3>
        <p className="text-sm text-gray-600">for {candidateName}</p>
      </div>

      {/* Verification Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Verification Flags
            <Badge variant="outline" className="ml-auto">
              {flags.length} {flags.length === 1 ? 'flag' : 'flags'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">No verification flags identified</p>
              <p className="text-sm text-gray-500">The candidate's profile appears consistent</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map((flag, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(flag.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(flag.severity)}>
                          {flag.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {flag.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {flag.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Recommendation:</strong> {flag.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Pre-Screening Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Suggested Pre-Screening Questions
            <Badge variant="outline" className="ml-auto">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">No questions generated</p>
              <p className="text-sm text-gray-500">Unable to generate screening questions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getImportanceColor(question.importance)}>
                          {question.importance.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {question.category.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          {question.expectedAnswerType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {question.question}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreScreeningResults;
