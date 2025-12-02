// backend/routes/job.js

import express from "express";
//import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../db/pool.js";
import { getRoleTypeFromTitle } from "../utils/roleTypeMapper.js";

dotenv.config();
const router = express.Router();
//const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const STAGES = [
  "Interested",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --------------------------------------------------
// 🔥 CREATE JOB + MATERIALS HISTORY INSERT
// --------------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      salary_min,
      salary_max,
      url,
      deadline,
      description,
      industry,
      type,
      applicationDate,
      resume_id,
      cover_letter_id,
      required_skills,
    } = req.body;

    if (!title?.trim() || !company?.trim()) {
      return res.status(400).json({ error: "Title and company are required." });
    }

    if (!deadline) {
      return res.status(400).json({ error: "Deadline is required." });
    }

    const cleanNumber = (v) => {
      if (!v) return null;
      const num = parseInt(String(v).replace(/[^\d]/g, ""), 10);
      return isNaN(num) ? null : num;
    };

    const safeSalaryMin = cleanNumber(salary_min);
    const safeSalaryMax = cleanNumber(salary_max);

    // Handle template cover letters: if cover_letter_id starts with "template_", 
    // create a copy of the template as a user cover letter
    let finalCoverLetterId = cover_letter_id || null;
    
    // Only process if it's a valid number or a template ID
    if (cover_letter_id) {
      const coverLetterIdStr = String(cover_letter_id);
      
      // Check if it's a template ID (starts with "template_")
      if (coverLetterIdStr.startsWith('template_')) {
        try {
          const templateId = parseInt(coverLetterIdStr.replace('template_', ''), 10);
          if (!isNaN(templateId)) {
            // Fetch the template
            const templateResult = await pool.query(
              `SELECT name, content FROM cover_letter_templates WHERE id = $1`,
              [templateId]
            );
            
            if (templateResult.rows.length > 0) {
              const template = templateResult.rows[0];
              // Try different column combinations based on what exists in the table
              // Start without 'format' since it likely doesn't exist
              try {
                // Try with 'title' first (no format)
                const newCoverLetterResult = await pool.query(
                  `INSERT INTO cover_letters (user_id, title, content)
                   VALUES ($1, $2, $3)
                   RETURNING id`,
                  [req.userId, `${template.name} (from template)`, template.content || '']
                );
                finalCoverLetterId = newCoverLetterResult.rows[0].id;
                console.log(`✅ Created cover letter from template ${templateId}, new ID: ${finalCoverLetterId}`);
              } catch (insertErr) {
                if (insertErr.code === '42703') { // Column doesn't exist
                  // Try with 'name' instead of 'title'
                  try {
                    const newCoverLetterResult = await pool.query(
                      `INSERT INTO cover_letters (user_id, name, content)
                       VALUES ($1, $2, $3)
                       RETURNING id`,
                      [req.userId, `${template.name} (from template)`, template.content || '']
                    );
                    finalCoverLetterId = newCoverLetterResult.rows[0].id;
                    console.log(`✅ Created cover letter from template ${templateId} (using 'name'), new ID: ${finalCoverLetterId}`);
                  } catch (insertErr2) {
                    console.error("❌ Failed to create cover letter from template:", insertErr2.message);
                    console.error("❌ Error details:", insertErr2);
                    finalCoverLetterId = null;
                  }
                } else {
                  console.error("❌ Failed to create cover letter from template:", insertErr.message);
                  finalCoverLetterId = null;
                }
              }
            } else {
              console.warn(`⚠️ Template ${templateId} not found`);
              finalCoverLetterId = null;
            }
          } else {
            console.warn(`⚠️ Invalid template ID format: ${coverLetterIdStr}`);
            finalCoverLetterId = null;
          }
        } catch (templateErr) {
          console.error("❌ Failed to create cover letter from template:", templateErr.message);
          // Fall back to null if template creation fails
          finalCoverLetterId = null;
        }
      } else {
        // It's a regular cover letter ID - ensure it's a valid number
        const numericId = parseInt(coverLetterIdStr, 10);
        if (isNaN(numericId)) {
          console.warn(`⚠️ Invalid cover_letter_id format: ${coverLetterIdStr}, setting to null`);
          finalCoverLetterId = null;
        } else {
          finalCoverLetterId = numericId;
        }
      }
    }

    const insertJobQuery = `
      INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type,
        "applicationDate", resume_id, cover_letter_id, required_skills,
        status, status_updated_at, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Interested',NOW(),NOW())
      RETURNING *;
    `;

    // Final safety check: ensure finalCoverLetterId is a number or null
    if (finalCoverLetterId !== null) {
      const coverLetterIdStr = String(finalCoverLetterId);
      if (coverLetterIdStr.startsWith('template_')) {
        console.error(`❌ ERROR: finalCoverLetterId still contains template prefix: ${finalCoverLetterId}`);
        console.error(`❌ This should not happen - template conversion should have occurred`);
        finalCoverLetterId = null; // Set to null to prevent database error
      } else {
        const numericId = parseInt(coverLetterIdStr, 10);
        if (isNaN(numericId)) {
          console.error(`❌ ERROR: finalCoverLetterId is not a valid number: ${finalCoverLetterId}`);
          finalCoverLetterId = null;
        } else {
          finalCoverLetterId = numericId;
        }
      }
    }

    // Debug: Log the final cover letter ID before inserting
    console.log(`🔍 Final cover_letter_id value before insert:`, finalCoverLetterId);
    console.log(`🔍 Type of finalCoverLetterId:`, typeof finalCoverLetterId);
    console.log(`🔍 Original cover_letter_id from request:`, cover_letter_id);

    const jobValues = [
      req.userId,
      title.trim(),
      company.trim(),
      location || "",
      safeSalaryMin,
      safeSalaryMax,
      url || "",
      deadline,
      description || "",
      industry || "",
      getRoleTypeFromTitle(title),
      applicationDate || null,
      resume_id || null,
      finalCoverLetterId,
      Array.isArray(required_skills) ? required_skills : [],
    ];

    console.log(`🔍 Job values array (cover_letter_id at index 13):`, jobValues[13]);

    const { rows } = await pool.query(insertJobQuery, jobValues);
    const newJob = rows[0];

    // 🧩 RECORD MATERIAL HISTORY
    // Use finalCoverLetterId instead of cover_letter_id to handle template conversions
    if (resume_id || finalCoverLetterId) {
      await pool.query(
        `INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [newJob.id, req.userId, resume_id || null, finalCoverLetterId || null, "initial_set"]

      );
      
    }

    res.status(201).json({
      status: "success",
      job: newJob,
      message: "Job created successfully + materials history recorded.",
    });
  } catch (err) {
    console.error("❌ Job insert error:", err);
    res.status(500).json({ error: "Failed to save job." });
  }
});

// --------------------------------------------------
// TEMP FIX: Fill missing role types on all existing jobs
// --------------------------------------------------
router.post("/fix-role-types", auth, async (req, res) => {
  try {
    const jobs = await pool.query(
      `SELECT id, title FROM jobs WHERE user_id=$1`,
      [req.userId]
    );

    console.log("🔥 FIX ROUTE HIT");
    console.log("Rows found:", jobs.rows.length);

    for (const job of jobs.rows) {
      const roleType = getRoleTypeFromTitle(job.title);
      console.log(`Updating: ${job.title} → ${roleType}`);

      await pool.query(
        `UPDATE jobs SET type=$1 WHERE id=$2`,
        [roleType, job.id]
      );
    }

    res.json({ message: "Role types updated for all jobs!" });
  } catch (err) {
    console.error("❌ Role type fix error:", err);
    res.status(500).json({ error: "Failed to update role types" });
  }
});



// ---------- LIST ALL JOBS (Filters out archived) ----------
router.get("/", auth, async (req, res) => {
  try {
    const {
      search,
      status,
      industry,
      location,
      salaryMin,
      salaryMax,
      dateFrom,
      dateTo,
      sortBy = "date_added",
    } = req.query;

    const params = [req.userId];
    // This line correctly filters out archived jobs
    const whereClauses = ["user_id = $1", `"isarchived" = false`]; 
    let i = 2;

    if (search) {
      whereClauses.push(
        `(title ILIKE $${i} OR company ILIKE $${i} OR description ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }
    if (status && STAGES.includes(status)) {
      whereClauses.push(`LOWER(status) = LOWER($${i})`);
      params.push(status.trim());
      i++;
    }
    if (industry) {
      whereClauses.push(`industry ILIKE $${i}`);
      params.push(`%${industry}%`);
      i++;
    }
    if (location) {
      whereClauses.push(`location ILIKE $${i}`);
      params.push(`%${location}%`);
      i++;
    }
    if (salaryMin) {
      whereClauses.push(`salary_min >= $${i}`);
      params.push(salaryMin);
      i++;
    }
    if (salaryMax) {
      whereClauses.push(`salary_max <= $${i}`);
      params.push(salaryMax);
      i++;
    }
    if (dateFrom) {
      whereClauses.push(`deadline >= $${i}`);
      params.push(dateFrom);
      i++;
    }
    if (dateTo) {
      whereClauses.push(`deadline <= $${i}`);
      params.push(dateTo);
      i++;
    }

    let orderColumn = "created_at";
    switch (sortBy) {
      case "deadline":
        orderColumn = "deadline";
        break;
      case "salary":
        orderColumn = "salary_max";
        break;
      case "company":
        orderColumn = "company";
        break;
      default:
        orderColumn = "created_at";
    }

    const result = await pool.query(
      `
      SELECT *,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at))) / 86400.0))::int AS days_in_stage
      FROM jobs
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ${orderColumn} DESC
    `,
      params
    );

    res.json({ jobs: result.rows });
  } catch (err) {
    console.error("❌ Fetch jobs error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

//
// ==================================================================
//               STATISTICS ROUTE (UC-044)
// ==================================================================
//
router.get("/stats", auth, async (req, res) => {
  try {
    const query = `
      WITH user_jobs AS (
        -- Filter out archived jobs from stats
        SELECT * FROM jobs WHERE user_id = $1 AND "isarchived" = false 
      ),
      
      -- AC-1: Total jobs by status
      jobs_by_status AS (
        SELECT status, COUNT(*) AS count
        FROM user_jobs
        GROUP BY status
      ),
      
      -- AC-4: Monthly application volume chart
      monthly_volume AS (
        SELECT 
          DATE_TRUNC('month', "applicationDate") AS month,
          COUNT(*) AS count
        FROM user_jobs
        WHERE "applicationDate" IS NOT NULL
        GROUP BY month
        ORDER BY month
      ),
      
      -- AC-2: Application response rate percentage
      response_rate AS (
        SELECT 
          (SUM(CASE WHEN status NOT IN ('Interested', 'Applied') THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100 AS rate
        FROM user_jobs
      ),
      
      -- AC-5: Application deadline adherence tracking
      adherence AS (
        SELECT 
          (SUM(CASE WHEN "applicationDate" <= deadline THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100 AS rate
        FROM user_jobs
        WHERE "applicationDate" IS NOT NULL AND deadline IS NOT NULL
      ),
      
      -- AC-6: Time-to-offer analytics
      time_to_offer AS (
        SELECT 
          AVG("offerDate" - "applicationDate") AS avg_days
        FROM user_jobs
        WHERE "offerDate" IS NOT NULL AND "applicationDate" IS NOT NULL
      ),
      
      -- AC-3: Average time in each pipeline stage
      avg_time_in_stage AS (
        SELECT 
          status,
          AVG(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at))) / 86400.0))::int) AS avg_days
        FROM user_jobs
        GROUP BY status
      )

      -- Final JSON Output
      SELECT 
        (SELECT COUNT(*) FROM user_jobs) AS "totalJobs",
        (SELECT json_agg(t) FROM jobs_by_status t) AS "jobsByStatus",
        (SELECT json_agg(t) FROM monthly_volume t) AS "monthlyVolume",
        (SELECT rate FROM response_rate) AS "responseRate",
        (SELECT rate FROM adherence) AS "adherenceRate",
        (SELECT avg_days FROM time_to_offer) AS "avgTimeToOffer",
        (SELECT json_agg(t) FROM avg_time_in_stage t) AS "avgTimeInStage"
    `;

    const result = await pool.query(query, [req.userId]);

    // Clean up NULLs to 0 or empty arrays
    const stats = result.rows[0];
    stats.totalJobs = parseInt(stats.totalJobs, 10) || 0;
    stats.jobsByStatus = stats.jobsByStatus || [];
    stats.monthlyVolume = stats.monthlyVolume || [];
    stats.responseRate = parseFloat(stats.responseRate).toFixed(1) || 0;
    stats.adherenceRate = parseFloat(stats.adherenceRate).toFixed(1) || 0;
    stats.avgTimeToOffer = parseFloat(stats.avgTimeToOffer).toFixed(1) || 0;
    stats.avgTimeInStage = stats.avgTimeInStage || [];

    if (stats.totalJobs === 0) {
      stats.message = "No job data available to calculate statistics.";
    }

    res.json(stats);
  } catch (err) {
    console.error("❌ Statistics query error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

//
// ==================================================================
//               ARCHIVE ROUTES (UC-045)
// ==================================================================
//
// ---------- GET ARCHIVED JOBS (AC-2) ----------
router.get("/archived", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 AND "isarchived" = true
       ORDER BY status_updated_at DESC`,
      [req.userId]
    );
    res.json({ jobs: result.rows });
  } catch (err) {
    console.error("❌ Fetch archived jobs error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- GET JOB BY ID ----------
// This route MUST come AFTER specific routes like /stats and /archived
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (jobResult.rows.length === 0)
      return res.status(404).json({ error: "Job not found" });

    const job = jobResult.rows[0];

    // Load application history
    const historyResult = await pool.query(
      `
      SELECT id, event, timestamp
      FROM application_history
      WHERE job_id = $1
      ORDER BY timestamp DESC
      `,
      [id]
    );

    job.history = historyResult.rows;

    res.json({ job });
  } catch (err) {
    console.error("❌ Get job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// --------------------------------------------------
// 🔥 UPDATE JOB + RECORD MATERIALS HISTORY
// --------------------------------------------------
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "title",
      "company",
      "location",
      "status",
      "salary_min",
      "salary_max",
      "deadline",
      "description",
      "industry",
      "type",
      "notes",
      "contact_name",
      "contact_email",
      "contact_phone",
      "salary_notes",
      "interview_feedback",
      "resume_id",
      "cover_letter_id",
      "applicationDate",
      "offerDate",
      "required_skills",
      "resume_customization",
      "cover_letter_customization",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.title) {
      updates.type = getRoleTypeFromTitle(updates.title);
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No valid fields to update" });

    // Auto-set offerDate when status changes to 'Offer'
    if (updates.status === "Offer" && !updates.offerDate) {
      updates.offerDate = new Date();
    }

    // Dynamic SQL
    const setClause = Object.keys(updates)
      .map((k, i) => `"${k}" = $${i + 1}`)
      .join(", ");

    const values = Object.values(updates);

    const result = await pool.query(
      `
      UPDATE jobs
      SET ${setClause},
          status_updated_at = CASE
            WHEN $${values.length + 1} IS DISTINCT FROM status
            THEN NOW()
            ELSE status_updated_at
          END
      WHERE id = $${values.length + 2}
        AND user_id = $${values.length + 3}
      RETURNING *;
      `,
      [...values, updates.status || null, id, req.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found" });

    const job = result.rows[0];

    // 🔥 If materials changed → ADD HISTORY ENTRY
    if (updates.resume_id || updates.cover_letter_id) {
      await pool.query(
        `
        INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action)
        VALUES ($1, $2, $3, $4, $5)


      `,
      [id, req.userId, updates.resume_id || null, updates.cover_letter_id || null, "updated"]

      );
    }

    res.json({ job });
  } catch (err) {
    console.error("❌ Job update error:", err.message);
    res.status(500).json({ error: "Database update failed" });
  }
});

// 🔥 MATERIALS HISTORY FOR THIS JOB
// --------------------------------------------------
// 🔥 MATERIALS HISTORY FOR THIS JOB
router.get("/:id/materials-history", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        h.id,
        h.changed_at,
        r.title AS resume_title,
        c.name AS cover_title
      FROM application_materials_history h
      LEFT JOIN resumes r ON r.id = h.resume_id
      LEFT JOIN cover_letters c ON c.id = h.cover_letter_id
      WHERE h.job_id = $1
      ORDER BY h.changed_at DESC;
      `,
      [id]
    );

    res.json({ history: result.rows });
  } catch (err) {
    console.error("❌ History fetch error:", err.message);
    res.status(500).json({ error: "Failed to load materials history" });
  }
});


// ---------- UPDATE MATERIALS (resume + cover letter + customization levels) ----------
router.put("/:id/materials", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resume_id, cover_letter_id, resume_customization, cover_letter_customization } = req.body;

    // Validate customization levels
    const validLevels = ['none', 'light', 'heavy', 'tailored'];
    const safeResumeCustomization = validLevels.includes(resume_customization) ? resume_customization : 'none';
    const safeCoverLetterCustomization = validLevels.includes(cover_letter_customization) ? cover_letter_customization : 'none';

    // Update the job with new resume + cover letter + customization levels
    const updateQuery = `
      UPDATE jobs 
      SET resume_id = $1,
          cover_letter_id = $2,
          resume_customization = $3,
          cover_letter_customization = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *;
    `;

    const updateValues = [
      resume_id || null,
      cover_letter_id || null,
      safeResumeCustomization,
      safeCoverLetterCustomization,
      id,
      req.userId,
    ];

    const result = await pool.query(updateQuery, updateValues);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    const updatedJob = result.rows[0];

    // Insert a new materials history log
    await pool.query(
      `
      INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, req.userId, resume_id || null, cover_letter_id || null, "materials_updated"]
    );

    res.json({
      message: "Materials and customization levels updated successfully",
      job: updatedJob,
    });
  } catch (err) {
    console.error("Materials update error:", err.message);
    res.status(500).json({ error: "Failed to update materials" });
  }
});

// ---------- DELETE JOB ----------
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json({ message: "Job permanently deleted" });
  } catch (err) {
    console.error("❌ Delete job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- UPDATE STATUS ----------
// ---------- UPDATE STATUS (with interview_date + offer_date logic) ----------
router.put("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    let query;
    let params;

    // 1️⃣ If status becomes INTERVIEW → set interview_date automatically
    if (status === "Interview") {
      query = `
        UPDATE jobs
        SET status = $1,
            status_updated_at = NOW(),
            interview_date = COALESCE(interview_date, NOW())
        WHERE id = $2 AND user_id = $3
        RETURNING *;
      `;
      params = [status, id, req.userId];
    }

    // 2️⃣ If status becomes OFFER → set offer_date automatically
    else if (status === "Offer") {
      query = `
        UPDATE jobs
        SET status = $1,
            status_updated_at = NOW(),
            offer_date = COALESCE(offer_date, NOW())
        WHERE id = $2 AND user_id = $3
        RETURNING *;
      `;
      params = [status, id, req.userId];
    }

    // 3️⃣ All other statuses → just update normally
    else {
      query = `
        UPDATE jobs
        SET status = $1,
            status_updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *;
      `;
      params = [status, id, req.userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    // Log into application history
    await pool.query(
      `
      INSERT INTO application_history (job_id, event)
      VALUES ($1, $2)
      `,
      [id, `Status changed to "${status}"`]
    );

    res.json({
      job: result.rows[0],
      message: "Status updated + history logged",
    });
  } catch (err) {
    console.error("❌ Status update error:", err.message);
    res.status(500).json({ error: "Failed to update status" });
  }
});


// ---------- ARCHIVE A JOB ----------
router.put("/:id/archive", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE jobs SET "isarchived" = true, status_updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Archive job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- RESTORE A JOB ----------
router.put("/:id/restore", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE jobs SET "isarchived" = false, status_updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Restore job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;