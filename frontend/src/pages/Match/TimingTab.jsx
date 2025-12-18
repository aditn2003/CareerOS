// src/pages/Match/TimingTab.jsx
import React, { useState, useEffect } from "react";
import { api } from "../../api";
import TimingAnalytics from "../../components/TimingAnalytics";
import ScheduleCalendar from "../../components/ScheduleCalendar";

export default function TimingTab({ jobId: jobIdProp }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobIdProp || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timingData, setTimingData] = useState(null);
  const [scheduledSubmissions, setScheduledSubmissions] = useState([]);
  const [allScheduledSubmissions, setAllScheduledSubmissions] = useState([]); // For the global calendar
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });
  const [scheduling, setScheduling] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load all jobs with quality scores and all scheduled submissions on mount
  useEffect(() => {
    const fetchJobsWithScores = async () => {
      try {
        const res = await api.get("/api/jobs");
        const allJobs = res.data.jobs || [];
        
        // Fetch quality scores for each job
        const jobsWithScores = await Promise.all(
          allJobs.map(async (job) => {
            try {
              // Correct endpoint: /api/quality-scoring/:jobId
              const scoreRes = await api.get(`/api/quality-scoring/${job.id}`);
              // The API returns { score: { overall_score, resume_score, ... } }
              const scoreData = scoreRes.data?.score;
              const score = scoreData?.overall_score || 0;
              const qualifies = score >= 70;
              console.log(`📊 Job ${job.id} (${job.title}): score=${score}, qualifies=${qualifies}`);
              return { ...job, qualityScore: Math.round(score), qualifies };
            } catch (err) {
              // 404 means no score yet (hasn't been analyzed)
              if (err?.response?.status !== 404) {
                console.log(`📊 Job ${job.id} (${job.title}): error fetching score`, err?.response?.status);
              }
              return { ...job, qualityScore: 0, qualifies: false };
            }
          })
        );
        
        const qualifiedCount = jobsWithScores.filter(j => j.qualifies).length;
        console.log(`📊 Timing Tab: ${qualifiedCount}/${allJobs.length} jobs qualify (score >= 70)`);
        setJobs(jobsWithScores);
      } catch (err) {
        console.error("❌ Error loading jobs:", err);
      }
    };
    fetchJobsWithScores();
    loadAllScheduledSubmissions(); // Load global calendar data
  }, []);

  // Load ALL scheduled submissions for the global calendar
  const loadAllScheduledSubmissions = async () => {
    try {
      const res = await api.get('/api/timing/scheduled');
      setAllScheduledSubmissions(res.data.schedules || []);
    } catch (err) {
      console.error("❌ Error loading all scheduled submissions:", err);
    }
  };

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
      await loadAllScheduledSubmissions(); // Refresh global calendar
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
      await loadAllScheduledSubmissions(); // Refresh global calendar
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
      await loadAllScheduledSubmissions(); // Refresh global calendar
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
      await loadAllScheduledSubmissions(); // Refresh global calendar
      await loadTimingRecommendations();
    } catch (err) {
      console.error("❌ Error completing schedule:", err);
      alert("Failed to mark as completed. Please try again.");
    }
  };


  const selectedJob = jobs.find(j => String(j.id) === String(selectedJobId));

  return (
    <div className="timing-tab-content">
      {/* Global Submissions Calendar - At the top */}
      <div className="timing-global-calendar">
        <div className="timing-calendar-header">
          <h2>📅 Your Submission Calendar</h2>
          <p className="timing-calendar-subtitle">
            Track all your scheduled application submissions in one place
          </p>
        </div>
        <ScheduleCalendar scheduledSubmissions={allScheduledSubmissions} />
      </div>

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
          onChange={(e) => {
            const job = jobs.find(j => String(j.id) === e.target.value);
            if (job && !job.qualifies) {
              alert(`🔒 This job needs a quality score of 70% or higher to unlock timing recommendations.\n\nCurrent score: ${job.qualityScore}%\n\nGo to the Quality tab to improve your application materials.`);
              return;
            }
            setSelectedJobId(e.target.value);
          }}
          className="timing-job-select"
        >
          <option value="">-- Select a job --</option>
          {jobs.map((job) => (
            <option 
              key={job.id} 
              value={job.id}
              className={job.qualifies ? '' : 'timing-job-disabled'}
              style={job.qualifies ? {} : { color: '#9ca3af' }}
            >
              {job.qualifies ? '✅' : '🔒'} {job.title} at {job.company} ({job.qualityScore}%)
            </option>
          ))}
        </select>
        <p className="timing-job-hint">
          🔒 = Needs 70%+ quality score to unlock
        </p>
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

            {/* Schedule for Optimal Time Button */}
            <button
              className="timing-alternative-schedule-btn timing-optimal-schedule-btn"
              onClick={() => {
                // Get the date - ensure it's in YYYY-MM-DD format
                let scheduleDate = timingData.recommendation.recommended_date;
                
                // If recommended_date contains 'T' (full ISO format), extract just the date part
                if (scheduleDate && scheduleDate.includes('T')) {
                  scheduleDate = scheduleDate.split('T')[0];
                }
                
                // If still no date, try parsing from formatted_date
                if (!scheduleDate && timingData.recommendation.formatted_date) {
                  const parsed = new Date(timingData.recommendation.formatted_date);
                  if (!isNaN(parsed)) {
                    scheduleDate = parsed.toISOString().split('T')[0];
                  }
                }
                
                // Get the time - try recommended_time first
                let scheduleTime = timingData.recommendation.recommended_time;
                
                // If no time, parse from formatted_time (e.g., "2 PM" -> "14:00")
                if (!scheduleTime && timingData.recommendation.formatted_time) {
                  const timeStr = timingData.recommendation.formatted_time;
                  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
                  if (match) {
                    let hours = parseInt(match[1]);
                    const minutes = match[2] ? parseInt(match[2]) : 0;
                    const period = match[3].toUpperCase();
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    scheduleTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  }
                }
                
                console.log('📅 Scheduling optimal time:', { scheduleDate, scheduleTime, raw: timingData.recommendation });
                
                setScheduleForm({
                  scheduledDate: scheduleDate || '',
                  scheduledTime: scheduleTime || '10:00',
                  notes: ''
                });
                setShowScheduleForm(true);
              }}
            >
              📅 Schedule for This Time
            </button>

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
                        {(() => {
                          // Parse date parts to avoid timezone issues
                          const [year, month, day] = alt.recommended_date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        })()} (EST)
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

