// backend/routes/salaryNegotiation.js
import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Factory function for dependency injection (for testing)
function createSalaryNegotiationRoutes(supabaseClient = null, openaiApiKey = null) {
  const router = express.Router();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const OPENAI_KEY = openaiApiKey || process.env.OPENAI_API_KEY;

  // Use injected client or create default one
  let supabase;
  if (supabaseClient) {
    supabase = supabaseClient;
  } else {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing Supabase credentials");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      },
      global: {
        fetch: (...args) => {
          return fetch(...args);
        }
      }
    });
  }

  /* ============================================================
     HELPER: Retry database operations
  ============================================================ */
  async function retryDatabaseOperation(operation, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = Math.pow(2, attempt) * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

  /* ============================================================
     AI: Generate Salary Negotiation Package
  ============================================================ */
  async function generateNegotiationPackage(
  company,
  role,
  location,
  experienceYears,
  currentSalary,
  offerAmount,
  marketData
) {
  const prompt = `
You are generating a HIGHLY PERSONALIZED salary negotiation package for a job candidate.

CONTEXT:
- Company: ${company}
- Role: ${role}
- Location: ${location}
- Years of Experience: ${experienceYears || 'Not provided'}
- Current Salary: ${currentSalary ? '$' + currentSalary : 'Not provided'}
- Offer Received: ${offerAmount ? '$' + offerAmount : 'Not yet received'}
- Market Data: ${JSON.stringify(marketData) || 'To be researched'}

CRITICAL PERSONALIZATION REQUIREMENTS:

1. **Company-Specific Insights** - Tailor strategy to THIS company:
   - If FAANG (Google, Meta, Amazon, Apple, Microsoft): Known for strong equity, rigid salary bands, emphasize total comp
   - If Startup: More base salary flexibility, equity value uncertain, negotiate signing bonus
   - If Mid-size Tech: Balance of flexibility, good benefits negotiation opportunity
   - If Recently Funded: Good time to negotiate, they're hiring aggressively
   - If Recent Layoffs: Emphasize stability, negotiate signing bonus over equity

2. **Role-Specific Leverage** - What matters for THIS role:
   - Senior/Staff: Can negotiate equity refresh grants, scope, team size
   - Mid-level: Focus on growth path, learning opportunities, base salary
   - Junior: Emphasize mentorship, training budget, PTO
   - ML/AI roles: High demand, strong leverage, mention scarcity
   - Management: Negotiate team size, budget authority, scope
   - IC roles: Focus on impact, autonomy, technical challenges

3. **Location-Specific Factors** - Adjust for THIS location:
   - SF/Bay Area: COL 2x national average, justify higher ask
   - NYC: Emphasize pre-tax transit benefits ($3K/year), higher COL
   - Remote: Negotiate home office stipend ($2-5K/year standard)
   - Low COL cities: Be realistic about lower market rates
   - Mention state tax implications if relevant (CA vs. TX)

4. **Offer-Specific Analysis** - Compare THEIR offer to market:
   - Calculate exact percentage above/below market median
   - Identify specific gaps (base, equity, benefits, PTO)
   - Provide concrete improvement targets with justification
   - Mention what's strong about their offer too (be fair)

CRITICAL INSTRUCTIONS:
1. ONLY mention skills, achievements, or qualifications that are EXPLICITLY provided in the context above
2. DO NOT invent or assume any skills - only use what's given
3. If no specific skills are provided, use GENERIC talking points about experience level and role
4. Calculate the recommended counter-offer as 10-20% above the offer amount
5. Make ALL sections specific to this company, role, location, and offer
6. Include CONCRETE numbers, percentages, and comparisons in your analysis

Generate a JSON response with this EXACT structure:

{
  "marketResearch": {
    "min": <calculate realistic minimum for ${role} in ${location} with ${experienceYears} years>,
    "median": <calculate realistic median>,
    "max": <calculate realistic maximum>,
    "percentile25": <calculate 25th percentile>,
    "percentile75": <calculate 75th percentile>,
    "sources": ["Glassdoor", "Levels.fyi", "LinkedIn Salary", "Payscale"],
    "analysis": "Detailed market analysis specifically for ${role} at ${company} in ${location}. Mention company-specific comp philosophy, role-level expectations, and location adjustments."
  },
  "companyInsights": {
    "companyType": "<Startup/Mid-size/FAANG/Enterprise>",
    "negotiationReputation": "Company-specific negotiation culture and what typically works",
    "currentSituation": "Recent funding, layoffs, hiring freeze, growth phase, etc.",
    "leveragePoints": "What gives you leverage with THIS company specifically",
    "compensationPhilosophy": "How this company typically structures compensation"
  },
  "roleInsights": {
    "demandLevel": "<High/Medium/Low> based on current market for ${role}",
    "roleSpecificLeverage": "What you can negotiate as a ${role} specifically",
    "typicalEquityRange": "Standard equity range for ${role} at ${experienceYears} years experience",
    "careerGrowth": "What to negotiate for career progression in this role",
    "marketTrends": "Current market trends affecting ${role} roles"
  },
  "locationInsights": {
    "costOfLiving": "Specific COL index for ${location} vs national average",
    "taxImplications": "State tax considerations for ${location}",
    "remoteFlexibility": "If location is mentioned, discuss remote/hybrid considerations",
    "localMarketFactors": "What affects ${role} salaries in ${location} specifically"
  },
  "offerAnalysis": {
    "baseSalaryGap": "<calculate exact % above/below market median>",
    "equityComparison": "If equity mentioned, compare to typical range",
    "benefitsAssessment": "Strong points and gaps in their offer",
    "overallAssessment": "Is this offer strong, fair, or below market? Be specific.",
    "improvementTargets": "Specific components to negotiate up with target amounts"
  },
  "talkingPoints": [
    "Company-specific point: 'At ${company}, [specific insight relevant to them]'",
    "Role-specific point: 'For ${role} roles, [specific leverage point]'",
    "Location-specific point: 'In ${location}, [specific COL or market factor]'",
    "Experience-based point: 'With ${experienceYears} years of experience, [generic value proposition]'"
  ],
  "counterOfferStrategy": "Multi-paragraph strategy specifically tailored to ${company}, ${role}, ${location}, and this offer amount. Include:
  - How to approach THIS company specifically (their culture, what they respond to)
  - Role-specific negotiation tactics (what matters for ${role})
  - Location factors to emphasize (COL, remote, etc.)
  - Offer-specific gaps to address (exact numbers and percentages)
  - Timing recommendations based on company situation
  - Backup plan if they say no (alternative components to negotiate)",
  "benefitsGuidance": {
    "equity": {
      "importance": "<high/medium/low based on company type>",
      "companySpecific": "How ${company} typically structures equity (startup vs public)",
      "negotiationTips": ["Company-specific equity negotiation tips for ${company}"],
      "questions": ["Role-specific equity questions for ${role}"]
    },
    "pto": {
      "importance": "medium",
      "typical": "Standard PTO for ${role} at ${experienceYears} years experience",
      "negotiationTips": ["Be specific about PTO norms in ${location} or at ${company}"],
      "questions": ["Ask about accrual, rollover, and company-specific policies"]
    },
    "signingBonus": {
      "importance": "<high if offer gap exists, medium otherwise>",
      "typical": "10-20% of base salary, or amount to bridge gap to market rate",
      "negotiationTips": ["Specific strategy for ${company} - startups more flexible, FAANG less"],
      "companySpecific": "Signing bonus norms at ${company} type companies"
    },
    "remoteWork": {
      "importance": "<high if ${location} is mentioned as remote, medium otherwise>",
      "negotiationTips": ["Location-specific remote work considerations for ${location}"],
      "questions": ["Hybrid expectations, home office stipend ($2-5K standard)"]
    },
    "other": ["Role-specific benefits to negotiate for ${role}", "Company-specific perks at ${company}", "Location-specific benefits for ${location}"]
  },
  "timingRecommendations": {
    "whenToDiscuss": "Company-specific timing advice based on ${company} hiring process",
    "redFlags": ["Company-specific red flags based on ${company} type"],
    "bestPractices": ["Role-specific best practices for ${role} negotiations"]
  },
  "emailTemplates": {
    "counterOffer": {
      "subject": "Re: ${role} Position at ${company}",
      "body": "Personalized counter-offer email that mentions:
      - Enthusiasm for ${company} specifically (reference culture/mission)
      - Market research for ${role} in ${location}
      - Specific ask with justification
      - Company-specific tone (formal for enterprise, casual for startup)"
    },
    "benefitsInquiry": {
      "subject": "Questions About Benefits - ${role} Position",
      "body": "Email asking about benefits specific to ${company} and ${role}"
    },
    "acceptance": {
      "subject": "Offer Acceptance - ${role} Position at ${company}",
      "body": "Acceptance email mentioning specific excitement about ${company} and ${role}"
    },
    "decline": {
      "subject": "Re: ${role} Position at ${company}",
      "body": "Professional decline mentioning appreciation for ${company}"
    }
  },
  "recommendedCounterOffer": <calculate 10-20% above offer, or 15-25% above current salary if no offer>,
  "justification": "Detailed justification specific to THIS situation:
  - Company: ${company} [specific company factors]
  - Role: ${role} [specific role demand]
  - Location: ${location} [specific COL factors]
  - Market gap: [exact percentage and dollar amount]
  - Your experience: ${experienceYears} years [how this positions you]",
  "negotiationTips": [
    "Company-specific tip for ${company}",
    "Role-specific tip for ${role}",
    "Location-specific tip for ${location}",
    "General negotiation best practice",
    "Backup plan if they don't meet your target"
  ]
}

EXAMPLE PERSONALIZATION (DO NOT COPY, but use this style):
- If Company = "Google" and Role = "Software Engineer": "Google typically has rigid L3/L4/L5 bands for base salary ($120K/$140K/$160K), but you can negotiate signing bonus ($20-50K) and equity refresh grants. Your offer of $130K suggests L4 level."
- If Location = "San Francisco": "SF cost of living is 2.2x the national average. A $120K salary here equals $54K buying power elsewhere. Use this to justify your $140K ask."
- If Role = "Machine Learning Engineer": "ML roles are in high demand (30% year-over-year growth). You have strong leverage. Companies are paying 20-30% premiums for ML expertise."

MAKE EVERY SECTION SPECIFIC TO THIS COMBINATION OF COMPANY + ROLE + LOCATION + OFFER.

DO NOT use generic placeholders - be concrete and specific.
DO NOT mention skills unless explicitly provided.
DO NOT use hardcoded example numbers - calculate based on actual context.

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
            content: "You are an expert salary negotiation coach who provides HIGHLY PERSONALIZED, company-specific, role-specific, and location-specific advice. You avoid generic advice and always tailor recommendations to the specific situation."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI Negotiation Generation Error:", err.message);
    return null;
  }
  }

  /* ============================================================
     POST /generate
     Generate comprehensive negotiation package
  ============================================================ */
  router.post("/generate", async (req, res) => {
  try {
    const {
      userId,
      company,
      role,
      location,
      experienceYears,
      currentSalary,
      offerAmount,
      marketData
    } = req.body;

    if (!userId || !company || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, company, role"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    console.log(`🔄 Generating negotiation package for ${company} (${role})`);

    // Generate comprehensive package with AI
    const packageData = await generateNegotiationPackage(
      company,
      role,
      location || 'United States',
      experienceYears || 0,
      currentSalary,
      offerAmount,
      marketData
    );

    if (!packageData) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate negotiation package"
      });
    }

    // Save to database
    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("salary_negotiations")
        .insert({
          user_id: userIdInt,
          company,
          role,
          location: location || null,
          experience_years: experienceYears || null,
          market_research: packageData.marketResearch,
          company_insights: packageData.companyInsights || null,
          role_insights: packageData.roleInsights || null,
          location_insights: packageData.locationInsights || null,
          offer_analysis: packageData.offerAnalysis || null,
          talking_points: packageData.talkingPoints,
          counter_offer_strategy: packageData.counterOfferStrategy,
          benefits_guidance: packageData.benefitsGuidance,
          timing_recommendations: JSON.stringify(packageData.timingRecommendations),
          email_templates: packageData.emailTemplates,
          initial_offer_amount: offerAmount || null,
          target_salary: packageData.recommendedCounterOffer || null,
          negotiation_status: offerAmount ? 'preparing' : 'researching'
        })
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while saving negotiation package",
        error: error.message
      });
    }

    console.log(`✅ Generated negotiation package (ID: ${data.id})`);

    return res.json({
      success: true,
      data: {
        ...data,
        negotiationTips: packageData.negotiationTips,
        justification: packageData.justification
      }
    });
  } catch (err) {
    console.error("❌ Error generating negotiation package:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate negotiation package"
    });
  }
  });

  /* ============================================================
     GET /list
     Get all negotiations for user
  ============================================================ */
  router.get("/list", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const status = req.query.status?.trim();

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

    let query = supabase
      .from("salary_negotiations")
      .select("*")
      .eq("user_id", userIdInt)
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq("negotiation_status", status);
    }

    const { data, error } = await retryDatabaseOperation(async () => {
      return await query;
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching negotiations",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: {
        negotiations: data || [],
        total: data?.length || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching negotiations:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch negotiations"
    });
  }
  });

  /* ============================================================
     GET /:id
     Get specific negotiation
  ============================================================ */
  router.get("/:id", async (req, res) => {
  try {
    const negotiationId = parseInt(req.params.id, 10);
    const userId = req.query.userId?.trim();

    if (isNaN(negotiationId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid negotiation ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("salary_negotiations")
        .select("*")
        .eq("id", negotiationId)
        .eq("user_id", userIdInt)
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(404).json({
        success: false,
        message: "Negotiation not found"
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error fetching negotiation:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch negotiation"
    });
  }
  });

  /* ============================================================
     PUT /:id/update
     Update negotiation details
  ============================================================ */
  router.put("/:id/update", async (req, res) => {
  try {
    const negotiationId = parseInt(req.params.id, 10);
    const {
      userId,
      initialOfferAmount,
      counterOfferAmount,
      finalAcceptedAmount,
      equityOffered,
      ptoDays,
      signingBonus,
      remoteWorkAllowed,
      otherBenefits,
      negotiationStatus,
      offerReceivedDate,
      negotiationStartedDate
    } = req.body;

    if (isNaN(negotiationId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid negotiation ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (initialOfferAmount !== undefined) updateData.initial_offer_amount = initialOfferAmount;
    if (counterOfferAmount !== undefined) updateData.counter_offer_amount = counterOfferAmount;
    if (finalAcceptedAmount !== undefined) updateData.final_accepted_amount = finalAcceptedAmount;
    if (equityOffered !== undefined) updateData.equity_offered = equityOffered;
    if (ptoDays !== undefined) updateData.pto_days = ptoDays;
    if (signingBonus !== undefined) updateData.signing_bonus = signingBonus;
    if (remoteWorkAllowed !== undefined) updateData.remote_work_allowed = remoteWorkAllowed;
    if (otherBenefits !== undefined) updateData.other_benefits = otherBenefits;
    if (negotiationStatus !== undefined) updateData.negotiation_status = negotiationStatus;
    if (offerReceivedDate !== undefined) updateData.offer_received_date = offerReceivedDate;
    if (negotiationStartedDate !== undefined) updateData.negotiation_started_date = negotiationStartedDate;

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("salary_negotiations")
        .update(updateData)
        .eq("id", negotiationId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while updating negotiation",
        error: error.message
      });
    }

    console.log(`✅ Updated negotiation ${negotiationId}`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error updating negotiation:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update negotiation"
    });
  }
});

  /* ============================================================
     PUT /:id/outcome
     Track negotiation outcome
  ============================================================ */
  router.put("/:id/outcome", async (req, res) => {
  try {
    const negotiationId = parseInt(req.params.id, 10);
    const {
      userId,
      outcomeType,
      outcomeNotes,
      lessonsLearned,
      satisfactionRating,
      finalAcceptedAmount
    } = req.body;

    if (isNaN(negotiationId) || !userId || !outcomeType) {
      return res.status(400).json({
        success: false,
        message: "Invalid negotiation ID, missing userId, or outcomeType"
      });
    }

    const userIdInt = parseInt(userId, 10);

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("salary_negotiations")
        .update({
          outcome_type: outcomeType,
          outcome_notes: outcomeNotes || null,
          lessons_learned: lessonsLearned || null,
          satisfaction_rating: satisfactionRating || null,
          final_accepted_amount: finalAcceptedAmount || null,
          negotiation_status: 'completed',
          negotiation_completed_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq("id", negotiationId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while tracking outcome",
        error: error.message
      });
    }

    console.log(`✅ Tracked outcome for negotiation ${negotiationId}: ${outcomeType}`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error tracking outcome:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to track outcome"
    });
  }
});

  /* ============================================================
     GET /stats
     Get negotiation statistics
  ============================================================ */
  router.get("/stats", async (req, res) => {
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
        .from("salary_negotiations")
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

    const negotiations = data || [];
    const total = negotiations.length;
    const completed = negotiations.filter(n => n.negotiation_status === 'completed').length;
    const active = negotiations.filter(n => ['preparing', 'negotiating'].includes(n.negotiation_status)).length;

    // Calculate success metrics
    const acceptedOffers = negotiations.filter(n => 
      n.outcome_type === 'accepted_initial' || n.outcome_type === 'accepted_counter'
    );
    const successfulCounters = negotiations.filter(n => n.outcome_type === 'accepted_counter').length;
    
    // Average salary increase from counter-offers
    const salaryIncreases = negotiations
      .filter(n => n.initial_offer_amount && n.final_accepted_amount)
      .map(n => ((n.final_accepted_amount - n.initial_offer_amount) / n.initial_offer_amount) * 100);
    
    const avgIncrease = salaryIncreases.length > 0
      ? Math.round(salaryIncreases.reduce((a, b) => a + b, 0) / salaryIncreases.length)
      : 0;

    // Average satisfaction
    const ratings = negotiations.filter(n => n.satisfaction_rating).map(n => n.satisfaction_rating);
    const avgSatisfaction = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : 0;

    // By outcome type
    const byOutcome = {
      accepted_initial: negotiations.filter(n => n.outcome_type === 'accepted_initial').length,
      accepted_counter: negotiations.filter(n => n.outcome_type === 'accepted_counter').length,
      declined_by_company: negotiations.filter(n => n.outcome_type === 'declined_by_company').length,
      declined_by_user: negotiations.filter(n => n.outcome_type === 'declined_by_user').length
    };

    return res.json({
      success: true,
      data: {
        total,
        completed,
        active,
        successfulCounters,
        avgIncrease,
        avgSatisfaction: parseFloat(avgSatisfaction),
        byOutcome
      }
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics"
    });
  }
});

  /* ============================================================
     DELETE /:id
     Delete a negotiation package
  ============================================================ */
  router.delete("/:id", async (req, res) => {
  try {
    const negotiationId = parseInt(req.params.id, 10);
    const userId = req.query.userId?.trim();

    if (isNaN(negotiationId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid negotiation ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Delete the negotiation
    const { error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("salary_negotiations")
        .delete()
        .eq("id", negotiationId)
        .eq("user_id", userIdInt);
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while deleting negotiation",
        error: error.message
      });
    }

    console.log(`✅ Deleted negotiation ${negotiationId}`);

    return res.json({
      success: true,
      message: "Negotiation deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting negotiation:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete negotiation"
    });
  }
  });

  return router;
}

// Export default router (production use - maintains backward compatibility)
const router = createSalaryNegotiationRoutes();
export default router;

// Export factory function for testing
export { createSalaryNegotiationRoutes };