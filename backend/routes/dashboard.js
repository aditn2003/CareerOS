import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// ==========================
//     /api/dashboard/stats
// ==========================

router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;

    // Date filters (frontend passes startDate & endDate)
    const startDate = req.query.startDate || "2000-01-01";
    const endDate = req.query.endDate || "2100-01-01";

    // 🔍 DEBUG LOGS - START
    console.log('========================================');
    console.log('🔍 Dashboard Stats Request');
    console.log('========================================');
    console.log('   User ID:', userId);
    console.log('   Start Date:', startDate);
    console.log('   End Date:', endDate);

    // Test query 1: Total jobs for this user
    const testQuery = await pool.query(
      'SELECT COUNT(*) as total FROM jobs WHERE user_id = $1',
      [userId]
    );
    console.log('🧪 Total jobs for user:', testQuery.rows[0].total);

    // Test query 2: Jobs within date range
    const testDateQuery = await pool.query(
      `SELECT COUNT(*) as total,
              MIN("applicationDate") as earliest_date,
              MAX("applicationDate") as latest_date
       FROM jobs 
       WHERE user_id = $1 
         AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3`,
      [userId, startDate, endDate]
    );
    console.log('🧪 Jobs in date range:', testDateQuery.rows[0]);

    // Test query 3: Check archived flag
    const archivedQuery = await pool.query(
      `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE "isarchived" = true) as archived,
              COUNT(*) FILTER (WHERE "isarchived" = false OR "isarchived" IS NULL) as not_archived
       FROM jobs 
       WHERE user_id = $1`,
      [userId]
    );
    console.log('🧪 Archive status:', archivedQuery.rows[0]);

    // 🔍 DEBUG LOGS - END

    // -----------------------------
    // 1️⃣ KEY METRICS
    // -----------------------------
    const keyMetrics = await pool.query(
      `
      SELECT
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview') AS total_interviews,
        COUNT(*) FILTER (WHERE status = 'Offer') AS total_offers
      FROM jobs
      WHERE user_id = $1 
        AND COALESCE("isarchived", false) = false
        AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3
      `,
      [userId, startDate, endDate]
    );

    console.log('📊 Key Metrics Result:', keyMetrics.rows[0]);

    const benchmarkQuery = await pool.query(
        `
        SELECT 
        COUNT(*) FILTER (WHERE status = 'Interview')::float /
        NULLIF(COUNT(*), 0) AS interview_rate,
    
        COUNT(*) FILTER (WHERE status = 'Offer')::float /
        NULLIF(COUNT(*), 0) AS offer_rate,
    
        AVG(
            EXTRACT(EPOCH FROM (first_response_date - "applicationDate")) / 3600
        ) AS avg_response_hours
    
        FROM jobs
        WHERE user_id = $1 
        AND COALESCE("isarchived", false) = false
        AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3
        `,
        [userId, startDate, endDate]
    );
    // -----------------------------
    // 2️⃣ TIME TO RESPONSE
    // -----------------------------
    const timeToResponse = await pool.query(
      `
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (first_response_date - "applicationDate")) / 3600
        ) AS avg_response_hours
      FROM jobs
      WHERE user_id = $1 
        AND first_response_date IS NOT NULL
        AND "applicationDate" IS NOT NULL
        AND "applicationDate" BETWEEN $2 AND $3
      `,
      [userId, startDate, endDate]
    );

    // Convert null → number so frontend won't break
    const avgResponseHours = Number(timeToResponse.rows[0].avg_response_hours) || 0;

    // -----------------------------
    // 3️⃣ WEEKLY APPLICATION TREND
    const trends = await pool.query(
        `
        WITH app_trend AS (
            SELECT 
              DATE_TRUNC('week', COALESCE("applicationDate", created_at)) AS week_start,
              COUNT(*) AS applications
            FROM jobs
            WHERE user_id = $1
              AND COALESCE("isarchived", false) = false
              AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3
            GROUP BY week_start
          ),
          
          interview_trend AS (
            SELECT 
              DATE_TRUNC('week', COALESCE(interview_date, status_updated_at)) AS week_start,
              COUNT(*) AS interviews
            FROM jobs
            WHERE user_id = $1
              AND status = 'Interview'
              AND interview_date IS NOT NULL
              AND interview_date BETWEEN $2 AND $3
            GROUP BY week_start
          ),
          
          offer_trend AS (
            SELECT 
              DATE_TRUNC('week', COALESCE(offer_date, status_updated_at)) AS week_start,
              COUNT(*) AS offers
            FROM jobs
            WHERE user_id = $1
              AND status = 'Offer'
              AND offer_date IS NOT NULL
              AND offer_date BETWEEN $2 AND $3
            GROUP BY week_start
          )
          
          SELECT
            COALESCE(a.week_start, i.week_start, o.week_start) AS week_start,
            COALESCE(a.applications, 0) AS applications,
            COALESCE(i.interviews, 0) AS interviews,
            COALESCE(o.offers, 0) AS offers
          FROM app_trend a
          FULL OUTER JOIN interview_trend i USING (week_start)
          FULL OUTER JOIN offer_trend o USING (week_start)
          ORDER BY week_start;
          
      `,
        [userId, startDate, endDate]
      );
        

    console.log('📈 Trends Result:', trends.rows.length, 'weeks found');

    // -----------------------------
    // 4️⃣ FUNNEL STATS
    // -----------------------------
    const funnel = await pool.query(
      `
      SELECT
        COUNT(*) AS applied,
        COUNT(*) FILTER (WHERE status = 'Interview') AS interview,
        COUNT(*) FILTER (WHERE status = 'Offer') AS offer
      FROM jobs
      WHERE user_id = $1 
        AND COALESCE("isarchived", false) = false
        AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3
      `,
      [userId, startDate, endDate]
    );

    console.log('📉 Funnel Result:', funnel.rows[0]);

    // -----------------------------
    // 5️⃣ STAGE TIME
    // -----------------------------
    const stageTimes = await pool.query(
      `
      SELECT 
        status,
        AVG(
          CEIL(
            EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at)))
            / 86400
          )
        ) AS avg_days
      FROM jobs
      WHERE user_id = $1 
        AND COALESCE("isarchived", false) = false
        AND COALESCE("applicationDate", created_at) BETWEEN $2 AND $3
      GROUP BY status
      `,
      [userId, startDate, endDate]
    );

    console.log('⏱ Stage Times Result:', stageTimes.rows);

    // -----------------------------
    // 6️⃣ GOALS (hardcoded)
    // -----------------------------
    const goals = {
      monthlyApplications: 30,
      interviewRateTarget: 0.3,
      offerRateTarget: 0.05,
    };

    // -----------------------------
    // 7️⃣ INSIGHTS
    // -----------------------------
    const m = keyMetrics.rows[0];
    // -----------------------------
