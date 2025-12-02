// backend/routes/interviewAnalytics.js
import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

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
   HELPER: Generate AI Insights
============================================================ */
async function generateInsights(analyticsData, userId) {
  try {
    if (!analyticsData || analyticsData.totalInterviews < 2) {
      return {
        keyInsights: ["Complete more interviews to unlock personalized insights"],
        optimalStrategies: ["Track at least 2-3 interviews to identify patterns"],
        improvementRecommendations: ["Add more interview data to get specific recommendations"],
        industryComparison: {
          vsAverage: "Insufficient data for comparison",
          standoutMetrics: "N/A",
          concerningMetrics: "N/A"
        }
      };
    }

    const prompt = `You are an expert interview coach analyzing a candidate's performance data.

PERFORMANCE DATA:
- Total Interviews: ${analyticsData.totalInterviews}
- Conversion Rate: ${analyticsData.conversionRate}%
- Average Self-Rating: ${analyticsData.avgSelfRating}/5
- Average Confidence: ${analyticsData.avgConfidence}/5
- Total Offers: ${analyticsData.totalOffers}
- Strongest Areas: ${analyticsData.strongestAreas?.join(', ') || 'N/A'}
- Weakest Areas: ${analyticsData.weakestAreas?.join(', ') || 'N/A'}
- Most Successful Format: ${analyticsData.bestFormat || 'N/A'}
- Practice Sessions Completed: ${analyticsData.totalPractice || 0}

Generate a JSON response with this EXACT structure:
{
  "keyInsights": [
    "3-5 specific, actionable insights about their performance",
    "Focus on patterns, trends, and what's working/not working",
    "Reference actual numbers from their data"
  ],
  "optimalStrategies": [
    "3-4 specific strategies they should use based on their data",
    "What interview formats work best for them",
    "How to leverage their strengths"
  ],
  "improvementRecommendations": [
    "3-5 specific, prioritized recommendations to improve",
    "Focus on their weakest areas with concrete action items",
    "Include practice suggestions (mock interviews, specific skills)"
  ],
  "industryComparison": {
    "vsAverage": "How they compare to industry average (better/worse/on par)",
    "standoutMetrics": "What metrics are notably strong",
    "concerningMetrics": "What metrics need attention"
  }
}

Be specific, data-driven, and actionable. Reference actual numbers from their data.
Return ONLY valid JSON, no markdown formatting.`;

    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach who provides specific, data-driven insights and recommendations.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI Insights Generation Error:", err.message);
    return {
      keyInsights: ["Unable to generate AI insights at this time"],
      optimalStrategies: ["Continue tracking your interview performance"],
      improvementRecommendations: ["Focus on areas where you received lower ratings"],
      industryComparison: {
        vsAverage: "Unable to compare",
        standoutMetrics: "N/A",
        concerningMetrics: "N/A"
      }
    };
  }
}

