import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharedPool from "../db/pool.js";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
// Use shared pool in test mode for transaction isolation
const pool = process.env.NODE_ENV === 'test' ? sharedPool : new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

/* AUTH MIDDLEWARE — same as other routes */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* Fix __dirname for ES modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Load learning resources JSON */
const resourcesPath = path.join(__dirname, "../data/learning_resources.json");
let learningResources = {};
try {
  learningResources = JSON.parse(fs.readFileSync(resourcesPath, "utf8"));
} catch {
  learningResources = {};
}

/* ===============================
   GET SKILL GAP FOR A JOB
   /api/skills-gap/:jobId
================================ */
router.get("/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.userId;

  try {
    /** 1️⃣ Load user skills */
    const userSkillQ = await pool.query(
      `SELECT name, proficiency
       FROM skills
       WHERE user_id = $1`,
      [userId]
    );

    // Map proficiency strings to numeric levels
    const proficiencyMap = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3,
      'Expert': 4
    };

    const userSkills = userSkillQ.rows.map((s) => ({
      // ⭐ normalize: lowercase + trim
      name: s.name.toLowerCase().trim(),
      level: proficiencyMap[s.proficiency] || 0,
    }));

    /** 2️⃣ Load job required skills */
    const jobQ = await pool.query(
      "SELECT required_skills FROM jobs WHERE id=$1 AND user_id=$2",
      [jobId, userId]
    );

    if (!jobQ.rows.length)
      return res.status(404).json({ error: "Job not found" });

    // ⭐ normalize required skills as well
    const requiredSkillsRaw = jobQ.rows[0].required_skills || [];
    const requiredSkills = requiredSkillsRaw.map((s) =>
      (s || "").toLowerCase().trim()
    );

    let matched = [];
    let weak = [];
    let missing = [];
    let priorityList = [];

    /* PRIORITY WEIGHTING RULES (UC-066)
       --------------------------------------------------
       Level difference:    0–3 points
       Skill importance:    0–2 points (later from job data)
       Industry relevance:  0–2 points
       --------------------------------------------------
       Total = 0–7 → normalized to 1–5
    */
    function calculatePriority(skill, userLevel) {
      let score = 0;

      // 1️⃣ Level Gap (max 3)
      if (userLevel === null) score += 3;
      else score += Math.max(0, 3 - userLevel);

      // 2️⃣ Industry Relevance (max 2)
      const highDemandSkills = ["python", "javascript", "sql", "react", "aws"];
      if (highDemandSkills.includes(skill.toLowerCase())) score += 2;

      // 3️⃣ Estimated importance (max 2)
      // TEMP: assume all job-required skills have at least importance 1
      score += 1;

      // Normalize 0–7 → priority 1–5
      const priority = Math.min(5, Math.ceil((score / 7) * 5));
      return priority;
    }

    /* Compare Skills + Build Priority List */
    requiredSkills.forEach((skill) => {
      const sLower = skill.toLowerCase(); // already lower, but safe
      const userHas = userSkills.find((u) => u.name === sLower);

      if (!userHas) {
        missing.push(skill);

        priorityList.push({
          skill,
          status: "missing",
          currentLevel: 0,
          priority: calculatePriority(skill, null),
        });
      } else if (userHas.level < 3) {
        weak.push({ skill, level: userHas.level });

        priorityList.push({
          skill,
          status: "weak",
          currentLevel: userHas.level,
          priority: calculatePriority(skill, userHas.level),
        });
      } else {
        matched.push({ skill, level: userHas.level });

        priorityList.push({
          skill,
          status: "matched",
          currentLevel: userHas.level,
          priority: 1, // very low priority
        });
      }
    });

    /* Sort skill priorities from most important → least important */
    priorityList.sort((a, b) => b.priority - a.priority);

    /** 4️⃣ Attach learning resources */
    function getRes(skill) {
      const key = skill.toLowerCase().trim(); // ⭐ normalize lookup key

      if (learningResources[key]) return learningResources[key];

      if (learningResources["default"]) {
        return learningResources["default"].map((r) => ({
          ...r,
          url: r.url.replace("SKILL_NAME", key),
        }));
      }

      return [];
    }

    let resourceMap = {};
    requiredSkills.forEach((skill) => {
      resourceMap[skill] = getRes(skill);
    });

    /** 5️⃣ Final response */
    res.json({
      jobId: Number(jobId),
      userId: Number(userId),
      matchedSkills: matched,
      weakSkills: weak,
      missingSkills: missing,
      learningResources: resourceMap,
      priorityList: priorityList, // ⭐ REQUIRED FOR FRONTEND
    });
  } catch (err) {
    console.error("Skills Gap Error:", err);
    res.status(500).json({ error: "Skills gap calculation failed" });
  }
});

export default router;
