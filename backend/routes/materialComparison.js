// backend/routes/materialComparison.js
// Application Material Comparison Dashboard Routes

import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();

// ============================================================
// 1. LABEL RESUME VERSION (A, B, C, etc.)
// ============================================================
router.put("/resume-versions/:versionId/label", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { label } = req.body;
    const userId = req.user.id;

    // Validate label (single uppercase letter A-Z)
    if (!label || !/^[A-Z]$/.test(label)) {
      return res.status(400).json({ error: "Label must be a single uppercase letter (A-Z)" });
    }

    // First check if it exists in resume_versions table
    let versionCheck = await pool.query(
      `SELECT id, resume_id FROM resume_versions 
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    let resumeId = null;
    
    // If not found in resume_versions, check if it's a resume ID directly
    if (versionCheck.rows.length === 0) {
      const resumeCheck = await pool.query(
        `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
        [versionId, userId]
      );
      
      if (resumeCheck.rows.length === 0) {
        return res.status(404).json({ error: "Resume version not found" });
      }
      
      resumeId = versionId;
      
      // Create entry in resume_versions table
      const createResult = await pool.query(
        `INSERT INTO resume_versions (resume_id, user_id, version_number, title, version_label)
         SELECT id, user_id, 1, title, $1
         FROM resumes
         WHERE id = $2 AND user_id = $3
         RETURNING id, resume_id`,
        [label, versionId, userId]
      );
      
      if (createResult.rows.length > 0) {
        return res.json({ success: true, message: `Resume version labeled as "${label}"` });
      }
    } else {
      resumeId = versionCheck.rows[0].resume_id;
    }

    // Check if label is already used by another version of the same resume
    const existingLabel = await pool.query(
      `SELECT id FROM resume_versions 
       WHERE resume_id = $1 AND version_label = $2 AND id != $3 AND user_id = $4`,
      [resumeId, label, versionId, userId]
    );

    if (existingLabel.rows.length > 0) {
      return res.status(400).json({ error: `Label "${label}" is already used for another version of this resume` });
    }

    // Update label
    await pool.query(
      `UPDATE resume_versions 
       SET version_label = $1 
       WHERE id = $2 AND user_id = $3`,
      [label, versionId, userId]
    );

    res.json({ success: true, message: `Resume version labeled as "${label}"` });
  } catch (err) {
    console.error("Error labeling resume version:", err);
    res.status(500).json({ error: "Failed to label resume version" });
  }
});