/* ============================================================
   GET /analytics
   Get comprehensive interview performance analytics
============================================================ */
router.get("/analytics", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();
    const timeRange = req.query.timeRange || 'all';

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: "userId is required" 
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid userId" 
      });
    }

    console.log(`📊 Generating analytics for user ${userId}, timeRange: ${timeRange}`);

    // Calculate date filter
    let dateFilter = null;
    const now = new Date();
    if (timeRange === '30d') {
      dateFilter = new Date(now.setDate(now.getDate() - 30)).toISOString();
    } else if (timeRange === '90d') {
      dateFilter = new Date(now.setDate(now.getDate() - 90)).toISOString();
    } else if (timeRange === '6m') {
      dateFilter = new Date(now.setMonth(now.getMonth() - 6)).toISOString();
    } else if (timeRange === '1y') {
      dateFilter = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    }

    // Fetch interview outcomes
    let interviewQuery = supabase
      .from('interview_outcomes')
      .select('*')
      .eq('user_id', userIdInt)
      .order('interview_date', { ascending: false });
    
    if (dateFilter) {
      interviewQuery = interviewQuery.gte('interview_date', dateFilter);
    }

    const { data: interviews, error: interviewsError } = await interviewQuery;

    if (interviewsError) {
      console.error("❌ Interviews fetch error:", interviewsError);
      throw interviewsError;
    }

    // Fetch mock interviews for practice data
    const { data: mockInterviews, error: mockError } = await supabase
      .from('mock_interview_sessions')
      .select('*')
      .eq('user_id', userIdInt)
      .eq('status', 'completed');

    if (mockError) {
      console.error("❌ Mock interviews fetch error:", mockError);
    }

    const interviewData = interviews || [];
    const practiceData = mockInterviews || [];

    // === ACCEPTANCE CRITERIA 1: Conversion Rates ===
    const totalInterviews = interviewData.length;
    const offersReceived = interviewData.filter(i => 
      i.outcome === 'offer_received' || i.outcome === 'offer_accepted'
    ).length;
    const offersAccepted = interviewData.filter(i => i.outcome === 'offer_accepted').length;
    const conversionRate = totalInterviews > 0 
      ? parseFloat(((offersReceived / totalInterviews) * 100).toFixed(1))
      : 0;

    // === ACCEPTANCE CRITERIA 2: Company Type Analysis ===
    const companyTypes = {};
    interviewData.forEach(interview => {
      // Categorize by company name
      const companyLower = interview.company.toLowerCase();
      let type = 'Mid-size';
      
      if (companyLower.includes('google') || companyLower.includes('meta') ||
          companyLower.includes('amazon') || companyLower.includes('apple') ||
          companyLower.includes('microsoft') || companyLower.includes('netflix')) {
        type = 'FAANG';
      } else if (companyLower.includes('startup') || interview.company_type === 'startup') {
        type = 'Startup';
      }
      
      if (!companyTypes[type]) {
        companyTypes[type] = { total: 0, offers: 0, ratings: [] };
      }
      
      companyTypes[type].total++;
      if (interview.outcome === 'offer_received' || interview.outcome === 'offer_accepted') {
        companyTypes[type].offers++;
      }
      if (interview.self_rating) {
        companyTypes[type].ratings.push(interview.self_rating);
      }
    });

    const companyTypeAnalysis = Object.entries(companyTypes).map(([type, data]) => ({
      type,
      total: data.total,
      offers: data.offers,
      conversionRate: parseFloat(((data.offers / data.total) * 100).toFixed(1)),
      avgPerformance: data.ratings.length > 0
        ? parseFloat((data.ratings.reduce((a, b) => a + b) / data.ratings.length).toFixed(1))
        : 0
    }));

    // === ACCEPTANCE CRITERIA 3: Strongest & Weakest Areas ===
    const areasPerformance = {};
    
    interviewData.forEach(interview => {
      // Process areas covered with ratings
      if (interview.areas_covered) {
        const areas = Array.isArray(interview.areas_covered) 
          ? interview.areas_covered 
          : (typeof interview.areas_covered === 'object' ? Object.values(interview.areas_covered) : []);
        
        areas.forEach(area => {
          if (!areasPerformance[area]) {
            areasPerformance[area] = { count: 0, totalRating: 0, ratings: [] };
          }
          areasPerformance[area].count++;
          if (interview.self_rating) {
            areasPerformance[area].totalRating += interview.self_rating;
            areasPerformance[area].ratings.push(interview.self_rating);
          }
        });
      }
    });

    const strongestAreas = Object.entries(areasPerformance)
      .map(([area, data]) => ({
        area,
        avgRating: data.ratings.length > 0 
          ? parseFloat((data.totalRating / data.ratings.length).toFixed(1))
          : 0,
        count: data.count
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);

    const weakestAreas = Object.entries(areasPerformance)
      .map(([area, data]) => ({
        area,
        avgRating: data.ratings.length > 0 
          ? parseFloat((data.totalRating / data.ratings.length).toFixed(1))
          : 0,
        count: data.count
      }))
      .sort((a, b) => a.avgRating - b.avgRating)
      .slice(0, 5);

    // Top strengths and weaknesses (mentioned frequently)
    const strengthCounts = {};
    const weaknessCounts = {};

    interviewData.forEach(i => {
      if (i.strengths) {
        const strengths = Array.isArray(i.strengths) ? i.strengths : i.strengths;
        if (Array.isArray(strengths)) {
          strengths.forEach(s => {
            const strength = typeof s === 'string' ? s.trim() : s;
            strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
          });
        }
      }
      if (i.weaknesses) {
        const weaknesses = Array.isArray(i.weaknesses) ? i.weaknesses : i.weaknesses;
        if (Array.isArray(weaknesses)) {
          weaknesses.forEach(w => {
            const weakness = typeof w === 'string' ? w.trim() : w;
            weaknessCounts[weakness] = (weaknessCounts[weakness] || 0) + 1;
          });
        }
      }
    });

    const topStrengths = Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength, count]) => ({ strength, count }));

    const topWeaknesses = Object.entries(weaknessCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([weakness, count]) => ({ weakness, count }));

    // === ACCEPTANCE CRITERIA 4: Format Comparison ===
    const formatAnalysis = {};
    interviewData.forEach(interview => {
      const format = interview.interview_format || 'not_specified';
      if (!formatAnalysis[format]) {
        formatAnalysis[format] = { 
          total: 0, 
          offers: 0, 
          ratings: [], 
          confidence: [] 
        };
      }
      
      formatAnalysis[format].total++;
      if (interview.outcome === 'offer_received' || interview.outcome === 'offer_accepted') {
        formatAnalysis[format].offers++;
      }
      if (interview.self_rating) formatAnalysis[format].ratings.push(interview.self_rating);
      if (interview.confidence_level) formatAnalysis[format].confidence.push(interview.confidence_level);
    });

    const formatComparison = Object.entries(formatAnalysis).map(([format, data]) => ({
      format,
      total: data.total,
      offers: data.offers,
      conversionRate: parseFloat(((data.offers / data.total) * 100).toFixed(1)),
      avgPerformance: data.ratings.length > 0
        ? parseFloat((data.ratings.reduce((a, b) => a + b) / data.ratings.length).toFixed(1))
        : 0,
      avgConfidence: data.confidence.length > 0
        ? parseFloat((data.confidence.reduce((a, b) => a + b) / data.confidence.length).toFixed(1))
        : 0
    }));

    // === ACCEPTANCE CRITERIA 5: Improvement Over Time ===
    const sortedInterviews = [...interviewData].sort((a, b) => 
      new Date(a.interview_date) - new Date(b.interview_date)
    );

    const firstQuarter = sortedInterviews.slice(0, Math.ceil(sortedInterviews.length / 4));
    const lastQuarter = sortedInterviews.slice(-Math.ceil(sortedInterviews.length / 4));

    const earlyRatings = firstQuarter.filter(i => i.self_rating).map(i => i.self_rating);
    const recentRatings = lastQuarter.filter(i => i.self_rating).map(i => i.self_rating);

    const earlyAvgRating = earlyRatings.length > 0
      ? parseFloat((earlyRatings.reduce((a, b) => a + b) / earlyRatings.length).toFixed(1))
      : 0;

    const recentAvgRating = recentRatings.length > 0
      ? parseFloat((recentRatings.reduce((a, b) => a + b) / recentRatings.length).toFixed(1))
      : 0;

    const improvementRate = earlyAvgRating > 0 && recentAvgRating > 0
      ? parseFloat((((recentAvgRating - earlyAvgRating) / earlyAvgRating) * 100).toFixed(1))
      : 0;

    const trend = improvementRate > 5 ? 'improving' : 
                  improvementRate < -5 ? 'declining' : 'stable';

    const improvementOverTime = {
      earlyPerformance: earlyAvgRating,
      recentPerformance: recentAvgRating,
      improvementRate,
      trend
    };

    // Monthly trends for charts
    const monthlyTrends = {};
    interviewData.forEach(interview => {
      const date = new Date(interview.interview_date);
      const month = date.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = { interviews: 0, offers: 0, ratings: [] };
      }
      monthlyTrends[month].interviews++;
      if (interview.outcome === 'offer_received' || interview.outcome === 'offer_accepted') {
        monthlyTrends[month].offers++;
      }
      if (interview.self_rating) {
        monthlyTrends[month].ratings.push(interview.self_rating);
      }
    });

    const trendsOverTime = Object.entries(monthlyTrends)
      .map(([month, data]) => ({
        month,
        interviews: data.interviews,
        offers: data.offers,
        conversionRate: parseFloat(((data.offers / data.interviews) * 100).toFixed(1)),
        avgRating: data.ratings.length > 0 
          ? parseFloat((data.ratings.reduce((a, b) => a + b) / data.ratings.length).toFixed(1))
          : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Practice session impact
    const totalPractice = practiceData.length;
    const practiceScores = practiceData.filter(p => p.overall_performance_score).map(p => p.overall_performance_score);
    const avgPracticeScore = practiceScores.length > 0
      ? parseFloat((practiceScores.reduce((a, b) => a + b) / practiceScores.length).toFixed(1))
      : 0;

    // Interviews with practice vs without
    const interviewsWithPractice = interviewData.filter(i => i.mock_interviews_completed > 0);
    const interviewsWithoutPractice = interviewData.filter(i => !i.mock_interviews_completed || i.mock_interviews_completed === 0);

    const withPracticeRatings = interviewsWithPractice.filter(i => i.self_rating).map(i => i.self_rating);
    const withoutPracticeRatings = interviewsWithoutPractice.filter(i => i.self_rating).map(i => i.self_rating);

    const avgRatingWithPractice = withPracticeRatings.length > 0
      ? parseFloat((withPracticeRatings.reduce((a, b) => a + b) / withPracticeRatings.length).toFixed(1))
      : 0;

    const avgRatingWithoutPractice = withoutPracticeRatings.length > 0
      ? parseFloat((withoutPracticeRatings.reduce((a, b) => a + b) / withoutPracticeRatings.length).toFixed(1))
      : 0;

    const practiceImpact = {
      totalSessions: totalPractice,
      avgPracticeScore,
      avgRatingWithPractice,
      avgRatingWithoutPractice,
      practiceCorrelation: avgRatingWithPractice > avgRatingWithoutPractice ? 'positive' : 'neutral'
    };

    // === Summary metrics ===
    const allRatings = interviewData.filter(i => i.self_rating).map(i => i.self_rating);
    const allConfidence = interviewData.filter(i => i.confidence_level).map(i => i.confidence_level);

    const avgSelfRating = allRatings.length > 0
      ? parseFloat((allRatings.reduce((a, b) => a + b) / allRatings.length).toFixed(1))
      : 0;

    const avgConfidence = allConfidence.length > 0
      ? parseFloat((allConfidence.reduce((a, b) => a + b) / allConfidence.length).toFixed(1))
      : 0;

    const summary = {
      totalInterviews,
      totalOffers: offersReceived,
      offersAccepted,
      conversionRate,
      avgSelfRating,
      avgConfidence,
      totalPractice,
      improvementRate
    };

    // === ACCEPTANCE CRITERIA 7: Industry Benchmarks ===
    const benchmarkComparison = {
      conversionRate: {
        user: conversionRate,
        industry: 25,
        difference: parseFloat((conversionRate - 25).toFixed(1)),
        percentile: conversionRate >= 40 ? 'top_20' : 
                    conversionRate >= 25 ? 'above_average' : 'below_average'
      },
      selfRating: {
        user: avgSelfRating,
        industry: 3.5,
        difference: parseFloat((avgSelfRating - 3.5).toFixed(1)),
        percentile: avgSelfRating >= 4.2 ? 'top_20' : 
                    avgSelfRating >= 3.5 ? 'above_average' : 'below_average'
      },
      confidence: {
        user: avgConfidence,
        industry: 3.2,
        difference: parseFloat((avgConfidence - 3.2).toFixed(1))
      }
    };

    // === ACCEPTANCE CRITERIA 6 & 8: AI-Generated Insights & Recommendations ===
    const analyticsForAI = {
      totalInterviews,
      conversionRate,
      avgSelfRating,
      avgConfidence,
      totalOffers: offersReceived,
      strongestAreas: strongestAreas.map(a => a.area),
      weakestAreas: weakestAreas.map(a => a.area),
      bestFormat: formatComparison.length > 0 
        ? formatComparison.sort((a, b) => b.conversionRate - a.conversionRate)[0].format 
        : null,
      totalPractice,
      performanceTrend: trend,
      improvementRate
    };

    const aiInsights = await generateInsights(analyticsForAI, userId);

    // === Compile final response ===
    const response = {
      summary,
      companyTypeAnalysis,
      strongestAreas,
      weakestAreas,
      topStrengths,
      topWeaknesses,
      formatComparison,
      improvementOverTime,
      trendsOverTime,
      practiceImpact,
      benchmarkComparison,
      aiInsights
    };

    console.log(`✅ Analytics generated successfully for user ${userId}`);

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (err) {
    console.error("❌ Analytics Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to generate analytics" 
    });
  }
});

