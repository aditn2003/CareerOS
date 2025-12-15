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
      
      // Check if a version already exists for this resume_id and version_number = 1
      const existingVersionCheck = await pool.query(
        `SELECT id FROM resume_versions 
         WHERE resume_id = $1 AND user_id = $2 AND version_number = 1`,
        [versionId, userId]
      );
      
      if (existingVersionCheck.rows.length > 0) {
        // Version already exists, just update the label
        const existingVersionId = existingVersionCheck.rows[0].id;
        
        // Check if label is already used by another resume version (only published, non-archived)
        const existingResumeLabel = await pool.query(
          `SELECT id FROM resume_versions 
           WHERE version_label = $1 
             AND user_id = $2 
             AND id != $3
             AND COALESCE(is_published, FALSE) = TRUE
             AND COALESCE(is_archived, FALSE) = FALSE`,
          [label, userId, existingVersionId]
        );
        
        if (existingResumeLabel.rows.length > 0) {
          return res.status(400).json({ error: `Label "${label}" is already in use by another resume version.` });
        }
        
        await pool.query(
          `UPDATE resume_versions 
           SET version_label = $1 
           WHERE id = $2 AND user_id = $3`,
          [label, existingVersionId, userId]
        );
        
        return res.json({ success: true, message: `Resume version labeled as "${label}"` });
      }
      
      // Create entry in resume_versions table (only if it doesn't exist)
      const createResult = await pool.query(
        `INSERT INTO resume_versions (resume_id, user_id, version_number, title, version_label)
         SELECT id, user_id, 1, title, $1
         FROM resumes
         WHERE id = $2 AND user_id = $3
         ON CONFLICT (resume_id, version_number) 
         DO UPDATE SET version_label = EXCLUDED.version_label
         RETURNING id, resume_id`,
        [label, versionId, userId]
      );
      
      if (createResult.rows.length > 0) {
        return res.json({ success: true, message: `Resume version labeled as "${label}"` });
      }
    } else {
      resumeId = versionCheck.rows[0].resume_id;
    }

    // Check if label is already used by another resume version for this user
    // Note: Same letter can be used for resume AND cover letter (e.g., Resume A and Cover Letter A)
    // Only check published, non-archived versions
    const existingResumeLabel = await pool.query(
      `SELECT id FROM resume_versions 
       WHERE version_label = $1 
         AND user_id = $2 
         AND id != $3
         AND COALESCE(is_published, FALSE) = TRUE
         AND COALESCE(is_archived, FALSE) = FALSE`,
      [label, userId, versionId]
    );

    if (existingResumeLabel.rows.length > 0) {
      return res.status(400).json({ error: `Label "${label}" is already in use by another resume version.` });
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

    console.log(`🏷️ [COVER LETTER LABEL] User ${userId} labeling version ${versionId} with label "${label}"`);

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
    
    console.log(`🔍 [COVER LETTER LABEL] Version check result:`, versionCheck.rows.length > 0 ? 'Found in cover_letter_versions' : 'Not found in cover_letter_versions');

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
      
      // Check if a version already exists for this cover_letter_id and version_number = 1
      const existingVersionCheck = await pool.query(
        `SELECT id FROM cover_letter_versions 
         WHERE cover_letter_id = $1 AND user_id = $2 AND version_number = 1`,
        [versionId, userId]
      );
      
      if (existingVersionCheck.rows.length > 0) {
        // Version already exists, just update the label
        const existingVersionId = existingVersionCheck.rows[0].id;
        
        // Check if label is already used by another cover letter version (only published, non-archived)
        let existingCoverLetterLabel;
        try {
          existingCoverLetterLabel = await pool.query(
            `SELECT id FROM cover_letter_versions 
             WHERE version_label = $1 
               AND user_id = $2 
               AND id != $3
               AND COALESCE(is_published, FALSE) = TRUE
               AND COALESCE(is_archived, FALSE) = FALSE`,
            [label, userId, existingVersionId]
          );
        } catch (colErr) {
          // If is_archived or is_published columns don't exist, check without them
          if (colErr.message && (colErr.message.includes('is_archived') || colErr.message.includes('is_published'))) {
            console.warn("⚠️ is_archived or is_published column not found, checking without filters");
            existingCoverLetterLabel = await pool.query(
              `SELECT id FROM cover_letter_versions 
               WHERE version_label = $1 
                 AND user_id = $2 
                 AND id != $3`,
              [label, userId, existingVersionId]
            );
          } else {
            throw colErr;
          }
        }
        
        if (existingCoverLetterLabel.rows.length > 0) {
          return res.status(400).json({ error: `Label "${label}" is already in use by another cover letter version.` });
        }
        
        await pool.query(
          `UPDATE cover_letter_versions 
           SET version_label = $1 
           WHERE id = $2 AND user_id = $3`,
          [label, existingVersionId, userId]
        );
        
        return res.json({ success: true, message: `Cover letter version labeled as "${label}"` });
      }
      
      // Create entry in cover_letter_versions table (only if it doesn't exist)
      const createResult = await pool.query(
        `INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, version_label)
         SELECT id, user_id, 1, title, $1
         FROM uploaded_cover_letters
         WHERE id = $2 AND user_id = $3
         ON CONFLICT (cover_letter_id, version_number) 
         DO UPDATE SET version_label = EXCLUDED.version_label
         RETURNING id, cover_letter_id`,
        [label, versionId, userId]
      );
      
      if (createResult.rows.length > 0) {
        return res.json({ success: true, message: `Cover letter version labeled as "${label}"` });
      }
    } else {
      coverLetterId = versionCheck.rows[0].cover_letter_id;
    }

    // Check if label is already used by another cover letter version for this user
    // Note: Same letter can be used for resume AND cover letter (e.g., Resume A and Cover Letter A)
    // Only check published, non-archived versions
    let existingCoverLetterLabel;
    try {
      existingCoverLetterLabel = await pool.query(
        `SELECT id FROM cover_letter_versions 
         WHERE version_label = $1 
           AND user_id = $2 
           AND id != $3
           AND COALESCE(is_published, FALSE) = TRUE
           AND COALESCE(is_archived, FALSE) = FALSE`,
        [label, userId, versionId]
      );
    } catch (colErr) {
      // If is_archived or is_published columns don't exist, check without them
      if (colErr.message && (colErr.message.includes('is_archived') || colErr.message.includes('is_published'))) {
        console.warn("⚠️ is_archived or is_published column not found, checking without filters");
        existingCoverLetterLabel = await pool.query(
          `SELECT id FROM cover_letter_versions 
           WHERE version_label = $1 
             AND user_id = $2 
             AND id != $3`,
          [label, userId, versionId]
        );
      } else {
        throw colErr;
      }
    }

    if (existingCoverLetterLabel.rows.length > 0) {
      return res.status(400).json({ error: `Label "${label}" is already in use by another cover letter version.` });
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
    console.error("❌ [COVER LETTER LABEL] Error labeling cover letter version:", err);
    console.error("❌ [COVER LETTER LABEL] Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      stack: err.stack
    });
    res.status(500).json({ 
      error: "Failed to label cover letter version",
      details: err.message 
    });
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
    // Try with published_resume_id/published_cover_letter_id first, fallback if columns don't exist
    let metricsResult;
    try {
      metricsResult = await pool.query(
      `SELECT 
        COALESCE(amh.resume_version_label, rv.version_label, 'Unlabeled') AS resume_label,
        COALESCE(amh.cover_letter_version_label, clv.version_label, 'Unlabeled') AS cover_letter_label,
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
        -- Use application_history to find first response (status change from Applied/Interested to any response status)
        -- Response statuses: Phone Screen, Interview, Offer, Rejected
        -- Fallback to response_received_at if application_history doesn't have the data
        CASE 
          WHEN COUNT(DISTINCT CASE 
            WHEN (
              ah_first_response.timestamp IS NOT NULL 
              OR j.response_received_at IS NOT NULL
            )
            AND (j."applicationDate" IS NOT NULL OR j.created_at IS NOT NULL)
            THEN j.id 
          END) > 0
          THEN ROUND(AVG(
            CASE 
              WHEN (
                ah_first_response.timestamp IS NOT NULL 
                OR j.response_received_at IS NOT NULL
              )
              AND (j."applicationDate" IS NOT NULL OR j.created_at IS NOT NULL)
              THEN EXTRACT(EPOCH FROM (
                COALESCE(
                  ah_first_response.timestamp,
                  j.response_received_at
                ) - COALESCE(
                  j."applicationDate"::timestamp,
                  j.created_at
                )
              )) / 86400.0
              ELSE NULL
            END
          )::numeric, 1)
          ELSE NULL 
        END AS avg_days_to_response
      FROM application_materials_history amh
      INNER JOIN jobs j ON j.id = amh.job_id AND j.user_id = $1
      -- Join to get first response timestamp from application_history
      LEFT JOIN LATERAL (
        SELECT MIN(ah.timestamp) AS timestamp
        FROM application_history ah
        WHERE ah.job_id = j.id
        AND ah.user_id = j.user_id
        AND ah.to_status IN ('Phone Screen', 'Interview', 'Offer', 'Rejected')
        AND (ah.from_status = 'Applied' OR ah.from_status = 'Interested' OR ah.from_status IS NULL)
      ) ah_first_response ON TRUE
      LEFT JOIN resume_versions rv ON (
        -- Join on published_resume_id if it exists (for published versions)
        (rv.published_resume_id IS NOT NULL AND rv.published_resume_id = amh.resume_id)
        OR
        -- Fallback: join on resume_id if published_resume_id is NULL (for non-published versions)
        (rv.published_resume_id IS NULL AND rv.resume_id = amh.resume_id)
      )
        AND rv.user_id = $1
        AND COALESCE(rv.is_published, FALSE) = TRUE
        -- Get the version label, preferring history label if exists, otherwise use version label
        AND (
          (amh.resume_version_label IS NOT NULL AND rv.version_label = amh.resume_version_label)
          OR
          (amh.resume_version_label IS NULL AND rv.version_label IS NOT NULL)
        )
      LEFT JOIN cover_letter_versions clv ON (
        -- Join on published_cover_letter_id if it exists (for published versions)
        (clv.published_cover_letter_id IS NOT NULL AND clv.published_cover_letter_id = amh.cover_letter_id)
        OR
        -- Fallback: join on cover_letter_id if published_cover_letter_id is NULL (for non-published versions)
        (clv.published_cover_letter_id IS NULL AND clv.cover_letter_id = amh.cover_letter_id)
      )
        AND clv.user_id = $1
        AND COALESCE(clv.is_published, FALSE) = TRUE
        -- Get the version label, preferring history label if exists, otherwise use version label
        AND (
          (amh.cover_letter_version_label IS NOT NULL AND clv.version_label = amh.cover_letter_version_label)
          OR
          (amh.cover_letter_version_label IS NULL AND clv.version_label IS NOT NULL)
        )
      WHERE amh.user_id = $1
        -- Include entries that have labels in history OR in version tables
        AND (
          amh.resume_version_label IS NOT NULL 
          OR amh.cover_letter_version_label IS NOT NULL
          OR rv.version_label IS NOT NULL
          OR clv.version_label IS NOT NULL
        )
      GROUP BY 
        COALESCE(amh.resume_version_label, rv.version_label, 'Unlabeled'), 
        COALESCE(amh.cover_letter_version_label, clv.version_label, 'Unlabeled')
      ORDER BY resume_label, cover_letter_label`,
        [userId]
      );
    } catch (err) {
      // If published_resume_id or published_cover_letter_id columns don't exist, use simpler query
      if (err.message && (err.message.includes('published_resume_id') || err.message.includes('published_cover_letter_id'))) {
        console.warn("⚠️ published_resume_id/published_cover_letter_id columns not found, using fallback query.");
        metricsResult = await pool.query(
          `SELECT 
            COALESCE(amh.resume_version_label, rv.version_label, 'Unlabeled') AS resume_label,
            COALESCE(amh.cover_letter_version_label, clv.version_label, 'Unlabeled') AS cover_letter_label,
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
            -- Use application_history to find first response (status change from Applied/Interested to any response status)
            -- Response statuses: Phone Screen, Interview, Offer, Rejected
            -- Fallback to response_received_at if application_history doesn't have the data
            CASE 
              WHEN COUNT(DISTINCT CASE 
                WHEN (
                  ah_first_response.timestamp IS NOT NULL 
                  OR j.response_received_at IS NOT NULL
                )
                AND (j."applicationDate" IS NOT NULL OR j.created_at IS NOT NULL)
                THEN j.id 
              END) > 0
              THEN ROUND(AVG(
                CASE 
                  WHEN (
                    ah_first_response.timestamp IS NOT NULL 
                    OR j.response_received_at IS NOT NULL
                  )
                  AND (j."applicationDate" IS NOT NULL OR j.created_at IS NOT NULL)
                  THEN EXTRACT(EPOCH FROM (
                    COALESCE(
                      ah_first_response.timestamp,
                      j.response_received_at
                    ) - COALESCE(
                      j."applicationDate"::timestamp,
                      j.created_at
                    )
                  )) / 86400.0
                  ELSE NULL
                END
              )::numeric, 1)
              ELSE NULL 
            END AS avg_days_to_response
          FROM application_materials_history amh
          INNER JOIN jobs j ON j.id = amh.job_id AND j.user_id = $1
          -- Join to get first response timestamp from application_history
          LEFT JOIN LATERAL (
            SELECT MIN(ah.timestamp) AS timestamp
            FROM application_history ah
            WHERE ah.job_id = j.id
            AND ah.user_id = j.user_id
            AND ah.to_status IN ('Phone Screen', 'Interview', 'Offer', 'Rejected')
            AND (ah.from_status = 'Applied' OR ah.from_status = 'Interested' OR ah.from_status IS NULL)
          ) ah_first_response ON TRUE
          LEFT JOIN resume_versions rv ON rv.resume_id = amh.resume_id 
            AND rv.user_id = $1
            AND COALESCE(rv.is_published, FALSE) = TRUE
            AND (
              (amh.resume_version_label IS NOT NULL AND rv.version_label = amh.resume_version_label)
              OR
              (amh.resume_version_label IS NULL AND rv.version_label IS NOT NULL)
            )
          LEFT JOIN cover_letter_versions clv ON clv.cover_letter_id = amh.cover_letter_id 
            AND clv.user_id = $1
            AND COALESCE(clv.is_published, FALSE) = TRUE
            AND (
              (amh.cover_letter_version_label IS NOT NULL AND clv.version_label = amh.cover_letter_version_label)
              OR
              (amh.cover_letter_version_label IS NULL AND clv.version_label IS NOT NULL)
            )
          WHERE amh.user_id = $1
            AND (
              amh.resume_version_label IS NOT NULL 
              OR amh.cover_letter_version_label IS NOT NULL
              OR rv.version_label IS NOT NULL
              OR clv.version_label IS NOT NULL
            )
          GROUP BY 
            COALESCE(amh.resume_version_label, rv.version_label, 'Unlabeled'), 
            COALESCE(amh.cover_letter_version_label, clv.version_label, 'Unlabeled')
          ORDER BY resume_label, cover_letter_label`,
          [userId]
        );
      } else {
        throw err; // Re-throw if it's a different error
      }
    }

    console.log(`📊 [METRICS] Found ${metricsResult.rows.length} metric groups for user ${userId}`);
    
    // Debug: Check response_received_at and applicationDate data
    const dateCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN response_received_at IS NOT NULL THEN 1 END) as with_response_date,
        COUNT(CASE WHEN "applicationDate" IS NOT NULL THEN 1 END) as with_application_date,
        COUNT(CASE WHEN response_received_at IS NOT NULL AND "applicationDate" IS NOT NULL THEN 1 END) as with_both_dates,
        COUNT(CASE WHEN response_received_at IS NOT NULL AND created_at IS NOT NULL THEN 1 END) as with_response_and_created
       FROM jobs WHERE user_id = $1`,
      [userId]
    );
    console.log(`📊 [METRICS DEBUG] Date tracking: ${JSON.stringify(dateCheck.rows[0])}`);
    
    // Debug: Check sample jobs with response dates
    const sampleJobs = await pool.query(
      `SELECT id, title, "applicationDate", response_received_at, created_at, application_outcome
       FROM jobs 
       WHERE user_id = $1 AND response_received_at IS NOT NULL 
       LIMIT 5`,
      [userId]
    );
    console.log(`📊 [METRICS DEBUG] Sample jobs with response dates:`, sampleJobs.rows.map(j => ({
      id: j.id,
      title: j.title,
      applicationDate: j.applicationDate,
      response_received_at: j.response_received_at,
      created_at: j.created_at,
      outcome: j.application_outcome
    })));
    
    if (metricsResult.rows.length === 0) {
      // Debug: Check if there are any history entries at all
      const historyCheck = await pool.query(
        `SELECT COUNT(*) as total, 
         COUNT(CASE WHEN resume_id IS NOT NULL THEN 1 END) as with_resume,
         COUNT(CASE WHEN cover_letter_id IS NOT NULL THEN 1 END) as with_cover_letter
         FROM application_materials_history WHERE user_id = $1`,
        [userId]
      );
      console.log(`📊 [METRICS DEBUG] History entries: ${JSON.stringify(historyCheck.rows[0])}`);
      
      // Check if there are any labeled versions
      const labeledVersionsCheck = await pool.query(
        `SELECT COUNT(*) as resume_count FROM resume_versions WHERE user_id = $1 AND version_label IS NOT NULL AND COALESCE(is_published, FALSE) = TRUE
         UNION ALL
         SELECT COUNT(*) as cover_letter_count FROM cover_letter_versions WHERE user_id = $1 AND version_label IS NOT NULL AND COALESCE(is_published, FALSE) = TRUE`,
        [userId]
      );
      console.log(`📊 [METRICS DEBUG] Labeled versions: ${JSON.stringify(labeledVersionsCheck.rows)}`);
    } else {
      // Debug: Log the metrics data to see avg_days_to_response values
      console.log(`📊 [METRICS DEBUG] Metrics data:`, metricsResult.rows.map(m => ({
        resume_label: m.resume_label,
        cover_letter_label: m.cover_letter_label,
        total_applications: m.total_applications,
        avg_days_to_response: m.avg_days_to_response,
        responses_received: m.responses_received
      })));
    }
    
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
      SELECT DISTINCT ON (j.id)
        j.id,
        j.title,
        j.company,
        j.status,
        j.application_outcome,
        j."applicationDate" AS applied_on,
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

    query += ` ORDER BY j.id, amh.changed_at DESC`;

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
    const includeArchived = req.query.includeArchived === 'true';

    // Get published resumes (standalone ones created from versions)
    // Show the published resume, not the original one
    let resumeVersions;
    console.log(`[GET /versions/labeled] Fetching resume versions for user ${userId}, includeArchived: ${includeArchived}`);
    try {
      // First, try query with published_resume_id (if column exists)
      // IMPORTANT: Always return rv.id (resume_versions.id) for labeling endpoint, not published_r.id
      // Only show versions where the published resume still exists (if is_published = TRUE)
      // Exclude archived versions unless includeArchived is true
      // Build WHERE clause conditionally
      // When includeArchived is true, show both published and archived versions
      // When includeArchived is false, only show published, non-archived versions
      let whereClause = `WHERE rv.user_id = $1 
          AND (rv.published_resume_id IS NULL OR published_r.id IS NOT NULL)`;
      
      // Try to add is_archived filter if column exists
      let orderByClause = `ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`;
      let isArchivedSelect = `FALSE AS is_archived`; // Default if column doesn't exist
      let hasIsArchivedColumn = false;
      
      try {
        // Test if is_archived column exists by checking a sample query
        await pool.query(`SELECT is_archived FROM resume_versions LIMIT 1`);
        // Column exists, add filter and order by
        hasIsArchivedColumn = true;
        isArchivedSelect = `COALESCE(rv.is_archived, FALSE) AS is_archived`;
        
        if (includeArchived) {
          // When showing archived, include both published and archived versions
          // Show: (is_published = TRUE AND is_archived = FALSE) OR (is_archived = TRUE)
          whereClause += ` AND ((COALESCE(rv.is_published, FALSE) = TRUE AND COALESCE(rv.is_archived, FALSE) = FALSE) OR COALESCE(rv.is_archived, FALSE) = TRUE)`;
        } else {
          // When not showing archived, only show published, non-archived versions
          whereClause += ` AND COALESCE(rv.is_published, FALSE) = TRUE AND COALESCE(rv.is_archived, FALSE) = FALSE`;
        }
        orderByClause = `ORDER BY rv.is_archived ASC, rv.version_label NULLS LAST, rv.version_number DESC`;
      } catch (colErr) {
        // Column doesn't exist, skip is_archived filter but still filter by is_published
        console.log(`[GET /versions/labeled] is_archived column not found, skipping archive filter`);
        whereClause += ` AND COALESCE(rv.is_published, FALSE) = TRUE`;
      }
      
      resumeVersions = await pool.query(
        `SELECT 
          rv.id,
          rv.version_label,
          COALESCE(published_r.title, rv.title) AS title,
          rv.version_number,
          COALESCE(published_r.title, r.title) AS resume_title,
          COALESCE(published_r.id, r.id) AS resume_id,
          published_r.description AS published_from_description,
          ${isArchivedSelect}
        FROM resume_versions rv
        INNER JOIN resumes r ON r.id = rv.resume_id
        LEFT JOIN resumes published_r ON published_r.id = rv.published_resume_id
        ${whereClause}
        ${orderByClause}`,
        [userId]
      );
      console.log(`[GET /versions/labeled] Found ${resumeVersions.rows.length} published resume versions`);
      if (resumeVersions.rows.length > 0) {
        console.log(`[GET /versions/labeled] Sample versions:`, resumeVersions.rows.slice(0, 3).map(r => ({
          id: r.id,
          version_label: r.version_label,
          title: r.title,
          version_number: r.version_number,
          resume_id: r.resume_id,
          published_resume_id: r.published_resume_id
        })));
      }
    } catch (err) {
      // If published_resume_id or description column doesn't exist, try without it
      if (err.message && (err.message.includes('published_resume_id') || err.message.includes('description'))) {
        console.warn("⚠️ published_resume_id or description column not found, trying simpler query.");
        try {
            let whereClause = `WHERE rv.user_id = $1 
              AND COALESCE(rv.is_published, FALSE) = TRUE`;
          let orderByClause = `ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`;
          let isArchivedSelect = `FALSE AS is_archived`;
          try {
            await pool.query(`SELECT is_archived FROM resume_versions LIMIT 1`);
            isArchivedSelect = `COALESCE(rv.is_archived, FALSE) AS is_archived`;
            if (!includeArchived) {
              whereClause += ` AND COALESCE(rv.is_archived, FALSE) = FALSE`;
            }
            orderByClause = `ORDER BY rv.is_archived ASC, rv.version_label NULLS LAST, rv.version_number DESC`;
          } catch (colErr) {
            console.log(`[GET /versions/labeled] is_archived column not found in fallback query, skipping`);
          }
          
          resumeVersions = await pool.query(
            `SELECT 
              rv.id,
              rv.version_label,
              rv.title,
              rv.version_number,
              r.title AS resume_title,
              r.id AS resume_id,
              r.description AS published_from_description,
              ${isArchivedSelect}
            FROM resume_versions rv
            INNER JOIN resumes r ON r.id = rv.resume_id
            ${whereClause}
            ${orderByClause}`,
            [userId]
          );
        } catch (err2) {
          // If is_published column doesn't exist either, show all versions
          if (err2.message && err2.message.includes('is_published')) {
            console.warn("⚠️ is_published column not found, showing all versions. Please run migration.");
            let whereClause = `WHERE rv.user_id = $1`;
            let orderByClause = `ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`;
            let isArchivedSelect = `FALSE AS is_archived`;
            try {
              await pool.query(`SELECT is_archived FROM resume_versions LIMIT 1`);
              isArchivedSelect = `COALESCE(rv.is_archived, FALSE) AS is_archived`;
              if (!includeArchived) {
                whereClause += ` AND COALESCE(rv.is_archived, FALSE) = FALSE`;
              }
              orderByClause = `ORDER BY rv.is_archived ASC, rv.version_label NULLS LAST, rv.version_number DESC`;
            } catch (colErr) {
              console.log(`[GET /versions/labeled] is_archived column not found in final fallback, skipping`);
            }
            
            resumeVersions = await pool.query(
              `SELECT 
                rv.id,
                rv.version_label,
                rv.title,
                rv.version_number,
                r.title AS resume_title,
                r.id AS resume_id,
                NULL AS published_from_description,
                ${isArchivedSelect}
              FROM resume_versions rv
              INNER JOIN resumes r ON r.id = rv.resume_id
              ${whereClause}
              ${orderByClause}`,
              [userId]
            );
          } else {
            throw err2;
          }
        }
      } else if (err.message && err.message.includes('is_published')) {
        // If only is_published doesn't exist, show all versions
        console.warn("⚠️ is_published column not found, showing all versions. Please run migration.");
        let whereClause = `WHERE rv.user_id = $1`;
        let orderByClause = `ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`;
        let isArchivedSelect = `FALSE AS is_archived`;
        try {
          await pool.query(`SELECT is_archived FROM resume_versions LIMIT 1`);
          isArchivedSelect = `COALESCE(rv.is_archived, FALSE) AS is_archived`;
          if (!includeArchived) {
            whereClause += ` AND COALESCE(rv.is_archived, FALSE) = FALSE`;
          }
          orderByClause = `ORDER BY rv.is_archived ASC, rv.version_label NULLS LAST, rv.version_number DESC`;
        } catch (colErr) {
          console.log(`[GET /versions/labeled] is_archived column not found, skipping`);
        }
        
        resumeVersions = await pool.query(
          `SELECT 
            rv.id,
            rv.version_label,
            rv.title,
            rv.version_number,
            r.title AS resume_title,
            r.id AS resume_id,
            NULL AS published_from_description,
            ${isArchivedSelect}
          FROM resume_versions rv
          INNER JOIN resumes r ON r.id = rv.resume_id
          ${whereClause}
          ${orderByClause}`,
          [userId]
        );
      } else {
        throw err;
      }
    }
    console.log(`[GET /versions/labeled] Found ${resumeVersions.rows.length} resume versions`);
    
    // Debug: Check if we have any published resumes that aren't in resume_versions
    // If no versions found but published resumes exist, try to create version entries for them
    try {
      const publishedResumesCheck = await pool.query(
        `SELECT id, title, description FROM resumes 
         WHERE user_id = $1 
           AND (description LIKE '%Published from%' OR title LIKE '%Published from%')
           AND (is_version IS NULL OR is_version = FALSE)`,
        [userId]
      );
      const publishedResumes = publishedResumesCheck.rows || [];
      console.log(`[GET /versions/labeled] Found ${publishedResumes.length} published standalone resumes`);
      
      if (publishedResumes.length > 0 && resumeVersions.rows.length === 0) {
        console.warn(`⚠️ Found ${publishedResumes.length} published resumes but 0 versions in resume_versions. Attempting to create version entries...`);
        
        // Try to create version entries for published resumes that don't have them
        for (const publishedResume of publishedResumes) {
          try {
            // Extract resume_id and version_number from description or title
            let originalResumeId = null;
            let versionNumber = 1;
            
            // Try to extract from description: "Published from 'Title' - Version X"
            if (publishedResume.description) {
              const descMatch = publishedResume.description.match(/Published from "(.+?)" - Version (\d+)/);
              if (descMatch) {
                // Find the original resume by title
                const originalResumeResult = await pool.query(
                  `SELECT id FROM resumes WHERE user_id = $1 AND title = $2 AND (is_version IS NULL OR is_version = FALSE) LIMIT 1`,
                  [userId, descMatch[1]]
                );
                if (originalResumeResult.rows.length > 0) {
                  originalResumeId = originalResumeResult.rows[0].id;
                  versionNumber = parseInt(descMatch[2]);
                }
              }
            }
            
            // Fallback: try to extract from title
            if (!originalResumeId && publishedResume.title) {
              const titleMatch = publishedResume.title.match(/Published from (.+?) - Version (\d+)\)/);
              if (titleMatch) {
                const originalResumeResult = await pool.query(
                  `SELECT id FROM resumes WHERE user_id = $1 AND title = $2 AND (is_version IS NULL OR is_version = FALSE) LIMIT 1`,
                  [userId, titleMatch[1]]
                );
                if (originalResumeResult.rows.length > 0) {
                  originalResumeId = originalResumeResult.rows[0].id;
                  versionNumber = parseInt(titleMatch[2]);
                }
              }
            }
            
            // If we found the original resume, create/update the version entry
            if (originalResumeId) {
              try {
                await pool.query(
                  `INSERT INTO resume_versions (resume_id, user_id, version_number, title, is_published, published_resume_id)
                   VALUES ($1, $2, $3, $4, TRUE, $5)
                   ON CONFLICT (resume_id, version_number) 
                   DO UPDATE SET is_published = TRUE, published_resume_id = $5`,
                  [originalResumeId, userId, versionNumber, publishedResume.title, publishedResume.id]
                );
                console.log(`✅ Created/updated resume_versions entry for published resume ${publishedResume.id}`);
              } catch (insertErr) {
                // Try without published_resume_id if column doesn't exist
                if (insertErr.message?.includes('published_resume_id')) {
                  await pool.query(
                    `INSERT INTO resume_versions (resume_id, user_id, version_number, title, is_published)
                     VALUES ($1, $2, $3, $4, TRUE)
                     ON CONFLICT (resume_id, version_number) 
                     DO UPDATE SET is_published = TRUE`,
                    [originalResumeId, userId, versionNumber, publishedResume.title]
                  );
                  console.log(`✅ Created/updated resume_versions entry (without published_resume_id) for published resume ${publishedResume.id}`);
                } else {
                  console.warn(`⚠️ Could not create version entry for published resume ${publishedResume.id}:`, insertErr.message);
                }
              }
            } else {
              console.warn(`⚠️ Could not find original resume for published resume ${publishedResume.id}`);
            }
          } catch (resumeErr) {
            console.warn(`⚠️ Error processing published resume ${publishedResume.id}:`, resumeErr.message);
          }
        }
        
        // Re-fetch versions after creating entries
        try {
          resumeVersions = await pool.query(
            `SELECT 
              rv.id,
              rv.version_label,
              COALESCE(published_r.title, rv.title) AS title,
              rv.version_number,
              COALESCE(published_r.title, r.title) AS resume_title,
              COALESCE(published_r.id, r.id) AS resume_id,
              published_r.description AS published_from_description
            FROM resume_versions rv
            INNER JOIN resumes r ON r.id = rv.resume_id
            LEFT JOIN resumes published_r ON published_r.id = rv.published_resume_id
            WHERE rv.user_id = $1 
              AND COALESCE(rv.is_published, FALSE) = TRUE
              AND (rv.published_resume_id IS NULL OR published_r.id IS NOT NULL)
            ORDER BY rv.version_label NULLS LAST, rv.version_number DESC`,
            [userId]
          );
          console.log(`[GET /versions/labeled] After creating entries, found ${resumeVersions.rows.length} resume versions`);
        } catch (refetchErr) {
          console.warn("⚠️ Could not refetch versions after creating entries:", refetchErr.message);
        }
      }
    } catch (checkErr) {
      console.warn("⚠️ Could not check for published resumes:", checkErr.message);
    }

    // Get published cover letters (standalone ones created from versions)
    // Show the published cover letter, not the original one
    let coverLetterVersions;
    console.log(`[GET /versions/labeled] Fetching cover letter versions for user ${userId}`);
    try {
      // First, try query with published_cover_letter_id (if column exists)
      // IMPORTANT: Always return clv.id (cover_letter_versions.id) for labeling endpoint, not published_cl.id
      // Only show versions where the published cover letter still exists (if is_published = TRUE)
      let coverLetterWhereClause = `WHERE clv.user_id = $1 
          AND (clv.published_cover_letter_id IS NULL OR published_cl.id IS NOT NULL)`;
      
      let coverLetterOrderByClause = `ORDER BY clv.version_label NULLS LAST, clv.version_number DESC`;
      let coverLetterIsArchivedSelect = `FALSE AS is_archived`; // Default if column doesn't exist
      
      try {
        await pool.query(`SELECT is_archived FROM cover_letter_versions LIMIT 1`);
        coverLetterIsArchivedSelect = `COALESCE(clv.is_archived, FALSE) AS is_archived`;
        
        if (includeArchived) {
          // When showing archived, include both published and archived versions
          // Show: (is_published = TRUE AND is_archived = FALSE) OR (is_archived = TRUE)
          coverLetterWhereClause += ` AND ((COALESCE(clv.is_published, FALSE) = TRUE AND COALESCE(clv.is_archived, FALSE) = FALSE) OR COALESCE(clv.is_archived, FALSE) = TRUE)`;
        } else {
          // When not showing archived, only show published, non-archived versions
          coverLetterWhereClause += ` AND COALESCE(clv.is_published, FALSE) = TRUE AND COALESCE(clv.is_archived, FALSE) = FALSE`;
        }
        coverLetterOrderByClause = `ORDER BY clv.is_archived ASC, clv.version_label NULLS LAST, clv.version_number DESC`;
      } catch (colErr) {
        console.log(`[GET /versions/labeled] is_archived column not found in cover_letter_versions, skipping archive filter`);
        coverLetterWhereClause += ` AND COALESCE(clv.is_published, FALSE) = TRUE`;
      }
      
      coverLetterVersions = await pool.query(
        `SELECT 
          clv.id,
          clv.version_label,
          COALESCE(published_cl.title, clv.title) AS title,
          clv.version_number,
          COALESCE(published_cl.title, ucl.title) AS cover_letter_name,
          COALESCE(published_cl.id, ucl.id) AS cover_letter_id,
          published_cl.description AS published_from_description,
          ${coverLetterIsArchivedSelect}
        FROM cover_letter_versions clv
        INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
        LEFT JOIN uploaded_cover_letters published_cl ON published_cl.id = clv.published_cover_letter_id
        ${coverLetterWhereClause}
        ${coverLetterOrderByClause}`,
        [userId]
      );
    } catch (err) {
      // If published_cover_letter_id or description column doesn't exist, try without it
      if (err.message && (err.message.includes('published_cover_letter_id') || err.message.includes('description'))) {
        console.warn("⚠️ published_cover_letter_id or description column not found, trying simpler query.");
        try {
          let coverLetterWhereClause = `WHERE clv.user_id = $1 
              AND COALESCE(clv.is_published, FALSE) = TRUE`;
          let coverLetterOrderByClause = `ORDER BY clv.version_label NULLS LAST, clv.version_number DESC`;
          let coverLetterIsArchivedSelect = `FALSE AS is_archived`;
          try {
            await pool.query(`SELECT is_archived FROM cover_letter_versions LIMIT 1`);
            coverLetterIsArchivedSelect = `COALESCE(clv.is_archived, FALSE) AS is_archived`;
            if (!includeArchived) {
              coverLetterWhereClause += ` AND COALESCE(clv.is_archived, FALSE) = FALSE`;
            }
            coverLetterOrderByClause = `ORDER BY clv.is_archived ASC, clv.version_label NULLS LAST, clv.version_number DESC`;
          } catch (colErr) {
            console.log(`[GET /versions/labeled] is_archived column not found in fallback cover letter query, skipping`);
          }
          
          coverLetterVersions = await pool.query(
            `SELECT 
              clv.id,
              clv.version_label,
              clv.title,
              clv.version_number,
              ucl.title AS cover_letter_name,
              ucl.id AS cover_letter_id,
              ucl.description AS published_from_description,
              ${coverLetterIsArchivedSelect}
            FROM cover_letter_versions clv
            INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
            ${coverLetterWhereClause}
            ${coverLetterOrderByClause}`,
            [userId]
          );
        } catch (err2) {
          // If is_published column doesn't exist either, show all versions
          if (err2.message && err2.message.includes('is_published')) {
            console.warn("⚠️ is_published column not found, showing all versions. Please run migration.");
            let coverLetterWhereClause = `WHERE clv.user_id = $1`;
            let coverLetterOrderByClause = `ORDER BY clv.version_label NULLS LAST, clv.version_number DESC`;
            let coverLetterIsArchivedSelect = `FALSE AS is_archived`;
            try {
              await pool.query(`SELECT is_archived FROM cover_letter_versions LIMIT 1`);
              coverLetterIsArchivedSelect = `COALESCE(clv.is_archived, FALSE) AS is_archived`;
              if (!includeArchived) {
                coverLetterWhereClause += ` AND COALESCE(clv.is_archived, FALSE) = FALSE`;
              }
              coverLetterOrderByClause = `ORDER BY clv.is_archived ASC, clv.version_label NULLS LAST, clv.version_number DESC`;
            } catch (colErr) {
              console.log(`[GET /versions/labeled] is_archived column not found in final cover letter fallback, skipping`);
            }
            
            coverLetterVersions = await pool.query(
              `SELECT 
                clv.id,
                clv.version_label,
                clv.title,
                clv.version_number,
                ucl.title AS cover_letter_name,
                ucl.id AS cover_letter_id,
                NULL AS published_from_description,
                ${coverLetterIsArchivedSelect}
              FROM cover_letter_versions clv
              INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
              ${coverLetterWhereClause}
              ${coverLetterOrderByClause}`,
              [userId]
            );
          } else {
            throw err2;
          }
        }
      } else if (err.message && err.message.includes('is_published')) {
        // If only is_published doesn't exist, show all versions
        console.warn("⚠️ is_published column not found, showing all versions. Please run migration.");
        let coverLetterWhereClause = `WHERE clv.user_id = $1`;
        let coverLetterOrderByClause = `ORDER BY clv.version_label NULLS LAST, clv.version_number DESC`;
        let coverLetterIsArchivedSelect = `FALSE AS is_archived`;
        try {
          await pool.query(`SELECT is_archived FROM cover_letter_versions LIMIT 1`);
          coverLetterIsArchivedSelect = `COALESCE(clv.is_archived, FALSE) AS is_archived`;
          if (!includeArchived) {
            coverLetterWhereClause += ` AND COALESCE(clv.is_archived, FALSE) = FALSE`;
          }
          coverLetterOrderByClause = `ORDER BY clv.is_archived ASC, clv.version_label NULLS LAST, clv.version_number DESC`;
        } catch (colErr) {
          console.log(`[GET /versions/labeled] is_archived column not found in cover letter fallback, skipping`);
        }
        
        coverLetterVersions = await pool.query(
          `SELECT 
            clv.id,
            clv.version_label,
            clv.title,
            clv.version_number,
            ucl.title AS cover_letter_name,
            ucl.id AS cover_letter_id,
            NULL AS published_from_description,
            ${coverLetterIsArchivedSelect}
          FROM cover_letter_versions clv
          INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
          ${coverLetterWhereClause}
          ${coverLetterOrderByClause}`,
          [userId]
        );
      } else {
        throw err;
      }
    }
    console.log(`[GET /versions/labeled] Found ${coverLetterVersions.rows.length} cover letter versions`);

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
// 8. ARCHIVE VERSION (set is_archived = TRUE and remove label)
// ============================================================
router.put("/resume-versions/:versionId/archive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    // First, check if this version is attached to any jobs
    const versionCheck = await pool.query(
      `SELECT rv.id, rv.published_resume_id, rv.resume_id
       FROM resume_versions rv
       WHERE rv.id = $1 AND rv.user_id = $2`,
      [versionId, userId]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Resume version not found" });
    }

    const version = versionCheck.rows[0];
    const publishedResumeId = version.published_resume_id || version.resume_id;

    // Check if this resume is linked to any jobs
    const jobLinks = await pool.query(
      `SELECT COUNT(*) as count, array_agg(DISTINCT j.title) as job_titles
       FROM job_materials jm
       LEFT JOIN jobs j ON jm.job_id = j.id AND j.user_id = jm.user_id
       WHERE jm.resume_id = $1 AND jm.user_id = $2`,
      [publishedResumeId, userId]
    );

    const jobCount = parseInt(jobLinks.rows[0].count);
    if (jobCount > 0) {
      const jobTitles = jobLinks.rows[0].job_titles?.filter(Boolean) || [];
      const jobList = jobTitles.length > 0 
        ? `: ${jobTitles.slice(0, 3).join(", ")}${jobTitles.length > 3 ? ` and ${jobTitles.length - 3} more` : ""}`
        : "";
      return res.status(400).json({ 
        error: "Cannot archive version attached to jobs",
        details: `This version is currently linked to ${jobCount} job application${jobCount > 1 ? 's' : ''}${jobList}. Please unlink it from all jobs before archiving.`
      });
    }

    // Also check application_materials_history
    const historyLinks = await pool.query(
      `SELECT COUNT(*) as count, array_agg(DISTINCT j.title) as job_titles
       FROM application_materials_history amh
       LEFT JOIN jobs j ON amh.job_id = j.id AND j.user_id = amh.user_id
       WHERE amh.resume_id = $1 AND amh.user_id = $2`,
      [publishedResumeId, userId]
    );

    const historyCount = parseInt(historyLinks.rows[0].count);
    if (historyCount > 0) {
      const jobTitles = historyLinks.rows[0].job_titles?.filter(Boolean) || [];
      const jobList = jobTitles.length > 0 
        ? `: ${jobTitles.slice(0, 3).join(", ")}${jobTitles.length > 3 ? ` and ${jobTitles.length - 3} more` : ""}`
        : "";
      return res.status(400).json({ 
        error: "Cannot archive version attached to jobs",
        details: `This version has been used in ${historyCount} job application${historyCount > 1 ? 's' : ''}${jobList}. Please remove it from all applications before archiving.`
      });
    }

    // Archive the version (set is_archived = TRUE and clear label)
    await pool.query(
      `UPDATE resume_versions 
       SET version_label = NULL, is_archived = TRUE
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    res.json({ success: true, message: "Resume version archived" });
  } catch (err) {
    console.error("Error archiving resume version:", err);
    res.status(500).json({ error: "Failed to archive resume version" });
  }
});

