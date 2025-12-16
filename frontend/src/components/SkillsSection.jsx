import React, { useEffect, useState } from "react";
import { api } from "../api";
import { 
  FaCode, 
  FaTag, 
  FaChartLine,
  FaSearch,
  FaDownload,
  FaTrash,
  FaGripVertical,
  FaLaptopCode,
  FaHandshake,
  FaLanguage,
  FaIndustry,
  FaStar,
  FaCheckCircle
} from "react-icons/fa";
import "../pages/Profile/SkillsTab.css";

/**
 * SkillsSection.jsx
 * Covers UC-026 & UC-027
 */
export default function SkillsSection({ token }) {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(null);

  // Load all skills
  async function loadSkills() {
    try {
      const { data } = await api.get("/skills", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSkills(data.skills || []);
    } catch (e) {
      console.error("Error loading skills:", e);
    }
  }

  // Update skill proficiency or category
  async function updateSkill(id, updates) {
    try {
      await api.put(`/skills/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSkills();
    } catch (e) {
      console.error("Error updating skill:", e);
    }
  }

  // Delete a skill
  async function deleteSkill(id) {
    if (!window.confirm("Delete this skill permanently?")) return;
    try {
      await api.delete(`/skills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSkills();
    } catch (e) {
      console.error("Error deleting skill:", e);
    }
  }

  // Drag handlers
  function handleDragStart(e, skill) {
    setDragging(skill);
  }

  async function handleDrop(e, targetCategory) {
    e.preventDefault();
    if (!dragging || dragging.category === targetCategory) return;
    await updateSkill(dragging.id, { category: targetCategory });
    setDragging(null);
  }

  useEffect(() => {
    if (token) loadSkills();
  }, [token]);

  // Listen for skills updates
  useEffect(() => {
    const handleUpdate = () => {
      loadSkills();
    };
    window.addEventListener('skillsUpdated', handleUpdate);
    return () => window.removeEventListener('skillsUpdated', handleUpdate);
  }, []);

  // Group by category
  const grouped = skills.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

  // Search filter
  const filteredGrouped = Object.entries(grouped)
    .map(([cat, arr]) => [
      cat,
      arr.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      ),
    ])
    .filter(([_, arr]) => arr.length);

  // CSV Export
  function exportCSV() {
    const csvRows = [["Category", "Skill", "Proficiency"]];
    skills.forEach((s) => {
      csvRows.push([s.category, s.name, s.proficiency]);
    });
    const blob = new Blob([csvRows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "skills_export.csv";
    link.click();
  }

  // Get category icon
  function getCategoryIcon(category) {
    switch(category) {
      case "Technical": return <FaLaptopCode />;
      case "Soft Skills": return <FaHandshake />;
      case "Languages": return <FaLanguage />;
      case "Industry-Specific": return <FaIndustry />;
      default: return <FaTag />;
    }
  }

  // Calculate statistics
  const totalSkills = skills.length;
  const expertSkills = skills.filter(s => s.proficiency === "Expert").length;
  const categoryCount = Object.keys(grouped).length;
  const avgProficiency = skills.length > 0 
    ? Math.round((skills.reduce((acc, s) => {
        const val = s.proficiency === "Expert" ? 4 : s.proficiency === "Advanced" ? 3 : s.proficiency === "Intermediate" ? 2 : 1;
        return acc + val;
      }, 0) / skills.length) * 10) / 10
    : 0;

  return (
    <>
      {/* Statistics Section */}
      {skills.length > 0 && (
        <div className="skills-stats">
          <div className="skills-stat-card">
            <FaCode className="skills-stat-icon" />
            <div className="skills-stat-content">
              <div className="skills-stat-value">{totalSkills}</div>
              <div className="skills-stat-label">Total Skills</div>
            </div>
          </div>
          <div className="skills-stat-card">
            <FaStar className="skills-stat-icon" />
            <div className="skills-stat-content">
              <div className="skills-stat-value">{expertSkills}</div>
              <div className="skills-stat-label">Expert Level</div>
            </div>
          </div>
          <div className="skills-stat-card">
            <FaTag className="skills-stat-icon" />
            <div className="skills-stat-content">
              <div className="skills-stat-value">{categoryCount}</div>
              <div className="skills-stat-label">Categories</div>
            </div>
          </div>
          <div className="skills-stat-card">
            <FaChartLine className="skills-stat-icon" />
            <div className="skills-stat-content">
              <div className="skills-stat-value">{avgProficiency.toFixed(1)}</div>
              <div className="skills-stat-label">Avg Proficiency</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Export */}
      <div className="skills-actions-bar">
        <div className="skills-search-wrapper">
          <FaSearch className="skills-search-icon" />
          <input
            type="text"
            className="skills-search"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="skills-export-btn" onClick={exportCSV}>
          <FaDownload />
          <span>Export Skills (CSV)</span>
        </button>
      </div>

      {/* Skills Categories */}
      {filteredGrouped.length === 0 ? (
        <div className="skills-empty">
          <FaCode className="skills-empty-icon" />
          <p>No skills yet.</p>
          <p className="skills-empty-subtitle">
            Add your first skill to get started building your professional profile
          </p>
        </div>
      ) : (
        filteredGrouped.map(([cat, arr]) => (
          <div
            key={cat}
            className="skills-category"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("drag-over");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("drag-over");
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove("drag-over");
              handleDrop(e, cat);
            }}
          >
            <div className="skills-category-header">
              <div className="skills-category-title">
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </div>
              <div className="skills-category-count">{arr.length}</div>
            </div>
            <ul className="skills-list">
              {arr.map((s) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(e, s);
                    e.currentTarget.classList.add("dragging");
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove("dragging");
                  }}
                  className={`skills-item ${dragging?.id === s.id ? "dragging" : ""}`}
                >
                  <div className="skills-item-content">
                    <FaGripVertical style={{ 
                      color: "#9ca3af", 
                      fontSize: "0.9rem",
                      cursor: "grab",
                      flexShrink: 0
                    }} />
                    <strong className="skills-item-name">{s.name}</strong>
                    <span className={`skills-proficiency-badge ${s.proficiency.toLowerCase()}`}>
                      {s.proficiency}
                    </span>
                  </div>

                  <div className="skills-item-actions">
                    <select
                      className="skills-select"
                      value={s.proficiency}
                      onChange={(e) =>
                        updateSkill(s.id, { proficiency: e.target.value })
                      }
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Expert</option>
                    </select>

                    <select
                      className="skills-select"
                      value={s.category}
                      onChange={(e) =>
                        updateSkill(s.id, { category: e.target.value })
                      }
                    >
                      <option>Technical</option>
                      <option>Soft Skills</option>
                      <option>Languages</option>
                      <option>Industry-Specific</option>
                    </select>

                    <button
                      className="skills-delete-btn"
                      onClick={() => deleteSkill(s.id)}
                    >
                      <FaTrash />
                      <span>Delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}
