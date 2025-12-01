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

  async function fetchSalary(job) {
    if (!job) return;
    try {
      setLoading(true);
      setError("");
      setSalaryData(null);
      setSelectedJob(job);

      const res = await api.get(`/api/salary-research/${job.id}`, {
        params: { userSalary }, // pass user input to backend
      });

      setSalaryData(res.data);
    } catch (e) {
      console.error("❌ Salary research error:", e);
      setError("Failed to fetch salary research.");
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
          onClick={() => fetchSalary(selectedJob)}
        >
          🔁 Refresh Salary Research
        </button>
      </div>

      {loading && (
        <div className="salary-loading">Fetching salary research…</div>
      )}

      {error && <div className="salary-error">{error}</div>}

      {/* Results area */}
      {salaryData && (
        <div className="salary-results">
          
          {/* Meta info */}
          <section className="salary-section">
            <h2>📌 Position & Market Factors</h2>
            <p><strong>Title:</strong> {salaryData.title}</p>
            <p><strong>Company:</strong> {salaryData.company}</p>
            <p><strong>Location:</strong> {salaryData.location}</p>
            <p><strong>Experience Level:</strong> {salaryData.level}</p>
            <p><strong>Company Size:</strong> {salaryData.companySize}</p>
          </section>

          {/* Salary range */}
          <section className="salary-section">
            <h2>💵 Salary Range for Similar Positions</h2>
            <p><strong>Low:</strong> ${salaryData.range.low.toLocaleString()}</p>
            <p><strong>Average:</strong> ${salaryData.range.avg.toLocaleString()}</p>
            <p><strong>High:</strong> ${salaryData.range.high.toLocaleString()}</p>
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
        </div>
      )}
    </div>
  );
}
