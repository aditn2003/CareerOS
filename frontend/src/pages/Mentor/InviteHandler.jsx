// src/pages/Mentor/InviteHandler.jsx
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import "./InviteHandler.css";

export default function InviteHandler() {
  const { teamState, refreshTeam } = useTeam();
  const navigate = useNavigate();
  const inviteStatus = teamState?.primaryTeam?.status;
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const handleAcceptInvite = useCallback(async () => {
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
        navigate("/mentor/feedback");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }, [teamId, refreshTeam, navigate]);

  if (inviteStatus === "invited") {
    return (
      <section className="profile-box mentor-invite-pending">
        <h2>Team Invitation</h2>
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
        <h2>Join Request Pending</h2>
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

  // If no invite status, show empty state
  return (
    <section className="profile-box">
      <h2>Mentor Space</h2>
      <p>No pending invitations.</p>
    </section>
  );
}

