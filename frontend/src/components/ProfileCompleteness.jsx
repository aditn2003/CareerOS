import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function ProfileCompletenessMeter({ data }) {
  const score = data?.score || 0;
  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";

  return (
    <div style={{ 
      width: "180px", 
      margin: "2rem auto", 
      textAlign: "center",
      padding: "1.5rem",
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: "16px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e2e8f0"
    }}>
      <CircularProgressbar
        value={score}
        text={`${score}%`}
        styles={buildStyles({
          textColor: color,
          pathColor: color,
          trailColor: "#e5e7eb",
          textSize: "24px",
          pathTransitionDuration: 0.5,
        })}
      />
      <p style={{ 
        marginTop: "1rem", 
        color,
        fontSize: "1.1rem",
        fontWeight: "600",
        marginBottom: 0
      }}>{label}</p>
    </div>
  );
}
