import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./FollowUpTemplates.css";

export default function FollowUpTemplates() {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  const [roleMap, setRoleMap] = useState({});
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Generator form state
  const [generatorForm, setGeneratorForm] = useState({
    templateType: "thank_you",
    interviewerName: "",
    interviewerTitle: "",
    interviewerEmail: "",
    interviewDate: "",
    conversationHighlights: ["", "", ""]
  });

  // Email and editing state
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const userId = getUserId();

  /* ============================================================
     Load companies from jobs
  ============================================================ */
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/jobs");
        const jobs = res.data.jobs || [];

        const uniqueCompanies = [...new Set(jobs.map((j) => j.company))];
        setCompanies(uniqueCompanies);

        const roleMapTemp = {};
        jobs.forEach((job) => {
          if (!roleMapTemp[job.company]) roleMapTemp[job.company] = new Set();
          roleMapTemp[job.company].add(job.title);
        });

        const finalMap = {};
        Object.keys(roleMapTemp).forEach((company) => {
          finalMap[company] = [...roleMapTemp[company]];
        });

        setRoleMap(finalMap);

        // Check for company from URL query params (from Interview Tracker)
        const companyFromUrl = searchParams.get("company");
        if (companyFromUrl && uniqueCompanies.includes(companyFromUrl)) {
          setActiveCompany(companyFromUrl);
        } else if (uniqueCompanies.length > 0) {
          setActiveCompany(uniqueCompanies[0]);
        }
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, [searchParams]);

  /* ============================================================
     Load templates when company changes
  ============================================================ */
  useEffect(() => {
    if (!activeCompany) return;
    fetchTemplates();
    fetchStats();
  }, [activeCompany]);

  /* ============================================================
     Fetch templates
  ============================================================ */
  async function fetchTemplates() {
    try {
      setLoading(true);
      const res = await api.get("/api/interview-insights/follow-up/templates", {
        params: { userId, company: activeCompany }
      });
      setTemplates(res.data.data.templates || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Fetch statistics
  ============================================================ */
  async function fetchStats() {
    try {
      const res = await api.get("/api/interview-insights/follow-up/stats", {
        params: { userId }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  /* ============================================================
     Generate new template
  ============================================================ */
  async function generateTemplate() {
    const role = roleMap[activeCompany]?.[0] || "";
    
    try {
      setLoading(true);
      
      // Filter out empty conversation highlights
      const highlights = generatorForm.conversationHighlights.filter(h => h.trim());
      
      const res = await api.post("/api/interview-insights/follow-up/generate", {
        userId,
        company: activeCompany,
        role,
        templateType: generatorForm.templateType,
        interviewerName: generatorForm.interviewerName || null,
        interviewerTitle: generatorForm.interviewerTitle || null,
        interviewerEmail: generatorForm.interviewerEmail || null,
        interviewDate: generatorForm.interviewDate || null,
        conversationHighlights: highlights.length > 0 ? highlights : null
      });

      const newTemplate = res.data.data;
      setSelectedTemplate(newTemplate);
      
      // Initialize edited content with the generated template
      setEditedSubject(newTemplate.subject_line || "");
      setEditedContent(newTemplate.template_content || "");
      setInterviewerEmail(newTemplate.interviewer_email || generatorForm.interviewerEmail || "");
      setIsEditing(false);
      
      setShowGenerator(false);
      await fetchTemplates();
      await fetchStats();
      
      // Reset form
      setGeneratorForm({
        templateType: "thank_you",
        interviewerName: "",
        interviewerTitle: "",
        interviewerEmail: "",
        interviewDate: "",
        conversationHighlights: ["", "", ""]
      });
    } catch (err) {
      console.error("Error generating template:", err);
      alert("Failed to generate template. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Mark template as sent
  ============================================================ */
  async function markAsSent(templateId) {
    try {
      await api.put(`/api/interview-insights/follow-up/${templateId}/mark-sent`, {
        userId
      });
      await fetchTemplates();
      await fetchStats();
      
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(prev => ({ ...prev, is_sent: true, sent_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error("Error marking as sent:", err);
      alert("Failed to mark as sent. Please try again.");
    }
  }

  /* ============================================================
     Track response
  ============================================================ */
  async function trackResponse(templateId, responseType) {
    try {
      await api.put(`/api/interview-insights/follow-up/${templateId}/track-response`, {
        userId,
        responseReceived: true,
        responseType
      });
      await fetchTemplates();
      await fetchStats();
      
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(prev => ({ 
          ...prev, 
          response_received: true, 
          response_type: responseType,
          response_date: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error("Error tracking response:", err);
      alert("Failed to track response. Please try again.");
    }
  }

  /* ============================================================
     Delete template
  ============================================================ */
  async function deleteTemplate(templateId) {
    if (!window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/api/interview-insights/follow-up/${templateId}`, {
        params: { userId }
      });
      
      // Close the template view if we're viewing the deleted template
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
      }
      
      await fetchTemplates();
      await fetchStats();
      
      alert("✅ Template deleted successfully!");
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Failed to delete template. Please try again.");
    }
  }

  /* ============================================================
     Send Email
  ============================================================ */
  async function sendEmail(templateId, fromCard = false) {
    // Validate email
    const emailToUse = fromCard ? interviewerEmail : (interviewerEmail || selectedTemplate?.interviewer_email);
    
    if (!emailToUse || !emailToUse.trim()) {
      alert("⚠️ Please enter the interviewer's email address before sending.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      alert("⚠️ Please enter a valid email address.");
      return;
    }

    if (!window.confirm(`Send this follow-up email to ${emailToUse}?`)) {
      return;
    }

    try {
      setSendingEmail(true);
      
      // Always use the current edited content (which may have been saved)
      // The backend will use editedSubject/editedContent if provided, otherwise fall back to template
      const response = await api.post(
        `/api/interview-insights/follow-up/${templateId}/send-email`,
        {
          userId,
          interviewerEmail: emailToUse,
          editedSubject: editedSubject || selectedTemplate?.subject_line,
          editedContent: editedContent || selectedTemplate?.template_content,
          userEmail: localStorage.getItem("userEmail") || undefined,
          userName: localStorage.getItem("userName") || undefined
        }
      );

      if (response.data.success) {
        alert("✅ Email sent successfully!");
        
        // Update local state immediately to lock the template
        if (selectedTemplate && selectedTemplate.id === templateId) {
          setSelectedTemplate(prev => ({ 
            ...prev, 
            is_sent: true, 
            sent_at: new Date().toISOString(),
            interviewer_email: emailToUse
          }));
        }
        
        // Force preview mode after sending
        setIsEditing(false);
        
        // Refresh data from server
        await fetchTemplates();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error sending email:", err);
      const errorData = err.response?.data;
      
      // Special handling for test mode restriction
      if (errorData?.testMode) {
        alert(`⚠️ Test Mode Restriction\n\n${errorData.message}\n\nFor testing, please enter your own email address (${errorData.userEmail || 'the one you registered with'}) in the email field.`);
      } else {
        const errorMsg = errorData?.message || "Failed to send email. Please try again.";
        alert(`❌ ${errorMsg}`);
      }
    } finally {
      setSendingEmail(false);
    }
  }

  /* ============================================================
     Update interviewer email
  ============================================================ */
  async function updateInterviewerEmail(templateId, email) {
    try {
      await api.put(
        `/api/interview-insights/follow-up/${templateId}/update-email`,
        {
          userId,
          interviewerEmail: email
        }
      );
      
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(prev => ({ ...prev, interviewer_email: email }));
      }
      
      await fetchTemplates();
    } catch (err) {
      console.error("Error updating email:", err);
    }
  }

  /* ============================================================
     Save template edits
  ============================================================ */
  async function saveTemplateEdits(templateId) {
    if (!editedSubject.trim() || !editedContent.trim()) {
      alert("⚠️ Subject and content cannot be empty.");
      return;
    }

    try {
      setSavingTemplate(true);
      const response = await api.put(
        `/api/interview-insights/follow-up/${templateId}/save`,
        {
          userId,
          subject_line: editedSubject,
          template_content: editedContent
        }
      );

      if (response.data.success) {
        // Update the selected template with saved content
        if (selectedTemplate && selectedTemplate.id === templateId) {
          setSelectedTemplate(prev => ({
            ...prev,
            subject_line: editedSubject,
            template_content: editedContent
          }));
        }
        
        // Refresh templates list to get updated content
        await fetchTemplates();
        
        alert("✅ Template saved successfully!");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      alert("❌ Failed to save template. Please try again.");
    } finally {
      setSavingTemplate(false);
    }
  }

  /* ============================================================
     Handle template selection
  ============================================================ */
  function handleTemplateSelect(template) {
    setSelectedTemplate(template);
    setInterviewerEmail(template.interviewer_email || "");
    // Load saved content from template (which includes any previous edits)
    setEditedSubject(template.subject_line || "");
    setEditedContent(template.template_content || "");
    // Force preview mode if template is already sent
    setIsEditing(false);
  }

  /* ============================================================
     Helper functions
  ============================================================ */
  function getTemplateTypeLabel(type) {
    const labels = {
      thank_you: "Thank You",
      status_inquiry: "Status Inquiry",
      feedback_request: "Feedback Request",
      networking: "Networking"
    };
    return labels[type] || type;
  }

  function getTemplateTypeIcon(type) {
    const icons = {
      thank_you: "🙏",
      status_inquiry: "⏰",
      feedback_request: "📝",
      networking: "🤝"
    };
    return icons[type] || "📧";
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  }

  return (
    <div className="follow-up-container">
      {/* Company Selection */}
      <div className="company-section">
        <h2>Select Company</h2>
        <div className="company-buttons">
          {companies.map((company) => (
            <button
              key={company}
              className={`company-btn ${activeCompany === company ? "active" : ""}`}
              onClick={() => setActiveCompany(company)}
            >
              {company}
            </button>
          ))}
        </div>
      </div>

      {activeCompany && (
        <>
          {/* Statistics Dashboard */}
          {stats && (
            <div className="stats-dashboard">
              <div className="stat-card">
                <div className="stat-number">{stats.totalTemplates}</div>
                <div className="stat-label">Templates Created</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.sentTemplates}</div>
                <div className="stat-label">Emails Sent</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.responsesReceived}</div>
                <div className="stat-label">Responses Received</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.responseRate}%</div>
                <div className="stat-label">Response Rate</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="generate-btn"
              onClick={() => setShowGenerator(!showGenerator)}
            >
              {showGenerator ? "✖ Cancel" : "✨ Generate New Template"}
            </button>
          </div>

          {/* Template Generator Form */}
          {showGenerator && (
            <div className="generator-form">
              <h3>Generate Follow-Up Template</h3>
              
              <div className="form-group">
                <label>Template Type</label>
                <select
                  value={generatorForm.templateType}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, templateType: e.target.value }))}
                >
                  <option value="thank_you">🙏 Thank You (24-48 hrs after)</option>
                  <option value="status_inquiry">⏰ Status Inquiry (1-2 weeks after)</option>
                  <option value="feedback_request">📝 Feedback Request (after rejection)</option>
                  <option value="networking">🤝 Networking (maintain relationship)</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Interviewer Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Sarah Johnson"
                    value={generatorForm.interviewerName}
                    onChange={(e) => setGeneratorForm(prev => ({ ...prev, interviewerName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Interviewer Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Senior Engineering Manager"
                    value={generatorForm.interviewerTitle}
                    onChange={(e) => setGeneratorForm(prev => ({ ...prev, interviewerTitle: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Interviewer Email (Optional - can add later)</label>
                <input
                  type="email"
                  placeholder="e.g., sarah.johnson@company.com"
                  value={generatorForm.interviewerEmail}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                />
                <p className="form-helper">You can send the email directly from the template view.</p>
              </div>

              <div className="form-group">
                <label>Interview Date (Optional)</label>
                <input
                  type="date"
                  value={generatorForm.interviewDate}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, interviewDate: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Key Conversation Points (Optional)</label>
                <p className="form-helper">What did you discuss? This personalizes the template.</p>
                {generatorForm.conversationHighlights.map((highlight, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Point ${i + 1}: e.g., Discussed microservices architecture`}
                    value={highlight}
                    onChange={(e) => {
                      const newHighlights = [...generatorForm.conversationHighlights];
                      newHighlights[i] = e.target.value;
                      setGeneratorForm(prev => ({ ...prev, conversationHighlights: newHighlights }));
                    }}
                    style={{ marginBottom: '8px' }}
                  />
                ))}
              </div>

              <button 
                className="submit-btn"
                onClick={generateTemplate}
                disabled={loading}
              >
                {loading ? "Generating..." : "✨ Generate Template"}
              </button>
            </div>
          )}

          {/* Selected Template View */}
          {selectedTemplate && !showGenerator && (
            <div className="template-view">
              {/* Back Button */}
              <button 
                className="back-to-list-btn"
                onClick={() => setSelectedTemplate(null)}
              >
                ← Back to Templates
              </button>

              <div className="template-header">
                <div className="template-type-badge">
                  {getTemplateTypeIcon(selectedTemplate.template_type)} {getTemplateTypeLabel(selectedTemplate.template_type)}
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedTemplate(null)}
                >
                  ✖
                </button>
              </div>

              {/* Email Input Section */}
              <div className="email-section">
                <label>
                  📧 Interviewer Email Address
                </label>
                
                <input
                  type="email"
                  placeholder="interviewer@company.com"
                  value={interviewerEmail}
                  onChange={(e) => setInterviewerEmail(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== selectedTemplate.interviewer_email) {
                      updateInterviewerEmail(selectedTemplate.id, e.target.value);
                    }
                  }}
                  disabled={selectedTemplate.is_sent}
                  style={{ width: "100%", marginBottom: "12px" }}
                />
                
                {selectedTemplate.is_sent ? (
                  <div style={{ 
                    color: "#10b981", 
                    fontSize: "16px", 
                    fontWeight: "700",
                    marginTop: "4px"
                  }}>
                    ✅ Sent
                  </div>
                ) : (
                  <button 
                    className="send-email-btn"
                    onClick={() => sendEmail(selectedTemplate.id)}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? "📤 Sending..." : "📧 Send Email"}
                  </button>
                )}
                
                {!interviewerEmail && !selectedTemplate.is_sent && (
                  <p style={{ 
                    color: "#dc3545", 
                    fontSize: "13px", 
                    marginTop: "8px",
                    marginBottom: 0
                  }}>
                    ⚠️ Email address required to send
                  </p>
                )}
              </div>

              <div className="template-timing">
                <div className="timing-item">
                  <strong>📅 Suggested Send Date:</strong> {selectedTemplate.suggested_send_date}
                </div>
                <div className="timing-item">
                  <strong>⏰ Best Time:</strong> {selectedTemplate.suggested_send_time}
                </div>
                {selectedTemplate.timingReasoning && (
                  <div className="timing-reasoning">{selectedTemplate.timingReasoning}</div>
                )}
              </div>

              {/* Edit Mode Toggle and Save Button */}
              {!selectedTemplate.is_sent && (
                <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    {isEditing && (
                      <button 
                        onClick={() => saveTemplateEdits(selectedTemplate.id)}
                        disabled={savingTemplate}
                        style={{
                          padding: "8px 16px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: savingTemplate ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          opacity: savingTemplate ? 0.6 : 1
                        }}
                      >
                        {savingTemplate ? "💾 Saving..." : "💾 Save Template"}
                      </button>
                    )}
                  </div>
                  <div>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      style={{
                        padding: "8px 16px",
                        background: isEditing ? "#ffc107" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      {isEditing ? "📝 Preview Mode" : "✏️ Edit Mode"}
                    </button>
                  </div>
                </div>
              )}
              
              {selectedTemplate.is_sent && (
                <div className="email-sent-banner">
                  ✅ Email Sent - Template is now locked
                </div>
              )}

              <div className="template-content">
                {isEditing && !selectedTemplate.is_sent ? (
                  <>
                    <div className="subject-line" style={{ marginBottom: "20px" }}>
                      <strong>Subject:</strong>
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginTop: "8px",
                          border: "1px solid #ced4da",
                          borderRadius: "5px",
                          fontSize: "14px"
                        }}
                      />
                    </div>

                    <div className="email-body">
                      <strong>Email Body:</strong>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={15}
                        style={{
                          width: "100%",
                          padding: "12px",
                          marginTop: "8px",
                          border: "1px solid #ced4da",
                          borderRadius: "5px",
                          fontSize: "14px",
                          fontFamily: "monospace",
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="subject-line">
                      <strong>Subject:</strong> {editedSubject}
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(editedSubject)}
                      >
                        📋 Copy
                      </button>
                    </div>

                    <div className="email-body">
                      <pre>{editedContent}</pre>
                      <button 
                        className="copy-btn-large"
                        onClick={() => copyToClipboard(editedContent)}
                      >
                        📋 Copy Email Body
                      </button>
                    </div>
                  </>
                )}
              </div>

              {selectedTemplate.personalizationTips && (
                <div className="tips-section">
                  <h4>💡 Personalization Tips</h4>
                  <ul>
                    {selectedTemplate.personalizationTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="dos-donts">
                {selectedTemplate.dosList && (
                  <div className="dos">
                    <h4>✅ Do:</h4>
                    <ul>
                      {selectedTemplate.dosList.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedTemplate.dontsList && (
                  <div className="donts">
                    <h4>❌ Don't:</h4>
                    <ul>
                      {selectedTemplate.dontsList.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="template-actions">
                {!selectedTemplate.is_sent ? (
                  <button 
                    className="mark-sent-btn"
                    onClick={() => markAsSent(selectedTemplate.id)}
                  >
                    ✉️ Mark as Sent
                  </button>
                ) : (
                  <div className="sent-status">
                    ✅ Sent on {new Date(selectedTemplate.sent_at).toLocaleDateString()}
                  </div>
                )}

                {selectedTemplate.is_sent && !selectedTemplate.response_received && (
                  <div className="response-tracking">
                    <p>Did you receive a response?</p>
                    <div className="response-buttons">
                      <button onClick={() => trackResponse(selectedTemplate.id, 'positive')}>
                        😊 Positive
                      </button>
                      <button onClick={() => trackResponse(selectedTemplate.id, 'neutral')}>
                        😐 Neutral
                      </button>
                      <button onClick={() => trackResponse(selectedTemplate.id, 'negative')}>
                        😞 Negative
                      </button>
                      <button onClick={() => trackResponse(selectedTemplate.id, 'no_response')}>
                        🤷 No Response
                      </button>
                    </div>
                  </div>
                )}

                {selectedTemplate.response_received && (
                  <div className="response-status">
                    📬 Response tracked: {selectedTemplate.response_type} on {new Date(selectedTemplate.response_date).toLocaleDateString()}
                  </div>
                )}

                {/* Delete Button in Template View */}
                <button 
                  className="delete-btn"
                  onClick={() => deleteTemplate(selectedTemplate.id)}
                  style={{ 
                    backgroundColor: '#dc3545', 
                    color: 'white',
                    marginTop: '15px',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  🗑️ Delete Template
                </button>
              </div>
            </div>
          )}

          {/* Templates List */}
          {!selectedTemplate && !showGenerator && (
            <div className="templates-list">
              <h3>Your Follow-Up Templates</h3>
              {loading ? (
                <div className="loading">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="empty-state">
                  <p>No templates yet for {activeCompany}</p>
                  <p>Click "Generate New Template" to create one!</p>
                </div>
              ) : (
                <div className="templates-grid">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className="template-card"
                      style={{ position: 'relative' }}
                    >
                      {/* Delete Button on Card */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          right: '10px', 
                          background: 'rgba(220, 53, 69, 0.1)', 
                          border: '1px solid rgba(220, 53, 69, 0.3)', 
                          borderRadius: '4px',
                          cursor: 'pointer', 
                          fontSize: '18px',
                          zIndex: 10,
                          padding: '4px 8px',
                          opacity: 0.7,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                          e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                        }}
                        title="Delete template"
                      >
                        🗑️
                      </button>

                      <div onClick={() => handleTemplateSelect(template)}>
                        <div className="template-card-header">
                          <span className="template-icon">
                            {getTemplateTypeIcon(template.template_type)}
                          </span>
                          <span className="template-type">
                            {getTemplateTypeLabel(template.template_type)}
                          </span>
                        </div>
                        <div className="template-card-subject">
                          {template.subject_line}
                        </div>
                        <div className="template-card-meta">
                          <div>{template.role}</div>
                          <div>{new Date(template.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="template-card-status">
                          {template.is_sent ? (
                            <span className="status-sent">✉️ Sent</span>
                          ) : (
                            <span className="status-draft">📝 Draft</span>
                          )}
                          {template.response_received && (
                            <span className="status-response">📬 Response</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}