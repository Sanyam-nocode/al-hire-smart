
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { useAISearch } from '@/hooks/useAISearch';
import EnhancedCandidateCard from './EnhancedCandidateCard';

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

interface AISearchComponentProps {
  onViewProfile: (candidate: CandidateProfile) => void;
  onContact: (candidate: CandidateProfile) => void;
}

const AISearchComponent = ({ onViewProfile, onContact }: AISearchComponentProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isSearching, searchResults, performAISearch, clearResults } = useAISearch();

  const handleSearch = () => {
    performAISearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const exampleQueries = [
    "React developers with 3+ years experience",
    "Frontend engineers in San Francisco",
    "Full-stack developers who know Node.js and Python",
    "Senior software engineers with AI/ML experience",
    "JavaScript developers open to remote work"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI-Powered Candidate Search
          </CardTitle>
          <CardDescription>
            Use natural language to find the perfect candidates. Describe what you're looking for, and AI will match candidates based on skills, experience, location, and more. Enhanced profiles show AI-extracted resume data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'React developers with 3+ years experience in San Francisco'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="min-w-[100px]"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Example searches:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(query)}
                  className="text-xs"
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {searchResults.length} matching candidates
              </p>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((candidate) => (
            <EnhancedCandidateCard 
              key={candidate.id} 
              candidate={candidate}
              onViewProfile={onViewProfile}
              onContact={onContact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AISearchComponent;
