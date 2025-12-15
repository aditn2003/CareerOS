// frontend/src/components/JobTimeline.jsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./JobTimeline.css";

export default function JobTimeline({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobs, setSelectedJobs] = useState(new Set());

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await api.get("/api/jobs/history");
        console.log("📅 Timeline API response:", res.data);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error("Failed to load job history:", err);
        console.error("Error details:", err.response?.data || err.message);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadHistory();
    }
  }, [token]);

  // Initialize selectedJobs with all jobs when history loads
  useEffect(() => {
    if (history.length > 0 && selectedJobs.size === 0) {
      const allJobIds = new Set(history.map((job) => job.job_id));
      setSelectedJobs(allJobIds);
    }
  }, [history]);

  // Status mapping for Y-axis
  const statusOrder = {
    "Interested": 1,
    "Applied": 2,
    "Phone Screen": 3,
    "Interview": 4,
    "Offer": 5,
    "Rejected": 6,
  };

  const statusLabels = {
    1: "Interested",
    2: "Applied",
    3: "Phone Screen",
    4: "Interview",
    5: "Offer",
    6: "Rejected",
  };

  const getStatusColor = (index, total) => {
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#06b6d4", // cyan
      "#f97316", // orange
      "#ec4899", // pink
      "#14b8a6", // teal
      "#6366f1", // indigo
    ];
    return colors[index % colors.length];
  };

  // Prepare chart data: one line per job
  const chartData = useMemo(() => {
    // Get all unique timestamps across selected jobs
    const allTimestamps = new Set();
    history
      .filter((jobHistory) => selectedJobs.has(jobHistory.job_id))
      .forEach((jobHistory) => {
        jobHistory.history.forEach((event) => {
          allTimestamps.add(new Date(event.timestamp).getTime());
        });
      });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Create data points for each timestamp
    const dataPoints = sortedTimestamps.map((timestamp) => {
      const point = {
        time: timestamp,
        date: new Date(timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };

      // For each selected job, find its status at this timestamp
      history
        .filter((jobHistory) => selectedJobs.has(jobHistory.job_id))
        .forEach((jobHistory) => {
          const jobKey = `job_${jobHistory.job_id}`;
          const jobLabel = `${jobHistory.title} (${jobHistory.company})`;

          // Find the most recent event for this job up to this timestamp
          const relevantEvents = jobHistory.history
            .filter((e) => new Date(e.timestamp).getTime() <= timestamp)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          if (relevantEvents.length > 0) {
            const latestEvent = relevantEvents[0];
            const status = latestEvent.to_status || latestEvent.from_status;
            if (status && statusOrder[status]) {
              point[jobKey] = statusOrder[status];
              point[`${jobKey}_label`] = jobLabel;
              // Always set the status for tooltip display (shows current status at this timestamp)
              point[`${jobKey}_status`] = status;
            }
          }
        });

      return point;
    });

    return dataPoints;
  }, [history, selectedJobs]);

  // Get job info for legend and tooltip
  const jobInfo = useMemo(() => {
    const info = {};
    history.forEach((jobHistory, index) => {
      info[`job_${jobHistory.job_id}`] = {
        label: `${jobHistory.title} (${jobHistory.company})`,
        color: getStatusColor(index, history.length),
        jobId: jobHistory.job_id,
      };
    });
    return info;
  }, [history]);

  // Filter visible jobs
  const visibleJobs = useMemo(() => {
    return history.filter((jobHistory) =>
      selectedJobs.has(jobHistory.job_id)
    );
  }, [history, selectedJobs]);

  const handleJobToggle = (jobId) => {
    setSelectedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allJobIds = new Set(history.map((job) => job.job_id));
      setSelectedJobs(allJobIds);
    } else {
      setSelectedJobs(new Set());
    }
  };

  const allSelected = selectedJobs.size === history.length && history.length > 0;
  const someSelected = selectedJobs.size > 0 && selectedJobs.size < history.length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const validEntries = payload.filter((entry) => entry.value);
      
      if (validEntries.length === 0) return null;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <div className="tooltip-items-container">
            {validEntries.map((entry, index) => {
              const jobId = entry.dataKey;
              const jobData = entry.payload;
              const statusLabel = jobData[`${jobId}_status`];
              const jobLabel = jobData[`${jobId}_label`] || jobInfo[jobId]?.label || "Job";

              // Get the status from the payload, or find it from the job's history
              let displayStatus = statusLabel;
              if (!displayStatus && entry.value) {
                // If no status label in payload, find the most recent status for this job
                const jobHistory = history.find((jh) => `job_${jh.job_id}` === jobId);
                if (jobHistory) {
                  const relevantEvents = jobHistory.history
                    .filter((e) => new Date(e.timestamp).getTime() <= label)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                  if (relevantEvents.length > 0) {
                    displayStatus = relevantEvents[0].to_status || relevantEvents[0].from_status;
                  }
                }
              }

              return (
                <div key={index} className="tooltip-item">
                  <span
                    className="tooltip-dot"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="tooltip-item-content">
                    <strong className="tooltip-job-name">{jobLabel}</strong>
                    <span className="tooltip-status">: {displayStatus || "Interested"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="job-timeline-container">
        <h3>📅 Job Timeline</h3>
        <p className="loading-text">Loading timeline...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="job-timeline-container">
        <h3>📅 Job Timeline</h3>
        <p className="no-history">
          No job history available yet. Start tracking your applications to see changes here.
          <br />
          <small style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
            Timeline will appear here when you update job statuses.
          </small>
        </p>
      </div>
    );
  }

  return (
    <div className="job-timeline-container">
      <h3>📅 Job Timeline</h3>
      <p className="timeline-subtitle">
        Status progression over time - one line per job
      </p>

      {/* Job Filter Checkboxes */}
      <div className="job-filter-section">
        <div className="filter-header">
          <h4 className="filter-title">Filter Jobs</h4>
          <label className="filter-all-checkbox">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span className="checkbox-label">All Jobs ({history.length})</span>
          </label>
        </div>
        <div className="job-checkboxes">
          {history.map((jobHistory, index) => {
            const isSelected = selectedJobs.has(jobHistory.job_id);
            const jobKey = `job_${jobHistory.job_id}`;
            const color = jobInfo[jobKey]?.color || getStatusColor(index, history.length);

            return (
              <label
                key={jobHistory.job_id}
                className="job-checkbox-item"
                style={{
                  opacity: isSelected ? 1 : 0.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleJobToggle(jobHistory.job_id)}
                />
                <span
                  className="checkbox-color-indicator"
                  style={{ backgroundColor: color }}
                />
                <span className="checkbox-label">
                  {jobHistory.title} ({jobHistory.company})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Line Chart: One line per job */}
      {visibleJobs.length > 0 ? (
        <div className="chart-section">
          <h4 className="chart-title">
            Job Status Progression ({visibleJobs.length} {visibleJobs.length === 1 ? "job" : "jobs"} shown)
          </h4>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 80, left: 110 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                dataKey="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                label={{
                  value: "Time",
                  position: "insideBottom",
                  offset: -10,
                  style: { textAnchor: "middle", fill: "#6b7280" },
                }}
                stroke="#6b7280"
              />
              <YAxis
                type="number"
                domain={[0.5, 6.5]}
                ticks={[1, 2, 3, 4, 5, 6]}
                tickFormatter={(value) => {
                  const label = statusLabels[value];
                  return label || "";
                }}
                label={{
                  value: "Status",
                  angle: -90,
                  position: "insideLeft",
                  offset: -5,
                  style: { textAnchor: "middle", fill: "#6b7280", fontSize: "12px", fontWeight: 600 },
                }}
                stroke="#6b7280"
                tick={{ fill: "#374151", fontSize: 11, fontWeight: 500 }}
                width={110}
                allowDecimals={false}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 1000 }}
                allowEscapeViewBox={{ x: true, y: true }}
                position={{ x: 'auto', y: 'auto' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px", fontSize: "10px" }}
                formatter={(value) => {
                  const jobId = value;
                  const label = jobInfo[jobId]?.label || value;
                  // Truncate long labels to prevent overlapping
                  return label.length > 35 ? label.substring(0, 32) + "..." : label;
                }}
                iconType="line"
                iconSize={10}
                layout="horizontal"
                verticalAlign="bottom"
              />
              {visibleJobs.map((jobHistory, index) => {
                const jobKey = `job_${jobHistory.job_id}`;
                return (
                  <Line
                    key={jobKey}
                    type="monotone"
                    dataKey={jobKey}
                    stroke={jobInfo[jobKey]?.color || getStatusColor(index, history.length)}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                    name={jobKey}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-section no-jobs-selected">
          <p>Please select at least one job to display the timeline.</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="timeline-summary">
        <div className="summary-stat">
          <span className="stat-value">
            {history.reduce((sum, job) => sum + job.history.length, 0)}
          </span>
          <span className="stat-label">Total Events</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{history.length}</span>
          <span className="stat-label">Jobs Tracked</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{visibleJobs.length}</span>
          <span className="stat-label">Jobs Shown</span>
        </div>
      </div>
    </div>
  );
}
