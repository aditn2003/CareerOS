import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Helper: Calculate percentile position
function calculatePercentile(value, p10, p25, p50, p75, p90) {
  if (value <= p10) return 10;
  if (value <= p25) return 10 + ((value - p10) / (p25 - p10)) * 15;
  if (value <= p50) return 25 + ((value - p25) / (p50 - p25)) * 25;
  if (value <= p75) return 50 + ((value - p50) / (p75 - p50)) * 25;
  if (value <= p90) return 75 + ((value - p75) / (p90 - p75)) * 15;
  return 90 + ((value - p90) / (p90 * 0.5)) * 10; // Estimate above 90th
}

// Helper: Find matching benchmark
async function findMatchingBenchmark(criteria) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM market_benchmarks
       WHERE role_title ILIKE $1
         AND role_level = $2
         AND (industry = $3 OR industry IS NULL)
         AND (company_size = $4 OR company_size IS NULL)
         AND location = $5
         AND location_type = $6
       ORDER BY sample_size DESC
       LIMIT 1`,
      [
        `%${criteria.role_title}%`,
        criteria.role_level,
        criteria.industry,
        criteria.company_size,
        criteria.location,
        criteria.location_type
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("Error finding benchmark:", err);
    return null;
  }
}

// GET full compensation analytics
router.get("/full", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Get all offers
    const offersResult = await pool.query(
      `SELECT * FROM offers WHERE user_id = $1 ORDER BY offer_date DESC`,
      [userId]
    );
    
    // 2. Get compensation history
    const compHistoryResult = await pool.query(
      `SELECT * FROM compensation_history WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );
    
    // 3. Get negotiation history
    const negotiationResult = await pool.query(
      `SELECT nh.*, o.company, o.role_title 
       FROM negotiation_history nh
       JOIN offers o ON nh.offer_id = o.id
       WHERE nh.user_id = $1
       ORDER BY nh.negotiation_date DESC`,
      [userId]
    );
    
    // 4. Calculate negotiation metrics
    const firstRoundNegotiations = negotiationResult.rows.filter(n => n.negotiation_round === 1);
    const successfulNegotiations = firstRoundNegotiations.filter(n => n.improvement_percent > 0);
    
    const negotiationMetrics = {
      totalNegotiations: firstRoundNegotiations.length,
      successfulNegotiations: successfulNegotiations.length,
      successRate: firstRoundNegotiations.length > 0
        ? (successfulNegotiations.length / firstRoundNegotiations.length) * 100
        : 0,
      avgImprovement: firstRoundNegotiations.length > 0
        ? firstRoundNegotiations.reduce((sum, n) => sum + (n.improvement_percent || 0), 0) / firstRoundNegotiations.length
        : 0,
      maxImprovement: firstRoundNegotiations.length > 0
        ? Math.max(...firstRoundNegotiations.map(n => n.improvement_percent || 0))
        : 0,
      medianImprovement: firstRoundNegotiations.length > 0
        ? firstRoundNegotiations.sort((a, b) => (a.improvement_percent || 0) - (b.improvement_percent || 0))[
            Math.floor(firstRoundNegotiations.length / 2)
          ]?.improvement_percent || 0
        : 0
    };
    
    // 5. Calculate compensation evolution
    const evolution = compHistoryResult.rows.map((role, index) => {
      const prevRole = compHistoryResult.rows[index + 1];
      const increase = prevRole && prevRole.base_salary_current > 0
        ? ((role.base_salary_start - prevRole.base_salary_current) / prevRole.base_salary_current) * 100
        : 0;
      return {
        ...role,
        increasePercent: increase
      };
    });
    
    // 6. Calculate offer statistics
    const offers = offersResult.rows;
    const offerStats = {
      totalOffers: offers.length,
      accepted: offers.filter(o => o.offer_status === 'accepted').length,
      rejected: offers.filter(o => o.offer_status === 'rejected').length,
      pending: offers.filter(o => o.offer_status === 'pending').length,
      avgBaseSalary: offers.length > 0
        ? offers.reduce((sum, o) => sum + (Number(o.base_salary) || 0), 0) / offers.length
        : 0,
      avgTotalComp: offers.length > 0
        ? offers.reduce((sum, o) => sum + (Number(o.total_comp_year1) || 0), 0) / offers.length
        : 0,
      byRoleLevel: {},
      byIndustry: {},
      byLocation: {}
    };
    
    // Group by role level
    offers.forEach(offer => {
      const level = offer.role_level || 'unknown';
      if (!offerStats.byRoleLevel[level]) {
        offerStats.byRoleLevel[level] = { count: 0, avgBase: 0, avgTotal: 0, sum: 0, totalSum: 0 };
      }
      offerStats.byRoleLevel[level].count++;
      offerStats.byRoleLevel[level].sum += Number(offer.base_salary) || 0;
      offerStats.byRoleLevel[level].totalSum += Number(offer.total_comp_year1) || 0;
    });
    
    Object.keys(offerStats.byRoleLevel).forEach(level => {
      const data = offerStats.byRoleLevel[level];
      data.avgBase = data.sum / data.count;
      data.avgTotal = data.totalSum / data.count;
    });
    
    // 7. Negotiation trends over time
    const monthlyNegotiations = {};
    negotiationResult.rows.forEach(n => {
      const month = n.negotiation_date ? n.negotiation_date.substring(0, 7) : 'unknown';
      if (!monthlyNegotiations[month]) {
        monthlyNegotiations[month] = { count: 0, improvements: [] };
      }
      monthlyNegotiations[month].count++;
      if (n.improvement_percent > 0) {
        monthlyNegotiations[month].improvements.push(n.improvement_percent);
      }
    });
    
    const negotiationTrends = Object.entries(monthlyNegotiations)
      .map(([month, data]) => ({
        month,
        count: data.count,
        avgImprovement: data.improvements.length > 0
          ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
          : 0,
        successRate: data.count > 0 ? (data.improvements.length / data.count) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // 8. Context-based negotiation analysis
    const contextAnalysis = {};
    negotiationResult.rows.forEach(n => {
      const offer = offers.find(o => o.id === n.offer_id);
      if (!offer) return;
      
      const contexts = [
        { key: 'industry', value: offer.industry },
        { key: 'company_size', value: offer.company_size },
        { key: 'location_type', value: offer.location_type },
        { key: 'role_level', value: offer.role_level }
      ];
      
      contexts.forEach(ctx => {
        if (!ctx.value) return;
        const key = `${ctx.key}_${ctx.value}`;
        if (!contextAnalysis[key]) {
          contextAnalysis[key] = { count: 0, improvements: [], successful: 0 };
        }
        contextAnalysis[key].count++;
        if (n.improvement_percent > 0) {
          contextAnalysis[key].improvements.push(n.improvement_percent);
          contextAnalysis[key].successful++;
        }
      });
    });
    
    const contextMetrics = Object.entries(contextAnalysis).map(([key, data]) => ({
      context: key,
      count: data.count,
      successRate: (data.successful / data.count) * 100,
      avgImprovement: data.improvements.length > 0
        ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
        : 0
    }));
    
    res.json({
      offers: offersResult.rows,
      compensationHistory: compHistoryResult.rows,
      negotiationHistory: negotiationResult.rows,
      negotiationMetrics,
      compensationEvolution: evolution,
      offerStats,
      negotiationTrends,
      contextMetrics
    });
  } catch (err) {
    console.error("Error fetching compensation analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics", details: err.message });
  }
});

