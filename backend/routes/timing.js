// backend/routes/timing.js
// UC-124: Job Application Timing Optimizer API Routes

import express from "express";
import pool from "../db/pool.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    req.user = { id: data.id };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- HELPER: Calculate optimal timing based on historical data ----------
async function calculateOptimalTiming(userId, jobId, jobData = null) {
  try {
    // Get job data if not provided
    if (!jobData) {
      const jobResult = await pool.query(
        "SELECT * FROM jobs WHERE id = $1 AND user_id = $2",
        [jobId, userId]
      );
      if (jobResult.rows.length === 0) {
        throw new Error("Job not found");
      }
      jobData = jobResult.rows[0];
    }

    // Get historical submission data from ALL users (aggregate data for better recommendations)
    // Also get company-specific data if available (aggregate, no personal info)
    const historyResult = await pool.query(
      `SELECT 
        day_of_week,
        hour_of_day,
        response_received,
        response_type,
        industry,
        company_size
      FROM application_submissions
      ORDER BY submitted_at DESC
      LIMIT 1000`,
      []
    );

    // Detect timezone from job (do this early so it's available for company analysis)
    const detectedTimezone = detectTimezoneFromJob(jobData);
    
    // Get company-specific timing data (aggregate, anonymized)
    const companyName = jobData?.company || null;
    let companyTimingData = null;
    
    console.log('🔍 Looking for company analysis for:', companyName);
    console.log('🔍 Job data company field:', jobData?.company);
    
    if (companyName) {
      // First, let's check if we have any data for this company at all
      const companyCheck = await pool.query(
        `SELECT COUNT(*) as total, j.company
         FROM application_submissions asub
         JOIN jobs j ON j.id = asub.job_id
         WHERE LOWER(TRIM(j.company)) = LOWER(TRIM($1))
         GROUP BY j.company`,
        [companyName]
      );
      console.log('🔍 Company check result:', companyCheck.rows);
      
      const companyResult = await pool.query(
        `SELECT 
          asub.day_of_week,
          asub.hour_of_day,
          asub.response_received,
          asub.response_type,
          COUNT(*) as submission_count
        FROM application_submissions asub
        JOIN jobs j ON j.id = asub.job_id
        WHERE LOWER(TRIM(j.company)) = LOWER(TRIM($1))
        GROUP BY asub.day_of_week, asub.hour_of_day, asub.response_received, asub.response_type
        HAVING COUNT(*) >= 2
        ORDER BY submission_count DESC
        LIMIT 50`,
        [companyName]
      );
      
      console.log('🔍 Company result rows:', companyResult.rows.length);
      
      if (companyResult.rows.length > 0) {
        // Analyze company-specific patterns
        const companyStats = {};
        companyResult.rows.forEach(row => {
          const key = `${row.day_of_week}_${row.hour_of_day}`;
          if (!companyStats[key]) {
            companyStats[key] = {
              total: 0,
              responses: 0,
              interviews: 0,
              offers: 0
            };
          }
          companyStats[key].total += parseInt(row.submission_count);
          if (row.response_received) {
            companyStats[key].responses += parseInt(row.submission_count);
            if (row.response_type === 'interview' || row.response_type === 'phone_screen') {
              companyStats[key].interviews += parseInt(row.submission_count);
            }
            if (row.response_type === 'offer') {
              companyStats[key].offers += parseInt(row.submission_count);
            }
          }
        });
        
        // Find best time slot for this company
        let bestCompanySlot = null;
        let bestCompanyScore = 0;
        
        Object.entries(companyStats).forEach(([key, stats]) => {
          const responseRate = stats.total > 0 ? stats.responses / stats.total : 0;
          const interviewRate = stats.total > 0 ? stats.interviews / stats.total : 0;
          const offerRate = stats.total > 0 ? stats.offers / stats.total : 0;
          const baseScore = (responseRate * 0.6) + (interviewRate * 0.3) + (offerRate * 0.1);
          
          // Apply sample size boost for company data too
          const sampleSizeBoost = Math.min(0.2, Math.log10(Math.max(1, stats.total)) * 0.05);
          const adjustedScore = baseScore + sampleSizeBoost;
          
          if (adjustedScore > bestCompanyScore && stats.total >= 2) {
            bestCompanyScore = adjustedScore;
            const [day, hour] = key.split('_').map(Number);
            bestCompanySlot = {
              day_of_week: day,
              hour_of_day: hour,
              score: adjustedScore,
              response_rate: responseRate,
              total_submissions: stats.total,
              responses: stats.responses
            };
          }
        });
        
        if (bestCompanySlot) {
          const companyRecommendedDate = getNextOccurrence(bestCompanySlot.day_of_week, bestCompanySlot.hour_of_day, detectedTimezone);
          companyTimingData = {
            company: companyName,
            best_day: getDayName(bestCompanySlot.day_of_week),
            best_hour: formatHour(bestCompanySlot.hour_of_day),
            best_date: companyRecommendedDate.toISOString().split('T')[0],
            response_rate: Math.round(bestCompanySlot.response_rate * 100),
            confidence: bestCompanySlot.total_submissions >= 10 ? 'high' : bestCompanySlot.total_submissions >= 5 ? 'medium' : 'low',
            data_points: bestCompanySlot.total_submissions,
            responses: bestCompanySlot.responses,
            total_submissions: bestCompanySlot.total_submissions
          };
          console.log('🏢 Company timing data found:', companyTimingData);
        } else {
          console.log('🏢 No company timing data found for:', companyName);
        }
      }
    }

    const submissions = historyResult.rows;

    // If no historical data, use default optimal times
    if (submissions.length === 0) {
      return getDefaultOptimalTiming(detectedTimezone);
    }

    // Analyze response rates by day and hour
    const dayHourStats = {};
    
    submissions.forEach(sub => {
      const key = `${sub.day_of_week}_${sub.hour_of_day}`;
      if (!dayHourStats[key]) {
        dayHourStats[key] = {
          total: 0,
          responses: 0,
          interviews: 0,
          offers: 0
        };
      }
      
      dayHourStats[key].total++;
      if (sub.response_received) {
        dayHourStats[key].responses++;
        if (sub.response_type === 'interview' || sub.response_type === 'phone_screen') {
          dayHourStats[key].interviews++;
        }
        if (sub.response_type === 'offer') {
          dayHourStats[key].offers++;
        }
      }
    });

    // Find best performing time slots (collect all, sort by score)
    const allSlots = [];

    Object.entries(dayHourStats).forEach(([key, stats]) => {
      // Calculate score: response rate (60%) + interview rate (30%) + offer rate (10%)
      const responseRate = stats.total > 0 ? stats.responses / stats.total : 0;
      const interviewRate = stats.total > 0 ? stats.interviews / stats.total : 0;
      const offerRate = stats.total > 0 ? stats.offers / stats.total : 0;
      
      // Base score from rates
      let baseScore = (responseRate * 0.6) + (interviewRate * 0.3) + (offerRate * 0.1);
      
      // Apply sample size confidence boost (more data = higher confidence)
      // Formula: boost = min(0.4, (total - 1) * 0.05)
      // This gives significant boost for larger sample sizes
      // Example: 2 data points = 0.05 boost, 4 data points = 0.15 boost, 10 = 0.45 (capped at 0.4)
      const sampleSizeBoost = Math.min(0.4, (stats.total - 1) * 0.05);
      const adjustedScore = baseScore + sampleSizeBoost;
      
      // Collect all slots with at least 2 data points
      if (stats.total >= 2) {
        const [day, hour] = key.split('_').map(Number);
        allSlots.push({ 
          day_of_week: day, 
          hour_of_day: hour, 
          score: adjustedScore, // Use adjusted score with sample size boost
          baseScore: baseScore, // Keep original for display
          stats,
          responseRate,
          sampleSize: stats.total // Track sample size
        });
      }
    });

    // Sort by score (best first), with sample size as primary tiebreaker
    // Prioritize larger sample sizes when response rates are similar
    allSlots.sort((a, b) => {
      // First compare by score
      const scoreDiff = b.score - a.score;
      
      // If scores are very close (within 0.05), prioritize larger sample size
      if (Math.abs(scoreDiff) < 0.05) {
        // If sample sizes are very different, prefer larger one
        if (Math.abs(b.sampleSize - a.sampleSize) >= 2) {
          return b.sampleSize - a.sampleSize;
        }
        // If sample sizes are close, use score
        return scoreDiff;
      }
      
      return scoreDiff;
    });
    
    // Get top 3 slots (optimal + 2 good alternatives)
    const topSlots = allSlots.slice(0, 3);
    const bestSlot = topSlots[0] || null;

    // Always use data-based recommendations if we have any data (lower threshold)
    // Only use defaults if we have absolutely no data at all
    if (bestSlot && bestSlot.score > 0.1) {
      const recommendedDate = getNextOccurrence(bestSlot.day_of_week, bestSlot.hour_of_day, detectedTimezone);
      
      // Generate alternative recommendations (good times)
      // Filter out the optimal slot AND any other slots on the same day to avoid overlap
      const alternativeSlots = topSlots.filter(slot => 
        slot.day_of_week !== bestSlot.day_of_week // Must be a different day
      ).slice(0, 2); // Get up to 2 alternatives (excluding the optimal day)
      
      const alternatives = alternativeSlots.map(slot => {
        const altDate = getNextOccurrence(slot.day_of_week, slot.hour_of_day, detectedTimezone);
        return {
          recommended_date: altDate.toISOString().split('T')[0],
          recommended_time: `${String(slot.hour_of_day).padStart(2, '0')}:00:00`,
          day_of_week: slot.day_of_week,
          hour_of_day: slot.hour_of_day,
          day_name: getDayName(slot.day_of_week),
          formatted_time: formatHour(slot.hour_of_day),
          score: slot.score,
          response_rate: slot.responseRate,
          reasoning: `${slot.stats.responses}/${slot.stats.total} responses (${Math.round(slot.responseRate * 100)}% response rate)`
        };
      });
      
      // Build reasoning with company analysis if available
      let reasoning = `Based on aggregate data analysis: ${bestSlot.stats.responses}/${bestSlot.stats.total} responses (${Math.round(bestSlot.stats.responses / bestSlot.stats.total * 100)}% response rate) when applying on ${getDayName(bestSlot.day_of_week)} at ${formatHour(bestSlot.hour_of_day)}.`;
      
      if (companyTimingData && companyTimingData.confidence !== 'low') {
        const companyDay = companyTimingData.best_day;
        const companyHour = companyTimingData.best_hour;
        const companyResponseRate = companyTimingData.response_rate;
        
        // Check if company-specific timing matches aggregate recommendation
        const recommendedDayName = getDayName(bestSlot.day_of_week);
        if (recommendedDayName === companyDay) {
          reasoning += ` This aligns with ${companyTimingData.company}'s optimal timing (${companyDay} ${companyHour} with ${companyResponseRate}% response rate based on ${companyTimingData.data_points} applications).`;
        } else {
          reasoning += ` Note: ${companyTimingData.company} shows better response rates on ${companyDay} ${companyHour} (${companyResponseRate}% response rate), but the aggregate recommendation remains optimal overall.`;
        }
      }
      
      return {
        recommended_date: recommendedDate.toISOString().split('T')[0],
        recommended_time: `${String(bestSlot.hour_of_day).padStart(2, '0')}:00:00`,
        recommended_timezone: detectedTimezone,
        day_of_week: bestSlot.day_of_week,
        hour_of_day: bestSlot.hour_of_day,
        confidence_score: Math.min(0.9, bestSlot.score + 0.1), // Cap at 0.9, add small boost
        reasoning: reasoning,
        recommendation_type: bestSlot.score > 0.5 ? 'optimal' : bestSlot.score > 0.3 ? 'good' : 'acceptable',
        alternatives: alternatives, // Add alternative time options
        company_analysis: companyTimingData // Include company-specific insights (anonymized, aggregate data only)
      };
    }

    return getDefaultOptimalTiming(detectedTimezone);
  } catch (error) {
    console.error("❌ Error calculating optimal timing:", error);
    return getDefaultOptimalTiming();
  }
}

