// frontend/src/components/JobPipeLine.jsx

import React, { useEffect, useState } from "react";
import "./JobPipeline.css";
import JobDetailsModal from "./JobsDetailsModal";
import JobSearchFilter from "./JobSearchFilter";
import UpcomingDeadlinesWidget from "./UpcomingDeadlinesWidget";
import CompanyDetailsModal from "./CompanyDetailsModal";
import { FaArchive } from "react-icons/fa"; // <-- ADDED
import { api, baseURL } from "../api"; // <-- ADDED

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

// ⭐ Apply button support - navigates to quality tab
export default function JobPipeline({ token, onApply }) {
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
  const [logoCache, setLogoCache] = useState({}); // 🟣 cache to avoid re-fetching

  // 🔄 Function to fetch company logos with caching and rate limiting
  async function loadCompanyLogos() {
    // Get unique company names that we haven't fetched yet
    const uniqueCompanies = [...new Set(jobs.map(j => j.company).filter(Boolean))];
    const companiesToFetch = uniqueCompanies.filter(company => !logoCache[company]);
    
    if (companiesToFetch.length === 0) {
      // All logos already in cache, just use cache
      const logos = {};
      uniqueCompanies.forEach(company => {
        if (logoCache[company]) logos[company] = logoCache[company];
      });
      setCompanyLogos(logos);
      return;
    }

    const newLogos = { ...logoCache };
    
    // Fetch in smaller batches with delay to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < companiesToFetch.length; i += batchSize) {
      const batch = companiesToFetch.slice(i, i + batchSize);
      
      // Fetch batch in parallel
      await Promise.all(batch.map(async (company) => {
        try {
          const res = await api.get(`/api/companies/${encodeURIComponent(company)}`);
          if (res.status === 200 && res.data.logo_url) {
            newLogos[company] = `http://localhost:4000${res.data.logo_url}`;
          } else {
            newLogos[company] = null; // Mark as fetched but no logo
    const logos = {};
    for (const job of jobs) {
      if (!job.company) continue;
      try {
        // Use the 'api' helper here for consistency
        const res = await api.get(`/api/companies/${job.company}`);
        if (res.status === 200) {
          if (res.data.logo_url) {
            logos[job.company] = `${baseURL}${res.data.logo_url}`;
          }
        } catch (err) {
          console.warn("⚠️ Could not fetch logo for", company);
          newLogos[company] = null; // Mark as fetched to avoid retry
        }
      }));
      
      // Small delay between batches to respect rate limit
      if (i + batchSize < companiesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Update cache and logos
    setLogoCache(newLogos);
    const displayLogos = {};
    uniqueCompanies.forEach(company => {
      if (newLogos[company]) displayLogos[company] = newLogos[company];
    });
    setCompanyLogos(displayLogos);
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

  // Debug: Log all job statuses to see what we're getting
  useEffect(() => {
    if (jobs.length > 0) {
      const statusCounts = {};
      jobs.forEach(job => {
        const status = job.status || 'NULL';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('📊 Job Status Breakdown:', statusCounts);
      console.log('📊 Total Jobs:', jobs.length);
      
      // Check for jobs with non-standard statuses
      const standardStatuses = STAGES.map(s => s.name);
      const nonStandardJobs = jobs.filter(j => {
        const jobStatus = (j.status || '').trim();
        return !standardStatuses.some(s => s.toLowerCase() === jobStatus.toLowerCase());
      });
      if (nonStandardJobs.length > 0) {
        console.warn('⚠️ Jobs with non-standard statuses:', nonStandardJobs.map(j => ({
          id: j.id,
          title: j.title,
          company: j.company,
          status: j.status
        })));
      }
    }
  }, [jobs]);

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
          <label htmlFor="stageFilter">Stage Filter:</label>
          <select 
            id="stageFilter"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter jobs by stage"
          >
            <option>All</option>
            {STAGES.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          <label htmlFor="bulkStageSelect">Bulk Update:</label>
          <select
            id="bulkStageSelect"
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            aria-label="Select stage for bulk update"
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
          <label htmlFor="extendDeadlineSelect">Extend Deadline:</label>
          <select
            id="extendDeadlineSelect"
            value={bulkDays || ""}
            onChange={(e) => setBulkDays(Number(e.target.value))}
            aria-label="Select number of days to extend deadline"
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
          const stageJobs = jobs.filter((j) => {
            // Normalize status comparison (case-insensitive, trim whitespace)
            const jobStatus = (j.status || '').trim();
            const stageName = stage.name.trim();
            return jobStatus.toLowerCase() === stageName.toLowerCase();
          });
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
      aria-label={`Select ${job.title || 'job'} at ${job.company || 'company'}`}
    />

    {/* ============================
        CLICKABLE JOB CARD
    ============================ */}
    <div
      className={`job-card ${
        selectedJobs.includes(job.id) ? "selected" : ""
      } ${job.is_referral ? "referral-job" : ""}`}
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
          
          {/* LinkedIn Badge for imported jobs */}
          {(job.platform === 'linkedin' && job.is_imported) && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              marginTop: "0.5rem",
              padding: "0.25rem 0.5rem",
              backgroundColor: "#0077b5",
              color: "white",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "0.125rem" }}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </div>
          )}
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
      {onApply && (
        <button
          className="job-card-btn-apply"
          onClick={(e) => {
            e.stopPropagation();
            onApply(job.id);
          }}
        >
          ✍️ Apply
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
        
        {/* Show jobs with non-standard statuses in an "Other" column */}
        {filter === "All" && (() => {
          const standardStatuses = STAGES.map(s => s.name.toLowerCase());
          const otherJobs = jobs.filter((j) => {
            const jobStatus = (j.status || '').trim().toLowerCase();
            return jobStatus && !standardStatuses.includes(jobStatus);
          });
          
          if (otherJobs.length > 0) {
            return (
              <div
                key="Other"
                className="pipeline-column"
                style={{ borderTopColor: "#9ca3af" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragged && updateJobStage(dragged.id, "Interested")}
              >
                <h3 style={{ color: "#9ca3af" }}>
                  Other Platforms ({otherJobs.length})
                </h3>
                <div className="column-content">
                  {otherJobs.map((job) => (
                    <div key={job.id} className="job-wrapper">
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
                        aria-label={`Select ${job.title || 'job'} at ${job.company || 'company'}`}
                      />
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
                            {/* LinkedIn Badge for imported jobs instead of status */}
                            {(job.platform === 'linkedin' && job.is_imported) ? (
                              <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                marginTop: "0.5rem",
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#0077b5",
                                color: "white",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "0.125rem" }}>
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                LinkedIn
                              </div>
                            ) : (
                              <small style={{ color: "#ef4444", fontWeight: 600 }}>
                                Status: {job.status}
                              </small>
                            )}
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
                      <div className="job-card-actions-bar">
                        {onApply && (
                          <button
                            className="job-card-btn-apply"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApply(job.id);
                            }}
                          >
                            ✍️ Apply
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
                </div>
              </div>
            );
          }
          return null;
        })()}
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
