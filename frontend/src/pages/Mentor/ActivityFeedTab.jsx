// src/pages/Mentor/ActivityFeedTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import { useNavigate } from "react-router-dom";
import TeamDropdown from "../../components/TeamDropdown";
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
  FaRss,
  FaAngleLeft,
  FaAngleRight,
} from "react-icons/fa";
import "./ActivityFeedTab.css";

export default function ActivityFeedTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.activeTeam?.id;
  const teamName = teamState?.activeTeam?.name;
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Reset to page 1 when activities change
  useEffect(() => {
    setCurrentPage(1);
  }, [activities.length]);

  // Calculate pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of activity list
    const activityMain = document.querySelector('.activity-feed-main');
    if (activityMain) {
      activityMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Only show for mentors and admins
  if (!isMentor && !isAdmin) {
    return (
      <div className="activity-feed-container">
        <div className="activity-feed-empty">
          <FaRss className="activity-feed-empty-icon" />
          <h3 className="activity-feed-empty-title">Access Restricted</h3>
          <p className="activity-feed-empty-text">
            You don't have permission to view the activity feed.
          </p>
        </div>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="activity-feed-container">
        <div className="activity-feed-empty">
          <FaRss className="activity-feed-empty-icon" />
          <h3 className="activity-feed-empty-title">No Team Found</h3>
          <p className="activity-feed-empty-text">
            Please join a team to view activity feed.
          </p>
        </div>
      </div>
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
      <div className="activity-feed-container">
        <div className="activity-feed-loading">
          <div className="activity-feed-loading-spinner"></div>
        <p>Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed-container">
      <div className="activity-feed-header">
        <div className="activity-feed-header-content">
          <h2 className="activity-feed-main-title">Activity Feed</h2>
          <p className="activity-feed-main-subtitle">
            Real-time updates and insights from your team
          </p>
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", width: "100%" }}>
            <TeamDropdown />
          </div>
        </div>
      </div>

      {error && <div className="activity-feed-error-banner">{error}</div>}

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
            <>
              <div className="activity-list">
                {currentActivities.map((activity) => (
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
              
              {/* Pagination Controls */}
              {activities.length > 0 && (
                <div className="activity-pagination">
                  <div className="pagination-info">
                    Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length} activities
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        type="button"
                      >
                        <FaAngleLeft className="pagination-icon" />
                      </button>
                      
                      <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                                aria-label={`Go to page ${page}`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="pagination-ellipsis">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        type="button"
                      >
                        <FaAngleRight className="pagination-icon" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
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
                  
                  // Determine urgency level
                  let urgencyClass = "";
                  if (isOverdue) {
                    urgencyClass = "overdue";
                  } else if (daysUntil === 0) {
                    urgencyClass = "due-today"; // Red for due today
                  } else if (daysUntil === 1) {
                    urgencyClass = "critical"; // Light red for 1 day left
                  } else if (daysUntil === 2) {
                    urgencyClass = "very-urgent"; // Red-orange for 2 days left
                  } else if (daysUntil === 3) {
                    urgencyClass = "urgent"; // Yellow for 3 days left
                  }
                  // No class for 4+ days = normal purple theme

                  return (
                    <div
                      key={deadline.jobId}
                      className={`deadline-item ${urgencyClass}`}
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
                          {isOverdue && (
                            <span className="deadline-urgency-badge overdue-badge">
                              <FaExclamationTriangle /> Past Due
                            </span>
                          )}
                          {!isOverdue && daysUntil === 0 && (
                            <span className="deadline-urgency-badge due-today-badge">Due Today</span>
                          )}
                          {!isOverdue && daysUntil === 1 && (
                            <span className="deadline-urgency-badge critical-badge">1 day left</span>
                          )}
                          {!isOverdue && daysUntil === 2 && (
                            <span className="deadline-urgency-badge very-urgent-badge">2 days left</span>
                          )}
                          {!isOverdue && daysUntil === 3 && (
                            <span className="deadline-urgency-badge urgent-badge">3 days left</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidates Needing Attention */}
            <div className="activity-sidebar-section">
              <h4><FaExclamationTriangle /> Need Attention</h4>
            {candidatesNeedingAttention.length > 0 ? (
              <div className="attention-list">
                {candidatesNeedingAttention.map((candidate) => {
                  const getReasonLabel = (reason) => {
                    switch (reason) {
                      case 'overdue_task':
                        return 'Overdue tasks';
                      case 'stale_pending_task':
                        return 'Pending tasks > 7 days';
                      case 'upcoming_job_deadline':
                        return 'Job deadline within 3 days';
                      case 'overdue_job_deadline':
                        return 'Overdue job deadline';
                      default:
                        return reason;
                    }
                  };

                  return (
                  <div key={candidate.candidateId} className="attention-item">
                      <div className="attention-content">
                        <div className="attention-candidate-name">{candidate.candidateName}</div>
                        <div className="attention-reasons">
                          {candidate.reasons && candidate.reasons.length > 0 ? (
                            <ul className="attention-reasons-list">
                              {candidate.reasons.map((reason, idx) => (
                                <li key={idx}>{getReasonLabel(reason)}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="attention-no-reason">Needs attention</span>
                          )}
                  </div>
              </div>
            </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.5rem' }}>
                No candidates need attention at this time.
              </p>
          )}
          </div>

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
    </div>
  );
}