// Default optimal timing (Tuesday-Thursday, 9-11 AM)
function getDefaultOptimalTiming(timezone = 'America/New_York') {
  // Default to Monday (1) at 10 AM EST (best time based on aggregate data)
  const recommendedDate = getNextOccurrence(1, 10, timezone);
  
  // Generate alternative good times (Tuesday 10 AM, Monday 9 AM)
  const alternatives = [
    {
      recommended_date: getNextOccurrence(2, 10, timezone).toISOString().split('T')[0],
      recommended_time: '10:00:00',
      day_of_week: 2,
      hour_of_day: 10,
      day_name: getDayName(2),
      formatted_time: formatHour(10),
      score: 0.45,
      response_rate: 0.45,
      reasoning: "Tuesday mornings are typically good for recruiter engagement"
    },
    {
      recommended_date: getNextOccurrence(1, 9, timezone).toISOString().split('T')[0],
      recommended_time: '09:00:00',
      day_of_week: 1,
      hour_of_day: 9,
      day_name: getDayName(1),
      formatted_time: formatHour(9),
      score: 0.4,
      response_rate: 0.4,
      reasoning: "Monday mornings are typically good for recruiter engagement"
    }
  ];
  
  return {
    recommended_date: recommendedDate.toISOString().split('T')[0],
    recommended_time: '10:00:00',
    recommended_timezone: timezone,
    day_of_week: 1, // Monday
    hour_of_day: 10, // 10 AM
    confidence_score: 0.5,
    reasoning: "Based on aggregate data analysis: Monday and Tuesday mornings (9-11 AM EST) typically see higher recruiter engagement. Avoid weekends (Saturday and Sunday) as response rates are significantly lower. This is a default recommendation until we have sufficient historical data.",
    recommendation_type: 'good',
    alternatives: alternatives
  };
}

// Get next occurrence of a specific day and hour (with timezone support)
function getNextOccurrence(targetDay, targetHour, timezone = 'America/New_York') {
  const now = new Date();
  
  // Get current time components in EST
  const nowESTStr = now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  
  // Parse day of week from string (Sun, Mon, Tue, etc.)
  const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const dayMatch = nowESTStr.match(/(\w{3})/);
  const currentDay = dayMap[dayMatch ? dayMatch[1] : 'Sun'] || 0;
  
  // Parse date and hour from EST
  const dateTimeMatch = nowESTStr.match(/(\w{3}), (\d{1,2})\/(\d{1,2})\/(\d{4}), (\d{1,2}):/);
  if (!dateTimeMatch) {
    // Fallback
    const hourMatch = nowESTStr.match(/(\d{1,2}):/);
    const currentHour = hourMatch ? parseInt(hourMatch[1]) : 0;
    const result = new Date(now);
    result.setDate(result.getDate() + ((targetDay - currentDay + 7) % 7));
    if (result.getDay() === currentDay && currentHour >= targetHour) {
      result.setDate(result.getDate() + 7);
    }
    return result;
  }
  
  const currentMonth = parseInt(dateTimeMatch[2]) - 1; // Month is 0-indexed
  const currentDate = parseInt(dateTimeMatch[3]);
  const currentYear = parseInt(dateTimeMatch[4]);
  const currentHour = parseInt(dateTimeMatch[5]);
  const currentMinute = dateTimeMatch[6] ? parseInt(dateTimeMatch[6]) : 0;
  
  // Calculate days until target day
  let daysUntil = (targetDay - currentDay + 7) % 7;
  
  // If it's the same day but past the target hour, move to next week
  if (daysUntil === 0 && (currentHour > targetHour || (currentHour === targetHour && currentMinute >= 0))) {
    daysUntil = 7;
  }
  
  // Create the target date in EST (using local date constructor)
  const targetDate = new Date(currentYear, currentMonth, currentDate);
  targetDate.setDate(targetDate.getDate() + daysUntil);
  targetDate.setHours(targetHour, 0, 0, 0);
  
  return targetDate;
}

function getDayName(dayOfWeek) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ---------- HELPER: Detect timezone from job location/description ----------
// All dates/times should be in EST (America/New_York) per requirements
function detectTimezoneFromJob(job) {
  // Always use EST (America/New_York) for all jobs
  return 'America/New_York';
}

