// backend/routes/job.js

import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

    // Note: We use quotes for "applicationDate" and "required_skills" because they are case-sensitive
    const insertJobQuery = `
      INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type,
        "applicationDate", resume_id, cover_letter_id, "required_skills",
        status, status_updated_at, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Interested',NOW(),NOW())
      RETURNING *;
    `;

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
      industry || "",
      type || "",
      applicationDate, // Uses the fixed date variable
      resume_id || null,
      cover_letter_id || null,
      Array.isArray(required_skills) ? required_skills : [],
    ];

    const { rows } = await pool.query(insertJobQuery, jobValues);
    const newJob = rows[0];

    // 🧩 RECORD MATERIAL HISTORY (If provided)
    if (resume_id || cover_letter_id) {
      try {
        await pool.query(
          `INSERT INTO application_materials_history (user_id, job_id, resume_id, cover_letter_id)
           VALUES ($1, $2, $3, $4)`,
          [req.userId, newJob.id, resume_id || null, cover_letter_id || null]
        );
      } catch (err) {
        // Table might not exist, log but don't fail
        console.warn("⚠️ Could not record application materials history:", err.message);
      }
    }

    res.status(200).json({
      status: "success",
      job: newJob,
      message: "Job created successfully.",
    });
  } catch (err) {
    console.error("❌ Job insert error:", err);
    res.status(500).json({ error: "Failed to save job." });
  }
});

// ---------- LIST ALL JOBS ----------
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
      "title", "company", "location", "status", "salary_min", "salary_max",
      "deadline", "description", "industry", "type", "notes", "contact_name",
      "contact_email", "contact_phone", "salary_notes", "interview_feedback",
      "resume_id", "cover_letter_id", "applicationDate", "offerDate", "required_skills",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
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
      try {
        await pool.query(
          `INSERT INTO application_materials_history (user_id, job_id, resume_id, cover_letter_id)
           VALUES ($1, $2, $3, $4)`,
          [req.userId, id, updates.resume_id || null, updates.cover_letter_id || null]
        );
      } catch (err) {
        // Table might not exist, log but don't fail
        console.warn("⚠️ Could not record application materials history:", err.message);
      }
    }

    res.json({ job });
  } catch (err) {
    console.error("❌ Job update error:", err.message);
    res.status(500).json({ error: "Database update failed" });
  }
});

// ---------- DELETE JOB (For AC-5) ----------
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


// ---------- UPDATE ONLY STATUS ----------
router.put("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Missing status" });

  let query;
  let params;
  if (status === 'Offer') {
    query = `UPDATE jobs
             SET status = $1, status_updated_at = NOW(), "offerDate" = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING *`;
    params = [status, id, req.userId];
  } else {
    query = `UPDATE jobs
             SET status = $1, status_updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING *`;
    params = [status, id, req.userId];
  }

  try {
    const result = await pool.query(query, params);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found or unauthorized" });

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