
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DemoInviteRequest {
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  demoDate: string;
  demoTime: string;
  timezone: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Demo invite function called ===");
  console.log("Request method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body...");
    const requestBody = await req.text();
    console.log("Raw request body:", requestBody);
    
    const parsedBody = JSON.parse(requestBody);
    console.log("Parsed request body:", parsedBody);

    const { 
      bookingId, 
      firstName, 
      lastName, 
      email, 
      company, 
      demoDate, 
      demoTime, 
      timezone 
    }: DemoInviteRequest = parsedBody;

    console.log("=== Demo invite data ===");
    console.log("Booking ID:", bookingId);
    console.log("Name:", firstName, lastName);
    console.log("Email:", email);
    console.log("Company:", company);
    console.log("Demo Date:", demoDate);
    console.log("Demo Time:", demoTime);
    console.log("Timezone:", timezone);

    // Generate meeting URL (using a placeholder for now - you can integrate with Zoom, Google Meet, etc.)
    const meetingUrl = `https://meet.google.com/demo-${bookingId.substring(0, 8)}`;
    console.log("Generated meeting URL:", meetingUrl);

    console.log("✅ Demo invite processed successfully!");
    console.log("Meeting URL generated:", meetingUrl);
    console.log("Email sending will be handled by n8n workflow");

    return new Response(JSON.stringify({ 
      success: true, 
      meetingUrl,
      message: "Demo invite processed successfully - email will be sent via n8n workflow"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-demo-invite function:", error);
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