// 7️⃣ REAL INDUSTRY BENCHMARKS (BASED ON USER DATA)
// -----------------------------
   
  
  const industryBenchmarks = {
    interviewRate: Number(benchmarkQuery.rows[0].interview_rate) || 0,
    offerRate: Number(benchmarkQuery.rows[0].offer_rate) || 0,
    avgResponseHours: Number(benchmarkQuery.rows[0].avg_response_hours) || 0
  };
  
    const safeMetrics = {
      total_applications: Number(m.total_applications) || 0,
      total_interviews: Number(m.total_interviews) || 0,
      total_offers: Number(m.total_offers) || 0,
    };

    const insights = [];

    if (safeMetrics.total_applications < goals.monthlyApplications) {
      insights.push("Increase application volume to reach your monthly goal.");
    }
    if (safeMetrics.total_interviews < safeMetrics.total_applications * goals.interviewRateTarget) {
      insights.push("Improve resume or apply to better-fit roles to boost interviews.");
    }
    if (safeMetrics.total_offers < safeMetrics.total_applications * goals.offerRateTarget) {
      insights.push("Improve interview performance to raise offer rate.");
    }
    if (insights.length === 0) insights.push("Great progress! You're on track.");

    // -----------------------------
    // 8️⃣ SEND CLEANED RESPONSE
    // -----------------------------
    // -----------------------------
    // 7.5️⃣ INDUSTRY BENCHMARKS
    // -----------------------------
    
    const response = {
      keyMetrics: safeMetrics,
      timeToResponse: { avg_response_hours: avgResponseHours },
      trends: trends.rows,
      funnel: funnel.rows[0],
      avgTimeInStage: stageTimes.rows.map((r) => ({
        status: r.status,
        avg_days: Number(r.avg_days) || 0,
      })),
      goals,
      actionableInsights: insights,
      industryBenchmarks
    };

    console.log('✅ Sending response with:', safeMetrics);
    console.log('========================================');
    
  
    res.json(response);
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;