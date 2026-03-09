// backend/routes/qualityScoring.js
// UC-122: Application Package Quality Scoring - API Routes

import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../db/pool.js";
import { auth } from "../auth.js";
import { createSimpleQualityScoringService } from "../services/qualityScoringServiceSimple.js";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Initialize simplified quality scoring service
const qualityScoringService = createSimpleQualityScoringService(null, pool);

// ============================================================
// POST /api/quality-scoring/:jobId/analyze
// Generate or update quality score for a job application
// ============================================================
router.post("/:jobId/analyze", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const { forceRefresh = false, minimumThreshold = 70 } = req.body;

    // Validate job belongs to user
    const jobCheck = await pool.query(
      `SELECT id, title, company FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // TEMPORARILY: Always force refresh since we updated the scoring algorithm
    // TODO: Remove this after old scores are cleared
    const alwaysRefresh = true;
    
    // Check if score exists and is recent (< 24 hours old)
    // BUT: Always refresh if forceRefresh is true, or if materials have changed recently
    if (!forceRefresh && !alwaysRefresh) {
      // Check if job materials were updated recently (within last hour)
      const materialsCheck = await pool.query(
        `SELECT updated_at FROM job_materials WHERE job_id = $1`,
        [jobId]
      );
      
      let shouldRefresh = false;
      if (materialsCheck.rows.length > 0) {
        const materialsUpdated = new Date(materialsCheck.rows[0].updated_at).getTime();
        const now = Date.now();
        const minutesSinceUpdate = (now - materialsUpdated) / (1000 * 60);
        // If materials were updated in the last hour, force refresh
        if (minutesSinceUpdate < 60) {
          console.log(`🔄 [QUALITY SCORING] Materials updated ${minutesSinceUpdate.toFixed(1)} minutes ago, forcing refresh`);
          shouldRefresh = true;
        }
      }
      
      if (!shouldRefresh) {
        const existingScore = await pool.query(
          `SELECT id, overall_score, created_at, updated_at 
           FROM application_quality_scores 
           WHERE job_id = $1 AND user_id = $2
           ORDER BY updated_at DESC
           LIMIT 1`,
          [jobId, userId]
        );

        if (existingScore.rows.length > 0) {
          const score = existingScore.rows[0];
          const scoreAge = Date.now() - new Date(score.updated_at).getTime();
          const hoursOld = scoreAge / (1000 * 60 * 60);

          if (hoursOld < 24) {
            console.log(`✅ [QUALITY SCORING] Returning cached score (${hoursOld.toFixed(1)} hours old)`);
            // Fetch full score data
            const fullScore = await pool.query(
              `SELECT * FROM application_quality_scores WHERE id = $1`,
              [score.id]
            );
            return res.json({ score: fullScore.rows[0], cached: true });
          }
        }
      }
    }

    console.log(`🔍 [QUALITY SCORING] Starting analysis for job ${jobId}, user ${userId}`);

    // Run AI analysis
    const qualityScore = await qualityScoringService.analyzeApplicationQuality(
      parseInt(jobId),
      userId,
      minimumThreshold
    );

    // Check if job description is missing
    if (qualityScore.missing_job_description) {
      return res.status(400).json({
        error: qualityScore.error,
        missing_job_description: true,
        score: null
      });
    }

    // Calculate user statistics for comparison
    const userStats = await pool.query(
      `SELECT 
        AVG(overall_score)::DECIMAL(5,2) as average_score,
        MAX(overall_score)::INTEGER as top_score
       FROM application_quality_scores
       WHERE user_id = $1 AND job_id != $2`,
      [userId, jobId]
    );

    const userAverage = userStats.rows[0]?.average_score || null;
    const topPerformer = userStats.rows[0]?.top_score || null;

    // Store or update score in database
    const scoreData = {
      job_id: parseInt(jobId),
      user_id: userId,
      overall_score: qualityScore.overall_score,
      resume_score: qualityScore.resume_score,
      cover_letter_score: qualityScore.cover_letter_score,
      linkedin_score: qualityScore.linkedin_score,
      score_breakdown: qualityScore.score_breakdown,
      missing_keywords: qualityScore.missing_keywords,
      missing_skills: qualityScore.missing_skills,
      formatting_issues: qualityScore.formatting_issues,
      inconsistencies: qualityScore.inconsistencies,
      improvement_suggestions: qualityScore.improvement_suggestions,
      user_average_score: userAverage,
      top_performer_score: topPerformer,
      meets_threshold: qualityScore.meets_threshold,
      minimum_threshold: minimumThreshold
    };

    // Insert or update score
    const insertResult = await pool.query(
      `INSERT INTO application_quality_scores (
        job_id, user_id, overall_score, resume_score, cover_letter_score, linkedin_score,
        score_breakdown, missing_keywords, missing_skills, formatting_issues, inconsistencies,
        improvement_suggestions, user_average_score, top_performer_score, meets_threshold, minimum_threshold
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (job_id) 
      DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        resume_score = EXCLUDED.resume_score,
        cover_letter_score = EXCLUDED.cover_letter_score,
        linkedin_score = EXCLUDED.linkedin_score,
        score_breakdown = EXCLUDED.score_breakdown,
        missing_keywords = EXCLUDED.missing_keywords,
        missing_skills = EXCLUDED.missing_skills,
        formatting_issues = EXCLUDED.formatting_issues,
        inconsistencies = EXCLUDED.inconsistencies,
        improvement_suggestions = EXCLUDED.improvement_suggestions,
        user_average_score = EXCLUDED.user_average_score,
        top_performer_score = EXCLUDED.top_performer_score,
        meets_threshold = EXCLUDED.meets_threshold,
        minimum_threshold = EXCLUDED.minimum_threshold,
        updated_at = NOW()
      RETURNING *`,
      [
        scoreData.job_id,
        scoreData.user_id,
        scoreData.overall_score,
        scoreData.resume_score,
        scoreData.cover_letter_score,
        scoreData.linkedin_score,
        JSON.stringify(scoreData.score_breakdown),
        scoreData.missing_keywords,
        scoreData.missing_skills,
        JSON.stringify(scoreData.formatting_issues),
        JSON.stringify(scoreData.inconsistencies),
        JSON.stringify(scoreData.improvement_suggestions),
        scoreData.user_average_score,
        scoreData.top_performer_score,
        scoreData.meets_threshold,
        scoreData.minimum_threshold
      ]
    );

    const savedScore = insertResult.rows[0];

    // Create history entry
    await pool.query(
      `INSERT INTO application_quality_score_history (
        job_id, user_id, overall_score, resume_score, cover_letter_score, score_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        jobId,
        userId,
        savedScore.overall_score,
        savedScore.resume_score,
        savedScore.cover_letter_score,
        JSON.stringify(savedScore.score_breakdown)
      ]
    );

    console.log(`✅ [QUALITY SCORING] Score saved: ${savedScore.overall_score}/100`);

    res.json({
      score: savedScore,
      cached: false
    });
  } catch (err) {
    console.error("❌ [QUALITY SCORING] Analysis error:", err);
    console.error("❌ [QUALITY SCORING] Error stack:", err.stack);
    res.status(500).json({
      error: "Failed to analyze application quality",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ============================================================
// GET /api/quality-scoring/:jobId
// Get existing quality score for a job
// ============================================================
router.get("/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Validate job belongs to user
    const jobCheck = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Fetch score
    const scoreResult = await pool.query(
      `SELECT * FROM application_quality_scores 
       WHERE job_id = $1 AND user_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [jobId, userId]
    );

    if (scoreResult.rows.length === 0) {
      return res.status(404).json({ error: "Quality score not found. Run analysis first." });
    }

    res.json({ score: scoreResult.rows[0] });
  } catch (err) {
    console.error("❌ [QUALITY SCORING] Get score error:", err);
    res.status(500).json({
      error: "Failed to fetch quality score",
      message: err.message
    });
  }
});

// ============================================================
// GET /api/quality-scoring/user/stats
// Get user's quality scoring statistics
// ============================================================
router.get("/user/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*)::INTEGER as total_applications,
        AVG(overall_score)::DECIMAL(5,2) as average_score,
        MAX(overall_score)::INTEGER as top_score,
        MIN(overall_score)::INTEGER as lowest_score,
        COUNT(CASE WHEN meets_threshold = true THEN 1 END)::INTEGER as passing_count,
        COUNT(CASE WHEN meets_threshold = false THEN 1 END)::INTEGER as failing_count
       FROM application_quality_scores
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0] || {
      total_applications: 0,
      average_score: null,
      top_score: null,
      lowest_score: null,
      passing_count: 0,
      failing_count: 0
    };

    res.json({ stats });
  } catch (err) {
    console.error("❌ [QUALITY SCORING] Get stats error:", err);
    res.status(500).json({
      error: "Failed to fetch user statistics",
      message: err.message
    });
  }
});

// ============================================================
// GET /api/quality-scoring/:jobId/history
// Get score history for a job (tracking improvements)
// ============================================================
router.get("/:jobId/history", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Validate job belongs to user
    const jobCheck = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Fetch history
    const historyResult = await pool.query(
      `SELECT id, overall_score, resume_score, cover_letter_score, score_breakdown, created_at
       FROM application_quality_score_history
       WHERE job_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [jobId, userId]
    );

    res.json({ history: historyResult.rows });
  } catch (err) {
    console.error("❌ [QUALITY SCORING] Get history error:", err);
    res.status(500).json({
      error: "Failed to fetch score history",
      message: err.message
    });
  }
});

// ============================================================
// PUT /api/quality-scoring/user/threshold
// Update user's minimum quality score threshold
// ============================================================
router.put("/user/threshold", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { threshold } = req.body;

    if (!threshold || typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
      return res.status(400).json({ error: "Threshold must be a number between 0 and 100" });
    }

    // Update threshold for all user's scores
    await pool.query(
      `UPDATE application_quality_scores
       SET minimum_threshold = $1,
           meets_threshold = (overall_score >= $1)
       WHERE user_id = $2`,
      [threshold, userId]
    );

    res.json({
      message: "Threshold updated successfully",
      threshold
    });
  } catch (err) {
    console.error("❌ [QUALITY SCORING] Update threshold error:", err);
    res.status(500).json({
      error: "Failed to update threshold",
      message: err.message
    });
  }
});

export default router;

