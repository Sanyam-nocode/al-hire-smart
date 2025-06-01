
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

    // Use OpenAI to analyze the query and match candidates
    const prompt = `
You are an AI recruiter assistant. Analyze the search query and return candidate IDs that best match the criteria.

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
`).join('\n---\n')}

Instructions:
1. Analyze the search query for keywords related to skills, experience, location, job titles, salary expectations, etc.
2. Match candidates based on relevance to the query criteria
3. Consider partial matches and related terms (e.g., "React" matches "JavaScript", "Frontend" matches "UI/UX")
4. Return a JSON array of candidate IDs ordered by relevance (best matches first)
5. Include top 10 matches if available
6. If no good matches found, return empty array

Return ONLY a valid JSON array of strings (candidate IDs), nothing else:
["id1", "id2", "id3"]
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
            content: 'You are a helpful AI recruiter assistant. You must respond with ONLY valid JSON arrays of candidate IDs, no markdown, no explanations, no code blocks.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
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
      
      // Fallback to simple text-based search if AI parsing fails
      const queryLower = query.toLowerCase();
      const searchTerms = queryLower.split(' ').filter(term => term.length > 2);
      
      matchedIds = candidates?.filter(candidate => {
        const searchableText = [
          candidate.first_name,
          candidate.last_name,
          candidate.title,
          candidate.location,
          candidate.summary,
          candidate.education,
          ...(candidate.skills || [])
        ].join(' ').toLowerCase();
        
        // Check if any search terms match
        return searchTerms.some(term => searchableText.includes(term));
      }).map(c => c.id) || [];
    }

    // Filter candidates based on matched IDs and preserve order
    const matchedCandidates = matchedIds
      .map(id => candidates?.find(c => c.id === id))
      .filter(Boolean);

    console.log(`Found ${matchedCandidates.length} matching candidates`);

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
