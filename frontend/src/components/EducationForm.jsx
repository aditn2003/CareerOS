import React, { useState } from "react";
import { api } from "../api";
import { 
  FaGraduationCap, 
  FaUniversity, 
  FaAward,
  FaCalendarAlt,
  FaCheckCircle,
  FaLock,
  FaTrophy,
  FaCheck,
  FaTimes,
  FaPlus
} from "react-icons/fa";
import "./EducationForm.css";

export default function EducationForm({ token, edu, onSaved, onCancel }) {
  const [form, setForm] = useState(
    edu || {
      institution: "",
      degree_type: "",
      field_of_study: "",
      graduation_date: "",
      currently_enrolled: false,
      education_level: "",
      gpa: "",
      gpa_private: false,
      honors: "",
    }
  );

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (edu?.id) {
        await api.put(`/api/education/${edu.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/api/education", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
    } catch (err) {
      console.error("Error saving education:", err);
      alert("Failed to save education entry.");
    }
  }

  return (
    <div className="education-form">
      <div className="education-form-header">
        <FaGraduationCap className="education-form-header-icon" />
        <h4>{edu ? "Edit Education" : "Add Education"}</h4>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="education-form-grid">
          <div className="education-form-group full-width">
            <label htmlFor="edu-institution" className="education-form-label">
              <FaUniversity />
              <span>Institution <span className="required">*</span></span>
            </label>
            <input
              id="edu-institution"
              className="education-form-input"
              placeholder="e.g., MIT, Stanford University..."
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              aria-label="Educational institution"
              aria-required="true"
            />
          </div>

          <div className="education-form-group">
            <label htmlFor="edu-degree" className="education-form-label">
              <FaGraduationCap />
              <span>Degree <span className="required">*</span></span>
            </label>
            <input
              id="edu-degree"
              className="education-form-input"
              placeholder="e.g., BS, MS, PhD..."
              value={form.degree_type}
              onChange={(e) => setForm({ ...form, degree_type: e.target.value })}
              aria-label="Degree type"
              aria-required="true"
            />
          </div>

          <div className="education-form-group">
            <label htmlFor="edu-field" className="education-form-label">
              <FaAward />
              <span>Field of Study <span className="required">*</span></span>
            </label>
            <input
              id="edu-field"
              className="education-form-input"
              placeholder="e.g., Computer Science..."
              value={form.field_of_study}
              onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
              aria-label="Field of study"
              aria-required="true"
            />
          </div>

          <div className="education-form-group">
            <label htmlFor="edu-level" className="education-form-label">
              <FaGraduationCap />
              <span>Education Level</span>
            </label>
            <select
              id="edu-level"
              className="education-form-select"
              value={form.education_level}
              onChange={(e) => setForm({ ...form, education_level: e.target.value })}
              aria-label="Education level"
            >
              <option value="">Select level</option>
              <option>High School</option>
              <option>Associate</option>
              <option>Bachelor's</option>
              <option>Master's</option>
              <option>PhD</option>
            </select>
          </div>

          <div className="education-form-group">
            <label htmlFor="edu-graduation-date" className="education-form-label">
              <FaCalendarAlt />
              <span>Graduation Date</span>
            </label>
            <input
              type="date"
              id="edu-graduation-date"
              className="education-form-input"
              value={form.graduation_date || ""}
              onChange={(e) => setForm({ ...form, graduation_date: e.target.value })}
              aria-label="Graduation date"
            />
          </div>

          <div className="education-form-group">
            <label htmlFor="edu-gpa" className="education-form-label">
              <FaAward />
              <span>GPA (optional)</span>
            </label>
            <input
              type="number"
              id="edu-gpa"
              className="education-form-input"
              step="0.01"
              max="4"
              min="0"
              placeholder="e.g., 3.8"
              value={form.gpa || ""}
              onChange={(e) => setForm({ ...form, gpa: e.target.value })}
              aria-label="Grade point average"
            />
          </div>
        </div>

        <div className="education-form-checkbox-group" onClick={() => setForm({ ...form, currently_enrolled: !form.currently_enrolled })}>
          <input
            type="checkbox"
            id="edu-currently-enrolled"
            className="education-form-checkbox"
            checked={form.currently_enrolled}
            onChange={(e) =>
              setForm({ ...form, currently_enrolled: e.target.checked })
            }
            aria-label="Currently enrolled"
          />
          <label htmlFor="edu-currently-enrolled" className="education-form-checkbox-label">
            <FaCheckCircle style={{ marginRight: "0.5rem", color: "#6366f1" }} />
            Currently Enrolled
          </label>
        </div>

        <div className="education-form-checkbox-group" onClick={() => setForm({ ...form, gpa_private: !form.gpa_private })}>
          <input
            type="checkbox"
            id="edu-gpa-private"
            className="education-form-checkbox"
            checked={form.gpa_private}
            onChange={(e) =>
              setForm({ ...form, gpa_private: e.target.checked })
            }
            aria-label="Hide GPA from public view"
          />
          <label htmlFor="edu-gpa-private" className="education-form-checkbox-label">
            <FaLock style={{ marginRight: "0.5rem", color: "#6366f1" }} />
            Hide GPA (private)
          </label>
        </div>

        <div className="education-form-group full-width">
          <label htmlFor="edu-honors" className="education-form-label">
            <FaTrophy />
            <span>Honors / Achievements</span>
          </label>
          <textarea
            id="edu-honors"
            className="education-form-textarea"
            placeholder="List any honors, awards, or achievements..."
            value={form.honors}
            onChange={(e) => setForm({ ...form, honors: e.target.value })}
            aria-label="Honors and achievements"
          />
        </div>

        <div className="education-form-actions">
          <button type="submit" className="education-form-btn education-form-btn-primary">
            <FaCheck />
            <span>{edu ? "Save Changes" : "Add Education"}</span>
          </button>
          <button type="button" className="education-form-btn education-form-btn-secondary" onClick={onCancel}>
            <FaTimes />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
}
