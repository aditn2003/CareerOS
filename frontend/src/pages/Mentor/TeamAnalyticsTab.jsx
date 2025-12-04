// src/pages/Mentor/TeamAnalyticsTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import {
  FaTrophy,
  FaMedal,
  FaStar,
  FaCheckCircle,
  FaUsers,
  FaChartLine,
  FaFire,
  FaAward,
  FaChartBar,
  FaUserSecret,
  FaHandshake,
  FaNetworkWired,
  FaArrowUp,
  FaClock,
  FaTasks,
  FaCalendarCheck,
  FaPhone,
} from "react-icons/fa";
import "./TeamAnalyticsTab.css";

export default function TeamAnalyticsTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;

  const [milestones, setMilestones] = useState([]);
  const [celebrations, setCelebrations] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [successPatterns, setSuccessPatterns] = useState([]);
  const [collaborationMetrics, setCollaborationMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("milestones"); // milestones, performance, patterns

  const loadAnalytics = useCallback(async () => {
    if (!teamId) {
      setMilestones([]);
      setCelebrations([]);
      setPerformanceData([]);
      setSuccessPatterns([]);
      setCollaborationMetrics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load all analytics data in parallel
      const [milestonesRes, performanceRes, patternsRes] = await Promise.all([
        api.get(`/api/team/${teamId}/analytics/milestones`).catch(() => ({ data: { milestones: [], celebrations: [] } })),
        api.get(`/api/team/${teamId}/analytics/performance`).catch(() => ({ data: [] })),
        api.get(`/api/team/${teamId}/analytics/patterns`).catch(() => ({ data: { patterns: [], collaboration: null } })),
      ]);

      // Set milestones and celebrations
      const milestonesData = milestonesRes.data?.milestones || [];
      const celebrationsData = milestonesRes.data?.celebrations || [];
      setMilestones(milestonesData);
      setCelebrations(celebrationsData);

      // Set performance data
      const perfData = performanceRes.data || [];
      setPerformanceData(perfData);

      // Set success patterns and collaboration metrics
      const patternsData = patternsRes.data?.patterns || [];
      const collabData = patternsRes.data?.collaboration || null;
      setSuccessPatterns(patternsData);
      setCollaborationMetrics(collabData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to load team analytics.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getMilestoneIcon = (iconType) => {
    switch (iconType) {
      case "check":
        return <FaCheckCircle className="milestone-icon check" />;
      case "briefcase":
        return <FaMedal className="milestone-icon briefcase" />;
      case "star":
        return <FaStar className="milestone-icon star" />;
      case "trophy":
        return <FaTrophy className="milestone-icon trophy" />;
      case "calendar-check":
        return <FaCalendarCheck className="milestone-icon calendar-check" />;
      case "phone":
        return <FaPhone className="milestone-icon phone" />;
      default:
        return <FaTrophy className="milestone-icon default" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!teamId) {
    return (
      <div className="team-analytics-container">
        <div className="team-analytics-empty">
          <FaChartLine className="team-analytics-empty-icon" />
          <h3 className="team-analytics-empty-title">No Team Found</h3>
          <p className="team-analytics-empty-text">
            Please join a team to view analytics and insights.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="team-analytics-container">
        <div className="team-analytics-loading">
          <div className="team-analytics-loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-analytics-container">
        <div className="team-analytics-error-banner">{error}</div>
      </div>
    );
  }

  const getPerformanceStatusColor = (status) => {
    switch (status) {
      case "high_performer":
        return "#10b981";
      case "good_performer":
        return "#3b82f6";
      case "improving":
        return "#f59e0b";
      case "getting_started":
        return "#9ca3af";
      default:
        return "#6b7280";
    }
  };

  const getPerformanceStatusLabel = (status) => {
    switch (status) {
      case "high_performer":
        return "High Performer";
      case "good_performer":
        return "Good Performer";
      case "improving":
        return "Improving";
      case "getting_started":
        return "Getting Started";
      default:
        return "Getting Started";
    }
  };

  return (
    <div className="team-analytics-container">
      <div className="team-analytics-header">
        <div className="team-analytics-header-content">
          <h2 className="team-analytics-main-title">Team Analytics & Insights</h2>
          <p className="team-analytics-main-subtitle">
            Track milestones, celebrate achievements, and analyze team performance
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="analytics-tabs">
        <button
          className={`analytics-tab ${activeView === "milestones" ? "active" : ""}`}
          onClick={() => setActiveView("milestones")}
        >
          <FaTrophy /> Milestones & Celebrations
        </button>
        <button
          className={`analytics-tab ${activeView === "performance" ? "active" : ""}`}
          onClick={() => setActiveView("performance")}
        >
          <FaChartBar /> Performance Comparison
        </button>
        <button
          className={`analytics-tab ${activeView === "patterns" ? "active" : ""}`}
          onClick={() => setActiveView("patterns")}
        >
          <FaNetworkWired /> Success Patterns
        </button>
      </div>

      {/* Milestone Achievements Section */}
      {activeView === "milestones" && (
        <>
      <div className="milestones-section">
        <div className="section-header">
          <FaTrophy className="section-icon" />
          <h4>Milestone Achievements</h4>
        </div>

        {milestones.length === 0 ? (
          <div className="empty-state">
            <FaAward className="empty-icon" />
            <p>No milestones yet. Keep working towards your goals!</p>
          </div>
        ) : (
          <div className="milestones-grid">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="milestone-card">
                <div className="milestone-header">
                  {getMilestoneIcon(milestone.icon)}
                  <div className="milestone-info">
                    <h5 className="milestone-title">{milestone.title}</h5>
                    <p className="milestone-candidate">{milestone.candidateName}</p>
                  </div>
                </div>
                <p className="milestone-description">{milestone.description}</p>
                <div className="milestone-footer">
                  <span className="milestone-date">{formatDate(milestone.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Celebrations Section */}
      <div className="celebrations-section">
        <div className="section-header">
          <FaFire className="section-icon celebration" />
          <h4>Team Celebrations</h4>
        </div>

        {celebrations.length === 0 ? (
          <div className="empty-state">
            <FaUsers className="empty-icon" />
            <p>No team celebrations yet. Achieve milestones together!</p>
          </div>
        ) : (
          <div className="celebrations-list">
            {celebrations.map((celebration) => (
              <div key={celebration.id} className="celebration-card">
                <div className="celebration-header">
                  <div className="celebration-icon-wrapper">
                    <FaFire className="celebration-icon" />
                  </div>
                  <div className="celebration-content">
                    <h5 className="celebration-title">{celebration.title}</h5>
                    <p className="celebration-description">{celebration.description}</p>
                    {celebration.participants && celebration.participants.length > 0 && (
                      <div className="celebration-participants">
                        <FaUsers className="participants-icon" />
                        <span>
                          {celebration.participants.length} team member
                          {celebration.participants.length !== 1 ? "s" : ""} involved
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Performance Comparison Section */}
      {activeView === "performance" && (
        <div className="performance-section">
          <div className="section-header">
            <FaChartBar className="section-icon" />
            <h4>Team Performance Comparison</h4>
            {!isMentor && !isAdmin && (
              <div className="anonymized-badge">
                <FaUserSecret /> Anonymized Benchmarking
              </div>
            )}
          </div>
          <p className="section-description">
            {isMentor || isAdmin
              ? "Compare performance metrics across team members to identify best practices and provide targeted support."
              : "Anonymized benchmarking motivates and identifies best practices. Compare performance metrics without revealing individual identities."}
          </p>

          {performanceData.length === 0 ? (
            <div className="empty-state">
              <FaChartBar className="empty-icon" />
              <p>No performance data available yet.</p>
            </div>
          ) : (
            <div className="performance-comparison">
              <div className="performance-stats-summary">
                <div className="stat-card">
                  <FaTasks className="stat-icon" />
                  <div className="stat-content">
                    <span className="stat-value">{performanceData.reduce((sum, m) => sum + m.tasksCompleted, 0)}</span>
                    <span className="stat-label">Total Tasks Completed</span>
                  </div>
                </div>
                <div className="stat-card">
                  <FaArrowUp className="stat-icon" />
                  <div className="stat-content">
                    <span className="stat-value">
                      {(() => {
                        const membersWithFeedback = performanceData.filter(m => m.feedbackScore !== null && m.feedbackScore !== undefined);
                        if (membersWithFeedback.length === 0) return "N/A";
                        return (
                          membersWithFeedback.reduce((sum, m) => sum + m.feedbackScore, 0) /
                          membersWithFeedback.length
                        ).toFixed(1);
                      })()}
                    </span>
                    <span className="stat-label">Avg Feedback Score</span>
                  </div>
                </div>
                <div className="stat-card">
                  <FaClock className="stat-icon" />
                  <div className="stat-content">
                    <span className="stat-value">
                      {(
                        performanceData.reduce((sum, m) => sum + m.avgCompletionTime, 0) /
                        performanceData.length
                      ).toFixed(1)} days
                    </span>
                    <span className="stat-label">Avg Completion Time</span>
                  </div>
                </div>
              </div>

              <div className="performance-table-container">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th>Tasks Completed</th>
                      <th>On-Time Rate</th>
                      <th>Avg Completion Time</th>
                      <th>Job Applications</th>
                      <th>Skills Improved</th>
                      <th>Feedback Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((member) => (
                      <tr key={member.id}>
                        <td className="member-name">
                          {member.candidateName ? (
                            // Show actual name for mentors/admins
                            <>{member.candidateName}</>
                          ) : (
                            // Show anonymized ID for candidates
                            <>
                              <FaUserSecret className="anonymized-icon" />
                              {member.anonymizedId}
                            </>
                          )}
                        </td>
                        <td>{member.tasksCompleted}</td>
                        <td>
                          {member.tasksWithDueDate > 0
                            ? `${Math.round((member.tasksOnTime / member.tasksWithDueDate) * 100)}%`
                            : member.tasksCompleted > 0
                            ? "N/A"
                            : "—"}
                        </td>
                        <td>
                          {member.avgCompletionTime !== null && member.avgCompletionTime !== undefined && member.avgCompletionTime > 0
                            ? `${member.avgCompletionTime} days`
                            : member.tasksCompleted > 0
                            ? "N/A"
                            : "—"}
                        </td>
                        <td>{member.jobApplications}</td>
                        <td>{member.skillsImproved}</td>
                        <td>
                          {member.feedbackScore !== null && member.feedbackScore !== undefined
                            ? (
                              <div className="score-badge">
                                {member.feedbackScore.toFixed(1)}
                                <FaStar className="score-star" />
                              </div>
                            )
                            : "—"}
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getPerformanceStatusColor(member.status) }}
                          >
                            {getPerformanceStatusLabel(member.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Patterns & Collaboration Section */}
      {activeView === "patterns" && (
        <div className="patterns-section">
          <div className="section-header">
            <FaNetworkWired className="section-icon" />
            <h4>Success Patterns & Collaboration</h4>
          </div>
          <p className="section-description">
            View team success patterns and collaboration effectiveness
          </p>

          {/* Collaboration Metrics */}
          {collaborationMetrics && (
            <div className="collaboration-metrics">
              <h5 className="subsection-title">
                <FaHandshake className="subsection-icon" />
                Collaboration Effectiveness
              </h5>
              <div className="collaboration-stats">
                <div className="collab-stat-card">
                  <div className="collab-stat-value">{collaborationMetrics.teamCollaborationScore}</div>
                  <div className="collab-stat-label">Team Collaboration Score</div>
                  <div className="collab-stat-trend">
                    <FaArrowUp className="trend-icon" />
                    {collaborationMetrics.collaborationTrend}
                  </div>
                </div>
                <div className="collab-stat-card">
                  <div className="collab-stat-value">{collaborationMetrics.peerFeedbackExchanges}</div>
                  <div className="collab-stat-label">Peer Feedback Exchanges</div>
                </div>
                <div className="collab-stat-card">
                  <div className="collab-stat-value">{collaborationMetrics.sharedJobs}</div>
                  <div className="collab-stat-label">Shared Jobs</div>
                </div>
                <div className="collab-stat-card">
                  <div className="collab-stat-value">{collaborationMetrics.activeParticipationRate}%</div>
                  <div className="collab-stat-label">Active Participation Rate</div>
                </div>
              </div>

              <div className="top-collaborators">
                <h6>Top Collaborators</h6>
                <div className="collaborators-list">
                  {collaborationMetrics.topCollaborators.map((collab, idx) => (
                    <div key={idx} className="collaborator-item">
                      <span className="collaborator-rank">#{idx + 1}</span>
                      <span className="collaborator-name">{collab.member}</span>
                      <span className="collaborator-contributions">
                        {collab.contributions} contributions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Success Patterns */}
          <div className="success-patterns">
            <h5 className="subsection-title">
              <FaChartLine className="subsection-icon" />
              Identified Success Patterns
            </h5>
            {successPatterns.length === 0 ? (
              <div className="empty-state">
                <FaChartLine className="empty-icon" />
                <p>No success patterns identified yet.</p>
              </div>
            ) : (
              <div className="patterns-list">
                {successPatterns.map((pattern) => (
                  <div key={pattern.id} className="pattern-card">
                    <div className="pattern-header">
                      <h6 className="pattern-title">{pattern.pattern}</h6>
                      <div className="pattern-badges">
                        <span className={`pattern-badge frequency-${pattern.frequency.toLowerCase()}`}>
                          {pattern.frequency} Frequency
                        </span>
                        <span className={`pattern-badge impact-${pattern.impact.toLowerCase()}`}>
                          {pattern.impact} Impact
                        </span>
                      </div>
                    </div>
                    <p className="pattern-description">{pattern.description}</p>
                    {pattern.examples && pattern.examples.length > 0 && (
                      <div className="pattern-examples">
                        <strong>Examples: </strong>
                        {pattern.examples.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

