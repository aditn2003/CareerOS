// backend/routes/timeInvestment.js
// UC-103: Time Investment and Productivity Analysis

import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";

const router = express.Router();

// ------------------------------
// HELPER: Analyze Activity Distribution
// ------------------------------
function analyzeActivityDistribution(jobs, networkingActivities, networkingEvents, interviews, manualActivities, mockInterviews, techPrep) {
  const activities = {
    applications: { count: 0, estimatedMinutes: 0 },
    interviews: { count: 0, estimatedMinutes: 0 },
    research: { count: 0, estimatedMinutes: 0 },
    networking: { count: 0, estimatedMinutes: 0 },
    events: { count: 0, estimatedMinutes: 0 },
    followups: { count: 0, estimatedMinutes: 0 },
    interviewPrep: { count: 0, estimatedMinutes: 0 },
    skillDevelopment: { count: 0, estimatedMinutes: 0 },
  };

  // Job applications - count ALL jobs (including Interested, as they represent time spent researching)
  // But prioritize actual applications (Applied, Interview, Offer, Rejected)
  jobs.forEach(job => {
    const status = (job.status || '').toLowerCase();
    if (status === 'applied' || status === 'interview' || status === 'offer' || status === 'rejected') {
      activities.applications.count++;
      activities.applications.estimatedMinutes += 30; // 30 min per application
    } else if (status === 'interested') {
      // Interested jobs count as research time
      activities.research.count++;
      activities.research.estimatedMinutes += 15; // 15 min research per interested job
    } else {
      // Any other status counts as application
      activities.applications.count++;
      activities.applications.estimatedMinutes += 30;
    }
  });

  // Interview outcomes from database
  interviews.forEach(interview => {
    activities.interviews.count++;
    const duration = interview.duration_minutes || 60;
    const prepTime = interview.hours_prepared ? interview.hours_prepared * 60 : 0;
    activities.interviews.estimatedMinutes += duration + prepTime;
  });

  // Networking activities with actual time_spent_minutes
  networkingActivities.forEach(activity => {
    const minutes = activity.time_spent_minutes || 15;
    
    if (activity.activity_type === 'follow_up') {
      activities.followups.count++;
      activities.followups.estimatedMinutes += minutes;
    } else {
      activities.networking.count++;
      activities.networking.estimatedMinutes += minutes;
    }
  });

  // Networking events - calculate duration from start/end time or estimate
  networkingEvents.forEach(event => {
    activities.events.count++;
    let durationMinutes = 120; // default 2 hours
    
    if (event.event_start_time && event.event_end_time) {
      // Calculate duration from time strings
      const start = event.event_start_time.split(':').map(Number);
      const end = event.event_end_time.split(':').map(Number);
      const startMinutes = (start[0] || 0) * 60 + (start[1] || 0);
      const endMinutes = (end[0] || 0) * 60 + (end[1] || 0);
      durationMinutes = Math.max(0, endMinutes - startMinutes);
    }
    
    activities.events.estimatedMinutes += durationMinutes;
  });

  // Mock interviews
  mockInterviews.forEach(mock => {
    activities.interviewPrep.count++;
    // Estimate 45 min per mock interview
    activities.interviewPrep.estimatedMinutes += 45;
  });

  // Technical prep sessions
  techPrep.forEach(session => {
    activities.skillDevelopment.count++;
    const seconds = session.time_spent_seconds || 0;
    activities.skillDevelopment.estimatedMinutes += Math.round(seconds / 60);
  });

  // Manual activities - use actual tracked time
  manualActivities.forEach(activity => {
    const minutes = activity.duration_minutes || 0;
    
    switch (activity.activity_type) {
      case 'application':
      case 'resume_update':
      case 'cover_letter':
        activities.applications.count++;
        activities.applications.estimatedMinutes += minutes;
        break;
      case 'research':
        activities.research.count++;
        activities.research.estimatedMinutes += minutes;
        break;
      case 'networking':
      case 'linkedin_optimization':
        activities.networking.count++;
        activities.networking.estimatedMinutes += minutes;
        break;
      case 'follow_up':
        activities.followups.count++;
        activities.followups.estimatedMinutes += minutes;
        break;
      case 'interview_prep':
      case 'mock_interview':
      case 'phone_screen':
      case 'interview':
        activities.interviewPrep.count++;
        activities.interviewPrep.estimatedMinutes += minutes;
        break;
      case 'coding_practice':
      case 'skill_learning':
      case 'portfolio_update':
        activities.skillDevelopment.count++;
        activities.skillDevelopment.estimatedMinutes += minutes;
        break;
      default:
        activities.networking.count++;
        activities.networking.estimatedMinutes += minutes;
    }
  });

  // Research (estimate based on company research or job notes)
  // Only add if we haven't already counted research from interested jobs
  const jobsWithNotes = jobs.filter(j => j.notes && j.notes.length > 50);
  if (jobsWithNotes.length > 0 && activities.research.count === 0) {
    activities.research.count = jobsWithNotes.length;
    activities.research.estimatedMinutes = jobsWithNotes.length * 20;
  }

  return activities;
}

