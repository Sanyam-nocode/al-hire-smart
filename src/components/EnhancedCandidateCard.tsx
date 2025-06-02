
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Calendar, DollarSign, ExternalLink, Bookmark, BookmarkCheck, Trophy, Brain } from "lucide-react";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";
import PreScreeningModal from "./PreScreeningModal";

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
  ranking?: number;
  weightedScore?: number;
}

interface EnhancedCandidateCardProps {
  candidate: CandidateProfile;
  onViewProfile: (candidate: CandidateProfile) => void;
  onContact: (candidate: CandidateProfile) => void;
}

const EnhancedCandidateCard = ({ candidate, onViewProfile, onContact }: EnhancedCandidateCardProps) => {
  const hasAIExtractedData = candidate.resume_content !== null;
  const { saveCandidate, unsaveCandidate, isCandidateSaved, isLoading } = useSavedCandidates();
  const isSaved = isCandidateSaved(candidate.id);
  const [preScreeningModalOpen, setPreScreeningModalOpen] = useState(false);
  
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSaveToggle = async () => {
    if (isSaved) {
      await unsaveCandidate(candidate.id);
    } else {
      await saveCandidate(candidate.id);
    }
  };

  const getRankingColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rank === 2) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (rank === 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const handlePreScreening = () => {
    console.log('Pre-screening button clicked for candidate:', candidate.id);
    setPreScreeningModalOpen(true);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">
                  {candidate.first_name} {candidate.last_name}
                </h3>
                {candidate.ranking && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${getRankingColor(candidate.ranking)}`}>
                    <Trophy className="h-3 w-3" />
                    <span className="text-xs font-medium">#{candidate.ranking}</span>
                  </div>
                )}
              </div>
              {candidate.title && (
                <p className="text-gray-600 font-medium">{candidate.title}</p>
              )}
              {candidate.weightedScore && (
                <p className="text-xs text-gray-500 mt-1">
                  Match Score: {(candidate.weightedScore * 100).toFixed(1)}%
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {hasAIExtractedData && (
                <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-xs font-medium">AI Enhanced</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToggle}
                disabled={isLoading}
                className={`h-8 w-8 p-0 ${isSaved ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}`}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {candidate.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                {candidate.location}
              </div>
            )}
            
            {candidate.experience_years && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {candidate.experience_years} years experience
              </div>
            )}

            {candidate.salary_expectation && (
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-2" />
                {formatSalary(candidate.salary_expectation)} expected
              </div>
            )}
          </div>

          {candidate.summary && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 line-clamp-3">
                {candidate.summary}
              </p>
            </div>
          )}

          {candidate.education && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Education:</span> {candidate.education}
              </p>
            </div>
          )}

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 6).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidate.skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {candidate.linkedin_url || candidate.github_url || candidate.portfolio_url ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {candidate.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {candidate.github_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    GitHub
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Portfolio
                  </a>
                </Button>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => onViewProfile(candidate)}>
                View Full Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => onContact(candidate)}>
                Contact
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreScreening}
              className="w-full flex items-center justify-center gap-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              <Brain className="h-4 w-4" />
              AI Pre-Screen Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      <PreScreeningModal
        isOpen={preScreeningModalOpen}
        onClose={() => setPreScreeningModalOpen(false)}
        candidate={candidate}
      />
    </>
  );
};

export default EnhancedCandidateCard;
