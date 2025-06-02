
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PreScreenRequest {
  candidateId: string;
  resumeContent: string;
  candidateProfile: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabase
      .from('recruiter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (recruiterError || !recruiterProfile) {
      console.log('Recruiter profile not found:', recruiterError)
      return new Response(
        JSON.stringify({ error: 'Recruiter profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { candidateId, resumeContent, candidateProfile }: PreScreenRequest = await req.json()

    console.log('Processing pre-screening for candidate:', candidateId)

    // Call OpenAI for resume analysis
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `
    Analyze this candidate's resume and profile for background verification and pre-screening:

    CANDIDATE PROFILE:
    Name: ${candidateProfile.first_name} ${candidateProfile.last_name}
    Title: ${candidateProfile.title || 'Not specified'}
    Location: ${candidateProfile.location || 'Not specified'}
    Experience Years: ${candidateProfile.experience_years || 'Not specified'}
    Skills: ${candidateProfile.skills?.join(', ') || 'Not specified'}
    Education: ${candidateProfile.education || 'Not specified'}

    RESUME CONTENT:
    ${resumeContent || 'No resume content available'}

    Please provide:
    1. VERIFICATION FLAGS: List any potential red flags, inconsistencies, or areas that need verification (employment gaps, skill mismatches, etc.)
    2. SCREENING QUESTIONS: Generate 5-7 relevant pre-screening questions based on their background

    Respond in JSON format:
    {
      "flags": [
        {
          "type": "employment_gap|skill_mismatch|education_verification|experience_inconsistency|other",
          "severity": "low|medium|high",
          "description": "Description of the flag",
          "recommendation": "What action to take"
        }
      ],
      "questions": [
        {
          "category": "technical|behavioral|experience|education|availability",
          "question": "The screening question",
          "importance": "low|medium|high",
          "expectedAnswerType": "text|yes_no|multiple_choice"
        }
      ]
    }
    `

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR professional and background verification specialist. Analyze resumes and profiles to identify potential red flags and generate relevant pre-screening questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const analysisContent = openaiData.choices[0].message.content

    console.log('OpenAI analysis completed')

    let analysisResult
    try {
      analysisResult = JSON.parse(analysisContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      throw new Error('Invalid AI response format')
    }

    // Save pre-screening results to database
    const { data: preScreen, error: insertError } = await supabase
      .from('pre_screens')
      .insert({
        candidate_id: candidateId,
        recruiter_id: recruiterProfile.id,
        questions: analysisResult.questions || [],
        flags: analysisResult.flags || [],
        status: 'completed'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save pre-screening results:', insertError)
      throw new Error('Failed to save pre-screening results')
    }

    console.log('Pre-screening completed and saved:', preScreen.id)

    return new Response(
      JSON.stringify({
        success: true,
        preScreenId: preScreen.id,
        flags: analysisResult.flags || [],
        questions: analysisResult.questions || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in AI candidate pre-screening:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
