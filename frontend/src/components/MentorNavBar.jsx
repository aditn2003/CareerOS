// src/components/MentorNavBar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useTeam } from "../contexts/TeamContext";
import "./ProfileNavBar.css"; // Reuse the same styles

export default function MentorNavBar() {
  const { teamState } = useTeam() || {};
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  
  // Activity Feed is only for mentors and admins
  const showActivityFeed = isMentor || isAdmin;
  
  const tabs = [
    { key: "feedback", label: "Feedback" },
    { key: "tasks", label: "Task Management" },
    { key: "shared-jobs", label: "Job Posts" },
    { key: "analytics", label: "Team Analytics" },
    ...(showActivityFeed ? [{ key: "activity", label: "Activity Feed" }] : []),
  ];

  return (
    <nav className="profile-navbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/mentor/${tab.key}`}
          className={({ isActive }) =>
            `profile-tab ${isActive ? "active" : ""}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

