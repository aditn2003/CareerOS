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
} from "@mui/material";
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
    statuses: [],
  });
  const [format, setFormat] = useState('json');
  const [includeInsights, setIncludeInsights] = useState(true);

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
      setSelectedMetrics(template.metrics || []);
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
          statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        },
        format,
        includeInsights,
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

  const handleShare = () => {
    if (!reportData) return;
    
    const shareText = `Job Search Report: ${reportData.title}\n\n` +
      `Total Applications: ${reportData.summary.totalApplications}\n` +
      `Success Rate: ${reportData.summary.successRate}%\n` +
      `Offer Rate: ${reportData.summary.offerRate}%\n\n` +
      `Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`;

    if (navigator.share) {
      navigator.share({
        title: reportData.title,
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Report summary copied to clipboard!');
    }
  };

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

          {/* Metrics Data */}
          {reportData.metrics && (
            <Box>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                Metrics Data
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
    </Box>
  );
};

export default CustomReportGenerator;

