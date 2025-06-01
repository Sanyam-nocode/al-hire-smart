
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface AISearchResult {
  candidates: CandidateProfile[];
  total: number;
}

export const useAISearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CandidateProfile[]>([]);

  const performAISearch = async (query: string) => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Performing AI search with query:', query);
      
      const { data, error } = await supabase.functions.invoke('ai-candidate-search', {
        body: { query }
      });

      if (error) {
        console.error('Error calling AI search function:', error);
        toast.error('Failed to perform AI search. Please try again.');
        return;
      }

      const result = data as AISearchResult;
      setSearchResults(result.candidates || []);
      
      toast.success(`Found ${result.total} matching candidates`);
      
    } catch (error) {
      console.error('Error in AI search:', error);
      toast.error('An error occurred during search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
  };

  return {
    isSearching,
    searchResults,
    performAISearch,
    clearResults
  };
};
