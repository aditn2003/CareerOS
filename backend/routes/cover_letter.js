import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import puppeteer from "puppeteer";

// Load mammoth dynamically for DOCX conversion
let mammoth;
(async () => {
  try {
    const mammothModule = await import("mammoth");
    mammoth = mammothModule.default || mammothModule;
  } catch {
    console.warn("⚠️ mammoth not available - DOCX to PDF conversion disabled");
    mammoth = null;
  }
})();

dotenv.config();

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Get all cover letters for a user (including global templates)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's uploaded cover letters from uploaded_cover_letters table
    let userLettersQuery = { rows: [] };
    
    try {
      userLettersQuery = await pool.query(
        `
        SELECT 
          id, 
          title,
          format, 
          file_url, 
          content,
          created_at, 
          COALESCE(updated_at, created_at) AS updated_at, 
          'uploaded' AS source
        FROM uploaded_cover_letters
        WHERE user_id = $1
        ORDER BY COALESCE(updated_at, created_at) DESC;
        `,
        [userId]
      );
    } catch (err) {
      console.warn("uploaded_cover_letters table query failed:", err.message);
      userLettersQuery = { rows: [] };
    }

    // Get cover letters from cover_letters table (older table)
    let coverLettersQuery = { rows: [] };
    try {
      coverLettersQuery = await pool.query(
        `
        SELECT 
          id,
          name AS title,
          'pdf' AS format,
          NULL AS file_url,
          content,
          created_at,
          COALESCE(updated_at, created_at) AS updated_at,
          'cover_letters' AS source
        FROM cover_letters
        WHERE user_id = $1
        ORDER BY COALESCE(updated_at, created_at) DESC;
        `,
        [userId]
      );
    } catch (err) {
      console.warn("cover_letters table query failed:", err.message);
      coverLettersQuery = { rows: [] };
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
    
    console.log(`✅ Found ${userLettersQuery.rows.length} uploaded cover letters, ${coverLettersQuery.rows.length} cover_letters, ${templatesQuery.rows.length} templates`);

    // Combine both uploaded_cover_letters and cover_letters
    const allCoverLetters = [
      ...userLettersQuery.rows.map(row => ({
        ...row,
        isTemplate: false,
        source: 'uploaded'
      })),
      ...coverLettersQuery.rows.map(row => ({
        ...row,
        isTemplate: false,
        source: 'cover_letters'
      }))
    ];

    res.json({ 
      cover_letters: allCoverLetters,
      user_letters: userLettersQuery.rows,
      cover_letters_legacy: coverLettersQuery.rows,
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
    const { title, name, format = "pdf", content, file_url } = req.body;

    // Use 'name' field (or 'title' as fallback for compatibility)
    const coverLetterName = name || title;
    if (!coverLetterName) return res.status(400).json({ error: "Name/Title is required" });

    // Try with file_url column first
    try {
      const { rows } = await pool.query(
        `
        INSERT INTO cover_letters (user_id, name, content, file_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, content, file_url, created_at;
        `,
        [userId, coverLetterName, content || "", file_url || null]
      );
      // Map 'name' to 'title' for frontend compatibility
      const coverLetter = rows[0];
      coverLetter.title = coverLetter.name;
      coverLetter.format = format;
      res.json({ message: "✅ Cover letter saved", cover_letter: coverLetter });
    } catch (fileUrlErr) {
      // If file_url column doesn't exist, try without it
      if (fileUrlErr.code === '42703') { // Column does not exist
    const { rows } = await pool.query(
      `
          INSERT INTO cover_letters (user_id, name, content)
          VALUES ($1, $2, $3)
          RETURNING id, name, content, created_at;
      `,
          [userId, coverLetterName, content || ""]
        );
        // Map 'name' to 'title' for frontend compatibility
        const coverLetter = rows[0];
        coverLetter.title = coverLetter.name;
        coverLetter.format = format;
        if (file_url) coverLetter.file_url = file_url;
        res.json({ message: "✅ Cover letter saved", cover_letter: coverLetter });
      } else {
        throw fileUrlErr;
      }
    }
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

// ✅ GET single cover letter by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Try with 'title' first, fall back to 'name' if that column doesn't exist
    let result;
    try {
      result = await pool.query(
        `SELECT * FROM cover_letters WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } catch (err) {
      console.error("❌ Fetch cover letter error:", err);
      throw err;
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter not found" });
    }
    
    res.json({ cover_letter: result.rows[0] });
  } catch (err) {
    console.error("❌ Fetch cover letter error:", err);
    res.status(500).json({ error: "Failed to load cover letter" });
  }
});

// ✅ GET cover letter download/view - serves uploaded files directly
router.get("/:id/download", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // First check uploaded_cover_letters table
    let coverLetterResult = { rows: [] };
    try {
      coverLetterResult = await pool.query(
        `SELECT id, title, format, file_url, content, user_id
         FROM uploaded_cover_letters
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } catch (err) {
      console.error("❌ Error fetching uploaded cover letter:", err);
    }
    
    if (coverLetterResult.rows.length === 0) {
      return res.status(404).json({ error: "Cover letter not found" });
    }
    
    const coverLetter = coverLetterResult.rows[0];
    
    // ✅ If this is an uploaded cover letter (has file_url), serve the original file directly
    if (coverLetter.file_url) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const coverLetterUploadDir = path.join(__dirname, "..", "uploads", "cover-letters");
      const filename = path.basename(coverLetter.file_url);
      const filePath = path.join(coverLetterUploadDir, filename);
      
      console.log(`🔍 [COVER LETTER DOWNLOAD] Checking for uploaded file:`);
      console.log(`   - file_url: ${coverLetter.file_url}`);
      console.log(`   - filename: ${filename}`);
      console.log(`   - filePath: ${filePath}`);
      console.log(`   - exists: ${fs.existsSync(filePath)}`);
      
      if (fs.existsSync(filePath)) {
        const ext = path.extname(coverLetter.file_url).toLowerCase();
        
        // ✅ Convert DOC/DOCX to PDF for inline viewing
        if ((ext === ".doc" || ext === ".docx") && mammoth) {
          try {
            console.log(`🔄 [COVER LETTER DOWNLOAD] Converting ${ext} to PDF for viewing`);
            
            // Read the DOCX file
            const fileBuffer = fs.readFileSync(filePath);
            
            // Convert DOCX to HTML using mammoth
            const result = await mammoth.convertToHtml({ buffer: fileBuffer });
            const html = result.value;
            
            // Create a temporary HTML file
            const tempDir = path.join(__dirname, "..", "temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const tempHtmlPath = path.join(tempDir, `cover-letter-${coverLetter.id}-${Date.now()}.html`);
            const tempPdfPath = path.join(tempDir, `cover-letter-${coverLetter.id}-${Date.now()}.pdf`);
            
            // Create HTML with proper styling
            const fullHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      max-width: 8.5in;
                      margin: 0 auto;
                      padding: 1in;
                      line-height: 1.6;
                    }
                    p { margin: 0.5em 0; }
                  </style>
                </head>
                <body>
                  ${html}
                </body>
              </html>
            `;
            
            fs.writeFileSync(tempHtmlPath, fullHtml);
            
            // Convert HTML to PDF using Puppeteer
            const browser = await puppeteer.launch({
              headless: true,
              args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            
            const page = await browser.newPage();
            await page.setContent(fullHtml, { waitUntil: "networkidle0" });
            
            await page.pdf({
              path: tempPdfPath,
              format: "A4",
              printBackground: true,
              margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
            });
            
            await browser.close();
            
            // Clean up temp HTML file
            if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
            
            // Serve the PDF
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}.pdf"`);
            res.sendFile(tempPdfPath, (err) => {
              // Clean up temp PDF file after sending
              if (fs.existsSync(tempPdfPath)) {
                setTimeout(() => fs.unlinkSync(tempPdfPath), 1000);
              }
              if (err) console.error("Error sending PDF:", err);
            });
            
            console.log(`✅ [COVER LETTER DOWNLOAD] Converted and served PDF: ${tempPdfPath}`);
            return;
          } catch (convErr) {
            console.error("❌ [COVER LETTER DOWNLOAD] Conversion error:", convErr);
            // Fall through to serve original file
          }
        }
        
        // ✅ Serve PDF and TXT files directly
        if (ext === ".pdf" || ext === ".txt") {
          console.log(`✅ [COVER LETTER DOWNLOAD] Serving uploaded file: ${filePath}`);
          const contentTypes = {
            ".pdf": "application/pdf",
            ".txt": "text/plain",
          };
          res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
          res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}${ext}"`);
          return res.sendFile(path.resolve(filePath));
        }
        
        // For DOC/DOCX without mammoth, serve as-is (will show download message in frontend)
        console.log(`⚠️ [COVER LETTER DOWNLOAD] Serving ${ext} file directly (conversion not available)`);
        const contentTypes = {
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}${ext}"`);
        return res.sendFile(path.resolve(filePath));
      } else {
        console.warn(`⚠️ [COVER LETTER DOWNLOAD] Uploaded file not found: ${filePath}`);
        // Fall through to return content as text/plain
      }
    }
    
    // Fallback: return content as plain text if no file_url
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}.txt"`);
    res.send(coverLetter.content || "");
  } catch (err) {
    console.error("❌ Cover letter download error:", err);
    res.status(500).json({ error: "Failed to download cover letter" });
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
