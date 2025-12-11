// frontend/src/pages/CoverLetter.jsx
// Clean, modern Cover Letter Builder

import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";
import FileUpload from "../components/FileUpload";
import "./coverLetter.css";

export default function CoverLetter() {
  // Template Library State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateAnalytics, setTemplateAnalytics] = useState({
    totalTemplates: 0,
    totalViews: 0,
    totalUses: 0,
  });

  // AI Generation State
  const [aiForm, setAiForm] = useState({
    userName: "",
    targetRole: "",
    company: "",
    jobDescription: "",
    achievements: "",
  });
  const [aiLetter, setAiLetter] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobs, setJobs] = useState([]);

  // Company Research
  const [companyResearch, setCompanyResearch] = useState(null);

  // Tone & Style
  const [toneSettings, setToneSettings] = useState({
    tone: "formal",
    style: "direct",
    length: "standard",
    culture: "corporate",
    industry: "",
    personality: "balanced",
    customInstructions: "",
  });

  // Experience Analysis
  const [expAnalysis, setExpAnalysis] = useState(null);
  const [showExpAnalysis, setShowExpAnalysis] = useState(false);

  // Editor State
  const [editorContent, setEditorContent] = useState("");
  const [editorStats, setEditorStats] = useState({ words: 0, chars: 0 });
  const [assistData, setAssistData] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const editorRef = useRef(null);

  // Saved Letters
  const [savedLetters, setSavedLetters] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState("generate"); // 'generate' or 'template'

  function getUserIdFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.user_id || payload.id || null;
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    loadTemplates();
    loadJobs();
    loadSavedLetters();
    
    const draftHtml = localStorage.getItem("cl_editor_draft");
    if (draftHtml && editorRef.current) {
      setEditorContent(draftHtml);
      updateEditorStats(draftHtml);
      editorRef.current.innerHTML = draftHtml;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && editorContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = editorContent;
    }
  }, [editorContent]);

  // Autosave
  useEffect(() => {
    if (!editorContent) return;
    setAutosaveStatus("Saving...");
    const id = setTimeout(() => {
      localStorage.setItem("cl_editor_draft", editorContent);
      setAutosaveStatus("Saved");
    }, 1000);
    return () => clearTimeout(id);
  }, [editorContent]);

  // Load Functions
  const loadTemplates = async () => {
    try {
      const { data } = await api.get("api/cover-letter/templates");
      const templatesData = data.templates || [];
      setTemplates(templatesData);

      let views = 0;
      let uses = 0;
      templatesData.forEach((t) => {
        views += t.view_count || 0;
        uses += t.use_count || 0;
      });

      setTemplateAnalytics({
        totalTemplates: templatesData.length,
        totalViews: views,
        totalUses: uses,
      });
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  };

  const loadJobs = async () => {
    try {
      const { data } = await api.get("/api/jobs");
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
  };

  const loadSavedLetters = async () => {
    const userId = getUserIdFromToken();
    if (!userId) return;
    try {
      const { data } = await api.get(`/api/cover-letter/saved/${userId}`);
      if (data.success) {
        setSavedLetters(data.letters || []);
      }
    } catch (err) {
      console.error("Error loading saved letters:", err);
    }
  };

  // Template Functions
  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setActiveTab("template");
    try {
      await api.post(`api/cover-letter/templates/${template.id}/track-view`);
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    
    // Just load template to editor - don't save yet
    const html = selectedTemplate.content.split('\n').map(line => 
      line.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    ).join('<br>');
    setEditorContent(html);
    updateEditorStats(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setActiveTab("editor");
  };

  // Job Selection
  const handleJobSelection = (jobId) => {
    setSelectedJobId(jobId);
    if (jobId) {
      const job = jobs.find((j) => j.id.toString() === jobId.toString());
      if (job) {
        setAiForm({
          userName: aiForm.userName,
          targetRole: job.title || "",
          company: job.company || "",
          jobDescription: job.description || "",
          achievements: aiForm.achievements,
        });
        if (job.industry) {
          setToneSettings({ ...toneSettings, industry: job.industry });
        }
      }
    }
  };

  // AI Generation
  const handleGenerateAI = async (e) => {
    e.preventDefault();
    setAiError("");
    setAiLetter("");
    setEditorContent("");
    setExpAnalysis(null);
    setAiLoading(true);
    setActiveTab("editor");

    try {
      const userId = getUserIdFromToken();
      
      // Fetch company research
      if (aiForm.company) {
        try {
          const researchRes = await api.get(`/api/company-research/${encodeURIComponent(aiForm.company)}`);
          setCompanyResearch(researchRes.data);
        } catch (err) {
          console.warn("Company research not available");
        }
      }

      const payload = {
        ...aiForm,
        userProfile: { id: userId },
        jobTitle: aiForm.targetRole,
        companyName: aiForm.company,
        companyResearch: companyResearch,
        ...toneSettings,
      };

      const { data } = await api.post("/api/cover-letter/generate", payload);
      const text = data?.content || data?.letter || "";

      if (!text) {
        throw new Error(data?.message || "No content generated");
      }

      const html = text.split('\n').map(line => 
        line.replace(/</g, "&lt;").replace(/>/g, "&gt;")
      ).join('<br>');

      setAiLetter(text);
      setEditorContent(html);
      updateEditorStats(html);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }

      if (data.expAnalysis) {
        setExpAnalysis(data.expAnalysis);
        setShowExpAnalysis(true);
      }
    } catch (err) {
      console.error("AI generation error:", err);
      setAiError(err.response?.data?.message || err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Editor Functions
  const htmlToPlainText = (html) => {
    if (!html) return "";
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  };

  const updateEditorStats = (html) => {
    const text = htmlToPlainText(html);
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    setEditorStats({ words, chars });
  };

  const handleEditorChange = (html) => {
    setEditorContent(html);
    updateEditorStats(html);
  };

  const applyFormat = (format) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const commands = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      bullet: "insertUnorderedList",
      number: "insertOrderedList",
      clear: "removeFormat",
    };
    document.execCommand(commands[format] || format, false, null);
  };

  const handleRefine = async () => {
    const plain = htmlToPlainText(editorContent);
    if (!plain.trim()) {
      setAssistError("Add content to refine");
      return;
    }

    try {
      setAssistLoading(true);
      setAssistError("");
      const { data } = await api.post("/api/cover-letter/refine", { text: plain });
      
      const improvedText = data.improved_text || plain;
      const html = improvedText.split('\n').map(line => 
        line.replace(/</g, "&lt;").replace(/>/g, "&gt;")
      ).join('<br>');
      
      setEditorContent(html);
      updateEditorStats(html);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
      setAssistData(data);
    } catch (err) {
      setAssistError(err.response?.data?.error || "Failed to refine");
    } finally {
      setAssistLoading(false);
    }
  };

  // Export
  const handleExport = async (format) => {
    const content = htmlToPlainText(editorContent);
    if (!content) return alert("No content to export");

    const payload = {
      content,
      jobTitle: aiForm.targetRole || "cover_letter",
      company: aiForm.company || "company",
    };

    try {
      let endpoint = "";
      if (format === "pdf") endpoint = "/api/cover-letter/export/pdf";
      else if (format === "docx") endpoint = "/api/cover-letter/export/docx";
      else if (format === "txt") endpoint = "/api/cover-letter/export/text";
      else return;

      const res = await api.post(endpoint, payload, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${aiForm.company || "cover_letter"}_${aiForm.targetRole || "letter"}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed");
    }
  };

  // Save
  const handleSaveLetter = async () => {
    const content = htmlToPlainText(editorContent);
    if (!content) return alert("No content to save");

    const userId = getUserIdFromToken();
    if (!userId) return alert("Not logged in");

    // Prompt user for cover letter name
    const defaultName = `${aiForm.company || "Company"} - ${aiForm.targetRole || "Role"}`;
    const coverLetterName = prompt("Enter a name for this cover letter:", defaultName);
    
    if (!coverLetterName || coverLetterName.trim() === "") {
      // User cancelled or entered empty name
      return;
    }

    try {
      await api.post("api/cover-letter/save-ai", {
        user_id: userId,
        title: coverLetterName.trim(),
        content,
      });
      alert("Cover letter saved!");
      loadSavedLetters();
    } catch (err) {
      alert("Failed to save");
    }
  };

  // Delete saved letter
  const handleDeleteLetter = async (letterId, letterName, e) => {
    e.stopPropagation(); // Prevent loading the letter when clicking delete
    
    if (!window.confirm(`Are you sure you want to delete "${letterName}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/cover-letter/saved/${letterId}`);
      alert("Cover letter deleted!");
      loadSavedLetters();
      
      // Clear editor if the deleted letter was being edited
      if (editorContent) {
        const currentContent = htmlToPlainText(editorContent);
        // Check if current content matches deleted letter (simple check)
        // This is a basic check - you might want to track which letter is currently open
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.error || "Failed to delete cover letter");
    }
  };

  return (
    <div className="cl-wrapper">
      <h1 className="cl-title">Cover Letter Builder</h1>
      <p className="cl-subtitle">Create professional, tailored cover letters with AI assistance</p>

      {/* Analytics */}
      <div className="cl-analytics-row">
        <div className="cl-analytics-card">
          <span>Total Templates</span>
          <strong>{templateAnalytics.totalTemplates}</strong>
        </div>
        <div className="cl-analytics-card">
          <span>Template Views</span>
          <strong>{templateAnalytics.totalViews}</strong>
        </div>
        <div className="cl-analytics-card">
          <span>Template Uses</span>
          <strong>{templateAnalytics.totalUses}</strong>
        </div>
      </div>

      <div className="cl-main-container">
        {/* Left Sidebar */}
        <div className="cl-sidebar">
          {/* Templates Section */}
          <div className="cl-section-card">
            <h3>Templates</h3>
            <p className="cl-sub">Choose a template to start</p>
            <ul className="cl-template-list">
              {templates.map((tpl) => (
                <li
                  key={tpl.id}
                  className={`cl-template-item ${selectedTemplate?.id === tpl.id ? "cl-template-item-active" : ""}`}
                  onClick={() => handleSelectTemplate(tpl)}
                >
                  <div className="cl-template-header">
                    <div>
                      <div className="cl-template-name">{tpl.name}</div>
                      <div className="cl-template-industry">{tpl.industry}</div>
                    </div>
                  </div>
                  <div className="cl-template-tags">
                    <span className="cl-tag">{tpl.category}</span>
                    {tpl.is_custom && <span className="cl-tag custom">Custom</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Saved Letters */}
          <div className="cl-section-card">
            <h3>Saved Letters</h3>
            <ul className="cl-saved-list">
              {savedLetters.length === 0 ? (
                <li style={{ color: "#64748b", fontSize: "13px" }}>No saved letters yet</li>
              ) : (
                savedLetters.map((letter) => (
                  <li
                    key={letter.id}
                    className="cl-saved-item"
                  >
                    <div
                      style={{ flex: 1, cursor: "pointer" }}
                      onClick={() => {
                        const html = letter.content.split('\n').map(line => 
                          line.replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        ).join('<br>');
                        setEditorContent(html);
                        updateEditorStats(html);
                        if (editorRef.current) {
                          editorRef.current.innerHTML = html;
                        }
                        setActiveTab("editor");
                      }}
                    >
                      {letter.name}
                    </div>
                    <button
                      className="cl-btn-delete-icon"
                      onClick={(e) => handleDeleteLetter(letter.id, letter.name, e)}
                      title="Delete this cover letter"
                    >
                      🗑️
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Upload */}
          <div className="cl-section-card">
            <button
              className="cl-btn-secondary cl-upload-toggle"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? "✕ Cancel Upload" : "⬆️ Upload Cover Letter"}
            </button>
            {showUpload && (
              <div className="cl-upload-section">
                <FileUpload
                  type="cover-letter"
                  onUploadSuccess={() => {
                    setShowUpload(false);
                    loadSavedLetters();
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="cl-main-content">
          {/* Template Preview */}
          {activeTab === "template" && selectedTemplate && (
            <div className="cl-content-card">
              <h2>{selectedTemplate.name}</h2>
              <div style={{ marginBottom: "16px", color: "#64748b", fontSize: "14px" }}>
                <strong>Industry:</strong> {selectedTemplate.industry} • <strong>Style:</strong> {selectedTemplate.category}
              </div>
              <div className="cl-preview-box">{selectedTemplate.content}</div>
              <button className="cl-btn-primary" onClick={handleUseTemplate} style={{ marginTop: "16px" }}>
                Use This Template
              </button>
            </div>
          )}

          {/* Editor */}
          {(activeTab === "editor" || editorContent) && (
            <div className="cl-content-card">
              <div className="cl-editor-header">
                <h2>Cover Letter Editor</h2>
                <div className="cl-editor-stats">
                  <span>Words: {editorStats.words}</span>
                  <span>Characters: {editorStats.chars}</span>
                  <span>{autosaveStatus || "Idle"}</span>
                </div>
              </div>

              <div className="cl-editor-section">
                <div className="cl-editor-toolbar">
                  <button onClick={() => applyFormat("bold")}><b>B</b></button>
                  <button onClick={() => applyFormat("italic")}><i>I</i></button>
                  <button onClick={() => applyFormat("underline")}><u>U</u></button>
                  <button onClick={() => applyFormat("bullet")}>• List</button>
                  <button onClick={() => applyFormat("number")}>1. List</button>
                  <button onClick={() => applyFormat("clear")}>Clear Format</button>
                </div>

                <div
                  ref={editorRef}
                  className="cl-editor-area"
                  contentEditable
                  onInput={(e) => handleEditorChange(e.currentTarget.innerHTML)}
                />

                <div className="cl-editor-actions">
                  <button className="cl-btn-primary" onClick={handleRefine} disabled={assistLoading}>
                    {assistLoading ? "Refining..." : "✨ Refine with AI"}
                  </button>
                  <button className="cl-btn-success" onClick={handleSaveLetter}>
                    💾 Save Letter
                  </button>
                  {assistError && <div className="cl-error">{assistError}</div>}
                </div>

                {/* Export Section */}
                <div className="cl-export-section">
                  <span style={{ fontWeight: 600, color: "#475569" }}>Export:</span>
                  <button className="cl-btn-secondary cl-btn-sm" onClick={() => handleExport("pdf")}>
                    📄 PDF
                  </button>
                  <button className="cl-btn-secondary cl-btn-sm" onClick={() => handleExport("docx")}>
                    📝 DOCX
                  </button>
                  <button className="cl-btn-secondary cl-btn-sm" onClick={() => handleExport("txt")}>
                    📋 TXT
                  </button>
                </div>
              </div>

              {/* Experience Analysis */}
              {expAnalysis && showExpAnalysis && (
                <div className="cl-exp-analysis">
                  <h3 onClick={() => setShowExpAnalysis(!showExpAnalysis)}>
                    ⭐ Experience Analysis {showExpAnalysis ? "▲" : "▼"}
                  </h3>
                  {showExpAnalysis && (
                    <div className="cl-exp-analysis-content">
                      {expAnalysis.summaryNarrative && <p>{expAnalysis.summaryNarrative}</p>}
                      {expAnalysis.topExperiences?.length > 0 && (
                        <>
                          <h4>Top Relevant Experiences</h4>
                          <ul>
                            {expAnalysis.topExperiences.map((exp, i) => (
                              <li key={i}>{exp}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Generator */}
          <div className="cl-content-card">
            <h2>AI Cover Letter Generator</h2>

            {/* Job Selector */}
            <div className="cl-job-selector">
              <label>📋 Select Job from Pipeline (Optional)</label>
              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelection(e.target.value)}
              >
                <option value="">-- Select a Job to Pre-fill Form --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} @ {job.company} ({job.status})
                  </option>
                ))}
              </select>
              {selectedJobId && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#059669" }}>
                  ✓ Job details pre-filled below
                </p>
              )}
            </div>

            <form onSubmit={handleGenerateAI} className="cl-form">
              <label>
                Your Name
                <input
                  type="text"
                  value={aiForm.userName}
                  onChange={(e) => setAiForm({ ...aiForm, userName: e.target.value })}
                  placeholder="John Doe"
                />
              </label>

              <label>
                Target Role *
                <input
                  type="text"
                  value={aiForm.targetRole}
                  onChange={(e) => setAiForm({ ...aiForm, targetRole: e.target.value })}
                  required
                  placeholder="Software Engineer"
                />
              </label>

              <label>
                Company *
                <input
                  type="text"
                  value={aiForm.company}
                  onChange={(e) => setAiForm({ ...aiForm, company: e.target.value })}
                  required
                  placeholder="Google"
                />
              </label>

              <label>
                Job Description
                <textarea
                  rows="4"
                  value={aiForm.jobDescription}
                  onChange={(e) => setAiForm({ ...aiForm, jobDescription: e.target.value })}
                  placeholder="Paste the job description here..."
                />
              </label>

              <label>
                Key Achievements
                <textarea
                  rows="3"
                  value={aiForm.achievements}
                  onChange={(e) => setAiForm({ ...aiForm, achievements: e.target.value })}
                  placeholder="List your relevant achievements and accomplishments..."
                />
              </label>

              {/* Tone & Style Settings */}
              <div className="cl-tone-panel">
                <h3>⚙️ Tone & Style Settings</h3>
                <div className="cl-form" style={{ gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label>
                      Tone
                      <select
                        value={toneSettings.tone}
                        onChange={(e) => setToneSettings({ ...toneSettings, tone: e.target.value })}
                      >
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="analytical">Analytical</option>
                      </select>
                    </label>

                    <label>
                      Style
                      <select
                        value={toneSettings.style}
                        onChange={(e) => setToneSettings({ ...toneSettings, style: e.target.value })}
                      >
                        <option value="direct">Direct</option>
                        <option value="narrative">Narrative</option>
                        <option value="bullet">Bullet Points</option>
                      </select>
                    </label>

                    <label>
                      Length
                      <select
                        value={toneSettings.length}
                        onChange={(e) => setToneSettings({ ...toneSettings, length: e.target.value })}
                      >
                        <option value="brief">Brief</option>
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </label>

                    <label>
                      Culture
                      <select
                        value={toneSettings.culture}
                        onChange={(e) => setToneSettings({ ...toneSettings, culture: e.target.value })}
                      >
                        <option value="corporate">Corporate</option>
                        <option value="startup">Startup</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Industry
                    <input
                      type="text"
                      value={toneSettings.industry}
                      onChange={(e) => setToneSettings({ ...toneSettings, industry: e.target.value })}
                      placeholder="e.g., Technology, Finance"
                    />
                  </label>
                </div>
              </div>

              <button type="submit" className="cl-btn-primary" disabled={aiLoading} style={{ width: "100%", padding: "12px" }}>
                {aiLoading ? (
                  <span className="cl-loading">Generating Cover Letter...</span>
                ) : (
                  "🚀 Generate AI Cover Letter"
                )}
              </button>

              {aiError && <div className="cl-error">{aiError}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
