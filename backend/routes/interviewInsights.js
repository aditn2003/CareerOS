import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const http = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent": "ATS-InterviewBot/1.0 (contact: team@ats.com)",
  },
});

/* -----------------------------------------------------
   Clean slug for Indeed URLs
----------------------------------------------------- */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* -----------------------------------------------------
   1. SERP — Google Search (now role-aware)
----------------------------------------------------- */
async function getSerpSnippets(company, role) {
  if (!SERP_API_KEY) {
    console.warn("⚠️ SERP_API_KEY missing. Returning fallback empty array.");
    return [];
  }

  const query = role
    ? `${company} ${role} interview questions process`
    : `${company} interview questions process`;

  try {
    const { data } = await http.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: SERP_API_KEY,
        num: 8,
      },
    });

    const arr = [];
    (data.organic_results || []).forEach((r) => {
      if (r.title || r.snippet)
        arr.push(`${r.title || ""} — ${r.snippet || ""}`.trim());
    });

    return arr;
  } catch (err) {
    console.error("❌ SERP API error:", err.message);
    return [];
  }
}

/* -----------------------------------------------------
   2. Indeed Scrape (still useful even without role)
----------------------------------------------------- */
async function scrapeIndeed(company) {
  const slug = slugify(company);
  const urls = [
    `https://www.indeed.com/cmp/${slug}/interviews`,
    `https://www.indeed.com/cmp/${slug}/interviews?from=tab`,
  ];

  for (const url of urls) {
    try {
      const { data } = await http.get(url);
      const $ = cheerio.load(data);

      const parts = [];
      $("h2, h3, p, li").each((i, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) parts.push(t);
      });

      if (parts.length > 0) return parts.slice(0, 60).join("\n");
    } catch {}
  }

  return "";
}

/* -----------------------------------------------------
   3. Reddit + Glassdoor (now also role-aware)
----------------------------------------------------- */
async function getCommunitySnippets(company, role) {
  if (!SERP_API_KEY) return [];

  const query = role
    ? `${company} ${role} interview experience reddit OR glassdoor`
    : `${company} interview experience reddit OR glassdoor`;

  try {
    const { data } = await http.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: SERP_API_KEY,
        num: 6,
      },
    });

    const arr = [];
    (data.organic_results || []).forEach((r) => {
      if (r.snippet) arr.push(r.snippet);
    });

    return arr;
  } catch (err) {
    console.error("❌ Community SERP error:", err.message);
    return [];
  }
}

