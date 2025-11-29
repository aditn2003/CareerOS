import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ============================================================
   UC-077: MOCK INTERVIEW PRACTICE SESSIONS
   
   Acceptance Criteria:
   1. ✅ Generate interview scenarios based on target role and company
   2. ✅ Simulate different interview formats (behavioral, technical, case study)
   3. ✅ Provide sequential question prompts and follow-ups
   4. ✅ Save written responses for all practice session questions
   5. ✅ Generate performance summary and improvement areas
   6. ✅ Include response length guidance and pacing recommendations
   7. ✅ Simulate common interview question progressions
   8. ✅ Provide confidence building exercises and techniques
============================================================ */

/* -------------------------
   Helper: Generate Interview Scenario
------------------------- */
async function generateInterviewScenario(company, role, interviewType) {
  if (!OPENAI_KEY) {
    return getFallbackScenario(company, role, interviewType);
  }

  const prompt = `
Generate a realistic interview scenario for:

Company: ${company}
Role: ${role}
Interview Type: ${interviewType}

Create a JSON response with:

{
  "scenario_description": "detailed scenario setup (who you're meeting, context, stage of process)",
  "interview_format": "description of the format",
  "total_questions": number (8-12 questions),
  "questions": [
    {
      "question_number": 1,
      "question_text": "...",
      "question_type": "behavioral|technical|situational|case_study",
      "has_follow_up": true|false,
      "follow_up_triggers": ["trigger1", "trigger2"],
      "response_guidance": {
        "optimal_length": "60-90 seconds",
        "key_points_to_cover": ["point1", "point2"],
        "what_interviewer_wants": "explanation"
      }
    },
    ...
  ],
  "question_progression": {
    "opening_questions": [question numbers],
    "core_questions": [question numbers],
    "closing_questions": [question numbers]
  },
  "pacing_guidance": {
    "total_estimated_time": "minutes",
    "per_question_time": "minutes",
    "tips": ["tip1", "tip2"]
  },
  "confidence_exercises": [
    {
      "technique": "technique name",
      "description": "how to use it",
      "when_to_use": "before/during/after"
    }
  ]
}

INTERVIEW TYPE SPECIFICS:
${interviewType === 'behavioral' ? `
- Focus on STAR method responses
- Include questions about teamwork, conflict, leadership, challenges
- Progress from general to specific experiences
` : ''}
${interviewType === 'technical' ? `
- Include coding, system design, or technical problem-solving
- Progress from fundamentals to complex scenarios
- Include troubleshooting questions
` : ''}
${interviewType === 'case_study' ? `
- Present business problem to solve
- Include clarifying questions opportunity
- Test analytical and strategic thinking
` : ''}
${interviewType === 'mixed' ? `
- Combine behavioral and technical questions
- Simulate real interview progression
- Include warmup, core assessment, and wrap-up
` : ''}

Make questions specific to ${company} and ${role}.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert interview simulator creating realistic interview scenarios."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackScenario(company, role, interviewType);
  }
}

/* -------------------------
   Helper: Fallback Scenario
------------------------- */
function getFallbackScenario(company, role, interviewType) {
  const baseQuestions = {
    behavioral: [
      { text: "Tell me about yourself and your background.", type: "behavioral" },
      { text: "Describe a challenging project you worked on.", type: "behavioral" },
      { text: "How do you handle conflict in a team?", type: "behavioral" },
      { text: "Tell me about a time you failed and what you learned.", type: "behavioral" }
    ],
    technical: [
      { text: "Explain your approach to solving technical problems.", type: "technical" },
      { text: "Describe a complex system you've designed.", type: "technical" },
      { text: "How would you optimize this process?", type: "technical" }
    ],
    case_study: [
      { text: "How would you approach entering a new market?", type: "case_study" },
      { text: "Analyze this business scenario and provide recommendations.", type: "case_study" }
    ]
  };

  const questions = baseQuestions[interviewType] || baseQuestions.behavioral;

  return {
    scenario_description: `You're interviewing for ${role} at ${company}. This is a ${interviewType} interview round.`,
    interview_format: `${interviewType} interview format`,
    total_questions: questions.length,
    questions: questions.map((q, i) => ({
      question_number: i + 1,
      question_text: q.text,
      question_type: q.type,
      has_follow_up: i < 2,
      follow_up_triggers: ["good answer", "needs clarification"],
      response_guidance: {
        optimal_length: "60-90 seconds",
        key_points_to_cover: ["Be specific", "Use examples", "Show impact"],
        what_interviewer_wants: "Concrete examples demonstrating your skills"
      }
    })),
    question_progression: {
      opening_questions: [1],
      core_questions: [2, 3],
      closing_questions: [4]
    },
    pacing_guidance: {
      total_estimated_time: "30-45 minutes",
      per_question_time: "3-5 minutes",
      tips: ["Take your time", "Think before answering", "Ask clarifying questions"]
    },
    confidence_exercises: [
      {
        technique: "Deep breathing",
        description: "Take 3 deep breaths before starting",
        when_to_use: "before"
      }
    ]
  };
}

