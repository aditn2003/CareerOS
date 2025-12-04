import express from "express";
import { createClient } from "@supabase/supabase-js";
import { auth } from "../auth.js";

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log("✅ Industry Contacts routes initialized");
console.log("Supabase URL:", process.env.SUPABASE_URL ? "✅ set" : "❌ missing");
console.log("Supabase Key:", process.env.SUPABASE_ANON_KEY ? "✅ set" : "❌ missing");

/* ========================================================================
   UC-092: Industry Contact Discovery
   
   Acceptance Criteria:
   ✅ Suggest potential connections based on target companies and roles
   ✅ Identify second and third-degree connections for warm introductions
   ✅ Discover industry leaders and influencers
   ✅ Find alumni connections from educational institutions
   ✅ Identify conference speakers and industry event participants
   ✅ Suggest networking opportunities based on mutual interests
   ✅ Include diversity and inclusion networking opportunities
   ✅ Track contact discovery success and relationship building
======================================================================== */

// Helper: Extract user ID from JWT
function getSupabaseUserId(req) {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

// Pre-populated contact suggestions database
const CONTACT_SUGGESTIONS_DB = {
  "Google": [
    { firstName: "Sarah", lastName: "Chen", title: "Senior Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 92 },
    { firstName: "Michael", lastName: "Lee", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Jessica", lastName: "Park", title: "Product Designer", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "David", lastName: "Kumar", title: "VP of Engineering", industry: "Technology", reason: "target_company_match", matchScore: 90 }
  ],
  "Microsoft": [
    { firstName: "James", lastName: "Rodriguez", title: "Engineering Director", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Emily", lastName: "Thompson", title: "Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 84 },
    { firstName: "Alex", lastName: "Johnson", title: "Senior Developer", industry: "Technology", reason: "target_company_match", matchScore: 82 },
    { firstName: "Lisa", lastName: "Anderson", title: "Engineering Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 }
  ],
  "Amazon": [
    { firstName: "Emily", lastName: "Watson", title: "VP of Operations", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Christopher", lastName: "Martin", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 83 },
    { firstName: "Rachel", lastName: "Green", title: "Operations Manager", industry: "Technology", reason: "target_company_match", matchScore: 81 },
    { firstName: "Daniel", lastName: "Brown", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 86 }
  ],
  "Apple": [
    { firstName: "Michael", lastName: "Park", title: "Product Strategy Lead", industry: "Technology", reason: "target_company_match", matchScore: 89 },
    { firstName: "Sophie", lastName: "Laurent", title: "Design Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 },
    { firstName: "Kevin", lastName: "Wong", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Maria", lastName: "Garcia", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 84 }
  ],
  "Meta": [
    { firstName: "David", lastName: "Kim", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Olivia", lastName: "Chen", title: "Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 86 },
    { firstName: "James", lastName: "Wright", title: "Senior Engineer", industry: "Technology", reason: "target_company_match", matchScore: 84 },
    { firstName: "Priya", lastName: "Patel", title: "Engineering Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 }
  ],
  "Tesla": [
    { firstName: "Robert", lastName: "Tesla", title: "Engineering Director", industry: "Automotive", reason: "target_company_match", matchScore: 91 },
    { firstName: "Amanda", lastName: "Steele", title: "Product Manager", industry: "Automotive", reason: "target_company_match", matchScore: 87 },
    { firstName: "Marcus", lastName: "Johnson", title: "Manufacturing Lead", industry: "Automotive", reason: "target_company_match", matchScore: 83 }
  ],
  "LinkedIn": [
    { firstName: "Sarah", lastName: "Mitchell", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 86 },
    { firstName: "Tom", lastName: "Brady", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Nicole", lastName: "Davis", title: "Product Designer", industry: "Technology", reason: "target_company_match", matchScore: 82 }
  ],
  "Stripe": [
    { firstName: "Patrick", lastName: "Collison", title: "CEO & Co-founder", industry: "FinTech", reason: "target_company_match", matchScore: 95 },
    { firstName: "Samantha", lastName: "Chen", title: "Head of Product", industry: "FinTech", reason: "target_company_match", matchScore: 89 },
    { firstName: "Blake", lastName: "Harrison", title: "Engineering Manager", industry: "FinTech", reason: "target_company_match", matchScore: 87 }
  ]
};

/* ============================================================
   0. GET /contact-suggestions?company=X - Get suggested contacts by company
============================================================ */
router.get("/contact-suggestions", auth, async (req, res) => {
  try {
    const { company } = req.query;
    
    if (!company) {
      return res.json({ suggestions: [] });
    }

    // Find matching companies (case-insensitive search)
    const suggestions = [];
    Object.keys(CONTACT_SUGGESTIONS_DB).forEach(dbCompany => {
      if (dbCompany.toLowerCase().includes(company.toLowerCase())) {
        suggestions.push(...CONTACT_SUGGESTIONS_DB[dbCompany].map(contact => ({
          ...contact,
          company: dbCompany
        })));
      }
    });

    res.json({ suggestions });
  } catch (err) {
    console.error("❌ Error fetching contact suggestions:", err.message);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

/* ============================================================
   0b. GET /companies - Get list of all companies with contacts
============================================================ */
router.get("/companies", auth, async (req, res) => {
  try {
    const companies = Object.keys(CONTACT_SUGGESTIONS_DB).sort();
    res.json({ companies });
  } catch (err) {
    console.error("❌ Error fetching companies:", err.message);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

/* ============================================================
   1. GET /suggestions - Get suggested contacts based on target roles/companies
============================================================ */
router.get("/suggestions", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { company, role, industry, diversity_filter } = req.query;

    let query = supabase
      .from("industry_contact_suggestions")
      .select("*")
      .eq("user_id", userId);

    if (company) query = query.ilike("company", `%${company}%`);
    if (role) query = query.ilike("title", `%${role}%`);
    if (industry) query = query.eq("industry", industry);
    if (diversity_filter) query = query.eq("diversity_category", diversity_filter);

    const { data, error } = await query.order("match_score", { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      suggestions: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching suggestions:", err.message);
    return res.status(500).json({ error: "Failed to fetch suggestions", details: err.message });
  }
});

/* ============================================================
   2. POST /suggestions - Create suggested contact
============================================================ */
router.post("/suggestions", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      first_name,
      last_name,
      email,
      title,
      company,
      industry,
      linkedin_url,
      expertise_areas,
      suggestion_reason,
      match_score,
      diversity_category,
      engagement_type
    } = req.body;

    if (!first_name || !last_name || !company) {
      return res.status(400).json({
        error: "First name, last name, and company are required"
      });
    }

    const { data, error } = await supabase
      .from("industry_contact_suggestions")
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        title,
        company,
        industry,
        linkedin_url,
        expertise_areas: expertise_areas ? JSON.stringify(expertise_areas) : null,
        suggestion_reason,
        match_score,
        diversity_category,
        engagement_type,
        action_status: "new"
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Contact suggestion created",
      suggestion: data[0]
    });
  } catch (err) {
    console.error("❌ Error creating suggestion:", err.message);
    return res.status(500).json({ error: "Failed to create suggestion" });
  }
});

/* ============================================================
   3. PUT /suggestions/:id/action - Update action status
============================================================ */
router.put("/suggestions/:id/action", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const { action_status, action_notes } = req.body;

    const { data, error } = await supabase
      .from("industry_contact_suggestions")
      .update({
        action_status,
        action_notes,
        action_date: new Date()
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    return res.json({
      success: true,
      message: "Action status updated",
      suggestion: data[0]
    });
  } catch (err) {
    console.error("❌ Error updating action:", err.message);
    return res.status(500).json({ error: "Failed to update action" });
  }
});

/* ============================================================
   4. GET /connection-paths - Get second and third-degree connections
============================================================ */
router.get("/connection-paths", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { degree_filter } = req.query;

    let query = supabase
      .from("contact_connection_paths")
      .select("*")
      .eq("user_id", userId);

    if (degree_filter) query = query.eq("connection_degree", parseInt(degree_filter));

    const { data, error } = await query.order("relationship_strength", {
      ascending: false
    });

    if (error) throw error;

    return res.json({
      success: true,
      connections: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching connection paths:", err.message);
    return res.status(500).json({ error: "Failed to fetch connection paths" });
  }
});

/* ============================================================
   5. POST /connection-paths - Create connection path for warm introduction
============================================================ */
router.post("/connection-paths", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      mutual_contact_name,
      target_contact_name,
      target_company,
      connection_degree,
      relationship_strength,
      introduction_message
    } = req.body;

    if (!mutual_contact_name || !target_contact_name || !target_company || !connection_degree) {
      return res.status(400).json({
        error: "Mutual contact name, target contact name, target company, and connection degree are required"
      });
    }

    const { data, error } = await supabase
      .from("contact_connection_paths")
      .insert({
        user_id: userId,
        mutual_contact_name,
        target_contact_name,
        target_company,
        connection_degree,
        relationship_strength: relationship_strength || 3,
        introduction_message: introduction_message || "",
        introduction_suggested: true,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Connection path created",
      path: data[0]
    });
  } catch (err) {
    console.error("❌ Error creating connection path:", err.message);
    return res.status(500).json({ error: "Failed to create connection path" });
  }
});

/* ============================================================
   5.5 GET /connection-paths - Get all connection paths
============================================================ */
router.get("/connection-paths", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);

    const { data, error } = await supabase
      .from("contact_connection_paths")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      connections: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching connection paths:", err.message);
    return res.status(500).json({ error: "Failed to fetch connection paths" });
  }
});

/* ============================================================
   6. PUT /connection-paths/:id/introduce - Send warm introduction
============================================================ */
router.put("/connection-paths/:id/introduce", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const { introduction_message } = req.body;

    const { data, error } = await supabase
      .from("contact_connection_paths")
      .update({
        introduction_sent: true,
        introduction_sent_date: new Date(),
        introduction_message
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Introduction sent",
      path: data[0]
    });
  } catch (err) {
    console.error("❌ Error sending introduction:", err.message);
    return res.status(500).json({ error: "Failed to send introduction" });
  }
});

/* ============================================================
   PUT /connection-paths/:id - Update connection path
============================================================ */
router.put("/connection-paths/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const {
      mutual_contact_name,
      target_contact_name,
      target_company,
      connection_degree,
      relationship_strength,
      introduction_message
    } = req.body;

    const { data, error } = await supabase
      .from("contact_connection_paths")
      .update({
        mutual_contact_name,
        target_contact_name,
        target_company,
        connection_degree,
        relationship_strength,
        introduction_message,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      connection: data,
      message: "Connection path updated successfully"
    });
  } catch (err) {
    console.error("❌ Error updating connection path:", err.message);
    return res.status(500).json({ error: "Failed to update connection path" });
  }
});

