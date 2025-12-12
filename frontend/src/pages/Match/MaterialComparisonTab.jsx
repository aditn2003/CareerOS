// frontend/src/pages/Match/MaterialComparisonTab.jsx
// Application Material Comparison Dashboard

import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./MaterialComparisonTab.css";

export default function MaterialComparisonTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([]);
  const [applications, setApplications] = useState([]);
  const [labeledVersions, setLabeledVersions] = useState({ resume_versions: [], cover_letter_versions: [] });
  const [selectedResumeLabel, setSelectedResumeLabel] = useState("");
  const [selectedCoverLetterLabel, setSelectedCoverLetterLabel] = useState("");
  const [showVersionManager, setShowVersionManager] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchLabeledVersions();
  }, []);

  useEffect(() => {
    if (selectedResumeLabel || selectedCoverLetterLabel) {
      fetchApplications();
    } else {
      setApplications([]);
    }
  }, [selectedResumeLabel, selectedCoverLetterLabel]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get("/api/material-comparison/comparison/metrics");
      setMetrics(response.data.metrics || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setLoading(false);
    }
  };

  const fetchLabeledVersions = async () => {
    try {
      const response = await api.get("/api/material-comparison/versions/labeled");
      setLabeledVersions(response.data || { resume_versions: [], cover_letter_versions: [] });
    } catch (err) {
      console.error("Error fetching labeled versions:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedResumeLabel) params.append("resume_label", selectedResumeLabel);
      if (selectedCoverLetterLabel) params.append("cover_letter_label", selectedCoverLetterLabel);

      const response = await api.get(`/api/material-comparison/comparison/applications?${params.toString()}`);
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const handleMarkOutcome = async (jobId, outcome, responseDate) => {
    try {
      await api.put(`/api/material-comparison/jobs/${jobId}/outcome`, {
        outcome,
        response_received_at: responseDate || null
      });
      await fetchMetrics();
      await fetchApplications();
      alert("Outcome updated successfully!");
    } catch (err) {
      console.error("Error updating outcome:", err);
      alert("Failed to update outcome");
    }
  };

  if (loading) {
    return (
      <div className="comparison-tab-content">
        <div className="comparison-loading">Loading comparison data...</div>
      </div>
    );
  }

  return (
    <div className="comparison-tab-content">
      <div className="comparison-header">
        <h2>📊 Application Material Comparison</h2>
        <p className="comparison-subtitle">
          Compare the performance of different resume and cover letter versions
        </p>
      </div>

      {/* Warning Note */}
      <div className="comparison-warning">
        <strong>📌 Note:</strong> Meaningful comparisons require 10+ applications per version
      </div>

      {/* Version Manager Button */}
      <div className="comparison-actions">
        <button 
          className="comparison-btn-primary"
          onClick={() => setShowVersionManager(!showVersionManager)}
        >
          {showVersionManager ? "Hide" : "Manage"} Version Labels
        </button>
      </div>

      {/* Version Manager */}
      {showVersionManager && (
        <VersionManager 
          labeledVersions={labeledVersions}
          onRefresh={fetchLabeledVersions}
        />
      )}

      {/* Metrics Dashboard */}
      {metrics.length > 0 ? (
        <div className="comparison-metrics-section">
          <h3>Performance Metrics by Version</h3>
          
          {/* Comparison Chart */}
          <div className="comparison-chart-container">
            <ComparisonChart metrics={metrics} />
          </div>

          <div className="metrics-grid">
            {metrics.map((metric, idx) => (
              <MetricCard key={idx} metric={metric} />
            ))}
          </div>
        </div>
      ) : (
        <div className="comparison-placeholder">
          <p>No labeled versions found. Label your resume and cover letter versions to start comparing.</p>
        </div>
      )}

      {/* Applications List */}
      <div className="comparison-applications-section">
        <h3>Applications by Version</h3>
        <div className="application-filters">
          <select
            value={selectedResumeLabel}
            onChange={(e) => setSelectedResumeLabel(e.target.value)}
            className="comparison-filter-select"
          >
            <option value="">All Resume Versions</option>
            {[...new Set(labeledVersions.resume_versions.map(v => v.version_label))].map(label => (
              <option key={label} value={label}>Resume {label}</option>
            ))}
          </select>
          <select
            value={selectedCoverLetterLabel}
            onChange={(e) => setSelectedCoverLetterLabel(e.target.value)}
            className="comparison-filter-select"
          >
            <option value="">All Cover Letter Versions</option>
            {[...new Set(labeledVersions.cover_letter_versions.map(v => v.version_label))].map(label => (
              <option key={label} value={label}>Cover Letter {label}</option>
            ))}
          </select>
        </div>

        {applications.length > 0 ? (
          <ApplicationsList 
            applications={applications}
            onMarkOutcome={handleMarkOutcome}
          />
        ) : (
          <div className="comparison-placeholder">
            <p>Select version filters to view applications</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Version Manager Component
function VersionManager({ labeledVersions, onRefresh }) {
  const [labelingResume, setLabelingResume] = useState(null);
  const [labelingCoverLetter, setLabelingCoverLetter] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLabelResume = async (versionId, label) => {
    try {
      setLoading(true);
      await api.put(`/api/material-comparison/resume-versions/${versionId}/label`, { label });
      await onRefresh();
      setLabelingResume(null);
      setNewLabel("");
      alert(`Resume version labeled as "${label}"`);
    } catch (err) {
      console.error("Error labeling resume:", err);
      alert(err.response?.data?.error || "Failed to label resume version");
    } finally {
      setLoading(false);
    }
  };

  const handleLabelCoverLetter = async (versionId, label) => {
    try {
      setLoading(true);
      await api.put(`/api/material-comparison/cover-letter-versions/${versionId}/label`, { label });
      await onRefresh();
      setLabelingCoverLetter(null);
      setNewLabel("");
      alert(`Cover letter version labeled as "${label}"`);
    } catch (err) {
      console.error("Error labeling cover letter:", err);
      alert(err.response?.data?.error || "Failed to label cover letter version");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (type, versionId) => {
    try {
      const endpoint = type === "resume" 
        ? `/api/material-comparison/resume-versions/${versionId}/archive`
        : `/api/material-comparison/cover-letter-versions/${versionId}/archive`;
      
      await api.put(endpoint);
      await onRefresh();
      alert("Version archived");
    } catch (err) {
      console.error("Error archiving:", err);
      alert("Failed to archive version");
    }
  };

  return (
    <div className="version-manager">
      <div className="version-manager-header">
        <h4>Resume Versions</h4>
        <span className="version-count">{labeledVersions.resume_versions?.length || 0} found</span>
      </div>
      <div className="version-list">
        {loading && <p className="loading-text">Loading...</p>}
        {labeledVersions.resume_versions && labeledVersions.resume_versions.length > 0 ? (
          labeledVersions.resume_versions.map(version => (
            <div key={version.id} className="version-item">
              <span className="version-info">
                <strong>{version.resume_title || version.title || `Resume #${version.id}`}</strong>
                {version.version_number && <span className="version-number"> - Version {version.version_number}</span>}
                {version.version_label && (
                  <span className="version-badge">Label: {version.version_label}</span>
                )}
              </span>
              {version.version_label ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleArchive("resume", version.id)}
                  disabled={loading}
                >
                  Archive
                </button>
              ) : (
                <div className="version-label-input">
                  <input
                    type="text"
                    maxLength={1}
                    placeholder="A-Z"
                    value={labelingResume === version.id ? newLabel : ""}
                    onChange={(e) => {
                      setNewLabel(e.target.value.toUpperCase());
                      setLabelingResume(version.id);
                    }}
                    className="label-input"
                    disabled={loading}
                  />
                  <button
                    className="comparison-btn-small"
                    onClick={() => {
                      if (newLabel && /^[A-Z]$/.test(newLabel)) {
                        handleLabelResume(version.id, newLabel);
                      }
                    }}
                    disabled={!newLabel || !/^[A-Z]$/.test(newLabel) || loading}
                  >
                    Label
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-versions-container">
            <p className="no-versions">No resume versions found.</p>
            <p className="no-versions-hint">Create resume versions in the Resume Management section first.</p>
          </div>
        )}
      </div>

      <div className="version-manager-header">
        <h4>Cover Letter Versions</h4>
        <span className="version-count">{labeledVersions.cover_letter_versions?.length || 0} found</span>
      </div>
      <div className="version-list">
        {loading && <p className="loading-text">Loading...</p>}
        {labeledVersions.cover_letter_versions && labeledVersions.cover_letter_versions.length > 0 ? (
          labeledVersions.cover_letter_versions.map(version => (
            <div key={version.id} className="version-item">
              <span className="version-info">
                <strong>{version.cover_letter_name || version.title || `Cover Letter #${version.id}`}</strong>
                {version.version_number && <span className="version-number"> - Version {version.version_number}</span>}
                {version.version_label && (
                  <span className="version-badge">Label: {version.version_label}</span>
                )}
              </span>
              {version.version_label ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleArchive("cover_letter", version.id)}
                  disabled={loading}
                >
                  Archive
                </button>
              ) : (
                <div className="version-label-input">
                  <input
                    type="text"
                    maxLength={1}
                    placeholder="A-Z"
                    value={labelingCoverLetter === version.id ? newLabel : ""}
                    onChange={(e) => {
                      setNewLabel(e.target.value.toUpperCase());
                      setLabelingCoverLetter(version.id);
                    }}
                    className="label-input"
                    disabled={loading}
                  />
                  <button
                    className="comparison-btn-small"
                    onClick={() => {
                      if (newLabel && /^[A-Z]$/.test(newLabel)) {
                        handleLabelCoverLetter(version.id, newLabel);
                      }
                    }}
                    disabled={!newLabel || !/^[A-Z]$/.test(newLabel) || loading}
                  >
                    Label
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-versions-container">
            <p className="no-versions">No cover letter versions found.</p>
            <p className="no-versions-hint">Upload cover letters in the Documents section first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ metric }) {
  const hasEnoughData = metric.total_applications >= 10;

  // Build version label display
  const getVersionLabel = () => {
    const parts = [];
    if (metric.resume_label !== "Unlabeled") {
      parts.push(`Resume ${metric.resume_label}`);
    }
    if (metric.cover_letter_label !== "Unlabeled") {
      if (parts.length > 0) parts.push(" + ");
      parts.push(`Cover Letter ${metric.cover_letter_label}`);
    }
    if (parts.length === 0) {
      return "Unlabeled";
    }
    return parts.join("");
  };

  return (
    <div className={`metric-card ${!hasEnoughData ? "insufficient-data" : ""}`}>
      <div className="metric-header">
        <h4>{getVersionLabel()}</h4>
        {!hasEnoughData && (
          <span className="data-warning">⚠️ Low sample size</span>
        )}
      </div>
      <div className="metric-stats">
        <div className="stat-row">
          <span className="stat-label">Total Applications:</span>
          <span className="stat-value">{metric.total_applications}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Response Rate:</span>
          <span className="stat-value">{metric.response_rate_percent}%</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Interview Rate:</span>
          <span className="stat-value">{metric.interview_rate_percent}%</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Offer Rate:</span>
          <span className="stat-value">{metric.offer_rate_percent}%</span>
        </div>
        {metric.avg_days_to_response && (
          <div className="stat-row">
            <span className="stat-label">Avg Days to Response:</span>
            <span className="stat-value">{metric.avg_days_to_response} days</span>
          </div>
        )}
        <div className="stat-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">Responses:</span>
            <span className="breakdown-value">{metric.responses_received}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Interviews:</span>
            <span className="breakdown-value">{metric.interviews}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Offers:</span>
            <span className="breakdown-value">{metric.offers}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Rejections:</span>
            <span className="breakdown-value">{metric.rejections}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">No Response:</span>
            <span className="breakdown-value">{metric.no_responses}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comparison Chart Component
function ComparisonChart({ metrics }) {
  const chartData = metrics.map(metric => {
    // Build chart label
    const parts = [];
    if (metric.resume_label !== "Unlabeled") {
      parts.push(`R${metric.resume_label}`);
    }
    if (metric.cover_letter_label !== "Unlabeled") {
      if (parts.length > 0) parts.push("+");
      parts.push(`CL${metric.cover_letter_label}`);
    }
    const name = parts.length > 0 ? parts.join("") : "Unlabeled";

    return {
      name,
      "Response Rate": metric.response_rate_percent,
      "Interview Rate": metric.interview_rate_percent,
      "Offer Rate": metric.offer_rate_percent,
      "Total Applications": metric.total_applications
    };
  });

  return (
    <div className="comparison-chart">
      <h4>Performance Comparison Chart</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Response Rate" fill="#3b82f6" />
          <Bar dataKey="Interview Rate" fill="#10b981" />
          <Bar dataKey="Offer Rate" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Applications List Component
function ApplicationsList({ applications, onMarkOutcome }) {
  const [editingJob, setEditingJob] = useState(null);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: "", response_date: "" });

  const handleSubmitOutcome = (jobId) => {
    if (!outcomeForm.outcome) {
      alert("Please select an outcome");
      return;
    }
    onMarkOutcome(jobId, outcomeForm.outcome, outcomeForm.response_date || null);
    setEditingJob(null);
    setOutcomeForm({ outcome: "", response_date: "" });
  };

  return (
    <div className="applications-list">
      {applications.map(app => (
        <div key={app.id} className="application-item">
          <div className="application-info">
            <h5>{app.title} at {app.company}</h5>
            <div className="application-meta">
              <span>Applied: {app.applied_on ? new Date(app.applied_on).toLocaleDateString() : "N/A"}</span>
              {app.resume_version_label && (
                <span className="version-tag">Resume {app.resume_version_label}</span>
              )}
              {app.cover_letter_version_label && (
                <span className="version-tag">Cover Letter {app.cover_letter_version_label}</span>
              )}
            </div>
            <div className="application-status">
              <span className={`status-badge status-${app.status?.toLowerCase()}`}>
                {app.status || "Unknown"}
              </span>
              {app.application_outcome && (
                <span className={`outcome-badge outcome-${app.application_outcome}`}>
                  {app.application_outcome.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
          <div className="application-actions">
            {editingJob === app.id ? (
              <div className="outcome-form">
                <select
                  value={outcomeForm.outcome}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                  className="outcome-select"
                >
                  <option value="">Select outcome...</option>
                  <option value="response_received">Response Received</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejection">Rejection</option>
                  <option value="no_response">No Response</option>
                </select>
                <input
                  type="date"
                  value={outcomeForm.response_date}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, response_date: e.target.value })}
                  placeholder="Response date (optional)"
                  className="date-input"
                />
                <button
                  className="comparison-btn-small"
                  onClick={() => handleSubmitOutcome(app.id)}
                >
                  Save
                </button>
                <button
                  className="comparison-btn-small comparison-btn-secondary"
                  onClick={() => {
                    setEditingJob(null);
                    setOutcomeForm({ outcome: "", response_date: "" });
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="comparison-btn-small"
                onClick={() => {
                  setEditingJob(app.id);
                  setOutcomeForm({ 
                    outcome: app.application_outcome || "", 
                    response_date: app.response_received_at ? new Date(app.response_received_at).toISOString().split('T')[0] : ""
                  });
                }}
              >
                {app.application_outcome ? "Update Outcome" : "Mark Outcome"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

