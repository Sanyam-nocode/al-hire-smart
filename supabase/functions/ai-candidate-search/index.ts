
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

// New weighted ranking function
function calculateCandidateScore(candidate: any, requiredSkills: string[], minExperience: number | null, requiredLocation: string | null): number {
  const criteria: Array<{ weight: number; score: number; name: string }> = [];
  
  // Skills scoring (each skill gets equal weight if multiple skills required)
  if (requiredSkills.length > 0) {
    const skillWeight = 1.0 / (requiredSkills.length + (minExperience ? 1 : 0) + (requiredLocation ? 1 : 0));
    
    requiredSkills.forEach(skill => {
      let skillScore = 0;
      
      // Calculate skill match quality (0-1 scale)
      const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
      const candidateText = [
        candidate.title || '',
        candidate.summary || '',
        candidate.resume_content || ''
      ].join(' ').toLowerCase();
      
      // Exact match in skills array gets highest score
      if (candidateSkills.some(s => s === skill)) {
        skillScore = 1.0;
      } else if (candidateSkills.some(s => s.includes(skill))) {
        skillScore = 0.8;
      } else if (candidateText.includes(skill)) {
        skillScore = 0.6;
      }
      
      criteria.push({ weight: skillWeight, score: skillScore, name: `skill_${skill}` });
    });
  }
  
  // Experience scoring
  if (minExperience !== null) {
    const experienceWeight = 1.0 / (requiredSkills.length + 1 + (requiredLocation ? 1 : 0));
    let experienceScore = 0;
    
    if (candidate.experience_years) {
      if (candidate.experience_years >= minExperience) {
        // Score based on how much experience exceeds minimum (capped at 2x minimum for scoring)
        const maxExperienceForScoring = minExperience * 2;
        const normalizedExperience = Math.min(candidate.experience_years, maxExperienceForScoring);
        experienceScore = normalizedExperience / maxExperienceForScoring;
      }
    }
    
    criteria.push({ weight: experienceWeight, score: experienceScore, name: 'experience' });
  }
  
  // Location scoring
  if (requiredLocation) {
    const locationWeight = 1.0 / (requiredSkills.length + (minExperience ? 1 : 0) + 1);
    let locationScore = 0;
    
    if (candidate.location) {
      const candidateLocation = candidate.location.toLowerCase();
      const normalizedRequired = requiredLocation.toLowerCase().trim();
      
      if (candidateLocation.includes(normalizedRequired)) {
        locationScore = 1.0;
      }
    }
    
    criteria.push({ weight: locationWeight, score: locationScore, name: 'location' });
  }
  
  // Calculate weighted average
  const weightedSum = criteria.reduce((sum, criterion) => sum + (criterion.weight * criterion.score), 0);
  
  console.log(`Score calculation for ${candidate.first_name} ${candidate.last_name}:`);
  criteria.forEach(criterion => {
    console.log(`  ${criterion.name}: weight=${criterion.weight.toFixed(3)}, score=${criterion.score.toFixed(3)}, contribution=${(criterion.weight * criterion.score).toFixed(3)}`);
  });
  console.log(`  Total weighted score: ${weightedSum.toFixed(3)}`);
  
  return weightedSum;
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

    console.log('Processing ULTRA-STRICT AI search query with weighted ranking:', query);

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

    // Calculate weighted scores for all matched candidates
    const candidatesWithScores = matchedCandidates.map(candidate => ({
      ...candidate,
      weightedScore: calculateCandidateScore(candidate, requiredSkills, minExperience, requiredLocation)
    }));

    // Sort by weighted score (highest first) and assign rankings
    candidatesWithScores.sort((a, b) => b.weightedScore - a.weightedScore);
    
    const rankedCandidates = candidatesWithScores.map((candidate, index) => ({
      ...candidate,
      ranking: index + 1
    }));

    console.log('\n=== FINAL WEIGHTED RANKINGS ===');
    rankedCandidates.forEach(candidate => {
      console.log(`Rank ${candidate.ranking}: ${candidate.first_name} ${candidate.last_name} - Score: ${candidate.weightedScore.toFixed(3)}`);
      console.log(`  Skills: ${candidate.skills ? candidate.skills.join(', ') : 'None'}`);
      console.log(`  Experience: ${candidate.experience_years || 0} years`);
      console.log(`  Location: ${candidate.location || 'Not specified'}`);
    });

    // Limit to top 10 for display
    const finalResults = rankedCandidates.slice(0, 10);

    console.log(`Final result: ${finalResults.length} top-ranked candidates`);

    return new Response(JSON.stringify({ 
      candidates: finalResults,
      total: finalResults.length,
      totalMatched: matchedCandidates.length
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
