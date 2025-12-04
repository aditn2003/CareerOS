// frontend/src/components/CompetitiveAnalysis.jsx
// UC-104: Competitive Analysis and Benchmarking

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from "@mui/material";
import { api } from "../api";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  Cell,
} from "recharts";

// ===== STYLES =====
const styles = {
  chartCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e5e7eb",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  iconBox: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700,
    color: "#fff",
  },
  kpiCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px 24px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
};

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

// ===== COMPONENTS =====
function SectionIcon({ color, children }) {
  return <Box sx={{ ...styles.iconBox, background: color }}>{children}</Box>;
}

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

function KPICard({ title, value, subtitle, color = "#3b82f6", icon, trend }) {
  return (
    <Box sx={styles.kpiCard}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography sx={{
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            mb: 1,
          }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: "0.85rem", color: "#9ca3af", mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Chip
              label={trend}
              size="small"
              sx={{
                mt: 1,
                bgcolor: trend.includes('Top') ? 'rgba(34, 211, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: trend.includes('Top') ? '#166534' : '#1e40af',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>
        {icon && (
          <Typography sx={{ fontSize: "24px" }}>{icon}</Typography>
        )}
      </Box>
    </Box>
  );
}

function MarketPositionGauge({ score, position }) {
  const getColor = (s) => {
    if (s >= 75) return "#22c55e";
    if (s >= 50) return "#3b82f6";
    if (s >= 25) return "#f59e0b";
    return "#ef4444";
  };

  const getPositionColor = (p) => {
    if (p.includes('Top')) return "#22c55e";
    if (p.includes('Above')) return "#3b82f6";
    if (p.includes('Below')) return "#ef4444";
    return "#f59e0b";
  };

  const data = [{ name: "Score", value: score, fill: getColor(score) }];

  return (
    <Box sx={{ textAlign: "center" }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          innerRadius="60%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <Box sx={{ mt: -7 }}>
        <Typography sx={{ fontSize: "2.5rem", fontWeight: 700, color: getColor(score) }}>
          {score}
        </Typography>
        <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 1 }}>
          Market Position Score
        </Typography>
        <Chip
          label={position}
          sx={{
            bgcolor: `${getPositionColor(position)}20`,
            color: getPositionColor(position),
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        />
      </Box>
    </Box>
  );
}

function RecommendationCard({ rec }) {
  const priorityColors = {
    high: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    medium: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
    low: { bg: "#f0fdf4", border: "#22c55e", text: "#166534" },
  };
  const colors = priorityColors[rec.priority] || priorityColors.medium;

  return (
    <Box sx={{
      background: colors.bg,
      borderLeft: `4px solid ${colors.border}`,
      borderRadius: "8px",
      padding: "16px",
      mb: 2,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: "20px" }}>{rec.icon}</Typography>
        <Typography sx={{ fontWeight: 600, color: "#374151" }}>
          {rec.title}
        </Typography>
        <Chip
          label={rec.priority}
          size="small"
          sx={{
            ml: "auto",
            bgcolor: colors.border,
            color: "#fff",
            fontSize: "0.65rem",
            height: "20px",
          }}
        />
      </Box>
      <Typography sx={{ color: colors.text, fontSize: "0.9rem" }}>
        {rec.message}
      </Typography>
    </Box>
  );
}

function SkillGapCard({ gap }) {
  return (
    <Box sx={{
      background: "#fef2f2",
      borderLeft: "3px solid #ef4444",
      borderRadius: "8px",
      padding: "14px",
      mb: 1.5,
    }}>
      <Typography sx={{ fontWeight: 600, color: "#991b1b", fontSize: "0.9rem", mb: 0.5 }}>
        {gap.skill}
      </Typography>
      <Typography sx={{ color: "#7f1d1d", fontSize: "0.85rem" }}>
        {gap.impact}
      </Typography>
    </Box>
  );
}

function DifferentiationCard({ strategy }) {
  return (
    <Box sx={{
      background: "#eff6ff",
      borderLeft: "3px solid #3b82f6",
      borderRadius: "8px",
      padding: "16px",
      mb: 2,
    }}>
      <Typography sx={{ fontWeight: 600, color: "#1e40af", fontSize: "0.95rem", mb: 1 }}>
        {strategy.title}
      </Typography>
      <Typography sx={{ color: "#1e3a8a", fontSize: "0.85rem", mb: 1 }}>
        {strategy.description}
      </Typography>
      <Box sx={{
        background: "#dbeafe",
        borderRadius: "6px",
        padding: "10px",
        mt: 1,
      }}>
        <Typography sx={{ fontSize: "0.75rem", color: "#1e3a8a", fontWeight: 600, mb: 0.5 }}>
          💡 Actionable:
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "#1e40af" }}>
          {strategy.actionable}
        </Typography>
      </Box>
    </Box>
  );
}

function PercentileBar({ category, percentile }) {
  const getColor = (p) => {
    if (p >= 75) return "#22c55e";
    if (p >= 50) return "#3b82f6";
    if (p >= 25) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>
          {category}
        </Typography>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: getColor(percentile) }}>
          {percentile}th percentile
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentile}
        sx={{
          height: 24,
          borderRadius: 6,
          bgcolor: "#f3f4f6",
          "& .MuiLinearProgress-bar": {
            bgcolor: getColor(percentile),
            borderRadius: 6,
          },
        }}
      />
    </Box>
  );
}