// ------------------------------
// HELPER: Analyze Productivity Patterns
// ------------------------------
function analyzeProductivityPatterns(jobs, networkingActivities, manualActivities, applicationHistory, networkingEvents = []) {
  const hourlyActivity = Array(24).fill(0);
  const dailyActivity = Array(7).fill(0);
  const weeklyTrend = {};

  const allTimestamps = [];

  // Collect timestamps from jobs
  jobs.forEach(job => {
    const date = new Date(job.applied_on || job.created_at);
    if (!isNaN(date)) {
      // If the date is at midnight (00:00:00), distribute across reasonable hours
      // This prevents all jobs from clustering at midnight
      let hour = date.getHours();
      if (hour === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        // Distribute across business hours (9 AM - 5 PM) based on day of week
        const dayOfWeek = date.getDay();
        const hours = [9, 10, 11, 14, 15, 16]; // Morning and afternoon hours
        hour = hours[dayOfWeek % hours.length];
        const dateWithHour = new Date(date);
        dateWithHour.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        allTimestamps.push(dateWithHour);
      } else {
        allTimestamps.push(date);
      }
      hourlyActivity[hour]++;
      dailyActivity[date.getDay()]++;
      
      const weekKey = getWeekKey(date);
      weeklyTrend[weekKey] = (weeklyTrend[weekKey] || 0) + 1;
    }
  });

  // Collect timestamps from application history (status changes)
  applicationHistory.forEach(history => {
    const date = new Date(history.timestamp);
    if (!isNaN(date)) {
      allTimestamps.push(date);
      hourlyActivity[date.getHours()]++;
      dailyActivity[date.getDay()]++;
      
      const weekKey = getWeekKey(date);
      weeklyTrend[weekKey] = (weeklyTrend[weekKey] || 0) + 1;
    }
  });

  // Collect timestamps from networking
  networkingActivities.forEach(activity => {
    const date = new Date(activity.created_at);
    if (!isNaN(date)) {
      // If the date is at midnight, use a reasonable default hour
      let hour = date.getHours();
      if (hour === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        hour = 14; // Default to 2 PM for networking activities
        const dateWithHour = new Date(date);
        dateWithHour.setHours(hour, 0, 0, 0);
        allTimestamps.push(dateWithHour);
      } else {
        allTimestamps.push(date);
      }
      hourlyActivity[hour]++;
      dailyActivity[date.getDay()]++;
    }
  });

  // Collect timestamps from manual activities
  manualActivities.forEach(activity => {
    const date = new Date(activity.activity_date);
    if (!isNaN(date)) {
      let hour;
      // If start_time exists, use it for hour tracking
      if (activity.start_time) {
        const timeParts = activity.start_time.split(':');
        hour = parseInt(timeParts[0], 10);
        const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
        // Create date with correct hour and minutes
        const dateWithTime = new Date(date);
        dateWithTime.setHours(hour, minutes, 0, 0);
        allTimestamps.push(dateWithTime);
      } else {
        hour = 12; // Default to noon if no time specified
        const dateWithTime = new Date(date);
        dateWithTime.setHours(hour, 0, 0, 0);
        allTimestamps.push(dateWithTime);
      }
      
      hourlyActivity[hour]++;
      dailyActivity[date.getDay()]++;
      
      const weekKey = getWeekKey(date);
      weeklyTrend[weekKey] = (weeklyTrend[weekKey] || 0) + 1;
    }
  });

  // Find peak hours
  const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  const peakDay = dailyActivity.indexOf(Math.max(...dailyActivity));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Create heatmap data
  const heatmapData = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmapData.push({
        day: dayNames[day],
        dayIndex: day,
        hour,
        hourLabel: formatHour(hour),
        value: 0,
      });
    }
  }

  // Populate heatmap from all timestamps (now includes correct hours from manual activities)
  allTimestamps.forEach(date => {
    const dayIndex = date.getDay();
    const hour = date.getHours();
    const idx = heatmapData.findIndex(
      h => h.dayIndex === dayIndex && h.hour === hour
    );
    if (idx >= 0) {
      heatmapData[idx].value++;
    }
  });

  // Also add networking events to heatmap (use event_date with start_time)
  if (networkingEvents && networkingEvents.length > 0) {
    networkingEvents.forEach(event => {
      if (event.event_date) {
        const eventDate = new Date(event.event_date);
        if (!isNaN(eventDate)) {
          let hour = 12; // Default to noon
          if (event.event_start_time) {
            const timeParts = event.event_start_time.split(':');
            hour = parseInt(timeParts[0], 10) || 12;
          }
          
          const dayIndex = eventDate.getDay();
          const idx = heatmapData.findIndex(
            h => h.dayIndex === dayIndex && h.hour === hour
          );
          if (idx >= 0) {
            heatmapData[idx].value++;
            // Also add to allTimestamps for consistency
            const dateWithTime = new Date(eventDate);
            dateWithTime.setHours(hour, 0, 0, 0);
            allTimestamps.push(dateWithTime);
          }
        }
      }
    });
  }

  return {
    hourlyActivity: hourlyActivity.map((count, hour) => ({
      hour: formatHour(hour),
      hourNum: hour,
      activities: count,
    })),
    dailyActivity: dayNames.map((day, idx) => ({
      day,
      dayShort: day.slice(0, 3),
      activities: dailyActivity[idx],
    })),
    weeklyTrend: Object.entries(weeklyTrend)
      .map(([week, count]) => ({ week, activities: count }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12),
    peakHour: formatHour(peakHour),
    peakDay: dayNames[peakDay],
    heatmapData,
  };
}

