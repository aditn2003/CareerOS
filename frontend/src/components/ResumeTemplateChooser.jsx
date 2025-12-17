import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./ResumeTemplateChooser.css";

export default function ResumeTemplateChooser({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  // ----------------------------
  // Load static templates
  // ----------------------------
  useEffect(() => {
    const staticTemplates = [
      {
        id: 1,
        name: "ATS Optimized",
        layout_type: "ats",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/ats.webp",
        preview_url_fallback: "/assets/templates/ats.png",
      },
      {
        id: 2,
        name: "Creative",
        layout_type: "creative",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/creative.webp",
        preview_url_fallback: "/assets/templates/creative.png",
      },
      {
        id: 3,
        name: "Two Column",
        layout_type: "two-column",
        color_scheme: "#246bdeff",
        preview_url: "/assets/templates/two-column.webp",
        preview_url_fallback: "/assets/templates/two-column.png",
      },
      {
        id: 4,
        name: "Professional",
        layout_type: "professional",
        color_scheme: "#000000ff",
        preview_url: "/assets/templates/professional.webp",
        preview_url_fallback: "/assets/templates/professional.png",
      },
    ];

    setTemplates(staticTemplates);
  }, []);

  // ----------------------------
  // Helpers
  // ----------------------------
  function getActiveTemplate() {
    if (selected) return selected;
    if (templates.length) return templates[0];
    return { id: 1, name: "ATS Optimized", layout_type: "ats" };
  }

  // ----------------------------
  // Import Resume (works via modal only)
  // ----------------------------
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    console.log("📁 File selected:", file);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      setUploading(true);

      const { data } = await api.post("/api/resumes/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Imported resume sections:", data.sections);

      navigate("/resume/editor", {
        state: {
          sections: data.sections || {},
          title: data.title || "Imported Resume",
          template: getActiveTemplate(),
        },
      });

      setShowCreateModal(false);
    } catch (err) {
      console.error("❌ Error uploading resume:", err);
      alert(err?.response?.data?.error || "❌ Failed to import resume.");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow reselect
    }
  }

  // ----------------------------
  // Use existing profile info
  // ----------------------------
  async function handleUseExistingInfo() {
    try {
      const { data } = await api.get("/api/resumes/from-profile");

      console.log("✅ Using profile data:", data);

      navigate("/resume/editor", {
        state: {
          sections: data.sections || {},
          title: data.title || "Profile-based Resume",
          template: getActiveTemplate(),
        },
      });

      setShowCreateModal(false);
    } catch (err) {
      console.error("❌ Error creating from profile:", err);
      alert(
        err?.response?.data?.error || "❌ Failed to create resume from profile."
      );
    }
  }

  // ----------------------------
  // Filter templates
  // ----------------------------
  const categories = [
    "All",
    "ATS",
    "Simple",
    "Creative",
    "Two-column",
    "Professional",
  ];

  const filtered = templates.filter(
    (t) => filter === "All" || t.layout_type === filter.toLowerCase()
  );

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="resume-template-page">
      {/* HEADER */}
      <header className="template-header">
        <h1>Resume Templates</h1>
        <p>
          Each resume template is designed to follow ATS rules and help you get
          noticed. Choose one to start building your tailored resume.
        </p>

        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={filter === cat ? "active" : ""}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* TEMPLATE GRID */}
      <section className="template-grid">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`template-card ${
              selected?.id === t.id ? "selected" : ""
            }`}
          >
            <div className="template-image" onClick={() => setPreview(t)}>
              <picture>
                <source 
                  srcSet={t.preview_url || "/assets/resume-placeholder.webp"} 
                  type="image/webp" 
                />
                <img
                  src={t.preview_url_fallback || t.preview_url || "/assets/resume-placeholder.png"}
                  alt={t.name}
                  loading="lazy"
                  decoding="async"
                  width="300"
                  height="400"
                  style={{ objectFit: "cover", width: "100%", height: "auto" }}
                />
              </picture>
              <div className="template-hover">
                <button
                  className="use-template-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(t);
                    onSelectTemplate && onSelectTemplate(t);
                  }}
                >
                  Use this template
                </button>
              </div>
            </div>

            <div className="template-info">
              <h3>{t.name}</h3>
              <p className="layout-type">{t.layout_type}</p>
              <div className="template-meta">
                <span className="color-dot" style={{ color: t.color_scheme }}>
                  ●
                </span>
                <span className="file-icons">
                  <span className="file-icon">PDF</span>
                  <span className="file-icon">DOCX</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CREATE RESUME MODAL */}
      {showCreateModal && (
        <div
          className="preview-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-preview"
              onClick={() => setShowCreateModal(false)}
            >
              ✕
            </button>

            <h2>Create Resume</h2>
            <p>Choose how you’d like to start building your resume:</p>

            <div className="create-options">
              <button className="btn-primary" onClick={handleUseExistingInfo}>
                Use Existing Information
              </button>

              <label className="btn-secondary upload-btn">
                {uploading ? "Uploading..." : "Import Resume"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <p className="helper-text">
              Upload an existing resume (PDF/DOCX) or pull your data from your
              saved profile to start editing immediately.
            </p>
          </div>
        </div>
      )}

      {/* TEMPLATE PREVIEW MODAL */}
      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={() => setPreview(null)}>
              ✕
            </button>
            <img
              src={preview.preview_url}
              alt={`${preview.name} Preview`}
              className="preview-image"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}