/* ============================================================
   DELETE /connection-paths/:id - Delete connection path
============================================================ */
router.delete("/connection-paths/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("contact_connection_paths")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Connection path deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting connection path:", err.message);
    return res.status(500).json({ error: "Failed to delete connection path" });
  }
});

/* ============================================================
   7. GET /industry-leaders - Get discovered industry leaders
============================================================ */
router.get("/industry-leaders", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { industry, engagement_status, min_influence } = req.query;

    let query = supabase
      .from("industry_leaders")
      .select("*")
      .eq("user_id", userId);

    if (industry) query = query.eq("industry", industry);
    if (engagement_status) query = query.eq("engagement_status", engagement_status);
    if (min_influence) query = query.gte("influence_score", parseInt(min_influence));

    const { data, error } = await query.order("influence_score", {
      ascending: false
    });

    if (error) throw error;

    return res.json({
      success: true,
      leaders: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching industry leaders:", err.message);
    return res.status(500).json({ error: "Failed to fetch industry leaders" });
  }
});

/* ============================================================
   8. POST /industry-leaders - Add discovered industry leader
============================================================ */
router.post("/industry-leaders", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      first_name,
      last_name,
      title,
      company,
      industry,
      linkedin_url,
      twitter_url,
      influence_score,
      thought_leadership_focus,
      engagement_type
    } = req.body;

    if (!first_name || !last_name || !company) {
      return res.status(400).json({
        error: "First name, last name, and company are required"
      });
    }

    const { data, error } = await supabase
      .from("industry_leaders")
      .insert({
        user_id: userId,
        first_name,
        last_name,
        title,
        company,
        industry,
        linkedin_url,
        twitter_url,
        influence_score,
        thought_leadership_focus: thought_leadership_focus
          ? JSON.stringify(thought_leadership_focus)
          : null,
        engagement_type,
        engagement_status: "new"
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Industry leader added",
      leader: data[0]
    });
  } catch (err) {
    console.error("❌ Error adding industry leader:", err.message);
    return res.status(500).json({ error: "Failed to add industry leader" });
  }
});

