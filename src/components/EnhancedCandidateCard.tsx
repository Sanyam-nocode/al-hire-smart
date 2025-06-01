
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Calendar, DollarSign, ExternalLink } from "lucide-react";

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

interface EnhancedCandidateCardProps {
  candidate: CandidateProfile;
  onViewProfile: (candidate: CandidateProfile) => void;
  onContact: (candidate: CandidateProfile) => void;
}

const EnhancedCandidateCard = ({ candidate, onViewProfile, onContact }: EnhancedCandidateCardProps) => {
  const hasAIExtractedData = candidate.resume_content !== null;
  
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">
              {candidate.first_name} {candidate.last_name}
            </h3>
            {candidate.title && (
              <p className="text-gray-600 font-medium">{candidate.title}</p>
            )}
          </div>
          {hasAIExtractedData && (
            <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-medium">AI Enhanced</span>
            </div>
          )}
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

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onViewProfile(candidate)}>
            View Full Profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => onContact(candidate)}>
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedCandidateCard;
