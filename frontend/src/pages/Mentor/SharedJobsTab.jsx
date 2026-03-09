// src/pages/Mentor/SharedJobsTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api, baseURL } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import { useAuth } from "../../contexts/AuthContext";
import TeamDropdown from "../../components/TeamDropdown";
import {
  FaBriefcase,
  FaUser,
  FaComment,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaFileAlt,
  FaEnvelope,
  FaEye,
  FaDownload,
  FaChevronDown,
  FaSync,
} from "react-icons/fa";
import FeedbackModal from "../../components/FeedbackModal";
import "./SharedJobsTab.css";

export default function SharedJobsTab() {
  const { teamState } = useTeam() || {};
  const { token } = useAuth();
  const teamId = teamState?.activeTeam?.id;
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const currentUserId = teamState?.userId;

  const [sharedJobs, setSharedJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]); // For mentors to select jobs to share
  const [progress, setProgress] = useState(null); // For mentor progress dashboard
  const [applicationMaterials, setApplicationMaterials] = useState(null); // For application materials
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingComments, setEditingComments] = useState(null); // { sharedJobId, comments }
  const [viewMode, setViewMode] = useState("jobs"); // "jobs", "progress", or "materials" (for mentors)

  // Load shared jobs
  const loadSharedJobs = useCallback(async () => {
    if (!teamId) {
      setSharedJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/team/${teamId}/shared-jobs`);
      setSharedJobs(data?.sharedJobs || []);
    } catch (err) {
      console.error("Failed to load shared jobs:", err);
      setError(err.response?.data?.error || "Failed to load shared jobs.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Load mentor's jobs for sharing
  const loadMyJobs = useCallback(async () => {
    if (!token || (!isMentor && !isAdmin)) return;
    setLoadingJobs(true);
    try {
      const { data } = await api.get("/api/jobs");
      setMyJobs(data?.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  }, [token, isMentor, isAdmin]);

  // Load progress dashboard (mentors/admins only)
  const loadProgress = useCallback(async () => {
    if (!teamId || (!isMentor && !isAdmin)) return;
    try {
      const { data } = await api.get(`/api/team/${teamId}/shared-jobs/progress`);
      setProgress(data);
    } catch (err) {
      console.error("Failed to load progress:", err);
    }
  }, [teamId, isMentor, isAdmin]);

  // Load application materials (mentors/admins can see all candidates, candidates see only their own)
  const loadApplicationMaterials = useCallback(async () => {
    if (!teamId || (!isMentor && !isAdmin && !isCandidate)) return;
    setLoadingMaterials(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/shared-jobs/application-materials`);
      setApplicationMaterials(data);
    } catch (err) {
      console.error("Failed to load application materials:", err);
      setError(err.response?.data?.error || "Failed to load application materials.");
    } finally {
      setLoadingMaterials(false);
    }
  }, [teamId, isMentor, isAdmin, isCandidate]);

  useEffect(() => {
    loadSharedJobs();
    if (isMentor || isAdmin) {
      loadMyJobs();
      loadProgress();
      if (viewMode === "materials") {
        loadApplicationMaterials();
      }
    } else if (isCandidate && viewMode === "materials") {
      // Candidates can also load their own materials
      loadApplicationMaterials();
    }
  }, [loadSharedJobs, loadMyJobs, loadProgress, loadApplicationMaterials, isMentor, isAdmin, isCandidate, viewMode]);

  // Refresh application materials when viewMode changes to materials
  useEffect(() => {
    if (viewMode === "materials" && (isMentor || isAdmin || isCandidate)) {
      loadApplicationMaterials();
    }
  }, [viewMode, isMentor, isAdmin, isCandidate, loadApplicationMaterials]);

  const handleShareJob = async (jobId, comments) => {
    if (!teamId) return;
    try {
      await api.post(`/api/team/${teamId}/shared-jobs`, {
        jobId,
        comments: comments || null,
      });
      setShowShareModal(false);
      loadSharedJobs();
      loadProgress();
    } catch (err) {
      console.error("Failed to share job:", err);
      setError(err.response?.data?.error || "Failed to share job.");
    }
  };

  const handleUpdateComments = async (sharedJobId, comments) => {
    if (!teamId) return;
    try {
      await api.post(`/api/team/${teamId}/shared-jobs/${sharedJobId}/comments`, {
        comments: comments || null,
      });
      setEditingComments(null);
      loadSharedJobs();
    } catch (err) {
      console.error("Failed to update comments:", err);
      setError(err.response?.data?.error || "Failed to update comments.");
    }
  };

  const handleExportJob = async (sharedJobId) => {
    if (!teamId) return;
    try {
      await api.post(`/api/team/${teamId}/shared-jobs/${sharedJobId}/export`);
      alert("✅ Job exported to your pipeline successfully!");
      loadSharedJobs();
    } catch (err) {
      console.error("Failed to export job:", err);
      const errorMsg = err.response?.data?.error || "Failed to export job.";
      if (errorMsg === "JOB_ALREADY_EXPORTED") {
        alert("⚠️ This job has already been exported to your pipeline.");
      } else {
        alert(`❌ ${errorMsg}`);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!teamId) {
    return (
      <div className="shared-jobs-container">
        <div className="shared-jobs-empty">
          <FaBriefcase className="shared-jobs-empty-icon" />
          <h3 className="shared-jobs-empty-title">No Team Found</h3>
          <p className="shared-jobs-empty-text">
            Please join a team to view and manage shared jobs.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shared-jobs-container">
        <div className="shared-jobs-loading">
          <div className="shared-jobs-loading-spinner"></div>
        <p>Loading shared jobs...</p>
        </div>
      </div>
    );
  }

  const canShare = isMentor || isAdmin;
  const canViewProgress = isMentor || isAdmin;
  const canViewMaterials = isMentor || isAdmin || isCandidate; // Candidates can view their own materials

  return (
    <div className="shared-jobs-container">
      <div className="shared-jobs-header">
        <div className="shared-jobs-header-content">
          <h2 className="shared-jobs-main-title">Job Posts</h2>
          <p className="shared-jobs-main-subtitle">
            Discover opportunities and track team progress
          </p>
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", width: "100%" }}>
            <TeamDropdown />
          </div>
        </div>
        <div className="shared-jobs-actions">
          {canShare && (
            <button className="shared-jobs-share-btn" onClick={() => setShowShareModal(true)}>
              <FaBriefcase />
              <span>Share Job</span>
            </button>
          )}
          {canViewMaterials && (
            <div className="shared-jobs-view-toggle">
              <button
                className={`shared-jobs-toggle-btn ${viewMode === "jobs" ? "active" : ""}`}
                onClick={() => setViewMode("jobs")}
              >
                Shared Jobs
              </button>
              {(isMentor || isAdmin) && (
                <button
                  className={`shared-jobs-toggle-btn ${viewMode === "progress" ? "active" : ""}`}
                  onClick={() => setViewMode("progress")}
                >
                  Progress Dashboard
                </button>
              )}
              <button
                className={`shared-jobs-toggle-btn ${viewMode === "materials" ? "active" : ""}`}
                onClick={() => {
                  setViewMode("materials");
                  loadApplicationMaterials(); // Always refresh when switching to materials view
                }}
              >
                Application Materials
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="shared-jobs-error-banner">{error}</div>}

      {viewMode === "progress" && canViewProgress ? (
        <ProgressDashboard progress={progress} />
      ) : viewMode === "materials" && canViewMaterials ? (
        <ApplicationMaterials
          materials={applicationMaterials}
          loading={loadingMaterials}
          onRefresh={loadApplicationMaterials}
          isCandidate={isCandidate}
        />
      ) : (
        <SharedJobsList
          sharedJobs={sharedJobs}
          isCandidate={isCandidate}
          editingComments={editingComments}
          setEditingComments={setEditingComments}
          onUpdateComments={handleUpdateComments}
          onExportJob={handleExportJob}
          formatDate={formatDate}
        />
      )}

      {showShareModal && (
        <ShareJobModal
          myJobs={myJobs}
          loadingJobs={loadingJobs}
          onShare={handleShareJob}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// Shared Jobs List Component
function SharedJobsList({
  sharedJobs,
  isCandidate,
  editingComments,
  setEditingComments,
  onUpdateComments,
  onExportJob,
  formatDate,
}) {
  if (sharedJobs.length === 0) {
    return (
      <div className="shared-jobs-empty">
        <FaBriefcase className="shared-jobs-empty-icon" />
        <h3 className="shared-jobs-empty-title">No Jobs Shared Yet</h3>
        <p className="shared-jobs-empty-text">
          No jobs have been shared with the team yet. Share a job to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="shared-jobs-list">
      {sharedJobs.map((sharedJob) => (
        <div key={sharedJob.id} className="shared-job-card">
          <div className="shared-job-header">
            <div className="shared-job-title-row">
              <h4>{sharedJob.title}</h4>
              <span className="shared-job-company">{sharedJob.company}</span>
            </div>
            {sharedJob.exportCount > 0 && (
              <div className="export-badge">
                <FaCheckCircle /> {sharedJob.exportCount} export
                {sharedJob.exportCount > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {sharedJob.location && (
            <div className="shared-job-location">📍 {sharedJob.location}</div>
          )}

          {sharedJob.deadline && (
            <div className="shared-job-deadline">
              <strong>Deadline:</strong> {formatDate(sharedJob.deadline)}
            </div>
          )}

          {(sharedJob.salaryMin || sharedJob.salaryMax) && (
            <div className="shared-job-salary">
              <strong>Salary:</strong>{" "}
              {sharedJob.salaryMin && sharedJob.salaryMax
                ? `$${sharedJob.salaryMin.toLocaleString()} - $${sharedJob.salaryMax.toLocaleString()}`
                : sharedJob.salaryMin
                ? `$${sharedJob.salaryMin.toLocaleString()}+`
                : `Up to $${sharedJob.salaryMax.toLocaleString()}`}
            </div>
          )}

          {sharedJob.description && (
            <div className="shared-job-description">
              <p>{sharedJob.description.substring(0, 200)}...</p>
            </div>
          )}

          {sharedJob.comments && (
            <div className="shared-job-comments">
              <div className="comments-header">
                <FaComment /> <strong>Mentor's Comments:</strong>
              </div>
              <p>{sharedJob.comments}</p>
            </div>
          )}

          {editingComments?.sharedJobId === sharedJob.id ? (
            <CommentsEditor
              initialComments={sharedJob.comments || ""}
              onSave={(comments) => {
                onUpdateComments(sharedJob.id, comments);
              }}
              onCancel={() => setEditingComments(null)}
            />
          ) : (
            <div className="shared-job-actions">
              {!isCandidate && (
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setEditingComments({ sharedJobId: sharedJob.id, comments: sharedJob.comments || "" })
                  }
                >
                  <FaComment /> {sharedJob.comments ? "Edit Comments" : "Add Comments"}
                </button>
              )}
              {isCandidate && (
                <button
                  className={`btn-primary ${sharedJob.isExported ? "exported" : ""}`}
                  onClick={() => onExportJob(sharedJob.id)}
                  disabled={sharedJob.isExported}
                >
                  {sharedJob.isExported ? (
                    <>
                      <FaCheckCircle /> Exported
                    </>
                  ) : (
                    <>
                      <FaArrowRight /> Export to Pipeline
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="shared-job-meta">
            <span>
              Shared by <strong>{sharedJob.mentorName}</strong> on {formatDate(sharedJob.sharedAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Comments Editor Component
function CommentsEditor({ initialComments, onSave, onCancel }) {
  const [comments, setComments] = useState(initialComments);

  return (
    <div className="comments-editor">
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Add collaborative comments and recommendations..."
        rows={4}
      />
      <div className="comments-editor-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => onSave(comments)}>
          Save Comments
        </button>
      </div>
    </div>
  );
}

// Share Job Modal Component - FIXED STRUCTURE
function ShareJobModal({ myJobs, loadingJobs, onShare, onClose }) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [comments, setComments] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert("Please select a job to share.");
      return;
    }
    onShare(parseInt(selectedJobId), comments);
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2>Share Job with Team</h2>
        <form onSubmit={handleSubmit}>
          {/* Wrapper div for scrollable content - this matches CSS expectations */}
          <div>
            <div className="form-group">
              <label htmlFor="jobId">Select Job *</label>
              {loadingJobs ? (
                // FIX 1: Use a disabled select to maintain the visual height of the input field
                <select id="jobId" disabled value="">
                  <option value="">Loading your jobs...</option>
                </select>
              ) : myJobs.length === 0 ? (
                // FIX 2: Use a disabled select for the empty state to ensure the form-group maintains height
                <select id="jobId" disabled value="">
                  <option value="">No jobs available to share.</option>
                </select>
              ) : (
                <select
                  id="jobId"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  required
                >
                  <option value="">Select a job...</option>
                  {myJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} at {job.company} ({job.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="comments">Comments & Recommendations (Optional)</label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add collaborative comments and recommendations for your mentees..."
                rows={5}
              />
            </div>
          </div>

          {/* Modal actions outside the scrollable wrapper */}
          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={!selectedJobId}>
              Share Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Progress Dashboard Component
function ProgressDashboard({ progress }) {
  if (!progress) {
    return <div className="progress-loading">Loading progress dashboard...</div>;
  }

  const { progress: progressData, candidates } = progress || {};

  if (!progressData || progressData.length === 0) {
    return (
      <div className="progress-empty">
        <p>No shared jobs yet. Share a job to track mentee progress.</p>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <div className="progress-summary">
        <div className="summary-item">
          <strong>{progressData.length}</strong> job{progressData.length !== 1 ? "s" : ""} shared
        </div>
        <div className="summary-item">
          <strong>{progressData.reduce((sum, p) => sum + p.exportCount, 0)}</strong> total export
          {progressData.reduce((sum, p) => sum + p.exportCount, 0) !== 1 ? "s" : ""}
        </div>
        <div className="summary-item">
          <strong>{candidates?.length || 0}</strong> candidate{candidates?.length !== 1 ? "s" : ""} in team
        </div>
      </div>

      <div className="progress-list">
        {progressData.map((item) => (
          <div key={item.sharedJobId} className="progress-item">
            <div className="progress-item-header">
              <div>
                <h4>{item.title}</h4>
                <span className="progress-company">{item.company}</span>
              </div>
              <div className="progress-stats">
                <span className="export-count-badge">
                  <FaCheckCircle /> {item.exportCount} export{item.exportCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {item.exportCount > 0 ? (
              <div className="progress-exports">
                <strong>Exported by:</strong>
                <ul>
                  {item.exports.map((exportItem, idx) => (
                    <li key={idx}>
                      <FaUser /> {exportItem.candidateName}
                      {exportItem.exportedJobStatus && (
                        <span className={`job-status-badge status-${exportItem.exportedJobStatus.toLowerCase()}`}>
                          {exportItem.exportedJobStatus}
                        </span>
                      )}
                      <span className="export-date">
                        Exported: {new Date(exportItem.exportedAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="progress-no-exports">
                <FaExclamationTriangle /> No candidates have exported this job yet.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Application Materials Component
function ApplicationMaterials({ materials, loading, onRefresh, isCandidate = false }) {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.activeTeam?.id;
  const [feedbackModal, setFeedbackModal] = useState(null); // { candidateId, candidateName, jobId, jobTitle, materialType }
  const [expandedCandidates, setExpandedCandidates] = useState(new Set()); // Track which candidates are expanded

  const toggleCandidate = (candidateId) => {
    setExpandedCandidates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const handleViewResume = async (resumeId, jobId = null) => {
    if (!teamId) {
      alert("Team not found");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let downloadUrl = `${baseURL}/api/team/${teamId}/resume/${resumeId}/download`;
      if (jobId) {
        downloadUrl += `?jobId=${jobId}`;
      }
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load resume");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      // Open PDF in a new tab for viewing
      window.open(blobUrl, "_blank");
      // Note: We don't revoke the URL immediately to allow the browser to load it
      // The browser will handle cleanup when the tab is closed
    } catch (err) {
      console.error("Failed to load resume:", err);
      alert("Failed to load resume. Please try again.");
    }
  };

  const handleViewCoverLetter = async (coverLetterId, jobId = null) => {
    if (!teamId) {
      alert("Team not found");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let downloadUrl = `${baseURL}/api/team/${teamId}/cover-letter/${coverLetterId}/download`;
      if (jobId) {
        downloadUrl += `?jobId=${jobId}`;
      }
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load cover letter");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      // Open PDF/DOC in a new tab for viewing
      window.open(blobUrl, "_blank");
      // Note: We don't revoke the URL immediately to allow the browser to load it
      // The browser will handle cleanup when the tab is closed
    } catch (err) {
      console.error("Failed to load cover letter:", err);
      alert("Failed to load cover letter. Please try again.");
    }
  };

  if (loading) {
    return <div className="materials-loading">Loading application materials...</div>;
  }

  if (!materials || !materials.materials || materials.materials.length === 0) {
    return (
      <div className="materials-empty">
        <p>No application materials found for any candidates.</p>
      </div>
    );
  }

  return (
    <div className="application-materials-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Application Materials</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#4f22ea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '14px',
            fontWeight: 500,
          }}
          title="Refresh application materials"
        >
          <FaSync style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>
      {materials.materials.map((candidate) => {
        const isExpanded = expandedCandidates.has(candidate.candidateId);
        return (
          <div key={candidate.candidateId} className="candidate-materials-card">
            <div 
              className="candidate-materials-header"
              onClick={() => toggleCandidate(candidate.candidateId)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <FaChevronDown 
                  className={`candidate-expand-arrow ${isExpanded ? 'expanded' : ''}`}
                />
                <h4>
                  <FaUser /> {candidate.candidateName}
                </h4>
              </div>
              <span className="job-count-badge">
                {candidate.jobs.length} job{candidate.jobs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {isExpanded && (
              <div className="candidate-jobs-list">
            {candidate.jobs.map((job) => (
              <div key={job.jobId} className="job-materials-item">
                <div className="job-materials-header">
                  <div>
                    <h5>{job.jobTitle}</h5>
                    <span className="job-company">{job.jobCompany}</span>
                    <span className={`job-status-badge status-${job.jobStatus?.toLowerCase() || "unknown"}`}>
                      {job.jobStatus || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="materials-list">
                  {job.resume ? (
                    <div className="material-item">
                      <FaFileAlt className="material-icon" />
                      <div className="material-info">
                        <span className="material-title">{job.resume.title}</span>
                        <span className="material-format">{job.resume.format.toUpperCase()}</span>
                      </div>
                      <div className="material-actions">
                        <button
                          className="material-view-btn"
                          onClick={() => handleViewResume(job.resume.id, job.jobId)}
                          title="View Resume"
                        >
                          <FaEye /> View
                        </button>
                        {!isCandidate && (
                          <button
                            className="material-feedback-btn"
                            onClick={() => setFeedbackModal({
                              candidateId: candidate.candidateId,
                              candidateName: candidate.candidateName,
                              jobId: job.jobId,
                              jobTitle: job.jobTitle,
                              materialType: "resume"
                            })}
                            title="Add Feedback"
                          >
                            <FaComment /> Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="material-item no-material">
                      <FaFileAlt className="material-icon" />
                      <span className="no-material-text">No resume found</span>
                    </div>
                  )}

                  {job.coverLetter ? (
                    <div className="material-item">
                      <FaEnvelope className="material-icon" />
                      <div className="material-info">
                        <span className="material-title">{job.coverLetter.title}</span>
                        <span className="material-format">{job.coverLetter.format.toUpperCase()}</span>
                      </div>
                      <div className="material-actions">
                        <button
                          className="material-view-btn"
                          onClick={() => handleViewCoverLetter(job.coverLetter.id, job.jobId)}
                          title="View Cover Letter"
                        >
                          <FaEye /> View
                        </button>
                        {!isCandidate && (
                          <button
                            className="material-feedback-btn"
                            onClick={() => setFeedbackModal({
                              candidateId: candidate.candidateId,
                              candidateName: candidate.candidateName,
                              jobId: job.jobId,
                              jobTitle: job.jobTitle,
                              materialType: "cover_letter"
                            })}
                            title="Add Feedback"
                          >
                            <FaComment /> Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="material-item no-material">
                      <FaEnvelope className="material-icon" />
                      <span className="no-material-text">No cover letter found</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
              </div>
            )}
          </div>
        );
      })}
      
      {feedbackModal && (
        <FeedbackModal
          teamId={teamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          jobId={feedbackModal.jobId}
          materialType={feedbackModal.materialType}
          materialJobTitle={feedbackModal.jobTitle}
          onClose={() => setFeedbackModal(null)}
          onSuccess={() => {
            setFeedbackModal(null);
            // Optionally refresh materials or show success message
          }}
        />
      )}
    </div>
  );
}