/* ============================================================
   9. GET /alumni - Get alumni connections
============================================================ */
router.get("/alumni", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { institution, outreach_status } = req.query;

    let query = supabase
      .from("alumni_connections")
      .select("*")
      .eq("user_id", userId);

    if (institution) query = query.ilike("education_institution", `%${institution}%`);
    if (outreach_status) query = query.eq("outreach_status", outreach_status);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      alumni: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching alumni:", err.message);
    return res.status(500).json({ error: "Failed to fetch alumni" });
  }
});

/* ============================================================
   10. POST /alumni - Add alumni connection
============================================================ */
router.post("/alumni", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      first_name,
      last_name,
      email,
      title,
      company,
      education_institution,
      graduation_year,
      degree_type,
      field_of_study,
      linkedin_url
    } = req.body;

    if (!first_name || !last_name || !education_institution) {
      return res.status(400).json({
        error: "First name, last name, and institution are required"
      });
    }

    const { data, error } = await supabase
      .from("alumni_connections")
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        title,
        company,
        education_institution,
        graduation_year,
        degree_type,
        field_of_study,
        linkedin_url,
        outreach_status: "new"
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Alumni connection added",
      alumni: data[0]
    });
  } catch (err) {
    console.error("❌ Error adding alumni connection:", err.message);
    return res.status(500).json({ error: "Failed to add alumni connection" });
  }
});

