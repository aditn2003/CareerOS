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
  FaStar,
  FaComments,
  FaEnvelope, // ✅ Icon for Cover Letter// ✅ Icon for Professional Network
  FaHandshake, // ✅ Icon for Referrals
  FaCalendarAlt, // ✅ Icon for Networking Events
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

            <NavLink to="/docs-management">
              <FaFileAlt /> Doc Management
            </NavLink>

           

           

            {/* 🗨️ INTERVIEWS (includes Company Research & Salary Research) */}
            <NavLink to="/interviews">
              <FaComments /> Interviews
            </NavLink>

            {/* 👨‍🏫 Mentor */}
            {/* ═══════════════════════════════════════════
                GROWTH - Network & Learn
            ═══════════════════════════════════════════ */}

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
            </NavLink>https://github.com/aditn2003/Aandsz-Forces-ATS-CS490/pull/85/conflict?name=frontend%252Fsrc%252Fcomponents%252FNavBar.jsx&ancestor_oid=5c622f190e4d88dcf9572dead7d335292532b0f9&base_oid=68d036ba86ea7b40c6c35f382ec8d491ec28ce48&head_oid=e063892fa4c4893c80497b7d075816139218d786

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
