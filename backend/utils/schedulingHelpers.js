import { google } from "googleapis";
import { Resend } from "resend";
import dotenv from "dotenv";
import { logApiUsage, logApiError } from "./apiTrackingService.js";

dotenv.config();

/* ============================================================
   GOOGLE CALENDAR HELPER
   Functions for syncing interviews to Google Calendar
============================================================ */

const oauth2Client = new google.auth.OAuth2(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET || "",
  "http://localhost:4000/api/calendar/callback"
);

export async function getCalendarAuthUrl(userId) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ],
    state: userId.toString(),
    prompt: "consent"
  });
  return authUrl;
}

export async function handleCalendarCallback(code, supabase) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (err) {
    console.error("❌ Calendar OAuth error:", err);
    throw err;
  }
}

export async function syncToGoogleCalendar(interview, supabase) {
  try {
    // Get user's calendar connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", interview.user_id)
      .single();

    if (!connection) {
      console.log("⚠️ No calendar connection for user", interview.user_id);
      return null;
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    
    if (now >= expiresAt && connection.refresh_token) {
      // Refresh token
      oauth2Client.setCredentials({
        refresh_token: connection.refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens
      await supabase
        .from("calendar_connections")
        .update({
          access_token: credentials.access_token,
          token_expires_at: new Date(credentials.expiry_date).toISOString()
        })
        .eq("user_id", interview.user_id);

      oauth2Client.setCredentials(credentials);
    } else {
      oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token
      });
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Combine date and time
    const startDateTime = new Date(`${interview.interview_date}T${interview.interview_time || '00:00:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + (interview.duration_minutes || 60) * 60 * 1000);

    const event = {
      summary: `Interview: ${interview.role} at ${interview.company}`,
      description: `${interview.interview_type || 'Interview'} - Round ${interview.interview_round || 1}\n\n${interview.notes || ''}${interview.video_link ? `\n\nJoin: ${interview.video_link}` : ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: connection.calendar_timezone || 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: connection.calendar_timezone || 'UTC'
      },
      location: interview.location_address || interview.video_link || "",
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 120 },
          { method: "popup", minutes: 1440 }
        ]
      }
    };

    // Create or update event
    if (interview.google_calendar_event_id) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId: connection.calendar_id || "primary",
        eventId: interview.google_calendar_event_id,
        requestBody: event
      });
      console.log(`✅ Updated calendar event ${response.data.id}`);
      return response.data.id;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: connection.calendar_id || "primary",
        requestBody: event
      });
      console.log(`✅ Created calendar event ${response.data.id}`);
      return response.data.id;
    }
  } catch (err) {
    console.error("❌ Calendar sync error:", err);
    throw err;
  }
}

export async function deleteFromGoogleCalendar(eventId, userId, supabase) {
  try {
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!connection || !eventId) return;

    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: connection.calendar_id || "primary",
      eventId: eventId
    });

    console.log(`✅ Deleted calendar event ${eventId}`);
  } catch (err) {
    console.error("❌ Calendar delete error:", err);
  }
}