/* ============================================================
   11. GET /event-participants - Get event participants and speakers
============================================================ */
router.get("/event-participants", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { event_name, event_type, outreach_status } = req.query;

    let query = supabase
      .from("event_participants")
      .select("*")
      .eq("user_id", userId);

    if (event_name) query = query.ilike("event_name", `%${event_name}%`);
    if (event_type) query = query.eq("event_type", event_type);
    if (outreach_status) query = query.eq("outreach_status", outreach_status);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      participants: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching event participants:", err.message);
    return res.status(500).json({ error: "Failed to fetch event participants" });
  }
});

/* ============================================================
   12. POST /event-participants - Add event participant or speaker
============================================================ */
router.post("/event-participants", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      first_name,
      last_name,
      email,
      title,
      company,
      event_name,
      event_date,
      event_type,
      event_location,
      speaker_topic,
      is_speaker,
      is_attendee,
      shared_interests,
      linkedin_url
    } = req.body;

    if (!first_name || !last_name || !event_name) {
      return res.status(400).json({
        error: "First name, last name, and event name are required"
      });
    }

    const { data, error } = await supabase
      .from("event_participants")
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        title,
        company,
        event_name,
        event_date,
        event_type,
        event_location,
        speaker_topic,
        is_speaker,
        is_attendee,
        shared_interests: shared_interests ? JSON.stringify(shared_interests) : null,
        linkedin_url,
        outreach_status: "new"
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Event participant added",
      participant: data[0]
    });
  } catch (err) {
    console.error("❌ Error adding event participant:", err.message);
    return res.status(500).json({ error: "Failed to add event participant" });
  }
});

/* ============================================================
   13. GET /discovery-analytics - Get discovery success metrics
============================================================ */
router.get("/discovery-analytics", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    console.log("📊 Fetching analytics for user:", userId);

    // Get tracking data
    const { data: tracking, error: trackingError } = await supabase
      .from("contact_discovery_tracking")
      .select("*")
      .eq("user_id", userId);

    if (trackingError) {
      console.error("❌ Error fetching tracking:", trackingError);
      throw trackingError;
    }

    // Calculate aggregate metrics
    const { data: suggestions, error: sugError } = await supabase
      .from("industry_contact_suggestions")
      .select("action_status")
      .eq("user_id", userId);

    if (sugError) {
      console.error("❌ Error fetching suggestions:", sugError);
      throw sugError;
    }

    const { data: paths, error: pathError } = await supabase
      .from("contact_connection_paths")
      .select("outcome")
      .eq("user_id", userId);

    if (pathError) {
      console.error("❌ Error fetching paths:", pathError);
      throw pathError;
    }

    const { data: alumni, error: alumError } = await supabase
      .from("alumni_connections")
      .select("outreach_status")
      .eq("user_id", userId);

    if (alumError) {
      console.error("❌ Error fetching alumni:", alumError);
      throw alumError;
    }

    const { data: events, error: evtError } = await supabase
      .from("event_participants")
      .select("outreach_status")
      .eq("user_id", userId);

    if (evtError) {
      console.error("❌ Error fetching events:", evtError);
      throw evtError;
    }

    const metrics = {
      total_suggestions: suggestions?.length || 0,
      suggestions_contacted:
        suggestions?.filter((s) => s.action_status !== "new").length || 0,
      suggestions_connected:
        suggestions?.filter((s) => s.action_status === "connected").length || 0,
      warm_introductions_sent:
        paths?.filter((p) => p.outcome === "connected").length || 0,
      alumni_contacted: alumni?.filter((a) => a.outreach_status !== "new").length || 0,
      event_participants_contacted:
        events?.filter((e) => e.outreach_status !== "new").length || 0,
      total_discovery_efforts:
        (suggestions?.length || 0) +
        (alumni?.length || 0) +
        (events?.length || 0),
      connection_conversion_rate:
        suggestions && suggestions.length > 0
          ? Math.round(
              (suggestions.filter((s) => s.action_status === "connected").length /
                suggestions.length) *
                100
            )
          : 0
    };

    console.log("✅ Analytics computed:", metrics);

    return res.json({
      success: true,
      metrics,
      tracking: tracking || {}
    });
  } catch (err) {
    console.error("❌ Error fetching analytics:", err.message, err);
    return res.status(500).json({ 
      error: "Failed to fetch analytics", 
      details: err.message 
    });
  }
});

