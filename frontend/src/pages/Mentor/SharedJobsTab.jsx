// src/pages/Mentor/SharedJobsTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaBriefcase,
  FaUser,
  FaComment,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
} from "react-icons/fa";
import "./SharedJobsTab.css";

export default function SharedJobsTab() {
  const { teamState } = useTeam() || {};
  const { token } = useAuth();
  const teamId = teamState?.primaryTeam?.id;
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const currentUserId = teamState?.userId;

  const [sharedJobs, setSharedJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]); // For mentors to select jobs to share
  const [progress, setProgress] = useState(null); // For mentor progress dashboard
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingComments, setEditingComments] = useState(null); // { sharedJobId, comments }
  const [viewMode, setViewMode] = useState("jobs"); // "jobs" or "progress" (for mentors)

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

  useEffect(() => {
    loadSharedJobs();
    if (isMentor || isAdmin) {
      loadMyJobs();
      loadProgress();
    }
  }, [loadSharedJobs, loadMyJobs, loadProgress, isMentor, isAdmin]);

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
      <section className="profile-box">
        <h3>Job Posts</h3>
        <p>No team found. Please join a team to view shared jobs.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="profile-box">
        <h3>Job Posts</h3>
        <p>Loading shared jobs...</p>
      </section>
    );
  }

  const canShare = isMentor || isAdmin;
  const canViewProgress = isMentor || isAdmin;

  return (
    <section className="profile-box shared-jobs-container">
      <div className="shared-jobs-header">
        <h3>Job Posts</h3>
        {canShare && (
          <div className="shared-jobs-actions">
            <button className="btn-primary" onClick={() => setShowShareModal(true)}>
              <FaBriefcase /> Share Job
            </button>
            {canViewProgress && (
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === "jobs" ? "active" : ""}`}
                  onClick={() => setViewMode("jobs")}
                >
                  Shared Jobs
                </button>
                <button
                  className={`toggle-btn ${viewMode === "progress" ? "active" : ""}`}
                  onClick={() => setViewMode("progress")}
                >
                  Progress Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {viewMode === "progress" && canViewProgress ? (
        <ProgressDashboard progress={progress} />
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
    </section>
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
        <p>No jobs have been shared with the team yet.</p>
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