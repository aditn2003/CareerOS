import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { trackApiCall } from "../utils/apiTrackingService.js";

dotenv.config();

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ============================================================
   UC-076: AI-POWERED RESPONSE COACHING
   
   Acceptance Criteria:
   1. ✅ Write and submit practice responses to interview questions
   2. ✅ Provide feedback on content, structure, and clarity
   3. ✅ Analyze response length and recommend adjustments for optimal timing
   4. ✅ Identify weak language patterns and suggest stronger alternatives
   5. ✅ Score responses on relevance, specificity, and impact
   6. ✅ Generate alternative response approaches
   7. ✅ Track improvement over multiple practice sessions
   8. ✅ Provide STAR method framework adherence analysis
============================================================ */

/* -------------------------
   Helper: Analyze Response with OpenAI
------------------------- */
async function analyzeResponseWithAI(questionText, responseText, questionCategory, userId = null) {
  if (!OPENAI_KEY) {
    return getFallbackAnalysis(responseText);
  }

  const isBehavioral = questionCategory === "behavioral";

  const prompt = `
You are an expert interview coach analyzing a candidate's response.

QUESTION: "${questionText}"
CATEGORY: ${questionCategory}
CANDIDATE'S RESPONSE:
"""
${responseText}
"""

Provide comprehensive coaching feedback in JSON format:

{
  "content_feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "weaknesses": ["weakness 1", "weakness 2", ...],
    "clarity_score": 0-100,
    "structure_score": 0-100
  },
  "timing_analysis": {
    "word_count": number,
    "estimated_speaking_time_seconds": number (assume 150 words/min),
    "timing_recommendation": "too_short|optimal|too_long",
    "timing_feedback": "explanation of timing"
  },
  "language_patterns": {
    "weak_phrases": ["phrase with explanation"],
    "filler_words": ["um", "like", ...],
    "passive_voice_count": number,
    "strong_action_verbs": ["verb1", "verb2", ...],
    "suggestions": ["Replace 'X' with 'Y' because..."]
  },
  "scores": {
    "relevance_score": 0-100,
    "specificity_score": 0-100,
    "impact_score": 0-100,
    "overall_score": 0-100
  },
  ${isBehavioral ? `
  "star_analysis": {
    "situation_present": true|false,
    "task_present": true|false,
    "action_present": true|false,
    "result_present": true|false,
    "star_adherence_score": 0-100,
    "missing_elements": ["element1", ...],
    "star_feedback": "detailed feedback"
  },
  ` : ''}
  "alternative_approaches": [
    {
      "approach": "description",
      "example": "example response",
      "why_better": "explanation"
    }
  ],
  "key_improvements": [
    "improvement 1",
    "improvement 2",
    "improvement 3"
  ],
  "overall_feedback": "comprehensive summary"
}

SCORING GUIDELINES:
- Relevance: How well does response answer the question?
- Specificity: Are there concrete examples and details?
- Impact: Does it demonstrate value and results?
${isBehavioral ? '- STAR: Does response follow Situation-Task-Action-Result?' : ''}

TIMING GUIDELINES:
- Optimal: 60-120 seconds (150-300 words)
- Too short: < 60 seconds
- Too long: > 150 seconds

Be constructive and actionable in all feedback.
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert interview coach providing detailed, actionable feedback on interview responses."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'response_coaching_analysis', category: questionCategory },
        estimateCost: 0.001
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackAnalysis(responseText);
  }
}

/* -------------------------
   Helper: Fallback Analysis (No OpenAI)
------------------------- */
function getFallbackAnalysis(responseText) {
  const wordCount = responseText.trim().split(/\s+/).length;
  const estimatedTime = Math.round((wordCount / 150) * 60); // 150 words/min

  let timingRec = "optimal";
  if (estimatedTime < 60) timingRec = "too_short";
  if (estimatedTime > 150) timingRec = "too_long";

  return {
    content_feedback: {
      strengths: ["Clear communication"],
      weaknesses: ["Could add more specific details"],
      clarity_score: 70,
      structure_score: 65
    },
    timing_analysis: {
      word_count: wordCount,
      estimated_speaking_time_seconds: estimatedTime,
      timing_recommendation: timingRec,
      timing_feedback: `Your response is estimated at ${estimatedTime} seconds.`
    },
    language_patterns: {
      weak_phrases: [],
      filler_words: [],
      passive_voice_count: 0,
      strong_action_verbs: [],
      suggestions: ["Enable OpenAI for detailed language analysis"]
    },
    scores: {
      relevance_score: 70,
      specificity_score: 65,
      impact_score: 68,
      overall_score: 68
    },
    alternative_approaches: [],
    key_improvements: ["Add specific metrics", "Include concrete examples", "Emphasize results"],
    overall_feedback: "Solid foundation. Add more specific details for stronger impact."
  };
}

/* -------------------------
   Helper: Calculate Improvement
------------------------- */
async function calculateImprovement(userId, questionId, newScore) {
  try {
    // Get previous attempts for this question
    const { data, error } = await supabase
      .from("response_coaching")
      .select("overall_score, attempt_number")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .order("attempt_number", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { attemptNumber: 1, improvement: null, previousScore: null };
    }

    const previous = data[0];
    const improvement = newScore - previous.overall_score;
    
    return {
      attemptNumber: previous.attempt_number + 1,
      improvement,
      previousScore: previous.overall_score
    };
  } catch (err) {
    console.error("Error calculating improvement:", err);
    return { attemptNumber: 1, improvement: null, previousScore: null };
  }
}

/* -------------------------
   POST /api/response-coaching/analyze
   Submit response and get AI coaching feedback
------------------------- */
router.post("/analyze", async (req, res) => {
  try {
    const {
      userId,
      questionId,
      questionText,
      questionCategory,
      responseText
    } = req.body;

    if (!userId || !questionId || !questionText || !responseText) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, questionId, questionText, responseText"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    console.log(`🤖 Analyzing response for question ${questionId}...`);

    // Get AI analysis
    const analysis = await analyzeResponseWithAI(questionText, responseText, questionCategory, userIdInt);

    // Round scores to integers (database expects INT4)
    const roundedOverallScore = Math.round(analysis.scores.overall_score);

    // Calculate improvement from previous attempts
    const improvementData = await calculateImprovement(userIdInt, questionId, roundedOverallScore);

    // Calculate timing metrics
    const wordCount = analysis.timing_analysis?.word_count || responseText.trim().split(/\s+/).length;
    const estimatedTime = Math.round(
      analysis.timing_analysis?.estimated_speaking_time_seconds || (wordCount / 150) * 60
    );

    // Save to database
    const { data: savedCoaching, error } = await supabase
      .from("response_coaching")
      .insert({
        user_id: userIdInt,
        question_id: questionId,
        question_text: questionText,
        question_category: questionCategory || null,
        response_text: responseText,
        response_length: responseText.length,
        feedback_json: analysis,
        relevance_score: Math.round(analysis.scores.relevance_score),
        specificity_score: Math.round(analysis.scores.specificity_score),
        impact_score: Math.round(analysis.scores.impact_score),
        overall_score: roundedOverallScore,
        star_adherence_score: analysis.star_analysis?.star_adherence_score ? Math.round(analysis.star_analysis.star_adherence_score) : null,
        word_count: wordCount,
        estimated_speaking_time: estimatedTime,
        timing_recommendation: analysis.timing_analysis?.timing_recommendation || "optimal",
        attempt_number: improvementData.attemptNumber,
        improvement_from_previous: improvementData.improvement
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save coaching feedback",
        error: error.message
      });
    }

    console.log(`✅ Response analyzed and saved (Attempt #${improvementData.attemptNumber}, Score: ${roundedOverallScore})`);

    return res.json({
      success: true,
      data: {
        coachingId: savedCoaching.id,
        analysis,
        attemptNumber: improvementData.attemptNumber,
        improvement: improvementData.improvement,
        previousScore: improvementData.previousScore
      }
    });
  } catch (err) {
    console.error("❌ Error analyzing response:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze response"
    });
  }
});

