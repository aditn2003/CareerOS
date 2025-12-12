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

    // Get all versions from resume_versions table (old system + metadata)
    const includeArchived = req.query.includeArchived === 'true';
    const whereClause = includeArchived 
      ? 'WHERE rv.resume_id = $1 AND rv.user_id = $2'
      : 'WHERE rv.resume_id = $1 AND rv.user_id = $2 AND (rv.is_archived IS NULL OR rv.is_archived = FALSE)';
    
    const resumeVersionsResult = await pool.query(
      `SELECT 
        rv.id,
        rv.version_number,
        rv.title,
        rv.description,
        rv.sections,
        rv.format,
        rv.file_url,
        rv.change_summary,
        rv.job_id,
        rv.is_default,
        rv.is_archived,
        rv.parent_version_number,
        rv.tags,
        rv.created_at,
        j.title AS job_title,
        j.company AS job_company
      FROM resume_versions rv
      LEFT JOIN jobs j ON rv.job_id = j.id AND j.user_id = rv.user_id
      ${whereClause}
      ORDER BY rv.version_number ASC`,
      [resumeId, userId]
    );

    // Get all versions from resumes table (new system - full resume records)
    // Also check job_materials to get job_id, then join with jobs for job details
    const versionResumesResult = await pool.query(
      `SELECT 
        r.id,
        r.version_number,
        r.title,
        r.sections,
        r.format,
        r.file_url,
        r.template_id,
        r.template_name,
        r.is_default,
        r.created_at,
        jm.job_id,
        j.title AS job_title,
        j.company AS job_company
      FROM resumes r
      LEFT JOIN job_materials jm ON r.id = jm.resume_id AND jm.user_id = r.user_id
      LEFT JOIN jobs j ON jm.job_id = j.id AND j.user_id = r.user_id
      WHERE r.original_resume_id = $1 AND r.user_id = $2 AND r.is_version = TRUE
      ORDER BY r.version_number ASC`,
      [resumeId, userId]
    );

    // Merge versions from both tables
    // Create a map of version_number -> version data
    const versionsMap = new Map();

    // First, add all versions from resume_versions table
    resumeVersionsResult.rows.forEach(version => {
      versionsMap.set(version.version_number, {
        id: version.id,
        version_number: version.version_number,
        title: version.title,
        description: version.description,
        sections: version.sections,
        format: version.format,
        file_url: version.file_url,
        change_summary: version.change_summary,
        job_id: version.job_id,
        job_title: version.job_title,
        job_company: version.job_company,
        is_default: version.is_default,
        is_archived: version.is_archived,
        parent_version_number: version.parent_version_number,
        tags: version.tags,
        created_at: version.created_at
      });
    });

    // Then, merge/update with data from resumes table (prefer resume data for sections, format, file_url)
    versionResumesResult.rows.forEach(resume => {
      const existingVersion = versionsMap.get(resume.version_number);
      if (existingVersion) {
        // Update existing version with resume data
        existingVersion.sections = resume.sections;
        existingVersion.format = resume.format;
        existingVersion.file_url = resume.file_url;
        existingVersion.title = resume.title || existingVersion.title;
        existingVersion.is_default = resume.is_default || existingVersion.is_default;
        existingVersion.created_at = resume.created_at || existingVersion.created_at;
        // Update job info if available from job_materials
        if (resume.job_id) {
          existingVersion.job_id = resume.job_id;
          existingVersion.job_title = resume.job_title;
          existingVersion.job_company = resume.job_company;
        }
      } else {
        // Create new version entry from resume record
        versionsMap.set(resume.version_number, {
          id: resume.id,
          version_number: resume.version_number,
          title: resume.title,
          description: null,
          sections: resume.sections,
          format: resume.format,
          file_url: resume.file_url,
          change_summary: null,
          job_id: resume.job_id || null,
          job_title: resume.job_title || null,
          job_company: resume.job_company || null,
          is_default: resume.is_default,
          is_archived: false,
          parent_version_number: null,
          tags: null,
          created_at: resume.created_at
        });
      }
    });

    // Convert map to array and sort by version_number
    const allVersions = Array.from(versionsMap.values()).sort((a, b) => 
      (a.version_number || 0) - (b.version_number || 0)
    );

    console.log(`📋 [VERSIONS] Resume ${resumeId}: Found ${resumeVersionsResult.rows.length} versions in resume_versions, ${versionResumesResult.rows.length} versions in resumes table, ${allVersions.length} total merged versions`);
    console.log(`📋 [VERSIONS] Version numbers:`, allVersions.map(v => v.version_number));

    res.json({ versions: allVersions });
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
        description,
        sections,
        format,
        file_url,
        change_summary,
        job_id,
        is_default,
        is_archived,
        parent_version_number,
        tags,
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

    // First, check if this version exists as a resume record (new system)
    const resumeVersionResult = await pool.query(
      `SELECT id, file_url, format, title
      FROM resumes
      WHERE original_resume_id = $1 AND user_id = $2 AND version_number = $3 AND is_version = TRUE`,
      [resumeId, userId, versionNumber]
    );

    if (resumeVersionResult.rows.length > 0) {
      // Version exists as a resume record, serve it using the resume download logic
      const versionResume = resumeVersionResult.rows[0];
      
      // If file_url exists, serve it
      if (versionResume.file_url) {
        const path = (await import("path")).default;
        const fs = (await import("fs")).default;
        const { fileURLToPath } = await import("url");
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        const filePath = path.join(__dirname, "..", versionResume.file_url);
        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", versionResume.format === 'pdf' ? "application/pdf" : "application/octet-stream");
          res.setHeader("Content-Disposition", `inline; filename="${versionResume.title || 'resume'}-v${versionNumber}.${versionResume.format || 'pdf'}"`);
          return res.sendFile(filePath);
        }
      }
      
      // If no file, return the resume ID so frontend can use the download endpoint
      return res.json({ 
        resume_id: versionResume.id,
        redirect: `/api/resumes/${versionResume.id}/download?format=${versionResume.format || 'pdf'}`
      });
    }

    // Fallback: check resume_versions table (old system)
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
    
    // If file_url exists, serve it
    if (version.file_url) {
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;
      const { fileURLToPath } = await import("url");
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const filePath = path.join(__dirname, "..", version.file_url);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", version.format === 'pdf' ? "application/pdf" : "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${version.title || 'resume'}-v${versionNumber}.${version.format || 'pdf'}"`);
        return res.sendFile(filePath);
      }
    }
    
    // For demo: serve hardcoded PDFs
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