/* ============================================================
   RESEND EMAIL HELPER
   Functions for sending email reminders
============================================================ */

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInterviewReminder(interview, userEmail, reminderType) {
  try {
    const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time || '00:00:00'}`);
    const timeString = interviewDateTime.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = reminderType === '24h' 
      ? `Interview Tomorrow: ${interview.company}` 
      : `Interview Starting Soon: ${interview.company}`;

    const message = reminderType === '24h'
      ? `Your ${interview.interview_type || 'interview'} with ${interview.company} for the ${interview.role} position is scheduled for tomorrow at ${interviewDateTime.toLocaleTimeString()}.`
      : `Your ${interview.interview_type || 'interview'} with ${interview.company} starts in 2 hours at ${interviewDateTime.toLocaleTimeString()}. Time to get ready!`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f22ea 0%, #6366f1 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .interview-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f22ea; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: 600; color: #6b7280; }
          .button { display: inline-block; background: #4f22ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📅 ${subject}</h1>
          </div>
          <div class="content">
            <p>${message}</p>
            
            <div class="interview-details">
              <h3 style="margin-top: 0; color: #4f22ea;">Interview Details</h3>
              <div class="detail-row">
                <span class="label">Company:</span>
                <span>${interview.company}</span>
              </div>
              <div class="detail-row">
                <span class="label">Role:</span>
                <span>${interview.role}</span>
              </div>
              <div class="detail-row">
                <span class="label">Type:</span>
                <span>${interview.interview_type || 'Interview'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date & Time:</span>
                <span>${timeString}</span>
              </div>
              ${interview.video_link ? `
                <div class="detail-row">
                  <span class="label">Join Link:</span>
                  <span><a href="${interview.video_link}" style="color: #4f22ea;">${interview.video_link}</a></span>
                </div>
              ` : ''}
              ${interview.location_address ? `
                <div class="detail-row">
                  <span class="label">Location:</span>
                  <span>${interview.location_address}</span>
                </div>
              ` : ''}
              ${interview.interviewer_name ? `
                <div class="detail-row">
                  <span class="label">Interviewer:</span>
                  <span>${interview.interviewer_name}${interview.interviewer_email ? ` (${interview.interviewer_email})` : ''}</span>
                </div>
              ` : ''}
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/interviews/tracker" class="button">
                View Interview Details
              </a>
            </div>

            <div class="footer">
              <p>Good luck with your interview! 🚀</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const startTime = Date.now();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: subject,
      html: htmlContent
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage (userId not available in this context - it's a helper function)
    try {
      if (error) {
        await logApiError({
          serviceName: 'resend',
          endpoint: '/emails/send',
          userId: null, // Helper function doesn't have userId context
          errorType: 'api_error',
          errorMessage: error.message || 'Email send failed',
          statusCode: error.statusCode || 500,
          requestPayload: { from: process.env.EMAIL_FROM, to: userEmail, purpose: 'interview_reminder', reminderType }
        });
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: null,
          requestPayload: { to: userEmail, purpose: 'interview_reminder', reminderType },
          responseStatus: error.statusCode || 500,
          responseTimeMs,
          success: false
        });
      } else {
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: null,
          requestPayload: { to: userEmail, purpose: 'interview_reminder', reminderType },
          responseStatus: 200,
          responseTimeMs,
          success: true
        });
      }
    } catch (trackErr) {
      console.warn("Failed to track Resend API call:", trackErr);
    }

    if (error) {
      console.error("❌ Resend error:", error);
      throw error;
    }

    console.log(`✅ Sent ${reminderType} reminder email to ${userEmail}`);
    return data;
  } catch (err) {
    console.error("❌ Email send error:", err);
    throw err;
  }
}

export async function sendInterviewConfirmation(interview, userEmail) {
  try {
    const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time || '00:00:00'}`);
    
    const startTime = Date.now();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: `Interview Scheduled: ${interview.company}`,
      html: `
        <h2>Interview Scheduled Successfully! 📅</h2>
        <p>Your interview with <strong>${interview.company}</strong> has been scheduled.</p>
        <p><strong>Date:</strong> ${interviewDateTime.toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${interviewDateTime.toLocaleTimeString()}</p>
        <p><strong>Role:</strong> ${interview.role}</p>
        ${interview.video_link ? `<p><strong>Join Link:</strong> <a href="${interview.video_link}">${interview.video_link}</a></p>` : ''}
        <p>You'll receive reminders 24 hours and 2 hours before the interview.</p>
        <p>Good luck! 🚀</p>
      `
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage (userId not available in this context)
    try {
      if (error) {
        await logApiError({
          serviceName: 'resend',
          endpoint: '/emails/send',
          userId: null,
          errorType: 'api_error',
          errorMessage: error.message || 'Email send failed',
          statusCode: error.statusCode || 500,
          requestPayload: { from: process.env.EMAIL_FROM, to: userEmail, purpose: 'interview_confirmation' }
        });
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: null,
          requestPayload: { to: userEmail, purpose: 'interview_confirmation' },
          responseStatus: error.statusCode || 500,
          responseTimeMs,
          success: false
        });
      } else {
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: null,
          requestPayload: { to: userEmail, purpose: 'interview_confirmation' },
          responseStatus: 200,
          responseTimeMs,
          success: true
        });
      }
    } catch (trackErr) {
      console.warn("Failed to track Resend API call:", trackErr);
    }

    if (error) throw error;
    
    console.log(`✅ Sent confirmation email to ${userEmail}`);
    return data;
  } catch (err) {
    console.error("❌ Confirmation email error:", err);
  }
}