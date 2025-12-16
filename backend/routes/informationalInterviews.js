import express from "express";
import { createClient } from "@supabase/supabase-js";
import { auth } from "../auth.js";
import { Resend } from "resend";
import pkg from "pg";
import { logApiUsage, logApiError } from "../utils/apiTrackingService.js";

const { Pool } = pkg;
const router = express.Router();

// Initialize Resend client for sending emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Database pool for querying profiles (not in Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ======================================
// INTERVIEW CANDIDATES ROUTES
// ======================================

// Get all interview candidates for user
router.get("/candidates", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("interview_candidates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new interview candidate
router.post("/candidates", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      title,
      industry,
      expertise_areas,
      linkedin_url,
      source,
      notes,
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: "First and last name required" });
    }

    const { data, error } = await supabase
      .from("interview_candidates")
      .insert([
        {
          user_id: userId,
          first_name,
          last_name,
          email,
          phone,
          company,
          title,
          industry,
          expertise_areas,
          linkedin_url,
          source,
          notes,
          status: "identified",
        },
      ])
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error creating candidate:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update candidate status
router.put("/candidates/:id", auth, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      title,
      industry,
      expertise_areas,
      linkedin_url,
      source,
      notes,
      status,
    } = req.body;

    console.log("PUT /candidates/:id - candidateId:", candidateId, "userId:", userId, "body:", req.body);

    // Build update object - only include fields that were provided
    const updateObj = {
      updated_at: new Date().toISOString(),
    };
    
    if (first_name !== undefined) updateObj.first_name = first_name;
    if (last_name !== undefined) updateObj.last_name = last_name;
    if (email !== undefined) updateObj.email = email;
    if (phone !== undefined) updateObj.phone = phone;
    if (company !== undefined) updateObj.company = company;
    if (title !== undefined) updateObj.title = title;
    if (industry !== undefined) updateObj.industry = industry;
    if (expertise_areas !== undefined) updateObj.expertise_areas = expertise_areas;
    if (linkedin_url !== undefined) updateObj.linkedin_url = linkedin_url;
    if (source !== undefined) updateObj.source = source;
    if (notes !== undefined) updateObj.notes = notes;
    if (status !== undefined) updateObj.status = status;

    console.log("Update object:", updateObj);

    const { data, error } = await supabase
      .from("interview_candidates")
      .update(updateObj)
      .eq("id", candidateId)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    
    console.log("Update successful, returned data:", data);
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete candidate
router.delete("/candidates/:id", auth, async (req, res) => {
  try {
    const candidateId = req.params.id;

    const { error } = await supabase
      .from("interview_candidates")
      .delete()
      .eq("id", candidateId)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ message: "Candidate deleted" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// INFORMATIONAL INTERVIEWS ROUTES
// ======================================

// Get all interviews for user
router.get("/interviews", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("informational_interviews")
      .select(`*, candidate:candidate_id(first_name, last_name, email, company, title)`)
      .eq("user_id", userId)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;

    // Fetch preparation data for each interview
    const interviewsWithPrep = await Promise.all(
      (data || []).map(async (interview) => {
        try {
          const { data: prepData, error: prepError } = await supabase
            .from("interview_preparation")
            .select("*")
            .eq("interview_id", interview.id)
            .eq("user_id", userId);

          if (prepError) throw prepError;

          return {
            ...interview,
            preparation: (prepData && prepData.length > 0) ? prepData[0] : null
          };
        } catch (err) {
          console.error("Error fetching prep for interview:", interview.id, err);
          return {
            ...interview,
            preparation: null
          };
        }
      })
    );

    res.json({ data: interviewsWithPrep });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new interview
router.post("/interviews", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      candidate_id,
      interview_type,
      scheduled_date,
      duration_minutes,
      location_or_platform,
      key_topics,
      preparation_framework_used,
      notes_before,
    } = req.body;

    if (!candidate_id) {
      return res.status(400).json({ error: "Candidate ID required" });
    }

    const { data, error } = await supabase
      .from("informational_interviews")
      .insert([
        {
          user_id: userId,
          candidate_id,
          interview_type: interview_type || "video",
          scheduled_date,
          duration_minutes: duration_minutes || 30,
          location_or_platform,
          key_topics,
          preparation_framework_used,
          notes_before,
          status: "pending",
        },
      ])
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update interview status and add notes
router.put("/interviews/:id", auth, async (req, res) => {
  try {
    const interviewId = req.params.id;
    const {
      status,
      interview_type,
      scheduled_date,
      duration_minutes,
      location_or_platform,
      key_topics,
      notes_after,
      interviewer_insights,
      relationship_value,
      opportunity_identified,
      opportunity_description,
    } = req.body;

    console.log("PUT /interviews/:id - interviewId:", interviewId, "status:", status, "body:", req.body);

    const { data, error } = await supabase
      .from("informational_interviews")
      .update({
        status,
        interview_type,
        scheduled_date,
        duration_minutes,
        location_or_platform,
        key_topics,
        notes_after,
        interviewer_insights,
        relationship_value,
        opportunity_identified,
        opportunity_description,
        updated_at: new Date(),
      })
      .eq("id", interviewId)
      .eq("user_id", req.user.id)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    console.log("Interview updated:", data);
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error updating interview:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview details with all related data
router.get("/interviews/:id", auth, async (req, res) => {
  try {
    const interviewId = req.params.id;
    const { data, error } = await supabase
      .from("informational_interviews")
      .select(
        `*,
         candidate:candidate_id(*),
         preparation:interview_preparation(*),
         followups:interview_followup(*),
         insights:interview_insights(*)`
      )
      .eq("id", interviewId)
      .eq("user_id", req.user.id)
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching interview:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// PREPARATION FRAMEWORK ROUTES
// ======================================

// Get preparation frameworks for interview
router.get("/preparation/:interviewId", auth, async (req, res) => {
  try {
    const interviewId = req.params.interviewId;
    const { data, error } = await supabase
      .from("interview_preparation")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching preparation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create preparation framework
router.post("/preparation", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      interview_id,
      title,
      company_research,
      role_research,
      personal_preparation,
      conversation_starters,
      industry_trends,
    } = req.body;

    console.log("POST /preparation - userId:", userId, "body:", req.body);

    const { data, error } = await supabase
      .from("interview_preparation")
      .insert([
        {
          user_id: userId,
          interview_id,
          title,
          company_research,
          role_research,
          personal_preparation,
          conversation_starters,
          industry_trends,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    console.log("Preparation saved:", data);
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error creating preparation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// FOLLOW-UP ROUTES
// ======================================

// Get follow-ups for interview
router.get("/followups/:interviewId", auth, async (req, res) => {
  try {
    const interviewId = req.params.interviewId;
    const { data, error } = await supabase
      .from("interview_followup")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("user_id", req.user.id)
      .order("sent_at", { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create follow-up
router.post("/followups", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      interview_id,
      followup_type,
      template_used,
      message_content,
      action_items,
    } = req.body;

    const { data, error } = await supabase
      .from("interview_followup")
      .insert([
        {
          interview_id,
          user_id: userId,
          followup_type,
          template_used,
          message_content,
          sent_at: new Date(),
          action_items,
        },
      ])
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error creating follow-up:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update follow-up with response
router.put("/followups/:id", auth, async (req, res) => {
  try {
    const followupId = req.params.id;
    const { response_received, response_content } = req.body;

    const { data, error } = await supabase
      .from("interview_followup")
      .update({
        response_received,
        response_content,
        responded_at: response_received ? new Date() : null,
        updated_at: new Date(),
      })
      .eq("id", followupId)
      .eq("user_id", req.user.id)
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error updating follow-up:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// INSIGHTS ROUTES
// ======================================

// Get all insights for user
router.get("/insights", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("interview_insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get insights for specific interview
router.get("/insights/:interviewId", auth, async (req, res) => {
  try {
    const interviewId = req.params.interviewId;
    const { data, error } = await supabase
      .from("interview_insights")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create insight
router.post("/insights", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      interview_id,
      insight_type,
      title,
      description,
      impact_on_search,
      related_opportunities,
    } = req.body;

    const { data, error } = await supabase
      .from("interview_insights")
      .insert([
        {
          user_id: userId,
          interview_id,
          insight_type,
          title,
          description,
          impact_on_search,
          related_opportunities,
        },
      ])
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error creating insight:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update insight
router.put("/insights/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const insightId = req.params.id;
    const {
      insight_type,
      title,
      description,
      impact_on_search,
      related_opportunities,
    } = req.body;

    const { data, error } = await supabase
      .from("interview_insights")
      .update({
        insight_type,
        title,
        description,
        impact_on_search,
        related_opportunities,
        updated_at: new Date(),
      })
      .eq("id", insightId)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error updating insight:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete insight
router.delete("/insights/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const insightId = req.params.id;

    const { data, error } = await supabase
      .from("interview_insights")
      .delete()
      .eq("id", insightId)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Error deleting insight:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// ANALYTICS/DASHBOARD ROUTES
// ======================================

// Get interview statistics and summary
router.get("/dashboard/summary", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get interview counts by status
    const { data: interviews, error: interviewError } = await supabase
      .from("informational_interviews")
      .select("status")
      .eq("user_id", userId);

    // Get total insights
    const { data: insights, error: insightError } = await supabase
      .from("interview_insights")
      .select("id")
      .eq("user_id", userId);

    // Get completed interviews with follow-ups
    const { data: followups, error: followupError } = await supabase
      .from("interview_followup")
      .select("id")
      .eq("user_id", userId);

    if (interviewError || insightError || followupError)
      throw interviewError || insightError || followupError;

    const statusCounts = {
      pending: interviews.filter((i) => i.status === "pending").length,
      scheduled: interviews.filter((i) => i.status === "scheduled").length,
      completed: interviews.filter((i) => i.status === "completed").length,
      cancelled: interviews.filter((i) => i.status === "cancelled").length,
    };

    res.json({
      data: {
        totalInterviews: interviews.length,
        statusCounts,
        totalInsights: insights.length,
        totalFollowups: followups.length,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete interview
router.delete("/interviews/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Delete associated preparation records first
    await supabase
      .from("interview_preparation")
      .delete()
      .eq("interview_id", id);

    // Delete associated followups
    await supabase
      .from("interview_followups")
      .delete()
      .eq("interview_id", id);

    // Delete associated insights
    await supabase
      .from("interview_insights")
      .delete()
      .eq("interview_id", id);

    // Delete the interview
    const { error } = await supabase
      .from("informational_interviews")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ success: true, message: "Interview deleted" });
  } catch (error) {
    console.error("Error deleting interview:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update preparation (PUT endpoint for editing existing preparation)
router.put("/preparation/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { interview_id, title, company_research, role_research, personal_preparation, conversation_starters, industry_trends } = req.body;

    console.log("PUT /preparation/:id - id:", id, "body:", req.body);

    const { data, error } = await supabase
      .from("interview_preparation")
      .update({
        title,
        company_research,
        role_research,
        personal_preparation,
        conversation_starters,
        industry_trends,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Preparation record not found" });
    }

    console.log("Preparation updated:", data);
    res.json({ data: data[0] });
  } catch (error) {
    console.error("Error updating preparation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// EMAIL ENDPOINTS
// ======================================

// Helper function to get user name and email
async function getUserInfo(userId) {
  try {
    // First try to get full_name from profiles table
    const profileResult = await pool.query(
      'SELECT full_name FROM profiles WHERE user_id = $1',
      [userId]
    );
    
    let userName = '';
    if (profileResult.rows.length > 0 && profileResult.rows[0].full_name) {
      userName = profileResult.rows[0].full_name.trim();
    } else {
      // Fallback to users table first_name and last_name
      const userResult = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        if (user.first_name || user.last_name) {
          userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        return {
          name: userName || user.email,
          email: user.email
        };
      }
    }
    
    // Get email from users table
    const emailResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    
    return {
      name: userName || (emailResult.rows[0]?.email || ''),
      email: emailResult.rows[0]?.email || ''
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { name: '', email: '' };
  }
}

// POST send interview request email to candidate/interviewer
router.post("/candidates/:id/send-email", auth, async (req, res) => {
  try {
    const candidateId = req.params.id;
    const userId = req.user.id;
    
    // Get candidate information
    const { data: candidate, error: candidateError } = await supabase
      .from("interview_candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("user_id", userId)
      .single();

    if (candidateError) throw candidateError;
    if (!candidate) {
      return res.status(404).json({ error: "Candidate/interviewer not found" });
    }

    // Check if candidate email exists
    if (!candidate.email) {
      return res.status(400).json({ 
        error: "Interviewer email is required. Please add an email address to this interviewer." 
      });
    }

    // Get user information
    const userInfo = await getUserInfo(userId);
    if (!userInfo.email) {
      return res.status(500).json({ 
        error: "User email not available. Please ensure you are properly authenticated." 
      });
    }

    const interviewerEmail = candidate.email;
    const interviewerName = candidate.first_name 
      ? `${candidate.first_name} ${candidate.last_name || ''}`.trim()
      : 'there';

    const userDisplayName = userInfo.name || userInfo.email;

    // Check if there's a custom message in notes or use default
    const messageContent = candidate.notes && candidate.notes.trim() !== ''
      ? candidate.notes
      : `Hi ${interviewerName},\n\nI hope this message finds you well! I came across your profile and was impressed by your background in ${candidate.industry || 'your field'} at ${candidate.company || 'your company'}.\n\nI would love the opportunity to have an informational interview with you to learn more about your career path, your experience at ${candidate.company || 'your company'}, and any advice you might have for someone looking to grow in this industry.\n\nWould you be available for a brief conversation in the coming weeks? I'm flexible with timing and can accommodate your schedule.\n\nThank you for considering this request, and I look forward to hearing from you!\n\nBest regards`;

    // Prepare email content
    const emailSubject = `Request for Informational Interview - ${candidate.company || 'Career Conversation'}`;
    
    // Convert message to HTML (preserve line breaks)
    const messageHtml = messageContent
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>');

    // Create HTML email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin-top: 0;">Informational Interview Request</h2>
          ${candidate.company ? `<p style="margin: 10px 0;"><strong>Company:</strong> ${candidate.company}</p>` : ''}
          ${candidate.title ? `<p style="margin: 10px 0;"><strong>Your Title:</strong> ${candidate.title}</p>` : ''}
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; line-height: 1.6;">
          <p style="margin: 15px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
            <strong>This email is from ${userDisplayName} (${userInfo.email})</strong> requesting an informational interview with you.
          </p>
          
          <div style="margin: 20px 0;">
            ${messageHtml}
          </div>
          
          <p style="margin-top: 20px; margin-bottom: 0;">
            Best regards,<br>
            <strong>${userDisplayName}</strong><br>
            ${userInfo.email}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0;">This email was sent via ATS for Candidates on behalf of ${userDisplayName}</p>
          <p style="margin: 5px 0 0 0;">You can reply directly to ${userInfo.email}</p>
        </div>
      </div>
    `;

    // Send email using Resend
    const startTime = Date.now();
    const emailResult = await resend.emails.send({
      from: `ATS for Candidates <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: interviewerEmail,
      subject: emailSubject,
      html: emailHtml,
      replyTo: userInfo.email,
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage
    try {
      if (emailResult.error) {
        await logApiError({
          serviceName: 'resend',
          endpoint: '/emails/send',
          userId: userId,
          errorType: 'api_error',
          errorMessage: emailResult.error.message || 'Email send failed',
          statusCode: emailResult.error.statusCode || 500,
          requestPayload: { from: process.env.EMAIL_FROM, to: interviewerEmail, purpose: 'informational_interview_request' }
        });
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: interviewerEmail, purpose: 'informational_interview_request' },
          responseStatus: emailResult.error.statusCode || 500,
          responseTimeMs,
          success: false
        });
      } else {
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: interviewerEmail, purpose: 'informational_interview_request' },
          responseStatus: 200,
          responseTimeMs,
          success: true
        });
      }
    } catch (trackErr) {
      console.warn("Failed to track Resend API call:", trackErr);
    }

    if (emailResult.error) {
      console.error('Resend API error:', emailResult.error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: emailResult.error.message 
      });
    }

    console.log(`📧 Sent interview request email to ${interviewerEmail} for candidate ${candidateId}`);

    res.json({
      message: 'Interview request email sent successfully',
      emailId: emailResult.data?.id,
      sentTo: interviewerEmail
    });
  } catch (err) {
    console.error('Error sending interview request email:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// POST send followup email after interview
router.post("/interviews/:id/send-followup-email", auth, async (req, res) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.id;
    const { message_content } = req.body;

    if (!message_content || message_content.trim() === '') {
      return res.status(400).json({ 
        error: 'Followup message is required.' 
      });
    }

    // Get interview information
    const { data: interview, error: interviewError } = await supabase
      .from("informational_interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", userId)
      .single();

    if (interviewError) throw interviewError;
    if (!interview || !interview.candidate_id) {
      return res.status(404).json({ error: "Interview not found or missing candidate" });
    }

    // Get candidate information separately
    const { data: candidate, error: candidateError } = await supabase
      .from("interview_candidates")
      .select("first_name, last_name, email, company, title")
      .eq("id", interview.candidate_id)
      .single();

    if (candidateError) throw candidateError;
    if (!candidate) {
      return res.status(404).json({ error: "Candidate/interviewer not found" });
    }

    const candidateEmail = candidate.email || '';
    const candidateName = candidate.first_name 
      ? `${candidate.first_name} ${candidate.last_name || ''}`.trim()
      : 'there';
    const candidateCompany = candidate.company || '';

    if (!candidateEmail) {
      return res.status(400).json({ 
        error: "Interviewer email is required. Please add an email address to this interviewer." 
      });
    }

    // Get user information
    const userInfo = await getUserInfo(userId);
    if (!userInfo.email) {
      return res.status(500).json({ 
        error: "User email not available. Please ensure you are properly authenticated." 
      });
    }

    const userDisplayName = userInfo.name || userInfo.email;

    // Prepare email content
    const emailSubject = `Thank You for the Informational Interview${candidateCompany ? ` - ${candidateCompany}` : ''}`;
    
    // Convert message to HTML (preserve line breaks)
    const messageHtml = message_content
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>');

    // Create HTML email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin-top: 0;">Thank You for Your Time</h2>
          ${candidateCompany ? `<p style="margin: 10px 0;"><strong>Company:</strong> ${candidateCompany}</p>` : ''}
          ${interview.scheduled_date ? `<p style="margin: 10px 0;"><strong>Interview Date:</strong> ${new Date(interview.scheduled_date).toLocaleDateString()}</p>` : ''}
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; line-height: 1.6;">
          <p style="margin: 15px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
            <strong>This email is from ${userDisplayName} (${userInfo.email})</strong> thanking you for meeting with them for an informational interview.
          </p>
          
          <div style="margin: 20px 0;">
            ${messageHtml}
          </div>
          
          <p style="margin-top: 20px; margin-bottom: 0;">
            Best regards,<br>
            <strong>${userDisplayName}</strong><br>
            ${userInfo.email}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0;">This email was sent via ATS for Candidates on behalf of ${userDisplayName}</p>
          <p style="margin: 5px 0 0 0;">You can reply directly to ${userInfo.email}</p>
        </div>
      </div>
    `;

    // Send email using Resend
    const startTime = Date.now();
    const emailResult = await resend.emails.send({
      from: `ATS for Candidates <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: candidateEmail,
      subject: emailSubject,
      html: emailHtml,
      replyTo: userInfo.email,
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage
    console.log(`📊 Attempting to track Resend API call - userId: ${userId}, success: ${!emailResult.error}`);
    try {
      if (emailResult.error) {
        console.log(`📊 Logging Resend API error...`);
        await logApiError({
          serviceName: 'resend',
          endpoint: '/emails/send',
          userId: userId,
          errorType: 'api_error',
          errorMessage: emailResult.error.message || 'Email send failed',
          statusCode: emailResult.error.statusCode || 500,
          requestPayload: { from: process.env.EMAIL_FROM, to: candidateEmail, purpose: 'informational_interview_followup' }
        });
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: candidateEmail, purpose: 'informational_interview_followup' },
          responseStatus: emailResult.error.statusCode || 500,
          responseTimeMs,
          success: false
        });
        console.log(`✅ Resend API error tracked successfully`);
      } else {
        console.log(`📊 Logging successful Resend API usage...`);
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: candidateEmail, purpose: 'informational_interview_followup' },
          responseStatus: 200,
          responseTimeMs,
          success: true
        });
        console.log(`✅ Resend API usage tracked successfully - userId: ${userId}`);
      }
    } catch (trackErr) {
      console.error("❌ Failed to track Resend API call:", trackErr);
      console.error("   Error stack:", trackErr.stack);
    }

    if (emailResult.error) {
      console.error('Resend API error:', emailResult.error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: emailResult.error.message 
      });
    }

    // Save followup to database
    const { error: followupError } = await supabase
      .from("interview_followup")
      .insert([{
        interview_id: interviewId,
        user_id: userId,
        followup_type: "thank_you",
        template_used: "professional",
        message_content: message_content,
        sent_at: new Date(),
        action_items: "",
      }]);

    if (followupError) {
      console.error('Error saving followup to database:', followupError);
      // Don't fail the request if database save fails, email was already sent
    }

    console.log(`📧 Sent followup email to ${candidateEmail} for interview ${interviewId}`);

    res.json({
      message: 'Followup email sent successfully',
      emailId: emailResult.data?.id,
      sentTo: candidateEmail
    });
  } catch (err) {
    console.error('Error sending followup email:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

export default router;
