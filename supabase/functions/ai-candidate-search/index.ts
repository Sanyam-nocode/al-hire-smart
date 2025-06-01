
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing AI search query:', query);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all candidates first
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidate_profiles')
      .select('*');

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch candidates' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced prompt for more precise matching
    const prompt = `
You are a highly precise AI recruiter assistant. Your task is to find candidates who STRICTLY match the search criteria. Be extremely selective and only return candidates who genuinely satisfy ALL the requirements.

Search Query: "${query}"

CRITICAL INSTRUCTIONS:
1. Parse the search query to identify EXACT requirements (skills, experience, location, etc.)
2. For skill requirements: Candidates MUST have the specific skills mentioned or very closely related ones
3. For experience requirements: Candidates MUST meet or exceed the minimum years specified
4. For location requirements: Candidates MUST be in the specified location or explicitly open to that location
5. For job title/role requirements: Candidates MUST have relevant experience in that specific role
6. If a requirement cannot be verified from the candidate data, EXCLUDE that candidate
7. When in doubt, EXCLUDE rather than include - it's better to be too strict than too lenient
8. Only return candidates who are a strong match for ALL criteria mentioned

Available Candidates:
${candidates?.map(candidate => `
ID: ${candidate.id}
Name: ${candidate.first_name} ${candidate.last_name}
Title: ${candidate.title || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Skills: ${candidate.skills ? candidate.skills.join(', ') : 'Not specified'}
Experience: ${candidate.experience_years || 'Not specified'} years
Summary: ${candidate.summary || 'Not specified'}
Education: ${candidate.education || 'Not specified'}
Salary Expectation: ${candidate.salary_expectation ? '$' + candidate.salary_expectation.toLocaleString() : 'Not specified'}
Resume Content: ${candidate.resume_content ? candidate.resume_content.substring(0, 500) + '...' : 'Not available'}
`).join('\n---\n')}

MATCHING CRITERIA:
- For technology skills: Only match if the candidate explicitly mentions the technology or demonstrates clear experience with it
- For experience years: Candidate must have AT LEAST the specified years (if mentioned)
- For locations: Must be exact match or candidate must indicate flexibility for that location
- For roles/titles: Must have relevant experience in similar roles or explicitly mention that skill set
- For seniority levels (junior, mid, senior): Match based on experience years and complexity of past work

Return ONLY a JSON array of candidate IDs who STRICTLY satisfy ALL the search criteria. If no candidates meet the strict requirements, return an empty array.

Response format: ["id1", "id2", "id3"]
`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precision-focused AI recruiter that only returns candidates who STRICTLY match search criteria. You must be extremely selective and only include candidates who genuinely satisfy ALL requirements. When in doubt, exclude the candidate. Respond ONLY with valid JSON arrays.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Lower temperature for more consistent, precise results
        max_tokens: 500,
      }),
    });

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', openAIData);

    if (!openAIData.choices || !openAIData.choices[0]) {
      return new Response(JSON.stringify({ error: 'Invalid OpenAI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let matchedIds: string[] = [];
    try {
      let content = openAIData.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to parse the cleaned content
      matchedIds = JSON.parse(content);
      
      // Ensure it's an array
      if (!Array.isArray(matchedIds)) {
        throw new Error('Response is not an array');
      }
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw content:', openAIData.choices[0].message.content);
      
      // Enhanced fallback search with stricter text-based matching
      const queryLower = query.toLowerCase();
      
      // Extract potential requirements from query
      const skillKeywords = extractSkillKeywords(queryLower);
      const experienceYears = extractExperienceYears(queryLower);
      const locationKeywords = extractLocationKeywords(queryLower);
      
      matchedIds = candidates?.filter(candidate => {
        let score = 0;
        let requiredMatches = 0;
        
        // Skill matching - must have specific skills mentioned
        if (skillKeywords.length > 0) {
          requiredMatches++;
          const candidateSkills = (candidate.skills || []).join(' ').toLowerCase();
          const candidateText = [
            candidate.title,
            candidate.summary,
            candidate.resume_content
          ].join(' ').toLowerCase();
          
          const skillMatches = skillKeywords.filter(skill => 
            candidateSkills.includes(skill) || candidateText.includes(skill)
          );
          
          if (skillMatches.length >= Math.ceil(skillKeywords.length * 0.8)) {
            score++;
          }
        }
        
        // Experience matching - must meet minimum requirements
        if (experienceYears > 0) {
          requiredMatches++;
          if (candidate.experience_years && candidate.experience_years >= experienceYears) {
            score++;
          }
        }
        
        // Location matching - must be exact or flexible
        if (locationKeywords.length > 0) {
          requiredMatches++;
          const candidateLocation = (candidate.location || '').toLowerCase();
          if (locationKeywords.some(loc => candidateLocation.includes(loc))) {
            score++;
          }
        }
        
        // Require ALL criteria to be met for strict filtering
        return requiredMatches === 0 || score === requiredMatches;
      }).map(c => c.id) || [];
    }

    // Filter candidates based on matched IDs and preserve order
    const matchedCandidates = matchedIds
      .map(id => candidates?.find(c => c.id === id))
      .filter(Boolean);

    console.log(`Found ${matchedCandidates.length} strictly matching candidates`);

    return new Response(JSON.stringify({ 
      candidates: matchedCandidates,
      total: matchedCandidates.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-candidate-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for fallback search
function extractSkillKeywords(query: string): string[] {
  const skillPatterns = [
    'react', 'javascript', 'typescript', 'node.js', 'python', 'java', 'c++', 'c#',
    'angular', 'vue', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
    'html', 'css', 'sass', 'scss', 'sql', 'mongodb', 'postgresql', 'mysql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'jenkins',
    'machine learning', 'ai', 'data science', 'blockchain', 'devops',
    'frontend', 'backend', 'fullstack', 'full-stack', 'mobile', 'web development'
  ];
  
  return skillPatterns.filter(skill => query.includes(skill));
}

function extractExperienceYears(query: string): number {
  const experienceMatch = query.match(/(\d+)\s*\+?\s*years?\s*(experience|exp)/i);
  return experienceMatch ? parseInt(experienceMatch[1]) : 0;
}

function extractLocationKeywords(query: string): string[] {
  const locationPatterns = [
    'san francisco', 'new york', 'los angeles', 'chicago', 'boston', 'seattle',
    'austin', 'denver', 'atlanta', 'dallas', 'remote', 'california', 'texas',
    'florida', 'washington', 'oregon', 'colorado', 'north carolina'
  ];
  
  return locationPatterns.filter(location => query.includes(location));
}