router.put("/resume-versions/:versionId/unarchive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    // Check if version exists
    const versionCheck = await pool.query(
      `SELECT rv.id, rv.is_archived
       FROM resume_versions rv
       WHERE rv.id = $1 AND rv.user_id = $2`,
      [versionId, userId]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Resume version not found" });
    }

    const version = versionCheck.rows[0];
    
    // Unarchive the version (set is_archived = FALSE)
    // Note: We don't restore the label automatically - user can re-label if needed
    try {
      await pool.query(
        `UPDATE resume_versions 
         SET is_archived = FALSE
         WHERE id = $1 AND user_id = $2`,
        [versionId, userId]
      );
    } catch (updateErr) {
      // If is_archived column doesn't exist, that's okay - version is effectively unarchived
      if (updateErr.message && updateErr.message.includes('is_archived')) {
        console.log(`[PUT /resume-versions/:versionId/unarchive] is_archived column not found, skipping`);
      } else {
        throw updateErr;
      }
    }

    res.json({ success: true, message: "Resume version unarchived" });
  } catch (err) {
    console.error("Error unarchiving resume version:", err);
    res.status(500).json({ error: "Failed to unarchive resume version", details: err.message });
  }
});

router.put("/cover-letter-versions/:versionId/archive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    // First, check if this version is attached to any jobs
    const versionCheck = await pool.query(
      `SELECT clv.id, clv.published_cover_letter_id, clv.cover_letter_id
       FROM cover_letter_versions clv
       WHERE clv.id = $1 AND clv.user_id = $2`,
      [versionId, userId]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter version not found" });
    }

    const version = versionCheck.rows[0];
    const publishedCoverLetterId = version.published_cover_letter_id || version.cover_letter_id;

    // Check if this cover letter is linked to any jobs
    const jobLinks = await pool.query(
      `SELECT COUNT(*) as count, array_agg(DISTINCT j.title) as job_titles
       FROM job_materials jm
       LEFT JOIN jobs j ON jm.job_id = j.id AND j.user_id = jm.user_id
       WHERE jm.cover_letter_id = $1 AND jm.user_id = $2`,
      [publishedCoverLetterId, userId]
    );

    const jobCount = parseInt(jobLinks.rows[0].count);
    if (jobCount > 0) {
      const jobTitles = jobLinks.rows[0].job_titles?.filter(Boolean) || [];
      const jobList = jobTitles.length > 0 
        ? `: ${jobTitles.slice(0, 3).join(", ")}${jobTitles.length > 3 ? ` and ${jobTitles.length - 3} more` : ""}`
        : "";
      return res.status(400).json({ 
        error: "Cannot archive version attached to jobs",
        details: `This version is currently linked to ${jobCount} job application${jobCount > 1 ? 's' : ''}${jobList}. Please unlink it from all jobs before archiving.`
      });
    }

    // Also check application_materials_history
    const historyLinks = await pool.query(
      `SELECT COUNT(*) as count, array_agg(DISTINCT j.title) as job_titles
       FROM application_materials_history amh
       LEFT JOIN jobs j ON amh.job_id = j.id AND j.user_id = amh.user_id
       WHERE amh.cover_letter_id = $1 AND amh.user_id = $2`,
      [publishedCoverLetterId, userId]
    );

    const historyCount = parseInt(historyLinks.rows[0].count);
    if (historyCount > 0) {
      const jobTitles = historyLinks.rows[0].job_titles?.filter(Boolean) || [];
      const jobList = jobTitles.length > 0 
        ? `: ${jobTitles.slice(0, 3).join(", ")}${jobTitles.length > 3 ? ` and ${jobTitles.length - 3} more` : ""}`
        : "";
      return res.status(400).json({ 
        error: "Cannot archive version attached to jobs",
        details: `This version has been used in ${historyCount} job application${historyCount > 1 ? 's' : ''}${jobList}. Please remove it from all applications before archiving.`
      });
    }

    // Archive the version (set is_archived = TRUE and clear label)
    await pool.query(
      `UPDATE cover_letter_versions 
       SET version_label = NULL, is_archived = TRUE
       WHERE id = $1 AND user_id = $2`,
      [versionId, userId]
    );

    res.json({ success: true, message: "Cover letter version archived" });
  } catch (err) {
    console.error("Error archiving cover letter version:", err);
    res.status(500).json({ error: "Failed to archive cover letter version" });
  }
});

