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
  // Only analyze actual applications (exclude 'Interested' status)
  const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
  const successful = actualApplications.filter(j => j.status === 'Offer' || j.status === 'Interview');
  const failed = actualApplications.filter(j => j.status === 'Rejected');
  
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

  // Normalize industry names (case-insensitive, trim whitespace)
  const normalizeIndustry = (industry) => {
    if (!industry) return null;
    return industry.trim().toLowerCase();
  };

  // First, initialize all industries/companies/locations from ALL applications
  actualApplications.forEach(job => {
    // Industry (normalized for case-insensitive matching)
    const normalizedIndustry = normalizeIndustry(job.industry);
    if (normalizedIndustry) {
      // Use original industry name for display, but normalize for matching
      const displayIndustry = job.industry.trim();
      if (!patterns.byIndustry[normalizedIndustry]) {
        patterns.byIndustry[normalizedIndustry] = { 
          success: 0, 
          total: 0,
          displayName: displayIndustry // Store original for display
        };
      }
      patterns.byIndustry[normalizedIndustry].total++;
    }

    // Company
    if (job.company && job.company.trim() !== '') {
      if (!patterns.byCompany[job.company]) {
        patterns.byCompany[job.company] = { success: 0, total: 0 };
      }
      patterns.byCompany[job.company].total++;
    }

    // Location
    if (job.location && job.location.trim() !== '') {
      if (!patterns.byLocation[job.location]) {
        patterns.byLocation[job.location] = { success: 0, total: 0 };
      }
      patterns.byLocation[job.location].total++;
    }
  });

  // Then, mark successful ones
  successful.forEach(job => {
    // Industry (using normalized key)
    const normalizedIndustry = normalizeIndustry(job.industry);
    if (normalizedIndustry && patterns.byIndustry[normalizedIndustry]) {
      patterns.byIndustry[normalizedIndustry].success++;
    }

    // Company
    if (job.company && patterns.byCompany[job.company]) {
      patterns.byCompany[job.company].success++;
    }

    // Timing (only for successful applications)
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
    if (job.location && patterns.byLocation[job.location]) {
      patterns.byLocation[job.location].success++;
    }
  });

  // Calculate success rates (use displayName if available, otherwise use normalized key)
  const industrySuccessRates = Object.entries(patterns.byIndustry)
    .filter(([industry, data]) => industry && data.total > 0) // Filter out empty industries
    .map(([industry, data]) => ({
      industry: data.displayName || industry.charAt(0).toUpperCase() + industry.slice(1), // Use display name or capitalize
      successRate: data.total > 0 ? parseFloat((data.success / data.total * 100).toFixed(1)) : 0,
      success: data.success,
      total: data.total,
    }))
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
  
  // Debug logging
  if (industrySuccessRates.length > 0) {
    console.log(`📊 Industry Success Rates calculated:`, industrySuccessRates.slice(0, 5));
  } else {
    console.log(`⚠️ No industry success rates calculated. Industries in patterns:`, Object.keys(patterns.byIndustry));
    console.log(`⚠️ Actual applications count: ${actualApplications.length}, Successful: ${successful.length}`);
    console.log(`⚠️ Sample jobs:`, actualApplications.slice(0, 3).map(j => ({ 
      id: j.id, 
      industry: j.industry, 
      status: j.status,
      company: j.company 
    })));
  }

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
function analyzePreparationCorrelation(jobs, networkingActivities, researchHistory, mockInterviews = [], techPrepSessions = [], interviewPrep = []) {
  const correlations = {
    withResearch: { success: 0, total: 0 },
    withNetworking: { success: 0, total: 0 },
    withMockInterview: { success: 0, total: 0 },
    withTechPrep: { success: 0, total: 0 },
    withInterviewPrep: { success: 0, total: 0 },
    withMultiplePrep: { success: 0, total: 0 }, // 2+ preparation activities
    withComprehensivePrep: { success: 0, total: 0 }, // 3+ preparation activities
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
      return daysDiff <= 14; // Networking within 14 days of application
    });

    // Check for mock interviews for this company/role
    const hasMockInterview = mockInterviews.some(mock => {
      const mockDate = new Date(mock.created_at);
      const daysDiff = Math.abs((jobDate - mockDate) / (1000 * 60 * 60 * 24));
      return (mock.company && job.company && mock.company.toLowerCase() === job.company.toLowerCase()) ||
             daysDiff <= 30; // Mock interview within 30 days
    });

    // Check for tech prep for this company/role
    const hasTechPrep = techPrepSessions.some(tech => {
      const techDate = new Date(tech.created_at);
      const daysDiff = Math.abs((jobDate - techDate) / (1000 * 60 * 60 * 24));
      return (tech.company && job.company && tech.company.toLowerCase() === job.company.toLowerCase()) ||
             daysDiff <= 30; // Tech prep within 30 days
    });

    // Check for interview preparation
    const hasInterviewPrep = interviewPrep.some(prep => {
      const prepDate = new Date(prep.created_at);
      const daysDiff = Math.abs((jobDate - prepDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 14; // Interview prep within 14 days
    });

    const isSuccess = job.status === 'Offer' || job.status === 'Interview';

    // Count preparation activities
    const prepCount = [hasResearch, hasNetworking, hasMockInterview, hasTechPrep, hasInterviewPrep]
      .filter(Boolean).length;

    if (prepCount >= 3) {
      correlations.withComprehensivePrep.total++;
      if (isSuccess) correlations.withComprehensivePrep.success++;
    } else if (prepCount >= 2) {
      correlations.withMultiplePrep.total++;
      if (isSuccess) correlations.withMultiplePrep.success++;
    } else if (hasInterviewPrep) {
      correlations.withInterviewPrep.total++;
      if (isSuccess) correlations.withInterviewPrep.success++;
    } else if (hasTechPrep) {
      correlations.withTechPrep.total++;
      if (isSuccess) correlations.withTechPrep.success++;
    } else if (hasMockInterview) {
      correlations.withMockInterview.total++;
      if (isSuccess) correlations.withMockInterview.success++;
    } else if (hasResearch && hasNetworking) {
      correlations.withResearch.total++;
      if (isSuccess) correlations.withResearch.success++;
      correlations.withNetworking.total++;
      if (isSuccess) correlations.withNetworking.success++;
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
  const preparationData = Object.entries(correlations)
    .filter(([_, data]) => data.total > 0) // Only include categories with data
    .map(([type, data]) => ({
      type: type.replace(/([A-Z])/g, ' $1').trim(),
      successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
      success: data.success,
      total: data.total,
    }))
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));

  return {
    preparationData,
    bestStrategy: preparationData.length > 0 ? preparationData[0] : { type: 'None', successRate: '0', success: 0, total: 0 },
  };
}

