// src/components/NavBar.jsx
import React from "react";
import "./navbar.css";
import Logo from "./Logo";
import {
  FaHome,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaFileAlt,
  FaBriefcase,
  FaChartBar,
  FaArchive,
  FaStar,
  FaComments,
  FaEnvelope, // ✅ Icon for Cover Letter
  FaUserGraduate, // ✅ Icon for Mentor
} from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

export default function NavBar() {
  const { authed, logout } = useAuth();
  const { teamState } = useTeam() || {};
  const navigate = useNavigate();

  // Show Mentor button to anyone who has a team (admin, mentor, or candidate)
  // or if they're a candidate/member waiting to be part of a team
  const showMentorButton =
    teamState?.hasTeam ||
    teamState?.isMentor ||
    teamState?.isCandidate ||
    (teamState?.primaryTeam && teamState?.primaryTeam?.status);

  // 🔥 Custom logout handler to block Back button returning to protected pages
  const handleLogout = () => {
    logout(); // Removes token + clears auth context
    window.location.replace("/login"); // Prevents back button access
  };

  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <Logo size={80} />
      </div>

      <h1 className="navbar-title">ATS for Candidates</h1>

      {/* Nav Links */}
      <nav className="navbar-right">
        <NavLink to="/" end>
          <FaHome /> Home
        </NavLink>

        {authed ? (
          <>
            <NavLink to="/resume">
              <FaFileAlt /> Resume
            </NavLink>

            {/* ✅ NEW Cover Letter TAB */}
            <NavLink to="/cover-letter">
              <FaEnvelope /> Cover Letter
            </NavLink>

            <NavLink to="/jobs">
              <FaBriefcase /> Jobs
            </NavLink>

            {/* ⭐ JOB MATCH */}
            <NavLink to="/job-match">
              <FaStar /> Job Match
            </NavLink>

            {/* 📊 Statistics */}
            <NavLink to="/statistics">
              <FaChartBar /> Statistics
            </NavLink>

            {/* 🗄️ Archived */}
            <NavLink to="/archived">
              <FaArchive /> Archived
            </NavLink>

            {/* 🗨️ INTERVIEWS (includes Company Research & Salary Research) */}
            <NavLink to="/interviews">
              <FaComments /> Interviews
            </NavLink>

            {/* 👨‍🏫 Mentor */}
            {showMentorButton && (
              <NavLink to="/mentor">
                <FaUserGraduate /> Mentor
              </NavLink>
            )}

            {/* 👤 Profile */}
            <NavLink to="/profile/info">
              <FaUser /> Profile
            </NavLink>

            {/* 🚪 Logout */}
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">
              <FaSignInAlt /> Login
            </NavLink>

            <NavLink to="/register">
              <FaUserPlus /> Register
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}