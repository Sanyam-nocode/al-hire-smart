
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  candidate: {
    id: string;
    name: string;
    email: string;
    title?: string;
  };
  email: {
    subject: string;
    message: string;
  };
}

const triggerN8nWorkflow = async (emailData: EmailRequest) => {
  const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  
  if (!n8nWebhookUrl) {
    console.log("No n8n webhook URL configured, skipping workflow trigger");
    return;
  }

  try {
    console.log("Triggering n8n workflow:", n8nWebhookUrl);
    
    const workflowData = {
      timestamp: new Date().toISOString(),
      triggered_from: "hire_ai_contact_candidate",
      candidate: emailData.candidate,
      email: emailData.email
    };

    await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowData),
    });

    console.log("n8n workflow triggered successfully");
  } catch (error) {
    console.error("Error triggering n8n workflow:", error);
    // Don't throw error as this is a background process
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidate, email }: EmailRequest = await req.json();

    // Validate required fields
    if (!candidate?.email || !email?.subject || !email?.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Trigger n8n workflow in the background
    await triggerN8nWorkflow({ candidate, email });

    return new Response(
      JSON.stringify({ success: true, message: "Email processed and workflow triggered" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-candidate-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
