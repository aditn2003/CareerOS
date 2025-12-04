// backend/routes/customReports.js
// UC-106: Custom Report Generation

import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";
import PDFDocument from "pdfkit";

const router = express.Router();

// ------------------------------
// REPORT TEMPLATES
// ------------------------------
const REPORT_TEMPLATES = {
  'comprehensive': {
    name: 'Comprehensive Job Search Report',
    description: 'Complete analysis with all analytics and insights from your database',
    metrics: ['totalApplications', 'successRate', 'interviewRate', 'offerRate', 'industryBreakdown', 'industrySuccessRates', 'conversionFunnel', 'timeline', 'peakTiming', 'responseTimes', 'customizationImpact'],
    comprehensive: true,
  },
  'overview': {
    name: 'Job Search Overview',
    description: 'Comprehensive overview of your job search performance',
    metrics: ['totalApplications', 'successRate', 'offerRate', 'industryBreakdown', 'timeline'],
  },
  'performance': {
    name: 'Performance Analysis',
    description: 'Detailed performance metrics and trends',
    metrics: ['successRate', 'interviewRate', 'offerRate', 'conversionFunnel', 'timeline'],
  },
  'industry': {
    name: 'Industry Analysis',
    description: 'Performance breakdown by industry',
    metrics: ['industryBreakdown', 'industrySuccessRates', 'timeline'],
  },
  'timing': {
    name: 'Timing Analysis',
    description: 'Optimal timing patterns for applications',
    metrics: ['peakTiming', 'responseTimes', 'timeline'],
  },
  'strategy': {
    name: 'Strategy Effectiveness',
    description: 'Analysis of different strategies and their impact',
    metrics: ['customizationImpact', 'timeline', 'responseTimes'],
  },
};

