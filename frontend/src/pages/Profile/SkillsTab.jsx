// src/pages/Profile/SkillsTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import SkillsSection from "../../components/SkillsSection";
import { FaCode } from "react-icons/fa";
import "./SkillsTab.css";

export default function SkillsTab() {
  const { token } = useAuth();

  return (
    <div className="skills-page">
      <div className="skills-container">
        <div className="skills-decoration skills-decoration-1"></div>
        <div className="skills-decoration skills-decoration-2"></div>

        <div className="skills-header">
          <div className="skills-header-title">
            <FaCode className="skills-header-icon" />
            <div>
              <h3>Skills</h3>
              <p className="skills-subtitle">Add, edit, and categorize your technical and professional skills</p>
            </div>
          </div>
        </div>

        <SkillsSection token={token} />
      </div>
    </div>
  );
}
