import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import sharedPool from "../db/pool.js";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
// Use shared pool in test mode for transaction isolation
const pool =
  process.env.NODE_ENV === "test"
    ? sharedPool
    : new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- AUTH ----------
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

// ---------- ADD SKILL ----------
router.post("/", auth, async (req, res) => {
  const { name, category, proficiency } = req.body;
  if (!name) return res.status(400).json({ error: "Skill name required" });

  try {
    const dup = await pool.query(
      "SELECT id FROM skills WHERE user_id=$1 AND LOWER(name)=LOWER($2)",
      [req.userId, name]
    );
    if (dup.rows.length)
      return res.status(409).json({ error: "Duplicate skill" });

    const { rows } = await pool.query(
      `INSERT INTO skills (user_id, name, category, proficiency)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [req.userId, name, category, proficiency]
    );
    res.json({ message: "Skill added", skill: rows[0] });
  } catch (e) {
    console.error("Add skill error:", e);
    res.status(500).json({ error: "DB error" });
  }
});

// ---------- GET SKILLS ----------
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM skills WHERE user_id=$1 ORDER BY category, name",
      [req.userId]
    );
    res.json({ skills: rows });
  } catch (e) {
    console.error("Get skills error:", e);
    res.status(500).json({ error: "Failed to load skills" });
  }
});

// ---------- UPDATE SKILL ----------
router.put("/:id", auth, async (req, res) => {
  const { category, proficiency } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE skills
       SET category=COALESCE($1, category),
           proficiency=COALESCE($2, proficiency)
       WHERE id=$3 AND user_id=$4
       RETURNING *`,
      [category, proficiency, req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Skill updated", skill: rows[0] });
  } catch (e) {
    console.error("Update skill error:", e);
    res.status(500).json({ error: "Update failed" });
  }
});

// ---------- DELETE SKILL ----------
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM skills WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Skill not found" });
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error("Delete skill error:", e);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
