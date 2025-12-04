// frontend/src/pages/StatisticsPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Button,
  IconButton,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import './StatisticsLayout.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { CSVLink } from 'react-csv';
import { api, getSuccessAnalysis, getInterviewAnalysis, getNetworkingAnalysis } from '../api';
import InterviewAnalysis from '../components/InterviewAnalysis';
import NetworkingAnalysis from '../components/NetworkingAnalysis';
import CompensationAnalysis from '../components/CompensationAnalysis';
import ComprehensiveCompensationAnalysis from '../components/ComprehensiveCompensationAnalysis';
import MarketIntel from '../components/MarketIntel';
import TimeInvestmentAnalysis from '../components/TimeInvestmentAnalysis';
import CompetitiveAnalysis from '../components/CompetitiveAnalysis';
import SuccessPatternAnalysis from '../components/SuccessPatternAnalysis';
import CustomReportGenerator from '../components/CustomReportGenerator';
import PerformancePrediction from '../components/PerformancePrediction';
import CareerGoals from '../components/CareerGoals';

// Custom styles
const styles = {
  pageWrapper: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    minHeight: '100vh',
    paddingTop: '24px',
    paddingBottom: '48px',
  },
  headerCard: {
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    padding: '28px 32px',
    marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  tabsContainer: {
    background: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    position: 'relative',
  },
  tabsWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  scrollButton: {
    position: 'absolute',
    zIndex: 2,
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    '&:hover': {
      background: '#f3f4f6',
    },
  },
  scrollButtonLeft: {
    left: 0,
  },
  scrollButtonRight: {
    right: 0,
    width: '100%',
  },
  tab: {
    fontWeight: 600,
    fontSize: '0.95rem',
    textTransform: 'none',
    minHeight: '56px',
    letterSpacing: '0.3px',
  },
  contentArea: {
    padding: '32px',
    background: '#fafbfc',
  },
  chartCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    minWidth: 0,
    minHeight: 0,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  iconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
  },
  recommendationCard: {
    background: '#f0fdf4',
    borderRadius: '8px',
    padding: '14px 18px',
    marginBottom: '10px',
    borderLeft: '3px solid #22c55e',
    fontSize: '0.9rem',
    color: '#166534',
    lineHeight: 1.5,
  },
  warningCard: {
    background: '#fffbeb',
    borderRadius: '8px',
    padding: '14px 18px',
    marginBottom: '16px',
    borderLeft: '3px solid #f59e0b',
    fontSize: '0.9rem',
    color: '#92400e',
  },
};

