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
  'overview': {
    name: 'Job Search Overview',
    description: 'Comprehensive overview of your job search performance',
    metrics: ['totalApplications', 'successRate', 'offerRate', 'industryBreakdown', 'timeline'],
  },
  'performance': {
    name: 'Performance Analysis',
    description: 'Detailed performance metrics and trends',
    metrics: ['successRate', 'interviewRate', 'offerRate', 'conversionFunnel', 'trends'],
  },
  'industry': {
    name: 'Industry Analysis',
    description: 'Performance breakdown by industry',
    metrics: ['industryBreakdown', 'industrySuccessRates', 'topIndustries'],
  },
  'timing': {
    name: 'Timing Analysis',
    description: 'Optimal timing patterns for applications',
    metrics: ['peakTiming', 'responseTimes', 'seasonalTrends'],
  },
  'strategy': {
    name: 'Strategy Effectiveness',
    description: 'Analysis of different strategies and their impact',
    metrics: ['customizationImpact', 'networkingImpact', 'preparationImpact'],
  },
};

// ------------------------------
// HELPER: Fetch Filtered Jobs
// ------------------------------
async function fetchFilteredJobs(userId, filters) {
  let query = `SELECT * FROM jobs WHERE user_id = $1`;
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

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

// ------------------------------
// HELPER: Calculate Metrics
// ------------------------------
function calculateMetrics(jobs, selectedMetrics) {
  const metrics = {};

  if (selectedMetrics.includes('totalApplications')) {
    metrics.totalApplications = jobs.length;
  }

  if (selectedMetrics.includes('successRate') || selectedMetrics.includes('interviewRate')) {
    const interviews = jobs.filter(j => j.status === 'Interview' || j.status === 'Offer').length;
    metrics.interviewRate = jobs.length > 0 ? ((interviews / jobs.length) * 100).toFixed(1) : 0;
    metrics.successRate = metrics.interviewRate;
  }

  if (selectedMetrics.includes('offerRate')) {
    const offers = jobs.filter(j => j.status === 'Offer').length;
    metrics.offerRate = jobs.length > 0 ? ((offers / jobs.length) * 100).toFixed(1) : 0;
  }

  if (selectedMetrics.includes('industryBreakdown')) {
    const industryCounts = {};
    jobs.forEach(job => {
      const industry = job.industry || 'Unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });
    metrics.industryBreakdown = Object.entries(industryCounts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  }

  if (selectedMetrics.includes('industrySuccessRates')) {
    const industryStats = {};
    jobs.forEach(job => {
      const industry = job.industry || 'Unknown';
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
      .map(([industry, stats]) => ({
        industry,
        total: stats.total,
        successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0,
        offerRate: stats.total > 0 ? ((stats.offers / stats.total) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
  }

  if (selectedMetrics.includes('conversionFunnel')) {
    metrics.conversionFunnel = {
      interested: jobs.filter(j => j.status === 'Interested').length,
      applied: jobs.filter(j => j.status === 'Applied').length,
      interview: jobs.filter(j => j.status === 'Interview').length,
      offer: jobs.filter(j => j.status === 'Offer').length,
      rejected: jobs.filter(j => j.status === 'Rejected').length,
    };
  }

  if (selectedMetrics.includes('timeline')) {
    const monthlyData = {};
    jobs.forEach(job => {
      const date = new Date(job.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { applications: 0, interviews: 0, offers: 0 };
      }
      monthlyData[monthKey].applications++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        monthlyData[monthKey].interviews++;
      }
      if (job.status === 'Offer') {
        monthlyData[monthKey].offers++;
      }
    });
    metrics.timeline = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  if (selectedMetrics.includes('peakTiming')) {
    const hourlyCounts = Array(24).fill(0);
    const dailyCounts = Array(7).fill(0);
    
    jobs.forEach(job => {
      const date = new Date(job.applied_on || job.created_at);
      hourlyCounts[date.getHours()]++;
      dailyCounts[date.getDay()]++;
    });

    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
    const peakDay = dailyCounts.indexOf(Math.max(...dailyCounts));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    metrics.peakTiming = {
      hour: `${peakHour}:00`,
      day: dayNames[peakDay],
    };
  }

  if (selectedMetrics.includes('responseTimes')) {
    const responseTimes = [];
    jobs.forEach(job => {
      if (job.status_updated_at && job.applied_on) {
        const applied = new Date(job.applied_on);
        const updated = new Date(job.status_updated_at);
        const days = Math.floor((updated - applied) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 90) {
          responseTimes.push(days);
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

    jobs.forEach(job => {
      const level = job.resume_customization || 'none';
      customStats[level].total++;
      if (job.status === 'Interview' || job.status === 'Offer') {
        customStats[level].success++;
      }
    });

    metrics.customizationImpact = Object.entries(customStats)
      .map(([level, stats]) => ({
        level,
        total: stats.total,
        successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0,
      }));
  }

  return metrics;
}

// ------------------------------
// HELPER: Generate Insights
// ------------------------------
function generateInsights(metrics, jobs) {
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

  if (metrics.customizationImpact) {
    const bestLevel = metrics.customizationImpact.reduce((best, current) =>
      parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best
    );
    if (bestLevel.level !== 'none' && parseFloat(bestLevel.successRate) > 20) {
      insights.push({
        type: 'recommendation',
        title: 'Customization Impact',
        message: `${bestLevel.level.charAt(0).toUpperCase() + bestLevel.level.slice(1)} customization shows ${bestLevel.successRate}% success rate.`,
      });
    }
  }

  if (metrics.peakTiming) {
    insights.push({
      type: 'insight',
      title: 'Optimal Application Timing',
      message: `Your most successful applications were submitted on ${metrics.peakTiming.day} around ${metrics.peakTiming.hour}.`,
    });
  }

  return insights;
}

// ------------------------------
// HELPER: Generate PDF Report
// ------------------------------
function generatePDFReport(reportData, res) {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="job-search-report-${Date.now()}.pdf"`);
  
  doc.pipe(res);

  // Header
  doc.fontSize(20).text(reportData.title || 'Job Search Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  // Summary
  if (reportData.summary) {
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    if (reportData.summary.totalApplications) {
      doc.text(`Total Applications: ${reportData.summary.totalApplications}`);
    }
    if (reportData.summary.successRate) {
      doc.text(`Success Rate: ${reportData.summary.successRate}%`);
    }
    if (reportData.summary.offerRate) {
      doc.text(`Offer Rate: ${reportData.summary.offerRate}%`);
    }
    doc.moveDown();
  }

  // Metrics
  if (reportData.metrics) {
    doc.fontSize(16).text('Metrics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);

    if (reportData.metrics.industryBreakdown) {
      doc.text('Industry Breakdown:');
      reportData.metrics.industryBreakdown.slice(0, 10).forEach(item => {
        doc.text(`  • ${item.industry}: ${item.count} applications`, { indent: 20 });
      });
      doc.moveDown();
    }

    if (reportData.metrics.industrySuccessRates) {
      doc.text('Industry Success Rates:');
      reportData.metrics.industrySuccessRates.slice(0, 10).forEach(item => {
        doc.text(`  • ${item.industry}: ${item.successRate}% (${item.total} apps)`, { indent: 20 });
      });
      doc.moveDown();
    }

    if (reportData.metrics.conversionFunnel) {
      doc.text('Conversion Funnel:');
      const funnel = reportData.metrics.conversionFunnel;
      doc.text(`  • Interested: ${funnel.interested}`, { indent: 20 });
      doc.text(`  • Applied: ${funnel.applied}`, { indent: 20 });
      doc.text(`  • Interview: ${funnel.interview}`, { indent: 20 });
      doc.text(`  • Offer: ${funnel.offer}`, { indent: 20 });
      doc.text(`  • Rejected: ${funnel.rejected}`, { indent: 20 });
      doc.moveDown();
    }
  }

  // Insights
  if (reportData.insights && reportData.insights.length > 0) {
    doc.fontSize(16).text('Insights & Recommendations', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    reportData.insights.forEach(insight => {
      doc.text(`• ${insight.title}: ${insight.message}`);
      doc.moveDown(0.3);
    });
  }

  doc.end();
}

// ------------------------------
// HELPER: Generate CSV/Excel Report
// ------------------------------
function generateCSVReport(reportData, res) {
  let csv = 'Metric,Value\n';

  // Summary
  if (reportData.summary) {
    csv += '\n# Summary\n';
    if (reportData.summary.totalApplications) {
      csv += `Total Applications,${reportData.summary.totalApplications}\n`;
    }
    if (reportData.summary.successRate) {
      csv += `Success Rate,${reportData.summary.successRate}%\n`;
    }
    if (reportData.summary.offerRate) {
      csv += `Offer Rate,${reportData.summary.offerRate}%\n`;
    }
  }

  // Industry Breakdown
  if (reportData.metrics && reportData.metrics.industryBreakdown) {
    csv += '\n# Industry Breakdown\n';
    csv += 'Industry,Count\n';
    reportData.metrics.industryBreakdown.forEach(item => {
      csv += `${item.industry},${item.count}\n`;
    });
  }

  // Industry Success Rates
  if (reportData.metrics && reportData.metrics.industrySuccessRates) {
    csv += '\n# Industry Success Rates\n';
    csv += 'Industry,Total Applications,Success Rate,Offer Rate\n';
    reportData.metrics.industrySuccessRates.forEach(item => {
      csv += `${item.industry},${item.total},${item.successRate}%,${item.offerRate}%\n`;
    });
  }

  // Conversion Funnel
  if (reportData.metrics && reportData.metrics.conversionFunnel) {
    csv += '\n# Conversion Funnel\n';
    csv += 'Stage,Count\n';
    const funnel = reportData.metrics.conversionFunnel;
    csv += `Interested,${funnel.interested}\n`;
    csv += `Applied,${funnel.applied}\n`;
    csv += `Interview,${funnel.interview}\n`;
    csv += `Offer,${funnel.offer}\n`;
    csv += `Rejected,${funnel.rejected}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="job-search-report-${Date.now()}.csv"`);
  res.send(csv);
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
  const userId = req.userId;
  const {
    title,
    template,
    metrics = [],
    filters = {},
    format = 'json', // json, pdf, csv
    includeInsights = true,
  } = req.body;

  try {
    // If template is provided, use its metrics
    let selectedMetrics = metrics;
    if (template && REPORT_TEMPLATES[template]) {
      selectedMetrics = REPORT_TEMPLATES[template].metrics;
    }

    if (selectedMetrics.length === 0) {
      return res.status(400).json({ error: 'No metrics selected' });
    }

    // Fetch filtered jobs
    const jobs = await fetchFilteredJobs(userId, filters);

    // Calculate metrics
    const calculatedMetrics = calculateMetrics(jobs, selectedMetrics);

    // Generate insights
    const insights = includeInsights ? generateInsights(calculatedMetrics, jobs) : [];

    // Prepare report data
    const reportData = {
      title: title || REPORT_TEMPLATES[template]?.name || 'Custom Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary: {
        totalApplications: jobs.length,
        successRate: calculatedMetrics.successRate,
        offerRate: calculatedMetrics.offerRate,
      },
      metrics: calculatedMetrics,
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
  const userId = req.userId;

  try {
    // Get unique companies
    const companiesRes = await pool.query(
      `SELECT DISTINCT company FROM jobs WHERE user_id = $1 AND company IS NOT NULL ORDER BY company`,
      [userId]
    );

    // Get unique industries
    const industriesRes = await pool.query(
      `SELECT DISTINCT industry FROM jobs WHERE user_id = $1 AND industry IS NOT NULL ORDER BY industry`,
      [userId]
    );

    // Get date range
    const dateRangeRes = await pool.query(
      `SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM jobs WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      companies: companiesRes.rows.map(r => r.company),
      industries: industriesRes.rows.map(r => r.industry),
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

