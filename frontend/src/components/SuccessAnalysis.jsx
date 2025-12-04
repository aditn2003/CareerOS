import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
  Cell,
  LineChart, Line
} from "recharts";

import "./SuccessAnalysis.css";

const COLORS = ["#6366f1", "#60a5fa", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#f472b6"];

// 🎯 Utility for formatting percentage
function percent(v) {
  if (!v && v !== 0) return "0%";
  return (Number(v) * 100).toFixed(1) + "%";
}

// 🎯 Utility to safely parse numbers
function safeNumber(value) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// Format role type for display (already formatted by backend)
function formatRoleType(roleType) {
  if (!roleType) return "Other";
  return roleType; // Already properly formatted by roleTypeMapper
}

// 🎯 Custom tooltip for pie charts
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: "white",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "4px"
      }}>
        <p style={{ margin: 0, fontWeight: "bold" }}>{data.name}</p>
        <p style={{ margin: "5px 0 0 0" }}>
          Offers: {safeNumber(data.value)}
        </p>
        <p style={{ margin: "5px 0 0 0" }}>
          Total: {safeNumber(data.payload.total)}
        </p>
        <p style={{ margin: "5px 0 0 0", color: "#666" }}>
          Success Rate: {percent(data.payload.successRate || 0)}
        </p>
      </div>
    );
  }
  return null;
};

