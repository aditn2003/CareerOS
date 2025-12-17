/**
 * UC-117: API Rate Limiting and Error Handling Dashboard
 * Admin dashboard for monitoring API usage, quotas, errors, and response times
 */

import React, { useState, useEffect } from "react";
import { api } from "../../api";
import "./ApiMonitoringDashboard.css";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '2px 0', color: entry.color }}>
            <span style={{ fontWeight: 500 }}>{entry.name}:</span>{' '}
            {formatter 
              ? formatter(entry.value, entry.name, entry, index, payload)
              : typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// Services that use tokens (AI/LLM APIs)
const TOKEN_BASED_SERVICES = ['openai', 'google_gemini'];

// Helper function to check if a service uses tokens
const usesTokens = (serviceName) => {
  return TOKEN_BASED_SERVICES.includes(serviceName?.toLowerCase());
};

// Helper function to format tokens (returns dash for non-token services)
const formatTokens = (tokens, serviceName) => {
  if (!usesTokens(serviceName)) {
    return <span>—</span>;
  }
  return Number(tokens || 0).toLocaleString();
};

export default function ApiMonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [usageStats, setUsageStats] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [errors, setErrors] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [services, setServices] = useState([]);
  const [reports, setReports] = useState([]);
  
  // Filters - Default to showing all data (no date filter)
  const [dateRange, setDateRange] = useState({
    startDate: "", // Empty = no start date filter
    endDate: "", // Empty = no end date filter
  });
  const [selectedService, setSelectedService] = useState("");
  
  // Pagination for errors
  const [errorPage, setErrorPage] = useState(0);
  const errorLimit = 50;

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedService, activeTab, errorPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedService && { serviceName: selectedService }),
      };

      const promises = [];

      if (activeTab === "overview" || activeTab === "usage") {
        promises.push(
          api.get("/api/admin/api-usage", { params }).then((res) => {
            console.log("📊 API Usage Response:", res.data);
            console.log("📊 Usage Stats:", res.data.data);
            console.log("📊 Total Requests (sum check):", res.data.data?.reduce((sum, s) => sum + Number(s.total_requests || 0), 0));
            setUsageStats(res.data.data || []);
          }).catch((err) => {
            console.error("❌ Error fetching API usage:", err.response?.data || err.message);
          })
        );
        promises.push(
          api.get("/api/admin/api-quotas", { params }).then((res) => {
            setQuotas(res.data.data || []);
          })
        );
      }

      if (activeTab === "overview" || activeTab === "errors") {
        promises.push(
          api
            .get("/api/admin/api-errors", {
              params: {
                ...params,
                limit: errorLimit,
                offset: errorPage * errorLimit,
              },
            })
            .then((res) => {
              setErrors(res.data.data || []);
            })
        );
      }

      if (activeTab === "overview" || activeTab === "performance") {
        promises.push(
          api
            .get("/api/admin/api-response-times", {
              params: { ...params, groupBy: "day" },
            })
            .then((res) => {
              // Aggregate data by time_period (average across all services)
              const dataByPeriod = {};
              (res.data.data || []).forEach(item => {
                const period = item.time_period;
                if (!dataByPeriod[period]) {
                  dataByPeriod[period] = {
                    time_period: period,
                    time_period_display: new Date(period).toLocaleDateString("en-US", {
                      timeZone: "America/New_York",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit"
                    }),
                    values: {
                      avg: [],
                      p95: [],
                      p99: []
                    }
                  };
                }
                if (item.avg_response_time_ms) dataByPeriod[period].values.avg.push(item.avg_response_time_ms);
                if (item.p95_response_time_ms) dataByPeriod[period].values.p95.push(item.p95_response_time_ms);
                if (item.p99_response_time_ms) dataByPeriod[period].values.p99.push(item.p99_response_time_ms);
              });

              // Calculate averages for each period
              const formattedData = Object.values(dataByPeriod)
                .map(item => ({
                  time_period: item.time_period_display,
                  time_period_raw: item.time_period, // Keep raw date for sorting
                  avg_response_time_ms: item.values.avg.length > 0 
                    ? Math.round(item.values.avg.reduce((a, b) => a + b, 0) / item.values.avg.length)
                    : null,
                  p95_response_time_ms: item.values.p95.length > 0
                    ? Math.round(item.values.p95.reduce((a, b) => a + b, 0) / item.values.p95.length)
                    : null,
                  p99_response_time_ms: item.values.p99.length > 0
                    ? Math.round(item.values.p99.reduce((a, b) => a + b, 0) / item.values.p99.length)
                    : null,
                }))
                .filter(item => item.avg_response_time_ms !== null || item.p95_response_time_ms !== null || item.p99_response_time_ms !== null)
                .sort((a, b) => new Date(a.time_period_raw) - new Date(b.time_period_raw));
              
              setResponseTimes(formattedData);
            })
        );
      }

      if (activeTab === "services") {
        promises.push(
          api.get("/api/admin/api-services").then((res) => {
            setServices(res.data.data || []);
          })
        );
      }

      if (activeTab === "reports") {
        promises.push(
          api.get("/api/admin/api-usage-reports", { params: { limit: 12 } }).then((res) => {
            setReports(res.data.data || []);
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Error fetching API monitoring data:", error);
      if (error.response?.status === 403) {
        alert("Access denied. Admin privileges required.");
      }
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyReport = async () => {
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Get Monday of current week
      
      const response = await api.post("/api/admin/api-usage-report", {
        weekStart: monday.toISOString().split("T")[0],
      });
      
      alert("Weekly report generated successfully!");
      if (activeTab === "reports") {
        fetchData();
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report: " + (error.response?.data?.error || error.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      // Parse the date string - PostgreSQL returns UTC timestamps
      // We need to explicitly treat the input as UTC if it doesn't have timezone info
      let date;
      if (typeof dateString === 'string') {
        // Check if it already has timezone info (Z, +, or -)
        const hasTimezone = dateString.includes('Z') || dateString.includes('+') || 
                           (dateString.includes('-') && dateString.lastIndexOf('-') > 10);
        
        if (hasTimezone) {
          // Already has timezone, parse as-is
          date = new Date(dateString);
        } else {
          // No timezone - PostgreSQL returns these as UTC, so append 'Z'
          // Handle both "2025-12-15T09:13:23.000" and "2025-12-15 09:13:23"
          const normalized = dateString.replace(' ', 'T').replace(/\.\d+$/, '') + 'Z';
          date = new Date(normalized);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return dateString;
      }
      
      // Format in EST/EDT (America/New_York timezone)
      const estTime = date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      return estTime;
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString;
    }
  };

  const formatMs = (ms) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Calculate next quota reset date based on quota period
  const getNextResetDate = (quotaPeriod = 'monthly') => {
    const now = new Date();
    
    switch (quotaPeriod.toLowerCase()) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      
      case 'weekly':
        const nextMonday = new Date(now);
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        return nextMonday;
      
      case 'monthly':
      default:
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth;
    }
  };

  // Get the most common quota period from services (default to monthly)
  const getMostCommonQuotaPeriod = () => {
    if (quotas.length === 0) return 'monthly';
    const periods = quotas.map(q => q.quota_period || 'monthly').filter(p => p);
    if (periods.length === 0) return 'monthly';
    
    // Count occurrences
    const periodCounts = periods.reduce((acc, period) => {
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {});
    
    // Return the most common period
    return Object.keys(periodCounts).reduce((a, b) => 
      periodCounts[a] > periodCounts[b] ? a : b
    );
  };

  // Show empty state if no data and not loading
  const hasUsageData = usageStats.length > 0;
  const hasQuotaData = quotas.length > 0;
  
  // Calculate next reset date based on quota period
  const nextResetDate = getNextResetDate(getMostCommonQuotaPeriod());
  const nextResetDateFormatted = nextResetDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  if (loading) {
    return (
      <div className="api-monitoring-dashboard">
        <div className="loading">Loading API monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="api-monitoring-dashboard">
      <div className="dashboard-header">
        <h1>API Monitoring Dashboard</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={generateWeeklyReport}>
            Generate Weekly Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <label>
          Start Date:
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
          />
        </label>
        <label>
          Service:
          <select
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              setErrorPage(0);
            }}
          >
            <option value="">All Services</option>
            {services.length > 0
              ? services.map((s) => (
                  <option key={s.service_name} value={s.service_name}>
                    {s.display_name || s.service_name}
                  </option>
                ))
              : quotas.map((q) => (
                  <option key={q.service_name} value={q.service_name}>
                    {q.display_name || q.service_name}
                  </option>
                ))}
          </select>
        </label>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "usage" ? "active" : ""}
          onClick={() => setActiveTab("usage")}
        >
          Usage & Quotas
        </button>
        <button
          className={activeTab === "errors" ? "active" : ""}
          onClick={() => setActiveTab("errors")}
        >
          Error Logs
        </button>
        <button
          className={activeTab === "performance" ? "active" : ""}
          onClick={() => setActiveTab("performance")}
        >
          Performance
        </button>
        <button
          className={activeTab === "services" ? "active" : ""}
          onClick={() => setActiveTab("services")}
        >
          Services
        </button>
        <button
          className={activeTab === "reports" ? "active" : ""}
          onClick={() => setActiveTab("reports")}
        >
          Reports
        </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="overview-content">
          {/* Quota Alerts */}
          <div className="quota-alerts">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Quota Status</h2>
              <div className="quota-reset-info">
                <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>
                  Next Reset: <strong style={{ color: '#2563eb' }}>{nextResetDateFormatted}</strong>
                </span>
              </div>
            </div>
            {quotas
              .filter((q) => {
                const usagePercent = q.usage_percentage != null ? Number(q.usage_percentage) : 0;
                return usagePercent >= 100;
              })
              .map((q) => {
                const usagePercent = q.usage_percentage != null ? Number(q.usage_percentage) : 0;
                return (
                  <div key={q.service_name} className="alert error">
                    🚨 {q.display_name || q.service_name} - Limit Reached (
                    {usagePercent.toFixed(1)}% used)
                  </div>
                );
              })}
            {quotas.filter((q) => {
              const usagePercent = q.usage_percentage != null ? Number(q.usage_percentage) : 0;
              return usagePercent >= 100;
            }).length === 0 && (
              <div className="alert success">✅ All services within quota limits</div>
            )}
          </div>

          {/* Usage Summary */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Requests</h3>
              <p className="stat-value">
                {usageStats.reduce((sum, s) => sum + Number(s.total_requests || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="stat-card">
              <h3>Failed Requests</h3>
              <p className="stat-value error">
                {usageStats.reduce((sum, s) => sum + Number(s.failed_requests || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="stat-card">
              <h3>Avg Response Time</h3>
              <p className="stat-value">
                {formatMs(
                  usageStats.length > 0
                    ? usageStats.reduce(
                        (sum, s) => sum + Number(s.avg_response_time_ms || 0),
                        0
                      ) / usageStats.length
                    : 0
                )}
              </p>
            </div>
            <div className="stat-card">
              <h3>Total Errors (Period)</h3>
              <p className="stat-value error">{errors.length}</p>
            </div>
          </div>

          {/* Usage by Service Chart */}
          {usageStats.length > 0 && (
            <div className="chart-container">
              <h3>API Usage by Service</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={usageStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="service_name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    content={<CustomTooltip 
                      formatter={(value) => value === null || value === undefined ? 'N/A' : `${Number(value).toLocaleString()}`}
                      labelFormatter={(label) => `Service: ${label}`}
                    />}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="total_requests" fill="#0088FE" name="Total Requests" />
                  <Bar dataKey="successful_requests" fill="#00C49F" name="Successful" />
                  <Bar dataKey="failed_requests" fill="#FF8042" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Errors */}
          <div className="recent-errors">
            <h3>Recent Errors</h3>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Error Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 10).map((error) => (
                  <tr key={error.id}>
                    <td>{error.service_name}</td>
                    <td>
                      <span className={`error-badge ${error.error_type}`}>
                        {error.error_type}
                      </span>
                    </td>
                    <td className="error-message">
                      {error.error_message?.substring(0, 100)}
                    </td>
                    <td>{formatDate(error.created_at)} EST</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage & Quotas Tab */}
      {activeTab === "usage" && (
        <div className="usage-content">
          <h2>API Usage Statistics</h2>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Total Requests</th>
                <th>Successful</th>
                <th>Failed</th>
                <th>Avg Response Time</th>
                <th>Total Tokens</th>
                <th>Estimated Cost</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {usageStats.map((stat) => (
                <tr key={stat.service_name}>
                  <td>{stat.service_name}</td>
                  <td>{Number(stat.total_requests || 0).toLocaleString()}</td>
                  <td className="success">{Number(stat.successful_requests || 0).toLocaleString()}</td>
                  <td className="error">{Number(stat.failed_requests || 0).toLocaleString()}</td>
                  <td>{formatMs(stat.avg_response_time_ms)}</td>
                  <td>{formatTokens(stat.total_tokens_used, stat.service_name)}</td>
                  <td>${Number(stat.total_cost_estimate || 0).toFixed(4)}</td>
                  <td>{formatDate(stat.last_used_at)} EST</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: "2rem", marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Quota Status</h2>
            <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>
              <span>Next Reset: <strong style={{ color: '#2563eb' }}>{nextResetDateFormatted}</strong></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Quota Limit</th>
                <th>Usage</th>
                <th>Usage %</th>
                <th>Tokens Used</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((quota) => (
                <tr key={quota.service_name}>
                  <td>{quota.display_name || quota.service_name}</td>
                  <td>{quota.quota_limit || "Unlimited"}</td>
                  <td>{quota.usage_count || 0}</td>
                  <td>
                    {quota.quota_limit && quota.quota_limit !== "Unlimited" ? (() => {
                      const rawPercent = quota.usage_percentage;
                      const usagePercent = rawPercent != null ? Number(rawPercent) : 0;
                      return (
                        <div className="progress-percentage">
                          {isNaN(usagePercent) ? '0.0' : usagePercent.toFixed(1)}%
                        </div>
                      );
                    })() : (
                      <span>—</span>
                    )}
                  </td>
                  <td>{formatTokens(quota.tokens_used, quota.service_name)}</td>
                  <td>${Number(quota.cost_total || 0).toFixed(2)}</td>
                  <td>
                    {(() => {
                      const usagePercent = quota.usage_percentage != null ? Number(quota.usage_percentage) : 0;
                      if (usagePercent >= 100) {
                        return <span className="badge error">🚨 Limit Reached</span>;
                      } else {
                        return <span className="badge success">✅ OK</span>;
                      }
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Logs Tab */}
      {activeTab === "errors" && (
        <div className="errors-content">
          <h2>API Error Logs</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Service</th>
                <th>Endpoint</th>
                <th>Error Type</th>
                <th>Status Code</th>
                <th>Message</th>
                <th>Retry Attempt</th>
                <th>Fallback Used</th>
              </tr>
            </thead>
            <tbody>
                {errors.map((error) => (
                <tr key={error.id}>
                  <td>{formatDate(error.created_at)} EST</td>
                  <td>{error.service_name}</td>
                  <td>{error.endpoint || "N/A"}</td>
                  <td>
                    <span className={`error-badge ${error.error_type}`}>
                      {error.error_type}
                    </span>
                  </td>
                  <td>{error.status_code || "N/A"}</td>
                  <td className="error-message">{error.error_message}</td>
                  <td>{error.retry_attempt || 0}</td>
                  <td>{error.fallback_used ? "✅ Yes" : "❌ No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              disabled={errorPage === 0}
              onClick={() => setErrorPage(errorPage - 1)}
            >
              Previous
            </button>
            <span>Page {errorPage + 1}</span>
            <button
              disabled={errors.length < errorLimit}
              onClick={() => setErrorPage(errorPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <div className="performance-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>API Response Time Performance</h2>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <strong>Next Reset:</strong> {nextResetDateFormatted}
            </div>
          </div>
          {responseTimes.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={450}>
                <LineChart 
                  data={responseTimes}
                  margin={{ top: 20, right: 40, left: 70, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="time_period" 
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={Math.max(0, Math.floor(responseTimes.length / 15))}
                    tick={{ fontSize: 11, fill: '#666' }}
                    label={{ value: 'Date', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: '#333', fontSize: '14px', fontWeight: 600 } }}
                  />
                  <YAxis 
                    label={{ value: "Response Time (ms)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle', fill: '#333', fontSize: '14px', fontWeight: 600 } }}
                    domain={[0, 'dataMax + 500']}
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    content={<CustomTooltip 
                      formatter={(value) => value === null || value === undefined ? 'N/A' : `${Number(value).toLocaleString()} ms`}
                      labelFormatter={(label) => `📅 ${label}`}
                    />}
                    cursor={{ stroke: '#888', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                    formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_response_time_ms"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3b82f6', r: 3, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    name="Average Response Time"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95_response_time_ms"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 3, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                    name="95th Percentile"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p99_response_time_ms"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ fill: '#ef4444', r: 3, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                    name="99th Percentile"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem', color: '#666' }}>
                <strong>Legend:</strong> This graph shows API response time trends over time. 
                <strong> Average</strong> represents typical response times, while <strong>95th</strong> and <strong>99th Percentile</strong> show slower responses that affect a small percentage of requests.
              </div>
            </div>
          ) : (
            <p>No response time data available for the selected period.</p>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="services-content">
          <h2>API Services Configuration</h2>
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Display Name</th>
                <th>Base URL</th>
                <th>Quota Limit</th>
                <th>Quota Period</th>
                <th>Rate Limit (per min)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.service_name}</td>
                  <td>{service.display_name}</td>
                  <td>{service.base_url || "N/A"}</td>
                  <td>{service.quota_limit || "Unlimited"}</td>
                  <td>{service.quota_period}</td>
                  <td>{service.rate_limit_per_minute || "N/A"}</td>
                  <td>
                    {service.enabled ? (
                      <span className="badge success">✅ Enabled</span>
                    ) : (
                      <span className="badge error">❌ Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="reports-content">
          <h2>Weekly API Usage Reports</h2>
          {reports.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Week Start</th>
                  <th>Total Requests</th>
                  <th>Total Errors</th>
                  <th>Total Tokens</th>
                  <th>Total Cost</th>
                  <th>Avg Response Time</th>
                  <th>Generated At</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.report_week_start ? formatDate(report.report_week_start) + " EST" : "N/A"}</td>
                    <td>{report.total_requests}</td>
                    <td className="error">{report.total_errors}</td>
                    <td>{formatTokens(report.total_tokens_used, null)}</td>
                    <td>${Number(report.total_cost || 0).toFixed(2)}</td>
                    <td>{formatMs(report.avg_response_time_ms)}</td>
                    <td>{formatDate(report.generated_at)} EST</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No reports available. Generate a report to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}
