import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserFriendlyErrorMessage, getErrorAdvice } from "../utils/apiErrorMessages";
import { baseURL } from "../api";
import "./ResumeOptimizeRun.css";

export default function ResumeOptimizeRun() {
  const navigate = useNavigate();
  const location = useLocation();
  const { job, sections, resumeTitle, selectedTemplate } = location.state || {};

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  // ⚙️ Run AI optimization as soon as we have job + resume data
  useEffect(() => {
    if (!job || !sections) {
      navigate("/resume/optimize");
      return;
    }
    optimizeResume();
  }, [job, sections]);

  // 🔮 Call backend to generate tailored content
  async function optimizeResume() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${baseURL}/api/resumes/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobDescription: job.description,
          sections,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Create error object that matches axios error format for our utility
        const errorObj = { response: { status: res.status, data } };
        throw errorObj;
      }

      setResult(data.optimizedSections || data);
    } catch (err) {
      console.error("❌ AI optimize failed:", err);
      const friendlyMessage = getUserFriendlyErrorMessage(err, 'AI Resume Optimization');
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  // 🔁 Re-run optimization
  function regenerate() {
    optimizeResume();
  }

  // ✅ Merge AI output into existing resume sections
  function applyToCompare() {
    navigate("/resume/compare", {
      state: {
        masterResume: sections,
        aiSuggestions: result,
        resumeTitle,
        selectedTemplate,
        job,
        fromOptimize: true, // Flag to track that we came from optimize flow
      },
    });
  }

  // 🎨 Get color based on relevance score
  function getScoreColor(score) {
    if (score >= 80) return "#10b981"; // green
    if (score >= 60) return "#f59e0b"; // orange
    return "#ef4444"; // red
  }

  // 🎨 Get priority badge color
  function getPriorityColor(priority) {
    if (priority === "high") return "#dc2626";
    if (priority === "medium") return "#f59e0b";
    return "#6b7280";
  }

  return (
    <div className="optimize-run-container">
      <div className="optimize-header">
        <h1>✨ AI Resume Optimization</h1>
        <p className="job-info">
          Job: <strong>{job?.title}</strong> — {job?.company}
        </p>
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner"></div>
          <p>🤖 Generating tailored suggestions...</p>
        </div>
      )}

      {error && (
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          <div>
            <div>{error}</div>
            {getErrorAdvice(error) && (
              <div style={{ marginTop: '8px', fontSize: '0.9em', opacity: 0.9 }}>
                {getErrorAdvice(error)}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="results-container">
          {/* === SUMMARY === */}
          <section className="result-section">
            <div className="section-header">
              <h2>📄 Summary Recommendation</h2>
            </div>
            <div className="summary-content">
              <p>{result.summary_recommendation || "—"}</p>
            </div>
          </section>

          {/* === EXPERIENCE WITH RELEVANCE SCORES === */}
          {Array.isArray(result.optimized_experience) && (
            <section className="result-section">
              <div className="section-header">
                <h2>💼 Optimized Experience</h2>
                <span className="section-subtitle">
                  Sorted by relevance to target role
                </span>
              </div>

              {result.optimized_experience
                .sort(
                  (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
                )
                .map((exp, i) => (
                  <div key={i} className="experience-card">
                    {/* Header with relevance score */}
                    <div className="exp-header">
                      <div className="exp-title-group">
                        <strong className="exp-role">{exp.role}</strong>
                        {exp.company && (
                          <span className="exp-company"> — {exp.company}</span>
                        )}
                      </div>

                      <div
                        className="relevance-badge"
                        style={{
                          backgroundColor: getScoreColor(exp.relevance_score),
                        }}
                      >
                        <span className="score-value">
                          {exp.relevance_score || 0}
                        </span>
                        <span className="score-label">Relevance</span>
                      </div>
                    </div>

                    {/* Relevance reasoning */}
                    {exp.relevance_reasoning && (
                      <div className="relevance-reason">
                        <strong>Why relevant:</strong> {exp.relevance_reasoning}
                      </div>
                    )}

                    {/* Keywords */}
                    {exp.relevant_keywords &&
                      exp.relevant_keywords.length > 0 && (
                        <div className="keyword-tags">
                          {exp.relevant_keywords.map((kw, j) => (
                            <span key={j} className="keyword-tag">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Bullet points */}
                    <ul className="bullet-list">
                      {exp.bullets?.map((bullet, j) => {
                        const bulletData =
                          typeof bullet === "string"
                            ? { text: bullet, is_relevant: true }
                            : bullet;

                        return (
                          <li
                            key={j}
                            className={
                              bulletData.is_relevant
                                ? "bullet-relevant"
                                : "bullet-normal"
                            }
                          >
                            <span className="bullet-text">
                              {bulletData.text}
                            </span>
                            {bulletData.highlight_reason && (
                              <div className="bullet-highlight">
                                <span className="highlight-icon">💡</span>
                                {bulletData.highlight_reason}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {/* Quantification notes */}
                    {exp.quantification_notes && (
                      <div className="quantification-notes">
                        <strong>📊 Metrics suggestion:</strong>{" "}
                        {exp.quantification_notes}
                      </div>
                    )}
                  </div>
                ))}
            </section>
          )}

          {/* === SKILLS === */}
          {Array.isArray(result.optimized_skills) && (
            <section className="result-section">
              <div className="section-header">
                <h2>🧠 Optimized Skills</h2>
                <span className="section-subtitle">Prioritized for ATS</span>
              </div>

              <div className="skills-grid">
                {result.optimized_skills.map((s, i) => (
                  <div key={i} className="skill-card">
                    <div className="skill-header">
                      <strong className="skill-name">{s.skill}</strong>
                      {s.priority && (
                        <span
                          className="priority-badge"
                          style={{
                            backgroundColor: getPriorityColor(s.priority),
                          }}
                        >
                          {s.priority}
                        </span>
                      )}
                    </div>
                    <p className="skill-reason">{s.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === ATS KEYWORDS === */}
          {Array.isArray(result.ats_keywords) && (
            <section className="result-section">
              <div className="section-header">
                <h2>🔑 ATS Keywords</h2>
                <span className="section-subtitle">
                  Include these in your resume
                </span>
              </div>
              <div className="keyword-cloud">
                {result.ats_keywords.map((keyword, i) => (
                  <span key={i} className="ats-keyword">
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* === VARIATIONS === */}
          {Array.isArray(result.variation_options) && (
            <section className="result-section">
              <div className="section-header">
                <h2>🎨 Alternative Summaries</h2>
              </div>
              <div className="variations-list">
                {result.variation_options.map((v, i) => (
                  <div key={i} className="variation-item">
                    <span className="variation-label">Option {i + 1}</span>
                    <p className="variation-text">{v}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === ACTIONS === */}
          <div className="action-buttons">
            <button onClick={applyToCompare} className="btn-primary">
              ⚖️ Compare & Merge
            </button>

            <button onClick={regenerate} className="btn-secondary">
              🔄 Re-generate
            </button>

            <button onClick={() => navigate(-1)} className="btn-back">
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
