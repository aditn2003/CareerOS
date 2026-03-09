import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  FaGraduationCap,
  FaUniversity,
  FaCalendarAlt,
  FaAward,
  FaTrophy,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaChartLine,
  FaStar,
} from "react-icons/fa";
import "../pages/Profile/EducationTab.css";

// Helper to format ISO date into readable form
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

// Helper to get duration
export function getDuration(startDate, endDate, currentlyEnrolled) {
  if (currentlyEnrolled) return "Present";
  if (!startDate || !endDate) return "";

  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = end.getFullYear() - start.getFullYear();

  if (years === 1) return "1 year";
  if (years > 1) return `${years} years`;
  return "Less than 1 year";
}

export default function EducationSection({ token, onEdit }) {
  const [education, setEducation] = useState([]);

  async function loadEducation() {
    try {
      const { data } = await api.get("/api/education", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEducation(data.education || []);
    } catch (err) {
      console.error("Error loading education:", err);
    }
  }

  async function deleteEducation(id) {
    if (!window.confirm("Delete this education entry?")) return;
    try {
      await api.delete(`/api/education/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadEducation();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete education entry");
    }
  }

  useEffect(() => {
    if (token) loadEducation();
  }, [token]);

  // Listen for education updates
  useEffect(() => {
    const handleUpdate = () => {
      loadEducation();
    };
    window.addEventListener("educationUpdated", handleUpdate);
    return () => window.removeEventListener("educationUpdated", handleUpdate);
  }, []);

  // Calculate statistics
  const totalEducation = education.length;
  const currentlyEnrolled = education.filter(
    (e) => e.currently_enrolled
  ).length;
  const avgGPA =
    education.length > 0 &&
    education.filter((e) => e.gpa && !e.gpa_private).length > 0
      ? (
          education
            .filter((e) => e.gpa && !e.gpa_private)
            .reduce((acc, e) => acc + parseFloat(e.gpa || 0), 0) /
          education.filter((e) => e.gpa && !e.gpa_private).length
        ).toFixed(2)
      : 0;
  const hasHonors = education.filter((e) => e.honors).length;

  return (
    <>
      {/* Statistics Section */}
      {education.length > 0 && (
        <div className="education-stats">
          <div className="education-stat-card">
            <FaGraduationCap className="education-stat-icon" />
            <div className="education-stat-content">
              <div className="education-stat-value">{totalEducation}</div>
              <div className="education-stat-label">Total Degrees</div>
            </div>
          </div>
          <div className="education-stat-card">
            <FaCheckCircle className="education-stat-icon" />
            <div className="education-stat-content">
              <div className="education-stat-value">{currentlyEnrolled}</div>
              <div className="education-stat-label">Currently Enrolled</div>
            </div>
          </div>
          <div className="education-stat-card">
            <FaChartLine className="education-stat-icon" />
            <div className="education-stat-content">
              <div className="education-stat-value">
                {avgGPA > 0 ? avgGPA : "N/A"}
              </div>
              <div className="education-stat-label">Avg GPA</div>
            </div>
          </div>
          <div className="education-stat-card">
            <FaTrophy className="education-stat-icon" />
            <div className="education-stat-content">
              <div className="education-stat-value">{hasHonors}</div>
              <div className="education-stat-label">With Honors</div>
            </div>
          </div>
        </div>
      )}

      {/* Education List */}
      {education.length === 0 ? (
        <div className="education-empty">
          <FaGraduationCap className="education-empty-icon" />
          <p>No education history yet.</p>
          <p className="education-empty-subtitle">
            Add your first education entry to get started building your academic
            profile
          </p>
        </div>
      ) : (
        <ul className="education-list">
          {education
            .sort((a, b) => {
              // Currently enrolled first, then sort by graduation date descending
              const aIsEnrolled = a.currently_enrolled;
              const bIsEnrolled = b.currently_enrolled;

              if (aIsEnrolled && !bIsEnrolled) return -1;
              if (!aIsEnrolled && bIsEnrolled) return 1;

              const dateA = new Date(a.graduation_date || "9999-12-31");
              const dateB = new Date(b.graduation_date || "9999-12-31");
              return dateB - dateA;
            })
            .map((e) => (
              <li key={e.id} className="education-card">
                <div className="education-card-header">
                  <div className="education-title-section">
                    <FaGraduationCap className="education-degree-icon" />
                    <div>
                      <span className="education-degree">{e.degree_type}</span>
                      {e.field_of_study && (
                        <span className="education-field">
                          {" "}
                          in {e.field_of_study}
                        </span>
                      )}
                      <div className="education-institution-row">
                        <FaUniversity className="education-institution-icon" />
                        <span className="education-institution">
                          {e.institution}
                        </span>
                      </div>
                    </div>
                  </div>
                  {e.currently_enrolled && (
                    <div className="education-current-badge">
                      <FaCheckCircle />
                      <span>Current</span>
                    </div>
                  )}
                </div>

                {(e.graduation_date || e.currently_enrolled) && (
                  <div className="education-meta">
                    <FaCalendarAlt className="education-meta-icon" />
                    <span>
                      {e.currently_enrolled
                        ? "Currently Enrolled"
                        : formatDate(e.graduation_date)}
                    </span>
                  </div>
                )}

                {e.gpa && !e.gpa_private && (
                  <div className="education-gpa">
                    <FaAward className="education-gpa-icon" />
                    <span>GPA: {e.gpa}</span>
                  </div>
                )}

                {e.honors && (
                  <div className="education-honors">
                    <div className="education-honors-header">
                      <FaTrophy />
                      <span>Honors & Achievements</span>
                    </div>
                    <p>{e.honors}</p>
                  </div>
                )}

                <div className="education-actions">
                  <button
                    className="education-btn-edit"
                    onClick={() => onEdit && onEdit(e)}
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  <button
                    className="education-btn-delete"
                    onClick={() => deleteEducation(e.id)}
                  >
                    <FaTrash />
                    <span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
