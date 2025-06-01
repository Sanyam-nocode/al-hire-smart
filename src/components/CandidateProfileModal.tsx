
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, DollarSign, ExternalLink, Mail, Phone, X, Sparkles } from "lucide-react";

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

interface CandidateProfileModalProps {
  candidate: CandidateProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContact: (candidate: CandidateProfile) => void;
}

const CandidateProfileModal = ({ candidate, open, onOpenChange, onContact }: CandidateProfileModalProps) => {
  if (!candidate) return null;

  const hasAIExtractedData = candidate.resume_content !== null;
  
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleContactClick = () => {
    onContact(candidate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold mb-2">
                {candidate.first_name} {candidate.last_name}
              </DialogTitle>
              {candidate.title && (
                <p className="text-lg text-gray-600 font-medium">{candidate.title}</p>
              )}
            </div>
            {hasAIExtractedData && (
              <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI Enhanced</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidate.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-3" />
                <span>{candidate.location}</span>
              </div>
            )}
            
            {candidate.experience_years && (
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-3" />
                <span>{candidate.experience_years} years experience</span>
              </div>
            )}

            {candidate.salary_expectation && (
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-3" />
                <span>{formatSalary(candidate.salary_expectation)} expected</span>
              </div>
            )}

            <div className="flex items-center text-gray-600">
              <Mail className="h-5 w-5 mr-3" />
              <span>{candidate.email}</span>
            </div>

            {candidate.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="h-5 w-5 mr-3" />
                <span>{candidate.phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Professional Summary */}
          {candidate.summary && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Professional Summary</h3>
              <p className="text-gray-700 leading-relaxed">{candidate.summary}</p>
            </div>
          )}

          {/* Education */}
          {candidate.education && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Education</h3>
              <p className="text-gray-700">{candidate.education}</p>
            </div>
          )}

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* External Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Links</h3>
            <div className="flex flex-wrap gap-3">
              {candidate.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {candidate.github_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    GitHub
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Portfolio
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleContactClick} className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Contact Candidate
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateProfileModal;
