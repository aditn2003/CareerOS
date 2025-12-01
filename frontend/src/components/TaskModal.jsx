import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import "./FeedbackModal.css"; // Reuse feedback modal styles

export default function TaskModal({
  teamId,
  candidateId = null, // null for create (will select), ID for edit mode
  candidateName,
  taskId = null, // null for create, ID for edit
  existingTask = null,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    candidateId: existingTask?.candidate_id || candidateId || "",
    title: existingTask?.title || "",
    description: existingTask?.description || "",
    jobId: existingTask?.job_id || "",
    skillName: existingTask?.skill_name || "",
    dueDate: existingTask?.due_date
      ? new Date(existingTask.due_date).toISOString().split("T")[0]
      : "",
  });
  const [candidates, setCandidates] = useState([]);
  const [candidateJobs, setCandidateJobs] = useState([]);
  const [candidateSkills, setCandidateSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const isEditMode = taskId !== null;
  const selectedCandidateId = formData.candidateId ? parseInt(formData.candidateId) : null;

  // Load candidates list (for mentors creating new tasks)
  useEffect(() => {
    if (!isEditMode && teamId) {
      loadCandidates();
    }
  }, [teamId, isEditMode]);

  // Load candidate data (jobs/skills) when candidate is selected or changed
  useEffect(() => {
    if (selectedCandidateId && teamId) {
      loadCandidateData();
    }
  }, [selectedCandidateId, teamId]);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/members`);
      const candidateMembers = data.members?.filter(
        (m) => m.role === "candidate" && m.status === "active"
      ) || [];
      setCandidates(candidateMembers);
    } catch (err) {
      console.error("Failed to load candidates:", err);
      setError("Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadCandidateData = async () => {
    if (!selectedCandidateId || !teamId) return;

    // Load jobs
    setLoadingJobs(true);
    try {
      const { data } = await api.get(
        `/api/team/${teamId}/members/${selectedCandidateId}/profile`
      );
      if (data?.jobs) {
        setCandidateJobs(data.jobs);
      }
      if (data?.skills) {
        setCandidateSkills(data.skills);
      }
    } catch (err) {
      console.error("Failed to load candidate data:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        candidateId: parseInt(formData.candidateId),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        jobId: formData.jobId ? parseInt(formData.jobId) || null : null,
        skillName: formData.skillName.trim() || null,
        dueDate: formData.dueDate || null,
      };

      if (isEditMode) {
        await api.patch(`/api/team/${teamId}/tasks/${taskId}`, payload);
      } else {
        await api.post(`/api/team/${teamId}/tasks`, payload);
      }

      console.log(`[Task] Successfully ${isEditMode ? "updated" : "created"} task`);
      onClose();
      setTimeout(() => {
        onSuccess?.();
      }, 300);
    } catch (err) {
      console.error("Failed to save task:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.error || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidate = candidates.find(
    (c) => c.userId === parseInt(formData.candidateId)
  );
  const getCandidateDisplayName = (candidate) => {
    if (!candidate) return null;
    const fullName = [candidate.firstName, candidate.lastName]
      .filter(Boolean)
      .join(" ") || null;
    return fullName || candidate.email || "Unknown";
  };

  const modalContent = (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose}>
          ✕
        </button>

        <h2>{isEditMode ? "Edit Task" : "Create Task"}</h2>
        <p className="feedback-modal-subtitle">
          {isEditMode
            ? `Task for ${candidateName || "Candidate"}`
            : "Assign a new task to a candidate"}
        </p>

        <form onSubmit={handleSubmit}>
          {!isEditMode && (
            <div className="form-group">
              <label htmlFor="candidateId">Candidate *</label>
              {loadingCandidates ? (
                <p>Loading candidates...</p>
              ) : candidates.length === 0 ? (
                <p className="form-hint">No candidates available in this team.</p>
              ) : (
                <select
                  id="candidateId"
                  value={formData.candidateId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      candidateId: e.target.value,
                      jobId: "",
                      skillName: "",
                    })
                  }
                  required
                >
                  <option value="">Select a candidate...</option>
                  {candidates.map((candidate) => {
                    const fullName = [candidate.firstName, candidate.lastName]
                      .filter(Boolean)
                      .join(" ") || null;
                    const displayName = fullName || candidate.email || "Unknown";
                    return (
                      <option key={candidate.userId} value={candidate.userId}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Update resume for X job"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task details..."
              rows={5}
            />
          </div>

          {selectedCandidateId && (
            <>
              <div className="form-group">
                <label htmlFor="jobId">Link to Job (Optional)</label>
                {loadingJobs ? (
                  <p>Loading jobs...</p>
                ) : candidateJobs.length === 0 ? (
                  <p className="form-hint">
                    {selectedCandidate
                      ? `No jobs found for ${selectedCandidate.name || selectedCandidate.email}.`
                      : "No jobs available."}
                  </p>
                ) : (
                  <select
                    id="jobId"
                    value={formData.jobId}
                    onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  >
                    <option value="">None</option>
                    {candidateJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company} ({job.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="skillName">Link to Skill (Optional)</label>
                {candidateSkills.length === 0 ? (
                  <input
                    type="text"
                    id="skillName"
                    value={formData.skillName}
                    onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                    placeholder="Enter skill name..."
                  />
                ) : (
                  <select
                    id="skillName"
                    value={formData.skillName}
                    onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                  >
                    <option value="">None</option>
                    {candidateSkills.map((skill, idx) => (
                      <option key={idx} value={skill.name}>
                        {skill.name} ({skill.proficiency})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="dueDate">Due Date (Optional)</label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {error && <div className="feedback-error">{error}</div>}

          <div className="feedback-modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving..." : isEditMode ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render modal using Portal to document.body to escape parent constraints
  return createPortal(modalContent, document.body);
}