// GET negotiation success rate
router.get("/negotiation-success", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE nh.negotiation_round = 1) as total_negotiations,
        COUNT(*) FILTER (WHERE nh.negotiation_round = 1 AND nh.improvement_percent > 0) as successful,
        AVG(nh.improvement_percent) FILTER (WHERE nh.negotiation_round = 1) as avg_improvement,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY nh.improvement_percent) FILTER (WHERE nh.negotiation_round = 1) as median_improvement
       FROM negotiation_history nh
       WHERE nh.user_id = $1`,
      [userId]
    );
    
    const data = result.rows[0];
    const successRate = data.total_negotiations > 0
      ? (data.successful / data.total_negotiations) * 100
      : 0;
    
    res.json({
      totalNegotiations: parseInt(data.total_negotiations) || 0,
      successfulNegotiations: parseInt(data.successful) || 0,
      successRate: successRate,
      avgImprovement: parseFloat(data.avg_improvement) || 0,
      medianImprovement: parseFloat(data.median_improvement) || 0
    });
  } catch (err) {
    console.error("Error calculating negotiation success:", err);
    res.status(500).json({ error: "Failed to calculate success rate" });
  }
});

// GET market comparison for an offer
router.get("/market-comparison/:offerId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerId } = req.params;
    
    // Get offer
    const offerResult = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [offerId, userId]
    );
    
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }
    
    const offer = offerResult.rows[0];
    
    // Find matching benchmark
    const benchmark = await findMatchingBenchmark({
      role_title: offer.role_title,
      role_level: offer.role_level,
      industry: offer.industry,
      company_size: offer.company_size,
      location: offer.location,
      location_type: offer.location_type
    });
    
    if (!benchmark) {
      // Try approximation strategies
      const approxBenchmark = await pool.query(
        `SELECT 
          AVG(percentile_50) as avg_median,
          AVG(percentile_75) as avg_q3,
          COUNT(*) as sample_count
         FROM market_benchmarks
         WHERE role_level = $1
         GROUP BY role_level`,
        [offer.role_level]
      );
      
      if (approxBenchmark.rows.length > 0) {
        const approx = approxBenchmark.rows[0];
        return res.json({
          offer,
          benchmark: null,
          approximation: {
            estimatedMedian: parseFloat(approx.avg_median),
            estimatedQ3: parseFloat(approx.avg_q3),
            confidence: 'low',
            sampleCount: parseInt(approx.sample_count)
          },
          comparison: {
            percentile: null,
            flags: {
              underpaid: offer.base_salary < parseFloat(approx.avg_median),
              atMarket: offer.base_salary >= parseFloat(approx.avg_median) && offer.base_salary <= parseFloat(approx.avg_q3),
              overpaid: offer.base_salary > parseFloat(approx.avg_q3)
            }
          }
        });
      }
      
      return res.json({
        offer,
        benchmark: null,
        error: "No benchmark data available"
      });
    }
    
    // Calculate percentile
    const basePercentile = calculatePercentile(
      Number(offer.base_salary),
      Number(benchmark.percentile_10),
      Number(benchmark.percentile_25),
      Number(benchmark.percentile_50),
      Number(benchmark.percentile_75),
      Number(benchmark.percentile_90)
    );
    
    const flags = {
      underpaid: basePercentile < 25,
      atMarket: basePercentile >= 25 && basePercentile <= 75,
      overpaid: basePercentile > 75,
      significantlyUnderpaid: basePercentile < 10
    };
    
    res.json({
      offer,
      benchmark,
      comparison: {
        percentile: basePercentile,
        flags,
        recommendation: flags.significantlyUnderpaid
          ? "You are significantly under market. Consider negotiating or exploring other opportunities."
          : flags.underpaid
          ? "You are below market median. Negotiation recommended."
          : flags.atMarket
          ? "You are at market rate. Offer is competitive."
          : "You are above market rate. Strong offer."
      }
    });
  } catch (err) {
    console.error("Error comparing to market:", err);
    res.status(500).json({ error: "Failed to compare to market" });
  }
});

// GET compensation evolution timeline
router.get("/evolution", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        ch.*,
        EXTRACT(YEAR FROM AGE(COALESCE(ch.end_date, NOW()), ch.start_date)) as tenure_years
       FROM compensation_history ch
       WHERE ch.user_id = $1
       ORDER BY ch.start_date ASC`,
      [userId]
    );
    
    // Calculate milestones
    const milestones = [];
    const roles = result.rows;
    
    roles.forEach(role => {
      if (Number(role.base_salary_start) >= 100000 && !milestones.find(m => m.type === 'first_100k')) {
        milestones.push({ type: 'first_100k', date: role.start_date, value: role.base_salary_start });
      }
      if (Number(role.base_salary_start) >= 150000 && !milestones.find(m => m.type === 'first_150k')) {
        milestones.push({ type: 'first_150k', date: role.start_date, value: role.base_salary_start });
      }
      if (Number(role.total_comp_start) >= 200000 && !milestones.find(m => m.type === 'first_200k_tc')) {
        milestones.push({ type: 'first_200k_tc', date: role.start_date, value: role.total_comp_start });
      }
      if (role.promotion_date) {
        milestones.push({ 
          type: 'promotion', 
          date: role.promotion_date, 
          from: role.promotion_from_level,
          to: role.promotion_to_level,
          increase: role.salary_increase_percent
        });
      }
    });
    
    // Detect plateaus
    const plateaus = [];
    for (let i = 1; i < roles.length; i++) {
      const prev = roles[i - 1];
      const curr = roles[i];
      
      const timeBetween = (new Date(curr.start_date) - new Date(prev.end_date || prev.start_date)) / (1000 * 60 * 60 * 24 * 365);
      const salaryIncrease = prev.base_salary_current > 0
        ? ((curr.base_salary_start - prev.base_salary_current) / prev.base_salary_current) * 100
        : 0;
      const annualizedIncrease = timeBetween > 0 ? salaryIncrease / timeBetween : 0;
      
      if (annualizedIncrease < 3 && timeBetween > 1) {
        plateaus.push({
          startDate: prev.end_date || prev.start_date,
          endDate: curr.start_date,
          durationYears: timeBetween,
          salaryIncrease: salaryIncrease,
          annualizedIncrease: annualizedIncrease
        });
      }
    }
    
    res.json({
      timeline: result.rows,
      milestones,
      plateaus
    });
  } catch (err) {
    console.error("Error fetching evolution:", err);
    res.status(500).json({ error: "Failed to fetch evolution" });
  }
});

