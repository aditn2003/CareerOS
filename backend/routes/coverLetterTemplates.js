// backend/routes/coverLetterTemplates.js
import express from "express";
import pkg from "pg";
import OpenAI from "openai";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = express.Router();

// 🔑 OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ========================================================================
   UC-057 + Template CRUD
   (This file handles AI cover letters and template library)
========================================================================= */

/* ==============================
   GET — all cover letter templates
============================== */
router.get("/templates", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, industry, category, content,
              COALESCE(is_custom, false) AS is_custom,
              COALESCE(view_count, 0) AS view_count,
              COALESCE(use_count, 0) AS use_count,
              updated_at
       FROM cover_letter_templates
       ORDER BY updated_at DESC, id DESC`
    );

    res.json({ templates: result.rows });
  } catch (err) {
    console.error("❌ Error fetching cover letter templates:", err);
    res.status(500).json({
      message: "Failed to fetch cover letter templates from the database",
    });
  }
});

/* ==============================
   POST — create new template (custom)
============================== */
router.post("/templates", async (req, res) => {
  try {
    const {
      name = "",
      industry = "",
      category = "Formal",
      content = "",
    } = req.body;

    if (!name.trim() || !industry.trim() || !content.trim()) {
      return res.status(400).json({
        message: "Name, industry, and content are required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO cover_letter_templates
        (name, industry, category, content, is_custom, view_count, use_count)
       VALUES ($1, $2, $3, $4, true, 0, 0)
       RETURNING id, name, industry, category, content,
                 is_custom, view_count, use_count`,
      [name.trim(), industry.trim(), category.trim(), content.trim()]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    console.error("❌ Error creating cover letter template:", err);
    res.status(500).json({ message: "Failed to create cover letter template" });
  }
});

/* ==============================
   Template Analytics — VIEW count
============================== */
router.post("/templates/:id/track-view", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE cover_letter_templates
       SET view_count = COALESCE(view_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error tracking cover letter view:", err);
    res.status(500).json({ message: "Failed to track template view" });
  }
});

/* ==============================
   Template Analytics — USE count
============================== */
router.post("/templates/:id/track-use", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE cover_letter_templates
       SET use_count = COALESCE(use_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error tracking template use:", err);
    res.status(500).json({ message: "Failed to track template use" });
  }
});

/* ========================================================================
   UC-057 — AI Cover Letter Generation with Company Research
========================================================================= */
/* ========================================================================
   UC-057 — AI Cover Letter Generation with Company Research
========================================================================= */
router.post("/generate", async (req, res) => {
  try {
    const {
      userName = "",
      targetRole = "",
      company = "",
      jobDescription = "",
      achievements = "",
      tone = "Professional",
      variation = "Standard",
    } = req.body;

    if (!company.trim() || !targetRole.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name and target role are required.",
      });
    }

    // 🔎 FIXED QUERY: correct column is "company"
    const researchQuery = await pool.query(
      `
      SELECT *
      FROM company_research
      WHERE LOWER(company) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [company.trim()]
    );

    const research = researchQuery.rows[0] || {};

    // Extract JSON safely
    const basics = research.basics || {};
    const mvc = research.mission_values_culture || {};
    const products = research.products_services || {};
    const execs = research.executives || {};
    const competitive = research.competitive_landscape || {};
    const newsList = research.news || [];
    const summary = research.summary || "N/A";

    // Variation instruction
    let variationInstruction = "";
    if (variation === "Impact")
      variationInstruction =
        "Focus heavily on quantifiable achievements and measurable outcomes.";
    else if (variation === "Storytelling")
      variationInstruction =
        "Use a light storytelling style while remaining professional.";

    const systemPrompt =
      "You are an expert career coach and cover letter writer. You produce tailored, ATS-friendly cover letters.";

    const userPrompt = `
Write a ${tone} cover letter for the role "${targetRole}" at "${company}".

Use the following company research:

[BASICS]
Industry: ${basics.industry || "N/A"}
Size: ${basics.size || "N/A"}
Headquarters: ${basics.headquarters || "N/A"}
Funding/Growth: ${basics.funding || basics.growth || "N/A"}

[MISSION / VALUES / CULTURE]
Mission: ${mvc.mission || "N/A"}
Values: ${mvc.values || "N/A"}
Culture: ${mvc.culture || "N/A"}

[PRODUCTS & SERVICES]
${products.list || "N/A"}

[EXECUTIVES]
${execs.ceo || execs.leadership || "N/A"}

[COMPETITIVE LANDSCAPE]
${competitive.summary || "N/A"}

[RECENT NEWS]
${Array.isArray(newsList) ? newsList.map(n => `• ${n.title}`).join("\n") : "N/A"}

[SUMMARY]
${summary}

[CANDIDATE]
Name: ${userName || "Candidate"}
Achievements: ${achievements || "N/A"}
Job Description: ${jobDescription || "N/A"}

Requirements:
• Include recent company news
• Include mission-values alignment
• Mention products or initiatives
• Reference competitive landscape
• Add industry context (size, industry)
• Incorporate 2-3 quantifiable achievements
• Professional tone, 3–5 paragraphs
${variationInstruction}
`;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: [{ type: "input_text", text: userPrompt }] },
      ],
      max_output_tokens: 900,
    });

    const letter =
      response.output?.[0]?.content?.[0]?.text ||
      "Error: AI model returned no content.";

    res.json({ success: true, letter });
  } catch (err) {
    console.error("❌ AI Cover Letter Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI cover letter",
    });
  }
});


/* ==============================
   UC-057 — SAVE AI-GENERATED COVER LETTER
============================== */
router.post("/save-ai", async (req, res) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({
        success: false,
        message: "Missing user_id or content for saving cover letter",
      });
    }

    const result = await pool.query(
      `INSERT INTO cover_letters (user_id, name, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, title || "AI Cover Letter", content]
    );

    res.json({ success: true, saved: result.rows[0] });
  } catch (err) {
    console.error("❌ Error saving AI cover letter:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save AI cover letter",
    });
  }
});
/* ==============================
   UC-057 — GET SAVED AI COVER LETTERS
============================== */
router.get("/saved/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, name, content, created_at
       FROM cover_letters
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, letters: result.rows });
  } catch (err) {
    console.error("❌ Error fetching saved AI letters:", err);
    res.status(500).json({ success: false, message: "Failed to fetch letters" });
  }
});
/* ==============================
   UC-057 — DELETE SAVED AI LETTER
============================== */
router.delete("/saved/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM cover_letters WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting AI letter:", err);
    res.status(500).json({ success: false, message: "Failed to delete letter" });
  }
});
/* ==============================
   UC-057 — EDIT SAVED AI LETTER
============================== */
router.put("/saved/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { content, name } = req.body;

    const result = await pool.query(
      `UPDATE cover_letters 
       SET content = $1, name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [content, name || "Updated Cover Letter", id]
    );

    res.json({ success: true, updated: result.rows[0] });
  } catch (err) {
    console.error("❌ Error editing AI letter:", err);
    res.status(500).json({ success: false, message: "Failed to update letter" });
  }
});

export default router;
