// frontend/src/components/FileUpload.jsx
// Reusable file upload component for resumes and cover letters

import React, { useState } from "react";
import { api } from "../api";
import "./FileUpload.css";

export default function FileUpload({ 
  type = "resume", // "resume" or "cover-letter"
  onUploadSuccess,
  onUploadError,
  className = ""
}) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");

  const acceptedTypes = type === "resume" 
    ? ".pdf,.doc,.docx,.txt"
    : ".pdf,.doc,.docx,.txt";

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["pdf", "doc", "docx", "txt"];
    if (!allowedExts.includes(ext)) {
      setError("Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return;
    }

    setSelectedFile(file);
    setError("");
    
    // Auto-fill title if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const endpoint = type === "resume" 
        ? "/api/upload/resume"
        : "/api/upload/cover-letter";

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }

      // Reset form
      setSelectedFile(null);
      setTitle("");
      const fileInput = document.getElementById(`file-input-${type}`);
      if (fileInput) fileInput.value = "";

      alert(`✅ ${type === "resume" ? "Resume" : "Cover letter"} uploaded successfully!`);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || "Failed to upload file.";
      setError(errorMsg);
      if (onUploadError) {
        onUploadError(err);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleViewFile = () => {
    if (!selectedFile) return;
    const fileUrl = URL.createObjectURL(selectedFile);
    window.open(fileUrl, "_blank");
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <div className="file-upload-header">
        <h3>Upload {type === "resume" ? "Resume" : "Cover Letter"}</h3>
        <p className="file-upload-subtitle">
          Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
        </p>
      </div>

      <div className="file-upload-form">
        <div className="file-upload-field">
          <label htmlFor={`file-input-${type}`} className="file-upload-label">
            <span className="file-upload-icon">📄</span>
            <span className="file-upload-text">
              {selectedFile ? selectedFile.name : "Choose File"}
            </span>
            <input
              id={`file-input-${type}`}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              className="file-upload-input"
              disabled={uploading}
            />
          </label>
        </div>

        {selectedFile && (
          <div className="file-upload-preview">
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <button
              type="button"
              onClick={handleViewFile}
              className="btn-view-file"
              disabled={uploading}
            >
              👁️ Preview
            </button>
          </div>
        )}

        <div className="file-upload-field">
          <label htmlFor={`title-input-${type}`}>Title (Optional)</label>
          <input
            id={`title-input-${type}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Enter ${type === "resume" ? "resume" : "cover letter"} title...`}
            className="file-upload-title-input"
            disabled={uploading}
          />
        </div>

        {error && <div className="file-upload-error">{error}</div>}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="btn-upload-file"
        >
          {uploading ? "⏳ Uploading..." : "⬆️ Upload File"}
        </button>
      </div>
    </div>
  );
}