/* -------------------------
   Helper: Generate Follow-up Question
------------------------- */
async function generateFollowUpQuestion(originalQuestion, userResponse, questionType) {
  if (!OPENAI_KEY) {
    return {
      question_text: "Can you tell me more about that?",
      question_type: "follow_up"
    };
  }

  const prompt = `
Based on this interview exchange, generate a relevant follow-up question:

ORIGINAL QUESTION: "${originalQuestion}"
CANDIDATE'S RESPONSE: "${userResponse}"

Generate a JSON response:
{
  "question_text": "natural follow-up question",
  "question_type": "follow_up",
  "why_asking": "brief explanation of what this probes",
  "response_guidance": {
    "optimal_length": "30-60 seconds",
    "key_points_to_cover": ["point1", "point2"]
  }
}

Make the follow-up feel natural and dig deeper into their response.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are conducting an interview and asking thoughtful follow-up questions." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return {
      question_text: "Can you elaborate on that experience?",
      question_type: "follow_up"
    };
  }
}

/* -------------------------
   Helper: Generate Performance Summary
------------------------- */
async function generatePerformanceSummary(sessionData, responses) {
  if (!OPENAI_KEY) {
    return getFallbackSummary(responses);
  }

  const responsesSummary = responses.map(r => ({
    question: r.question_text,
    response: r.response_text,
    score: r.response_score
  }));

  const prompt = `
Analyze this complete mock interview session and generate a comprehensive performance summary:

Company: ${sessionData.company}
Role: ${sessionData.role}
Interview Type: ${sessionData.interview_type}

RESPONSES:
${JSON.stringify(responsesSummary, null, 2)}

Generate JSON:
{
  "performance_summary": "comprehensive 2-3 paragraph summary",
  "strengths": ["strength 1", "strength 2", "strength 3+"],
  "improvement_areas": ["area 1 with specific advice", "area 2 with specific advice", ...],
  "scores": {
    "content_quality_score": 0-100,
    "communication_clarity_score": 0-100,
    "technical_accuracy_score": 0-100,
    "confidence_level_score": 0-100,
    "overall_performance_score": 0-100
  },
  "recommended_practice_areas": [
    "specific area 1",
    "specific area 2",
    "specific area 3"
  ],
  "suggested_resources": [
    {
      "topic": "topic",
      "resource": "specific resource or approach"
    }
  ],
  "next_steps": [
    "actionable step 1",
    "actionable step 2",
    "actionable step 3"
  ],
  "confidence_exercises": [
    {
      "exercise": "exercise name",
      "description": "how to do it",
      "benefit": "what it helps with"
    }
  ],
  "positive_highlights": [
    "specific moment or answer that stood out positively",
    ...
  ]
}

Be encouraging but honest. Provide specific, actionable feedback.
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert interview coach providing comprehensive performance feedback."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackSummary(responses);
  }
}

