// backend/routes/calendar.js
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { getCalendarAuthUrl, handleCalendarCallback } from "../utils/schedulingHelpers.js";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const oauth2Client = new google.auth.OAuth2(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:4000/api/calendar/callback"
);

/* ============================================================
   GET /api/calendar/auth-url
   Get Google Calendar OAuth URL for user to authorize
============================================================ */
router.get("/auth-url", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const authUrl = await getCalendarAuthUrl(userId);

    return res.json({
      success: true,
      authUrl
    });
  } catch (err) {
    console.error("❌ Error generating auth URL:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate auth URL"
    });
  }
});

/* ============================================================
   GET /api/calendar/callback
   Handle OAuth callback from Google
============================================================ */
router.get("/callback", async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>❌ Authorization Failed</h1>
            <p>Missing authorization code or user ID.</p>
            <p><a href="${process.env.FRONTEND_URL}/interviews/tracker">Go back to Interview Tracker</a></p>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    // Get calendar info
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data?.items?.find(cal => cal.primary);

    // Store tokens in database
    const { error } = await supabase
      .from("calendar_connections")
      .upsert({
        user_id: parseInt(userId),
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
        calendar_id: primaryCalendar?.id || "primary",
        calendar_name: primaryCalendar?.summary || "Primary Calendar",
        calendar_timezone: primaryCalendar?.timeZone || "UTC",
        connection_status: "active",
        last_sync_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).send(`
        <html>
          <body>
            <h1>❌ Connection Failed</h1>
            <p>Failed to save calendar connection.</p>
            <p><a href="${process.env.FRONTEND_URL}/interviews/tracker">Go back to Interview Tracker</a></p>
          </body>
        </html>
      `);
    }

    console.log(`✅ Calendar connected for user ${userId}`);
    
    // Redirect back to frontend with success
    return res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #4f22ea 0%, #6366f1 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            h1 { color: #4f22ea; margin: 0 0 20px; }
            p { color: #666; margin: 20px 0; }
            .button {
              display: inline-block;
              background: #4f22ea;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 20px;
            }
            .button:hover { background: #3d1ab8; }
          </style>
          <script>
            setTimeout(() => {
              window.close();
              window.location.href = '${process.env.FRONTEND_URL}/interviews/tracker';
            }, 2000);
          </script>
        </head>
        <body>
          <div class="container">
            <h1>✅ Calendar Connected!</h1>
            <p>Your Google Calendar has been successfully connected.</p>
            <p>Redirecting back to Interview Tracker...</p>
            <a href="${process.env.FRONTEND_URL}/interviews/tracker" class="button">Go to Interview Tracker</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ OAuth callback error:", err);
    return res.status(500).send(`
      <html>
        <body>
          <h1>❌ Authorization Failed</h1>
          <p>Error: ${err.message}</p>
          <p><a href="${process.env.FRONTEND_URL}/interviews/tracker">Go back to Interview Tracker</a></p>
        </body>
      </html>
    `);
  }
});

/* ============================================================
   GET /api/calendar/status
   Check if user has calendar connected
============================================================ */
router.get("/status", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", parseInt(userId))
      .single();

    return res.json({
      success: true,
      connected: !!connection,
      connection: connection ? {
        provider: connection.provider,
        calendarName: connection.calendar_name,
        status: connection.connection_status
      } : null
    });
  } catch (err) {
    console.error("❌ Error checking calendar status:", err);
    return res.json({
      success: true,
      connected: false
    });
  }
});

/* ============================================================
   DELETE /api/calendar/disconnect
   Disconnect user's calendar
============================================================ */
router.delete("/disconnect", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const { error } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("user_id", parseInt(userId));

    if (error) {
      console.error("❌ Error disconnecting calendar:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to disconnect calendar"
      });
    }

    console.log(`✅ Calendar disconnected for user ${userId}`);

    return res.json({
      success: true,
      message: "Calendar disconnected successfully"
    });
  } catch (err) {
    console.error("❌ Error disconnecting calendar:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect calendar"
    });
  }
});

export default router;