// ---------- HELPER: Check if date is a US holiday ----------
function isUSHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // New Year's Day (January 1)
  if (month === 0 && day === 1) return true;

  // Martin Luther King Jr. Day (third Monday in January)
  if (month === 0 && dayOfWeek === 1) {
    const firstMonday = new Date(year, 0, 1);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    const thirdMonday = new Date(year, 0, firstMonday.getDate() + 14);
    if (date.getDate() === thirdMonday.getDate()) return true;
  }

  // Presidents' Day (third Monday in February)
  if (month === 1 && dayOfWeek === 1) {
    const firstMonday = new Date(year, 1, 1);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    const thirdMonday = new Date(year, 1, firstMonday.getDate() + 14);
    if (date.getDate() === thirdMonday.getDate()) return true;
  }

  // Memorial Day (last Monday in May)
  if (month === 4 && dayOfWeek === 1) {
    const lastDay = new Date(year, 5, 0); // Last day of May
    const lastMonday = new Date(year, 4, lastDay.getDate() - ((lastDay.getDay() + 6) % 7));
    if (date.getDate() === lastMonday.getDate()) return true;
  }

  // Independence Day (July 4)
  if (month === 6 && day === 4) return true;

  // Labor Day (first Monday in September)
  if (month === 8 && dayOfWeek === 1) {
    const firstMonday = new Date(year, 8, 1);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    if (date.getDate() === firstMonday.getDate()) return true;
  }

  // Columbus Day (second Monday in October)
  if (month === 9 && dayOfWeek === 1) {
    const firstMonday = new Date(year, 9, 1);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    const secondMonday = new Date(year, 9, firstMonday.getDate() + 7);
    if (date.getDate() === secondMonday.getDate()) return true;
  }

  // Veterans Day (November 11)
  if (month === 10 && day === 11) return true;

  // Thanksgiving (fourth Thursday in November)
  if (month === 10 && dayOfWeek === 4) {
    const firstThursday = new Date(year, 10, 1);
    while (firstThursday.getDay() !== 4) {
      firstThursday.setDate(firstThursday.getDate() + 1);
    }
    const fourthThursday = new Date(year, 10, firstThursday.getDate() + 21);
    if (date.getDate() === fourthThursday.getDate()) return true;
  }

  // Christmas (December 25)
  if (month === 11 && day === 25) return true;

  return false;
}

// ---------- HELPER: Check if date is end of fiscal quarter ----------
function isEndOfFiscalQuarter(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  // End of quarters: March 31, June 30, September 30, December 31
  // Also check a few days before (last week of quarter)
  const quarterEnds = [
    { month: 2, day: 31 }, // March
    { month: 2, day: 30 }, // March 30
    { month: 2, day: 29 }, // March 29
    { month: 5, day: 30 }, // June
    { month: 5, day: 29 }, // June 29
    { month: 5, day: 28 }, // June 28
    { month: 8, day: 30 }, // September
    { month: 8, day: 29 }, // September 29
    { month: 8, day: 28 }, // September 28
    { month: 11, day: 31 }, // December
    { month: 11, day: 30 }, // December 30
    { month: 11, day: 29 }  // December 29
  ];

  return quarterEnds.some(qe => qe.month === month && qe.day === day);
}

// ---------- HELPER: Detect bad timing and generate warnings ----------
function detectBadTiming(date, time, timezone = 'UTC') {
  const warnings = [];
  const dateObj = new Date(`${date}T${time}`);
  
  // Convert to target timezone for analysis
  const localDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = localDate.getDay();
  const hour = localDate.getHours();

  // Check for weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    warnings.push({
      type: 'weekend',
      severity: 'high',
      message: 'Avoid submitting on weekends. Recruiters typically don\'t check applications until Monday morning.',
      recommendation: 'Wait until Monday morning for better visibility.'
    });
  }

  // Check for Friday evening (after 3 PM)
  if (dayOfWeek === 5 && hour >= 15) {
    warnings.push({
      type: 'friday_evening',
      severity: 'high',
      message: 'Friday afternoons/evenings are suboptimal. Applications may get buried over the weekend.',
      recommendation: 'Submit earlier in the week (Tuesday-Thursday) or wait until Monday morning.'
    });
  }

  // Check for holidays
  if (isUSHoliday(localDate)) {
    warnings.push({
      type: 'holiday',
      severity: 'high',
      message: 'This date falls on a US holiday. Recruiters are unlikely to review applications.',
      recommendation: 'Submit the day before or after the holiday for better visibility.'
    });
  }

  // Check for end of fiscal quarter
  if (isEndOfFiscalQuarter(localDate)) {
    warnings.push({
      type: 'quarter_end',
      severity: 'medium',
      message: 'End of fiscal quarter. Recruiters may be busy with quarterly reports and less likely to review applications.',
      recommendation: 'Consider submitting a few days before or after quarter end.'
    });
  }

  // Check for very early morning (before 8 AM)
  if (hour < 8) {
    warnings.push({
      type: 'early_morning',
      severity: 'low',
      message: 'Very early morning submissions may get lost in overnight emails.',
      recommendation: 'Wait until 9 AM or later for better visibility.'
    });
  }

  // Check for late evening (after 5 PM)
  if (hour >= 17) {
    warnings.push({
      type: 'late_evening',
      severity: 'medium',
      message: 'Late evening submissions may not be seen until the next business day.',
      recommendation: 'Submit during business hours (9 AM - 5 PM) for immediate visibility.'
    });
  }

  return warnings;
}

