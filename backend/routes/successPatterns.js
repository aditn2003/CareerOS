// backend/routes/successPatterns.js
// UC-105: Success Pattern Recognition

import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";

const router = express.Router();

// ------------------------------
// HELPER: Analyze Success Patterns in Applications
// ------------------------------
function analyzeApplicationPatterns(jobs) {
  const successful = jobs.filter(j => j.status === 'Offer' || j.status === 'Interview');
  const failed = jobs.filter(j => j.status === 'Rejected');
  
  const patterns = {
    byIndustry: {},
    byCompany: {},
    byTimeOfDay: {},
    byDayOfWeek: {},
    byMonth: {},
    byCustomization: {
      resume: { none: 0, light: 0, heavy: 0, tailored: 0 },
      coverLetter: { none: 0, light: 0, heavy: 0, tailored: 0 },
    },
    byLocation: {},
    bySalaryRange: {},
  };

  // Analyze successful applications
  successful.forEach(job => {
    // Industry
    if (job.industry) {
      if (!patterns.byIndustry[job.industry]) {
        patterns.byIndustry[job.industry] = { success: 0, total: 0 };
      }
      patterns.byIndustry[job.industry].success++;
      patterns.byIndustry[job.industry].total++;
    }

    // Company
    if (job.company) {
      if (!patterns.byCompany[job.company]) {
        patterns.byCompany[job.company] = { success: 0, total: 0 };
      }
      patterns.byCompany[job.company].success++;
      patterns.byCompany[job.company].total++;
    }

    // Timing
    if (job.applied_on || job.created_at) {
      const date = new Date(job.applied_on || job.created_at);
      const hour = date.getHours();
      const day = date.getDay();
      const month = date.getMonth();

      patterns.byTimeOfDay[hour] = (patterns.byTimeOfDay[hour] || 0) + 1;
      patterns.byDayOfWeek[day] = (patterns.byDayOfWeek[day] || 0) + 1;
      patterns.byMonth[month] = (patterns.byMonth[month] || 0) + 1;
    }

    // Customization
    if (job.resume_customization) {
      patterns.byCustomization.resume[job.resume_customization] = 
        (patterns.byCustomization.resume[job.resume_customization] || 0) + 1;
    }
    if (job.cover_letter_customization) {
      patterns.byCustomization.coverLetter[job.cover_letter_customization] = 
        (patterns.byCustomization.coverLetter[job.cover_letter_customization] || 0) + 1;
    }

    // Location
    if (job.location) {
      if (!patterns.byLocation[job.location]) {
        patterns.byLocation[job.location] = { success: 0, total: 0 };
      }
      patterns.byLocation[job.location].success++;
      patterns.byLocation[job.location].total++;
    }
  });

  // Analyze failed applications for comparison
  failed.forEach(job => {
    if (job.industry && patterns.byIndustry[job.industry]) {
      patterns.byIndustry[job.industry].total++;
    }
    if (job.company && patterns.byCompany[job.company]) {
      patterns.byCompany[job.company].total++;
    }
    if (job.location && patterns.byLocation[job.location]) {
      patterns.byLocation[job.location].total++;
    }
  });

  // Calculate success rates
  const industrySuccessRates = Object.entries(patterns.byIndustry).map(([industry, data]) => ({
    industry,
    successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
    success: data.success,
    total: data.total,
  })).sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));

  const companySuccessRates = Object.entries(patterns.byCompany)
    .filter(([_, data]) => data.total >= 2) // Only companies with 2+ applications
    .map(([company, data]) => ({
      company,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      success: data.success,
      total: data.total,
    })).sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));

  // Find peak times
  const peakHour = Object.entries(patterns.byTimeOfDay)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakDay = Object.entries(patterns.byDayOfWeek)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakMonth = Object.entries(patterns.byMonth)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    industrySuccessRates: industrySuccessRates.slice(0, 10),
    companySuccessRates: companySuccessRates.slice(0, 10),
    peakTiming: {
      hour: peakHour ? `${peakHour}:00` : null,
      day: peakDay !== undefined ? dayNames[parseInt(peakDay)] : null,
      month: peakMonth !== undefined ? monthNames[parseInt(peakMonth)] : null,
    },
    customizationImpact: patterns.byCustomization,
    locationSuccessRates: Object.entries(patterns.byLocation)
      .map(([location, data]) => ({
        location,
        successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
        success: data.success,
        total: data.total,
      })).sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
      .slice(0, 10),
  };
}

