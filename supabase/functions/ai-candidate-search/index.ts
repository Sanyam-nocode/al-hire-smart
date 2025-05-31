
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
    You are an AI recruiter assistant. Analyze the following search query and return the IDs of candidates that best match the criteria.

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
    `).join('\n---\n')}

    Instructions:
    1. Analyze the search query for keywords related to skills, experience, location, job titles, etc.
    2. Match candidates based on relevance to the query
    3. Return ONLY a JSON array of candidate IDs that match, ordered by relevance (best matches first)
    4. Include at least the top 5 matches if available, but no more than 20
    5. If no good matches, return an empty array

    Response format: ["id1", "id2", "id3", ...]
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
          { role: 'system', content: 'You are a helpful AI recruiter assistant that matches job candidates to search queries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
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
      const content = openAIData.choices[0].message.content.trim();
      matchedIds = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback to simple text search if AI parsing fails
      const queryLower = query.toLowerCase();
      matchedIds = candidates?.filter(candidate => {
        const searchText = `${candidate.first_name} ${candidate.last_name} ${candidate.title} ${candidate.location} ${candidate.skills?.join(' ')} ${candidate.summary}`.toLowerCase();
        return searchText.includes(queryLower);
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