// GET comprehensive compensation analytics with all features
router.get("/comprehensive", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all data - handle cases where tables might not exist
    let offersResult, compHistoryResult, negotiationResult;
    
    try {
      const queries = await Promise.allSettled([
        pool.query(`SELECT * FROM offers WHERE user_id = $1 ORDER BY offer_date DESC`, [userId]),
        pool.query(`SELECT * FROM compensation_history WHERE user_id = $1 ORDER BY start_date ASC`, [userId]),
        pool.query(`
          SELECT nh.*, o.company, o.role_title, o.industry, o.company_size, o.location_type, o.role_level
          FROM negotiation_history nh
          LEFT JOIN offers o ON nh.offer_id = o.id
          WHERE nh.user_id = $1
          ORDER BY nh.negotiation_date DESC
        `, [userId])
      ]);
      
      offersResult = queries[0].status === 'fulfilled' ? queries[0].value : { rows: [] };
      compHistoryResult = queries[1].status === 'fulfilled' ? queries[1].value : { rows: [] };
      negotiationResult = queries[2].status === 'fulfilled' ? queries[2].value : { rows: [] };
      
      // Log any rejected queries
      queries.forEach((q, idx) => {
        if (q.status === 'rejected') {
          console.error(`Query ${idx} failed:`, q.reason);
        }
      });
    } catch (dbErr) {
      console.error("Database query error:", dbErr);
      // If tables don't exist, return empty data structure
      offersResult = { rows: [] };
      compHistoryResult = { rows: [] };
      negotiationResult = { rows: [] };
    }
    
    const offers = offersResult.rows;
    const compHistory = compHistoryResult.rows;
    const negotiations = negotiationResult.rows;
    
    // Get offer IDs that have compensation history (these are accepted offers)
    const acceptedOfferIds = new Set(compHistory.map(ch => ch.offer_id).filter(id => id != null));
    
    // Count accepted offers - include both those with status='accepted' and those with compensation history
    const acceptedOffers = offers.filter(o => {
      const hasAcceptedStatus = o.offer_status && o.offer_status.toLowerCase().trim() === 'accepted';
      const hasCompHistory = acceptedOfferIds.has(o.id);
      return hasAcceptedStatus || hasCompHistory;
    });
    
    // 1. SALARY & OFFER TRACKING
    const offerTracking = {
      totalOffers: offers.length,
      byRole: {},
      byCompany: {},
      byLocation: {},
      byLevel: {},
      acceptedVsRejected: {
        accepted: acceptedOffers.length,
        rejected: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'rejected').length,
        pending: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'pending').length,
        expired: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'expired').length,
        withdrawn: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'withdrawn').length
      },
      competingOffers: offers.filter(o => o.competing_offers_count > 0).length,
      negotiationOutcomes: offers.filter(o => o.negotiation_improvement_percent > 0).map(o => ({
        company: o.company,
        role: o.role_title,
        improvement: o.negotiation_improvement_percent,
        outcome: o.negotiation_successful ? 'success' : 'failed'
      }))
    };
    
    // Group offers by various dimensions
    offers.forEach(offer => {
      const role = offer.role_title || 'Unknown';
      const company = offer.company || 'Unknown';
      const location = offer.location || 'Unknown';
      const level = offer.role_level || 'Unknown';
      
      if (!offerTracking.byRole[role]) {
        offerTracking.byRole[role] = { count: 0, avgBase: 0, avgTotal: 0, salaries: [] };
      }
      offerTracking.byRole[role].count++;
      offerTracking.byRole[role].salaries.push(Number(offer.base_salary) || 0);
      
      if (!offerTracking.byCompany[company]) {
        offerTracking.byCompany[company] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byCompany[company].count++;
      offerTracking.byCompany[company].salaries.push(Number(offer.base_salary) || 0);
      
      if (!offerTracking.byLocation[location]) {
        offerTracking.byLocation[location] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byLocation[location].count++;
      offerTracking.byLocation[location].salaries.push(Number(offer.base_salary) || 0);
      
      if (!offerTracking.byLevel[level]) {
        offerTracking.byLevel[level] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byLevel[level].count++;
      offerTracking.byLevel[level].salaries.push(Number(offer.base_salary) || 0);
    });
    
    // Calculate averages
    Object.keys(offerTracking.byRole).forEach(role => {
      const data = offerTracking.byRole[role];
      data.avgBase = data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length;
    });
    Object.keys(offerTracking.byCompany).forEach(company => {
      const data = offerTracking.byCompany[company];
      data.avgBase = data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length;
    });
    Object.keys(offerTracking.byLocation).forEach(location => {
      const data = offerTracking.byLocation[location];
      data.avgBase = data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length;
    });
    Object.keys(offerTracking.byLevel).forEach(level => {
      const data = offerTracking.byLevel[level];
      data.avgBase = data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length;
    });
    
    // 2. NEGOTIATION ANALYTICS
    const firstRoundNegs = negotiations.filter(n => n.negotiation_round === 1);
    const successfulNegs = firstRoundNegs.filter(n => n.improvement_percent > 0);
    
    const negotiationAnalytics = {
      successRate: firstRoundNegs.length > 0 ? (successfulNegs.length / firstRoundNegs.length) * 100 : 0,
      avgImprovement: successfulNegs.length > 0
        ? successfulNegs.reduce((sum, n) => sum + (n.improvement_percent || 0), 0) / successfulNegs.length
        : 0,
      medianImprovement: successfulNegs.length > 0
        ? successfulNegs.sort((a, b) => (a.improvement_percent || 0) - (b.improvement_percent || 0))[
            Math.floor(successfulNegs.length / 2)
          ]?.improvement_percent || 0
        : 0,
      maxImprovement: successfulNegs.length > 0
        ? Math.max(...successfulNegs.map(n => n.improvement_percent || 0))
        : 0,
      trendsOverTime: {},
      byContext: {}
    };
    
    // Trends over time
    firstRoundNegs.forEach(n => {
      const month = n.negotiation_date ? n.negotiation_date.substring(0, 7) : 'unknown';
      if (!negotiationAnalytics.trendsOverTime[month]) {
        negotiationAnalytics.trendsOverTime[month] = { count: 0, improvements: [], successful: 0 };
      }
      negotiationAnalytics.trendsOverTime[month].count++;
      if (n.improvement_percent > 0) {
        negotiationAnalytics.trendsOverTime[month].improvements.push(n.improvement_percent);
        negotiationAnalytics.trendsOverTime[month].successful++;
      }
    });
    
    // Context-based analysis
    firstRoundNegs.forEach(n => {
      const contexts = [
        { key: 'industry', value: n.industry },
        { key: 'company_size', value: n.company_size },
        { key: 'location_type', value: n.location_type },
        { key: 'role_level', value: n.role_level }
      ];
      
      contexts.forEach(ctx => {
        if (!ctx.value) return;
        const key = `${ctx.key}_${ctx.value}`;
        if (!negotiationAnalytics.byContext[key]) {
          negotiationAnalytics.byContext[key] = { count: 0, improvements: [], successful: 0 };
        }
        negotiationAnalytics.byContext[key].count++;
        if (n.improvement_percent > 0) {
          negotiationAnalytics.byContext[key].improvements.push(n.improvement_percent);
          negotiationAnalytics.byContext[key].successful++;
        }
      });
    });
    
    // 3. MARKET BENCHMARK COMPARISON
    const marketComparisons = [];
    try {
      for (const offer of offers) {
        try {
          const benchmark = await findMatchingBenchmark({
            role_title: offer.role_title,
            role_level: offer.role_level,
            industry: offer.industry,
            company_size: offer.company_size,
            location: offer.location,
            location_type: offer.location_type
          });
          
          if (benchmark && benchmark.percentile_50) {
            const percentile = calculatePercentile(
              Number(offer.base_salary) || 0,
              Number(benchmark.percentile_10) || 0,
              Number(benchmark.percentile_25) || 0,
              Number(benchmark.percentile_50) || 0,
              Number(benchmark.percentile_75) || 0,
              Number(benchmark.percentile_90) || 0
            );
            
            marketComparisons.push({
              offerId: offer.id,
              company: offer.company,
              role: offer.role_title,
              level: offer.role_level,
              location: offer.location,
              yourSalary: Number(offer.base_salary) || 0,
              marketMedian: Number(benchmark.percentile_50) || 0,
              percentile,
              isUnderpaid: percentile < 25,
              isOverpaid: percentile > 75,
              significantlyUnderpaid: percentile < 10
            });
          }
        } catch (benchmarkErr) {
          console.error("Error finding benchmark for offer:", offer.id, benchmarkErr);
          // Continue with next offer
        }
      }
    } catch (marketErr) {
      console.error("Error in market comparison:", marketErr);
      // Continue without market comparisons
    }
    
    // 4. TOTAL COMPENSATION EVOLUTION
    const evolution = compHistory.map((role, index) => {
      const prevRole = compHistory[index - 1];
      const increase = prevRole && prevRole.base_salary_current > 0
        ? ((role.base_salary_start - prevRole.base_salary_current) / prevRole.base_salary_current) * 100
        : 0;
      return {
        ...role,
        increasePercent: increase,
        roleProgression: `${prevRole?.role_level || 'N/A'} → ${role.role_level}`
      };
    });
    
    // Detect plateaus and growth phases
    const plateaus = [];
    const growthPhases = [];
    for (let i = 1; i < compHistory.length; i++) {
      const prev = compHistory[i - 1];
      const curr = compHistory[i];
      const timeBetween = (new Date(curr.start_date) - new Date(prev.end_date || prev.start_date)) / (1000 * 60 * 60 * 24 * 365);
      const salaryIncrease = prev.base_salary_current > 0
        ? ((curr.base_salary_start - prev.base_salary_current) / prev.base_salary_current) * 100
        : 0;
      const annualizedIncrease = timeBetween > 0 ? salaryIncrease / timeBetween : 0;
      
      if (annualizedIncrease < 3 && timeBetween > 1) {
        plateaus.push({
          startDate: prev.end_date || prev.start_date,
          endDate: curr.start_date,
          durationYears: timeBetween,
          salaryIncrease,
          annualizedIncrease
        });
      } else if (annualizedIncrease >= 15) {
        growthPhases.push({
          startDate: prev.end_date || prev.start_date,
          endDate: curr.start_date,
          salaryIncrease,
          annualizedIncrease,
          fromLevel: prev.role_level,
          toLevel: curr.role_level
        });
      }
    }
    
    // 5. CAREER PROGRESSION & EARNING POTENTIAL
    const levelProgression = ['intern', 'entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp'];
    const progression = compHistory.map((role, index) => {
      const prevRole = compHistory[index - 1];
      const levelIndex = levelProgression.indexOf(role.role_level || '');
      const prevLevelIndex = prevRole ? levelProgression.indexOf(prevRole.role_level || '') : -1;
      
      return {
        ...role,
        levelIndex,
        levelUp: levelIndex > prevLevelIndex,
        salaryJump: prevRole && prevRole.base_salary_current > 0
          ? ((role.base_salary_start - prevRole.base_salary_current) / prevRole.base_salary_current) * 100
          : 0
      };
    });
    
    // Estimate future earning potential
    const recentRoles = compHistory.slice(-3);
    const avgGrowthRate = recentRoles.length > 1
      ? recentRoles.reduce((sum, role, idx) => {
          if (idx === 0) return sum;
          const prev = recentRoles[idx - 1];
          const growth = prev.base_salary_current > 0
            ? ((role.base_salary_start - prev.base_salary_current) / prev.base_salary_current) * 100
            : 0;
          return sum + growth;
        }, 0) / (recentRoles.length - 1)
      : 0;
    
    const currentSalary = compHistory.length > 0
      ? Number(compHistory[compHistory.length - 1].base_salary_current || compHistory[compHistory.length - 1].base_salary_start)
      : 0;
    
    const earningPotential = {
      currentSalary,
      avgGrowthRate,
      projected1Year: currentSalary * (1 + avgGrowthRate / 100),
      projected3Years: currentSalary * Math.pow(1 + avgGrowthRate / 100, 3),
      projected5Years: currentSalary * Math.pow(1 + avgGrowthRate / 100, 5),
      inflectionPoints: growthPhases.filter(p => p.annualizedIncrease >= 20)
    };
    
    // 6. STRATEGY RECOMMENDATIONS
    const recommendations = [];
    
    // Check if underpaid
    const underpaidOffers = marketComparisons.filter(m => m.isUnderpaid);
    if (underpaidOffers.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Under Market Compensation Detected',
        message: `You have ${underpaidOffers.length} offer(s) below market median. Consider negotiating or exploring other opportunities.`,
        action: 'Review market comparisons and negotiate'
      });
    }
    
    // Negotiation success rate
    if (negotiationAnalytics.successRate < 50 && firstRoundNegs.length >= 3) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Improve Negotiation Strategy',
        message: `Your negotiation success rate is ${negotiationAnalytics.successRate.toFixed(1)}%. Consider refining your approach.`,
        action: 'Review successful negotiation contexts'
      });
    }
    
    // Plateau detection
    if (plateaus.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Career Growth Plateau Detected',
        message: `You experienced ${plateaus.length} plateau period(s) with <3% annualized growth. Consider role changes or skill development.`,
        action: 'Explore new opportunities or upskilling'
      });
    }
    
    // Best negotiation contexts
    const bestContexts = Object.entries(negotiationAnalytics.byContext)
      .map(([key, data]) => ({
        context: key,
        count: data.count,
        successRate: (data.successful / data.count) * 100,
        avgImprovement: data.improvements.length > 0
          ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
          : 0
      }))
      .filter(c => c.count >= 2)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);
    
    if (bestContexts.length > 0) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        title: 'Your Best Negotiation Contexts',
        message: `You perform best in: ${bestContexts.map(c => c.context).join(', ')}`,
        action: 'Leverage these contexts in future negotiations'
      });
    }
    
    // Optimal timing for career moves
    if (compHistory.length >= 2) {
      const avgTimeBetweenRoles = compHistory.slice(1).reduce((sum, role, idx) => {
        const prev = compHistory[idx];
        const timeBetween = (new Date(role.start_date) - new Date(prev.end_date || prev.start_date)) / (1000 * 60 * 60 * 24 * 365);
        return sum + timeBetween;
      }, 0) / (compHistory.length - 1);
      
      recommendations.push({
        type: 'info',
        priority: 'low',
        title: 'Career Move Timing',
        message: `Based on your history, you typically see salary increases after ${avgTimeBetweenRoles.toFixed(1)} years. Consider exploring opportunities after 18-24 months in your current role.`,
        action: 'Plan your next career move strategically'
      });
    }
    
    // 7. INDUSTRY & LOCATION-SPECIFIC POSITIONING
    const locationPositioning = {};
    const industryPositioning = {};
    
    offers.forEach(offer => {
      const location = offer.location || 'Unknown';
      const industry = offer.industry || 'Unknown';
      
      if (!locationPositioning[location]) {
        locationPositioning[location] = {
          location,
          locationType: offer.location_type,
          offers: [],
          avgSalary: 0,
          marketComparisons: []
        };
      }
      locationPositioning[location].offers.push(offer);
      
      if (!industryPositioning[industry]) {
        industryPositioning[industry] = {
          industry,
          offers: [],
          avgSalary: 0,
          marketComparisons: []
        };
      }
      industryPositioning[industry].offers.push(offer);
    });
    
    // Calculate averages and get COL indices
    const locationKeys = Object.keys(locationPositioning);
    let colQueries = [];
    
    try {
      colQueries = await Promise.all(
        locationKeys.map(location => 
          pool.query(
            `SELECT col_index FROM cost_of_living_index WHERE location = $1 LIMIT 1`,
            [location]
          ).catch(() => ({ rows: [] }))
        )
      );
    } catch (colErr) {
      console.error("Error fetching COL indices:", colErr);
      colQueries = locationKeys.map(() => ({ rows: [] }));
    }
    
    locationKeys.forEach((location, idx) => {
      const data = locationPositioning[location];
      const salaries = data.offers.map(o => Number(o.base_salary) || 0);
      data.avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      
      // Add COL index if available
      if (colQueries[idx] && colQueries[idx].rows && colQueries[idx].rows.length > 0) {
        data.colIndex = parseFloat(colQueries[idx].rows[0].col_index);
      }
    });
    
    Object.keys(industryPositioning).forEach(industry => {
      const data = industryPositioning[industry];
      const salaries = data.offers.map(o => Number(o.base_salary) || 0);
      data.avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    });
    
    // Add market comparisons to positioning
    marketComparisons.forEach(comp => {
      const offer = offers.find(o => o.id === comp.offerId);
      if (offer) {
        const location = offer.location || 'Unknown';
        const industry = offer.industry || 'Unknown';
        
        if (locationPositioning[location]) {
          locationPositioning[location].marketComparisons.push(comp);
        }
        if (industryPositioning[industry]) {
          industryPositioning[industry].marketComparisons.push(comp);
        }
      }
    });
    
    res.json({
      offerTracking,
      negotiationAnalytics,
      marketComparisons,
      compensationEvolution: {
        timeline: evolution,
        plateaus,
        growthPhases,
        milestones: evolution.filter(r => r.increasePercent >= 15)
      },
      careerProgression: {
        progression,
        earningPotential,
        levelMapping: levelProgression
      },
      recommendations,
      locationPositioning: Object.values(locationPositioning),
      industryPositioning: Object.values(industryPositioning)
    });
  } catch (err) {
    console.error("Error fetching comprehensive compensation analytics:", err);
    res.status(500).json({ error: "Failed to fetch comprehensive analytics", details: err.message });
  }
});

export default router;

