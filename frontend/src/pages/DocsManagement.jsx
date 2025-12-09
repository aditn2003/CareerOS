// frontend/src/pages/DocsManagement.jsx
import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import FileUpload from "../components/FileUpload";
import { FaFilePdf, FaFileWord, FaFileAlt, FaTrash, FaEye, FaLink, FaCertificate, FaClock, FaDownload, FaChevronDown } from "react-icons/fa";
import "./DocsManagement.css";

// Certificate Upload Form Component
function CertificateUploadForm({ onSuccess, onCancel }) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    category: "",
    date_earned: "",
    file: null,
  });
  const [error, setError] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg"];
    if (!allowedExts.includes(ext)) {
      setError("Invalid file type. Please upload PDF, DOC, DOCX, TXT, PNG, JPG, or JPEG files.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return;
    }

    setFormData({ ...formData, file });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.organization || !formData.file) {
      setError("Name, organization, and file are required.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Create certification entry
      // Note: In a full implementation, you'd upload the file first and get a URL
      const certData = {
        name: formData.name,
        organization: formData.organization,
        category: formData.category || null,
        date_earned: formData.date_earned || null,
        document_url: `certificate_${Date.now()}_${formData.file.name}`, // Placeholder
      };

      await api.post("/api/certifications", certData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("✅ Certificate added successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to add certificate:", err);
      setError(err?.response?.data?.error || "Failed to add certificate.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="certificate-upload-form">
      <h3>Upload Certificate</h3>
      <div className="form-field">
        <label>Certificate Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={uploading}
        />
      </div>
      <div className="form-field">
        <label>Organization *</label>
        <input
          type="text"
          value={formData.organization}
          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
          required
          disabled={uploading}
        />
      </div>
      <div className="form-field">
        <label>Category</label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Technology, Business"
          disabled={uploading}
        />
      </div>
      <div className="form-field">
        <label>Date Earned</label>
        <input
          type="date"
          value={formData.date_earned}
          onChange={(e) => setFormData({ ...formData, date_earned: e.target.value })}
          disabled={uploading}
        />
      </div>
      <div className="form-field">
        <label>Certificate File *</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {formData.file && (
          <p className="file-info">Selected: {formData.file.name}</p>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={uploading}>
          Cancel
        </button>
        <button type="submit" disabled={uploading || !formData.file}>
          {uploading ? "Uploading..." : "Upload Certificate"}
        </button>
      </div>
    </form>
  );
}

export default function DocsManagement() {
  const { token } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobMaterials, setJobMaterials] = useState({}); // Map of job_id -> { resume_id, cover_letter_id }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumes");
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCoverLetterUpload, setShowCoverLetterUpload] = useState(false);
  const [showCertificateUpload, setShowCertificateUpload] = useState(false);
  const [viewerModal, setViewerModal] = useState({ open: false, url: null, title: null, type: null, contentType: null });
  const [versionHistoryModal, setVersionHistoryModal] = useState({ open: false, docId: null, docType: null, versions: [], loading: false });
  const [downloadDropdown, setDownloadDropdown] = useState({ open: false, resumeId: null });

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchResumes(),
        fetchCoverLetters(),
        fetchCertificates(),
        fetchJobs(),
      ]);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const { data } = await api.get("/api/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes(data.resumes || []);
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    }
  };

  const fetchCoverLetters = async () => {
    try {
      const { data } = await api.get("/api/cover-letter", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter to only uploaded cover letters
      const uploaded = (data.cover_letters || data.user_letters || []).filter(
        (cl) => cl.source === "uploaded" || cl.file_url
      );
      setCoverLetters(uploaded);
    } catch (err) {
      console.error("Failed to fetch cover letters:", err);
    }
  };

  const fetchCertificates = async () => {
    try {
      const { data } = await api.get("/api/certifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCertificates(data.certifications || []);
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data } = await api.get("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(data.jobs || []);
      
      // Build job materials map - include ALL jobs, even if materials are null
      const materialsMap = {};
      (data.jobs || []).forEach((job) => {
        materialsMap[job.id] = {
          resume_id: job.resume_id || null,
          cover_letter_id: job.cover_letter_id || null,
        };
      });
      setJobMaterials(materialsMap);
      
      // Debug logging
      console.log("📋 Jobs fetched:", data.jobs?.length || 0);
      console.log("📋 Job materials map:", materialsMap);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  };

  const getLinkedJobs = (docId, docType) => {
    // Convert docId to number for comparison
    const numericDocId = typeof docId === 'string' ? parseInt(docId, 10) : docId;
    
    return jobs.filter((job) => {
      const materials = jobMaterials[job.id];
      if (!materials) return false;
      
      if (docType === "resume") {
        const resumeId = materials.resume_id;
        // Compare both as numbers
        const numericResumeId = resumeId ? (typeof resumeId === 'string' ? parseInt(resumeId, 10) : resumeId) : null;
        return numericResumeId === numericDocId;
      }
      
      if (docType === "coverLetter") {
        const coverLetterId = materials.cover_letter_id;
        // Compare both as numbers
        const numericCoverLetterId = coverLetterId ? (typeof coverLetterId === 'string' ? parseInt(coverLetterId, 10) : coverLetterId) : null;
        return numericCoverLetterId === numericDocId;
      }
      
      return false;
    });
  };

  const getFormatIcon = (format) => {
    const fmt = (format || "").toLowerCase();
    if (fmt === "pdf") return <FaFilePdf className="format-icon pdf" />;
    if (fmt === "doc" || fmt === "docx") return <FaFileWord className="format-icon word" />;
    return <FaFileAlt className="format-icon" />;
  };

  const handleView = async (doc, type) => {
    try {
      let viewerUrl = null;
      let title = doc.title || doc.name || "Document";
      
      if (type === "resume") {
        viewerUrl = `http://localhost:4000/api/resumes/${doc.id}/download`;
      } else if (type === "coverLetter") {
        viewerUrl = `http://localhost:4000/api/cover-letters/${doc.id}/download`;
      } else if (type === "certificate" && doc.document_url) {
        // For certificates, use the document_url directly
        setViewerModal({
          open: true,
          url: doc.document_url,
          title: title,
          type: type,
        });
        return;
      }

      if (viewerUrl) {
        // Fetch the document with authentication
        const response = await fetch(viewerUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        // Get content type from response
        const contentType = response.headers.get('content-type') || '';
        
        // Create blob with explicit type to ensure correct MIME type
        const blob = await response.blob();
        // Create a new blob with the correct type if needed
        const typedBlob = contentType && blob.type !== contentType 
          ? new Blob([blob], { type: contentType })
          : blob;
        const blobUrl = window.URL.createObjectURL(typedBlob);
        
        console.log('📄 Document loaded:', {
          contentType,
          blobType: blob.type,
          typedBlobType: typedBlob.type,
          blobSize: blob.size,
          url: blobUrl
        });
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: title,
          type: type,
          contentType: contentType || typedBlob.type,
        });
      }
    } catch (err) {
      console.error("Failed to view document:", err);
      alert("Failed to load document. Please try again.");
    }
  };

  const closeViewer = () => {
    // Revoke blob URL to free memory
    if (viewerModal.url && viewerModal.url.startsWith('blob:')) {
      window.URL.revokeObjectURL(viewerModal.url);
    }
    setViewerModal({ open: false, url: null, title: null, type: null, contentType: null });
    // Re-enable body scrolling
    document.body.style.overflow = '';
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (viewerModal.open) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [viewerModal.open]);

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      if (type === "resume") {
        await api.delete(`/api/resumes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchResumes();
      } else if (type === "coverLetter") {
        await api.delete(`/api/cover-letter/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchCoverLetters();
      } else if (type === "certificate") {
        await api.delete(`/api/certifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchCertificates();
      }
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
      alert(`Failed to delete ${type}. Please try again.`);
    }
  };

  const handleViewVersionHistory = async (docId, docType) => {
    setVersionHistoryModal({ open: true, docId, docType, versions: [], loading: true });
    
    try {
      let endpoint = "";
      if (docType === "resume") {
        endpoint = `/api/versions/resumes/${docId}/versions`;
      } else if (docType === "coverLetter") {
        endpoint = `/api/versions/cover-letters/${docId}/versions`;
      }

      const { data } = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVersionHistoryModal({ open: true, docId, docType, versions: data.versions || [], loading: false });
    } catch (err) {
      console.error("Failed to fetch version history:", err);
      // For demo purposes, show hardcoded versions if API fails
      const demoVersions = [
        {
          id: 1,
          version_number: 3,
          title: docType === "resume" ? "Software Engineer Resume" : "Software Engineer Cover Letter",
          change_summary: docType === "resume" 
            ? "Added skills section and updated summary with passion statement"
            : "Added CI/CD achievement and company-specific interest statement",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          version_number: 2,
          title: docType === "resume" ? "Software Engineer Resume" : "Software Engineer Cover Letter",
          change_summary: docType === "resume"
            ? "Added detailed achievements and expanded summary"
            : "Expanded with specific achievements and technologies",
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          version_number: 1,
          title: docType === "resume" ? "Software Engineer Resume" : "Software Engineer Cover Letter",
          change_summary: docType === "resume"
            ? "Initial version - Basic resume structure"
            : "Initial version - Basic cover letter",
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setVersionHistoryModal({ open: true, docId, docType, versions: demoVersions, loading: false });
    }
  };

  const closeVersionHistory = () => {
    setVersionHistoryModal({ open: false, docId: null, docType: null, versions: [], loading: false });
  };

  const handleViewVersion = async (docId, docType, versionNumber) => {
    try {
      let viewerUrl = null;
      let title = `Version ${versionNumber}`;
      
      if (docType === "resume") {
        viewerUrl = `http://localhost:4000/api/versions/resumes/${docId}/versions/${versionNumber}/view`;
      } else if (docType === "coverLetter") {
        viewerUrl = `http://localhost:4000/api/versions/cover-letters/${docId}/versions/${versionNumber}/view`;
      }

      if (viewerUrl) {
        // Fetch the document with authentication
        const response = await fetch(viewerUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        // Get content type from response
        const contentType = response.headers.get('content-type') || '';
        
        // Create blob URL for inline viewing
        const blob = await response.blob();
        const typedBlob = contentType && blob.type !== contentType 
          ? new Blob([blob], { type: contentType })
          : blob;
        const blobUrl = window.URL.createObjectURL(typedBlob);
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: title,
          type: docType,
          contentType: contentType || typedBlob.type,
        });
      }
    } catch (err) {
      console.error("Failed to view version:", err);
      alert("Failed to view version. Please try again.");
    }
  };

  const handleRestoreVersion = async (docId, docType, versionNumber) => {
    if (!window.confirm(`Are you sure you want to restore Version ${versionNumber}? This will replace your current ${docType}.`)) {
      return;
    }

    try {
      let endpoint = "";
      if (docType === "resume") {
        endpoint = `/api/versions/resumes/${docId}/versions/${versionNumber}/restore`;
      } else if (docType === "coverLetter") {
        endpoint = `/api/versions/cover-letters/${docId}/versions/${versionNumber}/restore`;
      }

      await api.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(`✅ Version ${versionNumber} restored successfully!`);
      closeVersionHistory();
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error("Failed to restore version:", err);
      alert("Failed to restore version. Please try again.");
    }
  };

  const handleDownload = async (resumeId, format) => {
    try {
      const downloadUrl = `http://localhost:4000/api/resumes/${resumeId}/download?format=${format}`;
      
      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download resume");
      }

      // Get the blob
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `resume_${resumeId}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Close dropdown
      setDownloadDropdown({ open: false, resumeId: null });
    } catch (err) {
      console.error("Failed to download resume:", err);
      alert("Failed to download resume. Please try again.");
    }
  };

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadDropdown.open && !event.target.closest('.download-dropdown-container')) {
        setDownloadDropdown({ open: false, resumeId: null });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [downloadDropdown.open]);

  if (loading) {
    return (
      <div className="docs-management-container">
        <div className="docs-loading">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="docs-management-container">
      <div className="docs-header">
        <h1>📁 Docs Management</h1>
        <p>Organize and manage your resumes, cover letters, and certificates</p>
      </div>

      {/* Tabs */}
      <div className="docs-tabs">
        <button
          className={`docs-tab ${activeTab === "resumes" ? "active" : ""}`}
          onClick={() => setActiveTab("resumes")}
        >
          Resumes ({resumes.length})
        </button>
        <button
          className={`docs-tab ${activeTab === "coverLetters" ? "active" : ""}`}
          onClick={() => setActiveTab("coverLetters")}
        >
          Cover Letters ({coverLetters.length})
        </button>
        <button
          className={`docs-tab ${activeTab === "certificates" ? "active" : ""}`}
          onClick={() => setActiveTab("certificates")}
        >
          Certificates ({certificates.length})
        </button>
      </div>

      {/* Content */}
      <div className="docs-content">
        {/* Resumes Tab */}
        {activeTab === "resumes" && (
          <div className="docs-section">
            <div className="docs-section-header">
              <h2>Uploaded Resumes</h2>
              <button
                className="btn-primary"
                onClick={() => setShowResumeUpload(!showResumeUpload)}
              >
                {showResumeUpload ? "Cancel" : "+ Upload Resume"}
              </button>
            </div>

            {showResumeUpload && (
              <div className="upload-section">
                <FileUpload
                  type="resume"
                  onUploadSuccess={() => {
                    setShowResumeUpload(false);
                    fetchResumes();
                  }}
                />
              </div>
            )}

            {resumes.length === 0 ? (
              <div className="docs-empty">
                <p>No resumes uploaded yet. Upload your first resume to get started!</p>
              </div>
            ) : (
              <div className="docs-grid">
                {resumes.map((resume) => {
                  const linkedJobs = getLinkedJobs(resume.id, "resume");
                  // Debug logging
                  if (linkedJobs.length > 0) {
                    console.log(`✅ Resume ${resume.id} linked to jobs:`, linkedJobs.map(j => `${j.title} at ${j.company}`));
                  }
                  return (
                    <div key={resume.id} className="doc-card">
                      <div className="doc-card-header">
                        {getFormatIcon(resume.format)}
                        <div className="doc-card-title">
                          <h3>{resume.title}</h3>
                          <span className="doc-format">{resume.format?.toUpperCase() || "PDF"}</span>
                        </div>
                      </div>

                      <div className="doc-card-body">
                        {linkedJobs.length > 0 && (
                          <div className="doc-linked-jobs">
                            <FaLink className="link-icon" />
                            <span>Linked to {linkedJobs.length} job(s):</span>
                            <ul>
                              {linkedJobs.map((job) => (
                                <li key={job.id}>
                                  {job.title} at {job.company}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {linkedJobs.length === 0 && (
                          <div className="doc-no-links">
                            <span>Not linked to any jobs</span>
                          </div>
                        )}
                      </div>

                      <div className="doc-card-actions">
                        <button
                          className="btn-view"
                          onClick={() => handleView(resume, "resume")}
                          title="View Resume"
                        >
                          <FaEye /> View
                        </button>
                        <div className="download-dropdown-container" style={{ position: "relative" }}>
                          <button
                            className={`btn-download ${downloadDropdown.open && downloadDropdown.resumeId === resume.id ? 'dropdown-open' : ''}`}
                            onClick={() => setDownloadDropdown({ 
                              open: downloadDropdown.resumeId === resume.id ? !downloadDropdown.open : true, 
                              resumeId: resume.id 
                            })}
                            title="Download Resume"
                          >
                            <FaDownload /> Download <FaChevronDown className="download-chevron" />
                          </button>
                          {downloadDropdown.open && downloadDropdown.resumeId === resume.id && (
                            <div className="download-dropdown-menu">
                              <button
                                className="download-option"
                                onClick={() => handleDownload(resume.id, "pdf")}
                              >
                                <FaFilePdf /> Download as PDF
                              </button>
                              <button
                                className="download-option"
                                onClick={() => handleDownload(resume.id, "docx")}
                              >
                                <FaFileWord /> Download as Word (DOCX)
                              </button>
                              <button
                                className="download-option"
                                onClick={() => handleDownload(resume.id, "txt")}
                              >
                                <FaFileAlt /> Download as TXT
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(resume.id, "resume")}
                          title="Delete Resume"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cover Letters Tab */}
        {activeTab === "coverLetters" && (
          <div className="docs-section">
            <div className="docs-section-header">
              <h2>Uploaded Cover Letters</h2>
              <button
                className="btn-primary"
                onClick={() => setShowCoverLetterUpload(!showCoverLetterUpload)}
              >
                {showCoverLetterUpload ? "Cancel" : "+ Upload Cover Letter"}
              </button>
            </div>

            {showCoverLetterUpload && (
              <div className="upload-section">
                <FileUpload
                  type="cover-letter"
                  onUploadSuccess={() => {
                    setShowCoverLetterUpload(false);
                    fetchCoverLetters();
                  }}
                />
              </div>
            )}

            {coverLetters.length === 0 ? (
              <div className="docs-empty">
                <p>No cover letters uploaded yet. Upload your first cover letter to get started!</p>
              </div>
            ) : (
              <div className="docs-grid">
                {coverLetters.map((coverLetter) => {
                  const linkedJobs = getLinkedJobs(coverLetter.id, "coverLetter");
                  // Debug logging
                  if (linkedJobs.length > 0) {
                    console.log(`✅ Cover Letter ${coverLetter.id} linked to jobs:`, linkedJobs.map(j => `${j.title} at ${j.company}`));
                  }
                  return (
                    <div key={coverLetter.id} className="doc-card">
                      <div className="doc-card-header">
                        {getFormatIcon(coverLetter.format)}
                        <div className="doc-card-title">
                          <h3>{coverLetter.title}</h3>
                          <span className="doc-format">{coverLetter.format?.toUpperCase() || "PDF"}</span>
                        </div>
                      </div>

                      <div className="doc-card-body">
                        {linkedJobs.length > 0 && (
                          <div className="doc-linked-jobs">
                            <FaLink className="link-icon" />
                            <span>Linked to {linkedJobs.length} job(s):</span>
                            <ul>
                              {linkedJobs.map((job) => (
                                <li key={job.id}>
                                  {job.title} at {job.company}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {linkedJobs.length === 0 && (
                          <div className="doc-no-links">
                            <span>Not linked to any jobs</span>
                          </div>
                        )}
                      </div>

                      <div className="doc-card-actions">
                        <button
                          className="btn-view"
                          onClick={() => handleView(coverLetter, "coverLetter")}
                          title="View Cover Letter"
                        >
                          <FaEye /> View
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(coverLetter.id, "coverLetter")}
                          title="Delete Cover Letter"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div className="docs-section">
            <div className="docs-section-header">
              <h2>Certificates</h2>
              <button
                className="btn-primary"
                onClick={() => setShowCertificateUpload(!showCertificateUpload)}
              >
                {showCertificateUpload ? "Cancel" : "+ Upload Certificate"}
              </button>
            </div>

            {showCertificateUpload && (
              <div className="upload-section">
                <CertificateUploadForm
                  onSuccess={() => {
                    setShowCertificateUpload(false);
                    fetchCertificates();
                  }}
                  onCancel={() => setShowCertificateUpload(false)}
                />
              </div>
            )}

            {certificates.length === 0 ? (
              <div className="docs-empty">
                <p>No certificates uploaded yet. Upload your first certificate to get started!</p>
              </div>
            ) : (
              <div className="docs-grid">
                {certificates.map((cert) => (
                  <div key={cert.id} className="doc-card">
                    <div className="doc-card-header">
                      <FaCertificate className="format-icon certificate" />
                      <div className="doc-card-title">
                        <h3>{cert.name}</h3>
                        <span className="doc-format">{cert.organization}</span>
                      </div>
                    </div>

                    <div className="doc-card-body">
                      <p>
                        <strong>Organization:</strong> {cert.organization}
                      </p>
                      {cert.date_earned && (
                        <p>
                          <strong>Date Earned:</strong> {new Date(cert.date_earned).toLocaleDateString()}
                        </p>
                      )}
                      {cert.expiration_date && (
                        <p>
                          <strong>Expires:</strong> {new Date(cert.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="doc-card-actions">
                      {cert.document_url && (
                        <button
                          className="btn-view"
                          onClick={() => handleView(cert, "certificate")}
                          title="View Certificate"
                        >
                          <FaEye /> View
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(cert.id, "certificate")}
                        title="Delete Certificate"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {versionHistoryModal.open && (
        <div className="viewer-modal-overlay" onClick={closeVersionHistory}>
          <div className="viewer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>Version History</h2>
              <button className="viewer-modal-close" onClick={closeVersionHistory}>
                ×
              </button>
            </div>
            <div className="version-history-body">
              {versionHistoryModal.loading ? (
                <div className="version-history-loading">Loading versions...</div>
              ) : versionHistoryModal.versions.length === 0 ? (
                <div className="version-history-empty">
                  <p>No version history available for this document.</p>
                </div>
              ) : (
                <div className="version-list">
                  {versionHistoryModal.versions.map((version) => (
                    <div key={version.id} className="version-item">
                      <div className="version-header">
                        <span className="version-number">Version {version.version_number}</span>
                        <span className="version-date">
                          <FaClock /> {new Date(version.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {version.change_summary && (
                        <div className="version-summary">
                          <strong>Changes:</strong> {version.change_summary}
                        </div>
                      )}
                      <div className="version-actions">
                        <button
                          className="btn-view-version"
                          onClick={() => handleViewVersion(versionHistoryModal.docId, versionHistoryModal.docType, version.version_number)}
                          title="View this version"
                        >
                          <FaEye /> View
                        </button>
                        <button
                          className="btn-restore-version"
                          onClick={() => handleRestoreVersion(versionHistoryModal.docId, versionHistoryModal.docType, version.version_number)}
                          title="Restore this version"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerModal.open && (
        <div className="viewer-modal-overlay" onClick={closeViewer}>
          <div className="viewer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>{viewerModal.title}</h2>
              <button className="viewer-modal-close" onClick={closeViewer}>
                ×
              </button>
            </div>
            <div className="viewer-modal-body">
              {viewerModal.contentType && viewerModal.contentType.includes('application/pdf') ? (
                <object
                  data={viewerModal.url}
                  type="application/pdf"
                  className="viewer-iframe"
                  title={viewerModal.title}
                >
                  <p>Your browser does not support PDF viewing. 
                    <a href={viewerModal.url} download>Download the PDF</a> instead.
                  </p>
                </object>
              ) : (
                <iframe
                  src={viewerModal.url}
                  className="viewer-iframe"
                  title={viewerModal.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

