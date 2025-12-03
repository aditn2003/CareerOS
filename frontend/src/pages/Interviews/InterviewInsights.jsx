import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./InterviewInsights.css";

export default function InterviewInsights() {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  const [roleMap, setRoleMap] = useState({});
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState({});

  const userId = getUserId();

  /* ============================================================
     Load JOBS → build unique company list & role list per company
  ============================================================ */
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/jobs");
        const jobs = res.data.jobs || [];

        const uniqueCompanies = [...new Set(jobs.map((j) => j.company))];
        setCompanies(uniqueCompanies);

        const roleMapTemp = {};
        jobs.forEach((job) => {
          if (!roleMapTemp[job.company]) roleMapTemp[job.company] = new Set();
          roleMapTemp[job.company].add(job.title);
        });

        const finalMap = {};
        Object.keys(roleMapTemp).forEach((company) => {
          finalMap[company] = [...roleMapTemp[company]];
        });

        setRoleMap(finalMap);

        // Check for company from URL query params (from Interview Tracker)
        const companyFromUrl = searchParams.get("company");
        if (companyFromUrl && uniqueCompanies.includes(companyFromUrl)) {
          setActiveCompany(companyFromUrl);
        } else if (uniqueCompanies.length > 0) {
          setActiveCompany(uniqueCompanies[0]);
        }
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, [searchParams]);

  /* ============================================================
     Load interview insights when company changes
  ============================================================ */
  useEffect(() => {
    if (!activeCompany) return;
    fetchInsights(activeCompany);
  }, [activeCompany]);

  /* ============================================================
     Fetch insights
  ============================================================ */
  async function fetchInsights(company) {
    try {
      setLoading(true);
      const role = roleMap[company]?.[0] || "";
      
      const res = await api.get(
        `/api/interview-insights?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&userId=${userId}`
      );

      setInsights(res.data.data);

      // Fetch checklist completion status from database
      await fetchChecklistStatus(company, role);
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Fetch checklist completion status
  ============================================================ */
  async function fetchChecklistStatus(company, role) {
    try {
      const res = await api.get("/api/interview-insights/checklist/status", {
        params: { userId, company, role }
      });
      setChecklistStatus(res.data.data.completedItems || {});
    } catch (err) {
      console.error("Error fetching checklist status:", err);
    }
  }

  /* ============================================================
     Calculate total checklist items from insights
  ============================================================ */
  function getTotalChecklistItems() {
    if (!insights || !insights.checklist) return 0;
    
    let total = 0;
    const checklist = insights.checklist;
    
    // Count items in each category
    if (checklist.research) total += checklist.research.length;
    if (checklist.technical) total += checklist.technical.length;
    if (checklist.logistics) total += checklist.logistics.length;
    if (checklist.portfolio) total += checklist.portfolio.length;
    if (checklist.confidence) total += checklist.confidence.length;
    if (checklist.questions) total += checklist.questions.length;
    if (checklist.followUp) total += checklist.followUp.length;
    
    return total;
  }

  /* ============================================================
     Get completed count from checklistStatus
  ============================================================ */
  function getCompletedCount() {
    return Object.values(checklistStatus).filter(item => item?.completed).length;
  }

  /* ============================================================
     Calculate completion percentage
  ============================================================ */
  function getCompletionPercentage() {
    const total = getTotalChecklistItems();
    const completed = getCompletedCount();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /* ============================================================
     Toggle checklist item
  ============================================================ */
  async function toggleChecklistItem(category, item) {
    const role = roleMap[activeCompany]?.[0] || "";
    
    try {
      const res = await api.post("/api/interview-insights/checklist/toggle", {
        userId,
        company: activeCompany,
        role,
        category,
        item
      });

      // Update local state
      setChecklistStatus(prev => ({
        ...prev,
        [item]: res.data.data.isCompleted ? {
          completed: true,
          completedAt: res.data.data.completedAt
        } : undefined
      }));
    } catch (err) {
      console.error("Error toggling checklist:", err);
      alert("Failed to update checklist. Please try again.");
    }
  }

  /* ============================================================
     Refresh
  ============================================================ */
  function refresh() {
    if (activeCompany) fetchInsights(activeCompany);
  }

  /* ============================================================
     RENDER UI
  ============================================================ */
  return (
    <div className="interview-insights-container">
      <div className="company-buttons">
        {companies.map((c) => (
          <button
            key={c}
            className={`company-btn ${c === activeCompany ? "active" : ""}`}
            onClick={() => setActiveCompany(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <button className="refresh-btn" onClick={refresh}>
        🔄 Refresh Insights
      </button>

      <div className="insights-panel">
        {loading && <p className="loading-text">⏳ Loading interview insights…</p>}

        {!loading && insights && (
          <div className="interview-content">
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}>
              {activeCompany} — Interview Overview
            </h2>

            <section>
              <h2>Interview Process Overview</h2>
              <p>{insights.process}</p>
            </section>

            <section>
              <h2>Typical Stages</h2>
              <ul>
                {insights.stages.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Common Interview Questions</h2>
              <ul>
                {insights.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Interviewer Backgrounds</h2>
              <ul>
                {insights.interviewers.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Company-Specific Interview Format</h2>
              <p>{insights.format}</p>
            </section>

            <section>
              <h2>Preparation Recommendations</h2>
              <ul>
                {insights.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Timeline & Expectations</h2>
              <p>{insights.timeline}</p>
            </section>

            <section>
              <h2>Success Tips</h2>
              <ul>
                {insights.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>

            {/* UC-081: Enhanced Interview Preparation Checklist */}
            <section className="checklist-section">
              <div className="checklist-header">
                <h2>📋 Interview Preparation Checklist</h2>
                {insights.checklist && (
                  <div className="checklist-progress">
                    <div className="progress-text">
                      {getCompletedCount()} of {getTotalChecklistItems()} completed
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${getCompletionPercentage()}%` }}
                      />
                    </div>
                    <div className="progress-percentage">{getCompletionPercentage()}%</div>
                  </div>
                )}
              </div>

              {/* Research & Company Knowledge */}
              {insights.checklist.research && insights.checklist.research.length > 0 && (
                <div className="checklist-category">
                  <h3>🔍 Company Research</h3>
                  {insights.checklist.research.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("research", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Technical Preparation */}
              {insights.checklist.technical && insights.checklist.technical.length > 0 && (
                <div className="checklist-category">
                  <h3>💻 Technical Preparation</h3>
                  {insights.checklist.technical.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("technical", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Logistics */}
              {insights.checklist.logistics && insights.checklist.logistics.length > 0 && (
                <div className="checklist-category">
                  <h3>📍 Logistics & Setup</h3>
                  {insights.checklist.logistics.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("logistics", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Attire */}
              {insights.checklist.attire && (
                <div className="checklist-category">
                  <h3>👔 Recommended Attire</h3>
                  <div className="attire-suggestion">
                    {insights.checklist.attire}
                  </div>
                </div>
              )}

              {/* Portfolio/Work Samples */}
              {insights.checklist.portfolio && insights.checklist.portfolio.length > 0 && (
                <div className="checklist-category">
                  <h3>💼 Portfolio & Work Samples</h3>
                  {insights.checklist.portfolio.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("portfolio", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Confidence Building */}
              {insights.checklist.confidence && insights.checklist.confidence.length > 0 && (
                <div className="checklist-category">
                  <h3>💪 Confidence Building</h3>
                  {insights.checklist.confidence.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("confidence", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Questions to Prepare */}
              {insights.checklist.questions && insights.checklist.questions.length > 0 && (
                <div className="checklist-category">
                  <h3>❓ Questions to Prepare</h3>
                  {insights.checklist.questions.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("questions", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Post-Interview Follow-Up */}
              {insights.checklist.followUp && insights.checklist.followUp.length > 0 && (
                <div className="checklist-category">
                  <h3>📧 Post-Interview Follow-Up</h3>
                  {insights.checklist.followUp.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checklistStatus[item]?.completed || false}
                        onChange={() => toggleChecklistItem("followUp", item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}