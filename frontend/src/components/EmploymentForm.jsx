import { useState } from "react";
import { api } from "../api";
import { 
  FaBriefcase, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaFileAlt,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import "./EmploymentForm.css";

export default function EmploymentForm({ job = {}, token, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    start_date: job.start_date || "",
    end_date: job.end_date || "",
    current: job.current || false,
    description: job.description || "",
  });

  async function save() {
    if (!form.title || !form.company || !form.start_date) {
      alert("Title, company, and start date are required.");
      return;
    }
    if (
      !form.current &&
      form.end_date &&
      new Date(form.end_date) < new Date(form.start_date)
    ) {
      alert("End date must be after start date.");
      return;
    }

    try {
      const endpoint = job.id ? `/api/employment/${job.id}` : "/api/employment";
      const method = job.id ? "put" : "post";
      await api[method](endpoint, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(job.id ? "Employment updated!" : "Employment added!");
      onSaved();
    } catch (err) {
      alert("Could not save employment entry.");
    }
  }

  const charCount = form.description.length;
  const charCountClass = charCount > 900 ? "danger" : charCount > 750 ? "warning" : "";

  return (
    <div className="employment-form">
      <div className="employment-form-header">
        <FaBriefcase className="employment-form-header-icon" />
        <h4>{job.id ? "Edit Employment" : "Add Employment"}</h4>
      </div>

      <div className="employment-form-grid">
        <div className="employment-form-group">
          <label htmlFor="emp-title" className="employment-form-label">
            <FaBriefcase />
            <span>Job Title <span className="required">*</span></span>
          </label>
          <input
            id="emp-title"
            className="employment-form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Software Engineer"
            aria-label="Job title"
            aria-required="true"
          />
        </div>

        <div className="employment-form-group">
          <label htmlFor="emp-company" className="employment-form-label">
            <FaBuilding />
            <span>Company Name <span className="required">*</span></span>
          </label>
          <input
            id="emp-company"
            className="employment-form-input"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="e.g., Tech Corp"
            aria-label="Company name"
            aria-required="true"
          />
        </div>

        <div className="employment-form-group">
          <label htmlFor="emp-location" className="employment-form-label">
            <FaMapMarkerAlt />
            <span>Location</span>
          </label>
          <input
            id="emp-location"
            className="employment-form-input"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g., New York, NY"
            aria-label="Job location"
          />
        </div>

        <div className="employment-form-group">
          <label htmlFor="emp-start-date" className="employment-form-label">
            <FaCalendarAlt />
            <span>Start Date <span className="required">*</span></span>
          </label>
          <input
            type="date"
            id="emp-start-date"
            className="employment-form-input"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            aria-label="Employment start date"
            aria-required="true"
          />
        </div>

        {!form.current && (
          <div className="employment-form-group">
            <label htmlFor="emp-end-date" className="employment-form-label">
              <FaCalendarAlt />
              <span>End Date</span>
            </label>
            <input
              type="date"
              id="emp-end-date"
              className="employment-form-input"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              aria-label="Employment end date"
            />
          </div>
        )}
      </div>

      <div className="employment-form-checkbox-group" onClick={() => setForm({ ...form, current: !form.current })}>
        <input
          type="checkbox"
          id="emp-current"
          className="employment-form-checkbox"
          checked={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.checked })}
          aria-label="Current position"
        />
        <label htmlFor="emp-current" className="employment-form-checkbox-label">
          This is my current position
        </label>
      </div>

      <div className="employment-form-group full-width">
        <label htmlFor="emp-description" className="employment-form-label">
          <FaFileAlt />
          <span>Job Description & Responsibilities</span>
        </label>
        <textarea
          id="emp-description"
          className="employment-form-textarea"
          maxLength={1000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe your role, responsibilities, and achievements..."
          aria-label="Job description"
          aria-describedby="emp-description-hint"
        />
        <span id="emp-description-hint" className="visually-hidden">Maximum 1000 characters</span>
        <div className={`employment-form-char-count ${charCountClass}`}>
          {charCount}/1000 characters
        </div>
      </div>

      <div className="employment-form-actions">
        <button 
          className="employment-form-btn employment-form-btn-primary" 
          onClick={save}
        >
          <FaCheck />
          <span>{job.id ? "Save Changes" : "Add Employment"}</span>
        </button>
        <button 
          className="employment-form-btn employment-form-btn-secondary" 
          onClick={onCancel}
        >
          <FaTimes />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}

