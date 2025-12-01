import React, { useState, useEffect } from "react";
import { getComprehensiveCompensationAnalytics } from "../api";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

// Tab Panel Component
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, subtitle, color = '#3b82f6' }) {
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 1, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }) {
  const colorMap = {
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981',
    error: '#ef4444'
  };
  
  const bgColorMap = {
    warning: '#fffbeb',
    info: '#eff6ff',
    success: '#f0fdf4',
    error: '#fef2f2'
  };
  
  return (
    <Card sx={{ 
      mb: 2, 
      backgroundColor: bgColorMap[recommendation.type] || '#f9fafb',
      borderLeft: `4px solid ${colorMap[recommendation.type] || '#6b7280'}`
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {recommendation.title}
          </Typography>
          <Chip 
            label={recommendation.priority} 
            size="small" 
            color={recommendation.priority === 'high' ? 'error' : recommendation.priority === 'medium' ? 'warning' : 'default'}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#374151', mb: 1 }}>
          {recommendation.message}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic' }}>
          💡 {recommendation.action}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ComprehensiveCompensationAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getComprehensiveCompensationAnalytics();
        console.log("Comprehensive compensation analytics response:", res.data);
        setData(res.data);
      } catch (err) {
        console.error("Comprehensive compensation analysis error:", err);
        setError("Failed to load comprehensive compensation analytics");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No compensation data available. Start tracking offers to see analytics.
      </Alert>
    );
  }

  // Safely destructure with defaults
  const {
    offerTracking = {
      totalOffers: 0,
      acceptedVsRejected: { accepted: 0, rejected: 0, pending: 0 },
      byRole: {},
      byCompany: {},
      byLocation: {},
      byLevel: {},
      competingOffers: 0,
      negotiationOutcomes: []
    },
    negotiationAnalytics = {
      successRate: 0,
      avgImprovement: 0,
      medianImprovement: 0,
      maxImprovement: 0,
      trendsOverTime: {},
      byContext: {}
    },
    marketComparisons = [],
    compensationEvolution = {
      timeline: [],
      plateaus: [],
      growthPhases: [],
      milestones: []
    },
    careerProgression = {
      progression: [],
      earningPotential: {
        currentSalary: 0,
        avgGrowthRate: 0,
        projected1Year: 0,
        projected3Years: 0,
        projected5Years: 0,
        inflectionPoints: []
      },
      levelMapping: []
    },
    recommendations = [],
    locationPositioning = [],
    industryPositioning = []
  } = data;

  console.log("Processed data:", {
    totalOffers: offerTracking.totalOffers,
    accepted: offerTracking.acceptedVsRejected?.accepted,
    offers: offerTracking
  });

  // Prepare chart data
  const offerStatusData = [
    { name: 'Accepted', value: offerTracking.acceptedVsRejected.accepted, color: '#10b981' },
    { name: 'Pending', value: offerTracking.acceptedVsRejected.pending, color: '#f59e0b' },
    { name: 'Rejected', value: offerTracking.acceptedVsRejected.rejected, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const negotiationTrendsData = Object.entries(negotiationAnalytics.trendsOverTime || {})
    .map(([month, data]) => ({
      month,
      successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
      avgImprovement: data.improvements.length > 0
        ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
        : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const roleLevelData = Object.entries(offerTracking.byLevel || {})
    .map(([level, data]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      avgSalary: data.avgBase,
      count: data.count
    }))
    .sort((a, b) => b.avgSalary - a.avgSalary);

  const contextMetricsData = Object.entries(negotiationAnalytics.byContext || {})
    .map(([context, data]) => ({
      context: context.replace(/_/g, ' '),
      successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
      avgImprovement: data.improvements.length > 0
        ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
        : 0,
      count: data.count
    }))
    .filter(d => d.count >= 2)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);

  const evolutionData = compensationEvolution.timeline.map(role => ({
    date: role.start_date,
    baseSalary: Number(role.base_salary_start) || 0,
    totalComp: Number(role.total_comp_start) || 0,
    roleLevel: role.role_level,
    increasePercent: role.increasePercent || 0
  }));

  const marketComparisonData = marketComparisons.map(comp => ({
    company: comp.company,
    percentile: comp.percentile,
    salary: comp.yourSalary,
    marketMedian: comp.marketMedian
  }));

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          💼 Comprehensive Compensation Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Track your salary progression, negotiation success, market positioning, and career growth
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Salary & Offers" />
          <Tab label="Negotiation Analytics" />
          <Tab label="Market Comparison" />
          <Tab label="Compensation Evolution" />
          <Tab label="Career Progression" />
          <Tab label="Strategy & Recommendations" />
          <Tab label="Location & Industry" />
        </Tabs>

          {/* Tab 0: Overview */}
        <TabPanel value={tabValue} index={0}>
          {offerTracking.totalOffers === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No offers tracked yet
              </Typography>
              <Typography variant="body2">
                To get started with compensation analytics, add your first job offer. 
                You can add offers from the Compensation page or directly from job applications.
              </Typography>
            </Alert>
          )}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Total Offers"
                value={offerTracking.totalOffers}
                subtitle={offerTracking.totalOffers > 0 
                  ? `${offerTracking.acceptedVsRejected.accepted} accepted` 
                  : "Add offers to track"}
                color="#3b82f6"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Negotiation Success"
                value={`${negotiationAnalytics.successRate.toFixed(1)}%`}
                subtitle={`${negotiationAnalytics.avgImprovement.toFixed(1)}% avg improvement`}
                color="#10b981"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Market Position"
                value={marketComparisons.length > 0 
                  ? `${(marketComparisons.filter(m => !m.isUnderpaid).length / marketComparisons.length * 100).toFixed(0)}%`
                  : 'N/A'}
                subtitle={marketComparisons.length > 0 
                  ? `${marketComparisons.filter(m => !m.isUnderpaid).length} of ${marketComparisons.length} at/above market`
                  : 'No market data'}
                color="#8b5cf6"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Career Growth"
                value={careerProgression.earningPotential.avgGrowthRate > 0
                  ? `${careerProgression.earningPotential.avgGrowthRate.toFixed(1)}%`
                  : 'N/A'}
                subtitle="Average annual growth rate"
                color="#f59e0b"
              />
            </Grid>
          </Grid>

          {/* Quick Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offer Status Distribution</Typography>
                  {offerStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={offerStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {offerStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No offer data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Average Salary by Role Level</Typography>
                  {roleLevelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={roleLevelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                        <Bar dataKey="avgSalary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No role level data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Salary & Offer Tracking */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offers by Role</Typography>
                  {Object.keys(offerTracking.byRole || {}).length > 0 ? (
                    <Box>
                      {Object.entries(offerTracking.byRole)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([role, data]) => (
                          <Box key={role} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{role}</Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {data.count} offer(s) • Avg: ${data.avgBase.toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No role data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offers by Location</Typography>
                  {Object.keys(offerTracking.byLocation || {}).length > 0 ? (
                    <Box>
                      {Object.entries(offerTracking.byLocation)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([location, data]) => (
                          <Box key={location} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{location}</Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {data.count} offer(s) • Avg: ${data.avgBase.toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No location data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Outcomes</Typography>
                  {offerTracking.negotiationOutcomes.length > 0 ? (
                    <Box>
                      {offerTracking.negotiationOutcomes.slice(0, 5).map((outcome, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{outcome.company}</Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {outcome.role} • +{outcome.improvement.toFixed(1)}%
                          </Typography>
                          <Chip 
                            label={outcome.outcome} 
                            size="small" 
                            color={outcome.outcome === 'success' ? 'success' : 'default'}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No negotiation data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Competing Offers</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                You have {offerTracking.competingOffers} offer(s) with competing offers, which can strengthen your negotiation position.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 2: Negotiation Analytics */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Success Metrics</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Success Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                          {negotiationAnalytics.successRate.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Avg Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {negotiationAnalytics.avgImprovement.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Median Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                          {negotiationAnalytics.medianImprovement.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#fce7f3', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Max Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#ec4899' }}>
                          {negotiationAnalytics.maxImprovement.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Trends Over Time</Typography>
                  {negotiationTrendsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={negotiationTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="successRate" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                          name="Success Rate %"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avgImprovement" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                          name="Avg Improvement %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No negotiation trends data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Success by Context</Typography>
              {contextMetricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contextMetricsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="context" width={150} />
                    <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="successRate" fill="#10b981" name="Success Rate %" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgImprovement" fill="#3b82f6" name="Avg Improvement %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No context-based negotiation data
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 3: Market Comparison */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Market Position Summary</Typography>
                  {marketComparisons.length > 0 ? (
                    <Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                          Under Market: {marketComparisons.filter(m => m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                          At/Above Market: {marketComparisons.filter(m => !m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                          Significantly Under: {marketComparisons.filter(m => m.significantlyUnderpaid).length}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No market comparison data available. Add market benchmarks to compare your offers.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Percentile Distribution</Typography>
                  {marketComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart data={marketComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="company" />
                        <YAxis domain={[0, 100]} label={{ value: 'Percentile', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'percentile') return [`${value.toFixed(1)}th percentile`, 'Percentile'];
                            return [value, name];
                          }}
                        />
                        <Scatter dataKey="percentile" fill="#3b82f6" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No percentile data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Detailed Market Comparisons</Typography>
              {marketComparisons.length > 0 ? (
                <Box>
                  {marketComparisons.map((comp, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {comp.company} - {comp.role}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {comp.level} • {comp.location}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${comp.percentile.toFixed(1)}th percentile`}
                          color={comp.isUnderpaid ? 'error' : comp.isOverpaid ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Box display="flex" gap={2} mt={1}>
                        <Typography variant="body2">
                          <strong>Your Salary:</strong> ${comp.yourSalary.toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Market Median:</strong> ${comp.marketMedian.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: comp.yourSalary < comp.marketMedian ? '#dc2626' : '#16a34a' }}>
                          <strong>Difference:</strong> {comp.yourSalary < comp.marketMedian ? '-' : '+'}
                          ${Math.abs(comp.yourSalary - comp.marketMedian).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No market comparison data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 4: Compensation Evolution */}
        <TabPanel value={tabValue} index={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Compensation Timeline</Typography>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => new Date(v).getFullYear()}
                    />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="baseSalary" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Base Salary"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalComp" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Total Compensation"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No compensation history data
                </Typography>
              )}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Growth Phases</Typography>
                  {compensationEvolution.growthPhases.length > 0 ? (
                    <Box>
                      {compensationEvolution.growthPhases.map((phase, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {phase.fromLevel} → {phase.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {phase.salaryIncrease.toFixed(1)}% increase • {phase.annualizedIncrease.toFixed(1)}% annualized
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No significant growth phases detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Plateau Periods</Typography>
                  {compensationEvolution.plateaus.length > 0 ? (
                    <Box>
                      {compensationEvolution.plateaus.map((plateau, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#fffbeb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Plateau Detected
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {plateau.durationYears.toFixed(1)} years • {plateau.annualizedIncrease.toFixed(1)}% annualized growth
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(plateau.startDate).toLocaleDateString()} - {new Date(plateau.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No plateau periods detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 5: Career Progression */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Earning Potential</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>Current Salary</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                      ${careerProgression.earningPotential.currentSalary.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>Average Growth Rate</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                      {careerProgression.earningPotential.avgGrowthRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>Projected Earnings</Typography>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2">
                        <strong>1 Year:</strong> ${careerProgression.earningPotential.projected1Year.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2">
                        <strong>3 Years:</strong> ${careerProgression.earningPotential.projected3Years.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>5 Years:</strong> ${careerProgression.earningPotential.projected5Years.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Career Inflection Points</Typography>
                  {careerProgression.earningPotential.inflectionPoints.length > 0 ? (
                    <Box>
                      {careerProgression.earningPotential.inflectionPoints.map((point, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Major Salary Jump
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {point.fromLevel} → {point.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                            +{point.salaryIncrease.toFixed(1)}% increase
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(point.startDate).toLocaleDateString()} - {new Date(point.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No major inflection points detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Role Progression Path</Typography>
              {careerProgression.progression.length > 0 ? (
                <Box>
                  {careerProgression.progression.map((role, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {role.role_title} at {role.company}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Level: {role.role_level} • {new Date(role.start_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        {role.salaryJump > 0 && (
                          <Chip 
                            label={`+${role.salaryJump.toFixed(1)}%`} 
                            color="success" 
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Base: ${Number(role.base_salary_start).toLocaleString()} • 
                        Total Comp: ${Number(role.total_comp_start).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No career progression data
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 6: Strategy & Recommendations */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" sx={{ mb: 3 }}>Strategic Recommendations</Typography>
          {recommendations.length > 0 ? (
            <Box>
              {recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </Box>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No recommendations available. Continue tracking offers and negotiations to get personalized insights.
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* Tab 7: Location & Industry Positioning */}
        <TabPanel value={tabValue} index={7}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Location Positioning</Typography>
                  {locationPositioning.length > 0 ? (
                    <Box>
                      {locationPositioning.map((loc, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {loc.location}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Type: {loc.locationType} • {loc.offers.length} offer(s)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                            Avg Salary: ${loc.avgSalary.toLocaleString()}
                          </Typography>
                          {loc.colIndex && (
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                              COL Index: {loc.colIndex}
                            </Typography>
                          )}
                          {loc.marketComparisons.length > 0 && (
                            <Box mt={1}>
                              <Chip 
                                label={`${loc.marketComparisons.filter(m => !m.isUnderpaid).length}/${loc.marketComparisons.length} at/above market`}
                                size="small"
                                color={loc.marketComparisons.filter(m => !m.isUnderpaid).length === loc.marketComparisons.length ? 'success' : 'default'}
                              />
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No location data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Industry Positioning</Typography>
                  {industryPositioning.length > 0 ? (
                    <Box>
                      {industryPositioning.map((ind, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {ind.industry}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {ind.offers.length} offer(s)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                            Avg Salary: ${ind.avgSalary.toLocaleString()}
                          </Typography>
                          {ind.marketComparisons.length > 0 && (
                            <Box mt={1}>
                              <Chip 
                                label={`${ind.marketComparisons.filter(m => !m.isUnderpaid).length}/${ind.marketComparisons.length} at/above market`}
                                size="small"
                                color={ind.marketComparisons.filter(m => !m.isUnderpaid).length === ind.marketComparisons.length ? 'success' : 'default'}
                              />
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No industry data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Location vs Industry Analysis</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Compare your compensation across different locations and industries to identify the best opportunities for your career growth.
                Use cost of living adjustments to normalize salaries across different markets.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
    </Box>
  );
}

