import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import { auth } from "../auth.js";
import multer from "multer";
import fs, { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph } from "docx";
import { renderTemplate } from "../utils/renderTemplate.js";
import puppeteer from "puppeteer";

dotenv.config();

/* ------------------------------------------------------------------
   ⚙️ Setup
------------------------------------------------------------------ */
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: "uploads/" });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, "..", "exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const UPLOAD_PREVIEW_DIR = path.resolve("uploads/resumes");
if (!fs.existsSync(UPLOAD_PREVIEW_DIR))
  fs.mkdirSync(UPLOAD_PREVIEW_DIR, { recursive: true });

let mammoth;
try {
  const mod = await import("mammoth");
  mammoth = mod.default || mod;
} catch {
  console.warn("⚠️ DOCX parsing disabled (mammoth not available)");
}

async function extractPdfText(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  let textContent = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    textContent += content.items.map((t) => t.str).join(" ") + "\n";
  }
  return textContent.trim();
}

function basicSectionParser(text = "") {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    summary: {
      full_name: lines[0] || "",
      title: "",
      contact: { email: "", phone: "", location: "" },
      bio: lines.slice(1, 5).join(" "),
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

function normalizeSections(sections = {}) {
  const normalized = { ...sections };
  const arrayKeys = [
    "experience",
    "education",
    "projects",
    "certifications",
    "skills",
  ];

  for (const key of arrayKeys) {
    let val = normalized[key];
    if (!val) {
      normalized[key] = [];
      continue;
    }

    if (!Array.isArray(val)) {
      if (typeof val === "object") val = [val];
      else if (typeof val === "string")
        val = val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      else val = [];
    }

    normalized[key] = val.map((item) => {
      if (typeof item !== "object") return item;
      const clean = { ...item };
      delete clean.id;
      delete clean.user_id;
      delete clean.created_at;
      delete clean.updated_at;
      return clean;
    });
  }

  // Summary is an object; make sure it's there
  normalized.summary =
    normalized.summary && typeof normalized.summary === "object"
      ? normalized.summary
      : {
          full_name: "",
          title: "",
          contact: { email: "", phone: "", location: "" },
          bio: "",
        };

  return normalized;
}

// Map UI names to file basenames (just in case)
function toTemplateFileBase(name = "") {
  const n = (name || "").toLowerCase().trim();
  // normalize spaces to dashes
  const dashed = n.replace(/\s+/g, "-");
  // explicit mapping if you ever change UI labels
  const map = {
    "ats optimized": "ats-optimized",
    "two column": "two-column",
    professional: "professional",
    creative: "creative",
  };
  return map[n] || dashed;
}

// Flatten `{sections}` into top-level fields expected by .hbs
function flattenForTemplate(sections) {
  return {
    summary: sections.summary || {},
    experience: sections.experience || [],
    education: sections.education || [],
    skills: sections.skills || [],
    projects: sections.projects || [],
    certifications: sections.certifications || [],
  };
}

router.get("/test", (_req, res) =>
  res.json({ ok: true, message: "Resume routes reachable ✅" })
);

router.get("/templates", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM resume_templates WHERE user_id=$1 OR user_id IS NULL ORDER BY is_default DESC, name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading templates:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      title,
      template_id = 1,
      template_name = "Professional",
      template_file = "ats-optimized", // ✅ added: specify template explicitly
      sections,
      format = "pdf",
    } = req.body;

    if (!title || !sections) {
      return res.status(400).json({ error: "Missing title or sections" });
    }

    // 🔹 Normalize structure
    sections = normalizeSections(sections);

    // 🔹 Save or update DB entry
    const { rows: existing } = await pool.query(
      "SELECT id FROM resumes WHERE user_id=$1 AND title=$2",
      [userId, title]
    );

    let resumeId;
    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE resumes
         SET sections=$1, template_id=$2, template_name=$3, format=$4, updated_at=NOW()
         WHERE id=$5 RETURNING id`,
        [sections, template_id, template_name, format, existing[0].id]
      );
      resumeId = rows[0].id;
    } else {
      const { rows } = await pool.query(
        `INSERT INTO resumes (user_id, title, template_id, template_name, sections, format, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
        [userId, title, template_id, template_name, sections, format]
      );
      resumeId = rows[0].id;
    }

    // ✅ Build flattened data for Handlebars template
    const resumeData = {
      user_id: userId,
      title,
      ...flattenForTemplate(sections), // ✅ expands summary, experience, etc.
    };

    // ✅ Choose which .hbs to use (ATS or Professional)
    const templateFile = template_file;
    const outputPath = path.join(
      UPLOAD_PREVIEW_DIR,
      `${userId}_${resumeId}.pdf`
    );
    console.log("🧩 Using template:", templateFile);

    // ✅ Render the resume
    await renderTemplate(templateFile, resumeData, outputPath);

    // ✅ Save preview URL
    const previewUrl = `/uploads/resumes/${userId}_${resumeId}.pdf`;
    await pool.query(`UPDATE resumes SET preview_url=$1 WHERE id=$2`, [
      previewUrl,
      resumeId,
    ]);

    // ✅ Send response
    res.json({
      message: "✅ Resume saved successfully",
      resume: {
        id: resumeId,
        title,
        template_name,
        template_file,
        preview_url: previewUrl,
      },
    });
  } catch (err) {
    console.error("❌ Save resume error:", err);
    res.status(500).json({ error: err.message || "Failed to save resume" });
  }
});

