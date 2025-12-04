import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Helper function
function ensureNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/* ==================================================================
   CONTACTS CRUD
================================================================== */

// GET all contacts
router.get("/contacts", async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT * FROM networking_contacts 
       WHERE user_id = $1 
       ORDER BY relationship_strength DESC, name ASC`,
      [userId]
    );
    res.json({ contacts: rows });
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET single contact
router.get("/contacts/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM networking_contacts 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json({ contact: rows[0] });
  } catch (err) {
    console.error("Error fetching contact:", err);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST create contact
router.post("/contacts", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      email,
      company,
      title,
      industry,
      linkedin_url,
      relationship_strength = 1,
      engagement_score = 0,
      reciprocity_score = 0,
      notes,
      tags = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO networking_contacts (
        user_id, name, email, company, title, industry, linkedin_url,
        relationship_strength, engagement_score, reciprocity_score, notes, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId, name, email || null, company || null, title || null,
        industry || null, linkedin_url || null,
        relationship_strength, engagement_score, reciprocity_score,
        notes || null, tags
      ]
    );

    res.status(201).json({ contact: rows[0] });
  } catch (err) {
    console.error("Error creating contact:", err);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// PUT update contact
router.put("/contacts/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name, email, company, title, industry, linkedin_url,
      relationship_strength, engagement_score, reciprocity_score,
      last_contact_date, next_followup_date, notes, tags
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE networking_contacts SET
        name = COALESCE($3, name),
        email = COALESCE($4, email),
        company = COALESCE($5, company),
        title = COALESCE($6, title),
        industry = COALESCE($7, industry),
        linkedin_url = COALESCE($8, linkedin_url),
        relationship_strength = COALESCE($9, relationship_strength),
        engagement_score = COALESCE($10, engagement_score),
        reciprocity_score = COALESCE($11, reciprocity_score),
        last_contact_date = COALESCE($12, last_contact_date),
        next_followup_date = COALESCE($13, next_followup_date),
        notes = COALESCE($14, notes),
        tags = COALESCE($15, tags),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
      [
        id, userId, name, email, company, title, industry, linkedin_url,
        relationship_strength, engagement_score, reciprocity_score,
        last_contact_date, next_followup_date, notes, tags
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({ contact: rows[0] });
  } catch (err) {
    console.error("Error updating contact:", err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// DELETE contact
router.delete("/contacts/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query(
      `DELETE FROM networking_contacts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ message: "Contact deleted" });
  } catch (err) {
    console.error("Error deleting contact:", err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

/* ==================================================================
   ACTIVITIES CRUD
================================================================== */

// GET all activities
router.get("/activities", async (req, res) => {
  try {
    const userId = req.user.id;
    const { contact_id } = req.query;
    
    let query = `SELECT a.*, c.name AS contact_name, c.company AS contact_company
                  FROM networking_activities a
                  LEFT JOIN networking_contacts c ON a.contact_id = c.id
                  WHERE a.user_id = $1`;
    let params = [userId];
    
    if (contact_id) {
      query += ` AND a.contact_id = $2`;
      params.push(contact_id);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json({ activities: rows });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// POST create activity
router.post("/activities", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      contact_id,
      activity_type,
      channel,
      direction = 'outbound',
      subject,
      notes,
      outcome,
      relationship_impact = 0,
      time_spent_minutes = 0
    } = req.body;

    if (!activity_type) {
      return res.status(400).json({ error: "Activity type is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO networking_activities (
        user_id, contact_id, activity_type, channel, direction,
        subject, notes, outcome, relationship_impact, time_spent_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId, contact_id || null, activity_type, channel || null, direction,
        subject || null, notes || null, outcome || null,
        relationship_impact, time_spent_minutes
      ]
    );

    // Update contact's last_contact_date if contact_id is provided
    if (contact_id) {
      await pool.query(
        `UPDATE networking_contacts 
         SET last_contact_date = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [contact_id, userId]
      );
    }

    res.status(201).json({ activity: rows[0] });
  } catch (err) {
    console.error("Error creating activity:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

/* ==================================================================
   EVENTS CRUD
================================================================== */

// GET all events
router.get("/events", async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT * FROM networking_events 
       WHERE user_id = $1 
       ORDER BY event_date DESC`,
      [userId]
    );
    res.json({ events: rows });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// POST create event
router.post("/events", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      event_name,
      event_type,
      location,
      is_virtual = false,
      event_date,
      event_start_time,
      event_end_time,
      cost = 0,
      expected_connections = 0,
      actual_connections_made = 0,
      notes,
      industry,
      description
    } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ error: "Event name and date are required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO networking_events (
        user_id, event_name, event_type, location, is_virtual,
        event_date, event_start_time, event_end_time, cost, 
        expected_connections, actual_connections_made, notes, industry, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId, event_name, event_type || 'networking_mixer', location || null, is_virtual,
        event_date, event_start_time || null, event_end_time || null, cost,
        expected_connections, actual_connections_made, notes || null, industry || null, description || null
      ]
    );

    res.status(201).json({ event: rows[0] });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

/* ==================================================================
   REFERRALS CRUD
================================================================== */

// GET all referrals
router.get("/referrals", async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT r.*, 
              c.name AS contact_name, c.company AS contact_company,
              j.title AS job_title, j.company AS job_company
       FROM networking_referrals r
       LEFT JOIN networking_contacts c ON r.contact_id = c.id
       LEFT JOIN jobs j ON r.job_id = j.id
       WHERE r.user_id = $1 
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ referrals: rows });
  } catch (err) {
    console.error("Error fetching referrals:", err);
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
});

// POST create referral
router.post("/referrals", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      contact_id,
      job_id,
      referral_type,
      referrer_name,
      referrer_company,
      company_referred_to,
      position_referred_for,
      quality_score = 5
    } = req.body;

    if (!referral_type) {
      return res.status(400).json({ error: "Referral type is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO networking_referrals (
        user_id, contact_id, job_id, referral_type,
        referrer_name, referrer_company, company_referred_to,
        position_referred_for, quality_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        userId, contact_id || null, job_id || null, referral_type,
        referrer_name || null, referrer_company || null,
        company_referred_to || null, position_referred_for || null,
        quality_score
      ]
    );

    res.status(201).json({ referral: rows[0] });
  } catch (err) {
    console.error("Error creating referral:", err);
    res.status(500).json({ error: "Failed to create referral" });
  }
});

// PUT update referral status
router.put("/referrals/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      status,
      converted_to_interview,
      converted_to_offer,
      quality_score
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE networking_referrals SET
        status = COALESCE($3, status),
        converted_to_interview = COALESCE($4, converted_to_interview),
        converted_to_offer = COALESCE($5, converted_to_offer),
        quality_score = COALESCE($6, quality_score),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
      [id, userId, status, converted_to_interview, converted_to_offer, quality_score]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }

    res.json({ referral: rows[0] });
  } catch (err) {
    console.error("Error updating referral:", err);
    res.status(500).json({ error: "Failed to update referral" });
  }
});

export default router;

