
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

// Ultra-strict matching functions
function extractRequiredSkills(query: string): string[] {
  const queryLower = query.toLowerCase();
  const skillPatterns = [
    /\breact\b/g,
    /\bangular\b/g,
    /\bvue\b/g,
    /\bpython\b/g,
    /\bjava\b(?!\s*script)/g,
    /\bjavascript\b/g,
    /\bnode\.?js\b/g,
    /\btypescript\b/g,
    /\bsql\b/g,
    /\bmongodb\b/g,
    /\bpostgresql\b/g,
    /\baws\b/g,
    /\bdocker\b/g,
    /\bkubernetes\b/g,
    /\bmachine learning\b/g,
    /\bai\b/g,
    /\bml\b/g,
    /\bdata science\b/g,
    /\bphp\b/g,
    /\bruby\b/g,
    /\bgo\b/g,
    /\brust\b/g,
    /\bc\+\+\b/g,
    /\bc#\b/g,
    /\bswift\b/g,
    /\bkotlin\b/g,
    /\bgraphql\b/g,
    /\bredis\b/g,
    /\belasticsearch\b/g,
    /\bspring\b/g,
    /\bdjango\b/g,
    /\bflask\b/g,
    /\bexpress\b/g,
    /\bnext\.?js\b/g,
    /\bnuxt\b/g,
    /\btailwind\b/g,
    /\bbootstrap\b/g,
    /\bhtml\b/g,
    /\bcss\b/g,
    /\bsass\b/g,
    /\bless\b/g
  ];
  
  const foundSkills: string[] = [];
  skillPatterns.forEach(pattern => {
    const matches = queryLower.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const normalizedSkill = match.trim();
        if (!foundSkills.includes(normalizedSkill)) {
          foundSkills.push(normalizedSkill);
        }
      });
    }
  });
  
  return foundSkills;
}

function extractExperienceRequirement(query: string): number | null {
  const experiencePattern = /(\d+)\+?\s*years?\s*(of\s+)?experience/i;
  const match = query.match(experiencePattern);
  return match ? parseInt(match[1]) : null;
}

