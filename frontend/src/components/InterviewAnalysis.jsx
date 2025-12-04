import React, { useEffect, useState } from "react";
import { getInterviewAnalysis } from "../api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function InterviewAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getInterviewAnalysis();
        setData(res.data);
      } catch (err) {
        console.error("Interview analysis error:", err);
        setError("Failed to load interview analysis data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading interview analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summaryCards, conversionOverTime, mockInterviewStats, mockVsReal, 
          feedbackThemes, industryPerformance, benchmarkComparison, recommendations, anxietyData } = data;

  // Prepare chart data
  const interviewTypeData = mockInterviewStats?.byType || [];
  const confidenceTrendData = mockInterviewStats?.confidenceTrend || [];
  const anxietyTrendData = anxietyData?.trend || [];
  
  // Combine confidence and anxiety for dual trend chart
  const combinedTrendData = confidenceTrendData.map((conf, i) => {
    const anxiety = anxietyTrendData[i] || { anxietyScore: 0 };
    return {
      session: conf.session || i + 1,
      confidenceScore: conf.confidenceScore || 0,
      anxietyScore: anxiety.anxietyScore || 0,
      overallScore: conf.overallScore || 0
    };
  });
  
  // Feedback themes for radar chart
  const feedbackRadarData = Object.entries(feedbackThemes?.improvement || {})
    .filter(([_, v]) => v > 0)
    .map(([key, value]) => ({
      theme: key.charAt(0).toUpperCase() + key.slice(1),
      count: value,
      fullMark: 10
    }));

  return (
    <div style={styles.container}>
      {/* Data Quality Warning */}
      {!data.dataQuality?.sufficientData && (
        <div style={styles.warningBanner}>
          <strong>Limited Data:</strong> Complete more interviews (mock or real) to generate comprehensive insights.
        </div>
      )}

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard 
          title="Real Interviews" 
          value={summaryCards.totalRealInterviews} 
          subtitle={`${summaryCards.totalOffers} offers received`}
          color="#3b82f6"
        />
        <SummaryCard 
          title="Conversion Rate" 
          value={`${(summaryCards.overallConversionRate * 100).toFixed(1)}%`} 
          subtitle={`Industry avg: 25%`}
          color={summaryCards.overallConversionRate >= 0.25 ? "#10b981" : "#f59e0b"}
        />
        <SummaryCard 
          title="Mock Sessions" 
          value={summaryCards.totalMockSessions} 
          subtitle={`Avg score: ${summaryCards.avgMockScore || 'N/A'}`}
          color="#8b5cf6"
        />
        <SummaryCard 
          title="Confidence Score" 
          value={summaryCards.avgConfidence || 'N/A'} 
          subtitle={summaryCards.improvementFromMocks > 0 
            ? `+${summaryCards.improvementFromMocks} improvement` 
            : "Track with mock interviews"}
          color="#06b6d4"
        />
        <SummaryCard 
          title="Anxiety Level" 
          value={summaryCards.avgAnxiety || 'N/A'} 
          subtitle={summaryCards.anxietyImprovement > 0 
            ? `-${summaryCards.anxietyImprovement} reduction` 
            : summaryCards.avgAnxiety > 0 ? "Lower is better" : "Track with mock interviews"}
          color={summaryCards.avgAnxiety > 50 ? "#ef4444" : summaryCards.avgAnxiety > 30 ? "#f59e0b" : "#10b981"}
        />
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsGrid}>
        
        {/* Interview Type Performance */}
        <ChartCard title="Performance by Interview Type" icon="T">
          {interviewTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={interviewTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => {
                    if (name === 'avgScore') return [`${value}%`, 'Avg Score'];
                    if (name === 'count') return [value, 'Sessions'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="avgScore" fill="#3b82f6" name="Avg Score" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count" fill="#10b981" name="Sessions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Complete mock interviews to see performance by type</div>
          )}
        </ChartCard>

        {/* Conversion Rate Over Time */}
        <ChartCard title="Interview-to-Offer Conversion" icon="C">
          {conversionOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={10} />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={11} 
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => {
                    if (name === 'conversionRate') return [`${(value * 100).toFixed(1)}%`, 'Conversion Rate'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Conversion Rate"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalInterviews" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Total Interviews"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>No interview data available yet</div>
          )}
        </ChartCard>

        {/* Mock vs Real Comparison */}
        <ChartCard title="Mock vs Real Interviews" icon="M">
          <div style={styles.comparisonContainer}>
            <div style={styles.comparisonCard}>
              <div style={styles.comparisonIcon}>M</div>
              <div style={styles.comparisonLabel}>Mock Interviews</div>
              <div style={styles.comparisonValue}>{mockVsReal.mock.count}</div>
              <div style={styles.comparisonStat}>
                Avg Score: {mockVsReal.mock.avgScore || 'N/A'}%
              </div>
            </div>
            <div style={styles.comparisonVs}>vs</div>
            <div style={styles.comparisonCard}>
              <div style={{ ...styles.comparisonIcon, backgroundColor: '#10b981' }}>R</div>
              <div style={styles.comparisonLabel}>Real Interviews</div>
              <div style={styles.comparisonValue}>{mockVsReal.real.count}</div>
              <div style={styles.comparisonStat}>
                {mockVsReal.real.offers} offers ({(mockVsReal.real.conversionRate * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
          <p style={styles.insightText}>{mockVsReal.insight}</p>
        </ChartCard>

        {/* Confidence & Anxiety Trend */}
        <ChartCard title="Confidence & Anxiety Management Trend" icon="P">
          {combinedTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={combinedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="session" stroke="#6b7280" fontSize={11} label={{ value: '', position: 'bottom', fontSize: 10 }} />
                <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => {
                    if (name === 'anxietyScore') return [`${value}%`, 'Anxiety (lower is better)'];
                    if (name === 'confidenceScore') return [`${value}%`, 'Confidence'];
                    return [`${value}%`, name];
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="confidenceScore" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.3}
                  name="Confidence"
                />
                <Area 
                  type="monotone" 
                  dataKey="anxietyScore" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.3}
                  name="Anxiety (lower is better)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Complete mock interviews to track progress</div>
          )}
        </ChartCard>

        {/* Feedback Theme Breakdown */}
        <ChartCard title="Feedback Theme Analysis" icon="F">
          {feedbackRadarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={feedbackRadarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="theme" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} fontSize={9} />
                <Radar 
                  name="Improvement Areas" 
                  dataKey="count" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.5} 
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>
              <div style={styles.keywordList}>
                {feedbackThemes?.allKeywords?.length > 0 ? (
                  <>
                    <p style={{ marginBottom: '8px', fontWeight: 500 }}>Common Feedback Keywords:</p>
                    {feedbackThemes.allKeywords.slice(0, 8).map((kw, i) => (
                      <span key={i} style={styles.keywordTag}>{kw.word} ({kw.count})</span>
                    ))}
                  </>
                ) : (
                  "Complete mock interviews to analyze feedback patterns"
                )}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Industry Performance */}
        <ChartCard title="Performance by Industry" icon="I">
          {industryPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={industryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                <YAxis type="category" dataKey="industry" stroke="#6b7280" fontSize={10} width={80} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]}
                />
                <Legend />
                <Bar dataKey="interviewRate" fill="#3b82f6" name="Interview Rate" radius={[0, 4, 4, 0]} />
                <Bar dataKey="offerRate" fill="#10b981" name="Offer Rate" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Add industry info to your job applications for insights</div>
          )}
        </ChartCard>
      </div>

      {/* Benchmark Comparison */}
      <div style={styles.benchmarkSection}>
        <h3 style={styles.sectionTitle}>Industry Benchmark Comparison</h3>
        <div style={styles.benchmarkGrid}>
          <BenchmarkCard 
            title="Interview-to-Offer Rate"
            userValue={`${(benchmarkComparison.interviewToOffer.user * 100).toFixed(1)}%`}
            industryValue="25%"
            status={benchmarkComparison.interviewToOffer.status}
          />
          <BenchmarkCard 
            title="Confidence Score"
            userValue={benchmarkComparison.confidence.user || 'N/A'}
            industryValue="70"
            status={benchmarkComparison.confidence.status}
          />
          <BenchmarkCard 
            title="Mock Interview Pass Rate"
            userValue={`${(benchmarkComparison.passRate.user * 100).toFixed(1)}%`}
            industryValue="60%"
            status={benchmarkComparison.passRate.user >= 0.6 ? 'above' : 'below'}
          />
          <BenchmarkCard 
            title="Anxiety Level"
            userValue={benchmarkComparison.anxiety?.user || 'N/A'}
            industryValue="30"
            status={benchmarkComparison.anxiety?.status === 'above' ? 'above' : 'below'}
            note="Lower is better"
          />
        </div>
      </div>

      {/* Recommendations Panel */}
      <div style={styles.recommendationsSection}>
        <h3 style={styles.sectionTitle}>Personalized Recommendations</h3>
        {recommendations.length > 0 ? (
          <div style={styles.recommendationsList}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{
                ...styles.recommendationCard,
                borderLeftColor: rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'
              }}>
                <div style={styles.recommendationHeader}>
                  <span style={{
                    ...styles.priorityBadge,
                    backgroundColor: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                    color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#16a34a'
                  }}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <span style={styles.recommendationType}>{rec.type.replace('_', ' ')}</span>
                </div>
                <p style={styles.recommendationMessage} dangerouslySetInnerHTML={{ __html: rec.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                {rec.action && (
                  <p style={styles.recommendationAction}>Action: {rec.action}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noRecommendations}>Complete more interviews to receive personalized recommendations.</p>
        )}
      </div>
    </div>
  );
}

// Sub-components
function SummaryCard({ title, value, subtitle, color }) {
  return (
    <div style={{ ...styles.summaryCard, borderTopColor: color }}>
      <div style={styles.summaryTitle}>{title}</div>
      <div style={{ ...styles.summaryValue, color }}>{value}</div>
      <div style={styles.summarySubtitle}>{subtitle}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <div style={styles.chartIcon}>{icon}</div>
        <h4 style={styles.chartTitle}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function BenchmarkCard({ title, userValue, industryValue, status, note }) {
  // For anxiety, "above" means lower anxiety (better), so reverse the logic
  const isAnxietyMetric = title.includes('Anxiety');
  const displayStatus = isAnxietyMetric 
    ? (status === 'above' ? '↓ Lower Anxiety (Better)' : '↑ Higher Anxiety')
    : (status === 'above' ? '↑ Above Average' : '↓ Below Average');
  
  const statusColor = isAnxietyMetric
    ? (status === 'above' ? '#10b981' : '#ef4444')
    : (status === 'above' ? '#10b981' : '#f59e0b');
  
  return (
    <div style={styles.benchmarkCard}>
      <div style={styles.benchmarkTitle}>{title}</div>
      <div style={styles.benchmarkValues}>
        <div>
          <div style={styles.benchmarkLabel}>You</div>
          <div style={{ ...styles.benchmarkValue, color: statusColor }}>
            {userValue}
          </div>
        </div>
        <div style={styles.benchmarkVs}>vs</div>
        <div>
          <div style={styles.benchmarkLabel}>Industry</div>
          <div style={styles.benchmarkValue}>{industryValue}</div>
        </div>
      </div>
      <div style={{
        ...styles.benchmarkStatus,
        backgroundColor: status === 'above' ? '#dcfce7' : isAnxietyMetric ? '#fee2e2' : '#fef3c7',
        color: status === 'above' ? '#166534' : isAnxietyMetric ? '#991b1b' : '#92400e'
      }}>
        {displayStatus}
      </div>
      {note && (
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '4px' }}>
          {note}
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '0',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#6b7280',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '24px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '500',
  },
  warningBanner: {
    padding: '12px 16px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    marginBottom: '20px',
    color: '#92400e',
    fontSize: '14px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderTop: '4px solid',
  },
  summaryTitle: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  summarySubtitle: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  chartIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  chartTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
  },
  noData: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
    flexDirection: 'column',
  },
  comparisonContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '20px 0',
  },
  comparisonCard: {
    textAlign: 'center',
    padding: '16px',
  },
  comparisonIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px',
    margin: '0 auto 12px',
  },
  comparisonLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  comparisonValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
  },
  comparisonStat: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  comparisonVs: {
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  insightText: {
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  keywordList: {
    textAlign: 'center',
  },
  keywordTag: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    fontSize: '12px',
    color: '#4b5563',
    margin: '4px',
  },
  benchmarkSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  benchmarkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  benchmarkCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  benchmarkTitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  benchmarkValues: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: '12px',
  },
  benchmarkLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '4px',
    textAlign: 'center',
  },
  benchmarkValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  benchmarkVs: {
    fontSize: '12px',
    color: '#d1d5db',
  },
  benchmarkStatus: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    textAlign: 'center',
  },
  recommendationsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recommendationCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '4px solid',
  },
  recommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
  },
  recommendationType: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  recommendationMessage: {
    fontSize: '14px',
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.5,
  },
  recommendationAction: {
    fontSize: '12px',
    color: '#3b82f6',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  noRecommendations: {
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px',
  },
};

// Add keyframe animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