/* ============================================================
   13. PUT /suggestions/:id - Update suggestion
============================================================ */
router.put("/suggestions/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from("industry_contact_suggestions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: "Suggestion not found" });

    res.json({ success: true, suggestion: data[0] });
  } catch (err) {
    console.error("❌ Error updating suggestion:", err.message);
    res.status(500).json({ error: "Failed to update suggestion" });
  }
});

/* ============================================================
   13b. DELETE /suggestions/:id - Delete suggestion
============================================================ */
router.delete("/suggestions/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from("industry_contact_suggestions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    res.json({ success: true, message: "Suggestion deleted" });
  } catch (err) {
    console.error("❌ Error deleting suggestion:", err.message);
    res.status(500).json({ error: "Failed to delete suggestion" });
  }
});

/* ============================================================
   14. PUT /alumni/:id - Update alumni
============================================================ */
router.put("/alumni/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from("alumni_connections")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: "Alumni not found" });

    res.json({ success: true, alumni: data[0] });
  } catch (err) {
    console.error("❌ Error updating alumni:", err.message);
    res.status(500).json({ error: "Failed to update alumni" });
  }
});

/* ============================================================
   14b. DELETE /alumni/:id - Delete alumni
============================================================ */
router.delete("/alumni/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from("alumni_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    res.json({ success: true, message: "Alumni deleted" });
  } catch (err) {
    console.error("❌ Error deleting alumni:", err.message);
    res.status(500).json({ error: "Failed to delete alumni" });
  }
});

/* ============================================================
   15. PUT /event-participants/:id - Update event participant
============================================================ */
router.put("/event-participants/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from("event_participants")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: "Event participant not found" });

    res.json({ success: true, participant: data[0] });
  } catch (err) {
    console.error("❌ Error updating event participant:", err.message);
    res.status(500).json({ error: "Failed to update event participant" });
  }
});

/* ============================================================
   15b. DELETE /event-participants/:id - Delete event participant
============================================================ */
router.delete("/event-participants/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from("event_participants")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    res.json({ success: true, message: "Event participant deleted" });
  } catch (err) {
    console.error("❌ Error deleting event participant:", err.message);
    res.status(500).json({ error: "Failed to delete event participant" });
  }
});

/* ============================================================
   16. PUT /discovery-outreach/:type/:id - Send outreach message
============================================================ */
router.put("/discovery-outreach/:type/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { type, id } = req.params;
    const { outreach_message, outreach_template } = req.body;

    let table, statusField, dateField, messageField;
    if (type === "suggestion") {
      table = "industry_contact_suggestions";
      statusField = "action_status";
      dateField = "action_date";
      messageField = "action_notes";
    } else if (type === "connection") {
      table = "contact_connection_paths";
      statusField = "outreach_status";
      dateField = "outreach_date";
      messageField = "outreach_message";
    } else if (type === "alumni") {
      table = "alumni_connections";
      statusField = "outreach_status";
      dateField = "outreach_date";
      messageField = "outreach_message";
    } else if (type === "event") {
      table = "event_participants";
      statusField = "outreach_status";
      dateField = "outreach_date";
      messageField = "outreach_message";
    } else {
      return res.status(400).json({ error: "Invalid outreach type" });
    }

    const updateData = {
      [statusField]: "contacted",
      [dateField]: new Date(),
      [messageField]: outreach_message || outreach_template
    };

    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Outreach sent",
      record: data[0]
    });
  } catch (err) {
    console.error("❌ Error sending outreach:", err.message);
    return res.status(500).json({ error: "Failed to send outreach" });
  }
});

/* ============================================================
   UC-093: Relationship Maintenance Automation
   
   POST /reminders - Create relationship reminder
   GET /reminders - Fetch all reminders
   DELETE /reminders/:id - Delete reminder
============================================================ */
router.post("/reminders", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const {
      contact_name,
      contact_company,
      reminder_type,
      reminder_date,
      custom_message
    } = req.body;

    if (!contact_name || !reminder_type || !reminder_date) {
      return res.status(400).json({
        error: "Contact name, reminder type, and reminder date are required"
      });
    }

    const { data, error } = await supabase
      .from("relationship_reminders")
      .insert({
        user_id: userId,
        contact_name,
        contact_company: contact_company || "",
        reminder_type,
        reminder_date,
        custom_message: custom_message || "",
        is_completed: false,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      reminder: data[0]
    });
  } catch (err) {
    console.error("❌ Error creating reminder:", err.message);
    return res.status(500).json({ error: "Failed to create reminder" });
  }
});

