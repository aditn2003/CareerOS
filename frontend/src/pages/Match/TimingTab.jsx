// src/pages/Match/TimingTab.jsx
import React, { useState, useEffect } from "react";
import { api } from "../../api";
import TimingAnalytics from "../../components/TimingAnalytics";

export default function TimingTab({ jobId: jobIdProp }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobIdProp || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timingData, setTimingData] = useState(null);
  const [scheduledSubmissions, setScheduledSubmissions] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });
  const [scheduling, setScheduling] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/api/jobs");
        setJobs(res.data.jobs || []);
      } catch (err) {
        console.error("❌ Error loading jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  // Set jobId from prop when component mounts or prop changes
  useEffect(() => {
    if (jobIdProp && jobIdProp !== selectedJobId) {
      setSelectedJobId(jobIdProp);
    }
  }, [jobIdProp]);

  // Load timing recommendations when job is selected
  useEffect(() => {
    if (selectedJobId) {
      loadTimingRecommendations();
      loadScheduledSubmissions();
    }
  }, [selectedJobId]);

  // Load scheduled submissions
  const loadScheduledSubmissions = async () => {
    if (!selectedJobId) return;
    
    try {
      const res = await api.get(`/api/timing/scheduled?jobId=${selectedJobId}`);
      setScheduledSubmissions(res.data.schedules || []);
    } catch (err) {
      console.error("❌ Error loading scheduled submissions:", err);
    }
  };

  const loadTimingRecommendations = async () => {
    if (!selectedJobId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.get(`/api/timing/recommendations/${selectedJobId}`);
      const data = res.data;
      
      console.log('📊 Timing data received:', data);
      console.log('📊 Company analysis:', data.recommendation?.company_analysis);
      
      setTimingData({
        recommendation: data.recommendation,
        job: data.job
      });
    } catch (err) {
      console.error("❌ Error loading timing recommendations:", err);
      setError(err.response?.data?.error || "Failed to load timing recommendations");
    } finally {
      setLoading(false);
    }
  };


  const handleScheduleSubmission = async () => {
    if (!selectedJobId || !scheduleForm.scheduledDate || !scheduleForm.scheduledTime) {
      alert("Please select both date and time");
      return;
    }

    setScheduling(true);
    try {
      const res = await api.post("/api/timing/schedule", {
        jobId: selectedJobId,
        scheduledDate: scheduleForm.scheduledDate,
        scheduledTime: scheduleForm.scheduledTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: scheduleForm.notes
      });

      console.log("✅ Submission scheduled:", res.data);
      setShowScheduleForm(false);
      setScheduleForm({ scheduledDate: '', scheduledTime: '', notes: '' });
      await loadScheduledSubmissions();
    } catch (err) {
      console.error("❌ Error scheduling submission:", err);
      alert(err.response?.data?.error || "Failed to schedule submission. Please try again.");
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to cancel this scheduled submission?")) {
      return;
    }

    try {
      await api.put(`/api/timing/schedule/${scheduleId}`, {
        status: 'cancelled'
      });
      await loadScheduledSubmissions();
    } catch (err) {
      console.error("❌ Error cancelling schedule:", err);
      alert("Failed to cancel schedule. Please try again.");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to permanently delete this scheduled submission? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/api/timing/schedule/${scheduleId}`);
      await loadScheduledSubmissions();
      alert("✅ Scheduled submission deleted successfully");
    } catch (err) {
      console.error("❌ Error deleting schedule:", err);
      alert("Failed to delete schedule. Please try again.");
    }
  };

  const handleCompleteSchedule = async (scheduleId) => {
    try {
      // Mark as completed - this will also record it as a submission
      const res = await api.put(`/api/timing/schedule/${scheduleId}`, {
        status: 'completed'
      });
      
      if (res.data.success) {
        alert("✅ Application marked as completed and recorded!");
      }
      
      await loadScheduledSubmissions();
      await loadTimingRecommendations();
    } catch (err) {
      console.error("❌ Error completing schedule:", err);
      alert("Failed to mark as completed. Please try again.");
    }
  };


  const selectedJob = jobs.find(j => String(j.id) === String(selectedJobId));

  return (
    <div className="timing-tab-content">
      <div className="timing-header">
        <h2>Timing Recommendations</h2>
        <p className="timing-subtitle">
          Get personalized recommendations on when to apply and follow up for maximum impact
        </p>
        <div className="timing-header-actions">
          <button
            className="timing-analytics-toggle-btn"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? "📊 Hide Analytics" : "📊 View Analytics"}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="timing-analytics-container">
          <TimingAnalytics />
        </div>
      )}

      {/* Job Selector */}
      <div className="timing-job-selector">
        <label htmlFor="timing-job-select">Select Job:</label>
        <select
          id="timing-job-select"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="timing-job-select"
        >
          <option value="">-- Select a job --</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} at {job.company}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="timing-loading">
          <p>Loading timing recommendations...</p>
        </div>
      )}

      {error && (
        <div className="timing-error">
          <p>❌ {error}</p>
        </div>
      )}

      {!loading && !error && !selectedJobId && (
        <div className="timing-placeholder">
          <p>Please select a job to view timing recommendations.</p>
        </div>
      )}

      {!loading && !error && selectedJobId && !timingData && (
        <div className="timing-placeholder">
          <p>No timing recommendations available for this job yet.</p>
          <p className="timing-placeholder-note">
            Timing recommendations are generated based on your application quality score (70+ required).
          </p>
          <button
            className="timing-schedule-btn"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setScheduleForm({
                scheduledDate: tomorrow.toISOString().split('T')[0],
                scheduledTime: '10:00:00',
                notes: ''
              });
              setShowScheduleForm(true);
            }}
            style={{ marginTop: '20px' }}
          >
            📅 Schedule Submission Manually
          </button>
        </div>
      )}

      {!loading && !error && timingData && timingData.recommendation && (
        <div className="timing-results">
          <div className="timing-job-info">
            <h3>{timingData.job?.title || "Job Title"}</h3>
            <p>{timingData.job?.company || "Company"}</p>
            {timingData.job?.industry && (
              <p className="timing-job-industry">Industry: {timingData.job.industry}</p>
            )}
          </div>

          {/* Real-time Status Card */}
          <div className={`timing-status-card timing-status-${timingData.recommendation.real_time_status}`}>
            <div className="timing-status-header">
              <span className="timing-status-icon">
                {timingData.recommendation.real_time_status === "submit_now" ? "✅" : 
                 timingData.recommendation.real_time_status === "wait" ? "⏰" : 
                 timingData.recommendation.real_time_status === "acceptable" ? "⚠️" : "❌"}
              </span>
              <h3 className="timing-status-title">
                {timingData.recommendation.real_time_status === "submit_now" ? "Submit Now!" :
                 timingData.recommendation.real_time_status === "wait" ? "Wait for Optimal Time" :
                 timingData.recommendation.real_time_status === "acceptable" ? "Still Acceptable" :
                 "Recommendation Expired"}
              </h3>
            </div>
            <p className="timing-status-message">{timingData.recommendation.real_time_message}</p>
          </div>

          {/* Recommendation Details */}
          <div className="timing-recommendation-card">
            <div className="timing-rec-header">
              <span className="timing-rec-icon">📅</span>
              <h4>Optimal Application Time</h4>
            </div>
            <div className="timing-rec-details">
              <div className="timing-rec-detail-row">
                <strong>Day:</strong> {timingData.recommendation.day_name}
              </div>
              <div className="timing-rec-detail-row">
                <strong>Time:</strong> {timingData.recommendation.formatted_time}
              </div>
              <div className="timing-rec-detail-row">
                <strong>Date:</strong> {timingData.recommendation.formatted_date 
                  ? `${timingData.recommendation.formatted_date} (EST)`
                  : timingData.recommendation.recommended_date 
                    ? `${timingData.recommendation.recommended_date} (EST)`
                    : 'N/A'}
              </div>
              <div className="timing-rec-detail-row">
                <strong>Confidence:</strong> {Math.round(timingData.recommendation.confidence_score * 100)}%
              </div>
              {timingData.recommendation.timezone_display && (
                <div className="timing-rec-detail-row">
                  <strong>Timezone:</strong> {timingData.recommendation.timezone_display}
                </div>
              )}
            </div>
            
            {/* Warnings Section */}
            {timingData.recommendation.warnings && timingData.recommendation.warnings.length > 0 && (
              <div className="timing-warnings-section">
                <h5 className="timing-warnings-title">⚠️ Timing Warnings</h5>
                {timingData.recommendation.warnings.map((warning, index) => (
                  <div key={index} className={`timing-warning timing-warning-${warning.severity}`}>
                    <div className="timing-warning-header">
                      <span className="timing-warning-icon">
                        {warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <strong className="timing-warning-type">
                        {warning.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </strong>
                    </div>
                    <p className="timing-warning-message">{warning.message}</p>
                    <p className="timing-warning-recommendation">
                      <strong>Recommendation:</strong> {warning.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="timing-rec-reason-box">
              <strong>Why this time?</strong>
              <p>{timingData.recommendation.reasoning}</p>
            </div>

            {/* Company-Specific Best Time */}
            {timingData.recommendation.company_analysis && (
              <div className="timing-company-analysis">
                <div className="timing-company-header">
                  <span className="timing-company-icon">🏢</span>
                  <h5>Company-Specific Best Time for {timingData.recommendation.company_analysis.company}</h5>
                </div>
                <div className="timing-company-details">
                  <div className="timing-company-detail-row">
                    <strong>Best Day:</strong> {timingData.recommendation.company_analysis.best_day}
                  </div>
                  <div className="timing-company-detail-row">
                    <strong>Best Time:</strong> {timingData.recommendation.company_analysis.best_hour}
                  </div>
                  <div className="timing-company-detail-row">
                    <strong>Response Rate:</strong> {timingData.recommendation.company_analysis.response_rate}% 
                    ({timingData.recommendation.company_analysis.responses || timingData.recommendation.company_analysis.data_points}/{timingData.recommendation.company_analysis.total_submissions || timingData.recommendation.company_analysis.data_points} responses)
                  </div>
                  <div className="timing-company-detail-row">
                    <strong>Confidence:</strong> 
                    <span className={`timing-company-confidence timing-company-confidence-${timingData.recommendation.company_analysis.confidence}`}>
                      {timingData.recommendation.company_analysis.confidence === 'high' ? 'High' : 
                       timingData.recommendation.company_analysis.confidence === 'medium' ? 'Medium' : 'Low'} 
                      ({timingData.recommendation.company_analysis.data_points} data points)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Alternative Time Options */}
            {timingData.recommendation.alternatives && timingData.recommendation.alternatives.length > 0 && (
              <div className="timing-alternatives-section">
                <h5 className="timing-alternatives-title">📅 Other Good Times to Apply</h5>
                <div className="timing-alternatives-list">
                  {timingData.recommendation.alternatives.map((alt, index) => (
                    <div key={index} className="timing-alternative-card">
                      <div className="timing-alternative-header">
                        <span className="timing-alternative-day">{alt.day_name}</span>
                        <span className="timing-alternative-time">{alt.formatted_time}</span>
                        <span className="timing-alternative-badge">Good Option</span>
                      </div>
                      <div className="timing-alternative-date">
                        {new Date(alt.recommended_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'America/New_York'
                        })} (EST)
                      </div>
                      <div className="timing-alternative-stats">
                        <span>Response Rate: {Math.round(alt.response_rate * 100)}%</span>
                        <span className="timing-alternative-reasoning">{alt.reasoning}</span>
                      </div>
                      <button
                        className="timing-alternative-schedule-btn"
                        onClick={() => {
                          setScheduleForm({
                            scheduledDate: alt.recommended_date,
                            scheduledTime: alt.recommended_time,
                            notes: ''
                          });
                          setShowScheduleForm(true);
                        }}
                      >
                        📅 Schedule for This Time
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="timing-rec-actions">
              <button 
                className="timing-schedule-manual-btn"
                onClick={() => {
                  // Pre-fill with recommended date/time if available
                  if (timingData && timingData.recommendation) {
                    setScheduleForm({
                      scheduledDate: timingData.recommendation.recommended_date,
                      scheduledTime: timingData.recommendation.recommended_time || '10:00:00',
                      notes: ''
                    });
                  } else {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setScheduleForm({
                      scheduledDate: tomorrow.toISOString().split('T')[0],
                      scheduledTime: '10:00:00',
                      notes: ''
                    });
                  }
                  setShowScheduleForm(true);
                }}
              >
                📅 Schedule Application
              </button>
            </div>
          </div>

          {/* Schedule Form */}
          {showScheduleForm && (
            <div className="timing-schedule-form">
              <h4>Schedule Application Submission</h4>
              <div className="schedule-form-fields">
                <div className="schedule-form-field">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="schedule-form-field">
                  <label>Time:</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduledTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                  />
                </div>
                <div className="schedule-form-field">
                  <label>Notes (optional):</label>
                  <textarea
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    placeholder="Add any notes about this scheduled submission..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="schedule-form-actions">
                <button
                  className="schedule-submit-btn"
                  onClick={handleScheduleSubmission}
                  disabled={scheduling || !scheduleForm.scheduledDate || !scheduleForm.scheduledTime}
                >
                  {scheduling ? "Scheduling..." : "📅 Schedule Submission"}
                </button>
                <button
                  className="schedule-cancel-btn"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setScheduleForm({ scheduledDate: '', scheduledTime: '', notes: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Submissions List */}
          {scheduledSubmissions.length > 0 && (
            <div className="timing-scheduled-list">
              <h4>📅 Scheduled Submissions</h4>
              {scheduledSubmissions.map((schedule) => (
                <div key={schedule.id} className={`scheduled-item scheduled-${schedule.status}`}>
                  <div className="scheduled-item-header">
                    <div className="scheduled-item-info">
                      <strong>{schedule.job_title} at {schedule.job_company}</strong>
                      <span className={`scheduled-status-badge scheduled-status-${schedule.status}`}>
                        {schedule.status}
                      </span>
                    </div>
                  </div>
                  <div className="scheduled-item-details">
                    <p>
                      <strong>Date:</strong> {schedule.formatted_date} at {schedule.formatted_time} (EST)
                    </p>
                    {schedule.notes && (
                      <p><strong>Notes:</strong> {schedule.notes}</p>
                    )}
                    {schedule.is_past && schedule.status === 'pending' && (
                      <p className="scheduled-missed">⚠️ This scheduled time has passed</p>
                    )}
                  </div>
                  <div className="scheduled-item-actions">
                    {schedule.status === 'pending' && (
                      <>
                        <button
                          className="scheduled-complete-btn"
                          onClick={() => handleCompleteSchedule(schedule.id)}
                        >
                          ✓ Mark as Completed
                        </button>
                        <button
                          className="scheduled-cancel-btn"
                          onClick={() => handleCancelSchedule(schedule.id)}
                        >
                          ✕ Cancel
                        </button>
                      </>
                    )}
                    <button
                      className="scheduled-delete-btn"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      title="Permanently delete this scheduled submission"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

