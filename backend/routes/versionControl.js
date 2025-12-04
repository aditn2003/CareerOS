// backend/routes/versionControl.js
// Version control routes for resumes and cover letters

import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";

dotenv.config();

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get version history for a resume
router.get("/resumes/:resumeId/versions", auth, async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user.id;

    // Verify the resume belongs to the user
    const resumeCheck = await pool.query(
      "SELECT id FROM resumes WHERE id = $1 AND user_id = $2",
      [resumeId, userId]
    );

    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Get all versions
    const result = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        sections,
        format,
        file_url,
        change_summary,
        created_at
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2
      ORDER BY version_number DESC`,
      [resumeId, userId]
    );

    res.json({ versions: result.rows });
  } catch (err) {
    console.error("❌ Error fetching resume versions:", err);
    res.status(500).json({ error: "Failed to fetch version history" });
  }
});

// Get version history for a cover letter
router.get("/cover-letters/:coverLetterId/versions", auth, async (req, res) => {
  try {
    const { coverLetterId } = req.params;
    const userId = req.user.id;

    // Verify the cover letter belongs to the user
    const coverLetterCheck = await pool.query(
      "SELECT id FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2",
      [coverLetterId, userId]
    );

    if (coverLetterCheck.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter not found" });
    }

    // Get all versions
    const result = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        content,
        format,
        file_url,
        change_summary,
        created_at
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2
      ORDER BY version_number DESC`,
      [coverLetterId, userId]
    );

    res.json({ versions: result.rows });
  } catch (err) {
    console.error("❌ Error fetching cover letter versions:", err);
    res.status(500).json({ error: "Failed to fetch version history" });
  }
});

// Get a specific version of a resume
router.get("/resumes/:resumeId/versions/:versionNumber", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        sections,
        format,
        file_url,
        change_summary,
        created_at
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json({ version: result.rows[0] });
  } catch (err) {
    console.error("❌ Error fetching resume version:", err);
    res.status(500).json({ error: "Failed to fetch version" });
  }
});

// Get a specific version of a cover letter
router.get("/cover-letters/:coverLetterId/versions/:versionNumber", auth, async (req, res) => {
  try {
    const { coverLetterId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        content,
        format,
        file_url,
        change_summary,
        created_at
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2 AND version_number = $3`,
      [coverLetterId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json({ version: result.rows[0] });
  } catch (err) {
    console.error("❌ Error fetching cover letter version:", err);
    res.status(500).json({ error: "Failed to fetch version" });
  }
});

// View a specific version (serves the file)
router.get("/resumes/:resumeId/versions/:versionNumber/view", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT file_url, format, title
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = result.rows[0];
    
    // For demo: serve hardcoded PDFs
    // In production, serve from file_url
    const path = (await import("path")).default;
    const fs = (await import("fs")).default;
    const { fileURLToPath } = await import("url");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Demo PDFs for resumes (version 1, 2, 3)
    const demoPdfPath = path.join(__dirname, "..", "demo-versions", "resumes", `resume-${resumeId}-v${versionNumber}.pdf`);
    
    if (fs.existsSync(demoPdfPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${version.title || 'resume'}-v${versionNumber}.pdf"`);
      return res.sendFile(demoPdfPath);
    }
    
    // Fallback: if no demo file, return 404
    res.status(404).json({ error: "Version file not found" });
  } catch (err) {
    console.error("❌ Error viewing resume version:", err);
    res.status(500).json({ error: "Failed to view version" });
  }
});

router.get("/cover-letters/:coverLetterId/versions/:versionNumber/view", auth, async (req, res) => {
  try {
    const { coverLetterId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT file_url, format, title
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2 AND version_number = $3`,
      [coverLetterId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = result.rows[0];
    
    // For demo: serve hardcoded PDFs
    const path = (await import("path")).default;
    const fs = (await import("fs")).default;
    const { fileURLToPath } = await import("url");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Demo PDFs for cover letters (version 1, 2, 3)
    const demoPdfPath = path.join(__dirname, "..", "demo-versions", "cover-letters", `cover-letter-${coverLetterId}-v${versionNumber}.pdf`);
    
    if (fs.existsSync(demoPdfPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${version.title || 'cover-letter'}-v${versionNumber}.pdf"`);
      return res.sendFile(demoPdfPath);
    }
    
    // Fallback: if no demo file, return 404
    res.status(404).json({ error: "Version file not found" });
  } catch (err) {
    console.error("❌ Error viewing cover letter version:", err);
    res.status(500).json({ error: "Failed to view version" });
  }
});

// Restore a version (make it the current version)
router.post("/resumes/:resumeId/versions/:versionNumber/restore", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    // Get the version data
    const versionResult = await pool.query(
      `SELECT sections, format, file_url, title
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = versionResult.rows[0];

    // Update the current resume with version data
    await pool.query(
      `UPDATE resumes
      SET sections = $1, format = $2, file_url = $3, updated_at = NOW()
      WHERE id = $4 AND user_id = $5`,
      [version.sections, version.format, version.file_url, resumeId, userId]
    );

    res.json({ message: "Version restored successfully" });
  } catch (err) {
    console.error("❌ Error restoring resume version:", err);
    res.status(500).json({ error: "Failed to restore version" });
  }
});

router.post("/cover-letters/:coverLetterId/versions/:versionNumber/restore", auth, async (req, res) => {
  try {
    const { coverLetterId, versionNumber } = req.params;
    const userId = req.user.id;

    // Get the version data
    const versionResult = await pool.query(
      `SELECT content, format, file_url, title
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2 AND version_number = $3`,
      [coverLetterId, userId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = versionResult.rows[0];

    // Update the current cover letter with version data
    await pool.query(
      `UPDATE uploaded_cover_letters
      SET content = $1, format = $2, file_url = $3, updated_at = NOW()
      WHERE id = $4 AND user_id = $5`,
      [version.content, version.format, version.file_url, coverLetterId, userId]
    );

    res.json({ message: "Version restored successfully" });
  } catch (err) {
    console.error("❌ Error restoring cover letter version:", err);
    res.status(500).json({ error: "Failed to restore version" });
  }
});

export default router;

