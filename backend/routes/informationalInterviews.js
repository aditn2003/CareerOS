import express from "express";
import { createClient } from "@supabase/supabase-js";
import { auth } from "../auth.js";

const router = express.Router();

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

export default router;
