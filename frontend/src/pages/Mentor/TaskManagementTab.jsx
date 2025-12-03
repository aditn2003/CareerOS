import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import TaskModal from "../../components/TaskModal";
import FeedbackModal from "../../components/FeedbackModal";
import "./TaskManagementTab.css";

export default function TaskManagementTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.primaryTeam?.id;
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const currentUserId = teamState?.userId;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, in_progress, completed
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null); // { candidateId, candidateName, taskId }

  const loadTasks = useCallback(async () => {
    if (!teamId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/team/${teamId}/tasks`);
      setTasks(data?.tasks || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setError("Failed to load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await api.delete(`/api/team/${teamId}/tasks/${taskId}`);
      await loadTasks();
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert(err.response?.data?.error || "Failed to delete task");
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    setUpdatingStatus(taskId);
    try {
      await api.patch(`/api/team/${teamId}/tasks/${taskId}`, { status: newStatus });
      await loadTasks();
    } catch (err) {
      console.error("Failed to update task status:", err);
      alert(err.response?.data?.error || "Failed to update task status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleModalSuccess = () => {
    loadTasks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#10b981"; // green
      case "in_progress":
        return "#f59e0b"; // amber
      case "pending":
        return "#6b7280"; // gray
      default:
        return "#6b7280";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true;
    return task.status === statusFilter;
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Task Management</h3>
        <p>No team found. Please join a team to view tasks.</p>
      </section>
    );
  }

  const canCreateTasks = isMentor || isAdmin;

  return (
    <section className="profile-box task-management-container">
      <div className="task-management-header">
        <h3>Task Management</h3>
        {canCreateTasks && (
          <button className="btn-primary" onClick={handleCreateTask}>
            + Create Task
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Status Filter */}
      <div className="task-status-filters">
        <button
          className={`status-filter-btn ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All ({tasks.length})
        </button>
        <button
          className={`status-filter-btn ${statusFilter === "pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`status-filter-btn ${statusFilter === "in_progress" ? "active" : ""}`}
          onClick={() => setStatusFilter("in_progress")}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          className={`status-filter-btn ${statusFilter === "completed" ? "active" : ""}`}
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="task-empty-state">
          <p>
            {statusFilter === "all"
              ? "No tasks found."
              : `No ${statusFilter.replace("_", " ")} tasks found.`}
          </p>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-card-header">
                <div className="task-title-row">
                  <h4 className="task-title">{task.title}</h4>
                  <span
                    className="task-status-badge"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                {canCreateTasks && (
                  <div className="task-actions">
                    <button
                      className="task-action-btn"
                      onClick={() => handleEditTask(task)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="task-action-btn"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {task.description && (
                <p className="task-description">{task.description}</p>
              )}

              <div className="task-meta">
                <div className="task-meta-row">
                  {isMentor || isAdmin ? (
                    <>
                      <span className="task-meta-item">
                        <strong>Assigned to:</strong> {task.candidate_name}
                      </span>
                      <span className="task-meta-item">
                        <strong>Assigned by:</strong> {task.mentor_name}
                      </span>
                    </>
                  ) : (
                    <span className="task-meta-item">
                      <strong>Assigned by:</strong> {task.mentor_name}
                    </span>
                  )}
                </div>

                <div className="task-meta-row">
                  {task.job_title && (
                    <span className="task-badge task-job-badge">
                      📋 {task.job_title} at {task.job_company}
                    </span>
                  )}
                  {task.skill_name && (
                    <span className="task-badge task-skill-badge">
                      🎯 {task.skill_name}
                    </span>
                  )}
                </div>

                <div className="task-meta-row">
                  <span className="task-meta-item">
                    <strong>Created:</strong> {formatDate(task.created_at)}
                  </span>
                  {task.due_date && (
                    <span
                      className={`task-meta-item ${isOverdue(task.due_date, task.status) ? "overdue" : ""}`}
                    >
                      <strong>Due:</strong> {formatDate(task.due_date)}
                      {isOverdue(task.due_date, task.status) && " ⚠️ Overdue"}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Update - ONLY for candidates */}
              {isCandidate && task.candidate_id === currentUserId && (
                <div className="task-status-actions">
                  {task.status === "pending" && (
                    <button
                      className="task-action-button task-action-start"
                      onClick={() => handleUpdateStatus(task.id, "in_progress")}
                      disabled={updatingStatus === task.id}
                    >
                      {updatingStatus === task.id ? (
                        <>
                          <span className="spinner"></span>
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          <span>Start Task</span>
                        </>
                      )}
                    </button>
                  )}
                  {task.status === "in_progress" && (
                    <button
                      className="task-action-button task-action-complete"
                      onClick={() => handleUpdateStatus(task.id, "completed")}
                      disabled={updatingStatus === task.id}
                    >
                      {updatingStatus === task.id ? (
                        <>
                          <span className="spinner"></span>
                          <span>Completing...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Mark Complete</span>
                        </>
                      )}
                    </button>
                  )}
                  {task.status === "completed" && (
                    <div className="task-completed-indicator">
                      <span className="completed-icon">✓</span>
                      <span>Task Completed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Button - ONLY for mentors (admins cannot create feedback, only edit/delete) */}
              {isMentor && (
                <div className="task-feedback-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setFeedbackModal({
                      candidateId: task.candidate_id,
                      candidateName: task.candidate_name,
                      taskId: task.id,
                      taskTitle: task.title,
                    })}
                    title="Add feedback on this task"
                  >
                    💬 Add Feedback
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          teamId={teamId}
          candidateId={editingTask?.candidate_id || null}
          candidateName={editingTask?.candidate_name}
          taskId={editingTask?.id || null}
          existingTask={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          teamId={teamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          taskId={feedbackModal.taskId}
          taskTitle={feedbackModal.taskTitle}
          onClose={() => setFeedbackModal(null)}
          onSuccess={() => {
            setFeedbackModal(null);
            // Feedback is linked to task, no need to reload tasks
          }}
        />
      )}
    </section>
  );
}