// ===== MAIN COMPONENT =====
const CompetitiveAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/competitive-analysis");
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load competitive analysis.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress sx={{ color: "#3b82f6" }} size={42} />
        <Typography sx={{ color: "#6b7280", mt: 2 }}>Analyzing your competitive position...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: "8px" }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ borderRadius: "8px" }}>
        No data available. Start applying to jobs to see your competitive analysis!
      </Alert>
    );
  }

  const {
    marketPosition = {},
    userMetrics = {},
    comparisons = {},
    skillsProfile = {},
    experienceProfile = {},
    skillGaps = [],
    recommendations = [],
    differentiationStrategies = [],
    benchmarkData = [],
    percentileData = [],
  } = data;

  // Prepare radar chart data
  const radarData = [
    {
      subject: 'Interview Rate',
      user: Math.min(100, userMetrics.interviewRate || 0),
      average: comparisons.interviewRate?.benchmark || 0,
      topPerformer: comparisons.interviewRate?.topPerformer || 0,
    },
    {
      subject: 'Offer Rate',
      user: Math.min(100, userMetrics.offerRate || 0),
      average: comparisons.offerRate?.benchmark || 0,
      topPerformer: comparisons.offerRate?.topPerformer || 0,
    },
    {
      subject: 'Tech Skills',
      user: Math.min(100, (comparisons.technicalSkills?.user || 0) * 8),
      average: (comparisons.technicalSkills?.benchmark || 0) * 8,
      topPerformer: (comparisons.technicalSkills?.topPerformer || 0) * 8,
    },
    {
      subject: 'Networking',
      user: Math.min(100, (comparisons.networking?.user || 0) * 2),
      average: (comparisons.networking?.benchmark || 0) * 2,
      topPerformer: (comparisons.networking?.topPerformer || 0) * 2,
    },
    {
      subject: 'Experience',
      user: Math.min(100, (comparisons.experience?.user || 0) * 10),
      average: (comparisons.experience?.benchmark || 0) * 10,
      topPerformer: (comparisons.experience?.topPerformer || 0) * 10,
    },
  ];

  return (
    <Box>
      {/* Header with Market Position */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Your Market Position" icon="🏆" iconColor="#f59e0b">
          <MarketPositionGauge
            score={marketPosition.score || 50}
            position={marketPosition.position || "Average"}
          />
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
              You're in the <strong>{marketPosition.percentile || 50}th percentile</strong> of job seekers
            </Typography>
          </Box>
        </ChartCard>

        <Box>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
            <KPICard
              title="Interview Rate"
              value={`${userMetrics.interviewRate?.toFixed(1) || 0}%`}
              subtitle={`Avg: ${comparisons.interviewRate?.benchmark || 0}%`}
              color="#3b82f6"
              icon="🎯"
              trend={userMetrics.interviewRate >= comparisons.interviewRate?.topPerformer ? "Top Performer" : ""}
            />
            <KPICard
              title="Offer Rate"
              value={`${userMetrics.offerRate?.toFixed(1) || 0}%`}
              subtitle={`Avg: ${comparisons.offerRate?.benchmark || 0}%`}
              color="#10b981"
              icon="✅"
              trend={userMetrics.offerRate >= comparisons.offerRate?.topPerformer ? "Top Performer" : ""}
            />
          </Box>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <KPICard
              title="Technical Skills"
              value={comparisons.technicalSkills?.user || 0}
              subtitle={`Top: ${comparisons.technicalSkills?.topPerformer || 0}`}
              color="#8b5cf6"
              icon="💻"
            />
            <KPICard
              title="Network Size"
              value={comparisons.networking?.user || 0}
              subtitle={`Top: ${comparisons.networking?.topPerformer || 0}`}
              color="#06b6d4"
              icon="🤝"
            />
          </Box>
        </Box>
      </Box>

      {/* Benchmark Comparison */}
      <ChartCard title="Performance vs Benchmarks" icon="📊" iconColor="#3b82f6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={benchmarkData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="metric" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="user" fill="#3b82f6" name="You" radius={[4, 4, 0, 0]} />
            <Bar dataKey="average" fill="#94a3b8" name="Average" radius={[4, 4, 0, 0]} />
            <Bar dataKey="topPerformer" fill="#22c55e" name="Top Performer" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Radar Chart */}
      <ChartCard title="Competitive Profile Radar" icon="📡" iconColor="#8b5cf6">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" stroke="#6b7280" fontSize={11} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
            <Radar
              name="You"
              dataKey="user"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Radar
              name="Average"
              dataKey="average"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.3}
            />
            <Radar
              name="Top Performer"
              dataKey="topPerformer"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.2}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Percentile Rankings */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Percentile Rankings" icon="📈" iconColor="#10b981">
          {percentileData.map((item, idx) => (
            <PercentileBar
              key={idx}
              category={item.category}
              percentile={item.percentile}
            />
          ))}
        </ChartCard>

        <ChartCard title="Profile Summary" icon="👤" iconColor="#f59e0b">
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Experience Level</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
              {experienceProfile.highestLevel || "Entry"} ({experienceProfile.totalYears || 0} years)
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Education</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
              {experienceProfile.educationLevel || "Not specified"}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Skills Profile</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
              {skillsProfile.total || 0} total skills ({skillsProfile.technical || 0} technical, {skillsProfile.soft || 0} soft)
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", mt: 0.5 }}>
              Skill depth: {skillsProfile.skillDepth || "Moderate"}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Companies Worked At</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
              {experienceProfile.companies || 0} companies
            </Typography>
          </Box>
        </ChartCard>
      </Box>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <ChartCard title="Skill Gaps vs Top Performers" icon="⚠️" iconColor="#ef4444">
          <Typography sx={{ color: "#6b7280", mb: 2, fontSize: "0.9rem" }}>
            These skills are in high demand in your target industries but are missing from your profile:
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={2}>
            {skillGaps.map((gap, idx) => (
              <SkillGapCard key={idx} gap={gap} />
            ))}
          </Box>
        </ChartCard>
      )}

      {/* Differentiation Strategies */}
      {differentiationStrategies.length > 0 && (
        <ChartCard title="Differentiation Strategies" icon="💎" iconColor="#8b5cf6">
          <Typography sx={{ color: "#6b7280", mb: 2, fontSize: "0.9rem" }}>
            Leverage these unique strengths to stand out from competitors:
          </Typography>
          {differentiationStrategies.map((strategy, idx) => (
            <DifferentiationCard key={idx} strategy={strategy} />
          ))}
        </ChartCard>
      )}

      {/* Competitive Recommendations */}
      <ChartCard title="Competitive Advantage Recommendations" icon="💡" iconColor="#22c55e">
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            <Typography>You're performing well! Keep up the great work.</Typography>
          </Box>
        )}
      </ChartCard>
    </Box>
  );
};

export default CompetitiveAnalysis;