function getWeekKey(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// ------------------------------
// HELPER: Calculate Task Completion & Efficiency
// ------------------------------
function calculateTaskCompletion(jobs, applicationHistory) {
  const funnel = {
    interested: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };

  const statusTimeline = [];

  jobs.forEach(job => {
    const status = (job.status || 'Interested').toLowerCase().trim();
    
    // Handle various status formats
    if (status === 'interested' || status === 'wishlist') {
      funnel.interested++;
    } else if (status === 'applied' || status === 'application submitted') {
      funnel.applied++;
    } else if (status === 'interview' || status === 'interviewing' || status === 'phone screen') {
      funnel.interview++;
    } else if (status === 'offer' || status === 'offer received' || status === 'accepted') {
      funnel.offer++;
    } else if (status === 'rejected' || status === 'rejection' || status === 'declined') {
      funnel.rejected++;
    } else {
      // Default: count as applied if status exists but doesn't match known values
      funnel.applied++;
    }

    // Track timeline
    if (job.applied_on && job.created_at) {
      const created = new Date(job.created_at);
      const applied = new Date(job.applied_on);
      const daysToApply = Math.max(0, Math.floor((applied - created) / (1000 * 60 * 60 * 24)));
      statusTimeline.push({ job: job.title, daysToApply });
    }
  });

  // Also check application_history for more accurate status tracking
  const statusCounts = {};
  applicationHistory.forEach(h => {
    if (h.to_status) {
      const status = h.to_status.toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  });

  const totalJobs = jobs.length || 1;
  
  // Conversion rates
  const applicationRate = ((funnel.applied + funnel.interview + funnel.offer) / totalJobs * 100).toFixed(1);
  const interviewRate = ((funnel.interview + funnel.offer) / Math.max(funnel.applied + funnel.interview + funnel.offer, 1) * 100).toFixed(1);
  const offerRate = (funnel.offer / Math.max(funnel.interview + funnel.offer, 1) * 100).toFixed(1);

  // Average time metrics
  const avgDaysToApply = statusTimeline.length > 0
    ? (statusTimeline.reduce((a, b) => a + b.daysToApply, 0) / statusTimeline.length).toFixed(1)
    : 0;

  return {
    funnel,
    funnelData: [
      { stage: 'Interested', count: funnel.interested, color: '#94a3b8' },
      { stage: 'Applied', count: funnel.applied, color: '#3b82f6' },
      { stage: 'Interview', count: funnel.interview, color: '#8b5cf6' },
      { stage: 'Offer', count: funnel.offer, color: '#22c55e' },
    ],
    conversionRates: {
      applicationRate: parseFloat(applicationRate),
      interviewRate: parseFloat(interviewRate),
      offerRate: parseFloat(offerRate),
    },
    avgDaysToApply: parseFloat(avgDaysToApply),
    totalCompleted: funnel.applied + funnel.interview + funnel.offer,
    totalPending: funnel.interested,
    statusChanges: Object.keys(statusCounts).length,
  };
}

// ------------------------------
// HELPER: Burnout Detection & Work-Life Balance
// ------------------------------
function analyzeBurnoutIndicators(jobs, networkingActivities, manualActivities) {
  const activityByDate = {};
  const allDates = [];

  // Collect all activity dates from jobs
  jobs.forEach(job => {
    const date = new Date(job.applied_on || job.created_at);
    if (!isNaN(date)) {
      const dateKey = date.toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      allDates.push(date);
    }
  });

  // From networking activities
  networkingActivities.forEach(activity => {
    const date = new Date(activity.created_at);
    if (!isNaN(date)) {
      const dateKey = date.toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      allDates.push(date);
    }
  });

  // From manual activities
  manualActivities.forEach(activity => {
    const date = new Date(activity.activity_date);
    if (!isNaN(date)) {
      const dateKey = date.toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      allDates.push(date);
    }
  });

  if (allDates.length === 0) {
    return {
      burnoutRisk: 'low',
      burnoutScore: 0,
      workLifeBalance: 'healthy',
      balanceScore: 100,
      indicators: [],
      streakData: { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 },
      gapAnalysis: { avgGapDays: 0, longestGap: 0 },
      weekendRatio: '0',
      daysSinceLastActivity: 0,
    };
  }

  // Sort dates
  allDates.sort((a, b) => a - b);
  const sortedDateKeys = Object.keys(activityByDate).sort();

  // Calculate activity gaps
  const gaps = [];
  for (let i = 1; i < sortedDateKeys.length; i++) {
    const prevDate = new Date(sortedDateKeys[i - 1]);
    const currDate = new Date(sortedDateKeys[i]);
    const gapDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    if (gapDays > 1) gaps.push(gapDays);
  }

  const avgGapDays = gaps.length > 0 
    ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) 
    : 0;
  const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDateKeys.length; i++) {
    const prevDate = new Date(sortedDateKeys[i - 1]);
    const currDate = new Date(sortedDateKeys[i]);
    const diff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if last activity was recent
  const lastActivityDate = new Date(sortedDateKeys[sortedDateKeys.length - 1]);
  const daysSinceLastActivity = Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24));
  currentStreak = daysSinceLastActivity <= 1 ? tempStreak : 0;

  // Calculate daily activity variance
  const dailyCounts = Object.values(activityByDate);
  const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;

  // Burnout indicators
  const indicators = [];
  let burnoutScore = 0;

  // Check for overwork
  const highActivityDays = dailyCounts.filter(c => c > 10).length;
  if (highActivityDays > 5) {
    indicators.push({ type: 'warning', message: 'High activity detected on multiple days - consider pacing yourself' });
    burnoutScore += 20;
  }

  // Check for long gaps (potential burnout recovery)
  if (longestGap > 14) {
    indicators.push({ type: 'info', message: `Extended break of ${longestGap} days detected - this could indicate burnout recovery` });
    burnoutScore += 15;
  }

  // Check recent activity decline
  const recentWeeks = sortedDateKeys.slice(-14);
  const olderWeeks = sortedDateKeys.slice(-28, -14);
  const recentAvg = recentWeeks.length > 0 ? recentWeeks.reduce((a, k) => a + activityByDate[k], 0) / recentWeeks.length : 0;
  const olderAvg = olderWeeks.length > 0 ? olderWeeks.reduce((a, k) => a + activityByDate[k], 0) / olderWeeks.length : 0;

  if (olderAvg > 0 && recentAvg < olderAvg * 0.5) {
    indicators.push({ type: 'warning', message: 'Activity has declined significantly recently' });
    burnoutScore += 25;
  }

  // Weekend work check
  const weekendActivity = allDates.filter(d => d.getDay() === 0 || d.getDay() === 6).length;
  const weekendRatio = weekendActivity / allDates.length;
  if (weekendRatio > 0.4) {
    indicators.push({ type: 'info', message: 'Significant weekend activity - ensure work-life balance' });
    burnoutScore += 10;
  }

  // Determine burnout risk level
  let burnoutRisk = 'low';
  if (burnoutScore >= 40) burnoutRisk = 'high';
  else if (burnoutScore >= 20) burnoutRisk = 'medium';

  // Work-life balance score (inverse of burnout)
  const balanceScore = Math.max(0, 100 - burnoutScore);
  let workLifeBalance = 'healthy';
  if (balanceScore < 60) workLifeBalance = 'needs attention';
  if (balanceScore < 40) workLifeBalance = 'at risk';

  return {
    burnoutRisk,
    burnoutScore,
    workLifeBalance,
    balanceScore,
    indicators,
    streakData: {
      currentStreak,
      longestStreak,
      totalActiveDays: sortedDateKeys.length,
    },
    gapAnalysis: {
      avgGapDays: parseFloat(avgGapDays),
      longestGap,
    },
    weekendRatio: (weekendRatio * 100).toFixed(1),
    daysSinceLastActivity,
  };
}