router.get("/preview/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_PREVIEW_DIR, req.params.filename);
  if (!fs.existsSync(filePath))
    return res.status(404).send("Preview not found");
  res.sendFile(filePath);
});

router.get("/from-profile", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (t, p) => pool.query(t, p);

    const [profile, employment, education, skills, projects, certs] =
      await Promise.all([
        q("SELECT * FROM profiles WHERE user_id=$1", [userId]),
        q(
          "SELECT * FROM employment WHERE user_id=$1 ORDER BY start_date DESC",
          [userId]
        ),
        q(
          "SELECT * FROM education WHERE user_id=$1 ORDER BY graduation_date DESC NULLS LAST",
          [userId]
        ),
        q("SELECT * FROM skills WHERE user_id=$1 ORDER BY category, name", [
          userId,
        ]),
        q("SELECT * FROM projects WHERE user_id=$1 ORDER BY start_date DESC", [
          userId,
        ]),
        q(
          "SELECT * FROM certifications WHERE user_id=$1 ORDER BY date_earned DESC NULLS LAST",
          [userId]
        ),
      ]);

    const p = profile.rows[0] || {};

    const sections = normalizeSections({
      summary: {
        full_name: p.full_name || "",
        title: p.title || "",
        contact: {
          email: p.email || "",
          phone: p.phone || "",
          location: p.location || "",
        },
        bio: p.bio || "",
      },
      experience: employment.rows,
      education: education.rows,
      skills: skills.rows,
      projects: projects.rows,
      certifications: certs.rows,
    });

    res.json({
      message: "✅ Draft resume sections generated successfully",
      sections,
      title: "Profile-based Resume",
    });
  } catch (err) {
    console.error("❌ Error building draft resume:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to build resume draft" });
  }
});

