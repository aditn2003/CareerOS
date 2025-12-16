// frontend/src/pages/Salary/SalaryResearch.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./salary.css";

export default function SalaryResearch() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [userSalary, setUserSalary] = useState(""); // NEW FIELD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load all jobs for the logged-in user
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/jobs");
        setJobs(res.data.jobs || []);
      } catch (e) {
        console.error("❌ Failed to load jobs:", e);
        setError("Failed to load jobs. Add some jobs first.");
      }
    }
    loadJobs();
  }, []);

  async function fetchSalary(job, forceRefresh = false) {
    if (!job) return;
    try {
      setLoading(true);
      setError("");
      setSalaryData(null);
      setSelectedJob(job);

      const res = await api.get(`/api/salary-research/${job.id}`, {
        params: { 
          userSalary,
          forceRefresh: forceRefresh ? "true" : "false"
        },
      });

      setSalaryData(res.data);
    } catch (e) {
      console.error("❌ Salary research error:", e);
      
      // Graceful error handling
      if (e.response?.data?.job) {
        // Partial data available
        setError("Some salary data may be unavailable, but basic information is shown.");
        setSalaryData({
          ...e.response.data,
          error: true,
        });
      } else {
        setError(e.response?.data?.message || "Failed to fetch salary research. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!salaryData || !selectedJob) return;

    const payload = {
      generatedAt: new Date().toISOString(),
      job: {
        id: selectedJob.id,
        title: selectedJob.title,
        company: selectedJob.company,
        location: selectedJob.location,
      },
      salary: salaryData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-research-${selectedJob.company || "company"}-${
      selectedJob.title || "role"
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="salary-wrapper">
      <h1 className="salary-h1">Automated Salary Research</h1>

      {/* Job buttons like Walmart / Tesla */}
      <div className="job-buttons">
        {jobs.length === 0 && (
          <p className="no-jobs-message">
            No jobs found. Add jobs in the Jobs tab to run salary research.
          </p>
        )}

        {jobs.map((job) => (
          <button
            key={job.id}
            className={
              selectedJob && selectedJob.id === job.id
                ? "job-btn job-btn-active"
                : "job-btn"
            }
            onClick={() => fetchSalary(job)}
          >
            {job.company || "Unknown"}{" "}
            {job.title ? `– ${job.title}` : ""}
          </button>
        ))}
      </div>

      {/* User current salary input */}
      <div className="salary-user-comp-wrapper">
        <input
          type="number"
          placeholder="Your current salary (optional)"
          className="salary-user-input"
          value={userSalary}
          onChange={(e) => setUserSalary(e.target.value)}
        />
      </div>

      {/* Refresh button */}
      <div className="salary-refresh-wrapper">
        <button
          className="salary-refresh-btn"
          disabled={!selectedJob || loading}
          onClick={() => fetchSalary(selectedJob, false)}
          style={{ marginRight: "8px" }}
        >
          🔁 Refresh Salary Research
        </button>
        <button
          className="salary-refresh-btn"
          disabled={!selectedJob || loading}
          onClick={() => fetchSalary(selectedJob, true)}
          style={{
            backgroundColor: "#f59e0b",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: loading || !selectedJob ? "not-allowed" : "pointer",
            opacity: loading || !selectedJob ? 0.6 : 1
          }}
        >
          🔄 Force Refresh (Bypass Cache)
        </button>
      </div>

      {loading && (
        <div className="salary-loading">Fetching salary research…</div>
      )}

      {error && <div className="salary-error">{error}</div>}

      {/* Results area */}
      {salaryData && (
        <div className="salary-results">
          {/* Data source and cache status */}
          {salaryData.dataSource && (
            <div style={{
              padding: "12px",
              backgroundColor: "#eff6ff",
              border: "1px solid #3b82f6",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "13px"
            }}>
              <strong>📊 Data Source:</strong> {salaryData.dataSource}
              {salaryData.cached && (
                <span style={{ marginLeft: "12px", color: "#059669" }}>
                  ✓ Cached
                  {salaryData.cacheTimestamp && (
                    <span style={{ marginLeft: "8px", color: "#6b7280" }}>
                      (Updated: {new Date(salaryData.cacheTimestamp).toLocaleDateString()})
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Meta info */}
          <section className="salary-section">
            <h2>📌 Position & Market Factors</h2>
            <p><strong>Title:</strong> {salaryData.title}</p>
            <p><strong>Company:</strong> {salaryData.company}</p>
            <p><strong>Location:</strong> {salaryData.location}</p>
            <p><strong>Experience Level:</strong> {salaryData.level}</p>
            <p><strong>Company Size:</strong> {salaryData.companySize}</p>
          </section>

          {/* Salary range with percentiles */}
          <section className="salary-section">
            <h2>💵 Salary Range for Similar Positions</h2>
            <div style={{ marginBottom: "16px" }}>
              <p><strong>Low:</strong> ${salaryData.range.low.toLocaleString()}</p>
              <p><strong>Average:</strong> ${salaryData.range.avg.toLocaleString()}</p>
              <p><strong>High:</strong> ${salaryData.range.high.toLocaleString()}</p>
            </div>
            
            {/* Percentile breakdown */}
            {salaryData.range.percentile25 && salaryData.range.percentile50 && salaryData.range.percentile75 && (
              <div style={{
                marginTop: "16px",
                padding: "16px",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1rem" }}>
                  📈 Percentile Breakdown
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  <div>
                    <strong style={{ color: "#6b7280", fontSize: "0.875rem" }}>25th Percentile</strong>
                    <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: "4px 0 0 0", color: "#dc2626" }}>
                      ${salaryData.range.percentile25.toLocaleString()}
                    </p>
                    <small style={{ color: "#6b7280" }}>Lower quartile</small>
                  </div>
                  <div>
                    <strong style={{ color: "#6b7280", fontSize: "0.875rem" }}>50th Percentile (Median)</strong>
                    <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: "4px 0 0 0", color: "#2563eb" }}>
                      ${salaryData.range.percentile50.toLocaleString()}
                    </p>
                    <small style={{ color: "#6b7280" }}>Market median</small>
                  </div>
                  <div>
                    <strong style={{ color: "#6b7280", fontSize: "0.875rem" }}>75th Percentile</strong>
                    <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: "4px 0 0 0", color: "#059669" }}>
                      ${salaryData.range.percentile75.toLocaleString()}
                    </p>
                    <small style={{ color: "#6b7280" }}>Upper quartile</small>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Total compensation */}
          <section className="salary-section">
            <h2>💼 Total Compensation (Including Benefits)</h2>
            <p><strong>Base:</strong> ${salaryData.comp.base.toLocaleString()}</p>
            <p><strong>Bonus:</strong> ${salaryData.comp.bonus.toLocaleString()}</p>
            <p><strong>Stock:</strong> ${salaryData.comp.stock.toLocaleString()}</p>
            <p><strong>Total Compensation:</strong> ${salaryData.comp.total.toLocaleString()}</p>
          </section>

          {/* Cross-company comparison */}
          <section className="salary-section">
            <h2>🏢 Comparison Across Companies</h2>
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Low</th>
                  <th>Average</th>
                  <th>High</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.companies.map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.company}</td>
                    <td>${c.low.toLocaleString()}</td>
                    <td>${c.avg.toLocaleString()}</td>
                    <td>${c.high.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Historical trends */}
          <section className="salary-section">
            <h2>📈 Historical Salary Trend</h2>
            <div className="salary-trend-box">
              {salaryData.trends.map((t) => (
                <div key={t.year}>
                  <strong>{t.year}:</strong> ${t.avg.toLocaleString()}
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section className="salary-section">
            <h2>🎯 Negotiation Recommendations</h2>
            <div className="salary-rec-box">
            <div className="salary-rec-text">
  {salaryData.recommendations}
</div>
            </div>
          </section>

          {/* User vs Market */}
          <section className="salary-section">
            <h2>🧍 Your Compensation vs Market</h2>
            <p>
              <strong>Your Salary:</strong>{" "}
              {salaryData.userSalary
                ? `$${salaryData.userSalary.toLocaleString()}`
                : "Not provided"}
            </p>
            <p>
              <strong>Difference vs Market Avg:</strong>{" "}
              {salaryData.userSalary
                ? `${salaryData.marketDiff > 0 ? "+" : ""}${salaryData.marketDiff}%`
                : "N/A"}
            </p>
          </section>

          {/* Export */}
          <button className="salary-export-btn" onClick={handleExport}>
            📄 Export Salary Report
          </button>

          {/* Disclaimer */}
          <section className="salary-section" style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px"
          }}>
            <h3 style={{ marginTop: 0, fontSize: "0.95rem", color: "#92400e" }}>
              ⚠️ Data Disclaimer
            </h3>
            <div style={{ fontSize: "0.875rem", color: "#78350f", lineHeight: "1.6" }}>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Data Sources & Accuracy:</strong>
              </p>
              <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px" }}>
                <li>Salary data is derived from multiple sources including computed market estimates and cached data from free APIs where available.</li>
                <li>When available, data may include information from the U.S. Bureau of Labor Statistics (BLS) and community-contributed sources.</li>
                <li>Salary ranges are estimates based on job title, location, experience level, and company size. Actual compensation may vary significantly.</li>
                <li>Percentile breakdowns are calculated using statistical models and should be used as general guidelines only.</li>
              </ul>
              <p style={{ margin: "8px 0 0 0", fontStyle: "italic" }}>
                This information is provided for informational purposes only and should not be the sole basis for compensation decisions. 
                Always conduct your own research and consider multiple factors when negotiating salary.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Error state with graceful handling */}
      {error && salaryData?.job && (
        <div style={{
          padding: "16px",
          backgroundColor: "#fee2e2",
          border: "1px solid #dc2626",
          borderRadius: "6px",
          marginTop: "16px"
        }}>
          <p style={{ margin: 0, color: "#991b1b" }}>
            ⚠️ Unable to fetch complete salary data, but partial information may be available above.
          </p>
        </div>
      )}
    </div>
  );
}