router.put("/cover-letter-versions/:versionId/unarchive", auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.user.id;

    // Check if version exists
    const versionCheck = await pool.query(
      `SELECT clv.id, clv.is_archived
       FROM cover_letter_versions clv
       WHERE clv.id = $1 AND clv.user_id = $2`,
      [versionId, userId]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter version not found" });
    }

    const version = versionCheck.rows[0];
    
    // Unarchive the version (set is_archived = FALSE)
    // Note: We don't restore the label automatically - user can re-label if needed
    try {
      await pool.query(
        `UPDATE cover_letter_versions 
         SET is_archived = FALSE
         WHERE id = $1 AND user_id = $2`,
        [versionId, userId]
      );
    } catch (updateErr) {
      // If is_archived column doesn't exist, that's okay - version is effectively unarchived
      if (updateErr.message && updateErr.message.includes('is_archived')) {
        console.log(`[PUT /cover-letter-versions/:versionId/unarchive] is_archived column not found, skipping`);
      } else {
        throw updateErr;
      }
    }

    res.json({ success: true, message: "Cover letter version unarchived" });
  } catch (err) {
    console.error("Error unarchiving cover letter version:", err);
    res.status(500).json({ error: "Failed to unarchive cover letter version", details: err.message });
  }
});

export default router;

