// frontend/src/components/PerformancePrediction.jsx
// UC-107: Performance Prediction and Forecasting

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
                bgcolor: trend.includes('+') ? 'rgba(34, 211, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: trend.includes('+') ? '#166534' : '#1e40af',
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

function ProbabilityGauge({ probability, range, confidence }) {
  const getColor = (p) => {
    if (p >= 70) return "#22c55e";
    if (p >= 50) return "#3b82f6";
    if (p >= 30) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={180}
          thickness={4}
          sx={{ color: 'rgba(148, 163, 184, 0.2)' }}
        />
        <CircularProgress
          variant="determinate"
          value={probability}
          size={180}
          thickness={4}
          sx={{
            color: getColor(probability),
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
            {probability}%
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            Success Probability
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 1 }}>
          Confidence Range: {range.min}% - {range.max}%
        </Typography>
        <Chip
          label={`${confidence} Confidence`}
          size="small"
          sx={{
            bgcolor: `${getColor(probability)}20`,
            color: getColor(probability),
            fontWeight: 600,
          }}
        />
      </Box>
    </Box>
  );
}

function ScenarioCard({ scenario }) {
  return (
    <Card sx={{ mb: 2, border: '1px solid #e5e7eb' }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography sx={{ fontWeight: 600, color: "#374151", fontSize: "1rem" }}>
            {scenario.name}
          </Typography>
          <Chip
            label={`${scenario.probability}% likely`}
            size="small"
            sx={{ bgcolor: "#eff6ff", color: "#1e40af", fontWeight: 600 }}
          />
        </Box>
        <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 2 }}>
          {scenario.description}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", mb: 1 }}>
            Assumptions:
          </Typography>
          {scenario.assumptions.map((assumption, idx) => (
            <Typography key={idx} sx={{ fontSize: "0.8rem", color: "#6b7280", mb: 0.5 }}>
              • {assumption}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          <Box sx={{ textAlign: "center", p: 1, bgcolor: "#f3f4f6", borderRadius: "6px" }}>
            <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>Time to Offer</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
              {scenario.predictedOutcomes.timeToOffer} days
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", p: 1, bgcolor: "#f3f4f6", borderRadius: "6px" }}>
            <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>Apps Needed</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
              {scenario.predictedOutcomes.applicationsNeeded}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", p: 1, bgcolor: "#f3f4f6", borderRadius: "6px" }}>
            <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>Success Rate</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
              {scenario.predictedOutcomes.successRate}%
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
      <Typography sx={{ color: colors.text, fontSize: "0.9rem", mb: 1 }}>
        {rec.message}
      </Typography>
      <Box sx={{ mb: 1 }}>
        {rec.actions.map((action, idx) => (
          <Typography key={idx} sx={{ fontSize: "0.85rem", color: colors.text, mb: 0.5 }}>
            • {action}
          </Typography>
        ))}
      </Box>
      <Chip
        label={`Expected Impact: ${rec.expectedImpact}`}
        size="small"
        sx={{
          bgcolor: `${colors.border}30`,
          color: colors.border,
          fontWeight: 600,
        }}
      />
    </Box>
  );
}

// ===== MAIN COMPONENT =====
const PerformancePrediction = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityLevel, setActivityLevel] = useState('normal');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/performance-prediction", {
          params: { activityLevel },
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load performance predictions.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activityLevel]);

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress sx={{ color: "#3b82f6" }} size={42} />
        <Typography sx={{ color: "#6b7280", mt: 2 }}>Generating predictions...</Typography>
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
        No data available. Start applying to jobs to see predictions!
      </Alert>
    );
  }

  const {
    interviewSuccess = {},
    timeline = {},
    salaryNegotiation = {},
    optimalTiming = {},
    scenarios = [],
    accuracyTracking = {},
    recommendations = [],
    summary = {},
  } = data;

  // Prepare timeline chart data
  const timelineData = timeline.milestones?.map((m, idx) => ({
    milestone: m.milestone,
    days: m.days,
    index: idx,
  })) || [];

  // Prepare scenario comparison data
  const scenarioComparison = scenarios.map(s => ({
    name: s.name,
    timeToOffer: s.predictedOutcomes.timeToOffer,
    applicationsNeeded: s.predictedOutcomes.applicationsNeeded,
    successRate: s.predictedOutcomes.successRate,
  }));

  return (
    <Box>
      {/* Activity Level Selector */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Activity Level</InputLabel>
          <Select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            label="Activity Level"
          >
            <MenuItem value="low">Low Activity</MenuItem>
            <MenuItem value="normal">Normal Activity</MenuItem>
            <MenuItem value="high">High Activity</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary KPIs */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={2} mb={3}>
        <KPICard
          title="Interview Success"
          value={`${summary.overallSuccessProbability || 0}%`}
          subtitle={`Range: ${interviewSuccess.range?.min || 0}% - ${interviewSuccess.range?.max || 0}%`}
          color="#3b82f6"
          icon="🎯"
        />
        <KPICard
          title="Time to Offer"
          value={`${summary.estimatedTimeToOffer || 0} days`}
          subtitle={`~${timeline.estimatedApplicationsNeeded || 0} apps needed`}
          color="#10b981"
          icon="📅"
        />
        <KPICard
          title="Negotiation Success"
          value={`${summary.negotiationSuccessRate || 0}%`}
          subtitle={`Potential: +$${(salaryNegotiation.predictedSalaryIncrease || 0).toLocaleString()}`}
          color="#8b5cf6"
          icon="💰"
        />
        <KPICard
          title="Timing Score"
          value={`${summary.currentTimingScore || 0}/100`}
          subtitle={optimalTiming.currentTiming?.recommendation || "N/A"}
          color={summary.currentTimingScore >= 70 ? "#10b981" : summary.currentTimingScore >= 50 ? "#f59e0b" : "#ef4444"}
          icon="⏰"
        />
      </Box>

      {/* Interview Success Prediction */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Interview Success Probability" icon="🎯" iconColor="#3b82f6">
          <ProbabilityGauge
            probability={interviewSuccess.probability || 0}
            range={interviewSuccess.range || { min: 0, max: 100 }}
            confidence={interviewSuccess.confidenceInterval ? `${100 - interviewSuccess.confidenceInterval}%` : "Medium"}
          />
          {interviewSuccess.factors && interviewSuccess.factors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                Contributing Factors:
              </Typography>
              {interviewSuccess.factors.map((factor, idx) => (
                <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>{factor.name}</Typography>
                  <Chip
                    label={factor.impact}
                    size="small"
                    sx={{
                      bgcolor: factor.impact.includes('+') ? 'rgba(34, 211, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: factor.impact.includes('+') ? '#166534' : '#1e40af',
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </ChartCard>

        <ChartCard title="Timeline Forecast" icon="📅" iconColor="#10b981">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="milestone" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={11} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`${value} days`, ""]}
                />
                <Bar dataKey="days" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              Apply to more jobs to see timeline forecast
            </Box>
          )}
          {timeline.estimatedTimeToOffer && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "#f0fdf4", borderRadius: "8px" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                Estimated Time to Offer: {timeline.estimatedTimeToOffer} days
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mt: 0.5 }}>
                Based on {timeline.historicalAverage || 0} day historical average
              </Typography>
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* Salary Negotiation & Optimal Timing */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Salary Negotiation Prediction" icon="💰" iconColor="#8b5cf6">
          {salaryNegotiation.negotiationSuccessProbability ? (
            <Box>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: "#8b5cf6" }}>
                  {salaryNegotiation.negotiationSuccessProbability}%
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  Negotiation Success Probability
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Market Average</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 600, color: "#374151" }}>
                  ${(salaryNegotiation.marketAverage || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Predicted Increase</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 600, color: "#10b981" }}>
                  +${(salaryNegotiation.predictedSalaryIncrease || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Predicted Final Salary</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6" }}>
                  ${(salaryNegotiation.predictedFinalSalary || 0).toLocaleString()}
                </Typography>
              </Box>
              {salaryNegotiation.factors && salaryNegotiation.factors.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e5e7eb" }}>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                    Strengthening Factors:
                  </Typography>
                  {salaryNegotiation.factors.map((factor, idx) => (
                    <Chip
                      key={idx}
                      label={`${factor.name}: ${factor.impact}`}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5, bgcolor: "#eff6ff", color: "#1e40af" }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              No salary data available
            </Box>
          )}
        </ChartCard>

        <ChartCard title="Optimal Timing Prediction" icon="⏰" iconColor="#f59e0b">
          {optimalTiming.optimalMonth ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Month</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b" }}>
                  {optimalTiming.optimalMonth}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Day</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b" }}>
                  {optimalTiming.optimalDay}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", mb: 0.5 }}>Best Hour</Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b" }}>
                  {optimalTiming.optimalHour}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "#fffbeb", borderRadius: "8px", mb: 2 }}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#92400e", mb: 0.5 }}>
                  Current Timing Score
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={optimalTiming.currentTiming?.score || 0}
                    sx={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#fef3c7",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: optimalTiming.currentTiming?.score >= 70 ? "#10b981" : "#f59e0b",
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
                    {optimalTiming.currentTiming?.score || 0}/100
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mt: 0.5 }}>
                  {optimalTiming.currentTiming?.recommendation || "N/A"}
                </Typography>
              </Box>
              {optimalTiming.nextOptimalWindow && (
                <Box sx={{ p: 2, bgcolor: "#eff6ff", borderRadius: "8px" }}>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e40af", mb: 0.5 }}>
                    Next Optimal Window
                  </Typography>
                  <Typography sx={{ fontSize: "0.9rem", color: "#374151" }}>
                    {optimalTiming.nextOptimalWindow.month}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mt: 0.5 }}>
                    {optimalTiming.nextOptimalWindow.reason}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              Apply to more jobs to identify optimal timing
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* Scenario Planning */}
      <ChartCard title="Scenario Planning" icon="🔮" iconColor="#6366f1">
        {scenarios.length > 0 ? (
          <Box>
            {scenarios.map((scenario, idx) => (
              <ScenarioCard key={idx} scenario={scenario} />
            ))}
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", mb: 2 }}>
                Scenario Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scenarioComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="timeToOffer" fill="#3b82f6" name="Time to Offer (days)" />
                  <Bar dataKey="applicationsNeeded" fill="#10b981" name="Applications Needed" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            No scenario data available
          </Box>
        )}
      </ChartCard>

      {/* Accuracy Tracking */}
      <ChartCard title="Prediction Accuracy & Model Performance" icon="📊" iconColor="#06b6d4">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2} mb={2}>
          <Box sx={{ textAlign: "center", p: 2, bgcolor: "#f0fdf4", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>Overall Accuracy</Typography>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
              {accuracyTracking.overallAccuracy?.toFixed(0) || 0}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", p: 2, bgcolor: "#eff6ff", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>Trend Accuracy</Typography>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
              {accuracyTracking.trendAccuracy?.toFixed(0) || 0}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", p: 2, bgcolor: "#fffbeb", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>Model Status</Typography>
            <Chip
              label={accuracyTracking.modelImprovement === 'improving' ? 'Improving' : 
                     accuracyTracking.modelImprovement === 'declining' ? 'Declining' : 'Stable'}
              sx={{
                bgcolor: accuracyTracking.modelImprovement === 'improving' ? '#10b981' : 
                         accuracyTracking.modelImprovement === 'declining' ? '#ef4444' : '#f59e0b',
                color: '#fff',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
        <Typography sx={{ fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>
          Accuracy improves as you add more job application data. The model learns from your historical patterns.
        </Typography>
      </ChartCard>

      {/* Improvement Recommendations */}
      <ChartCard title="Recommendations to Improve Predicted Outcomes" icon="💡" iconColor="#22c55e">
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            <Typography>Your predictions are looking good! Keep up the great work.</Typography>
          </Box>
        )}
      </ChartCard>
    </Box>
  );
};

export default PerformancePrediction;