/* -----------------------------------------------------
   4. OpenAI Role-Aware Enrichment
----------------------------------------------------- */
async function enrichInterviewInsights(company, role, serp, indeed, community) {
  const context = `
Company: ${company}
Role: ${role || "N/A"}

=== Google Results ===
${serp.join("\n\n")}

=== Indeed Snippets ===
${indeed}

=== Reddit / Glassdoor ===
${community.join("\n\n")}
`;

  const prompt = `
You are generating REALISTIC INTERVIEW INSIGHTS for a candidate applying to:

Company: "${company}"
Role: "${role || "General"}"

Using all provided data, produce JSON in EXACTLY this shape:

{
  "company": "...",
  "role": "...",
  "process": "...",
  "stages": ["..."],
  "questions": ["..."],
  "interviewers": ["..."],
  "format": "...",
  "recommendations": ["..."],
  "timeline": "...",
  "tips": ["..."],
  "checklist": ["..."]
}

STRICT RULES:
- Tailor EVERYTHING to BOTH the company AND the role.
- Questions must reflect the role (technical, behavioral, product, etc.).
- Stages must match what ${company} typically does for ${role}.
- Recommendations must be specific: tools, languages, systems, soft skills for that role.
- Timeline must be realistic for ${company} hiring this role.
- Checklist must contain high-value preparation tasks tailored to ${role}.
- No filler. No vague content.
- ALWAYS return valid JSON only.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You generate highly accurate, role-specific interview preparation content.",
          },
          { role: "user", content: context },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI Interview Insights Error:", err.message);
    return null;
  }
}

/* -----------------------------------------------------
   🆕 UC-075: Generate Role-Specific Question Bank with Difficulty Levels
----------------------------------------------------- */
async function generateQuestionBank(role, industry, difficulty) {
  if (!OPENAI_KEY) {
    // Return fallback questions with difficulty levels
    return {
      behavioral: [
        { id: "beh-1", question: "Tell me about a time you overcame a significant challenge.", category: "behavioral", difficulty: "entry", framework: "STAR" },
        { id: "beh-2", question: "Describe a situation where you had to work with a difficult team member.", category: "behavioral", difficulty: "mid", framework: "STAR" },
        { id: "beh-3", question: "Tell me about a time you led a cross-functional initiative with ambiguous requirements.", category: "behavioral", difficulty: "senior", framework: "STAR" }
      ],
      technical: [
        { id: "tech-1", question: "Explain the basics of your primary programming language.", category: "technical", difficulty: "entry" },
        { id: "tech-2", question: "How would you optimize a slow database query?", category: "technical", difficulty: "mid" },
        { id: "tech-3", question: "Design a scalable system architecture for a high-traffic application.", category: "technical", difficulty: "senior" }
      ],
      situational: [
        { id: "sit-1", question: "How would you handle missing a deadline?", category: "situational", difficulty: "entry" },
        { id: "sit-2", question: "What would you do if you discovered a critical security flaw before a major release?", category: "situational", difficulty: "mid" },
        { id: "sit-3", question: "How would you approach pivoting team strategy when market conditions change rapidly?", category: "situational", difficulty: "senior" }
      ]
    };
  }

  const prompt = `
Generate a comprehensive interview question bank for:

Role: ${role || "General"}
Industry: ${industry || "Technology"}
Difficulty Filter: ${difficulty || "all"}

Return JSON with EXACTLY this structure:

{
  "behavioral": [
    {
      "id": "unique-id",
      "question": "...",
      "category": "behavioral",
      "difficulty": "entry|mid|senior",
      "framework": "STAR",
      "sample_structure": "Situation: ... Task: ... Action: ... Result: ..."
    }
  ],
  "technical": [
    {
      "id": "unique-id", 
      "question": "...",
      "category": "technical",
      "difficulty": "entry|mid|senior",
      "concepts": ["concept1", "concept2"],
      "skills_tested": ["skill1", "skill2"]
    }
  ],
  "situational": [
    {
      "id": "unique-id",
      "question": "...",
      "category": "situational", 
      "difficulty": "entry|mid|senior",
      "focus_areas": ["problem-solving", "decision-making"]
    }
  ],
  "company_specific": [
    {
      "id": "unique-id",
      "question": "...",
      "category": "company_specific",
      "difficulty": "entry|mid|senior",
      "context": "Why this matters for this role"
    }
  ]
}

DIFFICULTY LEVELS:
- entry: For junior positions, foundational concepts, basic scenarios
- mid: For mid-level positions, complex scenarios, deeper technical knowledge
- senior: For senior positions, leadership scenarios, system design, strategic thinking

REQUIREMENTS:
- Generate 5-7 questions per category
- Each question MUST have a difficulty level
- Technical questions must be role-specific
- Behavioral questions must use STAR framework guidance
- Company-specific questions should relate to industry challenges
- ${difficulty && difficulty !== "all" ? `ONLY include ${difficulty} level questions` : "Include questions across all difficulty levels"}
- Return valid JSON only
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert interview preparation coach creating role-specific question banks." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ Error generating question bank:", err.message);
    return {
      behavioral: [],
      technical: [],
      situational: [],
      company_specific: []
    };
  }
}

