import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "../styles/InformationalInterviews.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const InformationalInterviews = () => {
  const [activeTab, setActiveTab] = useState("candidates");
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showRequestInterviewModal, setShowRequestInterviewModal] =
    useState(false);
  const [showPrepFrameworkModal, setShowPrepFrameworkModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddInsightModal, setShowAddInsightModal] = useState(false);
  const [showEditInsightModal, setShowEditInsightModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [showEditInterviewModal, setShowEditInterviewModal] = useState(false);
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("all");

  const [candidateForm, setCandidateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    industry: "",
    expertise_areas: "",
    linkedin_url: "",
    source: "LinkedIn",
    notes: "",
  });

  const [interviewForm, setInterviewForm] = useState({
    candidate_id: "",
    interview_type: "video",
    scheduled_date: "",
    duration_minutes: 30,
    location_or_platform: "",
    key_topics: "",
    preparation_framework_used: "",
    notes_before: "",
  });

  const [prepForm, setPrepForm] = useState({
    title: "",
    company_research: "",
    role_research: "",
    personal_preparation: "",
    conversation_starters: "",
    industry_trends: "",
  });

  const [followupForm, setFollowupForm] = useState({
    followup_type: "thank_you",
    template_used: "professional",
    message_content: "",
    action_items: "",
  });

  const [insightForm, setInsightForm] = useState({
    insight_type: "industry_trend",
    title: "",
    description: "",
    impact_on_search: "medium",
    related_opportunities: "",
  });

  const [editInterviewForm, setEditInterviewForm] = useState({
    status: "pending",
    interview_type: "video",
    scheduled_date: "",
    duration_minutes: 30,
    location_or_platform: "",
    key_topics: "",
    notes_after: "",
    relationship_value: "neutral",
    opportunity_identified: false,
    opportunity_description: "",
  });

  const token = localStorage.getItem("token");

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/informational-interviews/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(data.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch candidates");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch interviews
  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/informational-interviews/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterviews(data.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch interviews");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/informational-interviews/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInsights(data.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch insights");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "candidates") fetchCandidates();
    else if (activeTab === "interviews") fetchInterviews();
    else if (activeTab === "insights") fetchInsights();
  }, [activeTab, fetchCandidates, fetchInterviews, fetchInsights]);

  // Clear preparation form when modal closes
  useEffect(() => {
    if (!showPrepFrameworkModal) {
      setPrepForm({
        title: "",
        company_research: "",
        role_research: "",
        personal_preparation: "",
        conversation_starters: "",
        industry_trends: "",
      });
    }
  }, [showPrepFrameworkModal]);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAddCandidateModal || showRequestInterviewModal || 
      showPrepFrameworkModal || showFollowupModal || showDetailsModal || 
      showAddInsightModal || showEditInsightModal || showEditInterviewModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddCandidateModal, showRequestInterviewModal, showPrepFrameworkModal, 
      showFollowupModal, showDetailsModal, showAddInsightModal, showEditInsightModal, showEditInterviewModal]);

  // Add candidate
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateForm.first_name || !candidateForm.last_name) {
      setError("First and last name required");
      return;
    }

    try {
      // Prepare payload - convert empty strings to null
      const payload = {
        first_name: candidateForm.first_name,
        last_name: candidateForm.last_name,
        email: candidateForm.email || null,
        phone: candidateForm.phone || null,
        company: candidateForm.company || null,
        title: candidateForm.title || null,
        industry: candidateForm.industry || null,
        expertise_areas: candidateForm.expertise_areas || null,
        linkedin_url: candidateForm.linkedin_url || null,
        source: candidateForm.source || "LinkedIn",
        notes: candidateForm.notes || null,
      };

      if (selectedCandidate) {
        // Update existing candidate
        const { data } = await axios.put(
          `${API_BASE}/informational-interviews/candidates/${selectedCandidate.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("✅ Candidate updated successfully");
        setSelectedCandidate(null);
      } else {
        // Add new candidate
        const { data } = await axios.post(`${API_BASE}/informational-interviews/candidates`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("✅ Candidate added successfully");
      }
      setCandidateForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company: "",
        title: "",
        industry: "",
        expertise_areas: "",
        linkedin_url: "",
        source: "LinkedIn",
        notes: "",
      });
      setShowAddCandidateModal(false);
      fetchCandidates();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save candidate: " + (err.response?.data?.error || err.message));
      console.error("Error details:", err);
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (candidateId) => {
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      try {
        await axios.delete(
          `${API_BASE}/informational-interviews/candidates/${candidateId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("✅ Candidate deleted successfully");
        fetchCandidates();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError("Failed to delete candidate");
        console.error(err);
      }
    }
  };

  // Edit candidate
  const handleEditCandidate = (candidate) => {
    setCandidateForm({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email || "",
      phone: candidate.phone || "",
      company: candidate.company || "",
      title: candidate.title || "",
      industry: candidate.industry || "",
      expertise_areas: candidate.expertise_areas || "",
      linkedin_url: candidate.linkedin_url || "",
      source: candidate.source || "LinkedIn",
      notes: candidate.notes || "",
    });
    setSelectedCandidate(candidate);
    setShowAddCandidateModal(true);
  };

  // Request interview
  const handleRequestInterview = async (e) => {
    e.preventDefault();
    if (!interviewForm.candidate_id) {
      setError("Please select a candidate");
      return;
    }

    try {
      await axios.post(`${API_BASE}/informational-interviews/interviews`, interviewForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("✅ Interview request created");
      setInterviewForm({
        candidate_id: "",
        interview_type: "video",
        scheduled_date: "",
        duration_minutes: 30,
        location_or_platform: "",
        key_topics: "",
        preparation_framework_used: "",
        notes_before: "",
      });
      setShowRequestInterviewModal(false);
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to request interview");
      console.error(err);
    }
  };

  // Save preparation framework
  const handleSavePreparation = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;

    try {
      if (selectedInterview.preparation) {
        // Update existing preparation
        await axios.put(
          `${API_BASE}/informational-interviews/preparation/${selectedInterview.preparation.id}`,
          { 
            interview_id: selectedInterview.id,
            title: prepForm.title,
            company_research: prepForm.company_research,
            role_research: prepForm.role_research,
            personal_preparation: prepForm.personal_preparation,
            conversation_starters: prepForm.conversation_starters,
            industry_trends: prepForm.industry_trends,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new preparation
        await axios.post(
          `${API_BASE}/informational-interviews/preparation`,
          { 
            interview_id: selectedInterview.id,
            title: prepForm.title,
            company_research: prepForm.company_research,
            role_research: prepForm.role_research,
            personal_preparation: prepForm.personal_preparation,
            conversation_starters: prepForm.conversation_starters,
            industry_trends: prepForm.industry_trends,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setSuccess("✅ Preparation saved successfully");
      setPrepForm({
        title: "",
        company_research: "",
        role_research: "",
        personal_preparation: "",
        conversation_starters: "",
        industry_trends: "",
      });
      setShowPrepFrameworkModal(false);
      setSelectedInterview(null);
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error:", err);
      setError(err.response?.data?.error || "Failed to save preparation");
    }
  };

  // Send follow-up
  const handleSendFollowup = async (e) => {
    e.preventDefault();
    if (!selectedInterview || !followupForm.message_content) {
      setError("Please select interview and enter message");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/informational-interviews/followups`,
        { interview_id: selectedInterview.id, ...followupForm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Follow-up sent");
      setFollowupForm({
        followup_type: "thank_you",
        template_used: "professional",
        message_content: "",
        action_items: "",
      });
      setShowFollowupModal(false);
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to send follow-up");
      console.error(err);
    }
  };

  // Update interview status
  const handleCompleteInterview = async (interview) => {
    try {
      await axios.put(
        `${API_BASE}/informational-interviews/interviews/${interview.id}`,
        { status: "completed", notes_after: "Interview completed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Interview marked as completed");
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update interview");
      console.error(err);
    }
  };

  // Delete interview
  const handleDeleteInterview = async (interviewId) => {
    if (!window.confirm("Are you sure you want to delete this interview?")) return;

    try {
      await axios.delete(
        `${API_BASE}/informational-interviews/interviews/${interviewId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Interview deleted");
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete interview");
      console.error(err);
    }
  };

  // Open interview details
  const handleViewDetails = (interview) => {
    setSelectedInterview(interview);
    setShowDetailsModal(true);
  };

  // Save insight
  const handleSaveInsight = async (e) => {
    e.preventDefault();
    if (!insightForm.title || !insightForm.description) {
      setError("Title and description required");
      return;
    }

    if (!selectedInterview) {
      setError("No interview selected");
      return;
    }

    try {
      const payload = {
        interview_id: selectedInterview.id,
        insight_type: insightForm.insight_type || "industry_trend",
        title: insightForm.title,
        description: insightForm.description,
        impact_on_search: insightForm.impact_on_search || "medium",
        related_opportunities: insightForm.related_opportunities || "",
      };

      console.log("Saving insight with payload:", payload);

      await axios.post(
        `${API_BASE}/informational-interviews/insights`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Insight saved");
      setInsightForm({
        insight_type: "",
        title: "",
        description: "",
        impact_on_search: "medium",
        related_opportunities: "",
      });
      setShowAddInsightModal(false);
      fetchInsights();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(`Failed to save insight: ${err.response?.data?.error || err.message}`);
      console.error("Error saving insight:", err);
    }
  };

  // Update insight
  const handleUpdateInsight = async (e) => {
    e.preventDefault();
    if (!insightForm.title || !insightForm.description) {
      setError("Title and description required");
      return;
    }

    try {
      await axios.put(
        `${API_BASE}/informational-interviews/insights/${selectedInsight.id}`,
        insightForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Insight updated");
      setShowEditInsightModal(false);
      setSelectedInsight(null);
      fetchInsights();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update insight");
      console.error(err);
    }
  };

  // Delete insight
  const handleDeleteInsight = async (insightId) => {
    try {
      await axios.delete(
        `${API_BASE}/informational-interviews/insights/${insightId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Insight deleted");
      fetchInsights();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete insight");
      console.error(err);
    }
  };

  // Update interview status
  const handleUpdateInterviewStatus = async (e) => {
    e.preventDefault();
    if (!selectedInterview) return;

    try {
      await axios.put(
        `${API_BASE}/informational-interviews/interviews/${selectedInterview.id}`,
        editInterviewForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("✅ Interview updated");
      setShowEditInterviewModal(false);
      fetchInterviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update interview");
      console.error(err);
    }
  };

  return (
    <div className="informational-interviews-container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "candidates" ? "active" : ""}`}
          onClick={() => setActiveTab("candidates")}
        >
          🔍 Find Candidates
        </button>
        <button
          className={`tab-button ${activeTab === "interviews" ? "active" : ""}`}
          onClick={() => setActiveTab("interviews")}
        >
          📅 Track Interviews
        </button>
        <button
          className={`tab-button ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          💡 Industry Insights
        </button>
      </div>

      {/* FIND CANDIDATES TAB */}
      {activeTab === "candidates" && (
        <div className="tab-content">
          <div className="tab-header">
            <h3>🔍 Identify Potential Interview Candidates</h3>
            <button
              className="btn-primary"
              onClick={() => setShowAddCandidateModal(true)}
            >
              + Add Candidate
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading candidates...</div>
          ) : candidates.length === 0 ? (
            <div className="empty-state">
              <p>No candidates added yet. Start by identifying potential interview candidates.</p>
            </div>
          ) : (
            <div className="candidates-grid">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="candidate-card">
                  <div className="card-header">
                    <h4>
                      {candidate.first_name} {candidate.last_name}
                    </h4>
                    <span className={`status-badge status-${candidate.status}`}>
                      {candidate.status}
                    </span>
                  </div>
                  <div className="card-content">
                    <p>
                      <strong>Company:</strong> {candidate.company || "N/A"}
                    </p>
                    <p>
                      <strong>Title:</strong> {candidate.title || "N/A"}
                    </p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {candidate.email ? (
                        <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
                      ) : (
                        "N/A"
                      )}
                    </p>
                    <p>
                      <strong>Industry:</strong> {candidate.industry || "N/A"}
                    </p>
                    {candidate.expertise_areas && (
                      <p>
                        <strong>Expertise:</strong> {candidate.expertise_areas}
                      </p>
                    )}
                    {candidate.linkedin_url && (
                      <p>
                        <a
                          href={candidate.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          LinkedIn Profile →
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setInterviewForm({ ...interviewForm, candidate_id: candidate.id });
                        setShowRequestInterviewModal(true);
                      }}
                    >
                      Request Interview
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleEditCandidate(candidate)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteCandidate(candidate.id)}
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

      {/* TRACK INTERVIEWS TAB */}
      {activeTab === "interviews" && (
        <div className="tab-content">
          <div className="tab-header">
            <h3>📅 Track Informational Interviews</h3>
          </div>

          {interviews.length > 0 && (
            <div className="status-filter-bar">
              <select
                className="status-filter-select"
                value={interviewStatusFilter}
                onChange={(e) => setInterviewStatusFilter(e.target.value)}
              >
                <option value="all">All Interviews</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading interviews...</div>
          ) : interviews.length === 0 ? (
            <div className="empty-state">
              <p>No interviews yet. Request an interview with a candidate.</p>
            </div>
          ) : (
            <div className="interviews-list">
              {interviews
                .filter((interview) => 
                  interviewStatusFilter === "all" || interview.status === interviewStatusFilter
                )
                .map((interview) => (
                <div key={interview.id} className="interview-card">
                  <div className="interview-header">
                    <h4>
                      {interview.candidate?.first_name}{" "}
                      {interview.candidate?.last_name}
                    </h4>
                    <div className="interview-header-right">
                      {interview.opportunity_identified && (
                        <span className="opportunity-badge">
                          ✨ Opportunity
                        </span>
                      )}
                      <span className={`status-badge status-${interview.status}`}>
                        {interview.status}
                      </span>
                    </div>
                  </div>
                  <div className="interview-info">
                    <p>
                      <strong>Company:</strong> {interview.candidate?.company}
                    </p>
                    <p>
                      <strong>Type:</strong> {interview.interview_type}
                    </p>
                    {interview.scheduled_date && (
                      <p>
                        <strong>Scheduled:</strong>{" "}
                        {new Date(interview.scheduled_date).toLocaleDateString()}
                      </p>
                    )}
                    {interview.key_topics && (
                      <p>
                        <strong>Topics:</strong> {interview.key_topics}
                      </p>
                    )}
                    {interview.opportunity_identified && interview.opportunity_description && (
                      <p className="opportunity-description">
                        <strong>🎯 Opportunity:</strong> {interview.opportunity_description}
                      </p>
                    )}
                  </div>
                  <div className="interview-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setSelectedInterview(interview);
                        setEditInterviewForm({
                          status: interview.status,
                          interview_type: interview.interview_type,
                          scheduled_date: interview.scheduled_date || "",
                          duration_minutes: interview.duration_minutes || 30,
                          location_or_platform: interview.location_or_platform || "",
                          key_topics: interview.key_topics || "",
                          notes_after: interview.notes_after || "",
                          relationship_value: interview.relationship_value || "neutral",
                          opportunity_identified: interview.opportunity_identified || false,
                          opportunity_description: interview.opportunity_description || "",
                        });
                        setShowEditInterviewModal(true);
                      }}
                    >
                      ✏️ Edit
                    </button>
                    {interview.status !== "completed" && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedInterview(interview);
                          // Clear form first
                          setPrepForm({
                            title: "",
                            company_research: "",
                            role_research: "",
                            personal_preparation: "",
                            conversation_starters: "",
                            industry_trends: "",
                          });
                          // Then load existing preparation data if available
                          if (interview.preparation) {
                            setPrepForm({
                              title: interview.preparation.title || "",
                              company_research: interview.preparation.company_research || "",
                              role_research: interview.preparation.role_research || "",
                              personal_preparation: interview.preparation.personal_preparation || "",
                              conversation_starters: interview.preparation.conversation_starters || "",
                              industry_trends: interview.preparation.industry_trends || "",
                            });
                          }
                          setShowPrepFrameworkModal(true);
                        }}
                      >
                        📚 Prepare
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => handleViewDetails(interview)}
                    >
                      View Details
                    </button>
                    {interview.status !== "completed" && (
                      <button
                        className="btn-success"
                        onClick={() => handleCompleteInterview(interview)}
                      >
                        ✅ Complete
                      </button>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteInterview(interview.id)}
                      title="Delete interview"
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

      {/* INSIGHTS TAB */}
      {activeTab === "insights" && (
        <div className="tab-content">
          <div className="tab-header">
            <h3>💡 Industry Insights from Interviews</h3>
          </div>

          {loading ? (
            <div className="loading">Loading insights...</div>
          ) : insights.length === 0 ? (
            <div className="empty-state">
              <p>No insights captured yet. Complete interviews to generate insights.</p>
            </div>
          ) : (
            <div className="insights-grid">
              {insights.map((insight) => (
                <div key={insight.id} className="insight-card">
                  <div className="insight-type">{insight.insight_type}</div>
                  <h4>{insight.title}</h4>
                  <p>{insight.description}</p>
                  {insight.related_opportunities && (
                    <p>
                      <strong>Opportunities:</strong>{" "}
                      {insight.related_opportunities}
                    </p>
                  )}
                  <span className={`impact-badge impact-${insight.impact_on_search}`}>
                    Impact: {insight.impact_on_search}
                  </span>
                  <div className="insight-actions">
                    <button className="btn-small" onClick={() => {
                      setSelectedInsight(insight);
                      setInsightForm({
                        insight_type: insight.insight_type,
                        title: insight.title,
                        description: insight.description,
                      });
                      setShowEditInsightModal(true);
                    }}>
                      ✏️ Edit
                    </button>
                    <button type="button" className="btn-small btn-danger" onClick={() => {
                      if (window.confirm("Delete this insight?")) {
                        handleDeleteInsight(insight.id);
                      }
                    }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD CANDIDATE MODAL */}
      {showAddCandidateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddCandidateModal(false);
          setSelectedCandidate(null);
          setCandidateForm({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            company: "",
            title: "",
            industry: "",
            expertise_areas: "",
            linkedin_url: "",
            source: "LinkedIn",
            notes: "",
          });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedCandidate ? "Edit Candidate" : "Add Interview Candidate"}</h3>
            <form onSubmit={handleAddCandidate}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={candidateForm.first_name}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        first_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={candidateForm.last_name}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        last_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={candidateForm.phone}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={candidateForm.company}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        company: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={candidateForm.title}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={candidateForm.industry}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        industry: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select
                    value={candidateForm.source}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        source: e.target.value,
                      })
                    }
                  >
                    <option>LinkedIn</option>
                    <option>Referral</option>
                    <option>Company Website</option>
                    <option>Networking Event</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Expertise Areas (comma-separated)</label>
                <input
                  type="text"
                  value={candidateForm.expertise_areas}
                  onChange={(e) =>
                  setCandidateForm({
                        ...candidateForm,
                        expertise_areas: e.target.value,
                      })
                    }
                    placeholder="e.g., Product Management, Startups, Tech Leadership"
                  />
                </div>
                <div className="form-group">
                  <label>LinkedIn URL</label>
                  <input
                    type="url"
                    value={candidateForm.linkedin_url}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        linkedin_url: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={candidateForm.notes}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        notes: e.target.value,
                      })
                    }
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">
                    {selectedCandidate ? "Update Candidate" : "Add Candidate"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddCandidateModal(false);
                      setSelectedCandidate(null);
                      setCandidateForm({
                        first_name: "",
                        last_name: "",
                        email: "",
                        phone: "",
                        company: "",
                        title: "",
                        industry: "",
                        expertise_areas: "",
                        linkedin_url: "",
                        source: "LinkedIn",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REQUEST INTERVIEW MODAL */}
        {showRequestInterviewModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowRequestInterviewModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Request Informational Interview</h3>
              <form onSubmit={handleRequestInterview}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Interview Type</label>
                    <select
                      value={interviewForm.interview_type}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          interview_type: e.target.value,
                        })
                      }
                    >
                      <option>phone</option>
                      <option>video</option>
                      <option>coffee</option>
                      <option>email</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      value={interviewForm.duration_minutes}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          duration_minutes: parseInt(e.target.value),
                        })
                      }
                      min="15"
                      max="120"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={interviewForm.scheduled_date}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Location / Platform</label>
                  <input
                    type="text"
                    value={interviewForm.location_or_platform}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        location_or_platform: e.target.value,
                      })
                    }
                    placeholder="e.g., Zoom, Coffee at Starbucks"
                  />
                </div>
                <div className="form-group">
                  <label>Key Topics to Discuss</label>
                  <input
                    type="text"
                    value={interviewForm.key_topics}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        key_topics: e.target.value,
                      })
                    }
                    placeholder="e.g., Career path, company culture, industry trends"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowRequestInterviewModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Interview Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PREPARATION FRAMEWORK MODAL */}
        {showPrepFrameworkModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowPrepFrameworkModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>📚 Interview Preparation Framework</h3>
              <form onSubmit={handleSavePreparation}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={prepForm.title}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Company Research</label>
                  <textarea
                    value={prepForm.company_research}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        company_research: e.target.value,
                      })
                    }
                    placeholder="Products, services, recent news, culture..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Role Research</label>
                  <textarea
                    value={prepForm.role_research}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        role_research: e.target.value,
                      })
                    }
                    placeholder="Job description, requirements, career path..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Personal Preparation</label>
                  <textarea
                    value={prepForm.personal_preparation}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        personal_preparation: e.target.value,
                      })
                    }
                    placeholder="Your stories, skills, value proposition..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Conversation Starters</label>
                  <textarea
                    value={prepForm.conversation_starters}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        conversation_starters: e.target.value,
                      })
                    }
                    placeholder="Opening questions, ice breakers..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Industry Trends</label>
                  <textarea
                    value={prepForm.industry_trends}
                    onChange={(e) =>
                      setPrepForm({
                        ...prepForm,
                        industry_trends: e.target.value,
                      })
                    }
                    placeholder="Market trends, challenges, innovations..."
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowPrepFrameworkModal(false)}
                  >
                    Close
                  </button>
                  <button type="submit" className="btn-primary">
                    ✏️ Save Preparation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FOLLOW-UP MODAL */}
        {showFollowupModal && (
          <div className="modal-overlay" onClick={() => setShowFollowupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>✉️ Follow-up with Interviewee</h3>
              <form onSubmit={handleSendFollowup}>
                <div className="form-group">
                  <label>Follow-up Type</label>
                  <select
                    value={followupForm.followup_type}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        followup_type: e.target.value,
                      })
                    }
                  >
                    <option value="thank_you">Thank You</option>
                    <option value="additional_question">Additional Question</option>
                    <option value="connection_request">Connection Request</option>
                    <option value="opportunity_discussion">Opportunity Discussion</option>
                    <option value="general_check_in">General Check-in</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Template</label>
                  <select
                    value={followupForm.template_used}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        template_used: e.target.value,
                      })
                    }
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    value={followupForm.message_content}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        message_content: e.target.value,
                      })
                    }
                    placeholder="Write your follow-up message..."
                    rows="5"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Action Items</label>
                  <textarea
                    value={followupForm.action_items}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        action_items: e.target.value,
                      })
                    }
                    placeholder="Next steps or action items from conversation..."
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowFollowupModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Send Follow-up
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DETAILS MODAL */}
        {showDetailsModal && selectedInterview && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <h3>Interview Details</h3>
              <div className="details-section">
                <h4>Candidate Information</h4>
                <p>
                  <strong>Name:</strong> {selectedInterview.candidate?.first_name}{" "}
                  {selectedInterview.candidate?.last_name}
                </p>
                <p>
                  <strong>Company:</strong> {selectedInterview.candidate?.company}
                </p>
                <p>
                  <strong>Title:</strong> {selectedInterview.candidate?.title}
                </p>
                <p>
                  <strong>Email:</strong> {selectedInterview.candidate?.email}
                </p>
              </div>
              <div className="details-section">
                <h4>Interview Details</h4>
                <p>
                  <strong>Status:</strong> {selectedInterview.status}
                </p>
                <p>
                  <strong>Type:</strong> {selectedInterview.interview_type}
                </p>
                {selectedInterview.scheduled_date && (
                  <p>
                    <strong>Scheduled:</strong>{" "}
                    {new Date(selectedInterview.scheduled_date).toLocaleString()}
                  </p>
                )}
                <p>
                  <strong>Duration:</strong> {selectedInterview.duration_minutes} minutes
                </p>
                {selectedInterview.location_or_platform && (
                  <p>
                    <strong>Platform:</strong> {selectedInterview.location_or_platform}
                  </p>
                )}
                {selectedInterview.key_topics && (
                  <p>
                    <strong>Topics:</strong> {selectedInterview.key_topics}
                  </p>
                )}
              </div>
              {selectedInterview.notes_after && (
                <div className="details-section">
                  <h4>Post-Interview Notes</h4>
                  <p>{selectedInterview.notes_after}</p>
                </div>
              )}
              {selectedInterview.interviewer_insights && (
                <div className="details-section">
                  <h4>Insights</h4>
                  <p>{selectedInterview.interviewer_insights}</p>
                </div>
              )}
              {selectedInterview.opportunity_identified && (
                <div className="details-section opportunity-section">
                  <h4>✨ Opportunity Identified</h4>
                  <p>
                    <strong>Every interaction builds toward career opportunities!</strong>
                  </p>
                  {selectedInterview.opportunity_description && (
                    <p>
                      <strong>Details:</strong> {selectedInterview.opportunity_description}
                    </p>
                  )}
                </div>
              )}
              <div className="details-section info-box">
                <p>
                  <strong>💡 Pro Tip:</strong> Every interaction with a professional builds toward career opportunities. 
                  Track insights, opportunities, and relationship value to maximize your professional network!
                </p>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddInsightModal(true);
                    setInsightForm({
                      insight_type: "",
                      title: "",
                      description: "",
                    });
                  }}
                >
                  💡 Add Insight
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD INSIGHT MODAL */}
        {showAddInsightModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAddInsightModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>💡 Add Interview Insight</h3>
              <form onSubmit={handleSaveInsight}>
                <div className="form-group">
                  <label>Insight Type *</label>
                  <input
                    type="text"
                    value={insightForm.insight_type}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        insight_type: e.target.value,
                      })
                    }
                    placeholder="e.g., Industry Trend, Opportunity, Skill Gap"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={insightForm.title}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., AI Skills in High Demand"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={insightForm.description}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="What did you learn from this interview?"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAddInsightModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Insight
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT INSIGHT MODAL */}
        {showEditInsightModal && selectedInsight && (
          <div
            className="modal-overlay"
            onClick={() => setShowEditInsightModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>✏️ Edit Interview Insight</h3>
              <form onSubmit={handleUpdateInsight}>
                <div className="form-group">
                  <label>Insight Type *</label>
                  <input
                    type="text"
                    value={insightForm.insight_type}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        insight_type: e.target.value,
                      })
                    }
                    placeholder="e.g., Industry Trend, Opportunity, Skill Gap"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={insightForm.title}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., AI Skills in High Demand"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={insightForm.description}
                    onChange={(e) =>
                      setInsightForm({
                        ...insightForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="What did you learn from this interview?"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditInsightModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Insight
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT INTERVIEW MODAL */}
        {showEditInterviewModal && selectedInterview && (
          <div
            className="modal-overlay"
            onClick={() => setShowEditInterviewModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>✏️ Edit Interview</h3>
              <form onSubmit={handleUpdateInterviewStatus}>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editInterviewForm.status}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rescheduled">Rescheduled</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Interview Type</label>
                    <select
                      value={editInterviewForm.interview_type}
                      onChange={(e) =>
                        setEditInterviewForm({
                          ...editInterviewForm,
                          interview_type: e.target.value,
                        })
                      }
                    >
                      <option>phone</option>
                      <option>video</option>
                      <option>coffee</option>
                      <option>email</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      value={editInterviewForm.duration_minutes}
                      onChange={(e) =>
                        setEditInterviewForm({
                          ...editInterviewForm,
                          duration_minutes: parseInt(e.target.value),
                        })
                      }
                      min="15"
                      max="120"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={editInterviewForm.scheduled_date}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Location / Platform</label>
                  <input
                    type="text"
                    value={editInterviewForm.location_or_platform}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        location_or_platform: e.target.value,
                      })
                    }
                    placeholder="e.g., Zoom, Coffee at Starbucks"
                  />
                </div>
                <div className="form-group">
                  <label>Key Topics</label>
                  <input
                    type="text"
                    value={editInterviewForm.key_topics}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        key_topics: e.target.value,
                      })
                    }
                    placeholder="e.g., Career path, company culture"
                  />
                </div>
                <div className="form-group">
                  <label>Post-Interview Notes</label>
                  <textarea
                    value={editInterviewForm.notes_after}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        notes_after: e.target.value,
                      })
                    }
                    placeholder="What did you learn?"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666" }}>
                    ✨ Opportunity Identified
                  </p>
                  <input
                    type="checkbox"
                    checked={editInterviewForm.opportunity_identified}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        opportunity_identified: e.target.checked,
                      })
                    }
                    style={{ cursor: "pointer", width: "18px", height: "18px" }}
                  />
                </div>
                {editInterviewForm.opportunity_identified && (
                  <div className="form-group">
                    <label>Opportunity Description</label>
                    <textarea
                      value={editInterviewForm.opportunity_description}
                      onChange={(e) =>
                        setEditInterviewForm({
                          ...editInterviewForm,
                          opportunity_description: e.target.value,
                        })
                      }
                      placeholder="Describe the opportunity identified..."
                      rows="3"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Relationship Value</label>
                  <select
                    value={editInterviewForm.relationship_value}
                    onChange={(e) =>
                      setEditInterviewForm({
                        ...editInterviewForm,
                        relationship_value: e.target.value,
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="neutral">Neutral</option>
                    <option value="high">High</option>
                    <option value="mentor_potential">Mentor Potential</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">
                    Update Interview
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditInterviewModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default InformationalInterviews;


