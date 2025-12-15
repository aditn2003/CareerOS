import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
import sharedPool from "../db/pool.js"; // Import shared pool for test mode

const pool = process.env.NODE_ENV === 'test' ? sharedPool : new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ============================================================
// ✅ UC-023: ADD EMPLOYMENT ENTRY
// ============================================================
router.post("/employment", auth, async (req, res) => {
  const {
    title,
    company,
    location,
    start_date,
    end_date,
    current,
    description,
  } = req.body;

  if (!title || !company || !start_date) {
    return res.status(400).json({
      error: "Title, company, and start date are required fields.",
    });
  }

  if (!current && end_date && new Date(end_date) < new Date(start_date)) {
    return res
      .status(400)
      .json({ error: "End date must be after start date." });
  }

  try {
    const query = `
      INSERT INTO employment (
        user_id, title, company, location, start_date, end_date, current, description
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const values = [
      req.userId,
      title,
      company,
      location,
      start_date,
      end_date || null,
      current || false,
      description || "",
    ];

    const result = await pool.query(query, values);
    res.json({
      message: "Employment entry added successfully",
      employment: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Employment insert error:", err);
    res.status(500).json({ error: "Database error while adding employment" });
  }
});

// ============================================================
// ✅ UC-024: VIEW ALL EMPLOYMENT ENTRIES (REVERSE CHRONOLOGICAL)
// ============================================================
router.get("/employment", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM employment
      WHERE user_id = $1
      ORDER BY start_date DESC;
    `,
      [req.userId]
    );
    res.json({ employment: result.rows });
  } catch (err) {
    console.error("❌ Employment fetch error:", err);
    res.status(500).json({ error: "Database error while fetching employment" });
  }
});

// ============================================================
// ✅ UC-024 (CONT.): EDIT / UPDATE EMPLOYMENT ENTRY
// ============================================================
router.put("/employment/:id", auth, async (req, res) => {
  const {
    title,
    company,
    location,
    start_date,
    end_date,
    current,
    description,
  } = req.body;

  if (!title || !company || !start_date) {
    return res
      .status(400)
      .json({ error: "Title, company, and start date are required." });
  }

  try {
    const result = await pool.query(
      `
      UPDATE employment
      SET title=$1, company=$2, location=$3, start_date=$4, end_date=$5,
          current=$6, description=$7
      WHERE id=$8 AND user_id=$9
      RETURNING *;
    `,
      [
        title,
        company,
        location,
        start_date,
        end_date || null,
        current || false,
        description || "",
        req.params.id,
        req.userId,
      ]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Employment not found" });

    res.json({
      message: "Employment updated successfully",
      employment: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Employment update error:", err);
    res.status(500).json({ error: "Database error while updating employment" });
  }
});

// ============================================================
// ✅ UC-025: DELETE EMPLOYMENT ENTRY
// ============================================================
router.delete("/employment/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM employment
      WHERE id=$1 AND user_id=$2
      RETURNING id;
    `,
      [req.params.id, req.userId]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Employment not found" });

    res.json({ message: "Employment entry deleted successfully" });
  } catch (err) {
    console.error("❌ Employment delete error:", err);
    res.status(500).json({ error: "Database error while deleting employment" });
  }
});

export default router;

