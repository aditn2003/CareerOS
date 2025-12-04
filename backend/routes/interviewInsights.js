import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Factory function for dependency injection (for testing)
function createInterviewInsightsRoutes(supabaseClient = null, openaiApiKey = null, serpApiKey = null) {
  const router = express.Router();
  const OPENAI_KEY = openaiApiKey || process.env.OPENAI_API_KEY;
  const SERP_API_KEY = serpApiKey || process.env.SERP_API_KEY;

  // Use injected client or create default one
  let supabase;
  if (supabaseClient) {
    supabase = supabaseClient;
  } else {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-application-name': 'ats-interview-prep',
          },
        },
      }
    );
  }

  // Helper function to retry database operations
  async function retryDatabaseOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Check if it's a connection error
      if (error.code === 'XX000' || error.message?.includes('shutdown') || error.message?.includes('termination')) {
        console.warn(`⚠️ Database connection error (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error('Database connection failed after multiple retries');
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }
      
      // If it's not a connection error, throw immediately
      throw error;
    }
  }
  }

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
  "checklist": {
    "research": ["Verify: ...", "Research: ...", "Review: ..."],
    "technical": ["Prepare: ...", "Practice: ...", "Review: ..."],
    "logistics": ["Confirm: ...", "Test: ...", "Prepare: ..."],
    "attire": "Suggested attire based on company culture",
    "portfolio": ["Prepare: ...", "Review: ...", "Update: ..."],
    "confidence": ["Exercise: ...", "Practice: ...", "Review: ..."],
    "questions": ["Prepare question about: ...", "Ask about: ..."],
    "followUp": ["Send thank-you within: ...", "Follow up on: ...", "Connect via: ..."]
  }
}

STRICT RULES:
- Tailor EVERYTHING to BOTH the company AND the role.
- Questions must reflect the role (technical, behavioral, product, etc.).
- Stages must match what ${company} typically does for ${role}.
- Recommendations must be specific: tools, languages, systems, soft skills for that role.
- Timeline must be realistic for ${company} hiring this role.
- CHECKLIST REQUIREMENTS (UC-081):
  * research: Company research verification items (3-5 items)
  * technical: Role-specific technical preparation tasks (3-5 items for technical roles, 0-2 for non-technical)
  * logistics: Location, timing, technology setup verification (3-4 items)
  * attire: Specific attire suggestion based on ${company} culture (string)
  * portfolio: Work sample/portfolio preparation (2-4 items for creative/technical roles, 0-2 for others)
  * confidence: Confidence-building exercises and activities (3-4 items)
  * questions: Thoughtful questions to prepare for interviewer (3-5 items)
  * followUp: Post-interview follow-up task reminders (3-4 items)
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
  const userId = req.query.userId?.trim() || "1";

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

    // Check if there's a saved checklist for this user/company/role
    const userIdInt = parseInt(userId, 10);
    
    const { data: savedChecklist, error: fetchError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_checklist_items")
        .select("checklist_data")
        .eq("user_id", userIdInt)
        .eq("company", company)
        .eq("role", role)
        .single();
    });

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error("❌ Error fetching saved checklist:", fetchError);
    }

    if (savedChecklist && savedChecklist.checklist_data) {
      // Use saved checklist
      console.log(`✅ Using saved checklist for: ${company} (${role})`);
      ai.checklist = savedChecklist.checklist_data;
    } else {
      // Save the newly generated checklist
      console.log(`💾 Saving new checklist for: ${company} (${role})`);
      
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from("interview_checklist_items")
          .upsert({
            user_id: userIdInt,
            company,
            role,
            checklist_data: ai.checklist,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,company,role'
          });
        
        if (error) throw error;
        return { success: true };
      });
      
      console.log(`✅ Checklist saved successfully`);
    }

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
   UPDATED: Now accepts questionText and tracks practice_count
----------------------------------------------------- */
  router.post("/questions/practice", async (req, res) => {
  try {
    const { userId, questionId, questionText, questionCategory, response } = req.body;

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
    
    // Get practice count from existing record
    const { data: existing } = await supabase
      .from("practiced_questions")
      .select("practice_count")
      .eq("user_id", userIdInt)
      .eq("question_id", questionId)
      .single();
    
    const practiceCount = existing ? (existing.practice_count || 0) + 1 : 1;

    // Upsert the practiced question (insert or update if exists)
    const { data, error } = await supabase
      .from("practiced_questions")
      .upsert({
        user_id: userIdInt,
        question_id: questionId,
        question_text: questionText || null,
        question_category: questionCategory || null,
        response: response || null,
        response_length: responseLength,
        practice_count: practiceCount,
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

    console.log(`✅ Marked question ${questionId} as practiced for user ${userIdInt} (count: ${practiceCount})`);
    
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
        practiceCount: practiceCount,
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

/* -----------------------------------------------------
   🆕 UC-081: Toggle Checklist Item Completion
----------------------------------------------------- */
  router.post("/checklist/toggle", async (req, res) => {
  try {
    const { userId, company, role, category, item } = req.body;

    if (!userId || !company || !role || !item) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, company, role, item"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Check if item already exists
    const { data: existing } = await supabase
      .from("interview_checklist_completion")
      .select("*")
      .eq("user_id", userIdInt)
      .eq("company", company)
      .eq("role", role)
      .eq("checklist_item", item)
      .single();

    if (existing) {
      // Toggle completion status
      const newStatus = !existing.is_completed;
      const { data, error } = await supabase
        .from("interview_checklist_completion")
        .update({
          is_completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        return res.status(500).json({
          success: false,
          message: "Database error while updating checklist",
          error: error.message
        });
      }

      return res.json({
        success: true,
        data: {
          isCompleted: data.is_completed,
          completedAt: data.completed_at
        }
      });
    } else {
      // Create new checklist item
      const { data, error } = await supabase
        .from("interview_checklist_completion")
        .insert({
          user_id: userIdInt,
          company,
          role,
          checklist_category: category || "general",
          checklist_item: item,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        return res.status(500).json({
          success: false,
          message: "Database error while creating checklist item",
          error: error.message
        });
      }

      return res.json({
        success: true,
        data: {
          isCompleted: data.is_completed,
          completedAt: data.completed_at
        }
      });
    }
  } catch (err) {
    console.error("❌ Error toggling checklist:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle checklist item"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-081: Get Checklist Completion Status
----------------------------------------------------- */
  router.get("/checklist/status", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const company = req.query.company?.trim();
    const role = req.query.role?.trim();

    if (!userId || !company || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId=, ?company=, or ?role= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Get all completed items for this user/company/role
    const { data, error } = await supabase
      .from("interview_checklist_completion")
      .select("*")
      .eq("user_id", userIdInt)
      .eq("company", company)
      .eq("role", role)
      .eq("is_completed", true);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching checklist status",
        error: error.message
      });
    }

    // Convert to map for easy lookup
    const completedItems = {};
    (data || []).forEach((item) => {
      completedItems[item.checklist_item] = {
        completed: true,
        completedAt: item.completed_at
      };
    });

    return res.json({
      success: true,
      data: {
        userId: userIdInt,
        company,
        role,
        completedItems,
        totalCompleted: data?.length || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching checklist status:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch checklist status"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-081: Get Checklist Statistics
----------------------------------------------------- */
  router.get("/checklist/stats", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const company = req.query.company?.trim();
    const role = req.query.role?.trim();

    if (!userId || !company || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId=, ?company=, or ?role= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Get all checklist items for this user/company/role
    const { data, error } = await supabase
      .from("interview_checklist_completion")
      .select("*")
      .eq("user_id", userIdInt)
      .eq("company", company)
      .eq("role", role);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching checklist stats",
        error: error.message
      });
    }

    const items = data || [];
    const completed = items.filter(i => i.is_completed).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Category breakdown
    const categoryStats = {};
    items.forEach((item) => {
      const cat = item.checklist_category || "general";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, completed: 0 };
      }
      categoryStats[cat].total++;
      if (item.is_completed) {
        categoryStats[cat].completed++;
      }
    });

    return res.json({
      success: true,
      data: {
        userId: userIdInt,
        company,
        role,
        totalItems: total,
        completedItems: completed,
        percentage,
        categoryStats
      }
    });
  } catch (err) {
    console.error("❌ Error fetching checklist stats:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch checklist statistics"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-081: Regenerate Checklist
   Delete saved checklist to force generation of new one
----------------------------------------------------- */
  router.delete("/checklist/regenerate", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const company = req.query.company?.trim();
    const role = req.query.role?.trim();

    if (!userId || !company || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing ?userId=, ?company=, or ?role= parameter"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Delete saved checklist
    const { error } = await supabase
      .from("interview_checklist_items")
      .delete()
      .eq("user_id", userIdInt)
      .eq("company", company)
      .eq("role", role);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while deleting checklist",
        error: error.message
      });
    }

    console.log(`✅ Deleted saved checklist for ${company} (${role}) - will regenerate on next fetch`);

    return res.json({
      success: true,
      message: "Checklist will be regenerated on next load"
    });
  } catch (err) {
    console.error("❌ Error regenerating checklist:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to regenerate checklist"
    });
  }
});

  /* -----------------------------------------------------
     🆕 UC-082: Generate Follow-Up Email Template
  ----------------------------------------------------- */
  async function generateFollowUpTemplate(
  templateType,
  company,
  role,
  interviewerName,
  interviewerTitle,
  interviewDate,
  conversationHighlights
) {
  const prompt = `
You are generating a professional interview follow-up email template.

CONTEXT:
- Template Type: ${templateType}
- Company: ${company}
- Role: ${role}
- Interviewer: ${interviewerName}${interviewerTitle ? ` (${interviewerTitle})` : ''}
- Interview Date: ${interviewDate}
- Key Conversation Points: ${conversationHighlights?.join(', ') || 'General discussion'}

Generate a JSON response with this EXACT structure:

{
  "subjectLine": "Concise, professional subject line",
  "emailBody": "Full email body with proper formatting and line breaks",
  "suggestedTiming": {
    "sendDate": "YYYY-MM-DD",
    "timeOfDay": "Morning (9-11 AM)" or "Afternoon (1-3 PM)" or "Evening (4-6 PM)",
    "reasoning": "Why this timing is optimal"
  },
  "personalizationTips": [
    "Tip 1 for customizing this template",
    "Tip 2 for making it more personal"
  ],
  "dosList": ["Do this", "Do that"],
  "dontsList": ["Don't do this", "Don't do that"]
}

TEMPLATE TYPE GUIDELINES:

${templateType === 'thank_you' ? `
THANK YOU EMAIL (Send 24-48 hours after interview):
- Express genuine gratitude for their time
- Reference specific conversation points (${conversationHighlights?.[0] || 'technical discussion'})
- Reiterate interest in the role and company
- Mention something unique you learned about the company
- Keep it concise (3-4 paragraphs)
- End with enthusiasm and next steps
` : ''}

${templateType === 'status_inquiry' ? `
STATUS INQUIRY (Send 1-2 weeks after interview if no response):
- Polite and professional tone
- Acknowledge they're likely busy
- Briefly reiterate your interest
- Ask for timeline update
- Offer to provide additional information
- Keep it short and to the point
` : ''}

${templateType === 'feedback_request' ? `
FEEDBACK REQUEST (Send after receiving rejection):
- Thank them for the opportunity
- Express genuine interest in learning and growth
- Politely request constructive feedback
- Mention it will help your professional development
- Keep tone positive and forward-looking
- Don't sound bitter or entitled
` : ''}

${templateType === 'networking' ? `
NETWORKING FOLLOW-UP (Send after rejection to maintain relationship):
- Thank them for the interview experience
- Express desire to stay connected
- Mention specific insights you gained
- Ask to connect on LinkedIn
- Offer to be a resource if relevant
- Keep door open for future opportunities
` : ''}

IMPORTANT:
- Use [INTERVIEWER_NAME], [COMPANY], [ROLE] as placeholders
- Professional but warm tone
- No typos or grammatical errors
- Appropriate length for template type
- Include proper email formatting (line breaks, paragraphs)

Return ONLY valid JSON.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You generate professional, personalized interview follow-up email templates."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI Follow-Up Template Error:", err.message);
    return null;
  }
  }

  /* -----------------------------------------------------
     🆕 UC-082: DELETE /follow-up/:id
     Delete a follow-up template
  ----------------------------------------------------- */
  router.delete("/follow-up/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const userId = req.query.userId?.trim();

    if (isNaN(templateId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid template ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    const { error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .delete()
        .eq("id", templateId)
        .eq("user_id", userIdInt);
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while deleting template",
        error: error.message
      });
    }

    console.log(`✅ Deleted template ${templateId} for user ${userIdInt}`);

    return res.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting template:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete template"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-082: POST /follow-up/generate
   Generate follow-up email template
----------------------------------------------------- */
  router.post("/follow-up/generate", async (req, res) => {
  try {
    const {
      userId,
      company,
      role,
      templateType,
      interviewerName,
      interviewerTitle,
      interviewerEmail,
      interviewDate,
      conversationHighlights
    } = req.body;

    if (!userId || !company || !role || !templateType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, company, role, templateType"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Validate template type
    const validTypes = ['thank_you', 'status_inquiry', 'feedback_request', 'networking'];
    if (!validTypes.includes(templateType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    console.log(`🔄 Generating ${templateType} template for ${company} (${role})`);

    // Generate template with AI
    const template = await generateFollowUpTemplate(
      templateType,
      company,
      role,
      interviewerName || 'the interviewer',
      interviewerTitle,
      interviewDate || new Date().toISOString().split('T')[0],
      conversationHighlights
    );

    if (!template) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate template"
      });
    }

    // Calculate suggested send date
    let suggestedDate = new Date();
    switch (templateType) {
      case 'thank_you':
        suggestedDate.setDate(suggestedDate.getDate() + 1); // Next day
        break;
      case 'status_inquiry':
        suggestedDate.setDate(suggestedDate.getDate() + 10); // 10 days from now
        break;
      case 'feedback_request':
      case 'networking':
        suggestedDate.setDate(suggestedDate.getDate() + 2); // 2 days from now
        break;
    }

    // Save to database
    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .insert({
          user_id: userIdInt,
          company,
          role,
          template_type: templateType,
          template_content: template.emailBody,
          subject_line: template.subjectLine,
          interviewer_name: interviewerName || null,
          interviewer_title: interviewerTitle || null,
          interviewer_email: interviewerEmail || null,
          interview_date: interviewDate || null,
          conversation_highlights: conversationHighlights || [],
          suggested_send_date: template.suggestedTiming?.sendDate || suggestedDate.toISOString().split('T')[0],
          suggested_send_time: template.suggestedTiming?.timeOfDay || 'Morning (9-11 AM)'
        })
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while saving template",
        error: error.message
      });
    }

    console.log(`✅ Generated ${templateType} template (ID: ${data.id})`);

    return res.json({
      success: true,
      data: {
        ...data,
        personalizationTips: template.personalizationTips,
        dosList: template.dosList,
        dontsList: template.dontsList,
        timingReasoning: template.suggestedTiming?.reasoning
      }
    });
  } catch (err) {
    console.error("❌ Error generating follow-up template:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate follow-up template"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-082: GET /follow-up/templates
   Get all follow-up templates for user
----------------------------------------------------- */
  router.get("/follow-up/templates", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const company = req.query.company?.trim();

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
      .from("interview_follow_ups")
      .select("*")
      .eq("user_id", userIdInt)
      .order("created_at", { ascending: false });

    // Filter by company if provided
    if (company) {
      query = query.eq("company", company);
    }

    const { data, error } = await retryDatabaseOperation(async () => {
      return await query;
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching templates",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: {
        templates: data || [],
        total: data?.length || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching templates:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch templates"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-082: PUT /follow-up/:id/mark-sent
   Mark template as sent
----------------------------------------------------- */
  router.put("/follow-up/:id/mark-sent", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { userId } = req.body;

    if (isNaN(templateId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid template ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", templateId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while marking as sent",
        error: error.message
      });
    }

    console.log(`✅ Marked template ${templateId} as sent`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error marking template as sent:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to mark template as sent"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-082: PUT /follow-up/:id/track-response
   Track response to follow-up
----------------------------------------------------- */
  router.put("/follow-up/:id/track-response", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { userId, responseReceived, responseType, notes } = req.body;

    if (isNaN(templateId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid template ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .update({
          response_received: responseReceived || true,
          response_date: new Date().toISOString(),
          response_type: responseType || 'neutral',
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", templateId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while tracking response",
        error: error.message
      });
    }

    console.log(`✅ Tracked response for template ${templateId}: ${responseType}`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error tracking response:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to track response"
    });
  }
});

/* -----------------------------------------------------
   🆕 UC-082: GET /follow-up/stats
   Get follow-up statistics
----------------------------------------------------- */
  router.get("/follow-up/stats", async (req, res) => {
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

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .select("*")
        .eq("user_id", userIdInt);
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching stats",
        error: error.message
      });
    }

    const templates = data || [];
    const totalTemplates = templates.length;
    const sentTemplates = templates.filter(t => t.is_sent).length;
    const responsesReceived = templates.filter(t => t.response_received).length;
    const responseRate = sentTemplates > 0 
      ? Math.round((responsesReceived / sentTemplates) * 100) 
      : 0;

    // Break down by type
    const byType = {
      thank_you: templates.filter(t => t.template_type === 'thank_you').length,
      status_inquiry: templates.filter(t => t.template_type === 'status_inquiry').length,
      feedback_request: templates.filter(t => t.template_type === 'feedback_request').length,
      networking: templates.filter(t => t.template_type === 'networking').length
    };

    // Response types
    const byResponseType = {
      positive: templates.filter(t => t.response_type === 'positive').length,
      negative: templates.filter(t => t.response_type === 'negative').length,
      neutral: templates.filter(t => t.response_type === 'neutral').length,
      no_response: templates.filter(t => t.response_type === 'no_response').length
    };

    return res.json({
      success: true,
      data: {
        totalTemplates,
        sentTemplates,
        responsesReceived,
        responseRate,
        byType,
        byResponseType
      }
    });
  } catch (err) {
    console.error("❌ Error fetching follow-up stats:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics"
    });
  }
  });

  /* -----------------------------------------------------
   🆕 POST /follow-up/:templateId/send-email
   Send follow-up email to interviewer
----------------------------------------------------- */
  router.post("/follow-up/:templateId/send-email", async (req, res) => {
    try {
      const { templateId } = req.params;
      const { userId, interviewerEmail, editedSubject, editedContent, userEmail, userName } = req.body;

      if (!userId || !interviewerEmail) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userId, interviewerEmail"
        });
      }

      const userIdInt = parseInt(userId, 10);
      if (isNaN(userIdInt)) {
        return res.status(400).json({
          success: false,
          message: "userId must be a valid integer"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(interviewerEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }

      // Get template from database
      const { data: template, error: fetchError } = await retryDatabaseOperation(async () => {
        return await supabase
          .from("interview_follow_ups")
          .select("*")
          .eq("id", templateId)
          .eq("user_id", userIdInt)
          .single();
      });

      if (fetchError || !template) {
        return res.status(404).json({
          success: false,
          message: "Template not found"
        });
      }

      // Use edited content if provided, otherwise use template content
      const finalSubject = editedSubject || template.subject_line;
      const finalContent = editedContent || template.template_content;

      // Send email via Resend
      try {
        // Use EMAIL_FROM from .env (your verified domain email)
        const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        
        // Check if using default Resend test email (not verified)
        const isTestMode = fromEmail === "onboarding@resend.dev";
        
        // In test mode, check if recipient is the verified user email
        if (isTestMode && userEmail && interviewerEmail.toLowerCase() !== userEmail.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: "⚠️ Email domain not verified. In test mode, you can only send emails to your own email address. Please verify a domain at resend.com/domains or use your own email for testing.",
            testMode: true,
            userEmail: userEmail
          });
        }

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: interviewerEmail,
          subject: finalSubject,
          text: finalContent,
          html: `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; white-space: pre-wrap; line-height: 1.6;">${finalContent}</pre>`,
          replyTo: userEmail
        });

        if (emailError) {
          console.error("❌ Resend email error:", emailError);
          
          // Special handling for domain verification error
          if (emailError.message?.includes('verify a domain')) {
            return res.status(403).json({
              success: false,
              message: "⚠️ Email domain not verified. You can only send to your own email address in test mode. Please verify a domain at resend.com/domains or enter your own email address for testing.",
              error: emailError.message,
              testMode: true
            });
          }
          
          return res.status(500).json({
            success: false,
            message: "Failed to send email",
            error: emailError.message
          });
        }

        console.log("✅ Email sent successfully:", emailData);

        // Update template to mark as sent and store interviewer email
        const { data: updatedTemplate, error: updateError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from("interview_follow_ups")
            .update({
              is_sent: true,
              sent_at: new Date().toISOString(),
              interviewer_email: interviewerEmail
            })
            .eq("id", templateId)
            .eq("user_id", userIdInt)
            .select()
            .single();
        });

        if (updateError) {
          console.warn("⚠️ Email sent but failed to update template:", updateError.message);
          // Don't fail the request since email was sent
        }

        return res.json({
          success: true,
          message: "Email sent successfully!",
          data: {
            emailId: emailData?.id,
            template: updatedTemplate
          }
        });
      } catch (emailErr) {
        console.error("❌ Email send error:", emailErr);
        return res.status(500).json({
          success: false,
          message: "Failed to send email",
          error: emailErr.message
        });
      }
    } catch (err) {
      console.error("❌ Error in send-email endpoint:", err.message);
      return res.status(500).json({
        success: false,
        message: "Server error while sending email"
      });
    }
  });

  return router;
}

// Export default router (production use - maintains backward compatibility)
const router = createInterviewInsightsRoutes();

/* -----------------------------------------------------
   🆕 PUT /follow-up/:templateId/update-email
   Update interviewer email for a template
----------------------------------------------------- */
router.put("/follow-up/:templateId/update-email", async (req, res) => {
  try {
    const { templateId } = req.params;
    const { userId, interviewerEmail } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Validate email if provided
    if (interviewerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(interviewerEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }
    }

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_follow_ups")
        .update({ interviewer_email: interviewerEmail })
        .eq("id", templateId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error updating email:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update email"
    });
  }
});

export default router;
// Export factory function for testing
export { createInterviewInsightsRoutes };
