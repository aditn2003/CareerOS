// src/pages/Interviews/InterviewAnalytics.jsx
import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./InterviewAnalytics.css";

function InterviewAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const userId = getUserId();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/interview-analytics/analytics", {
        params: { userId, timeRange }
      });
      
      if (res.data.success) {
        setAnalytics(res.data.data);
      } else {
        setError(res.data.error || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.response?.data?.error || err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing your interview performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>Unable to load analytics: {error}</p>
        <button onClick={fetchAnalytics} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-error">
        <p>No analytics data available</p>
        <button onClick={fetchAnalytics} className="retry-btn">Retry</button>
      </div>
    );
  }

  const { 
    summary = {}, 
    companyTypeAnalysis = [], 
    strongestAreas = [], 
    weakestAreas = [], 
    topStrengths = [], 
    topWeaknesses = [],
    formatComparison = [], 
    improvementOverTime = {}, 
    trendsOverTime = [], 
    practiceImpact = {}, 
    benchmarkComparison = {}, 
    aiInsights = {} 
  } = analytics;

  // Show empty state if no interviews tracked
  if (summary.totalInterviews === 0) {
    return (
      <div className="interview-analytics-container">
        <div className="analytics-header">
          <div>
            <h1 className="page-title">📊 Interview Performance Analytics</h1>
            <p className="page-subtitle">Track your progress, identify patterns, and improve your success rate</p>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Interview Data Yet</h3>
          <p>Start tracking your interviews to unlock detailed analytics and personalized insights.</p>
          <div className="empty-state-tips">
            <h4>What you'll get:</h4>
            <ul>
              <li>✅ Track interview-to-offer conversion rates</li>
              <li>✅ Compare performance across company types</li>
              <li>✅ Identify your strongest and weakest areas</li>
              <li>✅ See how different formats affect your success</li>
              <li>✅ Monitor improvement over time</li>
              <li>✅ Get AI-powered strategy recommendations</li>
              <li>✅ Benchmark against industry standards</li>
              <li>✅ Receive personalized improvement tips</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="page-title">📊 Interview Performance Analytics</h1>
          <p className="page-subtitle">Track your progress, identify patterns, and improve your success rate</p>
        </div>
        
        {/* Time Range Filter */}
        <div className="time-range-filter">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📊 Trends & Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          💡 AI Insights
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="analytics-content">
          {/* ===== ACCEPTANCE CRITERIA 1: Conversion Rates ===== */}
          <div className="section summary-section">
            <h2>🎯 Success Metrics</h2>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">🎤</div>
                <div className="card-value">{summary.totalInterviews || 0}</div>
                <div className="card-label">Total Interviews</div>
              </div>
              <div className="summary-card highlight">
                <div className="card-icon">✅</div>
                <div className="card-value">{(summary.conversionRate || 0).toFixed(1)}%</div>
                <div className="card-label">Conversion Rate</div>
                <div className="card-sublabel">Interviews → Offers</div>
              </div>
              <div className="summary-card">
                <div className="card-icon">🎁</div>
                <div className="card-value">{summary.totalOffers || 0}</div>
                <div className="card-label">Offers Received</div>
              </div>
              <div className="summary-card">
                <div className="card-icon">⭐</div>
                <div className="card-value">{(summary.avgSelfRating || 0).toFixed(1)}/5</div>
                <div className="card-label">Avg Performance</div>
              </div>
              <div className="summary-card">
                <div className="card-icon">💪</div>
                <div className="card-value">{(summary.avgConfidence || 0).toFixed(1)}/5</div>
                <div className="card-label">Avg Confidence</div>
              </div>
              <div className="summary-card">
                <div className="card-icon">🎭</div>
                <div className="card-value">{summary.totalPractice || 0}</div>
                <div className="card-label">Practice Sessions</div>
              </div>
            </div>
          </div>

          {/* ===== ACCEPTANCE CRITERIA 2: Company Type Analysis ===== */}
          {companyTypeAnalysis && companyTypeAnalysis.length > 0 && (
            <div className="section company-analysis-section">
              <h2>🏢 Performance by Company Type</h2>
              <p className="section-intro">See how you perform across different company sizes and stages</p>
              <div className="company-type-grid">
                {companyTypeAnalysis.map((type, idx) => (
                  <div key={idx} className="company-type-card">
                    <div className="type-header">
                      <h3>{type.type}</h3>
                      <span className="type-badge">{type.total} interviews</span>
                    </div>
                    <div className="type-stats">
                      <div className="stat-row">
                        <span className="stat-label">Conversion Rate:</span>
                        <span className="stat-value">{type.conversionRate}%</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Offers:</span>
                        <span className="stat-value">{type.offers}/{type.total}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Avg Performance:</span>
                        <span className="stat-value">{type.avgPerformance}/5</span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="conversion-bar-container">
                      <div 
                        className="conversion-bar" 
                        style={{ width: `${Math.min(type.conversionRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ACCEPTANCE CRITERIA 3: Strengths & Weaknesses ===== */}
          <div className="section-row">
            {/* Strongest Areas */}
            {strongestAreas && strongestAreas.length > 0 && (
              <div className="section strengths-section">
                <h2>💪 Your Strongest Areas</h2>
                <div className="areas-list">
                  {strongestAreas.map((area, idx) => (
                    <div key={idx} className="area-item strong">
                      <div className="area-info">
                        <span className="area-name">{area.area}</span>
                        <span className="area-count">{area.count} interviews</span>
                      </div>
                      <div className="area-rating">
                        <span className="rating-value">{area.avgRating}/5</span>
                        <div className="rating-bar">
                          <div 
                            className="rating-fill strong" 
                            style={{ width: `${(area.avgRating / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weakest Areas */}
            {weakestAreas && weakestAreas.length > 0 && (
              <div className="section weaknesses-section">
                <h2>🎯 Areas for Improvement</h2>
                <div className="areas-list">
                  {weakestAreas.map((area, idx) => (
                    <div key={idx} className="area-item weak">
                      <div className="area-info">
                        <span className="area-name">{area.area}</span>
                        <span className="area-count">{area.count} interviews</span>
                      </div>
                      <div className="area-rating">
                        <span className="rating-value">{area.avgRating}/5</span>
                        <div className="rating-bar">
                          <div 
                            className="rating-fill weak" 
                            style={{ width: `${(area.avgRating / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== ACCEPTANCE CRITERIA 4: Format Comparison ===== */}
          {formatComparison && formatComparison.length > 0 && (
            <div className="section format-comparison-section">
              <h2>💻 Performance by Interview Format</h2>
              <p className="section-intro">Compare your success across different interview formats</p>
              <div className="format-grid">
                {formatComparison.map((format, idx) => (
                  <div key={idx} className="format-card">
                    <div className="format-icon">
                      {format.format === 'remote' ? '🖥️' : 
                       format.format === 'in_person' ? '🏢' : 
                       format.format === 'hybrid' ? '🔄' : '❓'}
                    </div>
                    <h3>{format.format.replace(/_/g, ' ').toUpperCase()}</h3>
                    <div className="format-stats">
                      <div className="format-stat">
                        <span className="stat-label">Conversion:</span>
                        <span className="stat-value">{format.conversionRate}%</span>
                      </div>
                      <div className="format-stat">
                        <span className="stat-label">Performance:</span>
                        <span className="stat-value">{format.avgPerformance}/5</span>
                      </div>
                      <div className="format-stat">
                        <span className="stat-label">Confidence:</span>
                        <span className="stat-value">{format.avgConfidence}/5</span>
                      </div>
                      <div className="format-stat">
                        <span className="stat-label">Interviews:</span>
                        <span className="stat-value">{format.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ACCEPTANCE CRITERIA 7: Industry Benchmarks ===== */}
          {benchmarkComparison && benchmarkComparison.conversionRate && (
            <div className="section benchmark-section">
              <h2>📊 Industry Benchmarks</h2>
              <p className="section-intro">See how you compare to industry averages</p>
              <div className="benchmark-grid">
                <div className="benchmark-card">
                  <h3>Conversion Rate</h3>
                  <div className="benchmark-comparison">
                    <div className="benchmark-bars">
                      <div className="benchmark-bar-row">
                        <span className="bar-label">You:</span>
                        <div className="bar-container">
                          <div 
                            className="bar your-bar" 
                            style={{ width: `${Math.min((benchmarkComparison.conversionRate.user / 50) * 100, 100)}%` }}
                          ></div>
                          <span className="bar-value">{benchmarkComparison.conversionRate.user}%</span>
                        </div>
                      </div>
                      <div className="benchmark-bar-row">
                        <span className="bar-label">Industry:</span>
                        <div className="bar-container">
                          <div 
                            className="bar industry-bar" 
                            style={{ width: `${(benchmarkComparison.conversionRate.industry / 50) * 100}%` }}
                          ></div>
                          <span className="bar-value">{benchmarkComparison.conversionRate.industry}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="benchmark-status">
                      <span className={`status-badge ${benchmarkComparison.conversionRate.percentile}`}>
                        {benchmarkComparison.conversionRate.percentile === 'top_20' ? '🌟 Top 20%' :
                         benchmarkComparison.conversionRate.percentile === 'above_average' ? '👍 Above Average' :
                         '📈 Below Average'}
                      </span>
                      <span className="difference">
                        {benchmarkComparison.conversionRate.difference > 0 ? '+' : ''}
                        {benchmarkComparison.conversionRate.difference}%
                      </span>
                    </div>
                  </div>
                </div>

                {benchmarkComparison.selfRating && (
                  <div className="benchmark-card">
                    <h3>Self-Rating</h3>
                    <div className="benchmark-comparison">
                      <div className="benchmark-bars">
                        <div className="benchmark-bar-row">
                          <span className="bar-label">You:</span>
                          <div className="bar-container">
                            <div 
                              className="bar your-bar" 
                              style={{ width: `${(benchmarkComparison.selfRating.user / 5) * 100}%` }}
                            ></div>
                            <span className="bar-value">{benchmarkComparison.selfRating.user}/5</span>
                          </div>
                        </div>
                        <div className="benchmark-bar-row">
                          <span className="bar-label">Industry:</span>
                          <div className="bar-container">
                            <div 
                              className="bar industry-bar" 
                              style={{ width: `${(benchmarkComparison.selfRating.industry / 5) * 100}%` }}
                            ></div>
                            <span className="bar-value">{benchmarkComparison.selfRating.industry}/5</span>
                          </div>
                        </div>
                      </div>
                      <div className="benchmark-status">
                        <span className={`status-badge ${benchmarkComparison.selfRating.percentile}`}>
                          {benchmarkComparison.selfRating.percentile === 'top_20' ? '🌟 Top 20%' :
                           benchmarkComparison.selfRating.percentile === 'above_average' ? '👍 Above Average' :
                           '📈 Room to Grow'}
                        </span>
                        <span className="difference">
                          {benchmarkComparison.selfRating.difference > 0 ? '+' : ''}
                          {benchmarkComparison.selfRating.difference}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="analytics-content">
          {/* ===== ACCEPTANCE CRITERIA 5: Improvement Over Time ===== */}
          {improvementOverTime && improvementOverTime.earlyPerformance !== undefined && (
            <div className="section improvement-section">
              <h2>📈 Your Performance Improvement</h2>
              <div className="improvement-cards">
                <div className="improvement-card">
                  <div className="improvement-icon">📊</div>
                  <div className="improvement-info">
                    <span className="improvement-label">Early Performance</span>
                    <span className="improvement-value">{(improvementOverTime.earlyPerformance || 0).toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="improvement-card highlight">
                  <div className="improvement-icon">🚀</div>
                  <div className="improvement-info">
                    <span className="improvement-label">Recent Performance</span>
                    <span className="improvement-value">{(improvementOverTime.recentPerformance || 0).toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="improvement-card">
                  <div className="improvement-icon">
                    {improvementOverTime.trend === 'improving' ? '📈' : 
                     improvementOverTime.trend === 'declining' ? '📉' : '➡️'}
                  </div>
                  <div className="improvement-info">
                    <span className="improvement-label">Overall Trend</span>
                    <span className="improvement-value">{(improvementOverTime.trend || 'stable').toUpperCase()}</span>
                  </div>
                </div>
                <div className="improvement-card">
                  <div className="improvement-icon">📊</div>
                  <div className="improvement-info">
                    <span className="improvement-label">Improvement Rate</span>
                    <span className={`improvement-value ${(improvementOverTime.improvementRate || 0) > 0 ? 'positive' : 'negative'}`}>
                      {(improvementOverTime.improvementRate || 0) > 0 ? '+' : ''}{(improvementOverTime.improvementRate || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Trends Table */}
          {trendsOverTime && trendsOverTime.length > 0 && (
            <div className="section trends-chart-section">
              <h2>📅 Monthly Performance Trends</h2>
              <div className="trends-chart-container">
                <div className="trends-table">
                  <div className="trends-header">
                    <div className="trend-column">Month</div>
                    <div className="trend-column">Interviews</div>
                    <div className="trend-column">Offers</div>
                    <div className="trend-column">Conversion %</div>
                    <div className="trend-column">Avg Rating</div>
                  </div>
                  {trendsOverTime.map((trend, idx) => (
                    <div key={idx} className="trends-row">
                      <div className="trend-column">{trend.month}</div>
                      <div className="trend-column">{trend.interviews}</div>
                      <div className="trend-column">{trend.offers}</div>
                      <div className="trend-column">
                        <span className="conversion-badge">{trend.conversionRate}%</span>
                      </div>
                      <div className="trend-column">
                        <span className="rating-badge">{trend.avgRating}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Practice Impact Analysis */}
          {practiceImpact && practiceImpact.totalSessions !== undefined && (
            <div className="section practice-impact-section">
              <h2>🎭 Practice Sessions Impact</h2>
              <p className="section-intro">See how mock interviews correlate with your real interview performance</p>
              <div className="practice-grid">
                <div className="practice-card">
                  <h3>📚 Total Practice Sessions</h3>
                  <div className="practice-value">{practiceImpact.totalSessions || 0}</div>
                  <p className="practice-detail">Mock interviews completed</p>
                </div>
                <div className="practice-card">
                  <h3>⭐ Practice Avg Score</h3>
                  <div className="practice-value">{(practiceImpact.avgPracticeScore || 0).toFixed(0)}/100</div>
                  <p className="practice-detail">Average mock interview score</p>
                </div>
                <div className="practice-card highlight">
                  <h3>🎤 With Practice</h3>
                  <div className="practice-value">{(practiceImpact.avgRatingWithPractice || 0).toFixed(1)}/5</div>
                  <p className="practice-detail">Performance when prepared</p>
                </div>
                <div className="practice-card">
                  <h3>🎤 Without Practice</h3>
                  <div className="practice-value">{(practiceImpact.avgRatingWithoutPractice || 0).toFixed(1)}/5</div>
                  <p className="practice-detail">Performance without prep</p>
                </div>
              </div>
              {practiceImpact.practiceCorrelation === 'positive' && 
               practiceImpact.avgRatingWithPractice > 0 && 
               practiceImpact.avgRatingWithoutPractice > 0 && (
                <div className="practice-correlation">
                  <div className="correlation-indicator positive">
                    <span className="correlation-icon">✅</span>
                    <span className="correlation-text">
                      Your performance is <strong>
                        {(((practiceImpact.avgRatingWithPractice - practiceImpact.avgRatingWithoutPractice) / practiceImpact.avgRatingWithoutPractice) * 100).toFixed(0)}%
                      </strong> better when you practice before interviews!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strengths & Weaknesses Detailed */}
          <div className="section-row detailed-analysis">
            {topStrengths && topStrengths.length > 0 && (
              <div className="section">
                <h2>💪 Top Strengths Identified</h2>
                <div className="strength-list">
                  {topStrengths.map((item, idx) => (
                    <div key={idx} className="strength-item">
                      <div className="strength-rank">#{idx + 1}</div>
                      <div className="strength-content">
                        <span className="strength-name">{item.strength}</span>
                        <span className="strength-count">{item.count}x mentioned</span>
                      </div>
                      <div className="strength-indicator">
                        <div 
                          className="indicator-bar" 
                          style={{ 
                            width: `${(item.count / Math.max(...topStrengths.map(s => s.count))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topWeaknesses && topWeaknesses.length > 0 && (
              <div className="section">
                <h2>🎯 Areas to Focus On</h2>
                <div className="weakness-list">
                  {topWeaknesses.map((item, idx) => (
                    <div key={idx} className="weakness-item">
                      <div className="weakness-rank">#{idx + 1}</div>
                      <div className="weakness-content">
                        <span className="weakness-name">{item.weakness}</span>
                        <span className="weakness-count">{item.count}x mentioned</span>
                      </div>
                      <div className="weakness-indicator">
                        <div 
                          className="indicator-bar" 
                          style={{ 
                            width: `${(item.count / Math.max(...topWeaknesses.map(w => w.count))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="analytics-content insights-tab">
          {aiInsights && Object.keys(aiInsights).length > 0 ? (
            <>
              {/* Key Insights */}
              {aiInsights.keyInsights && aiInsights.keyInsights.length > 0 && (
                <div className="section insights-section">
                  <h2>🔍 Key Insights</h2>
                  <p className="section-intro">Personalized analysis of your interview performance patterns</p>
                  <div className="insights-list">
                    {aiInsights.keyInsights.map((insight, idx) => (
                      <div key={idx} className="insight-card">
                        <div className="insight-number">{idx + 1}</div>
                        <p className="insight-text">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimal Strategies */}
              {aiInsights.optimalStrategies && aiInsights.optimalStrategies.length > 0 && (
                <div className="section strategies-section">
                  <h2>🎯 Optimal Interview Strategies for You</h2>
                  <p className="section-intro">Based on your data, here's what works best</p>
                  <div className="strategies-list">
                    {aiInsights.optimalStrategies.map((strategy, idx) => (
                      <div key={idx} className="strategy-card">
                        <div className="strategy-icon">💡</div>
                        <p className="strategy-text">{strategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement Recommendations */}
              {aiInsights.improvementRecommendations && aiInsights.improvementRecommendations.length > 0 && (
                <div className="section recommendations-section">
                  <h2>📋 Personalized Improvement Recommendations</h2>
                  <p className="section-intro">Priority actions to boost your success rate</p>
                  <div className="recommendations-list">
                    {aiInsights.improvementRecommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-card">
                        <div className="rec-priority">
                          {idx === 0 ? '🔥 High Priority' : 
                           idx === 1 ? '⚡ Medium Priority' : '💡 Suggested'}
                        </div>
                        <p className="rec-text">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry Comparison */}
              {aiInsights.industryComparison && (
                <div className="section industry-comparison-section">
                  <h2>📈 Industry Benchmark Analysis</h2>
                  <div className="comparison-cards">
                    {aiInsights.industryComparison.vsAverage && aiInsights.industryComparison.vsAverage !== 'N/A' && (
                      <div className="comparison-card">
                        <h3>vs Industry Average</h3>
                        <p className="comparison-text">{aiInsights.industryComparison.vsAverage}</p>
                      </div>
                    )}
                    {aiInsights.industryComparison.standoutMetrics && aiInsights.industryComparison.standoutMetrics !== 'N/A' && (
                      <div className="comparison-card highlight">
                        <h3>⭐ Your Standout Metrics</h3>
                        <p className="comparison-text">{aiInsights.industryComparison.standoutMetrics}</p>
                      </div>
                    )}
                    {aiInsights.industryComparison.concerningMetrics && aiInsights.industryComparison.concerningMetrics !== 'N/A' && (
                      <div className="comparison-card">
                        <h3>⚠️ Areas Needing Attention</h3>
                        <p className="comparison-text">{aiInsights.industryComparison.concerningMetrics}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-insights">
              <div className="no-insights-icon">🤖</div>
              <h3>AI Insights Coming Soon</h3>
              <p>Complete more interviews to unlock personalized AI analysis</p>
              <p className="no-insights-detail">We need at least 2-3 interviews to generate meaningful insights and recommendations tailored to your performance.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InterviewAnalytics;