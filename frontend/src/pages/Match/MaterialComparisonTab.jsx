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
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchLabeledVersions();
  }, []);

  // Refetch versions when showArchived changes
  useEffect(() => {
    fetchLabeledVersions();
  }, [showArchived]);

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
      const url = showArchived 
        ? "/api/material-comparison/versions/labeled?includeArchived=true"
        : "/api/material-comparison/versions/labeled";
      const response = await api.get(url);
      console.log("📋 Fetched labeled versions:", response.data);
      console.log(`📋 Show archived: ${showArchived}, Resume versions: ${response.data?.resume_versions?.length || 0}, Cover letter versions: ${response.data?.cover_letter_versions?.length || 0}`);
      setLabeledVersions(response.data || { resume_versions: [], cover_letter_versions: [] });
    } catch (err) {
      console.error("Error fetching labeled versions:", err);
      setLabeledVersions({ resume_versions: [], cover_letter_versions: [] });
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
          showArchived={showArchived}
          setShowArchived={setShowArchived}
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
          <p>
            <strong>No application data tracked yet.</strong>
          </p>
          <p>
            You have labeled versions, but no applications have been tracked with those labels yet.
          </p>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#6b7280' }}>
            To start comparing:
            <br />1. Link materials to your job applications
            <br />2. Track which version labels were used for each application
            <br />3. Mark application outcomes to see performance metrics
          </p>
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
function VersionManager({ labeledVersions, onRefresh, showArchived, setShowArchived }) {
  const [labelingResume, setLabelingResume] = useState(null);
  const [labelingCoverLetter, setLabelingCoverLetter] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);

  // Get used labels separately for resumes and cover letters
  // Note: Same letter can be used for both resume AND cover letter (e.g., Resume A and Cover Letter A)
  const getUsedResumeLabels = () => {
    const usedLabels = new Set();
    labeledVersions.resume_versions?.forEach(v => {
      if (v.version_label) {
        usedLabels.add(v.version_label);
        console.log(`📌 Found used resume label: ${v.version_label} for version ${v.id}`);
      }
    });
    console.log("📊 Used resume labels:", Array.from(usedLabels));
    return usedLabels;
  };

  const getUsedCoverLetterLabels = () => {
    const usedLabels = new Set();
    labeledVersions.cover_letter_versions?.forEach(v => {
      if (v.version_label) {
        usedLabels.add(v.version_label);
        console.log(`📌 Found used cover letter label: ${v.version_label} for version ${v.id}`);
      }
    });
    console.log("📊 Used cover letter labels:", Array.from(usedLabels));
    return usedLabels;
  };

  const usedResumeLabels = getUsedResumeLabels();
  const usedCoverLetterLabels = getUsedCoverLetterLabels();

  const handleLabelResume = async (versionId, label) => {
    try {
      setLoading(true);
      console.log(`🏷️ Labeling resume version ${versionId} with label "${label}"`);
      const response = await api.put(`/api/material-comparison/resume-versions/${versionId}/label`, { label });
      console.log("✅ Label response:", response.data);
      await onRefresh();
      setLabelingResume(null);
      setNewLabel("");
      alert(`Resume version labeled as "${label}"`);
    } catch (err) {
      console.error("❌ Error labeling resume:", err);
      console.error("Error details:", err.response?.data);
      alert(err.response?.data?.error || "Failed to label resume version");
    } finally {
      setLoading(false);
    }
  };

  const handleLabelCoverLetter = async (versionId, label) => {
    try {
      setLoading(true);
      console.log(`🏷️ Labeling cover letter version ${versionId} with label "${label}"`);
      const response = await api.put(`/api/material-comparison/cover-letter-versions/${versionId}/label`, { label });
      console.log("✅ Cover letter label response:", response.data);
      await onRefresh();
      setLabelingCoverLetter(null);
      setNewLabel("");
      alert(`Cover letter version labeled as "${label}"`);
    } catch (err) {
      console.error("❌ Error labeling cover letter:", err);
      console.error("Error details:", err.response?.data);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || "Failed to label cover letter version";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (type, versionId) => {
    if (!window.confirm("Are you sure you want to archive this version? It will be removed from the comparison tab.")) {
      return;
    }
    
    try {
      const endpoint = type === "resume" 
        ? `/api/material-comparison/resume-versions/${versionId}/archive`
        : `/api/material-comparison/cover-letter-versions/${versionId}/archive`;
      
      await api.put(endpoint);
      await onRefresh();
      alert("Version archived successfully");
    } catch (err) {
      console.error("Error archiving:", err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || "Failed to archive version";
      alert(errorMsg);
    }
  };

  const handleUnarchive = async (type, versionId) => {
    if (!window.confirm("Are you sure you want to unarchive this version? It will be available for comparison again.")) {
      return;
    }
    
    try {
      const endpoint = type === "resume" 
        ? `/api/material-comparison/resume-versions/${versionId}/unarchive`
        : `/api/material-comparison/cover-letter-versions/${versionId}/unarchive`;
      
      await api.put(endpoint);
      await onRefresh();
      alert("Version unarchived successfully");
    } catch (err) {
      console.error("Error unarchiving:", err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || "Failed to unarchive version";
      alert(errorMsg);
    }
  };

  // Check if a version is attached to any jobs
  const isVersionAttachedToJobs = async (type, publishedId) => {
    if (!publishedId) return false;
    try {
      const response = await api.get(`/api/material-comparison/versions/labeled`);
      // Check if this version appears in applications
      const applicationsResponse = await api.get("/api/material-comparison/comparison/applications");
      const apps = applicationsResponse.data.applications || [];
      
      if (type === "resume") {
        return apps.some(app => app.resume_id === publishedId);
      } else {
        return apps.some(app => app.cover_letter_id === publishedId);
      }
    } catch (err) {
      console.error("Error checking job attachments:", err);
      return false; // Assume not attached if check fails
    }
  };

  return (
    <div className="version-manager">
      <div className="version-manager-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h4>Resume Versions</h4>
            <span className="version-count">{labeledVersions.resume_versions?.length || 0} found</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Show archived</span>
          </label>
        </div>
      </div>
      <div className="version-list">
        {loading && <p className="loading-text">Loading...</p>}
        {labeledVersions.resume_versions && labeledVersions.resume_versions.length > 0 ? (
          labeledVersions.resume_versions.map(version => (
            <div key={version.id} className="version-item">
              <span className="version-info">
                <strong>{(() => {
                  const fullTitle = version.resume_title || version.title || `Resume #${version.id}`;
                  // Remove "Published from" part from title: "Title (Published from X - Version Y)" -> "Title"
                  const cleanedTitle = fullTitle.replace(/\s*\(Published from .+? - Version \d+\)/i, '').trim();
                  return cleanedTitle || fullTitle;
                })()}</strong>
                {version.version_number && <span className="version-number"> - Version {version.version_number}</span>}
                {version.version_label && (
                  <span className="version-badge" style={{ background: '#10b981', color: 'white', fontWeight: '700', fontSize: '0.9rem', padding: '6px 12px' }}>
                    Label: {version.version_label}
                  </span>
                )}
                {version.is_archived && (
                  <span className="version-badge" style={{ background: '#9ca3af', color: 'white', fontWeight: '600', fontSize: '0.85rem', padding: '4px 10px', marginLeft: '8px' }}>
                    Archived
                  </span>
                )}
              </span>
              {version.version_label && !version.is_archived ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleArchive("resume", version.id)}
                  disabled={loading}
                >
                  Archive
                </button>
              ) : version.is_archived ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleUnarchive("resume", version.id)}
                  disabled={loading}
                  style={{ background: '#3b82f6', color: 'white' }}
                >
                  Unarchive
                </button>
              ) : (
                <div className="version-label-input">
                  <select
                    value={labelingResume === version.id ? newLabel : ""}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      setLabelingResume(version.id);
                    }}
                    className="label-select"
                    disabled={loading}
                    size={1}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    <option value="">Select letter...</option>
                    {Array.from({ length: 26 }, (_, i) => {
                      const letter = String.fromCharCode(65 + i); // A-Z
                      const isUsed = usedResumeLabels.has(letter);
                      return (
                        <option 
                          key={letter} 
                          value={letter}
                          disabled={isUsed}
                          style={{ color: isUsed ? '#9ca3af' : '#111827' }}
                        >
                          {letter}{isUsed ? " (used)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    className="comparison-btn-small"
                    onClick={() => {
                      if (newLabel && /^[A-Z]$/.test(newLabel) && !usedResumeLabels.has(newLabel)) {
                        handleLabelResume(version.id, newLabel);
                      }
                    }}
                    disabled={!newLabel || !/^[A-Z]$/.test(newLabel) || usedResumeLabels.has(newLabel) || loading}
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
                  <span className="version-badge" style={{ background: '#10b981', color: 'white', fontWeight: '700', fontSize: '0.9rem', padding: '6px 12px' }}>
                    Label: {version.version_label}
                  </span>
                )}
                {version.is_archived && (
                  <span className="version-badge" style={{ background: '#9ca3af', color: 'white', fontWeight: '600', fontSize: '0.85rem', padding: '4px 10px', marginLeft: '8px' }}>
                    Archived
                  </span>
                )}
              </span>
              {version.version_label && !version.is_archived ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleArchive("cover_letter", version.id)}
                  disabled={loading}
                >
                  Archive
                </button>
              ) : version.is_archived ? (
                <button 
                  className="comparison-btn-small"
                  onClick={() => handleUnarchive("cover_letter", version.id)}
                  disabled={loading}
                  style={{ background: '#3b82f6', color: 'white' }}
                >
                  Unarchive
                </button>
              ) : (
                <div className="version-label-input">
                  <select
                    value={labelingCoverLetter === version.id ? newLabel : ""}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      setLabelingCoverLetter(version.id);
                    }}
                    className="label-select"
                    disabled={loading}
                    size={1}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    <option value="">Select letter...</option>
                    {Array.from({ length: 26 }, (_, i) => {
                      const letter = String.fromCharCode(65 + i); // A-Z
                      const isUsed = usedCoverLetterLabels.has(letter);
                      return (
                        <option 
                          key={letter} 
                          value={letter}
                          disabled={isUsed}
                          style={{ color: isUsed ? '#9ca3af' : '#111827' }}
                        >
                          {letter}{isUsed ? " (used)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    className="comparison-btn-small"
                    onClick={() => {
                      if (newLabel && /^[A-Z]$/.test(newLabel) && !usedCoverLetterLabels.has(newLabel)) {
                        handleLabelCoverLetter(version.id, newLabel);
                      }
                    }}
                    disabled={!newLabel || !/^[A-Z]$/.test(newLabel) || usedCoverLetterLabels.has(newLabel) || loading}
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
        <div className="stat-row">
          <span className="stat-label">Avg Days to Response:</span>
          <span className="stat-value">
            {metric.avg_days_to_response !== null && metric.avg_days_to_response !== undefined 
              ? `${metric.avg_days_to_response} days` 
              : "N/A"}
          </span>
        </div>
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
      "Avg Days to Response": metric.avg_days_to_response !== null && metric.avg_days_to_response !== undefined && metric.avg_days_to_response > 0
        ? metric.avg_days_to_response 
        : null,
      "Total Applications": metric.total_applications
    };
  });

  return (
    <div className="comparison-chart">
      <h4>Performance Comparison Chart</h4>
      <div style={{ marginBottom: '30px' }}>
        <h5 style={{ marginBottom: '10px', fontSize: '1rem', color: '#374151' }}>Success Rates (%)</h5>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === "Response Rate" || name === "Interview Rate" || name === "Offer Rate") {
                  return [`${value}%`, name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="Response Rate" fill="#3b82f6" name="Response Rate (%)" />
            <Bar dataKey="Interview Rate" fill="#10b981" name="Interview Rate (%)" />
            <Bar dataKey="Offer Rate" fill="#f59e0b" name="Offer Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginBottom: '30px' }}>
        <h5 style={{ marginBottom: '10px', fontSize: '1rem', color: '#374151' }}>Average Time to Response (Days)</h5>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === "Avg Days to Response") {
                  return value !== null && value !== undefined && value > 0 ? [`${value} days`, name] : ["N/A", name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              dataKey="Avg Days to Response" 
              fill="#8b5cf6" 
              name="Avg Days to Response"
              fillOpacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h5 style={{ marginBottom: '10px', fontSize: '1rem', color: '#374151' }}>Total Applications</h5>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total Applications" fill="#6366f1" name="Total Applications" />
          </BarChart>
        </ResponsiveContainer>
      </div>
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

  // Deduplicate applications by job_id (in case backend returns duplicates)
  const uniqueApplications = applications.filter((app, index, self) =>
    index === self.findIndex(a => a.id === app.id)
  );

  return (
    <div className="applications-list">
      {uniqueApplications.map((app, index) => (
        <div key={`${app.id}-${index}`} className="application-item">
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
              {app.application_outcome ? (
                <span className={`outcome-badge outcome-${app.application_outcome}`}>
                  {app.application_outcome.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ) : (
                <span className="outcome-badge outcome-no_outcome">No Outcome</span>
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