router.post("/import", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let textContent = "";

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      textContent = await extractPdfText(buffer);
    } else if (ext === ".docx") {
      if (!mammoth)
        return res.status(400).json({ error: "DOCX parsing not available" });
      const { value } = await mammoth.extractRawText({ path: filePath });
      textContent = value;
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    fs.unlinkSync(filePath);

    const prompt = `
🚨 CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Your response MUST start with { and end with }
3. Extract ALL information exactly as it appears
4. Pay special attention to technologies, tools, and skills mentioned
5. Preserve bullet points by separating them with \\n (newline character)

You are a resume parser. Extract and structure data from this resume into JSON.
Return only JSON in this exact structure (no extra text):

{
  "summary": {
    "full_name": "string (REQUIRED - extract from top of resume)",
    "title": "string (job title or professional headline like 'Data Analyst' or 'Software Engineer')",
    "contact": { 
      "email": "string (REQUIRED - look for @ symbol)",
      "phone": "string (look for phone numbers, include country code if present)",
      "location": "string (city, state, or country)"
    },
    "bio": "string (professional summary or objective, 2-4 sentences)"
  },
  "experience": [
    {
      "title": "string (job title - REQUIRED)",
      "company": "string (company name - REQUIRED)",
      "location": "string (city, state)",
      "start_date": "YYYY-MM-DD (convert dates like 'Sep 2024' to '2024-09-01')",
      "end_date": "YYYY-MM-DD or null if current position",
      "current": boolean (true if still working here, false otherwise),
      "description": "string (ALL bullet points separated by \\n. Each line should start with •. Example: '• Built pipeline\\n• Optimized queries\\n• Collaborated with team')"
    }
  ],
  "education": [
    {
      "institution": "string (university/college name - REQUIRED)",
      "degree_type": "string (BS, MS, PhD, etc.)",
      "field_of_study": "string (major like 'Computer Science', 'Data Science')",
      "education_level": "string (Bachelor's, Master's, PhD)",
      "graduation_date": "YYYY-MM-DD (expected or actual graduation date)",
      "gpa": "string (if mentioned, e.g., '3.79')",
      "honors": "string (Dean's List, scholarships, awards - combine all into one string)",
      "currently_enrolled": boolean (true if still studying, false if graduated)
    }
  ],
  "skills": [
    "skill1",
    "skill2",
    "skill3"
  ],
  "projects": [
    {
      "name": "string (project title - REQUIRED)",
      "role": "string (Lead Dev, Developer, etc.)",
      "industry": "string (Data Science, Cybersecurity, Web Development, etc.)",
      "project_type": "string (Personal, Team, Academic, etc.)",
      "status": "string (Completed, In Progress, Planned)",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "technologies": [
        "tech1",
        "tech2",
        "tech3"
      ],
      "description": "string (ALL bullet points separated by \\n. Example: '• Built model\\n• Engineered pipeline\\n• Deployed app')",
      "repository_link": "string (GitHub, GitLab URL if mentioned)",
      "media_url": "string (demo URL, live site URL)"
    }
  ],
  "certifications": [
    {
      "name": "string (certification name)",
      "organization": "string (issuing organization like Microsoft, AWS, Google)",
      "category": "string (Technical, Business, etc.)",
      "cert_number": "string (credential ID if mentioned)",
      "date_earned": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD or null if doesn't expire",
      "does_not_expire": boolean (true if no expiration),
      "verified": boolean (false by default unless explicitly verified),
      "document_url": "string (credential URL if provided)"
    }
  ]
}

🎯 EXTRACTION GUIDELINES:

**For PROJECTS:**
- Look for section titled "Projects", "Personal Projects", "Portfolio"
- Extract technologies from:
  * Inline mentions (e.g., "Built with Python, React, SQL")
  * Parentheses (e.g., "Data Analysis Tool (Python, Pandas, NumPy)")
  * After keywords like "Technologies:", "Tech Stack:", "Tools:", "Built with:"
  * From bullet points mentioning specific tools
- Common technologies to look for: Python, JavaScript, React, Node.js, SQL, MongoDB, AWS, Docker, Kubernetes, TensorFlow, Pandas, NumPy, Scikit-learn, Tableau, Power BI, etc.
- Repository links: Look for "github.com", "gitlab.com", "bitbucket.org"

**For EXPERIENCE:**
- Preserve ALL bullet points with • prefix
- Each bullet on a new line (separated by \\n)
- Look for quantified metrics (e.g., "10M+ records", "25% improvement", "70+ students")
- Current position: Look for "Present", "Current", or no end date

**For EDUCATION:**
- currently_enrolled: true if "Expected 2026", "Pursuing", "Current", "In Progress"
- GPA: Look for numbers like "3.79", "3.8/4.0", "GPA: 3.79"
- Honors: Dean's List, scholarships, awards (combine into one string)

**For SKILLS:**
- Extract from dedicated Skills section
- Also extract technical skills mentioned in experience/projects
- Remove duplicates
- Common categories: Programming Languages, Databases, Tools, Frameworks, Cloud Platforms

**For DATES:**
- Convert all dates to YYYY-MM-DD format
- "Sep 2024" → "2024-09-01"
- "September 2024" → "2024-09-01"
- "2024" → "2024-01-01"
- "Present" or "Current" → set end_date to null and current: true

Resume text:
${textContent}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let structured;
    try {
      structured = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json|```/g, "").trim();
      structured = JSON.parse(cleaned);
    }

    structured = normalizeSections(structured);

    res.json({
      message: "✅ Resume parsed successfully",
      sections: structured,
      preview: text.slice(0, 800),
    });
  } catch (err) {
    console.error("❌ Fatal import error:", err);
    res.status(500).json({ error: err.message || "Failed to parse resume" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, template_name, preview_url, created_at, format
       FROM resumes WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ resumes: rows });
  } catch (err) {
    console.error("❌ Fetch resumes error:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to load saved resumes" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM resumes WHERE id=$1 AND user_id=$2`, [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "✅ Resume deleted" });
  } catch (err) {
    console.error("❌ Delete resume error:", err);
    res.status(500).json({ error: err.message || "Failed to delete resume" });
  }
});

/* ------------------------------------------------------------------
   🔹 EXPORT (PDF/DOCX/TXT/HTML)
------------------------------------------------------------------ */
router.get("/:id/download", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM resumes WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Resume not found" });

    const resume = rows[0];
    const sections =
      typeof resume.sections === "string"
        ? normalizeSections(JSON.parse(resume.sections))
        : normalizeSections(resume.sections);

    const format = (resume.format || "pdf").toLowerCase();
    const base = path.join(
      EXPORT_DIR,
      `${resume.title}_${resume.id}`.replace(/[^\w\-]/g, "_")
    );

    if (format === "pdf") {
      const pdfPath = `${base}.pdf`;
      const baseName = toTemplateFileBase(resume.template_name);
      await renderTemplate(baseName, flattenForTemplate(sections), pdfPath);
      return res.download(pdfPath);
    }

    if (format === "docx") {
      const children = [
        new Paragraph({ text: resume.title, heading: "Heading1" }),
      ];
      for (const [k, v] of Object.entries(sections)) {
        children.push(
          new Paragraph({ text: k.toUpperCase(), heading: "Heading2" })
        );
        children.push(new Paragraph({ text: JSON.stringify(v, null, 2) }));
      }
      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      const docxPath = `${base}.docx`;
      fs.writeFileSync(docxPath, buffer);
      return res.download(docxPath);
    }

    if (format === "txt") {
      const txtPath = `${base}.txt`;
      const sectionsToText = () =>
        Object.entries(sections)
          .map(([k, v]) => `${k.toUpperCase()}\n${JSON.stringify(v, null, 2)}`)
          .join("\n\n");
      fs.writeFileSync(txtPath, sectionsToText());
      return res.download(txtPath);
    }

    if (format === "html") {
      const htmlPath = `${base}.html`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${
        resume.title
      }</title></head><body><h1>${resume.title}</h1>${Object.entries(sections)
        .map(
          ([k, v]) =>
            `<h2>${k.toUpperCase()}</h2><pre>${JSON.stringify(
              v,
              null,
              2
            )}</pre>`
        )
        .join("")}</body></html>`;
      fs.writeFileSync(htmlPath, html);
      return res.download(htmlPath);
    }

    return res.status(400).json({ error: "Unsupported format" });
  } catch (err) {
    console.error("❌ Download resume error:", err);
    res.status(500).json({ error: err.message || "Failed to export resume" });
  }
});

