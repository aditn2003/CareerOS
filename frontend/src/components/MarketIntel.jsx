// frontend/src/components/MarketIntel.jsx
// UC-102: Market Intelligence and Industry Trends

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { api } from "../api";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line,
} from "recharts";

// ===== STYLES =====
const styles = {
  container: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    minHeight: "100vh",
    padding: "32px",
    color: "#e2e8f0",
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#f8fafc",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#94a3b8",
    fontWeight: 400,
  },
  chartCard: {
    background: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    marginBottom: "24px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  iconBox: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  kpiCard: {
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
    position: "relative",
    overflow: "hidden",
  },
  tabsContainer: {
    background: "rgba(30, 41, 59, 0.6)",
    borderRadius: "12px",
    marginBottom: "24px",
    padding: "4px",
  },
};

const COLORS = ["#6366f1", "#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];
const CHART_COLORS = {
  primary: "#6366f1",
  secondary: "#22d3ee",
  tertiary: "#a78bfa",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
};

// ===== COMPONENTS =====
function SectionIcon({ color, children }) {
  return (
    <Box sx={{ ...styles.iconBox, background: color }}>
      {children}
    </Box>
  );
}

function ChartCard({ title, icon, iconColor, children, action }) {
  return (
    <Box sx={styles.chartCard}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography component="div" sx={styles.sectionTitle}>
          <SectionIcon color={iconColor}>{icon}</SectionIcon>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function KPICard({ title, value, subtitle, color = "#6366f1", icon, trend }) {
  return (
    <Box sx={styles.kpiCard}>
      <Box sx={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "100px",
        height: "100px",
        background: `radial-gradient(circle at top right, ${color}20, transparent)`,
        borderRadius: "0 16px 0 100%",
      }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            mb: 1,
          }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: "0.85rem", color: "#64748b", mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Chip
              label={trend}
              size="small"
              sx={{
                mt: 1,
                bgcolor: trend.startsWith('+') ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                color: trend.startsWith('+') ? '#34d399' : '#f87171',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>
        {icon && (
          <Box sx={{
            fontSize: "28px",
            opacity: 0.8,
          }}>
            {icon}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function OpportunityCard({ opportunity }) {
  const priorityColors = {
    high: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1' },
    medium: { bg: 'rgba(34, 211, 238, 0.15)', border: '#22d3ee' },
    low: { bg: 'rgba(148, 163, 184, 0.15)', border: '#64748b' },
  };
  const colors = priorityColors[opportunity.priority] || priorityColors.medium;

  return (
    <Box sx={{
      background: colors.bg,
      borderLeft: `4px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "20px",
      mb: 2,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography sx={{ fontSize: "24px" }}>{opportunity.icon}</Typography>
        <Typography sx={{ fontWeight: 600, color: "#f1f5f9", fontSize: "1rem" }}>
          {opportunity.title}
        </Typography>
        <Chip
          label={opportunity.priority}
          size="small"
          sx={{
            ml: "auto",
            bgcolor: colors.border,
            color: "#fff",
            fontWeight: 600,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
          }}
        />
      </Box>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.9rem", mb: 1 }}>
        {opportunity.description}
      </Typography>
      <Typography sx={{ color: colors.border, fontSize: "0.85rem", fontWeight: 500 }}>
        💡 {opportunity.actionable}
      </Typography>
    </Box>
  );
}

function SkillCard({ skill }) {
  const isAcquired = skill.status === 'acquired';
  return (
    <Box sx={{
      background: isAcquired ? 'rgba(52, 211, 153, 0.1)' : 'rgba(99, 102, 241, 0.1)',
      borderRadius: "12px",
      padding: "16px",
      border: `1px solid ${isAcquired ? 'rgba(52, 211, 153, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: "#f1f5f9" }}>{skill.skill}</Typography>
        <Chip
          label={isAcquired ? '✓ Acquired' : 'Learn'}
          size="small"
          sx={{
            bgcolor: isAcquired ? 'rgba(52, 211, 153, 0.3)' : 'rgba(99, 102, 241, 0.3)',
            color: isAcquired ? '#34d399' : '#818cf8',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
        <Chip label={skill.demand} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.7rem' }} />
        <Chip label={skill.growth} size="small" sx={{ bgcolor: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontSize: '0.7rem' }} />
        <Chip label={skill.category} size="small" sx={{ bgcolor: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', fontSize: '0.7rem' }} />
      </Box>
      {!isAcquired && skill.resources && (
        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 1 }}>
          📚 {skill.resources.slice(0, 2).join(' • ')}
        </Typography>
      )}
    </Box>
  );
}

function CompetitiveScoreGauge({ score, ranking }) {
  const getScoreColor = (s) => {
    if (s >= 75) return '#34d399';
    if (s >= 50) return '#22d3ee';
    if (s >= 25) return '#fbbf24';
    return '#f87171';
  };

  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={180}
          thickness={4}
          sx={{ color: 'rgba(148, 163, 184, 0.2)' }}
        />
        <CircularProgress
          variant="determinate"
          value={score}
          size={180}
          thickness={4}
          sx={{
            color: getScoreColor(score),
            position: 'absolute',
            left: 0,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: "2.5rem", fontWeight: 700, color: "#f8fafc" }}>
            {score}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            out of 100
          </Typography>
        </Box>
      </Box>
      <Chip
        label={ranking}
        sx={{
          mt: 2,
          bgcolor: getScoreColor(score),
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.8rem',
          px: 2,
        }}
      />
    </Box>
  );
}

function InsightCard({ insight }) {
  const typeStyles = {
    success: { bg: 'rgba(52, 211, 153, 0.15)', border: '#34d399', icon: '✅' },
    warning: { bg: 'rgba(251, 191, 36, 0.15)', border: '#fbbf24', icon: '⚠️' },
    info: { bg: 'rgba(34, 211, 238, 0.15)', border: '#22d3ee', icon: '💡' },
  };
  const style = typeStyles[insight.type] || typeStyles.info;

  return (
    <Box sx={{
      background: style.bg,
      borderLeft: `3px solid ${style.border}`,
      borderRadius: "8px",
      padding: "14px 16px",
      mb: 2,
    }}>
      <Typography sx={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem", mb: 0.5 }}>
        {style.icon} {insight.title}
      </Typography>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        {insight.message}
      </Typography>
    </Box>
  );
}

function RecommendationCard({ rec }) {
  const typeIcons = {
    positioning: '🎯',
    improvement: '📈',
    skill: '🧠',
    activity: '⚡',
    timing: '🕐',
    research: '🔍',
  };

  const priorityColors = {
    high: '#f87171',
    medium: '#fbbf24',
    low: '#34d399',
  };

  return (
    <Box sx={{
      background: 'rgba(99, 102, 241, 0.1)',
      borderRadius: "12px",
      padding: "16px 20px",
      mb: 2,
      border: '1px solid rgba(99, 102, 241, 0.2)',
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography sx={{ fontSize: "20px" }}>{typeIcons[rec.type] || '💡'}</Typography>
        <Typography sx={{ fontWeight: 600, color: "#f1f5f9", flex: 1 }}>
          {rec.title}
        </Typography>
        <Box sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: priorityColors[rec.priority] || priorityColors.medium,
        }} />
      </Box>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.9rem", pl: "36px" }}>
        {rec.message}
      </Typography>
    </Box>
  );
}

function DisruptionCard({ item }) {
  const impactColors = {
    High: '#f87171',
    Medium: '#fbbf24',
    Low: '#34d399',
  };

  return (
    <Box sx={{
      background: 'rgba(248, 113, 113, 0.08)',
      borderRadius: "12px",
      padding: "20px",
      mb: 2,
      border: '1px solid rgba(248, 113, 113, 0.2)',
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: "#f1f5f9", fontSize: "1rem" }}>
          ⚡ {item.title}
        </Typography>
        <Chip
          label={`${item.impact} Impact`}
          size="small"
          sx={{
            bgcolor: `${impactColors[item.impact]}20`,
            color: impactColors[item.impact],
            fontWeight: 600,
            fontSize: '0.65rem',
          }}
        />
      </Box>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.9rem", mb: 2 }}>
        {item.description}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {item.sectors?.map((sector, i) => (
          <Chip
            key={i}
            label={sector}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.7rem' }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ===== MAIN COMPONENT =====
const MarketIntel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/market-intel");
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load market intelligence.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Box sx={styles.container}>
        <Box textAlign="center" py={10}>
          <CircularProgress sx={{ color: "#6366f1" }} size={48} />
          <Typography sx={{ color: "#94a3b8", mt: 2 }}>Loading market intelligence...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={styles.container}>
        <Alert severity="error" sx={{ borderRadius: "12px", bgcolor: 'rgba(248, 113, 113, 0.1)', color: '#f87171' }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={styles.container}>
        <Alert severity="info" sx={{ borderRadius: "12px", bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
          No market data available yet. Start applying to jobs to see insights!
        </Alert>
      </Box>
    );
  }

  const {
    jobTrends = [],
    salaryTrends = [],
    skillsDemand = [],
    hiringActivity = [],
    disruptionInsights = [],
    recommendations = [],
    competitiveLandscape = {},
    marketOpportunities = [],
    skillRecommendations = [],
    locationTrends = {},
    companyGrowth = [],
    emergingTech = [],
    stats = {},
  } = data;

  const tabs = [
    { label: "Overview", icon: "📊" },
    { label: "Opportunities", icon: "🎯" },
    { label: "Skills", icon: "🧠" },
    { label: "Competition", icon: "🏆" },
  ];

  return (
    <Box sx={styles.container}>
      {/* Header */}
      <Box sx={styles.header}>
        <Typography sx={styles.title}>
          <span style={{ fontSize: "32px" }}>📊</span>
          Market Intelligence Dashboard
        </Typography>
        <Typography sx={styles.subtitle}>
          UC-102: Real-time market trends, career positioning insights, and personalized recommendations
        </Typography>
      </Box>

      {/* KPI Overview */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3} mb={4}>
        <KPICard
          title="Market Momentum"
          value={data.marketMomentum || "N/A"}
          icon="📈"
          trend="+12% vs last quarter"
        />
        <KPICard
          title="Top Skill Trend"
          value={data.topSkill || "N/A"}
          icon="🔥"
          subtitle="Highest demand growth"
        />
        <KPICard
          title="Avg. Salary Growth"
          value={`${data.salaryGrowth || 0}%`}
          icon="💰"
          trend="+2.3% YoY"
        />
        <KPICard
          title="Your Interview Rate"
          value={stats.interviewRate || "0%"}
          icon="🎯"
          subtitle={`${stats.totalInterviews || 0} of ${stats.totalApplications || 0} apps`}
        />
      </Box>

      {/* Tabs */}
      <Box sx={styles.tabsContainer}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': {
                color: '#f8fafc',
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
              },
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          {tabs.map((tab, i) => (
            <Tab key={i} label={<span>{tab.icon} {tab.label}</span>} />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {/* Job Trends & Salary */}
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3}>
            <ChartCard title="Job Market Trend" icon="📈" iconColor="#6366f1">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={jobTrends}>
                  <defs>
                    <linearGradient id="jobsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#jobsArea)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Salary Trends by Role" icon="💰" iconColor="#fbbf24">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={salaryTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="role" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Salary']}
                  />
                  <Bar dataKey="salary" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="lastYear" stroke="#64748b" strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>

          {/* Skills & Hiring */}
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3}>
            <ChartCard title="Skills Demand Distribution" icon="🧠" iconColor="#22d3ee">
              <Box display="flex" alignItems="center">
                <Box flex={1}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={skillsDemand}
                        dataKey="value"
                        nameKey="skill"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {skillsDemand.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ pl: 2 }}>
                  {skillsDemand.slice(0, 5).map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: COLORS[i] }} />
                      <Typography sx={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {s.skill}
                        {s.hot && <span style={{ color: '#f87171', marginLeft: 4 }}>🔥</span>}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', ml: 'auto' }}>
                        {s.trend}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </ChartCard>

            <ChartCard title="Company Hiring Activity" icon="🏢" iconColor="#a78bfa">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hiringActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="company" type="category" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>

          {/* Disruption Insights */}
          <ChartCard title="Industry Disruption & Future Outlook" icon="⚡" iconColor="#f87171">
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
              {disruptionInsights.map((item, idx) => (
                <DisruptionCard key={idx} item={item} />
              ))}
            </Box>
          </ChartCard>

          {/* Emerging Tech */}
          <ChartCard title="Emerging Technology Adoption" icon="🚀" iconColor="#34d399">
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }} gap={2}>
              {emergingTech.map((tech, idx) => (
                <Box key={idx} sx={{
                  background: 'rgba(52, 211, 153, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <Typography sx={{ fontWeight: 600, color: '#f1f5f9', mb: 1 }}>{tech.name}</Typography>
                  <Box sx={{ mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={tech.adoption}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(148, 163, 184, 0.2)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#34d399', borderRadius: 4 },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {tech.adoption}% adoption • {tech.momentum}
                  </Typography>
                  <Chip
                    label={tech.timeframe}
                    size="small"
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.65rem' }}
                  />
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Market Opportunities */}
          <ChartCard title="Market Opportunities & Timing Optimization" icon="🎯" iconColor="#6366f1">
            {marketOpportunities.length === 0 ? (
              <Typography sx={{ color: '#64748b' }}>No opportunities identified yet.</Typography>
            ) : (
              marketOpportunities.map((opp, idx) => (
                <OpportunityCard key={idx} opportunity={opp} />
              ))
            )}
          </ChartCard>

          {/* Location Trends */}
          <ChartCard title="Location-Based Market Trends" icon="🌍" iconColor="#22d3ee">
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3}>
              <Box>
                <Typography sx={{ color: '#94a3b8', mb: 2, fontSize: '0.85rem', fontWeight: 600 }}>
                  Top Tech Markets
                </Typography>
                {locationTrends.marketData?.map((loc, i) => (
                  <Box key={i} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                  }}>
                    <Box>
                      <Typography sx={{ color: '#f1f5f9', fontWeight: 500 }}>{loc.location}</Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {loc.remote} remote • {loc.competition} competition
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ color: '#34d399', fontWeight: 600 }}>{loc.jobGrowth}</Typography>
                      <Typography sx={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                        ${(loc.avgSalary / 1000).toFixed(0)}k avg
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography sx={{ color: '#94a3b8', mb: 2, fontSize: '0.85rem', fontWeight: 600 }}>
                  Your Application Distribution
                </Typography>
                {locationTrends.userDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={locationTrends.userDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="location" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                    Add location data to your job applications to see distribution
                  </Box>
                )}
              </Box>
            </Box>
          </ChartCard>

          {/* Personalized Recommendations */}
          <ChartCard title="Personalized Career Recommendations" icon="💡" iconColor="#34d399">
            {recommendations.length === 0 ? (
              <Typography sx={{ color: '#64748b' }}>Apply to more jobs to get personalized recommendations.</Typography>
            ) : (
              recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} rec={rec} />
              ))
            )}
          </ChartCard>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Skill Development */}
          <ChartCard title="Skill Development Recommendations" icon="🧠" iconColor="#a78bfa">
            <Typography sx={{ color: '#94a3b8', mb: 3, fontSize: '0.9rem' }}>
              Based on market demand and your current skillset, here are the top skills to focus on:
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={2}>
              {skillRecommendations.map((skill, idx) => (
                <SkillCard key={idx} skill={skill} />
              ))}
            </Box>
          </ChartCard>

          {/* Skills Radar */}
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3}>
            <ChartCard title="Skills Demand Radar" icon="📡" iconColor="#6366f1">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={skillsDemand.slice(0, 6).map(s => ({ ...s, fullMark: 40 }))}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis dataKey="skill" stroke="#94a3b8" fontSize={10} />
                  <PolarRadiusAxis stroke="#64748b" fontSize={10} />
                  <Radar name="Demand" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Hot Skills Trending Now" icon="🔥" iconColor="#f87171">
              {skillsDemand.filter(s => s.hot).map((skill, idx) => (
                <Box key={idx} sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 2,
                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      bgcolor: COLORS[idx % COLORS.length] + '30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      🔥
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>{skill.skill}</Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>{skill.value}% of job postings</Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={skill.trend}
                    size="small"
                    sx={{ bgcolor: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontWeight: 600 }}
                  />
                </Box>
              ))}
            </ChartCard>
          </Box>
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          {/* Competitive Landscape */}
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3}>
            <ChartCard title="Your Competitive Score" icon="🏆" iconColor="#fbbf24">
              <CompetitiveScoreGauge
                score={competitiveLandscape.competitiveScore || 50}
                ranking={competitiveLandscape.ranking || 'Average'}
              />
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>Your Interview Rate</Typography>
                  <Typography sx={{ color: '#6366f1', fontWeight: 700, fontSize: '1.25rem' }}>
                    {competitiveLandscape.yourInterviewRate || '0%'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(34, 211, 238, 0.1)', borderRadius: '12px' }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>Market Average</Typography>
                  <Typography sx={{ color: '#22d3ee', fontWeight: 700, fontSize: '1.25rem' }}>
                    {competitiveLandscape.marketAvgInterviewRate || '15%'}
                  </Typography>
                </Box>
              </Box>
            </ChartCard>

            <ChartCard title="Competitive Insights" icon="💡" iconColor="#22d3ee">
              {competitiveLandscape.insights?.length > 0 ? (
                competitiveLandscape.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: '#64748b', mb: 2 }}>
                    Apply to more jobs to generate competitive insights
                  </Typography>
                  <Typography sx={{ fontSize: '48px' }}>📊</Typography>
                </Box>
              )}

              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(148, 163, 184, 0.1)', borderRadius: '12px' }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>
                  Market Benchmarks
                </Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Avg Interview Rate</Typography>
                    <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>15%</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Avg Offer Rate</Typography>
                    <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>3%</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Top Performer Interview</Typography>
                    <Typography sx={{ color: '#34d399', fontWeight: 600 }}>30%+</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Top Performer Offer</Typography>
                    <Typography sx={{ color: '#34d399', fontWeight: 600 }}>10%+</Typography>
                  </Box>
                </Box>
              </Box>
            </ChartCard>
          </Box>

          {/* Company Response Analysis */}
          <ChartCard title="Company Response Analysis" icon="🏢" iconColor="#a78bfa">
            <Typography sx={{ color: '#94a3b8', mb: 2, fontSize: '0.85rem' }}>
              Response rates from companies you've applied to
            </Typography>
            {companyGrowth.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 600 }}>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    gap: 2,
                    py: 1.5,
                    borderBottom: '2px solid rgba(148, 163, 184, 0.2)',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    <Box>Company</Box>
                    <Box sx={{ textAlign: 'center' }}>Applications</Box>
                    <Box sx={{ textAlign: 'center' }}>Interviews</Box>
                    <Box sx={{ textAlign: 'center' }}>Offers</Box>
                    <Box sx={{ textAlign: 'center' }}>Response Rate</Box>
                  </Box>
                  {companyGrowth.map((company, idx) => (
                    <Box key={idx} sx={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      gap: 2,
                      py: 2,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      alignItems: 'center',
                    }}>
                      <Box>
                        <Typography sx={{ color: '#f1f5f9', fontWeight: 500 }}>{company.name}</Typography>
                        <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>{company.industry}</Typography>
                      </Box>
                      <Typography sx={{ textAlign: 'center', color: '#cbd5e1' }}>{company.applications}</Typography>
                      <Typography sx={{ textAlign: 'center', color: '#22d3ee' }}>{company.interviews}</Typography>
                      <Typography sx={{ textAlign: 'center', color: '#34d399' }}>{company.offers}</Typography>
                      <Box sx={{ textAlign: 'center' }}>
                        <Chip
                          label={company.responseRate}
                          size="small"
                          sx={{
                            bgcolor: parseInt(company.responseRate) > 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                            color: parseInt(company.responseRate) > 0 ? '#34d399' : '#94a3b8',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                Apply to jobs to see company response analysis
              </Box>
            )}
          </ChartCard>
        </Box>
      )}
    </Box>
  );
};

export default MarketIntel;