/* ============================================================
   POST /outcome
   Record interview outcome
============================================================ */
router.post("/outcome", async (req, res) => {
  try {
    const {
      userId,
      jobId,
      company,
      role,
      interviewDate,
      interviewType,
      interviewFormat,
      difficultyRating,
      selfRating,
      confidenceLevel,
      areasCovered,
      strengths,
      weaknesses,
      outcome,
      feedbackReceived,
      nextRoundScheduled,
      offerAmount,
      offerReceivedDate,
      hoursPrepared,
      mockInterviewsCompleted,
      usedAiCoaching,
      notes,
      lessonsLearned
    } = req.body;

    if (!userId || !company || !role || !interviewDate || !interviewType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, company, role, interviewDate, interviewType"
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
        .from("interview_outcomes")
        .insert({
          user_id: userIdInt,
          job_id: jobId || null,
          company,
          role,
          interview_date: interviewDate,
          interview_type: interviewType,
          interview_format: interviewFormat || null,
          difficulty_rating: difficultyRating || null,
          self_rating: selfRating || null,
          confidence_level: confidenceLevel || null,
          areas_covered: areasCovered || null,
          strengths: strengths || null,
          weaknesses: weaknesses || null,
          outcome: outcome || 'pending',
          feedback_received: feedbackReceived || null,
          next_round_scheduled: nextRoundScheduled || false,
          offer_amount: offerAmount || null,
          offer_received_date: offerReceivedDate || null,
          hours_prepared: hoursPrepared || null,
          mock_interviews_completed: mockInterviewsCompleted || 0,
          used_ai_coaching: usedAiCoaching || false,
          notes: notes || null,
          lessons_learned: lessonsLearned || null
        })
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while saving interview outcome",
        error: error.message
      });
    }

    console.log(`✅ Interview outcome recorded (ID: ${data.id})`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error recording interview outcome:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to record interview outcome"
    });
  }
});

