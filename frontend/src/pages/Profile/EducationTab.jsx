// src/pages/Profile/EducationTab.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import EducationSection from "../../components/EducationSection";
import EducationForm from "../../components/EducationForm";
import { FaGraduationCap, FaPlus } from "react-icons/fa";
import "./EducationTab.css";

export default function EducationTab() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);

  return (
    <div className="education-page">
      <div className="education-container">
        <div className="education-decoration education-decoration-1"></div>
        <div className="education-decoration education-decoration-2"></div>

        {/* Header Section */}
        <div className="education-header">
          <div className="education-header-title">
            <FaGraduationCap className="education-header-icon" />
            <h3>Education</h3>
          </div>
        </div>
        
        {!showForm && !editingEdu && (
          <div className="education-add-btn-wrapper">
            <button 
              className="education-add-btn" 
              onClick={() => setShowForm(true)}
            >
              <FaPlus />
              <span>Add Education</span>
            </button>
          </div>
        )}

        {/* Form Section */}
        {(showForm || editingEdu) && (
          <EducationForm 
            edu={editingEdu || {}}
            token={token} 
            onCancel={() => {
              setShowForm(false);
              setEditingEdu(null);
            }}
            onSaved={() => {
              setShowForm(false);
              setEditingEdu(null);
              window.dispatchEvent(new Event('educationUpdated'));
            }}
          />
        )}

        {/* Main Content */}
        {!showForm && !editingEdu && (
          <EducationSection 
            token={token} 
            onEdit={(edu) => setEditingEdu(edu)}
          />
        )}
      </div>
    </div>
  );
}
