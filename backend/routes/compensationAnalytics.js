import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Helper: Calculate percentile position
function calculatePercentile(value, p10, p25, p50, p75, p90) {
  // Validate inputs
  if (!value || value <= 0 || !p50 || p50 <= 0) return 50; // Default to median if invalid
  
  let percentile;
  if (value <= p10) {
    percentile = 10;
  } else if (value <= p25) {
    percentile = 10 + ((value - p10) / (p25 - p10)) * 15;
  } else if (value <= p50) {
    percentile = 25 + ((value - p25) / (p50 - p25)) * 25;
  } else if (value <= p75) {
    percentile = 50 + ((value - p50) / (p75 - p50)) * 25;
  } else if (value <= p90) {
    percentile = 75 + ((value - p75) / (p90 - p75)) * 15;
  } else {
    // For values above 90th percentile, cap at 99 (not 100 to leave room for extreme outliers)
    const excessRatio = (value - p90) / p90;
    percentile = 90 + Math.min(excessRatio * 9, 9); // Cap at 99
  }
  
  // Ensure percentile is between 0 and 100
  return Math.max(0, Math.min(100, percentile));
}

// Helper: Find matching benchmark
// Helper function to normalize industry names
function normalizeIndustry(industry) {
  if (!industry || industry.trim() === '' || industry.toLowerCase() === 'unknown') {
    return 'Unknown';
  }
  
  const normalized = industry.trim().toLowerCase();
  
  // Normalize common variations
  if (normalized === 'tech' || normalized === 'technology' || normalized.includes('tech')) {
    return 'Technology';
  }
  if (normalized.includes('finance') || normalized.includes('financial')) {
    return 'Finance';
  }
  if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('healthcare')) {
    return 'Healthcare';
  }
  if (normalized.includes('consult')) {
    return 'Consulting';
  }
  if (normalized.includes('retail')) {
    return 'Retail';
  }
  if (normalized.includes('education')) {
    return 'Education';
  }
  if (normalized.includes('government') || normalized.includes('govt') || normalized.includes('gov')) {
    return 'Government';
  }
  
  // Capitalize first letter of each word for consistency
  return industry.trim().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

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
    let offersResult, compHistoryResult, negotiationResult, jobsResult;
    let archivedJobIds = new Set(); // Initialize empty set
    
    try {
      const queries = await Promise.allSettled([
        pool.query(`SELECT * FROM offers WHERE user_id = $1 ORDER BY offer_date DESC`, [userId]),
        pool.query(`SELECT * FROM compensation_history WHERE user_id = $1 ORDER BY start_date ASC`, [userId]),
        // Get job IDs that are archived to exclude offers linked to them
        pool.query(`SELECT id FROM jobs WHERE user_id = $1 AND ("isArchived" = true)`, [userId]),
        pool.query(`
          SELECT nh.*, o.company, o.role_title, o.industry, o.company_size, o.location_type, o.role_level
          FROM negotiation_history nh
          LEFT JOIN offers o ON nh.offer_id = o.id
          WHERE nh.user_id = $1
          ORDER BY nh.negotiation_date DESC
        `, [userId]),
        pool.query(`
          SELECT id, title, company, location, salary_min, salary_max, status, industry, role_level, created_at
          FROM jobs 
          WHERE user_id = $1 
            AND ("isArchived" = false OR "isArchived" IS NULL)
          ORDER BY created_at DESC
        `, [userId])
      ]);
      
      offersResult = queries[0].status === 'fulfilled' ? queries[0].value : { rows: [] };
      compHistoryResult = queries[1].status === 'fulfilled' ? queries[1].value : { rows: [] };
      const archivedJobsResult = queries[2].status === 'fulfilled' ? queries[2].value : { rows: [] };
      negotiationResult = queries[3].status === 'fulfilled' ? queries[3].value : { rows: [] };
      jobsResult = queries[4].status === 'fulfilled' ? queries[4].value : { rows: [] };
      
      // Get set of archived job IDs to exclude offers linked to them
      archivedJobIds = new Set(archivedJobsResult.rows.map(j => Number(j.id)));
      
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
      jobsResult = { rows: [] };
      archivedJobIds = new Set(); // Keep empty set
    }
    
    // Filter out offers linked to archived jobs
    let offers = offersResult.rows;
    const offersBeforeFilter = offers.length;
    offers = offers.filter(o => {
      // Include offers that don't have a job_id, or have a job_id that's not archived
      if (o.job_id == null || o.job_id === undefined) {
        return true; // Include offers without job_id
      }
      return !archivedJobIds.has(Number(o.job_id)); // Exclude if job is archived
    });
    
    if (offersBeforeFilter !== offers.length) {
      console.log(`📊 Filtered out ${offersBeforeFilter - offers.length} offer(s) linked to archived jobs`);
    }
    
    const compHistory = compHistoryResult.rows;
    const negotiations = negotiationResult.rows;
    const jobs = jobsResult.rows;
    
    // Debug: Log all offers fetched
    console.log("📊 Offers Fetched from Database:", {
      totalOffers: offers.length,
      userId: userId,
      offers: offers.map((o, idx) => ({
        index: idx + 1,
        id: o.id,
        company: o.company || 'MISSING',
        role_title: o.role_title || 'MISSING',
        role_level: o.role_level || 'MISSING',
        location: o.location || 'MISSING',
        base_salary: o.base_salary || 0,
        offer_status: o.offer_status || 'MISSING',
        offer_date: o.offer_date || 'MISSING',
        job_id: o.job_id || null
      }))
    });
    
    // Verify we have all offers
    if (offers.length === 0) {
      console.warn("⚠️ No offers found for user", userId);
    }
    
    // Get offer IDs that have compensation history (these are accepted offers)
    // Only include compensation history entries where the offer still exists
    const existingOfferIds = new Set(offers.map(o => o.id));
    const acceptedOfferIds = new Set(
      compHistory
        .filter(ch => ch.offer_id != null && existingOfferIds.has(ch.offer_id))
        .map(ch => ch.offer_id)
    );
    
    // Filter out compensation history entries for deleted offers
    // Only include entries where the offer still exists (or entries without offer_id, which are manual entries)
    const validCompHistory = compHistory.filter(ch => 
      ch.offer_id == null || existingOfferIds.has(ch.offer_id)
    );
    
    console.log("📊 Compensation History Filtering:", {
      totalCompHistory: compHistory.length,
      validCompHistory: validCompHistory.length,
      filteredOut: compHistory.length - validCompHistory.length,
      filteredEntries: compHistory
        .filter(ch => ch.offer_id != null && !existingOfferIds.has(ch.offer_id))
        .map(ch => ({
          id: ch.id,
          offer_id: ch.offer_id,
          company: ch.company,
          role_title: ch.role_title
        }))
    });
    
    // Analyze job salary ranges vs actual offers
    // Filter to only jobs that have salary data (salary_min > 0 OR salary_max > 0)
    const jobsWithSalary = jobs.filter(j => {
      const min = Number(j.salary_min) || 0;
      const max = Number(j.salary_max) || 0;
      return min > 0 || max > 0;
    });
    
    const jobSalaryAnalysis = {
      totalJobsWithSalary: jobsWithSalary.length, // Only count jobs with actual salary data
      avgSalaryMin: jobsWithSalary.length > 0 
        ? jobsWithSalary.reduce((sum, j) => sum + (Number(j.salary_min) || 0), 0) / jobsWithSalary.length 
        : 0,
      avgSalaryMax: jobsWithSalary.length > 0 
        ? jobsWithSalary.reduce((sum, j) => sum + (Number(j.salary_max) || 0), 0) / jobsWithSalary.length 
        : 0,
      avgSalaryRange: jobsWithSalary.length > 0
        ? jobsWithSalary.reduce((sum, j) => {
            const min = Number(j.salary_min) || 0;
            const max = Number(j.salary_max) || 0;
            // Calculate midpoint for each job
            const midpoint = (min > 0 && max > 0) 
              ? (min + max) / 2 
              : (min > 0 ? min : max); // Use the one that exists if only one is present
            return sum + midpoint;
          }, 0) / jobsWithSalary.length
        : 0,
      jobsWithOffers: jobs.filter(j => {
        // Check if this job has a corresponding offer
        return offers.some(o => o.job_id === j.id);
      }).length,
      jobsWithoutOffers: jobs.filter(j => {
        return !offers.some(o => o.job_id === j.id);
      }).length
    };
    
    // Compare job salary ranges to actual offers
    const salaryComparison = offers.map(offer => {
      const relatedJob = jobs.find(j => j.id === offer.job_id);
      if (!relatedJob || (!relatedJob.salary_min && !relatedJob.salary_max)) {
        return null;
      }
      
      const jobMin = Number(relatedJob.salary_min) || 0;
      const jobMax = Number(relatedJob.salary_max) || 0;
      const jobMid = (jobMin + jobMax) / 2;
      const offerSalary = Number(offer.base_salary) || 0;
      
      return {
        jobId: relatedJob.id,
        jobTitle: relatedJob.title,
        company: offer.company,
        jobSalaryRange: { min: jobMin, max: jobMax, mid: jobMid },
        actualOffer: offerSalary,
        difference: offerSalary - jobMid,
        differencePercent: jobMid > 0 ? ((offerSalary - jobMid) / jobMid) * 100 : 0,
        withinRange: offerSalary >= jobMin && offerSalary <= jobMax
      };
    }).filter(c => c !== null);
    
    // Count accepted offers - include both those with status='accepted' and those with compensation history
    const allAcceptedOffers = offers.filter(o => {
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
        accepted: allAcceptedOffers.length,
        rejected: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'rejected').length,
        pending: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'pending').length,
        expired: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'expired').length,
        withdrawn: offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'withdrawn').length
      },
      competingOffers: offers.filter(o => o.competing_offers_count > 0).length,
      competingOffersDetails: offers
        .filter(o => o.competing_offers_count > 0)
        .map(offer => {
          // Get details of competing offers
          const competingIds = offer.competing_offers_ids || [];
          const competingOffersList = offers
            .filter(o => competingIds.includes(o.id))
            .map(o => ({
              id: o.id,
              company: o.company,
              role: o.role_title,
              salary: Number(o.base_salary) || 0
            }));
          
          return {
            offerId: offer.id,
            company: offer.company,
            role: offer.role_title,
            salary: Number(offer.base_salary) || 0,
            competingCount: offer.competing_offers_count || 0,
            competingOffers: competingOffersList
          };
        }),
      negotiationOutcomes: offers.filter(o => o.negotiation_improvement_percent > 0).map(o => ({
        company: o.company,
        role: o.role_title,
        improvement: o.negotiation_improvement_percent,
        outcome: o.negotiation_successful ? 'success' : 'failed'
      }))
    };
    
    // Group offers by various dimensions - include ALL offers, even if missing fields
    offers.forEach(offer => {
      const role = offer.role_title || 'Unknown';
      const company = offer.company || 'Unknown';
      const location = offer.location || 'Unknown';
      const level = offer.role_level || 'Unknown';
      
      // Always include in byRole, even if role is Unknown
      if (!offerTracking.byRole[role]) {
        offerTracking.byRole[role] = { count: 0, avgBase: 0, avgTotal: 0, salaries: [] };
      }
      offerTracking.byRole[role].count++;
      offerTracking.byRole[role].salaries.push(Number(offer.base_salary) || 0);
      
      // Always include in byCompany
      if (!offerTracking.byCompany[company]) {
        offerTracking.byCompany[company] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byCompany[company].count++;
      offerTracking.byCompany[company].salaries.push(Number(offer.base_salary) || 0);
      
      // Always include in byLocation
      if (!offerTracking.byLocation[location]) {
        offerTracking.byLocation[location] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byLocation[location].count++;
      offerTracking.byLocation[location].salaries.push(Number(offer.base_salary) || 0);
      
      // Normalize role level (handle case variations and nulls)
      const normalizedLevel = level && level !== 'Unknown' 
        ? level.toLowerCase().trim() 
        : 'unknown';
      
      // Always include in byLevel, even if level is unknown
      if (!offerTracking.byLevel[normalizedLevel]) {
        offerTracking.byLevel[normalizedLevel] = { count: 0, avgBase: 0, salaries: [] };
      }
      offerTracking.byLevel[normalizedLevel].count++;
      offerTracking.byLevel[normalizedLevel].salaries.push(Number(offer.base_salary) || 0);
    });
    
    // Also include jobs with role_level (only if they don't have offers and have salary data)
    // This ensures jobs that had offers removed are not counted
    console.log("📊 Processing jobs with role_level:", {
      totalJobs: jobs.length,
      jobsWithRoleLevel: jobs.filter(j => j.role_level && j.role_level.trim() !== '').length,
      jobs: jobs.filter(j => j.role_level && j.role_level.trim() !== '').map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        role_level: j.role_level,
        salary_min: j.salary_min,
        salary_max: j.salary_max
      }))
    });
    
    // Get all job IDs that have offers (including those with null job_id that might have been removed)
    const jobIdsWithOffers = new Set(
      offers
        .filter(o => o.job_id !== null && o.job_id !== undefined)
        .map(o => Number(o.job_id))
    );
    
    jobs.forEach(job => {
      const jobLevel = job.role_level;
      if (jobLevel && jobLevel.trim() !== '') {
        const normalizedLevel = jobLevel.toLowerCase().trim();
        
        // Check if this job has an offer (including offers that might have job_id set)
        const hasOffer = jobIdsWithOffers.has(Number(job.id));
        
        // Only add job data if:
        // 1. It doesn't have an offer (never had one, or offer was removed)
        // 2. It has salary data (more meaningful for statistics)
        if (!hasOffer) {
          // Use salary range midpoint if available
          const salaryMin = Number(job.salary_min) || 0;
          const salaryMax = Number(job.salary_max) || 0;
          
          // Only count jobs with salary data to make statistics more meaningful
          if (salaryMin > 0 || salaryMax > 0) {
            const salaryMidpoint = salaryMin > 0 && salaryMax > 0 
              ? (salaryMin + salaryMax) / 2 
              : (salaryMin > 0 ? salaryMin : salaryMax);
            
            // Initialize if not exists
            if (!offerTracking.byLevel[normalizedLevel]) {
              offerTracking.byLevel[normalizedLevel] = { count: 0, avgBase: 0, salaries: [] };
            }
            
            offerTracking.byLevel[normalizedLevel].count++;
            offerTracking.byLevel[normalizedLevel].salaries.push(salaryMidpoint);
            console.log(`✅ Added job ${job.id} (${job.company}) with role_level "${normalizedLevel}" and salary midpoint $${salaryMidpoint}`);
          } else {
            console.log(`⏭️ Skipped job ${job.id} (${job.company}) - no salary data`);
          }
        } else {
          console.log(`⏭️ Skipped job ${job.id} (${job.company}) - already has an offer`);
        }
      }
    });
    
    // Debug: Log all offers to see what's being processed
    console.log("📊 All Offers Processed:", {
      totalOffers: offers.length,
      offers: offers.map(o => ({
        id: o.id,
        company: o.company,
        role_title: o.role_title,
        role_level: o.role_level,
        location: o.location,
        base_salary: o.base_salary,
        offer_status: o.offer_status
      })),
      byLevelCounts: Object.entries(offerTracking.byLevel).map(([level, data]) => ({
        level,
        count: data.count,
        avgBase: data.avgBase
      }))
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
      data.avgBase = data.salaries.length > 0 
        ? data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length 
        : 0;
    });
    
    // Calculate overall average base salary and add acceptedCount for frontend compatibility
    const allSalaries = offers.map(o => Number(o.base_salary) || 0).filter(s => s > 0);
    offerTracking.avgBaseSalary = allSalaries.length > 0 
      ? allSalaries.reduce((a, b) => a + b, 0) / allSalaries.length 
      : 0;
    offerTracking.acceptedCount = allAcceptedOffers.length;
    
    // Debug logging
    console.log("📊 Offer Tracking Stats:", {
      totalOffers: offerTracking.totalOffers,
      actualOffersCount: offers.length,
      acceptedCount: offerTracking.acceptedCount,
      acceptedVsRejected: offerTracking.acceptedVsRejected,
      avgBaseSalary: offerTracking.avgBaseSalary,
      allSalariesCount: allSalaries.length,
      allAcceptedOffersCount: allAcceptedOffers.length,
      byLevel: offerTracking.byLevel,
      roleLevels: Object.keys(offerTracking.byLevel),
      offersWithRoleLevel: offers.filter(o => o.role_level).length,
      offersWithoutRoleLevel: offers.filter(o => !o.role_level).length,
      allOfferIds: offers.map(o => o.id),
      allOfferCompanies: offers.map(o => `${o.id}: ${o.company || 'MISSING'}`)
    });
    
    // 2. NEGOTIATION ANALYTICS
    // Include negotiations from negotiation_history table
    const firstRoundNegs = negotiations.filter(n => n.negotiation_round === 1);
    
    // Also include offers that have negotiation_attempted = true or negotiation_notes (even if no history entry)
    const offersWithNegotiations = offers.filter(o => 
      o.negotiation_attempted || 
      (o.negotiation_notes && o.negotiation_notes.trim().length > 0) ||
      (o.negotiation_improvement_percent && o.negotiation_improvement_percent > 0)
    );
    
    // Create negotiation entries from offers that have negotiation data but no history entry
    offersWithNegotiations.forEach(offer => {
      // Check if this offer already has a negotiation_history entry
      const hasHistoryEntry = negotiations.some(n => n.offer_id === offer.id);
      
      if (!hasHistoryEntry && (offer.negotiation_notes || offer.negotiation_attempted)) {
        // Create a virtual negotiation entry for analytics
        const improvement = Number(offer.negotiation_improvement_percent) || 0;
        // Ensure negotiation_date is a string in YYYY-MM-DD format
        let negotiationDate = offer.updated_at || offer.offer_date || new Date().toISOString().split('T')[0];
        if (negotiationDate instanceof Date) {
          negotiationDate = negotiationDate.toISOString().split('T')[0];
        } else if (typeof negotiationDate === 'string' && negotiationDate.includes('T')) {
          negotiationDate = negotiationDate.split('T')[0];
        } else if (typeof negotiationDate !== 'string') {
          negotiationDate = new Date().toISOString().split('T')[0];
        }
        firstRoundNegs.push({
          negotiation_round: 1,
          improvement_percent: improvement,
          negotiation_date: negotiationDate,
          offer_id: offer.id,
          company: offer.company,
          role_title: offer.role_title,
          industry: offer.industry,
          company_size: offer.company_size,
          location_type: offer.location_type,
          role_level: offer.role_level,
          notes: offer.negotiation_notes
        });
      }
    });
    
    const successfulNegs = firstRoundNegs.filter(n => n.improvement_percent > 0);
    
    const negotiationAnalytics = {
      successRate: firstRoundNegs.length > 0 ? (successfulNegs.length / firstRoundNegs.length) * 100 : 0,
      avgImprovement: successfulNegs.length > 0
        ? successfulNegs.reduce((sum, n) => sum + (Number(n.improvement_percent) || 0), 0) / successfulNegs.length
        : 0,
      medianImprovement: successfulNegs.length > 0
        ? successfulNegs.sort((a, b) => (Number(a.improvement_percent) || 0) - (Number(b.improvement_percent) || 0))[
            Math.floor(successfulNegs.length / 2)
          ]?.improvement_percent || 0
        : 0,
      maxImprovement: firstRoundNegs.length > 0
        ? Math.max(...firstRoundNegs.map(n => Number(n.improvement_percent) || 0))
        : 0,
      totalNegotiations: firstRoundNegs.length,
      successfulNegotiations: successfulNegs.length,
      trendsOverTime: {},
      byContext: {}
    };
    
    // Trends over time
    firstRoundNegs.forEach(n => {
      // Ensure negotiation_date is a string before calling substring
      const dateStr = n.negotiation_date 
        ? (typeof n.negotiation_date === 'string' 
            ? n.negotiation_date 
            : (n.negotiation_date instanceof Date 
                ? n.negotiation_date.toISOString().split('T')[0]
                : String(n.negotiation_date)))
        : null;
      const month = dateStr ? dateStr.substring(0, 7) : 'unknown';
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
    // Use validCompHistory to exclude entries for deleted offers
    const evolution = validCompHistory.map((role, index) => {
      const prevRole = validCompHistory[index - 1];
      const increase = prevRole && Number(prevRole.base_salary_current) > 0
        ? ((Number(role.base_salary_start) - Number(prevRole.base_salary_current)) / Number(prevRole.base_salary_current)) * 100
        : 0;
      return {
        ...role,
        increasePercent: increase,
        roleProgression: `${prevRole?.role_level || 'N/A'} → ${role?.role_level || 'N/A'}`
      };
    });
    
    // Calculate milestones from compensation history (use validCompHistory)
    const milestones = [];
    validCompHistory.forEach(role => {
      const baseSalary = Number(role.base_salary_start) || 0;
      const totalComp = Number(role.total_comp_start) || 0;
      
      if (baseSalary >= 100000 && !milestones.find(m => m.type === 'first_100k')) {
        milestones.push({ 
          type: 'first_100k', 
          date: role.start_date, 
          value: baseSalary 
        });
      }
      if (baseSalary >= 150000 && !milestones.find(m => m.type === 'first_150k')) {
        milestones.push({ 
          type: 'first_150k', 
          date: role.start_date, 
          value: baseSalary 
        });
      }
      if (totalComp >= 200000 && !milestones.find(m => m.type === 'first_200k_tc')) {
        milestones.push({ 
          type: 'first_200k_tc', 
          date: role.start_date, 
          value: totalComp 
        });
      }
      if (role.promotion_date) {
        milestones.push({ 
          type: 'promotion', 
          date: role.promotion_date, 
          from: role.promotion_from_level,
          to: role.promotion_to_level,
          value: baseSalary,
          increase: role.salary_increase_percent
        });
      }
    });
    
    // Detect plateaus and growth phases (use validCompHistory)
    const plateaus = [];
    const growthPhases = [];
    for (let i = 1; i < validCompHistory.length; i++) {
      const prev = validCompHistory[i - 1];
      const curr = validCompHistory[i];
      
      // Calculate time between roles in years (use 365.25 for leap years)
      const prevEndDate = prev.end_date ? new Date(prev.end_date) : new Date(prev.start_date);
      const currStartDate = new Date(curr.start_date);
      const timeBetween = (currStartDate - prevEndDate) / (1000 * 60 * 60 * 24 * 365.25);
      
      // Use starting salaries for comparison (more consistent)
      const prevSalary = Number(prev.base_salary_start) || 0;
      const currSalary = Number(curr.base_salary_start) || 0;
      
      // Calculate salary increase percentage
      const salaryIncrease = prevSalary > 0
        ? ((currSalary - prevSalary) / prevSalary) * 100
        : 0;
      
      // Annualize the increase (only if time between is positive and meaningful)
      const annualizedIncrease = (timeBetween > 0.1) ? salaryIncrease / timeBetween : 0;
      
      // Plateau: low growth (< 3% annualized) over a long period (> 1 year)
      if (annualizedIncrease < 3 && timeBetween > 1) {
        plateaus.push({
          startDate: prev.end_date || prev.start_date,
          endDate: curr.start_date,
          durationYears: timeBetween,
          salaryIncrease,
          annualizedIncrease
        });
      } 
      // Growth phase: significant growth (>= 15% annualized) - this is an inflection point
      else if (annualizedIncrease >= 15 && timeBetween > 0.1) {
        growthPhases.push({
          startDate: prev.end_date || prev.start_date,
          endDate: curr.start_date,
          salaryIncrease,
          annualizedIncrease,
          fromLevel: prev.role_level,
          toLevel: curr.role_level,
          fromCompany: prev.company,
          toCompany: curr.company
        });
      }
    }
    
    // 5. CAREER PROGRESSION & EARNING POTENTIAL
    const levelProgression = ['intern', 'entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp'];
    const progression = validCompHistory.map((role, index) => {
      const prevRole = validCompHistory[index - 1];
      const levelIndex = levelProgression.indexOf(role.role_level || '');
      const prevLevelIndex = prevRole ? levelProgression.indexOf(prevRole.role_level || '') : -1;
      const prevSalary = Number(prevRole?.base_salary_current) || Number(prevRole?.base_salary_start) || 0;
      const currSalary = Number(role.base_salary_start) || 0;
      
      return {
        ...role,
        levelIndex,
        levelUp: levelIndex > prevLevelIndex,
        salaryJump: prevSalary > 0
          ? ((currSalary - prevSalary) / prevSalary) * 100
          : 0
      };
    });
    
    // Estimate future earning potential
    // Use the last 3 roles (most recent) and calculate growth between them
    // compHistory is sorted by start_date ASC (oldest first), so slice(-3) gets the 3 most recent
    const recentRoles = compHistory.slice(-3);
    let avgGrowthRate = 0;
    
    if (recentRoles.length > 1) {
      // Calculate growth rate between consecutive roles
      // Use base_salary_start for both to compare starting salaries consistently
      // This gives us the growth when moving between roles
      const growthRates = [];
      for (let i = 1; i < recentRoles.length; i++) {
        const prev = recentRoles[i - 1];
        const curr = recentRoles[i];
        
        // Use starting salary of previous role and starting salary of current role
        const prevSalary = Number(prev.base_salary_start) || 0;
        const currSalary = Number(curr.base_salary_start) || 0;
        
        // Calculate time between roles in years
        const timeBetween = (new Date(curr.start_date) - new Date(prev.end_date || prev.start_date)) / (1000 * 60 * 60 * 24 * 365.25);
        
        if (prevSalary > 0 && timeBetween > 0) {
          // Calculate total growth percentage
          const totalGrowth = ((currSalary - prevSalary) / prevSalary) * 100;
          // Annualize it
          const annualGrowth = totalGrowth / timeBetween;
          growthRates.push(annualGrowth);
        }
      }
      
      // Average the growth rates
      if (growthRates.length > 0) {
        avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      }
    }
    
    // If calculated growth rate is negative or zero, or if only one role, use estimated growth rates
    // Negative growth rates usually indicate:
    // 1. Roles are in wrong order
    // 2. Salary decreased between roles (unusual but possible)
    // 3. Data quality issues
    // In these cases, use industry-standard estimates instead
        if (avgGrowthRate <= 0 || (validCompHistory.length === 1 && avgGrowthRate === 0)) {
          if (avgGrowthRate < 0) {
            console.warn(`⚠️ Negative growth rate detected (${avgGrowthRate.toFixed(2)}%). This may indicate data quality issues or salary decreases. Using estimated growth rate instead.`);
          }
          
          // Get most recent role (validCompHistory is sorted ASC, oldest first)
          // Also check if validCompHistory has elements and if role exists
          const role = validCompHistory && validCompHistory.length > 0 
            ? validCompHistory[validCompHistory.length - 1] 
            : null;
          const level = (role && role.role_level) ? role.role_level : 'mid';
      
      // Estimated annual growth rates by level (conservative estimates)
      // Based on typical career progression patterns and industry reports
      // Sources: Salary trend reports, career progression studies
      // These are ESTIMATES - actual rates vary by industry, location, company, performance
      const estimatedGrowthRates = {
        'intern': 15,      // Interns typically see 15-20% growth when moving to entry level
        'entry': 12,       // Entry level: typically 10-15% annual growth (promotions, raises)
        'junior': 10,      // Junior: typically 8-12% annual growth
        'mid': 8,          // Mid-level (3-7 YOE): typically 6-10% annual growth (industry average ~8-12%)
        'senior': 6,       // Senior: typically 5-8% annual growth (slower growth at higher levels)
        'staff': 5,        // Staff: typically 4-6% annual growth
        'principal': 4,    // Principal: typically 3-5% annual growth
        'lead': 5,         // Lead: typically 4-6% annual growth
        'manager': 7,      // Manager: typically 6-10% annual growth (management track)
        'director': 6,     // Director: typically 5-8% annual growth
        'vp': 5            // VP: typically 4-6% annual growth
      };
      
      avgGrowthRate = estimatedGrowthRates[level.toLowerCase()] || 8; // Default to 8% if level not found
      const reason = avgGrowthRate <= 0 ? 'negative/zero growth detected' : (validCompHistory.length === 1 ? 'single role' : 'no historical data');
      console.log(`📊 Using estimated growth rate: ${avgGrowthRate}% for ${level} level (${reason})`);
    }
    
    // PRIORITY 1: Check for most recent accepted offer (even if not in compensation history yet)
    // This ensures we use the actual current job, not an old compensation history entry
    const acceptedOffers = offers.filter(o => o.offer_status && o.offer_status.toLowerCase().trim() === 'accepted');
    let mostRecentAcceptedOffer = null;
    if (acceptedOffers.length > 0) {
      // Sort by decision_date (when offer was accepted) or offer_date, most recent first
      acceptedOffers.sort((a, b) => {
        const aDate = a.decision_date ? new Date(a.decision_date) : new Date(a.offer_date);
        const bDate = b.decision_date ? new Date(b.decision_date) : new Date(b.offer_date);
        return bDate - aDate; // Most recent first
      });
      mostRecentAcceptedOffer = acceptedOffers[0];
    }
    
    // PRIORITY 2: Get the most recent ACTIVE compensation history entry
    // Only use this if there's no accepted offer, or if the accepted offer is already in comp history
    // Use validCompHistory to exclude entries for deleted offers
    const activeRoles = validCompHistory.filter(ch => !ch.end_date || new Date(ch.end_date) >= new Date());
    
    let mostRecentActiveRole = null;
    if (activeRoles.length > 0) {
      // Sort by: 1) Has offer_id (accepted offers first), 2) Most recent start_date, 3) Highest current salary
      activeRoles.sort((a, b) => {
        // Prioritize roles with offer_id (accepted offers) over manually added roles
        const aHasOffer = a.offer_id !== null;
        const bHasOffer = b.offer_id !== null;
        if (aHasOffer !== bHasOffer) {
          return bHasOffer ? 1 : -1; // b first if it has offer_id
        }
        
        // Then by most recent start_date
        const dateDiff = new Date(b.start_date) - new Date(a.start_date);
        if (dateDiff !== 0) return dateDiff;
        
        // Finally by highest current salary
        const aSalary = Number(a.base_salary_current || a.base_salary_start || 0);
        const bSalary = Number(b.base_salary_current || b.base_salary_start || 0);
        return bSalary - aSalary;
      });
      
      mostRecentActiveRole = activeRoles[0];
    }
    
    // Determine which to use: Most recent accepted offer takes priority
    let currentSalary = 0;
    let currentSalarySource = 'none';
    let selectedRole = null;
    
    // Check if the most recent accepted offer is already in compensation history
    const offerInCompHistory = mostRecentAcceptedOffer 
      ? compHistory.find(ch => ch.offer_id === mostRecentAcceptedOffer.id)
      : null;
    
    if (mostRecentAcceptedOffer && !offerInCompHistory) {
      // Use the accepted offer directly (not yet in compensation history)
      currentSalary = Number(mostRecentAcceptedOffer.base_salary) || 0;
      currentSalarySource = `offer:${mostRecentAcceptedOffer.id} (${mostRecentAcceptedOffer.company} - ${mostRecentAcceptedOffer.role_title} [Accepted Offer, not yet in compensation history])`;
      console.log(`💰 Current salary from most recent accepted offer: $${currentSalary} (Offer: ${mostRecentAcceptedOffer.company} - ${mostRecentAcceptedOffer.role_title}, ID: ${mostRecentAcceptedOffer.id}, Decision Date: ${mostRecentAcceptedOffer.decision_date || mostRecentAcceptedOffer.offer_date})`);
    } else if (offerInCompHistory) {
      // Use the compensation history entry that matches the accepted offer
      selectedRole = offerInCompHistory;
      currentSalary = Number(offerInCompHistory.base_salary_current || offerInCompHistory.base_salary_start || 0);
      const isActive = !offerInCompHistory.end_date || new Date(offerInCompHistory.end_date) >= new Date();
      currentSalarySource = `compensation_history:${offerInCompHistory.id} (${offerInCompHistory.company} - ${offerInCompHistory.role_title}${isActive ? ' [Active]' : ' [Past]'}, Accepted Offer)`;
      console.log(`💰 Current salary from accepted offer in compensation history: $${currentSalary} (Role: ${offerInCompHistory.company} - ${offerInCompHistory.role_title}, ID: ${offerInCompHistory.id})`);
    } else if (mostRecentActiveRole) {
      // Fallback to most recent active role from compensation history
      selectedRole = mostRecentActiveRole;
      currentSalary = Number(mostRecentActiveRole.base_salary_current || mostRecentActiveRole.base_salary_start || 0);
      const isActive = !mostRecentActiveRole.end_date || new Date(mostRecentActiveRole.end_date) >= new Date();
      const roleType = mostRecentActiveRole.offer_id ? 'Accepted Offer' : 'Manual Entry';
      currentSalarySource = `compensation_history:${mostRecentActiveRole.id} (${mostRecentActiveRole.company} - ${mostRecentActiveRole.role_title}${isActive ? ' [Active]' : ' [Past]'}, ${roleType})`;
      console.log(`💰 Current salary from compensation history: $${currentSalary} (Role: ${mostRecentActiveRole.company} - ${mostRecentActiveRole.role_title}, ID: ${mostRecentActiveRole.id}, Active: ${isActive}, Type: ${roleType}, Start: ${mostRecentActiveRole.start_date})`);
      
      // Warn if multiple active roles
      if (activeRoles.length > 1) {
        console.warn(`⚠️ Multiple active roles detected (${activeRoles.length}). Using: ${mostRecentActiveRole.company} - ${mostRecentActiveRole.role_title}`);
        console.warn(`   All active roles:`, activeRoles.map(r => `${r.company} - ${r.role_title} (Start: ${r.start_date}, Offer ID: ${r.offer_id || 'Manual'})`));
      }
    } else if (validCompHistory.length > 0) {
      // Fallback to most recent role overall if no active roles
      selectedRole = validCompHistory[validCompHistory.length - 1];
      currentSalary = Number(selectedRole.base_salary_current || selectedRole.base_salary_start || 0);
      currentSalarySource = `compensation_history:${selectedRole.id} (${selectedRole.company} - ${selectedRole.role_title} [Past])`;
      console.log(`💰 Current salary from most recent role (past): $${currentSalary} (Role: ${selectedRole.company} - ${selectedRole.role_title})`);
    } else if (offers.length > 0) {
      // Final fallback: most recent offer (even if not accepted)
      const mostRecentOffer = offers.sort((a, b) => new Date(b.offer_date) - new Date(a.offer_date))[0];
      currentSalary = Number(mostRecentOffer.base_salary) || 0;
      currentSalarySource = `offer:${mostRecentOffer.id} (${mostRecentOffer.company} - ${mostRecentOffer.role_title})`;
      console.log(`💰 Current salary from most recent offer: $${currentSalary} (Offer: ${mostRecentOffer.company} - ${mostRecentOffer.role_title}, ID: ${mostRecentOffer.id})`);
    }
    
    const earningPotential = {
      currentSalary,
      currentSalarySource, // Add source for debugging
      avgGrowthRate,
      projected1Year: currentSalary * (1 + avgGrowthRate / 100),
      projected3Years: currentSalary * Math.pow(1 + avgGrowthRate / 100, 3),
      projected5Years: currentSalary * Math.pow(1 + avgGrowthRate / 100, 5),
      inflectionPoints: growthPhases.filter(p => p.annualizedIncrease >= 15), // Changed from 20 to 15 to match growth phase threshold
      isEstimated: compHistory.length === 1 // Flag to indicate if using estimated growth rate
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
    
    // Helper function to format context keys to human-readable names
    const formatContextName = (contextKey) => {
      // Handle industry contexts: industry_tech -> "Technology"
      if (contextKey.startsWith('industry_')) {
        const industry = contextKey.replace('industry_', '');
        const industryMap = {
          'tech': 'Technology',
          'finance': 'Finance',
          'healthcare': 'Healthcare',
          'consulting': 'Consulting',
          'retail': 'Retail',
          'manufacturing': 'Manufacturing',
          'education': 'Education',
          'government': 'Government',
          'nonprofit': 'Non-Profit',
          'media': 'Media & Entertainment',
          'real_estate': 'Real Estate',
          'energy': 'Energy',
          'telecommunications': 'Telecommunications',
          'transportation': 'Transportation',
          'hospitality': 'Hospitality',
          'agriculture': 'Agriculture',
          'construction': 'Construction',
          'legal': 'Legal',
          'pharmaceutical': 'Pharmaceutical',
          'aerospace': 'Aerospace',
          'automotive': 'Automotive'
        };
        return industryMap[industry] || industry.charAt(0).toUpperCase() + industry.slice(1).replace(/_/g, ' ');
      }
      
      // Handle company size: company_size_medium -> "Medium Company"
      if (contextKey.startsWith('company_size_')) {
        const size = contextKey.replace('company_size_', '');
        const sizeMap = {
          'startup': 'Startup',
          'small': 'Small Company',
          'medium': 'Medium Company',
          'large': 'Large Company',
          'enterprise': 'Enterprise'
        };
        return sizeMap[size] || size.charAt(0).toUpperCase() + size.slice(1);
      }
      
      // Handle location type: location_type_on_site -> "On-Site"
      if (contextKey.startsWith('location_type_')) {
        const locationType = contextKey.replace('location_type_', '');
        const locationMap = {
          'remote': 'Remote',
          'hybrid': 'Hybrid',
          'on_site': 'On-Site',
          'flexible': 'Flexible'
        };
        return locationMap[locationType] || locationType.charAt(0).toUpperCase() + locationType.slice(1).replace(/_/g, '-');
      }
      
      // Handle role level: role_level_senior -> "Senior"
      if (contextKey.startsWith('role_level_')) {
        const level = contextKey.replace('role_level_', '');
        const levelMap = {
          'intern': 'Intern',
          'entry': 'Entry Level',
          'junior': 'Junior',
          'mid': 'Mid-Level',
          'senior': 'Senior',
          'staff': 'Staff',
          'principal': 'Principal',
          'lead': 'Lead',
          'manager': 'Manager',
          'director': 'Director',
          'vp': 'VP'
        };
        return levelMap[level] || level.charAt(0).toUpperCase() + level.slice(1);
      }
      
      // Default: capitalize and replace underscores
      return contextKey.replace(/_/g, ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
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
        message: `You perform best in: ${bestContexts.map(c => formatContextName(c.context)).join(', ')}`,
        action: 'Leverage these contexts in future negotiations'
      });
    }
    
    // Optimal timing for career moves (use validCompHistory)
    if (validCompHistory.length >= 2) {
      const avgTimeBetweenRoles = validCompHistory.slice(1).reduce((sum, role, idx) => {
        const prev = validCompHistory[idx];
        const timeBetween = (new Date(role.start_date) - new Date(prev.end_date || prev.start_date)) / (1000 * 60 * 60 * 24 * 365);
        return sum + timeBetween;
      }, 0) / (validCompHistory.length - 1);
      
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
    
    // Process offers
    offers.forEach(offer => {
      const location = offer.location || 'Unknown';
      const industry = normalizeIndustry(offer.industry); // Normalize industry name
      
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
          jobs: [], // Track jobs separately
          avgSalary: 0,
          marketComparisons: []
        };
      }
      industryPositioning[industry].offers.push(offer);
    });
    
    // Also include jobs with industries (even if they don't have offers yet)
    jobs.forEach(job => {
      const industry = normalizeIndustry(job.industry);
      if (industry && industry !== 'Unknown') {
        // Check if this job already has an offer (to avoid double counting)
        const hasOffer = offers.some(o => o.job_id === job.id);
        
        if (!industryPositioning[industry]) {
          industryPositioning[industry] = {
            industry,
            offers: [],
            jobs: [],
            avgSalary: 0,
            marketComparisons: []
          };
        }
        
        // Only add job if it doesn't already have an offer
        if (!hasOffer) {
          industryPositioning[industry].jobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            salary_min: job.salary_min,
            salary_max: job.salary_max
          });
        }
      }
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
      
      // Also include job salary ranges if no offers
      if (salaries.length === 0 && data.jobs.length > 0) {
        // Use midpoint of salary ranges from jobs
        const jobSalaries = data.jobs
          .map(j => {
            const min = Number(j.salary_min) || 0;
            const max = Number(j.salary_max) || 0;
            return min > 0 && max > 0 ? (min + max) / 2 : (min > 0 ? min : max);
          })
          .filter(s => s > 0);
        
        if (jobSalaries.length > 0) {
          data.avgSalary = jobSalaries.reduce((a, b) => a + b, 0) / jobSalaries.length;
        } else {
          data.avgSalary = 0;
        }
      } else if (salaries.length > 0) {
        data.avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      } else {
        data.avgSalary = 0;
      }
    });
    
    // Add market comparisons to positioning
    marketComparisons.forEach(comp => {
      const offer = offers.find(o => o.id === comp.offerId);
      if (offer) {
        const location = offer.location || 'Unknown';
        const industry = normalizeIndustry(offer.industry); // Normalize industry name
        
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
        milestones: milestones
      },
      // Note: Using validCompHistory instead of compHistory to exclude deleted offers
      careerProgression: {
        progression,
        earningPotential,
        levelMapping: levelProgression
      },
      recommendations,
      locationPositioning: Object.values(locationPositioning),
      industryPositioning: Object.values(industryPositioning),
      jobSalaryAnalysis,
      salaryComparison
    });
  } catch (err) {
    console.error("Error fetching comprehensive compensation analytics:", err);
    res.status(500).json({ error: "Failed to fetch comprehensive analytics", details: err.message });
  }
});

export default router;