// Create a new cover letter version
router.post("/cover-letters/:coverLetterId/create", auth, async (req, res) => {
  try {
    const { coverLetterId } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      change_summary,
      content,
      format,
      file_url,
      job_id
    } = req.body;

    // Verify the cover letter belongs to the user
    const coverLetterCheck = await pool.query(
      "SELECT id, content, format, file_url, title FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2",
      [coverLetterId, userId]
    );

    if (coverLetterCheck.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter not found" });
    }

    const coverLetter = coverLetterCheck.rows[0];

    // Get the next version number
    const versionCountResult = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2`,
      [coverLetterId, userId]
    );
    const nextVersion = versionCountResult.rows[0].next_version;

    // Create version record
    const versionRecordResult = await pool.query(
      `INSERT INTO cover_letter_versions (
        cover_letter_id, user_id, version_number, title, content, 
        format, file_url, change_summary, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        coverLetterId,
        userId,
        nextVersion,
        title || `${coverLetter.title} - Version ${nextVersion}`,
        content || coverLetter.content,
        format || coverLetter.format || 'pdf',
        file_url || coverLetter.file_url,
        change_summary || null
      ]
    );

    res.json({ 
      version: versionRecordResult.rows[0]
    });
  } catch (err) {
    console.error("❌ Error creating cover letter version:", err);
    res.status(500).json({ error: "Failed to create version" });
  }
});

