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

const STAGES = ["Interested", "Applied", "Phone Screen", "Interview", "Offer", "Rejected"];

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    // Set BOTH to ensure compatibility with all code
    req.userId = data.id;
    req.user = { id: data.id }; 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --------------------------------------------------
// 🔥 CREATE JOB (Fixed Date & Skills)
// --------------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    // FIX: Handle frontend sending 'dateApplied' instead of 'applicationDate'
    const applicationDate = req.body.applicationDate || req.body.dateApplied || null;

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
      role_level,
      // applicationDate is handled above
      resume_id,
      cover_letter_id,
      required_skills,
    } = req.body;

    if (!title?.trim() || !company?.trim()) {
      return res.status(400).json({ error: "Title and company are required." });
    }

    const cleanNumber = (v) => {
      if (!v) return null;
      // Convert to string and remove currency symbols and commas
      const str = String(v);
      // Remove $ and commas, but keep decimal point for proper parsing
      const cleaned = str.replace(/[$,]/g, "");
      // Parse as float to handle decimals correctly, then round to integer
      const num = parseFloat(cleaned);
      if (isNaN(num)) return null;
      // Round to nearest integer (salaries are whole numbers)
      return Math.round(num);
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
        url, deadline, description, industry, type, role_level,
        "applicationDate", resume_id, cover_letter_id, "required_skills",
        status, status_updated_at, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Interested',NOW(),NOW())
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

    // Handle industry: convert empty string to null for consistency
    const industryValue = industry && industry.trim() !== '' ? industry.trim() : null;
    // Handle role_level: convert empty string to null for consistency
    const roleLevelValue = role_level && role_level.trim() !== '' ? role_level.trim() : null;
    
    const jobValues = [
      req.userId,
      title.trim(),
      company.trim(),
      location || "",
      safeSalaryMin,
      safeSalaryMax,
      url || "",
      deadline || null,
      description || "",
      industryValue,
      getRoleTypeFromTitle(title),
      roleLevelValue,
      applicationDate, // Uses the fixed date variable
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
        `INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action, details)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [newJob.id, req.userId, resume_id || null, finalCoverLetterId || null, "initial_set", JSON.stringify({})]

      );
      
    }

    res.status(201).json({
      status: "success",
      job: newJob,
      message: "Job created successfully.",
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
    // FIX: Added quotes around "isArchived"
    const whereClauses = ["user_id = $1", `"isArchived" = false`]; 
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
        -- FIX: Added quotes around "isArchived"
        SELECT * FROM jobs WHERE user_id = $1 AND "isArchived" = false 
      ),
      
      jobs_by_status AS (
        SELECT status, COUNT(*) AS count
        FROM user_jobs
        GROUP BY status
      ),
      
      monthly_volume AS (
        SELECT 
          DATE_TRUNC('month', "applicationDate") AS month,
          COUNT(*) AS count
        FROM user_jobs
        WHERE "applicationDate" IS NOT NULL
        GROUP BY month
        ORDER BY month
      ),
      
      response_rate AS (
        SELECT 
          (SUM(CASE WHEN status NOT IN ('Interested', 'Applied') THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100 AS rate
        FROM user_jobs
      ),
      
      adherence AS (
        SELECT 
          (SUM(CASE WHEN "applicationDate" <= deadline THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100 AS rate
        FROM user_jobs
        WHERE "applicationDate" IS NOT NULL AND deadline IS NOT NULL
      ),
      
      time_to_offer AS (
        SELECT 
          AVG("offerDate" - "applicationDate") AS avg_days
        FROM user_jobs
        WHERE "offerDate" IS NOT NULL AND "applicationDate" IS NOT NULL
      ),
      
      avg_time_in_stage AS (
        SELECT 
          status,
          AVG(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at))) / 86400.0))::int) AS avg_days
        FROM user_jobs
        GROUP BY status
      )

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
    const stats = result.rows[0];
    
    const safeNum = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    stats.totalJobs = parseInt(stats.totalJobs, 10) || 0;
    stats.jobsByStatus = stats.jobsByStatus || [];
    stats.monthlyVolume = stats.monthlyVolume || [];
    
    stats.responseRate = safeNum(stats.responseRate).toFixed(1);
    stats.adherenceRate = safeNum(stats.adherenceRate).toFixed(1);
    stats.avgTimeToOffer = safeNum(stats.avgTimeToOffer).toFixed(1);
    
    stats.avgTimeInStage = stats.avgTimeInStage || [];

    if (stats.totalJobs === 0) {
      stats.message = 'No job data available to calculate statistics.';
    }

    res.json(stats);

  } catch (err) {
    console.error("❌ Statistics query error:", err);
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
    // FIX: Added quotes around "isArchived"
    const result = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 AND "isArchived" = true
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
router.get("/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM jobs WHERE id = $1 AND user_id = $2`, [
      id,
      req.userId,
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Job not found" });
    res.json({ job: result.rows[0] });
  } catch (err) {
    console.error("❌ Get job details error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- UPDATE JOB ----------
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // FIX: Handle dateApplied from frontend for Update as well
    if (req.body.dateApplied !== undefined) {
       req.body.applicationDate = req.body.dateApplied;
    }

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
      "role_level",
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
        // Handle industry field specially - trim and convert empty string to null
        if (key === 'industry') {
          const industryValue = req.body[key];
          if (industryValue === null || industryValue === undefined || (typeof industryValue === 'string' && industryValue.trim() === '')) {
            updates[key] = null; // Set to null instead of empty string
          } else {
            updates[key] = typeof industryValue === 'string' ? industryValue.trim() : industryValue;
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (updates.title) {
      updates.type = getRoleTypeFromTitle(updates.title);
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No valid fields to update" });

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

    if (updates.resume_id || updates.cover_letter_id) {
      await pool.query(
        `
        INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [id, req.userId, updates.resume_id || null, updates.cover_letter_id || null, "updated", JSON.stringify({})]

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

    // Check if table exists first
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'application_materials_history'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      console.warn("⚠️ application_materials_history table does not exist");
      return res.json({ history: [] }); // Return empty array instead of error
    }

    const result = await pool.query(
      `
      SELECT 
        h.id,
        h.changed_at,
        h.action,
        h.resume_id,
        h.cover_letter_id,
        h.details,
        r.title AS resume_title,
        c.name AS cover_title
      FROM application_materials_history h
      LEFT JOIN resumes r ON r.id = h.resume_id
      LEFT JOIN cover_letters c ON c.id = h.cover_letter_id
          WHERE h.job_id = $1
          ORDER BY h.changed_at DESC NULLS LAST;
          `,
          [req.params.id] // Use req.params.id from the route parameter
        );

    res.json({ history: result.rows });
  } catch (err) {
    console.error("❌ History fetch error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      stack: err.stack,
      position: err.position
    });
    
    // If table doesn't exist, return empty array instead of error
    if (err.code === '42P01') { // undefined_table
      console.warn("⚠️ application_materials_history table not found. Returning empty history.");
      return res.json({ history: [] });
    }
    
    // If column doesn't exist, try a simpler query
    if (err.code === '42703') { // undefined_column
      console.warn("⚠️ Some columns may not exist, trying simplified query");
      try {
        const simpleResult = await pool.query(
          `
          SELECT 
            h.id,
            h.changed_at,
            h.action,
            h.resume_id,
            h.cover_letter_id
          FROM application_materials_history h
          WHERE h.job_id = $1
          ORDER BY h.changed_at DESC NULLS LAST;
          `,
          [req.params.id] // Use req.params.id instead of id
        );
        return res.json({ history: simpleResult.rows });
      } catch (simpleErr) {
        console.error("❌ Simplified query also failed:", simpleErr);
        // Return empty array as last resort
        return res.json({ history: [] });
      }
    }
    
    res.status(500).json({ 
      error: "Failed to load materials history",
      details: err.message,
      code: err.code,
      hint: err.code === '42P01' ? "Run backend/db/add_application_materials_history.sql to create the table." : 
            err.code === '42703' ? "Some columns may be missing. Check your database schema." : undefined
    });
  }
});


// ---------- UPDATE MATERIALS (resume + cover letter + customization levels) ----------
router.put("/:id/materials", auth, async (req, res) => {
  try {
    const { id } = req.params;
    let { resume_id, cover_letter_id, resume_customization, cover_letter_customization } = req.body;

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
            // Fetch the template from cover_letter_templates table
            const templateResult = await pool.query(
              `SELECT name, content FROM cover_letter_templates WHERE id = $1`,
              [templateId]
            );
            
            if (templateResult.rows.length > 0) {
              const template = templateResult.rows[0];
              // Try different column combinations based on what exists in the table
              try {
                // Try with 'title' first
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
                  console.error("❌ Error details:", insertErr);
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
          console.error("❌ Error processing template cover letter:", templateErr);
          finalCoverLetterId = null;
        }
      } else {
        // It's a regular cover letter ID, use it as-is (convert to number if it's a string)
        finalCoverLetterId = isNaN(Number(cover_letter_id)) ? null : Number(cover_letter_id);
      }
    }

    // Validate customization levels
    const validLevels = ['none', 'light', 'heavy', 'tailored'];
    const safeResumeCustomization = validLevels.includes(resume_customization) ? resume_customization : 'none';
    const safeCoverLetterCustomization = validLevels.includes(cover_letter_customization) ? cover_letter_customization : 'none';

    // Try to update with customization columns first
    let result;
    try {
      const updateQuery = `
        UPDATE jobs 
        SET resume_id = $1,
            cover_letter_id = $2,
            resume_customization = $3,
            cover_letter_customization = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *;
      `;
      result = await pool.query(updateQuery, [
        resume_id || null,
        finalCoverLetterId, // Use the processed cover letter ID (template converted or original)
        safeResumeCustomization,
        safeCoverLetterCustomization,
        id,
        req.userId,
      ]);
    } catch (colErr) {
      // If customization columns don't exist, fall back to basic update
      if (colErr.code === '42703') { // undefined_column
        console.warn("⚠️ Customization columns not found, updating only resume_id and cover_letter_id");
        const basicUpdateQuery = `
          UPDATE jobs 
          SET resume_id = $1,
              cover_letter_id = $2
          WHERE id = $3 AND user_id = $4
          RETURNING *;
        `;
        result = await pool.query(basicUpdateQuery, [
          resume_id || null,
          finalCoverLetterId, // Use the processed cover letter ID (template converted or original)
          id,
          req.userId,
        ]);
      } else {
        // Re-throw if it's a different error
        throw colErr;
      }
    }

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    const updatedJob = result.rows[0];

    // Insert a new materials history log (if table exists)
    try {
      await pool.query(
        `
        INSERT INTO application_materials_history (job_id, user_id, resume_id, cover_letter_id, action, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [id, req.userId, resume_id || null, finalCoverLetterId, "materials_updated", JSON.stringify({})]
      );
    } catch (historyErr) {
      // If table doesn't exist, log warning but don't fail the update
      if (historyErr.code === '42P01') { // undefined_table
        console.warn("⚠️ application_materials_history table not found. Materials updated but history not recorded.");
        console.warn("   Run backend/db/add_application_materials_history.sql to create the table.");
      } else {
        // Re-throw if it's a different error
        throw historyErr;
      }
    }

    res.json({
      message: "Materials and customization levels updated successfully",
      job: updatedJob,
    });
  } catch (err) {
    console.error("❌ Materials update error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      stack: err.stack
    });
    
    let errorMessage = "Failed to update materials";
    let errorHint = "";
    
    if (err.code === '42703') { // undefined_column
      errorMessage = "Database column not found";
      errorHint = "The resume_customization or cover_letter_customization columns may not exist. Please run the database migration.";
    } else if (err.code === '42P01') { // undefined_table
      errorMessage = "Database table not found";
      errorHint = "The application_materials_history table may not exist. Please check your database schema.";
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      hint: errorHint,
      details: err.message,
      code: err.code
    });
  }
});

// ---------- DELETE JOB ----------
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First, verify the job exists and belongs to the user
    const jobCheck = await client.query(
      `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (jobCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Job not found" });
    }

    // Delete related records first (to avoid foreign key constraint violations)
    // Delete application_history records
    await client.query(
      `DELETE FROM application_history WHERE job_id = $1`,
      [id]
    );

    // Delete application_materials_history records
    await client.query(
      `DELETE FROM application_materials_history WHERE job_id = $1`,
      [id]
    ).catch((err) => {
      // Table might not exist, that's okay
      if (err.code !== '42P01') {
        console.warn("⚠️ Error deleting from application_materials_history:", err.message);
      }
    });

    // Now delete the job
    const result = await client.query(
      `DELETE FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Job permanently deleted" });
  } catch (err) {
    if (client && client.query) {
      try {
        const rollbackPromise = client.query("ROLLBACK");
        if (rollbackPromise && typeof rollbackPromise.catch === 'function') {
          await rollbackPromise.catch(() => {});
        }
      } catch (rollbackErr) {
        // Ignore rollback errors
      }
    }
    console.error("❌ Delete job error:", err.message);
    res.status(500).json({ error: "Database error" });
  } finally {
    if (client && client.release) {
      client.release();
    }
  }
});

// ---------- UPDATE STATUS ----------
// ---------- UPDATE STATUS (with interview_date + offer_date logic) ----------
router.put("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Missing status" });

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

    res.json({ job: result.rows[0] });
  } catch (err) {
    console.error("❌ Failed to update job stage:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- BULK DEADLINE UPDATE ----------
router.put("/bulk/deadline", auth, async (req, res) => {
    const { jobIds, daysToAdd } = req.body;
  
    if (!Array.isArray(jobIds) || jobIds.length === 0)
      return res.status(400).json({ error: "No job IDs provided" });
  
    const days = parseInt(daysToAdd, 10);
    if (isNaN(days) || days === 0)
      return res.status(400).json({ error: "Invalid daysToAdd value" });
  
    try {
      const result = await pool.query(
        `UPDATE jobs
         SET deadline = deadline + INTERVAL '${days} days',
             status_updated_at = NOW()
         WHERE user_id = $1 AND id = ANY($2::int[])
         RETURNING id, title, deadline`,
        [req.userId, jobIds]
      );
  
      res.json({ updated: result.rows });
    } catch (err) {
      console.error("❌ Bulk deadline update error:", err.message);
      res.status(500).json({ error: "Database error" });
    }
  });


//
// ==================================================================
//               ARCHIVE ROUTES (UC-045)
// ==================================================================
//

// ---------- ARCHIVE A JOB (AC-1) ----------
router.put("/:id/archive", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // FIX: Added quotes around "isArchived"
    const result = await pool.query(
      `UPDATE jobs SET "isArchived" = true, status_updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json({ job: result.rows[0] });
  } catch (err) {
    console.error("❌ Archive job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- RESTORE A JOB (AC-3) ----------
router.put("/:id/restore", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // FIX: Added quotes around "isArchived"
    const result = await pool.query(
      `UPDATE jobs SET "isArchived" = false, status_updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json({ job: result.rows[0] });
  } catch (err) {
    console.error("❌ Restore job error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});



export default router;