router.get("/reminders", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);

    const { data, error } = await supabase
      .from("relationship_reminders")
      .select("*")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("reminder_date", { ascending: true });

    if (error) throw error;

    return res.json({
      success: true,
      reminders: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error("❌ Error fetching reminders:", err.message);
    return res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

router.delete("/reminders/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("relationship_reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Reminder deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting reminder:", err.message);
    return res.status(500).json({ error: "Failed to delete reminder" });
  }
});

/* ============================================================
   UC-093 ENHANCEMENT: Recurring Check-ins
   Generates automatic periodic reminders for important contacts
============================================================ */

// POST /recurring-check-ins - Create new recurring check-in schedule
router.post("/recurring-check-ins", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { contact_name, contact_company, frequency, priority, custom_message } = req.body;

    if (!contact_name || !frequency) {
      return res.status(400).json({ error: "Contact name and frequency required" });
    }

    // Map frequency to days
    const frequencyMap = {
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 90
    };

    const frequency_days = frequencyMap[frequency] || 30;
    const next_reminder_date = new Date();
    next_reminder_date.setDate(next_reminder_date.getDate() + frequency_days);

    const { data, error } = await supabase
      .from("recurring_check_ins")
      .insert([{
        user_id: userId,
        contact_name,
        contact_company,
        frequency,
        frequency_days,
        priority,
        custom_message,
        next_reminder_date: next_reminder_date.toISOString().split('T')[0]
      }])
      .select();

    if (error) throw error;

    // Create the first reminder immediately
    await supabase
      .from("relationship_reminders")
      .insert([{
        user_id: userId,
        contact_name,
        contact_company,
        reminder_type: "check_in",
        reminder_date: new Date().toISOString().split('T')[0],
        custom_message: custom_message || `Time to check in with ${contact_name}`
      }]);

    return res.status(201).json({
      success: true,
      recurring_check_in: data[0]
    });
  } catch (err) {
    console.error("❌ Error creating recurring check-in:", err.message);
    return res.status(500).json({ error: "Failed to create recurring check-in" });
  }
});

// GET /recurring-check-ins - Fetch all recurring check-in schedules
router.get("/recurring-check-ins", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);

    const { data, error } = await supabase
      .from("recurring_check_ins")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) throw error;

    return res.json({
      recurring_check_ins: data || []
    });
  } catch (err) {
    console.error("❌ Error fetching recurring check-ins:", err.message);
    return res.status(500).json({ error: "Failed to fetch recurring check-ins" });
  }
});

// POST /generate-periodic-reminders - Generate new reminders for due recurring check-ins
// This should be called by a scheduled job (cron) daily
router.post("/generate-periodic-reminders", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const today = new Date().toISOString().split('T')[0];

    // Get all active recurring check-ins due today
    const { data: dueCheckIns, error: fetchError } = await supabase
      .from("recurring_check_ins")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lte("next_reminder_date", today);

    if (fetchError) throw fetchError;

    if (!dueCheckIns || dueCheckIns.length === 0) {
      return res.json({
        success: true,
        reminders_generated: 0,
        message: "No due check-ins at this time"
      });
    }

    let reminders_created = 0;

    // Create reminders for each due check-in
    for (const checkIn of dueCheckIns) {
      const { data: reminder, error: createError } = await supabase
        .from("relationship_reminders")
        .insert([{
          user_id: userId,
          contact_name: checkIn.contact_name,
          contact_company: checkIn.contact_company,
          reminder_type: "check_in",
          reminder_date: today,
          custom_message: checkIn.custom_message || `Periodic check-in: ${checkIn.contact_name} at ${checkIn.contact_company}`
        }])
        .select();

      if (!createError) {
        reminders_created++;

        // Calculate next reminder date
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + checkIn.frequency_days);

        // Update the recurring check-in with new next_reminder_date
        await supabase
          .from("recurring_check_ins")
          .update({
            last_reminder_date: today,
            next_reminder_date: nextDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq("id", checkIn.id);
      }
    }

    return res.json({
      success: true,
      reminders_generated: reminders_created,
      message: `Generated ${reminders_created} periodic reminders`
    });
  } catch (err) {
    console.error("❌ Error generating periodic reminders:", err.message);
    return res.status(500).json({ error: "Failed to generate periodic reminders" });
  }
});

