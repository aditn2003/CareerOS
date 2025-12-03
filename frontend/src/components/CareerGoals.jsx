import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Tabs,
  Tab,
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Career Goals
        </Typography>
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
            backgroundColor: '#3b82f6',
            '&:hover': {
              backgroundColor: '#2563eb',
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                Total Goals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#3b82f6" }}>
                {goals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                Active Goals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#10b981" }}>
                {activeGoals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                Completed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#06b6d4" }}>
                {completedGoals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                Completion Rate
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#f59e0b" }}>
                {goals.length > 0
                  ? ((completedGoals.length / goals.length) * 100).toFixed(1)
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Active Goals" />
          <Tab label="All Goals" />
          <Tab label="Achievements" />
          <Tab label="Insights & Recommendations" />
        </Tabs>

        {/* Tab 1: Active Goals */}
        <TabPanel value={tabValue} index={0}>
          {activeGoals.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                No active goals. Create a new goal to get started!
              </Typography>
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {activeGoals.map((goal) => (
                <Grid item xs={12} md={6} key={goal.id}>
                  <Card
                    sx={{
                      borderLeft: `4px solid ${
                        isOverdue(goal) ? "#ef4444" : "#3b82f6"
                      }`,
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      transition: 'box-shadow 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {goal.title}
                          </Typography>
                          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                            <Chip
                              label={formatCategoryName(goal.category)}
                              size="small"
                              color="default"
                              sx={{ textTransform: 'capitalize' }}
                            />
                            <Chip
                              label={goal.priority?.charAt(0).toUpperCase() + goal.priority?.slice(1) || 'Medium'}
                              size="small"
                              color={getPriorityColor(goal.priority)}
                            />
                            {isOverdue(goal) && (
                              <Chip label="Overdue" size="small" color="error" />
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => openEditForm(goal)}
                            sx={{ mr: 0.5 }}
                          >
                            <EditIcon style={{ fontSize: '16px' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteGoal(goal.id)}
                            color="error"
                          >
                            <DeleteIcon style={{ fontSize: '16px' }} />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Progress */}
                      <Box sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
                            Progress
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#3b82f6" }}>
                            {Number(goal.progress_percent || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(Number(goal.progress_percent || 0), 100)}
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5
                            }
                          }}
                          color={
                            Number(goal.progress_percent || 0) >= 75
                              ? "success"
                              : Number(goal.progress_percent || 0) >= 50
                              ? "info"
                              : "primary"
                          }
                        />
                        {goal.target_value && (
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                              {Number(goal.current_value || 0).toLocaleString()} / {Number(goal.target_value).toLocaleString()}
                            </Typography>
                            {goal.target_value && (
                              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500 }}>
                                {goal.category === 'salary' ? '$' : ''}
                                {goal.category === 'applications' ? 'applications' : ''}
                                {goal.category === 'interviews' ? 'interviews' : ''}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* SMART Details */}
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: "#374151", display: "block", mb: 0.5, lineHeight: 1.6 }}>
                          <strong style={{ color: '#1f2937' }}>Specific:</strong> {goal.specific || 'Not specified'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#374151", display: "block", mb: 0.5, lineHeight: 1.6 }}>
                          <strong style={{ color: '#1f2937' }}>Measurable:</strong> {goal.measurable || 'Not specified'}
                        </Typography>
                        {goal.relevant && (
                          <Typography variant="caption" sx={{ color: "#374151", display: "block", lineHeight: 1.6 }}>
                            <strong style={{ color: '#1f2937' }}>Relevant:</strong> {goal.relevant}
                          </Typography>
                        )}
                      </Box>

                      {/* Target Date */}
                      <Box display="flex" alignItems="center" gap={1} mb={goal.target_value ? 0 : 2}>
                        <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500 }}>
                          Target Date:
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#1f2937", fontWeight: 600 }}>
                          {goal.target_date ? new Date(goal.target_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : 'Not set'}
                        </Typography>
                      </Box>

                      {/* Quick Progress Update */}
                      {goal.target_value && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
                          <TextField
                            type="number"
                            label={`Update Progress (0 - ${Number(goal.target_value).toLocaleString()})`}
                            size="small"
                            value={goal.current_value || 0}
                            onChange={(e) =>
                              handleUpdateProgress(goal, Number(e.target.value))
                            }
                            inputProps={{ min: 0, max: goal.target_value }}
                            sx={{ width: "100%" }}
                            helperText={`Current: ${Number(goal.current_value || 0).toLocaleString()} / Target: ${Number(goal.target_value).toLocaleString()}`}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Tab 2: All Goals */}
        <TabPanel value={tabValue} index={1}>
          {goals.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                No goals yet. Create your first career goal to get started!
              </Typography>
            </Alert>
          ) : (
            <Box>
              {goals.map((goal) => (
                <Card key={goal.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box sx={{ flex: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {goal.title}
                          </Typography>
                          <Chip
                            label={goal.status}
                            size="small"
                            color={getStatusColor(goal.status)}
                          />
                          <Chip
                            label={goal.priority}
                            size="small"
                            color={getPriorityColor(goal.priority)}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(Number(goal.progress_percent || 0), 100)}
                          sx={{ mb: 1, height: 6 }}
                        />
                        <Typography variant="body2" sx={{ color: "#6b7280" }}>
                          {goal.description || goal.specific}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9ca3af", display: "block" }}>
                          Target: {new Date(goal.target_date).toLocaleDateString()} • Progress:{" "}
                          {Number(goal.progress_percent || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => openEditForm(goal)}
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteGoal(goal.id)}
                          color="error"
                        >
                          <DeleteIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
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
                  <Card
                    sx={{
                      background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                      color: "white",
                    }}
                  >
                    <CardContent>
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
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
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
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Insights
                  </Typography>
                  {analytics.insights.map((insight, idx) => (
                    <Alert
                      key={idx}
                      severity={insight.type}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {insight.title}
                      </Typography>
                      <Typography variant="body2">{insight.message}</Typography>
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Recommendations */}
              {analytics.recommendations?.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Recommendations
                  </Typography>
                  {analytics.recommendations.map((rec, idx) => (
                    <Card key={idx} sx={{ mb: 2 }}>
                      <CardContent>
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
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {rec.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                              {rec.message}
                            </Typography>
                            {rec.action && (
                              <Chip label={rec.action} size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {(!analytics.insights?.length && !analytics.recommendations?.length) && (
                <Alert severity="info">
                  <Typography variant="body2">
                    Continue tracking your goals to receive personalized insights and recommendations.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">Loading insights...</Typography>
            </Alert>
          )}
        </TabPanel>
      </Card>

      {/* Goal Form Dialog */}
      <Dialog
        open={showGoalForm}
        onClose={() => {
          setShowGoalForm(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingGoal ? "Edit Career Goal" : "Create New Career Goal (SMART)"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Goal Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  SMART Criteria
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specific *"
                  value={formData.specific}
                  onChange={(e) => setFormData({ ...formData, specific: e.target.value })}
                  placeholder="What exactly do you want to achieve?"
                  required
                  multiline
                  rows={2}
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
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Relevant"
                  value={formData.relevant}
                  onChange={(e) => setFormData({ ...formData, relevant: e.target.value })}
                  placeholder="Why is this goal important?"
                  multiline
                  rows={2}
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Value"
                  type="number"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
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
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowGoalForm(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingGoal ? () => handleUpdateGoal(editingGoal.id) : handleCreateGoal}
          >
            {editingGoal ? "Update Goal" : "Create Goal"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

