
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookingId, 
      firstName, 
      lastName, 
      email, 
      company, 
      demoDate, 
      demoTime, 
      timezone 
    }: DemoInviteRequest = await req.json();

    // Generate meeting URL (using a placeholder for now - you can integrate with Zoom, Google Meet, etc.)
    const meetingUrl = `https://meet.google.com/demo-${bookingId.substring(0, 8)}`;

    // Create calendar event in ICS format
    const startDateTime = new Date(`${demoDate}T${convertTo24Hour(demoTime)}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes

    const icsContent = createICSContent({
      startDateTime,
      endDateTime,
      title: `Hire Al Demo - ${company}`,
      description: `Demo session for ${firstName} ${lastName} from ${company}`,
      location: meetingUrl,
      attendeeEmail: email,
      attendeeName: `${firstName} ${lastName}`
    });

    // Send confirmation email with calendar invite
    const emailResponse = await resend.emails.send({
      from: "Hire Al <demo@hireal.ai>",
      to: [email],
      subject: `Your Hire Al Demo is Confirmed - ${formatDate(demoDate)} at ${demoTime} ${timezone}`,
      html: createEmailHTML({
        firstName,
        lastName,
        company,
        demoDate,
        demoTime,
        timezone,
        meetingUrl
      }),
      attachments: [
        {
          filename: "demo-invite.ics",
          content: Buffer.from(icsContent).toString('base64'),
          content_type: "text/calendar",
        },
      ],
    });

    console.log("Demo invite sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      meetingUrl,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-demo-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours}:${minutes}:00`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function createICSContent(params: {
  startDateTime: Date;
  endDateTime: Date;
  title: string;
  description: string;
  location: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const { startDateTime, endDateTime, title, description, location, attendeeEmail, attendeeName } = params;
  
  const formatDateTime = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hire Al//Demo Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDateTime(startDateTime)}
DTEND:${formatDateTime(endDateTime)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
ORGANIZER;CN=Hire Al:MAILTO:demo@hireal.ai
ATTENDEE;CN=${attendeeName};RSVP=TRUE:MAILTO:${attendeeEmail}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

function createEmailHTML(params: {
  firstName: string;
  lastName: string;
  company: string;
  demoDate: string;
  demoTime: string;
  timezone: string;
  meetingUrl: string;
}): string {
  const { firstName, lastName, company, demoDate, demoTime, timezone, meetingUrl } = params;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Hire Al Demo is Confirmed</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .meeting-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Your Demo is Confirmed!</h1>
          <p>We're excited to show you how Hire Al can transform your recruitment process</p>
        </div>
        
        <div class="content">
          <h2>Hi ${firstName}!</h2>
          
          <p>Thank you for booking a demo with Hire Al. We're looking forward to showing you how our AI-powered platform can help ${company} find the perfect candidates faster than ever.</p>
          
          <div class="meeting-details">
            <h3>📅 Meeting Details</h3>
            <p><strong>Date:</strong> ${formatDate(demoDate)}</p>
            <p><strong>Time:</strong> ${demoTime} ${timezone}</p>
            <p><strong>Duration:</strong> 30 minutes</p>
            <p><strong>Attendee:</strong> ${firstName} ${lastName}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${meetingUrl}" class="button">Join Demo Meeting</a>
          </div>
          
          <h3>What to Expect:</h3>
          <ul>
            <li><strong>Personalized Demo:</strong> We'll tailor the demo to your specific recruiting needs and challenges</li>
            <li><strong>AI Search in Action:</strong> See how natural language search finds perfect candidates instantly</li>
            <li><strong>Integration Overview:</strong> Learn how Hire Al fits into your existing workflow</li>
            <li><strong>Q&A Session:</strong> Get answers to all your questions about features, pricing, and implementation</li>
          </ul>
          
          <p><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
          
          <p>A calendar invite is attached to this email. Please add it to your calendar so you don't miss our meeting!</p>
          
          <h3>Before Our Meeting:</h3>
          <p>Feel free to think about specific use cases or challenges you'd like us to address during the demo. The more specific you can be, the more valuable our session will be for you.</p>
          
          <p>If you need to reschedule or have any questions, please reply to this email or contact our team.</p>
          
          <p>Looking forward to speaking with you!</p>
          
          <p>Best regards,<br>
          The Hire Al Team</p>
        </div>
        
        <div class="footer">
          <p>Hire Al - AI-Powered Recruitment Platform</p>
          <p>This meeting will be conducted via video conference. Please ensure you have a stable internet connection.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
