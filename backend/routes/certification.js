import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sharedPool from "../db/pool.js";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
// Use shared pool in test mode for transaction isolation
const pool = process.env.NODE_ENV === 'test' ? sharedPool : new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Multer setup for certification files (images and PDFs)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certFileUploadDir = path.join(__dirname, "..", "uploads", "certification-files");

if (!fs.existsSync(certFileUploadDir)) {
  fs.mkdirSync(certFileUploadDir, { recursive: true });
}

const certFileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, certFileUploadDir),
  filename: (req, file, cb) => {
    const userId = req.userId || "unknown";
    const uniqueName = `${Date.now()}-${userId}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb(null, uniqueName);
  },
});

const certFileUpload = multer({
  storage: certFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/i;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext.replace(".", ""))) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only image files (JPG, PNG, GIF, WEBP) and PDF files are allowed."));
    }
  },
});

// ✅ Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ✅ Upload Certification File (Image or PDF)
router.post("/certifications/upload-file", auth, certFileUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/certification-files/${req.file.filename}`;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isImage = /jpeg|jpg|png|gif|webp/i.test(fileExt.replace(".", ""));
    
    res.json({ 
      file_url: fileUrl,
      badge_url: fileUrl, // For backward compatibility
      document_url: fileUrl, // For backward compatibility
      is_image: isImage,
      file_type: fileExt.replace(".", "")
    });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload file" });
  }
});

// ✅ Add Certification (UC-115)
router.post("/certifications", auth, async (req, res) => {
  try {
    const {
      name,
      organization,
      platform,
      category,
      cert_number,
      date_earned,
      expiration_date,
      does_not_expire,
      document_url,
      badge_url,
      verification_url,
      description,
      scores,
      achievements,
      renewal_reminder,
      verified,
    } = req.body;

    if (!name || !organization) {
      return res
        .status(400)
        .json({ error: "Certification name and organization are required" });
    }

    // date_earned is NOT NULL, use current date as default if not provided
    const safeDateEarned = date_earned || new Date().toISOString().split('T')[0];
    const safeExpiration = does_not_expire ? null : expiration_date || null;
    const safeReminder =
      renewal_reminder && renewal_reminder.trim() !== ""
        ? renewal_reminder
        : null;

    // Parse scores if it's a string
    let scoresJson = null;
    if (scores) {
      try {
        scoresJson = typeof scores === "string" ? JSON.parse(scores) : scores;
      } catch (e) {
        console.warn("Failed to parse scores JSON:", e);
      }
    }

    // Use badge_url if provided, otherwise document_url, and set both to the same value
    const fileUrl = badge_url || document_url || null;
    
    const { rows } = await pool.query(
      `INSERT INTO certifications
        (user_id, name, organization, platform, category, cert_number, date_earned, expiration_date,
         does_not_expire, document_url, badge_url, verification_url, description, scores, achievements,
         renewal_reminder, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.userId,
        name,
        organization,
        platform || null,
        category || null,
        cert_number || null,
        safeDateEarned,
        safeExpiration,
        does_not_expire || false,
        fileUrl, // document_url
        fileUrl, // badge_url (same value)
        verification_url || null,
        description || null,
        scoresJson,
        achievements || null,
        safeReminder,
        verified || false,
      ]
    );

    res.json({ message: "Certification added", certification: rows[0] });
  } catch (e) {
    console.error("Add certification error:", e);
    res.status(500).json({ error: "Database error while adding certification" });
  }
});

// ✅ Get all certifications
router.get("/certifications", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM certifications WHERE user_id=$1 ORDER BY date_earned DESC",
      [req.userId]
    );
    res.json({ certifications: rows });
  } catch (e) {
    console.error("Error loading certifications:", e);
    res.status(500).json({ error: "Failed to load certifications" });
  }
});

// ✅ Update Certification (UC-115 - with new fields)
router.put("/certifications/:id", auth, async (req, res) => {
  const fields = [
    "name",
    "organization",
    "platform",
    "category",
    "cert_number",
    "date_earned",
    "expiration_date",
    "does_not_expire",
    "document_url",
    "badge_url",
    "verification_url",
    "description",
    "scores",
    "achievements",
    "renewal_reminder",
    "verified",
  ];

  const updates = [];
  const values = [];
  let i = 1;

  // Handle combined file field: if badge_url or document_url is provided, set both to the same value
  const fileUrl = req.body.badge_url !== undefined ? req.body.badge_url : 
                  req.body.document_url !== undefined ? req.body.document_url : 
                  null;
  const hasFileUpdate = req.body.badge_url !== undefined || req.body.document_url !== undefined;

  for (const field of fields) {
    // Skip file fields if we're handling them separately
    if ((field === "badge_url" || field === "document_url") && hasFileUpdate) {
      continue;
    }

    if (req.body[field] !== undefined) {
      let value = req.body[field];

      // 🩵 Fix: Convert empty string dates to null
      if (
        ["date_earned", "expiration_date", "renewal_reminder"].includes(field)
      ) {
        value = value && value.trim() !== "" ? value : null;
      }

      // Handle JSONB field for scores
      if (field === "scores" && value) {
        try {
          value = typeof value === "string" ? JSON.parse(value) : value;
        } catch (e) {
          console.warn("Failed to parse scores JSON:", e);
          value = null;
        }
      }

      updates.push(`${field}=$${i++}`);
      values.push(value);
    }
  }

  // Add file fields together if there's an update
  if (hasFileUpdate) {
    updates.push(`badge_url=$${i++}, document_url=$${i++}`);
    values.push(fileUrl || null, fileUrl || null);
  }

  if (updates.length === 0)
    return res.status(400).json({ error: "No fields to update" });

  values.push(req.params.id, req.userId);

  const query = `
    UPDATE certifications
    SET ${updates.join(", ")}
    WHERE id=$${i++} AND user_id=$${i}
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, values);
    if (!rows.length) return res.status(404).json({ error: "Certification not found" });
    res.json({ message: "Certification updated", certification: rows[0] });
  } catch (e) {
    console.error("Error updating certification:", e);
    res.status(500).json({ error: "Update failed" });
  }
});

// ✅ Delete Certification
router.delete("/certifications/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM certifications WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Certification not found" });
    res.json({ message: "Certification deleted successfully" });
  } catch (e) {
    console.error("Error deleting certification:", e);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ✅ Serve Badge Image
router.get("/certifications/badge/:filename", auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(badgeUploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Badge image not found" });
    }

    // Set appropriate content type for images
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    res.setHeader("Content-Type", contentTypes[ext] || "image/jpeg");
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error("Error serving badge image:", err);
    res.status(500).json({ error: "Failed to serve badge image" });
  }
});

export default router;