/* -------------------------
   Helper: Fallback Summary
------------------------- */
function getFallbackSummary(responses) {
  const avgScore = responses.length > 0
    ? Math.round(responses.reduce((sum, r) => sum + (r.response_score || 70), 0) / responses.length)
    : 70;

  return {
    performance_summary: "You completed the mock interview session. Your responses showed good effort.",
    strengths: ["Completed all questions", "Maintained engagement"],
    improvement_areas: ["Add more specific examples", "Practice STAR method"],
    scores: {
      content_quality_score: avgScore,
      communication_clarity_score: avgScore - 5,
      technical_accuracy_score: avgScore,
      confidence_level_score: avgScore - 10,
      overall_performance_score: avgScore
    },
    recommended_practice_areas: ["STAR method", "Specific examples", "Technical depth"],
    suggested_resources: [
      { topic: "STAR Method", resource: "Practice structuring responses" }
    ],
    next_steps: ["Review feedback", "Practice identified areas", "Schedule another mock"],
    confidence_exercises: [
      {
        exercise: "Power posing",
        description: "Stand in confident pose for 2 minutes before interview",
        benefit: "Increases confidence hormones"
      }
    ],
    positive_highlights: ["Showed enthusiasm", "Answered all questions"]
  };
}

/* -------------------------
   POST /api/mock-interviews/start
   Start a new mock interview session
------------------------- */
router.post("/start", async (req, res) => {
  try {
    const { userId, company, role, interviewType } = req.body;

    if (!userId || !company || !role || !interviewType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, company, role, interviewType"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    console.log(`🎭 Starting mock interview: ${company} - ${role} (${interviewType})`);

    // Generate interview scenario
    const scenario = await generateInterviewScenario(company, role, interviewType);

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from("mock_interview_sessions")
      .insert({
        user_id: userIdInt,
        company,
        role,
        interview_type: interviewType,
        total_questions: scenario.total_questions,
        questions_completed: 0,
        status: "in_progress",
        scenario_description: scenario.scenario_description
      })
      .select()
      .single();

    if (sessionError) {
      console.error("❌ Database error:", sessionError);
      return res.status(500).json({
        success: false,
        message: "Failed to create session",
        error: sessionError.message
      });
    }

    // Save all questions to database
    const questionInserts = scenario.questions.map(q => ({
      session_id: session.id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type
    }));

    const { error: questionsError } = await supabase
      .from("mock_interview_responses")
      .insert(questionInserts);

    if (questionsError) {
      console.error("❌ Error inserting questions:", questionsError);
    }

    console.log(`✅ Mock interview session created (ID: ${session.id})`);

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        scenario,
        currentQuestion: scenario.questions[0]
      }
    });
  } catch (err) {
    console.error("❌ Error starting mock interview:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to start mock interview"
    });
  }
});

/* -------------------------
   POST /api/mock-interviews/respond
   Submit response to a question
------------------------- */
router.post("/respond", async (req, res) => {
  try {
    const { sessionId, questionNumber, responseText, needsFollowUp } = req.body;

    if (!sessionId || questionNumber === undefined || !responseText) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: sessionId, questionNumber, responseText"
      });
    }

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from("mock_interview_responses")
      .select("*")
      .eq("session_id", sessionId)
      .eq("question_number", questionNumber)
      .single();

    if (questionError) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Calculate metrics
    const wordCount = responseText.trim().split(/\s+/).length;
    const estimatedTime = Math.round((wordCount / 150) * 60);
    const responseScore = Math.min(100, Math.max(50, 60 + (wordCount / 10))); // Simple scoring

    // Update response in database
    const { error: updateError } = await supabase
      .from("mock_interview_responses")
      .update({
        response_text: responseText,
        response_length: responseText.length,
        word_count: wordCount,
        estimated_speaking_time: estimatedTime,
        response_score: Math.round(responseScore),
        answered_at: new Date().toISOString()
      })
      .eq("id", question.id);

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to save response"
      });
    }

    // Update session progress
    const { error: sessionUpdateError } = await supabase
      .from("mock_interview_sessions")
      .update({
        questions_completed: questionNumber
      })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      console.error("❌ Session update error:", sessionUpdateError);
    }

    // Generate follow-up if requested
    let followUpQuestion = null;
    if (needsFollowUp) {
      const followUp = await generateFollowUpQuestion(
        question.question_text,
        responseText,
        question.question_type
      );

      // Save follow-up question
      const { data: savedFollowUp } = await supabase
        .from("mock_interview_responses")
        .insert({
          session_id: sessionId,
          question_number: questionNumber + 0.5, // Use .5 to indicate follow-up
          question_text: followUp.question_text,
          question_type: "follow_up",
          is_follow_up: true,
          parent_question_id: question.id
        })
        .select()
        .single();

      followUpQuestion = savedFollowUp;
    }

    console.log(`✅ Response saved for question ${questionNumber}`);

    return res.json({
      success: true,
      data: {
        responseScore: Math.round(responseScore),
        wordCount,
        estimatedTime,
        followUpQuestion: followUpQuestion || null
      }
    });
  } catch (err) {
    console.error("❌ Error saving response:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save response"
    });
  }
});

