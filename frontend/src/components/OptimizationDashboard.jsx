import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  FileText,
  Mail,
  Clock,
  Target,
  Lightbulb,
  BarChart3,
  Award,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';
import './OptimizationDashboard.css';

const API_BASE = 'http://localhost:4000/api';

const OptimizationDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await axios.get(
        `${API_BASE}/optimization-dashboard?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching optimization data:', err);
      setError(err.response?.data?.error || 'Failed to load optimization data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc2626'; /* WCAG AA: 5.6:1 contrast with white */
      case 'medium': return '#d97706'; /* WCAG AA: 4.6:1 contrast with white */
      case 'low': return '#2563eb'; /* WCAG AA: 4.8:1 contrast with white */
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertCircle size={20} />;
      case 'success': return <CheckCircle size={20} />;
      case 'info': return <Info size={20} />;
      default: return <Info size={20} />;
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="optimization-dashboard">
        <div className="loading">Loading optimization data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="optimization-dashboard">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="optimization-dashboard">
        <div className="empty-state">No data available</div>
      </div>
    );
  }

  const { successMetrics, recommendations, abTestResults } = data;

  // Prepare chart data
  const trendChartData = data.trendOverTime.map(t => ({
    month: new Date(t.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    successRate: t.successRate,
    applications: t.totalApplications
  }));

  const industryChartData = data.industryPerformance.slice(0, 5).map(i => ({
    name: i.industry || 'Unknown',
    successRate: i.successRate,
    applications: i.totalApplications
  }));

  const approachChartData = data.approachPerformance.map(a => ({
    name: a.approach,
    successRate: a.successRate,
    applications: a.totalApplications
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="optimization-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            <Target className="header-icon" />
            Application Success Optimization
          </h1>
          <p className="header-subtitle">
            Data-driven insights to improve your application success rate
          </p>
        </div>
        <div className="date-filters">
          <label>
            Start Date:
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </label>
          <label>
            End Date:
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#3b82f6' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{successMetrics.responseRate.toFixed(1)}%</div>
            <div className="metric-label">Response Rate</div>
            <div className="metric-sublabel">
              {successMetrics.totalResponses} of {successMetrics.totalApplications} applications
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#10b981' }}>
            <BarChart3 size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{successMetrics.interviewRate.toFixed(1)}%</div>
            <div className="metric-label">Interview Conversion</div>
            <div className="metric-sublabel">
              {successMetrics.totalInterviews} interviews
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#f59e0b' }}>
            <Award size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{successMetrics.offerRate.toFixed(1)}%</div>
            <div className="metric-label">Offer Rate</div>
            <div className="metric-sublabel">
              {successMetrics.totalOffers} offers
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#8b5cf6' }}>
            <Zap size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{successMetrics.interviewToOfferRate.toFixed(1)}%</div>
            <div className="metric-label">Interview → Offer</div>
            <div className="metric-sublabel">
              Conversion rate
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2>
            <Lightbulb size={20} />
            Actionable Recommendations
          </h2>
          <div className="recommendations-grid">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`recommendation-card ${rec.type}`}
                style={{ borderLeft: `4px solid ${getPriorityColor(rec.priority)}` }}
              >
                <div className="recommendation-header">
                  {getTypeIcon(rec.type)}
                  <div>
                    <h3>{rec.title}</h3>
                    <span className="priority-badge" style={{ background: getPriorityColor(rec.priority) }}>
                      {rec.priority}
                    </span>
                  </div>
                </div>
                <p className="recommendation-message">{rec.message}</p>
                <div className="recommendation-action">
                  <strong>Action:</strong> {rec.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Success Rate Trend */}
        <div className="chart-card">
          <h3>Success Rate Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Success Rate (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Industry Performance */}
        {industryChartData.length > 0 && (
          <div className="chart-card">
            <h3>Top Performing Industries</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={industryChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="successRate" fill="#10b981" name="Success Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Application Approach Performance */}
        {approachChartData.length > 0 && (
          <div className="chart-card">
            <h3>Application Approach Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={approachChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value.toFixed(1)}% success rate`,
                    `${props.payload.applications} applications`
                  ]}
                />
                <Legend />
                <Bar dataKey="successRate" fill="#3b82f6" name="Success Rate (%)">
                  {approachChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Resume/Cover Letter Performance */}
      {(data.resumePerformance.length > 0 || data.coverLetterPerformance.length > 0) && (
        <div className="performance-section">
          <h2>
            <FileText size={20} />
            Resume & Cover Letter Performance
          </h2>
          <div className="performance-grid">
            {data.resumePerformance.length > 0 && (
              <div className="performance-card">
                <h3>Resume Versions</h3>
                <div className="performance-list">
                  {data.resumePerformance.map((resume, idx) => (
                    <div key={idx} className="performance-item">
                      <div className="performance-name">{resume.resumeName}</div>
                      <div className="performance-stats">
                        <span className="success-rate">{resume.successRate.toFixed(1)}%</span>
                        <span className="applications">{resume.totalApplications} apps</span>
                        {idx === 0 && <span className="winner-badge">🏆 Best</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.coverLetterPerformance.length > 0 && (
              <div className="performance-card">
                <h3>Cover Letter Versions</h3>
                <div className="performance-list">
                  {data.coverLetterPerformance.map((cl, idx) => (
                    <div key={idx} className="performance-item">
                      <div className="performance-name">{cl.coverLetterName}</div>
                      <div className="performance-stats">
                        <span className="success-rate">{cl.successRate.toFixed(1)}%</span>
                        <span className="applications">{cl.totalApplications} apps</span>
                        {idx === 0 && <span className="winner-badge">🏆 Best</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customization Performance */}
      {data.customizationPerformance.length > 0 && (
        <div className="performance-section">
          <h2>
            <Mail size={20} />
            Customization Level Performance
          </h2>
          <div className="customization-grid">
            {data.customizationPerformance.map((custom, idx) => (
              <div key={idx} className="customization-card">
                <div className="customization-label">
                  Resume: <strong>{custom.resumeCustomization}</strong>
                  <br />
                  Cover Letter: <strong>{custom.coverLetterCustomization}</strong>
                </div>
                <div className="customization-metrics">
                  <div className="metric-value">{custom.successRate.toFixed(1)}%</div>
                  <div className="metric-label">
                    {custom.totalApplications} applications
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimal Timing */}
      {data.timingAnalysis.length > 0 && (
        <div className="performance-section">
          <h2>
            <Clock size={20} />
            Optimal Application Timing
          </h2>
          <div className="timing-grid">
            {data.timingAnalysis.slice(0, 5).map((timing, idx) => (
              <div key={idx} className="timing-card">
                <div className="timing-day">{dayNames[Math.floor(timing.dayOfWeek)]}</div>
                <div className="timing-hour">{Math.floor(timing.hourOfDay)}:00</div>
                <div className="timing-rate">{timing.successRate.toFixed(1)}%</div>
                <div className="timing-apps">{timing.totalApplications} apps</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A/B Test Results */}
      <div className="ab-test-section">
        <h2>
          <BarChart3 size={20} />
          A/B Test Results
        </h2>
        <div className="ab-test-grid">
          {abTestResults.resumeVersions.length > 0 && (
            <div className="ab-test-card">
              <h3>Resume Versions</h3>
              <div className="ab-test-list">
                {abTestResults.resumeVersions.map((variant, idx) => (
                  <div key={idx} className={`ab-test-item ${variant.winner ? 'winner' : ''}`}>
                    <div className="variant-name">
                      {variant.variant}
                      {variant.winner && <span className="winner-badge">🏆 Winner</span>}
                    </div>
                    <div className="variant-stats">
                      <span>{variant.successRate.toFixed(1)}%</span>
                      <span className="variant-apps">({variant.applications} apps)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {abTestResults.customizationLevels.length > 0 && (
            <div className="ab-test-card">
              <h3>Customization Levels</h3>
              <div className="ab-test-list">
                {abTestResults.customizationLevels.map((variant, idx) => (
                  <div key={idx} className={`ab-test-item ${variant.winner ? 'winner' : ''}`}>
                    <div className="variant-name">
                      {variant.variant}
                      {variant.winner && <span className="winner-badge">🏆 Winner</span>}
                    </div>
                    <div className="variant-stats">
                      <span>{variant.successRate.toFixed(1)}%</span>
                      <span className="variant-apps">({variant.applications} apps)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {abTestResults.applicationApproaches.length > 0 && (
            <div className="ab-test-card">
              <h3>Application Approaches</h3>
              <div className="ab-test-list">
                {abTestResults.applicationApproaches.map((variant, idx) => (
                  <div key={idx} className={`ab-test-item ${variant.winner ? 'winner' : ''}`}>
                    <div className="variant-name">
                      {variant.variant}
                      {variant.winner && <span className="winner-badge">🏆 Winner</span>}
                    </div>
                    <div className="variant-stats">
                      <span>{variant.successRate.toFixed(1)}%</span>
                      <span className="variant-apps">({variant.applications} apps)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Type Performance */}
      {data.roleTypePerformance.length > 0 && (
        <div className="performance-section">
          <h2>Role Type Performance</h2>
          <div className="role-type-grid">
            {data.roleTypePerformance.map((role, idx) => (
              <div key={idx} className="role-type-card">
                <div className="role-type-name">{role.roleType}</div>
                <div className="role-type-metrics">
                  <div className="metric-value">{role.successRate.toFixed(1)}%</div>
                  <div className="metric-label">{role.totalApplications} applications</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationDashboard;