// ------------------------------
// HELPER: Generate Productivity Recommendations
// ------------------------------
function generateProductivityRecommendations(activityData, patterns, taskCompletion, burnoutData) {
  const recommendations = [];

  // Time optimization
  if (patterns.peakHour) {
    recommendations.push({
      type: 'timing',
      title: 'Optimal Working Hours',
      message: `Your most productive time is around ${patterns.peakHour}. Schedule important tasks during this window.`,
      priority: 'medium',
      icon: '🕐',
    });
  }

  if (patterns.peakDay) {
    recommendations.push({
      type: 'timing',
      title: 'Most Active Day',
      message: `${patterns.peakDay} is your most active day. Consider batching similar tasks on this day.`,
      priority: 'low',
      icon: '📅',
    });
  }

  // Task completion
  if (taskCompletion.totalPending > taskCompletion.totalCompleted) {
    recommendations.push({
      type: 'efficiency',
      title: 'Convert Interest to Action',
      message: `You have ${taskCompletion.totalPending} jobs marked as "Interested". Set daily goals to convert these to applications.`,
      priority: 'high',
      icon: '🎯',
    });
  }

  if (taskCompletion.conversionRates.interviewRate < 15) {
    recommendations.push({
      type: 'improvement',
      title: 'Improve Interview Rate',
      message: 'Your interview rate is below average. Consider spending more time tailoring applications.',
      priority: 'high',
      icon: '📈',
    });
  }

  // Burnout prevention
  if (burnoutData.burnoutRisk === 'high') {
    recommendations.push({
      type: 'wellness',
      title: 'Burnout Risk Detected',
      message: 'Your activity patterns suggest potential burnout. Consider taking scheduled breaks and setting boundaries.',
      priority: 'high',
      icon: '⚠️',
    });
  }

  if (burnoutData.daysSinceLastActivity > 7) {
    recommendations.push({
      type: 'activity',
      title: 'Resume Your Search',
      message: `It's been ${burnoutData.daysSinceLastActivity} days since your last activity. Small daily progress compounds over time.`,
      priority: 'high',
      icon: '🔄',
    });
  }

  if (parseFloat(burnoutData.weekendRatio) > 40) {
    recommendations.push({
      type: 'wellness',
      title: 'Protect Your Weekends',
      message: 'You\'re spending significant time on weekends. Try to batch activities during weekdays for better work-life balance.',
      priority: 'medium',
      icon: '🌴',
    });
  }

  // Activity balance
  const totalNetworking = activityData.networking.count + activityData.events.count;
  const totalApplications = activityData.applications.count;
  
  if (totalApplications > 0 && totalNetworking / totalApplications < 0.2) {
    recommendations.push({
      type: 'strategy',
      title: 'Increase Networking',
      message: 'Your networking-to-application ratio is low. Networking can lead to 40% higher offer rates.',
      priority: 'medium',
      icon: '🤝',
    });
  }

  if (activityData.research.count < activityData.applications.count * 0.3) {
    recommendations.push({
      type: 'strategy',
      title: 'Research More Companies',
      message: 'Spend more time researching companies before applying. Quality over quantity often wins.',
      priority: 'medium',
      icon: '🔍',
    });
  }

  // Streak motivation
  if (burnoutData.streakData.currentStreak > 5) {
    recommendations.push({
      type: 'motivation',
      title: 'Great Momentum!',
      message: `You're on a ${burnoutData.streakData.currentStreak}-day streak! Keep it up, but remember to rest.`,
      priority: 'low',
      icon: '🔥',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ------------------------------
// HELPER: Calculate Productivity Score
// ------------------------------
function calculateProductivityScore(activityData, taskCompletion, burnoutData, patterns) {
  let score = 50; // Base score

  // Activity volume bonus
  const totalActivities = Object.values(activityData).reduce((a, b) => a + b.count, 0);
  if (totalActivities > 50) score += 10;
  if (totalActivities > 100) score += 5;

  // Conversion rate bonus
  if (taskCompletion.conversionRates.interviewRate > 20) score += 10;
  if (taskCompletion.conversionRates.offerRate > 30) score += 10;

  // Consistency bonus
  if (burnoutData.streakData.currentStreak > 7) score += 5;
  if (burnoutData.streakData.longestStreak > 14) score += 5;

  // Work-life balance adjustment
  if (burnoutData.balanceScore > 70) score += 5;
  if (burnoutData.balanceScore < 40) score -= 10;

  // Activity diversity bonus
  const activeCategories = Object.values(activityData).filter(a => a.count > 0).length;
  if (activeCategories >= 4) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ------------------------------
// HELPER: Infer Energy Levels
// ------------------------------
function inferEnergyLevels(patterns, manualActivities) {
  const energyLevels = [];
  const hourlyData = patterns.hourlyActivity;

  // Morning (6 AM - 12 PM)
  const morningActivity = hourlyData.filter(h => h.hourNum >= 6 && h.hourNum < 12)
    .reduce((a, b) => a + b.activities, 0);
  
  // Afternoon (12 PM - 6 PM)
  const afternoonActivity = hourlyData.filter(h => h.hourNum >= 12 && h.hourNum < 18)
    .reduce((a, b) => a + b.activities, 0);
  
  // Evening (6 PM - 10 PM)
  const eveningActivity = hourlyData.filter(h => h.hourNum >= 18 && h.hourNum < 22)
    .reduce((a, b) => a + b.activities, 0);
  
  // Night (10 PM - 6 AM)
  const nightActivity = hourlyData.filter(h => h.hourNum >= 22 || h.hourNum < 6)
    .reduce((a, b) => a + b.activities, 0);

  // Also consider manual activity energy ratings
  let avgEnergy = 3; // Default middle
  const energyRatings = manualActivities.filter(a => a.energy_level).map(a => a.energy_level);
  if (energyRatings.length > 0) {
    avgEnergy = energyRatings.reduce((a, b) => a + b, 0) / energyRatings.length;
  }

  const total = morningActivity + afternoonActivity + eveningActivity + nightActivity || 1;

  energyLevels.push({ period: 'Morning', time: '6 AM - 12 PM', activity: morningActivity, percentage: Math.round(morningActivity / total * 100) });
  energyLevels.push({ period: 'Afternoon', time: '12 PM - 6 PM', activity: afternoonActivity, percentage: Math.round(afternoonActivity / total * 100) });
  energyLevels.push({ period: 'Evening', time: '6 PM - 10 PM', activity: eveningActivity, percentage: Math.round(eveningActivity / total * 100) });
  energyLevels.push({ period: 'Night', time: '10 PM - 6 AM', activity: nightActivity, percentage: Math.round(nightActivity / total * 100) });

  // Determine peak energy period
  const peakPeriod = energyLevels.reduce((a, b) => a.activity > b.activity ? a : b);

  return {
    byPeriod: energyLevels,
    peakPeriod: peakPeriod.period,
    peakTime: peakPeriod.time,
    chronotype: peakPeriod.period === 'Morning' ? 'Early Bird' : 
                peakPeriod.period === 'Evening' || peakPeriod.period === 'Night' ? 'Night Owl' : 'Day Worker',
    avgEnergyLevel: avgEnergy.toFixed(1),
  };
}

// Helper to format minutes to readable time
function formatTime(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// ------------------------------
// GET /api/time-investment
// ------------------------------
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1️⃣ Fetch Jobs
    const jobsRes = await pool.query(
      `SELECT id, title, company, status, notes, applied_on, created_at, status_updated_at
       FROM jobs WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    const jobs = jobsRes.rows || [];
    console.log(`📊 Time Investment: Fetched ${jobs.length} jobs for user ${userId}`);

    // 2️⃣ Fetch Application History (status changes)
    let applicationHistory = [];
    try {
      const historyRes = await pool.query(
        `SELECT id, job_id, event, timestamp, from_status, to_status
         FROM application_history WHERE user_id = $1
         ORDER BY timestamp DESC`,
        [userId]
      );
      applicationHistory = historyRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch application history:", e.message);
    }

    // 3️⃣ Fetch Networking Activities
    let networkingActivities = [];
    try {
      const activitiesRes = await pool.query(
        `SELECT id, activity_type, time_spent_minutes, created_at
         FROM networking_activities WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      networkingActivities = activitiesRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch networking activities:", e.message);
    }

    // 4️⃣ Fetch Networking Events
    let networkingEvents = [];
    try {
      const eventsRes = await pool.query(
        `SELECT id, event_name, event_date, event_start_time, event_end_time, created_at
         FROM networking_events WHERE user_id = $1
         ORDER BY event_date DESC`,
        [userId]
      );
      networkingEvents = eventsRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch networking events:", e.message);
    }

    // 5️⃣ Fetch Interview Outcomes
    let interviews = [];
    try {
      const interviewsRes = await pool.query(
        `SELECT id, company, role, interview_date, interview_type, duration_minutes, 
                hours_prepared, outcome, created_at
         FROM interview_outcomes WHERE user_id = $1
         ORDER BY interview_date DESC`,
        [userId]
      );
      interviews = interviewsRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch interview outcomes:", e.message);
    }

    // 6️⃣ Fetch Manual Activities (job_search_activities)
    let manualActivities = [];
    try {
      const manualRes = await pool.query(
        `SELECT id, activity_type, title, duration_minutes, activity_date, 
                start_time, end_time, energy_level, productivity_rating, created_at
         FROM job_search_activities WHERE user_id = $1
         ORDER BY activity_date DESC, created_at DESC`,
        [userId]
      );
      manualActivities = manualRes.rows || [];
      console.log(`📊 Time Investment: Fetched ${manualActivities.length} manual activities`);
    } catch (e) {
      console.warn("⚠️ Could not fetch manual activities (table may not exist):", e.message);
      console.warn("💡 Run migration: psql $DATABASE_URL -f backend/db/add_job_search_activities.sql");
    }

    // 7️⃣ Fetch Mock Interview Sessions
    let mockInterviews = [];
    try {
      const mockRes = await pool.query(
        `SELECT id, company, role, status, created_at, completed_at
         FROM mock_interview_sessions WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      mockInterviews = mockRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch mock interviews:", e.message);
    }

    // 8️⃣ Fetch Technical Prep Sessions
    let techPrep = [];
    try {
      const techRes = await pool.query(
        `SELECT id, prep_type, status, time_spent_seconds, created_at, completed_at
         FROM technical_prep_sessions WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      techPrep = techRes.rows || [];
    } catch (e) {
      console.warn("⚠️ Could not fetch technical prep sessions:", e.message);
    }

    // ------------------------------
    // ANALYTICS (UC-103)
    // ------------------------------

    // Activity Distribution
    const activityDistribution = analyzeActivityDistribution(
      jobs, networkingActivities, networkingEvents, interviews, 
      manualActivities, mockInterviews, techPrep
    );
    
    // Productivity Patterns
    const productivityPatterns = analyzeProductivityPatterns(
      jobs, networkingActivities, manualActivities, applicationHistory, networkingEvents
    );
    
    // Debug heatmap data
    const heatmapSample = productivityPatterns.heatmapData
      .filter(h => h.value > 0)
      .slice(0, 10);
    console.log(`📊 Heatmap Sample (first 10 with activity):`, heatmapSample);
    console.log(`📊 Total heatmap cells with activity: ${productivityPatterns.heatmapData.filter(h => h.value > 0).length}`);
    
    console.log(`📊 Time Investment Analytics:
      - Jobs: ${jobs.length}
      - Applications: ${activityDistribution.applications.count} (${activityDistribution.applications.estimatedMinutes} min)
      - Interviews: ${activityDistribution.interviews.count} (${activityDistribution.interviews.estimatedMinutes} min)
      - Networking: ${activityDistribution.networking.count} (${activityDistribution.networking.estimatedMinutes} min)
      - Events: ${activityDistribution.events.count} (${activityDistribution.events.estimatedMinutes} min)
      - Research: ${activityDistribution.research.count} (${activityDistribution.research.estimatedMinutes} min)
      - Manual Activities: ${manualActivities.length}
      - Total Time: ${Object.values(activityDistribution).reduce((a, b) => a + b.estimatedMinutes, 0)} min
    `);

    // Task Completion & Efficiency
    const taskCompletion = calculateTaskCompletion(jobs, applicationHistory);

    // Burnout & Work-Life Balance
    const burnoutAnalysis = analyzeBurnoutIndicators(jobs, networkingActivities, manualActivities);

    // Energy Levels (inferred from patterns + manual ratings)
    const energyLevels = inferEnergyLevels(productivityPatterns, manualActivities);

    // Productivity Score
    const productivityScore = calculateProductivityScore(
      activityDistribution,
      taskCompletion,
      burnoutAnalysis,
      productivityPatterns
    );

    // Recommendations
    const recommendations = generateProductivityRecommendations(
      activityDistribution,
      productivityPatterns,
      taskCompletion,
      burnoutAnalysis
    );

    // ------------------------------
    // SUMMARY STATS
    // ------------------------------
    const totalTimeInvested = Object.values(activityDistribution)
      .reduce((a, b) => a + b.estimatedMinutes, 0);

    const totalActivities = Object.values(activityDistribution)
      .reduce((a, b) => a + b.count, 0);

    const activeDays = burnoutAnalysis.streakData.totalActiveDays;
    const avgDailyTime = activeDays > 0 ? Math.round(totalTimeInvested / activeDays) : 0;

    // Activity distribution for pie chart
    const activityPieData = Object.entries(activityDistribution)
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'),
        value: data.estimatedMinutes,
        count: data.count,
      }));

    // Recent manual activities for display
    const recentActivities = manualActivities.slice(0, 10);

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.json({
      // Summary KPIs
      summary: {
        totalTimeInvested,
        totalTimeFormatted: formatTime(totalTimeInvested),
        totalActivities,
        activeDays,
        avgDailyTime,
        avgDailyFormatted: formatTime(avgDailyTime),
        productivityScore,
      },

      // Activity Distribution
      activityDistribution,
      activityPieData,

      // Productivity Patterns
      productivityPatterns,
      energyLevels,

      // Task Completion
      taskCompletion,

      // Burnout & Balance
      burnoutAnalysis,

      // Recommendations
      recommendations,

      // Recent manual activities
      recentActivities,

      // Raw counts for transparency
      dataSources: {
        jobs: jobs.length,
        applicationHistory: applicationHistory.length,
        networkingActivities: networkingActivities.length,
        networkingEvents: networkingEvents.length,
        interviews: interviews.length,
        manualActivities: manualActivities.length,
        mockInterviews: mockInterviews.length,
        techPrep: techPrep.length,
      },
    });

  } catch (err) {
    console.error("❌ Time Investment Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// POST /api/time-investment/activities - Log manual activity
// ------------------------------
router.post("/activities", auth, async (req, res) => {
  const userId = req.user.id;
  const {
    activity_type,
    title,
    description,
    company,
    job_title,
    duration_minutes,
    activity_date,
    start_time,
    end_time,
    energy_level,
    productivity_rating,
    notes,
    tags,
  } = req.body;

  if (!activity_type) {
    return res.status(400).json({ error: "Activity type is required" });
  }

  if (!duration_minutes || duration_minutes < 1) {
    return res.status(400).json({ error: "Duration must be at least 1 minute" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO job_search_activities 
       (user_id, activity_type, title, description, company, job_title, 
        duration_minutes, activity_date, start_time, end_time, 
        energy_level, productivity_rating, notes, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId,
        activity_type,
        title || null,
        description || null,
        company || null,
        job_title || null,
        duration_minutes,
        activity_date || new Date().toISOString().split('T')[0],
        start_time || null,
        end_time || null,
        energy_level || null,
        productivity_rating || null,
        notes || null,
        tags || null,
      ]
    );

    res.status(201).json({
      message: "Activity logged successfully",
      activity: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error logging activity:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

// ------------------------------
// GET /api/time-investment/activities - Get user's manual activities
// ------------------------------
router.get("/activities", auth, async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0, activity_type, start_date, end_date } = req.query;

  try {
    let query = `SELECT * FROM job_search_activities WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (activity_type) {
      query += ` AND activity_type = $${paramIndex}`;
      params.push(activity_type);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND activity_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND activity_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ` ORDER BY activity_date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM job_search_activities WHERE user_id = $1`;
    const countParams = [userId];
    if (activity_type) {
      countQuery += ` AND activity_type = $2`;
      countParams.push(activity_type);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("❌ Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ------------------------------
// PUT /api/time-investment/activities/:id - Update activity
// ------------------------------
router.put("/activities/:id", auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const updates = req.body;

  try {
    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM job_search_activities WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const allowedFields = [
      'activity_type', 'title', 'description', 'company', 'job_title',
      'duration_minutes', 'activity_date', 'start_time', 'end_time',
      'energy_level', 'productivity_rating', 'notes', 'tags', 'is_completed'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE job_search_activities 
       SET ${setClause.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({
      message: "Activity updated successfully",
      activity: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating activity:", err);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

// ------------------------------
// DELETE /api/time-investment/activities/:id - Delete activity
// ------------------------------
router.delete("/activities/:id", auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM job_search_activities WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting activity:", err);
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

// ------------------------------
// GET /api/time-investment/activity-types - Get activity type options
// ------------------------------
router.get("/activity-types", auth, (req, res) => {
  const activityTypes = [
    { value: 'application', label: 'Job Application', icon: '📝', category: 'Applications' },
    { value: 'resume_update', label: 'Resume Update', icon: '📄', category: 'Applications' },
    { value: 'cover_letter', label: 'Cover Letter Writing', icon: '✉️', category: 'Applications' },
    { value: 'research', label: 'Company Research', icon: '🔍', category: 'Research' },
    { value: 'networking', label: 'Networking', icon: '🤝', category: 'Networking' },
    { value: 'linkedin_optimization', label: 'LinkedIn Optimization', icon: '💼', category: 'Networking' },
    { value: 'follow_up', label: 'Follow-up', icon: '📧', category: 'Networking' },
    { value: 'interview_prep', label: 'Interview Preparation', icon: '🎯', category: 'Interviews' },
    { value: 'mock_interview', label: 'Mock Interview', icon: '🎭', category: 'Interviews' },
    { value: 'phone_screen', label: 'Phone Screen', icon: '📞', category: 'Interviews' },
    { value: 'interview', label: 'Interview', icon: '💬', category: 'Interviews' },
    { value: 'coding_practice', label: 'Coding Practice', icon: '💻', category: 'Skills' },
    { value: 'skill_learning', label: 'Skill Learning', icon: '📚', category: 'Skills' },
    { value: 'portfolio_update', label: 'Portfolio Update', icon: '🎨', category: 'Skills' },
    { value: 'salary_negotiation', label: 'Salary Negotiation', icon: '💰', category: 'Other' },
    { value: 'other', label: 'Other', icon: '📌', category: 'Other' },
  ];

  res.json({ activityTypes });
});

export default router;
