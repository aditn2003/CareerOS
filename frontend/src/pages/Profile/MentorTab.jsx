import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import "./MentorTab.css";

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
    return (
      <section className="profile-box">
        <h3>Mentor Dashboard</h3>
        <p>
          Manage your team and review mentoring activities in Team Management.
        </p>
      </section>
    );
  }

  if (isCandidate && teamState?.hasTeam) {
    return (
      <section className="profile-box">
        <h3>Your Mentor Space</h3>
        <p>
          This is where mentor notes, invitations, and guidance will show up.
          Stay tuned!
        </p>
        {teamName && (
          <div className="team-info">
            <p>
              <strong>Team:</strong> {teamName}
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="profile-box">
      <h3>Mentor Overview</h3>
      <p>No mentor tools available for this account.</p>
    </section>
  );
}

