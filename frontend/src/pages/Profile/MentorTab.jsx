import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import FeedbackThreads from "../../components/FeedbackThreads";
import FeedbackModal from "../../components/FeedbackModal";
import "./MentorTab.css";
import "../Profile/TeamManagement.css";

export default function MentorTab() {
  const { teamState, refreshTeam } = useTeam();
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const teamId = teamState?.primaryTeam?.id;
  const inviteStatus = teamState?.primaryTeam?.status;
  const teamName = teamState?.primaryTeam?.name;
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const handleAcceptInvite = async () => {
    if (!teamId) return;
    setAccepting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/api/team/${teamId}/accept`);
      setSuccess("Invite accepted! Welcome to the team.");
      await refreshTeam();
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (teamState?.status === "loading") {
    return (
      <section className="profile-box">
        <h3>Mentor Space</h3>
        <p>Loading your mentoring details...</p>
      </section>
    );
  }

  if (inviteStatus === "invited") {
    return (
      <section className="profile-box mentor-invite-pending">
        <h3>Team Invitation</h3>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        <div className="invite-card">
          <div className="invite-icon">📬</div>
          <h4>You've been invited to join a team!</h4>
          <p className="invite-team-name">{teamName}</p>
          <p className="invite-description">
            Accept this invitation to join the team and start collaborating with
            mentors and other members.
          </p>
          <button
            className="btn-primary accept-invite-btn"
            onClick={handleAcceptInvite}
            disabled={accepting}
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </button>
        </div>
      </section>
    );
  }

  if (inviteStatus === "requested") {
    return (
      <section className="profile-box mentor-invite-pending">
        <h3>Join Request Pending</h3>
        <div className="invite-card" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)" }}>
          <div className="invite-icon">⏳</div>
          <h4>Your join request is pending approval</h4>
          <p className="invite-team-name">{teamName}</p>
          <p className="invite-description">
            A mentor or admin will review your request to join this team. You'll be notified once a decision is made.
          </p>
        </div>
      </section>
    );
  }

  if (isMentor || isAdmin) {
    return <MentorDashboardView teamId={teamId} teamName={teamName} />;
  }

  if (isCandidate && teamState?.hasTeam) {
    return <CandidateMentorView teamId={teamId} teamName={teamName} />;
  }

  return (
    <section className="profile-box">
      <h3>Mentor Overview</h3>
      <p>No mentor tools available for this account.</p>
    </section>
  );
}

// ============================================================
// CANDIDATE VIEW: Display feedback from mentors
// ============================================================
function CandidateMentorView({ teamId, teamName }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFeedback = useCallback(async () => {
    if (!teamId) {
      setFeedbackList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      console.log(`[Feedback] Candidate loaded ${data?.feedback?.length || 0} feedback entries for team ${teamId}`);
      setFeedbackList(data?.feedback || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      console.error("Error response:", err.response?.data);
      setError("Failed to load feedback.");
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFeedbackTypeLabel = (type) => {
    switch (type) {
      case "job": return "Job Feedback";
      case "skill": return "Skill Feedback";
      default: return "General Feedback";
    }
  };

  return (
    <section className="profile-box">
      <h3>Your Mentor Space</h3>
      {teamName && (
        <p>
          <strong>Team:</strong> {teamName}
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div style={{ marginTop: "1rem" }}>
        <FeedbackThreads teamId={teamId} />
      </div>
    </section>
  );
}

// ============================================================
// MENTOR VIEW: Dashboard with feedback management
// ============================================================
function MentorDashboardView({ teamId, teamName }) {
  const { teamState } = useTeam();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null); // { candidateId, candidateName }
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/members`);
      // Filter to show only candidates (mentors can give feedback to candidates)
      const candidateList = (data?.members || []).filter(
        (m) => m.role === "candidate" && m.status === "active"
      );
      setMembers(candidateList);
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [teamId]);

  const loadFeedback = useCallback(async () => {
    if (!teamId) {
      setFeedbackList([]);
      return;
    }
    setLoadingFeedback(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      setFeedbackList(data?.feedback || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setFeedbackList([]);
    } finally {
      setLoadingFeedback(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadMembers();
      loadFeedback();
    }
  }, [teamId, loadMembers, loadFeedback]);

  return (
    <section className="profile-box">
      <h3>Mentor Dashboard</h3>
      {teamName && (
        <p>
          <strong>Team:</strong> {teamName}
        </p>
      )}
      <p>
        Provide feedback to candidates and manage your mentoring activities.
      </p>

      {/* Add Feedback Section */}
      {members.length > 0 && (
        <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
          <h4>Add Feedback</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {members.map((member) => {
              const fullName = [member.firstName, member.lastName]
                .filter(Boolean)
                .join(" ") || member.email || "Unnamed";
              return (
                <button
                  key={member.userId}
                  onClick={() =>
                    setFeedbackModal({
                      candidateId: member.userId,
                      candidateName: fullName,
                    })
                  }
                  style={{
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    fontWeight: "500",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#7c3aed")}
                  onMouseLeave={(e) => (e.target.style.background = "#8b5cf6")}
                >
                  Add Feedback for {fullName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback Threads */}
      {teamId && (
        <div style={{ marginTop: "1.5rem" }}>
          <FeedbackThreads teamId={teamId} />
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && teamId && (
        <FeedbackModal
          teamId={teamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          onClose={() => setFeedbackModal(null)}
          onSuccess={() => {
            loadFeedback();
            setFeedbackModal(null);
          }}
        />
      )}
    </section>
  );
}