// ============================================================
// ✅ ENHANCED: AI Resume Optimization with Relevance Scoring
// ============================================================
router.post("/optimize", auth, async (req, res) => {
  try {
    const { sections, jobDescription } = req.body;

    if (!sections || !jobDescription)
      return res.status(400).json({
        error: "Missing resume sections or job description.",
      });

    const prompt = `
You are an expert ATS resume optimizer and professional copywriter with expertise in quantifying achievements.

Analyze the job description and the candidate's resume data below, then generate *actual rewritten content* with relevance scoring and quantified accomplishments.

Return JSON with this exact structure:
{
  "summary_recommendation": "the full rewritten summary paragraph, ready to use",
  "optimized_experience": [
    {
      "role": "string (job title)",
      "company": "string",
      "relevance_score": 85,
      "relevance_reasoning": "Brief explanation of why this role is relevant to the target job",
      "relevant_keywords": ["keyword1", "keyword2"],
      "bullets": [
        {
          "text": "Rewritten bullet point with QUANTIFIED metrics (e.g., 'Increased sales by 30%', 'Led team of 5 engineers', 'Reduced costs by $50K')",
          "is_relevant": true,
          "highlight_reason": "Why this accomplishment matters for the target job"
        }
      ],
      "quantification_notes": "Suggestions for adding metrics if original lacked them"
    }
  ],
  "optimized_skills": [
    { 
      "skill": "string", 
      "reason": "why it's relevant",
      "priority": "high|medium|low"
    }
  ],
  "ats_keywords": ["keyword1", "keyword2", ...],
  "variation_options": [
    "alternative summary wording version 1",
    "alternative summary wording version 2"
  ]
}

CRITICAL REQUIREMENTS:
1. **Relevance Score (0-100)**: Score each experience entry based on how well it matches the job requirements
2. **Quantify Everything**: Transform vague statements into quantified achievements. Examples:
   - "Managed a team" → "Led a team of 8 engineers"
   - "Improved performance" → "Improved system performance by 40%"
   - "Reduced costs" → "Reduced operational costs by $125K annually"
   - "Launched product" → "Launched product used by 50K+ users"
3. **Highlight Relevance**: Mark which bullet points are most relevant and explain why
4. **Use Action Verbs**: Start bullets with strong action verbs (Spearheaded, Architected, Optimized, etc.)
5. **ATS Optimization**: Include exact keywords from job description

If the resume lacks metrics, suggest realistic quantifications based on typical industry standards for that role.

Keep the writing natural, professional, and achievement-focused.

Job Description:
${jobDescription}

User Resume (JSON):
${JSON.stringify(sections, null, 2)}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to parse AI JSON safely
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // if Gemini wrapped JSON in markdown
      const cleaned = text.replace(/```json|```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    res.json({ optimizedSections: data });
  } catch (err) {
    console.error("❌ AI optimization failed:", err);
    res.status(500).json({ error: "AI optimization failed" });
  }
});
// ✅ Normalize Gemini output into consistent resume schema
function normalizeGeminiOutput(ai) {
  if (!ai) return {};
  const norm = {};

  // Summary
  norm.summary = ai.summary || {
    full_name: "",
    title: "",
    bio: ai.summary_recommendation || "",
  };

  // Experience
  norm.experience = Array.isArray(ai.optimized_experience)
    ? ai.optimized_experience.map((e) => ({
        role: e.role || "",
        company: e.company || "",
        bullets: (e.bullets || []).map((b) =>
          typeof b === "string" ? b : b.text || ""
        ),
        relevance_score: e.relevance_score || null,
        relevance_reasoning: e.relevance_reasoning || "",
        keywords: e.relevant_keywords || [],
      }))
    : [];

  // Skills
  norm.skills = Array.isArray(ai.optimized_skills)
    ? ai.optimized_skills.map((s) => s.skill)
    : [];

  // Education / Projects (optional)
  norm.education = ai.education || [];
  norm.projects = ai.projects || [];

  return norm;
}

/* ------------------------------------------------------------------
   🤝 AI Merge / Reconciliation (Fixed for Experience)
------------------------------------------------------------------ */
router.post("/reconcile", auth, async (req, res) => {
  try {
    const { masterResume, aiSuggestions } = req.body;
    if (!masterResume || !aiSuggestions)
      return res
        .status(400)
        .json({ error: "Missing data for reconciliation." });

    // 🧠 Prompt Gemini to intelligently merge both resumes
    const prompt = `
You are an expert resume optimizer and structured data modeler.

Merge the two JSON resumes below into a single improved JSON.

Follow this structure strictly:
{
  "summary": {
    "full_name": "string",
    "title": "string",
    "bio": "string"
  },
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "current": boolean,
      "description": "string (concatenated bullet points)",
      "relevance_score": number,
      "relevance_reasoning": "string",
      "relevant_keywords": ["string", ...]
    }
  ],
  "education": [],
  "projects": [],
  "skills": ["string", ...]
}

Guidelines:
- Preserve factual data (dates, locations, company names) from masterResume.
- Use AI’s rewritten quantified bullet points as the description field (joined text).
- Keep relevance scores and keywords.
- Return pure JSON only — no markdown.

Master Resume:
${JSON.stringify(masterResume, null, 2)}

AI Suggestions:
${JSON.stringify(aiSuggestions, null, 2)}
`;

    // 🧩 Run Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();

    let reconciled;
    try {
      reconciled = JSON.parse(text);
    } catch (err) {
      console.warn("⚠️ Gemini JSON parse fallback");
      reconciled = JSON.parse(text.replace(/```|json/gi, "").trim());
    }

    // 🧠 Pick correct source of experience
    const expSource =
      Array.isArray(reconciled.experience) && reconciled.experience.length
        ? reconciled.experience
        : Array.isArray(reconciled.optimized_experience)
        ? reconciled.optimized_experience
        : Array.isArray(aiSuggestions.optimized_experience)
        ? aiSuggestions.optimized_experience
        : masterResume.experience || [];

    // 🧩 Normalize the merged schema to what frontend expects
    const normalized = {
      summary: reconciled.summary || {
        full_name: masterResume.summary?.full_name || "",
        title: masterResume.summary?.title || "",
        bio:
          reconciled.summary_recommendation || masterResume.summary?.bio || "",
      },
      experience: expSource.map((e) => ({
        title: e.title || e.role || "",
        company: e.company || "",
        location: e.location || masterResume.experience?.[0]?.location || "",
        start_date:
          e.start_date || masterResume.experience?.[0]?.start_date || null,
        end_date: e.end_date || masterResume.experience?.[0]?.end_date || null,
        current:
          typeof e.current === "boolean"
            ? e.current
            : masterResume.experience?.[0]?.current || false,
        description: Array.isArray(e.bullets)
          ? e.bullets
              .map((b) => (typeof b === "string" ? b : b.text || ""))
              .join("\n")
          : e.description || "",
        relevance_score: e.relevance_score || null,
        relevance_reasoning: e.relevance_reasoning || "",
        relevant_keywords: e.relevant_keywords || e.keywords || [],
      })),
      education:
        Array.isArray(reconciled.education) && reconciled.education.length
          ? reconciled.education
          : masterResume.education || [],
      projects:
        Array.isArray(reconciled.projects) && reconciled.projects.length
          ? reconciled.projects
          : masterResume.projects || [],
      skills:
        Array.isArray(reconciled.skills) && reconciled.skills.length
          ? reconciled.skills
          : aiSuggestions.optimized_skills?.map((s) => s.skill) ||
            masterResume.skills ||
            [],
    };

    console.log(
      "✅ Final merged experience count:",
      normalized.experience.length
    );

    res.json({ merged: normalized });
  } catch (err) {
    console.error("❌ Reconcile error:", err);
    res.status(500).json({ error: "Reconciliation failed" });
  }
});

export default router;
