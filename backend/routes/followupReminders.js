// ======================================
// UC-118: Smart Follow-Up Reminder System
// ======================================

import express from "express";
import pool from "../db/pool.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Unauthorized - Token expired" });
    }
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
}

// ======================================
// HELPER FUNCTIONS
// ======================================

/**
 * Calculate suggested follow-up date based on application stage
 */
function calculateFollowUpDate(job, reminderType) {
  const now = new Date();
  let suggestedDate = new Date(now);

  switch (reminderType) {
    case "application_followup":
      // 1 week after application
      const applicationDate = job.applicationDate
        ? new Date(job.applicationDate)
        : new Date(job.created_at);
      suggestedDate = new Date(applicationDate);
      suggestedDate.setDate(suggestedDate.getDate() + 7);
      break;

    case "interview_followup":
      // 3 days after interview
      const interviewDate = job.interview_date
        ? new Date(job.interview_date)
        : null;
      if (interviewDate) {
        suggestedDate = new Date(interviewDate);
        suggestedDate.setDate(suggestedDate.getDate() + 3);
      }
      break;

    case "post_interview_thank_you":
      // Same day after interview (evening)
      const interviewDate2 = job.interview_date
        ? new Date(job.interview_date)
        : null;
      if (interviewDate2) {
        suggestedDate = new Date(interviewDate2);
        suggestedDate.setHours(18, 0, 0, 0); // 6 PM same day
      }
      break;

    case "offer_response":
      // 1 week after offer (if no response yet)
      const offerDate = job.offerDate ? new Date(job.offerDate) : null;
      if (offerDate) {
        suggestedDate = new Date(offerDate);
        suggestedDate.setDate(suggestedDate.getDate() + 7);
      }
      break;

    case "status_check":
      // 2 weeks after last status update
      const lastUpdate = job.status_updated_at
        ? new Date(job.status_updated_at)
        : new Date(job.created_at);
      suggestedDate = new Date(lastUpdate);
      suggestedDate.setDate(suggestedDate.getDate() + 14);
      break;

    default:
      suggestedDate.setDate(suggestedDate.getDate() + 7); // Default: 1 week
  }

  return suggestedDate;
}

/**
 * Generate email template based on reminder type and job details
 */
function generateEmailTemplate(job, reminderType, userEmail = "") {
  const company = job.company || "the company";
  const position = job.title || "the position";
  const contactName = job.contact_name || "Hiring Manager";

  let subject = "";
  let body = "";

  switch (reminderType) {
    case "application_followup":
      subject = `Following Up on My Application for ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `I hope this message finds you well. I wanted to follow up on my application for the ${position} position at ${company}, which I submitted on ${new Date(job.applicationDate || job.created_at).toLocaleDateString()}.\n\n` +
        `I remain very interested in this opportunity and would welcome the chance to discuss how my skills and experience align with your needs. Please let me know if you need any additional information from me.\n\n` +
        `Thank you for your time and consideration.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
      break;

    case "interview_followup":
      subject = `Following Up After Our Interview for ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `Thank you again for taking the time to speak with me about the ${position} position on ${new Date(job.interview_date).toLocaleDateString()}. I enjoyed our conversation and learning more about the role and ${company}.\n\n` +
        `I wanted to follow up to express my continued interest in this opportunity. I believe my background in [relevant experience] would be a great fit for your team.\n\n` +
        `Please let me know if there's anything else you need from me. I look forward to hearing from you.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
      break;

    case "post_interview_thank_you":
      subject = `Thank You - Interview for ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `Thank you so much for taking the time to interview me today for the ${position} position. I truly enjoyed our conversation and learning more about the role and the team at ${company}.\n\n` +
        `I'm particularly excited about [mention something specific from the interview]. I believe my experience in [relevant area] would allow me to contribute meaningfully to your team.\n\n` +
        `I'm very interested in this opportunity and look forward to the next steps in the process. Please don't hesitate to reach out if you need any additional information.\n\n` +
        `Thank you again for your time and consideration.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
      break;

    case "offer_response":
      subject = `Response Regarding Job Offer for ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `Thank you for extending the offer for the ${position} position at ${company}. I'm very excited about this opportunity.\n\n` +
        `I would like to take some time to carefully consider this offer. [Add your specific response - accepting, negotiating, or requesting extension]\n\n` +
        `I appreciate your patience and look forward to discussing this further.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
      break;

    case "status_check":
      subject = `Status Update Request - Application for ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `I hope this message finds you well. I wanted to check in on the status of my application for the ${position} position at ${company}.\n\n` +
        `I remain very interested in this opportunity and would appreciate any update you can provide on the hiring timeline or next steps in the process.\n\n` +
        `Thank you for your time and consideration.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
      break;

    default:
      subject = `Follow-Up: ${position} at ${company}`;
      body =
        `Dear ${contactName},\n\n` +
        `I wanted to follow up regarding my application for the ${position} position at ${company}.\n\n` +
        `I remain very interested in this opportunity and would welcome the chance to discuss it further.\n\n` +
        `Thank you for your time.\n\n` +
        `Best regards,\n` +
        `${userEmail.split("@")[0] || "Your Name"}`;
  }

  return { subject, body };
}

/**
 * Calculate company responsiveness score based on response history
 */
async function calculateResponsivenessScore(userId, jobId) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_followups,
        SUM(CASE WHEN response_received = true THEN 1 ELSE 0 END) as responses_received,
        AVG(EXTRACT(EPOCH FROM (response_date - due_date)) / 86400) as avg_response_days
      FROM followup_history
      WHERE user_id = $1 AND job_id = $2`,
      [userId, jobId]
    );

    const row = result.rows[0];
    if (!row || row.total_followups === "0") {
      return 0.5; // Default neutral score
    }

    const responseRate =
      parseFloat(row.responses_received) / parseFloat(row.total_followups);
    const avgDays = parseFloat(row.avg_response_days) || 0;

    // Calculate score: response rate (0-1) weighted by speed (faster = higher)
    // Companies responding within 1 day get full points, 7+ days get reduced points
    const speedFactor = Math.max(0, 1 - avgDays / 7); // 1 day = 0.86, 7 days = 0
    const score = responseRate * 0.7 + speedFactor * 0.3;

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  } catch (err) {
    console.error("Error calculating responsiveness score:", err);
    return 0.5; // Default on error
  }
}

