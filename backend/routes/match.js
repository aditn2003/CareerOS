// backend/routes/match.js
import express from "express";
import axios from "axios";
import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = express.Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
async function analyzeMatch(job, profile, weights) {
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

  const { data } = await axios.post(
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
    

  if (!userId || !jobId)
    return res.status(400).json({ success: false, message: "Missing IDs" });

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

    const ai = await analyzeMatch(job, profile, w);

    const analysis = {
      jobId,
      jobTitle: job.title,
      company: job.company,
      userId,
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

    // Save history
    // Save history
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
    res.status(500).json({ success: false, message: "Match error" });
    console.log("RECEIVED IDS:", userId, jobId);
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
  

export default router;
