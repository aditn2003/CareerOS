// backend/routes/competitiveAnalysis.js
// UC-104: Competitive Analysis and Benchmarking

import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";

const router = express.Router();

// ------------------------------
// INDUSTRY BENCHMARKS (Realistic Standards)
// ------------------------------
const BENCHMARKS = {
  applicationVolume: {
    low: 10,
    average: 30,
    high: 60,
    topPerformer: 100,
  },
  successRates: {
    interviewRate: { average: 15, topPerformer: 30 },
    offerRate: { average: 3, topPerformer: 10 },
    responseRate: { average: 20, topPerformer: 40 },
  },
  skills: {
    technical: { average: 5, topPerformer: 12 },
    soft: { average: 3, topPerformer: 6 },
    certifications: { average: 2, topPerformer: 5 },
  },
  experience: {
    years: { entry: 0, mid: 3, senior: 7, expert: 12 },
    companies: { average: 2, topPerformer: 4 },
  },
  education: {
    hasDegree: 0.85, // 85% have degree
    hasAdvanced: 0.25, // 25% have advanced
  },
  networking: {
    contacts: { average: 20, topPerformer: 50 },
    activities: { average: 10, topPerformer: 30 },
  },
  customization: {
    resumeCustomization: { average: 0.3, topPerformer: 0.8 },
    coverLetterCustomization: { average: 0.2, topPerformer: 0.7 },
  },
};

// ------------------------------
// HELPER: Calculate Performance Metrics
// ------------------------------
function calculatePerformanceMetrics(jobs, interviewOutcomes = []) {
  // Count actual applications (exclude 'Interested' status)
  const applied = jobs.filter(j => j.status && j.status !== 'Interested');
  const totalApplications = applied.length;
  
  // Count interviews from job status
  const interviewsFromJobs = jobs.filter(j => j.status === 'Interview' || j.status === 'Offer').length;
  
  // Also count unique interviews from interview_outcomes
  const uniqueInterviewJobs = new Set([
    ...jobs.filter(j => j.status === 'Interview' || j.status === 'Offer').map(j => j.id),
    ...interviewOutcomes.map(i => i.job_id).filter(Boolean)
  ]);
  const totalInterviews = uniqueInterviewJobs.size || interviewsFromJobs;
  
  const offers = jobs.filter(j => j.status === 'Offer').length;
  const rejections = jobs.filter(j => j.status === 'Rejected').length;

  return {
    totalApplications: totalApplications,
    interviewRate: totalApplications > 0 ? (totalInterviews / totalApplications * 100) : 0,
    offerRate: totalInterviews > 0 ? (offers / totalInterviews * 100) : 0,
    responseRate: totalApplications > 0 ? ((totalInterviews + offers) / totalApplications * 100) : 0,
    rejectionRate: totalApplications > 0 ? (rejections / totalApplications * 100) : 0,
    appliedCount: totalApplications,
  };
}

// ------------------------------
// HELPER: Analyze Skills Profile
// ------------------------------
function analyzeSkillsProfile(userSkills, jobs) {
  const technical = userSkills.filter(s => s.category === 'Technical' || s.category === 'Languages');
  const soft = userSkills.filter(s => s.category === 'Soft Skills');
  const industry = userSkills.filter(s => s.category === 'Industry-Specific');

  // Skill proficiency distribution
  const proficiencyCounts = {
    Expert: userSkills.filter(s => s.proficiency === 'Expert').length,
    Advanced: userSkills.filter(s => s.proficiency === 'Advanced').length,
    Intermediate: userSkills.filter(s => s.proficiency === 'Intermediate').length,
    Beginner: userSkills.filter(s => s.proficiency === 'Beginner').length,
  };

  // Top skills by category
  const topTechnical = technical.slice(0, 5).map(s => s.name);
  const topSoft = soft.slice(0, 3).map(s => s.name);

  // Skill depth (average proficiency level)
  const proficiencyValues = { Expert: 4, Advanced: 3, Intermediate: 2, Beginner: 1 };
  const avgProficiency = userSkills.length > 0
    ? userSkills.reduce((sum, s) => sum + (proficiencyValues[s.proficiency] || 1), 0) / userSkills.length
    : 0;

  return {
    total: userSkills.length,
    technical: technical.length,
    soft: soft.length,
    industry: industry.length,
    proficiencyCounts,
    topTechnical,
    topSoft,
    avgProficiency,
    skillDepth: avgProficiency >= 3 ? 'Deep' : avgProficiency >= 2 ? 'Moderate' : 'Broad',
  };
}

