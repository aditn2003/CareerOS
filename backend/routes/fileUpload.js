// backend/routes/fileUpload.js
// File upload routes for resumes and cover letters (PDF, DOC, DOCX, TXT)

import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pool from "../db/pool.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";

// Load mammoth dynamically (may not be installed)
let mammoth;
(async () => {
  try {
    const mammothModule = await import("mammoth");
    mammoth = mammothModule.default || mammothModule;
  } catch {
    console.warn("⚠️ mammoth not available - DOCX parsing disabled");
    mammoth = null;
  }
})();

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create upload directories
const resumeUploadDir = path.join(__dirname, "../uploads/resumes");
const coverLetterUploadDir = path.join(__dirname, "../uploads/cover-letters");

[resumeUploadDir, coverLetterUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Storage helper functions (exported for testing)
function resumeDestination(req, file, cb) {
  cb(null, resumeUploadDir);
}

function resumeFilename(req, file, cb) {
  const uniqueName = `${Date.now()}-${req.userId}-${file.originalname.replace(
    /[^a-zA-Z0-9.-]/g,
    "_"
  )}`;
  cb(null, uniqueName);
}

function coverLetterDestination(req, file, cb) {
  cb(null, coverLetterUploadDir);
}

function coverLetterFilename(req, file, cb) {
  const uniqueName = `${Date.now()}-${req.userId}-${file.originalname.replace(
    /[^a-zA-Z0-9.-]/g,
    "_"
  )}`;
  cb(null, uniqueName);
}

// Multer configuration for resumes
const resumeStorage = multer.diskStorage({
  destination: resumeDestination,
  filename: resumeFilename,
});

// Multer configuration for cover letters
const coverLetterStorage = multer.diskStorage({
  destination: coverLetterDestination,
  filename: coverLetterFilename,
});

// File filter function (exported for testing)
function fileFilter(req, file, cb) {
  const allowed = /pdf|doc|docx|txt/i;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext.replace(".", ""))) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed."
      )
    );
  }
}

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

const coverLetterUpload = multer({
  storage: coverLetterStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

// Extract text from PDF using pdf-parse (pure JS, no native binaries)
async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    console.error("PDF extraction error:", err);
    return "";
  }
}

// Extract text from DOCX
async function extractDocxText(filePath) {
  try {
    if (!mammoth) {
      console.warn("mammoth not available for DOCX parsing");
      return "";
    }
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value.trim();
  } catch (err) {
    console.error("DOCX extraction error:", err);
    return "";
  }
}

// Extract text from TXT
function extractTxtText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch (err) {
    console.error("TXT extraction error:", err);
    return "";
  }
}

// ============================================
// RESUME UPLOAD
// ============================================
router.post("/resume", auth, resumeUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { title } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileUrl = `/uploads/resumes/${fileName}`;

    // Extract text content based on file type
    let textContent = "";
    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      textContent = await extractPdfText(buffer);
    } else if (ext === ".docx" || ext === ".doc") {
      textContent = await extractDocxText(filePath);
    } else if (ext === ".txt") {
      textContent = extractTxtText(filePath);
    }

    // Determine format
    const format = ext.replace(".", "").toLowerCase();

    // Save to database
    // Try with file_url column first, fallback if it doesn't exist
    let result;
    try {
      result = await pool.query(
        `INSERT INTO resumes (user_id, title, format, file_url, sections)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, format, file_url, created_at`,
        [
          req.userId,
          title || req.file.originalname,
          format,
          fileUrl,
          textContent ? { extracted_text: textContent } : {},
        ]
      );
    } catch (dbErr) {
      // If file_url column doesn't exist, try without it
      if (dbErr.code === "42703") {
        result = await pool.query(
          `INSERT INTO resumes (user_id, title, format, sections)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, format, created_at`,
          [
            req.userId,
            title || req.file.originalname,
            format,
            textContent ? { extracted_text: textContent } : {},
          ]
        );
        // Add file_url to result manually
        result.rows[0].file_url = fileUrl;
      } else {
        throw dbErr;
      }
    }

    res.json({
      message: "✅ Resume uploaded successfully",
      resume: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Resume upload error:", err);
    // Clean up file if database insert failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message || "Failed to upload resume" });
  }
});

// ============================================
// COVER LETTER UPLOAD
// ============================================
router.post(
  "/cover-letter",
  auth,
  coverLetterUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title } = req.body;
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileUrl = `/uploads/cover-letters/${fileName}`;

      // Extract text content based on file type
      let textContent = "";
      if (ext === ".pdf") {
        const buffer = fs.readFileSync(filePath);
        textContent = await extractPdfText(buffer);
      } else if (ext === ".docx" || ext === ".doc") {
        textContent = await extractDocxText(filePath);
      } else if (ext === ".txt") {
        textContent = extractTxtText(filePath);
      }

      // Determine format
      const format = ext.replace(".", "").toLowerCase();

      // Save to uploaded_cover_letters table (new dedicated table for uploads)
      const result = await pool.query(
        `INSERT INTO uploaded_cover_letters (user_id, title, format, file_url, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, format, file_url, content, created_at`,
        [
          req.userId,
          title || req.file.originalname,
          format,
          fileUrl,
          textContent,
        ]
      );

      res.json({
        message: "✅ Cover letter uploaded successfully",
        cover_letter: result.rows[0],
      });
    } catch (err) {
      console.error("❌ Cover letter upload error:", err);
      // Clean up file if database insert failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res
        .status(500)
        .json({ error: err.message || "Failed to upload cover letter" });
    }
  }
);

// ============================================
// FILE VIEWING/DOWNLOADING
// ============================================
router.get("/resume/:filename", auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(resumeUploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };

    res.setHeader(
      "Content-Type",
      contentTypes[ext] || "application/octet-stream"
    );
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error("❌ Resume file serve error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

router.get("/cover-letter/:filename", auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(coverLetterUploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };

    res.setHeader(
      "Content-Type",
      contentTypes[ext] || "application/octet-stream"
    );
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error("❌ Cover letter file serve error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Export helper functions for testing
export {
  extractPdfText,
  extractDocxText,
  extractTxtText,
  fileFilter,
  resumeDestination,
  resumeFilename,
  coverLetterDestination,
  coverLetterFilename,
};

export default router;