// ============================================================
// 2. LABEL COVER LETTER VERSION (A, B, C, etc.)
// ============================================================
router.put("/cover-letter-versions/:versionId/label", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { label } = req.body;
    const userId = req.user.id;

    // Validate label
    if (!label || !/^[A-Z]$/.test(label)) {
      return res.status(400).json({ error: "Label must be a single uppercase letter (A-Z)" });
    }

    // First check if it exists in cover_letter_versions table
    let versionCheck = await pool.query(
      `SELECT id, cover_letter_id FROM cover_letter_versions 
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    let coverLetterId = null;
    
    // If not found in cover_letter_versions, check if it's a cover letter ID directly
    if (versionCheck.rows.length === 0) {
      const coverCheck = await pool.query(
        `SELECT id FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2`,
        [versionId, userId]
      );
      
      if (coverCheck.rows.length === 0) {
        return res.status(404).json({ error: "Cover letter version not found" });
      }
      
      coverLetterId = versionId;
      
      // Create entry in cover_letter_versions table
      const createResult = await pool.query(
        `INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, version_label)
         SELECT id, user_id, 1, title, $1
         FROM uploaded_cover_letters
         WHERE id = $2 AND user_id = $3
         RETURNING id, cover_letter_id`,
        [label, versionId, userId]
      );
      
      if (createResult.rows.length > 0) {
        return res.json({ success: true, message: `Cover letter version labeled as "${label}"` });
      }
    } else {
      coverLetterId = versionCheck.rows[0].cover_letter_id;
    }

    // Check if label is already used
    const existingLabel = await pool.query(
      `SELECT id FROM cover_letter_versions 
       WHERE cover_letter_id = $1 AND version_label = $2 AND id != $3 AND user_id = $4`,
      [coverLetterId, label, versionId, userId]
    );

    if (existingLabel.rows.length > 0) {
      return res.status(400).json({ error: `Label "${label}" is already used for another version of this cover letter` });
    }

    // Update label
    await pool.query(
      `UPDATE cover_letter_versions 
       SET version_label = $1 
       WHERE id = $2 AND user_id = $3`,
      [label, versionId, userId]
    );

    res.json({ success: true, message: `Cover letter version labeled as "${label}"` });
  } catch (err) {
    console.error("Error labeling cover letter version:", err);
    res.status(500).json({ error: "Failed to label cover letter version" });
  }
});

// ============================================================
// 3. TRACK VERSION USAGE FOR APPLICATION
// ============================================================
router.put("/jobs/:jobId/materials/versions", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resume_version_label, cover_letter_version_label } = req.body;
    const userId = req.user.id;

    // Verify job belongs to user
    const jobCheck = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Get current materials from job_materials
    const materialsResult = await pool.query(
      `SELECT resume_id, cover_letter_id FROM job_materials WHERE job_id = $1`,
      [jobId]
    );

    if (materialsResult.rows.length === 0) {
      return res.status(400).json({ error: "No materials linked to this job. Please link materials first." });
    }

    const { resume_id, cover_letter_id } = materialsResult.rows[0];

    // Update the latest history entry with version labels
    await pool.query(
      `UPDATE application_materials_history 
       SET resume_version_label = $1, cover_letter_version_label = $2
       WHERE job_id = $3 AND user_id = $4
       AND changed_at = (
         SELECT MAX(changed_at) FROM application_materials_history WHERE job_id = $3
       )`,
      [resume_version_label || null, cover_letter_version_label || null, jobId, userId]
    );

    res.json({ 
      success: true, 
      message: "Version labels tracked for application",
      resume_version_label,
      cover_letter_version_label
    });
  } catch (err) {
    console.error("Error tracking version usage:", err);
    res.status(500).json({ error: "Failed to track version usage" });
  }
});

// ============================================================
// 4. MARK APPLICATION OUTCOME
// ============================================================
router.put("/jobs/:jobId/outcome", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { outcome, response_received_at } = req.body;
    const userId = req.user.id;

    // Validate outcome
    const validOutcomes = ['response_received', 'interview', 'offer', 'rejection', 'no_response'];
    if (outcome && !validOutcomes.includes(outcome)) {
      return res.status(400).json({ error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` });
    }

    // Verify job belongs to user
    const jobCheck = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Update outcome
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (outcome !== undefined) {
      updateFields.push(`application_outcome = $${paramIndex++}`);
      updateValues.push(outcome);
    }

    if (response_received_at !== undefined) {
      updateFields.push(`response_received_at = $${paramIndex++}`);
      updateValues.push(response_received_at ? new Date(response_received_at) : null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateValues.push(jobId, userId);

    await pool.query(
      `UPDATE jobs 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}`,
      updateValues
    );

    res.json({ success: true, message: "Application outcome updated", outcome, response_received_at });
  } catch (err) {
    console.error("Error updating application outcome:", err);
    res.status(500).json({ error: "Failed to update application outcome" });
  }
});

// ============================================================
// 5. GET COMPARISON METRICS FOR ALL VERSIONS
// ============================================================
router.get("/comparison/metrics", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get metrics grouped by resume label and cover letter label
    const metricsResult = await pool.query(
      `SELECT 
        COALESCE(rv.version_label, 'Unlabeled') AS resume_label,
        COALESCE(clv.version_label, 'Unlabeled') AS cover_letter_label,
        COUNT(DISTINCT amh.job_id) AS total_applications,
        COUNT(DISTINCT CASE WHEN j.application_outcome = 'response_received' THEN j.id END) AS responses_received,
        COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) AS interviews,
        COUNT(DISTINCT CASE WHEN j.application_outcome = 'offer' THEN j.id END) AS offers,
        COUNT(DISTINCT CASE WHEN j.application_outcome = 'rejection' THEN j.id END) AS rejections,
        COUNT(DISTINCT CASE WHEN j.application_outcome = 'no_response' THEN j.id END) AS no_responses,
        -- Calculate rates
        CASE 
          WHEN COUNT(DISTINCT amh.job_id) > 0 
          THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END) / COUNT(DISTINCT amh.job_id), 2)
          ELSE 0 
        END AS response_rate_percent,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END) > 0
          THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) / COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END), 2)
          ELSE 0 
        END AS interview_rate_percent,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) > 0
          THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome = 'offer' THEN j.id END) / COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END), 2)
          ELSE 0 
        END AS offer_rate_percent,
        -- Average time to response (in days)
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN j.response_received_at IS NOT NULL AND j.applied_on IS NOT NULL THEN j.id END) > 0
          THEN ROUND(AVG(EXTRACT(EPOCH FROM (j.response_received_at - j.applied_on)) / 86400.0)::numeric, 1)
          ELSE NULL 
        END AS avg_days_to_response
      FROM application_materials_history amh
      INNER JOIN jobs j ON j.id = amh.job_id AND j.user_id = $1
      LEFT JOIN resume_versions rv ON rv.resume_id = amh.resume_id 
        AND rv.version_label = amh.resume_version_label
        AND rv.user_id = $1
      LEFT JOIN cover_letter_versions clv ON clv.cover_letter_id = amh.cover_letter_id 
        AND clv.version_label = amh.cover_letter_version_label
        AND clv.user_id = $1
      WHERE amh.user_id = $1
        AND (amh.resume_version_label IS NOT NULL OR amh.cover_letter_version_label IS NOT NULL)
      GROUP BY rv.version_label, clv.version_label
      ORDER BY resume_label, cover_letter_label`,
      [userId]
    );

    res.json({ metrics: metricsResult.rows });
  } catch (err) {
    console.error("Error fetching comparison metrics:", err);
    res.status(500).json({ error: "Failed to fetch comparison metrics" });
  }
});