// ------------------------------
// HELPER: Analyze Experience Profile
// ------------------------------
function analyzeExperienceProfile(employment, education) {
  let totalYears = 0;
  let companies = new Set();
  let currentRole = null;
  let highestLevel = 'Entry';

  employment.forEach(emp => {
    if (emp.company) companies.add(emp.company);
    
    const start = new Date(emp.start_date);
    const end = emp.end_date ? new Date(emp.end_date) : new Date();
    const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
    totalYears += years;

    if (emp.current) {
      currentRole = emp.title;
    }

    // Determine level from title
    const title = (emp.title || '').toLowerCase();
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
      highestLevel = 'Senior';
    } else if (title.includes('junior') || title.includes('entry') || title.includes('associate')) {
      if (highestLevel === 'Entry') highestLevel = 'Entry';
    } else if (totalYears >= 3) {
      highestLevel = 'Mid-Level';
    }
  });

  // Education level
  const hasDegree = education.some(e => e.degree_type && e.degree_type !== '');
  const hasAdvanced = education.some(e => 
    e.degree_type && (e.degree_type.toLowerCase().includes('master') || 
                      e.degree_type.toLowerCase().includes('phd') ||
                      e.degree_type.toLowerCase().includes('doctorate'))
  );

  return {
    totalYears: Math.round(totalYears * 10) / 10,
    companies: companies.size,
    currentRole,
    highestLevel,
    hasDegree,
    hasAdvanced,
    educationLevel: hasAdvanced ? 'Advanced' : hasDegree ? 'Bachelor' : 'Other',
  };
}

// ------------------------------
// HELPER: Calculate Percentile from Distribution
// ------------------------------
function calculatePercentileFromDistribution(value, distribution) {
  if (!distribution || distribution.length === 0) return 50;
  
  // Sort distribution
  const sorted = [...distribution].sort((a, b) => a - b);
  
  // Count how many values are below the user's value
  const belowCount = sorted.filter(v => v < value).length;
  const equalCount = sorted.filter(v => v === value).length;
  
  // Calculate percentile: (below + 0.5 * equal) / total * 100
  const percentile = ((belowCount + 0.5 * equalCount) / sorted.length) * 100;
  
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

// ------------------------------
// HELPER: Calculate Statistics from Distribution
// ------------------------------
function calculateStats(distribution) {
  if (!distribution || distribution.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, p75: 0, p90: 0 };
  }
  
  const sorted = [...distribution].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.90)],
  };
}

