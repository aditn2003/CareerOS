import express from "express";
import pool from "../db/pool.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

/* AUTH */
function auth(req, res, next) {
    const header = req.headers.authorization;
  
    if (!header) {
      return res.status(401).json({ error: "No token" });
    }
  
    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      req.user = { id: decoded.id, email: decoded.email }; // Also set req.user for consistency
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }
  

/* =========================================
   GET all progress for the logged-in user
   GET /api/skill-progress
========================================= */
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, status, updated_at
       FROM skill_progress
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.userId]
    );
    res.json({ progress: rows });
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ error: "Failed to load progress" });
  }
});

/* =========================================
   UPDATE or INSERT progress for a skill
   PUT /api/skill-progress/:skill
========================================= */
router.put("/:skill", auth, async (req, res) => {
  let { skill } = req.params;
  const { status } = req.body;

  // Normalize skill name to lowercase
  skill = skill.trim().toLowerCase();

  if (!["not started", "in progress", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    // First try to update existing entry
    const updateResult = await pool.query(
      `UPDATE skill_progress
       SET status = $1, updated_at = NOW()
       WHERE user_id = $2 AND skill = $3
       RETURNING *`,
      [status, req.userId, skill]
    );

    if (updateResult.rows.length > 0) {
      return res.json({ message: "Progress updated", entry: updateResult.rows[0] });
    }

    // If no update, insert new entry
    const insertResult = await pool.query(
      `INSERT INTO skill_progress (user_id, skill, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, skill, status]
    );

    res.json({ message: "Progress updated", entry: insertResult.rows[0] });
  } catch (err) {
    console.error("Progress update error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

export default router;