function extractLocationRequirement(query: string): string | null {
  const locationPatterns = [
    /\bin\s+([a-zA-Z\s,]+?)(?:\s|$|,|\band\b|\bwith\b|\bwho\b)/i,
    /\bfrom\s+([a-zA-Z\s,]+?)(?:\s|$|,|\band\b|\bwith\b|\bwho\b)/i,
    /\blocated\s+in\s+([a-zA-Z\s,]+?)(?:\s|$|,|\band\b|\bwith\b|\bwho\b)/i,
    /\bbased\s+in\s+([a-zA-Z\s,]+?)(?:\s|$|,|\band\b|\bwith\b|\bwho\b)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function candidateHasSkill(candidate: any, requiredSkill: string): boolean {
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
  const candidateText = [
    candidate.title || '',
    candidate.summary || '',
    candidate.resume_content || ''
  ].join(' ').toLowerCase();
  
  // Check exact skill match or skill contained in text
  const hasSkillInArray = candidateSkills.some(skill => 
    skill === requiredSkill || skill.includes(requiredSkill)
  );
  
  // For critical skills like React, be extra strict
  if (requiredSkill === 'react') {
    return hasSkillInArray || candidateText.includes('react') || candidateText.includes('reactjs');
  }
  
  return hasSkillInArray || candidateText.includes(requiredSkill);
}

function candidateMeetsExperience(candidate: any, minExperience: number): boolean {
  if (!candidate.experience_years) return false;
  return candidate.experience_years >= minExperience;
}

function candidateMeetsLocation(candidate: any, requiredLocation: string): boolean {
  if (!candidate.location) return false;
  const candidateLocation = candidate.location.toLowerCase();
  const normalizedRequired = requiredLocation.toLowerCase().trim();
  return candidateLocation.includes(normalizedRequired);
}

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

    console.log('Processing ULTRA-STRICT AI search query:', query);

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

    // Extract requirements using our strict functions
    const requiredSkills = extractRequiredSkills(query);
    const minExperience = extractExperienceRequirement(query);
    const requiredLocation = extractLocationRequirement(query);

    console.log('Extracted requirements:', {
      skills: requiredSkills,
      experience: minExperience,
      location: requiredLocation
    });

    // Strict local filtering first
    let matchedCandidates = candidates?.filter(candidate => {
      console.log(`\n--- Evaluating ${candidate.first_name} ${candidate.last_name} ---`);
      
      // Check ALL required skills
      if (requiredSkills.length > 0) {
        for (const skill of requiredSkills) {
          if (!candidateHasSkill(candidate, skill)) {
            console.log(`❌ Missing skill: ${skill}`);
            console.log(`Candidate skills:`, candidate.skills);
            return false;
          }
        }
        console.log(`✅ Has all required skills: ${requiredSkills.join(', ')}`);
      }
      
      // Check experience requirement
      if (minExperience !== null) {
        if (!candidateMeetsExperience(candidate, minExperience)) {
          console.log(`❌ Insufficient experience: ${candidate.experience_years || 0} < ${minExperience}`);
          return false;
        }
        console.log(`✅ Meets experience requirement: ${candidate.experience_years} >= ${minExperience}`);
      }
      
      // Check location requirement
      if (requiredLocation) {
        if (!candidateMeetsLocation(candidate, requiredLocation)) {
          console.log(`❌ Location mismatch: "${candidate.location}" doesn't contain "${requiredLocation}"`);
          return false;
        }
        console.log(`✅ Meets location requirement: ${candidate.location}`);
      }
      
      console.log(`✅ ${candidate.first_name} ${candidate.last_name} meets ALL requirements`);
      return true;
    }) || [];

    console.log(`Strict local filtering: ${matchedCandidates.length} candidates passed`);

    // If we have too many results, use AI for final ranking and selection
    if (matchedCandidates.length > 10) {
      const aiPrompt = `
You are a strict AI recruiter. You have ${matchedCandidates.length} candidates who have already passed initial filtering for the query: "${query}"

Your job is to rank these candidates and return the TOP 10 most relevant ones.

Requirements extracted:
- Skills: ${requiredSkills.join(', ') || 'None specified'}
- Experience: ${minExperience ? `${minExperience}+ years` : 'None specified'}
- Location: ${requiredLocation || 'None specified'}

ALL candidates below already meet the basic requirements. Rank them by:
1. How closely their skills match the requirements
2. Experience level relevance
3. Overall profile quality

Return ONLY a JSON array of the TOP 10 candidate IDs in order of relevance:
["id1", "id2", "id3", ...]

Candidates to rank:
${matchedCandidates.map(candidate => `
ID: ${candidate.id}
Name: ${candidate.first_name} ${candidate.last_name}
Title: ${candidate.title || 'Not specified'}
Skills: ${candidate.skills ? candidate.skills.join(', ') : 'Not specified'}
Experience: ${candidate.experience_years || 0} years
Summary: ${candidate.summary ? candidate.summary.substring(0, 200) : 'Not specified'}
`).join('\n---\n')}
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
              content: 'You are a strict AI recruiter ranking pre-filtered candidates. Return ONLY valid JSON arrays of candidate IDs.' 
            },
            { role: 'user', content: aiPrompt }
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      const openAIData = await openAIResponse.json();
      console.log('AI ranking response:', openAIData);

      if (openAIData.choices && openAIData.choices[0]) {
        try {
          let content = openAIData.choices[0].message.content.trim();
          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const rankedIds = JSON.parse(content);
          
          if (Array.isArray(rankedIds)) {
            matchedCandidates = rankedIds
              .slice(0, 10)
              .map(id => matchedCandidates.find(c => c.id === id))
              .filter(Boolean);
          }
        } catch (parseError) {
          console.error('Error parsing AI ranking:', parseError);
          // Fall back to first 10 from our strict filtering
          matchedCandidates = matchedCandidates.slice(0, 10);
        }
      } else {
        matchedCandidates = matchedCandidates.slice(0, 10);
      }
    }

    console.log(`Final result: ${matchedCandidates.length} candidates who meet ALL criteria`);
    
    // Log each final candidate for verification
    matchedCandidates.forEach(candidate => {
      console.log(`✅ Final candidate: ${candidate.first_name} ${candidate.last_name}`);
      console.log(`   Skills: ${candidate.skills ? candidate.skills.join(', ') : 'None'}`);
      console.log(`   Experience: ${candidate.experience_years || 0} years`);
      console.log(`   Location: ${candidate.location || 'Not specified'}`);
    });

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
