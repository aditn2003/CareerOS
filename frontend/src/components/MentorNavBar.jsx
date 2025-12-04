// src/components/MentorNavBar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useTeam } from "../contexts/TeamContext";
import {
  FaComment,
  FaTasks,
  FaBriefcase,
  FaChartLine,
  FaRss,
} from "react-icons/fa";
import "../pages/Mentor/MentorLayout.css";

export default function MentorNavBar() {
  const { teamState } = useTeam() || {};
  const isMentor = teamState?.isMentor;
  const isAdmin = teamState?.isAdmin;
  
  // Activity Feed is only for mentors and admins
  const showActivityFeed = isMentor || isAdmin;
  
  // Group tabs by category
  const navGroups = [
    {
      label: "COMMUNICATION",
      tabs: [
        { key: "feedback", label: "Feedback", icon: FaComment, category: "feedback" },
      ],
    },
    {
      label: "MANAGEMENT",
      tabs: [
        { key: "tasks", label: "Tasks", icon: FaTasks, category: "tasks" },
        { key: "shared-jobs", label: "Jobs", icon: FaBriefcase, category: "jobs" },
      ],
    },
    {
      label: "ANALYTICS",
      tabs: [
        { key: "analytics", label: "Analytics", icon: FaChartLine, category: "analytics" },
        ...(showActivityFeed ? [{ key: "activity", label: "Activity", icon: FaRss, category: "activity" }] : []),
      ],
    },
  ];

  return (
    <div className="mentor-nav-container">
      {navGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="mentor-nav-group">
          <div className="mentor-nav-group-label">{group.label}</div>
          <div className="mentor-nav-group-tabs">
            {group.tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <NavLink
                  key={tab.key}
                  to={`/mentor/${tab.key}`}
                  className={({ isActive }) =>
                    `mentor-nav-tab ${tab.category} ${isActive ? "active" : ""}`
                  }
                >
                  <IconComponent className="mentor-tab-icon" />
                  <span className="mentor-tab-text">{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

