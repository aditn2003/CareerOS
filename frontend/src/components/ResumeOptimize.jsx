import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { baseURL } from "../api";
import "./ResumeOptimize.css";

export default function ResumeOptimize() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sections, resumeTitle, selectedTemplate } = location.state || {};

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    // redirect if opened directly
    if (!sections) navigate("/profile/jobs");
  }, [sections, navigate]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${baseURL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (e) {
        console.error("Failed to load jobs", e);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadJobs();
  }, [token]);

  function openJob(job) {
    console.log("Clicked:", job.title); // optional debug
    navigate("/resume/optimize/run", {
      state: { sections, resumeTitle, selectedTemplate, job },
    });
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>✨ Choose a Job to Tailor For</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        We’ll use the job’s description with your current resume draft to
        generate tailored content.
      </p>

      <div style={{ margin: "16px 0" }}>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← Back
        </button>
      </div>

      {loading ? (
        <p>Loading your jobs…</p>
      ) : jobs.length === 0 ? (
        <p>No jobs found. Add a job in your Jobs tab first.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {jobs.map((j) => (
            <div key={j.id} className="job-card" onClick={() => openJob(j)}>
              <h3>{j.title}</h3>
              <p>{j.company}</p>
              <p>{j.location || "—"}</p>
              {j.deadline && (
                <p>Deadline: {new Date(j.deadline).toLocaleDateString()}</p>
              )}
              <p>Status: {j.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
