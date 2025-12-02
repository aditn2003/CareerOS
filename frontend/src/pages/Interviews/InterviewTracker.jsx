// src/pages/Interviews/InterviewTracker.jsx
import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./InterviewTracker.css";

function InterviewTracker() {
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    jobId: "",
    company: "",
    role: "",
    interviewDate: "",
    interviewTime: "", // NEW: Time field
    durationMinutes: 60, // NEW: Duration
    interviewType: "technical",
    interviewFormat: "remote",
    selfRating: 3,
    confidenceLevel: 3,
    difficultyRating: 3,
    areasCovered: [],
    strengths: [],
    weaknesses: [],
    outcome: "pending",
    offerAmount: "",
    mockInterviewsCompleted: 0,
    notes: "",
    // NEW: Scheduling fields
    interviewRound: 1,
    interviewerName: "",
    interviewerEmail: "",
    videoLink: "",
    locationAddress: "",
    dialInNumber: "",
    meetingId: "",
    meetingPassword: "",
    syncToCalendar: false
  });

  const userId = getUserId();

  useEffect(() => {
    fetchInterviews();
    fetchJobs();
  }, []);

  // Debug: Log jobs state
  console.log("🎯 Current jobs state:", jobs);

  async function fetchInterviews() {
    try {
      setLoading(true);
      const res = await api.get("/api/interview-analytics/outcomes", {
        params: { userId }
      });
      
      if (res.data.success) {
        setInterviews(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching interviews:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJobs() {
    try {
      console.log("🔍 Fetching jobs for userId:", userId);
      const res = await api.get("/api/jobs");
      
      console.log("📦 Jobs response:", res.data);
      
      const jobsData = res.data.jobs || [];
      console.log("✅ Jobs loaded:", jobsData.length, jobsData);
      setJobs(jobsData);
    } catch (err) {
      console.error("❌ Error fetching jobs:", err);
      console.error("Error details:", err.response?.data);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleJobSelection(e) {
    const jobId = e.target.value;
    setFormData(prev => ({ ...prev, jobId }));
    
    if (jobId) {
      const selectedJob = jobs.find(j => j.id === parseInt(jobId));
      if (selectedJob) {
        setFormData(prev => ({
          ...prev,
          jobId,
          company: selectedJob.company,
          role: selectedJob.title  // Using 'title' field from jobs API
        }));
      }
    } else {
      // Clear company and role if no job selected
      setFormData(prev => ({
        ...prev,
        jobId: "",
        company: "",
        role: ""
      }));
    }
  }

  function handleArrayInput(field, value) {
    const items = value.split(",").map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      const payload = {
        userId: parseInt(userId),
        jobId: formData.jobId ? parseInt(formData.jobId) : null,
        company: formData.company,
        role: formData.role,
        interviewDate: formData.interviewDate,
        interviewTime: formData.interviewTime || null,
        durationMinutes: parseInt(formData.durationMinutes) || 60,
        interviewType: formData.interviewType,
        interviewFormat: formData.interviewFormat,
        interviewRound: parseInt(formData.interviewRound) || 1,
        selfRating: parseInt(formData.selfRating),
        confidenceLevel: parseInt(formData.confidenceLevel),
        difficultyRating: parseInt(formData.difficultyRating),
        areasCovered: formData.areasCovered,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        outcome: formData.outcome,
        offerAmount: formData.offerAmount ? parseFloat(formData.offerAmount) : null,
        mockInterviewsCompleted: parseInt(formData.mockInterviewsCompleted),
        notes: formData.notes,
        interviewerName: formData.interviewerName || null,
        interviewerEmail: formData.interviewerEmail || null,
        videoLink: formData.videoLink || null,
        locationAddress: formData.locationAddress || null,
        dialInNumber: formData.dialInNumber || null,
        meetingId: formData.meetingId || null,
        meetingPassword: formData.meetingPassword || null,
        syncToCalendar: formData.syncToCalendar
      };

      if (editingId) {
        // Update existing
        await api.put(`/api/interview-analytics/outcome/${editingId}?userId=${userId}`, payload);
        alert("Interview updated successfully!");
      } else {
        // Create new
        await api.post("/api/interview-analytics/outcome", payload);
        alert("Interview recorded successfully!");
      }

      // Reset form
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchInterviews();
    } catch (err) {
      console.error("Error saving interview:", err);
      alert("Failed to save interview. Check console for details.");
    }
  }

  function resetForm() {
    setFormData({
      jobId: "",
      company: "",
      role: "",
      interviewDate: "",
      interviewTime: "",
      durationMinutes: 60,
      interviewType: "technical",
      interviewFormat: "remote",
      selfRating: 3,
      confidenceLevel: 3,
      difficultyRating: 3,
      areasCovered: [],
      strengths: [],
      weaknesses: [],
      outcome: "pending",
      offerAmount: "",
      mockInterviewsCompleted: 0,
      notes: "",
      interviewRound: 1,
      interviewerName: "",
      interviewerEmail: "",
      videoLink: "",
      locationAddress: "",
      dialInNumber: "",
      meetingId: "",
      meetingPassword: "",
      syncToCalendar: false
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this interview?")) return;
    
    try {
      await api.delete(`/api/interview-analytics/outcome/${id}?userId=${userId}`);
      alert("Interview deleted successfully!");
      fetchInterviews();
    } catch (err) {
      console.error("Error deleting interview:", err);
      alert("Failed to delete interview.");
    }
  }

  return (
    <div className="interview-tracker-container">
      <div className="tracker-header">
        <div>
          <h1 className="page-title">📋 Interview Tracker</h1>
          <p className="page-subtitle">Record and manage your interview outcomes</p>
        </div>
        <button 
          className="add-interview-btn"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            resetForm();
          }}
        >
          ➕ Add Interview
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="interview-form-modal">
          <div className="form-modal-content">
            <div className="form-header">
              <h2>{editingId ? "Edit Interview" : "Add New Interview"}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="interview-form">
              <div className="form-grid">
                {/* Basic Info */}
                <div className="form-section">
                  <h3>📋 Basic Information</h3>
                  
                  <div className="form-group">
                    <label>Select Job *</label>
                    <select
                      name="jobId"
                      value={formData.jobId}
                      onChange={handleJobSelection}
                      required
                    >
                      <option value="">-- Select a job posting --</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>
                          {job.title} at {job.company}
                        </option>
                      ))}
                    </select>
                    <small>Choose from your saved job postings</small>
                  </div>

                  <div className="form-group">
                    <label>Company *</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      placeholder="Auto-filled from job selection"
                      readOnly={!!formData.jobId}
                      style={{ 
                        backgroundColor: formData.jobId ? '#f9fafb' : 'white',
                        cursor: formData.jobId ? 'not-allowed' : 'text'
                      }}
                    />
                    <small>{formData.jobId ? 'Auto-filled from selected job' : 'Or enter manually if job not listed'}</small>
                  </div>

                  <div className="form-group">
                    <label>Role *</label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      placeholder="Auto-filled from job selection"
                      readOnly={!!formData.jobId}
                      style={{ 
                        backgroundColor: formData.jobId ? '#f9fafb' : 'white',
                        cursor: formData.jobId ? 'not-allowed' : 'text'
                      }}
                    />
                    <small>{formData.jobId ? 'Auto-filled from selected job' : 'Or enter manually if job not listed'}</small>
                  </div>

                  <div className="form-group">
                    <label>Interview Date *</label>
                    <input
                      type="date"
                      name="interviewDate"
                      value={formData.interviewDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Interview Time</label>
                    <input
                      type="time"
                      name="interviewTime"
                      value={formData.interviewTime}
                      onChange={handleInputChange}
                    />
                    <small>What time is the interview?</small>
                  </div>

                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      name="durationMinutes"
                      value={formData.durationMinutes}
                      onChange={handleInputChange}
                      min="15"
                      step="15"
                    />
                    <small>Expected interview length</small>
                  </div>

                  <div className="form-group">
                    <label>Round Number</label>
                    <input
                      type="number"
                      name="interviewRound"
                      value={formData.interviewRound}
                      onChange={handleInputChange}
                      min="1"
                    />
                    <small>Which round? (1, 2, 3...)</small>
                  </div>

                  <div className="form-group">
                    <label>Interview Type *</label>
                    <select
                      name="interviewType"
                      value={formData.interviewType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="phone_screen">Phone Screen</option>
                      <option value="technical">Technical</option>
                      <option value="behavioral">Behavioral</option>
                      <option value="system_design">System Design</option>
                      <option value="cultural_fit">Cultural Fit</option>
                      <option value="panel">Panel Interview</option>
                      <option value="final">Final Round</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Interview Format</label>
                    <select
                      name="interviewFormat"
                      value={formData.interviewFormat}
                      onChange={handleInputChange}
                    >
                      <option value="remote">Remote</option>
                      <option value="in_person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Ratings */}
                <div className="form-section">
                  <h3>⭐ Performance Ratings</h3>
                  
                  <div className="form-group">
                    <label>Self Rating (1-5)</label>
                    <input
                      type="number"
                      name="selfRating"
                      value={formData.selfRating}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                    />
                    <small>How well did you perform?</small>
                  </div>

                  <div className="form-group">
                    <label>Confidence Level (1-5)</label>
                    <input
                      type="number"
                      name="confidenceLevel"
                      value={formData.confidenceLevel}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                    />
                    <small>How confident did you feel?</small>
                  </div>

                  <div className="form-group">
                    <label>Difficulty Rating (1-5)</label>
                    <input
                      type="number"
                      name="difficultyRating"
                      value={formData.difficultyRating}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                    />
                    <small>How difficult was the interview?</small>
                  </div>

                  <div className="form-group">
                    <label>Mock Interviews Completed</label>
                    <input
                      type="number"
                      name="mockInterviewsCompleted"
                      value={formData.mockInterviewsCompleted}
                      onChange={handleInputChange}
                      min="0"
                    />
                    <small>How many practice sessions before this?</small>
                  </div>
                </div>

                {/* Interview Logistics */}
                <div className="form-section">
                  <h3>📍 Interview Logistics</h3>
                  
                  <div className="form-group">
                    <label>Interviewer Name (Optional)</label>
                    <input
                      type="text"
                      name="interviewerName"
                      value={formData.interviewerName}
                      onChange={handleInputChange}
                      placeholder="e.g., John Smith"
                    />
                  </div>

                  <div className="form-group">
                    <label>Interviewer Email (Optional)</label>
                    <input
                      type="email"
                      name="interviewerEmail"
                      value={formData.interviewerEmail}
                      onChange={handleInputChange}
                      placeholder="john@company.com"
                    />
                  </div>

                  {formData.interviewFormat === 'remote' && (
                    <>
                      <div className="form-group">
                        <label>Video Link</label>
                        <input
                          type="url"
                          name="videoLink"
                          value={formData.videoLink}
                          onChange={handleInputChange}
                          placeholder="https://zoom.us/j/..."
                        />
                        <small>Zoom, Google Meet, Teams link</small>
                      </div>

                      <div className="form-group">
                        <label>Meeting ID (Optional)</label>
                        <input
                          type="text"
                          name="meetingId"
                          value={formData.meetingId}
                          onChange={handleInputChange}
                          placeholder="123 456 7890"
                        />
                      </div>

                      <div className="form-group">
                        <label>Meeting Password (Optional)</label>
                        <input
                          type="text"
                          name="meetingPassword"
                          value={formData.meetingPassword}
                          onChange={handleInputChange}
                        />
                      </div>

                      {formData.interviewTime && formData.videoLink && (
                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              name="syncToCalendar"
                              checked={formData.syncToCalendar}
                              onChange={handleInputChange}
                            />
                            <span>📅 Sync to Google Calendar & send reminders</span>
                          </label>
                          <small>Get email reminders 24h and 2h before interview</small>
                        </div>
                      )}
                    </>
                  )}

                  {formData.interviewFormat === 'in_person' && (
                    <div className="form-group">
                      <label>Location Address</label>
                      <textarea
                        name="locationAddress"
                        value={formData.locationAddress}
                        onChange={handleInputChange}
                        rows="2"
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                  )}
                </div>

                {/* Areas & Feedback */}
                <div className="form-section">
                  <h3>📝 Details</h3>
                  
                  <div className="form-group">
                    <label>Areas Covered</label>
                    <input
                      type="text"
                      placeholder="e.g., algorithms, system design, behavioral"
                      onChange={(e) => handleArrayInput('areasCovered', e.target.value)}
                    />
                    <small>Comma-separated list of topics</small>
                  </div>

                  <div className="form-group">
                    <label>Strengths</label>
                    <input
                      type="text"
                      placeholder="e.g., clear communication, problem solving"
                      onChange={(e) => handleArrayInput('strengths', e.target.value)}
                    />
                    <small>What went well?</small>
                  </div>

                  <div className="form-group">
                    <label>Weaknesses</label>
                    <input
                      type="text"
                      placeholder="e.g., time management, edge cases"
                      onChange={(e) => handleArrayInput('weaknesses', e.target.value)}
                    />
                    <small>What needs improvement?</small>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Any additional notes about this interview..."
                    />
                  </div>
                </div>

                {/* Outcome */}
                <div className="form-section">
                  <h3>✅ Outcome</h3>
                  
                  <div className="form-group">
                    <label>Status *</label>
                    <select
                      name="outcome"
                      value={formData.outcome}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="passed">✅ Passed (Next Round)</option>
                      <option value="rejected">❌ Rejected</option>
                      <option value="offer_received">🎁 Offer Received</option>
                      <option value="offer_accepted">🎉 Offer Accepted</option>
                      <option value="offer_declined">🚫 Offer Declined</option>
                    </select>
                  </div>

                  {(formData.outcome === 'offer_received' || formData.outcome === 'offer_accepted') && (
                    <div className="form-group">
                      <label>Offer Amount ($)</label>
                      <input
                        type="number"
                        name="offerAmount"
                        value={formData.offerAmount}
                        onChange={handleInputChange}
                        placeholder="120000"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingId ? "Update Interview" : "Add Interview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instructions */}
      {interviews.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Start Tracking Your Interviews</h3>
          <p>Record your interview outcomes to unlock powerful analytics</p>
          
          <div className="quick-start-guide">
            <h4>Quick Start:</h4>
            <ol>
              <li>Click "➕ Add Interview" above</li>
              <li>Fill in the interview details (company, role, date)</li>
              <li>Rate your performance and confidence</li>
              <li>Update the outcome when you hear back</li>
              <li>View insights in the Analytics tab</li>
            </ol>
          </div>

          <div className="benefits">
            <h4>What You'll Unlock:</h4>
            <div className="benefit-grid">
              <div className="benefit-item">
                <span className="benefit-icon">📈</span>
                <span>Track conversion rates</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🏢</span>
                <span>Compare company types</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💪</span>
                <span>Identify strengths</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🎯</span>
                <span>Find weak areas</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📊</span>
                <span>Monitor improvement</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💡</span>
                <span>Get AI insights</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview List - Placeholder for now */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interviews...</p>
        </div>
      )}

      {/* Interview List */}
      {!loading && interviews.length > 0 && (
        <div className="interviews-list">
          <h2>Your Interviews ({interviews.length})</h2>
          <div className="interviews-grid">
            {interviews.map((interview) => (
              <div key={interview.id} className="interview-card">
                <div className="interview-card-header">
                  <div>
                    <h3>{interview.company}</h3>
                    <p className="role">{interview.role}</p>
                  </div>
                  <div className="interview-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => {
                        setEditingId(interview.id);
                        setFormData({
                          jobId: interview.job_id || "",
                          company: interview.company,
                          role: interview.role,
                          interviewDate: interview.interview_date,
                          interviewType: interview.interview_type,
                          interviewFormat: interview.interview_format || 'remote',
                          selfRating: interview.self_rating || 3,
                          confidenceLevel: interview.confidence_level || 3,
                          difficultyRating: interview.difficulty_rating || 3,
                          areasCovered: interview.areas_covered || [],
                          strengths: interview.strengths || [],
                          weaknesses: interview.weaknesses || [],
                          outcome: interview.outcome || 'pending',
                          offerAmount: interview.offer_amount || '',
                          mockInterviewsCompleted: interview.mock_interviews_completed || 0,
                          notes: interview.notes || ''
                        });
                        setShowForm(true);
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(interview.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="interview-card-body">
                  <div className="info-row">
                    <span className="label">📅 Date:</span>
                    <span>{new Date(interview.interview_date).toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📋 Type:</span>
                    <span>{interview.interview_type.replace('_', ' ')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">💻 Format:</span>
                    <span>{interview.interview_format || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">⭐ Performance:</span>
                    <span>{interview.self_rating || 'N/A'}/5</span>
                  </div>
                  <div className="info-row">
                    <span className="label">💪 Confidence:</span>
                    <span>{interview.confidence_level || 'N/A'}/5</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`outcome-badge outcome-${interview.outcome || 'pending'}`}>
                      {interview.outcome === 'offer_received' ? '🎁 Offer Received' :
                       interview.outcome === 'offer_accepted' ? '🎉 Offer Accepted' :
                       interview.outcome === 'rejected' ? '❌ Rejected' :
                       interview.outcome === 'passed' ? '✅ Passed' :
                       '⏳ Pending'}
                    </span>
                  </div>
                  {interview.offer_amount && (
                    <div className="info-row">
                      <span className="label">💰 Offer:</span>
                      <span className="offer-amount">${interview.offer_amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewTracker;