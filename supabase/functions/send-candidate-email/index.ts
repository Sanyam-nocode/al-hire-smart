
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  
  console.log("N8N_WEBHOOK_URL configured:", !!n8nWebhookUrl);
  
  if (!n8nWebhookUrl) {
    console.log("No n8n webhook URL configured, skipping workflow trigger");
    return { success: true, message: "No webhook configured" };
  }

  try {
    console.log("Triggering n8n workflow:", n8nWebhookUrl);
    
    const workflowData = {
      timestamp: new Date().toISOString(),
      triggered_from: "hire_ai_contact_candidate",
      candidate: emailData.candidate,
      email: emailData.email
    };

    console.log("Sending workflow data:", JSON.stringify(workflowData, null, 2));

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowData),
    });

    console.log("n8n response status:", response.status);
    const responseText = await response.text();
    console.log("n8n response body:", responseText);

    if (!response.ok) {
      throw new Error(`n8n webhook failed with status ${response.status}: ${responseText}`);
    }

    console.log("n8n workflow triggered successfully");
    return { success: true, message: "Workflow triggered successfully" };
  } catch (error) {
    console.error("Error triggering n8n workflow:", error);
    return { success: false, error: error.message };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-candidate-email function called");
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.text();
    console.log("Raw request body:", requestBody);
    
    const { candidate, email }: EmailRequest = JSON.parse(requestBody);
    console.log("Parsed request data:", { candidate, email });

    // Validate required fields
    if (!candidate?.email || !email?.subject || !email?.message) {
      console.error("Missing required fields:", { 
        candidateEmail: !!candidate?.email, 
        emailSubject: !!email?.subject, 
        emailMessage: !!email?.message 
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("All required fields present, triggering n8n workflow");

    // Trigger n8n workflow
    const workflowResult = await triggerN8nWorkflow({ candidate, email });
    console.log("Workflow result:", workflowResult);

    const responseData = {
      success: true,
      message: "Email processed successfully",
      workflowTriggered: workflowResult.success,
      workflowMessage: workflowResult.message || workflowResult.error
    };

    console.log("Sending success response:", responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-candidate-email function:", error);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
