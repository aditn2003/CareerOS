import React, { useState, useEffect } from "react";
import { api } from "../api";
import "./FeedbackModal.css";

export default function FeedbackModal({
  teamId,
  candidateId,
  candidateName,
  feedbackId = null, // null for create, ID for edit
  existingFeedback = null,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    feedbackType: existingFeedback?.feedbackType || "general",
    content: existingFeedback?.content || "",
    jobId: existingFeedback?.jobId || "",
    skillName: existingFeedback?.skillName || "",
  });
  const [candidateJobs, setCandidateJobs] = useState([]);
  const [candidateSkills, setCandidateSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const isEditMode = feedbackId !== null;

  useEffect(() => {
    if (candidateId && teamId) {
      loadCandidateData();
    }
  }, [candidateId, teamId]);

  const loadCandidateData = async () => {
    if (formData.feedbackType === "job") {
      setLoadingJobs(true);
      try {
        const { data } = await api.get(`/api/team/${teamId}/members/${candidateId}/profile`);
        if (data?.jobs) {
          setCandidateJobs(data.jobs);
        }
      } catch (err) {
        console.error("Failed to load candidate jobs:", err);
      } finally {
        setLoadingJobs(false);
      }
    }

    if (formData.feedbackType === "skill") {
      try {
        const { data } = await api.get(`/api/team/${teamId}/members/${candidateId}/profile`);
        if (data?.skills) {
          setCandidateSkills(data.skills);
        }
      } catch (err) {
        console.error("Failed to load candidate skills:", err);
      }
    }
  };

  useEffect(() => {
    loadCandidateData();
  }, [formData.feedbackType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        candidateId,
        feedbackType: formData.feedbackType,
        content: formData.content.trim(),
        jobId: formData.feedbackType === "job" ? parseInt(formData.jobId) || null : null,
        skillName: formData.feedbackType === "skill" ? formData.skillName.trim() || null : null,
      };

      if (isEditMode) {
        await api.patch(`/api/team/${teamId}/feedback/${feedbackId}`, payload);
      } else {
        await api.post(`/api/team/${teamId}/feedback`, payload);
      }

      console.log(`[Feedback] Successfully ${isEditMode ? "updated" : "created"} feedback`);
      // Close modal first
      onClose();
      // Wait a moment for database to commit, then refresh
      setTimeout(() => {
        onSuccess?.();
      }, 300);
    } catch (err) {
      console.error("Failed to save feedback:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.error || "Failed to save feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose}>
          ✕
        </button>

        <h2>{isEditMode ? "Edit Feedback" : "Add Feedback"}</h2>
        <p className="feedback-modal-subtitle">Feedback for {candidateName}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="feedbackType">Feedback Type *</label>
            <select
              id="feedbackType"
              value={formData.feedbackType}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  feedbackType: e.target.value,
                  jobId: "",
                  skillName: "",
                });
              }}
              required
              disabled={isEditMode}
            >
              <option value="general">General Progress</option>
              <option value="job">Related to Job Application</option>
              <option value="skill">Related to Skill</option>
            </select>
          </div>

          {formData.feedbackType === "job" && (
            <div className="form-group">
              <label htmlFor="jobId">Job *</label>
              {loadingJobs ? (
                <p>Loading jobs...</p>
              ) : candidateJobs.length === 0 ? (
                <p className="form-hint">No jobs found for this candidate.</p>
              ) : (
                <select
                  id="jobId"
                  value={formData.jobId}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  required
                >
                  <option value="">Select a job...</option>
                  {candidateJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} at {job.company} ({job.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {formData.feedbackType === "skill" && (
            <div className="form-group">
              <label htmlFor="skillName">Skill *</label>
              {candidateSkills.length === 0 ? (
                <input
                  type="text"
                  id="skillName"
                  value={formData.skillName}
                  onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                  placeholder="Enter skill name..."
                  required
                />
              ) : (
                <select
                  id="skillName"
                  value={formData.skillName}
                  onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                  required
                >
                  <option value="">Select a skill...</option>
                  {candidateSkills.map((skill, idx) => (
                    <option key={idx} value={skill.name}>
                      {skill.name} ({skill.proficiency})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="content">Feedback Content *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter your feedback here..."
              rows={8}
              required
            />
          </div>

          {error && <div className="feedback-error">{error}</div>}

          <div className="feedback-modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving..." : isEditMode ? "Update Feedback" : "Add Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

