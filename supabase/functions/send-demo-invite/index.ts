
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

    // Create calendar event details
    const eventStart = new Date(`${demoDate}T${convertTo24Hour(demoTime)}`);
    const eventEnd = new Date(eventStart.getTime() + 30 * 60000); // 30 minutes later
    
    console.log("Event start time:", eventStart.toISOString());
    console.log("Event end time:", eventEnd.toISOString());

    // In a real implementation, you would send an actual email here
    // For now, we'll just log the email content that would be sent
    const emailContent = {
      to: email,
      subject: `Demo Scheduled - ${company}`,
      html: `
        <h2>Your Demo is Scheduled!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for booking a demo with Hire AI. Your personalized demo is scheduled for:</p>
        <ul>
          <li><strong>Date:</strong> ${demoDate}</li>
          <li><strong>Time:</strong> ${demoTime} ${timezone}</li>
          <li><strong>Duration:</strong> 30 minutes</li>
        </ul>
        <p><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
        <p>We're excited to show you how Hire AI can transform your recruitment process!</p>
        <p>Best regards,<br>The Hire AI Team</p>
      `
    };

    console.log("Email content that would be sent:", emailContent);
    console.log("✅ Demo invite processed successfully!");
    console.log("Meeting URL generated:", meetingUrl);
    console.log("Email content prepared (actual sending handled by n8n workflow)");

    return new Response(JSON.stringify({ 
      success: true, 
      meetingUrl,
      message: "Demo invite processed successfully - email will be sent via n8n workflow",
      emailPreview: emailContent
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

// Helper function to convert time to 24-hour format
function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

serve(handler);
