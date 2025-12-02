import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
router.use(auth);

// Initialize Supabase client for mock interview data
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Industry benchmarks for interviews
const INDUSTRY_BENCHMARKS = {
  interviewToOfferRate: 0.25, // 25% of interviews lead to offers (industry avg)
  avgConfidenceScore: 70,
  avgPassRate: 0.60, // 60% pass rate for interviews
  avgResponseTime: 7, // 7 days from interview to decision
};

// Helper to ensure numbers
function ensureNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// Helper to extract keywords from feedback
function extractKeywords(text) {
  if (!text) return [];
  const commonWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'your', 'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their', 'it', 'its', 'this', 'that', 'these', 'those'];
  
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.includes(w));
  
  return words;
}

// Helper to infer/normalize industry
function inferIndustry(industry, company, title) {
  if (industry && industry.trim() && industry.toLowerCase() !== 'unknown') {
    // Normalize common variations
    const normalized = industry.trim().toLowerCase();
    if (normalized.includes('tech') || normalized === 'technology') return 'Technology';
    if (normalized.includes('finance') || normalized.includes('financial')) return 'Finance';
    if (normalized.includes('health') || normalized.includes('medical')) return 'Healthcare';
    if (normalized.includes('consult')) return 'Consulting';
    if (normalized.includes('retail')) return 'Retail';
    if (normalized.includes('education')) return 'Education';
    return industry.trim();
  }
  
  const combined = `${company || ''} ${title || ''}`.toLowerCase();
  
  // Tech companies
  if (combined.match(/\b(google|microsoft|apple|amazon|meta|facebook|netflix|tesla|nvidia|intel|amd|oracle|salesforce|adobe|ibm|cisco|vmware|palantir|uber|lyft|airbnb|stripe|square|paypal|twilio|atlassian|slack|zoom|dropbox|box|splunk|databricks|snowflake|mongodb|elastic|gitlab|github|docker|kubernetes|njit)\b/)) {
    return 'Technology';
  }
  // Finance
  if (combined.match(/\b(jpmorgan|chase|bank of america|goldman sachs|morgan stanley|wells fargo|citibank|citigroup|blackrock|fidelity|vanguard|bloomberg|fintech|trading|investment|banking)\b/)) {
    return 'Finance';
  }
  // Healthcare
  if (combined.match(/\b(johnson|pfizer|merck|novartis|roche|bayer|pharma|healthcare|medical|hospital|biotech)\b/)) {
    return 'Healthcare';
  }
  // Consulting
  if (combined.match(/\b(mckinsey|bain|boston consulting|bcg|deloitte|pwc|ey|kpmg|accenture|consulting)\b/)) {
    return 'Consulting';
  }
  // Retail/Service
  if (combined.match(/\b(retail|dunkin|starbucks|walmart|target|service)\b/)) {
    return 'Retail/Service';
  }
  // Education
  if (combined.match(/\b(education|university|college|school|academic)\b/)) {
    return 'Education';
  }
  
  return 'Other';
}

// Helper to categorize feedback themes
function categorizeFeedback(keywords) {
  const themes = {
    communication: ['communication', 'clarity', 'articulate', 'explain', 'presentation', 'speaking', 'verbal', 'clear'],
    technical: ['technical', 'coding', 'algorithm', 'system', 'design', 'architecture', 'programming', 'software', 'code'],
    behavioral: ['teamwork', 'leadership', 'conflict', 'collaboration', 'team', 'manage', 'lead', 'work'],
    confidence: ['confidence', 'nervous', 'anxiety', 'calm', 'composed', 'relaxed', 'stressed'],
    preparation: ['prepared', 'research', 'knowledge', 'understand', 'familiar', 'study'],
    experience: ['experience', 'example', 'story', 'situation', 'project', 'background'],
    culture: ['culture', 'fit', 'values', 'company', 'mission', 'passion']
  };

  const result = {};
  for (const [theme, themeWords] of Object.entries(themes)) {
    result[theme] = keywords.filter(k => themeWords.some(tw => k.includes(tw))).length;
  }
  return result;
}

