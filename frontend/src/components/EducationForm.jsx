import React, { useState } from "react";
import { api } from "../api";

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
    <div className="card-container">
      <h4>{edu ? "Edit Education" : "Add Education"}</h4>
      <form onSubmit={handleSubmit}>
        <label htmlFor="edu-institution">Institution *</label>
        <input
          id="edu-institution"
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
          aria-label="Educational institution"
          aria-required="true"
        />

        <label htmlFor="edu-degree">Degree *</label>
        <input
          id="edu-degree"
          value={form.degree_type}
          onChange={(e) => setForm({ ...form, degree_type: e.target.value })}
          aria-label="Degree type"
          aria-required="true"
        />

        <label htmlFor="edu-field">Field of Study *</label>
        <input
          id="edu-field"
          value={form.field_of_study}
          onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
          aria-label="Field of study"
          aria-required="true"
        />

        <label htmlFor="edu-level">Education Level</label>
        <select
          id="edu-level"
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

        <label htmlFor="edu-graduation-date">Graduation Date</label>
        <input
          type="date"
          id="edu-graduation-date"
          value={form.graduation_date || ""}
          onChange={(e) => setForm({ ...form, graduation_date: e.target.value })}
          aria-label="Graduation date"
        />

        <label>
          <input
            type="checkbox"
            id="edu-currently-enrolled"
            checked={form.currently_enrolled}
            onChange={(e) =>
              setForm({ ...form, currently_enrolled: e.target.checked })
            }
            aria-label="Currently enrolled"
          />{" "}
          Currently Enrolled
        </label>

        <label htmlFor="edu-gpa">GPA (optional)</label>
        <input
          type="number"
          id="edu-gpa"
          step="0.01"
          max="4"
          min="0"
          value={form.gpa || ""}
          onChange={(e) => setForm({ ...form, gpa: e.target.value })}
          aria-label="Grade point average"
        />

        <label>
          <input
            type="checkbox"
            id="edu-gpa-private"
            checked={form.gpa_private}
            onChange={(e) =>
              setForm({ ...form, gpa_private: e.target.checked })
            }
            aria-label="Hide GPA from public view"
          />{" "}
          Hide GPA (private)
        </label>

        <label htmlFor="edu-honors">Honors / Achievements</label>
        <textarea
          id="edu-honors"
          value={form.honors}
          onChange={(e) => setForm({ ...form, honors: e.target.value })}
          aria-label="Honors and achievements"
        />

        <div className="button-group">
          <button type="submit">Save</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
