// src/components/ProfileNavBar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import "./ProfileNavBar.css";
import { useTeam } from "../contexts/TeamContext";

export default function ProfileNavBar() {
  const { teamState } = useTeam() || {};
  const tabs = [
    { key: "info", label: "My Info" },
    { key: "employment", label: "Employment" },
    { key: "skills", label: "Skills" },
    { key: "education", label: "Education" },
    { key: "certifications", label: "Certifications" },
    { key: "projects", label: "Projects" },
    { key: "dashboard", label: "Dashboard" },
    { key: "danger", label: "Danger Zone" },
  ];

  // Show Mentor tab to anyone who has a team (admin, mentor, or candidate)
  // or if they're a candidate/member waiting to be part of a team
  const showMentorTab =
    teamState?.hasTeam ||
    teamState?.isMentor ||
    teamState?.isCandidate ||
    (teamState?.primaryTeam && teamState?.primaryTeam?.status);
  // Show Team Management tab for admin, mentors, and candidates
  const showTeamTab = teamState?.isAdmin || teamState?.isMentor || teamState?.isCandidate;

  if (showMentorTab) {
    tabs.push({ key: "mentor", label: "Mentor" });
  }
  if (showTeamTab) {
    tabs.push({ key: "team", label: "Team Management" });
  }

  return (
    <nav className="profile-navbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/profile/${tab.key}`}
          className={({ isActive }) =>
            `profile-tab ${isActive ? "active" : ""}`
          }
        >
          {tab.label}
        </NavLink>
      ))}

      {/* 🟣 Add Saved Resumes Button */}
      <NavLink
        to="/profile/saved-resumes"
        className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}
      >
        Saved Resumes
      </NavLink>
    </nav>
  );
}