/* -----------------------------------------------------
   MAIN ROUTE — NOW ROLE AWARE
----------------------------------------------------- */
router.get("/", async (req, res) => {
  const company = req.query.company?.trim();
  const role = req.query.role?.trim() || "";

  if (!company)
    return res.status(400).json({ success: false, message: "Missing ?company=" });

  console.log(`🔍 Generating interview insights for: ${company} | Role: ${role}`);

  try {
    const [serp, indeed, community] = await Promise.all([
      getSerpSnippets(company, role),
      scrapeIndeed(company),
      getCommunitySnippets(company, role),
    ]);

    const ai = await enrichInterviewInsights(company, role, serp, indeed, community);

    if (!ai)
      return res.status(500).json({ success: false, message: "AI generation failed" });

    console.log(`✅ Completed interview insights for: ${company} (${role})`);
    return res.json({ success: true, data: ai });
  } catch (err) {
    console.error("❌ Interview endpoint error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate interview insights.",
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-075: Get Question Bank by Role/Industry/Difficulty
----------------------------------------------------- */
router.get("/questions", async (req, res) => {
  const role = req.query.role?.trim() || "";
  const industry = req.query.industry?.trim() || "Technology";
  const difficulty = req.query.difficulty?.trim() || "all";

  if (!role) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing ?role= parameter" 
    });
  }

  console.log(`🔍 Generating question bank for: ${role} | Industry: ${industry} | Difficulty: ${difficulty}`);

  try {
    const questionBank = await generateQuestionBank(role, industry, difficulty);
    
    console.log(`✅ Generated question bank for ${role}`);
    return res.json({ 
      success: true, 
      data: {
        role,
        industry,
        difficulty,
        questionBank
      }
    });
  } catch (err) {
    console.error("❌ Question bank error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate question bank.",
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-075: Track Practiced Questions with Supabase
----------------------------------------------------- */
router.post("/questions/practice", async (req, res) => {
  try {
    const { userId, questionId, questionCategory, response } = req.body;

    if (!userId || !questionId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or questionId"
      });
    }

    // Convert userId to integer
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Calculate response length
    const responseLength = response ? response.length : 0;

    // Upsert the practiced question (insert or update if exists)
    const { data, error } = await supabase
      .from("practiced_questions")
      .upsert({
        user_id: userIdInt,
        question_id: questionId,
        question_category: questionCategory || null,
        response: response || null,
        response_length: responseLength,
        practiced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,question_id'
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while tracking question",
        error: error.message
      });
    }

    console.log(`✅ Marked question ${questionId} as practiced for user ${userIdInt}`);
    
    // Get total practiced count
    const { count } = await supabase
      .from("practiced_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userIdInt);

    return res.json({
      success: true,
      message: "Question marked as practiced",
      data: {
        questionId,
        practicedAt: data.practiced_at,
        totalPracticed: count || 0
      }
    });
  } catch (err) {
    console.error("❌ Error tracking practiced question:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to track practiced question"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-075: Get User's Practiced Questions from Supabase
----------------------------------------------------- */
router.get("/questions/practiced", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const category = req.query.category?.trim(); // Optional filter by category

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Build query
    let query = supabase
      .from("practiced_questions")
      .select("*")
      .eq("user_id", userIdInt)
      .order("practiced_at", { ascending: false });

    // Add category filter if provided
    if (category) {
      query = query.eq("question_category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching practiced questions",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: {
        userId: userIdInt,
        category: category || "all",
        practicedQuestions: data || [],
        totalPracticed: data?.length || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching practiced questions:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch practiced questions"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-075: Get Practice Statistics from Supabase
----------------------------------------------------- */
router.get("/questions/stats", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Get all practiced questions for this user
    const { data, error } = await supabase
      .from("practiced_questions")
      .select("*")
      .eq("user_id", userIdInt);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching statistics",
        error: error.message
      });
    }

    const practicedQuestions = data || [];
    const totalPracticed = practicedQuestions.length;

    // Calculate statistics
    let withResponses = 0;
    let totalResponseLength = 0;
    const categoryBreakdown = {};

    practicedQuestions.forEach((q) => {
      if (q.response && q.response.trim().length > 0) {
        withResponses++;
        totalResponseLength += q.response_length || 0;
      }

      // Track by category
      const cat = q.question_category || "uncategorized";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    const averageResponseLength = withResponses > 0 
      ? Math.round(totalResponseLength / withResponses) 
      : 0;

    return res.json({
      success: true,
      data: {
        userId: userIdInt,
        totalPracticed,
        withResponses,
        withoutResponses: totalPracticed - withResponses,
        averageResponseLength,
        categoryBreakdown
      }
    });
  } catch (err) {
    console.error("❌ Error fetching practice stats:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch practice statistics"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-075: Delete Practiced Question
----------------------------------------------------- */
router.delete("/questions/practice/:questionId", async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.query.userId?.trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    const { error } = await supabase
      .from("practiced_questions")
      .delete()
      .eq("user_id", userIdInt)
      .eq("question_id", questionId);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while deleting question",
        error: error.message
      });
    }

    console.log(`✅ Deleted practiced question ${questionId} for user ${userIdInt}`);

    return res.json({
      success: true,
      message: "Practiced question deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting practiced question:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete practiced question"
    });
  }
});

export default router;