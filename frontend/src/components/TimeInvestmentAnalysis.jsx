// frontend/src/components/TimeInvestmentAnalysis.jsx
// UC-103: Time Investment and Productivity Analysis

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import { api } from "../api";
// Using inline icons instead of @mui/icons-material to avoid dependency issues
const AddIcon = () => <span style={{ fontSize: '1.2rem' }}>➕</span>;
const DeleteIcon = () => <span style={{ fontSize: '1rem' }}>🗑️</span>;
const EditIcon = () => <span style={{ fontSize: '1rem' }}>✏️</span>;
const CloseIcon = () => <span style={{ fontSize: '1.2rem' }}>✕</span>;
const RefreshIcon = () => <span style={{ fontSize: '1rem' }}>🔄</span>;

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
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

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

const ACTIVITY_TYPES = [
  { value: 'application', label: 'Job Application', icon: '📝', category: 'Applications' },
  { value: 'resume_update', label: 'Resume Update', icon: '📄', category: 'Applications' },
  { value: 'cover_letter', label: 'Cover Letter Writing', icon: '✉️', category: 'Applications' },
  { value: 'research', label: 'Company Research', icon: '🔍', category: 'Research' },
  { value: 'networking', label: 'Networking', icon: '🤝', category: 'Networking' },
  { value: 'linkedin_optimization', label: 'LinkedIn Optimization', icon: '💼', category: 'Networking' },
  { value: 'follow_up', label: 'Follow-up', icon: '📧', category: 'Networking' },
  { value: 'interview_prep', label: 'Interview Preparation', icon: '🎯', category: 'Interviews' },
  { value: 'mock_interview', label: 'Mock Interview', icon: '🎭', category: 'Interviews' },
  { value: 'phone_screen', label: 'Phone Screen', icon: '📞', category: 'Interviews' },
  { value: 'interview', label: 'Interview', icon: '💬', category: 'Interviews' },
  { value: 'coding_practice', label: 'Coding Practice', icon: '💻', category: 'Skills' },
  { value: 'skill_learning', label: 'Skill Learning', icon: '📚', category: 'Skills' },
  { value: 'portfolio_update', label: 'Portfolio Update', icon: '🎨', category: 'Skills' },
  { value: 'salary_negotiation', label: 'Salary Negotiation', icon: '💰', category: 'Other' },
  { value: 'other', label: 'Other', icon: '📌', category: 'Other' },
];

