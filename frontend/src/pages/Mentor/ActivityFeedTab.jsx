// src/pages/Mentor/ActivityFeedTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import { useNavigate } from "react-router-dom";
import {
  FaBriefcase,
  FaCheckCircle,
  FaSync,
  FaUser,
  FaFileAlt,
  FaUsers,
  FaExclamationTriangle,
  FaClipboardList,
  FaCalendarAlt,
  FaComments,
  FaTasks,
  FaArrowRight,
} from "react-icons/fa";
import "./ActivityFeedTab.css";

export default function ActivityFeedTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({
    totalCandidates: 0,
    candidatesNeedingAttention: 0,
    recentApplications: 0,
    upcomingDeadlines: 0,
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [candidatesNeedingAttention, setCandidatesNeedingAttention] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActivityFeed = useCallback(async () => {
    if (!teamId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/team/${teamId}/activity`);
      setActivities(data?.activities || []);
      setSummary(data?.summary || {
        totalCandidates: 0,
        candidatesNeedingAttention: 0,
        recentApplications: 0,
        upcomingDeadlines: 0,
      });
      setUpcomingDeadlines(data?.upcomingDeadlines || []);
      setCandidatesNeedingAttention(data?.candidatesNeedingAttention || []);
    } catch (err) {
      console.error("Failed to load activity feed:", err);
      setError(err.response?.data?.error || "Failed to load activity feed.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadActivityFeed();
    // Refresh activity feed every 30 seconds
    const interval = setInterval(loadActivityFeed, 30000);
    return () => clearInterval(interval);
  }, [loadActivityFeed]);

  // Only show for mentors and admins
  if (!isMentor && !isAdmin) {
    return (
      <section className="profile-box">
        <h3>Activity Feed</h3>
        <p>You don't have permission to view the activity feed.</p>
      </section>
    );
  }

  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Activity Feed</h3>
        <p>No team found. Please join a team to view activity.</p>
      </section>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "job_application":
        return <FaBriefcase />;
      case "task_completion":
        return <FaCheckCircle />;
      case "status_change":
        return <FaSync />;
      case "profile_update":
        return <FaUser />;
      default:
        return <FaFileAlt />;
    }
  };

  const getActivityIconColor = (type) => {
    switch (type) {
      case "job_application":
        return "#3b82f6"; // Blue
      case "task_completion":
        return "#10b981"; // Green
      case "status_change":
        return "#8b5cf6"; // Purple
      case "profile_update":
        return "#6366f1"; // Indigo
      default:
        return "#6b7280"; // Gray
    }
  };


  if (loading) {
    return (
      <section className="profile-box">
        <h3>Activity Feed</h3>
        <p>Loading activity feed...</p>
      </section>
    );
  }

  return (
    <section className="profile-box activity-feed-container">
      <div className="activity-feed-header">
        <h3>Activity Feed</h3>
        {teamName && (
          <p className="activity-team-name">
            <strong>Team:</strong> {teamName}
          </p>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Summary Widgets */}
      <div className="activity-summary-widgets">
        <div className="summary-widget">
          <div className="widget-icon"><FaUsers /></div>
          <div className="widget-content">
            <div className="widget-value">{summary.totalCandidates}</div>
            <div className="widget-label">Total Candidates</div>
          </div>
        </div>

        <div className="summary-widget attention">
          <div className="widget-icon"><FaExclamationTriangle /></div>
          <div className="widget-content">
            <div className="widget-value">{summary.candidatesNeedingAttention}</div>
            <div className="widget-label">Need Attention</div>
          </div>
        </div>

        <div className="summary-widget">
          <div className="widget-icon"><FaClipboardList /></div>
          <div className="widget-content">
            <div className="widget-value">{summary.recentApplications}</div>
            <div className="widget-label">Recent Applications</div>
          </div>
        </div>

        <div className="summary-widget">
          <div className="widget-icon"><FaCalendarAlt /></div>
          <div className="widget-content">
            <div className="widget-value">{summary.upcomingDeadlines}</div>
            <div className="widget-label">Upcoming Deadlines</div>
          </div>
        </div>
      </div>

      <div className="activity-feed-layout">
        {/* Main Activity Feed */}
        <div className="activity-feed-main">
          <h4>Recent Activity</h4>
          {activities.length === 0 ? (
            <div className="activity-empty-state">
              <p>No recent activity to display.</p>
            </div>
          ) : (
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta">
                      <span className="activity-candidate">{activity.candidateName}</span>
                      <span className="activity-time">{formatDate(activity.timestamp)}</span>
                      <span className="activity-full-time" title={formatFullDate(activity.timestamp)}>
                        {formatFullDate(activity.timestamp)}
                      </span>
                    </div>
                    {activity.details && (
                      <div className="activity-details">
                        {activity.details.jobTitle && (
                          <span className="activity-detail-badge">
                            {activity.details.company}
                          </span>
                        )}
                        {activity.details.status && (
                          <span className="activity-detail-badge status">
                            {activity.details.status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar with Quick Actions */}
        <div className="activity-feed-sidebar">
          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="activity-sidebar-section">
              <h4><FaCalendarAlt /> Upcoming Deadlines</h4>
              <div className="deadlines-list">
                {upcomingDeadlines.slice(0, 5).map((deadline) => {
                  const deadlineDate = new Date(deadline.deadline);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                  const isOverdue = deadlineDate < today;
                  const isUrgent = !isOverdue && daysUntil <= 3;

                  return (
                    <div
                      key={deadline.jobId}
                      className={`deadline-item ${isOverdue ? "overdue" : ""} ${isUrgent ? "urgent" : ""}`}
                    >
                      <div className="deadline-content">
                        <div className="deadline-title">{deadline.title}</div>
                        <div className="deadline-company">{deadline.company}</div>
                        <div className="deadline-candidate">{deadline.candidateName}</div>
                        <div className="deadline-date">
                          {deadlineDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: deadlineDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
                          })}
                          {isOverdue && <><FaExclamationTriangle /> Overdue</>}
                          {isUrgent && !isOverdue && ` (${daysUntil} day${daysUntil > 1 ? "s" : ""} left)`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidates Needing Attention */}
          {candidatesNeedingAttention.length > 0 && (
            <div className="activity-sidebar-section">
              <h4><FaExclamationTriangle /> Need Attention</h4>
              <div className="attention-list">
                {candidatesNeedingAttention.map((candidate) => (
                  <div key={candidate.candidateId} className="attention-item">
                    <span className="attention-candidate">{candidate.candidateName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="activity-sidebar-section">
            <h4>Quick Actions</h4>
            <div className="quick-actions">
              <button
                className="quick-action-btn"
                onClick={() => navigate("/mentor/feedback")}
              >
                <FaComments /> View Feedback
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate("/mentor/tasks")}
              >
                <FaTasks /> Manage Tasks
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate("/profile/team")}
              >
                <FaUsers /> Team Management
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