/* ============================================================
   PUT /outcome/:id
   Update interview outcome
============================================================ */
router.put("/outcome/:id", async (req, res) => {
  try {
    const outcomeId = parseInt(req.params.id, 10);
    const userId = req.query.userId?.trim();

    if (isNaN(outcomeId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid outcome ID or missing userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    const updates = {};
    const allowedFields = [
      'outcome', 'feedback_received', 'next_round_scheduled', 'offer_amount',
      'offer_received_date', 'self_rating', 'confidence_level', 'difficulty_rating',
      'strengths', 'weaknesses', 'notes', 'lessons_learned'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update"
      });
    }

    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from("interview_outcomes")
        .update(updates)
        .eq("id", outcomeId)
        .eq("user_id", userIdInt)
        .select()
        .single();
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while updating interview outcome",
        error: error.message
      });
    }

    console.log(`✅ Interview outcome updated (ID: ${outcomeId})`);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error updating interview outcome:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update interview outcome"
    });
  }
});

/* ============================================================
   DELETE /outcome/:id
   Delete interview outcome
============================================================ */
router.delete("/outcome/:id", async (req, res) => {
  try {
    const outcomeId = parseInt(req.params.id, 10);
    const userId = req.query.userId?.trim();

    if (isNaN(outcomeId) || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid outcome ID or missing userId"
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
        .from("interview_outcomes")
        .delete()
        .eq("id", outcomeId)
        .eq("user_id", userIdInt);
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while deleting interview outcome",
        error: error.message
      });
    }

    console.log(`✅ Interview outcome deleted (ID: ${outcomeId})`);

    return res.json({
      success: true,
      message: "Interview outcome deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting interview outcome:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete interview outcome"
    });
  }
});

/* ============================================================
   GET /outcomes
   Get list of interview outcomes for user
============================================================ */
router.get("/outcomes", async (req, res) => {
  try {
    const userId = req.query.userId?.trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
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
      .from("interview_outcomes")
      .select('*')
      .eq("user_id", userIdInt)
      .order('interview_date', { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching interviews",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("❌ Error fetching interviews:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interviews"
    });
  }
});

export default router;