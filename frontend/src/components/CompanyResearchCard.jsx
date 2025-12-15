import React, { useState } from "react";
import { api } from "../api";
import { getErrorAdvice } from "../utils/apiErrorMessages";
import "./CompanyDetails.css";

export default function CompanyResearchCard({ data, loading, error }) {
  const [exporting, setExporting] = useState(false);

  if (loading) return <p>Loading company research...</p>;
  if (error) {
    return (
      <div style={{ 
        padding: "1rem", 
        background: "#fee2e2", 
        border: "1px solid #fca5a5", 
        borderRadius: "8px",
        color: "#991b1b"
      }}>
        <p style={{ margin: 0, fontWeight: "500" }}>{error}</p>
        {getErrorAdvice(error) && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.9 }}>
            {getErrorAdvice(error)}
          </p>
        )}
      </div>
    );
  }
  if (!data) return null;

  const {
    company,
    basics,
    missionValuesCulture,
    executives,
    productsServices,
    competitiveLandscape,
    social,
    news,
    summary,
    interviewPrep, // 🆕 UC-074
  } = data;

  // 🆕 UC-074: Export Research Summary
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await api.post(
        "/api/companyResearch/export",
        {
          researchData: data,
          format: format, // 'json' or 'text'
        },
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: format === "json" ? "application/json" : "text/plain",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const companyName = company || data.basics?.company || "Company";
a.download = `${companyName.replace(/\s+/g, "_")}_research_${timestamp}.${
  format === "json" ? "json" : "txt"
}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export research summary");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="cdl-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>{company}</h2>
        
        {/* 🆕 UC-074: Export Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="export-btn"
            onClick={() => handleExport("text")}
            disabled={exporting}
            title="Export as formatted text file"
            style={{
              padding: "0.5rem 1rem",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: exporting ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            {exporting ? "Exporting..." : "📄 Export Text"}
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport("json")}
            disabled={exporting}
            title="Export as JSON file"
            style={{
              padding: "0.5rem 1rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: exporting ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            {exporting ? "Exporting..." : "📦 Export JSON"}
          </button>
        </div>
      </div>

      <section>
        <h3>Basics</h3>
        <ul>
          <li><strong>Industry:</strong> {basics?.industry || "N/A"}</li>
          <li><strong>Size:</strong> {basics?.size || "N/A"}</li>
          <li><strong>Headquarters:</strong> {basics?.headquarters || "N/A"}</li>
        </ul>
      </section>

      <section>
        <h3>Mission, Values, and Culture</h3>
        <p><strong>Mission:</strong> {missionValuesCulture?.mission || "—"}</p>
        <p><strong>Culture:</strong> {missionValuesCulture?.culture || "—"}</p>
        <p><strong>Values:</strong> {(missionValuesCulture?.values || []).join(", ") || "—"}</p>
      </section>

      <section>
        <h3>Executives</h3>
        {executives?.length ? (
          <ul>
            {executives.map((e, i) => (
              <li key={i}>{e.name} — {e.title}</li>
            ))}
          </ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h3>Products & Services</h3>
        {productsServices?.length ? (
          <ul>{productsServices.map((p, i) => <li key={i}>{p}</li>)}</ul>
        ) : <p>—</p>}
      </section>

      <section>
        <h3>Competitive Landscape</h3>
        {competitiveLandscape?.length ? (
          <ul>{competitiveLandscape.map((c, i) => <li key={i}>{c}</li>)}</ul>
        ) : <p>—</p>}
      </section>

      {/* 🆕 UC-074: Interview Preparation Section */}
      {interviewPrep && (
        <>
          <section className="interview-prep-section">
            <h3>💡 Interview Talking Points</h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              Use these conversation starters to demonstrate your knowledge of the company:
            </p>
            {interviewPrep.talkingPoints?.length ? (
              <ul className="talking-points-list">
                {interviewPrep.talkingPoints.map((point, i) => (
                  <li key={i} className="talking-point-item">
                    <span className="talking-point-number">{i + 1}</span>
                    <span className="talking-point-text">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>—</p>
            )}
          </section>

          <section className="interview-prep-section">
            <h3>❓ Intelligent Questions to Ask</h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              Ask these questions to show engagement and learn about the role:
            </p>
            {interviewPrep.questionsToAsk?.length ? (
              <ul className="questions-list">
                {interviewPrep.questionsToAsk.map((question, i) => (
                  <li key={i} className="question-item">
                    <span className="question-number">{i + 1}</span>
                    <span className="question-text">{question}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>—</p>
            )}
          </section>
        </>
      )}

      <section>
        <h3>Social Media</h3>
        <ul>
          {social?.website && <li><a href={social.website} target="_blank" rel="noreferrer">Website</a></li>}
          {social?.linkedin && <li><a href={social.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>}
          {social?.twitter && <li><a href={social.twitter} target="_blank" rel="noreferrer">Twitter</a></li>}
          {social?.youtube && <li><a href={social.youtube} target="_blank" rel="noreferrer">YouTube</a></li>}
        </ul>
      </section>

      <section>
        <h3>Summary</h3>
        <p>{summary || "—"}</p>
      </section>
    </div>
  );
}