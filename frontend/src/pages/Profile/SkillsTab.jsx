// src/pages/Profile/SkillsTab.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import SkillsSection from "../../components/SkillsSection";
import SkillsForm from "../../components/SkillsForm";
import { FaCode, FaPlus } from "react-icons/fa";
import "./SkillsTab.css";

export default function SkillsTab() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="skills-page">
      <div className="skills-container">
        <div className="skills-decoration skills-decoration-1"></div>
        <div className="skills-decoration skills-decoration-2"></div>

        {/* Header Section */}
        <div className="skills-header">
          <div className="skills-header-title">
            <FaCode className="skills-header-icon" />
            <h3>Skills</h3>
          </div>
        </div>
        
        {!showForm && (
          <div className="skills-add-btn-wrapper">
            <button 
              className="skills-add-btn" 
              onClick={() => setShowForm(true)}
            >
              <FaPlus />
              <span>Add Skill</span>
            </button>
          </div>
        )}

        {/* Form Section */}
        {showForm && (
          <SkillsForm 
            token={token} 
            onAdded={() => {
              setShowForm(false);
              // Trigger refresh in SkillsSection
              window.dispatchEvent(new Event('skillsUpdated'));
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Main Content */}
        {!showForm && (
          <SkillsSection token={token} />
        )}
      </div>
    </div>
  );
}