// ------------------------------
// HELPER: Fetch Filtered Jobs
// ------------------------------
async function fetchFilteredJobs(userId, filters) {
  // Exclude archived jobs
  let query = `SELECT * FROM jobs WHERE user_id = $1 AND ("isarchived" = false OR "isarchived" IS NULL)`;
  const params = [userId];
  let paramIndex = 2;

  if (filters.dateRange) {
    if (filters.dateRange.start) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateRange.start);
      paramIndex++;
    }
    if (filters.dateRange.end) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateRange.end);
      paramIndex++;
    }
  }

  if (filters.companies && filters.companies.length > 0) {
    query += ` AND company = ANY($${paramIndex})`;
    params.push(filters.companies);
    paramIndex++;
  }

  if (filters.industries && filters.industries.length > 0) {
    query += ` AND industry = ANY($${paramIndex})`;
    params.push(filters.industries);
    paramIndex++;
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query += ` AND status = ANY($${paramIndex})`;
    params.push(filters.statuses);
    paramIndex++;
  }

  if (filters.roles && filters.roles.length > 0) {
    // Filter by job titles/roles (case-insensitive partial match)
    const roleConditions = filters.roles.map((_, idx) => 
      `LOWER(title) LIKE LOWER($${paramIndex + idx})`
    ).join(' OR ');
    query += ` AND (${roleConditions})`;
    filters.roles.forEach(role => {
      params.push(`%${role}%`);
    });
    paramIndex += filters.roles.length;
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

// ------------------------------
// HELPER: Calculate Metrics
// ------------------------------
function calculateMetrics(jobs, selectedMetrics) {
  const metrics = {};

  // Only count actual applications (exclude 'Interested' status)
  const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
  const successful = actualApplications.filter(j => j.status === 'Interview' || j.status === 'Offer');
  const offers = actualApplications.filter(j => j.status === 'Offer');

  if (selectedMetrics.includes('totalApplications')) {
    metrics.totalApplications = actualApplications.length;
  }

  if (selectedMetrics.includes('successRate') || selectedMetrics.includes('interviewRate')) {
    const interviews = successful.length;
    metrics.interviewRate = actualApplications.length > 0 ? parseFloat(((interviews / actualApplications.length) * 100).toFixed(1)) : 0;
    metrics.successRate = metrics.interviewRate;
  }

  if (selectedMetrics.includes('offerRate')) {
    const offerCount = offers.length;
    metrics.offerRate = actualApplications.length > 0 ? parseFloat(((offerCount / actualApplications.length) * 100).toFixed(1)) : 0;
  }

  if (selectedMetrics.includes('industryBreakdown')) {
    const industryCounts = {};
    actualApplications.forEach(job => {
      const industry = (job.industry && job.industry.trim() !== '') ? job.industry.trim() : 'Unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });
    metrics.industryBreakdown = Object.entries(industryCounts)
      .filter(([industry]) => industry !== 'Unknown') // Filter out Unknown if there are real industries
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  }

  if (selectedMetrics.includes('industrySuccessRates')) {
    const industryStats = {};
    actualApplications.forEach(job => {
      const industry = (job.industry && job.industry.trim() !== '') ? job.industry.trim() : 'Unknown';
      if (!industryStats[industry]) {
        industryStats[industry] = { total: 0, success: 0, offers: 0 };
      }
      industryStats[industry].total++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        industryStats[industry].success++;
      }
      if (job.status === 'Offer') {
        industryStats[industry].offers++;
      }
    });
    metrics.industrySuccessRates = Object.entries(industryStats)
      .filter(([industry]) => industry !== 'Unknown') // Filter out Unknown if there are real industries
      .map(([industry, stats]) => ({
        industry,
        total: stats.total,
        successRate: stats.total > 0 ? parseFloat(((stats.success / stats.total) * 100).toFixed(1)) : 0,
        offerRate: stats.total > 0 ? parseFloat(((stats.offers / stats.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
  }

  if (selectedMetrics.includes('conversionFunnel')) {
    // Count all jobs for funnel (including Interested for complete picture)
    metrics.conversionFunnel = {
      interested: jobs.filter(j => j.status === 'Interested').length,
      applied: actualApplications.filter(j => j.status === 'Applied' || j.status !== 'Interested').length,
      interview: actualApplications.filter(j => j.status === 'Interview').length,
      offer: actualApplications.filter(j => j.status === 'Offer').length,
      rejected: actualApplications.filter(j => j.status === 'Rejected').length,
    };
  }

  if (selectedMetrics.includes('timeline')) {
    const monthlyData = {};
    const weeklyData = {};
    actualApplications.forEach(job => {
      const date = new Date(job.applied_on || job.created_at);
      if (isNaN(date.getTime())) return;
      
      // Monthly aggregation
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { applications: 0, interviews: 0, offers: 0, rejected: 0 };
      }
      monthlyData[monthKey].applications++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        monthlyData[monthKey].interviews++;
      }
      if (job.status === 'Offer') {
        monthlyData[monthKey].offers++;
      }
      if (job.status === 'Rejected') {
        monthlyData[monthKey].rejected++;
      }

      // Weekly aggregation (for more granular trends)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + (weekStart.getDay() === 0 ? -6 : 1)) / 7)).padStart(2, '0')}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { applications: 0, interviews: 0, offers: 0 };
      }
      weeklyData[weekKey].applications++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        weeklyData[weekKey].interviews++;
      }
      if (job.status === 'Offer') {
        weeklyData[weekKey].offers++;
      }
    });
    metrics.timeline = {
      monthly: Object.entries(monthlyData)
        .map(([month, data]) => ({ 
          month, 
          ...data,
          successRate: data.applications > 0 ? parseFloat(((data.interviews / data.applications) * 100).toFixed(1)) : 0,
          offerRate: data.applications > 0 ? parseFloat(((data.offers / data.applications) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      weekly: Object.entries(weeklyData)
        .map(([week, data]) => ({ week, ...data }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-12), // Last 12 weeks
    };
  }

  if (selectedMetrics.includes('peakTiming')) {
    const hourlyCounts = Array(24).fill(0);
    const dailyCounts = Array(7).fill(0);
    
    actualApplications.forEach(job => {
      const date = new Date(job.applied_on || job.created_at);
      if (!isNaN(date.getTime())) {
        hourlyCounts[date.getHours()]++;
        dailyCounts[date.getDay()]++;
      }
    });

    const maxHourCount = Math.max(...hourlyCounts);
    const maxDayCount = Math.max(...dailyCounts);
    const peakHour = maxHourCount > 0 ? hourlyCounts.indexOf(maxHourCount) : null;
    const peakDay = maxDayCount > 0 ? dailyCounts.indexOf(maxDayCount) : null;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    metrics.peakTiming = {
      hour: peakHour !== null ? `${peakHour}:00` : null,
      day: peakDay !== null ? dayNames[peakDay] : null,
    };
  }

  if (selectedMetrics.includes('responseTimes')) {
    const responseTimes = [];
    actualApplications.forEach(job => {
      if (job.status_updated_at && (job.applied_on || job.created_at)) {
        const applied = new Date(job.applied_on || job.created_at);
        const updated = new Date(job.status_updated_at);
        if (!isNaN(applied.getTime()) && !isNaN(updated.getTime())) {
          const days = Math.floor((updated - applied) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 90) {
            responseTimes.push(days);
          }
        }
      }
    });
    if (responseTimes.length > 0) {
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      metrics.responseTimes = {
        average: Math.round(avg),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
      };
    }
  }

  if (selectedMetrics.includes('customizationImpact')) {
    const customStats = {
      none: { total: 0, success: 0 },
      light: { total: 0, success: 0 },
      heavy: { total: 0, success: 0 },
      tailored: { total: 0, success: 0 },
    };

    actualApplications.forEach(job => {
      const level = job.resume_customization || 'none';
      customStats[level].total++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        customStats[level].success++;
      }
    });

    metrics.customizationImpact = Object.entries(customStats)
      .filter(([_, stats]) => stats.total > 0) // Only include levels with data
      .map(([level, stats]) => ({
        level,
        total: stats.total,
        successRate: stats.total > 0 ? parseFloat(((stats.success / stats.total) * 100).toFixed(1)) : 0,
      }));
  }

  return metrics;
}

// ------------------------------
// HELPER: Generate Insights (Enhanced)
// ------------------------------
function generateInsights(metrics, jobs, comprehensiveData = {}) {
  const insights = [];

  if (metrics.successRate && parseFloat(metrics.successRate) > 20) {
    insights.push({
      type: 'positive',
      title: 'Strong Interview Rate',
      message: `Your interview rate of ${metrics.successRate}% is above average. Keep up the excellent work!`,
    });
  } else if (metrics.successRate && parseFloat(metrics.successRate) < 10) {
    insights.push({
      type: 'warning',
      title: 'Low Interview Rate',
      message: `Your interview rate of ${metrics.successRate}% is below average. Consider tailoring applications more specifically.`,
    });
  }

  if (metrics.industrySuccessRates && metrics.industrySuccessRates.length > 0) {
    const topIndustry = metrics.industrySuccessRates[0];
    if (parseFloat(topIndustry.successRate) > 30) {
      insights.push({
        type: 'recommendation',
        title: 'Focus on High-Success Industries',
        message: `You have a ${topIndustry.successRate}% success rate in ${topIndustry.industry}. Consider prioritizing similar opportunities.`,
      });
    }
  }

  if (metrics.customizationImpact && metrics.customizationImpact.length > 0) {
    const bestLevel = metrics.customizationImpact.reduce((best, current) =>
      parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best
    );
    if (bestLevel && bestLevel.level !== 'none' && parseFloat(bestLevel.successRate) > 20) {
      insights.push({
        type: 'recommendation',
        title: 'Customization Impact',
        message: `${bestLevel.level.charAt(0).toUpperCase() + bestLevel.level.slice(1)} customization shows ${bestLevel.successRate}% success rate.`,
      });
    }
  }

  if (metrics.peakTiming && metrics.peakTiming.day) {
    insights.push({
      type: 'insight',
      title: 'Optimal Application Timing',
      message: `Your most successful applications were submitted on ${metrics.peakTiming.day}${metrics.peakTiming.hour ? ` around ${metrics.peakTiming.hour}` : ''}.`,
    });
  }

  // Comprehensive insights
  if (comprehensiveData.interviewOutcomes && comprehensiveData.interviewOutcomes.length > 0) {
    const avgPrep = metrics.interviewDetails?.averagePreparation;
    if (avgPrep && parseFloat(avgPrep) > 0) {
      insights.push({
        type: 'insight',
        title: 'Interview Preparation',
        message: `You average ${avgPrep} hours of preparation per interview. ${parseFloat(avgPrep) >= 5 ? 'Excellent preparation level!' : 'Consider increasing preparation time for better outcomes.'}`,
      });
    }
  }

  if (comprehensiveData.skills && comprehensiveData.skills.length > 0) {
    const expertSkills = comprehensiveData.skills.filter(s => s.proficiency === 'Expert').length;
    if (expertSkills > 0) {
      insights.push({
        type: 'positive',
        title: 'Skill Profile',
        message: `You have ${expertSkills} expert-level skills. Highlight these in your applications!`,
      });
    }
  }

  if (metrics.conversionFunnel) {
    const funnel = metrics.conversionFunnel;
    const interviewToOfferRate = funnel.interview > 0 
      ? ((funnel.offer / funnel.interview) * 100).toFixed(1) 
      : 0;
    if (parseFloat(interviewToOfferRate) > 30) {
      insights.push({
        type: 'positive',
        title: 'Strong Interview Performance',
        message: `You convert ${interviewToOfferRate}% of interviews to offers - well above average!`,
      });
    }
  }

  return insights;
}

// ------------------------------
// HELPER: Generate PDF Report (Professional)
// ------------------------------
function generatePDFReport(reportData, res) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="job-search-report-${Date.now()}.pdf"`);
  
  doc.pipe(res);

  // Professional Header
  doc.fillColor('#1e40af')
     .fontSize(26)
     .font('Helvetica-Bold')
     .text(reportData.title || 'Job Search Analytics Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#6b7280')
     .fontSize(10)
     .font('Helvetica')
     .text(`Generated: ${new Date(reportData.generatedAt || Date.now()).toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // Executive Summary - Professional Format
  if (reportData.summary) {
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('EXECUTIVE SUMMARY', { underline: true });
    doc.moveDown(0.8);
    
    const summaryY = doc.y;
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold');
    
    // Key Metrics Grid - Show actual data
    doc.text('Total Applications:', 50, summaryY);
    doc.font('Helvetica')
       .text(`${reportData.summary.totalApplications || 0}`, 250, summaryY);
    
    if (reportData.summary.totalInterested > 0) {
      doc.font('Helvetica-Bold')
         .text('Interested (Not Applied):', 50, summaryY + 18);
      doc.font('Helvetica')
         .text(`${reportData.summary.totalInterested}`, 250, summaryY + 18);
    }
    
    doc.font('Helvetica-Bold')
       .text('Interview Rate:', 50, summaryY + (reportData.summary.totalInterested > 0 ? 36 : 18));
    doc.font('Helvetica')
       .text(`${reportData.summary.interviewRate || 0}%`, 250, summaryY + (reportData.summary.totalInterested > 0 ? 36 : 18));
    
    doc.font('Helvetica-Bold')
       .text('Offer Rate:', 50, summaryY + (reportData.summary.totalInterested > 0 ? 54 : 36));
    doc.font('Helvetica')
       .text(`${reportData.summary.offerRate || 0}%`, 250, summaryY + (reportData.summary.totalInterested > 0 ? 54 : 36));
    
    if (reportData.summary.totalInterviews > 0) {
      doc.font('Helvetica-Bold')
         .text('Total Interviews:', 50, summaryY + (reportData.summary.totalInterested > 0 ? 72 : 54));
      doc.font('Helvetica')
         .text(`${reportData.summary.totalInterviews}`, 250, summaryY + (reportData.summary.totalInterested > 0 ? 72 : 54));
    }
    
    if (reportData.summary.totalOffers > 0) {
      doc.font('Helvetica-Bold')
         .text('Total Offers:', 50, summaryY + (reportData.summary.totalInterested > 0 ? 90 : 72));
      doc.font('Helvetica')
         .text(`${reportData.summary.totalOffers}`, 250, summaryY + (reportData.summary.totalInterested > 0 ? 90 : 72));
    }
    
    if (reportData.summary.totalRejected > 0) {
      doc.font('Helvetica-Bold')
         .text('Total Rejected:', 50, summaryY + (reportData.summary.totalInterested > 0 ? 108 : 90));
      doc.font('Helvetica')
         .text(`${reportData.summary.totalRejected}`, 250, summaryY + (reportData.summary.totalInterested > 0 ? 108 : 90));
    }
    
    doc.y = summaryY + (reportData.summary.totalInterested > 0 ? 130 : 110);
    doc.moveDown(1.2);
  }

  // Market Intelligence Analytics
  if (reportData.analyticsByTab && reportData.analyticsByTab.marketIntelligence) {
    if (doc.y > 650) doc.addPage();
    const mi = reportData.analyticsByTab.marketIntelligence;
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('MARKET INTELLIGENCE', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    // Conversion Funnel
    if (reportData.metrics && reportData.metrics.conversionFunnel) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Application Funnel', { underline: true });
      doc.fontSize(11)
         .font('Helvetica');
      const funnel = reportData.metrics.conversionFunnel;
      const total = funnel.interested + funnel.applied + funnel.interview + funnel.offer + funnel.rejected;
      const funnelY = doc.y;
      
      if (total > 0) {
        doc.text(`Interested:`, 50, funnelY + 5);
        doc.text(`${funnel.interested} (${((funnel.interested / total) * 100).toFixed(1)}%)`, 200, funnelY + 5);
        doc.text(`Applied:`, 50, funnelY + 20);
        doc.text(`${funnel.applied} (${((funnel.applied / total) * 100).toFixed(1)}%)`, 200, funnelY + 20);
        doc.text(`Interview:`, 50, funnelY + 35);
        doc.text(`${funnel.interview} (${((funnel.interview / total) * 100).toFixed(1)}%)`, 200, funnelY + 35);
        doc.text(`Offer:`, 50, funnelY + 50);
        doc.text(`${funnel.offer} (${((funnel.offer / total) * 100).toFixed(1)}%)`, 200, funnelY + 50);
        doc.text(`Rejected:`, 50, funnelY + 65);
        doc.text(`${funnel.rejected} (${((funnel.rejected / total) * 100).toFixed(1)}%)`, 200, funnelY + 65);
      }
      doc.y = funnelY + 80;
      doc.moveDown(1);
    }
    
    // Industry Performance
    if (mi.industryPerformance && mi.industryPerformance.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Industry Performance', { underline: true });
      doc.fontSize(10)
         .font('Helvetica');
      mi.industryPerformance.slice(0, 10).forEach((item, idx) => {
        if (doc.y > 700) doc.addPage();
        doc.text(`${idx + 1}. ${item.industry}: ${item.total} apps | Interview: ${item.interviewRate}% | Offer: ${item.offerRate}% | Rejection: ${item.rejectionRate}%`, { indent: 20 });
      });
      doc.moveDown(1);
    }
  }

  // Interview Analysis
  if (reportData.analyticsByTab && reportData.analyticsByTab.interviewAnalysis) {
    if (doc.y > 650) doc.addPage();
    const ia = reportData.analyticsByTab.interviewAnalysis;
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('INTERVIEW ANALYSIS', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    doc.text(`Total Interviews: ${ia.totalInterviews}`, { indent: 20 });
    if (ia.averagePreparationHours) {
      doc.text(`Average Preparation: ${ia.averagePreparationHours} hours`, { indent: 20 });
    }
    if (ia.averageSelfRating) {
      doc.text(`Average Self-Rating: ${ia.averageSelfRating}/5`, { indent: 20 });
    }
    if (ia.byType && Object.keys(ia.byType).length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(10)
         .text('By Interview Type:', { indent: 20 });
      Object.entries(ia.byType).forEach(([type, count]) => {
        doc.text(`  • ${type}: ${count}`, { indent: 30 });
      });
    }
    doc.moveDown(1);
  }

  // Networking Analysis
  if (reportData.analyticsByTab && reportData.analyticsByTab.networkingAnalysis) {
    if (doc.y > 650) doc.addPage();
    const na = reportData.analyticsByTab.networkingAnalysis;
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('NETWORKING ANALYSIS', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    doc.text(`Total Activities: ${na.totalActivities}`, { indent: 20 });
    if (na.totalTimeHours) {
      doc.text(`Total Time Invested: ${na.totalTimeHours} hours`, { indent: 20 });
    }
    if (na.byType && Object.keys(na.byType).length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(10)
         .text('Activity Breakdown:', { indent: 20 });
      Object.entries(na.byType).slice(0, 10).forEach(([type, count]) => {
        doc.text(`  • ${type}: ${count}`, { indent: 30 });
      });
    }
    doc.moveDown(1);
  }

  // Skills Profile
  if (reportData.analyticsByTab && reportData.analyticsByTab.skillsProfile) {
    if (doc.y > 650) doc.addPage();
    const sp = reportData.analyticsByTab.skillsProfile;
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('SKILLS PROFILE', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    doc.text(`Total Skills: ${sp.totalSkills}`, { indent: 20 });
    if (sp.byCategory && Object.keys(sp.byCategory).length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(10)
         .text('By Category:', { indent: 20 });
      Object.entries(sp.byCategory).forEach(([cat, count]) => {
        doc.text(`  • ${cat}: ${count}`, { indent: 30 });
      });
    }
    if (sp.byProficiency && Object.keys(sp.byProficiency).length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(10)
         .text('By Proficiency:', { indent: 20 });
      Object.entries(sp.byProficiency).forEach(([prof, count]) => {
        doc.text(`  • ${prof}: ${count}`, { indent: 30 });
      });
    }
    doc.moveDown(1);
  }

  // Time Investment
  if (reportData.analyticsByTab && reportData.analyticsByTab.timeInvestment) {
    if (doc.y > 650) doc.addPage();
    const ti = reportData.analyticsByTab.timeInvestment;
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('TIME INVESTMENT', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    doc.text(`Total Activities: ${ti.totalActivities}`, { indent: 20 });
    if (ti.totalHours) {
      doc.text(`Total Hours: ${ti.totalHours}`, { indent: 20 });
    }
    if (ti.byType && Object.keys(ti.byType).length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(10)
         .text('Activity Distribution:', { indent: 20 });
      Object.entries(ti.byType).slice(0, 10).forEach(([type, count]) => {
        doc.text(`  • ${type}: ${count}`, { indent: 30 });
      });
    }
    doc.moveDown(1);
  }

  // Timeline Trends
  if (reportData.metrics && reportData.metrics.timeline && reportData.metrics.timeline.monthly) {
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('TIMELINE TRENDS', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');
    
    reportData.metrics.timeline.monthly.slice(-12).forEach((item) => {
      if (doc.y > 700) doc.addPage();
      doc.text(`${item.month}: ${item.applications} apps | ${item.interviews} interviews | ${item.offers} offers | ${item.successRate}% success`, { indent: 20 });
    });
    doc.moveDown(1);
  }

  // Key Insights & Recommendations
  if (reportData.insights && reportData.insights.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('KEY INSIGHTS & RECOMMENDATIONS', { underline: true });
    doc.moveDown(0.6);
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');
    
    reportData.insights.forEach((insight) => {
      if (doc.y > 700) doc.addPage();
      doc.font('Helvetica-Bold')
         .text(`${insight.title}`, { indent: 20 });
      doc.font('Helvetica')
         .text(`${insight.message}`, { indent: 30 });
      doc.moveDown(0.6);
    });
  }

  // Professional Footer
  doc.addPage();
  doc.fillColor('#6b7280')
     .fontSize(9)
     .font('Helvetica')
     .text('Job Search Analytics Platform - Comprehensive Report', 50, doc.page.height - 50, { align: 'center' });
  doc.text(`Report Generated: ${new Date(reportData.generatedAt || Date.now()).toLocaleString()}`, 50, doc.page.height - 35, { align: 'center' });

  doc.end();
}

// ------------------------------
// HELPER: Generate CSV/Excel Report (Enhanced)
// ------------------------------
function generateCSVReport(reportData, res) {
  let csv = `Job Search Report: ${reportData.title || 'Custom Report'}\n`;
  csv += `Generated: ${new Date(reportData.generatedAt || Date.now()).toLocaleString()}\n\n`;

  // Filters
  if (reportData.filters && Object.keys(reportData.filters).length > 0) {
    csv += '# Report Filters\n';
    if (reportData.filters.dateRange) {
      csv += `Date Range Start,${reportData.filters.dateRange.start || 'All'}\n`;
      csv += `Date Range End,${reportData.filters.dateRange.end || 'All'}\n`;
    }
    if (reportData.filters.companies && reportData.filters.companies.length > 0) {
      csv += `Companies,${reportData.filters.companies.join('; ')}\n`;
    }
    if (reportData.filters.industries && reportData.filters.industries.length > 0) {
      csv += `Industries,${reportData.filters.industries.join('; ')}\n`;
    }
    if (reportData.filters.roles && reportData.filters.roles.length > 0) {
      csv += `Roles,${reportData.filters.roles.join('; ')}\n`;
    }
    csv += '\n';
  }

  // Summary
  if (reportData.summary) {
    csv += '# Executive Summary\n';
    csv += 'Metric,Value\n';
    csv += `Total Applications,${reportData.summary.totalApplications || 0}\n`;
    csv += `Success Rate,${reportData.summary.successRate || 0}%\n`;
    csv += `Offer Rate,${reportData.summary.offerRate || 0}%\n\n`;
  }

  // Conversion Funnel
  if (reportData.metrics && reportData.metrics.conversionFunnel) {
    csv += '# Conversion Funnel\n';
    csv += 'Stage,Count,Percentage\n';
    const funnel = reportData.metrics.conversionFunnel;
    const total = funnel.interested + funnel.applied + funnel.interview + funnel.offer + funnel.rejected;
    if (total > 0) {
      csv += `Interested,${funnel.interested},${((funnel.interested / total) * 100).toFixed(1)}%\n`;
      csv += `Applied,${funnel.applied},${((funnel.applied / total) * 100).toFixed(1)}%\n`;
      csv += `Interview,${funnel.interview},${((funnel.interview / total) * 100).toFixed(1)}%\n`;
      csv += `Offer,${funnel.offer},${((funnel.offer / total) * 100).toFixed(1)}%\n`;
      csv += `Rejected,${funnel.rejected},${((funnel.rejected / total) * 100).toFixed(1)}%\n\n`;
    }
  }

  // Industry Breakdown
  if (reportData.metrics && reportData.metrics.industryBreakdown && reportData.metrics.industryBreakdown.length > 0) {
    csv += '# Industry Breakdown\n';
    csv += 'Industry,Application Count,Percentage\n';
    const totalApps = reportData.summary.totalApplications || 1;
    reportData.metrics.industryBreakdown.forEach(item => {
      csv += `${item.industry},${item.count},${((item.count / totalApps) * 100).toFixed(1)}%\n`;
    });
    csv += '\n';
  }

  // Industry Success Rates
  if (reportData.metrics && reportData.metrics.industrySuccessRates && reportData.metrics.industrySuccessRates.length > 0) {
    csv += '# Industry Success Rates\n';
    csv += 'Industry,Total Applications,Interviews,Offers,Success Rate,Offer Rate\n';
    reportData.metrics.industrySuccessRates.forEach(item => {
      csv += `${item.industry},${item.total},${item.success || 0},${item.offers || 0},${item.successRate}%,${item.offerRate}%\n`;
    });
    csv += '\n';
  }

  // Timeline Trends
  if (reportData.metrics && reportData.metrics.timeline && reportData.metrics.timeline.monthly) {
    csv += '# Timeline Trends (Monthly)\n';
    csv += 'Month,Applications,Interviews,Offers,Success Rate,Offer Rate\n';
    reportData.metrics.timeline.monthly.forEach(item => {
      csv += `${item.month},${item.applications},${item.interviews},${item.offers},${item.successRate}%,${item.offerRate}%\n`;
    });
    csv += '\n';
  }

  // Customization Impact
  if (reportData.metrics && reportData.metrics.customizationImpact && reportData.metrics.customizationImpact.length > 0) {
    csv += '# Customization Impact\n';
    csv += 'Customization Level,Total Applications,Successful Applications,Success Rate\n';
    reportData.metrics.customizationImpact.forEach(item => {
      csv += `${item.level},${item.total},${item.success || 0},${item.successRate}%\n`;
    });
    csv += '\n';
  }

  // Peak Timing
  if (reportData.metrics && reportData.metrics.peakTiming) {
    csv += '# Optimal Timing\n';
    csv += 'Metric,Value\n';
    if (reportData.metrics.peakTiming.day) {
      csv += `Best Day,${reportData.metrics.peakTiming.day}\n`;
    }
    if (reportData.metrics.peakTiming.hour) {
      csv += `Best Hour,${reportData.metrics.peakTiming.hour}\n`;
    }
    csv += '\n';
  }

  // Response Times
  if (reportData.metrics && reportData.metrics.responseTimes) {
    csv += '# Response Times\n';
    csv += 'Metric,Days\n';
    csv += `Average Response Time,${reportData.metrics.responseTimes.average}\n`;
    csv += `Minimum Response Time,${reportData.metrics.responseTimes.min}\n`;
    csv += `Maximum Response Time,${reportData.metrics.responseTimes.max}\n\n`;
  }

  // Insights & Recommendations
  if (reportData.insights && reportData.insights.length > 0) {
    csv += '# Insights & Recommendations\n';
    csv += 'Type,Title,Message\n';
    reportData.insights.forEach(insight => {
      csv += `${insight.type},${insight.title},"${insight.message}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="job-search-report-${Date.now()}.csv"`);
  res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
}

// ------------------------------
// GET /api/custom-reports/templates
// ------------------------------
router.get("/templates", auth, async (req, res) => {
  try {
    return res.json({
      templates: Object.entries(REPORT_TEMPLATES).map(([id, template]) => ({
        id,
        ...template,
      })),
    });
  } catch (err) {
    console.error("❌ Custom Reports Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// POST /api/custom-reports/generate
// ------------------------------
router.post("/generate", auth, async (req, res) => {
  const userId = req.user.id;
  const {
    title,
    template,
    metrics = [],
    filters = {},
    format = 'json', // json, pdf, csv
    includeInsights = true,
    comprehensive = false, // New flag for comprehensive report
  } = req.body;

  try {
    // Determine if this is a comprehensive report
    const isComprehensive = comprehensive || (template === 'comprehensive');
    
    // For comprehensive reports, fetch ALL data and calculate ALL metrics
    let selectedMetrics = metrics;
    if (isComprehensive) {
      // Include ALL available metrics for comprehensive report
      selectedMetrics = [
        'totalApplications', 'successRate', 'interviewRate', 'offerRate',
        'industryBreakdown', 'industrySuccessRates', 'conversionFunnel',
        'timeline', 'peakTiming', 'responseTimes', 'customizationImpact'
      ];
    } else if (template && REPORT_TEMPLATES[template]) {
      selectedMetrics = REPORT_TEMPLATES[template].metrics;
    }

    if (selectedMetrics.length === 0 && !isComprehensive) {
      return res.status(400).json({ error: 'No metrics selected' });
    }

    // For comprehensive reports, fetch ALL data regardless of filters
    // For custom reports, apply filters
    console.log(`📊 Custom Report Generation for user ${userId}:`);
    console.log(`  - Comprehensive mode: ${isComprehensive}`);
    console.log(`  - Filters received:`, JSON.stringify(filters, null, 2));
    
    // For comprehensive reports, ignore filters and get ALL data
    let jobs;
    if (isComprehensive) {
      // Fetch ALL non-archived jobs for comprehensive report
      const allJobsRes = await pool.query(
        `SELECT * FROM jobs 
         WHERE user_id = $1 
           AND ("isarchived" = false OR "isarchived" IS NULL)
         ORDER BY created_at DESC`,
        [userId]
      );
      jobs = allJobsRes.rows;
      console.log(`  - Comprehensive: Fetched ALL ${jobs.length} jobs (filters ignored)`);
    } else {
      // Apply filters for custom reports
      jobs = await fetchFilteredJobs(userId, filters || {});
      console.log(`  - Filtered: Fetched ${jobs.length} jobs with filters`);
    }
    
    if (jobs.length === 0) {
      return res.status(400).json({ 
        error: 'No job data found. Please add jobs to generate a report.',
        debug: { userId, totalJobs: 0 }
      });
    }
    
    // Only count actual applications (exclude 'Interested' status)
    const actualApplications = jobs.filter(j => j.status && j.status !== 'Interested');
    
    console.log(`  - Total jobs: ${jobs.length}`);
    console.log(`  - Actual applications (excluding 'Interested'): ${actualApplications.length}`);
    console.log(`  - Selected metrics: ${selectedMetrics.join(', ')}`);

    // For comprehensive reports, fetch ALL analytics data from all tabs
    let comprehensiveData = {};
    if (isComprehensive) {
      try {
        // 1. Interview Outcomes
        const interviewOutcomesRes = await pool.query(
          `SELECT * FROM interview_outcomes WHERE user_id = $1 ORDER BY interview_date DESC`,
          [userId]
        );
        comprehensiveData.interviewOutcomes = interviewOutcomesRes.rows;

        // 2. Networking Data
        const networkingStatsRes = await pool.query(
          `SELECT * FROM networking_statistics WHERE user_id = $1`,
          [userId]
        );
        comprehensiveData.networkingStats = networkingStatsRes.rows[0] || {};
        
        const networkingActivitiesRes = await pool.query(
          `SELECT activity_type, channel, outcome, time_spent_minutes, created_at
           FROM networking_activities WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        comprehensiveData.networkingActivities = networkingActivitiesRes.rows;

        // 3. Skills Profile
        const skillsRes = await pool.query(
          `SELECT name, category, proficiency FROM skills WHERE user_id = $1`,
          [userId]
        );
        comprehensiveData.skills = skillsRes.rows;

        // 4. Certifications
        const certsRes = await pool.query(
          `SELECT name, organization, category, date_earned FROM certifications WHERE user_id = $1 ORDER BY date_earned DESC`,
          [userId]
        );
        comprehensiveData.certifications = certsRes.rows;

        // 5. Employment History
        const employmentRes = await pool.query(
          `SELECT title, company, start_date, end_date, current FROM employment WHERE user_id = $1 ORDER BY start_date DESC`,
          [userId]
        );
        comprehensiveData.employment = employmentRes.rows;

        // 6. Offers
        const offersRes = await pool.query(
          `SELECT * FROM offers WHERE user_id = $1 ORDER BY offer_date DESC`,
          [userId]
        );
        comprehensiveData.offers = offersRes.rows;

        // 7. Application History
        const appHistoryRes = await pool.query(
          `SELECT * FROM application_history WHERE user_id = $1 ORDER BY timestamp DESC`,
          [userId]
        );
        comprehensiveData.applicationHistory = appHistoryRes.rows;

        // 8. Time Investment Activities
        const timeActivitiesRes = await pool.query(
          `SELECT activity_type, duration_minutes, created_at 
           FROM job_search_activities WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        comprehensiveData.timeActivities = timeActivitiesRes.rows;

        console.log(`  - Comprehensive data fetched:`);
        console.log(`    - Interviews: ${comprehensiveData.interviewOutcomes.length}`);
        console.log(`    - Networking Activities: ${comprehensiveData.networkingActivities.length}`);
        console.log(`    - Skills: ${comprehensiveData.skills.length}`);
        console.log(`    - Certifications: ${comprehensiveData.certifications.length}`);
        console.log(`    - Employment: ${comprehensiveData.employment.length}`);
        console.log(`    - Offers: ${comprehensiveData.offers.length}`);
      } catch (err) {
        console.error('Error fetching comprehensive data:', err);
      }
    } else if (selectedMetrics.length > 5) {
      // For large metric sets, fetch basic additional data
      try {
        const interviewOutcomesRes = await pool.query(
          `SELECT * FROM interview_outcomes WHERE user_id = $1 ORDER BY interview_date DESC`,
          [userId]
        );
        comprehensiveData.interviewOutcomes = interviewOutcomesRes.rows;

        const skillsRes = await pool.query(
          `SELECT name, category, proficiency FROM skills WHERE user_id = $1`,
          [userId]
        );
        comprehensiveData.skills = skillsRes.rows;
      } catch (err) {
        console.error('Error fetching additional data:', err);
      }
    }

    // Calculate metrics
    const calculatedMetrics = calculateMetrics(jobs, selectedMetrics);

    // Add comprehensive analytics if available
    if (comprehensiveData.interviewOutcomes) {
      calculatedMetrics.interviewDetails = {
        total: comprehensiveData.interviewOutcomes.length,
        byType: {},
        averagePreparation: 0,
        averageRating: 0,
      };
      
      let totalPrep = 0;
      let totalRating = 0;
      let ratingCount = 0;
      
      comprehensiveData.interviewOutcomes.forEach(io => {
        calculatedMetrics.interviewDetails.byType[io.interview_type] = 
          (calculatedMetrics.interviewDetails.byType[io.interview_type] || 0) + 1;
        if (io.hours_prepared) {
          totalPrep += parseFloat(io.hours_prepared);
        }
        if (io.self_rating) {
          totalRating += parseInt(io.self_rating);
          ratingCount++;
        }
      });
      
      if (comprehensiveData.interviewOutcomes.length > 0) {
        calculatedMetrics.interviewDetails.averagePreparation = 
          (totalPrep / comprehensiveData.interviewOutcomes.length).toFixed(1);
      }
      if (ratingCount > 0) {
        calculatedMetrics.interviewDetails.averageRating = 
          (totalRating / ratingCount).toFixed(1);
      }
    }

    if (comprehensiveData.skills) {
      calculatedMetrics.skillsProfile = {
        total: comprehensiveData.skills.length,
        byCategory: {},
        byProficiency: {},
      };
      
      comprehensiveData.skills.forEach(skill => {
        calculatedMetrics.skillsProfile.byCategory[skill.category] = 
          (calculatedMetrics.skillsProfile.byCategory[skill.category] || 0) + 1;
        calculatedMetrics.skillsProfile.byProficiency[skill.proficiency] = 
          (calculatedMetrics.skillsProfile.byProficiency[skill.proficiency] || 0) + 1;
      });
    }

    // Generate insights
    const insights = includeInsights ? generateInsights(calculatedMetrics, jobs, comprehensiveData) : [];

    // Calculate comprehensive analytics from all tabs
    let analyticsByTab = {};
    if (isComprehensive) {
      // Market Intelligence Analytics
      const statusCounts = {};
      jobs.forEach(job => {
        const status = job.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const industryStats = {};
      actualApplications.forEach(job => {
        const industry = job.industry || 'Unknown';
        if (!industryStats[industry]) {
          industryStats[industry] = { total: 0, interviews: 0, offers: 0, rejected: 0 };
        }
        industryStats[industry].total++;
        if (job.status === 'Interview' || job.status === 'Offer') industryStats[industry].interviews++;
        if (job.status === 'Offer') industryStats[industry].offers++;
        if (job.status === 'Rejected') industryStats[industry].rejected++;
      });

      analyticsByTab.marketIntelligence = {
        totalApplications: actualApplications.length,
        statusBreakdown: statusCounts,
        industryPerformance: Object.entries(industryStats)
          .filter(([industry]) => industry !== 'Unknown')
          .map(([industry, stats]) => ({
            industry,
            total: stats.total,
            interviewRate: stats.total > 0 ? parseFloat(((stats.interviews / stats.total) * 100).toFixed(1)) : 0,
            offerRate: stats.total > 0 ? parseFloat(((stats.offers / stats.total) * 100).toFixed(1)) : 0,
            rejectionRate: stats.total > 0 ? parseFloat(((stats.rejected / stats.total) * 100).toFixed(1)) : 0,
          }))
          .sort((a, b) => b.total - a.total),
      };

      // Interview Analytics
      if (comprehensiveData.interviewOutcomes && comprehensiveData.interviewOutcomes.length > 0) {
        const interviewTypes = {};
        let totalPrepTime = 0;
        let totalRatings = 0;
        let ratingCount = 0;
        
        comprehensiveData.interviewOutcomes.forEach(io => {
          const type = io.interview_type || 'Unknown';
          interviewTypes[type] = (interviewTypes[type] || 0) + 1;
          if (io.hours_prepared) totalPrepTime += parseFloat(io.hours_prepared);
          if (io.self_rating) {
            totalRatings += parseInt(io.self_rating);
            ratingCount++;
          }
        });

        analyticsByTab.interviewAnalysis = {
          totalInterviews: comprehensiveData.interviewOutcomes.length,
          byType: interviewTypes,
          averagePreparationHours: (totalPrepTime / comprehensiveData.interviewOutcomes.length).toFixed(1),
          averageSelfRating: ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 0,
        };
      }

      // Networking Analytics
      if (comprehensiveData.networkingActivities && comprehensiveData.networkingActivities.length > 0) {
        const activityTypes = {};
        let totalTime = 0;
        comprehensiveData.networkingActivities.forEach(act => {
          const type = act.activity_type || 'Unknown';
          activityTypes[type] = (activityTypes[type] || 0) + 1;
          if (act.time_spent_minutes) totalTime += parseInt(act.time_spent_minutes);
        });

        analyticsByTab.networkingAnalysis = {
          totalActivities: comprehensiveData.networkingActivities.length,
          byType: activityTypes,
          totalTimeHours: (totalTime / 60).toFixed(1),
          statistics: comprehensiveData.networkingStats,
        };
      }

      // Skills & Qualifications
      if (comprehensiveData.skills && comprehensiveData.skills.length > 0) {
        const skillsByCategory = {};
        const skillsByProficiency = {};
        comprehensiveData.skills.forEach(skill => {
          const cat = skill.category || 'Other';
          const prof = skill.proficiency || 'Unknown';
          skillsByCategory[cat] = (skillsByCategory[cat] || 0) + 1;
          skillsByProficiency[prof] = (skillsByProficiency[prof] || 0) + 1;
        });

        analyticsByTab.skillsProfile = {
          totalSkills: comprehensiveData.skills.length,
          byCategory: skillsByCategory,
          byProficiency: skillsByProficiency,
        };
      }

      // Time Investment
      if (comprehensiveData.timeActivities && comprehensiveData.timeActivities.length > 0) {
        const activityTypes = {};
        let totalMinutes = 0;
        comprehensiveData.timeActivities.forEach(act => {
          const type = act.activity_type || 'Unknown';
          activityTypes[type] = (activityTypes[type] || 0) + 1;
          if (act.duration_minutes) totalMinutes += parseInt(act.duration_minutes);
        });

        analyticsByTab.timeInvestment = {
          totalActivities: comprehensiveData.timeActivities.length,
          byType: activityTypes,
          totalHours: (totalMinutes / 60).toFixed(1),
        };
      }
    }

    // Calculate real success rates from actual data
    const totalApplied = actualApplications.length;
    const totalInterviews = actualApplications.filter(j => j.status === 'Interview' || j.status === 'Offer').length;
    const totalOffers = actualApplications.filter(j => j.status === 'Offer').length;
    const totalRejected = actualApplications.filter(j => j.status === 'Rejected').length;
    
    const realSuccessRate = totalApplied > 0 ? parseFloat(((totalInterviews / totalApplied) * 100).toFixed(1)) : 0;
    const realOfferRate = totalApplied > 0 ? parseFloat(((totalOffers / totalApplied) * 100).toFixed(1)) : 0;
    const realInterviewRate = totalApplied > 0 ? parseFloat(((totalInterviews / totalApplied) * 100).toFixed(1)) : 0;

    // Prepare comprehensive report data
    const reportData = {
      title: title || (isComprehensive ? 'Comprehensive Job Search Report' : REPORT_TEMPLATES[template]?.name || 'Custom Report'),
      generatedAt: new Date().toISOString(),
      filters: isComprehensive ? {} : (filters || {}), // Don't show filters for comprehensive
      comprehensive: isComprehensive,
      summary: {
        totalApplications: totalApplied,
        totalJobs: jobs.length,
        totalInterested: jobs.filter(j => j.status === 'Interested').length,
        successRate: realSuccessRate,
        interviewRate: realInterviewRate,
        offerRate: realOfferRate,
        totalInterviews: comprehensiveData.interviewOutcomes?.length || totalInterviews,
        totalOffers: comprehensiveData.offers?.length || totalOffers,
        totalRejected: totalRejected,
        totalSkills: comprehensiveData.skills?.length || 0,
        totalCertifications: comprehensiveData.certifications?.length || 0,
        totalNetworkingActivities: comprehensiveData.networkingActivities?.length || 0,
      },
      metrics: calculatedMetrics,
      analyticsByTab: isComprehensive ? analyticsByTab : undefined,
      comprehensiveData: isComprehensive ? {
        skills: comprehensiveData.skills,
        certifications: comprehensiveData.certifications,
        employment: comprehensiveData.employment,
        networkingStats: comprehensiveData.networkingStats,
        offers: comprehensiveData.offers,
      } : undefined,
      insights,
    };

    // Export based on format
    if (format === 'pdf') {
      return generatePDFReport(reportData, res);
    } else if (format === 'csv' || format === 'excel') {
      return generateCSVReport(reportData, res);
    } else {
      // JSON format
      return res.json({
        success: true,
        report: reportData,
      });
    }

  } catch (err) {
    console.error("❌ Custom Reports Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// GET /api/custom-reports/filter-options
// ------------------------------
router.get("/filter-options", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get unique companies (exclude archived jobs, filter out null/empty)
    const companiesRes = await pool.query(
      `SELECT DISTINCT company 
       FROM jobs 
       WHERE user_id = $1 
         AND ("isarchived" = false OR "isarchived" IS NULL)
         AND company IS NOT NULL 
         AND company != ''
       ORDER BY company`,
      [userId]
    );

    // Get unique industries (exclude archived jobs, filter out null/empty)
    const industriesRes = await pool.query(
      `SELECT DISTINCT industry 
       FROM jobs 
       WHERE user_id = $1 
         AND ("isarchived" = false OR "isarchived" IS NULL)
         AND industry IS NOT NULL 
         AND industry != ''
       ORDER BY industry`,
      [userId]
    );

    // Get unique roles/titles (exclude archived jobs, filter out null/empty)
    const rolesRes = await pool.query(
      `SELECT DISTINCT title 
       FROM jobs 
       WHERE user_id = $1 
         AND ("isarchived" = false OR "isarchived" IS NULL)
         AND title IS NOT NULL 
         AND title != ''
       ORDER BY title`,
      [userId]
    );

    // Get date range (exclude archived jobs)
    const dateRangeRes = await pool.query(
      `SELECT MIN(created_at) as min_date, MAX(created_at) as max_date 
       FROM jobs 
       WHERE user_id = $1 
         AND ("isarchived" = false OR "isarchived" IS NULL)`,
      [userId]
    );

    const companies = companiesRes.rows.map(r => r.company).filter(Boolean);
    const industries = industriesRes.rows.map(r => r.industry).filter(Boolean);
    const roles = rolesRes.rows.map(r => r.title).filter(Boolean);

    console.log(`📊 Custom Reports Filter Options for user ${userId}:`);
    console.log(`  - Companies: ${companies.length} found`);
    console.log(`  - Industries: ${industries.length} found`);
    console.log(`  - Roles: ${roles.length} found`);
    if (companies.length > 0) {
      console.log(`  - Sample companies:`, companies.slice(0, 5));
    }
    if (industries.length > 0) {
      console.log(`  - Sample industries:`, industries.slice(0, 5));
    }
    if (roles.length > 0) {
      console.log(`  - Sample roles:`, roles.slice(0, 5));
    }

    return res.json({
      companies,
      industries,
      roles,
      dateRange: {
        min: dateRangeRes.rows[0]?.min_date || null,
        max: dateRangeRes.rows[0]?.max_date || null,
      },
      statuses: ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected'],
    });

  } catch (err) {
    console.error("❌ Custom Reports Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