// ------------------------------
// HELPER: Analyze Preparation Activity Correlation
// ------------------------------
function analyzePreparationCorrelation(jobs, networkingActivities, researchHistory) {
  const correlations = {
    withResearch: { success: 0, total: 0 },
    withNetworking: { success: 0, total: 0 },
    withBoth: { success: 0, total: 0 },
    withNeither: { success: 0, total: 0 },
  };

  jobs.forEach(job => {
    const hasResearch = researchHistory.some(r => 
      r.company && job.company && r.company.toLowerCase() === job.company.toLowerCase()
    );
    
    const jobDate = new Date(job.applied_on || job.created_at);
    const hasNetworking = networkingActivities.some(activity => {
      const activityDate = new Date(activity.created_at);
      const daysDiff = Math.abs((jobDate - activityDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7; // Networking within 7 days of application
    });

    const isSuccess = job.status === 'Offer' || job.status === 'Interview';

    if (hasResearch && hasNetworking) {
      correlations.withBoth.total++;
      if (isSuccess) correlations.withBoth.success++;
    } else if (hasResearch) {
      correlations.withResearch.total++;
      if (isSuccess) correlations.withResearch.success++;
    } else if (hasNetworking) {
      correlations.withNetworking.total++;
      if (isSuccess) correlations.withNetworking.success++;
    } else {
      correlations.withNeither.total++;
      if (isSuccess) correlations.withNeither.success++;
    }
  });

  // Calculate success rates
  const preparationData = Object.entries(correlations).map(([type, data]) => ({
    type: type.replace(/([A-Z])/g, ' $1').trim(),
    successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
    success: data.success,
    total: data.total,
  }));

  return {
    preparationData,
    bestStrategy: preparationData.reduce((best, current) => 
      parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best
    ),
  };
}

// ------------------------------
// HELPER: Analyze Timing Patterns
// ------------------------------
function analyzeTimingPatterns(jobs) {
  const timingData = {
    timeToResponse: [],
    timeToInterview: [],
    timeToOffer: [],
    applicationToInterview: [],
    interviewToOffer: [],
  };

  jobs.forEach(job => {
    if (!job.created_at) return;

    const created = new Date(job.created_at);
    const applied = job.applied_on ? new Date(job.applied_on) : created;
    const statusUpdated = job.status_updated_at ? new Date(job.status_updated_at) : null;

    // Time to response (any status change)
    if (statusUpdated && job.status !== 'Interested') {
      const days = Math.floor((statusUpdated - applied) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 90) {
        timingData.timeToResponse.push({ days, status: job.status });
      }
    }

    // Time to interview
    if (job.status === 'Interview' || job.status === 'Offer') {
      if (statusUpdated) {
        const days = Math.floor((statusUpdated - applied) / (1000 * 60 * 60 * 24));
        timingData.timeToInterview.push(days);
        timingData.applicationToInterview.push(days);
      }
    }

    // Time to offer
    if (job.status === 'Offer' && statusUpdated) {
      const days = Math.floor((statusUpdated - applied) / (1000 * 60 * 60 * 24));
      timingData.timeToOffer.push(days);
      
      // Also check if there was an interview first
      if (job.application_history && Array.isArray(job.application_history)) {
        const interviewEvent = job.application_history.find(e => e.status === 'Interview');
        if (interviewEvent && interviewEvent.date) {
          const interviewDate = new Date(interviewEvent.date);
          const offerDays = Math.floor((statusUpdated - interviewDate) / (1000 * 60 * 60 * 24));
          timingData.interviewToOffer.push(offerDays);
        }
      }
    }
  });

  // Calculate averages
  const avgTimeToResponse = timingData.timeToResponse.length > 0
    ? timingData.timeToResponse.reduce((a, b) => a + b.days, 0) / timingData.timeToResponse.length
    : null;

  const avgTimeToInterview = timingData.timeToInterview.length > 0
    ? timingData.timeToInterview.reduce((a, b) => a + b, 0) / timingData.timeToInterview.length
    : null;

  const avgTimeToOffer = timingData.timeToOffer.length > 0
    ? timingData.timeToOffer.reduce((a, b) => a + b, 0) / timingData.timeToOffer.length
    : null;

  const avgInterviewToOffer = timingData.interviewToOffer.length > 0
    ? timingData.interviewToOffer.reduce((a, b) => a + b, 0) / timingData.interviewToOffer.length
    : null;

  // Optimal timing windows
  const optimalWindows = {
    applicationWindow: findOptimalWindow(timingData.timeToResponse.map(t => t.days)),
    interviewWindow: findOptimalWindow(timingData.timeToInterview),
    offerWindow: findOptimalWindow(timingData.timeToOffer),
  };

  return {
    averages: {
      timeToResponse: avgTimeToResponse ? Math.round(avgTimeToResponse) : null,
      timeToInterview: avgTimeToInterview ? Math.round(avgTimeToInterview) : null,
      timeToOffer: avgTimeToOffer ? Math.round(avgTimeToOffer) : null,
      interviewToOffer: avgInterviewToOffer ? Math.round(avgInterviewToOffer) : null,
    },
    optimalWindows,
    distribution: {
      timeToResponse: timingData.timeToResponse,
      timeToInterview: timingData.timeToInterview,
      timeToOffer: timingData.timeToOffer,
    },
  };
}

function findOptimalWindow(data) {
  if (data.length === 0) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return { min: q1, max: q3, median: sorted[Math.floor(sorted.length * 0.5)] };
}

// ------------------------------
// HELPER: Analyze Strategy Effectiveness
// ------------------------------
function analyzeStrategyEffectiveness(jobs, networkingActivities) {
  const strategies = {
    customization: {
      high: { success: 0, total: 0 },
      medium: { success: 0, total: 0 },
      low: { success: 0, total: 0 },
      none: { success: 0, total: 0 },
    },
    networking: {
      active: { success: 0, total: 0 },
      passive: { success: 0, total: 0 },
    },
    timing: {
      early: { success: 0, total: 0 }, // Applied within 3 days of posting
      normal: { success: 0, total: 0 },
      late: { success: 0, total: 0 }, // Applied after 2 weeks
    },
  };

  jobs.forEach(job => {
    const isSuccess = job.status === 'Offer' || job.status === 'Interview';
    
    // Customization strategy
    const resumeCustom = job.resume_customization || 'none';
    const coverCustom = job.cover_letter_customization || 'none';
    const customLevel = 
      (resumeCustom === 'tailored' || coverCustom === 'tailored') ? 'high' :
      (resumeCustom === 'heavy' || coverCustom === 'heavy') ? 'high' :
      (resumeCustom === 'light' || coverCustom === 'light') ? 'medium' :
      'none';
    
    strategies.customization[customLevel].total++;
    if (isSuccess) strategies.customization[customLevel].success++;

    // Networking strategy
    const jobDate = new Date(job.applied_on || job.created_at);
    const recentNetworking = networkingActivities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      const daysDiff = Math.abs((jobDate - activityDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 14;
    });

    if (recentNetworking.length > 0) {
      strategies.networking.active.total++;
      if (isSuccess) strategies.networking.active.success++;
    } else {
      strategies.networking.passive.total++;
      if (isSuccess) strategies.networking.passive.success++;
    }

    // Timing strategy (if we have job posting date, use it; otherwise skip)
    // For now, we'll use application date patterns
  });

  // Calculate effectiveness
  const effectiveness = {
    customization: Object.entries(strategies.customization).map(([level, data]) => ({
      level,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      success: data.success,
      total: data.total,
    })),
    networking: Object.entries(strategies.networking).map(([type, data]) => ({
      type,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      success: data.success,
      total: data.total,
    })),
  };

  return effectiveness;
}

// ------------------------------
// HELPER: Identify Personal Success Factors
// ------------------------------
function identifySuccessFactors(jobs, skills, employment) {
  const factors = {
    topIndustries: [],
    topCompanies: [],
    keySkills: [],
    experienceLevel: null,
    customizationPreference: null,
  };

  // Find industries with highest success
  const industrySuccess = {};
  jobs.forEach(job => {
    if (!job.industry) return;
    if (!industrySuccess[job.industry]) {
      industrySuccess[job.industry] = { success: 0, total: 0 };
    }
    industrySuccess[job.industry].total++;
    if (job.status === 'Offer' || job.status === 'Interview') {
      industrySuccess[job.industry].success++;
    }
  });

  factors.topIndustries = Object.entries(industrySuccess)
    .map(([industry, data]) => ({
      industry,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      total: data.total,
    }))
    .filter(item => parseFloat(item.successRate) > 0)
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
    .slice(0, 5);

  // Find companies with success
  const companySuccess = {};
  jobs.forEach(job => {
    if (!job.company) return;
    if (!companySuccess[job.company]) {
      companySuccess[job.company] = { success: 0, total: 0 };
    }
    companySuccess[job.company].total++;
    if (job.status === 'Offer' || job.status === 'Interview') {
      companySuccess[job.company].success++;
    }
  });

  factors.topCompanies = Object.entries(companySuccess)
    .filter(([_, data]) => data.total >= 2)
    .map(([company, data]) => ({
      company,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      total: data.total,
    }))
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
    .slice(0, 5);

  // Skills correlation (if we have job descriptions or can infer from titles)
  // For now, we'll use user's top skills
  factors.keySkills = skills
    .filter(s => s.proficiency === 'Expert' || s.proficiency === 'Advanced')
    .slice(0, 5)
    .map(s => s.name);

  // Experience level
  if (employment.length > 0) {
    const totalYears = employment.reduce((sum, emp) => {
      const start = new Date(emp.start_date);
      const end = emp.end_date ? new Date(emp.end_date) : new Date();
      return sum + ((end - start) / (1000 * 60 * 60 * 24 * 365));
    }, 0);
    factors.experienceLevel = totalYears >= 7 ? 'Senior' : totalYears >= 3 ? 'Mid' : 'Entry';
  }

  // Customization preference
  const customCounts = { none: 0, light: 0, heavy: 0, tailored: 0 };
  jobs.forEach(job => {
    const level = job.resume_customization || 'none';
    customCounts[level]++;
  });
  factors.customizationPreference = Object.entries(customCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

  return factors;
}

// ------------------------------
// HELPER: Predictive Modeling
// ------------------------------
function generatePredictiveModel(jobs, patterns, timing) {
  // Simple predictive model based on historical patterns
  const model = {
    successProbability: {},
    factors: [],
  };

  // Calculate base success rate
  const totalJobs = jobs.length;
  const successfulJobs = jobs.filter(j => j.status === 'Offer' || j.status === 'Interview').length;
  const baseSuccessRate = totalJobs > 0 ? (successfulJobs / totalJobs * 100) : 0;

  // Factors that increase success probability
  const factors = [];

  // Industry factor
  if (patterns.industrySuccessRates && patterns.industrySuccessRates.length > 0) {
    const topIndustry = patterns.industrySuccessRates[0];
    if (parseFloat(topIndustry.successRate) > baseSuccessRate) {
      factors.push({
        factor: `Targeting ${topIndustry.industry} industry`,
        impact: `+${(parseFloat(topIndustry.successRate) - baseSuccessRate).toFixed(1)}%`,
        confidence: 'high',
      });
    }
  }

  // Customization factor
  const customizationData = patterns.customizationImpact;
  if (customizationData.resume.tailored > 0 || customizationData.coverLetter.tailored > 0) {
    factors.push({
      factor: 'Heavy resume/cover letter customization',
      impact: '+15-25%',
      confidence: 'medium',
    });
  }

  // Preparation factor
  if (timing && timing.averages) {
    if (timing.averages.timeToInterview < 14) {
      factors.push({
        factor: 'Quick response time (applying early)',
        impact: '+10-15%',
        confidence: 'medium',
      });
    }
  }

  // Networking factor
  factors.push({
    factor: 'Active networking before application',
    impact: '+20-30%',
    confidence: 'high',
  });

  model.factors = factors;
  model.baseSuccessRate = baseSuccessRate.toFixed(1);
  model.optimizedSuccessRate = (baseSuccessRate + 25).toFixed(1); // Estimated with all factors

  return model;
}

// ------------------------------
// HELPER: Generate Pattern-Based Recommendations
// ------------------------------
function generatePatternRecommendations(patterns, timing, preparation, strategies, successFactors) {
  const recommendations = [];

  // Industry recommendations
  if (patterns.industrySuccessRates && patterns.industrySuccessRates.length > 0) {
    const topIndustry = patterns.industrySuccessRates[0];
    if (parseFloat(topIndustry.successRate) > 20) {
      recommendations.push({
        type: 'industry',
        title: 'Focus on High-Success Industries',
        message: `You have a ${topIndustry.successRate}% success rate in ${topIndustry.industry}. Consider prioritizing similar opportunities.`,
        priority: 'high',
        icon: '🎯',
      });
    }
  }

  // Timing recommendations
  if (patterns.peakTiming) {
    if (patterns.peakTiming.hour) {
      recommendations.push({
        type: 'timing',
        title: 'Optimal Application Time',
        message: `Your most successful applications were submitted around ${patterns.peakTiming.hour}. Consider scheduling applications during this window.`,
        priority: 'medium',
        icon: '🕐',
      });
    }
    if (patterns.peakTiming.day) {
      recommendations.push({
        type: 'timing',
        title: 'Best Day for Applications',
        message: `${patterns.peakTiming.day} shows the highest success rate. Plan your application submissions for this day.`,
        priority: 'low',
        icon: '📅',
      });
    }
  }

  // Preparation recommendations
  if (preparation.bestStrategy) {
    const best = preparation.bestStrategy;
    if (parseFloat(best.successRate) > 30) {
      recommendations.push({
        type: 'preparation',
        title: 'Effective Preparation Strategy',
        message: `Your ${best.type} approach has a ${best.successRate}% success rate. Continue using this strategy.`,
        priority: 'high',
        icon: '📚',
      });
    }
  }

  // Customization recommendations
  if (strategies.customization && strategies.customization.length > 0) {
    const bestCustom = strategies.customization.reduce((best, current) =>
      parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best
    );
    if (bestCustom.level !== 'none' && parseFloat(bestCustom.successRate) > 20) {
      recommendations.push({
        type: 'strategy',
        title: 'Customization Impact',
        message: `${bestCustom.level.charAt(0).toUpperCase() + bestCustom.level.slice(1)} customization shows ${bestCustom.successRate}% success rate. Increase customization for better results.`,
        priority: 'high',
        icon: '✏️',
      });
    }
  }

  // Networking recommendations
  if (strategies.networking && strategies.networking.length > 0) {
    const activeNetworking = strategies.networking.find(s => s.type === 'active');
    if (activeNetworking && parseFloat(activeNetworking.successRate) > 25) {
      recommendations.push({
        type: 'networking',
        title: 'Networking Before Applications',
        message: `Active networking within 2 weeks of applying increases your success rate to ${activeNetworking.successRate}%. Continue this practice.`,
        priority: 'medium',
        icon: '🤝',
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ------------------------------
// HELPER: Track Pattern Evolution
// ------------------------------
function trackPatternEvolution(jobs) {
  // Group jobs by time periods (quarters)
  const quarters = {};
  
  jobs.forEach(job => {
    const date = new Date(job.applied_on || job.created_at);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    
    if (!quarters[key]) {
      quarters[key] = { total: 0, success: 0, offers: 0 };
    }
    
    quarters[key].total++;
    if (job.status === 'Interview' || job.status === 'Offer') {
      quarters[key].success++;
    }
    if (job.status === 'Offer') {
      quarters[key].offers++;
    }
  });

  const evolution = Object.entries(quarters)
    .map(([period, data]) => ({
      period,
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      offerRate: data.total > 0 ? (data.offers / data.total * 100).toFixed(1) : 0,
      total: data.total,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Calculate trend
  let trend = 'stable';
  if (evolution.length >= 2) {
    const recent = parseFloat(evolution[evolution.length - 1].successRate);
    const previous = parseFloat(evolution[evolution.length - 2].successRate);
    if (recent > previous + 5) trend = 'improving';
    else if (recent < previous - 5) trend = 'declining';
  }

  return {
    evolution,
    trend,
    recentPerformance: evolution[evolution.length - 1] || null,
  };
}

// ------------------------------
// GET /api/success-patterns
// ------------------------------
router.get("/", auth, async (req, res) => {
  const userId = req.userId;

  try {
    // 1️⃣ Fetch Jobs
    const jobsRes = await pool.query(
      `SELECT id, title, company, location, industry, status, applied_on, created_at, 
              status_updated_at, resume_customization, cover_letter_customization, 
              application_history
       FROM jobs WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    const jobs = jobsRes.rows || [];

    // 2️⃣ Fetch Networking Activities
    let networkingActivities = [];
    try {
      const activitiesRes = await pool.query(
        `SELECT id, activity_type, created_at FROM networking_activities WHERE user_id = $1`,
        [userId]
      );
      networkingActivities = activitiesRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch networking activities:", e.message);
    }

    // 3️⃣ Fetch Company Research History
    let researchHistory = [];
    try {
      const researchRes = await pool.query(
        `SELECT company, created_at FROM company_research WHERE id = $1`,
        [userId]
      );
      researchHistory = researchRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch research history:", e.message);
    }

    // 4️⃣ Fetch Skills
    let skills = [];
    try {
      const skillsRes = await pool.query(
        `SELECT name, category, proficiency FROM skills WHERE user_id = $1`,
        [userId]
      );
      skills = skillsRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch skills:", e.message);
    }

    // 5️⃣ Fetch Employment
    let employment = [];
    try {
      const empRes = await pool.query(
        `SELECT title, company, start_date, end_date FROM employment WHERE user_id = $1`,
        [userId]
      );
      employment = empRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch employment:", e.message);
    }

    // ------------------------------
    // ANALYTICS (UC-105)
    // ------------------------------

    // Application Patterns
    const applicationPatterns = analyzeApplicationPatterns(jobs);

    // Preparation Correlation
    const preparationCorrelation = analyzePreparationCorrelation(jobs, networkingActivities, researchHistory);

    // Timing Patterns
    const timingPatterns = analyzeTimingPatterns(jobs);

    // Strategy Effectiveness
    const strategyEffectiveness = analyzeStrategyEffectiveness(jobs, networkingActivities);

    // Success Factors
    const successFactors = identifySuccessFactors(jobs, skills, employment);

    // Predictive Model
    const predictiveModel = generatePredictiveModel(jobs, applicationPatterns, timingPatterns);

    // Pattern Evolution
    const patternEvolution = trackPatternEvolution(jobs);

    // Recommendations
    const recommendations = generatePatternRecommendations(
      applicationPatterns,
      timingPatterns,
      preparationCorrelation,
      strategyEffectiveness,
      successFactors
    );

    // ------------------------------
    // SUMMARY STATS
    // ------------------------------
    const totalJobs = jobs.length;
    const successfulJobs = jobs.filter(j => j.status === 'Offer' || j.status === 'Interview').length;
    const offers = jobs.filter(j => j.status === 'Offer').length;

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.json({
      // Summary
      summary: {
        totalApplications: totalJobs,
        successfulApplications: successfulJobs,
        offers: offers,
        overallSuccessRate: totalJobs > 0 ? ((successfulJobs / totalJobs) * 100).toFixed(1) : 0,
        offerRate: totalJobs > 0 ? ((offers / totalJobs) * 100).toFixed(1) : 0,
      },

      // Pattern Analysis
      applicationPatterns,
      preparationCorrelation,
      timingPatterns,
      strategyEffectiveness,
      successFactors,

      // Predictive & Evolution
      predictiveModel,
      patternEvolution,

      // Recommendations
      recommendations,
    });

  } catch (err) {
    console.error("❌ Success Patterns Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

