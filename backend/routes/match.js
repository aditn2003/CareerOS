// backend/routes/match.js
import express from "express";
import axios from "axios";
import pkg from "pg";
import { trackApiCall } from "../utils/apiTrackingService.js";

const { Pool } = pkg;

// Factory function for dependency injection (for testing)
import sharedPool from "../db/pool.js"; // Import shared pool for test mode

function createMatchRoutes(dbPool = null, openaiApiKey = null) {
  const router = express.Router();
  // In test mode, use shared pool to ensure transaction isolation works
  const pool = dbPool || (process.env.NODE_ENV === 'test' ? sharedPool : new Pool({ connectionString: process.env.DATABASE_URL }));
  const OPENAI_API_KEY = openaiApiKey || process.env.OPENAI_API_KEY;

  /* ==========================================================
     1. BUILD USER PROFILE FROM YOUR REAL TABLES
     ========================================================== */
  async function getUserProfileObject(userId) {
  // 1) Profile row
  const profileQ = pool.query(
    `SELECT full_name, email, phone, location, title, bio, industry, experience
     FROM profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  // 2) Skills
  const skillsQ = pool.query(
    `SELECT name, category, proficiency
     FROM skills
     WHERE user_id = $1
     ORDER BY name`,
    [userId]
  );

  // 3) Employment
  const employmentQ = pool.query(
    `SELECT title, company, location, start_date, end_date, current, description
     FROM employment
     WHERE user_id = $1
     ORDER BY start_date DESC`,
    [userId]
  );

  // 4) Education
  const educationQ = pool.query(
    `SELECT institution, degree_type, field_of_study, graduation_date, gpa, education_level
     FROM education
     WHERE user_id = $1
     ORDER BY graduation_date DESC NULLS LAST`,
    [userId]
  );

  const [profileRes, skillsRes, employmentRes, educationRes] = await Promise.all([
    profileQ,
    skillsQ,
    employmentQ,
    educationQ,
  ]);

  const p = profileRes.rows[0] || {};

  return {
    basic: {
      fullName: p.full_name || "",
      email: p.email || "",
      phone: p.phone || "",
      location: p.location || "",
      title: p.title || "",
      bio: p.bio || "",
      industry: p.industry || "",
      experienceSummary: p.experience || "",
    },
    skills: skillsRes.rows,
    employment: employmentRes.rows,
    education: educationRes.rows,
  };
  }

  /* ==========================================================
     2. FETCH JOB OBJECT
     ========================================================== */
  async function getJobObject(jobId) {
  const { rows } = await pool.query(
    `SELECT id, title, company, location, description
     FROM jobs
     WHERE id = $1
     LIMIT 1`,
    [jobId]
  );

  if (!rows[0]) return null;

  return {
    jobId: rows[0].id,
    title: rows[0].title,
    company: rows[0].company,
    location: rows[0].location,
    description: rows[0].description || "",
  };
  }

  /* ==========================================================
     3. OPENAI MATCH ANALYSIS
     ========================================================== */
  async function analyzeMatch(job, profile, weights, userId = null) {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const prompt = `
You are an ATS job matching engine.
Compare the JOB DESCRIPTION with the USER PROFILE and produce numerical match scores.

Return ONLY JSON:
{
  "matchScore": number,
  "skillsScore": number,
  "experienceScore": number,
  "educationScore": number,
  "strengths": string[],
  "gaps": string[],
  "improvements": string[]
}

JOB:
${JSON.stringify(job, null, 2)}

PROFILE:
${JSON.stringify(profile, null, 2)}

Weights:
- Skills: ${weights.skillsWeight}
- Experience: ${weights.experienceWeight}
- Education: ${weights.educationWeight}
`;

  const { data } = await trackApiCall(
    'openai',
    () => axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a precise ATS scoring engine." },
          { role: "user", content: prompt },
        ],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    ),
    {
      endpoint: '/v1/chat/completions',
      method: 'POST',
      userId,
      requestPayload: { model: 'gpt-4o-mini', purpose: 'job_match_analysis' },
      estimateCost: 0.001
    }
  );

  let raw = {};
  try {
    raw = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    console.error("❌ BAD AI JSON:", data.choices[0].message.content);
    throw new Error("Invalid AI JSON");
  }

  console.log("🔍 AI MATCH RAW:", raw);

  // Normalize field names so UI always works
  return {
    matchScore: Number(raw.matchScore ?? 0),
    skillsScore: Number(raw.skillsScore ?? raw.skillScore ?? 0),
    experienceScore: Number(raw.experienceScore ?? raw.expScore ?? 0),
    educationScore: Number(raw.educationScore ?? raw.eduScore ?? 0),
    strengths: raw.strengths || [],
    gaps: raw.gaps || [],
    improvements: raw.improvements || [],
  };
  }

  /* ==========================================================
     3b. DETAILED REQUIREMENTS MATCH ANALYSIS (UC-123)
     ========================================================== */
  async function analyzeRequirementsMatch(job, profile, userId = null) {
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    const prompt = `
You are an expert ATS job requirements analyzer. Analyze how well this candidate matches the job requirements.

Return ONLY valid JSON with this EXACT structure:
{
  "overallScore": number (0-100),
  "experienceLevelMatch": {
    "jobLevel": "entry" | "mid" | "senior" | "executive",
    "candidateLevel": "entry" | "mid" | "senior" | "executive",
    "isMatch": boolean,
    "yearsRequired": number or null,
    "yearsCandidate": number
  },
  "matchingSkills": [
    { "skill": string, "proficiency": "beginner" | "intermediate" | "advanced" | "expert", "relevance": "critical" | "important" | "nice-to-have" }
  ],
  "matchingExperiences": [
    { "experience": string, "relevance": "high" | "medium" | "low" }
  ],
  "matchingQualifications": [
    { "qualification": string, "type": "education" | "certification" | "achievement" }
  ],
  "missingRequirements": [
    { "requirement": string, "importance": "critical" | "important" | "nice-to-have", "category": "skill" | "experience" | "education" | "certification" }
  ],
  "strongestQualifications": [
    { "qualification": string, "reason": string }
  ],
  "skillsToEmphasize": [
    { "skill": string, "reason": string }
  ],
  "experiencesToHighlight": [
    { "experience": string, "reason": string }
  ],
  "recommendationsForGaps": [
    { "gap": string, "recommendation": string, "timeframe": "short-term" | "medium-term" | "long-term" }
  ],
  "applicationAdvice": string
}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

CANDIDATE PROFILE:
Name: ${profile.basic?.fullName || 'N/A'}
Current Title: ${profile.basic?.title || 'N/A'}
Industry: ${profile.basic?.industry || 'N/A'}
Experience Summary: ${profile.basic?.experienceSummary || 'N/A'}

Skills: ${JSON.stringify(profile.skills || [])}

Employment History: ${JSON.stringify(profile.employment || [])}

Education: ${JSON.stringify(profile.education || [])}
`;

    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are an expert career advisor and ATS analyst. Provide detailed, actionable analysis." },
            { role: "user", content: prompt },
          ],
        },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'requirements_match_analysis' },
        estimateCost: 0.002
      }
    );

    let raw = {};
    try {
      raw = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error("❌ BAD AI JSON for requirements:", data.choices[0].message.content);
      throw new Error("Invalid AI JSON");
    }

    return raw;
  }

  /* ==========================================================
     4. POST /api/match/analyze
     ========================================================== */
  router.post("/analyze", async (req, res) => {
    let { userId, jobId, weights } = req.body;

    // 🔥 Force correct numeric conversion — GUARANTEED FIX
    userId = Number(userId);
    jobId = Number(jobId);
    
    if (!userId || !jobId || isNaN(userId) || isNaN(jobId)) {
      console.error("BAD IDS:", { userId, jobId });
      return res.status(400).json({ success: false, message: "Invalid userId or jobId" });
    }

    const w = {
      skillsWeight: weights?.skillsWeight ?? 50,
      experienceWeight: weights?.experienceWeight ?? 30,
      educationWeight: weights?.educationWeight ?? 20,
    };

    try {
      const [job, profile] = await Promise.all([
        getJobObject(jobId),
        getUserProfileObject(userId),
      ]);

      if (!job)
        return res.status(404).json({ success: false, message: "Job not found" });

      // Handle case where profile might be empty or queries failed
      if (!profile) {
        return res.status(400).json({ success: false, message: "User profile not found" });
      }

      const ai = await analyzeMatch(job, profile, w, userId);

      const analysis = {
        jobId,
        jobTitle: job.title,
        company: job.company,
        userId: userId,
        matchScore: ai.matchScore,
        breakdown: {
          skills: ai.skillsScore,
          experience: ai.experienceScore,
          education: ai.educationScore,
        },
        strengths: ai.strengths,
        gaps: ai.gaps,
        improvements: ai.improvements,
        weights: w,
        createdAt: new Date().toISOString(),
      };

      // Save history safely (prevent "null" string errors)
      await pool.query(
        `INSERT INTO match_history
         (user_id, job_id, match_score, skills_score, experience_score, education_score,
          strengths, gaps, improvements, weights, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          userId,
          jobId,
      
          // 🔥 Convert EVERYTHING to numbers safely (even "null")
          Number(analysis.matchScore) || 0,
          Number(analysis.breakdown?.skills) || 0,
          Number(analysis.breakdown?.experience) || 0,
          Number(analysis.breakdown?.education) || 0,
      
          // 🔥 Store JSON, NOT raw strings
          JSON.stringify(analysis.strengths || []),
          JSON.stringify(analysis.gaps || []),
          JSON.stringify(analysis.improvements || []),
      
          JSON.stringify(w),          // weights
          JSON.stringify(analysis),   // details
        ]
      );

      res.json({ success: true, analysis });
    } catch (err) {
      console.error("❌ MATCH ERROR:", err);
      // Provide more specific error messages
      const errorMessage = err.message || "Match error";
      res.status(500).json({ success: false, message: errorMessage, error: errorMessage });
    }
  });

  /* ==========================================================
     4b. POST /api/match/requirements-analysis (UC-123)
     ========================================================== */
  router.post("/requirements-analysis", async (req, res) => {
    let { userId, jobId } = req.body;

    userId = Number(userId);
    jobId = Number(jobId);

    if (!userId || !jobId || isNaN(userId) || isNaN(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid userId or jobId" });
    }

    try {
      const [job, profile] = await Promise.all([
        getJobObject(jobId),
        getUserProfileObject(userId),
      ]);

      if (!job)
        return res.status(404).json({ success: false, message: "Job not found" });

      const analysis = await analyzeRequirementsMatch(job, profile, userId);

      res.json({
        success: true,
        analysis: {
          jobId,
          jobTitle: job.title,
          company: job.company,
          ...analysis
        }
      });
    } catch (err) {
      console.error("❌ REQUIREMENTS MATCH ERROR:", err);
      res.status(500).json({ success: false, message: "Requirements analysis error" });
    }
  });

  /* ==========================================================
     4c. GET /api/match/rank-jobs/:userId (UC-123)
     Get all jobs ranked by match score
     ========================================================== */
  router.get("/rank-jobs/:userId", async (req, res) => {
    const userId = Number(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    try {
      // Get all jobs for the user with their latest match scores
      const { rows } = await pool.query(
        `
        SELECT 
          j.id as job_id,
          j.title,
          j.company,
          j.location,
          j.status,
          j.deadline,
          COALESCE(mh.match_score, 0) as match_score,
          mh.skills_score,
          mh.experience_score,
          mh.education_score,
          mh.created_at as last_analyzed
        FROM jobs j
        LEFT JOIN LATERAL (
          SELECT * FROM match_history 
          WHERE job_id = j.id AND user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        ) mh ON true
        WHERE j.user_id = $1
        ORDER BY COALESCE(mh.match_score, 0) DESC, j.created_at DESC
        `,
        [userId]
      );

      // Separate analyzed and unanalyzed jobs
      const analyzedJobs = rows.filter(j => j.last_analyzed);
      const unanalyzedJobs = rows.filter(j => !j.last_analyzed);

      res.json({
        success: true,
        rankedJobs: analyzedJobs,
        unanalyzedJobs,
        totalJobs: rows.length,
        analyzedCount: analyzedJobs.length
      });
    } catch (err) {
      console.error("❌ RANK JOBS ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to rank jobs" });
    }
  });

  /* ==========================================================
     5. HISTORY (Optional)
     ========================================================== */
  router.get("/history/:userId", async (req, res) => {
    // Note: This endpoint doesn't require auth as it's used for public history viewing
    // If you want to add auth, uncomment below:
    // const header = req.headers.authorization;
    // if (!header) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { rows } = await pool.query(
        `
        SELECT DISTINCT ON (mh.job_id)
          mh.id,
          mh.job_id,
          j.title,
          j.company,
          mh.match_score,
          mh.skills_score,
          mh.experience_score,
          mh.education_score,
          mh.created_at
        FROM match_history mh
        JOIN jobs j ON j.id = mh.job_id
        WHERE mh.user_id = $1
        ORDER BY mh.job_id, mh.created_at DESC;
        `,
        [req.params.userId]
      );
  
      res.json({ success: true, history: rows });
    } catch (err) {
      console.error("❌ HISTORY ERROR:", err);
      res.status(500).json({ success: false });
    }
  });

  return router;
}

// Export default router (production use - maintains backward compatibility)
const router = createMatchRoutes();
export default router;

// Export factory function for testing
export { createMatchRoutes };