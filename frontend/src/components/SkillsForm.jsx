import React, { useState } from "react";
import { api } from "../api";
import { 
  FaCode, 
  FaTag, 
  FaChartLine,
  FaCheck,
  FaPlus
} from "react-icons/fa";
import "./SkillsForm.css";

export default function SkillsForm({ token, onAdded }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [proficiency, setProficiency] = useState("Beginner");
  const [commonSkills] = useState([
    "JavaScript",
    "Python",
    "React",
    "SQL",
    "C++",
    "Communication",
    "Leadership",
    "Problem Solving",
    "Machine Learning",
    "Project Management",
    "Docker",
    "Kubernetes",
    "HTML",
    "CSS",
    "Teamwork",
  ]);

  // Add new skill
  async function addSkill() {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Please enter a skill name.");
      return;
    }

    try {
      await api.post(
        "/skills",
        { name: trimmed, category, proficiency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName("");
      setCategory("Technical");
      setProficiency("Beginner");
      if (onAdded) onAdded(); // refresh list in SkillsSection
    } catch (err) {
      const msg =
        err.response?.data?.error || "Failed to add skill. Try again.";
      alert(msg);
    }
  }

  return (
    <div className="skills-form">
      <div className="skills-form-header">
        <FaPlus className="skills-form-header-icon" />
        <h3>Add New Skill</h3>
      </div>

      <div className="skills-form-grid">
        <div className="skills-form-group full-width">
          <label htmlFor="skill-name" className="skills-form-label">
            <FaCode />
            <span>Skill Name <span className="required">*</span></span>
          </label>
          <input
            id="skill-name"
            list="common-skills"
            className="skills-form-input"
            placeholder="e.g., JavaScript, Python, Leadership..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id="common-skills">
            {commonSkills.map((s, i) => (
              <option key={i} value={s} />
            ))}
          </datalist>
        </div>

        <div className="skills-form-group">
          <label htmlFor="skill-category" className="skills-form-label">
            <FaTag />
            <span>Category</span>
          </label>
          <select
            id="skill-category"
            className="skills-form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Technical</option>
            <option>Soft Skills</option>
            <option>Languages</option>
            <option>Industry-Specific</option>
          </select>
        </div>

        <div className="skills-form-group">
          <label htmlFor="skill-proficiency" className="skills-form-label">
            <FaChartLine />
            <span>Proficiency Level</span>
          </label>
          <select
            id="skill-proficiency"
            className="skills-form-select"
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>Expert</option>
          </select>
        </div>
      </div>

      <div className="skills-form-actions">
        <button
          className="skills-form-btn skills-form-btn-primary"
          onClick={addSkill}
        >
          <FaCheck />
          <span>Add Skill</span>
        </button>
      </div>
    </div>
  );
}
