import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./InterviewInsights.css";

export default function InterviewInsights() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  const [roleMap, setRoleMap] = useState({});
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState({});

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

        if (uniqueCompanies.length > 0) {
          setActiveCompany(uniqueCompanies[0]);
        }
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, []);

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
        `/api/interview-insights?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`
      );

      setInsights(res.data.data);

      const saved = JSON.parse(
        localStorage.getItem(`checklist_${company}_${role}`) || "{}"
      );
      setChecked(saved);
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Checklist handler
  ============================================================ */
  function toggleChecklist(i) {
    const role = roleMap[activeCompany]?.[0] || "";
    const updated = { ...checked, [i]: !checked[i] };
    setChecked(updated);
    localStorage.setItem(
      `checklist_${activeCompany}_${role}`,
      JSON.stringify(updated)
    );
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

            <section>
              <h2>Interview Preparation Checklist</h2>
              {insights.checklist.map((item, i) => (
                <label key={i} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={checked[i] || false}
                    onChange={() => toggleChecklist(i)}
                  />
                  {item}
                </label>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}