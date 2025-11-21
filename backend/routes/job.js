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
    req.userId = data.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}


// ---------- CREATE JOB ----------
router.post("/", auth, async (req, res) => {
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
    required_skills   // ⭐ ADDED
  } = req.body;

  if (!title?.trim() || !company?.trim()) {
    return res.status(400).json({ error: "Title and Company required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (
         user_id, title, company, location, salary_min, salary_max, url, deadline,
         description, industry, type, status, status_updated_at, created_at,
         "applicationDate", required_skills   -- ⭐ ADDED
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Interested',NOW(),NOW(),
               $12, $13)   -- ⭐ ADDED
       RETURNING *`,
      [
        req.userId,
        title.trim(),
        company.trim(),
        location || "",
        salary_min || null,
        salary_max || null,
        url || "",
        deadline || null,
        description || "",
        industry || "",
        type || "",
        applicationDate || null,
        Array.isArray(required_skills) ? required_skills : []  // ⭐ ADDED
      ]
    );

    res.json({ message: "Job saved successfully", job: result.rows[0] });
  } catch (err) {
    console.error("❌ Job insert error:", err);
    res.status(500).json({ error: "Database error" });
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
      whereClauses.push(`(title ILIKE $${i} OR company ILIKE $${i} OR description ILIKE $${i})`);
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
      
      -- AC-3: Average time in each pipeline stage (using your existing logic)
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
      stats.message = 'No job data available to calculate statistics.';
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
// ***** THIS ROUTE WAS MOVED HERE - BEFORE /:id *****
router.get("/archived", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 AND "isachived" = true
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
  const { id } = req.params;
  const allowed = [
    "title", "company", "location", "status", "salary_min", "salary_max",
    "deadline", "description", "industry", "type", "notes", "contact_name",
    "contact_email", "contact_phone", "salary_notes", "interview_feedback",
    "applicationDate", "offerDate"
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });

  if (updates.status === 'Offer') {
    updates["offerDate"] = new Date();
  }

  const setClause = Object.keys(updates)
    .map((k, i) => `"${k}" = $${i + 1}`)
    .join(", ");
  const values = Object.values(updates);

  try {
    const result = await pool.query(
      `
      UPDATE jobs
      SET ${setClause},
          status_updated_at = CASE
            WHEN $${Object.keys(updates).length + 1} IS DISTINCT FROM status
            THEN NOW()
            ELSE status_updated_at
          END
      WHERE id = $${Object.keys(updates).length + 2}
        AND user_id = $${Object.keys(updates).length + 3}
      RETURNING *;
      `,
      [...values, updates.status || null, id, req.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Job not found or unauthorized" });

    res.json({ job: result.rows[0] });
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

// ---------- RESTORE A JOB (AC-3) ----------
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