/* -------------------------
   GET /api/response-coaching/history
   Get coaching history for a question (track improvement)
------------------------- */
router.get("/history/:questionId", async (req, res) => {
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

    const { data, error } = await supabase
      .from("response_coaching")
      .select("*")
      .eq("user_id", userIdInt)
      .eq("question_id", questionId)
      .order("attempt_number", { ascending: true });

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch coaching history",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: {
        questionId,
        attempts: data || [],
        totalAttempts: data?.length || 0,
        improvementTrend: data?.length >= 2 
          ? data[data.length - 1].overall_score - data[0].overall_score
          : null
      }
    });
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaching history"
    });
  }
});

/* -------------------------
   GET /api/response-coaching/stats
   Get overall coaching statistics for user
------------------------- */
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

    const { data, error } = await supabase
      .from("response_coaching")
      .select("*")
      .eq("user_id", userIdInt)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch stats",
        error: error.message
      });
    }

    const responses = data || [];
    const totalResponses = responses.length;
    const averageScore = totalResponses > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.overall_score, 0) / totalResponses)
      : 0;
    
    const improvementCount = responses.filter(r => r.improvement_from_previous && r.improvement_from_previous > 0).length;
    const recentResponses = responses.slice(0, 5);

    return res.json({
      success: true,
      data: {
        totalResponses,
        averageScore,
        improvementCount,
        recentResponses: recentResponses.map(r => ({
          questionId: r.question_id,
          questionText: r.question_text,
          score: r.overall_score,
          attemptNumber: r.attempt_number,
          improvement: r.improvement_from_previous,
          createdAt: r.created_at
        }))
      }
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats"
    });
  }
});

export default router;