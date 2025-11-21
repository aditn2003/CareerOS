// frontend/src/pages/CoverLetter.jsx

import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";
import "./coverLetter.css";

export default function CoverLetter() {
  const [templates, setTemplates] = useState([]);
  const [savedLetters, setSavedLetters] = useState([]);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    category: "Formal",
    content: "",
  });

  const [analytics, setAnalytics] = useState({
    totalTemplates: 0,
    totalViews: 0,
    totalUses: 0,
  });

  // ============= AI FORM (Existing UC) =============
  const [aiForm, setAiForm] = useState({
    userName: "",
    targetRole: "",
    company: "",
    jobDescription: "",
    achievements: "",
    tone: "Professional",
    variation: "Standard",
  });

  const [aiLetter, setAiLetter] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // ⭐ UC-059 Experience Highlighting Analysis
  const [expAnalysis, setExpAnalysis] = useState(null);
  const [expOpen, setExpOpen] = useState(false);

  // UC-058 Tone & Style Settings
  const [tone, setTone] = useState("formal");
  const [styleType, setStyleType] = useState("direct");
  const [letterLength, setLetterLength] = useState("standard");
  const [culture, setCulture] = useState("corporate");
  const [industry, setIndustry] = useState("");
  const [personality, setPersonality] = useState("balanced");
  const [customToneInstructions, setCustomToneInstructions] = useState("");

  // Edit Saved Letter
  const [editingLetter, setEditingLetter] = useState(null);
  const [editContent, setEditContent] = useState("");

  // ============= UC-060 STATE (Editor & Assistance) =============
  // editorContent stores HTML (not plain text)
  const [editorContent, setEditorContent] = useState("");
  const [editorStats, setEditorStats] = useState({ words: 0, chars: 0 });
  const [assistData, setAssistData] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState("");
  const [history, setHistory] = useState([]);
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const editorRef = useRef(null);

  // ============= JWT Decode =============
  function getUserIdFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.user_id || payload.id || null;
    } catch (e) {
      console.error("JWT decode failed", e);
      return null;
    }
  }

  // ===== Helpers for HTML <-> plain text & stats =====
  const htmlToPlainText = (html) => {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+\n/g, "\n")
      .replace(/\n+/g, "\n")
      .trim();
  };

  const updateEditorStatsFromHtml = (html) => {
    const text = htmlToPlainText(html);
    if (!text) {
      setEditorStats({ words: 0, chars: 0 });
      return;
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    setEditorStats({ words, chars });
  };

  // Use when you already have HTML
  const setEditorFromHtml = (html) => {
    const safe = html || "";
    setEditorContent(safe);
    updateEditorStatsFromHtml(safe);
    if (editorRef.current) {
      editorRef.current.innerHTML = safe;
    }
  };

  // Use when you have plain text (AI output, saved letters)
  const setEditorFromPlain = (text) => {
    const safeText = text || "";
    // simple conversion: each newline => <br>
    const html = safeText
      .split("\n")
      .map((line) => line.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .join("<br>");
    setEditorFromHtml(html);
  };

  // ============= INITIAL LOAD =============
  useEffect(() => {
    fetchTemplates();
    loadSavedLetters();

    // UC-060: load autosaved draft (HTML) if any
    const draftHtml = localStorage.getItem("cl_editor_draft");
    if (draftHtml) {
      setEditorFromHtml(draftHtml);
    }
  }, []);

  const fetchTemplates = async () => {
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

      setAnalytics({
        totalTemplates: templatesData.length,
        totalViews: views,
        totalUses: uses,
      });
    } catch (err) {
      console.error("❌ Error fetching templates:", err);
    }
  };

  // ============= Load Saved AI Letters =============
  const loadSavedLetters = async () => {
    const userId = getUserIdFromToken();
    if (!userId) return;

    try {
      const { data } = await api.get(`/api/cover-letter/saved/${userId}`);
      if (data.success) setSavedLetters(data.letters);
    } catch (err) {
      console.error("❌ Failed to load saved letters:", err);
    }
  };

  const handleSelectSaved = (letter) => {
    setSelected(null);
    setAiLetter(letter.content);
    setEditingLetter(null);
    setExpAnalysis(null); // saved letters won’t have UC-059 metadata

    // UC-060: load saved content into editor (plain -> HTML)
    setEditorFromPlain(letter.content);
    setAssistData(null);
    setAssistError("");
  };

  // ============= Template Preview =============
  const handleSelect = async (tpl) => {
    setSelected(tpl);
    setAiLetter("");
    setEditingLetter(null);
    setExpAnalysis(null);

    // UC-060: clear editor when switching templates
    setEditorFromHtml("");
    setAssistData(null);
    setAssistError("");
    setHistory([]);

    try {
      await api.post(`api/cover-letter/templates/${tpl.id}/track-view`);
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  // ============= Track Use =============
  const handleUseTemplate = async () => {
    if (!selected) return;

    try {
      await api.post(`api/cover-letter/templates/${selected.id}/track-use`);
      alert("Template applied!");

      if (selected.content) {
        setEditorFromPlain(selected.content);
      }
    } catch (err) {
      console.error("Error tracking use:", err);
    }
  };

  // ============= Create Custom Template =============
  const handleCreateCustom = async (e) => {
    e.preventDefault();

    try {
      const { data } = await api.post("api/cover-letter/templates", form);
      setTemplates((prev) => [data.template, ...prev]);

      setForm({
        name: "",
        industry: "",
        category: "Formal",
        content: "",
      });

      alert("Custom template saved!");
    } catch (err) {
      console.error("❌ Error creating template:", err);
      alert("Database error — could not save template.");
    }
  };

  // ============= Import Template JSON =============
  const handleImport = async () => {
    const raw = prompt("Paste template JSON:");
    if (!raw) return;

    try {
      const tpl = JSON.parse(raw);
      const { data } = await api.post("api/cover-letter/templates", tpl);

      setTemplates((prev) => [data.template, ...prev]);
      alert("Template imported!");
    } catch (err) {
      console.error(err);
      alert("Invalid JSON format.");
    }
  };

  // ============= Share Template JSON =============
  const handleShare = () => {
    if (!selected) return;

    const exportObj = {
      name: selected.name,
      industry: selected.industry,
      category: selected.category,
      content: selected.content,
    };

    navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
    alert("Template copied!");
  };
  
    // ============= UC-061: Export (PDF, DOCX, TXT) =============
  const handleExport = async (type) => {
    if (!selected) return alert("Select a template first!");

    const payload = {
      content: selected.content,
      jobTitle: selected.name || "cover_letter",
      company: selected.industry || "company",
    };

    try {
      let res;
      if (type === "pdf") res = await api.post("/api/cover-letter/export/pdf", payload, { responseType: "blob" });
      if (type === "docx") res = await api.post("/api/cover-letter/export/docx", payload, { responseType: "blob" });
      if (type === "txt") res = await api.post("/api/cover-letter/export/text", payload, { responseType: "blob" });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.name.replace(/\s+/g, "_")}_cover_letter.${type}`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Export failed:", err);
      alert("Export failed.");
    }
  };

  // ============= AI GENERATION (UC-058 + UC-059 aware) =============
  const handleGenerateAI = async (e) => {
    e.preventDefault();
    setAiError("");
    setAiLetter("");
    setEditingLetter(null);
    setExpAnalysis(null);
    setAiLoading(true);

    // UC-060: reset editor + assistance for fresh generation
    setEditorFromHtml("");
    setAssistData(null);
    setAssistError("");
    setHistory([]);

    try {
      const userId = getUserIdFromToken();

      const payload = {
        ...aiForm,

        // ⭐ REQUIRED TO ACTIVATE UC-59 PANEL
        userProfile: { id: userId },

        // Backend expects both
        jobTitle: aiForm.targetRole,
        companyName: aiForm.company,

        companyResearch: null,
        companyNews: null,

        tone,
        style: styleType,
        length: letterLength,
        culture,
        industry,
        personality,
        customToneInstructions,
      };

      console.log("🚀 Sending AI payload:", payload);

      const { data } = await api.post("/api/cover-letter/generate", payload);

      console.log("🔥 AI RAW RESPONSE:", data);

      const text =
        data?.content ||
        data?.letter ||
        data?.result ||
        (typeof data === "string" ? data : "");

      if (!text) {
        throw new Error(
          data?.message || "AI returned no content for the cover letter."
        );
      }

      setAiLetter(text);

      // UC-060: load generated letter into editor (plain -> HTML)
      setEditorFromPlain(text);

      // ⭐ UC-059 panel
      if (data.expAnalysis) {
        setExpAnalysis(data.expAnalysis);
        setExpOpen(true);
      } else {
        setExpAnalysis(null);
        setExpOpen(false);
      }
    } catch (err) {
      console.error("❌ AI error:", err);
      setAiError(err.response?.data?.message || err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ============= Copy AI Letter =============
  const handleCopyAILetter = () => {
    if (!aiLetter) return;
    navigator.clipboard.writeText(aiLetter);
    alert("AI letter copied!");
  };

  // ============= Save AI Letter =============
  const handleSaveAILetter = async () => {
    if (!aiLetter) return alert("No AI cover letter to save.");

    const userId = getUserIdFromToken();
    if (!userId) return alert("User not logged in.");

    try {
      const { data } = await api.post("api/cover-letter/save-ai", {
        user_id: userId,
        title: `${aiForm.company || "Company"} - ${
          aiForm.targetRole || "Role"
        }`,
        content: aiLetter,
      });

      if (data.success) {
        alert("AI letter saved!");
        loadSavedLetters();
      } else {
        alert(data.message || "Error saving AI letter.");
      }
    } catch (err) {
      console.error("❌ Save AI letter error:", err);
      alert("Error saving AI letter.");
    }
  };

  // ============= Delete Saved Letter =============
  const handleDeleteSavedLetter = async (letterId) => {
    if (!window.confirm("Delete this saved AI cover letter?")) return;

    try {
      const { data } = await api.delete(`/api/cover-letter/saved/${letterId}`);
      if (data.success) {
        alert("Letter deleted.");
        loadSavedLetters();
        setAiLetter("");
        setEditingLetter(null);
        setExpAnalysis(null);

        // UC-060 clear editor if that letter was being edited
        setEditorFromHtml("");
        setAssistData(null);
        setAssistError("");
        setHistory([]);
      } else {
        alert(data.message || "Failed to delete letter.");
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("Failed to delete letter.");
    }
  };

  // ============= Edit Saved Letter =============
  const startEditing = (letter) => {
    setEditingLetter(letter);
    setEditContent(letter.content);
    setAiLetter(letter.content);
    setExpAnalysis(null);

    setEditorFromPlain(letter.content);
    setAssistData(null);
    setAssistError("");
  };

  const submitEdit = async () => {
    try {
      const { data } = await api.put(
        `/api/cover-letter/saved/${editingLetter.id}`,
        {
          content: editContent,
          name: editingLetter.name,
        }
      );

      if (data.success) {
        alert("Letter updated!");
        loadSavedLetters();
        setEditingLetter(null);
        setAiLetter(editContent);

        // keep editor synced
        setEditorFromPlain(editContent);
      } else {
        alert(data.message || "Failed to update letter.");
      }
    } catch (err) {
      console.error("❌ Edit error:", err);
      alert("Failed to update letter.");
    }
  };

  // ============= UC-060: Autosave (HTML) =============
  useEffect(() => {
    if (!editorContent) return;

    setAutosaveStatus("Saving...");
    const id = setTimeout(() => {
      localStorage.setItem("cl_editor_draft", editorContent);
      setAutosaveStatus("Saved");
    }, 1000);

    return () => clearTimeout(id);
  }, [editorContent]);

  /* ===========================================
     UC-60 RICH TEXT TOOLBAR (contentEditable)
  =========================================== */
  const applyFormat = (format) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const commandMap = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      bullet: "insertUnorderedList",
      number: "insertOrderedList",
      clear: "removeFormat",
    };

    const cmd = commandMap[format];
    if (!cmd) return;

    document.execCommand(cmd, false, null);
  };

  // ============= UC-060: AI Refinement =============
  const handleRefine = async () => {
    const plain = htmlToPlainText(editorContent);
    if (!plain.trim()) {
      setAssistError("Add some content to refine.");
      return;
    }

    try {
      setAssistLoading(true);
      setAssistError("");
      setAssistData(null);

      const { data } = await api.post("/api/cover-letter/refine", {
        text: plain,
      });

      // Save current version (HTML) before overwriting
      setHistory((prev) => [
        { ts: new Date().toLocaleTimeString(), content: editorContent },
        ...prev.slice(0, 9),
      ]);

      const improvedPlain = data.improved_text || plain;
      setEditorFromPlain(improvedPlain);

      setAssistData(data);
    } catch (err) {
      console.error("❌ Refine error:", err);
      setAssistError(
        err.response?.data?.error || "Failed to refine cover letter."
      );
    } finally {
      setAssistLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================
  return (
    <div className="cl-wrapper">
      <h1 className="cl-title">✉️ Cover Letter Template Library</h1>

      {/* Analytics */}
      <div className="cl-analytics-row">
        <div className="cl-analytics-card">
          <span>Total Templates</span>
          <strong>{analytics.totalTemplates}</strong>
        </div>
        <div className="cl-analytics-card">
          <span>Total Views</span>
          <strong>{analytics.totalViews}</strong>
        </div>
        <div className="cl-analytics-card">
          <span>Total Uses</span>
          <strong>{analytics.totalUses}</strong>
        </div>
      </div>

      <div className="cl-layout">
        {/* ---------------------- SIDEBAR ---------------------- */}
        <div className="cl-list">
          <h2>Templates</h2>
          <p className="cl-sub">Click any template to preview.</p>

          <ul>
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className={
                  selected?.id === tpl.id ? "cl-item cl-item-active" : "cl-item"
                }
                onClick={() => handleSelect(tpl)}
              >
                <div className="cl-item-main">
                  <span className="cl-item-name">{tpl.name}</span>
                  <span className="cl-item-industry">{tpl.industry}</span>
                </div>

                <div className="cl-item-tags">
                  <span className="cl-tag">{tpl.category}</span>
                  {tpl.is_custom && (
                    <span className="cl-tag custom">Custom</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Saved AI Letters */}
          <h2 style={{ marginTop: "20px" }}>Saved AI Letters</h2>
          <p className="cl-sub">Your generated letters</p>

          <ul>
            {savedLetters.length === 0 && (
              <p className="cl-sub">No saved letters yet.</p>
            )}

            {savedLetters.map((letter) => (
              <li key={letter.id} className="cl-item">
                <div onClick={() => handleSelectSaved(letter)}>
                  <div className="cl-item-main">
                    <span className="cl-item-name">{letter.name}</span>
                  </div>
                </div>

                <div className="cl-item-tags" style={{ marginTop: "8px" }}>
                  <button
                    className="cl-tag custom"
                    style={{ border: "none", cursor: "pointer" }}
                    onClick={() => startEditing(letter)}
                  >
                    Edit
                  </button>

                  <button
                    className="cl-tag"
                    style={{
                      background: "#ffdddd",
                      color: "#a00",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleDeleteSavedLetter(letter.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------------------- PREVIEW PANEL ---------------------- */}
        <div className="cl-preview">
          <h2>Preview</h2>

          {/* Template Preview */}
          {selected && (
            <>
              <h3>{selected.name}</h3>

              <p className="cl-preview-meta">
                <strong>Industry:</strong> {selected.industry} •{" "}
                <strong>Style:</strong> {selected.category}
              </p>

              <pre className="cl-preview-box">{selected.content}</pre>

              <div className="cl-preview-actions">
                <button onClick={handleUseTemplate}>Use Template</button>
                <button onClick={handleShare}>Share JSON</button>

                {/* ===== NEW EXPORT BUTTONS (UC-61) ===== */}
                <button onClick={() => handleExport("pdf")}>Export PDF</button>
                <button onClick={() => handleExport("docx")}>Export DOCX</button>
                <button onClick={() => handleExport("txt")}>Export TXT</button>
              </div>
            </>
          )}

          {/* ---------------------- AI Result ---------------------- */}
          <div className="cl-ai-result-block">
            <h2>AI Company-Tailored Cover Letter</h2>

            {aiLoading && <p>Generating cover letter…</p>}
            {aiError && <p className="cl-error">{aiError}</p>}

            {aiLetter && (
              <>
                <pre
                  className="cl-preview-box cl-ai-preview"
                  style={{ whiteSpace: "pre-wrap", minHeight: "150px" }}
                >
                  {aiLetter}
                </pre>

                <div
                  className="cl-preview-actions"
                  style={{ marginTop: "10px" }}
                >
                  <button onClick={handleCopyAILetter}>Copy</button>
                  <button onClick={handleSaveAILetter}>Save</button>
                </div>
              </>
            )}

            {/* ====================== UC-060 EDITOR SECTION ====================== */}
            {editorContent && (
              <div className="cl-editor-block" style={{ marginTop: "20px" }}>
                <h2>✏️ Edit & Refine Your Cover Letter</h2>

                <p className="cl-sub">
                  Words: {editorStats.words} • Characters: {editorStats.chars} •{" "}
                  Autosave: {autosaveStatus || "Idle"}
                </p>

                {/* Toolbar */}
                <div
                  className="cl-editor-toolbar"
                  style={{ marginBottom: "10px" }}
                >
                  <button
                    type="button"
                    onClick={() => applyFormat("bold")}
                  >
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("italic")}
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("underline")}
                  >
                    <u>U</u>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("bullet")}
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("number")}
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    style={{ marginLeft: "8px", color: "#a00" }}
                    onClick={() => applyFormat("clear")}
                  >
                    Clear
                  </button>
                </div>

                {/* Rich text editor */}
                <div
                  id="cl-editor-area"
                  ref={editorRef}
                  className="cl-editor-area"
                  contentEditable
                  spellCheck={true}
                  onInput={(e) => {
                    const html = e.currentTarget.innerHTML || "";
                    setEditorContent(html);
                    updateEditorStatsFromHtml(html);
                  }}
                ></div>

                <div
                  className="cl-preview-actions"
                  style={{ marginTop: "10px" }}
                >
                  <button onClick={handleRefine} disabled={assistLoading}>
                    {assistLoading ? "Analyzing…" : "Refine with AI"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setHistory((prev) => [
                        {
                          ts: new Date().toLocaleTimeString(),
                          content: editorContent,
                        },
                        ...prev.slice(0, 9),
                      ])
                    }
                  >
                    Save Version
                  </button>
                </div>

                {assistError && (
                  <p className="cl-error" style={{ marginTop: "8px" }}>
                    {assistError}
                  </p>
                )}

                {assistData && (
                  <div
                    className="cl-ai-suggestions"
                    style={{ marginTop: "20px" }}
                  >
                    <h3>AI Editing Suggestions</h3>

                    {assistData.readability && (
                      <div className="cl-panel">
                        <h4>Readability</h4>
                        <p>
                          Score:{" "}
                          <strong>
                            {assistData.readability.flesch}
                          </strong>{" "}
                          ({assistData.readability.level}) – Words:{" "}
                          {assistData.readability.words}, Sentences:{" "}
                          {assistData.readability.sentences}
                        </p>
                      </div>
                    )}

                    {assistData.restructuring_suggestions?.length > 0 && (
                      <div className="cl-panel">
                        <h4>Structure Improvements</h4>
                        <ul>
                          {assistData.restructuring_suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assistData.synonym_suggestions?.length > 0 && (
                      <div className="cl-panel">
                        <h4>Synonym Suggestions</h4>
                        <ul>
                          {assistData.synonym_suggestions.map((s, i) => (
                            <li key={i}>
                              <strong>{s.original}:</strong>{" "}
                              {Array.isArray(s.alternatives)
                                ? s.alternatives.join(", ")
                                : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assistData.style_tips?.length > 0 && (
                      <div className="cl-panel">
                        <h4>Style Tips</h4>
                        <ul>
                          {assistData.style_tips.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="cl-panel" style={{ marginTop: "20px" }}>
                  <h4>Version History (Session Only)</h4>
                  {history.length === 0 && (
                    <p className="cl-sub">No saved versions yet.</p>
                  )}
                  <ul>
                    {history.map((h, i) => (
                      <li key={i} style={{ marginBottom: "5px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditorFromHtml(h.content);
                          }}
                        >
                          Restore ({h.ts})
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!aiLetter && !aiLoading && !aiError && !editorContent && (
              <p className="cl-sub">
                Generate an AI cover letter using company research.
              </p>
            )}

            {/* ---------------------- UC-059 EXPERIENCE HIGHLIGHTING PANEL ---------------------- */}
            {expAnalysis && (
              <div className="cl-preview-box" style={{ marginTop: "20px" }}>
                <h3
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpOpen(!expOpen)}
                >
                  ⭐ Experience Highlighting (UC-059)
                  <span style={{ float: "right" }}>
                    {expOpen ? "▲" : "▼"}
                  </span>
                </h3>

                {expOpen && (
                  <div style={{ marginTop: "10px", lineHeight: "1.6" }}>
                    {expAnalysis.summaryNarrative && (
                      <p className="cl-sub">{expAnalysis.summaryNarrative}</p>
                    )}

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

                    {expAnalysis.quantifiedHighlights?.length > 0 && (
                      <>
                        <h4>Quantified Highlights</h4>
                        <ul>
                          {expAnalysis.quantifiedHighlights.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {expAnalysis.relevanceScores?.length > 0 && (
                      <>
                        <h4>Relevance Scores</h4>
                        <ul>
                          {expAnalysis.relevanceScores.map((r, i) => (
                            <li key={i}>
                              <strong>{r.exp}</strong>: {r.score}%
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {expAnalysis.additionalRelevantExperiences?.length > 0 && (
                      <>
                        <h4>Additional Relevant Experiences</h4>
                        <ul>
                          {expAnalysis.additionalRelevantExperiences.map(
                            (e, i) => (
                              <li key={i}>{e}</li>
                            )
                          )}
                        </ul>
                      </>
                    )}

                    {expAnalysis.alternativePresentations?.length > 0 && (
                      <>
                        <h4>Alternative Experience Presentations</h4>
                        <ul>
                          {expAnalysis.alternativePresentations.map(
                            (alt, i) => (
                              <li key={i}>{alt}</li>
                            )
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* EDIT MODE */}
            {editingLetter && (
              <div
                className="cl-preview-box"
                style={{ marginTop: "20px", background: "#fff7e6" }}
              >
                <h3>Edit Saved Letter</h3>

                <textarea
                  rows="10"
                  style={{ width: "100%" }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />

                <div
                  className="cl-preview-actions"
                  style={{ marginTop: "10px" }}
                >
                  <button onClick={submitEdit}>Save Changes</button>
                  <button onClick={() => setEditingLetter(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------- RIGHT SIDE PANEL ---------------------- */}
        <div className="cl-custom">
          <h2>Create / Import Template</h2>

          <form onSubmit={handleCreateCustom} className="cl-form">
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label>
              Industry
              <input
                type="text"
                value={form.industry}
                onChange={(e) =>
                  setForm({ ...form, industry: e.target.value })
                }
                required
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option>Formal</option>
                <option>Technical</option>
                <option>Creative</option>
                <option>Academic</option>
              </select>
            </label>

            <label>
              Content
              <textarea
                rows="6"
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                required
              />
            </label>

            <button type="submit">Save Template</button>
          </form>

          <button className="cl-import-btn" onClick={handleImport}>
            Import JSON Template
          </button>

          {/* --------------------- AI GENERATOR ------------------------- */}
          <div className="cl-ai-form">
            <h2>AI Cover Letter with Company Research</h2>
            <p className="cl-sub">
              Uses company background, news, mission, culture, competitive
              landscape, and your achievements.
            </p>

            <form onSubmit={handleGenerateAI} className="cl-form">
              <label>
                Your Name
                <input
                  type="text"
                  value={aiForm.userName}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, userName: e.target.value })
                  }
                  placeholder="Aditya Jain"
                />
              </label>

              <label>
                Target Role
                <input
                  type="text"
                  value={aiForm.targetRole}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, targetRole: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Company Name
                <input
                  type="text"
                  value={aiForm.company}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, company: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Job Description
                <textarea
                  rows="4"
                  value={aiForm.jobDescription}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, jobDescription: e.target.value })
                  }
                />
              </label>

              <label>
                Achievements (with metrics)
                <textarea
                  rows="4"
                  value={aiForm.achievements}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, achievements: e.target.value })
                  }
                />
              </label>

              {/* ------------------- UC-058 TONE & STYLE ------------------- */}
              <div className="cl-settings-panel">
                <h2>✨ Tone & Style Customization</h2>

                <label>
                  Tone
                  <select value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="analytical">Analytical</option>
                  </select>
                </label>

                <label>
                  Writing Style
                  <select
                    value={styleType}
                    onChange={(e) => setStyleType(e.target.value)}
                  >
                    <option value="direct">Direct</option>
                    <option value="narrative">Narrative</option>
                    <option value="bullet">Bullet Points</option>
                  </select>
                </label>

                <label>
                  Length
                  <select
                    value={letterLength}
                    onChange={(e) => setLetterLength(e.target.value)}
                  >
                    <option value="brief">Brief</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>

                <label>
                  Company Culture
                  <select
                    value={culture}
                    onChange={(e) => setCulture(e.target.value)}
                  >
                    <option value="corporate">Corporate</option>
                    <option value="startup">Startup</option>
                  </select>
                </label>

                <label>
                  Industry (Optional)
                  <input
                    type="text"
                    placeholder="e.g. Cybersecurity, Finance"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </label>

                <label>
                  Personality Level
                  <select
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                  >
                    <option value="subtle">Subtle</option>
                    <option value="balanced">Balanced</option>
                    <option value="strong">Strong Personality</option>
                  </select>
                </label>

                <label>
                  Extra Tone Instructions
                  <textarea
                    rows="3"
                    placeholder="Any custom writing instructions…"
                    value={customToneInstructions}
                    onChange={(e) =>
                      setCustomToneInstructions(e.target.value)
                    }
                  ></textarea>
                </label>
              </div>

              <button type="submit" disabled={aiLoading}>
                {aiLoading ? "Generating..." : "Generate AI Cover Letter"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