// ------------------------------
// HELPER: Analyze Timing Patterns
// ------------------------------
function analyzeTimingPatterns(jobs, applicationHistory = [], interviewOutcomes = []) {
  const timingData = {
    timeToResponse: [],
    timeToInterview: [],
    timeToOffer: [],
    applicationToInterview: [],
    interviewToOffer: [],
  };

  // Create a map of job_id to application history events
  const historyByJobId = {};
  applicationHistory.forEach(hist => {
    if (!historyByJobId[hist.job_id]) {
      historyByJobId[hist.job_id] = [];
    }
    historyByJobId[hist.job_id].push(hist);
  });

  // Create a map of job_id to interview outcomes
  const interviewsByJobId = {};
  interviewOutcomes.forEach(interview => {
    if (interview.job_id) {
      interviewsByJobId[interview.job_id] = interview;
    }
  });

  jobs.forEach(job => {
    if (!job.created_at) return;

    const created = new Date(job.created_at);
    const applied = job.applied_on ? new Date(job.applied_on) : created;
    const statusUpdated = job.status_updated_at ? new Date(job.status_updated_at) : null;

    // Get history events for this job
    const jobHistory = historyByJobId[job.id] || [];
    const interviewEvent = jobHistory.find(h => 
      h.to_status === 'Interview' || h.to_status === 'Offer' || h.event?.toLowerCase().includes('interview')
    );
    const offerEvent = jobHistory.find(h => 
      h.to_status === 'Offer' || h.event?.toLowerCase().includes('offer')
    );

    // Time to response (any status change)
    if (statusUpdated && job.status !== 'Interested') {
      const days = Math.floor((statusUpdated - applied) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 90) {
        timingData.timeToResponse.push({ days, status: job.status });
      }
    }

    // Time to interview (use interview_outcomes or history or status_updated_at)
    let interviewDate = null;
    if (interviewsByJobId[job.id] && interviewsByJobId[job.id].interview_date) {
      interviewDate = new Date(interviewsByJobId[job.id].interview_date);
    } else if (interviewEvent && interviewEvent.timestamp) {
      interviewDate = new Date(interviewEvent.timestamp);
    } else if ((job.status === 'Interview' || job.status === 'Offer') && statusUpdated) {
      interviewDate = statusUpdated;
    }

    if (interviewDate) {
      const days = Math.floor((interviewDate - applied) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 90) {
        timingData.timeToInterview.push(days);
        timingData.applicationToInterview.push(days);
      }
    }

    // Time to offer
    let offerDate = null;
    if (offerEvent && offerEvent.timestamp) {
      offerDate = new Date(offerEvent.timestamp);
    } else if (job.status === 'Offer' && statusUpdated) {
      offerDate = statusUpdated;
    }

    if (offerDate) {
      const days = Math.floor((offerDate - applied) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 90) {
        timingData.timeToOffer.push(days);
      }

      // Time from interview to offer
      if (interviewDate && offerDate) {
        const offerDays = Math.floor((offerDate - interviewDate) / (1000 * 60 * 60 * 24));
        if (offerDays >= 0 && offerDays <= 90) {
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
function analyzeStrategyEffectiveness(jobs, networkingActivities, mockInterviews = [], techPrepSessions = []) {
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
    preparation: {
      comprehensive: { success: 0, total: 0 }, // Mock + Tech Prep + Networking
      moderate: { success: 0, total: 0 }, // 1-2 prep activities
      minimal: { success: 0, total: 0 }, // No prep
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

    // Check for mock interviews and tech prep
    const hasMockInterview = mockInterviews.some(mock => {
      const mockDate = new Date(mock.created_at);
      const daysDiff = Math.abs((jobDate - mockDate) / (1000 * 60 * 60 * 24));
      return (mock.company && job.company && mock.company.toLowerCase() === job.company.toLowerCase()) ||
             daysDiff <= 30;
    });

    const hasTechPrep = techPrepSessions.some(tech => {
      const techDate = new Date(tech.created_at);
      const daysDiff = Math.abs((jobDate - techDate) / (1000 * 60 * 60 * 24));
      return (tech.company && job.company && tech.company.toLowerCase() === job.company.toLowerCase()) ||
             daysDiff <= 30;
    });

    // Preparation strategy
    const prepCount = [recentNetworking.length > 0, hasMockInterview, hasTechPrep].filter(Boolean).length;
    if (prepCount >= 2) {
      strategies.preparation.comprehensive.total++;
      if (isSuccess) strategies.preparation.comprehensive.success++;
    } else if (prepCount >= 1) {
      strategies.preparation.moderate.total++;
      if (isSuccess) strategies.preparation.moderate.success++;
    } else {
      strategies.preparation.minimal.total++;
      if (isSuccess) strategies.preparation.minimal.success++;
    }

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
    customization: Object.entries(strategies.customization)
      .filter(([_, data]) => data.total > 0)
      .map(([level, data]) => ({
        level,
        successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
        success: data.success,
        total: data.total,
      }))
      .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate)),
    networking: Object.entries(strategies.networking)
      .filter(([_, data]) => data.total > 0)
      .map(([type, data]) => ({
        type,
        successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
        success: data.success,
        total: data.total,
      })),
    preparation: Object.entries(strategies.preparation)
      .filter(([_, data]) => data.total > 0)
      .map(([level, data]) => ({
        level,
        successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0,
        success: data.success,
        total: data.total,
      }))
      .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate)),
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

  // Only analyze actual applications (exclude 'Interested')
  const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');

  // Find industries with highest success
  const industrySuccess = {};
  actualApplications.forEach(job => {
    if (!job.industry || job.industry.trim() === '') return;
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
  actualApplications.forEach(job => {
    if (!job.company || job.company.trim() === '') return;
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

  // Customization preference (from actual applications)
  const customCounts = { none: 0, light: 0, heavy: 0, tailored: 0 };
  actualApplications.forEach(job => {
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
function generatePredictiveModel(jobs, patterns, timing, preparationCorrelation, strategyEffectiveness) {
  // Enhanced predictive model based on historical patterns
  const model = {
    successProbability: {},
    factors: [],
  };

  // Calculate base success rate (only actual applications)
  const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
  const totalJobs = actualApplications.length;
  const successfulJobs = actualApplications.filter(j => j.status === 'Offer' || j.status === 'Interview').length;
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

  // Networking factor (from strategy effectiveness)
  if (strategyEffectiveness && strategyEffectiveness.networking && strategyEffectiveness.networking.length > 0) {
    const activeNetworking = strategyEffectiveness.networking.find(s => s.type === 'active');
    if (activeNetworking && parseFloat(activeNetworking.successRate) > baseSuccessRate) {
      const boost = parseFloat(activeNetworking.successRate) - baseSuccessRate;
      factors.push({
        factor: 'Active networking before application',
        impact: `+${boost.toFixed(1)}%`,
        confidence: 'high',
      });
    }
  }

  // Preparation factor (from preparation correlation)
  if (preparationCorrelation && preparationCorrelation.bestStrategy && preparationCorrelation.bestStrategy.total > 0) {
    const bestRate = parseFloat(preparationCorrelation.bestStrategy.successRate);
    if (bestRate > baseSuccessRate) {
      const boost = bestRate - baseSuccessRate;
      factors.push({
        factor: `Using ${preparationCorrelation.bestStrategy.type} preparation strategy`,
        impact: `+${boost.toFixed(1)}%`,
        confidence: 'high',
      });
    }
  }

  // Customization factor (from strategy effectiveness)
  if (strategyEffectiveness && strategyEffectiveness.customization && strategyEffectiveness.customization.length > 0) {
    const bestCustom = strategyEffectiveness.customization[0];
    if (bestCustom.level !== 'none' && parseFloat(bestCustom.successRate) > baseSuccessRate) {
      const boost = parseFloat(bestCustom.successRate) - baseSuccessRate;
      factors.push({
        factor: `${bestCustom.level.charAt(0).toUpperCase() + bestCustom.level.slice(1)} resume/cover letter customization`,
        impact: `+${boost.toFixed(1)}%`,
        confidence: 'medium',
      });
    }
  }

  // Calculate optimized success rate
  let optimizedRate = baseSuccessRate;
  factors.forEach(factor => {
    const boost = parseFloat(factor.impact.replace('+', '').replace('%', ''));
    if (!isNaN(boost)) {
      optimizedRate += boost * 0.3; // Apply 30% of boost (conservative estimate)
    }
  });
  optimizedRate = Math.min(100, optimizedRate); // Cap at 100%

  model.factors = factors;
  model.baseSuccessRate = baseSuccessRate.toFixed(1);
  model.optimizedSuccessRate = optimizedRate.toFixed(1);

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
  // Group jobs by time periods (months for better granularity)
  const periods = {};
  
  // Only track actual applications
  const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
  
  actualApplications.forEach(job => {
    const date = new Date(job.applied_on || job.created_at);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    
    if (!periods[key]) {
      periods[key] = { total: 0, success: 0, offers: 0, interviews: 0 };
    }
    
    periods[key].total++;
    if (job.status === 'Interview' || job.status === 'Offer') {
      periods[key].success++;
      periods[key].interviews++;
    }
    if (job.status === 'Offer') {
      periods[key].offers++;
    }
  });

  const evolution = Object.entries(periods)
    .map(([period, data]) => ({
      period,
      successRate: data.total > 0 ? parseFloat((data.success / data.total * 100).toFixed(1)) : 0,
      offerRate: data.total > 0 ? parseFloat((data.offers / data.total * 100).toFixed(1)) : 0,
      interviewRate: data.total > 0 ? parseFloat((data.interviews / data.total * 100).toFixed(1)) : 0,
      total: data.total,
      success: data.success,
      offers: data.offers,
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
  const userId = req.user.id;

  try {
    // 1️⃣ Fetch Jobs (exclude archived)
    const jobsRes = await pool.query(
      `SELECT id, title, company, location, industry, status, applied_on, created_at, 
              status_updated_at, resume_customization, cover_letter_customization, 
              application_history
       FROM jobs 
       WHERE user_id = $1
         AND ("isarchived" = false OR "isarchived" IS NULL)
       ORDER BY created_at DESC`,
      [userId]
    );
    const jobs = jobsRes.rows || [];
    
    // Debug: Check industry data
    const jobsWithIndustry = jobs.filter(j => j.industry && j.industry.trim() !== '');
    console.log(`📊 Success Patterns Debug - Jobs with industry: ${jobsWithIndustry.length} of ${jobs.length}`);
    if (jobsWithIndustry.length > 0) {
      const industries = [...new Set(jobsWithIndustry.map(j => j.industry))];
      console.log(`📊 Industries found: ${industries.join(', ')}`);
    }

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
      // Get unique companies from user's job applications and match with company_research
      const userCompanies = [...new Set(jobs.map(j => j.company).filter(Boolean))];
      if (userCompanies.length > 0) {
        const placeholders = userCompanies.map((_, i) => `$${i + 1}`).join(', ');
        const researchRes = await pool.query(
          `SELECT company, created_at
           FROM company_research
           WHERE company = ANY(ARRAY[${placeholders}])
           ORDER BY created_at DESC`,
          userCompanies
        );
        researchHistory = researchRes.rows || [];
      }
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

    // 6️⃣ Fetch Application History (for detailed timing analysis)
    let applicationHistory = [];
    try {
      const historyRes = await pool.query(
        `SELECT job_id, event, timestamp, from_status, to_status
         FROM application_history
         WHERE user_id = $1
         ORDER BY timestamp DESC`,
        [userId]
      );
      applicationHistory = historyRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch application history:", e.message);
    }

    // 7️⃣ Fetch Interview Outcomes (for detailed interview analysis)
    let interviewOutcomes = [];
    try {
      const interviewRes = await pool.query(
        `SELECT io.job_id, io.company, io.interview_date, io.outcome, io.interview_type,
                io.difficulty_rating, io.self_rating, io.hours_prepared, io.mock_interviews_completed
         FROM interview_outcomes io
         INNER JOIN jobs j ON io.job_id = j.id
         WHERE io.user_id = $1
           AND j.user_id = $1
           AND (j."isarchived" = false OR j."isarchived" IS NULL)`,
        [userId]
      );
      interviewOutcomes = interviewRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch interview outcomes:", e.message);
    }

    // 8️⃣ Fetch Mock Interview Sessions (for preparation correlation)
    let mockInterviews = [];
    try {
      const mockRes = await pool.query(
        `SELECT id, company, role, status, created_at, completed_at, overall_performance_score
         FROM mock_interview_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      mockInterviews = mockRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch mock interviews:", e.message);
    }

    // 9️⃣ Fetch Technical Prep Sessions (for preparation correlation)
    let techPrepSessions = [];
    try {
      const techRes = await pool.query(
        `SELECT id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at
         FROM technical_prep_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      techPrepSessions = techRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch technical prep sessions:", e.message);
    }

    // 🔟 Fetch Interview Preparation (for preparation correlation)
    let interviewPrep = [];
    try {
      const prepRes = await pool.query(
        `SELECT interview_id, framework_type, company_research, role_research, created_at
         FROM interview_preparation
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      interviewPrep = prepRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch interview preparation:", e.message);
    }

    // ------------------------------
    // ANALYTICS (UC-105)
    // ------------------------------

    // Application Patterns
    const applicationPatterns = analyzeApplicationPatterns(jobs);

    // Preparation Correlation (enhanced with all preparation activities)
    const preparationCorrelation = analyzePreparationCorrelation(
      jobs, 
      networkingActivities, 
      researchHistory,
      mockInterviews,
      techPrepSessions,
      interviewPrep
    );

    // Timing Patterns (enhanced with application_history and interview_outcomes)
    const timingPatterns = analyzeTimingPatterns(jobs, applicationHistory, interviewOutcomes);

    // Strategy Effectiveness (enhanced with preparation activities)
    const strategyEffectiveness = analyzeStrategyEffectiveness(
      jobs, 
      networkingActivities,
      mockInterviews,
      techPrepSessions
    );

    // Success Factors
    const successFactors = identifySuccessFactors(jobs, skills, employment);

    // Predictive Model (enhanced with preparation and strategy data)
    const predictiveModel = generatePredictiveModel(
      jobs, 
      applicationPatterns, 
      timingPatterns,
      preparationCorrelation,
      strategyEffectiveness
    );

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
    // Only count actual applications (exclude 'Interested')
    const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
    const totalJobs = actualApplications.length;
    const successfulJobs = actualApplications.filter(j => j.status === 'Offer' || j.status === 'Interview').length;
    const offers = actualApplications.filter(j => j.status === 'Offer').length;
    
    // Debug logging
    const successRate = totalJobs > 0 ? ((successfulJobs / totalJobs * 100).toFixed(1)) : '0';
    console.log(`📊 Success Patterns for user ${userId}:`);
    console.log(`  - Total Applications: ${totalJobs} (excluding 'Interested' status)`);
    console.log(`  - Successful: ${successfulJobs} (${successRate}%)`);
    console.log(`  - Offers: ${offers}`);
    console.log(`  - Industry Patterns: ${applicationPatterns.industrySuccessRates?.length || 0} industries`);
    if (applicationPatterns.industrySuccessRates && applicationPatterns.industrySuccessRates.length > 0) {
      console.log(`  - Top Industries:`, applicationPatterns.industrySuccessRates.slice(0, 3).map(i => `${i.industry} (${i.successRate}%)`).join(', '));
    }
    console.log(`  - Preparation Strategies: ${preparationCorrelation.preparationData?.length || 0} strategies`);
    if (preparationCorrelation.preparationData && preparationCorrelation.preparationData.length > 0) {
      console.log(`  - Best Strategy: ${preparationCorrelation.bestStrategy?.type} (${preparationCorrelation.bestStrategy?.successRate}%)`);
    }
    console.log(`  - Pattern Evolution: ${patternEvolution.evolution?.length || 0} time periods`);
    console.log(`  - Strategy Effectiveness:`, {
      customization: strategyEffectiveness.customization?.length || 0,
      networking: strategyEffectiveness.networking?.length || 0,
      preparation: strategyEffectiveness.preparation?.length || 0,
    });

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

