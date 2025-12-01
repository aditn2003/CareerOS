// src/components/MentorNavBar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import "./ProfileNavBar.css"; // Reuse the same styles

export default function MentorNavBar() {
  const tabs = [
    { key: "feedback", label: "Feedback" },
    { key: "tasks", label: "Task Management" },
    // More tabs can be added here in the future
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

