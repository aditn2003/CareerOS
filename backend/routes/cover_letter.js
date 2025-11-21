import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";

dotenv.config();

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Get all cover letters for a user
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `
      SELECT id, title, format, file_url, created_at, updated_at
      FROM cover_letters
      WHERE user_id = $1
      ORDER BY updated_at DESC;
      `,
      [userId]
    );
    res.json({ cover_letters: rows });
  } catch (err) {
    console.error("❌ Fetch cover letters error:", err);
    res.status(500).json({ error: "Failed to load cover letters" });
  }
});

// ✅ Save or update a cover letter
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, format = "pdf", content, file_url } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const { rows } = await pool.query(
      `
      INSERT INTO cover_letters (user_id, title, format, content, file_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, format, created_at;
      `,
      [userId, title, format, content || "", file_url || null]
    );

    res.json({ message: "✅ Cover letter saved", cover_letter: rows[0] });
  } catch (err) {
    console.error("❌ Save cover letter error:", err);
    res.status(500).json({ error: "Failed to save cover letter" });
  }
});

// ✅ Delete a cover letter
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(
      "DELETE FROM cover_letters WHERE id = $1 AND user_id = $2",
      [req.params.id, userId]
    );
    res.json({ message: "🗑️ Cover letter deleted" });
  } catch (err) {
    console.error("❌ Delete cover letter error:", err);
    res.status(500).json({ error: "Failed to delete cover letter" });
  }
});

export default router;
