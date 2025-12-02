import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";

dotenv.config();

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Get all cover letters for a user (including global templates)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's saved cover letters
    // Try with 'title' first, fall back to 'name' if that column doesn't exist
    let userLettersQuery = { rows: [] };
    try {
      userLettersQuery = await pool.query(
        `
        SELECT 
          id, 
          title,
          format, 
          file_url, 
          created_at, 
          COALESCE(updated_at, created_at) AS updated_at, 
          'user' AS source
        FROM cover_letters
        WHERE user_id = $1
        ORDER BY COALESCE(updated_at, created_at) DESC;
        `,
        [userId]
      );
    } catch (titleErr) {
      // If 'title' column doesn't exist, try with 'name'
      if (titleErr.code === '42703') { // Column does not exist error
        try {
          userLettersQuery = await pool.query(
            `
            SELECT 
              id, 
              name AS title,
              format, 
              file_url, 
              created_at, 
              COALESCE(updated_at, created_at) AS updated_at, 
              'user' AS source
            FROM cover_letters
            WHERE user_id = $1
            ORDER BY COALESCE(updated_at, created_at) DESC;
            `,
            [userId]
          );
        } catch (nameErr) {
          console.warn("cover_letters table query failed with both 'title' and 'name':", nameErr.message);
          userLettersQuery = { rows: [] };
        }
      } else {
        throw titleErr; // Re-throw if it's a different error
      }
    }

    // Get global templates (cover_letter_templates)
    let templatesQuery = { rows: [] };
    try {
      templatesQuery = await pool.query(
        `
        SELECT 
          id,
          name AS title,
          'pdf' AS format,
          NULL AS file_url,
          created_at,
          COALESCE(updated_at, created_at) AS updated_at,
          'template' AS source,
          COALESCE(is_custom, false) AS is_custom
        FROM cover_letter_templates
        WHERE is_custom = false OR is_custom IS NULL
        ORDER BY COALESCE(updated_at, created_at) DESC;
        `
      );
    } catch (templateErr) {
      console.warn("cover_letter_templates table not found, skipping templates:", templateErr.message);
      console.error("Template query error details:", templateErr);
    }
    
    console.log(`✅ Found ${userLettersQuery.rows.length} user cover letters`);
    console.log(`✅ Found ${templatesQuery.rows.length} global templates`);

    // Combine user letters and templates
    // User letters keep their original numeric IDs, templates get prefixed
    const allCoverLetters = [
      ...userLettersQuery.rows.map(row => ({
        ...row,
        isTemplate: false
      })),
      ...templatesQuery.rows.map(row => ({
        ...row,
        id: `template_${row.id}`, // Prefix to avoid ID conflicts with user letters
        isTemplate: true
      }))
    ];

    res.json({ 
      cover_letters: allCoverLetters,
      user_letters: userLettersQuery.rows,
      templates: templatesQuery.rows
    });
  } catch (err) {
    // Handle case where table doesn't exist yet
    if (err.code === '42P01' || err.message.includes('does not exist')) {
      console.warn("⚠️ Cover letters table does not exist yet");
      return res.json({ cover_letters: [] });
    }
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
    // Handle case where table doesn't exist yet
    if (err.code === '42P01' || err.message.includes('does not exist')) {
      console.warn("⚠️ Cover letters table does not exist yet - run database migration");
      return res.status(503).json({ error: "Cover letters feature not available - database migration required" });
    }
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
    // Handle case where table doesn't exist yet
    if (err.code === '42P01' || err.message.includes('does not exist')) {
      console.warn("⚠️ Cover letters table does not exist yet");
      return res.status(503).json({ error: "Cover letters feature not available - database migration required" });
    }
    console.error("❌ Delete cover letter error:", err);
    res.status(500).json({ error: "Failed to delete cover letter" });
  }
});

export default router;