// ============================================================
// 6. GET APPLICATIONS BY VERSION LABEL
// ============================================================
router.get("/comparison/applications", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { resume_label, cover_letter_label } = req.query;

    let query = `
      SELECT 
        j.id,
        j.title,
        j.company,
        j.status,
        j.application_outcome,
        j.applied_on,
        j.response_received_at,
        amh.resume_version_label,
        amh.cover_letter_version_label,
        rv.title AS resume_title,
        clv.title AS cover_letter_title
      FROM application_materials_history amh
      INNER JOIN jobs j ON j.id = amh.job_id AND j.user_id = $1
      LEFT JOIN resume_versions rv ON rv.resume_id = amh.resume_id 
        AND rv.version_label = amh.resume_version_label
        AND rv.user_id = $1
      LEFT JOIN cover_letter_versions clv ON clv.cover_letter_id = amh.cover_letter_id 
        AND clv.version_label = amh.cover_letter_version_label
        AND clv.user_id = $1
      WHERE amh.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (resume_label) {
      query += ` AND amh.resume_version_label = $${paramIndex++}`;
      params.push(resume_label);
    }

    if (cover_letter_label) {
      query += ` AND amh.cover_letter_version_label = $${paramIndex++}`;
      params.push(cover_letter_label);
    }

    query += ` ORDER BY j.applied_on DESC NULLS LAST, j.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ applications: result.rows });
  } catch (err) {
    console.error("Error fetching applications by version:", err);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ============================================================
// 7. GET ALL LABELED VERSIONS
// ============================================================
router.get("/versions/labeled", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all resume versions (including unlabeled)
    // First try resume_versions table, then fall back to resumes table with is_version flag
    let resumeVersions = await pool.query(
      `SELECT 
        rv.id,
        rv.version_label,
        rv.title,
        rv.version_number,
        r.title AS resume_title,
        r.id AS resume_id
      FROM resume_versions rv
      INNER JOIN resumes r ON r.id = rv.resume_id
      WHERE rv.user_id = $1
      ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`,
      [userId]
    );

    // If no versions in resume_versions table, try getting from resumes table
    if (resumeVersions.rows.length === 0) {
      resumeVersions = await pool.query(
        `SELECT 
          r.id,
          NULL AS version_label,
          r.title,
          COALESCE(r.version_number, 1) AS version_number,
          r.title AS resume_title,
          r.id AS resume_id
        FROM resumes r
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50`,
        [userId]
      );
    }

    // Get all cover letter versions (including unlabeled)
    let coverLetterVersions = await pool.query(
      `SELECT 
        clv.id,
        clv.version_label,
        clv.title,
        clv.version_number,
        ucl.title AS cover_letter_name,
        ucl.id AS cover_letter_id
      FROM cover_letter_versions clv
      INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
      WHERE clv.user_id = $1
      ORDER BY clv.version_label NULLS LAST, clv.version_number DESC`,
      [userId]
    );

    // If no versions in cover_letter_versions table, try getting from uploaded_cover_letters table
    if (coverLetterVersions.rows.length === 0) {
      coverLetterVersions = await pool.query(
        `SELECT 
          ucl.id,
          NULL AS version_label,
          ucl.title,
          1 AS version_number,
          ucl.title AS cover_letter_name,
          ucl.id AS cover_letter_id
        FROM uploaded_cover_letters ucl
        WHERE ucl.user_id = $1
        ORDER BY ucl.created_at DESC
        LIMIT 50`,
        [userId]
      );
    }

    res.json({
      resume_versions: resumeVersions.rows,
      cover_letter_versions: coverLetterVersions.rows
    });
  } catch (err) {
    console.error("Error fetching labeled versions:", err);
    res.status(500).json({ error: "Failed to fetch labeled versions" });
  }
});

// ============================================================
// 8. ARCHIVE VERSION (remove label)
// ============================================================
router.put("/resume-versions/:versionId/archive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `UPDATE resume_versions 
       SET version_label = NULL 
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    res.json({ success: true, message: "Resume version archived" });
  } catch (err) {
    console.error("Error archiving resume version:", err);
    res.status(500).json({ error: "Failed to archive resume version" });
  }
});

router.put("/cover-letter-versions/:versionId/archive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `UPDATE cover_letter_versions 
       SET version_label = NULL 
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    res.json({ success: true, message: "Cover letter version archived" });
  } catch (err) {
    console.error("Error archiving cover letter version:", err);
    res.status(500).json({ error: "Failed to archive cover letter version" });
  }
});

export default router;

