// src/pages/Profile/EmploymentTab.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import EmploymentForm from "../../components/EmploymentForm";
import { 
  FaBriefcase, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaFileAlt,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaChartLine,
  FaClock,
  FaAward
} from "react-icons/fa";
import "./EmploymentTab.css";

export default function EmploymentTab() {
  const { token } = useAuth();
  const [employment, setEmployment] = useState([]);
  const [employmentForm, setEmploymentForm] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch employment history from backend
  async function loadEmployment() {
    try {
      setLoading(true);
      const { data } = await api.get("/api/employment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployment(data.employment || []);
    } catch (e) {
      console.error("❌ Failed to load employment:", e);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Delete entry
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/api/employment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Employment entry deleted successfully!");
      loadEmployment();
    } catch (err) {
      alert("❌ Could not delete employment entry.");
    }
  }

  // ✅ Duration helper (same as before)
  function getDuration(start, end) {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    if (years && remMonths)
      return `${years} yr${years > 1 ? "s" : ""} ${remMonths} mo${
        remMonths > 1 ? "s" : ""
      }`;
    if (years) return `${years} yr${years > 1 ? "s" : ""}`;
    if (remMonths) return `${remMonths} mo${remMonths > 1 ? "s" : ""}`;
    return "Less than a month";
  }

  // ✅ Calculate total experience
  function getTotalExperience() {
    if (employment.length === 0) return { years: 0, months: 0 };
    
    let totalMonths = 0;
    employment.forEach(job => {
      const start = new Date(job.start_date);
      const end = job.end_date ? new Date(job.end_date) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months;
    });
    
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12
    };
  }

  // ✅ Load on mount
  useEffect(() => {
    loadEmployment();
  }, []);

  // ---------- UI ----------
  return (
    <div className="employment-page">
      <div className="employment-container">
        <div className="employment-decoration employment-decoration-1"></div>
        <div className="employment-decoration employment-decoration-2"></div>

        {/* Header Section */}
        <div className="employment-header">
          <div className="employment-header-title">
            <FaBriefcase className="employment-header-icon" />
            <h3>Employment History</h3>
          </div>
          {!employmentForm && (
            <button 
              className="employment-add-btn" 
              onClick={() => setEmploymentForm({})}
            >
              <FaPlus />
              <span>Add Employment</span>
            </button>
          )}
        </div>

        {/* Form Section */}
        {employmentForm && (
          <EmploymentForm
            job={employmentForm}
            token={token}
            onCancel={() => setEmploymentForm(null)}
            onSaved={() => {
              setEmploymentForm(null);
              loadEmployment();
            }}
          />
        )}

        {/* Statistics Section */}
        {!employmentForm && employment.length > 0 && (
          <div className="employment-stats">
            <div className="employment-stat-card">
              <FaBriefcase className="employment-stat-icon" />
              <div className="employment-stat-content">
                <div className="employment-stat-value">{employment.length}</div>
                <div className="employment-stat-label">Total Positions</div>
              </div>
            </div>
            <div className="employment-stat-card">
              <FaClock className="employment-stat-icon" />
              <div className="employment-stat-content">
                <div className="employment-stat-value">
                  {getTotalExperience().years > 0 
                    ? `${getTotalExperience().years}yr ${getTotalExperience().months}mo`
                    : `${getTotalExperience().months}mo`}
                </div>
                <div className="employment-stat-label">Total Experience</div>
              </div>
            </div>
            <div className="employment-stat-card">
              <FaCheckCircle className="employment-stat-icon" />
              <div className="employment-stat-content">
                <div className="employment-stat-value">
                  {employment.filter(job => !job.end_date).length}
                </div>
                <div className="employment-stat-label">Current Roles</div>
              </div>
            </div>
          </div>
        )}

        {/* List Section */}
        {!employmentForm && (
          <>
            {loading ? (
              <div className="employment-loading">
                <div className="employment-loading-spinner"></div>
                <p>Loading employment history...</p>
              </div>
            ) : employment.length === 0 ? (
              <div className="employment-empty">
                <FaBriefcase className="employment-empty-icon" />
                <p>No employment history yet.</p>
                <p className="employment-empty-subtitle">
                  Click "Add Employment" to get started building your professional profile
                </p>
              </div>
            ) : (
              <ul className="employment-list">
                {employment
                  .sort((a, b) => {
                    // Current jobs first, then sort by start_date descending (newest first)
                    const aIsCurrent = !a.end_date;
                    const bIsCurrent = !b.end_date;
                    
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    
                    // Both current or both past - sort by start_date descending
                    const dateA = new Date(a.start_date || 0);
                    const dateB = new Date(b.start_date || 0);
                    return dateB - dateA;
                  })
                  .map((job) => (
                    <li key={job.id} className="employment-card">
                      <div className="employment-card-header">
                        <div className="employment-title-section">
                          <FaBriefcase className="employment-title-icon" />
                          <div>
                            <span className="employment-title">{job.title}</span>
                            <div className="employment-company-row">
                              <FaBuilding className="employment-company-icon" />
                              <span className="employment-company">{job.company}</span>
                            </div>
                          </div>
                        </div>
                        {!job.end_date && (
                          <div className="employment-current-badge">
                            <FaCheckCircle />
                            <span>Current</span>
                          </div>
                        )}
                      </div>
                      {job.location && (
                        <div className="employment-location">
                          <FaMapMarkerAlt />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.start_date && (
                        <div className="employment-meta">
                          <FaCalendarAlt className="employment-meta-icon" />
                          <span>
                            {new Date(job.start_date).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                            })}{" "}
                            -{" "}
                            {job.end_date
                              ? new Date(job.end_date).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                })
                              : "Present"}{" "}
                            <span className="employment-duration">
                              ({getDuration(job.start_date, job.end_date)})
                            </span>
                          </span>
                        </div>
                      )}
                      {job.description && (
                        <div className="employment-description">
                          <div className="employment-description-header">
                            <FaFileAlt />
                            <span>Description & Responsibilities</span>
                          </div>
                          <p>{job.description}</p>
                        </div>
                      )}
                      <div className="employment-actions">
                        <button
                          className="employment-btn-edit"
                          onClick={() => setEmploymentForm(job)}
                        >
                          <FaEdit />
                          <span>Edit</span>
                        </button>
                        <button
                          className="employment-btn-delete"
                          onClick={() => handleDelete(job.id)}
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
        )}
      </div>
    </div>
  );
}