// DELETE /recurring-check-ins/:id - Stop recurring check-ins for a contact
router.delete("/recurring-check-ins/:id", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("recurring_check_ins")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Recurring check-in stopped"
    });
  } catch (err) {
    console.error("❌ Error stopping recurring check-in:", err.message);
    return res.status(500).json({ error: "Failed to stop recurring check-in" });
  }
});

/* ============================================================
   DEMO SEED DATA - GET /seed-demo-data
   Populates with sample contacts for demo purposes
============================================================ */
router.post("/seed-demo-data", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);

    // Clear existing demo data (optional)
    await supabase
      .from("industry_contact_suggestions")
      .delete()
      .eq("user_id", userId);

    await supabase
      .from("alumni_connections")
      .delete()
      .eq("user_id", userId);

    await supabase
      .from("event_participants")
      .delete()
      .eq("user_id", userId);

    await supabase
      .from("contact_discovery_tracking")
      .delete()
      .eq("user_id", userId);

    // Sample Suggestions
    const suggestions = [
      {
        user_id: userId,
        first_name: "Sarah",
        last_name: "Chen",
        title: "Senior Product Manager",
        company: "Google",
        industry: "Technology",
        match_score: 92,
        suggestion_reason: "target_company_match",
        action_status: "new",
        action_date: new Date().toISOString(),
        action_notes: "Perfect match for PM role at tech companies"
      },
      {
        user_id: userId,
        first_name: "James",
        last_name: "Rodriguez",
        title: "Engineering Director",
        company: "Microsoft",
        industry: "Technology",
        match_score: 88,
        suggestion_reason: "role_match",
        action_status: "new",
        action_date: new Date().toISOString(),
        action_notes: "15+ years managing engineering teams"
      },
      {
        user_id: userId,
        first_name: "Emily",
        last_name: "Watson",
        title: "VP of Operations",
        company: "Amazon",
        industry: "Technology",
        match_score: 85,
        suggestion_reason: "industry_leader",
        action_status: "contacted",
        action_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        action_notes: "Sent LinkedIn message on Dec 1st"
      }
    ];

    const { data: suggestionData, error: suggestionError } = await supabase
      .from("industry_contact_suggestions")
      .insert(suggestions)
      .select();

    if (suggestionError) throw suggestionError;

    // Sample Alumni
    const alumni = [
      {
        user_id: userId,
        first_name: "Michael",
        last_name: "Park",
        title: "Product Strategy Lead",
        company: "Apple",
        education_institution: "University of California, Berkeley",
        graduation_year: 2015,
        field_of_study: "Computer Science",
        degree_type: "Bachelor",
        connection_strength: "high",
        outreach_status: "new",
        outreach_date: new Date().toISOString(),
        outreach_message: "Same school, great network resource"
      },
      {
        user_id: userId,
        first_name: "Lisa",
        last_name: "Thompson",
        title: "Design Director",
        company: "Adobe",
        education_institution: "University of California, Berkeley",
        graduation_year: 2016,
        field_of_study: "Computer Science",
        degree_type: "Bachelor",
        connection_strength: "high",
        outreach_status: "new",
        outreach_date: new Date().toISOString(),
        outreach_message: "2 years behind, can provide industry insights"
      }
    ];

    const { data: alumniData, error: alumniError } = await supabase
      .from("alumni_connections")
      .insert(alumni)
      .select();

    if (alumniError) throw alumniError;

    // Sample Event Participants
    const eventParticipants = [
      {
        user_id: userId,
        first_name: "Dr. Priya",
        last_name: "Patel",
        title: "AI Research Lead",
        company: "DeepMind",
        event_name: "NeurIPS 2024",
        event_date: "2024-12-10",
        event_type: "conference",
        event_location: "Vancouver, Canada",
        is_speaker: true,
        is_attendee: true,
        outreach_status: "new",
        outreach_date: new Date().toISOString(),
        outreach_message: "Keynote speaker on AI ethics"
      },
      {
        user_id: userId,
        first_name: "David",
        last_name: "Kim",
        title: "Engineering Manager",
        company: "Meta",
        event_name: "AI Engineering Summit 2024",
        event_date: "2024-12-15",
        event_type: "conference",
        event_location: "San Francisco, CA",
        is_speaker: true,
        is_attendee: true,
        outreach_status: "new",
        outreach_date: new Date().toISOString(),
        outreach_message: "Panel on scaling ML infrastructure"
      }
    ];

    const { data: eventData, error: eventError } = await supabase
      .from("event_participants")
      .insert(eventParticipants)
      .select();

    if (eventError) throw eventError;

    // Update analytics
    const { data: trackingData, error: trackingError } = await supabase
      .from("contact_discovery_tracking")
      .insert({
        user_id: userId,
        discovery_method: "suggestions",
        total_discovered: 3,
        total_contacted: 1,
        total_responses: 0,
        total_connected: 0,
        total_meetings_scheduled: 0,
        conversion_rate: 0,
        response_time_avg_days: 0,
        source_effectiveness: "medium",
        most_effective_source: "suggestions",
        diversity_connections_made: 0,
        thought_leadership_engagements: 2,
        warm_introductions_made: 0,
        networking_opportunities_identified: 5
      })
      .select();

    if (trackingError) throw trackingError;

    res.json({
      success: true,
      message: "Demo data seeded successfully!",
      data: {
        suggestions: suggestionData.length,
        alumni: alumniData.length,
        eventParticipants: eventData.length,
        analytics: trackingData[0]
      }
    });
  } catch (err) {
    console.error("❌ Error seeding demo data:", err.message);
    res.status(500).json({ error: "Failed to seed demo data", details: err.message });
  }
});