// ------------------------------
// HELPER: Compare Against All Users
// ------------------------------
function compareAgainstAllUsers(userMetrics, skillsProfile, experienceProfile, networkingData, allUsersMetrics) {
  // Extract distributions for each metric
  const applicationVolumes = allUsersMetrics.map(m => m.totalApplications).filter(v => v > 0);
  const interviewRates = allUsersMetrics.map(m => m.interviewRate).filter(v => v >= 0);
  const offerRates = allUsersMetrics.map(m => m.offerRate).filter(v => v >= 0);
  const technicalSkills = allUsersMetrics.map(m => m.technicalSkills).filter(v => v >= 0);
  const softSkills = allUsersMetrics.map(m => m.softSkills).filter(v => v >= 0);
  const certifications = allUsersMetrics.map(m => m.certifications).filter(v => v >= 0);
  const experienceYears = allUsersMetrics.map(m => m.experienceYears).filter(v => v >= 0);
  const networkingContacts = allUsersMetrics.map(m => m.networkingContacts).filter(v => v >= 0);
  
  // Calculate statistics for each metric
  const appVolStats = calculateStats(applicationVolumes);
  const interviewStats = calculateStats(interviewRates);
  const offerStats = calculateStats(offerRates);
  const techSkillsStats = calculateStats(technicalSkills);
  const softSkillsStats = calculateStats(softSkills);
  const certStats = calculateStats(certifications);
  const expStats = calculateStats(experienceYears);
  const networkStats = calculateStats(networkingContacts);
  
  const comparisons = {
    applicationVolume: {
      user: userMetrics.totalApplications,
      benchmark: appVolStats.average,
      topPerformer: appVolStats.p90,
      percentile: calculatePercentileFromDistribution(userMetrics.totalApplications, applicationVolumes),
    },
    interviewRate: {
      user: userMetrics.interviewRate,
      benchmark: interviewStats.average,
      topPerformer: interviewStats.p90,
      percentile: calculatePercentileFromDistribution(userMetrics.interviewRate, interviewRates),
    },
    offerRate: {
      user: userMetrics.offerRate,
      benchmark: offerStats.average,
      topPerformer: offerStats.p90,
      percentile: calculatePercentileFromDistribution(userMetrics.offerRate, offerRates),
    },
    technicalSkills: {
      user: skillsProfile.technical,
      benchmark: techSkillsStats.average,
      topPerformer: techSkillsStats.p90,
      percentile: calculatePercentileFromDistribution(skillsProfile.technical, technicalSkills),
    },
    softSkills: {
      user: skillsProfile.soft,
      benchmark: softSkillsStats.average,
      topPerformer: softSkillsStats.p90,
      percentile: calculatePercentileFromDistribution(skillsProfile.soft, softSkills),
    },
    certifications: {
      user: skillsProfile.certifications || 0,
      benchmark: certStats.average,
      topPerformer: certStats.p90,
      percentile: calculatePercentileFromDistribution(skillsProfile.certifications || 0, certifications),
    },
    experience: {
      user: experienceProfile.totalYears,
      benchmark: expStats.average,
      topPerformer: expStats.p90,
      percentile: calculatePercentileFromDistribution(experienceProfile.totalYears, experienceYears),
    },
    networking: {
      user: networkingData.contacts || 0,
      benchmark: networkStats.average,
      topPerformer: networkStats.p90,
      percentile: calculatePercentileFromDistribution(networkingData.contacts || 0, networkingContacts),
    },
  };

  return comparisons;
}

// ------------------------------
// HELPER: Identify Skill Gaps
// ------------------------------
function identifySkillGaps(userSkills, jobs) {
  // Common in-demand skills by industry
  const inDemandSkills = {
    'Technology': ['Python', 'JavaScript', 'Cloud Computing', 'DevOps', 'Machine Learning', 'React', 'Node.js'],
    'Finance': ['SQL', 'Excel', 'Financial Analysis', 'Risk Management', 'Data Analysis'],
    'Healthcare': ['HIPAA', 'Electronic Health Records', 'Healthcare IT', 'Data Privacy'],
    'General': ['Project Management', 'Agile', 'Communication', 'Leadership', 'Data Analysis'],
  };

  // Extract industries from jobs
  const userIndustries = [...new Set(jobs.map(j => j.industry).filter(Boolean))];
  const relevantSkills = new Set();
  
  userIndustries.forEach(industry => {
    const skills = inDemandSkills[industry] || inDemandSkills['General'];
    skills.forEach(s => relevantSkills.add(s));
  });

  // Find missing skills
  const userSkillNames = new Set(userSkills.map(s => s.name.toLowerCase()));
  const missingSkills = Array.from(relevantSkills).filter(skill => {
    const skillLower = skill.toLowerCase();
    return !Array.from(userSkillNames).some(us => us.includes(skillLower) || skillLower.includes(us));
  });

  // Prioritize missing skills
  const prioritizedGaps = missingSkills.slice(0, 8).map(skill => ({
    skill,
    priority: 'high',
    impact: 'Significantly improves market competitiveness',
    category: 'Technical',
  }));

  return prioritizedGaps;
}

