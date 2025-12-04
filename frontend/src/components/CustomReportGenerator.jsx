// frontend/src/components/CustomReportGenerator.jsx
// UC-106: Custom Report Generation

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { api } from "../api";

// ===== STYLES =====
const styles = {
  card: {
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
    marginBottom: "16px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};

// Available metrics
const AVAILABLE_METRICS = [
  { id: 'totalApplications', label: 'Total Applications', category: 'Overview' },
  { id: 'successRate', label: 'Success Rate', category: 'Performance' },
  { id: 'interviewRate', label: 'Interview Rate', category: 'Performance' },
  { id: 'offerRate', label: 'Offer Rate', category: 'Performance' },
  { id: 'industryBreakdown', label: 'Industry Breakdown', category: 'Analysis' },
  { id: 'industrySuccessRates', label: 'Industry Success Rates', category: 'Analysis' },
  { id: 'conversionFunnel', label: 'Conversion Funnel', category: 'Performance' },
  { id: 'timeline', label: 'Timeline Trends', category: 'Trends' },
  { id: 'peakTiming', label: 'Peak Timing', category: 'Timing' },
  { id: 'responseTimes', label: 'Response Times', category: 'Timing' },
  { id: 'customizationImpact', label: 'Customization Impact', category: 'Strategy' },
];

// ===== MAIN COMPONENT =====
const CustomReportGenerator = () => {
  const [templates, setTemplates] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    industries: [],
    roles: [],
    dateRange: { min: null, max: null },
    statuses: [],
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    companies: [],
    industries: [],
    roles: [],
    statuses: [],
  });
  const [format, setFormat] = useState('json');
  const [includeInsights, setIncludeInsights] = useState(true);
  const [showVisualizations, setShowVisualizations] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  useEffect(() => {
    const load = async () => {
      try {
        const [templatesRes, filterOptionsRes] = await Promise.all([
          api.get("/api/custom-reports/templates"),
          api.get("/api/custom-reports/filter-options"),
        ]);
        setTemplates(templatesRes.data.templates || []);
        setFilterOptions(filterOptionsRes.data || filterOptions);
      } catch (err) {
        console.error(err);
        setError("Failed to load report options.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // For comprehensive template, select all metrics
      if (templateId === 'comprehensive') {
        setSelectedMetrics(AVAILABLE_METRICS.map(m => m.id));
      } else {
        setSelectedMetrics(template.metrics || []);
      }
      setCustomTitle(template.name || '');
    }
  };

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleGenerate = async () => {
    if (selectedMetrics.length === 0) {
      setError("Please select at least one metric.");
      return;
    }

    setGenerating(true);
    setError("");
    setReportData(null);

    try {
      // Check if comprehensive template is selected
      const isComprehensive = selectedTemplate === 'comprehensive';
      
      const requestBody = {
        title: customTitle || undefined,
        template: selectedTemplate || undefined,
        metrics: selectedMetrics,
        filters: {
          dateRange: filters.dateRange.start || filters.dateRange.end
            ? {
                start: filters.dateRange.start || null,
                end: filters.dateRange.end || null,
              }
            : undefined,
          companies: filters.companies.length > 0 ? filters.companies : undefined,
          industries: filters.industries.length > 0 ? filters.industries : undefined,
          roles: filters.roles.length > 0 ? filters.roles : undefined,
          statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        },
        format,
        includeInsights,
        comprehensive: isComprehensive, // Send comprehensive flag
      };

      if (format === 'pdf' || format === 'csv' || format === 'excel') {
        // For file downloads, use blob response
        const token = localStorage.getItem('token');
        const baseURL = api.defaults.baseURL || 'http://localhost:4000';
        const response = await fetch(`${baseURL}/api/custom-reports/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-search-report-${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setError("");
        alert('Report downloaded successfully!');
      } else {
        // JSON format - show preview
        const res = await api.post("/api/custom-reports/generate", requestBody);
        setReportData(res.data.report);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!reportData) return;
    
    // Create a shareable summary
    const shareText = `Job Search Report: ${reportData.title}\n\n` +
      `Total Applications: ${reportData.summary.totalApplications}\n` +
      `Success Rate: ${reportData.summary.successRate}%\n` +
      `Offer Rate: ${reportData.summary.offerRate}%\n\n` +
      `Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}\n\n` +
      `View full report in the Job Search Analytics Platform.`;

    // Generate a shareable link (in a real app, this would create a shareable URL)
    const reportId = Date.now();
    setShareLink(`${window.location.origin}/shared-report/${reportId}`);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: reportData.title,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error occurred
        setShareDialogOpen(true);
      }
    } else {
      setShareDialogOpen(true);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareText || shareLink);
    alert('Report summary copied to clipboard!');
  };

  const generateShareText = () => {
    if (!reportData) return '';
    
    let text = `📊 ${reportData.title}\n\n`;
    text += `📈 Summary:\n`;
    text += `• Total Applications: ${reportData.summary.totalApplications}\n`;
    text += `• Success Rate: ${reportData.summary.successRate}%\n`;
    text += `• Offer Rate: ${reportData.summary.offerRate}%\n\n`;
    
    if (reportData.insights && reportData.insights.length > 0) {
      text += `💡 Key Insights:\n`;
      reportData.insights.slice(0, 3).forEach(insight => {
        text += `• ${insight.title}: ${insight.message}\n`;
      });
    }
    
    text += `\nGenerated: ${new Date(reportData.generatedAt).toLocaleDateString()}`;
    return text;
  };

  const shareText = generateShareText();

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <CircularProgress sx={{ color: "#3b82f6" }} size={42} />
        <Typography sx={{ color: "#6b7280", mt: 2 }}>Loading report options...</Typography>
      </Box>
    );
  }

  if (error && !generating) {
    return (
      <Alert severity="error" sx={{ borderRadius: "8px", mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Report Configuration */}
      <Paper sx={styles.card}>
        <Typography sx={styles.sectionTitle}>📋 Report Configuration</Typography>

        {/* Template Selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Report Template (Optional)</InputLabel>
          <Select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            label="Report Template (Optional)"
          >
            <MenuItem value="">Custom Report</MenuItem>
            {templates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} - {template.description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Custom Title */}
        <TextField
          fullWidth
          label="Report Title"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          sx={{ mb: 3 }}
          placeholder="Enter custom report title"
        />

        {/* Metrics Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", mb: 2 }}>
            Select Metrics to Include:
          </Typography>
          <FormGroup>
            {AVAILABLE_METRICS.map(metric => (
              <FormControlLabel
                key={metric.id}
                control={
                  <Checkbox
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => handleMetricToggle(metric.id)}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontSize: "0.9rem" }}>{metric.label}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {metric.category}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Filters */}
        <Typography sx={styles.sectionTitle}>🔍 Filters</Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value },
              }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value },
              }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Companies</InputLabel>
          <Select
            multiple
            value={filters.companies}
            onChange={(e) => setFilters(prev => ({ ...prev, companies: e.target.value }))}
            label="Filter by Companies"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {filterOptions.companies.map((company) => (
              <MenuItem key={company} value={company}>
                {company}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Industries</InputLabel>
          <Select
            multiple
            value={filters.industries}
            onChange={(e) => setFilters(prev => ({ ...prev, industries: e.target.value }))}
            label="Filter by Industries"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {filterOptions.industries.map((industry) => (
              <MenuItem key={industry} value={industry}>
                {industry}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Roles</InputLabel>
          <Select
            multiple
            value={filters.roles}
            onChange={(e) => setFilters(prev => ({ ...prev, roles: e.target.value }))}
            label="Filter by Roles"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {filterOptions.roles && filterOptions.roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            multiple
            value={filters.statuses}
            onChange={(e) => setFilters(prev => ({ ...prev, statuses: e.target.value }))}
            label="Filter by Status"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {filterOptions.statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Export Options */}
        <Typography sx={styles.sectionTitle}>📤 Export Options</Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Export Format</InputLabel>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            label="Export Format"
          >
            <MenuItem value="json">JSON (Preview)</MenuItem>
            <MenuItem value="pdf">PDF Document</MenuItem>
            <MenuItem value="csv">CSV/Excel</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeInsights}
              onChange={(e) => setIncludeInsights(e.target.checked)}
            />
          }
          label="Include Insights & Recommendations"
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={showVisualizations}
              onChange={(e) => setShowVisualizations(e.target.checked)}
            />
          }
          label="Show Data Visualizations (Charts & Graphs)"
          sx={{ mb: 3 }}
        />

        {/* Generate Button */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleGenerate}
          disabled={generating || selectedMetrics.length === 0}
          sx={{
            bgcolor: "#3b82f6",
            py: 1.5,
            fontSize: "1rem",
            fontWeight: 600,
            "&:hover": { bgcolor: "#2563eb" },
          }}
        >
          {generating ? (
            <>
              <CircularProgress size={20} sx={{ color: "#fff", mr: 1 }} />
              Generating Report...
            </>
          ) : (
            `Generate ${format.toUpperCase()} Report`
          )}
        </Button>
      </Paper>

      {/* Report Preview (JSON only) */}
      {reportData && format === 'json' && (
        <Paper sx={styles.card}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography sx={styles.sectionTitle}>📊 Report Preview</Typography>
            <Button
              variant="outlined"
              onClick={handleShare}
              sx={{ ml: 2 }}
            >
              Share Report
            </Button>
          </Box>

          <Box sx={{ mb: 2, p: 2, bgcolor: "#f3f4f6", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 600, color: "#374151", mb: 1 }}>
              {reportData.title}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Generated: {new Date(reportData.generatedAt).toLocaleString()}
            </Typography>
          </Box>

          {/* Summary */}
          {reportData.summary && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "#eff6ff", borderRadius: "8px" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Apps</Typography>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
                      {reportData.summary.totalApplications}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "#f0fdf4", borderRadius: "8px" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Success Rate</Typography>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
                      {reportData.summary.successRate}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "#fffbeb", borderRadius: "8px" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Offer Rate</Typography>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>
                      {reportData.summary.offerRate}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Insights */}
          {reportData.insights && reportData.insights.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                Insights & Recommendations
              </Typography>
              {reportData.insights.map((insight, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    mb: 1,
                    bgcolor: insight.type === 'positive' ? '#f0fdf4' : insight.type === 'warning' ? '#fef2f2' : '#eff6ff',
                    borderRadius: "8px",
                    borderLeft: `3px solid ${
                      insight.type === 'positive' ? '#10b981' : insight.type === 'warning' ? '#ef4444' : '#3b82f6'
                    }`,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: "#374151", mb: 0.5 }}>
                    {insight.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.9rem", color: "#6b7280" }}>
                    {insight.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Data Visualizations */}
          {showVisualizations && reportData.metrics && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151", mb: 2 }}>
                📈 Data Visualizations
              </Typography>

              {/* Conversion Funnel Chart */}
              {reportData.metrics.conversionFunnel && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 2 }}>
                      Conversion Funnel
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: 'Interested', value: reportData.metrics.conversionFunnel.interested },
                        { name: 'Applied', value: reportData.metrics.conversionFunnel.applied },
                        { name: 'Interview', value: reportData.metrics.conversionFunnel.interview },
                        { name: 'Offer', value: reportData.metrics.conversionFunnel.offer },
                        { name: 'Rejected', value: reportData.metrics.conversionFunnel.rejected },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Industry Breakdown Chart */}
              {reportData.metrics.industryBreakdown && reportData.metrics.industryBreakdown.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 2 }}>
                      Industry Breakdown
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.metrics.industryBreakdown.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="industry" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Industry Success Rates Chart */}
              {reportData.metrics.industrySuccessRates && reportData.metrics.industrySuccessRates.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 2 }}>
                      Industry Success Rates
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.metrics.industrySuccessRates.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="industry" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="successRate" fill="#f59e0b" name="Success Rate (%)" />
                        <Bar dataKey="offerRate" fill="#10b981" name="Offer Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Timeline Trends Chart */}
              {reportData.metrics.timeline && reportData.metrics.timeline.monthly && reportData.metrics.timeline.monthly.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 2 }}>
                      Timeline Trends (Monthly)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={reportData.metrics.timeline.monthly.slice(-12)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Area type="monotone" dataKey="applications" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Applications" />
                        <Area type="monotone" dataKey="interviews" stackId="2" stroke="#10b981" fill="#10b981" name="Interviews" />
                        <Area type="monotone" dataKey="offers" stackId="3" stroke="#f59e0b" fill="#f59e0b" name="Offers" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Customization Impact Chart */}
              {reportData.metrics.customizationImpact && reportData.metrics.customizationImpact.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 2 }}>
                      Customization Impact
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.metrics.customizationImpact}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="successRate" fill="#8b5cf6" name="Success Rate (%)" />
                        <Bar dataKey="total" fill="#ec4899" name="Total Applications" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Metrics Data (Raw JSON - Collapsible) */}
          {reportData.metrics && (
            <Box>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                Raw Metrics Data
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: "#f9fafb",
                  borderRadius: "8px",
                  overflow: "auto",
                  fontSize: "0.85rem",
                  maxHeight: "400px",
                }}
              >
                {JSON.stringify(reportData.metrics, null, 2)}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Report</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Share this report summary with mentors, coaches, or accountability partners:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={shareText}
            InputProps={{ readOnly: true }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            fullWidth
            onClick={copyShareLink}
            sx={{ mb: 1 }}
          >
            Copy to Clipboard
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomReportGenerator;

