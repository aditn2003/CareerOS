// backend/routes/coverLetterAI.js
import express from "express";
import { auth } from "../auth.js";
import OpenAI from "openai";
import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================================================
   UC-058 + UC-059 Cover Letter + Experience Highlighting
============================================================ */

router.post("/generate", auth, async (req, res) => {
  try {
    const {
      jobTitle: rawJobTitle,
      companyName: rawCompanyName,
      userProfile: rawUserProfile,

      companyResearch,
      companyNews,

      // From older aiForm
      targetRole,
      company,
      jobDescription,
      achievements,
      userName,

      // UC-058
      tone = "formal",
      style = "direct",
      length = "standard",
      culture = "corporate",
      industry = "",
      personality = "balanced",
      customToneInstructions = "",
    } = req.body;

    // Normalize naming
    const jobTitle = rawJobTitle || targetRole || "Target Role";
    const companyNameSafe = rawCompanyName || company || "the company";

    // Normalize userProfile
    const userProfile =
      rawUserProfile || (req.user ? { id: req.user.id } : null);

    const research =
      companyResearch ||
      (jobDescription
        ? `Job Description:\n${jobDescription}`
        : "Company research unavailable.");

    const news = companyNews || "No recent news found.";

    /* ============================================================
       UC-059 — FETCH EMPLOYMENT FROM DB
    ============================================================= */
    let experiences = [];

    if (userProfile?.id) {
      try {
        const expResult = await pool.query(
          `
          SELECT role, company, start_date, end_date,
                 responsibilities, achievements, skills
          FROM employment
          WHERE user_id = $1
          ORDER BY start_date DESC
        `,
          [userProfile.id]
        );
        experiences = expResult.rows || [];
      } catch (err) {
        console.log("⚠️ Employment fetch failed:", err.message);
      }
    }

    const experienceSource =
      experiences.length > 0
        ? `EMPLOYMENT RECORDS:\n${JSON.stringify(experiences, null, 2)}`
        : achievements
        ? `USER-TYPED ACHIEVEMENTS:\n${achievements}`
        : "No structured experience data found.";

    /* ============================================================
       ⭐ UC-059 Experience Analysis — Guaranteed JSON Version
    ============================================================= */

    let expData = {
      summaryNarrative: "",
      topExperiences: [],
      quantifiedHighlights: [],
      relevanceScores: [],
      additionalRelevantExperiences: [],
      alternativePresentations: [],
    };

    const safeExperiencePrompt = `
You are an ATS hiring expert.

Analyze:
- Job title
- Company
- Job requirements
- User experience history (from DB)

Your task:
1. Summarize relevance.
2. List top relevant experiences.
3. Extract quantified achievements.
4. Score relevance (0–100).
5. Suggest additional relevant experiences.
6. Provide alternative bullet phrasings.

⚠️ RETURN STRICT VALID JSON ONLY.
NO extra text.
NO markdown.
NO code fences.

FORMAT EXACTLY:

{
  "summaryNarrative": "string",
  "topExperiences": ["string","string"],
  "quantifiedHighlights": ["string","string"],
  "relevanceScores": [{"exp":"string","score":90}],
  "additionalRelevantExperiences": ["string"],
  "alternativePresentations": ["string"]
}

==================================================
JOB TITLE:
${jobTitle}

COMPANY:
${companyNameSafe}

CONTEXT / REQUIREMENTS:
${research}

USER EXPERIENCE:
${experienceSource}
`;

    try {
      const expAI = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [{ role: "user", content: safeExperiencePrompt }],
      });

      let raw = expAI.choices?.[0]?.message?.content?.trim() || "{}";

      // Remove accidental markdown like ```json
      if (raw.startsWith("```")) {
        raw = raw
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
      }

      try {
        const parsed = JSON.parse(raw);
        expData = { ...expData, ...parsed };
      } catch (jsonErr) {
        console.log("⚠️ JSON parse failed. GPT returned:", raw);
      }
    } catch (err) {
      console.log("⚠️ Experience analysis failed:", err.message);
    }

    /* ============================================================
       Main Cover Letter Prompt — 3 Variations
    ============================================================= */

    const mainPrompt = `
You are an expert career writer for ATS-optimized cover letters.

Generate **3 unique cover letter variations** for:

Role: ${jobTitle}
Company: ${companyNameSafe}

Use the UC-059 experience analysis below:

SUMMARY:
${expData.summaryNarrative}

TOP EXPERIENCES:
${expData.topExperiences.join("\n")}

QUANTIFIED HIGHLIGHTS:
${expData.quantifiedHighlights.join("\n")}

ADDITIONAL RELEVANT EXPERIENCES:
${expData.additionalRelevantExperiences.join("\n")}

ALTERNATIVE PRESENTATIONS:
${expData.alternativePresentations.join("\n")}

===================================================
COMPANY RESEARCH
===================================================
${research}

===================================================
NEWS
===================================================
${news}

===================================================
STYLE SETTINGS (UC-058)
===================================================
Tone: ${tone}
Style: ${style}
Length: ${length}
Culture Match: ${culture}
Industry: ${industry}
Personality: ${personality}
Custom Instructions: ${customToneInstructions}

===================================================
RETURN 3 VARIATIONS EXACTLY LIKE THIS:
---
COVER LETTER VARIATION #1
---
...
---
COVER LETTER VARIATION #2
---
...
---
COVER LETTER VARIATION #3
---
...
===================================================
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: mainPrompt }],
      temperature: 0.85,
      max_tokens: 1650,
    });

    const content = response.choices?.[0]?.message?.content || "";

    return res.json({
      success: true,
      content,
      expAnalysis: expData,
    });
  } catch (err) {
    console.error("❌ AI generation error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ============================================================
   UC-060 — REFINE EDITED COVER LETTER
============================================================ */
router.post("/refine", auth, async (req, res) => {
  try {
    const { text = "" } = req.body;

    if (!text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }

    // Basic readability estimate
    function estimateReadability(str) {
      const sentences = str.split(/[.!?]+/).filter(Boolean).length || 1;
      const words = str.split(/\s+/).filter(Boolean).length || 1;
      const syllables = Math.max(Math.round(words * 1.5), words);

      const score =
        206.835 -
        1.015 * (words / sentences) -
        84.6 * (syllables / words);

      return {
        flesch: Math.round(score),
        level:
          score >= 60 ? "Easy" : score >= 30 ? "Moderate" : "Difficult",
        words,
        sentences,
      };
    }

    const systemPrompt = `
You refine user-written cover letters.
Return STRICT JSON with keys:
- improved_text (string)
- restructuring_suggestions (array of strings)
- synonym_suggestions (array of { "original": string, "alternatives": [string] })
- style_tips (array of strings)
    `.trim();

    const userPrompt = `
COVER LETTER:
${text}
    `.trim();

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const parsed = JSON.parse(ai.choices[0].message.content || "{}");
    const improved = parsed.improved_text || text;

    return res.json({
      improved_text: improved,
      restructuring_suggestions: parsed.restructuring_suggestions || [],
      synonym_suggestions: parsed.synonym_suggestions || [],
      style_tips: parsed.style_tips || [],
      readability: estimateReadability(improved),
    });
  } catch (err) {
    console.error("❌ UC-060 refine error:", err);
    return res.status(500).json({ error: "Failed to refine cover letter." });
  }
});

export default router;