// ------------------------------
// HELPER: Generate Competitive Recommendations
// ------------------------------
function generateCompetitiveRecommendations(comparisons, skillGaps, userMetrics, experienceProfile) {
  const recommendations = [];

  // Application volume
  if (comparisons.applicationVolume.user < comparisons.applicationVolume.benchmark) {
    recommendations.push({
      type: 'volume',
      title: 'Increase Application Volume',
      message: `You've applied to ${comparisons.applicationVolume.user} jobs. The average user applies to ${comparisons.applicationVolume.benchmark.toFixed(0)} jobs, and top performers apply to ${comparisons.applicationVolume.topPerformer.toFixed(0)}+ jobs. Increase volume while maintaining quality.`,
      priority: 'high',
      impact: 'high',
      icon: '📈',
    });
  }

  // Interview rate
  if (comparisons.interviewRate.user < comparisons.interviewRate.benchmark) {
    recommendations.push({
      type: 'conversion',
      title: 'Improve Interview Conversion',
      message: `Your interview rate is ${comparisons.interviewRate.user.toFixed(1)}% vs ${comparisons.interviewRate.benchmark}% average. Focus on tailoring applications and highlighting quantifiable achievements.`,
      priority: 'high',
      impact: 'high',
      icon: '🎯',
    });
  } else if (comparisons.interviewRate.user >= comparisons.interviewRate.topPerformer) {
    recommendations.push({
      type: 'strength',
      title: 'Excellent Interview Rate',
      message: `Your interview rate of ${comparisons.interviewRate.user.toFixed(1)}% exceeds top performers! This is a key competitive advantage.`,
      priority: 'low',
      impact: 'positive',
      icon: '✅',
    });
  }

  // Skills gap
  if (skillGaps.length > 0) {
    recommendations.push({
      type: 'skills',
      title: 'Address Skill Gaps',
      message: `Consider acquiring: ${skillGaps.slice(0, 3).map(s => s.skill).join(', ')}. These skills are in high demand in your target industries.`,
      priority: 'high',
      impact: 'high',
      icon: '🧠',
    });
  }

  // Technical skills depth
  if (comparisons.technicalSkills.user < comparisons.technicalSkills.benchmark) {
    recommendations.push({
      type: 'skills',
      title: 'Expand Technical Skills',
      message: `You have ${comparisons.technicalSkills.user} technical skills. The average user has ${comparisons.technicalSkills.benchmark.toFixed(0)}, and top performers have ${comparisons.technicalSkills.topPerformer.toFixed(0)}. Consider learning new technologies relevant to your field.`,
      priority: 'medium',
      impact: 'medium',
      icon: '💻',
    });
  }

  // Networking
  if (comparisons.networking.user < comparisons.networking.benchmark) {
    recommendations.push({
      type: 'networking',
      title: 'Build Professional Network',
      message: `You have ${comparisons.networking.user} contacts. The average user has ${comparisons.networking.benchmark.toFixed(0)}, and top performers maintain ${comparisons.networking.topPerformer.toFixed(0)}+ connections. Networking can increase offer rates by 40%.`,
      priority: 'medium',
      impact: 'high',
      icon: '🤝',
    });
  }

  // Experience positioning
  if (experienceProfile.totalYears >= 3 && experienceProfile.companies < 2) {
    recommendations.push({
      type: 'experience',
      title: 'Diversify Experience',
      message: `Consider roles at different companies to gain diverse perspectives. Top performers work at ${comparisons.experience.topPerformer.toFixed(0)}+ companies.`,
      priority: 'low',
      impact: 'medium',
      icon: '🏢',
    });
  }

  // Education
  if (!experienceProfile.hasDegree && experienceProfile.totalYears < 5) {
    recommendations.push({
      type: 'education',
      title: 'Consider Education Enhancement',
      message: '85% of professionals have a degree. Consider pursuing relevant education or certifications to improve competitiveness.',
      priority: 'medium',
      impact: 'medium',
      icon: '🎓',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ------------------------------
// HELPER: Generate Differentiation Strategies
// ------------------------------
function generateDifferentiationStrategies(skillsProfile, experienceProfile, userMetrics, jobs, comparisons) {
  const strategies = [];

  // Unique skill combinations
  if (skillsProfile.technical > 0 && skillsProfile.soft > 0) {
    strategies.push({
      type: 'skill-combination',
      title: 'Technical + Soft Skills',
      description: 'Your combination of technical and soft skills is valuable. Highlight this in applications.',
      actionable: 'Emphasize projects that demonstrate both technical expertise and communication/leadership.',
    });
  }

  // High interview rate
  if (comparisons && userMetrics.interviewRate > comparisons.interviewRate.benchmark) {
    strategies.push({
      type: 'strength',
      title: 'Strong Application Quality',
      description: `Your interview rate of ${userMetrics.interviewRate.toFixed(1)}% is above the average of ${comparisons.interviewRate.benchmark.toFixed(1)}%. This is a key differentiator.`,
      actionable: 'Continue maintaining high-quality, tailored applications. Consider mentoring others.',
    });
  }

  // Industry focus
  const industries = [...new Set(jobs.map(j => j.industry).filter(Boolean))];
  if (industries.length === 1) {
    strategies.push({
      type: 'focus',
      title: 'Industry Specialization',
      description: `Your focus on ${industries[0]} demonstrates specialization. This can be a competitive advantage.`,
      actionable: 'Position yourself as a specialist. Highlight deep industry knowledge in applications.',
    });
  }

  // Experience depth
  if (experienceProfile.totalYears >= 7) {
    strategies.push({
      type: 'experience',
      title: 'Senior Experience',
      description: 'Your years of experience position you as a senior professional.',
      actionable: 'Emphasize leadership, mentorship, and strategic impact in your applications.',
    });
  }

  // Certifications (if any)
  if (skillsProfile.total > 10) {
    strategies.push({
      type: 'skills',
      title: 'Broad Skill Set',
      description: 'Your diverse skill set allows you to adapt to various roles.',
      actionable: 'Position yourself as versatile. Highlight cross-functional experience.',
    });
  }

  return strategies;
}

// ------------------------------
// HELPER: Calculate Market Position
// ------------------------------
function calculateMarketPosition(comparisons) {
  // Weighted average of all percentiles
  const weights = {
    interviewRate: 0.3,
    offerRate: 0.25,
    technicalSkills: 0.15,
    applicationVolume: 0.1,
    networking: 0.1,
    experience: 0.1,
  };

  const weightedScore = 
    comparisons.interviewRate.percentile * weights.interviewRate +
    comparisons.offerRate.percentile * weights.offerRate +
    comparisons.technicalSkills.percentile * weights.technicalSkills +
    comparisons.applicationVolume.percentile * weights.applicationVolume +
    comparisons.networking.percentile * weights.networking +
    comparisons.experience.percentile * weights.experience;

  let position = 'Average';
  if (weightedScore >= 75) position = 'Top Performer';
  else if (weightedScore >= 50) position = 'Above Average';
  else if (weightedScore >= 25) position = 'Average';
  else position = 'Below Average';

  return {
    score: Math.round(weightedScore),
    position,
    percentile: Math.round(weightedScore),
  };
}

// ------------------------------
// GET /api/competitive-analysis
// ------------------------------
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1️⃣ Fetch Jobs (exclude archived jobs)
    const jobsRes = await pool.query(
      `SELECT id, title, company, industry, status, applied_on, created_at
       FROM jobs 
       WHERE user_id = $1
         AND ("isarchived" = false OR "isarchived" IS NULL)`,
      [userId]
    );
    const jobs = jobsRes.rows || [];

    // 2️⃣ Fetch Skills
    let userSkills = [];
    try {
      const skillsRes = await pool.query(
        `SELECT name, category, proficiency FROM skills WHERE user_id = $1`,
        [userId]
      );
      userSkills = skillsRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch skills:", e.message);
    }

    // 3️⃣ Fetch Employment
    let employment = [];
    try {
      const empRes = await pool.query(
        `SELECT title, company, start_date, end_date, current FROM employment WHERE user_id = $1`,
        [userId]
      );
      employment = empRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch employment:", e.message);
    }

    // 4️⃣ Fetch Education
    let education = [];
    try {
      const eduRes = await pool.query(
        `SELECT degree_type, field_of_study FROM education WHERE user_id = $1`,
        [userId]
      );
      education = eduRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch education:", e.message);
    }

    // 5️⃣ Fetch Certifications
    let certifications = [];
    try {
      const certRes = await pool.query(
        `SELECT name, organization FROM certifications WHERE user_id = $1`,
        [userId]
      );
      certifications = certRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch certifications:", e.message);
    }

    // 6️⃣ Fetch Networking Data
    let networkingData = { contacts: 0, activities: 0 };
    try {
      const contactsRes = await pool.query(
        `SELECT COUNT(*) as count FROM networking_contacts WHERE user_id = $1`,
        [userId]
      );
      const activitiesRes = await pool.query(
        `SELECT COUNT(*) as count FROM networking_activities WHERE user_id = $1`,
        [userId]
      );
      networkingData.contacts = parseInt(contactsRes.rows[0]?.count || 0);
      networkingData.activities = parseInt(activitiesRes.rows[0]?.count || 0);
    } catch (e) {
      console.warn("⚠️ Could not fetch networking data:", e.message);
    }

    // 7️⃣ Fetch Interview Outcomes (for accurate interview tracking)
    let interviewOutcomes = [];
    try {
      const interviewRes = await pool.query(
        `SELECT io.job_id, io.company, io.interview_date, io.outcome
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

    // ------------------------------
    // FETCH ALL USERS' DATA FOR COMPARISON
    // ------------------------------
    console.log("📊 Fetching all users' data for competitive comparison...");
    
    // Fetch all users' jobs
    const allJobsRes = await pool.query(
      `SELECT user_id, id, title, company, industry, status, applied_on, created_at
       FROM jobs 
       WHERE ("isarchived" = false OR "isarchived" IS NULL)`
    );
    const allJobs = allJobsRes.rows || [];
    
    // Fetch all users' skills
    const allSkillsRes = await pool.query(
      `SELECT user_id, name, category, proficiency FROM skills`
    );
    const allSkills = allSkillsRes.rows || [];
    
    // Fetch all users' employment
    const allEmploymentRes = await pool.query(
      `SELECT user_id, title, company, start_date, end_date, current FROM employment`
    );
    const allEmployment = allEmploymentRes.rows || [];
    
    // Fetch all users' education
    const allEducationRes = await pool.query(
      `SELECT user_id, degree_type, field_of_study FROM education`
    );
    const allEducation = allEducationRes.rows || [];
    
    // Fetch all users' certifications
    const allCertificationsRes = await pool.query(
      `SELECT user_id FROM certifications`
    );
    const allCertifications = allCertificationsRes.rows || [];
    
    // Fetch all users' networking contacts
    const allNetworkingRes = await pool.query(
      `SELECT user_id, COUNT(*) as count FROM networking_contacts GROUP BY user_id`
    );
    const networkingMap = {};
    allNetworkingRes.rows.forEach(row => {
      networkingMap[row.user_id] = parseInt(row.count || 0);
    });
    
    // Fetch all users' interview outcomes
    const allInterviewOutcomesRes = await pool.query(
      `SELECT io.user_id, io.job_id, j.user_id as job_user_id
       FROM interview_outcomes io
       INNER JOIN jobs j ON io.job_id = j.id
       WHERE (j."isarchived" = false OR j."isarchived" IS NULL)`
    );
    const allInterviewOutcomes = allInterviewOutcomesRes.rows || [];
    
    // Group data by user_id
    const usersData = {};
    const allUserIds = new Set([
      ...allJobs.map(j => j.user_id),
      ...allSkills.map(s => s.user_id),
      ...allEmployment.map(e => e.user_id),
      ...allEducation.map(e => e.user_id),
      ...allCertifications.map(c => c.user_id),
      ...Object.keys(networkingMap).map(Number),
    ]);
    
    // Calculate metrics for each user
    allUserIds.forEach(uid => {
      const userJobs = allJobs.filter(j => j.user_id === uid);
      const userSkills = allSkills.filter(s => s.user_id === uid);
      const userEmployment = allEmployment.filter(e => e.user_id === uid);
      const userEducation = allEducation.filter(e => e.user_id === uid);
      const userCerts = allCertifications.filter(c => c.user_id === uid);
      const userInterviewOutcomes = allInterviewOutcomes.filter(io => io.user_id === uid && io.job_user_id === uid);
      
      const userMetrics = calculatePerformanceMetrics(userJobs, userInterviewOutcomes);
      const userSkillsProfile = analyzeSkillsProfile(userSkills, userJobs);
      const userExpProfile = analyzeExperienceProfile(userEmployment, userEducation);
      
      usersData[uid] = {
        totalApplications: userMetrics.totalApplications,
        interviewRate: userMetrics.interviewRate,
        offerRate: userMetrics.offerRate,
        technicalSkills: userSkillsProfile.technical,
        softSkills: userSkillsProfile.soft,
        certifications: userCerts.length,
        experienceYears: userExpProfile.totalYears,
        networkingContacts: networkingMap[uid] || 0,
      };
    });
    
    const allUsersMetrics = Object.values(usersData);
    console.log(`📊 Calculated metrics for ${allUsersMetrics.length} users`);

    // ------------------------------
    // ANALYTICS (UC-104)
    // ------------------------------

    // Calculate Performance Metrics for current user
    const userMetrics = calculatePerformanceMetrics(jobs, interviewOutcomes);

    // Analyze Skills Profile
    const skillsProfile = analyzeSkillsProfile(userSkills, jobs);
    skillsProfile.certifications = certifications.length;

    // Analyze Experience Profile
    const experienceProfile = analyzeExperienceProfile(employment, education);

    // Compare Against All Users in Database
    const comparisons = compareAgainstAllUsers(
      userMetrics,
      skillsProfile,
      experienceProfile,
      networkingData,
      allUsersMetrics
    );

    // Identify Skill Gaps
    const skillGaps = identifySkillGaps(userSkills, jobs);

    // Calculate Market Position
    const marketPosition = calculateMarketPosition(comparisons);

    // Generate Recommendations
    const recommendations = generateCompetitiveRecommendations(
      comparisons,
      skillGaps,
      userMetrics,
      experienceProfile
    );

    // Generate Differentiation Strategies
    const differentiationStrategies = generateDifferentiationStrategies(
      skillsProfile,
      experienceProfile,
      userMetrics,
      jobs,
      comparisons
    );

    // ------------------------------
    // BENCHMARK DATA FOR CHARTS (using real user data)
    // ------------------------------
    const benchmarkData = [
      {
        metric: 'Interview Rate',
        user: userMetrics.interviewRate,
        average: comparisons.interviewRate.benchmark,
        topPerformer: comparisons.interviewRate.topPerformer,
      },
      {
        metric: 'Offer Rate',
        user: userMetrics.offerRate,
        average: comparisons.offerRate.benchmark,
        topPerformer: comparisons.offerRate.topPerformer,
      },
      {
        metric: 'Technical Skills',
        user: skillsProfile.technical,
        average: comparisons.technicalSkills.benchmark,
        topPerformer: comparisons.technicalSkills.topPerformer,
      },
      {
        metric: 'Networking',
        user: networkingData.contacts,
        average: comparisons.networking.benchmark,
        topPerformer: comparisons.networking.topPerformer,
      },
    ];

    // Percentile Distribution
    const percentileData = Object.entries(comparisons).map(([key, comp]) => ({
      category: key.replace(/([A-Z])/g, ' $1').trim(),
      percentile: comp.percentile,
      userValue: comp.user,
      benchmark: comp.benchmark,
    }));

    // ------------------------------
    // DEBUG LOGGING
    // ------------------------------
    console.log(`📊 Competitive Analysis for user ${userId}:`);
    console.log(`  - Jobs: ${jobs.length} (active)`);
    console.log(`  - Applications: ${userMetrics.totalApplications}`);
    console.log(`  - Interview Rate: ${userMetrics.interviewRate.toFixed(1)}% (vs ${comparisons.interviewRate.benchmark.toFixed(1)}% avg, ${comparisons.interviewRate.topPerformer.toFixed(1)}% top 10%)`);
    console.log(`  - Offer Rate: ${userMetrics.offerRate.toFixed(1)}% (vs ${comparisons.offerRate.benchmark.toFixed(1)}% avg, ${comparisons.offerRate.topPerformer.toFixed(1)}% top 10%)`);
    console.log(`  - Skills: ${skillsProfile.total} (${skillsProfile.technical} technical, ${skillsProfile.soft} soft)`);
    console.log(`  - Certifications: ${certifications.length} (vs ${comparisons.certifications.benchmark.toFixed(0)} avg)`);
    console.log(`  - Networking: ${networkingData.contacts} contacts (vs ${comparisons.networking.benchmark.toFixed(0)} avg)`);
    console.log(`  - Experience: ${experienceProfile.totalYears} years, ${experienceProfile.companies} companies`);
    console.log(`  - Market Position: ${marketPosition.score} (${marketPosition.position}) - ${marketPosition.percentile}th percentile`);
    console.log(`  - Percentile Rankings:`, Object.entries(comparisons).map(([k, v]) => `${k}: ${v.percentile}th`).join(', '));
    console.log(`  - Total users compared: ${allUsersMetrics.length}`);

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.json({
      // Market Position
      marketPosition,

      // Performance Metrics
      userMetrics,
      comparisons,

      // Profile Analysis
      skillsProfile,
      experienceProfile,
      networkingData,

      // Skill Gaps
      skillGaps,

      // Recommendations
      recommendations,
      differentiationStrategies,

      // Chart Data
      benchmarkData,
      percentileData,

      // Benchmarks Reference
      benchmarks: BENCHMARKS,
    });

  } catch (err) {
    console.error("❌ Competitive Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