// Publish a cover letter version as a standalone cover letter
router.post("/cover-letters/:coverLetterId/versions/:versionNumber/publish", auth, async (req, res) => {
  try {
    const { coverLetterId, versionNumber } = req.params;
    const userId = req.user.id;

    // Get the original cover letter title
    const originalCoverLetterResult = await pool.query(
      `SELECT title FROM uploaded_cover_letters WHERE id = $1 AND user_id = $2`,
      [coverLetterId, userId]
    );

    if (originalCoverLetterResult.rows.length === 0) {
      return res.status(404).json({ error: "Original cover letter not found" });
    }

    const originalTitle = originalCoverLetterResult.rows[0].title;

    // Fetch version data
    const versionResult = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        content,
        format,
        file_url,
        created_at
      FROM cover_letter_versions
      WHERE cover_letter_id = $1 AND user_id = $2 AND version_number = $3`,
      [coverLetterId, userId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    const version = versionResult.rows[0];

    // Create a new standalone cover letter from this version
    const newCoverLetterResult = await pool.query(
      `INSERT INTO uploaded_cover_letters (
        user_id, title, content, format, file_url, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [
        userId,
        `${version.title} (Published from ${originalTitle} - Version ${versionNumber})`,
        version.content,
        version.format,
        version.file_url
      ]
    );

    const newCoverLetter = newCoverLetterResult.rows[0];

    // If there's a job_id in the request, link it
    if (req.body.job_id) {
      try {
        await pool.query(
          `INSERT INTO job_materials (job_id, user_id, cover_letter_id, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (job_id) 
           DO UPDATE SET cover_letter_id = $3, updated_at = NOW()`,
          [req.body.job_id, userId, newCoverLetter.id]
        );
      } catch (jobMatError) {
        console.warn("Could not link job to published cover letter:", jobMatError.message);
      }
    }

    res.json({ 
      cover_letter: newCoverLetter,
      message: "Version published successfully"
    });
  } catch (err) {
    console.error("❌ Error publishing cover letter version:", err);
    res.status(500).json({ error: "Failed to publish version" });
  }
});

// ============================================================
// NEW COMPREHENSIVE VERSION CONTROL ROUTES
// ============================================================

// Create a new version from an existing resume or version
router.post("/resumes/:resumeId/create", auth, async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      change_summary,
      job_id, 
      is_default, 
      tags,
      sections // Allow sections to be passed for editing
    } = req.body;
    
    // Use let for source_version_number since it may be reassigned
    let source_version_number = req.body.source_version_number;

    // Verify the resume belongs to the user
    const resumeCheck = await pool.query(
      "SELECT id, sections, format, file_url FROM resumes WHERE id = $1 AND user_id = $2",
      [resumeId, userId]
    );

    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resume = resumeCheck.rows[0];

    // Always get the master/default version, or use current resume
    let versionData = {
      sections: resume.sections,
      format: resume.format || 'pdf',
      file_url: resume.file_url
    };

    // Get the master/default version if it exists
    const masterVersion = await pool.query(
      `SELECT sections, format, file_url, version_number
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2 AND is_default = TRUE
      ORDER BY version_number DESC
      LIMIT 1`,
      [resumeId, userId]
    );

    if (masterVersion.rows.length > 0) {
      versionData = masterVersion.rows[0];
      // Use master version as parent if not specified
      if (!source_version_number) {
        source_version_number = masterVersion.rows[0].version_number;
      }
    } else if (source_version_number) {
      // If no master, but source specified, use that
      const sourceVersion = await pool.query(
        `SELECT sections, format, file_url
        FROM resume_versions
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, source_version_number]
      );

      if (sourceVersion.rows.length > 0) {
        versionData = sourceVersion.rows[0];
      }
    }
    
    // If sections are provided in request body, use those (for editing)
    if (req.body.sections) {
      versionData.sections = req.body.sections;
    }

    // Get the next version number for this resume
    const versionCountResult = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
      FROM resumes
      WHERE original_resume_id = $1 OR (id = $1 AND is_version = FALSE)`,
      [resumeId]
    );
    const nextVersion = versionCountResult.rows[0].next_version;

    // Create a new resume record for this version
    const newResumeResult = await pool.query(
      `INSERT INTO resumes (
        user_id, title, sections, format, file_url, template_id, template_name,
        original_resume_id, version_number, is_version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        userId,
        title || `${resume.title} - Version ${nextVersion}`,
        sections ? JSON.stringify(sections) : versionData.sections,
        versionData.format || 'pdf',
        versionData.file_url || null,
        resume.template_id || null,
        resume.template_name || null,
        resumeId, // Link back to original resume
        nextVersion,
        true // Mark as version
      ]
    );

    const newResume = newResumeResult.rows[0];

    // If job_id is provided, link this resume to the job
    if (job_id) {
      // Update or create job_materials entry
      await pool.query(
        `INSERT INTO job_materials (job_id, user_id, resume_id, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (job_id) 
         DO UPDATE SET resume_id = $3, updated_at = NOW()`,
        [job_id, userId, newResume.id]
      );
    }

    // Also create a version record for tracking (optional, for backward compatibility)
    const versionRecordResult = await pool.query(
      `INSERT INTO resume_versions (
        resume_id, user_id, version_number, title, description, 
        sections, format, file_url, change_summary, 
        job_id, is_default, parent_version_number, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        newResume.id, // Link to the new resume record
        userId, 
        nextVersion, 
        title || `Version ${nextVersion}`, 
        description || null,
        sections ? JSON.stringify(sections) : versionData.sections, 
        versionData.format,
        versionData.file_url, 
        change_summary || null,
        job_id || null,
        is_default || false,
        source_version_number || null,
        tags || null,
        userId
      ]
    );

    res.json({ 
      version: versionRecordResult.rows[0],
      resume: newResume // Return the new resume record
    });
  } catch (err) {
    console.error("❌ Error creating resume version:", err);
    res.status(500).json({ error: "Failed to create version" });
  }
});

