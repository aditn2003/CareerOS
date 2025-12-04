import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import "./FeedbackModal.css";

export default function FeedbackModal({
  teamId,
  candidateId,
  candidateName,
  feedbackId = null, // null for create, ID for edit
  existingFeedback = null,
  taskId = null, // For task-linked feedback
  taskTitle = null, // Task title for display
  jobId: materialJobId = null, // For application material feedback
  materialType = null, // "resume" or "cover_letter" for application material feedback
  materialJobTitle = null, // Job title for display in application material feedback
  onClose,
  onSuccess,
}) {
  // When taskId is provided, feedbackType must be "task" and cannot be changed
  // When materialType is provided, feedbackType must be "application_material" and cannot be changed
  const isTaskFeedback = taskId != null && taskId !== "" && String(taskId).trim() !== "";
  const isApplicationMaterialFeedback = materialType != null && materialType !== "";
  
  // For new feedback with taskId, always use "task". For application material, use "application_material". For editing, use existing type. Otherwise default to "general"
  const initialFeedbackType = isTaskFeedback && !existingFeedback 
    ? "task" 
    : isApplicationMaterialFeedback && !existingFeedback 
    ? "application_material" 
    : (existingFeedback?.feedbackType || "general");
  
  const [formData, setFormData] = useState({
    feedbackType: initialFeedbackType,
    content: existingFeedback?.content || "",
    jobId: existingFeedback?.jobId || materialJobId || "",
    skillName: existingFeedback?.skillName || "",
    taskId: existingFeedback?.taskId || taskId || "",
    materialType: existingFeedback?.materialType || materialType || "",
  });
  const [candidateJobs, setCandidateJobs] = useState([]);
  const [candidateSkills, setCandidateSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const isEditMode = feedbackId !== null;

  // Ensure feedbackType is "task" when taskId is provided, or "application_material" when materialType is provided
  useEffect(() => {
    if (isTaskFeedback && !isEditMode && formData.feedbackType !== "task") {
      setFormData(prev => ({
        ...prev,
        feedbackType: "task",
        taskId: taskId || prev.taskId,
      }));
    } else if (isApplicationMaterialFeedback && !isEditMode && formData.feedbackType !== "application_material") {
      setFormData(prev => ({
        ...prev,
        feedbackType: "application_material",
        jobId: materialJobId || prev.jobId,
        materialType: materialType || prev.materialType,
      }));
    }
  }, [taskId, materialType, materialJobId, isTaskFeedback, isApplicationMaterialFeedback, isEditMode, formData.feedbackType]);

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
      // Ensure feedbackType is correct based on what's provided
      const finalFeedbackType = (taskId !== null && taskId !== undefined && taskId !== "") 
        ? "task" 
        : (materialType !== null && materialType !== undefined && materialType !== "") 
        ? "application_material" 
        : formData.feedbackType;
      
      const payload = {
        candidateId,
        feedbackType: finalFeedbackType,
        content: formData.content.trim(),
        jobId: finalFeedbackType === "job" || finalFeedbackType === "application_material" 
          ? parseInt(materialJobId || formData.jobId) || null 
          : null,
        skillName: finalFeedbackType === "skill" ? formData.skillName.trim() || null : null,
        taskId: finalFeedbackType === "task" ? parseInt(taskId || formData.taskId) || null : null,
        materialType: finalFeedbackType === "application_material" ? (materialType || formData.materialType) : null,
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

  const modalContent = (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose}>
          ✕
        </button>

        <h2>{isEditMode ? "Edit Feedback" : "Add Feedback"}</h2>
        <p className="feedback-modal-subtitle">
          Feedback for {candidateName}
          {taskTitle && ` - Task: ${taskTitle}`}
          {materialJobTitle && materialType && (
            ` - ${materialType === "resume" ? "Resume" : "Cover Letter"} for ${materialJobTitle}`
          )}
        </p>

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
                  taskId: e.target.value === "task" ? (taskId || "") : "",
                });
              }}
              required
              disabled={isEditMode || isTaskFeedback || isApplicationMaterialFeedback} // Disable if editing, task-related, or application material feedback
            >
              <option value="general">General Progress</option>
              <option value="task">Task Related</option>
              <option value="job">Related to Job Application</option>
              <option value="skill">Related to Skill</option>
              <option value="application_material">Application Material Related</option>
            </select>
            {isTaskFeedback && (
              <p className="form-hint" style={{ marginTop: "0.5rem", color: "#6b7280", fontStyle: "italic" }}>
                This feedback is linked to a task and cannot be changed.
              </p>
            )}
            {isApplicationMaterialFeedback && (
              <p className="form-hint" style={{ marginTop: "0.5rem", color: "#6b7280", fontStyle: "italic" }}>
                This feedback is for application materials ({materialType === "resume" ? "Resume" : "Cover Letter"}) and cannot be changed.
              </p>
            )}
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

  // Render modal using Portal to document.body to escape parent constraints
  return createPortal(modalContent, document.body);
}

