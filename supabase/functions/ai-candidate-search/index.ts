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

    // Ultra-precise prompt with strict matching requirements
    const prompt = `
You are an ULTRA-PRECISE AI recruiter assistant. Your primary directive is EXACTNESS - only return candidates who EXPLICITLY and DEMONSTRABLY meet ALL requirements.

Search Query: "${query}"

CRITICAL PRECISION RULES:
1. SKILL MATCHING: For technical skills (React, Angular, Vue, Python, etc.), candidates MUST explicitly mention the EXACT skill in their skills array, title, summary, or resume content. Similar technologies DO NOT count (Vue.js ≠ React, Angular ≠ React).

2. EXPERIENCE MATCHING: For experience requirements (e.g., "3+ years"), candidates MUST have AT LEAST that many years. If the query says "3+ years experience with React", they need BOTH 3+ total years AND explicit React knowledge.

3. LOCATION MATCHING: For location requirements, candidates must be in that exact location OR explicitly mention remote work/willingness to relocate.

4. ROLE MATCHING: For role-specific searches (e.g., "Frontend Developer"), candidates must have relevant titles or clearly demonstrated experience in that role.

5. ZERO TOLERANCE: If ANY requirement cannot be verified from the candidate's data, EXCLUDE that candidate. When in doubt, EXCLUDE.

6. EXPLICIT EVIDENCE REQUIRED: Don't infer or assume - only match on explicitly stated information.

Available Candidates Data:
${candidates?.map(candidate => `
ID: ${candidate.id}
Name: ${candidate.first_name} ${candidate.last_name}
Title: ${candidate.title || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Skills Array: ${candidate.skills ? `[${candidate.skills.join(', ')}]` : 'No skills listed'}
Experience Years: ${candidate.experience_years || 'Not specified'} years
Summary: ${candidate.summary || 'No summary'}
Education: ${candidate.education || 'Not specified'}
Resume Content Keywords: ${candidate.resume_content ? candidate.resume_content.substring(0, 800).toLowerCase() : 'No resume content'}
`).join('\n---\n')}

MATCHING ANALYSIS REQUIRED:
For each requirement in the search query:
- Extract the EXACT requirement (e.g., "React", "3+ years", "San Francisco")
- For each candidate, check if they EXPLICITLY meet this requirement
- Only include candidates who meet ALL requirements with VERIFIABLE evidence

EXAMPLES OF STRICT MATCHING:
- Query: "React developers" → Only candidates with "React" in skills, title, summary, or resume
- Query: "3+ years experience" → Only candidates with experience_years >= 3
- Query: "Frontend developers with React" → Must have BOTH frontend role evidence AND React skills
- Vue.js, Angular, JavaScript alone DO NOT qualify for "React developers"

Return ONLY a JSON array of candidate IDs who have EXPLICIT, VERIFIABLE evidence for ALL search requirements.
If NO candidates meet the strict criteria, return an empty array.

Response format: ["id1", "id2"]
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
            content: 'You are an ULTRA-PRECISE AI recruiter that only matches candidates with EXPLICIT, VERIFIABLE evidence for ALL requirements. Zero tolerance for assumptions or close matches. When in doubt, EXCLUDE the candidate. Respond ONLY with valid JSON arrays of candidate IDs.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.05, // Ultra-low temperature for maximum precision
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
      
      // Ultra-strict fallback search
      const queryLower = query.toLowerCase();
      
      // Extract requirements with more precision
      const skillKeywords = extractTechnicalSkills(queryLower);
      const experienceYears = extractExperienceYears(queryLower);
      const locationKeywords = extractLocationKeywords(queryLower);
      
      console.log('Fallback search criteria:', { skillKeywords, experienceYears, locationKeywords });
      
      matchedIds = candidates?.filter(candidate => {
        // All requirements must be met
        let requirementsMet = 0;
        let totalRequirements = 0;
        
        // Strict skill matching
        if (skillKeywords.length > 0) {
          totalRequirements++;
          const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
          const candidateText = [
            candidate.title,
            candidate.summary,
            candidate.resume_content
          ].join(' ').toLowerCase();
          
          // ALL specified skills must be present
          const allSkillsMatch = skillKeywords.every(skill => {
            const hasSkill = candidateSkills.includes(skill.toLowerCase()) || 
                           candidateText.includes(skill.toLowerCase());
            console.log(`Checking skill "${skill}" for ${candidate.first_name} ${candidate.last_name}:`, hasSkill);
            return hasSkill;
          });
          
          if (allSkillsMatch) {
            requirementsMet++;
          }
        }
        
        // Strict experience matching
        if (experienceYears > 0) {
          totalRequirements++;
          if (candidate.experience_years && candidate.experience_years >= experienceYears) {
            requirementsMet++;
            console.log(`Experience requirement met for ${candidate.first_name} ${candidate.last_name}: ${candidate.experience_years} >= ${experienceYears}`);
          } else {
            console.log(`Experience requirement NOT met for ${candidate.first_name} ${candidate.last_name}: ${candidate.experience_years} < ${experienceYears}`);
          }
        }
        
        // Strict location matching
        if (locationKeywords.length > 0) {
          totalRequirements++;
          const candidateLocation = (candidate.location || '').toLowerCase();
          const locationMatch = locationKeywords.some(loc => candidateLocation.includes(loc));
          if (locationMatch) {
            requirementsMet++;
            console.log(`Location requirement met for ${candidate.first_name} ${candidate.last_name}`);
          } else {
            console.log(`Location requirement NOT met for ${candidate.first_name} ${candidate.last_name}`);
          }
        }
        
        // ALL requirements must be satisfied
        const isMatch = totalRequirements === 0 || requirementsMet === totalRequirements;
        console.log(`Final match result for ${candidate.first_name} ${candidate.last_name}: ${isMatch} (${requirementsMet}/${totalRequirements})`);
        return isMatch;
      }).map(c => c.id) || [];
    }

    // Filter candidates based on matched IDs and preserve order
    const matchedCandidates = matchedIds
      .map(id => candidates?.find(c => c.id === id))
      .filter(Boolean);

    console.log(`Found ${matchedCandidates.length} strictly matching candidates out of ${candidates?.length} total candidates`);

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

// Enhanced helper functions for ultra-precise matching
function extractTechnicalSkills(query: string): string[] {
  const technicalSkills = [
    // Frontend Frameworks
    'react', 'angular', 'vue.js', 'vue', 'svelte', 'ember',
    // Backend Frameworks  
    'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
    // Languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    // Databases
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
    // Other Technologies
    'graphql', 'rest', 'sql', 'html', 'css', 'sass', 'scss', 'git'
  ];
  
  return technicalSkills.filter(skill => {
    // More precise matching - look for skill as whole word
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    return regex.test(query);
  });
}

function extractExperienceYears(query: string): number {
  // More precise experience extraction
  const patterns = [
    /(\d+)\s*\+?\s*years?\s*(of\s*)?(experience|exp)/i,
    /(\d+)\s*\+?\s*year\s*(experience|exp)/i,
    /(\d+)\s*\+\s*years?/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 0;
}

function extractLocationKeywords(query: string): string[] {
  const locations = [
    'san francisco', 'new york', 'los angeles', 'chicago', 'boston', 'seattle',
    'austin', 'denver', 'atlanta', 'dallas', 'miami', 'philadelphia',
    'remote', 'california', 'texas', 'florida', 'washington', 'oregon', 
    'colorado', 'north carolina', 'new jersey', 'massachusetts'
  ];
  
  return locations.filter(location => query.includes(location));
}
