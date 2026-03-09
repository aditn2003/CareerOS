import React, { useEffect, useState } from "react";
import { baseURL } from "../api";

export default function JobsTab({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${baseURL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [token]);

  if (loading) return <p>Loading jobs...</p>;
  if (jobs.length === 0) return <p>No jobs added yet.</p>;

  return (
    <div className="job-list">
      {jobs.map((job) => (
        <div key={job.id} className="job-card">
          <h3>{job.title}</h3>
          <p>{job.company}</p>
          <p>Status: {job.status}</p>
        </div>
      ))}
    </div>
  );
}
