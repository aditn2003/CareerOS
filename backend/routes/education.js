import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
import sharedPool from "../db/pool.js"; // Import shared pool for test mode

const pool = process.env.NODE_ENV === 'test' ? sharedPool : new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

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

// ---------- ADD EDUCATION ----------
router.post("/education", auth, async (req, res) => {
  const {
    institution,
    degree_type,
    field_of_study,
    graduation_date,
    currently_enrolled,
    education_level,
    gpa,
    gpa_private,
    honors,
  } = req.body;

  if (!institution || !degree_type || !field_of_study)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO education (
        user_id, institution, degree_type, field_of_study, graduation_date,
        currently_enrolled, education_level, gpa, gpa_private, honors
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        req.userId,
        institution,
        degree_type,
        field_of_study,
        graduation_date || null,
        currently_enrolled || false,
        education_level || "",
        gpa || null,
        gpa_private || false,
        honors || "",
      ]
    );
    res.json({ message: "Education added successfully", education: rows[0] });
  } catch (err) {
    console.error("Add education error:", err);
    res.status(500).json({ error: "Database error while adding education" });
  }
});

// ---------- VIEW EDUCATION ----------
router.get("/education", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM education WHERE user_id=$1 ORDER BY graduation_date DESC NULLS LAST`,
      [req.userId]
    );
    res.json({ education: rows });
  } catch (err) {
    console.error("Fetch education error:", err);
    res.status(500).json({ error: "Database error while fetching education" });
  }
});

// ---------- UPDATE EDUCATION ----------
router.put("/education/:id", auth, async (req, res) => {
  const {
    institution,
    degree_type,
    field_of_study,
    graduation_date,
    currently_enrolled,
    education_level,
    gpa,
    gpa_private,
    honors,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE education
       SET institution=$1, degree_type=$2, field_of_study=$3,
           graduation_date=$4, currently_enrolled=$5,
           education_level=$6, gpa=$7, gpa_private=$8, honors=$9
       WHERE id=$10 AND user_id=$11
       RETURNING *`,
      [
        institution,
        degree_type,
        field_of_study,
        graduation_date || null,
        currently_enrolled || false,
        education_level || "",
        gpa || null,
        gpa_private || false,
        honors || "",
        req.params.id,
        req.userId,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: "Education not found" });
    res.json({ message: "Education updated successfully", education: rows[0] });
  } catch (err) {
    console.error("Update education error:", err);
    res.status(500).json({ error: "Database error while updating education" });
  }
});

// ---------- DELETE EDUCATION ----------
router.delete("/education/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM education WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Education not found" });
    res.json({ message: "Education deleted successfully" });
  } catch (err) {
    console.error("Delete education error:", err);
    res.status(500).json({ error: "Database error while deleting education" });
  }
});

export default router;
