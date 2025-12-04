import React, { useState, useEffect } from "react";
import axios from "axios";
import "./RelationshipMaintenance.css";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE || "http://localhost:4000/api"}`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Predefined templates (outside component to avoid re-renders)
const PREDEFINED_TEMPLATES = {
  // CHECK IN Templates
  check_in_casual: {
    name: "Check In - Casual",
    category: "check_in",
    template: "Hi [Name], I hope you're doing well! I've been thinking about our previous conversation and would love to catch up. How are things going at [Company]? Would you have time for a quick coffee chat or call next week? Looking forward to reconnecting!"
  },
  check_in_professional: {
    name: "Check In - Professional",
    category: "check_in",
    template: "Dear [Name], I hope this message finds you well. It's been a while since we last spoke, and I would like to reconnect and learn about your recent projects at [Company]. I believe your insights on [Industry/Topic] would be valuable for my current work. Would you be available for a 30-minute call this month?"
  },
  check_in_value_first: {
    name: "Check In - Value First",
    category: "check_in",
    template: "Hi [Name], I came across an article about [Topic] that reminded me of our conversation about [Subject]. I thought you might find it interesting given your work in [Industry]. I'd love to hear your thoughts and catch up soon!"
  },

  // CONGRATULATIONS Templates
  congratulations_promotion: {
    name: "Congratulations - Promotion",
    category: "congratulations",
    template: "Congratulations, [Name]! I just heard about your promotion to [New Position] at [Company] - that's fantastic news! Your hard work and expertise have clearly paid off. I'd love to hear more about this exciting new role. Let's celebrate soon!"
  },
  congratulations_achievement: {
    name: "Congratulations - Achievement",
    category: "congratulations",
    template: "Amazing news about your achievement! [Name], your success with [Project/Initiative] is truly inspiring. This is a well-deserved recognition of your talent and dedication. I'd like to connect soon to hear more about what's next for you at [Company]."
  },
  congratulations_milestone: {
    name: "Congratulations - Work Anniversary",
    category: "congratulations",
    template: "It's your work anniversary! [Name], I wanted to take a moment to recognize your incredible contributions at [Company]. Your expertise and collaborative spirit have been invaluable. Here's to many more years of success together. Let's catch up soon!"
  },

  // BIRTHDAY Templates
  birthday_warm: {
    name: "Birthday - Warm",
    category: "birthday",
    template: "Happy Birthday, [Name]! 🎉 I hope you have an absolutely wonderful day filled with celebration and joy. You deserve all the best! Let's grab coffee or lunch soon so I can celebrate with you properly!"
  },
  birthday_professional: {
    name: "Birthday - Professional",
    category: "birthday",
    template: "Wishing you a Happy Birthday, [Name]! Thank you for being such a great colleague and friend. I hope you have a fantastic day surrounded by people you care about. Looking forward to connecting soon!"
  },
  birthday_networking: {
    name: "Birthday - Networking Angle",
    category: "birthday",
    template: "Happy Birthday, [Name]! 🎂 On your special day, I wanted to reach out and let you know how much I've valued our professional relationship. Let's celebrate and catch up over coffee - I'd love to hear about your latest projects at [Company]!"
  },

  // FOLLOW UP Templates
  follow_up_meeting: {
    name: "Follow Up - Post Meeting",
    category: "follow_up",
    template: "Hi [Name], Thank you for taking the time to meet with me last week. I really enjoyed our conversation about [Topic]. I'd like to follow up on the points we discussed and explore potential opportunities for collaboration. Would you be available for another brief call next week?"
  },
  follow_up_referral: {
    name: "Follow Up - Referral",
    category: "follow_up",
    template: "Hi [Name], I wanted to follow up on the referral you kindly provided to [Other Contact]. That introduction has been incredibly valuable, and I wanted to thank you for thinking of me. I'd love to return the favor - please let me know if there's anyone in my network I can introduce you to!"
  },
  follow_up_collaboration: {
    name: "Follow Up - Collaboration",
    category: "follow_up",
    template: "Hello [Name], Following up on our discussion about [Project/Initiative], I've been thinking about how we could collaborate more effectively. I believe there could be significant synergy between our teams at [Company]. Would you be interested in exploring this further?"
  },

  // INDUSTRY UPDATE Templates
  industry_update_article: {
    name: "Industry Update - Article Share",
    category: "industry_update",
    template: "Hi [Name], I came across this insightful article on [Topic] and immediately thought of you: [Article Link]. Given your expertise in [Industry], I'd love to get your perspective on this. What are your thoughts on the implications for [Company]? Let's discuss!"
  },
  industry_update_opportunity: {
    name: "Industry Update - Opportunity",
    category: "industry_update",
    template: "Hello [Name], I wanted to share an interesting development in [Industry Sector]. I see potential implications for [Company]'s work in [Specific Area]. Your insights have always been valuable - I'd love to get your take on this and discuss how it might impact your team's strategy."
  },
  industry_update_trend: {
    name: "Industry Update - Trend Analysis",
    category: "industry_update",
    template: "Hi [Name], With the recent shifts in [Industry Trend], I've been reflecting on our previous conversations about [Topic]. I believe this could create new opportunities for professionals like us. Would you be open to a brief call to discuss potential implications?"
  },

  // CUSTOM Templates
  custom_mentorship: {
    name: "Custom - Mentorship Request",
    category: "custom",
    template: "Hi [Name], I've always admired your journey at [Company] and the impact you've made in [Industry]. I'm currently working on [Project/Goal], and I would be incredibly grateful for your mentorship and guidance. Would you be willing to meet for coffee or a virtual call to discuss this?"
  },
  custom_skill_learning: {
    name: "Custom - Skill Learning",
    category: "custom",
    template: "Hello [Name], I've been impressed by your expertise in [Skill/Technology]. I'm currently looking to deepen my knowledge in this area and would love to learn from your experience. Would you have time for a brief conversation about your approach and recommendations?"
  },
  custom_network_expansion: {
    name: "Custom - Network Expansion",
    category: "custom",
    template: "Hi [Name], I'm expanding my network in [Industry] and working on projects related to [Topic]. Your background and insights at [Company] would be invaluable. I'd love to connect and discuss potential synergies. Are you open to a quick chat?"
  }
};

export default function RelationshipMaintenance() {
  const [activeTab, setActiveTab] = useState("reminders");
  const [reminders, setReminders] = useState([]);
  const [outreachData, setOutreachData] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditOutreachModal, setShowEditOutreachModal] = useState(false);
  const [editingOutreach, setEditingOutreach] = useState(null);
  const [editOutreachForm, setEditOutreachForm] = useState({
    contact_name: "",
    contact_company: "",
    outreach_message: "",
    outreach_status: "contacted"
  });

  const [reminderForm, setReminderForm] = useState({
    contact_name: "",
    contact_company: "",
    reminder_type: "check_in",
    reminder_date: "",
    custom_message: ""
  });

  // Template shuffle indices - one per category
  const [templateIndices, setTemplateIndices] = useState({
    check_in: 0,
    congratulations: 0,
    birthday: 0,
    follow_up: 0,
    industry_update: 0,
    custom: 0
  });

  const shuffleTemplate = (category, categoryTemplates) => {
    const nextIndex = (templateIndices[category] + 1) % categoryTemplates.length;
    setTemplateIndices({ ...templateIndices, [category]: nextIndex });
  };

  // Fetch reminders on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [remRes, outRes] = await Promise.all([
          api.get("/industry-contacts/reminders"),
          api.get("/industry-contacts/all-outreach")
        ]);
        setReminders(remRes.data.reminders || []);
        
        // Map outreach data from new unified endpoint
        const outreachList = (outRes.data.outreach || [])
          .map(o => ({
            id: o.id,
            contact_name: o.contact_name,
            contact_company: o.contact_company,
            contact_title: o.contact_title,
            outreach_message: o.message,
            outreach_date: o.date,
            outreach_status: o.status || "pending",
            source: o.source,
            type: o.type,
            mutual_contact: o.mutual_contact,
            relationship_strength: o.relationship_strength
          }));
        setOutreachData(outreachList);
        
        // Set templates on fetch - organize by category
        const templatesByCategory = {};
        Object.entries(PREDEFINED_TEMPLATES).forEach(([key, data]) => {
          const category = data.category;
          if (!templatesByCategory[category]) {
            templatesByCategory[category] = [];
          }
          templatesByCategory[category].push({
            id: key,
            template_name: data.name,
            template_type: category,
            template_text: data.template
          });
        });
        
        // Flatten for display
        const allTemplates = [];
        Object.values(templatesByCategory).forEach(templates => {
          allTemplates.push(...templates);
        });
        setTemplates(allTemplates);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load reminders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddReminder = async (e) => {
    e.preventDefault();

    if (!reminderForm.contact_name.trim() || !reminderForm.reminder_date) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const res = await api.post("/industry-contacts/reminders", reminderForm);
      setReminders([...reminders, res.data.reminder]);
      setReminderForm({
        contact_name: "",
        contact_company: "",
        reminder_type: "check_in",
        reminder_date: "",
        custom_message: ""
      });
      setShowReminderModal(false);
      setSuccessMessage("Reminder created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create reminder");
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm("Delete this reminder?")) return;

    try {
      await api.delete(`/industry-contacts/reminders/${reminderId}`);
      setReminders(reminders.filter(r => r.id !== reminderId));
      setSuccessMessage("Reminder deleted!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete reminder");
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      // Mark as completed by deleting (or we could add a completion endpoint)
      await api.delete(`/industry-contacts/reminders/${reminderId}`);
      setReminders(reminders.filter(r => r.id !== reminderId));
      setSuccessMessage("Reminder marked as completed!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete reminder");
    }
  };

  const handleEditOutreach = (outreach) => {
    setEditingOutreach(outreach);
    setEditOutreachForm({
      contact_name: outreach.contact_name || "",
      contact_company: outreach.contact_company || "",
      outreach_message: outreach.outreach_message || "",
      outreach_status: outreach.outreach_status || "contacted"
    });
    setShowEditOutreachModal(true);
  };

  const handleSaveOutreach = async (e) => {
    e.preventDefault();
    try {
      // Determine the correct endpoint based on outreach type/source
      let endpoint = "";
      let payload = {};
      
      // Split contact name for tables that use first_name/last_name
      const nameParts = editOutreachForm.contact_name.split(' ');
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(' ') || "";
      
      if (editingOutreach.type === "suggestion" || editingOutreach.source === "Suggestion") {
        endpoint = `/industry-contacts/suggestions/${editingOutreach.id}`;
        payload = {
          first_name: firstName,
          last_name: lastName,
          company: editOutreachForm.contact_company,
          action_notes: editOutreachForm.outreach_message,
          action_status: editOutreachForm.outreach_status
        };
      } else if (editingOutreach.type === "connection" || editingOutreach.source === "Warm Connection") {
        endpoint = `/industry-contacts/connection-paths/${editingOutreach.id}`;
        payload = {
          target_contact_name: editOutreachForm.contact_name,
          target_company: editOutreachForm.contact_company,
          outreach_message: editOutreachForm.outreach_message,
          outreach_status: editOutreachForm.outreach_status
        };
      } else if (editingOutreach.type === "alumni" || editingOutreach.source === "Alumni") {
        endpoint = `/industry-contacts/alumni/${editingOutreach.id}`;
        payload = {
          alumni_name: editOutreachForm.contact_name,
          alumni_company: editOutreachForm.contact_company,
          outreach_message: editOutreachForm.outreach_message,
          outreach_status: editOutreachForm.outreach_status
        };
      } else if (editingOutreach.type === "event" || editingOutreach.source === "Event Participant") {
        endpoint = `/industry-contacts/event-participants/${editingOutreach.id}`;
        payload = {
          speaker_name: editOutreachForm.contact_name,
          company_affiliation: editOutreachForm.contact_company,
          outreach_message: editOutreachForm.outreach_message,
          outreach_status: editOutreachForm.outreach_status
        };
      }

      if (endpoint) {
        await api.put(endpoint, payload);
        
        // Update local state
        setOutreachData(outreachData.map(o => 
          o.id === editingOutreach.id 
            ? { ...o, ...editOutreachForm }
            : o
        ));
        
        setShowEditOutreachModal(false);
        setEditingOutreach(null);
        setSuccessMessage("Outreach updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update outreach");
    }
  };

  const handleDeleteOutreach = async (outreach) => {
    if (!window.confirm("Delete this outreach record?")) return;

    try {
      let endpoint = "";
      
      if (outreach.type === "suggestion" || outreach.source === "Suggestion") {
        endpoint = `/industry-contacts/suggestions/${outreach.id}`;
      } else if (outreach.type === "connection" || outreach.source === "Warm Connection") {
        endpoint = `/industry-contacts/connection-paths/${outreach.id}`;
      } else if (outreach.type === "alumni" || outreach.source === "Alumni") {
        endpoint = `/industry-contacts/alumni/${outreach.id}`;
      } else if (outreach.type === "event" || outreach.source === "Event") {
        endpoint = `/industry-contacts/event-participants/${outreach.id}`;
      }

      if (endpoint) {
        await api.delete(endpoint);
        setOutreachData(outreachData.filter(o => o.id !== outreach.id));
        setSuccessMessage("Outreach deleted!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete outreach");
    }
  };

  const getReminderStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = reminders.filter(r => new Date(r.reminder_date) < today).length;
    const dueToday = reminders.filter(r => {
      const remDate = new Date(r.reminder_date);
      remDate.setHours(0, 0, 0, 0);
      return remDate.getTime() === today.getTime();
    }).length;
    const dueSoon = reminders.filter(r => {
      const remDate = new Date(r.reminder_date);
      const daysUntil = Math.ceil((remDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7;
    }).length;

    return { overdue, dueToday, dueSoon };
  };

  const stats = getReminderStats();

  return (
    <div className="relationship-maintenance">
      {/* Success/Error Messages */}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Header */}
      <div className="rm-header">
        <h2>💌 Relationship Maintenance</h2>
        <p>Stay connected with your professional network through automated reminders and personalized templates</p>
      </div>

      {/* Statistics */}
      <div className="rm-stats">
        <div className="stat-card">
          <span className="stat-number">{reminders.length}</span>
          <span className="stat-label">Total Reminders</span>
        </div>
        <div className="stat-card overdue">
          <span className="stat-number">{stats.overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-card urgent">
          <span className="stat-number">{stats.dueToday}</span>
          <span className="stat-label">Due Today</span>
        </div>
        <div className="stat-card soon">
          <span className="stat-number">{stats.dueSoon}</span>
          <span className="stat-label">Due Soon</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rm-tabs">
        <button
          className={`rm-tab-btn ${activeTab === "reminders" ? "active" : ""}`}
          onClick={() => setActiveTab("reminders")}
        >
          📋 Reminders
        </button>
        <button
          className={`rm-tab-btn ${activeTab === "outreach" ? "active" : ""}`}
          onClick={() => setActiveTab("outreach")}
        >
          📧 Outreach ({outreachData.length})
        </button>
        <button
          className={`rm-tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          📝 Templates
        </button>
      </div>

      {/* Tab Content */}
      <div className="rm-content">
        {/* Reminders Tab */}
        {activeTab === "reminders" && (
          <div className="rm-section">
            <div className="rm-section-header">
              <h3>📋 Relationship Reminders</h3>
              <button
                className="btn-primary"
                onClick={() => setShowReminderModal(true)}
              >
                + Add Reminder
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading reminders...</div>
            ) : reminders.length === 0 ? (
              <div className="empty-state">
                <p>No reminders set yet. Create your first reminder to stay in touch!</p>
              </div>
            ) : (
              <div className="reminders-list">
                {reminders.map((reminder) => {
                  const reminderDate = new Date(reminder.reminder_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysUntil = Math.ceil((reminderDate - today) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysUntil < 0;
                  const isDueToday = daysUntil === 0;
                  const isUrgent = daysUntil <= 3 && daysUntil >= 0;

                  return (
                    <div
                      key={reminder.id}
                      className={`reminder-card ${isOverdue ? "overdue" : ""} ${isUrgent ? "urgent" : ""}`}
                    >
                      <div className="reminder-header">
                        <div className="reminder-title">
                          <h4>{reminder.contact_name}</h4>
                          <span className="reminder-type">
                            {reminder.reminder_type.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <span className={`reminder-badge ${
                          isOverdue ? "overdue-badge" : isDueToday ? "today-badge" : isUrgent ? "urgent-badge" : "normal-badge"
                        }`}>
                          {isOverdue ? "⚠️ OVERDUE" : isDueToday ? "📅 TODAY" : isUrgent ? "🔔 DUE SOON" : `📅 ${daysUntil} days`}
                        </span>
                      </div>

                      <div className="reminder-details">
                        <p><strong>Company:</strong> {reminder.contact_company || "—"}</p>
                        <p><strong>Due:</strong> {reminderDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                        {reminder.custom_message && (
                          <p><strong>Note:</strong> {reminder.custom_message}</p>
                        )}
                      </div>

                      <div className="reminder-actions">
                        <button
                          className="btn-success"
                          onClick={() => handleCompleteReminder(reminder.id)}
                          title="Mark as completed"
                        >
                          ✅ Complete
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteReminder(reminder.id)}
                          title="Delete reminder"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Outreach Tab */}
        {activeTab === "outreach" && (
          <div className="rm-section">
            <div className="rm-section-header">
              <h3>📧 Outreach History</h3>
            </div>

            {loading ? (
              <div className="loading">Loading outreach data...</div>
            ) : outreachData.length === 0 ? (
              <div className="empty-state">
                <p>No outreach sent yet. Start reaching out from the Industry Contact Discovery page!</p>
              </div>
            ) : (
              <div className="outreach-list">
                {outreachData.map((outreach) => (
                  <div key={`${outreach.type}-${outreach.id}`} className="outreach-card">
                    <div className="outreach-header">
                      <div className="outreach-title">
                        <h4>{outreach.contact_name}</h4>
                        <span className="outreach-company">{outreach.contact_company}</span>
                      </div>
                      <span className={`outreach-badge ${outreach.outreach_status}`}>
                        {outreach.outreach_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="outreach-details">
                      {/* Industry Contact Information */}
                      <div className="contact-info-section">
                        {outreach.contact_title && (
                          <p><strong>Title:</strong> {outreach.contact_title}</p>
                        )}
                        {outreach.source && (
                          <p><strong>Source:</strong> {outreach.source}</p>
                        )}
                        {outreach.mutual_contact && (
                          <p><strong>Via:</strong> {outreach.mutual_contact}</p>
                        )}
                        {outreach.relationship_strength && (
                          <p><strong>Relationship:</strong> {outreach.relationship_strength}</p>
                        )}
                      </div>

                      {/* Outreach Details */}
                      {outreach.outreach_date && (
                        <p><strong>Date:</strong> {new Date(outreach.outreach_date).toLocaleDateString()}</p>
                      )}
                      {outreach.outreach_message && (
                        <div className="outreach-message">
                          <strong>Message:</strong>
                          <p>{outreach.outreach_message}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="outreach-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditOutreach(outreach)}
                        title="Edit outreach"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteOutreach(outreach)}
                        title="Delete outreach"
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

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="rm-section">
            <div className="rm-section-header">
              <h3>📝 Outreach Templates</h3>
            </div>

            <div className="templates-container">
              {templates.length > 0 ? (
                <div className="templates-single-grid">
                  {["check_in", "congratulations", "birthday", "follow_up", "industry_update", "custom"].map((category) => {
                    const categoryTemplates = templates.filter(t => t.template_type === category);
                    if (categoryTemplates.length === 0) return null;

                    const categoryLabel = {
                      check_in: "✅ Check In",
                      congratulations: "🎉 Congratulations",
                      birthday: "🎂 Birthday",
                      follow_up: "📧 Follow Up",
                      industry_update: "📰 Industry Update",
                      custom: "✨ Custom"
                    }[category];

                    const currentIndex = templateIndices[category] % categoryTemplates.length;
                    const currentTemplate = categoryTemplates[currentIndex];

                    return (
                      <div key={category} className="template-card-single">
                        <div className="template-card-header">
                          <span className="category-badge">{categoryLabel}</span>
                        </div>
                        <div className="template-card-title">
                          <h5>{currentTemplate.template_name}</h5>
                        </div>
                        <div className="template-card-content">
                          <p>{currentTemplate.template_text}</p>
                        </div>
                        <div className="template-card-actions">
                          {categoryTemplates.length > 1 && (
                            <button
                              className="btn-shuffle"
                              onClick={() => shuffleTemplate(category, categoryTemplates)}
                              title="Shuffle to next template"
                            >
                              🔀 Shuffle
                            </button>
                          )}
                          <button
                            className="btn-copy"
                            onClick={() => {
                              navigator.clipboard.writeText(currentTemplate.template_text);
                              setSuccessMessage(`"${currentTemplate.template_name}" copied to clipboard!`);
                              setTimeout(() => setSuccessMessage(""), 3000);
                            }}
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <p>Loading templates...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

      {/* Edit Outreach Modal */}
      {showEditOutreachModal && editingOutreach && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✏️ Edit Outreach</h3>
            <form onSubmit={handleSaveOutreach}>
              <div className="outreach-edit-info">
                <p><strong>Contact:</strong> {editingOutreach.contact_name}</p>
                <p><strong>Company:</strong> {editingOutreach.contact_company}</p>
                {editingOutreach.source && (
                  <p><strong>Source:</strong> {editingOutreach.source}</p>
                )}
              </div>
              <label>
                Status:
                <select
                  value={editOutreachForm.outreach_status}
                  onChange={(e) =>
                    setEditOutreachForm({ ...editOutreachForm, outreach_status: e.target.value })
                  }
                >
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="sent">Sent</option>
                  <option value="responded">Responded</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="connected">Connected</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <textarea
                placeholder="Outreach message..."
                value={editOutreachForm.outreach_message}
                onChange={(e) =>
                  setEditOutreachForm({ ...editOutreachForm, outreach_message: e.target.value })
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
                  onClick={() => {
                    setShowEditOutreachModal(false);
                    setEditingOutreach(null);
                  }}
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
