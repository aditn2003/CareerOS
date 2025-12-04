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
  FaEnvelope, // ✅ Icon for Cover Letter// ✅ Icon for Professional Network
  FaHandshake, // ✅ Icon for Referrals
  FaCalendarAlt, // ✅ Icon for Networking Events
  FaUserGraduate, // ✅ Icon for Mentor
  FaUsers, // ✅ Icon for Networking (alternative to FaNetworkWired)
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

      <div className="navbar-title-container">
        <h1 className="navbar-title">CareerOS</h1>
        <p className="navbar-subtitle">Your Career Operating System</p>
      </div>

      {/* Nav Links */}
      <nav className="navbar-right">
        <NavLink to="/" end>
          <FaHome /> Home
        </NavLink>

        {authed ? (
          <>
            {/* ═══════════════════════════════════════════
                DOCUMENTS - Build Your Profile
            ═══════════════════════════════════════════ */}
            <NavLink to="/resume">
              <FaFileAlt /> Resume
            </NavLink>

            <NavLink to="/cover-letter">
              <FaEnvelope /> Cover Letter
            </NavLink>

            {/* ═══════════════════════════════════════════
                JOB SEARCH - Find & Match
            ═══════════════════════════════════════════ */}
            <NavLink to="/jobs">
              <FaBriefcase /> Jobs
            </NavLink>

            <NavLink to="/job-match">
              <FaStar /> Job Match
            </NavLink>

            {/* ═══════════════════════════════════════════
                INTERVIEWS - Prepare & Track
            ═══════════════════════════════════════════ */}
            <NavLink to="/interviews">
              <FaComments /> Interviews
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
            {/* ═══════════════════════════════════════════
                GROWTH - Network & Learn
            ═══════════════════════════════════════════ */}
            <NavLink to="/networking">
              <FaUsers /> Networking
            </NavLink>

            {showMentorButton && (
              <NavLink to="/mentor">
                <FaUserGraduate /> Mentor
              </NavLink>
            )}

            {/* ═══════════════════════════════════════════
                INSIGHTS - Track Progress
            ═══════════════════════════════════════════ */}
            <NavLink to="/statistics">
              <FaChartBar /> Statistics
            </NavLink>

            {/* 🌐 Network & Relationships (Professional Network + Referrals + Networking Events) */}
            <NavLink to="/network">
              <FaUsers /> Network
            </NavLink>

            

            {/* 👤 Profile */}
            <NavLink to="/archived">
              <FaArchive /> Archived
            </NavLink>

            {/* ═══════════════════════════════════════════
                ACCOUNT
            ═══════════════════════════════════════════ */}
            <NavLink to="/profile/info">
              <FaUser /> Profile
            </NavLink>

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