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
    const applicationDate =
      req.body.applicationDate || req.body.dateApplied || null;

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
      if (coverLetterIdStr.startsWith("template_")) {
        // Skip template conversion - user only wants uploaded cover letters
        // Templates are not supported for uploaded_cover_letters table
        console.warn(
          `⚠️ Template cover letters not supported. Only uploaded cover letters are used.`
        );
        finalCoverLetterId = null;
      } else {
        // It's a regular cover letter ID - ensure it's a valid number
        const numericId = parseInt(coverLetterIdStr, 10);
        if (isNaN(numericId)) {
          console.warn(
            `⚠️ Invalid cover_letter_id format: ${coverLetterIdStr}, setting to null`
          );
          finalCoverLetterId = null;
        } else {
          finalCoverLetterId = numericId;
        }
      }
    }

    // Convert resume_id and cover_letter_id from strings to numbers (or null if empty)
    const parseId = (id) => {
      if (!id || id === "" || id === "null" || id === "undefined") return null;
      const num = parseInt(String(id), 10);
      return isNaN(num) ? null : num;
    };

    const parsedResumeId = parseId(resume_id);
    const parsedCoverLetterId = parseId(cover_letter_id);

    // Final safety check: ensure finalCoverLetterId is a number or null
    if (finalCoverLetterId !== null) {
      const coverLetterIdStr = String(finalCoverLetterId);
      if (coverLetterIdStr.startsWith("template_")) {
        console.error(
          `❌ ERROR: finalCoverLetterId still contains template prefix: ${finalCoverLetterId}`
        );
        console.error(
          `❌ This should not happen - template conversion should have occurred`
        );
        finalCoverLetterId = null; // Set to null to prevent database error
      } else {
        const numericId = parseInt(coverLetterIdStr, 10);
        if (isNaN(numericId)) {
          console.error(
            `❌ ERROR: finalCoverLetterId is not a valid number: ${finalCoverLetterId}`
          );
          finalCoverLetterId = null;
        } else {
          finalCoverLetterId = numericId;
        }
      }
    }

    // Debug: Log the final values before inserting
    console.log(
      `🔍 Original resume_id from request:`,
      resume_id,
      `→ Parsed:`,
      parsedResumeId
    );
    console.log(`🔍 Final cover_letter_id value:`, finalCoverLetterId);
    console.log(`🔍 Type of finalCoverLetterId:`, typeof finalCoverLetterId);

    // Remove resume_id and cover_letter_id from jobs table INSERT (they don't exist anymore)
    const insertJobQuery = `
      INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type, role_level,
        "applicationDate", "required_skills",
        status, status_updated_at, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Interested',NOW(),NOW())
      RETURNING *;
    `;

    // Handle industry: convert empty string to null for consistency
    const industryValue =
      industry && industry.trim() !== "" ? industry.trim() : null;
    // Handle role_level: convert empty string to null for consistency
    const roleLevelValue =
      role_level && role_level.trim() !== "" ? role_level.trim() : null;

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
      Array.isArray(required_skills) ? required_skills : [],
    ];

    const { rows } = await pool.query(insertJobQuery, jobValues);
    const newJob = rows[0];

    // 🧩 STORE MATERIALS IN CLEAN TABLE
    // Always create a row in job_materials, even if both IDs are null
    try {
      // Validate resume_id exists if provided
      let validResumeId = null;
      if (parsedResumeId) {
        const resumeCheck = await pool.query(
          `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
          [parsedResumeId, req.userId]
        );
        if (resumeCheck.rows.length > 0) {
          validResumeId = parsedResumeId;
          console.log(
            `✅ Resume ID ${parsedResumeId} validated for user ${req.userId}`
          );
        } else {
          console.warn(
            `⚠️ Resume ID ${parsedResumeId} not found for user ${req.userId}`
          );
        }
      }

      // Validate cover_letter_id exists if provided (check uploaded_cover_letters table)
      let validCoverLetterId = null;
      if (finalCoverLetterId) {
        const coverCheck = await pool.query(
          `SELECT id FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2`,
          [finalCoverLetterId, req.userId]
        );
        if (coverCheck.rows.length > 0) {
          validCoverLetterId = finalCoverLetterId;
          console.log(
            `✅ Cover letter ID ${finalCoverLetterId} validated for user ${req.userId}`
          );
        } else {
          console.warn(
            `⚠️ Cover letter ID ${finalCoverLetterId} not found for user ${req.userId}`
          );
        }
      }

      // Always insert into job_materials (even if both are null)
      await pool.query(
        `INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (job_id) 
         DO UPDATE SET 
           resume_id = EXCLUDED.resume_id,
           cover_letter_id = EXCLUDED.cover_letter_id,
           updated_at = NOW()`,
        [newJob.id, req.userId, validResumeId, validCoverLetterId]
      );
      console.log(
        `✅ Stored materials for job ${newJob.id}: resume_id=${validResumeId}, cover_letter_id=${validCoverLetterId}`
      );
    } catch (err) {
      console.error("❌ Failed to store materials:", err.message);
      console.error("❌ Error details:", err);
      // Don't fail job creation if materials storage fails
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

      await pool.query(`UPDATE jobs SET type=$1 WHERE id=$2`, [
        roleType,
        job.id,
      ]);
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
    // FIX: Added quotes around "isArchived" and qualified user_id with table alias
    // Include jobs where isArchived is false OR NULL (not explicitly archived)
    const whereClauses = ["j.user_id = $1", `(j."isArchived" = false OR j."isArchived" IS NULL)`];
    let i = 2;

    if (search) {
      whereClauses.push(
        `(j.title ILIKE $${i} OR j.company ILIKE $${i} OR j.description ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }
    if (status && STAGES.includes(status)) {
      whereClauses.push(`LOWER(j.status) = LOWER($${i})`);
      params.push(status.trim());
      i++;
    }
    if (industry) {
      whereClauses.push(`j.industry ILIKE $${i}`);
      params.push(`%${industry}%`);
      i++;
    }
    if (location) {
      whereClauses.push(`j.location ILIKE $${i}`);
      params.push(`%${location}%`);
      i++;
    }
    if (salaryMin) {
      whereClauses.push(`j.salary_min >= $${i}`);
      params.push(salaryMin);
      i++;
    }
    if (salaryMax) {
      whereClauses.push(`j.salary_max <= $${i}`);
      params.push(salaryMax);
      i++;
    }
    if (dateFrom) {
      whereClauses.push(`j.deadline >= $${i}`);
      params.push(dateFrom);
      i++;
    }
    if (dateTo) {
      whereClauses.push(`j.deadline <= $${i}`);
      params.push(dateTo);
      i++;
    }

    let orderColumn = "j.created_at";
    switch (sortBy) {
      case "deadline":
        orderColumn = "j.deadline";
        break;
      case "salary":
        orderColumn = "j.salary_max";
        break;
      case "company":
        orderColumn = "j.company";
        break;
      default:
        orderColumn = "j.created_at";
    }

    const result = await pool.query(
      `
      SELECT j.*,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(j.status_updated_at, j.created_at))) / 86400.0))::int AS days_in_stage,
        jm.resume_id,
        jm.cover_letter_id
      FROM jobs j
      LEFT JOIN job_materials jm ON j.id = jm.job_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ${orderColumn} DESC
    `,
      params
    );

    // 🔧 Normalize status values to match standard stages
    // If a job has a non-standard status (like event text), try to extract the actual status
    const normalizedJobs = result.rows.map(job => {
      let normalizedStatus = (job.status || '').trim();
      
      // If status looks like event text (contains "Status changed from"), try to extract the final status
      if (normalizedStatus.includes('Status changed from') || normalizedStatus.includes('to')) {
        // Try to extract the final status from patterns like "Status changed from 'X' to 'Y'"
        const match = normalizedStatus.match(/to\s+['"]([^'"]+)['"]/i);
        if (match && match[1]) {
          normalizedStatus = match[1].trim();
          console.log(`🔧 Normalized status for job ${job.id}: "${job.status}" → "${normalizedStatus}"`);
        }
      }
      
      // If status still doesn't match a standard stage, keep it as-is (will show in "Other" column)
      // But try to match case-insensitively to standard stages
      const standardStatuses = STAGES.map(s => s.toLowerCase());
      const statusLower = normalizedStatus.toLowerCase();
      if (standardStatuses.includes(statusLower)) {
        // Map to the correct case from STAGES array
        const matchedStage = STAGES.find(s => s.toLowerCase() === statusLower);
        if (matchedStage) {
          normalizedStatus = matchedStage;
        }
      }
      
      return {
        ...job,
        status: normalizedStatus
      };
    });

    console.log(`📊 Returning ${normalizedJobs.length} jobs (${result.rows.length} from DB)`);
    res.json({ jobs: normalizedJobs });
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
        SELECT * FROM jobs WHERE user_id = $1 AND ("isArchived" = false OR "isArchived" IS NULL) 
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
      stats.message = "No job data available to calculate statistics.";
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
    // Get job from jobs table
    const result = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found" });

    const job = result.rows[0];

    // Get materials from clean table
    try {
      const materialsResult = await pool.query(
        `SELECT resume_id, cover_letter_id
         FROM job_materials
         WHERE job_id = $1`,
        [id]
      );

      if (materialsResult.rows.length > 0) {
        const materials = materialsResult.rows[0];
        // Set job's resume_id and cover_letter_id from materials table
        job.resume_id = materials.resume_id;
        job.cover_letter_id = materials.cover_letter_id;
        console.log(
          `✅ [GET JOB ${id}] Materials found: resume_id=${materials.resume_id}, cover_letter_id=${materials.cover_letter_id}`
        );
      } else {
        // No materials found in job_materials table
        job.resume_id = null;
        job.cover_letter_id = null;
        console.log(
          `⚠️ [GET JOB ${id}] No materials found in job_materials table`
        );
      }
    } catch (materialsErr) {
      // Table might not exist yet, that's okay
      console.warn(
        `⚠️ [GET JOB ${id}] Error fetching materials:`,
        materialsErr.message
      );
      job.resume_id = null;
      job.cover_letter_id = null;
    }

    console.log(
      `📤 [GET JOB ${id}] Returning job with resume_id=${job.resume_id}, cover_letter_id=${job.cover_letter_id}`
    );
    res.json({ job });
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
      "applicationDate",
      "offerDate",
      "required_skills",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Handle industry field specially - trim and convert empty string to null
        if (key === "industry") {
          const industryValue = req.body[key];
          if (
            industryValue === null ||
            industryValue === undefined ||
            (typeof industryValue === "string" && industryValue.trim() === "")
          ) {
            updates[key] = null; // Set to null instead of empty string
          } else {
            updates[key] =
              typeof industryValue === "string"
                ? industryValue.trim()
                : industryValue;
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

    // 🧩 UPDATE MATERIALS IN CLEAN TABLE
    // Note: resume_id and cover_letter_id are NOT in the allowed fields for PUT /:id
    // They should be updated via PUT /:id/materials endpoint instead
    // But we'll handle them here if they're provided for backward compatibility
    if (
      req.body.resume_id !== undefined ||
      req.body.cover_letter_id !== undefined
    ) {
      try {
        // Get current materials from job_materials table
        const currentMaterials = await pool.query(
          `SELECT resume_id, cover_letter_id FROM job_materials WHERE job_id = $1`,
          [id]
        );

        let resumeId =
          req.body.resume_id !== undefined
            ? req.body.resume_id
            : currentMaterials.rows[0]?.resume_id || null;
        let coverLetterId =
          req.body.cover_letter_id !== undefined
            ? req.body.cover_letter_id
            : currentMaterials.rows[0]?.cover_letter_id || null;

        // Validate resume_id exists if provided
        if (resumeId) {
          const resumeCheck = await pool.query(
            `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
            [resumeId, req.userId]
          );
          if (resumeCheck.rows.length === 0) {
            resumeId = null;
          }
        }

        // Validate cover_letter_id exists if provided (check uploaded_cover_letters table)
        if (coverLetterId) {
          const coverCheck = await pool.query(
            `SELECT id FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2`,
            [coverLetterId, req.userId]
          );
          if (coverCheck.rows.length === 0) {
            coverLetterId = null;
          }
        }

        // Update job_materials table
        await pool.query(
          `INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (job_id) 
           DO UPDATE SET 
             resume_id = COALESCE(EXCLUDED.resume_id, job_materials.resume_id),
             cover_letter_id = COALESCE(EXCLUDED.cover_letter_id, job_materials.cover_letter_id),
             updated_at = NOW()`,
          [id, req.userId, resumeId || null, coverLetterId || null]
        );
      } catch (err) {
        console.error("❌ Failed to update materials:", err.message);
        // Don't fail job update if materials update fails
      }
    }

    // Fetch materials from job_materials table and attach to job
    try {
      const materialsResult = await pool.query(
        `SELECT resume_id, cover_letter_id FROM job_materials WHERE job_id = $1`,
        [id]
      );
      if (materialsResult.rows.length > 0) {
        job.resume_id = materialsResult.rows[0].resume_id;
        job.cover_letter_id = materialsResult.rows[0].cover_letter_id;
        console.log(
          `✅ [PUT JOB ${id}] Attached materials: resume_id=${job.resume_id}, cover_letter_id=${job.cover_letter_id}`
        );
      } else {
        job.resume_id = null;
        job.cover_letter_id = null;
      }
    } catch (materialsErr) {
      job.resume_id = null;
      job.cover_letter_id = null;
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
    // History tracking removed - we now use job_materials table only
    // Current materials are in job_materials table, no history is tracked
    res.json({ history: [] });
  } catch (err) {
    console.error("❌ History fetch error:", err);
    res.json({ history: [] });
  }
});

// ---------- UPDATE MATERIALS (resume + cover letter) ----------
router.put("/:id/materials", auth, async (req, res) => {
  try {
    const { id } = req.params;
    let { resume_id, cover_letter_id } = req.body;

    // Handle template cover letters: if cover_letter_id starts with "template_",
    // create a copy of the template as a user cover letter
    let finalCoverLetterId = cover_letter_id || null;

    // Only process if it's a valid number or a template ID
    if (cover_letter_id) {
      const coverLetterIdStr = String(cover_letter_id);

      // Check if it's a template ID (starts with "template_")
      if (coverLetterIdStr.startsWith("template_")) {
        // Skip template conversion - user only wants uploaded cover letters
        // Templates are not supported for uploaded_cover_letters table
        console.warn(
          `⚠️ Template cover letters not supported. Only uploaded cover letters are used.`
        );
        finalCoverLetterId = null;
      } else {
        // It's a regular cover letter ID, use it as-is
        finalCoverLetterId = isNaN(Number(cover_letter_id))
          ? null
          : Number(cover_letter_id);
      }
    }

    // Validate resume_id and cover_letter_id exist
    let validResumeId = null;
    if (resume_id) {
      const resumeCheck = await pool.query(
        `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
        [resume_id, req.userId]
      );
      if (resumeCheck.rows.length > 0) {
        validResumeId = resume_id;
      }
    }

    let validCoverLetterId = null;
    if (finalCoverLetterId) {
      const coverCheck = await pool.query(
        `SELECT id FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2`,
        [finalCoverLetterId, req.userId]
      );
      if (coverCheck.rows.length > 0) {
        validCoverLetterId = finalCoverLetterId;
      }
    }

    // Update job_materials table
    if (validResumeId || validCoverLetterId) {
      await pool.query(
        `INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (job_id) 
         DO UPDATE SET 
           resume_id = COALESCE(EXCLUDED.resume_id, job_materials.resume_id),
           cover_letter_id = COALESCE(EXCLUDED.cover_letter_id, job_materials.cover_letter_id),
           updated_at = NOW()`,
        [id, req.userId, validResumeId, validCoverLetterId]
      );
    }

    // Get updated job
    const result = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ job: result.rows[0] });
  } catch (err) {
    console.error("❌ Update materials error:", err);
    res.status(500).json({ error: "Failed to update materials" });
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
    await client.query(`DELETE FROM application_history WHERE job_id = $1`, [
      id,
    ]);

    // Delete application_materials_history records
    await client
      .query(`DELETE FROM application_materials_history WHERE job_id = $1`, [
        id,
      ])
      .catch((err) => {
        // Table might not exist, that's okay
        if (err.code !== "42P01") {
          console.warn(
            "⚠️ Error deleting from application_materials_history:",
            err.message
          );
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
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Delete job error:", err.message);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
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
            "offerDate" = COALESCE("offerDate", NOW())
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

    const updatedJob = result.rows[0];

    // Log into application history
    await pool.query(
      `
      INSERT INTO application_history (job_id, event)
      VALUES ($1, $2)
      `,
      [id, `Status changed to "${status}"`]
    );

    // Update application_submissions table to track responses/interviews/offers
    try {
      if (status === "Interview" || status === "Offer" || status === "Rejected" || status === "Applied") {
        // Find the most recent submission for this job
        const submissionResult = await pool.query(
          `SELECT id FROM application_submissions 
           WHERE job_id = $1 AND user_id = $2 
           ORDER BY submitted_at DESC 
           LIMIT 1`,
          [id, req.userId]
        );

        if (submissionResult.rows.length > 0) {
          const submissionId = submissionResult.rows[0].id;
          let responseReceived = false;
          let responseType = null;

          if (status === "Interview") {
            responseReceived = true;
            responseType = 'interview';
          } else if (status === "Offer") {
            responseReceived = true;
            responseType = 'offer';
          } else if (status === "Rejected") {
            responseReceived = true;
            responseType = 'rejection';
          } else if (status === "Applied") {
            // Just mark that we got a response (acknowledgment)
            responseReceived = true;
            responseType = 'acknowledgment';
          }

          await pool.query(
            `UPDATE application_submissions 
             SET response_received = $1, 
                 response_type = $2,
                 response_date = CASE WHEN $1 THEN NOW() ELSE response_date END
             WHERE id = $3`,
            [responseReceived, responseType, submissionId]
          );
        }
      }
    } catch (timingError) {
      console.error("⚠️ Error updating timing submission:", timingError);
      // Don't fail the whole request if timing update fails
    }

    res.json({ job: updatedJob });
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
