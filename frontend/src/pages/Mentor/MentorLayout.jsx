// src/pages/Mentor/MentorLayout.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MentorNavBar from "../../components/MentorNavBar";
import FeedbackTab from "./FeedbackTab";
import TaskManagementTab from "./TaskManagementTab";
import ActivityFeedTab from "./ActivityFeedTab";
import SharedJobsTab from "./SharedJobsTab";
import TeamAnalyticsTab from "./TeamAnalyticsTab";
import { useAuth } from "../../contexts/AuthContext";
import { useTeam } from "../../contexts/TeamContext";
import InviteHandler from "./InviteHandler";
import "./MentorLayout.css";

export default function MentorLayout() {
  const { authed } = useAuth();
  const { teamState } = useTeam() || {};

  if (!authed) {
    return (
      <section className="profile-box">
        <p>You must log in to view your mentor space.</p>
      </section>
    );
  }

  // Handle loading state
  if (teamState?.status === "loading") {
    return (
      <section className="profile-box">
        <h2>Mentor Space</h2>
        <p>Loading your mentoring details...</p>
      </section>
    );
  }

  // Handle invite status - show invite handler directly
  const inviteStatus = teamState?.primaryTeam?.status;

  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const hasTeam = teamState?.hasTeam;

  // If user has invite/request status, show invite handler (without tabs)
  if (inviteStatus === "invited" || inviteStatus === "requested") {
    return <InviteHandler />;
  }

  // Only show tabs if user has team access
  if (!hasTeam && !isMentor && !isAdmin && !isCandidate) {
    return (
      <section className="profile-box">
        <h2>Mentor Space</h2>
        <p>No mentor tools available for this account.</p>
      </section>
    );
  }

  return (
    <section className="profile-section">
      <h2>Mentor Space</h2>

      {/* 🧭 Top navigation bar for tabs */}
      <MentorNavBar />

      {/* Nested tab routes */}
      <Routes>
        {/* Default → Feedback tab */}
        <Route index element={<Navigate to="/mentor/feedback" replace />} />
        <Route path="feedback" element={<FeedbackTab />} />
        <Route path="tasks" element={<TaskManagementTab />} />
        <Route path="shared-jobs" element={<SharedJobsTab />} />
        <Route path="analytics" element={<TeamAnalyticsTab />} />
        <Route path="activity" element={<ActivityFeedTab />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/mentor/feedback" replace />} />
      </Routes>
    </section>
  );
}