/**
 * Adjust reminder frequency based on company responsiveness
 */
function adjustReminderFrequency(responsivenessScore, baseDays) {
  // More responsive companies: check in more frequently
  // Less responsive companies: wait longer between follow-ups
  if (responsivenessScore >= 0.7) {
    return Math.max(3, baseDays - 2); // Responsive: reduce wait time
  } else if (responsivenessScore <= 0.3) {
    return baseDays + 3; // Unresponsive: increase wait time
  }
  return baseDays; // Neutral: use base timing
}

// ======================================
// ROUTES
// ======================================

// GET all follow-up reminders for user
router.get("/", auth, async (req, res) => {
  try {
    const { status, job_id, type } = req.query;

    let query = `
      SELECT 
        fr.*,
        j.title,
        j.company,
        j.status as job_status,
        j.contact_name,
        j.contact_email,
        j."applicationDate",
        j.interview_date,
        j."offerDate"
      FROM followup_reminders fr
      JOIN jobs j ON fr.job_id = j.id
      WHERE fr.user_id = $1
    `;

    const params = [req.userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND fr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (job_id) {
      query += ` AND fr.job_id = $${paramIndex}`;
      params.push(job_id);
      paramIndex++;
    }

    if (type) {
      query += ` AND fr.reminder_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY fr.due_date ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching follow-up reminders:", err);
    console.error("Error details:", err.message, err.code);

    // Check if it's a table doesn't exist error
    if (err.code === "42P01" || err.message.includes("does not exist")) {
      return res.status(500).json({
        error:
          "Database tables not found. Please run the migration: backend/db/add_followup_reminders_schema.sql",
        details: err.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch reminders",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// GET upcoming/due reminders
router.get("/upcoming", auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const result = await pool.query(
      `SELECT 
        fr.*,
        j.title,
        j.company,
        j.status as job_status,
        j.contact_name,
        j.contact_email,
        j."applicationDate",
        j.interview_date,
        j."offerDate"
      FROM followup_reminders fr
      JOIN jobs j ON fr.job_id = j.id
      WHERE fr.user_id = $1
        AND fr.status IN ('pending', 'due', 'snoozed')
        AND fr.due_date <= $2
        AND j.status != 'Rejected'
      ORDER BY fr.due_date ASC`,
      [req.userId, futureDate]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching upcoming reminders:", err);
    console.error("Error details:", err.message, err.code);

    // Check if it's a table doesn't exist error
    if (err.code === "42P01" || err.message.includes("does not exist")) {
      return res.status(500).json({
        error:
          "Database tables not found. Please run the migration: backend/db/add_followup_reminders_schema.sql",
        details: err.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch upcoming reminders",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// GET etiquette tips (must come before /:id route)
router.get("/etiquette/tips", auth, async (req, res) => {
  try {
    const { reminder_type } = req.query;

    let query = `SELECT * FROM followup_etiquette_tips`;
    const params = [];

    if (reminder_type) {
      query += ` WHERE reminder_type = $1`;
      params.push(reminder_type);
    }

    query += ` ORDER BY priority DESC, tip_category`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching etiquette tips:", err);
    console.error("Error details:", err.message, err.code);

    // Check if it's a table doesn't exist error
    if (err.code === "42P01" || err.message.includes("does not exist")) {
      return res.status(500).json({
        error:
          "Database tables not found. Please run the migration: backend/db/add_followup_reminders_schema.sql",
        details: err.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch tips",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// GET single reminder
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        fr.*,
        j.title,
        j.company,
        j.status as job_status,
        j.contact_name,
        j.contact_email,
        j."applicationDate",
        j.interview_date,
        j."offerDate"
      FROM followup_reminders fr
      JOIN jobs j ON fr.job_id = j.id
      WHERE fr.id = $1 AND fr.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching reminder:", err);
    res.status(500).json({ error: "Failed to fetch reminder" });
  }
});

// POST create follow-up reminder (manual or automatic)
router.post("/", auth, async (req, res) => {
  try {
    const { job_id, reminder_type, scheduled_date, custom_message, notes } =
      req.body;

    if (!job_id) {
      return res.status(400).json({ error: "job_id is required" });
    }

    // Get job details
    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [job_id, req.userId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobResult.rows[0];

    // Don't create reminders for rejected applications
    if (job.status === "Rejected") {
      return res
        .status(400)
        .json({ error: "Cannot create reminders for rejected applications" });
    }

    // Determine reminder type if not provided
    const finalReminderType = reminder_type || determineReminderType(job);

    // Calculate dates
    const suggestedDate = calculateFollowUpDate(job, finalReminderType);
    const finalScheduledDate = scheduled_date
      ? new Date(scheduled_date)
      : suggestedDate;
    const dueDate = new Date(finalScheduledDate);
    dueDate.setHours(9, 0, 0, 0); // 9 AM on scheduled date

    // Generate email template
    const { subject, body } = generateEmailTemplate(
      job,
      finalReminderType,
      req.user.email
    );

    // Calculate responsiveness score
    const responsivenessScore = await calculateResponsivenessScore(
      req.userId,
      job_id
    );

    // Insert reminder
    const insertResult = await pool.query(
      `INSERT INTO followup_reminders (
        user_id, job_id, reminder_type, suggested_date, scheduled_date, due_date,
        email_subject, email_template, company_responsiveness_score, notes, user_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.userId,
        job_id,
        finalReminderType,
        suggestedDate,
        finalScheduledDate,
        dueDate,
        subject,
        custom_message || body,
        responsivenessScore,
        notes || null,
        null,
      ]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error("Error creating reminder:", err);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

// Helper function to determine reminder type based on job status
function determineReminderType(job) {
  if (job.status === "Offer") {
    return "offer_response";
  } else if (job.status === "Interview" && job.interview_date) {
    const interviewDate = new Date(job.interview_date);
    const now = new Date();
    const daysSinceInterview = Math.floor(
      (now - interviewDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceInterview === 0) {
      return "post_interview_thank_you";
    } else if (daysSinceInterview >= 3) {
      return "interview_followup";
    }
  } else if (job.status === "Applied" || job.applicationDate) {
    const appDate = job.applicationDate
      ? new Date(job.applicationDate)
      : new Date(job.created_at);
    const now = new Date();
    const daysSinceApp = Math.floor((now - appDate) / (1000 * 60 * 60 * 24));

    if (daysSinceApp >= 7) {
      return "application_followup";
    }
  }

  return "status_check";
}

// PUT update reminder
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      scheduled_date,
      due_date,
      status,
      email_template,
      notes,
      user_notes,
    } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      `SELECT id FROM followup_reminders WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (scheduled_date !== undefined) {
      updates.push(`scheduled_date = $${paramIndex}`);
      params.push(new Date(scheduled_date));
      paramIndex++;
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      params.push(new Date(due_date));
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      // Set completion/dismissal timestamps
      if (status === "completed") {
        updates.push(`completed_at = NOW()`);
      } else if (status === "dismissed") {
        updates.push(`dismissed_at = NOW()`);
      }
    }

    if (email_template !== undefined) {
      updates.push(`email_template = $${paramIndex}`);
      params.push(email_template);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (user_notes !== undefined) {
      updates.push(`user_notes = $${paramIndex}`);
      params.push(user_notes);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);
    params.push(req.userId);

    const result = await pool.query(
      `UPDATE followup_reminders 
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating reminder:", err);
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

// POST snooze reminder
router.post("/:id/snooze", auth, async (req, res) => {
  try {
    const { days = 1 } = req.body;
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + parseInt(days));

    const result = await pool.query(
      `UPDATE followup_reminders
       SET status = 'snoozed',
           snoozed_until = $1,
           snooze_count = snooze_count + 1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [snoozeUntil, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error snoozing reminder:", err);
    res.status(500).json({ error: "Failed to snooze reminder" });
  }
});

// POST dismiss reminder
router.post("/:id/dismiss", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE followup_reminders
       SET status = 'dismissed',
           dismissed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error dismissing reminder:", err);
    res.status(500).json({ error: "Failed to dismiss reminder" });
  }
});

// POST complete reminder
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const {
      followup_method,
      message_sent,
      response_received,
      response_type,
      notes,
    } = req.body;

    // Update reminder status
    const reminderResult = await pool.query(
      `UPDATE followup_reminders
       SET status = 'completed',
           completed_at = NOW(),
           email_sent = $1,
           email_sent_at = CASE WHEN $1 THEN NOW() ELSE email_sent_at END,
           response_received = $2,
           response_date = CASE WHEN $2 THEN NOW() ELSE response_date END,
           response_type = $3,
           user_notes = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        followup_method === "email",
        response_received || false,
        response_type || null,
        notes || null,
        req.params.id,
        req.userId,
      ]
    );

    if (reminderResult.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    const reminder = reminderResult.rows[0];

    // Create history entry
    await pool.query(
      `INSERT INTO followup_history (
        user_id, job_id, reminder_id, followup_type, followup_date,
        followup_method, message_sent, subject_line,
        response_received, response_type
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9)`,
      [
        req.userId,
        reminder.job_id,
        reminder.id,
        reminder.reminder_type,
        followup_method || "email",
        message_sent || reminder.email_template,
        reminder.email_subject,
        response_received || false,
        response_type || null,
      ]
    );

    // Update company responsiveness score
    const newScore = await calculateResponsivenessScore(
      req.userId,
      reminder.job_id
    );
    await pool.query(
      `UPDATE followup_reminders
       SET company_responsiveness_score = $1
       WHERE job_id = $2 AND user_id = $3`,
      [newScore, reminder.job_id, req.userId]
    );

    res.json(reminderResult.rows[0]);
  } catch (err) {
    console.error("Error completing reminder:", err);
    res.status(500).json({ error: "Failed to complete reminder" });
  }
});

// POST automatically create reminders for jobs
router.post("/auto-schedule", auth, async (req, res) => {
  try {
    // Get all active jobs that need reminders
    const jobsResult = await pool.query(
      `SELECT j.*
       FROM jobs j
       WHERE j.user_id = $1
         AND j.status != 'Rejected'
         AND j.status != 'Offer'
         AND NOT EXISTS (
           SELECT 1 FROM followup_reminders fr
           WHERE fr.job_id = j.id
             AND fr.status IN ('pending', 'due', 'snoozed')
         )
       ORDER BY j.status_updated_at DESC`,
      [req.userId]
    );

    const createdReminders = [];

    for (const job of jobsResult.rows) {
      const reminderType = determineReminderType(job);
      if (!reminderType) continue;

      // Check if reminder already exists for this type
      const existingCheck = await pool.query(
        `SELECT id FROM followup_reminders
         WHERE job_id = $1 AND reminder_type = $2 AND status != 'completed' AND status != 'dismissed'`,
        [job.id, reminderType]
      );

      if (existingCheck.rows.length > 0) continue;

      const suggestedDate = calculateFollowUpDate(job, reminderType);
      const dueDate = new Date(suggestedDate);
      dueDate.setHours(9, 0, 0, 0);

      const { subject, body } = generateEmailTemplate(
        job,
        reminderType,
        req.user.email
      );
      const responsivenessScore = await calculateResponsivenessScore(
        req.userId,
        job.id
      );

      const insertResult = await pool.query(
        `INSERT INTO followup_reminders (
          user_id, job_id, reminder_type, suggested_date, scheduled_date, due_date,
          email_subject, email_template, company_responsiveness_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          req.userId,
          job.id,
          reminderType,
          suggestedDate,
          suggestedDate,
          dueDate,
          subject,
          body,
          responsivenessScore,
        ]
      );

      createdReminders.push(insertResult.rows[0]);
    }

    res.json({
      message: `Created ${createdReminders.length} reminders`,
      reminders: createdReminders,
    });
  } catch (err) {
    console.error("Error auto-scheduling reminders:", err);
    res.status(500).json({ error: "Failed to auto-schedule reminders" });
  }
});

// GET follow-up history for a job
router.get("/history/:job_id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fh.*, fr.reminder_type, fr.email_subject
       FROM followup_history fh
       LEFT JOIN followup_reminders fr ON fh.reminder_id = fr.id
       WHERE fh.user_id = $1 AND fh.job_id = $2
       ORDER BY fh.followup_date DESC`,
      [req.userId, req.params.job_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching follow-up history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Export helper functions for testing
export {
  calculateFollowUpDate,
  generateEmailTemplate,
  calculateResponsivenessScore,
  adjustReminderFrequency,
  determineReminderType,
};

export default router;
