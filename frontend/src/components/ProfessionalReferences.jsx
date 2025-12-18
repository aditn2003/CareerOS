import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { baseURL } from "../api";
import "./ProfessionalReferences.css";

const API_BASE = `${baseURL}/api`;

// Helper function to format date for display (handles YYYY-MM-DD without timezone shift)
const formatDateEST = (dateString) => {
  if (!dateString) return "";
  // If it's a YYYY-MM-DD format, parse it directly to avoid timezone issues
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }
  // Fallback for other formats
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
};

// Helper function to format date for sending to backend (preserves the selected date)
const formatDateForBackend = (dateString) => {
  if (!dateString) return null;
  // If it's already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  // Otherwise parse and format
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Predefined request templates
const PREDEFINED_TEMPLATES = {
  initial_request: {
    name: "Initial Reference Request",
    type: "request",
    subject: "Reference Request for [Job Title] at [Company]",
    body: `Dear [Reference Name],

I hope this message finds you well! I'm reaching out because I'm applying for the [Job Title] position at [Company], and I would be honored if you could serve as a professional reference for me.

Given our work together at [Previous Company/Context], I believe you can speak to my [Key Skills/Qualities]. The role involves [Brief Description], which aligns well with the experience we shared on [Project/Experience].

If you're willing to provide a reference, I'd be happy to send over:
- The job description
- Key points you might want to highlight
- A summary of our work together

Please let me know if you have any questions or need additional information. I truly appreciate your support!

Best regards,
[Your Name]`
  },
  reminder: {
    name: "Gentle Reminder",
    type: "reminder",
    subject: "Following Up: Reference Request for [Company]",
    body: `Hi [Reference Name],

I wanted to follow up on my previous message about serving as a reference for my application to [Company]. I understand you're busy, so no pressure at all!

The deadline for references is [Date], so I wanted to check in. If you need any additional information or talking points, I'm happy to provide them.

Thank you again for considering this request!

Best,
[Your Name]`
  },
  thank_you: {
    name: "Thank You Note",
    type: "thank_you",
    subject: "Thank You for Your Reference",
    body: `Dear [Reference Name],

I wanted to express my sincere gratitude for providing a reference for my application to [Company]. Your support means a great deal to me, and I truly appreciate you taking the time to speak on my behalf.

[Update: I'm pleased to share that I received an offer! / I'm still waiting to hear back, but regardless of the outcome, I'm grateful for your help.]

I hope we can stay in touch, and please don't hesitate to reach out if there's ever anything I can do for you.

With appreciation,
[Your Name]`
  },
  update: {
    name: "Career Update",
    type: "update",
    subject: "Career Update & Staying in Touch",
    body: `Hi [Reference Name],

I hope you're doing well! I wanted to reach out with a quick update on my career journey.

[Share your update: new role, accomplishment, or news]

I remain grateful for your support and guidance over the years. I'd love to catch up sometime if you're available - perhaps a quick coffee or call?

Best wishes,
[Your Name]`
  }
};

export default function ProfessionalReferences() {
  const [activeTab, setActiveTab] = useState("references");
  const [references, setReferences] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReference, setEditingReference] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);

  // Form states
  const [referenceForm, setReferenceForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    title: "",
    company: "",
    relationship: "colleague",
    years_known: "",
    reference_strength: "strong",
    key_skills_can_speak_to: "",
    notable_projects: "",
    reference_notes: "",
    preferred_contact_method: "email",
    reference_type: "professional"
  });

  const [requestForm, setRequestForm] = useState({
    reference_id: "",
    custom_reference_name: "",
    job_title: "",
    company: "",
    deadline: "",
    request_message: "",
    talking_points: "",
    role_specific_guidance: ""
  });

  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  const [filteredReferences, setFilteredReferences] = useState([]);

  const [reminderForm, setReminderForm] = useState({
    reference_id: "",
    reminder_type: "check_in",
    reminder_date: "",
    reminder_message: ""
  });

  // Template shuffle state
  const [templateIndices, setTemplateIndices] = useState({
    request: 0,
    reminder: 0,
    thank_you: 0,
    update: 0
  });

  // Get token on each render to ensure we have the latest
  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }), []);

  const fetchReferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/references`, {
        headers: getAuthHeaders()
      });
      setReferences(data.references || []);
    } catch {
      // Silently fail if tables don't exist yet
      setReferences([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/references/requests/all`, {
        headers: getAuthHeaders()
      });
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    }
  }, [getAuthHeaders]);

  const fetchReminders = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/references/reminders/all?completed=false`, {
        headers: getAuthHeaders()
      });
      setReminders(data.reminders || []);
    } catch {
      setReminders([]);
    }
  }, [getAuthHeaders]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/references/stats/overview`, {
        headers: getAuthHeaders()
      });
      setStats(data.stats);
    } catch {
      // Stats will remain null if tables don't exist
    }
  }, [getAuthHeaders]);

  // Fetch data on mount
  useEffect(() => {
    fetchReferences();
    fetchRequests();
    fetchReminders();
    fetchStats();
  }, [fetchReferences, fetchRequests, fetchReminders, fetchStats]);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAddModal || showRequestModal || showReminderModal || showEditRequestModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showRequestModal, showReminderModal, showEditRequestModal]);

  // Reference CRUD
  const handleAddReference = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...referenceForm,
        years_known: referenceForm.years_known ? parseInt(referenceForm.years_known) : null,
        key_skills_can_speak_to: referenceForm.key_skills_can_speak_to 
          ? referenceForm.key_skills_can_speak_to.split(",").map(s => s.trim())
          : [],
        notable_projects: referenceForm.notable_projects
          ? referenceForm.notable_projects.split(",").map(s => s.trim())
          : []
      };

      if (editingReference) {
        await axios.put(`${API_BASE}/references/${editingReference.id}`, payload, {
          headers: getAuthHeaders()
        });
        setSuccessMessage("Reference updated successfully!");
      } else {
        await axios.post(`${API_BASE}/references`, payload, {
          headers: getAuthHeaders()
        });
        setSuccessMessage("Reference added successfully!");
      }

      setShowAddModal(false);
      resetReferenceForm();
      fetchReferences();
      fetchStats();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save reference");
    }
  };

  const handleDeleteReference = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reference?")) return;
    try {
      await axios.delete(`${API_BASE}/references/${id}`, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Reference deleted");
      fetchReferences();
      fetchStats();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to delete reference");
    }
  };

  const handleEditReference = (ref) => {
    setEditingReference(ref);
    setReferenceForm({
      first_name: ref.first_name || "",
      last_name: ref.last_name || "",
      email: ref.email || "",
      phone: ref.phone || "",
      linkedin_url: ref.linkedin_url || "",
      title: ref.title || "",
      company: ref.company || "",
      relationship: ref.relationship || "colleague",
      years_known: ref.years_known || "",
      reference_strength: ref.reference_strength || "strong",
      key_skills_can_speak_to: Array.isArray(ref.key_skills_can_speak_to) 
        ? ref.key_skills_can_speak_to.join(", ")
        : (ref.key_skills_can_speak_to ? JSON.parse(ref.key_skills_can_speak_to).join(", ") : ""),
      notable_projects: Array.isArray(ref.notable_projects)
        ? ref.notable_projects.join(", ")
        : (ref.notable_projects ? JSON.parse(ref.notable_projects).join(", ") : ""),
      reference_notes: ref.reference_notes || "",
      preferred_contact_method: ref.preferred_contact_method || "email",
      reference_type: ref.reference_type || "professional"
    });
    setShowAddModal(true);
  };

  const resetReferenceForm = () => {
    setEditingReference(null);
    setReferenceForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      linkedin_url: "",
      title: "",
      company: "",
      relationship: "colleague",
      years_known: "",
      reference_strength: "strong",
      key_skills_can_speak_to: "",
      notable_projects: "",
      reference_notes: "",
      preferred_contact_method: "email",
      reference_type: "professional"
    });
  };

  // Request handling
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    
    // Validate that a reference is selected
    if (!requestForm.reference_id) {
      setError("Please select a reference from the dropdown");
      return;
    }
    
    try {
      const payload = {
        ...requestForm,
        deadline: formatDateForBackend(requestForm.deadline),
        talking_points: requestForm.talking_points
          ? requestForm.talking_points.split("\n").filter(t => t.trim())
          : []
      };

      // Remove custom_reference_name from payload
      delete payload.custom_reference_name;

      await axios.post(`${API_BASE}/references/requests`, payload, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Reference request created!");
      setShowRequestModal(false);
      setRequestForm({
        reference_id: "",
        custom_reference_name: "",
        job_title: "",
        company: "",
        deadline: "",
        request_message: "",
        talking_points: "",
        role_specific_guidance: ""
      });
      fetchRequests();
      fetchStats();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create request");
    }
  };

  const handleUpdateRequestStatus = async (requestId, status) => {
    try {
      await axios.put(`${API_BASE}/references/requests/${requestId}`, { status }, {
        headers: getAuthHeaders()
      });
      setSuccessMessage(`Request marked as ${status}`);
      fetchRequests();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to update request");
    }
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setRequestForm({
      reference_id: request.reference_id || "",
      custom_reference_name: request.reference ? `${request.reference.first_name} ${request.reference.last_name}` : "",
      job_title: request.job_title || "",
      company: request.company || "",
      deadline: request.deadline ? request.deadline.split("T")[0] : "",
      request_message: request.request_message || "",
      talking_points: Array.isArray(request.talking_points) 
        ? request.talking_points.join("\n") 
        : (request.talking_points || ""),
      role_specific_guidance: request.role_specific_guidance || ""
    });
    setShowEditRequestModal(true);
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    try {
      const payload = {
        job_title: requestForm.job_title,
        company: requestForm.company,
        deadline: formatDateForBackend(requestForm.deadline),
        request_message: requestForm.request_message,
        talking_points: requestForm.talking_points
          ? requestForm.talking_points.split("\n").filter(t => t.trim())
          : [],
        role_specific_guidance: requestForm.role_specific_guidance,
        status: editingRequest.status
      };

      await axios.put(`${API_BASE}/references/requests/${editingRequest.id}`, payload, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Request updated!");
      setShowEditRequestModal(false);
      setEditingRequest(null);
      setRequestForm({
        reference_id: "",
        custom_reference_name: "",
        job_title: "",
        company: "",
        deadline: "",
        request_message: "",
        talking_points: "",
        role_specific_guidance: ""
      });
      fetchRequests();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update request");
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to delete this request?")) return;
    
    try {
      await axios.delete(`${API_BASE}/references/requests/${requestId}`, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Request deleted!");
      fetchRequests();
      fetchStats();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to delete request");
    }
  };

  // Reminder handling
  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...reminderForm,
        reminder_date: formatDateForBackend(reminderForm.reminder_date)
      };
      await axios.post(`${API_BASE}/references/reminders`, payload, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Reminder created!");
      setShowReminderModal(false);
      setReminderForm({
        reference_id: "",
        reminder_type: "check_in",
        reminder_date: "",
        reminder_message: ""
      });
      fetchReminders();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create reminder");
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      await axios.put(`${API_BASE}/references/reminders/${reminderId}`, { is_completed: true }, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Reminder completed!");
      fetchReminders();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to complete reminder");
    }
  };

  // Template shuffle
  const shuffleTemplate = (type) => {
    const templateKeys = Object.keys(PREDEFINED_TEMPLATES).filter(
      k => PREDEFINED_TEMPLATES[k].type === type
    );
    if (templateKeys.length <= 1) return;
    
    const currentIndex = templateIndices[type] || 0;
    const nextIndex = (currentIndex + 1) % templateKeys.length;
    setTemplateIndices({ ...templateIndices, [type]: nextIndex });
  };

  const getTemplateByType = (type) => {
    const templateKeys = Object.keys(PREDEFINED_TEMPLATES).filter(
      k => PREDEFINED_TEMPLATES[k].type === type
    );
    if (templateKeys.length === 0) return null;
    const index = templateIndices[type] || 0;
    return PREDEFINED_TEMPLATES[templateKeys[index % templateKeys.length]];
  };

  const copyTemplate = (template) => {
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(text);
    setSuccessMessage(`"${template.name}" copied to clipboard!`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div className="professional-references">
      <div className="pr-header">
        <h2>📋 Professional Reference Management</h2>
        <p>Manage your references, track requests, and maintain relationships</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && <div className="pr-success">{successMessage}</div>}
      {error && <div className="pr-error">{error}</div>}

      {/* Stats Overview */}
      {stats && (
        <div className="pr-stats">
          <div className="pr-stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-info">
              <span className="stat-value">{stats.total_references}</span>
              <span className="stat-label">Total References</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{stats.available_references}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <span className="stat-icon">📨</span>
            <div className="stat-info">
              <span className="stat-value">{stats.pending_requests}</span>
              <span className="stat-label">Pending Requests</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <span className="stat-icon">🏆</span>
            <div className="stat-info">
              <span className="stat-value">{stats.completed_requests}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="pr-tabs">
        <button
          className={`pr-tab-btn ${activeTab === "references" ? "active" : ""}`}
          onClick={() => setActiveTab("references")}
        >
          👥 References ({references.length})
        </button>
        <button
          className={`pr-tab-btn ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          📨 Requests ({requests.length})
        </button>
        <button
          className={`pr-tab-btn ${activeTab === "reminders" ? "active" : ""}`}
          onClick={() => setActiveTab("reminders")}
        >
          🔔 Reminders ({reminders.length})
        </button>
        <button
          className={`pr-tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          📝 Templates
        </button>
      </div>

      {/* Tab Content */}
      <div className="pr-content">
        {/* References Tab */}
        {activeTab === "references" && (
          <div className="pr-section">
            <div className="pr-section-header">
              <h3>📋 Reference List</h3>
              <button className="btn-primary" onClick={() => { resetReferenceForm(); setShowAddModal(true); }}>
                ➕ Add Reference
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading references...</div>
            ) : references.length === 0 ? (
              <div className="empty-state">
                <p>No references added yet. Start building your reference list!</p>
              </div>
            ) : (
              <div className="references-grid">
                {references.map((ref) => (
                  <div key={ref.id} className={`reference-card ${ref.is_available ? "" : "unavailable"}`}>
                    <div className="reference-header">
                      <div className="reference-avatar">
                        {ref.first_name?.[0]}{ref.last_name?.[0]}
                      </div>
                      <div className="reference-name-info">
                        <h4>{ref.first_name} {ref.last_name}</h4>
                        <span className="reference-title">{ref.title} at {ref.company}</span>
                      </div>
                      <span className={`strength-badge ${ref.reference_strength}`}>
                        {ref.reference_strength}
                      </span>
                    </div>

                    <div className="reference-details">
                      <p><strong>Relationship:</strong> {ref.relationship}</p>
                      <p><strong>Years Known:</strong> {ref.years_known || "N/A"}</p>
                      <p><strong>Type:</strong> {ref.reference_type}</p>
                      <p><strong>Contact:</strong> {ref.preferred_contact_method}</p>
                      {ref.times_used > 0 && (
                        <p><strong>Times Used:</strong> {ref.times_used}</p>
                      )}
                    </div>

                    <div className="reference-contact">
                      {ref.email && (
                        <a href={`mailto:${ref.email}`} className="contact-link">
                          ✉️ {ref.email}
                        </a>
                      )}
                      {ref.phone && (
                        <a href={`tel:${ref.phone}`} className="contact-link">
                          📞 {ref.phone}
                        </a>
                      )}
                    </div>

                    <div className="reference-actions">
                      <button 
                        className="btn-request"
                        onClick={() => {
                          setRequestForm({
                            reference_id: ref.id,
                            custom_reference_name: `${ref.first_name} ${ref.last_name}`,
                            job_title: "",
                            company: "",
                            deadline: "",
                            request_message: "",
                            talking_points: "",
                            role_specific_guidance: ""
                          });
                          setShowRequestModal(true);
                        }}
                      >
                        📨 Request
                      </button>
                      <button className="btn-edit" onClick={() => handleEditReference(ref)}>
                        ✏️ Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteReference(ref.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="pr-section">
            <div className="pr-section-header">
              <h3>📨 Reference Requests</h3>
              <button className="btn-primary" onClick={() => {
                setRequestForm({
                  reference_id: "",
                  custom_reference_name: "",
                  job_title: "",
                  company: "",
                  deadline: "",
                  request_message: "",
                  talking_points: "",
                  role_specific_guidance: ""
                });
                setShowRequestModal(true);
              }}>
                ➕ New Request
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state">
                <p>No reference requests yet. Create one when applying for a job!</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((req) => (
                  <div key={req.id} className={`request-card status-${req.status}`}>
                    <div className="request-header">
                      <div className="request-info">
                        <h4>{req.job_title} at {req.company}</h4>
                        <span className="request-reference">
                          Reference: {req.reference?.first_name} {req.reference?.last_name}
                        </span>
                      </div>
                      <div className="request-header-actions">
                        <span className={`status-badge ${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                        <button 
                          className="btn-icon btn-edit"
                          onClick={() => handleEditRequest(req)}
                          title="Edit Request"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteRequest(req.id)}
                          title="Delete Request"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="request-details">
                      <p><strong>Requested:</strong> {formatDateEST(req.request_date)}</p>
                      {req.deadline && (
                        <p><strong>Deadline:</strong> {formatDateEST(req.deadline)}</p>
                      )}
                    </div>

                    <div className="request-actions">
                      {req.status === "pending" && (
                        <>
                          <button 
                            className="btn-sm btn-contacted"
                            onClick={() => handleUpdateRequestStatus(req.id, "contacted")}
                          >
                            📞 Mark Contacted
                          </button>
                          <button 
                            className="btn-sm btn-confirmed"
                            onClick={() => handleUpdateRequestStatus(req.id, "confirmed")}
                          >
                            ✅ Confirmed
                          </button>
                        </>
                      )}
                      {req.status === "confirmed" && (
                        <button 
                          className="btn-sm btn-completed"
                          onClick={() => handleUpdateRequestStatus(req.id, "completed")}
                        >
                          🏆 Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === "reminders" && (
          <div className="pr-section">
            <div className="pr-section-header">
              <h3>🔔 Relationship Reminders</h3>
              <button className="btn-primary" onClick={() => setShowReminderModal(true)}>
                ➕ Add Reminder
              </button>
            </div>

            {reminders.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming reminders. Set reminders to maintain your reference relationships!</p>
              </div>
            ) : (
              <div className="reminders-list">
                {reminders.map((rem) => (
                  <div key={rem.id} className="reminder-card">
                    <div className="reminder-icon">
                      {rem.reminder_type === "check_in" && "👋"}
                      {rem.reminder_type === "thank_you" && "🙏"}
                      {rem.reminder_type === "update" && "📢"}
                      {rem.reminder_type === "birthday" && "🎂"}
                      {rem.reminder_type === "work_anniversary" && "🎉"}
                    </div>
                    <div className="reminder-content">
                      <h4>{rem.reference?.first_name} {rem.reference?.last_name}</h4>
                      <p className="reminder-type">{rem.reminder_type.replace("_", " ")}</p>
                      <p className="reminder-date">
                        📅 {formatDateEST(rem.reminder_date)}
                      </p>
                      {rem.reminder_message && (
                        <p className="reminder-message">{rem.reminder_message}</p>
                      )}
                    </div>
                    <button 
                      className="btn-complete"
                      onClick={() => handleCompleteReminder(rem.id)}
                    >
                      ✅ Complete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="pr-section">
            <div className="pr-section-header">
              <h3>📝 Request Templates</h3>
            </div>

            <div className="templates-grid">
              {["request", "reminder", "thank_you", "update"].map((type) => {
                const template = getTemplateByType(type);
                if (!template) return null;

                const typeLabel = {
                  request: "📨 Reference Request",
                  reminder: "⏰ Reminder",
                  thank_you: "🙏 Thank You",
                  update: "📢 Career Update"
                }[type];

                return (
                  <div key={type} className="template-card-single">
                    <div className="template-card-header">
                      <span className="category-badge">{typeLabel}</span>
                    </div>
                    <div className="template-card-title">
                      <h5>{template.name}</h5>
                    </div>
                    <div className="template-card-content">
                      <p className="template-subject"><strong>Subject:</strong> {template.subject}</p>
                      <p className="template-body">{template.body.substring(0, 200)}...</p>
                    </div>
                    <div className="template-card-actions">
                      <button className="btn-shuffle" onClick={() => shuffleTemplate(type)}>
                        🔀 Shuffle
                      </button>
                      <button className="btn-copy" onClick={() => copyTemplate(template)}>
                        📋 Copy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Reference Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>{editingReference ? "✏️ Edit Reference" : "➕ Add Reference"}</h3>
            <form onSubmit={handleAddReference}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={referenceForm.first_name}
                  onChange={(e) => setReferenceForm({ ...referenceForm, first_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={referenceForm.last_name}
                  onChange={(e) => setReferenceForm({ ...referenceForm, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="email"
                  placeholder="Email"
                  value={referenceForm.email}
                  onChange={(e) => setReferenceForm({ ...referenceForm, email: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={referenceForm.phone}
                  onChange={(e) => setReferenceForm({ ...referenceForm, phone: e.target.value })}
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={referenceForm.title}
                  onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={referenceForm.company}
                  onChange={(e) => setReferenceForm({ ...referenceForm, company: e.target.value })}
                />
              </div>
              <div className="form-row">
                <select
                  value={referenceForm.relationship}
                  onChange={(e) => setReferenceForm({ ...referenceForm, relationship: e.target.value })}
                >
                  <option value="manager">Manager</option>
                  <option value="colleague">Colleague</option>
                  <option value="mentor">Mentor</option>
                  <option value="client">Client</option>
                  <option value="professor">Professor</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="direct_report">Direct Report</option>
                </select>
                <input
                  type="number"
                  placeholder="Years Known"
                  value={referenceForm.years_known}
                  onChange={(e) => setReferenceForm({ ...referenceForm, years_known: e.target.value })}
                />
              </div>
              <div className="form-row">
                <select
                  value={referenceForm.reference_type}
                  onChange={(e) => setReferenceForm({ ...referenceForm, reference_type: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="academic">Academic</option>
                  <option value="personal">Personal</option>
                  <option value="character">Character</option>
                </select>
                <select
                  value={referenceForm.reference_strength}
                  onChange={(e) => setReferenceForm({ ...referenceForm, reference_strength: e.target.value })}
                >
                  <option value="strong">Strong</option>
                  <option value="moderate">Moderate</option>
                  <option value="weak">Weak</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Key Skills They Can Speak To (comma-separated)"
                value={referenceForm.key_skills_can_speak_to}
                onChange={(e) => setReferenceForm({ ...referenceForm, key_skills_can_speak_to: e.target.value })}
              />
              <input
                type="text"
                placeholder="Notable Projects (comma-separated)"
                value={referenceForm.notable_projects}
                onChange={(e) => setReferenceForm({ ...referenceForm, notable_projects: e.target.value })}
              />
              <textarea
                placeholder="Additional Notes"
                value={referenceForm.reference_notes}
                onChange={(e) => setReferenceForm({ ...referenceForm, reference_notes: e.target.value })}
                rows="3"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  {editingReference ? "Save Changes" : "Add Reference"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📨 Create Reference Request</h3>
            <form onSubmit={handleCreateRequest}>
              <div className="combobox-container">
                <input
                  type="text"
                  placeholder="Type to search references *"
                  value={requestForm.custom_reference_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRequestForm({ ...requestForm, custom_reference_name: value, reference_id: "" });
                    const filtered = references.filter(r => 
                      r.is_available && 
                      `${r.first_name} ${r.last_name}`.toLowerCase().includes(value.toLowerCase())
                    );
                    setFilteredReferences(filtered);
                    setShowReferenceDropdown(true);
                  }}
                  onFocus={() => {
                    setFilteredReferences(references.filter(r => r.is_available));
                    setShowReferenceDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowReferenceDropdown(false), 200)}
                />
                {showReferenceDropdown && filteredReferences.length > 0 && (
                  <div className="combobox-dropdown">
                    {filteredReferences.map((ref) => (
                      <div
                        key={ref.id}
                        className="combobox-option"
                        onClick={() => {
                          setRequestForm({
                            ...requestForm,
                            reference_id: ref.id,
                            custom_reference_name: `${ref.first_name} ${ref.last_name}`
                          });
                          setShowReferenceDropdown(false);
                        }}
                      >
                        <span className="option-name">{ref.first_name} {ref.last_name}</span>
                        <span className="option-company">{ref.company}</span>
                      </div>
                    ))}
                  </div>
                )}
                {requestForm.custom_reference_name && !requestForm.reference_id && (
                  <div className="new-reference-hint">⚠️ Please select a reference from the list</div>
                )}
                {requestForm.reference_id && (
                  <div className="reference-selected-hint">✓ Reference selected</div>
                )}
              </div>
              <input
                type="text"
                placeholder="Job Title *"
                value={requestForm.job_title}
                onChange={(e) => setRequestForm({ ...requestForm, job_title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Company *"
                value={requestForm.company}
                onChange={(e) => setRequestForm({ ...requestForm, company: e.target.value })}
                required
              />
              <label>
                Deadline:
                <input
                  type="date"
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                />
              </label>
              <textarea
                placeholder="Talking Points (one per line)"
                value={requestForm.talking_points}
                onChange={(e) => setRequestForm({ ...requestForm, talking_points: e.target.value })}
                rows="4"
              />
              <textarea
                placeholder="Role-Specific Guidance"
                value={requestForm.role_specific_guidance}
                onChange={(e) => setRequestForm({ ...requestForm, role_specific_guidance: e.target.value })}
                rows="3"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Create Request</button>
                <button type="button" className="btn-secondary" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditRequestModal && editingRequest && (
        <div className="modal-overlay" onClick={() => { setShowEditRequestModal(false); setEditingRequest(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Edit Reference Request</h3>
            <form onSubmit={handleUpdateRequest}>
              <div className="reference-display">
                <strong>Reference:</strong> {requestForm.custom_reference_name}
              </div>
              <input
                type="text"
                placeholder="Job Title *"
                value={requestForm.job_title}
                onChange={(e) => setRequestForm({ ...requestForm, job_title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Company *"
                value={requestForm.company}
                onChange={(e) => setRequestForm({ ...requestForm, company: e.target.value })}
                required
              />
              <label>
                Deadline:
                <input
                  type="date"
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                />
              </label>
              <textarea
                placeholder="Talking Points (one per line)"
                value={requestForm.talking_points}
                onChange={(e) => setRequestForm({ ...requestForm, talking_points: e.target.value })}
                rows="4"
              />
              <textarea
                placeholder="Role-Specific Guidance"
                value={requestForm.role_specific_guidance}
                onChange={(e) => setRequestForm({ ...requestForm, role_specific_guidance: e.target.value })}
                rows="3"
              />
              <select
                value={editingRequest.status}
                onChange={(e) => setEditingRequest({ ...editingRequest, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Update Request</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowEditRequestModal(false); setEditingRequest(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="modal-overlay" onClick={() => setShowReminderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🔔 Set Reminder</h3>
            <form onSubmit={handleCreateReminder}>
              <select
                value={reminderForm.reference_id}
                onChange={(e) => setReminderForm({ ...reminderForm, reference_id: e.target.value })}
                required
              >
                <option value="">Select Reference *</option>
                {references.map((ref) => (
                  <option key={ref.id} value={ref.id}>
                    {ref.first_name} {ref.last_name}
                  </option>
                ))}
              </select>
              <select
                value={reminderForm.reminder_type}
                onChange={(e) => setReminderForm({ ...reminderForm, reminder_type: e.target.value })}
              >
                <option value="check_in">Check In</option>
                <option value="thank_you">Thank You</option>
                <option value="update">Career Update</option>
                <option value="birthday">Birthday</option>
                <option value="work_anniversary">Work Anniversary</option>
              </select>
              <label>
                Reminder Date *:
                <input
                  type="date"
                  value={reminderForm.reminder_date}
                  onChange={(e) => setReminderForm({ ...reminderForm, reminder_date: e.target.value })}
                  required
                />
              </label>
              <textarea
                placeholder="Reminder message or notes"
                value={reminderForm.reminder_message}
                onChange={(e) => setReminderForm({ ...reminderForm, reminder_message: e.target.value })}
                rows="3"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Set Reminder</button>
                <button type="button" className="btn-secondary" onClick={() => setShowReminderModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
