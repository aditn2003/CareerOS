// src/pages/Profile/EducationTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import EducationSection from "../../components/EducationSection";
import { FaGraduationCap } from "react-icons/fa";
import "./EducationTab.css";

export default function EducationTab() {
  const { token } = useAuth();

  return (
    <div className="education-page">
      <div className="education-container">
        <div className="education-decoration education-decoration-1"></div>
        <div className="education-decoration education-decoration-2"></div>

        <div className="education-header">
          <div className="education-header-title">
            <FaGraduationCap className="education-header-icon" />
            <div>
              <h3>Education</h3>
              <p className="education-subtitle">Record your academic background, degrees, and honors</p>
            </div>
          </div>
        </div>

        <EducationSection token={token} />
      </div>
    </div>
  );
}