/* -------------------------
   GET /api/mock-interviews/:sessionId/next-question
   Get the next question in sequence
------------------------- */
router.get("/:sessionId/next-question", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const { data: session } = await supabase
      .from("mock_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Get next unanswered question
    const { data: nextQuestion } = await supabase
      .from("mock_interview_responses")
      .select("*")
      .eq("session_id", sessionId)
      .is("response_text", null)
      .order("question_number", { ascending: true })
      .limit(1)
      .single();

    if (!nextQuestion) {
      return res.json({
        success: true,
        data: {
          completed: true,
          message: "All questions answered"
        }
      });
    }

    return res.json({
      success: true,
      data: {
        completed: false,
        question: nextQuestion
      }
    });
  } catch (err) {
    console.error("❌ Error getting next question:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get next question"
    });
  }
});

/* -------------------------
   POST /api/mock-interviews/:sessionId/complete
   Complete session and generate performance summary
------------------------- */
router.post("/:sessionId/complete", async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`🏁 Completing mock interview session ${sessionId}`);

    // Get session
    const { data: session } = await supabase
      .from("mock_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Get all responses
    const { data: responses } = await supabase
      .from("mock_interview_responses")
      .select("*")
      .eq("session_id", sessionId)
      .not("response_text", "is", null)
      .order("question_number", { ascending: true });

    if (!responses || responses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No responses found for this session"
      });
    }

    // Generate performance summary
    const summary = await generatePerformanceSummary(session, responses);

    // Save summary to database
    const { data: savedSummary, error: summaryError } = await supabase
      .from("mock_interview_summaries")
      .insert({
        session_id: sessionId,
        performance_summary: summary.performance_summary,
        strengths: summary.strengths,
        improvement_areas: summary.improvement_areas,
        content_quality_score: Math.round(summary.scores.content_quality_score),
        communication_clarity_score: Math.round(summary.scores.communication_clarity_score),
        technical_accuracy_score: Math.round(summary.scores.technical_accuracy_score),
        confidence_level_score: Math.round(summary.scores.confidence_level_score),
        recommended_practice_areas: summary.recommended_practice_areas,
        suggested_resources: summary.suggested_resources.map(r => `${r.topic}: ${r.resource}`),
        next_steps: summary.next_steps,
        confidence_exercises: summary.confidence_exercises.map(e => `${e.exercise}: ${e.description}`),
        positive_highlights: summary.positive_highlights
      })
      .select()
      .single();

    if (summaryError) {
      console.error("❌ Summary save error:", summaryError);
    }

    // Update session status
    const { error: updateError } = await supabase
      .from("mock_interview_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_performance_score: Math.round(summary.scores.overall_performance_score),
        confidence_score: Math.round(summary.scores.confidence_level_score)
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("❌ Session update error:", updateError);
    }

    console.log(`✅ Mock interview completed with summary`);

    return res.json({
      success: true,
      data: {
        summary,
        sessionId,
        totalResponses: responses.length
      }
    });
  } catch (err) {
    console.error("❌ Error completing session:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to complete session"
    });
  }
});

/* -------------------------
   GET /api/mock-interviews/user/:userId
   Get all mock interview sessions for a user
------------------------- */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    const { data: sessions, error } = await supabase
      .from("mock_interview_sessions")
      .select(`
        *,
        mock_interview_summaries (*)
      `)
      .eq("user_id", userIdInt)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch sessions",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: {
        sessions: sessions || [],
        totalSessions: sessions?.length || 0,
        completedSessions: sessions?.filter(s => s.status === "completed").length || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions"
    });
  }
});

/* -------------------------
   GET /api/mock-interviews/:sessionId/summary
   Get performance summary for a completed session
------------------------- */
router.get("/:sessionId/summary", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: summary, error } = await supabase
      .from("mock_interview_summaries")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error || !summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found. Session may not be completed."
      });
    }

    return res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("❌ Error fetching summary:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary"
    });
  }
});

export default router;