// src/components/NavBar.jsx
import React, { useState } from "react";
import "./navbar.css";
import Logo from "./Logo";
import DecryptedText from "./DecryptedText";
import LightPillar from "./LightPillar";
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
  FaEnvelope, // ✅ Icon for Cover Letter
  FaHandshake, // ✅ Icon for Referrals
  FaCalendarAlt, // ✅ Icon for Networking Events
  FaUserGraduate, // ✅ Icon for Mentor
  FaUsers, // ✅ Icon for Network
  FaServer, // ✅ Icon for API Monitoring
  FaBars,
  FaTimes,
  FaExternalLinkAlt,
  FaQuestionCircle, // ✅ Icon for Help/FAQ
  FaRocket, // ✅ Icon for Getting Started
} from "react-icons/fa";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

export default function NavBar() {
  const { authed, logout } = useAuth();
  const { teamState } = useTeam() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Show Mentor button to anyone who has a team (admin, mentor, or candidate)
  // or if they're a candidate/member waiting to be part of a team
  const showMentorButton =
    teamState?.hasTeam ||
    teamState?.isMentor ||
    teamState?.isCandidate ||
    (teamState?.primaryTeam && teamState?.primaryTeam?.status);

  // Show Admin section only to mentor/admin users
  const showAdminSection = teamState?.isMentor || teamState?.isAdmin;

  // 🔥 Custom logout handler to block Back button returning to protected pages
  const handleLogout = () => {
    logout(); // Removes token + clears auth context
    window.location.replace("/login"); // Prevents back button access
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Navigation sections for overlay menu
  const navSections = authed
    ? [
        {
          title: "Documents",
          links: [
            { to: "/resume", label: "Resume", icon: FaFileAlt },
            { to: "/cover-letter", label: "Cover Letter", icon: FaEnvelope },
            { to: "/docs-management", label: "Doc Management", icon: FaFileAlt },
          ],
        },
        {
          title: "Job Search",
          links: [
            { to: "/jobs", label: "Jobs", icon: FaBriefcase },
            { to: "/job-match", label: "Job Match", icon: FaStar },
          ],
        },
        {
          title: "Growth",
          links: [
            { to: "/interviews", label: "Interviews", icon: FaComments },
            ...(showMentorButton
              ? [{ to: "/mentor", label: "Mentor", icon: FaUserGraduate }]
              : []),
            { to: "/network", label: "Network", icon: FaUsers },
            { to: "/statistics", label: "Statistics", icon: FaChartBar },
          ],
        },
        {
          title: "Account",
          links: [
            { to: "/profile/info", label: "Profile", icon: FaUser },
            { to: "/", label: "Home", icon: FaHome },
          ],
          isAccount: true,
        },
        // Admin section - only show to mentor/admin users
        ...(showAdminSection
          ? [
              {
                title: "Admin",
                links: [
                  { to: "/admin/api-monitoring", label: "API Monitoring", icon: FaServer },
                ],
              },
            ]
          : []),
        {
          title: "Help",
          links: [
            { to: "/getting-started", label: "Getting Started", icon: FaRocket },
            { to: "/faq", label: "FAQ", icon: FaQuestionCircle },
          ],
        },
      ]
    : [
        {
          title: "Get Started",
          links: [
            { to: "/login", label: "Login", icon: FaSignInAlt },
            { to: "/register", label: "Register", icon: FaUserPlus },
          ],
        },
        {
          title: "Help",
          links: [
            { to: "/getting-started", label: "Getting Started", icon: FaRocket },
            { to: "/faq", label: "FAQ", icon: FaQuestionCircle },
          ],
        },
      ];

  return (
    <div className="navbar-wrapper">
      <header className={`navbar ${isMenuOpen ? 'navbar-expanded' : ''}`}>
        {/* Light Pillar Background - memoized to prevent re-renders */}
        <div className="navbar-light-pillar">
          <LightPillar
            key="navbar-light-pillar" // Stable key prevents re-mounting
            topColor="#7c3aed"
            bottomColor="#a78bfa"
            intensity={0.8}
            rotationSpeed={0.2}
            glowAmount={0.003}
            pillarWidth={2.8}
            pillarHeight={0.45}
            noiseIntensity={0.3}
            mixBlendMode="normal"
            pillarRotation={45}
          />
        </div>
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate("/")}>
          <Logo size={80} />
        </div>

        <div className="navbar-title-container">
          <h1 className="navbar-title">
            CareerOS
          </h1>
          <p className="navbar-subtitle">
            YOUR CAREER OPERATING SYSTEM
          </p>
        </div>

        {/* Menu Toggle Button */}
        <button className="navbar-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Expandable Menu Inside Navbar */}
        {isMenuOpen && (
          <div className="navbar-menu-content">
            {/* Navigation Cards */}
            <div className="navbar-overlay-cards">
              {navSections.map((section, index) => (
                <div key={index} className="navbar-overlay-card spotlight-card">
                  <h2 className="navbar-overlay-card-title">{section.title}</h2>
                  <ul className="navbar-overlay-card-links">
                    {section.links.map((link, linkIndex) => {
                      const Icon = link.icon;
                      return (
                        <li key={linkIndex}>
                          <NavLink
                            to={link.to}
                            onClick={closeMenu}
                            className={({ isActive }) =>
                              `navbar-overlay-link ${isActive ? "active" : ""}`
                            }
                            end={link.to === "/"}
                          >
                            <span>{link.label}</span>
                            <FaExternalLinkAlt className="navbar-overlay-link-icon" />
                          </NavLink>
                        </li>
                      );
                    })}
                    {section.isAccount && (
                      <li>
                        <button
                          onClick={() => {
                            closeMenu();
                            handleLogout();
                          }}
                          className="navbar-overlay-link navbar-overlay-logout"
                        >
                          <span>Logout</span>
                          <FaExternalLinkAlt className="navbar-overlay-link-icon" />
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
