// routes/company.js
import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharedPool from "../db/pool.js"; // Import shared pool for test mode

dotenv.config();
const { Pool } = pkg;
const router = express.Router();
// In test mode, use shared pool to ensure transaction isolation works
const pool = process.env.NODE_ENV === 'test' ? sharedPool : new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// 🟢 Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 🟣 Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 🛡 Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ✅ Get company by name (returns full consistent object)
router.get("/:name", auth, async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      `SELECT
         id,
         name,
         COALESCE(size, '') AS size,
         COALESCE(industry, '') AS industry,
         COALESCE(location, '') AS location,
         COALESCE(website, '') AS website,
         COALESCE(description, 'No description yet.') AS description,
         COALESCE(mission, '') AS mission,
         COALESCE(news, '') AS news,
         COALESCE(glassdoor_rating, 0) AS glassdoor_rating,
         COALESCE(contact_email, '') AS contact_email,
         COALESCE(contact_phone, '') AS contact_phone,
         COALESCE(logo_url, '') AS logo_url
       FROM companies
       WHERE LOWER(name)=LOWER($1)`,
      [name]
    );

    if (result.rows.length === 0) {
      // Auto-create placeholder
      const insert = await pool.query(
        `INSERT INTO companies (name, description)
         VALUES ($1, 'No description yet.')
         RETURNING *`,
        [name]
      );
      return res.json(insert.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Fetch company error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Create or update (POST /api/companies)
router.post("/", auth, async (req, res) => {
  const {
    name,
    size,
    industry,
    location,
    website,
    description,
    mission,
    news,
    glassdoor_rating,
    contact_email,
    contact_phone,
    logo_url,
  } = req.body;

  if (!name) return res.status(400).json({ error: "Company name required" });

  try {
    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE companies
         SET size=$1, industry=$2, location=$3, website=$4, description=$5,
             mission=$6, news=$7, glassdoor_rating=$8, contact_email=$9,
             contact_phone=$10, logo_url=$11, updated_at=NOW()
         WHERE LOWER(name)=LOWER($12)
         RETURNING *`,
        [
          size,
          industry,
          location,
          website,
          description,
          mission,
          news,
          glassdoor_rating,
          contact_email,
          contact_phone,
          logo_url,
          name,
        ]
      );
      res.json({ message: "Company updated", company: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO companies
         (name, size, industry, location, website, description, mission, news, glassdoor_rating, contact_email, contact_phone, logo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          name,
          size,
          industry,
          location,
          website,
          description,
          mission,
          news,
          glassdoor_rating,
          contact_email,
          contact_phone,
          logo_url,
        ]
      );
      res.json({ message: "Company created", company: result.rows[0] });
    }
  } catch (err) {
    console.error("❌ Company save error:", err);
    res.status(500).json({ error: "Database error while saving company" });
  }
});

// ✅ PUT update company (auto-create if missing)
router.put("/:name", auth, async (req, res) => {
  try {
    const { name } = req.params;
    const fields = req.body || {};

    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO companies (name, description)
         VALUES ($1, $2)
         RETURNING *`,
        [name, fields.description || "No description yet."]
      );
      return res.json({ company: insert.rows[0] });
    }

    const keys = Object.keys(fields);
    if (keys.length === 0)
      return res.json({ message: "No update fields provided" });

    const updates = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
    const values = Object.values(fields);

    const result = await pool.query(
      `UPDATE companies
       SET ${updates}, updated_at=NOW()
       WHERE LOWER(name)=LOWER($${values.length + 1})
       RETURNING *`,
      [...values, name]
    );

    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error("❌ Company PUT error:", err);
    res.status(500).json({ error: "Error updating company" });
  }
});

// ✅ Upload / update logo (auto-create company if missing)
router.post("/:name/logo", auth, upload.single("logo"), async (req, res) => {
  try {
    const { name } = req.params;
    if (!req.file)
      return res.status(400).json({ error: "No logo file provided" });

    const logoUrl = `/uploads/${req.file.filename}`;
    const existing = await pool.query(
      "SELECT id FROM companies WHERE LOWER(name)=LOWER($1)",
      [name]
    );

    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO companies (name, description, logo_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, "No description yet.", logoUrl]
      );
      return res.json({
        message: "✅ Company created and logo uploaded",
        company: insert.rows[0],
      });
    }

    const update = await pool.query(
      `UPDATE companies
       SET logo_url=$1, updated_at=NOW()
       WHERE LOWER(name)=LOWER($2)
       RETURNING *`,
      [logoUrl, name]
    );

    res.json({
      message: "✅ Logo uploaded successfully",
      company: update.rows[0],
    });
  } catch (err) {
    console.error("❌ Logo upload error:", err);
    res.status(500).json({ error: "Error uploading logo" });
  }
});

export default router;
