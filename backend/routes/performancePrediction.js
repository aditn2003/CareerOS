// backend/routes/performancePrediction.js
// UC-107: Performance Prediction and Forecasting

import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";

const router = express.Router();

// ------------------------------
// HELPER: Predict Interview Success Probability
// ------------------------------
function predictInterviewSuccess(jobs, skills, networkingActivities, researchHistory) {
  // Base success rate from historical data
  const totalJobs = jobs.length;
  const successfulInterviews = jobs.filter(j => j.status === 'Interview' || j.status === 'Offer').length;
  const baseSuccessRate = totalJobs > 0 ? (successfulInterviews / totalJobs * 100) : 15; // Default 15%

  // Factor calculations
  let successProbability = baseSuccessRate;
  const factors = [];

  // 1. Preparation factor (research + networking)
  const jobsWithPrep = jobs.filter(job => {
    const hasResearch = researchHistory.some(r => 
      r.company && job.company && r.company.toLowerCase() === job.company.toLowerCase()
    );
    const jobDate = new Date(job.applied_on || job.created_at);
    const hasNetworking = networkingActivities.some(activity => {
      const activityDate = new Date(activity.created_at);
      const daysDiff = Math.abs((jobDate - activityDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    });
    return hasResearch || hasNetworking;
  });

  const prepSuccessRate = jobsWithPrep.length > 0
    ? (jobsWithPrep.filter(j => j.status === 'Interview' || j.status === 'Offer').length / jobsWithPrep.length * 100)
    : 0;

  if (prepSuccessRate > baseSuccessRate) {
    const boost = Math.min(15, prepSuccessRate - baseSuccessRate);
    successProbability += boost;
    factors.push({
      name: 'Preparation (Research + Networking)',
      impact: `+${boost.toFixed(1)}%`,
      confidence: 'high',
    });
  }

  // 2. Customization factor
  const customizedJobs = jobs.filter(j => 
    j.resume_customization === 'heavy' || j.resume_customization === 'tailored' ||
    j.cover_letter_customization === 'heavy' || j.cover_letter_customization === 'tailored'
  );
  if (customizedJobs.length > 0) {
    const customSuccessRate = (customizedJobs.filter(j => j.status === 'Interview' || j.status === 'Offer').length / customizedJobs.length * 100);
    if (customSuccessRate > baseSuccessRate) {
      const boost = Math.min(10, (customSuccessRate - baseSuccessRate) * 0.5);
      successProbability += boost;
      factors.push({
        name: 'High Customization',
        impact: `+${boost.toFixed(1)}%`,
        confidence: 'medium',
      });
    }
  }

  // 3. Skills factor
  const technicalSkills = skills.filter(s => s.category === 'Technical' || s.category === 'Languages').length;
  if (technicalSkills >= 8) {
    successProbability += 5;
    factors.push({
      name: 'Strong Technical Skills',
      impact: '+5%',
      confidence: 'medium',
    });
  }

  // 4. Experience factor (from jobs - if applying to senior roles)
  const seniorApplications = jobs.filter(j => {
    const title = (j.title || '').toLowerCase();
    return title.includes('senior') || title.includes('lead') || title.includes('principal');
  });
  if (seniorApplications.length > totalJobs * 0.3) {
    factors.push({
      name: 'Senior Role Applications',
      impact: 'Neutral',
      confidence: 'low',
    });
  }

  // 5. Recent performance trend
  const recentJobs = jobs.slice(0, Math.min(10, jobs.length));
  const recentSuccessRate = recentJobs.length > 0
    ? (recentJobs.filter(j => j.status === 'Interview' || j.status === 'Offer').length / recentJobs.length * 100)
    : baseSuccessRate;
  
  if (recentSuccessRate > baseSuccessRate + 5) {
    successProbability += 3;
    factors.push({
      name: 'Improving Trend',
      impact: '+3%',
      confidence: 'medium',
    });
  } else if (recentSuccessRate < baseSuccessRate - 5) {
    successProbability -= 3;
    factors.push({
      name: 'Declining Trend',
      impact: '-3%',
      confidence: 'medium',
    });
  }

  // Cap probability between 5% and 85%
  successProbability = Math.max(5, Math.min(85, successProbability));

  // Calculate confidence interval (±10% for high confidence, ±15% for medium, ±20% for low)
  const avgConfidence = factors.length > 0
    ? factors.reduce((sum, f) => sum + (f.confidence === 'high' ? 1 : f.confidence === 'medium' ? 0.5 : 0), 0) / factors.length
    : 0.5;
  
  const confidenceInterval = avgConfidence > 0.7 ? 10 : avgConfidence > 0.4 ? 15 : 20;

  return {
    probability: Math.round(successProbability),
    confidenceInterval: confidenceInterval,
    range: {
      min: Math.max(0, Math.round(successProbability - confidenceInterval)),
      max: Math.min(100, Math.round(successProbability + confidenceInterval)),
    },
    factors,
    baseRate: Math.round(baseSuccessRate),
  };
}

// ------------------------------
// HELPER: Forecast Job Search Timeline
// ------------------------------
function forecastTimeline(jobs, currentActivity, marketConditions = {}) {
  // Calculate historical averages
  const successfulJobs = jobs.filter(j => j.status === 'Offer');
  
  if (successfulJobs.length === 0) {
    // Default estimates if no offers yet
    return {
      estimatedTimeToOffer: 90, // days
      estimatedApplicationsNeeded: 30,
      milestones: [
        { milestone: 'First Interview', days: 30, confidence: 'medium' },
        { milestone: 'First Offer', days: 90, confidence: 'low' },
      ],
      scenarios: generateTimelineScenarios(30, 90),
    };
  }

  // Calculate average time to offer
  const timesToOffer = [];
  successfulJobs.forEach(job => {
    if (job.applied_on && job.status_updated_at) {
      const applied = new Date(job.applied_on);
      const offerDate = new Date(job.status_updated_at);
      const days = Math.floor((offerDate - applied) / (1000 * 60 * 60 * 24));
      if (days > 0 && days < 365) {
        timesToOffer.push(days);
      }
    }
  });

  const avgTimeToOffer = timesToOffer.length > 0
    ? timesToOffer.reduce((a, b) => a + b, 0) / timesToOffer.length
    : 90;

  // Calculate application-to-offer ratio
  const totalApplications = jobs.length;
  const offers = successfulJobs.length;
  const applicationsPerOffer = totalApplications > 0 ? totalApplications / offers : 30;

  // Adjust based on current activity
  const currentActivityLevel = currentActivity || 'normal'; // low, normal, high
  let activityMultiplier = 1;
  if (currentActivityLevel === 'high') activityMultiplier = 0.8; // Faster with high activity
  if (currentActivityLevel === 'low') activityMultiplier = 1.3; // Slower with low activity

  // Adjust based on market conditions
  const marketMultiplier = marketConditions.jobMarket === 'strong' ? 0.9 : 
                           marketConditions.jobMarket === 'weak' ? 1.2 : 1;

  const estimatedTimeToOffer = Math.round(avgTimeToOffer * activityMultiplier * marketMultiplier);
  const estimatedApplicationsNeeded = Math.round(applicationsPerOffer * activityMultiplier);

  // Generate milestones
  const milestones = [
    {
      milestone: 'First Interview',
      days: Math.round(estimatedTimeToOffer * 0.3),
      confidence: 'high',
    },
    {
      milestone: 'Multiple Interviews',
      days: Math.round(estimatedTimeToOffer * 0.6),
      confidence: 'medium',
    },
    {
      milestone: 'First Offer',
      days: estimatedTimeToOffer,
      confidence: 'medium',
    },
  ];

  // Generate scenarios
  const scenarios = generateTimelineScenarios(estimatedApplicationsNeeded, estimatedTimeToOffer);

  return {
    estimatedTimeToOffer,
    estimatedApplicationsNeeded,
    milestones,
    scenarios,
    historicalAverage: Math.round(avgTimeToOffer),
    activityImpact: currentActivityLevel,
  };
}

function generateTimelineScenarios(applicationsNeeded, timeToOffer) {
  return [
    {
      name: 'Optimistic',
      description: 'High activity, strong market, excellent preparation',
      applicationsNeeded: Math.round(applicationsNeeded * 0.7),
      timeToOffer: Math.round(timeToOffer * 0.7),
      probability: 25,
    },
    {
      name: 'Realistic',
      description: 'Normal activity, average market conditions',
      applicationsNeeded: applicationsNeeded,
      timeToOffer: timeToOffer,
      probability: 50,
    },
    {
      name: 'Conservative',
      description: 'Lower activity, competitive market',
      applicationsNeeded: Math.round(applicationsNeeded * 1.3),
      timeToOffer: Math.round(timeToOffer * 1.4),
      probability: 25,
    },
  ];
}

// ------------------------------
// HELPER: Predict Salary Negotiation Outcome
// ------------------------------
function predictSalaryNegotiation(jobs, marketData = {}) {
  // Historical negotiation data (if available)
  const jobsWithSalary = jobs.filter(j => j.salary_min || j.salary_max);
  
  // Market benchmarks
  const avgMarketSalary = marketData.avgSalary || 120000;
  const negotiationRange = marketData.negotiationRange || 0.10; // 10% typical range

  // Preparation factors
  let negotiationStrength = 0.5; // Base 50% chance of successful negotiation
  const factors = [];

  // Research factor
  if (jobsWithSalary.length > 0) {
    negotiationStrength += 0.1;
    factors.push({
      name: 'Salary Research',
      impact: '+10%',
      confidence: 'high',
    });
  }

  // Multiple offers factor
  const currentOffers = jobs.filter(j => j.status === 'Offer').length;
  if (currentOffers > 1) {
    negotiationStrength += 0.15;
    factors.push({
      name: 'Multiple Offers',
      impact: '+15%',
      confidence: 'high',
    });
  }

  // Experience level factor (inferred from job titles)
  const seniorRoles = jobs.filter(j => {
    const title = (j.title || '').toLowerCase();
    return title.includes('senior') || title.includes('lead');
  });
  if (seniorRoles.length > jobs.length * 0.3) {
    negotiationStrength += 0.1;
    factors.push({
      name: 'Senior Role Experience',
      impact: '+10%',
      confidence: 'medium',
    });
  }

  // Cap between 30% and 90%
  negotiationStrength = Math.max(0.3, Math.min(0.9, negotiationStrength));

  // Predict salary increase
  const predictedIncrease = Math.round(avgMarketSalary * negotiationRange * negotiationStrength);
  const predictedFinalSalary = avgMarketSalary + predictedIncrease;

  return {
    negotiationSuccessProbability: Math.round(negotiationStrength * 100),
    predictedSalaryIncrease: predictedIncrease,
    predictedFinalSalary: predictedFinalSalary,
    marketAverage: avgMarketSalary,
    factors,
    confidence: negotiationStrength > 0.7 ? 'high' : negotiationStrength > 0.5 ? 'medium' : 'low',
  };
}

// ------------------------------
// HELPER: Predict Optimal Timing
// ------------------------------
function predictOptimalTiming(jobs, marketConditions = {}) {
  // Analyze historical timing patterns
  const successfulJobs = jobs.filter(j => j.status === 'Offer' || j.status === 'Interview');
  
  const timingPatterns = {
    byMonth: Array(12).fill(0),
    byDayOfWeek: Array(7).fill(0),
    byHour: Array(24).fill(0),
  };

  successfulJobs.forEach(job => {
    const date = new Date(job.applied_on || job.created_at);
    timingPatterns.byMonth[date.getMonth()]++;
    timingPatterns.byDayOfWeek[date.getDay()]++;
    timingPatterns.byHour[date.getHours()]++;
  });

  // Find peaks
  const peakMonth = timingPatterns.byMonth.indexOf(Math.max(...timingPatterns.byMonth));
  const peakDay = timingPatterns.byDayOfWeek.indexOf(Math.max(...timingPatterns.byDayOfWeek));
  const peakHour = timingPatterns.byHour.indexOf(Math.max(...timingPatterns.byHour));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Market timing adjustments
  const marketTiming = marketConditions.seasonalTrend || 'normal';
  let timingRecommendation = 'optimal';
  let timingScore = 70;

  // Q1 (Jan-Mar) is typically best for hiring
  const currentMonth = new Date().getMonth();
  if (currentMonth >= 0 && currentMonth <= 2) {
    timingScore += 10;
    timingRecommendation = 'excellent';
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    timingScore += 5;
    timingRecommendation = 'good';
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    timingScore -= 5;
    timingRecommendation = 'moderate';
  }

  return {
    optimalMonth: monthNames[peakMonth] || 'January',
    optimalDay: dayNames[peakDay] || 'Tuesday',
    optimalHour: `${peakHour}:00` || '10:00',
    currentTiming: {
      month: monthNames[currentMonth],
      score: Math.max(0, Math.min(100, timingScore)),
      recommendation: timingRecommendation,
    },
    nextOptimalWindow: calculateNextOptimalWindow(currentMonth),
    marketTiming,
  };
}

function calculateNextOptimalWindow(currentMonth) {
  // Q1 is typically best (Jan-Mar)
  if (currentMonth >= 0 && currentMonth <= 2) {
    return { month: 'Current (Q1)', daysUntil: 0, reason: 'Q1 is peak hiring season' };
  } else if (currentMonth >= 3 && currentMonth <= 8) {
    const daysUntil = (12 - currentMonth) * 30; // Approximate days until January
    return { month: 'January (Q1 2025)', daysUntil, reason: 'Q1 typically sees highest hiring activity' };
  } else {
    const daysUntil = (12 - currentMonth) * 30;
    return { month: 'January (Q1 2025)', daysUntil, reason: 'Q1 typically sees highest hiring activity' };
  }
}

// ------------------------------
// HELPER: Generate Scenario Planning
// ------------------------------
function generateScenarios(jobs, currentMetrics) {
  const scenarios = [
    {
      name: 'Status Quo',
      description: 'Continue current strategy and activity level',
      assumptions: [
        'Maintain current application rate',
        'Continue existing preparation level',
        'No major strategy changes',
      ],
      predictedOutcomes: {
        timeToOffer: currentMetrics.estimatedTimeToOffer || 90,
        applicationsNeeded: currentMetrics.estimatedApplicationsNeeded || 30,
        successRate: currentMetrics.baseSuccessRate || 15,
      },
      probability: 50,
    },
    {
      name: 'Increased Activity',
      description: 'Double application rate and increase networking',
      assumptions: [
        'Apply to 2x more positions',
        'Increase networking activities by 50%',
        'Maintain current preparation quality',
      ],
      predictedOutcomes: {
        timeToOffer: Math.round((currentMetrics.estimatedTimeToOffer || 90) * 0.7),
        applicationsNeeded: Math.round((currentMetrics.estimatedApplicationsNeeded || 30) * 1.2),
        successRate: Math.min(100, (currentMetrics.baseSuccessRate || 15) + 5),
      },
      probability: 30,
    },
    {
      name: 'Enhanced Preparation',
      description: 'Focus on quality over quantity with better preparation',
      assumptions: [
        'Research every company before applying',
        'Heavy customization for all applications',
        'Active networking before each application',
      ],
      predictedOutcomes: {
        timeToOffer: Math.round((currentMetrics.estimatedTimeToOffer || 90) * 0.8),
        applicationsNeeded: Math.round((currentMetrics.estimatedApplicationsNeeded || 30) * 0.8),
        successRate: Math.min(100, (currentMetrics.baseSuccessRate || 15) + 10),
      },
      probability: 20,
    },
  ];

  return scenarios;
}

// ------------------------------
// HELPER: Track Prediction Accuracy
// ------------------------------
function trackPredictionAccuracy(jobs) {
  // This would ideally compare past predictions with actual outcomes
  // For now, we'll calculate based on historical consistency
  
  const accuracyMetrics = {
    overallAccuracy: 0,
    trendAccuracy: 0,
    timingAccuracy: 0,
    modelImprovement: 'stable',
  };

  // Calculate consistency in success rates over time
  if (jobs.length >= 10) {
    const quarters = {};
    jobs.forEach(job => {
      const date = new Date(job.created_at);
      const quarter = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
      if (!quarters[quarter]) {
        quarters[quarter] = { total: 0, success: 0 };
      }
      quarters[quarter].total++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        quarters[quarter].success++;
      }
    });

    const quarterRates = Object.values(quarters).map(q => 
      q.total > 0 ? (q.success / q.total * 100) : 0
    );

    if (quarterRates.length >= 2) {
      const variance = calculateVariance(quarterRates);
      accuracyMetrics.overallAccuracy = Math.max(0, Math.min(100, 100 - variance * 10));
      accuracyMetrics.trendAccuracy = accuracyMetrics.overallAccuracy;

      // Check if model is improving (variance decreasing)
      if (quarterRates.length >= 3) {
        const recentVariance = calculateVariance(quarterRates.slice(-2));
        const olderVariance = calculateVariance(quarterRates.slice(0, -2));
        if (recentVariance < olderVariance) {
          accuracyMetrics.modelImprovement = 'improving';
        } else if (recentVariance > olderVariance) {
          accuracyMetrics.modelImprovement = 'declining';
        }
      }
    }
  }

  return accuracyMetrics;
}

function calculateVariance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

// ------------------------------
// HELPER: Generate Improvement Recommendations
// ------------------------------
function generateImprovementRecommendations(predictions, jobs, skills, networkingActivities) {
  const recommendations = [];

  // Interview success recommendations
  if (predictions.interviewSuccess.probability < 20) {
    recommendations.push({
      type: 'interview',
      title: 'Improve Interview Success Rate',
      message: `Your predicted interview success rate is ${predictions.interviewSuccess.probability}%. Focus on:`,
      actions: [
        'Increase company research before applications',
        'Heavy resume/cover letter customization',
        'Active networking within 7 days of applying',
      ],
      expectedImpact: '+10-15%',
      priority: 'high',
    });
  }

  // Timeline recommendations
  if (predictions.timeline.estimatedTimeToOffer > 120) {
    recommendations.push({
      type: 'timeline',
      title: 'Accelerate Job Search Timeline',
      message: `Predicted timeline is ${predictions.timeline.estimatedTimeToOffer} days. To speed up:`,
      actions: [
        'Increase application volume by 50%',
        'Apply during peak hiring seasons (Q1)',
        'Target companies with faster hiring processes',
      ],
      expectedImpact: '-20-30 days',
      priority: 'medium',
    });
  }

  // Salary negotiation recommendations
  if (predictions.salaryNegotiation.negotiationSuccessProbability < 50) {
    recommendations.push({
      type: 'salary',
      title: 'Strengthen Salary Negotiation Position',
      message: `Your negotiation success probability is ${predictions.salaryNegotiation.negotiationSuccessProbability}%. Improve by:`,
      actions: [
        'Research market salary ranges for target roles',
        'Aim for multiple offers to increase leverage',
        'Highlight senior-level experience and achievements',
      ],
      expectedImpact: '+15-20%',
      priority: 'medium',
    });
  }

  // Timing recommendations
  if (predictions.optimalTiming.currentTiming.score < 60) {
    recommendations.push({
      type: 'timing',
      title: 'Optimize Application Timing',
      message: `Current timing score is ${predictions.optimalTiming.currentTiming.score}/100. Consider:`,
      actions: [
        `Apply during ${predictions.optimalTiming.optimalMonth} for best results`,
        `Target ${predictions.optimalTiming.optimalDay} applications`,
        'Focus on Q1 (January-March) for peak opportunities',
      ],
      expectedImpact: '+5-10% success rate',
      priority: 'low',
    });
  }

  return recommendations;
}

// ------------------------------
// GET /api/performance-prediction
// ------------------------------
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  const { activityLevel = 'normal', marketConditions = {} } = req.query;

  try {
    // 1️⃣ Fetch Jobs
    const jobsRes = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const jobs = jobsRes.rows || [];

    // 2️⃣ Fetch Skills
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

    // 3️⃣ Fetch Networking Activities
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

    // 4️⃣ Fetch Company Research History
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

    // Parse market conditions
    const parsedMarketConditions = typeof marketConditions === 'string' 
      ? JSON.parse(marketConditions) 
      : marketConditions;

    // ------------------------------
    // PREDICTIONS (UC-107)
    // ------------------------------

    // Interview Success Prediction
    const interviewSuccess = predictInterviewSuccess(jobs, skills, networkingActivities, researchHistory);

    // Timeline Forecast
    const timeline = forecastTimeline(jobs, activityLevel, parsedMarketConditions);

    // Salary Negotiation Prediction
    const salaryNegotiation = predictSalaryNegotiation(jobs, parsedMarketConditions);

    // Optimal Timing Prediction
    const optimalTiming = predictOptimalTiming(jobs, parsedMarketConditions);

    // Scenario Planning
    const scenarios = generateScenarios(jobs, {
      estimatedTimeToOffer: timeline.estimatedTimeToOffer,
      estimatedApplicationsNeeded: timeline.estimatedApplicationsNeeded,
      baseSuccessRate: interviewSuccess.baseRate,
    });

    // Prediction Accuracy Tracking
    const accuracyTracking = trackPredictionAccuracy(jobs);

    // Improvement Recommendations
    const recommendations = generateImprovementRecommendations(
      { interviewSuccess, timeline, salaryNegotiation, optimalTiming },
      jobs,
      skills,
      networkingActivities
    );

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.json({
      // Predictions
      interviewSuccess,
      timeline,
      salaryNegotiation,
      optimalTiming,

      // Scenario Planning
      scenarios,

      // Accuracy & Tracking
      accuracyTracking,

      // Recommendations
      recommendations,

      // Summary
      summary: {
        overallSuccessProbability: interviewSuccess.probability,
        estimatedTimeToOffer: timeline.estimatedTimeToOffer,
        negotiationSuccessRate: salaryNegotiation.negotiationSuccessProbability,
        currentTimingScore: optimalTiming.currentTiming.score,
      },
    });

  } catch (err) {
    console.error("❌ Performance Prediction Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