// Update an existing version
router.put("/resumes/:resumeId/versions/:versionNumber/update", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;
    const { 
      title, 
      description, 
      change_summary, 
      job_id, 
      is_default, 
      tags,
      sections
    } = req.body;

    // Verify version exists
    const versionCheck = await pool.query(
      `SELECT id FROM resume_versions 
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await pool.query(
        `UPDATE resume_versions SET is_default = FALSE WHERE resume_id = $1 AND user_id = $2`,
        [resumeId, userId]
      );
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (change_summary !== undefined) {
      updates.push(`change_summary = $${paramCount++}`);
      values.push(change_summary);
    }
    if (sections !== undefined) {
      updates.push(`sections = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(sections));
    }
    if (job_id !== undefined) {
      updates.push(`job_id = $${paramCount++}`);
      values.push(job_id || null);
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramCount++}`);
      values.push(is_default);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(resumeId, userId, versionNumber);

    const updateResult = await pool.query(
      `UPDATE resume_versions 
      SET ${updates.join(', ')}
      WHERE resume_id = $${paramCount++} AND user_id = $${paramCount++} AND version_number = $${paramCount++}
      RETURNING *`,
      values
    );

    res.json({ version: updateResult.rows[0] });
  } catch (err) {
    console.error("❌ Error updating resume version:", err);
    res.status(500).json({ error: "Failed to update version" });
  }
});

// Compare two versions
router.get("/resumes/:resumeId/versions/:versionNumber1/compare/:versionNumber2", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber1, versionNumber2 } = req.params;
    const userId = req.user.id;

    const [version1, version2] = await Promise.all([
      pool.query(
        `SELECT * FROM resume_versions 
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, versionNumber1]
      ),
      pool.query(
        `SELECT * FROM resume_versions 
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, versionNumber2]
      )
    ]);

    if (version1.rows.length === 0 || version2.rows.length === 0) {
      return res.status(404).json({ error: "One or both versions not found" });
    }

    // Simple diff algorithm - compare sections
    const v1Sections = version1.rows[0].sections || {};
    const v2Sections = version2.rows[0].sections || {};

    const differences = {
      summary: JSON.stringify(v1Sections.summary) !== JSON.stringify(v2Sections.summary),
      experience: JSON.stringify(v1Sections.experience) !== JSON.stringify(v2Sections.experience),
      education: JSON.stringify(v1Sections.education) !== JSON.stringify(v2Sections.education),
      skills: JSON.stringify(v1Sections.skills) !== JSON.stringify(v2Sections.skills),
      projects: JSON.stringify(v1Sections.projects) !== JSON.stringify(v2Sections.projects),
    };

    res.json({
      version1: version1.rows[0],
      version2: version2.rows[0],
      differences
    });
  } catch (err) {
    console.error("❌ Error comparing versions:", err);
    res.status(500).json({ error: "Failed to compare versions" });
  }
});

// Merge two versions
router.post("/resumes/:resumeId/merge", auth, async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user.id;
    const { source_version_number, target_version_number, merge_strategy, title, description } = req.body;

    // Get both versions
    const [sourceVersion, targetVersion] = await Promise.all([
      pool.query(
        `SELECT * FROM resume_versions 
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, source_version_number]
      ),
      pool.query(
        `SELECT * FROM resume_versions 
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, target_version_number]
      )
    ]);

    if (sourceVersion.rows.length === 0 || targetVersion.rows.length === 0) {
      return res.status(404).json({ error: "One or both versions not found" });
    }

    const source = sourceVersion.rows[0];
    const target = targetVersion.rows[0];
    const sourceSections = source.sections || {};
    const targetSections = target.sections || {};

    // Merge strategy: 'source' (use source), 'target' (use target), 'smart' (merge intelligently)
    let mergedSections = { ...targetSections };

    if (merge_strategy === 'source') {
      mergedSections = sourceSections;
    } else if (merge_strategy === 'smart') {
      // Smart merge: prefer source for experience, keep target for other sections
      mergedSections = {
        ...targetSections,
        experience: sourceSections.experience || targetSections.experience,
        summary: sourceSections.summary || targetSections.summary,
      };
    }

    // Get next version number
    const versionResult = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
      FROM resume_versions WHERE resume_id = $1`,
      [resumeId]
    );
    const nextVersion = versionResult.rows[0].next_version;

    // Create merged version
    const insertResult = await pool.query(
      `INSERT INTO resume_versions (
        resume_id, user_id, version_number, title, description,
        sections, format, file_url, change_summary,
        parent_version_number, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        resumeId,
        userId,
        nextVersion,
        title || `Merged Version ${nextVersion}`,
        description || `Merged from version ${source_version_number} and ${target_version_number}`,
        mergedSections,
        target.format,
        target.file_url,
        `Merged versions ${source_version_number} and ${target_version_number}`,
        target_version_number,
        userId
      ]
    );

    res.json({ version: insertResult.rows[0] });
  } catch (err) {
    console.error("❌ Error merging versions:", err);
    res.status(500).json({ error: "Failed to merge versions" });
  }
});

// Set a version as default/master
router.put("/resumes/:resumeId/versions/:versionNumber/set-default", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    // Verify version exists - check both resumes table (new system) and resume_versions table (old system)
    const versionResumeCheck = await pool.query(
      `SELECT id FROM resumes 
      WHERE original_resume_id = $1 AND user_id = $2 AND version_number = $3 AND is_version = TRUE`,
      [resumeId, userId, versionNumber]
    );

    const versionCheck = await pool.query(
      `SELECT id FROM resume_versions 
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    // Version must exist in at least one table
    if (versionResumeCheck.rows.length === 0 && versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Unset all other defaults in resume_versions table
    await pool.query(
      `UPDATE resume_versions SET is_default = FALSE 
      WHERE resume_id = $1 AND user_id = $2`,
      [resumeId, userId]
    );

    // Set this version as default in resume_versions table
    await pool.query(
      `UPDATE resume_versions SET is_default = TRUE 
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    // Get the current original resume data BEFORE updating it
    const originalResumeResult = await pool.query(
      `SELECT id, sections, format, file_url, title, template_id, template_name, created_at
      FROM resumes
      WHERE id = $1 AND user_id = $2 AND (is_version = FALSE OR is_version IS NULL)`,
      [resumeId, userId]
    );

    if (originalResumeResult.rows.length > 0) {
      const originalResume = originalResumeResult.rows[0];
      
      // Check if the original resume is already saved as a version
      const existingVersionCheck = await pool.query(
        `SELECT version_number FROM resume_versions 
        WHERE resume_id = $1 AND user_id = $2 AND version_number = 0`,
        [resumeId, userId]
      );

      // If not already saved as version 0, save the original resume as a version
      if (existingVersionCheck.rows.length === 0) {
        // Get the max version number to determine what version number to use for the original
        const maxVersionResult = await pool.query(
          `SELECT COALESCE(MAX(version_number), 0) as max_version
          FROM resume_versions
          WHERE resume_id = $1`,
          [resumeId]
        );
        const maxVersion = parseInt(maxVersionResult.rows[0].max_version) || 0;
        
        // Save original as version 0 (or insert before all other versions)
        await pool.query(
          `INSERT INTO resume_versions (
            resume_id, user_id, version_number, title, description,
            sections, format, file_url, change_summary,
            job_id, is_default, parent_version_number, tags, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            resumeId,
            userId,
            0, // Version 0 for original
            originalResume.title || 'Original Version',
            'Original resume before version updates',
            originalResume.sections,
            originalResume.format,
            originalResume.file_url,
            'Original version',
            null, // job_id
            false, // is_default
            null, // parent_version_number
            null, // tags
            userId,
            originalResume.created_at || new Date()
          ]
        );

        // Also create a resume record for the original version if it doesn't exist
        const originalVersionResumeCheck = await pool.query(
          `SELECT id FROM resumes 
          WHERE original_resume_id = $1 AND user_id = $2 AND version_number = 0 AND is_version = TRUE`,
          [resumeId, userId]
        );

        if (originalVersionResumeCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO resumes (
              user_id, title, sections, format, file_url, template_id, template_name,
              original_resume_id, version_number, is_version, is_default, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              userId,
              originalResume.title || 'Original Version',
              originalResume.sections,
              originalResume.format,
              originalResume.file_url,
              originalResume.template_id,
              originalResume.template_name,
              resumeId,
              0, // Version 0
              true, // is_version
              false, // is_default
              originalResume.created_at || new Date()
            ]
          );
        }
      }
    }

    // Also unset is_default on all resume records for this original resume
    await pool.query(
      `UPDATE resumes SET is_default = FALSE 
      WHERE (original_resume_id = $1 OR id = $1) AND user_id = $2`,
      [resumeId, userId]
    );

    // Find the version resume record (if it exists as a resume record)
    const versionResumeResult = await pool.query(
      `SELECT id, sections, format, file_url, title, template_id, template_name
      FROM resumes
      WHERE original_resume_id = $1 AND user_id = $2 AND version_number = $3 AND is_version = TRUE`,
      [resumeId, userId, versionNumber]
    );

    if (versionResumeResult.rows.length > 0) {
      const versionResume = versionResumeResult.rows[0];
      
      // Set this version resume as default
      await pool.query(
        `UPDATE resumes SET is_default = TRUE 
        WHERE id = $1 AND user_id = $2`,
        [versionResume.id, userId]
      );

      // Update the original resume with the default version's data
      await pool.query(
        `UPDATE resumes 
        SET sections = $1, format = $2, file_url = $3, title = $4, 
            template_id = $5, template_name = $6, updated_at = NOW()
        WHERE id = $7 AND user_id = $8`,
        [
          versionResume.sections,
          versionResume.format,
          versionResume.file_url,
          versionResume.title,
          versionResume.template_id,
          versionResume.template_name,
          resumeId,
          userId
        ]
      );
    } else {
      // Fallback: if version doesn't exist as resume record, get from resume_versions
      const versionResult = await pool.query(
        `SELECT sections, format, file_url, title
        FROM resume_versions
        WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
        [resumeId, userId, versionNumber]
      );

      if (versionResult.rows.length > 0) {
        const version = versionResult.rows[0];
        // Update the original resume with the default version's data
        await pool.query(
          `UPDATE resumes 
          SET sections = $1, format = $2, file_url = $3, title = $4, updated_at = NOW()
          WHERE id = $5 AND user_id = $6`,
          [
            version.sections,
            version.format,
            version.file_url,
            version.title,
            resumeId,
            userId
          ]
        );
      }
    }

    res.json({ message: "Version set as default successfully" });
  } catch (err) {
    console.error("❌ Error setting default version:", err);
    res.status(500).json({ error: "Failed to set default version" });
  }
});

// Archive a version
router.put("/resumes/:resumeId/versions/:versionNumber/archive", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;
    const { archive } = req.body; // true to archive, false to unarchive

    const result = await pool.query(
      `UPDATE resume_versions 
      SET is_archived = $1 
      WHERE resume_id = $2 AND user_id = $3 AND version_number = $4
      RETURNING *`,
      [archive !== false, resumeId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json({ version: result.rows[0] });
  } catch (err) {
    console.error("❌ Error archiving version:", err);
    res.status(500).json({ error: "Failed to archive version" });
  }
});

// Delete a version (hard delete)
router.delete("/resumes/:resumeId/versions/:versionNumber", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM resume_versions 
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3
      RETURNING id`,
      [resumeId, userId, versionNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json({ message: "Version deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting version:", err);
    res.status(500).json({ error: "Failed to delete version" });
  }
});

// Link a version to a job application
router.put("/resumes/:resumeId/versions/:versionNumber/link-job", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;
    const { job_id } = req.body;

    // Verify version exists
    const versionCheck = await pool.query(
      `SELECT id FROM resume_versions 
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Verify job exists and belongs to user
    if (job_id) {
      const jobCheck = await pool.query(
        `SELECT id FROM jobs WHERE id = $1 AND user_id = $2`,
        [job_id, userId]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
    }

    // Update version with job link
    const result = await pool.query(
      `UPDATE resume_versions 
      SET job_id = $1 
      WHERE resume_id = $2 AND user_id = $3 AND version_number = $4
      RETURNING *`,
      [job_id || null, resumeId, userId, versionNumber]
    );

    res.json({ version: result.rows[0] });
  } catch (err) {
    console.error("❌ Error linking version to job:", err);
    res.status(500).json({ error: "Failed to link version to job" });
  }
});

// Get jobs linked to a version
router.get("/resumes/:resumeId/versions/:versionNumber/jobs", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        rv.job_id,
        j.id,
        j.title,
        j.company,
        j.status
      FROM resume_versions rv
      LEFT JOIN jobs j ON rv.job_id = j.id
      WHERE rv.resume_id = $1 AND rv.user_id = $2 AND rv.version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    if (result.rows.length === 0 || !result.rows[0].job_id) {
      return res.json({ jobs: [] });
    }

    res.json({ jobs: result.rows.filter(r => r.id) });
  } catch (err) {
    console.error("❌ Error fetching linked jobs:", err);
    res.status(500).json({ error: "Failed to fetch linked jobs" });
  }
});

// Publish a version as a standalone resume
router.post("/resumes/:resumeId/versions/:versionNumber/publish", auth, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user.id;

    console.log(`📋 [PUBLISH RESUME] Publishing resume ${resumeId}, version ${versionNumber} for user ${userId}`);

    // Validate versionNumber is not 0 or null (can't publish original resume)
    if (!versionNumber || versionNumber === 0 || versionNumber === '0') {
      return res.status(400).json({ error: "Cannot publish original resume. Please publish a specific version." });
    }

    // Get the original resume title
    const originalResumeResult = await pool.query(
      `SELECT id, title FROM resumes WHERE id = $1 AND user_id = $2`,
      [resumeId, userId]
    );

    if (originalResumeResult.rows.length === 0) {
      return res.status(404).json({ error: "Original resume not found" });
    }

    const originalResume = originalResumeResult.rows[0];
    const originalTitle = originalResume.title;

    // Ensure we're not trying to publish the original resume itself
    // Check if this versionNumber corresponds to the original resume
    const originalResumeCheck = await pool.query(
      `SELECT id FROM resumes WHERE id = $1 AND user_id = $2 AND (is_version IS NULL OR is_version = FALSE)`,
      [resumeId, userId]
    );

    if (originalResumeCheck.rows.length === 0) {
      // This resume is itself a version, not an original
      return res.status(400).json({ error: "Cannot publish a version that is already a version. Please publish from the original resume." });
    }

    // Fetch version data from resume_versions table
    const versionResult = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        description,
        sections,
        format,
        file_url,
        job_id,
        tags,
        created_at
      FROM resume_versions
      WHERE resume_id = $1 AND user_id = $2 AND version_number = $3`,
      [resumeId, userId, versionNumber]
    );

    // Fetch version data from resumes table (new system)
    const resumeVersionResult = await pool.query(
      `SELECT 
        id,
        version_number,
        title,
        sections,
        format,
        file_url,
        template_id,
        template_name,
        created_at
      FROM resumes
      WHERE original_resume_id = $1 AND user_id = $2 AND version_number = $3 AND is_version = TRUE`,
      [resumeId, userId, versionNumber]
    );

    // Determine which version data to use (prefer resume record if exists)
    let versionData = null;
    let jobId = null;

    if (resumeVersionResult.rows.length > 0) {
      // Use data from resumes table (new system)
      const resumeVersion = resumeVersionResult.rows[0];
      versionData = {
        title: resumeVersion.title,
        sections: resumeVersion.sections,
        format: resumeVersion.format,
        file_url: resumeVersion.file_url,
        template_id: resumeVersion.template_id,
        template_name: resumeVersion.template_name,
      };
      
      // Get job_id from resume_versions if available
      if (versionResult.rows.length > 0) {
        jobId = versionResult.rows[0].job_id;
        console.log(`📋 [PUBLISH] Found job_id ${jobId} from resume_versions table`);
      }
      
      // Also check job_materials table for job links (this is the primary source)
      try {
        const jobMaterialsResult = await pool.query(
          `SELECT job_id FROM job_materials WHERE resume_id = $1 AND user_id = $2 LIMIT 1`,
          [resumeVersion.id, userId]
        );
        if (jobMaterialsResult.rows.length > 0 && jobMaterialsResult.rows[0].job_id) {
          jobId = jobMaterialsResult.rows[0].job_id;
          console.log(`📋 [PUBLISH] Found job_id ${jobId} from job_materials table for resume ${resumeVersion.id}`);
        }
      } catch (jobMatError) {
        // job_materials table might not exist, that's okay
        console.log("Note: Could not check job_materials table:", jobMatError.message);
      }
    } else if (versionResult.rows.length > 0) {
      // Use data from resume_versions table (old system)
      const version = versionResult.rows[0];
      versionData = {
        title: version.title,
        sections: version.sections,
        format: version.format,
        file_url: version.file_url,
        template_id: null,
        template_name: null,
      };
      jobId = version.job_id;
      console.log(`📋 [PUBLISH] Found job_id ${jobId} from resume_versions table (old system)`);
    } else {
      return res.status(404).json({ error: "Version not found" });
    }

    console.log(`📋 [PUBLISH] Final job_id to link: ${jobId}`);

    // Create new standalone resume with published prefix
    const publishedTitle = `${versionData.title || originalTitle} (Published from ${originalTitle} - Version ${versionNumber})`;
    
    // Ensure template_name and template_id have defaults if null
    const templateId = versionData.template_id || 1;
    const templateName = versionData.template_name || "ats-optimized";
    
    // Ensure sections is properly formatted (handle if it's already a string or object)
    let sectionsData = versionData.sections;
    if (!sectionsData) {
      sectionsData = {};
    } else if (typeof sectionsData === 'string') {
      try {
        sectionsData = JSON.parse(sectionsData);
      } catch (e) {
        console.warn("⚠️ [PUBLISH] Could not parse sections as JSON, using empty object");
        sectionsData = {};
      }
    }
    
    console.log(`📋 [PUBLISH] Publishing resume with template: ${templateName}, sections type: ${typeof sectionsData}, has sections: ${!!sectionsData && Object.keys(sectionsData).length > 0}`);
    console.log(`📋 [PUBLISH] About to INSERT INTO resumes table (NOT cover_letters)`);
    
    const newResumeResult = await pool.query(
      `INSERT INTO resumes (
        user_id,
        title,
        sections,
        format,
        file_url,
        template_id,
        template_name,
        is_version,
        original_resume_id,
        version_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, format, file_url, created_at, is_version, original_resume_id, version_number`,
      [
        userId,
        publishedTitle,
        sectionsData,
        versionData.format || "pdf",
        versionData.file_url,
        templateId,
        templateName,
        false, // Not a version, standalone resume
        null,  // No original_resume_id
        null   // No version_number
      ]
    );

    const newResume = newResumeResult.rows[0];
    
    console.log(`✅ [PUBLISH] Created new resume:`, {
      id: newResume.id,
      title: newResume.title,
      is_version: newResume.is_version,
      original_resume_id: newResume.original_resume_id,
      version_number: newResume.version_number
    });
    
    // Verify it was created correctly
    if (newResume.is_version !== false || newResume.original_resume_id !== null || newResume.version_number !== null) {
      console.error(`❌ [PUBLISH] ERROR: Published resume has incorrect flags!`, newResume);
      // Fix it
      await pool.query(
        `UPDATE resumes SET is_version = FALSE, original_resume_id = NULL, version_number = NULL WHERE id = $1`,
        [newResume.id]
      );
      console.log(`✅ [PUBLISH] Fixed resume flags`);
    }

    // If version was linked to a job, copy that linkage to job_materials
    if (jobId) {
      try {
        const linkResult = await pool.query(
          `INSERT INTO job_materials (job_id, user_id, resume_id, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (job_id) 
           DO UPDATE SET resume_id = $3, updated_at = NOW()
           RETURNING *`,
          [jobId, userId, newResume.id]
        );
        console.log(`✅ Published resume ${newResume.id} linked to job ${jobId}`);
        console.log(`📋 [PUBLISH] Job materials updated:`, linkResult.rows[0]);
      } catch (jobLinkError) {
        console.error("⚠️ Failed to link published resume to job:", jobLinkError.message);
        console.error("⚠️ Error details:", jobLinkError);
        // Don't fail the publish operation if job linking fails
      }
    } else {
      console.log(`⚠️ [PUBLISH] No job_id found for version ${versionNumber}, skipping job link`);
    }

    // Add metadata to description indicating source
    const description = `Published from "${originalTitle}" - Version ${versionNumber}`;
    
    // Update the new resume with description (if description column exists)
    try {
      await pool.query(
        `UPDATE resumes SET description = $1 WHERE id = $2`,
        [description, newResume.id]
      );
    } catch (descError) {
      // Description column might not exist, that's okay
      console.log("Note: Description column not available");
    }

    res.json({
      message: "✅ Version published as standalone resume",
      resume: {
        ...newResume,
        description: description,
        published_from: originalTitle,
        published_from_version: versionNumber
      }
    });
  } catch (err) {
    console.error("❌ Error publishing version:", err);
    res.status(500).json({ error: "Failed to publish version: " + err.message });
  }
});

export default router;