const COLORS = ['#3b82f6', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

// Month names helper
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatMonth = (dateString) => {
  const date = new Date(dateString);
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3, background: 'transparent' }}>{children}</Box>}
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, subtitle, color = '#3b82f6' }) {
  return (
    <Box sx={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px 24px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.85rem', color: '#9ca3af', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

// Section Icon Component
function SectionIcon({ color, children }) {
  return (
    <Box sx={{ ...styles.iconBox, background: color }}>
      {children}
    </Box>
  );
}

// Chart Card Wrapper
function ChartCard({ title, icon, iconColor, children }) {
  return (
    <Box sx={styles.chartCard}>
      <Typography component="div" sx={styles.sectionTitle}>
        <SectionIcon color={iconColor}>{icon}</SectionIcon>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
  const tabsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, analysisRes] = await Promise.all([
          api.get('/api/jobs/stats'),
          getSuccessAnalysis()
        ]);
        setStats(statsRes.data);
        setAnalysis(analysisRes.data);
      } catch (err) {
        setError('Failed to load statistics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Check scroll position and show/hide scroll buttons
  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const scrollContainer = tabsRef.current.querySelector('.MuiTabs-scrollableX') || tabsRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (tabsRef.current) {
      const scrollContainer = tabsRef.current.querySelector('.MuiTabs-scrollableX') || tabsRef.current;
      scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (tabsRef.current) {
      const scrollContainer = tabsRef.current.querySelector('.MuiTabs-scrollableX') || tabsRef.current;
      scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  // Check scroll buttons on mount, resize, and tab change
  useEffect(() => {
    const timer = setTimeout(checkScrollButtons, 100);
    window.addEventListener('resize', checkScrollButtons);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [tabValue]);

  // Also check when tabs container is scrolled
  useEffect(() => {
    if (tabsRef.current) {
      const scrollContainer = tabsRef.current.querySelector('.MuiTabs-scrollableX') || tabsRef.current;
      scrollContainer.addEventListener('scroll', checkScrollButtons);
      return () => scrollContainer.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  // Format data
  const formattedMonthlyData = stats?.monthlyVolume?.map((item) => ({
    name: formatMonth(item.month),
    Applications: parseInt(item.count, 10),
  })) || [];

  const formattedStatusData = stats?.jobsByStatus?.map((item) => ({
    name: item.status,
    Count: parseInt(item.count, 10),
  })) || [];

  // Process timing data
  const getTimingChartData = () => {
    if (!analysis?.timingData) return [];
    
    const timingByWeekday = analysis.timingData
      .filter(item => Number(item.applications) > 0)
      .reduce((acc, item) => {
        let weekdayName = String(item.weekdayName || "");
        if (!weekdayName || weekdayName === "Unknown" || weekdayName === "0") {
          weekdayName = weekdayOrder[Number(item.weekday) || 0] || "Unknown";
        }
        if (weekdayName === "Unknown") return acc;
        
        if (!acc[weekdayName]) {
          acc[weekdayName] = { name: weekdayName, weekday: Number(item.weekday) || 0, applications: 0, offers: 0, interviews: 0 };
        }
        acc[weekdayName].applications += Number(item.applications) || 0;
        acc[weekdayName].offers += Number(item.offers) || 0;
        acc[weekdayName].interviews += Number(item.interviews) || 0;
        return acc;
      }, {});
    
    return Object.values(timingByWeekday).sort((a, b) => 
      weekdayOrder.indexOf(a.name) - weekdayOrder.indexOf(b.name)
    );
  };

  // Process role type data
  const getRoleTypeData = () => {
    if (!analysis?.roleTypeData) return [];
    return analysis.roleTypeData
      .filter(item => Number(item.total) > 0)
      .map(item => ({
        name: item.role_type || "Other",
        value: Number(item.total) || 0,
        offers: Number(item.offers) || 0,
        interviews: Number(item.interviews) || 0,
        rejections: Number(item.rejections) || 0,
      }));
  };

  const getCsvData = () => {
    if (!stats) return [];
    return [
      { metric: 'Total Jobs', value: stats.totalJobs },
      { metric: 'Response Rate (%)', value: stats.responseRate },
      { metric: 'Deadline Adherence (%)', value: stats.adherenceRate },
      { metric: 'Avg. Time to Offer (days)', value: stats.avgTimeToOffer },
      ...stats.jobsByStatus.map(s => ({ metric: `Jobs: ${s.status}`, value: s.count })),
    ];
  };

  if (loading) {
    return (
      <Box className="statistics-layout">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress sx={{ color: '#fff' }} size={48} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="statistics-layout">
        <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>
      </Box>
    );
  }

  const roleTypeData = getRoleTypeData();

  return (
    <Box className="statistics-layout">
      {/* Header */}
      <Box className="statistics-header">
        <Typography className="statistics-main-title">Analytics Dashboard</Typography>
        <Typography className="statistics-main-subtitle">
          Track your job application performance and success patterns
        </Typography>
        {stats && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              sx={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#c4b5fd',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                py: 1,
                '&:hover': { 
                  background: 'rgba(139, 92, 246, 0.3)',
                  borderColor: 'rgba(139, 92, 246, 0.6)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                },
              }}
            >
              <CSVLink 
                data={getCsvData()} 
                filename="job-statistics.csv"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                Export CSV
              </CSVLink>
            </Button>
          </Box>
        )}
      </Box>

      {/* Navigation Tabs */}
      <Box className="statistics-nav-container">
        <Box className="statistics-nav-group">
          <span className="statistics-nav-group-label">Analytics</span>
          <Box className="statistics-nav-group-tabs">
            <button
              className={`statistics-nav-tab analytics ${tabValue === 0 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 0)}
            >
              <span className="statistics-tab-icon">📊</span>
              <span className="statistics-tab-text">Job Stats</span>
            </button>
            <button
              className={`statistics-nav-tab analytics ${tabValue === 1 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 1)}
            >
              <span className="statistics-tab-icon">✅</span>
              <span className="statistics-tab-text">Success</span>
            </button>
            <button
              className={`statistics-nav-tab analytics ${tabValue === 2 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 2)}
            >
              <span className="statistics-tab-icon">💼</span>
              <span className="statistics-tab-text">Interview</span>
            </button>
            <button
              className={`statistics-nav-tab analytics ${tabValue === 3 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 3)}
            >
              <span className="statistics-tab-icon">🤝</span>
              <span className="statistics-tab-text">Networking</span>
            </button>
          </Box>
        </Box>
        <Box className="statistics-nav-group">
          <span className="statistics-nav-group-label">Compensation</span>
          <Box className="statistics-nav-group-tabs">
            <button
              className={`statistics-nav-tab compensation ${tabValue === 4 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 4)}
            >
              <span className="statistics-tab-icon">💰</span>
              <span className="statistics-tab-text">Compensation</span>
            </button>
          </Box>
        </Box>
        <Box className="statistics-nav-group">
          <span className="statistics-nav-group-label">Career</span>
          <Box className="statistics-nav-group-tabs">
            <button
              className={`statistics-nav-tab career ${tabValue === 5 ? 'active' : ''}`}
              onClick={() => handleTabChange(null, 5)}
            >
              <span className="statistics-tab-icon">🎯</span>
              <span className="statistics-tab-text">Goals</span>
            </button>
          </Box>
        </Box>
      </Box>

        {/* Tabs Container */}
        <Paper sx={styles.tabsContainer}>
          <Box sx={styles.tabsWrapper}>
            {showLeftScroll && (
              <IconButton
                onClick={scrollLeft}
                sx={{
                  ...styles.scrollButton,
                  ...styles.scrollButtonLeft,
                }}
                size="small"
              >
                <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>‹</Typography>
              </IconButton>
            )}
            <Box
              ref={tabsRef}
              sx={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                  background: '#fff',
                  borderBottom: '1px solid #e5e7eb',
                  '& .MuiTabs-scrollableX': {
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': {
                      display: 'none',
                    },
                  },
                  '& .MuiTab-root': styles.tab,
                  '& .Mui-selected': { color: '#3b82f6' },
                  '& .MuiTabs-indicator': { backgroundColor: '#3b82f6', height: 2 },
                }}
              >
              <Tab label="Job Statistics" />
              <Tab label="Success Analysis" />
              <Tab label="Interview Analysis" />
              <Tab label="Networking Analysis" />
              <Tab label="Compensation Analysis" />
              <Tab label="Market Intelligence" />
            <Tab label="Time Investment" />
            <Tab label="Competitive Analysis" />
            <Tab label="Success Patterns" />
            <Tab label="Custom Reports" />
            <Tab label="Performance Prediction" />
              </Tabs>
            </Box>
            {showRightScroll && (
              <IconButton
                onClick={scrollRight}
                sx={{
                  ...styles.scrollButton,
                  ...styles.scrollButtonRight,
                }}
                size="small"
              >
                <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>›</Typography>
              </IconButton>
            )}
          </Box>
      {/* Content Area */}
      <Box className="statistics-content">

          {/* Tab 1: Job Statistics */}
          <TabPanel value={tabValue} index={0}>
            {stats && stats.totalJobs === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                No job data available. Start adding jobs to see your statistics.
              </Alert>
            ) : (
              <>
                {/* KPI Cards */}
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
                  <KPICard title="Total Jobs" value={stats?.totalJobs || 0} color="#3b82f6" />
                  <KPICard title="Response Rate" value={`${stats?.responseRate || 0}%`} color="#10b981" />
                  <KPICard title="Avg. Time to Offer" value={`${stats?.avgTimeToOffer || 0} days`} color="#f59e0b" />
                  <KPICard title="Deadline Adherence" value={`${stats?.adherenceRate || 0}%`} color="#06b6d4" />
                </Box>

                {/* Charts Grid */}
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                  <ChartCard title="Monthly Application Volume" icon="M" iconColor="#3b82f6">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={formattedMonthlyData}>
                        <defs>
                          <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="Applications" stroke="#3b82f6" strokeWidth={2} fill="url(#colorApps)" />
                      </AreaChart>
              </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Jobs by Status" icon="S" iconColor="#10b981">
                    <ResponsiveContainer width="100%" height={280}>
                <BarChart data={formattedStatusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
                  </ChartCard>
                </Box>
              </>
            )}
          </TabPanel>

          {/* Tab 2: Success Analysis */}
          <TabPanel value={tabValue} index={1}>
            {!analysis ? (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                Loading analysis data...
              </Alert>
            ) : (
              <>
                {/* Overall Stats */}
                {analysis.overallStats && (
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
                    <KPICard 
                      title="Total Applications" 
                      value={analysis.overallStats.totalApplications || 0} 
                      color="#3b82f6" 
                    />
                    <KPICard 
                      title="Interviews" 
                      value={analysis.overallStats.totalInterviews || 0} 
                      color="#06b6d4" 
                    />
                    <KPICard 
                      title="Offers" 
                      value={analysis.overallStats.totalOffers || 0} 
                      subtitle={`${((analysis.overallStats.overallOfferRate || 0) * 100).toFixed(1)}% success rate`}
                      color="#10b981" 
                    />
                    <KPICard 
                      title="Rejections" 
                      value={analysis.overallStats.totalRejections || 0} 
                      subtitle={`${((analysis.overallStats.overallRejectionRate || 0) * 100).toFixed(1)}% rejection rate`}
                      color="#ef4444" 
                    />
                  </Box>
                )}

                {/* Sample Size Warning */}
                {analysis.overallStats?.totalApplications < 10 && (
                  <Box sx={styles.warningCard}>
                    <strong>Limited Data:</strong> You have {analysis.overallStats?.totalApplications || 0} applications. 
                    Insights become more reliable with 20+ applications.
                  </Box>
                )}

                {/* Charts Grid */}
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
            {/* Industry Success */}
                  <ChartCard title="Success by Industry" icon="I" iconColor="#06b6d4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analysis.industryData || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="industry" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="offers" fill="#10b981" name="Offers" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="interviews" fill="#3b82f6" name="Interviews" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="rejections" fill="#ef4444" name="Rejections" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </ChartCard>

                  {/* Role Type Pie - FIXED */}
                  <ChartCard title="Applications by Role Type" icon="R" iconColor="#f59e0b">
                    <Box sx={{ width: '100%', height: 260, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                            data={roleTypeData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {roleTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [`${value} applications`, name]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Legend 
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                            formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
                      />
                    </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </ChartCard>
                </Box>

                {/* Timing Patterns */}
                <ChartCard title="Application Timing Patterns" icon="T" iconColor="#06b6d4">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={getTimingChartData()}>
                      <defs>
                        <linearGradient id="colorAppsArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOffersArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAppsArea)" name="Applications" />
                      <Area type="monotone" dataKey="offers" stroke="#10b981" strokeWidth={2} fill="url(#colorOffersArea)" name="Offers" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Customization Impact */}
                {analysis.customizationData && (analysis.customizationData.resume?.length > 1 || analysis.customizationData.coverLetter?.length > 1) && (
                  <ChartCard title="Customization Impact" icon="C" iconColor="#06b6d4">
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                      {analysis.customizationData.resume?.length > 1 && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1, display: 'block' }}>
                            Resume Customization
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analysis.customizationData.resume}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="label" stroke="#9ca3af" fontSize={9} angle={-15} textAnchor="end" height={50} />
                              <YAxis stroke="#9ca3af" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                formatter={(value, name) => [value, name]}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Bar dataKey="offers" fill="#10b981" name="Offers" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="interviews" fill="#3b82f6" name="Interviews" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                      {analysis.customizationData.coverLetter?.length > 1 && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1, display: 'block' }}>
                            Cover Letter Customization
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analysis.customizationData.coverLetter}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="label" stroke="#9ca3af" fontSize={9} angle={-15} textAnchor="end" height={50} />
                              <YAxis stroke="#9ca3af" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                formatter={(value, name) => [value, name]}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Bar dataKey="offers" fill="#10b981" name="Offers" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="interviews" fill="#3b82f6" name="Interviews" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#9ca3af', mt: 2, display: 'block' }}>
                      Track how resume and cover letter customization affects your success rate. Set customization levels when adding/editing jobs.
                    </Typography>
                  </ChartCard>
                )}

                {/* Resume Effectiveness */}
                <ChartCard title="Resume Effectiveness" icon="D" iconColor="#ec4899">
                  {analysis.materialsData && analysis.materialsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analysis.materialsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="resume_name" 
                          stroke="#9ca3af" 
                          fontSize={10}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value, name, props) => [value, name]}
                          labelFormatter={(label) => `Resume: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="offers" fill="#f59e0b" name="Offers" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="interviews" fill="#3b82f6" name="Interviews" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                      <Typography variant="body2">
                        No resume data available. Link resumes to your job applications to track effectiveness.
                      </Typography>
                    </Box>
                  )}
                </ChartCard>

                {/* Rejection Analysis */}
                {analysis.rejectionAnalysis && analysis.rejectionAnalysis.totalRejections > 0 && (
                  <ChartCard title="Rejection Rate Analysis" icon="X" iconColor="#ef4444">
                    <Box mb={2}>
                      <Chip 
                        label={`Overall Rejection Rate: ${((analysis.rejectionAnalysis.overallRejectionRate || 0) * 100).toFixed(1)}%`}
                        size="small"
                        sx={{ 
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      />
                    </Box>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                      {analysis.rejectionAnalysis.rejectionRateByIndustry?.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            By Industry
                          </Typography>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={analysis.rejectionAnalysis.rejectionRateByIndustry}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="industry" stroke="#9ca3af" fontSize={9} />
                              <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                              <Tooltip formatter={(v) => `${(v*100).toFixed(1)}%`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                              <Bar dataKey="rejectionRate" fill="#ef4444" name="Rejection Rate" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                        </Box>
                      )}
                      {analysis.rejectionAnalysis.rejectionRateByRoleType?.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            By Role Type
                          </Typography>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={analysis.rejectionAnalysis.rejectionRateByRoleType.map(item => ({
                              ...item,
                              role_type: item.role_type || 'Other'
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="role_type" stroke="#9ca3af" fontSize={9} />
                              <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                              <Tooltip formatter={(v) => `${(v*100).toFixed(1)}%`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                              <Bar dataKey="rejectionRate" fill="#f87171" name="Rejection Rate" radius={[3, 3, 0, 0]} />
                            </BarChart>
                  </ResponsiveContainer>
                        </Box>
                      )}
                    </Box>
                  </ChartCard>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <ChartCard title="Insights & Recommendations" icon="!" iconColor="#22c55e">
                    {analysis.recommendations.map((rec, idx) => (
                      <Box key={idx} sx={styles.recommendationCard}>
                        {rec}
        </Box>
                    ))}
                  </ChartCard>
                )}
              </>
      )}
          </TabPanel>

          {/* Tab 3: Interview Analysis */}
          <TabPanel value={tabValue} index={2}>
            <InterviewAnalysis />
          </TabPanel>

          {/* Tab 4: Networking Analysis */}
          <TabPanel value={tabValue} index={3}>
            <NetworkingAnalysis />
          </TabPanel>

          {/* Tab 5: Compensation Analysis */}
          <TabPanel value={tabValue} index={4}>
            <ComprehensiveCompensationAnalysis />
          </TabPanel>

          {/* Tab 6: Market Intelligence */}
          <TabPanel value={tabValue} index={5}>
            <MarketIntel />
          </TabPanel>

          {/* Tab 7: Time Investment (UC-103) */}
          <TabPanel value={tabValue} index={6}>
            <TimeInvestmentAnalysis />
          </TabPanel>

          {/* Tab 8: Competitive Analysis (UC-104) */}
          <TabPanel value={tabValue} index={7}>
            <CompetitiveAnalysis />
          </TabPanel>

          {/* Tab 9: Success Patterns (UC-105) */}
          <TabPanel value={tabValue} index={8}>
            <SuccessPatternAnalysis />
          </TabPanel>

          {/* Tab 10: Custom Reports (UC-106) */}
          <TabPanel value={tabValue} index={9}>
            <CustomReportGenerator />
          </TabPanel>

          {/* Tab 11: Performance Prediction (UC-107) */}
          <TabPanel value={tabValue} index={10}>
            <PerformancePrediction />
          </TabPanel>
      </Box>
        </Paper>
    </Box>
  );
};

export default StatisticsPage;
