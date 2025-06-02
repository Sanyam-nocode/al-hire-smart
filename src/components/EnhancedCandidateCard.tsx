
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  DollarSign, 
  Calendar, 
  Eye, 
  Mail, 
  ExternalLink,
  Brain,
  FileText
} from 'lucide-react';

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
  hasPreScreen?: boolean;
  onViewPreScreen?: () => void;
}

const EnhancedCandidateCard = ({ 
  candidate, 
  onViewProfile, 
  onContact,
  hasPreScreen = false,
  onViewPreScreen
}: EnhancedCandidateCardProps) => {
  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {candidate.first_name} {candidate.last_name}
            </CardTitle>
            {candidate.title && (
              <CardDescription className="mt-1">{candidate.title}</CardDescription>
            )}
          </div>
          {hasPreScreen && (
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Pre-screened
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
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
              {formatSalary(candidate.salary_expectation)}
            </div>
          )}
        </div>

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Skills</div>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 5).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {candidate.summary && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Summary</div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {candidate.summary}
            </p>
          </div>
        )}

        {/* External Links */}
        {(candidate.linkedin_url || candidate.github_url || candidate.portfolio_url) && (
          <div className="flex flex-wrap gap-2">
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                LinkedIn
              </a>
            )}
            {candidate.github_url && (
              <a
                href={candidate.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                GitHub
              </a>
            )}
            {candidate.portfolio_url && (
              <a
                href={candidate.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Portfolio
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProfile(candidate)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Profile
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onContact(candidate)}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-1" />
            Contact
          </Button>
          
          {hasPreScreen && onViewPreScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewPreScreen}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
            >
              <FileText className="h-4 w-4 mr-1" />
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedCandidateCard;