/* ============================================================
   GET /all-outreach - Fetch all outreach messages from all sources
   (suggestions, connections, alumni, events)
============================================================ */
router.get("/all-outreach", auth, async (req, res) => {
  try {
    const userId = getSupabaseUserId(req);
    const outreachList = [];

    // Fetch from suggestions table
    const { data: suggestions, error: suggError } = await supabase
      .from("industry_contact_suggestions")
      .select("*")
      .eq("user_id", userId)
      .neq("action_status", null);

    if (suggError) throw suggError;

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(s => {
        if (s.action_status === "contacted" || s.action_notes) {
          outreachList.push({
            id: s.id,
            contact_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            contact_company: s.company,
            contact_title: s.title,
            message: s.action_notes,
            date: s.action_date,
            status: s.action_status,
            type: "suggestion",
            source: "Suggestion",
            mutual_contact: s.mutual_connection,
            relationship_strength: s.relationship_strength
          });
        }
      });
    }

    // Fetch from connection paths table
    const { data: connections, error: connError } = await supabase
      .from("contact_connection_paths")
      .select("*")
      .eq("user_id", userId)
      .neq("outreach_status", null);

    if (connError) throw connError;

    if (connections && connections.length > 0) {
      connections.forEach(c => {
        if (c.outreach_status === "contacted" || c.outreach_message) {
          outreachList.push({
            id: c.id,
            contact_name: c.target_contact_name,
            contact_company: c.target_company,
            contact_title: c.target_contact_title,
            message: c.outreach_message,
            date: c.outreach_date,
            status: c.outreach_status,
            type: "connection",
            source: "Warm Connection",
            mutual_contact: c.mutual_contact_name,
            relationship_strength: c.relationship_strength
          });
        }
      });
    }

    // Fetch from alumni table
    const { data: alumni, error: alError } = await supabase
      .from("alumni_connections")
      .select("*")
      .eq("user_id", userId)
      .neq("outreach_status", null);

    if (alError) throw alError;

    if (alumni && alumni.length > 0) {
      alumni.forEach(a => {
        if (a.outreach_status === "contacted" || a.outreach_message) {
          outreachList.push({
            id: a.id,
            contact_name: a.alumni_name,
            contact_company: a.alumni_company,
            contact_title: a.alumni_title,
            message: a.outreach_message,
            date: a.outreach_date,
            status: a.outreach_status,
            type: "alumni",
            source: "Alumni",
            mutual_contact: null,
            relationship_strength: a.connection_strength
          });
        }
      });
    }

    // Fetch from event participants table
    const { data: events, error: eventError } = await supabase
      .from("event_participants")
      .select("*")
      .eq("user_id", userId)
      .neq("outreach_status", null);

    if (eventError) throw eventError;

    if (events && events.length > 0) {
      events.forEach(e => {
        if (e.outreach_status === "contacted" || e.outreach_message) {
          outreachList.push({
            id: e.id,
            contact_name: e.speaker_name,
            contact_company: e.company_affiliation,
            contact_title: e.speaker_title,
            message: e.outreach_message,
            date: e.outreach_date,
            status: e.outreach_status,
            type: "event",
            source: "Event Participant",
            mutual_contact: null,
            relationship_strength: e.connection_strength
          });
        }
      });
    }

    return res.json({
      success: true,
      outreach: outreachList,
      total: outreachList.length
    });
  } catch (err) {
    console.error("❌ Error fetching all outreach:", err.message);
    return res.status(500).json({ error: "Failed to fetch outreach messages" });
  }
});

export default router;
