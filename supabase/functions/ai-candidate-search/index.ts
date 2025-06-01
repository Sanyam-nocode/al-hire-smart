
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

    console.log('Processing strict AI search query:', query);

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

    // Enhanced prompt for extremely strict matching
    const prompt = `
You are an expert AI recruiter with extremely high standards for candidate matching. Your job is to ONLY return candidates who PRECISELY match ALL the specified criteria in the search query.

CRITICAL INSTRUCTIONS:
1. BE EXTREMELY STRICT - Only return candidates who meet ALL specified requirements
2. For technical skills: EXACT match required (React means React specifically, not just JavaScript)
3. For experience: Must meet or exceed the minimum years specified
4. For location: Must match the location if specified (consider nearby areas only if explicitly mentioned)
5. For job titles/roles: Must have relevant title or demonstrable experience in that role
6. If ANY requirement is not met, EXCLUDE the candidate
7. Return MAXIMUM 10 best matches, ordered by how well they meet ALL criteria
8. If NO candidates meet ALL criteria, return empty array

Search Query: "${query}"

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
Resume Content: ${candidate.resume_content ? candidate.resume_content.substring(0, 500) : 'Not specified'}
`).join('\n---\n')}

STRICT MATCHING RULES:
- Technical Skills: Must have EXACT skill mentioned (e.g., "React" query requires React in skills)
- Experience Level: Must meet minimum years (e.g., "3+ years" means >= 3 years)
- Location: Must match specified location or be in same metro area
- Role/Title: Must have relevant experience for the specified role
- Salary: If mentioned, must be within reasonable range

ANALYZE EACH CANDIDATE:
1. Extract ALL requirements from the search query
2. Check if candidate meets EVERY requirement
3. If ANY requirement is missing or insufficient, EXCLUDE the candidate
4. Only include candidates who satisfy ALL criteria

Return ONLY a JSON array of candidate IDs who meet ALL requirements:
["id1", "id2", "id3"]

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
            content: 'You are an extremely strict AI recruiter that only returns candidates who meet ALL specified criteria. You must respond with ONLY valid JSON arrays of candidate IDs, no markdown, no explanations.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Very low temperature for consistent, strict results
        max_tokens: 300,
      }),
    });

    const openAIData = await openAIResponse.json();
    console.log('OpenAI strict matching response:', openAIData);

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
      
      // Enhanced fallback with strict matching
      const queryLower = query.toLowerCase();
      
      // Extract specific requirements from query
      const skillsMatch = queryLower.match(/\b(react|angular|vue|python|java|javascript|node\.?js|typescript|sql|mongodb|postgresql|aws|docker|kubernetes|machine learning|ai|ml|data science)\b/g) || [];
      const experienceMatch = queryLower.match(/(\d+)\+?\s*years?/);
      const locationMatch = queryLower.match(/\bin\s+([a-zA-Z\s]+?)(?:\s|$|,)/);
      
      const minExperience = experienceMatch ? parseInt(experienceMatch[1]) : 0;
      const requiredLocation = locationMatch ? locationMatch[1].trim() : null;
      
      console.log('Fallback matching with:', {
        skills: skillsMatch,
        minExperience,
        location: requiredLocation
      });
      
      matchedIds = candidates?.filter(candidate => {
        // Check skills requirement
        if (skillsMatch.length > 0) {
          const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
          const candidateText = [
            candidate.title,
            candidate.summary,
            candidate.resume_content
          ].join(' ').toLowerCase();
          
          const hasAllSkills = skillsMatch.every(skill => 
            candidateSkills.some(cs => cs.includes(skill)) ||
            candidateText.includes(skill)
          );
          
          if (!hasAllSkills) return false;
        }
        
        // Check experience requirement
        if (minExperience > 0 && (!candidate.experience_years || candidate.experience_years < minExperience)) {
          return false;
        }
        
        // Check location requirement
        if (requiredLocation && candidate.location) {
          const candidateLocation = candidate.location.toLowerCase();
          if (!candidateLocation.includes(requiredLocation.toLowerCase())) {
            return false;
          }
        }
        
        return true;
      }).map(c => c.id) || [];
    }

    // Filter candidates based on matched IDs and preserve order
    const matchedCandidates = matchedIds
      .map(id => candidates?.find(c => c.id === id))
      .filter(Boolean);

    console.log(`Strict filtering returned ${matchedCandidates.length} qualifying candidates`);

    return new Response(JSON.stringify({ 
      candidates: matchedCandidates,
      total: matchedCandidates.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in strict ai-candidate-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
