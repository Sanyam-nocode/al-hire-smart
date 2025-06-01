
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

    console.log('Processing ultra-strict AI search query:', query);

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

    // Ultra-strict prompt that requires ALL criteria to be met
    const prompt = `
You are an ULTRA-STRICT AI recruiter. Your ONLY job is to find candidates who meet EVERY SINGLE requirement in the search query. If a candidate is missing even ONE requirement, they MUST be excluded.

CRITICAL RULES - NO EXCEPTIONS:
1. ALL requirements must be satisfied - this is an AND operation, NOT OR
2. Technical skills: Must have EXACT skill mentioned (React means React specifically, not just JavaScript)
3. Experience: Must meet or exceed EXACT years specified (3+ years means >= 3 years)
4. Location: Must match specified location if mentioned
5. If ANY requirement is not met, EXCLUDE the candidate completely
6. Return MAXIMUM 10 candidates who meet ALL criteria
7. If NO candidates meet ALL requirements, return empty array []

SEARCH QUERY TO ANALYZE: "${query}"

STEP-BY-STEP ANALYSIS REQUIRED:
1. Extract ALL individual requirements from the query
2. For EACH candidate, check if they satisfy EVERY SINGLE requirement
3. If they fail ANY requirement, immediately exclude them
4. Only include candidates who pass ALL requirements

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
Resume Content: ${candidate.resume_content ? candidate.resume_content.substring(0, 500) : 'Not specified'}
`).join('\n---\n')}

EXAMPLE ANALYSIS:
Query: "React developers with 3+ years experience"
Requirements: [React skill, >= 3 years experience]
- Candidate A: Has React, 5 years experience → INCLUDE
- Candidate B: Has JavaScript, 5 years experience → EXCLUDE (no React)
- Candidate C: Has React, 2 years experience → EXCLUDE (< 3 years)
- Candidate D: Has React, 3 years experience → INCLUDE

NOW ANALYZE EACH CANDIDATE:
For each candidate, explicitly state:
- Does candidate have [specific skill]? YES/NO
- Does candidate have [experience requirement]? YES/NO
- Does candidate meet [location requirement]? YES/NO (if specified)
- OVERALL: Include or Exclude?

Only return JSON array of IDs for candidates who meet ALL requirements:
["id1", "id2"]

If no candidates meet ALL requirements, return: []
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
            content: 'You are an ultra-strict AI recruiter. You MUST analyze each requirement separately and ONLY return candidates who meet EVERY requirement. Respond with ONLY valid JSON arrays of candidate IDs. Be extremely rigorous - if in doubt, exclude the candidate.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0, // Absolute minimum for maximum consistency
        max_tokens: 500,
      }),
    });

    const openAIData = await openAIResponse.json();
    console.log('OpenAI ultra-strict response:', openAIData);

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
      
      // Enhanced ultra-strict fallback matching
      const queryLower = query.toLowerCase();
      
      // Extract requirements with more precision
      const skillsMatch = queryLower.match(/\b(react|angular|vue|python|java|javascript|node\.?js|typescript|sql|mongodb|postgresql|aws|docker|kubernetes|machine learning|ai|ml|data science|php|ruby|go|rust|c\+\+|c#|swift|kotlin)\b/g) || [];
      const experienceMatch = queryLower.match(/(\d+)\+?\s*years?/);
      const locationWords = queryLower.match(/\bin\s+([a-zA-Z\s,]+?)(?:\s|$|,|\band\b|\bwith\b)/);
      
      const minExperience = experienceMatch ? parseInt(experienceMatch[1]) : null;
      const requiredLocation = locationWords ? locationWords[1].trim() : null;
      
      console.log('Ultra-strict fallback matching with:', {
        skills: skillsMatch,
        minExperience,
        location: requiredLocation
      });
      
      matchedIds = candidates?.filter(candidate => {
        // STRICT skills requirement - ALL mentioned skills must be present
        if (skillsMatch.length > 0) {
          const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
          const candidateText = [
            candidate.title || '',
            candidate.summary || '',
            candidate.resume_content || ''
          ].join(' ').toLowerCase();
          
          // Check if ALL required skills are present
          const hasAllSkills = skillsMatch.every(requiredSkill => {
            const hasInSkillsArray = candidateSkills.some(candidateSkill => 
              candidateSkill.includes(requiredSkill) || candidateSkill === requiredSkill
            );
            const hasInText = candidateText.includes(requiredSkill);
            return hasInSkillsArray || hasInText;
          });
          
          if (!hasAllSkills) {
            console.log(`Excluding ${candidate.first_name} ${candidate.last_name} - missing skills. Required: ${skillsMatch.join(', ')}, Has: ${candidateSkills.join(', ')}`);
            return false;
          }
        }
        
        // STRICT experience requirement
        if (minExperience !== null) {
          if (!candidate.experience_years || candidate.experience_years < minExperience) {
            console.log(`Excluding ${candidate.first_name} ${candidate.last_name} - insufficient experience. Required: ${minExperience}+, Has: ${candidate.experience_years || 0}`);
            return false;
          }
        }
        
        // STRICT location requirement
        if (requiredLocation && candidate.location) {
          const candidateLocation = candidate.location.toLowerCase();
          const normalizedRequired = requiredLocation.toLowerCase().trim();
          if (!candidateLocation.includes(normalizedRequired)) {
            console.log(`Excluding ${candidate.first_name} ${candidate.last_name} - location mismatch. Required: ${requiredLocation}, Has: ${candidate.location}`);
            return false;
          }
        }
        
        console.log(`Including ${candidate.first_name} ${candidate.last_name} - meets ALL requirements`);
        return true;
      }).map(c => c.id) || [];
    }

    // Filter candidates based on matched IDs and preserve order
    const matchedCandidates = matchedIds
      .map(id => candidates?.find(c => c.id === id))
      .filter(Boolean);

    console.log(`Ultra-strict filtering returned ${matchedCandidates.length} fully qualifying candidates out of ${candidates?.length} total candidates`);

    return new Response(JSON.stringify({ 
      candidates: matchedCandidates,
      total: matchedCandidates.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ultra-strict ai-candidate-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
