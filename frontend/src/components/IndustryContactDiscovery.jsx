import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "../styles/IndustryContactDiscovery.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// Pre-populated contacts database (same as backend)
const CONTACT_DB = {
  "Google": [
    { firstName: "Sarah", lastName: "Chen", title: "Senior Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 92 },
    { firstName: "Michael", lastName: "Lee", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Jessica", lastName: "Park", title: "Product Designer", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "David", lastName: "Kumar", title: "VP of Engineering", industry: "Technology", reason: "target_company_match", matchScore: 90 }
  ],
  "Microsoft": [
    { firstName: "James", lastName: "Rodriguez", title: "Engineering Director", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Emily", lastName: "Thompson", title: "Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 84 },
    { firstName: "Alex", lastName: "Johnson", title: "Senior Developer", industry: "Technology", reason: "target_company_match", matchScore: 82 },
    { firstName: "Lisa", lastName: "Anderson", title: "Engineering Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 }
  ],
  "Amazon": [
    { firstName: "Emily", lastName: "Watson", title: "VP of Operations", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Christopher", lastName: "Martin", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 83 },
    { firstName: "Rachel", lastName: "Green", title: "Operations Manager", industry: "Technology", reason: "target_company_match", matchScore: 81 },
    { firstName: "Daniel", lastName: "Brown", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 86 }
  ],
  "Apple": [
    { firstName: "Michael", lastName: "Park", title: "Product Strategy Lead", industry: "Technology", reason: "target_company_match", matchScore: 89 },
    { firstName: "Sophie", lastName: "Laurent", title: "Design Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 },
    { firstName: "Kevin", lastName: "Wong", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Maria", lastName: "Garcia", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 84 }
  ],
  "Meta": [
    { firstName: "David", lastName: "Kim", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 88 },
    { firstName: "Olivia", lastName: "Chen", title: "Product Manager", industry: "Technology", reason: "target_company_match", matchScore: 86 },
    { firstName: "James", lastName: "Wright", title: "Senior Engineer", industry: "Technology", reason: "target_company_match", matchScore: 84 },
    { firstName: "Priya", lastName: "Patel", title: "Engineering Lead", industry: "Technology", reason: "target_company_match", matchScore: 87 }
  ],
  "Tesla": [
    { firstName: "Robert", lastName: "Tesla", title: "Engineering Director", industry: "Automotive", reason: "target_company_match", matchScore: 91 },
    { firstName: "Amanda", lastName: "Steele", title: "Product Manager", industry: "Automotive", reason: "target_company_match", matchScore: 87 },
    { firstName: "Marcus", lastName: "Johnson", title: "Manufacturing Lead", industry: "Automotive", reason: "target_company_match", matchScore: 83 }
  ],
  "LinkedIn": [
    { firstName: "Sarah", lastName: "Mitchell", title: "Senior PM", industry: "Technology", reason: "target_company_match", matchScore: 86 },
    { firstName: "Tom", lastName: "Brady", title: "Engineering Manager", industry: "Technology", reason: "target_company_match", matchScore: 85 },
    { firstName: "Nicole", lastName: "Davis", title: "Product Designer", industry: "Technology", reason: "target_company_match", matchScore: 82 }
  ],
  "Stripe": [
    { firstName: "Patrick", lastName: "Collison", title: "CEO & Co-founder", industry: "FinTech", reason: "target_company_match", matchScore: 95 },
    { firstName: "Samantha", lastName: "Chen", title: "Head of Product", industry: "FinTech", reason: "target_company_match", matchScore: 89 },
    { firstName: "Blake", lastName: "Harrison", title: "Engineering Manager", industry: "FinTech", reason: "target_company_match", matchScore: 87 }
  ]
};

export default function IndustryContactDiscovery() {
  const [activeTab, setActiveTab] = useState("suggestions");
  const [suggestions, setSuggestions] = useState([]);
  const [connections, setConnections] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [reminders, setReminders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Get fresh auth headers on each request
  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }), []);

  // Modals
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditConnectionModal, setShowEditConnectionModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [outreachType, setOutreachType] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editConnectionForm, setEditConnectionForm] = useState({
    mutual_contact_name: "",
    target_contact_name: "",
    target_company: "",
    connection_degree: 2,
    relationship_strength: 3,
    introduction_message: ""
  });

  // Autocomplete state
  const [contactOptions, setContactOptions] = useState([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  // Form state
  const [suggestionForm, setSuggestionForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    company: "",
    industry: "",
    linkedin_url: "",
    suggestion_reason: "target_company_match",
    match_score: 75,
    engagement_type: "warm_introduction"
  });

  const [alumniForm, setAlumniForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    company: "",
    education_institution: "",
    graduation_year: new Date().getFullYear(),
    degree_type: "",
    field_of_study: ""
  });

  const [eventForm, setEventForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    company: "",
    event_name: "",
    event_date: "",
    event_type: "conference",
    event_location: "",
    is_speaker: false,
    is_attendee: true
  });

  const [connectionForm, setConnectionForm] = useState({
    mutual_contact_name: "",
    target_contact_name: "",
    target_company: "",
    connection_degree: 2,
    relationship_strength: 3,
    introduction_message: ""
  });

  const [outreachForm, setOutreachForm] = useState({
    outreach_message: "",
    outreach_template: ""
  });

  const [reminderForm, setReminderForm] = useState({
    contact_name: "",
    contact_company: "",
    reminder_type: "check_in",
    reminder_date: "",
    custom_message: ""
  });

  // Prevent background scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = 
      showSuggestionModal || 
      showAlumniModal || 
      showEventModal || 
      showConnectionModal || 
      showOutreachModal || 
      showReminderModal || 
      showEditConnectionModal;
    
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSuggestionModal, showAlumniModal, showEventModal, showConnectionModal, showOutreachModal, showReminderModal, showEditConnectionModal]);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = getAuthHeaders();
      const [suggestionsRes, connectionsRes, leadersRes, alumniRes, eventsRes, analyticsRes] =
        await Promise.all([
          axios.get(`${API_BASE}/industry-contacts/suggestions`, { headers }),
          axios.get(`${API_BASE}/industry-contacts/connection-paths`, { headers }),
          axios.get(`${API_BASE}/industry-contacts/industry-leaders`, { headers }),
          axios.get(`${API_BASE}/industry-contacts/alumni`, { headers }),
          axios.get(`${API_BASE}/industry-contacts/event-participants`, { headers }),
          axios.get(`${API_BASE}/industry-contacts/discovery-analytics`, { headers })
        ]);

      setSuggestions(suggestionsRes.data.suggestions || []);
      setConnections(connectionsRes.data.connections || []);
      setLeaders(leadersRes.data.leaders || []);
      setAlumni(alumniRes.data.alumni || []);
      setEventParticipants(eventsRes.data.participants || []);
      setAnalytics(analyticsRes.data.metrics);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load discovery data");
    } finally {
      setLoading(false);
    }
  };

  // Handle company input change for autocomplete
  const handleCompanyChange = (value) => {
    setSuggestionForm({ ...suggestionForm, company: value });

    if (value.length > 0) {
      // Search through contact database
      const matches = [];
      Object.keys(CONTACT_DB).forEach(company => {
        if (company.toLowerCase().includes(value.toLowerCase())) {
          CONTACT_DB[company].forEach(contact => {
            matches.push({
              ...contact,
              company: company
            });
          });
        }
      });
      
      setContactOptions(matches);
      setShowContactDropdown(matches.length > 0);
    } else {
      setContactOptions([]);
      setShowContactDropdown(false);
    }
  };

  // Handle contact selection from dropdown
  const handleSelectContact = (contact) => {
    setSuggestionForm({
      ...suggestionForm,
      first_name: contact.firstName,
      last_name: contact.lastName,
      title: contact.title,
      company: contact.company,
      industry: contact.industry,
      suggestion_reason: contact.reason,
      match_score: contact.matchScore,
      engagement_type: "warm_introduction"
    });
    setShowContactDropdown(false);
    setContactOptions([]);
  };

  // Handle suggestion form submit
  const handleAddSuggestion = async (e) => {
    e.preventDefault();
    try {
      console.log("📤 Submitting suggestion form:", suggestionForm);
      const res = await axios.post(`${API_BASE}/industry-contacts/suggestions`, suggestionForm, { headers: getAuthHeaders() });
      console.log("✅ Response:", res.data);
      setSuggestions([...suggestions, res.data.suggestion]);
      setShowSuggestionModal(false);
      setSuggestionForm({
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        company: "",
        industry: "",
        linkedin_url: "",
        suggestion_reason: "target_company_match",
        match_score: 75,
        engagement_type: "warm_introduction"
      });
      setSuccessMessage("Contact suggestion added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error:", err);
      console.error("❌ Response data:", err.response?.data);
      setError(err.response?.data?.error || err.message || "Failed to add suggestion");
    }
  };

  // Handle alumni form submit
  const handleAddAlumni = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing alumni
        await axios.put(`${API_BASE}/industry-contacts/alumni/${editingId}`, alumniForm, { headers: getAuthHeaders() });
        setAlumni(alumni.map(a => a.id === editingId ? { ...a, ...alumniForm } : a));
        setSuccessMessage("Alumni updated successfully!");
      } else {
        // Add new alumni
        const res = await axios.post(`${API_BASE}/industry-contacts/alumni`, alumniForm, { headers: getAuthHeaders() });
        setAlumni([...alumni, res.data.alumni]);
        setSuccessMessage("Alumni connection added successfully!");
      }
      setShowAlumniModal(false);
      setEditingId(null);
      setAlumniForm({
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        company: "",
        education_institution: "",
        graduation_year: new Date().getFullYear(),
        degree_type: "",
        field_of_study: ""
      });
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save alumni");
    }
  };

  // Handle event form submit
  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing event participant
        await axios.put(`${API_BASE}/industry-contacts/event-participants/${editingId}`, eventForm, { headers: getAuthHeaders() });
        setEventParticipants(eventParticipants.map(p => p.id === editingId ? { ...p, ...eventForm } : p));
        setSuccessMessage("Event participant updated successfully!");
      } else {
        // Add new event participant
        const res = await axios.post(`${API_BASE}/industry-contacts/event-participants`, eventForm, { headers: getAuthHeaders() });
        setEventParticipants([...eventParticipants, res.data.participant]);
        setSuccessMessage("Event participant added successfully!");
      }
      setShowEventModal(false);
      setEditingId(null);
      setEventForm({
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        company: "",
        event_name: "",
        event_date: "",
        event_type: "conference",
        event_location: "",
        is_speaker: false,
        is_attendee: true
      });
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save event participant");
    }
  };

  // Handle outreach
  const handleAddConnection = async (e) => {
    e.preventDefault();
    
    if (!connectionForm.mutual_contact_name.trim() || 
        !connectionForm.target_contact_name.trim() || 
        !connectionForm.target_company.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/industry-contacts/connection-paths`, {
        mutual_contact_name: connectionForm.mutual_contact_name,
        target_contact_name: connectionForm.target_contact_name,
        target_company: connectionForm.target_company,
        connection_degree: connectionForm.connection_degree,
        relationship_strength: connectionForm.relationship_strength,
        introduction_message: connectionForm.introduction_message
      }, { headers: getAuthHeaders() });

      if (response.data.success) {
        setConnections([...connections, response.data.path]);
        setConnectionForm({
          mutual_contact_name: "",
          target_contact_name: "",
          target_company: "",
          connection_degree: 2,
          relationship_strength: 3,
          introduction_message: ""
        });
        setShowConnectionModal(false);
        setSuccessMessage("Connection path added successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add connection");
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    if (!window.confirm("Delete this connection path?")) return;

    try {
      await axios.delete(`${API_BASE}/industry-contacts/connection-paths/${connectionId}`, { headers: getAuthHeaders() });
      setConnections(connections.filter(c => c.id !== connectionId));
      setSuccessMessage("Connection deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete connection");
    }
  };

  const handleEditConnection = (conn) => {
    setEditingId(conn.id);
    setEditConnectionForm({
      mutual_contact_name: conn.mutual_contact_name || "",
      target_contact_name: conn.target_contact_name || "",
      target_company: conn.target_company || "",
      connection_degree: conn.connection_degree || 2,
      relationship_strength: conn.relationship_strength || 3,
      introduction_message: conn.introduction_message || ""
    });
    setShowEditConnectionModal(true);
  };

  const handleSaveConnection = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_BASE}/industry-contacts/connection-paths/${editingId}`, editConnectionForm, { headers: getAuthHeaders() });
      if (response.data.success) {
        setConnections(connections.map(c => 
          c.id === editingId ? { ...c, ...editConnectionForm } : c
        ));
        setShowEditConnectionModal(false);
        setEditingId(null);
        setSuccessMessage("Connection updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update connection");
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    
    if (!reminderForm.contact_name.trim() || !reminderForm.reminder_date) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/industry-contacts/reminders`, {
        contact_name: reminderForm.contact_name,
        contact_company: reminderForm.contact_company,
        reminder_type: reminderForm.reminder_type,
        reminder_date: reminderForm.reminder_date,
        custom_message: reminderForm.custom_message
      }, { headers: getAuthHeaders() });

      if (response.data.success) {
        setReminders([...reminders, response.data.reminder]);
        setReminderForm({
          contact_name: "",
          contact_company: "",
          reminder_type: "check_in",
          reminder_date: "",
          custom_message: ""
        });
        setShowReminderModal(false);
        setSuccessMessage("Reminder set successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create reminder");
    }
  };

  const handleSendOutreach = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/industry-contacts/discovery-outreach/${outreachType}/${selectedContact.id}`, outreachForm, { headers: getAuthHeaders() });
      setShowOutreachModal(false);
      setOutreachForm({ outreach_message: "", outreach_template: "" });
      setSelectedContact(null);
      setSuccessMessage("Outreach message sent!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send outreach");
    }
  };

  // Handle action status update
  const handleUpdateAction = async (contactId, newStatus) => {
    try {
      await axios.put(`${API_BASE}/industry-contacts/suggestions/${contactId}/action`, {
        action_status: newStatus
      }, { headers: getAuthHeaders() });
      setSuggestions(
        suggestions.map((s) =>
          s.id === contactId ? { ...s, action_status: newStatus } : s
        )
      );
      setSuccessMessage("Status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update status");
    }
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId, type) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;

    try {
      let endpoint = "";
      if (type === "suggestion") endpoint = `${API_BASE}/industry-contacts/suggestions/${contactId}`;
      else if (type === "alumni") endpoint = `${API_BASE}/industry-contacts/alumni/${contactId}`;
      else if (type === "event") endpoint = `${API_BASE}/industry-contacts/event-participants/${contactId}`;

      await axios.delete(endpoint, { headers: getAuthHeaders() });

      // Update UI
      if (type === "suggestion") {
        setSuggestions(suggestions.filter((s) => s.id !== contactId));
      } else if (type === "alumni") {
        setAlumni(alumni.filter((a) => a.id !== contactId));
      } else if (type === "event") {
        setEventParticipants(eventParticipants.filter((e) => e.id !== contactId));
      }

      setSuccessMessage("Contact deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete contact");
    }
  };

  // Handle edit contact
  const handleEditContact = (contact, type) => {
    setEditingId(contact.id);

    if (type === "suggestion") {
      setSuggestionForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || "",
        title: contact.title || "",
        company: contact.company || "",
        industry: contact.industry || "",
        linkedin_url: contact.linkedin_url || "",
        suggestion_reason: contact.suggestion_reason || "target_company_match",
        match_score: contact.match_score || 75,
        engagement_type: contact.engagement_type || "warm_introduction"
      });
      setShowSuggestionModal(true);
    } else if (type === "alumni") {
      setAlumniForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || "",
        title: contact.title || "",
        company: contact.company || "",
        education_institution: contact.education_institution || "",
        graduation_year: contact.graduation_year || new Date().getFullYear(),
        degree_type: contact.degree_type || "",
        field_of_study: contact.field_of_study || ""
      });
      setShowAlumniModal(true);
    } else if (type === "event") {
      setEventForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || "",
        title: contact.title || "",
        company: contact.company || "",
        event_name: contact.event_name || "",
        event_date: contact.event_date || "",
        event_type: contact.event_type || "conference",
        event_location: contact.event_location || "",
        is_speaker: contact.is_speaker || false,
        is_attendee: contact.is_attendee || true
      });
      setShowEventModal(true);
    }
  };

  // Handle update suggestion (when editing)
  const handleUpdateSuggestion = async (e) => {
    e.preventDefault();
    if (!editingId) {
      handleAddSuggestion(e);
      return;
    }

    try {
      await axios.put(`${API_BASE}/industry-contacts/suggestions/${editingId}`, suggestionForm, { headers: getAuthHeaders() });
      setSuggestions(
        suggestions.map((s) =>
          s.id === editingId ? { ...s, ...suggestionForm } : s
        )
      );
      setShowSuggestionModal(false);
      setEditingId(null);
      setSuggestionForm({
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        company: "",
        industry: "",
        linkedin_url: "",
        suggestion_reason: "target_company_match",
        match_score: 75,
        engagement_type: "warm_introduction"
      });
      setSuccessMessage("Contact updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update suggestion");
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "new":
        return "badge-new";
      case "contacted":
        return "badge-contacted";
      case "connected":
        return "badge-connected";
      case "ignored":
        return "badge-ignored";
      default:
        return "badge-new";
    }
  };

  return (
    <div className="discovery-container">
      {/* Header */}
      <div className="discovery-header">
        <h2>🌐 Industry Contact Discovery</h2>
        <p>Discover and connect with relevant industry professionals</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="discovery-analytics">
          <div className="analytics-card">
            <div className="analytics-value">{analytics.total_discovery_efforts}</div>
            <div className="analytics-label">Total Efforts</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{analytics.total_suggestions}</div>
            <div className="analytics-label">Suggestions</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{analytics.suggestions_connected}</div>
            <div className="analytics-label">Connected</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="discovery-tabs">
        <button
          className={`discovery-tab-btn ${activeTab === "suggestions" ? "active" : ""}`}
          onClick={() => setActiveTab("suggestions")}
        >
          💡 Suggestions ({suggestions.length})
        </button>
        <button
          className={`discovery-tab-btn ${activeTab === "connections" ? "active" : ""}`}
          onClick={() => setActiveTab("connections")}
        >
          🔗 Mutual Connections ({connections.length})
        </button>
        <button
          className={`discovery-tab-btn ${activeTab === "alumni" ? "active" : ""}`}
          onClick={() => setActiveTab("alumni")}
        >
          🎓 Alumni ({alumni.length})
        </button>
        <button
          className={`discovery-tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          🎤 Event Participants ({eventParticipants.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="discovery-content">
        {/* Suggestions Tab */}
        {activeTab === "suggestions" && (
          <div className="tab-section">
            <div className="tab-header">
              <h3>Suggested Industry Contacts</h3>
              <button
                className="btn-primary"
                onClick={() => setShowSuggestionModal(true)}
              >
                + Add Suggestion
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="empty-state">
                <p>No suggested contacts yet. Add your first contact suggestion!</p>
              </div>
            ) : (
              <div className="contact-grid">
                {suggestions.map((contact) => (
                  <div key={contact.id} className="contact-card">
                    <div className="contact-header">
                      <h4>{contact.first_name} {contact.last_name}</h4>
                      <span className={`badge ${getStatusBadgeColor(contact.action_status)}`}>
                        {contact.action_status}
                      </span>
                    </div>
                    <div className="contact-details">
                      <p><strong>Title:</strong> {contact.title}</p>
                      <p><strong>Company:</strong> {contact.company}</p>
                      <p><strong>Industry:</strong> {contact.industry}</p>
                      {contact.email && <p><strong>Email:</strong> {contact.email}</p>}
                      <p><strong>Match Score:</strong> {contact.match_score}%</p>
                      <p><strong>Reason:</strong> {contact.suggestion_reason}</p>
                    </div>
                    <div className="contact-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedContact({ ...contact, type: "suggestion" });
                          setOutreachType("suggestion");
                          setShowOutreachModal(true);
                        }}
                      >
                        Reach Out
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditContact(contact, "suggestion")}
                        title="Edit contact"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteContact(contact.id, "suggestion")}
                        title="Delete contact"
                      >
                        🗑️ Delete
                      </button>
                      <select
                        value={contact.action_status}
                        onChange={(e) => handleUpdateAction(contact.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="connected">Connected</option>
                        <option value="ignored">Ignored</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === "connections" && (
          <div className="tab-section">
            <div className="tab-header">
              <h3>🔗 Warm Introductions</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowConnectionModal(true);
                }}
              >
                + Add Connection Path
              </button>
            </div>

            {connections.length === 0 ? (
              <div className="empty-state">
                <p>No connection paths identified yet. Build your connection paths to get warm introductions!</p>
              </div>
            ) : (
              <div className="connections-list">
                {connections.map((conn) => (
                  <div key={conn.id} className="connection-item">
                    <div className="connection-intro">
                      <div className="intro-flow">
                        <span className="intro-person">You</span>
                        <span className="arrow">→</span>
                        <span className="intro-person mutual">{conn.mutual_contact_name}</span>
                        <span className="arrow">→</span>
                        <span className="intro-person target">{conn.target_contact_name}</span>
                      </div>
                    </div>
                    <div className="connection-details">
                      <p><strong>Target:</strong> {conn.target_contact_name} at {conn.target_company}</p>
                      <p><strong>Mutual Connection:</strong> {conn.mutual_contact_name}</p>
                      <p><strong>Degree:</strong> {conn.connection_degree}-degree connection</p>
                      <p><strong>Relationship Strength:</strong> {conn.relationship_strength}/5 ⭐</p>
                      {conn.introduction_message && <p><strong>Intro Template:</strong> {conn.introduction_message}</p>}
                    </div>
                    <div className="connection-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedContact({ ...conn, type: "connection" });
                          setOutreachType("connection");
                          setShowOutreachModal(true);
                        }}
                      >
                        Send Introduction Request
                      </button>
                      <div className="action-buttons-row">
                        <button
                          className="btn-edit"
                          onClick={() => handleEditConnection(conn)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteConnection(conn.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alumni Tab */}
        {activeTab === "alumni" && (
          <div className="tab-section">
            <div className="tab-header">
              <h3>Alumni Connections</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setAlumniForm({
                    first_name: "",
                    last_name: "",
                    email: "",
                    title: "",
                    company: "",
                    education_institution: "",
                    graduation_year: new Date().getFullYear(),
                    degree_type: "",
                    field_of_study: ""
                  });
                  setEditingId(null);
                  setShowAlumniModal(true);
                }}
              >
                + Add Alumni
              </button>
            </div>

            {alumni.length === 0 ? (
              <div className="empty-state">
                <p>No alumni connections found. Add connections from your educational institutions!</p>
              </div>
            ) : (
              <div className="contact-grid">
                {alumni.map((alumnus) => (
                  <div key={alumnus.id} className="alumni-card">
                    <div className="alumni-header">
                      <h4>{alumnus.first_name} {alumnus.last_name}</h4>
                      <span className={`badge ${getStatusBadgeColor(alumnus.outreach_status)}`}>
                        {alumnus.outreach_status}
                      </span>
                    </div>
                    <div className="alumni-details">
                      <p><strong>Institution:</strong> {alumnus.education_institution}</p>
                      <p><strong>Graduated:</strong> {alumnus.graduation_year}</p>
                      <p><strong>Current Title:</strong> {alumnus.title}</p>
                      <p><strong>Current Company:</strong> {alumnus.company}</p>
                      {alumnus.degree_type && <p><strong>Degree:</strong> {alumnus.degree_type}</p>}
                    </div>
                    <div className="alumni-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedContact({ ...alumnus, type: "alumni" });
                          setOutreachType("alumni");
                          setShowOutreachModal(true);
                        }}
                      >
                        Reach Out
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditContact(alumnus, "alumni")}
                        title="Edit contact"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteContact(alumnus.id, "alumni")}
                        title="Delete contact"
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

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="tab-section">
            <div className="tab-header">
              <h3>Event Participants & Speakers</h3>
              <button
                className="btn-primary"
                onClick={() => setShowEventModal(true)}
              >
                + Add Event Contact
              </button>
            </div>

            {eventParticipants.length === 0 ? (
              <div className="empty-state">
                <p>No event connections found. Add contacts from conferences and networking events!</p>
              </div>
            ) : (
              <div className="contact-grid">
                {eventParticipants.map((participant) => (
                  <div key={participant.id} className="event-card">
                    <div className="event-header">
                      <h4>{participant.first_name} {participant.last_name}</h4>
                      {participant.is_speaker && <span className="speaker-badge">🎤 Speaker</span>}
                    </div>
                    <div className="event-details">
                      <p><strong>Event:</strong> {participant.event_name}</p>
                      <p><strong>Event Date:</strong> {participant.event_date}</p>
                      <p><strong>Event Type:</strong> {participant.event_type}</p>
                      <p><strong>Title:</strong> {participant.title}</p>
                      <p><strong>Company:</strong> {participant.company}</p>
                      {participant.speaker_topic && (
                        <p><strong>Topic:</strong> {participant.speaker_topic}</p>
                      )}
                    </div>
                    <div className="event-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedContact({ ...participant, type: "event" });
                          setOutreachType("event");
                          setShowOutreachModal(true);
                        }}
                      >
                        {participant.is_speaker ? "Thank & Connect" : "Connect"}
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditContact(participant, "event")}
                        title="Edit contact"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteContact(participant.id, "event")}
                        title="Delete contact"
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

      {/* Add Suggestion Modal */}
      {showSuggestionModal && (
        <div className="modal-overlay" onClick={() => {
          setShowSuggestionModal(false);
          setEditingId(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Contact" : "Add Contact Suggestion"}</h3>
            <form onSubmit={editingId ? handleUpdateSuggestion : handleAddSuggestion}>
              <div className="form-row">
                <div>
                  <label>First Name *</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={suggestionForm.first_name}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={suggestionForm.last_name}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={suggestionForm.email}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="Title"
                    value={suggestionForm.title}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, title: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div style={{ position: "relative" }}>
                  <label>Company *</label>
                  <input
                    type="text"
                    placeholder="Company"
                    value={suggestionForm.company}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    onFocus={() => suggestionForm.company && setShowContactDropdown(true)}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    required
                  />
                  {showContactDropdown && contactOptions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      <div className="dropdown-header">Select a contact:</div>
                      {contactOptions.map((contact, idx) => (
                        <div
                          key={idx}
                          className="dropdown-item"
                          onClick={() => handleSelectContact(contact)}
                        >
                          <div className="dropdown-name">{contact.firstName} {contact.lastName}</div>
                          <div className="dropdown-details">{contact.title} • {contact.company}</div>
                          <div className="dropdown-score">{contact.matchScore}% match</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label>Industry</label>
                  <input
                    type="text"
                    placeholder="Industry"
                    value={suggestionForm.industry}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, industry: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>LinkedIn URL</label>
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={suggestionForm.linkedin_url}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, linkedin_url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Suggestion Reason</label>
                  <select
                    value={suggestionForm.suggestion_reason}
                    onChange={(e) =>
                      setSuggestionForm({ ...suggestionForm, suggestion_reason: e.target.value })
                    }
                  >
                    <option value="target_company_match">Target Company Match</option>
                    <option value="role_match">Role Match</option>
                    <option value="industry_leader">Industry Leader</option>
                    <option value="skill_match">Skill Match</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Match Score (0-100): {suggestionForm.match_score}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={suggestionForm.match_score}
                    onChange={(e) =>
                      setSuggestionForm({
                        ...suggestionForm,
                        match_score: parseInt(e.target.value)
                      })
                    }
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Add Contact
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSuggestionModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alumni Modal */}
      {showAlumniModal && (
        <div className="modal-overlay" onClick={() => { setShowAlumniModal(false); setEditingId(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Alumni Connection" : "Add Alumni Connection"}</h3>
            <form onSubmit={handleAddAlumni}>
              <div className="form-row">
                <div>
                  <label>First Name *</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={alumniForm.first_name}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={alumniForm.last_name}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={alumniForm.email}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="Title"
                    value={alumniForm.title}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, title: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Company</label>
                  <input
                    type="text"
                    placeholder="Company"
                    value={alumniForm.company}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, company: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Institution *</label>
                  <input
                    type="text"
                    placeholder="Institution"
                    value={alumniForm.education_institution}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, education_institution: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Graduation Year</label>
                  <input
                    type="number"
                    placeholder="Graduation Year"
                    value={alumniForm.graduation_year}
                    onChange={(e) =>
                      setAlumniForm({
                        ...alumniForm,
                        graduation_year: parseInt(e.target.value)
                      })
                    }
                  />
                </div>
                <div>
                  <label>Degree Type</label>
                  <input
                    type="text"
                    placeholder="Degree Type"
                    value={alumniForm.degree_type}
                    onChange={(e) =>
                      setAlumniForm({ ...alumniForm, degree_type: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  {editingId ? "Save Changes" : "Add Alumni"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAlumniModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Event Contact</h3>
            <form onSubmit={handleAddEvent}>
              <input
                type="text"
                placeholder="First Name *"
                value={eventForm.first_name}
                onChange={(e) =>
                  setEventForm({ ...eventForm, first_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={eventForm.last_name}
                onChange={(e) =>
                  setEventForm({ ...eventForm, last_name: e.target.value })
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={eventForm.email}
                onChange={(e) =>
                  setEventForm({ ...eventForm, email: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Title"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Company"
                value={eventForm.company}
                onChange={(e) =>
                  setEventForm({ ...eventForm, company: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Event Name *"
                value={eventForm.event_name}
                onChange={(e) =>
                  setEventForm({ ...eventForm, event_name: e.target.value })
                }
                required
              />
              <input
                type="date"
                value={eventForm.event_date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, event_date: e.target.value })
                }
              />
              <select
                value={eventForm.event_type}
                onChange={(e) =>
                  setEventForm({ ...eventForm, event_type: e.target.value })
                }
              >
                <option value="conference">Conference</option>
                <option value="webinar">Webinar</option>
                <option value="meetup">Meetup</option>
                <option value="summit">Summit</option>
                <option value="workshop">Workshop</option>
              </select>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={eventForm.is_speaker}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, is_speaker: e.target.checked })
                    }
                  />
                  This person is a speaker
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Add Event Contact
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outreach Modal */}
      {showOutreachModal && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowOutreachModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Send Outreach to {selectedContact.first_name} {selectedContact.last_name}</h3>
            <form onSubmit={handleSendOutreach}>
              <select
                value={outreachForm.outreach_template}
                onChange={(e) =>
                  setOutreachForm({ ...outreachForm, outreach_template: e.target.value })
                }
              >
                <option value="">Select a template...</option>
                <option value="warm_intro">Warm Introduction</option>
                <option value="speaker_thank_you">Thank You (Speaker)</option>
                <option value="alumni_connect">Alumni Connection</option>
                <option value="skill_learning">Skill Learning Request</option>
                <option value="mentorship">Mentorship Request</option>
              </select>
              <textarea
                placeholder="Custom message or select a template..."
                value={outreachForm.outreach_message}
                onChange={(e) =>
                  setOutreachForm({ ...outreachForm, outreach_message: e.target.value })
                }
                rows="6"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Send Outreach
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowOutreachModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connection Path Modal */}
      {showConnectionModal && (
        <div className="modal-overlay" onClick={() => setShowConnectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Connection Path</h3>
            <form onSubmit={handleAddConnection}>
              <input
                type="text"
                placeholder="Your mutual contact name *"
                value={connectionForm.mutual_contact_name}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, mutual_contact_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Target contact name *"
                value={connectionForm.target_contact_name}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, target_contact_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Target company *"
                value={connectionForm.target_company}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, target_company: e.target.value })
                }
                required
              />
              <label>
                Relationship Strength (1-5):
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={connectionForm.relationship_strength}
                  onChange={(e) =>
                    setConnectionForm({ ...connectionForm, relationship_strength: parseInt(e.target.value) })
                  }
                />
                <span>{connectionForm.relationship_strength}/5</span>
              </label>
              <textarea
                placeholder="Introduction message..."
                value={connectionForm.introduction_message}
                onChange={(e) =>
                  setConnectionForm({ ...connectionForm, introduction_message: e.target.value })
                }
                rows="4"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Add Connection
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowConnectionModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Connection Modal */}
      {showEditConnectionModal && (
        <div className="modal-overlay" onClick={() => setShowEditConnectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Connection Path</h3>
            <form onSubmit={handleSaveConnection}>
              <input
                type="text"
                placeholder="Your mutual contact name *"
                value={editConnectionForm.mutual_contact_name}
                onChange={(e) =>
                  setEditConnectionForm({ ...editConnectionForm, mutual_contact_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Target contact name *"
                value={editConnectionForm.target_contact_name}
                onChange={(e) =>
                  setEditConnectionForm({ ...editConnectionForm, target_contact_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Target company *"
                value={editConnectionForm.target_company}
                onChange={(e) =>
                  setEditConnectionForm({ ...editConnectionForm, target_company: e.target.value })
                }
                required
              />
              <label>
                Relationship Strength (1-5):
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={editConnectionForm.relationship_strength}
                  onChange={(e) =>
                    setEditConnectionForm({ ...editConnectionForm, relationship_strength: parseInt(e.target.value) })
                  }
                />
                <span>{editConnectionForm.relationship_strength}/5</span>
              </label>
              <textarea
                placeholder="Introduction message..."
                value={editConnectionForm.introduction_message}
                onChange={(e) =>
                  setEditConnectionForm({ ...editConnectionForm, introduction_message: e.target.value })
                }
                rows="4"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditConnectionModal(false)}
                >
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
            <h3>Set Relationship Reminder</h3>
            <form onSubmit={handleAddReminder}>
              <input
                type="text"
                placeholder="Contact name *"
                value={reminderForm.contact_name}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, contact_name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Company"
                value={reminderForm.contact_company}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, contact_company: e.target.value })
                }
              />
              <label>
                Reminder Type:
                <select
                  value={reminderForm.reminder_type}
                  onChange={(e) =>
                    setReminderForm({ ...reminderForm, reminder_type: e.target.value })
                  }
                >
                  <option value="check_in">Check In</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="congratulations">Congratulations</option>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Work Anniversary</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Reminder Date *:
                <input
                  type="date"
                  value={reminderForm.reminder_date}
                  onChange={(e) =>
                    setReminderForm({ ...reminderForm, reminder_date: e.target.value })
                  }
                  required
                />
              </label>
              <textarea
                placeholder="Custom message or notes..."
                value={reminderForm.custom_message}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, custom_message: e.target.value })
                }
                rows="4"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Set Reminder
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReminderModal(false)}
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
}
