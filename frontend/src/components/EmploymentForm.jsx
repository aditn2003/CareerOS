import { useState } from "react";
import  { api }  from "../api";

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

  return (
    <div
      style={{
        background: "#f5f5f5",
        padding: "1rem",
        borderRadius: "10px",
        marginBottom: "1rem",
      }}
    >
      <h4>{job.id ? "Edit Employment" : "Add Employment"}</h4>

      <label htmlFor="emp-title">Job Title *</label>
      <input
        id="emp-title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        aria-label="Job title"
        aria-required="true"
      />

      <label htmlFor="emp-company">Company Name *</label>
      <input
        id="emp-company"
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
        aria-label="Company name"
        aria-required="true"
      />

      <label htmlFor="emp-location">Location</label>
      <input
        id="emp-location"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        aria-label="Job location"
      />

      <label htmlFor="emp-start-date">Start Date *</label>
      <input
        type="date"
        id="emp-start-date"
        value={form.start_date}
        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        aria-label="Employment start date"
        aria-required="true"
      />

      {!form.current && (
        <>
          <label htmlFor="emp-end-date">End Date</label>
          <input
            type="date"
            id="emp-end-date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            aria-label="Employment end date"
          />
        </>
      )}

      <label>
        <input
          type="checkbox"
          id="emp-current"
          checked={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.checked })}
          aria-label="Current position"
        />
        Current Position
      </label>

      <label htmlFor="emp-description">Job Description</label>
      <textarea
        id="emp-description"
        maxLength={1000}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        aria-label="Job description"
        aria-describedby="emp-description-hint"
      />
      <span id="emp-description-hint" className="visually-hidden">Maximum 1000 characters</span>
      <p style={{ textAlign: "right", fontSize: 12 }}>
        {form.description.length}/1000
      </p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={save}>{job.id ? "Save Changes" : "Add"}</button>
        <button onClick={onCancel} style={{ background: "gray" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

