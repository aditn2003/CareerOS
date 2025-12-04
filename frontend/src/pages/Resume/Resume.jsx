// src/pages/Resume/Resume.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ResumeTemplateChooser from "../../components/ResumeTemplateChooser";
import FileUpload from "../../components/FileUpload";
import { api } from "../../api";

export default function Resume() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [resumes, setResumes] = useState([]);

  // When user selects a template, move to editor (if you pass template data)
  function handleTemplateSelect(template) {
    navigate("/resume/editor", { state: { template } });
  }

  // Load resumes on mount
  React.useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    try {
      const res = await api.get("/api/resumes");
      setResumes(res.data.resumes || []);
    } catch (err) {
      console.error("Failed to load resumes:", err);
    }
  }

  function handleUploadSuccess(data) {
    loadResumes(); // Reload list
    setShowUpload(false);
  }

  return (
    <div className="resume-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2>📄 Resume Builder</h2>
          <p style={{ color: "#666", margin: 0 }}>
            Choose a template below to start customizing your resume.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {showUpload ? "✕ Cancel" : "⬆️ Upload Resume"}
        </button>
      </div>

      {showUpload && (
        <FileUpload
          type="resume"
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* Use your existing chooser, passing the handler */}
      <ResumeTemplateChooser onTemplateSelect={handleTemplateSelect} />
    </div>
  );
}