export default function SuccessAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("🔵 SuccessAnalysis component rendered");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/success-analysis/full");
      console.log("✅ Success Analysis API Response:", res.data);
      setData(res.data);
    } catch (err) {
      console.error("❌ Failed to load analysis", err);
      setError(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    console.log("⏳ Component is loading...");
    return (
      <div className="success-analysis-wrapper">
        <p className="loading-text">Loading analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    console.log("❌ Component error or no data:", { error, hasData: !!data });
    return (
      <div className="success-analysis-wrapper">
        <p className="error-text">{error || "Failed to load analysis."}</p>
        <button onClick={load} style={{ marginTop: "10px", padding: "8px 16px" }}>
          Retry
        </button>
      </div>
    );
  }

  console.log("📊 Component has data, processing...");

  const {
    industryData = [],
    roleTypeData = [],
    companySizeData = [],
    sourceData = [],
    methodData = [],
    materialsData = [],
    timingData = [],
    heatmapData = [],
    overallStats = {},
    recommendations = [],
    rejectionAnalysis = null
  } = data;

  // Ensure all numeric values are parsed
  const safeIndustryData = industryData.map(item => ({
    ...item,
    total: safeNumber(item.total),
    interviews: safeNumber(item.interviews),
    offers: safeNumber(item.offers),
    rejections: safeNumber(item.rejections || 0),
    successRate: safeNumber(item.successRate),
    rejectionRate: safeNumber(item.rejectionRate || 0),
    responseRate: safeNumber(item.responseRate || 0)
  }));

  const safeRoleTypeData = roleTypeData
    .map(item => ({
      ...item,
      role_type: item.role_type || "other",
      total: safeNumber(item.total),
      interviews: safeNumber(item.interviews),
      offers: safeNumber(item.offers),
      rejections: safeNumber(item.rejections || 0),
      successRate: safeNumber(item.successRate),
      rejectionRate: safeNumber(item.rejectionRate || 0)
    }))
    .filter(item => item.total > 0); // Filter out empty data

  const safeCompanySizeData = companySizeData.map(item => ({
    ...item,
    total: safeNumber(item.total),
    interviews: safeNumber(item.interviews),
    offers: safeNumber(item.offers),
    rejections: safeNumber(item.rejections || 0),
    successRate: safeNumber(item.successRate),
    rejectionRate: safeNumber(item.rejectionRate || 0)
  }));

  const safeSourceData = sourceData.map(item => ({
    ...item,
    total: safeNumber(item.total),
    interviews: safeNumber(item.interviews),
    offers: safeNumber(item.offers),
    rejections: safeNumber(item.rejections || 0),
    successRate: safeNumber(item.successRate),
    rejectionRate: safeNumber(item.rejectionRate || 0)
  }));

  const safeMethodData = methodData.map(item => ({
    ...item,
    total: safeNumber(item.total),
    interviews: safeNumber(item.interviews),
    offers: safeNumber(item.offers),
    rejections: safeNumber(item.rejections || 0),
    successRate: safeNumber(item.successRate),
    rejectionRate: safeNumber(item.rejectionRate || 0)
  }));

  const safeMaterialsData = materialsData.map(item => ({
    ...item,
    total: Number(item.total) || 0,
    interviews: Number(item.interviews) || 0,
    offers: Number(item.offers) || 0,
    rejections: Number(item.rejections) || 0,
    successRate: Number(item.successRate) || 0,
    responseRate: Number(item.responseRate) || 0
  }));

  const weekdayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const safeTimingData = timingData.map(item => {
    const weekdayNum = safeNumber(item.weekday);
    // Ensure weekdayName is always a string, never a number
    let weekdayName = item.weekdayName;
    if (!weekdayName || weekdayName === 0 || weekdayName === "0") {
      weekdayName = weekdayOrder[weekdayNum] || "Unknown";
    }
    weekdayName = String(weekdayName); // Force to string
    
    return {
      ...item,
      weekday: weekdayNum,
      hour: safeNumber(item.hour),
      applications: safeNumber(item.applications),
      offers: safeNumber(item.offers),
      interviews: safeNumber(item.interviews),
      successRate: safeNumber(item.successRate),
      weekdayName: weekdayName
    };
  });

  // Format role type data for pie chart with proper labels
  // Use total applications instead of offers to show all role types
  const pieChartData = safeRoleTypeData.map(item => ({
    name: formatRoleType(item.role_type),
    value: Number(item.total) || 0, // Use total instead of offers to show all segments, ensure it's a number
    offers: Number(item.offers) || 0,
    total: Number(item.total) || 0,
    interviews: Number(item.interviews) || 0,
    successRate: Number(item.successRate) || 0,
    role_type: item.role_type
  }));

  // Calculate data quality metrics
  const totalApps = overallStats?.totalApplications || 0;
  const unknownIndustry = safeIndustryData.find(ind => ind.industry === "Unknown" || !ind.industry);
  const unknownIndustryCount = unknownIndustry ? unknownIndustry.total : 0;
  const unknownIndustryPercent = totalApps > 0 ? (unknownIndustryCount / totalApps * 100) : 0;
  const unknownSizeCount = safeCompanySizeData.find(s => s.company_size === "unknown")?.total || 0;
  const unknownSizePercent = totalApps > 0 ? (unknownSizeCount / totalApps * 100) : 0;
  const hasSourceData = safeSourceData.length > 0;
  const sampleSizeTooSmall = totalApps < 20;

  // Aggregate timing data by weekday
  const timingByWeekdayData = safeTimingData
    .filter(item => Number(item.applications) > 0)
    .reduce((acc, item) => {
      // Get weekday name
      let weekdayName = String(item.weekdayName || "");
      if (!weekdayName || weekdayName === "Unknown" || weekdayName === "0") {
        weekdayName = weekdayOrder[Number(item.weekday) || 0] || "Unknown";
      }
      
      // Skip unknown weekdays
      if (weekdayName === "Unknown") return acc;
      
      // Aggregate by weekday
      if (!acc[weekdayName]) {
        acc[weekdayName] = {
          name: weekdayName, // ✅ This is crucial for XAxis
          weekdayName: weekdayName,
          weekday: Number(item.weekday) || 0,
          applications: 0,
          offers: 0,
          interviews: 0
        };
      }
      
      acc[weekdayName].applications += Number(item.applications) || 0;
      acc[weekdayName].offers += Number(item.offers) || 0;
      acc[weekdayName].interviews += Number(item.interviews) || 0;
      
    return acc;
  }, {});

  // Convert to array and sort by weekday order
  const timingChartData = Object.values(timingByWeekdayData)
    .sort((a, b) => {
      const aIndex = weekdayOrder.indexOf(a.weekdayName);
      const bIndex = weekdayOrder.indexOf(b.weekdayName);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  // Debug logs - placed right before return
  console.log("=".repeat(50));
  console.log("📈 CHART DATA DEBUG:");
  console.log("Industry Data:", safeIndustryData);
  console.log("Role Type Data:", safeRoleTypeData);
  console.log("Pie Chart Data:", pieChartData);
  console.log("Timing Chart Data:", timingChartData);
  console.log("Raw Timing Data:", safeTimingData);
  console.log("=".repeat(50));

  return (
    <div className="success-analysis-wrapper">
      <h1 className="analysis-title">Application Success Analysis</h1>

      {/* Data Quality Warnings */}
      {(sampleSizeTooSmall || unknownIndustryPercent > 50 || unknownSizePercent > 50 || !hasSourceData) && (
        <section className="analysis-section data-quality-warning">
          <h2>Data Quality Notice</h2>
          <div className="warning-list">
            {sampleSizeTooSmall && (
              <div className="warning-item">
                <strong>Small Sample Size:</strong> You have {totalApps} application{totalApps !== 1 ? 's' : ''}. 
                For statistically reliable insights, we recommend at least 20 applications. 
                Current recommendations should be interpreted with caution.
              </div>
            )}
            {unknownIndustryPercent > 50 && (
              <div className="warning-item">
                <strong>Missing Industry Data:</strong> {unknownIndustryPercent.toFixed(0)}% of your applications 
                are missing industry classification. Please add industry information to your job entries for better insights.
              </div>
            )}
            {unknownSizePercent > 50 && (
              <div className="warning-item">
                <strong>Missing Company Size Data:</strong> {unknownSizePercent.toFixed(0)}% of applications 
                lack company size information. Add company details to enable size-based analysis.
              </div>
            )}
            {!hasSourceData && (
              <div className="warning-item">
                <strong>No Application Source Tracking:</strong> Start tracking where you find job opportunities 
                (LinkedIn, Indeed, company website, etc.) to identify your most effective application channels.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Overall Stats */}
      {overallStats && overallStats.totalApplications > 0 && (
        <section className="analysis-section stats-summary">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{overallStats.totalApplications}</div>
              <div className="stat-label">Total Applications</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallStats.totalInterviews}</div>
              <div className="stat-label">Interviews</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallStats.totalOffers}</div>
              <div className="stat-label">Offers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{percent(overallStats.overallOfferRate)}</div>
              <div className="stat-label">Overall Offer Rate</div>
            </div>
            {overallStats.totalRejections !== undefined && overallStats.totalRejections > 0 && (
              <>
                <div className="stat-card" style={{ backgroundColor: "#fee2e2" }}>
                  <div className="stat-value">{overallStats.totalRejections}</div>
                  <div className="stat-label">Rejections</div>
                </div>
                <div className="stat-card" style={{ backgroundColor: "#fee2e2" }}>
                  <div className="stat-value">{percent(overallStats.overallRejectionRate || 0)}</div>
                  <div className="stat-label">Rejection Rate</div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ============================
          INDUSTRY SUCCESS
      ============================ */}
      <section className="analysis-section">
        <h2>Success Rate by Industry</h2>
        {safeIndustryData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={safeIndustryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="industry" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
            <YAxis />
              <Tooltip 
                formatter={(value, name) => [safeNumber(value), name]}
                labelFormatter={(label) => `Industry: ${label}`}
              />
              <Legend />
            <Bar dataKey="offers" fill="#4ade80" name="Offers" />
            <Bar dataKey="interviews" fill="#60a5fa" name="Interviews" />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <p className="no-data-message">No industry data available</p>
        )}
      </section>

      {/* ============================
          ROLE TYPE SUCCESS
      ============================ */}
      <section className="analysis-section">
        <h2>Applications by Role Type</h2>
        {pieChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="35%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="custom-tooltip" style={{
                          backgroundColor: "white",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px"
                        }}>
                          <p style={{ margin: 0, fontWeight: "bold" }}>{data.name}</p>
                          <p style={{ margin: "5px 0 0 0" }}>
                            Total Applications: {safeNumber(data.total)}
                          </p>
                          <p style={{ margin: "5px 0 0 0" }}>
                            Offers: {safeNumber(data.offers)}
                          </p>
                          <p style={{ margin: "5px 0 0 0" }}>
                            Interviews: {safeNumber(data.interviews)}
                          </p>
                          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
                            Success Rate: {percent(data.successRate)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
                  formatter={(value, entry) => {
                    const data = pieChartData.find(d => d.name === value);
                    return `${value} (${safeNumber(data?.total || 0)}, ${safeNumber(data?.offers || 0)}✓)`;
                  }}
                />
          </PieChart>
        </ResponsiveContainer>
            <div className="chart-note">
              <small>Chart shows distribution of applications by role type. Hover for detailed statistics.</small>
            </div>
          </>
        ) : (
          <p className="no-data-message">No role type data available</p>
        )}
      </section>

      {/* ============================
          COMPANY SIZE SUCCESS
      ============================ */}
      {safeCompanySizeData.length > 0 && (
        <section className="analysis-section">
          <h2>Success Rate by Company Size</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={safeCompanySizeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="company_size" 
                tickFormatter={(value) => value.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [safeNumber(value), name]}
                labelFormatter={(label) => `Company Size: ${label}`}
              />
              <Legend />
              <Bar dataKey="offers" fill="#a78bfa" name="Offers" />
              <Bar dataKey="interviews" fill="#60a5fa" name="Interviews" />
              {safeCompanySizeData.some(s => s.rejections > 0) && (
                <Bar dataKey="rejections" fill="#ef4444" name="Rejections" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ============================
          APPLICATION SOURCE SUCCESS
      ============================ */}
      {safeSourceData.length > 0 && (
        <section className="analysis-section">
          <h2>Success by Application Source</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={safeSourceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="application_source" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [safeNumber(value), name]}
                labelFormatter={(label) => `Source: ${label}`}
              />
              <Legend />
              <Bar dataKey="offers" fill="#34d399" name="Offers" />
              <Bar dataKey="interviews" fill="#60a5fa" name="Interviews" />
              {safeSourceData.some(s => s.rejections > 0) && (
                <Bar dataKey="rejections" fill="#ef4444" name="Rejections" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ============================
          APPLICATION METHOD SUCCESS
      ============================ */}
      {safeMethodData.length > 0 && (
        <section className="analysis-section">
          <h2>Success by Application Method</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={safeMethodData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="application_method" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [safeNumber(value), name]}
                labelFormatter={(label) => `Method: ${label}`}
              />
              <Legend />
              <Bar dataKey="offers" fill="#a78bfa" name="Offers" />
              <Bar dataKey="interviews" fill="#60a5fa" name="Interviews" />
              {safeMethodData.some(m => m.rejections > 0) && (
                <Bar dataKey="rejections" fill="#ef4444" name="Rejections" />
              )}
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-note">
            <small>Application methods include: Online Form, Direct Email, Referral, Recruiter, Job Fair, etc.</small>
          </div>
        </section>
      )}

      {/* ============================
          REJECTION ANALYSIS
      ============================ */}
      {rejectionAnalysis && rejectionAnalysis.totalRejections > 0 && (
        <section className="analysis-section">
          <h2>Rejection Rate Analysis</h2>
          <div className="stats-summary">
            <div className="stat-card" style={{ backgroundColor: "#fee2e2" }}>
              <div className="stat-value">{percent(rejectionAnalysis.overallRejectionRate)}</div>
              <div className="stat-label">Overall Rejection Rate</div>
              <div className="stat-detail">{rejectionAnalysis.totalRejections} rejections</div>
            </div>
          </div>

          {rejectionAnalysis.rejectionRateByIndustry && rejectionAnalysis.rejectionRateByIndustry.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h3>Rejection Rate by Industry</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={rejectionAnalysis.rejectionRateByIndustry.map(item => ({
                    ...item,
                    rejectionRate: safeNumber(item.rejectionRate),
                    rejections: safeNumber(item.rejections),
                    total: safeNumber(item.total)
                  }))} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="industry" />
                  <YAxis 
                    label={{ value: 'Rejection Rate', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => percent(value)}
                  />
                  <Tooltip 
                    formatter={(value) => percent(value)}
                    labelFormatter={(label) => `Industry: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="rejectionRate" 
                    fill="#ef4444" 
                    name="Rejection Rate"
                    label={{ formatter: (value) => percent(value), position: 'top' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rejectionAnalysis.rejectionRateByRoleType && rejectionAnalysis.rejectionRateByRoleType.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h3>Rejection Rate by Role Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={rejectionAnalysis.rejectionRateByRoleType.map(item => ({
                    ...item,
                    role_type: formatRoleType(item.role_type),
                    rejectionRate: safeNumber(item.rejectionRate),
                    rejections: safeNumber(item.rejections),
                    total: safeNumber(item.total)
                  }))} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role_type" />
                  <YAxis 
                    label={{ value: 'Rejection Rate', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => percent(value)}
                  />
                  <Tooltip 
                    formatter={(value) => percent(value)}
                    labelFormatter={(label) => `Role Type: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="rejectionRate" 
                    fill="#f87171" 
                    name="Rejection Rate"
                    label={{ formatter: (value) => percent(value), position: 'top' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* ============================
          MATERIALS IMPACT
      ============================ */}
      <section className="analysis-section">
        <h2>Resume & Cover Letter Effectiveness</h2>
        {safeMaterialsData.length > 0 ? (
          <>
        <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={safeMaterialsData.map(item => ({
                  ...item,
                  resume_name: item.resume_name || `Resume #${item.resume_id}`,
                  cover_letter_name: item.cover_letter_name || 'No Cover Letter',
                  offers: Number(item.offers) || 0,
                  interviews: Number(item.interviews) || 0,
                  total: Number(item.total) || 0
                }))} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
            <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="resume_name" 
                  angle={-20}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={11}
                />
            <YAxis />
                <Tooltip 
                  formatter={(value, name) => [Number(value) || 0, name]}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    return data ? `Resume: ${data.resume_name}\nCover Letter: ${data.cover_letter_name}` : label;
                  }}
                />
                <Legend />
            <Bar dataKey="offers" fill="#fbbf24" name="Offers" />
            <Bar dataKey="interviews" fill="#60a5fa" name="Interviews" />
          </BarChart>
        </ResponsiveContainer>
            <div className="chart-note">
              <small>Hover over bars to see cover letter information. Sample size may be too small for reliable conclusions.</small>
            </div>
          </>
        ) : (
          <p className="no-data-message">
            No materials data available. Link resumes and cover letters to your job applications to track their effectiveness.
          </p>
        )}
      </section>

      {/* ============================
          TIMING CORRELATION
      ============================ */}
      <section className="analysis-section">
        <h2>Timing Patterns (Applications vs Offers by Day of Week)</h2>
        {timingChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart 
              data={timingChartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
            <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: "Day of Week", position: "insideBottom", offset: -5 }}
                tick={{ fontSize: 12 }}
                type="category"
              />
            <YAxis />
              <Tooltip 
                formatter={(value, name) => [Number(value) || 0, name]}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="applications" 
                stroke="#6366f1" 
                name="Applications" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="offers" 
                stroke="#4ade80" 
                name="Offers" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
          </LineChart>
        </ResponsiveContainer>
        ) : safeTimingData.length > 0 ? (
          <div>
            <p className="info-message">
              Showing timing data aggregated by weekday (fallback mode).
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={Object.values(safeTimingData.reduce((acc, item) => {
                  let weekdayName = String(item.weekdayName || "");
                  if (!weekdayName || weekdayName === "0" || weekdayName === "Unknown" || weekdayName === "null") {
                    weekdayName = weekdayOrder[Number(item.weekday) || 0] || "Unknown";
                  }
                  weekdayName = String(weekdayName);
                  
                  if (weekdayName === "Unknown") return acc;
                  
                  if (!acc[weekdayName]) {
                    acc[weekdayName] = {
                      weekdayName,
                      applications: 0,
                      offers: 0,
                      interviews: 0
                    };
                  }
                  acc[weekdayName].applications += Number(item.applications) || 0;
                  acc[weekdayName].offers += Number(item.offers) || 0;
                  acc[weekdayName].interviews += Number(item.interviews) || 0;
                  return acc;
                }, {})).filter(item => item.weekdayName !== "Unknown").sort((a, b) => {
                  const aIndex = weekdayOrder.indexOf(a.weekdayName);
                  const bIndex = weekdayOrder.indexOf(b.weekdayName);
                  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                })} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="weekdayName" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  type="category"
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [Number(value) || 0, name]}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Legend />
                <Bar dataKey="applications" fill="#6366f1" name="Applications" />
                <Bar dataKey="offers" fill="#4ade80" name="Offers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="no-data-message">
            No timing data available. Add application dates to your job entries to see timing patterns.
          </p>
        )}
      </section>

      {/* ============================
          RECOMMENDATIONS
      ============================ */}
      <section className="analysis-section">
        <h2>Recommendations</h2>
        {recommendations && recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="recommendation-card">
                <p dangerouslySetInnerHTML={{ 
                  __html: typeof rec === 'string' ? rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : rec.message || rec
                }} />
            </div>
          ))}
        </div>
        ) : (
          <p className="no-data-message">No recommendations available at this time</p>
        )}
      </section>
    </div>
  );
}