/* ==================================================================
   GET /api/interview-analysis/full
   Comprehensive interview analytics
================================================================== */
router.get("/full", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("========================================");
    console.log("Interview Analysis for user:", userId);
    console.log("========================================");

    // --------------------------------------------------------
    // 1. INTERVIEW-TO-OFFER CONVERSION (from jobs table)
    // --------------------------------------------------------
    const conversionQuery = `
      SELECT 
        DATE_TRUNC('month', status_updated_at) AS month,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') AS total_interviews,
        COUNT(*) FILTER (WHERE status = 'Offer') AS offers
      FROM jobs
      WHERE user_id = $1 
        AND (status = 'Interview' OR status = 'Offer')
        AND ("isarchived" IS NULL OR "isarchived" = false)
        AND status_updated_at IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12;
    `;
    const conversionResult = await pool.query(conversionQuery, [userId]);
    
    const conversionOverTime = conversionResult.rows.map(row => ({
      month: row.month,
      monthLabel: row.month ? new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
      totalInterviews: ensureNumber(row.total_interviews),
      offers: ensureNumber(row.offers),
      conversionRate: ensureNumber(row.total_interviews) > 0 
        ? ensureNumber(row.offers) / ensureNumber(row.total_interviews) 
        : 0
    }));

    // Overall conversion stats
    const overallConversionQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') AS total_interviews,
        COUNT(*) FILTER (WHERE status = 'Offer') AS total_offers
      FROM jobs
      WHERE user_id = $1 
        AND ("isarchived" IS NULL OR "isarchived" = false);
    `;
    const overallConversion = (await pool.query(overallConversionQuery, [userId])).rows[0];

    // --------------------------------------------------------
    // 2. MOCK INTERVIEW PERFORMANCE (from Supabase)
    // --------------------------------------------------------
    let mockInterviewStats = {
      totalSessions: 0,
      completedSessions: 0,
      avgConfidenceScore: 0,
      avgAnxietyScore: 0, // Calculated as inverse of confidence (100 - confidence)
      avgOverallScore: 0,
      byType: [],
      confidenceTrend: [],
      anxietyTrend: [], // Track anxiety over time
      recentSessions: []
    };

    try {
      // Get all mock interview sessions
      const { data: mockSessions, error: mockError } = await supabase
        .from("mock_interview_sessions")
        .select(`
          *,
          mock_interview_summaries (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!mockError && mockSessions) {
        mockInterviewStats.totalSessions = mockSessions.length;
        mockInterviewStats.completedSessions = mockSessions.filter(s => s.status === "completed").length;
        
        // Calculate averages from completed sessions
        const completedWithSummaries = mockSessions.filter(s => 
          s.status === "completed" && s.mock_interview_summaries?.length > 0
        );

        if (completedWithSummaries.length > 0) {
          const avgConfidence = completedWithSummaries.reduce((sum, s) => 
            sum + (s.mock_interview_summaries[0]?.confidence_level_score || 0), 0
          ) / completedWithSummaries.length;
          
          // Calculate anxiety as inverse of confidence (lower confidence = higher anxiety)
          // Also check for anxiety keywords in feedback
          const anxietyScores = completedWithSummaries.map(s => {
            const confidence = s.mock_interview_summaries[0]?.confidence_level_score || 0;
            let anxietyFromConfidence = 100 - confidence; // Inverse relationship
            
            // Check for anxiety keywords in improvement areas
            const improvementText = s.mock_interview_summaries[0]?.improvement_areas?.join(' ') || '';
            const anxietyKeywords = ['anxiety', 'nervous', 'stressed', 'worried', 'panic', 'fear', 'apprehensive'];
            const hasAnxietyKeywords = anxietyKeywords.some(kw => improvementText.toLowerCase().includes(kw));
            
            // If anxiety keywords found, increase anxiety score
            if (hasAnxietyKeywords) {
              anxietyFromConfidence = Math.min(100, anxietyFromConfidence + 15);
            }
            
            return anxietyFromConfidence;
          });
          
          const avgAnxiety = anxietyScores.reduce((sum, a) => sum + a, 0) / anxietyScores.length;
          
          const avgOverall = completedWithSummaries.reduce((sum, s) => 
            sum + (s.overall_performance_score || 0), 0
          ) / completedWithSummaries.length;

          mockInterviewStats.avgConfidenceScore = Math.round(avgConfidence);
          mockInterviewStats.avgAnxietyScore = Math.round(avgAnxiety);
          mockInterviewStats.avgOverallScore = Math.round(avgOverall);
        }

        // Performance by interview type
        const typeMap = {};
        mockSessions.forEach(s => {
          const type = s.interview_type || 'mixed';
          if (!typeMap[type]) {
            typeMap[type] = { type, count: 0, totalScore: 0, completed: 0 };
          }
          typeMap[type].count++;
          if (s.status === "completed" && s.overall_performance_score) {
            typeMap[type].completed++;
            typeMap[type].totalScore += s.overall_performance_score;
          }
        });

        mockInterviewStats.byType = Object.values(typeMap).map(t => ({
          type: t.type,
          label: t.type.charAt(0).toUpperCase() + t.type.slice(1).replace('_', ' '),
          count: t.count,
          avgScore: t.completed > 0 ? Math.round(t.totalScore / t.completed) : 0,
          passRate: t.completed > 0 ? t.completed / t.count : 0
        }));

        // Confidence trend over time (last 10 sessions)
        mockInterviewStats.confidenceTrend = completedWithSummaries
          .slice(0, 10)
          .reverse()
          .map((s, i) => ({
            session: i + 1,
            date: s.completed_at || s.created_at,
            confidenceScore: s.mock_interview_summaries[0]?.confidence_level_score || 0,
            overallScore: s.overall_performance_score || 0
          }));

        // Anxiety trend over time (last 10 sessions)
        mockInterviewStats.anxietyTrend = completedWithSummaries
          .slice(0, 10)
          .reverse()
          .map((s, i) => {
            const confidence = s.mock_interview_summaries[0]?.confidence_level_score || 0;
            let anxietyScore = 100 - confidence;
            
            // Check for anxiety keywords
            const improvementText = s.mock_interview_summaries[0]?.improvement_areas?.join(' ') || '';
            const anxietyKeywords = ['anxiety', 'nervous', 'stressed', 'worried', 'panic', 'fear', 'apprehensive'];
            if (anxietyKeywords.some(kw => improvementText.toLowerCase().includes(kw))) {
              anxietyScore = Math.min(100, anxietyScore + 15);
            }
            
            return {
              session: i + 1,
              date: s.completed_at || s.created_at,
              anxietyScore: Math.round(anxietyScore),
              confidenceScore: confidence
            };
          });

        // Recent sessions for display
        mockInterviewStats.recentSessions = mockSessions.slice(0, 5).map(s => ({
          id: s.id,
          company: s.company,
          role: s.role,
          type: s.interview_type,
          status: s.status,
          score: s.overall_performance_score,
          confidenceScore: s.confidence_score,
          date: s.created_at
        }));
      }
    } catch (supabaseErr) {
      console.warn("Supabase mock interview fetch failed:", supabaseErr.message);
    }

    // --------------------------------------------------------
    // 3. REAL VS MOCK COMPARISON
    // --------------------------------------------------------
    const realInterviews = ensureNumber(overallConversion.total_interviews);
    const realOffers = ensureNumber(overallConversion.total_offers);
    const realConversionRate = realInterviews > 0 ? realOffers / realInterviews : 0;

    const mockVsReal = {
      mock: {
        count: mockInterviewStats.completedSessions,
        avgScore: mockInterviewStats.avgOverallScore,
        label: "Mock Interviews"
      },
      real: {
        count: realInterviews,
        conversionRate: realConversionRate,
        offers: realOffers,
        label: "Real Interviews"
      },
      insight: mockInterviewStats.completedSessions >= 3 && realInterviews >= 2
        ? (realConversionRate > 0.3 
            ? "Your real interview conversion rate is above average! Mock practice is paying off."
            : "Consider more mock practice to improve your real interview performance.")
        : "Complete more interviews to generate meaningful comparison insights."
    };

    // --------------------------------------------------------
    // 4. FEEDBACK THEME ANALYSIS (from mock interview summaries)
    // --------------------------------------------------------
    let feedbackThemes = {
      positive: {},
      improvement: {},
      allKeywords: []
    };

    try {
      const { data: summaries } = await supabase
        .from("mock_interview_summaries")
        .select("strengths, improvement_areas, performance_summary")
        .limit(20);

      if (summaries) {
        let allPositiveKeywords = [];
        let allImprovementKeywords = [];

        summaries.forEach(s => {
          if (s.strengths) {
            s.strengths.forEach(str => {
              allPositiveKeywords.push(...extractKeywords(str));
            });
          }
          if (s.improvement_areas) {
            s.improvement_areas.forEach(imp => {
              allImprovementKeywords.push(...extractKeywords(imp));
            });
          }
        });

        feedbackThemes.positive = categorizeFeedback(allPositiveKeywords);
        feedbackThemes.improvement = categorizeFeedback(allImprovementKeywords);
        
        // Count keyword frequency
        const keywordCount = {};
        [...allPositiveKeywords, ...allImprovementKeywords].forEach(k => {
          keywordCount[k] = (keywordCount[k] || 0) + 1;
        });
        
        feedbackThemes.allKeywords = Object.entries(keywordCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([word, count]) => ({ word, count }));
      }
    } catch (err) {
      console.warn("Feedback analysis error:", err.message);
    }

    // --------------------------------------------------------
    // 5. PERFORMANCE BY INDUSTRY (from jobs + interviews)
    // --------------------------------------------------------
    const industryQuery = `
      SELECT 
        industry,
        company,
        title,
        status
      FROM jobs
      WHERE user_id = $1 
        AND ("isarchived" IS NULL OR "isarchived" = false);
    `;
    const industryResult = await pool.query(industryQuery, [userId]);
    
    // Normalize industries and aggregate
    const industryMap = {};
    industryResult.rows.forEach(row => {
      const normalizedIndustry = inferIndustry(row.industry, row.company, row.title);
      if (!industryMap[normalizedIndustry]) {
        industryMap[normalizedIndustry] = {
          industry: normalizedIndustry,
          applications: 0,
          interviews: 0,
          offers: 0
        };
      }
      
      industryMap[normalizedIndustry].applications += 1;
      
      if (row.status === 'Interview' || row.status === 'Offer') {
        industryMap[normalizedIndustry].interviews += 1;
      }
      if (row.status === 'Offer') {
        industryMap[normalizedIndustry].offers += 1;
      }
    });
    
    // Convert to array and filter (need at least 2 applications)
    const industryPerformance = Object.values(industryMap)
      .filter(ind => ind.applications >= 2)
      .map(ind => ({
        industry: ind.industry,
        applications: ind.applications,
        interviews: ind.interviews,
        offers: ind.offers,
        interviewRate: ind.applications > 0 
          ? ind.interviews / ind.applications 
          : 0,
        offerRate: ind.interviews > 0 
          ? ind.offers / ind.interviews 
          : 0
      }))
      .sort((a, b) => b.applications - a.applications);

    // --------------------------------------------------------
    // 6. SUMMARY CARDS DATA
    // --------------------------------------------------------
    const summaryCards = {
      totalRealInterviews: realInterviews,
      totalOffers: realOffers,
      overallConversionRate: realConversionRate,
      totalMockSessions: mockInterviewStats.totalSessions,
      avgMockScore: mockInterviewStats.avgOverallScore,
      avgConfidence: mockInterviewStats.avgConfidenceScore,
      avgAnxiety: mockInterviewStats.avgAnxietyScore,
      improvementFromMocks: mockInterviewStats.confidenceTrend.length >= 2
        ? mockInterviewStats.confidenceTrend[mockInterviewStats.confidenceTrend.length - 1].confidenceScore - 
          mockInterviewStats.confidenceTrend[0].confidenceScore
        : 0,
      anxietyImprovement: mockInterviewStats.anxietyTrend.length >= 2
        ? mockInterviewStats.anxietyTrend[0].anxietyScore - 
          mockInterviewStats.anxietyTrend[mockInterviewStats.anxietyTrend.length - 1].anxietyScore
        : 0
    };

    // --------------------------------------------------------
    // 7. BENCHMARK COMPARISON
    // --------------------------------------------------------
    const benchmarkComparison = {
      interviewToOffer: {
        user: realConversionRate,
        industry: INDUSTRY_BENCHMARKS.interviewToOfferRate,
        status: realConversionRate >= INDUSTRY_BENCHMARKS.interviewToOfferRate ? 'above' : 'below',
        percentDiff: INDUSTRY_BENCHMARKS.interviewToOfferRate > 0 
          ? ((realConversionRate - INDUSTRY_BENCHMARKS.interviewToOfferRate) / INDUSTRY_BENCHMARKS.interviewToOfferRate * 100)
          : 0
      },
      confidence: {
        user: mockInterviewStats.avgConfidenceScore,
        industry: INDUSTRY_BENCHMARKS.avgConfidenceScore,
        status: mockInterviewStats.avgConfidenceScore >= INDUSTRY_BENCHMARKS.avgConfidenceScore ? 'above' : 'below'
      },
      anxiety: {
        user: mockInterviewStats.avgAnxietyScore,
        industry: 30, // Industry average anxiety (lower is better)
        status: mockInterviewStats.avgAnxietyScore <= 30 ? 'above' : 'below' // Above = better (lower anxiety)
      },
      passRate: {
        user: mockInterviewStats.completedSessions > 0 
          ? mockInterviewStats.byType.reduce((sum, t) => sum + t.passRate, 0) / Math.max(mockInterviewStats.byType.length, 1)
          : 0,
        industry: INDUSTRY_BENCHMARKS.avgPassRate,
        status: 'calculating'
      }
    };

    // --------------------------------------------------------
    // 8. PERSONALIZED RECOMMENDATIONS
    // --------------------------------------------------------
    const recommendations = [];

    // Weak interview types
    const weakTypes = mockInterviewStats.byType.filter(t => t.avgScore < 60 && t.count >= 2);
    weakTypes.forEach(t => {
      recommendations.push({
        type: "interview_type",
        priority: "high",
        message: `Your **${t.label}** interviews score ${t.avgScore}% on average. Focus on practicing this interview format.`,
        action: `Schedule more ${t.type} mock interviews`
      });
    });

    // Low conversion rate
    if (realInterviews >= 3 && realConversionRate < 0.2) {
      recommendations.push({
        type: "conversion",
        priority: "high",
        message: `Your interview-to-offer conversion rate is ${(realConversionRate * 100).toFixed(1)}%, below the 25% average. Focus on interview preparation.`,
        action: "Review feedback from recent interviews and identify patterns"
      });
    }

    // Confidence issues
    if (mockInterviewStats.avgConfidenceScore > 0 && mockInterviewStats.avgConfidenceScore < 60) {
      recommendations.push({
        type: "confidence",
        priority: "medium",
        message: `Your average confidence score is ${mockInterviewStats.avgConfidenceScore}%. Building confidence can significantly improve performance.`,
        action: "Try confidence-building exercises before interviews"
      });
    }

    // Anxiety management
    if (mockInterviewStats.avgAnxietyScore > 0 && mockInterviewStats.avgAnxietyScore > 50) {
      const anxietyTrend = mockInterviewStats.anxietyTrend;
      const isImproving = anxietyTrend.length >= 2 && 
        anxietyTrend[anxietyTrend.length - 1].anxietyScore < anxietyTrend[0].anxietyScore;
      
      recommendations.push({
        type: "anxiety",
        priority: mockInterviewStats.avgAnxietyScore > 70 ? "high" : "medium",
        message: `Your anxiety level is ${mockInterviewStats.avgAnxietyScore}%${isImproving ? ' (improving)' : ''}. High anxiety can negatively impact interview performance.`,
        action: isImproving 
          ? "Continue practicing anxiety management techniques - you're making progress!"
          : "Practice deep breathing, visualization, and mock interviews to reduce anxiety"
      });
    }

    // Anxiety improvement recognition
    if (mockInterviewStats.anxietyTrend.length >= 3) {
      const recentAnxiety = mockInterviewStats.anxietyTrend.slice(-3).reduce((sum, t) => sum + t.anxietyScore, 0) / 3;
      const earlyAnxiety = mockInterviewStats.anxietyTrend.slice(0, 3).reduce((sum, t) => sum + t.anxietyScore, 0) / 3;
      if (recentAnxiety < earlyAnxiety - 10) {
        recommendations.push({
          type: "anxiety",
          priority: "low",
          message: `Great progress! Your anxiety has decreased from ${Math.round(earlyAnxiety)}% to ${Math.round(recentAnxiety)}%. Keep practicing anxiety management techniques.`,
          action: "Continue your current anxiety management routine"
        });
      }
    }

    // Feedback patterns
    const improvementThemes = Object.entries(feedbackThemes.improvement)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (improvementThemes.length > 0) {
      const topTheme = improvementThemes[0][0];
      recommendations.push({
        type: "feedback_pattern",
        priority: "medium",
        message: `**${topTheme.charAt(0).toUpperCase() + topTheme.slice(1)}** appears frequently in your improvement areas. Consider focused practice.`,
        action: `Work on ${topTheme} skills through targeted practice`
      });
    }

    // Industry gaps
    const lowPerformingIndustries = industryPerformance.filter(i => 
      i.interviews >= 2 && i.offerRate < 0.15
    );
    lowPerformingIndustries.forEach(ind => {
      recommendations.push({
        type: "industry",
        priority: "low",
        message: `Your interview success rate in **${ind.industry}** is ${(ind.offerRate * 100).toFixed(1)}%. Consider researching industry-specific interview expectations.`,
        action: `Research ${ind.industry} interview best practices`
      });
    });

    // Mock practice recommendation
    if (mockInterviewStats.totalSessions < 5) {
      recommendations.push({
        type: "practice",
        priority: "medium",
        message: `You've completed ${mockInterviewStats.totalSessions} mock interviews. Candidates who practice 5+ mocks show 40% higher conversion rates.`,
        action: "Schedule more mock interview sessions"
      });
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------
    res.json({
      summaryCards,
      conversionOverTime,
      mockInterviewStats,
      mockVsReal,
      feedbackThemes,
      industryPerformance,
      benchmarkComparison,
      recommendations,
      anxietyData: {
        avgAnxiety: mockInterviewStats.avgAnxietyScore,
        trend: mockInterviewStats.anxietyTrend,
        improvement: summaryCards.anxietyImprovement
      },
      dataQuality: {
        hasRealInterviews: realInterviews > 0,
        hasMockData: mockInterviewStats.totalSessions > 0,
        sufficientData: realInterviews >= 3 || mockInterviewStats.completedSessions >= 3
      }
    });

  } catch (err) {
    console.error("Interview analysis error:", err);
    res.status(500).json({ error: "Failed to compute interview analysis", details: err.message });
  }
});

export default router;

