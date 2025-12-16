import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import sharedPool from "../db/pool.js";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();

// Use shared pool in test mode for transaction isolation
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
// ✅ UC-031: SPECIAL PROJECTS - ADD PROJECT ENTRY
// ============================================================
router.post("/projects", auth, async (req, res) => {
  const {
    name,
    description,
    role,
    start_date,
    end_date,
    technologies,
    repository_link,
    team_size,
    collaboration_details,
    outcomes,
    industry,
    project_type,
    media_url,
    status,
  } = req.body;

  if (!name || !description || !role || !start_date) {
    return res.status(400).json({
      error: "Project name, description, role, and start date are required.",
    });
  }

  try {
    const query = `
      INSERT INTO projects (
        user_id, name, description, role, start_date, end_date,
        technologies, repository_link, team_size, collaboration_details,
        outcomes, industry, project_type, media_url, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *;
    `;

    const values = [
      req.userId,
      name,
      description,
      role,
      start_date,
      end_date || null,
      technologies ? technologies.split(",").map(t => t.trim()) : [],
      repository_link || null,
      team_size || null,
      collaboration_details || "",
      outcomes || "",
      industry || "",
      project_type || "",
      media_url || "",
      status || "Planned",
    ];

    const result = await pool.query(query, values);

    res.json({
      message: "✅ Project added successfully",
      project: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Project insert error:", err);
    res.status(500).json({ error: "Database error while adding project" });
  }
});

// ============================================================
// ✅ UC-032: VIEW ALL PROJECTS (PORTFOLIO FORMAT)
// ============================================================
router.get("/projects", auth, async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM projects
      WHERE user_id = $1
      ORDER BY start_date DESC;
    `;
    const result = await pool.query(query, [req.userId]);
    res.json({ projects: result.rows });
  } catch (err) {
    console.error("❌ Project fetch error:", err);
    res.status(500).json({ error: "Database error while fetching projects" });
  }
});

// ============================================================
// ✅ UC-032: GET SINGLE PROJECT (FOR SHARING)
// ============================================================
router.get("/projects/:id", auth, async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM projects
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [req.params.id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error("❌ Project fetch error:", err);
    res.status(500).json({ error: "Database error while fetching project" });
  }
});

// ============================================================
// ✅ UC-032 (CONT.): EDIT / UPDATE PROJECT ENTRY
// ============================================================
router.put("/projects/:id", auth, async (req, res) => {
  const {
    name,
    description,
    role,
    start_date,
    end_date,
    technologies,
    repository_link,
    team_size,
    collaboration_details,
    outcomes,
    industry,
    project_type,
    media_url,
    status,
  } = req.body;

  if (!name || !description || !role || !start_date) {
    return res
      .status(400)
      .json({ error: "Project name, description, role, and start date are required." });
  }

  try {
    const result = await pool.query(
      `
      UPDATE projects
      SET name=$1, description=$2, role=$3, start_date=$4, end_date=$5,
          technologies=$6, repository_link=$7, team_size=$8, collaboration_details=$9,
          outcomes=$10, industry=$11, project_type=$12, media_url=$13, status=$14
      WHERE id=$15 AND user_id=$16
      RETURNING *;
    `,
      [
        name,
        description,
        role,
        start_date,
        end_date || null,
        technologies ? technologies.split(",").map(t => t.trim()) : [],
        repository_link || null,
        team_size || null,
        collaboration_details || "",
        outcomes || "",
        industry || "",
        project_type || "",
        media_url || "",
        status || "Planned",
        req.params.id,
        req.userId,
      ]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Project not found" });

    res.json({
      message: "✅ Project updated successfully",
      project: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Project update error:", err);
    res.status(500).json({ error: "Database error while updating project" });
  }
});

// ============================================================
// ✅ UC-032 (CONT.): DELETE PROJECT ENTRY
// ============================================================
router.delete("/projects/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM projects
      WHERE id=$1 AND user_id=$2
      RETURNING id;
    `,
      [req.params.id, req.userId]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Project not found" });

    res.json({ message: "✅ Project entry deleted successfully" });
  } catch (err) {
    console.error("❌ Project delete error:", err);
    res.status(500).json({ error: "Database error while deleting project" });
  }
});

export default router;
