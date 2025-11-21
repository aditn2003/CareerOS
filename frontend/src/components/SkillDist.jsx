import React from "react";
import "./skillChart.css";

export default function SkillDistributionChart({ data }) {
  // if (!data || data.length === 0) {
  //   return <p>No skill data available yet.</p>;
  // }

  // Compute total for percentage bars
  const total = data.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="skills-chart">
      <h3>Skill Distribution</h3>
      <div className="bars">
        {data.map((s, i) => {
          const width = ((s.count / total) * 100).toFixed(1);
          return (
            <div key={i} className="bar">
              <span className="label">{s.category}</span>
              <div className="bar-bg">
                <div
                  className="bar-fill"
                  style={{
                    width: `${width}%`,
                    backgroundColor: [
                      "#6366f1",
                      "#22c55e",
                      "#f97316",
                      "#06b6d4",
                      "#e11d48",
                    ][i % 5],
                  }}
                ></div>
              </div>
              <span className="value">{width}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