// ---------- POST /api/timing/submit ----------
// Record an application submission
router.post("/submit", auth, async (req, res) => {
  try {
    const { jobId, submittedAt, timezone, industry, companySize, jobType, isRemote } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    // Verify job belongs to user
    const jobCheck = await pool.query(
      "SELECT id, industry, type FROM jobs WHERE id = $1 AND user_id = $2",
      [jobId, req.userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobCheck.rows[0];
    const submissionTime = submittedAt ? new Date(submittedAt) : new Date();
    // Always use EST for timing analysis
    const tz = 'America/New_York';
    
    // Extract day of week and hour in EST (0-6, 0-23)
    // Convert to EST timezone
    const estTimeStr = submissionTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: '2-digit',
      hour12: false
    });
    
    // Parse day of week from EST
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayMatch = estTimeStr.match(/(\w{3})/);
    const dayOfWeek = dayMap[dayMatch ? dayMatch[1] : 'Sun'] || 0;
    
    // Parse hour from EST
    const hourMatch = estTimeStr.match(/(\d{1,2}):/);
    const hourOfDay = hourMatch ? parseInt(hourMatch[1]) : submissionTime.getHours();

    // Insert submission record
    const result = await pool.query(
      `INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        industry, company_size, job_type, is_remote
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        jobId,
        req.userId,
        submissionTime,
        dayOfWeek,
        hourOfDay,
        tz,
        industry || job.industry || null,
        companySize || null,
        jobType || job.type || null,
        isRemote || false
      ]
    );

    res.json({
      success: true,
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error recording submission:", error);
    res.status(500).json({ error: "Failed to record submission" });
  }
});

// ---------- GET /api/timing/recommendations/:jobId ----------
// Get timing recommendations for a specific job
router.get("/recommendations/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify job belongs to user
    const jobResult = await pool.query(
      "SELECT * FROM jobs WHERE id = $1 AND user_id = $2",
      [jobId, req.userId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobResult.rows[0];

    // Check for existing active recommendation
    const existingRec = await pool.query(
      `SELECT * FROM timing_recommendations
       WHERE job_id = $1 AND user_id = $2 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [jobId, req.userId]
    );

    let recommendation;
    let optimalTiming = null; // Cache to avoid multiple DB calls

    if (existingRec.rows.length > 0) {
      // Use existing recommendation
      recommendation = existingRec.rows[0];
    } else {
      // Generate new recommendation (only call once)
      optimalTiming = await calculateOptimalTiming(req.userId, jobId, job);
      
      // Save recommendation to database
      const insertResult = await pool.query(
        `INSERT INTO timing_recommendations (
          job_id, user_id, recommended_date, recommended_time, recommended_timezone,
          day_of_week, hour_of_day, confidence_score, reasoning, recommendation_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          jobId,
          req.userId,
          optimalTiming.recommended_date,
          optimalTiming.recommended_time,
          optimalTiming.recommended_timezone,
          optimalTiming.day_of_week,
          optimalTiming.hour_of_day,
          optimalTiming.confidence_score,
          optimalTiming.reasoning,
          optimalTiming.recommendation_type
        ]
      );

      recommendation = insertResult.rows[0];
    }

    // Get alternatives and company analysis from cached optimalTiming, or calculate if we have existing recommendation
    let alternatives = [];
    let companyAnalysisFromCache = null;
    
    // Always try to get company analysis - either from optimalTiming or by recalculating
    if (optimalTiming && optimalTiming.company_analysis) {
      companyAnalysisFromCache = optimalTiming.company_analysis;
      alternatives = optimalTiming.alternatives || [];
    } else {
      // Calculate to get company analysis and alternatives
      try {
        const calculatedTiming = await calculateOptimalTiming(req.userId, jobId, job);
        if (calculatedTiming) {
          if (calculatedTiming.alternatives) {
            alternatives = calculatedTiming.alternatives;
          }
          if (calculatedTiming.company_analysis) {
            companyAnalysisFromCache = calculatedTiming.company_analysis;
            console.log('✅ Got company analysis from calculation:', JSON.stringify(companyAnalysisFromCache, null, 2));
          } else {
            console.log('❌ No company analysis in calculated timing');
          }
        }
      } catch (e) {
        console.log("Could not calculate timing for alternatives/company analysis:", e.message);
        // Fallback to default alternatives
        alternatives = getDefaultOptimalTiming('America/New_York').alternatives || [];
      }
    }

    // Determine real-time status (all times in EST)
    const now = new Date();
    
    // Ensure dateStr is a string (handle Date objects from database)
    let dateStr = recommendation.recommended_date;
    if (dateStr instanceof Date) {
      dateStr = dateStr.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    } else if (typeof dateStr !== 'string') {
      dateStr = String(dateStr);
    }
    
    const timeStr = recommendation.recommended_time || '10:00:00';
    
    // Get current time in EST as ISO string, then parse components
    const nowESTISO = now.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Parse EST time string (format: "MM/DD/YYYY, HH:MM:SS")
    const [datePart, timePart] = nowESTISO.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    
    // Create Date objects using UTC to avoid timezone issues
    // These represent the EST times as UTC timestamps
    const nowESTTimestamp = Date.UTC(
      parseInt(year), 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute), 
      parseInt(second || '0')
    );
    
    // Parse recommended date/time (already in EST format)
    // Handle both YYYY-MM-DD and other formats
    let recYear, recMonth, recDay;
    if (dateStr.includes('-')) {
      [recYear, recMonth, recDay] = dateStr.split('-').map(Number);
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      recMonth = parseInt(parts[0]);
      recDay = parseInt(parts[1]);
      recYear = parseInt(parts[2]);
    } else {
      // Fallback: try to parse as Date
      const dateObj = new Date(dateStr);
      recYear = dateObj.getFullYear();
      recMonth = dateObj.getMonth() + 1;
      recDay = dateObj.getDate();
    }
    
    const [recHour, recMin, recSec] = (timeStr || '10:00:00').split(':').map(Number);
    
    const recommendedTimestamp = Date.UTC(
      recYear, 
      recMonth - 1, 
      recDay, 
      recHour || 10, 
      recMin || 0, 
      recSec || 0
    );
    
    // Calculate difference in hours
    const timeUntil = recommendedTimestamp - nowESTTimestamp;
    const hoursUntil = timeUntil / (1000 * 60 * 60);

    let realTimeStatus = "wait";
    let realTimeMessage = `Wait until ${getDayName(recommendation.day_of_week)} at ${formatHour(recommendation.hour_of_day)}`;

    // Fixed logic: all comparisons in EST
    // If we're past the recommended time by a few hours, it's still acceptable
    if (hoursUntil <= 0 && hoursUntil >= -4) {
      // At or just past optimal time (within 4 hours past - still good!)
      realTimeStatus = "submit_now";
      realTimeMessage = "Submit now - optimal timing window";
    } else if (hoursUntil > 0 && hoursUntil <= 2) {
      // Within 2 hours before optimal time
      realTimeStatus = "submit_now";
      realTimeMessage = "Submit now - optimal timing window";
    } else if (hoursUntil < -4 && hoursUntil >= -48) {
      // Past recommended time but within 48 hours (2 days) - still acceptable
      realTimeStatus = "acceptable";
      const daysPast = Math.abs(Math.floor(hoursUntil / 24));
      const hoursPast = Math.abs(Math.floor(hoursUntil % 24));
      if (daysPast > 0) {
        realTimeMessage = `Still acceptable - ${daysPast} day${daysPast > 1 ? 's' : ''} past optimal time`;
      } else {
        realTimeMessage = `Still acceptable - ${hoursPast} hour${hoursPast > 1 ? 's' : ''} past optimal time`;
      }
    } else if (hoursUntil > 2 && hoursUntil < 24) {
      // More than 2 hours before, but same day
      const hoursRemaining = Math.floor(hoursUntil);
      realTimeStatus = "wait";
      realTimeMessage = `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} until optimal time`;
    } else if (hoursUntil >= 24) {
      // More than a day away - show days
      const daysRemaining = Math.floor(hoursUntil / 24);
      realTimeStatus = "wait";
      realTimeMessage = `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} until optimal time (${getDayName(recommendation.day_of_week)} at ${formatHour(recommendation.hour_of_day)})`;
    } else if (hoursUntil < -48) {
      // More than 24 hours past, generate new recommendation
      realTimeStatus = "expired";
      realTimeMessage = "Recommendation expired - generating new one...";
      
      // Mark old as expired and generate new
      await pool.query(
        "UPDATE timing_recommendations SET status = 'expired' WHERE id = $1",
        [recommendation.id]
      );

      // Reuse optimalTiming if we already calculated it, otherwise calculate now
      if (!optimalTiming) {
        optimalTiming = await calculateOptimalTiming(req.userId, jobId, job);
      }
      
      const newResult = await pool.query(
        `INSERT INTO timing_recommendations (
          job_id, user_id, recommended_date, recommended_time, recommended_timezone,
          day_of_week, hour_of_day, confidence_score, reasoning, recommendation_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          jobId,
          req.userId,
          optimalTiming.recommended_date,
          optimalTiming.recommended_time,
          optimalTiming.recommended_timezone,
          optimalTiming.day_of_week,
          optimalTiming.hour_of_day,
          optimalTiming.confidence_score,
          optimalTiming.reasoning,
          optimalTiming.recommendation_type
        ]
      );
      recommendation = newResult.rows[0];
      realTimeStatus = "wait";
      realTimeMessage = `Wait until ${getDayName(recommendation.day_of_week)} at ${formatHour(recommendation.hour_of_day)}`;
      
      // Update alternatives from cached optimalTiming if available
      if (optimalTiming && optimalTiming.alternatives) {
        alternatives = optimalTiming.alternatives;
      }
    }

    // Check for bad timing warnings
    const warnings = detectBadTiming(
      recommendation.recommended_date,
      recommendation.recommended_time,
      recommendation.recommended_timezone
    );

    // Format timezone for display (always EST)
    const timezoneDisplay = 'EST (Eastern Standard Time)';

    // Format the full date for display (in EST)
    let formattedDate = '';
    try {
      const dateStr = recommendation.recommended_date;
      const timeStr = recommendation.recommended_time || '10:00:00';
      const dateTimeStr = `${dateStr}T${timeStr}`;
      const date = new Date(dateTimeStr);
      
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/New_York'
        });
      } else {
        // Fallback: just format the date part
        const dateOnly = new Date(dateStr);
        if (!isNaN(dateOnly.getTime())) {
          formattedDate = dateOnly.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York'
          });
        } else {
          formattedDate = dateStr; // Last resort: just show the date string
        }
      }
    } catch (e) {
      // If all else fails, just use the date string
      formattedDate = recommendation.recommended_date || 'N/A';
    }


    // Get company analysis from optimalTiming if available, or from cache
    let companyAnalysis = null;
    if (optimalTiming && optimalTiming.company_analysis) {
      companyAnalysis = optimalTiming.company_analysis;
      console.log('✅ Company analysis found in optimalTiming:', JSON.stringify(companyAnalysis, null, 2));
    } else if (companyAnalysisFromCache) {
      companyAnalysis = companyAnalysisFromCache;
      console.log('✅ Company analysis found from cache:', JSON.stringify(companyAnalysis, null, 2));
    } else {
      console.log('❌ No company analysis available');
      console.log('   optimalTiming exists:', !!optimalTiming);
      if (optimalTiming) {
        console.log('   optimalTiming keys:', Object.keys(optimalTiming));
      }
    }
    
    res.json({
      recommendation: {
        ...recommendation,
        real_time_status: realTimeStatus,
        real_time_message: realTimeMessage,
        hours_until: hoursUntil,
        day_name: getDayName(recommendation.day_of_week),
        formatted_time: formatHour(recommendation.hour_of_day),
        formatted_date: formattedDate,
        timezone_display: timezoneDisplay,
        warnings: warnings,
        alternatives: alternatives,
        company_analysis: companyAnalysis || null // Always include, even if null
      },
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        industry: job.industry,
        location: job.location,
        type: job.type
      }
    });
  } catch (error) {
    console.error("❌ Error getting recommendations:", error);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

// ---------- GET /api/timing/optimal-times ----------
// Get optimal times by industry/company size (aggregate data)
router.get("/optimal-times", auth, async (req, res) => {
  try {
    const { industry, companySize } = req.query;

    let query = `
      SELECT 
        day_of_week,
        hour_of_day,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1
    `;

    const params = [req.userId];
    let paramIndex = 2;

    if (industry) {
      query += ` AND industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }

    if (companySize) {
      query += ` AND company_size = $${paramIndex}`;
      params.push(companySize);
      paramIndex++;
    }

    query += `
      GROUP BY day_of_week, hour_of_day
      HAVING COUNT(*) >= 2
      ORDER BY 
        (SUM(CASE WHEN response_received THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) DESC,
        COUNT(*) DESC
      LIMIT 10
    `;

    const result = await pool.query(query, params);

    const optimalTimes = result.rows.map(row => ({
      day_of_week: row.day_of_week,
      hour_of_day: row.hour_of_day,
      day_name: getDayName(row.day_of_week),
      formatted_time: formatHour(row.hour_of_day),
      total_submissions: parseInt(row.total_submissions),
      response_rate: row.total_submissions > 0 
        ? (parseInt(row.responses) / parseInt(row.total_submissions)).toFixed(2)
        : 0,
      interview_rate: row.total_submissions > 0
        ? (parseInt(row.interviews) / parseInt(row.total_submissions)).toFixed(2)
        : 0,
      offer_rate: row.total_submissions > 0
        ? (parseInt(row.offers) / parseInt(row.total_submissions)).toFixed(2)
        : 0
    }));

    res.json({
      optimal_times: optimalTimes,
      filters: { industry, companySize }
    });
  } catch (error) {
    console.error("❌ Error getting optimal times:", error);
    res.status(500).json({ error: "Failed to get optimal times" });
  }
});

// ---------- POST /api/timing/schedule ----------
// Schedule an application submission for optimal time
router.post("/schedule", auth, async (req, res) => {
  try {
    const { jobId, scheduledDate, scheduledTime, timezone, notes } = req.body;
    
    if (!jobId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: "jobId, scheduledDate, and scheduledTime are required" });
    }

    // Verify job belongs to user
    const jobCheck = await pool.query(
      "SELECT id FROM jobs WHERE id = $1 AND user_id = $2",
      [jobId, req.userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if there's already a pending schedule for this job
    const existingSchedule = await pool.query(
      `SELECT id FROM scheduled_submissions 
       WHERE job_id = $1 AND user_id = $2 AND status = 'pending'`,
      [jobId, req.userId]
    );

    if (existingSchedule.rows.length > 0) {
      return res.status(400).json({ 
        error: "A pending schedule already exists for this job. Please cancel or complete it first." 
      });
    }

    const tz = timezone || 'UTC';
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Extract day of week and hour in the specified timezone
    const tzDateStr = scheduledDateTime.toLocaleString('en-US', { timeZone: tz });
    const tzDate = new Date(tzDateStr);
    const dayOfWeek = tzDate.getDay();
    const hourOfDay = tzDate.getHours();

    // Insert scheduled submission
    const result = await pool.query(
      `INSERT INTO scheduled_submissions (
        job_id, user_id, scheduled_date, scheduled_time, scheduled_timezone, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [jobId, req.userId, scheduledDate, scheduledTime, tz, notes || null]
    );

    res.json({
      success: true,
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error scheduling submission:", error);
    res.status(500).json({ error: "Failed to schedule submission" });
  }
});

// ---------- GET /api/timing/scheduled ----------
// Get all scheduled submissions for the user
router.get("/scheduled", auth, async (req, res) => {
  try {
    const { status, jobId } = req.query;

    let query = `
      SELECT 
        ss.*,
        j.title as job_title,
        j.company as job_company,
        j.industry as job_industry
      FROM scheduled_submissions ss
      JOIN jobs j ON j.id = ss.job_id
      WHERE ss.user_id = $1
    `;

    const params = [req.userId];
    let paramIndex = 2;

    // Exclude cancelled entries by default (unless specifically requested)
    if (!status) {
      query += ` AND ss.status != 'cancelled'`;
    } else if (status) {
      query += ` AND ss.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (jobId) {
      query += ` AND ss.job_id = $${paramIndex}`;
      params.push(jobId);
      paramIndex++;
    }

    query += ` ORDER BY ss.scheduled_date ASC, ss.scheduled_time ASC`;

    const result = await pool.query(query, params);

    const schedules = result.rows.map(row => {
      let formattedDate = '';
      let dayName = '';
      let isUpcoming = false;
      let isPast = false;
      
      try {
        const dateStr = row.scheduled_date;
        const timeStr = row.scheduled_time || '10:00:00';
        const dateTimeStr = `${dateStr}T${timeStr}`;
        const scheduledDateTime = new Date(dateTimeStr);
        
        if (!isNaN(scheduledDateTime.getTime())) {
          const now = new Date();
          isUpcoming = scheduledDateTime > now;
          isPast = scheduledDateTime < now && row.status === 'pending';
          
          formattedDate = scheduledDateTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York'
          });
          dayName = getDayName(scheduledDateTime.getDay());
        } else {
          // Fallback: try just the date
          const dateOnly = new Date(dateStr);
          if (!isNaN(dateOnly.getTime())) {
            formattedDate = dateOnly.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/New_York'
            });
            dayName = getDayName(dateOnly.getDay());
          } else {
            // Last resort: just show the date string
            formattedDate = dateStr || 'N/A';
          }
        }
      } catch (e) {
        // If all else fails, use the date string as-is
        formattedDate = row.scheduled_date || 'N/A';
      }

      return {
        ...row,
        is_upcoming: isUpcoming,
        is_past: isPast,
        formatted_date: formattedDate,
        formatted_time: formatHour(parseInt((row.scheduled_time || '10:00:00').split(':')[0])),
        day_name: dayName
      };
    });

    res.json({
      schedules: schedules
    });
  } catch (error) {
    console.error("❌ Error getting scheduled submissions:", error);
    res.status(500).json({ error: "Failed to get scheduled submissions" });
  }
});

// ---------- PUT /api/timing/schedule/:id ----------
// Update a scheduled submission
router.put("/schedule/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, timezone, notes, status } = req.body;

    // Verify schedule belongs to user
    const scheduleCheck = await pool.query(
      "SELECT * FROM scheduled_submissions WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Scheduled submission not found" });
    }

    const existingSchedule = scheduleCheck.rows[0];

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (scheduledDate !== undefined) {
      updates.push(`scheduled_date = $${paramIndex++}`);
      params.push(scheduledDate);
    }

    if (scheduledTime !== undefined) {
      updates.push(`scheduled_time = $${paramIndex++}`);
      params.push(scheduledTime);
    }

    if (timezone !== undefined) {
      updates.push(`scheduled_timezone = $${paramIndex++}`);
      params.push(timezone);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (status !== undefined) {
      if (!['pending', 'completed', 'cancelled', 'missed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(status);

      // If marking as completed, set completed_at AND record as submission
      if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
        
        // Also record this as an application submission for analytics
        try {
          const submissionTime = existingSchedule.completed_at || new Date();
          const tz = 'America/New_York';
          
          // Extract day of week and hour in EST
          const estTimeStr = submissionTime.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short',
            hour: '2-digit',
            hour12: false
          });
          
          const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
          const dayMatch = estTimeStr.match(/(\w{3})/);
          const dayOfWeek = dayMap[dayMatch ? dayMatch[1] : 'Sun'] || 0;
          
          const hourMatch = estTimeStr.match(/(\d{1,2}):/);
          const hourOfDay = hourMatch ? parseInt(hourMatch[1]) : submissionTime.getHours();
          
          // Get job info for industry, etc.
          const jobInfo = await pool.query(
            "SELECT industry, type FROM jobs WHERE id = $1",
            [existingSchedule.job_id]
          );
          const job = jobInfo.rows[0] || {};
          
          // Check if submission already exists for this job
          const existingSub = await pool.query(
            `SELECT id FROM application_submissions 
             WHERE job_id = $1 AND user_id = $2 
             ORDER BY submitted_at DESC LIMIT 1`,
            [existingSchedule.job_id, req.userId]
          );

          // Only insert if no submission exists for this job
          if (existingSub.rows.length === 0) {
            await pool.query(
              `INSERT INTO application_submissions (
                job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
                industry, company_size, job_type, is_remote
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                existingSchedule.job_id,
                req.userId,
                submissionTime,
                dayOfWeek,
                hourOfDay,
                tz,
                job.industry || null,
                null,
                job.type || null,
                false
              ]
            );
          }
        } catch (submissionError) {
          console.error("⚠️ Error recording submission from schedule:", submissionError);
          // Don't fail the whole request if submission recording fails
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id, req.userId);

    const query = `
      UPDATE scheduled_submissions
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error updating scheduled submission:", error);
    res.status(500).json({ error: "Failed to update scheduled submission" });
  }
});

// ---------- DELETE /api/timing/schedule/:id ----------
// Permanently delete a scheduled submission
router.delete("/schedule/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify schedule belongs to user
    const scheduleCheck = await pool.query(
      "SELECT id FROM scheduled_submissions WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Scheduled submission not found" });
    }

    // Permanently delete the record
    await pool.query(
      `DELETE FROM scheduled_submissions
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    res.json({
      success: true,
      message: "Scheduled submission deleted permanently"
    });
  } catch (error) {
    console.error("❌ Error cancelling scheduled submission:", error);
    res.status(500).json({ error: "Failed to cancel scheduled submission" });
  }
});

// ---------- GET /api/timing/analytics ----------
// Get comprehensive timing analytics for the user
router.get("/analytics", auth, async (req, res) => {
  try {
    // Get overall statistics
    const overallStats = await pool.query(
      `SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as total_responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as total_interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as total_offers
      FROM application_submissions
      WHERE user_id = $1`,
      [req.userId]
    );

    const stats = overallStats.rows[0];
    const totalSubmissions = parseInt(stats.total_submissions) || 0;
    const totalResponses = parseInt(stats.total_responses) || 0;
    const totalInterviews = parseInt(stats.total_interviews) || 0;
    const totalOffers = parseInt(stats.total_offers) || 0;

    const responseRate = totalSubmissions > 0 ? (totalResponses / totalSubmissions) : 0;
    const interviewRate = totalSubmissions > 0 ? (totalInterviews / totalSubmissions) : 0;
    const offerRate = totalSubmissions > 0 ? (totalOffers / totalSubmissions) : 0;

    res.json({
      summary: {
        total_submissions: totalSubmissions,
        total_responses: totalResponses,
        total_interviews: totalInterviews,
        total_offers: totalOffers,
        response_rate: responseRate,
        interview_rate: interviewRate,
        offer_rate: offerRate
      }
    });
  } catch (error) {
    console.error("❌ Error getting analytics:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

// ---------- GET /api/timing/response-rates ----------
// Get response rates by timing factors (day of week, hour of day, industry)
router.get("/response-rates", auth, async (req, res) => {
  try {
    const { groupBy = 'day' } = req.query; // 'day', 'hour', 'industry'

    let query;
    let chartData = [];

    if (groupBy === 'day') {
      query = `
        SELECT 
          day_of_week,
          COUNT(*) as total_submissions,
          SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
          SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
          SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
        FROM application_submissions
        WHERE user_id = $1
        GROUP BY day_of_week
        ORDER BY day_of_week
      `;

      const result = await pool.query(query, [req.userId]);
      chartData = result.rows.map(row => ({
        name: getDayName(row.day_of_week),
        day_of_week: row.day_of_week,
        total_submissions: parseInt(row.total_submissions),
        responses: parseInt(row.responses),
        interviews: parseInt(row.interviews),
        offers: parseInt(row.offers),
        response_rate: row.total_submissions > 0 
          ? (parseInt(row.responses) / parseInt(row.total_submissions))
          : 0,
        interview_rate: row.total_submissions > 0
          ? (parseInt(row.interviews) / parseInt(row.total_submissions))
          : 0,
        offer_rate: row.total_submissions > 0
          ? (parseInt(row.offers) / parseInt(row.total_submissions))
          : 0
      }));
    } else if (groupBy === 'hour') {
      query = `
        SELECT 
          hour_of_day,
          COUNT(*) as total_submissions,
          SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
          SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
          SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
        FROM application_submissions
        WHERE user_id = $1
        GROUP BY hour_of_day
        ORDER BY hour_of_day
      `;

      const result = await pool.query(query, [req.userId]);
      chartData = result.rows.map(row => ({
        name: formatHour(row.hour_of_day),
        hour_of_day: row.hour_of_day,
        total_submissions: parseInt(row.total_submissions),
        responses: parseInt(row.responses),
        interviews: parseInt(row.interviews),
        offers: parseInt(row.offers),
        response_rate: row.total_submissions > 0 
          ? (parseInt(row.responses) / parseInt(row.total_submissions))
          : 0,
        interview_rate: row.total_submissions > 0
          ? (parseInt(row.interviews) / parseInt(row.total_submissions))
          : 0,
        offer_rate: row.total_submissions > 0
          ? (parseInt(row.offers) / parseInt(row.total_submissions))
          : 0
      }));
    } else if (groupBy === 'industry') {
      query = `
        SELECT 
          COALESCE(industry, 'Unknown') as industry,
          COUNT(*) as total_submissions,
          SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
          SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
          SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
        FROM application_submissions
        WHERE user_id = $1
        GROUP BY industry
        ORDER BY total_submissions DESC
        LIMIT 10
      `;

      const result = await pool.query(query, [req.userId]);
      chartData = result.rows.map(row => ({
        name: row.industry || 'Unknown',
        industry: row.industry,
        total_submissions: parseInt(row.total_submissions),
        responses: parseInt(row.responses),
        interviews: parseInt(row.interviews),
        offers: parseInt(row.offers),
        response_rate: row.total_submissions > 0 
          ? (parseInt(row.responses) / parseInt(row.total_submissions))
          : 0,
        interview_rate: row.total_submissions > 0
          ? (parseInt(row.interviews) / parseInt(row.total_submissions))
          : 0,
        offer_rate: row.total_submissions > 0
          ? (parseInt(row.offers) / parseInt(row.total_submissions))
          : 0
      }));
    }

    res.json({
      group_by: groupBy,
      data: chartData
    });
  } catch (error) {
    console.error("❌ Error getting response rates:", error);
    res.status(500).json({ error: "Failed to get response rates" });
  }
});

// ---------- GET /api/timing/correlation ----------
// Get correlation data between timing and response success
router.get("/correlation", auth, async (req, res) => {
  try {
    // Get best performing time slots
    const bestSlots = await pool.query(
      `SELECT 
        day_of_week,
        hour_of_day,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1
      GROUP BY day_of_week, hour_of_day
      HAVING COUNT(*) >= 2
      ORDER BY 
        (SUM(CASE WHEN response_received THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) DESC,
        COUNT(*) DESC
      LIMIT 5`,
      [req.userId]
    );

    const topSlots = bestSlots.rows.map(row => ({
      day_of_week: row.day_of_week,
      hour_of_day: row.hour_of_day,
      day_name: getDayName(row.day_of_week),
      formatted_time: formatHour(row.hour_of_day),
      total_submissions: parseInt(row.total_submissions),
      responses: parseInt(row.responses),
      interviews: parseInt(row.interviews),
      offers: parseInt(row.offers),
      response_rate: row.total_submissions > 0 
        ? (parseInt(row.responses) / parseInt(row.total_submissions))
        : 0,
      interview_rate: row.total_submissions > 0
        ? (parseInt(row.interviews) / parseInt(row.total_submissions))
        : 0,
      offer_rate: row.total_submissions > 0
        ? (parseInt(row.offers) / parseInt(row.total_submissions))
        : 0,
      score: row.total_submissions > 0 
        ? ((parseInt(row.responses) / parseInt(row.total_submissions)) * 0.6 +
           (parseInt(row.interviews) / parseInt(row.total_submissions)) * 0.3 +
           (parseInt(row.offers) / parseInt(row.total_submissions)) * 0.1)
        : 0
    }));

    // Get worst performing time slots
    const worstSlots = await pool.query(
      `SELECT 
        day_of_week,
        hour_of_day,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1
      GROUP BY day_of_week, hour_of_day
      HAVING COUNT(*) >= 2
      ORDER BY 
        (SUM(CASE WHEN response_received THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) ASC,
        COUNT(*) DESC
      LIMIT 5`,
      [req.userId]
    );

    const bottomSlots = worstSlots.rows.map(row => ({
      day_of_week: row.day_of_week,
      hour_of_day: row.hour_of_day,
      day_name: getDayName(row.day_of_week),
      formatted_time: formatHour(row.hour_of_day),
      total_submissions: parseInt(row.total_submissions),
      responses: parseInt(row.responses),
      interviews: parseInt(row.interviews),
      offers: parseInt(row.offers),
      response_rate: row.total_submissions > 0 
        ? (parseInt(row.responses) / parseInt(row.total_submissions))
        : 0,
      interview_rate: row.total_submissions > 0
        ? (parseInt(row.interviews) / parseInt(row.total_submissions))
        : 0,
      offer_rate: row.total_submissions > 0
        ? (parseInt(row.offers) / parseInt(row.total_submissions))
        : 0,
      score: row.total_submissions > 0 
        ? ((parseInt(row.responses) / parseInt(row.total_submissions)) * 0.6 +
           (parseInt(row.interviews) / parseInt(row.total_submissions)) * 0.3 +
           (parseInt(row.offers) / parseInt(row.total_submissions)) * 0.1)
        : 0
    }));

    res.json({
      best_performing: topSlots,
      worst_performing: bottomSlots
    });
  } catch (error) {
    console.error("❌ Error getting correlation data:", error);
    res.status(500).json({ error: "Failed to get correlation data" });
  }
});

// ---------- HELPER: Calculate statistical significance (Chi-square test) ----------
function calculateStatisticalSignificance(variantA, variantB) {
  // Simplified chi-square test for response rates
  const nA = variantA.total_submissions || 0;
  const nB = variantB.total_submissions || 0;
  const rA = variantA.responses || 0;
  const rB = variantB.responses || 0;
  
  if (nA === 0 || nB === 0) {
    return {
      p_value: 1.0,
      confidence_level: 0,
      significant: false,
      effect_size: 0
    };
  }

  const pA = rA / nA;
  const pB = rB / nB;
  const pPooled = (rA + rB) / (nA + nB);
  
  // Calculate z-score
  const z = (pA - pB) / Math.sqrt(pPooled * (1 - pPooled) * (1/nA + 1/nB));
  
  // Approximate p-value (two-tailed test)
  // Using normal approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // Calculate effect size (Cohen's h)
  const effectSize = 2 * (Math.asin(Math.sqrt(pA)) - Math.asin(Math.sqrt(pB)));
  
  // Confidence level (1 - p-value)
  const confidenceLevel = Math.max(0, 1 - pValue);
  
  return {
    p_value: pValue,
    confidence_level: confidenceLevel,
    significant: pValue < 0.05, // 95% confidence
    effect_size: Math.abs(effectSize),
    z_score: z
  };
}

// ---------- HELPER: Normal CDF approximation ----------
function normalCDF(z) {
  // Approximation of standard normal CDF
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

// ---------- HELPER: Generate impact description ----------
function generateImpactDescription(variantA, variantB, stats) {
  const rateA = variantA.total_submissions > 0 
    ? (variantA.responses || 0) / variantA.total_submissions 
    : 0;
  const rateB = variantB.total_submissions > 0 
    ? (variantB.responses || 0) / variantB.total_submissions 
    : 0;

  if (rateA > rateB) {
    const improvement = ((rateA - rateB) / rateB) * 100;
    return `Variant A increases response rate by ${improvement.toFixed(1)}% compared to Variant B`;
  } else if (rateB > rateA) {
    const improvement = ((rateB - rateA) / rateA) * 100;
    return `Variant B increases response rate by ${improvement.toFixed(1)}% compared to Variant A`;
  } else {
    return "No significant difference between variants";
  }
}

// ---------- POST /api/timing/ab-test ----------
// Create or update an A/B test
router.post("/ab-test", auth, async (req, res) => {
  try {
    const { testType, testName, description, variantA, variantB, testId } = req.body;

    if (!testType || !variantA || !variantB) {
      return res.status(400).json({ error: "testType, variantA, and variantB are required" });
    }

    // Validate test type
    const validTestTypes = ['day_of_week', 'time_of_day', 'day_hour_combination', 'industry_specific'];
    if (!validTestTypes.includes(testType)) {
      return res.status(400).json({ error: "Invalid test type" });
    }

    // If testId provided, update existing test
    if (testId) {
      const existingTest = await pool.query(
        "SELECT * FROM timing_ab_tests WHERE id = $1 AND user_id = $2",
        [testId, req.userId]
      );

      if (existingTest.rows.length === 0) {
        return res.status(404).json({ error: "A/B test not found" });
      }

      // Recalculate results based on current submission data
      const resultsA = await calculateVariantResults(req.userId, variantA, testType);
      const resultsB = await calculateVariantResults(req.userId, variantB, testType);

      const stats = calculateStatisticalSignificance(resultsA, resultsB);
      
      // Calculate composite score for each variant (weighted: response_rate 50%, interview_rate 30%, offer_rate 20%)
      const scoreA = (resultsA.response_rate * 0.5) + (resultsA.interview_rate * 0.3) + (resultsA.offer_rate * 0.2);
      const scoreB = (resultsB.response_rate * 0.5) + (resultsB.interview_rate * 0.3) + (resultsB.offer_rate * 0.2);
      
      // Calculate absolute differences
      const responseRateDiff = Math.abs(resultsA.response_rate - resultsB.response_rate);
      const interviewRateDiff = Math.abs(resultsA.interview_rate - resultsB.interview_rate);
      const compositeScoreDiff = Math.abs(scoreA - scoreB);
      
      // Determine winner: Use composite score, but also consider large differences even if not statistically significant
      // A difference is considered "clear" if:
      // - Response rate difference > 20% OR
      // - Interview rate difference > 15% OR  
      // - Composite score difference > 0.15
      const hasClearDifference = responseRateDiff > 0.2 || interviewRateDiff > 0.15 || compositeScoreDiff > 0.15;
      
      let winner = 'inconclusive';
      if (stats.significant || hasClearDifference) {
        if (scoreA > scoreB) {
          winner = 'variant_a';
        } else if (scoreB > scoreA) {
          winner = 'variant_b';
        } else {
          // If composite scores are equal, use response_rate as tiebreaker
          winner = resultsA.response_rate > resultsB.response_rate ? 'variant_a' : 'variant_b';
        }
      }
      
      const impactDescription = generateImpactDescription(resultsA, resultsB, stats);

      // Ensure winner is not longer than 20 characters (database constraint)
      const safeWinner = winner && winner.length <= 20 ? winner : winner.substring(0, 20);
      
      const updateResult = await pool.query(
        `UPDATE timing_ab_tests
         SET results_a = $1, results_b = $2,
             statistical_significance = $3, confidence_level = $4,
             effect_size = $5, winner = $6, impact_description = $7,
             status = CASE WHEN $8 THEN 'completed' ELSE status END,
             completed_at = CASE WHEN $8 THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [
          JSON.stringify(resultsA),
          JSON.stringify(resultsB),
          stats.p_value,
          stats.confidence_level,
          stats.effect_size,
          safeWinner,
          impactDescription,
          stats.significant,
          testId,
          req.userId
        ]
      );

      return res.json({
        success: true,
        test: updateResult.rows[0],
        statistics: stats
      });
    }

    // Create new test
    const insertResult = await pool.query(
      `INSERT INTO timing_ab_tests (
        user_id, test_type, test_name, description, variant_a, variant_b, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        req.userId,
        testType,
        testName || `${testType} A/B Test`,
        description || null,
        JSON.stringify(variantA),
        JSON.stringify(variantB)
      ]
    );

    res.json({
      success: true,
      test: insertResult.rows[0],
      message: "A/B test created. Results will be calculated as you submit applications."
    });
  } catch (error) {
    console.error("❌ Error creating/updating A/B test:", error);
    res.status(500).json({ error: "Failed to create/update A/B test" });
  }
});

// ---------- HELPER: Calculate results for a variant ----------
async function calculateVariantResults(userId, variant, testType) {
  let query;
  const params = [userId];

  if (testType === 'day_of_week') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1 AND day_of_week = $2
    `;
    params.push(variant.day_of_week);
  } else if (testType === 'time_of_day') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1 AND hour_of_day = $2
    `;
    params.push(variant.hour_of_day);
  } else if (testType === 'day_hour_combination') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1 AND day_of_week = $2 AND hour_of_day = $3
    `;
    params.push(variant.day_of_week, variant.hour_of_day);
  } else if (testType === 'industry_specific') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE user_id = $1 AND industry = $2 AND day_of_week = $3
    `;
    params.push(variant.industry, variant.day_of_week);
  }

  const result = await pool.query(query, params);
  const row = result.rows[0] || {};

  return {
    total_submissions: parseInt(row.total_submissions) || 0,
    responses: parseInt(row.responses) || 0,
    interviews: parseInt(row.interviews) || 0,
    offers: parseInt(row.offers) || 0,
    response_rate: row.total_submissions > 0 
      ? (parseInt(row.responses) / parseInt(row.total_submissions))
      : 0,
    interview_rate: row.total_submissions > 0
      ? (parseInt(row.interviews) / parseInt(row.total_submissions))
      : 0,
    offer_rate: row.total_submissions > 0
      ? (parseInt(row.offers) / parseInt(row.total_submissions))
      : 0
  };
}

// ---------- HELPER: Calculate results for a variant (aggregate - all users) ----------
async function calculateVariantResultsAggregate(variant, testType) {
  let query;
  const params = [];

  if (testType === 'day_of_week') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE day_of_week = $1
    `;
    params.push(variant.day_of_week);
  } else if (testType === 'time_of_day') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE hour_of_day = $1
    `;
    params.push(variant.hour_of_day);
  } else if (testType === 'day_hour_combination') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE day_of_week = $1 AND hour_of_day = $2
    `;
    params.push(variant.day_of_week, variant.hour_of_day);
  } else if (testType === 'industry_specific') {
    query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN response_received THEN 1 ELSE 0 END) as responses,
        SUM(CASE WHEN response_type = 'interview' OR response_type = 'phone_screen' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN response_type = 'offer' THEN 1 ELSE 0 END) as offers
      FROM application_submissions
      WHERE industry = $1 AND day_of_week = $2
    `;
    params.push(variant.industry, variant.day_of_week);
  }

  try {
    const result = await pool.query(query, params);
    const row = result.rows[0] || {};
    
    return {
      total_submissions: parseInt(row.total_submissions) || 0,
      responses: parseInt(row.responses) || 0,
      interviews: parseInt(row.interviews) || 0,
      offers: parseInt(row.offers) || 0,
      response_rate: row.total_submissions > 0 
        ? (parseInt(row.responses) / parseInt(row.total_submissions))
        : 0,
      interview_rate: row.total_submissions > 0
        ? (parseInt(row.interviews) / parseInt(row.total_submissions))
        : 0,
      offer_rate: row.total_submissions > 0
        ? (parseInt(row.offers) / parseInt(row.total_submissions))
        : 0
    };
  } catch (error) {
    console.error("❌ Error calculating aggregate variant results:", error);
    return {
      total_submissions: 0,
      responses: 0,
      interviews: 0,
      offers: 0,
      response_rate: 0,
      interview_rate: 0,
      offer_rate: 0
    };
  }
}

// ---------- GET /api/timing/ab-tests ----------
// Get all A/B tests for the user
router.get("/ab-tests", auth, async (req, res) => {
  try {
    const { status, testType } = req.query;

    let query = `
      SELECT * FROM timing_ab_tests
      WHERE user_id = $1
    `;

    const params = [req.userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (testType) {
      query += ` AND test_type = $${paramIndex}`;
      params.push(testType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    // Calculate results for tests that don't have them yet
    const testsWithResults = await Promise.all(result.rows.map(async (row) => {
      const variantA = typeof row.variant_a === 'string' ? JSON.parse(row.variant_a) : row.variant_a;
      const variantB = typeof row.variant_b === 'string' ? JSON.parse(row.variant_b) : row.variant_b;
      let resultsA = row.results_a ? (typeof row.results_a === 'string' ? JSON.parse(row.results_a) : row.results_a) : null;
      let resultsB = row.results_b ? (typeof row.results_b === 'string' ? JSON.parse(row.results_b) : row.results_b) : null;
      
      // If results are missing, calculate them automatically
      if (!resultsA || !resultsB) {
        try {
          // Use aggregate data (all users) for A/B test calculations
          resultsA = await calculateVariantResultsAggregate(variantA, row.test_type);
          resultsB = await calculateVariantResultsAggregate(variantB, row.test_type);
          
          // Update the database with calculated results
          const stats = calculateStatisticalSignificance(resultsA, resultsB);
          
          // Calculate composite score for each variant (weighted: response_rate 50%, interview_rate 30%, offer_rate 20%)
          const scoreA = (resultsA.response_rate * 0.5) + (resultsA.interview_rate * 0.3) + (resultsA.offer_rate * 0.2);
          const scoreB = (resultsB.response_rate * 0.5) + (resultsB.interview_rate * 0.3) + (resultsB.offer_rate * 0.2);
          
          // Calculate absolute differences
          const responseRateDiff = Math.abs(resultsA.response_rate - resultsB.response_rate);
          const interviewRateDiff = Math.abs(resultsA.interview_rate - resultsB.interview_rate);
          const compositeScoreDiff = Math.abs(scoreA - scoreB);
          
          // Determine winner: Use composite score, but also consider large differences even if not statistically significant
          // A difference is considered "clear" if:
          // - Response rate difference > 20% OR
          // - Interview rate difference > 15% OR  
          // - Composite score difference > 0.15
          const hasClearDifference = responseRateDiff > 0.2 || interviewRateDiff > 0.15 || compositeScoreDiff > 0.15;
          
          let winner = 'inconclusive';
          if (stats.significant || hasClearDifference) {
            if (scoreA > scoreB) {
              winner = 'variant_a';
            } else if (scoreB > scoreA) {
              winner = 'variant_b';
            } else {
              // If composite scores are equal, use response_rate as tiebreaker
              winner = resultsA.response_rate > resultsB.response_rate ? 'variant_a' : 'variant_b';
            }
          }
          
          const impactDescription = generateImpactDescription(resultsA, resultsB, stats);
          
          // Ensure winner is not longer than 20 characters (database constraint)
          const safeWinner = winner && winner.length <= 20 ? winner : winner.substring(0, 20);
          
          await pool.query(
            `UPDATE timing_ab_tests
             SET results_a = $1, results_b = $2,
                 statistical_significance = $3, confidence_level = $4,
                 effect_size = $5, winner = $6, impact_description = $7,
                 updated_at = NOW()
             WHERE id = $8 AND user_id = $9`,
            [
              JSON.stringify(resultsA),
              JSON.stringify(resultsB),
              stats.p_value,
              stats.confidence_level,
              stats.effect_size,
              safeWinner,
              impactDescription,
              row.id,
              req.userId
            ]
          );
        } catch (e) {
          console.log("Could not calculate A/B test results:", e.message);
        }
      }

      // Format variant display names
      let variantAName = 'Variant A';
      let variantBName = 'Variant B';

      if (row.test_type === 'day_of_week') {
        variantAName = getDayName(variantA.day_of_week);
        variantBName = getDayName(variantB.day_of_week);
      } else if (row.test_type === 'time_of_day') {
        variantAName = formatHour(variantA.hour_of_day);
        variantBName = formatHour(variantB.hour_of_day);
      } else if (row.test_type === 'day_hour_combination') {
        variantAName = `${getDayName(variantA.day_of_week)} at ${formatHour(variantA.hour_of_day)}`;
        variantBName = `${getDayName(variantB.day_of_week)} at ${formatHour(variantB.hour_of_day)}`;
      } else if (row.test_type === 'industry_specific') {
        variantAName = `${variantA.industry} - ${getDayName(variantA.day_of_week)}`;
        variantBName = `${variantB.industry} - ${getDayName(variantB.day_of_week)}`;
      }

      return {
        ...row,
        variant_a_display: variantAName,
        variant_b_display: variantBName,
        variant_a_data: variantA,
        variant_b_data: variantB,
        results_a: resultsA,
        results_b: resultsB,
        // Ensure statistical_significance is a number
        statistical_significance: row.statistical_significance !== null && row.statistical_significance !== undefined 
          ? (typeof row.statistical_significance === 'number' ? row.statistical_significance : parseFloat(row.statistical_significance))
          : null,
        confidence_level: row.confidence_level !== null && row.confidence_level !== undefined
          ? (typeof row.confidence_level === 'number' ? row.confidence_level : parseFloat(row.confidence_level))
          : null,
        effect_size: row.effect_size !== null && row.effect_size !== undefined
          ? (typeof row.effect_size === 'number' ? row.effect_size : parseFloat(row.effect_size))
          : null
      };
    }));

    res.json({
      tests: testsWithResults
    });
  } catch (error) {
    console.error("❌ Error getting A/B tests:", error);
    res.status(500).json({ error: "Failed to get A/B tests" });
  }
});

export default router;

