import { useState } from "react";
import { api } from "../api";

export default function ProjectForm({ token, onSaved, onCancel, project }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    role: project?.role || "",
    start_date: project?.start_date || "",
    end_date: project?.end_date || "",
    technologies: Array.isArray(project?.technologies)
      ? project.technologies.join(", ")
      : project?.technologies || "",
    repository_link: project?.repository_link || "",
    team_size: project?.team_size || "",
    collaboration_details: project?.collaboration_details || "",
    outcomes: project?.outcomes || "",
    industry: project?.industry || "",
    project_type: project?.project_type || "",
    status: project?.status || "Planned",
    media: null,
  });

  // ---------- HANDLE CHANGE ----------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  // ---------- HANDLE SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    for (const key in form) {
      if (form[key] !== null && form[key] !== undefined)
        data.append(key, form[key]);
    }

    try {
      if (project && project.id) {
        await api.put(`/api/projects/${project.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/api/projects", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSaved();
    } catch (err) {
      console.error("❌ Error saving project:", err);
      alert("Error saving project");
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <h3>{project && project.id ? "Edit Project" : "Add New Project"}</h3>

      {/* 🟣 BASIC DETAILS */}
      <h4 className="form-header">Basic Details</h4>
      <input
        name="name"
        placeholder="Project Name"
        value={form.name}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
        required
      />
      <input
        name="role"
        placeholder="Your Role"
        value={form.role}
        onChange={handleChange}
        required
      />

      {/* 🟢 TIMELINE */}
      <h4 className="form-header">Timeline</h4>
      <input
        type="date"
        name="start_date"
        value={form.start_date}
        onChange={handleChange}
        required
      />
      <input
        type="date"
        name="end_date"
        value={form.end_date}
        onChange={handleChange}
      />

      {/* 🔵 TECHNICAL DETAILS */}
      <h4 className="form-header">Technical Details</h4>
      <input
        name="technologies"
        placeholder="Technologies (comma separated)"
        value={form.technologies}
        onChange={handleChange}
      />
      <input
        name="repository_link"
        placeholder="Repository/URL (optional)"
        value={form.repository_link}
        onChange={handleChange}
      />
      <input
        name="industry"
        placeholder="Industry"
        value={form.industry}
        onChange={handleChange}
      />
      <input
        name="project_type"
        placeholder="Project Type"
        value={form.project_type}
        onChange={handleChange}
      />

      {/* 🟠 COLLABORATION & OUTCOME */}
      <h4 className="form-header">Collaboration & Outcome</h4>
      <input
        name="team_size"
        type="number"
        placeholder="Team Size"
        value={form.team_size}
        onChange={handleChange}
      />
      <textarea
        name="collaboration_details"
        placeholder="Collaboration Details"
        value={form.collaboration_details}
        onChange={handleChange}
      />
      <textarea
        name="outcomes"
        placeholder="Project Outcomes / Achievements"
        value={form.outcomes}
        onChange={handleChange}
      />

      {/* 🟤 STATUS & MEDIA */}
      <h4 className="form-header">Status & Media</h4>
      <select name="status" value={form.status} onChange={handleChange}>
        <option>Planned</option>
        <option>Ongoing</option>
        <option>Completed</option>
      </select>
      <input type="file" name="media" onChange={handleChange} />

      {/* ACTION BUTTONS */}
      <div className="form-actions left">
        <button type="submit" className="form-btn purple-btn">
          Save
        </button>
        <button
          type="button"
          className="form-btn purple-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
