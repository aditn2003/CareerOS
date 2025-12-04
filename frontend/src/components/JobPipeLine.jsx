// frontend/src/components/JobPipeLine.jsx

import React, { useEffect, useState } from "react";
import "./JobPipeline.css";
import JobDetailsModal from "./JobsDetailsModal";
import JobSearchFilter from "./JobSearchFilter";
import UpcomingDeadlinesWidget from "./UpcomingDeadlinesWidget";
import CompanyDetailsModal from "./CompanyDetailsModal";
import { FaArchive } from "react-icons/fa"; // <-- ADDED
import { api } from "../api"; // <-- ADDED

// 🟡 highlight helper
function highlight(text, term) {
  if (!term || !text) return text;
  const regex = new RegExp(`(${term})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

const STAGES = [
  { name: "Interested", color: "#a78bfa" },
  { name: "Applied", color: "#60a5fa" },
  { name: "Phone Screen", color: "#34d399" },
  { name: "Interview", color: "#fbbf24" },
  { name: "Offer", color: "#4ade80" },
  { name: "Rejected", color: "#f87171" },
];

// ⭐ ONLY ADDITION #1 — add onAnalyzeSkills support
export default function JobPipeline({ token, onAnalyzeSkills }) {
  const [jobs, setJobs] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [filter, setFilter] = useState("All");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [bulkStage, setBulkStage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [filters, setFilters] = useState(
    JSON.parse(localStorage.getItem("jobSearch") || "{}")
  );
  const [loading, setLoading] = useState(false);
  const [bulkDays, setBulkDays] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [hoveredLogo, setHoveredLogo] = useState(null);
  const [companyLogos, setCompanyLogos] = useState({}); // 🟣 dynamic logos

  // Add this temporarily near the top of your component, right after the state declarations
  //console.log("Pipeline Render: jobs =", jobs);
  //console.log("FULL JOBS =", JSON.stringify(jobs, null, 2));

  // 🔄 Function to fetch company logos
  async function loadCompanyLogos() {
    const logos = {};
    for (const job of jobs) {
      if (!job.company) continue;
      try {
        // Use the 'api' helper here for consistency
        const res = await api.get(`/api/companies/${job.company}`);
        if (res.status === 200) {
          if (res.data.logo_url) {
            logos[job.company] = `http://localhost:4000${res.data.logo_url}`;
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch logo for", job.company);
      }
    }
    setCompanyLogos(logos);
  }

  // 🔄 load jobs
  // 🔄 load jobs
