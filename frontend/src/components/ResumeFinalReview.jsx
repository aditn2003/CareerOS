import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./ResumeFinalReview.css";

export default function ResumeFinalReview() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    sections = {},
    resumeTitle: passedTitle = "Untitled Resume",
    selectedTemplate: template = {},
  } = location.state || {};

  const [draft, setDraft] = useState({
    summary: {
      full_name: "",
      title: "",
      contact: { email: "", phone: "", location: "" },
      bio: "",
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  });

  const [saving, setSaving] = useState(false);
  const [resumeTitle, setResumeTitle] = useState(passedTitle);
  const [visibleSections, setVisibleSections] = useState({});
  const [sectionOrder, setSectionOrder] = useState([]);

  // ✅ NEW: Preset states
  const [showResumePresetModal, setShowResumePresetModal] = useState(false);
  const [showLoadResumePresetModal, setShowLoadResumePresetModal] =
    useState(false);
  const [showSectionPresetModal, setShowSectionPresetModal] = useState(false);
  const [showLoadSectionPresetModal, setShowLoadSectionPresetModal] =
    useState(false);
  const [presetName, setPresetName] = useState("");
  const [currentSectionForPreset, setCurrentSectionForPreset] = useState("");
  const [resumePresets, setResumePresets] = useState([]);
  const [sectionPresets, setSectionPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  /* ------------------------ 🧠 Normalize Imported Resume ------------------------ */
  useEffect(() => {
    if (!sections || Object.keys(sections).length === 0) return;

    const normalized = {};
    for (const [key, value] of Object.entries(sections)) {
      if (Array.isArray(value)) normalized[key] = value;
      else if (typeof value === "string") normalized[key] = { bio: value };
      else if (value && typeof value === "object") {
        const keys = Object.keys(value);
        const isNumericObj = keys.every((k) => !isNaN(Number(k)));
        normalized[key] = isNumericObj ? Object.values(value) : value;
      } else normalized[key] = [];
    }

    // ✅ Normalize skills
    if (Array.isArray(normalized.skills))
      normalized.skills = normalized.skills
        .map((s) => (typeof s === "string" ? s.trim() : s?.name?.trim() || ""))
        .filter(Boolean);
    else if (typeof normalized.skills === "string")
      normalized.skills = normalized.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else normalized.skills = [];

    setDraft((prev) => ({ ...prev, ...normalized }));
    setVisibleSections(
      Object.keys(normalized).reduce((a, k) => ({ ...a, [k]: true }), {})
    );
    setSectionOrder(Object.keys(normalized));
  }, [sections]);

  /* ------------------------------ 🔧 Helpers ------------------------------ */
  const toLabel = (field) =>
    field
      .replace(/_/g, " ")
      .replace(/\./g, " → ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const isHiddenField = (field) => {
    const normalize = (str) => str.toLowerCase().replace(/[\s_-]/g, "");
    const normalizedField = normalize(field);

    const hiddenFields = [
      "status",
      "renewal_reminder",
      "renewalreminder",
      "verified",
      "project_type",
      "projecttype",
      "team_size",
      "teamsize",
      "collaboration_details",
      "collaborationdetails",
      "gpa_private",
      "gpaprivate",
      "private_gpa",
      "privategpa",
      "internal_notes",
      "internalnotes",
      "notes",
      "hidden",
      "metadata",
      "relevancescore",
      "relevancereasoning",
      "relevantkeywords",
    ];

    return hiddenFields.some((hidden) => normalize(hidden) === normalizedField);
  };

  const formatDate = (value) => {
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateField = (key) =>
    key.toLowerCase().includes("date") ||
    key === "start" ||
    key === "end" ||
    key.toLowerCase().endsWith("_at");

  const isNumericField = (field) => {
    const fieldLower = field.toLowerCase();
    return (
      fieldLower.includes("size") ||
      fieldLower.includes("count") ||
      fieldLower.includes("number") ||
      fieldLower.includes("amount") ||
      fieldLower.includes("quantity") ||
      fieldLower.includes("gpa") ||
      fieldLower === "id"
    );
  };

  const isBooleanField = (field) => {
    const fieldLower = field.toLowerCase();
    return (
      fieldLower === "current" ||
      fieldLower === "currently_enrolled" ||
      fieldLower === "does_not_expire" ||
      fieldLower === "verified" ||
      fieldLower === "active" ||
      fieldLower === "enabled" ||
      fieldLower.startsWith("is_") ||
      fieldLower.startsWith("has_") ||
      fieldLower.startsWith("can_")
    );
  };

  const isBoolean = (val) =>
    typeof val === "boolean" ||
    val === "true" ||
    val === "false" ||
    val === true ||
    val === false;

  const normalizeValue = (val) => {
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    if (val === 1 || val === "1") return true;
    if (val === 0 || val === "0") return false;
    return Boolean(val);
  };

  const isLongTextField = (field) =>
    ["description", "bio", "summary", "details", "responsibilities"].some((t) =>
      field.toLowerCase().includes(t)
    );

  /* ----------------------- ✏️ Update Nested Values ----------------------- */
  function updateValue(sectionKey, fieldPath, value) {
    setDraft((prev) => {
      const copy = structuredClone(prev);
      const keys = fieldPath.split(".");
      let obj = copy[sectionKey];
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (obj[k] === undefined) obj[k] = isNaN(Number(keys[i + 1])) ? {} : [];
        obj = obj[k];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  /* --------------------------- ➕ Add / Remove --------------------------- */
  const addEntry = (key) =>
    setDraft((p) => ({
      ...p,
      [key]: [...(Array.isArray(p[key]) ? p[key] : []), {}],
    }));

  const removeEntry = (key, idx) =>
    setDraft((p) => ({
      ...p,
      [key]: p[key].filter((_, i) => i !== idx),
    }));

  /* --------------------------- 🎯 Skills Handlers --------------------------- */
  const addSkill = (skillName) => {
    const newSkill = skillName.trim();
    if (!newSkill) return;
    setDraft((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill],
    }));
  };

  const removeSkill = (index) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  /* --------------------------- ⬆️⬇️ Reorder Sections --------------------------- */
  function moveSection(key, direction) {
    setSectionOrder((prev) => {
      const newOrder = [...prev];
      const index = newOrder.indexOf(key);
      if (index === -1) return prev;
      if (direction === "up" && index > 0)
        [newOrder[index - 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index - 1],
        ];
      else if (direction === "down" && index < newOrder.length - 1)
        [newOrder[index + 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index + 1],
        ];
      return newOrder;
    });
  }

  /* ------------------------------ 💾 Save Resume ------------------------------ */
  async function handleSave(format = "pdf") {
    try {
      setSaving(true);
      const filteredDraft = Object.fromEntries(
        sectionOrder
          .filter((key) => visibleSections[key])
          .map((key) => [key, draft[key]])
      );

      const response = await api.post("/api/resumes", {
        title: resumeTitle,
        template_id: template?.id || 1,
        template_name: template?.name || "ATS Optimized",
        sections: filteredDraft,
        format,
      });

      alert("✅ Resume saved successfully!");
      
      // Navigate back to docs management if we came from optimize flow
      // Check if we came from optimize flow (which starts from docs management)
      const cameFromOptimize = location.state?.fromOptimize || 
                               document.referrer.includes('/resume/optimize') ||
                               document.referrer.includes('/resume/compare');
      
      if (cameFromOptimize) {
        navigate("/docs-management?refresh=true");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save resume.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------ 🎨 RESUME PRESET FUNCTIONS ------------------------------ */

  // Save Resume Preset (Layout)
  async function saveResumePreset() {
    if (!presetName.trim()) {
      alert("Please enter a preset name");
      return;
    }

    try {
      await api.post("/api/resume-presets", {
        name: presetName,
        section_order: sectionOrder,
        visible_sections: visibleSections,
      });
      alert("✅ Resume layout preset saved!");
      setShowResumePresetModal(false);
      setPresetName("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save preset");
    }
  }

  // Load Resume Presets
  async function loadResumePresets() {
    try {
      setLoadingPresets(true);
      const response = await api.get("/api/resume-presets");
      setResumePresets(response.data.presets || []);
      setShowLoadResumePresetModal(true);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to load presets");
    } finally {
      setLoadingPresets(false);
    }
  }

  // Apply Resume Preset
  function applyResumePreset(preset) {
    setSectionOrder(preset.section_order);
    setVisibleSections(preset.visible_sections);
    setShowLoadResumePresetModal(false);
    alert("✅ Layout preset applied!");
  }

  // Delete Resume Preset
  async function deleteResumePreset(id) {
    if (!confirm("Delete this preset?")) return;
    try {
      await api.delete(`/api/resume-presets/${id}`);
      setResumePresets((prev) => prev.filter((p) => p.id !== id));
      alert("🗑️ Preset deleted");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete preset");
    }
  }

  /* ------------------------------ 📋 SECTION PRESET FUNCTIONS ------------------------------ */

  // Save Section Preset
  async function saveSectionPreset(sectionKey) {
    if (!presetName.trim()) {
      alert("Please enter a preset name");
      return;
    }

    try {
      await api.post("/api/section-presets", {
        section_name: sectionKey,
        preset_name: presetName,
        section_data: draft[sectionKey],
      });
      alert("✅ Section preset saved!");
      setShowSectionPresetModal(false);
      setPresetName("");
      setCurrentSectionForPreset("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save section preset");
    }
  }

  // Load Section Presets
  async function loadSectionPresets(sectionKey) {
    try {
      setLoadingPresets(true);
      const response = await api.get(`/api/section-presets/${sectionKey}`);
      setSectionPresets(response.data.presets || []);
      setCurrentSectionForPreset(sectionKey);
      setShowLoadSectionPresetModal(true);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to load section presets");
    } finally {
      setLoadingPresets(false);
    }
  }

  // Apply Section Preset
  function applySectionPreset(preset) {
    setDraft((prev) => ({
      ...prev,
      [currentSectionForPreset]: preset.section_data,
    }));
    setShowLoadSectionPresetModal(false);
    alert("✅ Section preset applied!");
  }

  // Delete Section Preset
  async function deleteSectionPreset(id) {
    if (!confirm("Delete this section preset?")) return;
    try {
      await api.delete(`/api/section-presets/${id}`);
      setSectionPresets((prev) => prev.filter((p) => p.id !== id));
      alert("🗑️ Section preset deleted");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete preset");
    }
  }

  /* ------------------------------ 🧱 Render ------------------------------ */
  return (
    <div className="final-review-layout">
      <div className="final-review-main final-review-container">
        <h1>🧾 Final Resume Review</h1>
        <p className="final-review-subtitle">
          Do one final check before saving your resume permanently.
        </p>

        <label className="final-review-title-label">Resume Title</label>
        <input
          value={resumeTitle}
          onChange={(e) => setResumeTitle(e.target.value)}
          placeholder="Final Resume Title"
          className="final-review-title-input"
        />

        {/* ✅ RESUME PRESET BUTTONS */}
        {/* <div className="final-review-preset-actions">
          <button
            onClick={() => setShowResumePresetModal(true)}
            className="final-review-btn-preset"
          >
            💾 Save Layout Preset
          </button>
          <button
            onClick={loadResumePresets}
            className="final-review-btn-preset"
            disabled={loadingPresets}
          >
            📂 Load Layout Preset
          </button>
        </div> */}

        {sectionOrder.map((key, idx) => {
          const sectionValue = draft[key];
          if (!sectionValue) return null;

          return (
            <div key={key} className="final-review-section">
              <div className="final-review-section-header">
                <div className="final-review-section-title-group">
                  <h2>{toLabel(key)}</h2>
                  <label className="final-review-switch">
                    <input
                      type="checkbox"
                      checked={!!visibleSections[key]}
                      onChange={(e) =>
                        setVisibleSections((p) => ({
                          ...p,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span className="final-review-slider"></span>
                  </label>
                </div>

                <div className="final-review-section-controls">
                  {/* ✅ SECTION PRESET BUTTONS */}
                  <button
                    className="final-review-preset-icon-btn"
                    onClick={() => {
                      setCurrentSectionForPreset(key);
                      setShowSectionPresetModal(true);
                    }}
                    title="Save section preset"
                  >
                    💾
                  </button>
                  <button
                    className="final-review-preset-icon-btn"
                    onClick={() => loadSectionPresets(key)}
                    title="Load section preset"
                  >
                    📂
                  </button>

                  <button
                    className="final-review-arrow-btn"
                    onClick={() => moveSection(key, "up")}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="final-review-arrow-btn"
                    onClick={() => moveSection(key, "down")}
                    disabled={idx === sectionOrder.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {visibleSections[key] && (
                <div className="final-review-section-content">
                  {key === "skills" ? (
                    <div className="final-review-skills-tags-container">
                      <div className="final-review-skills-tags">
                        {(sectionValue || []).map((skill, index) => (
                          <div key={index} className="final-review-skill-tag">
                            {skill}
                            <button
                              className="final-review-skill-remove"
                              onClick={() => removeSkill(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Type a skill and press Enter"
                        className="final-review-skill-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill(e.target.value);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  ) : Array.isArray(sectionValue) ? (
                    <div className="final-review-section-list">
                      {sectionValue.map((item, idx2) => (
                        <div key={idx2} className="final-review-entry-card">
                          {Object.entries(item || {})
                            .filter(([field]) => !isHiddenField(field))
                            .map(([field, val]) => (
                              <div
                                key={field}
                                className="final-review-field-group"
                              >
                                <label>{toLabel(field)}</label>
                                {isNumericField(field) ? (
                                  <input
                                    type="number"
                                    value={val || ""}
                                    onChange={(e) =>
                                      updateValue(
                                        key,
                                        `${idx2}.${field}`,
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : isBooleanField(field) || isBoolean(val) ? (
                                  <input
                                    type="checkbox"
                                    checked={!!normalizeValue(val)}
                                    onChange={(e) =>
                                      updateValue(
                                        key,
                                        `${idx2}.${field}`,
                                        e.target.checked
                                      )
                                    }
                                  />
                                ) : isLongTextField(field) ? (
                                  <textarea
                                    rows={4}
                                    value={val || ""}
                                    onChange={(e) =>
                                      updateValue(
                                        key,
                                        `${idx2}.${field}`,
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : isDateField(field) ? (
                                  <input
                                    type="date"
                                    value={formatDate(val)}
                                    onChange={(e) =>
                                      updateValue(
                                        key,
                                        `${idx2}.${field}`,
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={val || ""}
                                    onChange={(e) =>
                                      updateValue(
                                        key,
                                        `${idx2}.${field}`,
                                        e.target.value
                                      )
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          <button
                            className="final-review-btn-small"
                            onClick={() => removeEntry(key, idx2)}
                          >
                            ❌ Remove Entry
                          </button>
                        </div>
                      ))}
                      <button
                        className="final-review-btn-add"
                        onClick={() => addEntry(key)}
                      >
                        ➕ Add Entry
                      </button>
                    </div>
                  ) : typeof sectionValue === "object" ? (
                    Object.entries(sectionValue || {})
                      .filter(([field]) => !isHiddenField(field))
                      .map(([field, val]) => (
                        <div key={field} className="final-review-field-group">
                          <label>{toLabel(field)}</label>
                          {field === "contact" && typeof val === "object" ? (
                            <div className="final-review-contact-fields">
                              {Object.entries(val || {}).map(
                                ([contactField, contactVal]) => (
                                  <div
                                    key={contactField}
                                    className="final-review-field-group"
                                  >
                                    <label>{toLabel(contactField)}</label>
                                    <input
                                      type="text"
                                      value={contactVal || ""}
                                      onChange={(e) =>
                                        updateValue(
                                          key,
                                          `${field}.${contactField}`,
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          ) : isNumericField(field) ? (
                            <input
                              type="number"
                              value={val || ""}
                              onChange={(e) =>
                                updateValue(key, field, e.target.value)
                              }
                            />
                          ) : isBooleanField(field) || isBoolean(val) ? (
                            <input
                              type="checkbox"
                              checked={!!normalizeValue(val)}
                              onChange={(e) =>
                                updateValue(key, field, e.target.checked)
                              }
                            />
                          ) : isLongTextField(field) ? (
                            <textarea
                              rows={4}
                              value={val || ""}
                              onChange={(e) =>
                                updateValue(key, field, e.target.value)
                              }
                            />
                          ) : isDateField(field) ? (
                            <input
                              type="date"
                              value={formatDate(val)}
                              onChange={(e) =>
                                updateValue(key, field, e.target.value)
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              value={val || ""}
                              onChange={(e) =>
                                updateValue(key, field, e.target.value)
                              }
                            />
                          )}
                        </div>
                      ))
                  ) : (
                    <textarea
                      rows={4}
                      value={sectionValue || ""}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="final-review-actions">
          <button
            onClick={() => navigate(-1)}
            className="final-review-btn-secondary"
          >
            ← Back
          </button>
          <button
            onClick={() => handleSave("pdf")}
            disabled={saving}
            className="final-review-btn-primary"
          >
            {saving ? "Saving..." : "💾 Save Resume"}
          </button>
        </div>
      </div>

      {/* ✅ MODALS */}

      {/* Save Resume Preset Modal */}
      {showResumePresetModal && (
        <div
          className="final-review-modal-overlay"
          onClick={() => setShowResumePresetModal(false)}
        >
          <div
            className="final-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Save Layout Preset</h3>
            <p>Save the current section order and visibility settings</p>
            <input
              type="text"
              placeholder="Enter preset name (e.g., 'Tech Resume Layout')"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="final-review-modal-input"
              autoFocus
            />
            <div className="final-review-modal-actions">
              <button
                onClick={() => setShowResumePresetModal(false)}
                className="final-review-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={saveResumePreset}
                className="final-review-btn-save-modal"
              >
                💾 Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Resume Preset Modal */}
      {showLoadResumePresetModal && (
        <div
          className="final-review-modal-overlay"
          onClick={() => setShowLoadResumePresetModal(false)}
        >
          <div
            className="final-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Load Layout Preset</h3>
            {resumePresets.length === 0 ? (
              <p>No saved layout presets yet</p>
            ) : (
              <div className="final-review-preset-list">
                {resumePresets.map((preset) => (
                  <div key={preset.id} className="final-review-preset-item">
                    <div>
                      <strong>{preset.name}</strong>
                      <small>
                        {new Date(preset.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="final-review-preset-item-actions">
                      <button
                        onClick={() => applyResumePreset(preset)}
                        className="final-review-btn-apply"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => deleteResumePreset(preset.id)}
                        className="final-review-btn-delete-small"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="final-review-modal-actions">
              <button
                onClick={() => setShowLoadResumePresetModal(false)}
                className="final-review-btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Section Preset Modal */}
      {showSectionPresetModal && (
        <div
          className="final-review-modal-overlay"
          onClick={() => setShowSectionPresetModal(false)}
        >
          <div
            className="final-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Save {toLabel(currentSectionForPreset)} Preset</h3>
            <p>
              Save the current {toLabel(currentSectionForPreset).toLowerCase()}{" "}
              data for reuse
            </p>
            <input
              type="text"
              placeholder="Enter preset name (e.g., 'Software Engineer Experience')"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="final-review-modal-input"
              autoFocus
            />
            <div className="final-review-modal-actions">
              <button
                onClick={() => setShowSectionPresetModal(false)}
                className="final-review-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSectionPreset(currentSectionForPreset)}
                className="final-review-btn-save-modal"
              >
                💾 Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Section Preset Modal */}
      {showLoadSectionPresetModal && (
        <div
          className="final-review-modal-overlay"
          onClick={() => setShowLoadSectionPresetModal(false)}
        >
          <div
            className="final-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Load {toLabel(currentSectionForPreset)} Preset</h3>
            {sectionPresets.length === 0 ? (
              <p>
                No saved {toLabel(currentSectionForPreset).toLowerCase()}{" "}
                presets yet
              </p>
            ) : (
              <div className="final-review-preset-list">
                {sectionPresets.map((preset) => (
                  <div key={preset.id} className="final-review-preset-item">
                    <div>
                      <strong>{preset.preset_name}</strong>
                      <small>
                        {new Date(preset.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="final-review-preset-item-actions">
                      <button
                        onClick={() => applySectionPreset(preset)}
                        className="final-review-btn-apply"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => deleteSectionPreset(preset.id)}
                        className="final-review-btn-delete-small"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="final-review-modal-actions">
              <button
                onClick={() => setShowLoadSectionPresetModal(false)}
                className="final-review-btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