// ===== COMPONENTS =====
function SectionIcon({ color, children }) {
  return <Box sx={{ ...styles.iconBox, background: color }}>{children}</Box>;
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

function ProductivityGauge({ score }) {
  const getColor = (s) => {
    if (s >= 75) return "#22c55e";
    if (s >= 50) return "#3b82f6";
    if (s >= 25) return "#f59e0b";
    return "#ef4444";
  };

  const data = [{ name: "Score", value: score, fill: getColor(score) }];

  return (
    <Box sx={{ textAlign: "center" }}>
      <ResponsiveContainer width="100%" height={200}>
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
      <Box sx={{ mt: -8 }}>
        <Typography sx={{ fontSize: "2.5rem", fontWeight: 700, color: getColor(score) }}>
          {score}
        </Typography>
        <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
          Productivity Score
        </Typography>
      </Box>
    </Box>
  );
}

function BurnoutIndicator({ risk, score }) {
  const getColor = (r) => {
    if (r === "low") return "#22c55e";
    if (r === "medium") return "#f59e0b";
    return "#ef4444";
  };

  const getRiskLabel = (r) => {
    if (r === "low") return "Low Risk";
    if (r === "medium") return "Moderate";
    return "High Risk";
  };

  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <Box sx={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        border: `8px solid ${getColor(risk)}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        mx: "auto",
        mb: 2,
      }}>
        <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: getColor(risk) }}>
          {100 - score}%
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>
          Balance
        </Typography>
      </Box>
      <Chip
        label={getRiskLabel(risk)}
        sx={{
          bgcolor: `${getColor(risk)}20`,
          color: getColor(risk),
          fontWeight: 600,
        }}
      />
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

function HeatmapCell({ value, maxValue }) {
  const intensity = maxValue > 0 ? value / maxValue : 0;
  const bgColor = intensity > 0.7 ? "#1e40af" :
                  intensity > 0.4 ? "#3b82f6" :
                  intensity > 0.1 ? "#93c5fd" :
                  intensity > 0 ? "#dbeafe" : "#f3f4f6";
  
  return (
    <Box sx={{
      width: 24,
      height: 24,
      borderRadius: "4px",
      bgcolor: bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.6rem",
      color: intensity > 0.4 ? "#fff" : "#6b7280",
    }}>
      {value > 0 ? value : ""}
    </Box>
  );
}

// Activity Log Form Dialog
function ActivityLogDialog({ open, onClose, onSave, editActivity }) {
  const [formData, setFormData] = useState({
    activity_type: '',
    title: '',
    description: '',
    company: '',
    job_title: '',
    duration_minutes: 30,
    activity_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    energy_level: 3,
    productivity_rating: 3,
    notes: '',
  });

  useEffect(() => {
    if (editActivity) {
      setFormData({
        ...editActivity,
        activity_date: editActivity.activity_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        activity_type: '',
        title: '',
        description: '',
        company: '',
        job_title: '',
        duration_minutes: 30,
        activity_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        energy_level: 3,
        productivity_rating: 3,
        notes: '',
      });
    }
  }, [editActivity, open]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSliderChange = (field) => (_, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    if (!formData.activity_type) {
      alert('Please select an activity type');
      return;
    }
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      alert('Please enter a valid duration');
      return;
    }
    onSave(formData);
  };

  const selectedType = ACTIVITY_TYPES.find(t => t.value === formData.activity_type);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {editActivity ? 'Edit Activity' : 'Log New Activity'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          {/* Activity Type */}
          <FormControl fullWidth required>
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={formData.activity_type}
              onChange={handleChange('activity_type')}
              label="Activity Type"
            >
              {Object.entries(
                ACTIVITY_TYPES.reduce((acc, type) => {
                  if (!acc[type.category]) acc[type.category] = [];
                  acc[type.category].push(type);
                  return acc;
                }, {})
              ).map(([category, types]) => [
                <MenuItem key={category} disabled sx={{ fontWeight: 600, color: '#374151', opacity: 1 }}>
                  {category}
                </MenuItem>,
                ...types.map(type => (
                  <MenuItem key={type.value} value={type.value} sx={{ pl: 3 }}>
                    {type.icon} {type.label}
                  </MenuItem>
                ))
              ])}
            </Select>
          </FormControl>

          {/* Title */}
          <TextField
            label="Activity Title (Optional)"
            value={formData.title}
            onChange={handleChange('title')}
            placeholder={selectedType ? `e.g., ${selectedType.label} for Google` : 'What did you work on?'}
            fullWidth
          />

          {/* Company & Job Title Row */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Company (Optional)"
              value={formData.company}
              onChange={handleChange('company')}
              fullWidth
            />
            <TextField
              label="Job Title (Optional)"
              value={formData.job_title}
              onChange={handleChange('job_title')}
              fullWidth
            />
          </Box>

          {/* Date & Duration Row */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              value={formData.activity_date}
              onChange={handleChange('activity_date')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              value={formData.duration_minutes}
              onChange={handleChange('duration_minutes')}
              inputProps={{ min: 1 }}
              fullWidth
              required
            />
          </Box>

          {/* Time Range Row */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Time (Optional)"
              type="time"
              value={formData.start_time}
              onChange={handleChange('start_time')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Time (Optional)"
              type="time"
              value={formData.end_time}
              onChange={handleChange('end_time')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          {/* Energy Level Slider */}
          <Box>
            <Typography sx={{ fontSize: "0.875rem", color: "#374151", mb: 1 }}>
              Energy Level: {formData.energy_level} / 5
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "1.2rem" }}>😴</Typography>
              <Slider
                value={formData.energy_level}
                onChange={handleSliderChange('energy_level')}
                min={1}
                max={5}
                step={1}
                marks
                sx={{ flex: 1 }}
              />
              <Typography sx={{ fontSize: "1.2rem" }}>⚡</Typography>
            </Box>
          </Box>

          {/* Productivity Rating Slider */}
          <Box>
            <Typography sx={{ fontSize: "0.875rem", color: "#374151", mb: 1 }}>
              Productivity Rating: {formData.productivity_rating} / 5
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "1.2rem" }}>📉</Typography>
              <Slider
                value={formData.productivity_rating}
                onChange={handleSliderChange('productivity_rating')}
                min={1}
                max={5}
                step={1}
                marks
                sx={{ flex: 1 }}
              />
              <Typography sx={{ fontSize: "1.2rem" }}>🚀</Typography>
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            label="Notes (Optional)"
            value={formData.notes}
            onChange={handleChange('notes')}
            multiline
            rows={3}
            fullWidth
            placeholder="Any additional details about this activity..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {editActivity ? 'Update Activity' : 'Log Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Data Sources Info Component
function DataSourcesInfo({ dataSources }) {
  if (!dataSources) return null;
  
  const sources = [
    { label: 'Jobs', count: dataSources.jobs, icon: '💼' },
    { label: 'Status Changes', count: dataSources.applicationHistory, icon: '📊' },
    { label: 'Networking', count: dataSources.networkingActivities, icon: '🤝' },
    { label: 'Events', count: dataSources.networkingEvents, icon: '📅' },
    { label: 'Interviews', count: dataSources.interviews, icon: '💬' },
    { label: 'Manual Logs', count: dataSources.manualActivities, icon: '✍️' },
    { label: 'Mock Interviews', count: dataSources.mockInterviews, icon: '🎭' },
    { label: 'Tech Prep', count: dataSources.techPrep, icon: '💻' },
  ];

  const total = Object.values(dataSources).reduce((a, b) => a + b, 0);

  return (
    <Box sx={{ 
      background: "#f8fafc", 
      borderRadius: "8px", 
      p: 2, 
      mb: 3,
      border: "1px solid #e2e8f0"
    }}>
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", mb: 1.5 }}>
        📊 Data Sources ({total} total records)
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {sources.filter(s => s.count > 0).map((source, idx) => (
          <Chip
            key={idx}
            label={`${source.icon} ${source.label}: ${source.count}`}
            size="small"
            sx={{ 
              bgcolor: "#fff", 
              border: "1px solid #e2e8f0",
              fontSize: "0.75rem"
            }}
          />
        ))}
        {sources.every(s => s.count === 0) && (
          <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            No activity data yet. Start logging your job search activities!
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Recent Activities Table
function RecentActivitiesTable({ activities, onEdit, onDelete }) {
  if (!activities || activities.length === 0) return null;

  return (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Activity</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Energy</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => {
            const type = ACTIVITY_TYPES.find(t => t.value === activity.activity_type);
            return (
              <TableRow key={activity.id} hover>
                <TableCell sx={{ fontSize: "0.8rem" }}>
                  {new Date(activity.activity_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{type?.icon || '📌'}</span>
                    <Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {activity.title || type?.label || activity.activity_type}
                      </Typography>
                      {activity.company && (
                        <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          {activity.company}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: "0.85rem" }}>
                  {activity.duration_minutes} min
                </TableCell>
                <TableCell>
                  {activity.energy_level && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {[...Array(activity.energy_level)].map((_, i) => (
                        <span key={i} style={{ fontSize: "0.7rem" }}>⚡</span>
                      ))}
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(activity)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(activity.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ===== MAIN COMPONENT =====
const TimeInvestmentAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/time-investment");
      console.log("📊 Time Investment Data Received:", res.data);
      console.log("📊 Summary:", res.data?.summary);
      console.log("📊 Activity Distribution:", res.data?.activityDistribution);
      console.log("📊 Data Sources:", res.data?.dataSources);
      setData(res.data);
      setError("");
    } catch (err) {
      console.error("❌ Time Investment Error:", err);
      setError("Failed to load time investment analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveActivity = async (formData) => {
    try {
      if (editActivity) {
        await api.put(`/api/time-investment/activities/${editActivity.id}`, formData);
        setSnackbar({ open: true, message: "Activity updated successfully!", severity: "success" });
      } else {
        await api.post("/api/time-investment/activities", formData);
        setSnackbar({ open: true, message: "Activity logged successfully!", severity: "success" });
      }
      setDialogOpen(false);
      setEditActivity(null);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to save activity", severity: "error" });
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    
    try {
      await api.delete(`/api/time-investment/activities/${id}`);
      setSnackbar({ open: true, message: "Activity deleted", severity: "success" });
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to delete activity", severity: "error" });
    }
  };

  const handleEditActivity = (activity) => {
    setEditActivity(activity);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress sx={{ color: "#3b82f6" }} size={42} />
        <Typography sx={{ color: "#6b7280", mt: 2 }}>Analyzing your productivity patterns...</Typography>
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
        No activity data available. Start applying to jobs to see your time investment analysis!
      </Alert>
    );
  }

  const {
    summary = {},
    activityPieData = [],
    productivityPatterns = {},
    energyLevels = {},
    taskCompletion = {},
    burnoutAnalysis = {},
    recommendations = [],
    recentActivities = [],
    dataSources = {},
  } = data;

  // Prepare heatmap data
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const heatmapData = productivityPatterns.heatmapData || [];
  const maxHeatmapValue = Math.max(...heatmapData.map(h => h.value), 1);

  return (
    <Box>
      {/* Data Sources Info */}
      <DataSourcesInfo dataSources={dataSources} />

      {/* Log Activity Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          size="small"
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditActivity(null);
            setDialogOpen(true);
          }}
          sx={{ bgcolor: "#3b82f6" }}
        >
          Log Activity
        </Button>
      </Box>

      {/* KPI Overview */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={2} mb={3}>
        <KPICard
          title="Total Time Invested"
          value={summary.totalTimeFormatted || "0h"}
          subtitle={`${summary.totalActivities || 0} activities`}
          color="#3b82f6"
          icon="⏱️"
        />
        <KPICard
          title="Active Days"
          value={summary.activeDays || 0}
          subtitle={`Avg ${summary.avgDailyFormatted || "0m"}/day`}
          color="#10b981"
          icon="📅"
        />
        <KPICard
          title="Current Streak"
          value={`${burnoutAnalysis.streakData?.currentStreak || 0} days`}
          subtitle={`Best: ${burnoutAnalysis.streakData?.longestStreak || 0} days`}
          color="#8b5cf6"
          icon="🔥"
        />
        <KPICard
          title="Task Completion"
          value={`${taskCompletion.totalCompleted || 0}`}
          subtitle={`${taskCompletion.totalPending || 0} pending`}
          color="#f59e0b"
          icon="✅"
        />
      </Box>

      {/* Productivity Score & Burnout */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Productivity Score" icon="📊" iconColor="#3b82f6">
          <ProductivityGauge score={summary.productivityScore || 50} />
          <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 2 }}>
            <Chip label={`Peak: ${productivityPatterns.peakDay || "N/A"}`} size="small" sx={{ bgcolor: "#eff6ff", color: "#1d4ed8" }} />
            <Chip label={`Best time: ${productivityPatterns.peakHour || "N/A"}`} size="small" sx={{ bgcolor: "#f0fdf4", color: "#166534" }} />
          </Box>
        </ChartCard>

        <ChartCard title="Work-Life Balance" icon="⚖️" iconColor="#10b981">
          <BurnoutIndicator
            risk={burnoutAnalysis.burnoutRisk || "low"}
            score={burnoutAnalysis.burnoutScore || 0}
          />
          <Box sx={{ mt: 1 }}>
            {burnoutAnalysis.indicators?.slice(0, 2).map((ind, idx) => (
              <Typography key={idx} sx={{
                fontSize: "0.8rem",
                color: ind.type === "warning" ? "#dc2626" : "#2563eb",
                textAlign: "center",
                mb: 0.5,
              }}>
                {ind.type === "warning" ? "⚠️" : "ℹ️"} {ind.message}
              </Typography>
            ))}
          </Box>
        </ChartCard>

        <ChartCard title="Energy Levels" icon="⚡" iconColor="#f59e0b">
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>
              {energyLevels.chronotype || "Day Worker"}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Peak: {energyLevels.peakTime || "N/A"}
            </Typography>
          </Box>
          {energyLevels.byPeriod?.map((period, idx) => (
            <Box key={idx} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography sx={{ fontSize: "0.8rem", color: "#374151" }}>{period.period}</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>{period.percentage}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={period.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: COLORS[idx % COLORS.length],
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          ))}
        </ChartCard>
      </Box>

      {/* Activity Distribution & Task Funnel */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Time by Activity Type" icon="🎯" iconColor="#8b5cf6">
          {activityPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={activityPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {activityPieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, name) => [`${Math.round(value)} min`, name]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              <Typography>No activity data yet</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
                onClick={() => setDialogOpen(true)}
              >
                Log Your First Activity
              </Button>
            </Box>
          )}
        </ChartCard>

        <ChartCard title="Application Pipeline" icon="📈" iconColor="#06b6d4">
          {taskCompletion.funnelData?.length > 0 ? (
            <Box>
              {taskCompletion.funnelData.map((stage, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>
                      {stage.stage}
                    </Typography>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: stage.color }}>
                      {stage.count}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (stage.count / Math.max(...taskCompletion.funnelData.map(f => f.count), 1)) * 100)}
                    sx={{
                      height: 24,
                      borderRadius: 6,
                      bgcolor: "#f3f4f6",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: stage.color,
                        borderRadius: 6,
                      },
                    }}
                  />
                </Box>
              ))}
              <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap" }}>
                <Chip
                  label={`Interview Rate: ${taskCompletion.conversionRates?.interviewRate || 0}%`}
                  size="small"
                  sx={{ bgcolor: "#eff6ff", color: "#1d4ed8" }}
                />
                <Chip
                  label={`Offer Rate: ${taskCompletion.conversionRates?.offerRate || 0}%`}
                  size="small"
                  sx={{ bgcolor: "#f0fdf4", color: "#166534" }}
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
              No pipeline data yet
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* Activity Patterns */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <ChartCard title="Daily Activity Pattern" icon="📅" iconColor="#3b82f6">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productivityPatterns.dailyActivity || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dayShort" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <RechartsTooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="activities" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly Trend" icon="📊" iconColor="#10b981">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={productivityPatterns.weeklyTrend || []}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <RechartsTooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Area
                type="monotone"
                dataKey="activities"
                stroke="#10b981"
                fill="url(#colorTrend)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* Activity Heatmap */}
      <ChartCard title="Activity Heatmap (by Day & Hour)" icon="🗓️" iconColor="#8b5cf6">
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 700 }}>
            {/* Hour labels */}
            <Box sx={{ display: "flex", ml: "50px", mb: 1 }}>
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                <Typography key={h} sx={{ width: 72, fontSize: "0.7rem", color: "#6b7280", textAlign: "center" }}>
                  {h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
                </Typography>
              ))}
            </Box>
            {/* Heatmap grid */}
            {days.map((day, dayIdx) => (
              <Box key={day} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Typography sx={{ width: 50, fontSize: "0.75rem", color: "#6b7280" }}>{day}</Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {hours.map(hour => {
                    const cell = heatmapData.find(h => h.dayIndex === dayIdx && h.hour === hour);
                    return (
                      <HeatmapCell
                        key={hour}
                        value={cell?.value || 0}
                        maxValue={maxHeatmapValue}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
            {/* Legend */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, ml: "50px" }}>
              <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>Less</Typography>
              {["#f3f4f6", "#dbeafe", "#93c5fd", "#3b82f6", "#1e40af"].map((color, i) => (
                <Box key={i} sx={{ width: 16, height: 16, borderRadius: 2, bgcolor: color }} />
              ))}
              <Typography sx={{ fontSize: "0.7rem", color: "#6b7280" }}>More</Typography>
            </Box>
          </Box>
        </Box>
      </ChartCard>

      {/* Recent Logged Activities */}
      <ChartCard 
        title="Recent Logged Activities" 
        icon="✍️" 
        iconColor="#ec4899"
        action={
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add
          </Button>
        }
      >
        {recentActivities.length > 0 ? (
          <RecentActivitiesTable
            activities={recentActivities}
            onEdit={handleEditActivity}
            onDelete={handleDeleteActivity}
          />
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            <Typography sx={{ mb: 2 }}>No manually logged activities yet</Typography>
            <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
              Log your job search activities to track time spent on applications, interviews, research, and more!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{ bgcolor: "#ec4899" }}
            >
              Log Your First Activity
            </Button>
          </Box>
        )}
      </ChartCard>

      {/* Productivity Recommendations */}
      <ChartCard title="Productivity Coaching" icon="💡" iconColor="#22c55e">
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            <Typography>Add more activity data to get personalized recommendations!</Typography>
          </Box>
        )}
      </ChartCard>

      {/* Streak & Gap Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} gap={2}>
        <Box sx={styles.kpiCard}>
          <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", mb: 1 }}>
            Avg Gap Between Activities
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
            {burnoutAnalysis.gapAnalysis?.avgGapDays || 0} days
          </Typography>
        </Box>
        <Box sx={styles.kpiCard}>
          <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", mb: 1 }}>
            Longest Break
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>
            {burnoutAnalysis.gapAnalysis?.longestGap || 0} days
          </Typography>
        </Box>
        <Box sx={styles.kpiCard}>
          <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", mb: 1 }}>
            Weekend Activity
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6" }}>
            {burnoutAnalysis.weekendRatio || 0}%
          </Typography>
        </Box>
        <Box sx={styles.kpiCard}>
          <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", mb: 1 }}>
            Days Since Last Activity
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: burnoutAnalysis.daysSinceLastActivity > 7 ? "#ef4444" : "#10b981" }}>
            {burnoutAnalysis.daysSinceLastActivity || 0}
          </Typography>
        </Box>
      </Box>

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditActivity(null);
        }}
        onSave={handleSaveActivity}
        editActivity={editActivity}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default TimeInvestmentAnalysis;
