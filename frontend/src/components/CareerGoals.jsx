import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  FaPlus as AddIcon,
  FaEdit as EditIcon,
  FaTrash as DeleteIcon,
  FaCheckCircle as CheckCircleIcon,
  FaChartLine as TrendingUpIcon,
  FaTrophy as EmojiEventsIcon,
} from "react-icons/fa";
import {
  getCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  getGoalAnalytics,
} from "../api";
import '../pages/StatisticsLayout.css';

// Tab Panel Component
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CareerGoals() {
  const [goals, setGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    specific: "",
    measurable: "",
    achievable: true,
    relevant: "",
    time_bound: "",
    target_value: "",
    current_value: "0",
    priority: "medium",
    target_date: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsResponse, analyticsResponse] = await Promise.all([
        getCareerGoals(),
        getGoalAnalytics(),
      ]);
      setGoals(goalsResponse.data.goals || []);
      setAnalytics(analyticsResponse.data || null);
      setError(null);
    } catch (err) {
      console.error("Error loading career goals:", err);
      setError("Failed to load career goals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      if (!formData.title || !formData.specific || !formData.measurable || !formData.target_date) {
        alert("Please fill in all required fields (Title, Specific, Measurable, Target Date)");
        return;
      }

      await createCareerGoal(formData);
      await loadData();
      setShowGoalForm(false);
      resetForm();
      alert("Goal created successfully!");
    } catch (err) {
      console.error("Error creating goal:", err);
      alert(`Failed to create goal: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleUpdateGoal = async (id) => {
    try {
      await updateCareerGoal(id, {
        ...formData,
        progress_notes: "Updated via form",
      });
      await loadData();
      setShowGoalForm(false);
      setEditingGoal(null);
      resetForm();
      alert("Goal updated successfully!");
    } catch (err) {
      console.error("Error updating goal:", err);
      alert(`Failed to update goal: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteCareerGoal(id);
      await loadData();
      alert("Goal deleted successfully!");
    } catch (err) {
      console.error("Error deleting goal:", err);
      alert(`Failed to delete goal: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleUpdateProgress = async (goal, newValue) => {
    try {
      await updateCareerGoal(goal.id, {
        current_value: newValue,
        progress_notes: `Progress updated to ${newValue}`,
      });
      await loadData();
    } catch (err) {
      console.error("Error updating progress:", err);
      alert(`Failed to update progress: ${err.response?.data?.error || err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      specific: "",
      measurable: "",
      achievable: true,
      relevant: "",
      time_bound: "",
      target_value: "",
      current_value: "0",
      priority: "medium",
      target_date: "",
      notes: "",
    });
    setEditingGoal(null);
  };

  const openEditForm = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title || "",
      description: goal.description || "",
      category: goal.category || "other",
      specific: goal.specific || "",
      measurable: goal.measurable || "",
      achievable: goal.achievable !== undefined ? goal.achievable : true,
      relevant: goal.relevant || "",
      time_bound: goal.time_bound || "",
      target_value: goal.target_value || "",
      current_value: goal.current_value || "0",
      priority: goal.priority || "medium",
      target_date: goal.target_date || "",
      notes: goal.notes || "",
    });
    setShowGoalForm(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "active":
        return "primary";
      case "paused":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const formatCategoryName = (category) => {
    if (!category) return "Other";
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isOverdue = (goal) => {
    return (
      goal.status === "active" &&
      new Date(goal.target_date) < new Date() &&
      Number(goal.progress_percent) < 100
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <Box>
      {/* Header */}
      <Box className="statistics-header">
        <Typography className="statistics-main-title">Career Goals</Typography>
        <Typography className="statistics-main-subtitle">
          Set SMART goals and track your progress toward career objectives
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              resetForm();
              setShowGoalForm(true);
            }}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              '&:hover': {
                background: 'rgba(59, 130, 246, 0.3)',
                borderColor: 'rgba(59, 130, 246, 0.6)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
              },
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
            }}
          >
            <AddIcon style={{ fontSize: '18px' }} />
            New Goal
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box className="statistics-card">
            <Box className="statistics-card-content">
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px', fontWeight: 600 }}>
                Total Goals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#3b82f6" }}>
                {goals.length}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box className="statistics-card">
            <Box className="statistics-card-content">
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px', fontWeight: 600 }}>
                Active Goals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#10b981" }}>
                {activeGoals.length}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box className="statistics-card">
            <Box className="statistics-card-content">
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px', fontWeight: 600 }}>
                Completed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#06b6d4" }}>
                {completedGoals.length}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box className="statistics-card">
            <Box className="statistics-card-content">
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px', fontWeight: 600 }}>
                Completion Rate
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#f59e0b" }}>
                {goals.length > 0
                  ? ((completedGoals.length / goals.length) * 100).toFixed(1)
                  : 0}
                %
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Inner Tabs */}
      <Box className="inner-nav-container" sx={{ mb: 3 }}>
        <button
          className={`inner-nav-tab career ${tabValue === 0 ? 'active' : ''}`}
          onClick={() => setTabValue(0)}
        >
          Active Goals
        </button>
        <button
          className={`inner-nav-tab career ${tabValue === 1 ? 'active' : ''}`}
          onClick={() => setTabValue(1)}
        >
          All Goals
        </button>
        <button
          className={`inner-nav-tab career ${tabValue === 2 ? 'active' : ''}`}
          onClick={() => setTabValue(2)}
        >
          Achievements
        </button>
        <button
          className={`inner-nav-tab career ${tabValue === 3 ? 'active' : ''}`}
          onClick={() => setTabValue(3)}
        >
          Insights & Recommendations
        </button>
      </Box>

        {/* Tab 1: Active Goals */}
        <TabPanel value={tabValue} index={0}>
          {activeGoals.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2" sx={{ color: '#000000' }}>
                No active goals. Create a new goal to get started!
              </Typography>
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {activeGoals.map((goal) => (
                <Grid item xs={12} md={6} key={goal.id}>
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                      borderRadius: '16px',
                      border: `2px solid ${isOverdue(goal) ? "#ef4444" : "rgba(255, 255, 255, 0.2)"}`,
                      boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(139, 92, 246, 0.4)',
                      }
                    }}
                  >
                    <Box sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2.5}>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700, 
                              mb: 1.5,
                              color: '#ffffff',
                              fontSize: '1.25rem',
                              letterSpacing: '0.3px'
                            }}
                          >
                            {goal.title}
                          </Typography>
                          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                            <Chip
                              label={formatCategoryName(goal.category)}
                              size="small"
                              sx={{ 
                                textTransform: 'capitalize',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                fontWeight: 600,
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                }
                              }}
                            />
                            <Chip
                              label={goal.priority?.charAt(0).toUpperCase() + goal.priority?.slice(1) || 'Medium'}
                              size="small"
                              sx={{
                                backgroundColor: 
                                  goal.priority === 'critical' ? 'rgba(239, 68, 68, 0.3)' :
                                  goal.priority === 'high' ? 'rgba(245, 158, 11, 0.3)' :
                                  goal.priority === 'low' ? 'rgba(156, 163, 175, 0.3)' :
                                  'rgba(59, 130, 246, 0.3)',
                                color: '#ffffff',
                                fontWeight: 600,
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                              }}
                            />
                            {isOverdue(goal) && (
                              <Chip 
                                label="Overdue" 
                                size="small" 
                                sx={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                  border: '1px solid rgba(239, 68, 68, 0.6)',
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => openEditForm(goal)}
                            sx={{ 
                              mr: 0.5,
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <EditIcon style={{ fontSize: '16px' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteGoal(goal.id)}
                            sx={{
                              backgroundColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#ffffff',
                              '&:hover': {
                                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <DeleteIcon style={{ fontSize: '16px' }} />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Progress */}
                      <Box sx={{ mb: 2.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 600, fontSize: '0.875rem' }}>
                            Progress
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#ffffff", fontSize: '1rem' }}>
                            {Number(goal.progress_percent || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(Number(goal.progress_percent || 0), 100)}
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 6,
                              background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                            }
                          }}
                        />
                        {goal.target_value && (
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 500, fontSize: '0.8rem' }}>
                              {Number(goal.current_value || 0).toLocaleString()} / {Number(goal.target_value).toLocaleString()}
                            </Typography>
                            {goal.target_value && (
                              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 500, fontSize: '0.75rem' }}>
                                {goal.category === 'salary' ? '$' : ''}
                                {goal.category === 'applications' ? 'applications' : ''}
                                {goal.category === 'interviews' ? 'interviews' : ''}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* SMART Details */}
                      <Box sx={{ 
                        mb: 2.5, 
                        p: 2, 
                        bgcolor: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}>
                        <Typography variant="body2" sx={{ color: "#1f2937", display: "block", mb: 1, lineHeight: 1.7, fontSize: '0.875rem' }}>
                          <strong style={{ color: '#6d28d9', fontWeight: 700 }}>Specific:</strong> {goal.specific || 'Not specified'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2937", display: "block", mb: 1, lineHeight: 1.7, fontSize: '0.875rem' }}>
                          <strong style={{ color: '#6d28d9', fontWeight: 700 }}>Measurable:</strong> {goal.measurable || 'Not specified'}
                        </Typography>
                        {goal.relevant && (
                          <Typography variant="body2" sx={{ color: "#1f2937", display: "block", lineHeight: 1.7, fontSize: '0.875rem' }}>
                            <strong style={{ color: '#6d28d9', fontWeight: 700 }}>Relevant:</strong> {goal.relevant}
                          </Typography>
                        )}
                      </Box>

                      {/* Target Date */}
                      <Box display="flex" alignItems="center" gap={1} mb={goal.target_value ? 0 : 2.5}>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 600, fontSize: '0.875rem' }}>
                          Target Date:
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#ffffff", fontWeight: 700, fontSize: '0.9rem' }}>
                          {goal.target_date ? new Date(goal.target_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : 'Not set'}
                        </Typography>
                      </Box>

                      {/* Quick Progress Update */}
                      {goal.target_value && (
                        <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                          <TextField
                            type="number"
                            placeholder={`Enter progress (0 - ${Number(goal.target_value).toLocaleString()})`}
                            size="small"
                            value={goal.current_value || 0}
                            onChange={(e) =>
                              handleUpdateProgress(goal, Number(e.target.value))
                            }
                            inputProps={{ min: 0, max: goal.target_value }}
                            sx={{ 
                              width: "100%",
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#ffffff',
                                  borderWidth: '2px',
                                },
                                '& input': {
                                  color: '#1f2937',
                                  fontWeight: 600,
                                },
                              },
                            }}
                            helperText={`Current: ${Number(goal.current_value || 0).toLocaleString()} / Target: ${Number(goal.target_value).toLocaleString()}`}
                            FormHelperTextProps={{
                              sx: {
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                mt: 1,
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Tab 2: All Goals */}
        <TabPanel value={tabValue} index={1}>
          {goals.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2" sx={{ color: '#000000' }}>
                No goals yet. Create your first career goal to get started!
              </Typography>
            </Alert>
          ) : (
            <Box>
              {goals.map((goal) => (
                <Box 
                  key={goal.id} 
                  sx={{ 
                    mb: 2.5,
                    background: goal.status === 'completed' 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                      : goal.status === 'paused'
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                      : goal.status === 'cancelled'
                      ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)'
                      : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                    borderRadius: '16px',
                    border: `2px solid ${isOverdue(goal) ? "#ef4444" : "rgba(255, 255, 255, 0.2)"}`,
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(139, 92, 246, 0.4)',
                    }
                  }}
                >
                  <Box sx={{ p: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box sx={{ flex: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '1.1rem' }}>
                            {goal.title}
                          </Typography>
                          <Chip
                            label={goal.status?.charAt(0).toUpperCase() + goal.status?.slice(1) || 'Active'}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.25)',
                              color: '#ffffff',
                              fontWeight: 600,
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                            }}
                          />
                          <Chip
                            label={goal.priority?.charAt(0).toUpperCase() + goal.priority?.slice(1) || 'Medium'}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              fontWeight: 600,
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                            }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(Number(goal.progress_percent || 0), 100)}
                          sx={{ 
                            mb: 1.5, 
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 1, fontSize: '0.9rem' }}>
                          {goal.description || goal.specific}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)", display: "block", fontSize: '0.8rem', fontWeight: 500 }}>
                          Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'Not set'} • Progress:{" "}
                          {Number(goal.progress_percent || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => openEditForm(goal)}
                          sx={{ 
                            mr: 0.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.3)',
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <EditIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteGoal(goal.id)}
                          sx={{
                            backgroundColor: 'rgba(239, 68, 68, 0.3)',
                            color: '#ffffff',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.5)',
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <DeleteIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* Tab 3: Achievements */}
        <TabPanel value={tabValue} index={2}>
          {analytics?.recentAchievements?.length > 0 ? (
            <Grid container spacing={2}>
              {analytics.recentAchievements.map((achievement, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Box
                    className="statistics-card"
                    sx={{
                      background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                      color: "white",
                    }}
                  >
                    <Box className="statistics-card-content">
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <EmojiEventsIcon style={{ fontSize: '24px' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {achievement.achievement_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {achievement.description}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {new Date(achievement.achievement_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              <Typography variant="body2" sx={{ color: '#000000' }}>
                No achievements yet. Complete goals and reach milestones to earn achievements!
              </Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Tab 4: Insights & Recommendations */}
        <TabPanel value={tabValue} index={3}>
          {analytics ? (
            <Box>
              {/* Insights */}
              {analytics.insights?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
                    Insights
                  </Typography>
                  {analytics.insights.map((insight, idx) => (
                    <Alert
                      key={idx}
                      severity={insight.type}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: '#000000' }}>
                        {insight.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>{insight.message}</Typography>
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Recommendations */}
              {analytics.recommendations?.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
                    Recommendations
                  </Typography>
                  {analytics.recommendations.map((rec, idx) => (
                    <Box key={idx} className="statistics-card" sx={{ mb: 2 }}>
                      <Box className="statistics-card-content">
                        <Box display="flex" alignItems="start" gap={2}>
                          <TrendingUpIcon 
                            style={{ 
                              fontSize: '24px',
                              color: rec.type === 'success' ? '#10b981' : 
                                     rec.type === 'warning' ? '#f59e0b' : 
                                     rec.type === 'error' ? '#ef4444' : '#3b82f6'
                            }} 
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, color: '#000000' }}>
                              {rec.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#000000", mb: 1 }}>
                              {rec.message}
                            </Typography>
                            {rec.action && (
                              <Chip label={rec.action} size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {(!analytics.insights?.length && !analytics.recommendations?.length) && (
                <Alert severity="info">
                  <Typography variant="body2" sx={{ color: '#000000' }}>
                    Continue tracking your goals to receive personalized insights and recommendations.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              <Typography variant="body2" sx={{ color: '#000000' }}>Loading insights...</Typography>
            </Alert>
          )}
        </TabPanel>

      {/* Goal Form Dialog */}
      <Dialog
        open={showGoalForm}
        onClose={() => {
          setShowGoalForm(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: '1.5rem',
        }}>
          {editingGoal ? "Edit Career Goal" : "Create New Career Goal (SMART)"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Goal Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  variant="outlined"
                  size="medium"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  variant="outlined"
                >
                  <MenuItem value="salary">Salary</MenuItem>
                  <MenuItem value="role_level">Role Level</MenuItem>
                  <MenuItem value="skills">Skills</MenuItem>
                  <MenuItem value="networking">Networking</MenuItem>
                  <MenuItem value="applications">Applications</MenuItem>
                  <MenuItem value="interviews">Interviews</MenuItem>
                  <MenuItem value="offers">Offers</MenuItem>
                  <MenuItem value="certifications">Certifications</MenuItem>
                  <MenuItem value="education">Education</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  variant="outlined"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specific *"
                  value={formData.specific}
                  onChange={(e) => setFormData({ ...formData, specific: e.target.value })}
                  placeholder="What exactly do you want to achieve?"
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Measurable *"
                  value={formData.measurable}
                  onChange={(e) => setFormData({ ...formData, measurable: e.target.value })}
                  placeholder="How will you measure success?"
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Relevant"
                  value={formData.relevant}
                  onChange={(e) => setFormData({ ...formData, relevant: e.target.value })}
                  placeholder="Why is this goal important?"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Date *"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Time Bound"
                  type="date"
                  value={formData.time_bound}
                  onChange={(e) => setFormData({ ...formData, time_bound: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Value"
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="e.g., 150000 for salary, 50 for applications"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Value"
                  type="number"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={3}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2.5,
          borderTop: '1px solid #e5e7eb',
          gap: 2,
        }}>
          <Button 
            onClick={() => {
              setShowGoalForm(false);
              resetForm();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingGoal ? () => handleUpdateGoal(editingGoal.id) : handleCreateGoal}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              },
            }}
          >
            {editingGoal ? "Update Goal" : "Create Goal"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