async function loadJobs(currentFilters = filters) {
  try {
    setLoading(true);
    const clean = Object.fromEntries(
      Object.entries(currentFilters).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined
      )
    );
    const query = new URLSearchParams(clean).toString();
    
    console.log('🔍 Fetching jobs...');
    console.log('   Query string:', query);
    console.log('   Filters:', currentFilters);
    
    const res = await api.get(`/api/jobs?${query}`);
    
    console.log('📦 Full API Response:', res);
    console.log('📦 Response status:', res.status);
    console.log('📦 Response data:', res.data);
    console.log('📦 Jobs array:', res.data.jobs);
    console.log('📦 Number of jobs:', res.data.jobs?.length);
    
    const jobsToSet = res.data.jobs || [];
    console.log('📋 Setting jobs state with:', jobsToSet);
    
    setJobs(jobsToSet);
    
    console.log('✅ Jobs state updated');
  } catch (err) {
    console.error("❌ Failed to load jobs", err);
    console.error("❌ Error response:", err.response?.data);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadJobs();
  }, [token]);

  useEffect(() => {
    localStorage.setItem("jobSearch", JSON.stringify(filters));
    loadJobs(filters);
  }, [filters]);

  // 🔁 Fetch logos whenever jobs change
  useEffect(() => {
    if (jobs.length > 0) loadCompanyLogos();
  }, [jobs, token]);

  async function handleBulkDeadlineExtend() {
    if (!bulkDays || selectedJobs.length === 0)
      return alert("Select jobs and a duration");
    try {
      // Use the 'api' helper
      const res = await api.put("/api/jobs/bulk/deadline", {
        jobIds: selectedJobs, 
        daysToAdd: bulkDays 
      });

      if (res.status === 200) {
        alert(`✅ Extended deadlines for ${res.data.updated.length} jobs`);
        loadJobs();
        setSelectedJobs([]);
        setBulkDays("");
      } else {
        alert(res.data.error || "Failed to extend deadlines");
      }
    } catch (err) {
      console.error("❌ Bulk deadline update failed:", err);
    }
  }

  // --- ADD THIS NEW FUNCTION ---
  async function handleArchive(jobId) {
    try {
      // Calls PUT /api/jobs/:id/archive
      const res = await api.put(`/api/jobs/${jobId}/archive`);

      if (res.status === 200) {
        // Success! Refresh the job list by calling loadJobs.
        // The archived job will disappear from the pipeline.
        loadJobs();
      } else {
        console.error("Failed to archive job:", res.data.error);
      }
    } catch (err) {
      console.error("❌ Failed to archive job:", err);
    }
  }
  // ---------------------------

  async function updateJobStage(jobId, newStage) {
    try {
      // Use the 'api' helper
      await api.put(`/api/jobs/${jobId}/status`, { status: newStage });
      
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: newStage, status_updated_at: new Date() }
            : j
        )
      );
    } catch (err) {
      console.error("❌ Failed to update stage:", err);
    }
  }

  function daysUntilDeadline(deadline) {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function deadlineColor(deadline) {
    const days = daysUntilDeadline(deadline);
    if (days === null) return "gray";
    if (days < 0) return "#ef4444";
    if (days <= 2) return "#f87171";
    if (days <= 7) return "#fbbf24";
    return "#4ade80";
  }

  async function handleBulkUpdate() {
    if (!bulkStage || selectedJobs.length === 0) return;
    for (const id of selectedJobs) await updateJobStage(id, bulkStage);
    setSelectedJobs([]);
    setBulkStage("");
  }

  const filteredStages =
    filter === "All" ? STAGES : STAGES.filter((s) => s.name === filter);

  const formatDaysInStage = (date) => {
    if (!date) return "-";
    const days = Math.round(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days} days in stage`;
  };

  return (
    <div className="pipeline-wrapper">
      <JobSearchFilter onFilterChange={setFilters} savedPreferences={filters} />

      {/* === Toolbar === */}
      <div className="pipeline-toolbar">
        <div className="toolbar-left">
          <label>Stage Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {STAGES.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          <label>Bulk Update:</label>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
          >
            <option value="">Select stage</option>
            {STAGES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <button onClick={handleBulkUpdate}>Move Selected</button>
        </div>

        <div className="toolbar-right">
          <label>Extend Deadline:</label>
          <select
            value={bulkDays || ""}
            onChange={(e) => setBulkDays(Number(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">+1 days</option>
            <option value="3">+3 days</option>
            <option value="7">+7 days</option>
            <option value="14">+14 days</option>
          </select>
          <button onClick={handleBulkDeadlineExtend}>Apply</button>
        </div>
      </div>

      {loading && <p className="loading-text">Loading jobs...</p>}

      {/* === Pipeline Columns === */}
      <div className="pipeline">
        {filteredStages.map((stage) => {
          const stageJobs = jobs.filter((j) => j.status === stage.name);
          return (
            <div
              key={stage.name}
              className="pipeline-column"
              style={{ borderTopColor: stage.color }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragged && updateJobStage(dragged.id, stage.name)}
            >
              <h3 style={{ color: stage.color }}>
                {stage.name} ({stageJobs.length})
              </h3>

              <div className="column-content">
              {stageJobs.map((job) => (
  <div key={job.id} className="job-wrapper">

    {/* ✔ Checkbox OUTSIDE card, so it works */}
    <input
      type="checkbox"
      className="job-select-checkbox"
      checked={selectedJobs.includes(job.id)}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        setSelectedJobs((prev) =>
          prev.includes(job.id)
            ? prev.filter((id) => id !== job.id)
            : [...prev, job.id]
        );
      }}
    />

    {/* ============================
        CLICKABLE JOB CARD
    ============================ */}
    <div
      className={`job-card ${
        selectedJobs.includes(job.id) ? "selected" : ""
      }`}
      draggable
      onDragStart={() => setDragged(job)}
      onClick={(e) => {
        if (e.shiftKey) {
          e.stopPropagation();
          setSelectedJobs((prev) =>
            prev.includes(job.id)
              ? prev.filter((id) => id !== job.id)
              : [...prev, job.id]
          );
        } else {
          setSelectedJobId(job.id);
        }
      }}
    >
      <div className="job-info-with-logo">
        <div className="job-info">
          <strong
            dangerouslySetInnerHTML={{
              __html: highlight(job.title, filters.search),
            }}
          />
          <p
            dangerouslySetInnerHTML={{
              __html: highlight(job.company, filters.search),
            }}
          />

          {job.deadline && (
            <small
              style={{
                color: deadlineColor(job.deadline),
                fontWeight: 500,
                display: "block",
              }}
            >
              {daysUntilDeadline(job.deadline) < 0
                ? `Overdue (${Math.abs(
                    daysUntilDeadline(job.deadline)
                  )} days ago)`
                : `${daysUntilDeadline(
                    job.deadline
                  )} days remaining`}
            </small>
          )}

          <small>
            {formatDaysInStage(
              job.status_updated_at || job.created_at
            )}
          </small>
        </div>

        {/* 🏢 Logo */}
        <div
          className="logo-wrapper"
          onMouseEnter={() => setHoveredLogo(job.id)}
          onMouseLeave={() => setHoveredLogo(null)}
        >
          <img
            src={
              companyLogos[job.company] ||
              job.company_logo_url ||
              "/company-placeholder.png"
            }
            alt={`${job.company} Logo`}
            className="company-logo-right"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCompany(job.company);
            }}
            onError={(e) =>
              (e.currentTarget.src = "/company-placeholder.png")
            }
          />
          {hoveredLogo === job.id && (
            <div className="react-tooltip">View Company Info</div>
          )}
        </div>
      </div>
    </div>

    {/* ============================
        ACTION BAR BELOW CARD
    ============================ */}
    <div className="job-card-actions-bar">
      {onAnalyzeSkills && (
        <button
          className="job-card-btn-analyze"
          onClick={(e) => {
            e.stopPropagation();
            onAnalyzeSkills(job.id);
          }}
        >
          🔍 Analyze Skills
        </button>
      )}

      <button
        className="job-card-btn-archive"
        onClick={(e) => {
          e.stopPropagation();
          handleArchive(job.id);
        }}
      >
        <FaArchive /> Archive
      </button>
    </div>
  </div>
))}

                {stageJobs.length === 0 && (
                  <p className="empty-column">No jobs match filters.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedJobId && (
        <JobDetailsModal
          jobId={selectedJobId}
          token={token}
          onClose={() => setSelectedJobId(null)}
          // Pass down loadJobs to refresh the card if it's edited in the modal
          onJobUpdated={loadJobs}
        />
      )}

      {selectedCompany && (
        <CompanyDetailsModal
          token={token}
          companyName={selectedCompany}
          onClose={() => {
            setSelectedCompany(null);
            setTimeout(() => loadCompanyLogos(), 300); // wait briefly for backend update
          }}
          onLogoUpdated={loadCompanyLogos} // 🔁 live refresh when logo uploaded
        />
      )}
    </div>
  );
}
