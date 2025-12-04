// frontend/src/components/SuccessPatternAnalysis.jsx
// UC-105: Success Pattern Recognition

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
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
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

function KPICard({ title, value, subtitle, color = "#3b82f6", icon }) {
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
        </Box>
        {icon && (
          <Typography sx={{ fontSize: "24px" }}>{icon}</Typography>
        )}
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

function SuccessFactorCard({ factor, value, impact }) {
  return (
    <Box sx={{
      background: "#eff6ff",
      borderRadius: "8px",
      padding: "16px",
      border: "1px solid #3b82f6",
    }}>
      <Typography sx={{ fontWeight: 600, color: "#1e40af", fontSize: "0.9rem", mb: 0.5 }}>
        {factor}
      </Typography>
      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#3b82f6", mb: 0.5 }}>
        {value}
      </Typography>
      {impact && (
        <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
          {impact}
        </Typography>
      )}
    </Box>
  );
}

// ===== MAIN COMPONENT =====
const SuccessPatternAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/success-patterns");
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load success pattern analysis.");
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
        <Typography sx={{ color: "#6b7280", mt: 2 }}>Analyzing success patterns...</Typography>
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
        No data available. Start applying to jobs to see success pattern analysis!
      </Alert>
    );
  }

  const {
    summary = {},
    applicationPatterns = {},
    preparationCorrelation = {},
    timingPatterns = {},
    strategyEffectiveness = {},
    successFactors = {},
    predictiveModel = {},
    patternEvolution = {},
    recommendations = [],
  } = data;

  // Prepare chart data
  const industryData = applicationPatterns.industrySuccessRates || [];
  const preparationData = preparationCorrelation.preparationData || [];
  const strategyData = strategyEffectiveness.customization || [];
  const evolutionData = patternEvolution.evolution || [];

  return (
    <Box>
      {/* Summary KPIs */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={2} mb={3}>
        <KPICard
          title="Overall Success Rate"
          value={`${summary.overallSuccessRate || 0}%`}
          subtitle={`${summary.successfulApplications || 0} of ${summary.totalApplications || 0} apps`}
          color="#3b82f6"
          icon="📊"
        />
        <KPICard
          title="Offer Rate"
          value={`${summary.offerRate || 0}%`}
          subtitle={`${summary.offers || 0} offers received`}
          color="#10b981"
          icon="✅"
        />
        <KPICard
          title="Predicted Success"
          value={`${predictiveModel.optimizedSuccessRate || 0}%`}
          subtitle={`With optimal strategy`}
          color="#8b5cf6"
          icon="🔮"
        />
        <KPICard
          title="Trend"
          value={patternEvolution.trend === 'improving' ? '📈 Improving' : patternEvolution.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}
          subtitle={patternEvolution.recentPerformance ? `${patternEvolution.recentPerformance.successRate}% recent` : 'N/A'}
          color={patternEvolution.trend === 'improving' ? "#10b981" : patternEvolution.trend === 'declining' ? "#ef4444" : "#f59e0b"}
          icon="📈"
        />
      </Box>

      {/* Success Factors */}
      <ChartCard title="Your Success Factors" icon="⭐" iconColor="#f59e0b">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }} gap={2}>
          {successFactors.topIndustries?.slice(0, 3).map((ind, idx) => (
            <SuccessFactorCard
              key={idx}
              factor={ind.industry}
              value={`${ind.successRate}%`}
              impact={`${ind.total} applications`}
            />
          ))}
          {successFactors.experienceLevel && (
            <SuccessFactorCard
              factor="Experience Level"
              value={successFactors.experienceLevel}
            />
          )}
          {successFactors.customizationPreference && (
            <SuccessFactorCard
              factor="Customization"
              value={successFactors.customizationPreference}
            />
          )}
        </Box>
      </ChartCard>

      {/* Industry Success Patterns */}
      <ChartCard title="Success by Industry" icon="🏢" iconColor="#3b82f6">
        {industryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="industry" stroke="#9ca3af" fontSize={10} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                formatter={(value) => [`${value}%`, "Success Rate"]}
              />
              <Bar dataKey="successRate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {industryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            Add more applications with industry data to see patterns
          </Box>
        )}
      </ChartCard>

      {/* Preparation Correlation */}
      <ChartCard title="Preparation Activity Impact" icon="📚" iconColor="#10b981">
        {preparationData.length > 0 ? (
          <Box>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={preparationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`${value}%`, "Success Rate"]}
                />
                <Bar dataKey="successRate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {preparationCorrelation.bestStrategy && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "#f0fdf4", borderRadius: "8px" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                  💡 Best Strategy: {preparationCorrelation.bestStrategy.type} ({preparationCorrelation.bestStrategy.successRate}% success rate)
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            Start researching companies and networking to see preparation impact
          </Box>
        )}
      </ChartCard>

      {/* Timing Patterns */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Optimal Timing" icon="🕐" iconColor="#8b5cf6">
          {applicationPatterns.peakTiming ? (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Hour</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#8b5cf6" }}>
                  {applicationPatterns.peakTiming.hour || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Day</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#8b5cf6" }}>
                  {applicationPatterns.peakTiming.day || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Month</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#8b5cf6" }}>
                  {applicationPatterns.peakTiming.month || "N/A"}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              Apply to more jobs to identify timing patterns
            </Box>
          )}
        </ChartCard>

        <ChartCard title="Response Time Averages" icon="⏱️" iconColor="#06b6d4">
          {timingPatterns.averages ? (
            <Box>
              {timingPatterns.averages.timeToResponse && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>Time to Response</Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#06b6d4" }}>
                      {timingPatterns.averages.timeToResponse} days
                    </Typography>
                  </Box>
                </Box>
              )}
              {timingPatterns.averages.timeToInterview && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>Time to Interview</Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#06b6d4" }}>
                      {timingPatterns.averages.timeToInterview} days
                    </Typography>
                  </Box>
                </Box>
              )}
              {timingPatterns.averages.timeToOffer && (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>Time to Offer</Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#06b6d4" }}>
                      {timingPatterns.averages.timeToOffer} days
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              No timing data available yet
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* Strategy Effectiveness */}
      <ChartCard title="Strategy Effectiveness" icon="📈" iconColor="#f59e0b">
        {strategyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={strategyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="level" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                formatter={(value) => [`${value}%`, "Success Rate"]}
              />
              <Bar dataKey="successRate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            Customize your applications to see strategy effectiveness
          </Box>
        )}
      </ChartCard>

      {/* Pattern Evolution */}
      {evolutionData.length > 0 && (
        <ChartCard title="Pattern Evolution Over Time" icon="📊" iconColor="#8b5cf6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOffer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                formatter={(value) => [`${value}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="successRate"
                stroke="#8b5cf6"
                fill="url(#colorSuccess)"
                name="Success Rate"
              />
              <Area
                type="monotone"
                dataKey="offerRate"
                stroke="#10b981"
                fill="url(#colorOffer)"
                name="Offer Rate"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Predictive Model */}
      {predictiveModel.factors && predictiveModel.factors.length > 0 && (
        <ChartCard title="Predictive Success Factors" icon="🔮" iconColor="#6366f1">
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>Base Success Rate</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#6366f1" }}>
                  {predictiveModel.baseSuccessRate}%
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>Optimized Rate</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
                  {predictiveModel.optimizedSuccessRate}%
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: "0.9rem", color: "#374151", mb: 2, fontWeight: 600 }}>
              Factors that increase your success probability:
            </Typography>
            {predictiveModel.factors.map((factor, idx) => (
              <Box key={idx} sx={{
                background: "#f3f4f6",
                borderRadius: "8px",
                padding: "12px",
                mb: 1.5,
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.9rem", color: "#374151", fontWeight: 500 }}>
                    {factor.factor}
                  </Typography>
                  <Chip
                    label={factor.impact}
                    size="small"
                    sx={{
                      bgcolor: factor.confidence === 'high' ? '#10b981' : '#f59e0b',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </ChartCard>
      )}

      {/* Recommendations */}
      <ChartCard title="Pattern-Based Recommendations" icon="💡" iconColor="#22c55e">
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            Apply to more jobs to get personalized pattern-based recommendations
          </Box>
        )}
      </ChartCard>
    </Box>
  );
};

export default SuccessPatternAnalysis;

