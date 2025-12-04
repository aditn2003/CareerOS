import React, { useEffect, useState } from "react";
import { getNetworkingAnalysis } from "../api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function NetworkingAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
      try {
        setLoading(true);
      setError(null);
      console.log("🔄 Loading networking analysis data...");
        const res = await getNetworkingAnalysis();
      console.log("✅ Networking analysis data received:", res.data);
      console.log("📊 Total contacts in response:", res.data?.summaryCards?.totalContacts || 0);
      console.log("📋 Relationship metrics:", res.data?.relationshipMetrics?.totalContacts || 0);
        
        // Validate data structure
        if (!res.data) {
          throw new Error("No data received from server");
        }
        
        // Ensure all required fields exist with defaults
        const validatedData = {
          summaryCards: res.data.summaryCards || {
            totalContacts: 0,
            totalActivities: 0,
            totalReferrals: 0,
            avgResponseRate: 0,
            avgRelationshipStrength: 0,
            avgHealthScore: 0,
            avgEngagementScore: 0,
            totalEventInvestment: 0,
            totalEventOpportunities: 0,
            networkingROI: 0,
            contactROI: 0
          },
          activityMetrics: res.data.activityMetrics || {
            totalActivities: 0,
            byType: {},
            byChannel: {},
            inboundVsOutbound: { inbound: 0, outbound: 0 },
            totalTimeSpent: 0,
            responseRate: 0
          },
          monthlyActivity: res.data.monthlyActivity || [],
          relationshipMetrics: res.data.relationshipMetrics || {
            totalContacts: 0,
            avgRelationshipStrength: 0,
            avgEngagementScore: 0,
            avgReciprocityScore: 0,
            avgHealthScore: 0,
            byStrengthTier: { strong: 0, medium: 0, weak: 0 },
            warmingUp: [],
            coolingDown: [],
            highValueContacts: [],
            relationshipHealthScores: [],
            engagementFrequency: {
              frequent: 0,
              moderate: 0,
              infrequent: 0,
              never: 0
            }
          },
          referralAnalytics: res.data.referralAnalytics || {
            totalReferrals: 0,
            byType: {},
            byContact: {},
            conversionRates: {
              referralToInterview: 0,
              referralToOffer: 0,
              overallConversion: 0
            },
            warmVsCold: {
              warm: { count: 0, converted: 0 },
              cold: { count: 0, converted: 0 }
            },
            avgQualityScore: 0,
            topReferrers: []
          },
          roiMetrics: res.data.roiMetrics || {
            totalEvents: 0,
            totalInvestment: 0,
            totalOpportunities: 0,
            avgROI: 0,
            byEventType: {},
            topROIEvents: [],
            outreachROI: {
              timeInvested: 0,
              opportunities: 0,
              roi: 0
            },
            contactROI: {
              totalContacts: 0,
              highValueContacts: 0,
              avgHealthScore: 0,
              totalInteractions: 0,
              roiScore: 0
            }
          },
          insights: res.data.insights || [],
          benchmarkComparison: res.data.benchmarkComparison || {
            responseRate: { user: 0, industry: 0.15, status: 'below' },
            referralConversion: { user: 0, industry: 0.30, status: 'below' },
            relationshipStrength: { user: 0, industry: 3.0, status: 'below' },
            monthlyContacts: { user: 0, industry: 20, status: 'below' },
            eventROI: { user: 0, industry: 2.5, status: 'below' },
            warmVsCold: { userWarm: 0, userCold: 0, industryWarm: 0.25, industryCold: 0.05 }
          },
          dataQuality: res.data.dataQuality || {
            hasContacts: false,
            hasActivities: false,
            hasReferrals: false,
            hasEvents: false,
            sufficientData: false
          }
        };
        
        setData(validatedData);
      } catch (err) {
        console.error("Networking analysis error:", err);
        console.error("Error details:", err.response?.data || err.message);
        setError(err.response?.data?.details || err.message || "Failed to load networking analysis data");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading networking analysis...</p>
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

  const { summaryCards, activityMetrics, monthlyActivity, relationshipMetrics, 
          referralAnalytics, roiMetrics, insights, benchmarkComparison } = data;

  // Prepare chart data
  const activityByTypeData = Object.entries(activityMetrics.byType || {})
    .map(([type, data]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      total: data.total,
      successful: data.successful,
      responseRate: data.responseRate
    }))
    .sort((a, b) => b.total - a.total);

  const activityByChannelData = Object.entries(activityMetrics.byChannel || {})
    .map(([channel, data]) => ({
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      total: data.total,
      responseRate: data.responseRate
    }))
    .sort((a, b) => b.responseRate - a.responseRate);

  const relationshipTierData = [
    { name: 'Strong (4-5)', value: relationshipMetrics.byStrengthTier.strong },
    { name: 'Medium (3)', value: relationshipMetrics.byStrengthTier.medium },
    { name: 'Weak (1-2)', value: relationshipMetrics.byStrengthTier.weak }
  ].filter(d => d.value > 0);


  return (
    <div style={styles.container}>
      {/* Refresh Button */}
      <div style={styles.refreshContainer}>
        <button 
          onClick={handleRefresh} 
          disabled={loading}
          style={{
            ...styles.refreshButton,
            ...(loading ? styles.refreshButtonDisabled : {})
          }}
          onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh Data'}
        </button>
        {data && (
          <span style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Data Quality Warning */}
      {!data.dataQuality?.sufficientData && (
        <div style={styles.warningBanner}>
          <strong>Limited Data:</strong> Add more networking contacts and activities to generate comprehensive insights.
        </div>
      )}

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard 
          title="Total Contacts" 
          value={summaryCards.totalContacts} 
          subtitle={`${relationshipMetrics.byStrengthTier.strong} strong relationships`}
          color="#3b82f6"
        />
        {summaryCards.totalActivities > 0 && (
        <SummaryCard 
          title="Networking Activities" 
          value={summaryCards.totalActivities} 
          subtitle={`${(summaryCards.avgResponseRate * 100).toFixed(1)}% response rate`}
          color={summaryCards.avgResponseRate >= 0.15 ? "#10b981" : "#f59e0b"}
        />
        )}
        <SummaryCard 
          title="Avg Relationship Strength" 
          value={summaryCards.avgRelationshipStrength.toFixed(1)} 
          subtitle={`Out of 5`}
          color={summaryCards.avgRelationshipStrength >= 3 ? "#10b981" : "#f59e0b"}
        />
        <SummaryCard 
          title="Relationship Health Score" 
          value={summaryCards.avgHealthScore ? summaryCards.avgHealthScore.toFixed(0) : '0'} 
          subtitle={`Out of 100`}
          color={summaryCards.avgHealthScore >= 70 ? "#10b981" : summaryCards.avgHealthScore >= 50 ? "#f59e0b" : "#ef4444"}
        />
        <SummaryCard 
          title="Networking ROI" 
          value={summaryCards.networkingROI ? `${summaryCards.networkingROI.toFixed(2)}x` : '0x'} 
          subtitle={`Opportunities per hour`}
          color={summaryCards.networkingROI >= 1 ? "#10b981" : "#f59e0b"}
        />
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsGrid}>
        
        {/* Activity by Type - Only show if activities exist */}
        {activityByTypeData.length > 0 && (
        <ChartCard title="Activity by Type" icon="A">
          {activityByTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityByTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" stroke="#6b7280" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total Activities" radius={[4, 4, 0, 0]} />
                <Bar dataKey="successful" fill="#10b981" name="Successful" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Start tracking networking activities to see insights</div>
          )}
        </ChartCard>
        )}

        {/* Monthly Activity Trends - Only show if activities exist */}
        {monthlyActivity.length > 0 && (
        <ChartCard title="Monthly Activity Trends" icon="T">
          {monthlyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="outbound" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  name="Outbound"
                />
                <Area 
                  type="monotone" 
                  dataKey="inbound" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="Inbound (Responses)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>No monthly activity data available</div>
          )}
        </ChartCard>
        )}

        {/* Response Rate by Channel - Only show if activities exist */}
        {activityByChannelData.length > 0 && (
        <ChartCard title="Response Rate by Channel" icon="C">
          {activityByChannelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityByChannelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                <YAxis type="category" dataKey="channel" stroke="#6b7280" fontSize={10} width={80} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="responseRate" fill="#10b981" name="Response Rate" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Track activities by channel to see performance</div>
          )}
        </ChartCard>
        )}

        {/* Relationship Strength Distribution */}
        <ChartCard title="Relationship Strength Distribution" icon="R">
          {relationshipTierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={relationshipTierData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {relationshipTierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.noData}>Add contacts to see relationship distribution</div>
          )}
        </ChartCard>

        {/* Contacts by Relationship Tier */}
        <ChartCard title="Contacts by Relationship Tier" icon="T">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { tier: 'Strong (4-5)', contacts: relationshipMetrics.byStrengthTier.strong },
              { tier: 'Medium (3)', contacts: relationshipMetrics.byStrengthTier.medium },
              { tier: 'Weak (1-2)', contacts: relationshipMetrics.byStrengthTier.weak }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tier" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="contacts" fill="#3b82f6" name="Contacts" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Benchmark Comparison */}
      <div style={styles.benchmarkSection}>
        <h3 style={styles.sectionTitle}>Industry Benchmark Comparison</h3>
        <div style={styles.benchmarkGrid}>
          {summaryCards.totalActivities > 0 && (
          <BenchmarkCard 
            title="Response Rate"
            userValue={`${(benchmarkComparison.responseRate.user * 100).toFixed(1)}%`}
            industryValue="15%"
            status={benchmarkComparison.responseRate.status}
          />
          )}
          <BenchmarkCard 
            title="Relationship Strength"
            userValue={benchmarkComparison.relationshipStrength.user.toFixed(1)}
            industryValue="3.0"
            status={benchmarkComparison.relationshipStrength.status}
          />
          {summaryCards.totalActivities > 0 && (
          <BenchmarkCard 
              title="Monthly Activities"
            userValue={benchmarkComparison.monthlyContacts.user.toFixed(1)}
            industryValue="20"
            status={benchmarkComparison.monthlyContacts.status}
          />
          )}
        </div>
      </div>

      {/* Relationship Analytics Section */}
      {relationshipMetrics.relationshipHealthScores && relationshipMetrics.relationshipHealthScores.length > 0 && (
        <div style={styles.analyticsSection}>
          <h3 style={styles.sectionTitle}>Network Relationship Analytics</h3>
          
          <div style={styles.analyticsGrid}>
            {/* Relationship Health Scores */}
            <ChartCard title="Relationship Health Scores" icon="H">
              {relationshipMetrics.relationshipHealthScores.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={relationshipMetrics.relationshipHealthScores.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={9} width={100} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(value, name) => {
                        if (name === 'healthScore') return [`${value}/100`, 'Health Score'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="healthScore" 
                      fill="#3b82f6"
                      name="Health Score"
                      radius={[0, 4, 4, 0]}
                    >
                      {relationshipMetrics.relationshipHealthScores.slice(0, 10).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.healthScore >= 70 ? '#10b981' : entry.healthScore >= 50 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.noData}>Add contacts to see relationship health scores</div>
              )}
            </ChartCard>

            {/* Engagement Frequency */}
            <ChartCard title="Engagement Frequency" icon="E">
              {relationshipMetrics.engagementFrequency && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Frequent (>1/month)', value: relationshipMetrics.engagementFrequency.frequent || 0 },
                        { name: 'Moderate (1/1-3mo)', value: relationshipMetrics.engagementFrequency.moderate || 0 },
                        { name: 'Infrequent (<1/3mo)', value: relationshipMetrics.engagementFrequency.infrequent || 0 },
                        { name: 'Never Contacted', value: relationshipMetrics.engagementFrequency.never || 0 }
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Frequent', value: relationshipMetrics.engagementFrequency.frequent || 0 },
                        { name: 'Moderate', value: relationshipMetrics.engagementFrequency.moderate || 0 },
                        { name: 'Infrequent', value: relationshipMetrics.engagementFrequency.infrequent || 0 },
                        { name: 'Never', value: relationshipMetrics.engagementFrequency.never || 0 }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* All Contacts Section */}
      {relationshipMetrics.relationshipHealthScores && relationshipMetrics.relationshipHealthScores.length > 0 && (
        <div style={styles.contactsSection}>
          <h3 style={styles.sectionTitle}>All Network Contacts</h3>
          <div style={styles.contactsCard}>
            <div style={styles.contactsList}>
              {relationshipMetrics.relationshipHealthScores.map((contact, i) => (
                <div 
                  key={i} 
                  style={styles.contactItem}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                >
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                    {contact.name} {contact.company && <span style={{ color: '#6b7280', fontWeight: '400' }}>- {contact.company}</span>}
                  </div>
                  <div style={styles.contactStats}>
                    <span style={{ fontWeight: '500', color: '#1f2937' }}>Health:</span> <span style={{ color: contact.healthScore >= 70 ? '#10b981' : contact.healthScore >= 50 ? '#f59e0b' : '#ef4444', fontWeight: '600' }}>{contact.healthScore || 'N/A'}/100</span> • 
                    <span style={{ fontWeight: '500', color: '#1f2937' }}> Strength:</span> <span style={{ fontWeight: '600' }}>{contact.strength}/5</span> • 
                    <span style={{ fontWeight: '500', color: '#1f2937' }}> Engagement:</span> <span style={{ fontWeight: '600' }}>{(contact.engagement * 100).toFixed(0)}%</span> • 
                    <span style={{ fontWeight: '500', color: '#1f2937' }}> Interactions:</span> <span style={{ fontWeight: '600' }}>{contact.interactionCount || 0}</span> <span style={{ color: '#6b7280' }}>({contact.interactionsPerMonth || '0'}/month)</span>
                    {contact.lastContactDate && (
                      <> • <span style={{ fontWeight: '500', color: '#1f2937' }}>Last contact:</span> <span style={{ fontWeight: '600' }}>{new Date(contact.lastContactDate).toLocaleDateString()}</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* High Value Contacts & Cooling Down */}
      {(relationshipMetrics.highValueContacts.length > 0 || relationshipMetrics.coolingDown.length > 0) && (
        <div style={styles.contactsSection}>
          <h3 style={styles.sectionTitle}>High-Value Connections & Relationship Health</h3>
          <div style={styles.contactsGrid}>
            {relationshipMetrics.highValueContacts.length > 0 && (
              <div style={styles.contactsCard}>
                <h4 style={styles.contactsTitle}>High-Value Connections</h4>
                <div style={styles.contactsList}>
                  {relationshipMetrics.highValueContacts.slice(0, 10).map((contact, i) => (
                    <div 
                      key={i} 
                      style={styles.contactItem}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                    >
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                        {contact.name} {contact.company && <span style={{ color: '#6b7280', fontWeight: '400' }}>- {contact.company}</span>}
                      </div>
                      <div style={styles.contactStats}>
                        <span style={{ fontWeight: '500', color: '#1f2937' }}>Health:</span> <span style={{ color: contact.healthScore >= 70 ? '#10b981' : contact.healthScore >= 50 ? '#f59e0b' : '#ef4444', fontWeight: '600' }}>{contact.healthScore || 'N/A'}/100</span> • 
                        <span style={{ fontWeight: '500', color: '#1f2937' }}> Strength:</span> <span style={{ fontWeight: '600' }}>{contact.strength}/5</span> • 
                        <span style={{ fontWeight: '500', color: '#1f2937' }}> Engagement:</span> <span style={{ fontWeight: '600' }}>{(contact.engagement * 100).toFixed(0)}%</span> • 
                        <span style={{ fontWeight: '500', color: '#1f2937' }}> Interactions:</span> <span style={{ fontWeight: '600' }}>{contact.interactionCount || 0}</span> <span style={{ color: '#6b7280' }}>({contact.interactionsPerMonth || '0'}/month)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {relationshipMetrics.coolingDown.length > 0 && (
              <div style={styles.contactsCard}>
                <h4 style={styles.contactsTitle}>Relationships Cooling Down</h4>
                <div style={styles.contactsList}>
                  {relationshipMetrics.coolingDown.slice(0, 10).map((contact, i) => (
                    <div 
                      key={i} 
                      style={styles.contactItem}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                    >
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                        {contact.name} {contact.company && <span style={{ color: '#6b7280', fontWeight: '400' }}>- {contact.company}</span>}
                      </div>
                      <div style={styles.contactStats}>
                        <span style={{ fontWeight: '500', color: '#1f2937' }}>Health:</span> <span style={{ color: contact.healthScore >= 70 ? '#10b981' : contact.healthScore >= 50 ? '#f59e0b' : '#ef4444', fontWeight: '600' }}>{contact.healthScore || 'N/A'}/100</span> • 
                        <span style={{ fontWeight: '500', color: '#1f2937' }}> Strength:</span> <span style={{ fontWeight: '600' }}>{contact.strength}/5</span> • 
                        {contact.daysSinceContact ? (
                          <><span style={{ fontWeight: '500', color: '#1f2937' }}> Last contact:</span> <span style={{ fontWeight: '600', color: '#ef4444' }}>{contact.daysSinceContact} days ago</span></>
                        ) : (
                          <span style={{ fontWeight: '500', color: '#ef4444' }}>Never contacted</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Networking Events Section */}
      {roiMetrics.totalEvents > 0 && (
        <div style={styles.analyticsSection}>
          <h3 style={styles.sectionTitle}>Networking Events</h3>
          <div style={styles.eventsContainer}>
            <div style={styles.eventSummary}>
              <div style={styles.eventMetric}>
                <div style={styles.eventLabel}>Total Events</div>
                <div style={styles.eventValue}>{roiMetrics.totalEvents}</div>
                </div>
              <div style={styles.eventMetric}>
                <div style={styles.eventLabel}>Total Investment</div>
                <div style={styles.eventValue}>${roiMetrics.totalInvestment.toFixed(2)}</div>
              </div>
              <div style={styles.eventMetric}>
                <div style={styles.eventLabel}>Total Opportunities</div>
                <div style={styles.eventValue}>{roiMetrics.totalOpportunities}</div>
              </div>
              {roiMetrics.avgROI > 0 && (
                <div style={styles.eventMetric}>
                  <div style={styles.eventLabel}>Average ROI</div>
                  <div style={styles.eventValue}>{roiMetrics.avgROI.toFixed(2)}x</div>
                </div>
              )}
            </div>
            {roiMetrics.topROIEvents && roiMetrics.topROIEvents.length > 0 && (
              <div style={styles.eventsList}>
                <h4 style={styles.contactsTitle}>All Events ({roiMetrics.topROIEvents.length})</h4>
                {roiMetrics.topROIEvents.map((event, i) => (
                  <div 
                    key={i} 
                    style={styles.eventItem}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                      {event.name}
                    </div>
                    <div style={styles.eventDetails}>
                      <span style={{ fontWeight: '500', color: '#1f2937' }}>Type:</span> <span style={{ fontWeight: '600' }}>{event.type || 'N/A'}</span> • 
                      <span style={{ fontWeight: '500', color: '#1f2937' }}> Date:</span> <span style={{ fontWeight: '600' }}>{event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}</span> • 
                      <span style={{ fontWeight: '500', color: '#1f2937' }}> Cost:</span> <span style={{ fontWeight: '600', color: '#ef4444' }}>${event.cost || 0}</span> • 
                      <span style={{ fontWeight: '500', color: '#1f2937' }}> Opportunities:</span> <span style={{ fontWeight: '600', color: '#10b981' }}>{event.opportunities || 0}</span>
                      {event.roi > 0 && <> • <span style={{ fontWeight: '500', color: '#1f2937' }}>ROI:</span> <span style={{ fontWeight: '600', color: '#10b981' }}>{event.roi.toFixed(2)}x</span></>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Networking ROI Section */}
      {summaryCards.networkingROI > 0 && (
        <div style={styles.analyticsSection}>
          <h3 style={styles.sectionTitle}>Networking ROI Analysis</h3>
          <div style={styles.analyticsGrid}>
            <ChartCard title="Contact ROI" icon="R">
              <div style={styles.roiContainer}>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>Opportunities per Contact</div>
                  <div style={styles.roiValue}>{summaryCards.contactROI ? summaryCards.contactROI.toFixed(2) : '0.00'}</div>
                </div>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>High-Value Contacts</div>
                  <div style={styles.roiValue}>{relationshipMetrics.highValueContacts.length}</div>
                </div>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>Total Interactions</div>
                  <div style={styles.roiValue}>{roiMetrics.contactROI?.totalInteractions || 0}</div>
                </div>
              </div>
            </ChartCard>
            <ChartCard title="Time Investment ROI" icon="T">
              <div style={styles.roiContainer}>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>Opportunities per Hour</div>
                  <div style={styles.roiValue}>{summaryCards.networkingROI ? summaryCards.networkingROI.toFixed(2) : '0.00'}</div>
                </div>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>Total Hours Invested</div>
                  <div style={styles.roiValue}>{(roiMetrics.outreachROI?.timeInvested || 0).toFixed(1)}</div>
                </div>
                <div style={styles.roiMetric}>
                  <div style={styles.roiLabel}>Opportunities Generated</div>
                  <div style={styles.roiValue}>{roiMetrics.outreachROI?.opportunities || 0}</div>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      )}


      {/* Recommendations Panel */}
      <div style={styles.recommendationsSection}>
        <h3 style={styles.sectionTitle}>Personalized Networking Recommendations</h3>
        {insights.length > 0 ? (
          <div style={styles.recommendationsList}>
            {insights.map((insight, i) => (
              <div key={i} style={{
                ...styles.recommendationCard,
                borderLeftColor: insight.priority === 'high' ? '#ef4444' : insight.priority === 'medium' ? '#f59e0b' : '#10b981'
              }}>
                <div style={styles.recommendationHeader}>
                  <span style={{
                    ...styles.priorityBadge,
                    backgroundColor: insight.priority === 'high' ? '#fef2f2' : insight.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                    color: insight.priority === 'high' ? '#dc2626' : insight.priority === 'medium' ? '#d97706' : '#16a34a'
                  }}>
                    {insight.priority.toUpperCase()}
                  </span>
                  <span style={styles.recommendationType}>{insight.type.replace('_', ' ')}</span>
                </div>
                <p style={styles.recommendationMessage} dangerouslySetInnerHTML={{ __html: insight.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                {insight.action && (
                  <p style={styles.recommendationAction}>Action: {insight.action}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noRecommendations}>Add more networking data to receive personalized recommendations.</p>
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

function BenchmarkCard({ title, userValue, industryValue, status }) {
  return (
    <div style={styles.benchmarkCard}>
      <div style={styles.benchmarkTitle}>{title}</div>
      <div style={styles.benchmarkValues}>
        <div>
          <div style={styles.benchmarkLabel}>You</div>
          <div style={{ ...styles.benchmarkValue, color: status === 'above' ? '#10b981' : '#f59e0b' }}>
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
        backgroundColor: status === 'above' ? '#dcfce7' : '#fef3c7',
        color: status === 'above' ? '#166534' : '#92400e'
      }}>
        {status === 'above' ? '↑ Above Average' : '↓ Below Average'}
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '0',
  },
  refreshContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  refreshButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  lastUpdated: {
    fontSize: '12px',
    color: '#6b7280',
  },
  eventsContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  eventSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  eventMetric: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },
  eventLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '10px',
    fontWeight: '500',
  },
  eventValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
  },
  eventsList: {
    marginTop: '20px',
  },
  eventItem: {
    padding: '18px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    marginBottom: '14px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
  },
  eventDetails: {
    fontSize: '14px',
    color: '#374151',
    marginTop: '10px',
    lineHeight: '1.8',
    fontWeight: '400',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  benchmarkSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '20px',
    letterSpacing: '-0.01em',
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
  analyticsSection: {
    marginBottom: '32px',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  roiContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '10px',
  },
  roiMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  roiLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  roiValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
  },
  contactsSection: {
    marginBottom: '24px',
  },
  contactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  contactsCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  contactsTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '18px',
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  contactItem: {
    padding: '18px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
  },
  contactItemHover: {
    boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
  },
  contactStats: {
    fontSize: '14px',
    color: '#374151',
    marginTop: '10px',
    lineHeight: '1.8',
    fontWeight: '400',
  },
  referrersSection: {
    marginBottom: '24px',
  },
  referrersList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  referrerCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  referrerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  referrerBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '12px',
    fontWeight: '600',
  },
  referrerCompany: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  referrerConversion: {
    fontSize: '11px',
    color: '#10b981',
    fontWeight: '500',
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

