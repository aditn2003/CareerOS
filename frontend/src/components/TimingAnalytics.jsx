// frontend/src/components/TimingAnalytics.jsx
// UC-124 Stage 4: Timing Analytics Dashboard

import React, { useState, useEffect } from "react";
import { api } from "../api";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import "./TimingAnalytics.css";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export default function TimingAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [responseRates, setResponseRates] = useState({ day: null, hour: null, industry: null });
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [abTests, setAbTests] = useState([]);
  const [showAbTestForm, setShowAbTestForm] = useState(false);
  const [abTestForm, setAbTestForm] = useState({
    testType: 'day_of_week',
    testName: '',
    description: '',
    variantA: { day_of_week: 2 },
    variantB: { day_of_week: 4 }
  });

  useEffect(() => {
    loadAllData();
    loadAbTests();
  }, []);

  const loadAbTests = async () => {
    try {
      const res = await api.get("/api/timing/ab-tests");
      setAbTests(res.data.tests || []);
    } catch (err) {
      console.error("❌ Error loading A/B tests:", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsRes, dayRes, hourRes, industryRes, correlationRes] = await Promise.all([
        api.get("/api/timing/analytics"),
        api.get("/api/timing/response-rates?groupBy=day"),
        api.get("/api/timing/response-rates?groupBy=hour"),
        api.get("/api/timing/response-rates?groupBy=industry"),
        api.get("/api/timing/correlation")
      ]);

      setAnalytics(analyticsRes.data);
      setResponseRates({
        day: dayRes.data,
        hour: hourRes.data,
        industry: industryRes.data
      });
      setCorrelation(correlationRes.data);
    } catch (err) {
      console.error("❌ Error loading timing analytics:", err);
      setError(err.response?.data?.error || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return "0%";
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="timing-analytics-loading">
        <p>Loading timing analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timing-analytics-error">
        <p>❌ {error}</p>
        <button onClick={loadAllData}>Retry</button>
      </div>
    );
  }

  if (!analytics || !responseRates.day) {
    return (
      <div className="timing-analytics-empty">
        <p>No analytics data available yet.</p>
        <p className="timing-analytics-empty-note">
          Submit some applications to start seeing timing analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="timing-analytics">
      <div className="timing-analytics-header">
        <h2>📊 Timing Analytics Dashboard</h2>
        <p className="timing-analytics-subtitle">
          Analyze how submission timing affects your response rates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="timing-analytics-summary">
        <div className="timing-summary-card">
          <div className="timing-summary-icon">📝</div>
          <div className="timing-summary-content">
            <h3>{analytics.summary.total_submissions}</h3>
            <p>Total Submissions</p>
          </div>
        </div>
        <div className="timing-summary-card">
          <div className="timing-summary-icon">📧</div>
          <div className="timing-summary-content">
            <h3>{formatPercent(analytics.summary.response_rate)}</h3>
            <p>Response Rate</p>
          </div>
        </div>
        <div className="timing-summary-card">
          <div className="timing-summary-icon">💼</div>
          <div className="timing-summary-content">
            <h3>{formatPercent(analytics.summary.interview_rate)}</h3>
            <p>Interview Rate</p>
          </div>
        </div>
        <div className="timing-summary-card">
          <div className="timing-summary-icon">🎉</div>
          <div className="timing-summary-content">
            <h3>{formatPercent(analytics.summary.offer_rate)}</h3>
            <p>Offer Rate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="timing-analytics-tabs">
        <button
          className={`timing-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`timing-tab-btn ${activeTab === 'day' ? 'active' : ''}`}
          onClick={() => setActiveTab('day')}
        >
          By Day of Week
        </button>
        <button
          className={`timing-tab-btn ${activeTab === 'hour' ? 'active' : ''}`}
          onClick={() => setActiveTab('hour')}
        >
          By Time of Day
        </button>
        <button
          className={`timing-tab-btn ${activeTab === 'industry' ? 'active' : ''}`}
          onClick={() => setActiveTab('industry')}
        >
          By Industry
        </button>
        <button
          className={`timing-tab-btn ${activeTab === 'correlation' ? 'active' : ''}`}
          onClick={() => setActiveTab('correlation')}
        >
          Best/Worst Times
        </button>
        <button
          className={`timing-tab-btn ${activeTab === 'ab-tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('ab-tests')}
        >
          A/B Tests
        </button>
      </div>

      {/* Tab Content */}
      <div className="timing-analytics-content">
        {activeTab === 'overview' && (
          <div className="timing-chart-section">
            <h3>Response Rates by Day of Week</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseRates.day.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Legend />
                <Bar dataKey="response_rate" fill="#3b82f6" name="Response Rate" />
                <Bar dataKey="interview_rate" fill="#10b981" name="Interview Rate" />
                <Bar dataKey="offer_rate" fill="#f59e0b" name="Offer Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'day' && (
          <div className="timing-chart-section">
            <h3>Performance by Day of Week</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={responseRates.day.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_submissions" fill="#6366f1" name="Total Submissions" />
                <Bar dataKey="responses" fill="#3b82f6" name="Responses" />
                <Bar dataKey="interviews" fill="#10b981" name="Interviews" />
                <Bar dataKey="offers" fill="#f59e0b" name="Offers" />
              </BarChart>
            </ResponsiveContainer>
            <div className="timing-chart-table">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Submissions</th>
                    <th>Response Rate</th>
                    <th>Interview Rate</th>
                    <th>Offer Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {responseRates.day.data.map((item, index) => (
                    <tr key={index}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.total_submissions}</td>
                      <td>{formatPercent(item.response_rate)}</td>
                      <td>{formatPercent(item.interview_rate)}</td>
                      <td>{formatPercent(item.offer_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hour' && (
          <div className="timing-chart-section">
            <h3>Performance by Time of Day</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={responseRates.hour.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Legend />
                <Line type="monotone" dataKey="response_rate" stroke="#3b82f6" name="Response Rate" strokeWidth={2} />
                <Line type="monotone" dataKey="interview_rate" stroke="#10b981" name="Interview Rate" strokeWidth={2} />
                <Line type="monotone" dataKey="offer_rate" stroke="#f59e0b" name="Offer Rate" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="timing-chart-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Submissions</th>
                    <th>Response Rate</th>
                    <th>Interview Rate</th>
                    <th>Offer Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {responseRates.hour.data.map((item, index) => (
                    <tr key={index}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.total_submissions}</td>
                      <td>{formatPercent(item.response_rate)}</td>
                      <td>{formatPercent(item.interview_rate)}</td>
                      <td>{formatPercent(item.offer_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'industry' && responseRates.industry && (
          <div className="timing-chart-section">
            <h3>Performance by Industry</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={responseRates.industry.data}
                  dataKey="response_rate"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={(entry) => `${entry.name}: ${formatPercent(entry.response_rate)}`}
                >
                  {responseRates.industry.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="timing-chart-table">
              <table>
                <thead>
                  <tr>
                    <th>Industry</th>
                    <th>Submissions</th>
                    <th>Response Rate</th>
                    <th>Interview Rate</th>
                    <th>Offer Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {responseRates.industry.data.map((item, index) => (
                    <tr key={index}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.total_submissions}</td>
                      <td>{formatPercent(item.response_rate)}</td>
                      <td>{formatPercent(item.interview_rate)}</td>
                      <td>{formatPercent(item.offer_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'correlation' && correlation && (
          <div className="timing-correlation-section">
            <div className="timing-correlation-best">
              <h3>🏆 Best Performing Time Slots</h3>
              <div className="timing-slot-grid">
                {correlation.best_performing.map((slot, index) => (
                  <div key={index} className="timing-slot-card timing-slot-best">
                    <div className="timing-slot-header">
                      <span className="timing-slot-rank">#{index + 1}</span>
                      <div>
                        <strong>{slot.day_name}</strong>
                        <span className="timing-slot-time">{slot.formatted_time}</span>
                      </div>
                    </div>
                    <div className="timing-slot-stats">
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Submissions:</span>
                        <span className="timing-slot-stat-value">{slot.total_submissions}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Response Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.response_rate)}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Interview Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.interview_rate)}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Offer Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.offer_rate)}</span>
                      </div>
                    </div>
                    <div className="timing-slot-score">
                      Score: {(slot.score * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="timing-correlation-worst">
              <h3>⚠️ Worst Performing Time Slots</h3>
              <div className="timing-slot-grid">
                {correlation.worst_performing.map((slot, index) => (
                  <div key={index} className="timing-slot-card timing-slot-worst">
                    <div className="timing-slot-header">
                      <span className="timing-slot-rank">#{index + 1}</span>
                      <div>
                        <strong>{slot.day_name}</strong>
                        <span className="timing-slot-time">{slot.formatted_time}</span>
                      </div>
                    </div>
                    <div className="timing-slot-stats">
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Submissions:</span>
                        <span className="timing-slot-stat-value">{slot.total_submissions}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Response Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.response_rate)}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Interview Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.interview_rate)}</span>
                      </div>
                      <div className="timing-slot-stat">
                        <span className="timing-slot-stat-label">Offer Rate:</span>
                        <span className="timing-slot-stat-value">{formatPercent(slot.offer_rate)}</span>
                      </div>
                    </div>
                    <div className="timing-slot-score">
                      Score: {(slot.score * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ab-tests' && (
          <div className="timing-ab-tests-section">
            <div className="timing-ab-tests-header">
              <h3>A/B Test Results</h3>
              <button
                className="timing-create-ab-test-btn"
                onClick={() => setShowAbTestForm(!showAbTestForm)}
              >
                {showAbTestForm ? "Cancel" : "+ Create A/B Test"}
              </button>
            </div>

            {/* A/B Test Form */}
            {showAbTestForm && (
              <div className="timing-ab-test-form">
                <h4>Create New A/B Test</h4>
                <div className="ab-test-form-fields">
                  <div className="ab-test-form-field">
                    <label>Test Type:</label>
                    <select
                      value={abTestForm.testType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setAbTestForm({
                          ...abTestForm,
                          testType: newType,
                          variantA: newType === 'day_of_week' ? { day_of_week: 2 } :
                                   newType === 'time_of_day' ? { hour_of_day: 10 } :
                                   newType === 'day_hour_combination' ? { day_of_week: 2, hour_of_day: 10 } :
                                   { industry: '', day_of_week: 2 },
                          variantB: newType === 'day_of_week' ? { day_of_week: 4 } :
                                   newType === 'time_of_day' ? { hour_of_day: 14 } :
                                   newType === 'day_hour_combination' ? { day_of_week: 4, hour_of_day: 14 } :
                                   { industry: '', day_of_week: 4 }
                        });
                      }}
                    >
                      <option value="day_of_week">Day of Week</option>
                      <option value="time_of_day">Time of Day</option>
                      <option value="day_hour_combination">Day + Hour Combination</option>
                      <option value="industry_specific">Industry Specific</option>
                    </select>
                  </div>
                  <div className="ab-test-form-field">
                    <label>Test Name:</label>
                    <input
                      type="text"
                      value={abTestForm.testName}
                      onChange={(e) => setAbTestForm({ ...abTestForm, testName: e.target.value })}
                      placeholder="e.g., Tuesday vs Thursday"
                    />
                  </div>
                  <div className="ab-test-form-field">
                    <label>Description:</label>
                    <textarea
                      value={abTestForm.description}
                      onChange={(e) => setAbTestForm({ ...abTestForm, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  <div className="ab-test-variants">
                    <div className="ab-test-variant">
                      <h5>Variant A</h5>
                      {abTestForm.testType === 'day_of_week' && (
                        <select
                          value={abTestForm.variantA.day_of_week}
                          onChange={(e) => setAbTestForm({
                            ...abTestForm,
                            variantA: { day_of_week: parseInt(e.target.value) }
                          })}
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map(day => (
                            <option key={day} value={day}>
                              {getDayName(day)}
                            </option>
                          ))}
                        </select>
                      )}
                      {abTestForm.testType === 'time_of_day' && (
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={abTestForm.variantA.hour_of_day}
                          onChange={(e) => setAbTestForm({
                            ...abTestForm,
                            variantA: { hour_of_day: parseInt(e.target.value) }
                          })}
                        />
                      )}
                      {abTestForm.testType === 'day_hour_combination' && (
                        <>
                          <select
                            value={abTestForm.variantA.day_of_week}
                            onChange={(e) => setAbTestForm({
                              ...abTestForm,
                              variantA: { ...abTestForm.variantA, day_of_week: parseInt(e.target.value) }
                            })}
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                              <option key={day} value={day}>{getDayName(day)}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={abTestForm.variantA.hour_of_day}
                            onChange={(e) => setAbTestForm({
                              ...abTestForm,
                              variantA: { ...abTestForm.variantA, hour_of_day: parseInt(e.target.value) }
                            })}
                          />
                        </>
                      )}
                    </div>
                    <div className="ab-test-variant">
                      <h5>Variant B</h5>
                      {abTestForm.testType === 'day_of_week' && (
                        <select
                          value={abTestForm.variantB.day_of_week}
                          onChange={(e) => setAbTestForm({
                            ...abTestForm,
                            variantB: { day_of_week: parseInt(e.target.value) }
                          })}
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map(day => (
                            <option key={day} value={day}>
                              {getDayName(day)}
                            </option>
                          ))}
                        </select>
                      )}
                      {abTestForm.testType === 'time_of_day' && (
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={abTestForm.variantB.hour_of_day}
                          onChange={(e) => setAbTestForm({
                            ...abTestForm,
                            variantB: { hour_of_day: parseInt(e.target.value) }
                          })}
                        />
                      )}
                      {abTestForm.testType === 'day_hour_combination' && (
                        <>
                          <select
                            value={abTestForm.variantB.day_of_week}
                            onChange={(e) => setAbTestForm({
                              ...abTestForm,
                              variantB: { ...abTestForm.variantB, day_of_week: parseInt(e.target.value) }
                            })}
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                              <option key={day} value={day}>{getDayName(day)}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={abTestForm.variantB.hour_of_day}
                            onChange={(e) => setAbTestForm({
                              ...abTestForm,
                              variantB: { ...abTestForm.variantB, hour_of_day: parseInt(e.target.value) }
                            })}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    className="ab-test-submit-btn"
                    onClick={async () => {
                      try {
                        await api.post("/api/timing/ab-test", abTestForm);
                        setShowAbTestForm(false);
                        setAbTestForm({
                          testType: 'day_of_week',
                          testName: '',
                          description: '',
                          variantA: { day_of_week: 2 },
                          variantB: { day_of_week: 4 }
                        });
                        await loadAbTests();
                      } catch (err) {
                        alert(err.response?.data?.error || "Failed to create A/B test");
                      }
                    }}
                  >
                    Create A/B Test
                  </button>
                </div>
              </div>
            )}

            {/* A/B Tests List */}
            {abTests.length === 0 ? (
              <div className="timing-ab-tests-empty">
                <p>No A/B tests yet. Create one to compare different timing strategies!</p>
              </div>
            ) : (
              <div className="timing-ab-tests-list">
                {abTests.map((test) => (
                  <div key={test.id} className={`timing-ab-test-card timing-ab-test-${test.status}`}>
                    <div className="ab-test-card-header">
                      <div>
                        <h4>{test.test_name || `${test.test_type} A/B Test`}</h4>
                        <span className="ab-test-status-badge">{test.status}</span>
                      </div>
                      {test.winner && test.winner !== 'pending' && test.winner !== 'inconclusive' && (
                        <div className="ab-test-winner">
                          Winner: <strong>{test.winner === 'variant_a' ? test.variant_a_display : test.variant_b_display}</strong>
                        </div>
                      )}
                      {test.winner === 'inconclusive' && (
                        <div className="ab-test-winner" style={{ color: '#f59e0b' }}>
                          Result: <strong>Inconclusive</strong> (Not statistically significant)
                        </div>
                      )}
                    </div>
                    {test.description && (
                      <p className="ab-test-description">{test.description}</p>
                    )}
                    <div className="ab-test-comparison">
                      <div className="ab-test-variant-result">
                        <h5>{test.variant_a_display}</h5>
                        {test.results_a ? (
                          <>
                            <div className="ab-test-metric">
                              <span>Submissions:</span> <strong>{test.results_a.total_submissions}</strong>
                            </div>
                            <div className="ab-test-metric">
                              <span>Response Rate:</span> <strong>{formatPercent(test.results_a.response_rate)}</strong>
                            </div>
                            <div className="ab-test-metric">
                              <span>Interview Rate:</span> <strong>{formatPercent(test.results_a.interview_rate)}</strong>
                            </div>
                          </>
                        ) : (
                          <p className="ab-test-no-data">No data yet</p>
                        )}
                      </div>
                      <div className="ab-test-vs">VS</div>
                      <div className="ab-test-variant-result">
                        <h5>{test.variant_b_display}</h5>
                        {test.results_b ? (
                          <>
                            <div className="ab-test-metric">
                              <span>Submissions:</span> <strong>{test.results_b.total_submissions}</strong>
                            </div>
                            <div className="ab-test-metric">
                              <span>Response Rate:</span> <strong>{formatPercent(test.results_b.response_rate)}</strong>
                            </div>
                            <div className="ab-test-metric">
                              <span>Interview Rate:</span> <strong>{formatPercent(test.results_b.interview_rate)}</strong>
                            </div>
                          </>
                        ) : (
                          <p className="ab-test-no-data">No data yet</p>
                        )}
                      </div>
                    </div>
                    {test.impact_description && (
                      <div className="ab-test-impact">
                        <strong>Impact:</strong> {test.impact_description}
                      </div>
                    )}
                    <div className="ab-test-actions">
                      <button
                        className="ab-test-recalculate-btn"
                        onClick={async () => {
                          try {
                            await api.post("/api/timing/ab-test", {
                              testId: test.id,
                              variantA: test.variant_a_data,
                              variantB: test.variant_b_data,
                              testType: test.test_type
                            });
                            await loadAbTests();
                          } catch (err) {
                            alert(err.response?.data?.error || "Failed to recalculate");
                          }
                        }}
                      >
                        🔄 Recalculate Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions for day names and hour formatting
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

