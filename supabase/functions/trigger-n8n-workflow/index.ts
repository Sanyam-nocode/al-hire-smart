
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkflowTriggerRequest {
  workflowType: "outreach" | "demo-booking" | "follow-up" | "nurture";
  candidateId?: string;
  templateId: string;
  data: Record<string, any>;
  n8nWebhookUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== n8n Workflow Trigger function called ===");
  console.log("Request method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      workflowType,
      candidateId,
      templateId,
      data,
      n8nWebhookUrl
    }: WorkflowTriggerRequest = await req.json();

    console.log("=== Workflow trigger data ===");
    console.log("Workflow type:", workflowType);
    console.log("Candidate ID:", candidateId);
    console.log("Template ID:", templateId);
    console.log("n8n Webhook URL:", n8nWebhookUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // If candidateId is provided, fetch candidate data
    let candidateData = null;
    if (candidateId) {
      console.log("Fetching candidate data...");
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) {
        console.error("Error fetching candidate:", candidateError);
        throw new Error("Failed to fetch candidate data");
      }

      candidateData = candidate;
      console.log("Candidate data fetched:", candidateData?.first_name, candidateData?.last_name);
    }

    // Prepare payload for n8n
    const n8nPayload = {
      trigger: "lovable_workflow",
      workflowType,
      candidateData,
      templateId,
      customData: data,
      timestamp: new Date().toISOString(),
      source: "hire-al-platform"
    };

    console.log("=== Sending to n8n ===");
    console.log("Payload size:", JSON.stringify(n8nPayload).length);

    // Trigger n8n workflow
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    console.log("n8n response status:", n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n webhook error:", errorText);
      throw new Error(`n8n webhook failed: ${n8nResponse.status}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log("n8n response:", n8nResult);

    // Log the workflow execution
    const { error: logError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_type: workflowType,
        candidate_id: candidateId,
        template_id: templateId,
        status: 'triggered',
        n8n_response: n8nResult,
        triggered_at: new Date().toISOString()
      });

    if (logError) {
      console.error("Error logging workflow execution:", logError);
    }

    console.log("✅ Workflow triggered successfully!");

    return new Response(JSON.stringify({ 
      success: true,
      workflowType,
      n8nResult,
      message: "Workflow triggered successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in trigger-n8n-workflow function:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Check server logs for more information"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
