// src/pages/Mentor/FeedbackTab.jsx
import React from "react";
import { useTeam } from "../../contexts/TeamContext";
import FeedbackThreads from "../../components/FeedbackThreads";

export default function FeedbackTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;

  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Feedback</h3>
        <p>No team found. Please join a team to view feedback.</p>
      </section>
    );
  }

  return (
    <section className="profile-box">
      <h3>Feedback</h3>
      {teamName && (
        <p>
          <strong>Team:</strong> {teamName}
        </p>
      )}
      
      <div style={{ marginTop: "1rem" }}>
        <FeedbackThreads teamId={teamId} />
      </div>
    </section>
  );
}

