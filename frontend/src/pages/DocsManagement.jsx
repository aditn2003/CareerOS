// frontend/src/pages/DocsManagement.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";

// Get API base URL for direct fetch calls
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 
    (window.location.hostname === "localhost" ? "http://localhost:4000" : "http://backend:4000");
};
import { useAuth } from "../contexts/AuthContext";
import FileUpload from "../components/FileUpload";
import { FaFilePdf, FaFileWord, FaFileAlt, FaTrash, FaEye, FaLink, FaCertificate, FaClock, FaDownload, FaChevronDown, FaMagic, FaCodeBranch, FaCopy, FaExchangeAlt, FaStar, FaArchive, FaTimes, FaCheck, FaPlus, FaExternalLinkAlt } from "react-icons/fa";
import EditableResumeForm from "../components/EditableResumeForm";
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
  const navigate = useNavigate();
  const location = useLocation();
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
  const [optimizingResume, setOptimizingResume] = useState(null);
  
  // Version Control Modals
  const [versionControlModal, setVersionControlModal] = useState({ open: false, docId: null, docTitle: null, docType: null });
  const [createVersionModal, setCreateVersionModal] = useState({ open: false, docId: null, docType: null, editingVersion: null, versionData: null });
  const [compareVersionsModal, setCompareVersionsModal] = useState({ open: false, docId: null, docType: null, version1: null, version2: null });
  const [mergeVersionsModal, setMergeVersionsModal] = useState({ open: false, docId: null, docType: null, sourceVersion: null, targetVersion: null });
  const [linkJobModal, setLinkJobModal] = useState({ open: false, docId: null, docType: null, versionNumber: null });

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Refresh data when navigating back from optimize flow
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('refresh') === 'true' || location.state?.refresh) {
      fetchAllData();
      // Clean up URL
      navigate('/docs-management', { replace: true });
    }
  }, [location.search, location.state]);

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
      // Combine cover letters from both tables (uploaded_cover_letters and cover_letters)
      // The API returns cover_letters array with both types, and cover_letters_legacy for reference
      const allCoverLetters = data.cover_letters || [];
      
      // Also include legacy cover_letters if they're separate and not already included
      if (data.cover_letters_legacy && data.cover_letters_legacy.length > 0) {
        const existingIds = new Set(allCoverLetters.map(cl => cl.id));
        const additional = data.cover_letters_legacy.filter(cl => !existingIds.has(cl.id));
        allCoverLetters.push(...additional);
      }
      
      // Include all cover letters (both uploaded and from cover_letters table)
      // Filter out templates if any
      const userCoverLetters = allCoverLetters.filter(
        (cl) => cl.source !== "template" && (cl.source === "uploaded" || cl.source === "cover_letters" || !cl.source)
      );
      
      setCoverLetters(userCoverLetters);
      console.log(`📋 [DOCS MANAGEMENT] Loaded ${userCoverLetters.length} cover letters (from both tables)`);
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
      // Log jobs with resume links for debugging
      const jobsWithResumes = (data.jobs || []).filter(j => j.resume_id);
      console.log(`📋 Jobs with resume links: ${jobsWithResumes.length}`, jobsWithResumes.map(j => ({ jobId: j.id, jobTitle: j.title, resumeId: j.resume_id })));
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
      
      const apiBaseUrl = getApiBaseUrl();
      
      if (type === "resume") {
        viewerUrl = `${apiBaseUrl}/api/resumes/${doc.id}/download`;
      } else if (type === "coverLetter") {
        // Use view=true query parameter to get inline content instead of download
        // Try singular route first (both routes are registered in backend)
        viewerUrl = `${apiBaseUrl}/api/cover-letter/${doc.id}/download?view=true`;
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
        console.log('🔍 Fetching document:', viewerUrl);
        
        // Fetch the document with authentication
        let response = await fetch(viewerUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // If singular route fails, try plural route for cover letters
        if (!response.ok && type === "coverLetter") {
          console.log('⚠️ Singular route failed, trying plural route...');
          const apiBaseUrl = getApiBaseUrl();
          const pluralUrl = `${apiBaseUrl}/api/cover-letters/${doc.id}/download?view=true`;
          response = await fetch(pluralUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch document:', response.status, errorText);
          throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
        }

        // Get content type from response
        const contentType = response.headers.get('content-type') || '';
        const format = doc.format?.toLowerCase() || '';
        
        console.log('📄 Document response:', {
          contentType,
          format,
          status: response.status,
          docFormat: doc.format,
          headers: Object.fromEntries(response.headers.entries())
        });
        
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
          url: blobUrl,
          format
        });
        
        // All files should proceed to viewer - backend will convert DOCX to PDF if needed
        // The backend handles DOCX to PDF conversion when view=true is used
        
        // PDFs and other viewable files should proceed to viewer
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: title,
          type: type,
          contentType: contentType || typedBlob.type,
        });
      }
    } catch (err) {
      console.error("❌ Failed to view document:", err);
      alert(`Failed to load document: ${err.message || 'Please try again.'}`);
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

  const handleAIOptimize = async (resumeId) => {
    try {
      setOptimizingResume(resumeId);
      
      // Fetch the resume with sections
      const { data } = await api.get(`/api/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const resume = data.resume;
      
      // Check if resume has sections (parsed resume)
      if (!resume.sections || Object.keys(resume.sections || {}).length === 0) {
        // If no sections, try to import/parse the resume first
        if (resume.file_url) {
          alert("This resume needs to be parsed first. Please use 'View in Editor' to parse it, then try AI Optimize again.");
          setOptimizingResume(null);
          return;
        } else {
          alert("This resume doesn't have sections data. Please use 'View in Editor' to set it up first.");
          setOptimizingResume(null);
          return;
        }
      }
      
      // Navigate to optimize page with resume data
      navigate("/resume/optimize", {
        state: {
          sections: resume.sections || {},
          resumeTitle: resume.title || "Untitled Resume",
          selectedTemplate: resume.template_id ? { id: resume.template_id } : {},
        },
      });
    } catch (err) {
      console.error("❌ Error loading resume for AI optimization:", err);
      alert("Failed to load resume for optimization. Please try again.");
    } finally {
      setOptimizingResume(null);
    }
  };

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

  const handleViewVersionHistory = async (docId, docType, openModal = false) => {
    setVersionHistoryModal({ open: openModal, docId, docType, versions: [], loading: true });
    
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

      // Get versions as resume records from local state (for additional data like resume_id)
      // Only for resumes, not cover letters
      let versionResumes = [];
      if (docType === "resume") {
        versionResumes = resumes.filter(r => r.original_resume_id === docId && r.is_version);
      }
      
      // Merge API versions with resume records to get full data
      const apiVersions = data.versions || [];
      
      // Filter out version 0 or null (original document should not be in versions list)
      const filteredApiVersions = apiVersions.filter(v => v.version_number != null && v.version_number !== 0);
      
      const mergedVersions = filteredApiVersions.map(version => {
        // Find matching resume record if it exists (only for resumes)
        if (docType === "resume") {
          const matchingResume = versionResumes.find(r => r.version_number === version.version_number);
          if (matchingResume) {
            return {
              ...version,
              resume_id: matchingResume.id, // The actual resume ID
              sections: matchingResume.sections || version.sections,
              file_url: matchingResume.file_url || version.file_url,
              format: matchingResume.format || version.format,
              title: matchingResume.title || version.title,
              created_at: matchingResume.created_at || version.created_at
            };
          }
        }
        return version;
      }).sort((a, b) => (a.version_number || 0) - (b.version_number || 0));

      // Also include any versions from resumes table that might not be in API response (only for resumes)
      if (docType === "resume") {
        versionResumes.forEach(resume => {
          // Skip version 0 or null
          if (!resume.version_number || resume.version_number === 0) return;
          
          const exists = mergedVersions.find(v => v.version_number === resume.version_number);
          if (!exists) {
            mergedVersions.push({
              id: resume.id,
              resume_id: resume.id,
              version_number: resume.version_number,
              title: resume.title,
              sections: resume.sections,
              format: resume.format,
              file_url: resume.file_url,
              is_default: resume.is_default,
              created_at: resume.created_at,
              description: null,
              change_summary: null,
              job_id: null,
              is_archived: false
            });
          }
        });
      }

      // Sort again after adding any missing versions
      mergedVersions.sort((a, b) => (a.version_number || 0) - (b.version_number || 0));

      console.log(`📋 [FRONTEND] Version history for resume ${docId}:`, {
        apiVersions: apiVersions.length,
        versionResumes: versionResumes.length,
        mergedVersions: mergedVersions.length,
        versionNumbers: mergedVersions.map(v => v.version_number)
      });

      setVersionHistoryModal(prev => ({ ...prev, versions: mergedVersions, loading: false }));
    } catch (err) {
      console.error("Failed to fetch version history:", err);
      // Try to get versions from resume records (only for resumes)
      if (docType === "resume") {
        try {
          const versionResumes = resumes.filter(r => r.original_resume_id === docId && r.is_version);
          // Filter out version 0 or null
          const filteredVersions = versionResumes
            .filter(r => r.version_number != null && r.version_number !== 0)
            .map(resume => ({
              ...resume,
              resume_id: resume.id,
              version_number: resume.version_number,
              title: resume.title,
              sections: resume.sections,
              created_at: resume.created_at
            }))
            .sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
          setVersionHistoryModal(prev => ({ ...prev, versions: filteredVersions, loading: false }));
        } catch (fallbackErr) {
          console.error("Fallback version fetch failed:", fallbackErr);
        }
      } else {
        setVersionHistoryModal(prev => ({ ...prev, versions: [], loading: false }));
      }
      
      // For demo purposes, show hardcoded versions if API fails (only for resumes)
      if (docType === "resume") {
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
        setVersionHistoryModal(prev => ({ ...prev, versions: demoVersions, loading: false }));
      }
    }
  };

  const closeVersionHistory = () => {
    setVersionHistoryModal({ open: false, docId: null, docType: null, versions: [], loading: false });
  };

  const handleViewVersion = async (docId, versionNumber, docType = "resume") => {
    try {
      if (docType === "coverLetter") {
        // For cover letters, use the version view endpoint
        const viewerUrl = `${getApiBaseUrl()}/api/versions/cover-letters/${docId}/versions/${versionNumber}/view`;
        const response = await fetch(viewerUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        const contentType = response.headers.get('content-type') || 'application/pdf';
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: `Version ${versionNumber}`,
          type: "coverLetter",
          contentType: contentType,
        });
        return;
      }

      // Find the resume record for this version
      // Versions are now actual resume records, so we need to find the resume with this version_number and original_resume_id
      let versionResume = resumes.find(r => 
        r.original_resume_id === docId && r.version_number === versionNumber
      );

      // If not found locally, try to fetch it from the API
      if (!versionResume) {
        try {
          const { data } = await api.get(`/api/resumes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          versionResume = (data.resumes || []).find(r => 
            r.original_resume_id === docId && r.version_number === versionNumber
          );
        } catch (err) {
          console.warn("Could not fetch resumes to find version:", err);
        }
      }

      if (versionResume) {
        // Use the resume download endpoint
        const apiBaseUrl = getApiBaseUrl();
        const viewerUrl = `${apiBaseUrl}/api/resumes/${versionResume.id}/download?format=pdf`;
        
        const response = await fetch(viewerUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        const contentType = response.headers.get('content-type') || 'application/pdf';
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: versionResume.title,
          type: "resume",
          contentType: contentType,
        });
      } else {
        // Fallback to version endpoint if not found as resume
        const apiBaseUrl = getApiBaseUrl();
        const viewerUrl = `${apiBaseUrl}/api/versions/resumes/${docId}/versions/${versionNumber}/view`;
        const response = await fetch(viewerUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        // Check if response is JSON (redirect info) or a file
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          // Backend returned redirect info, use the redirect URL
          const data = await response.json();
          if (data.redirect) {
            const apiBaseUrl = getApiBaseUrl();
            const redirectResponse = await fetch(`${apiBaseUrl}${data.redirect}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!redirectResponse.ok) {
              throw new Error("Failed to load document");
            }
            const redirectContentType = redirectResponse.headers.get('content-type') || 'application/pdf';
            const blob = await redirectResponse.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            setViewerModal({
              open: true,
              url: blobUrl,
              title: `Version ${versionNumber}`,
              type: "resume",
              contentType: redirectContentType,
            });
            return;
          }
        }

        // Response is a file
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        setViewerModal({
          open: true,
          url: blobUrl,
          title: `Version ${versionNumber}`,
          type: "resume",
          contentType: contentType || 'application/pdf',
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
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error("Failed to restore version:", err);
      alert("Failed to restore version. Please try again.");
    }
  };

  const handleOpenVersionControl = async (docId, docTitle, docType = "resume") => {
    setVersionControlModal({ open: true, docId, docTitle, docType });
    await handleViewVersionHistory(docId, docType);
  };

  const handleEditVersion = async (docId, docType, versionNumber) => {
    try {
      const endpoint = docType === "resume" 
        ? `/api/versions/resumes/${docId}/versions/${versionNumber}`
        : `/api/versions/cover-letters/${docId}/versions/${versionNumber}`;
      
      const { data } = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateVersionModal({ 
        open: true, 
        docId,
        docType,
        editingVersion: versionNumber,
        versionData: data.version 
      });
    } catch (err) {
      console.error("Failed to fetch version for editing:", err);
      alert("Failed to load version for editing. Please try again.");
    }
  };

  const handleCreateVersion = async (docId, docType, versionData) => {
    try {
      let endpoint;
      if (docType === "resume") {
        endpoint = createVersionModal.editingVersion 
          ? `/api/versions/resumes/${docId}/versions/${createVersionModal.editingVersion}/update`
          : `/api/versions/resumes/${docId}/create`;
      } else {
        // Cover letter - for now only support creating, not editing
        endpoint = `/api/versions/cover-letters/${docId}/create`;
      }
      
      const method = (createVersionModal.editingVersion && docType === "resume") ? 'put' : 'post';
      
      const { data } = await api[method](endpoint, versionData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(`✅ Version ${createVersionModal.editingVersion ? 'updated' : 'created'} successfully!`);
      setCreateVersionModal({ open: false, docId: null, docType: null, editingVersion: null, versionData: null });
      
      // Refresh data and version history
      if (docType === "resume") {
        await fetchResumes();
      } else {
        await fetchCoverLetters();
      }
      await handleViewVersionHistory(docId, docType);
    } catch (err) {
      console.error(`Failed to ${createVersionModal.editingVersion ? 'update' : 'create'} version:`, err);
      alert(`Failed to ${createVersionModal.editingVersion ? 'update' : 'create'} version. Please try again.`);
    }
  };

  const handleCompareVersions = async (resumeId, version1, version2) => {
    try {
      const { data } = await api.get(
        `/api/versions/resumes/${resumeId}/versions/${version1}/compare/${version2}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompareVersionsModal({ open: true, resumeId, version1, version2, comparison: data });
    } catch (err) {
      console.error("Failed to compare versions:", err);
      alert("Failed to compare versions. Please try again.");
    }
  };

  const handleMergeVersions = async (resumeId, sourceVersion, targetVersion, mergeStrategy, title, description) => {
    try {
      const { data } = await api.post(
        `/api/versions/resumes/${resumeId}/merge`,
        { source_version_number: sourceVersion, target_version_number: targetVersion, merge_strategy: mergeStrategy, title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Versions merged successfully!");
      setMergeVersionsModal({ open: false, resumeId: null, sourceVersion: null, targetVersion: null });
      await handleViewVersionHistory(resumeId, "resume");
    } catch (err) {
      console.error("Failed to merge versions:", err);
      alert("Failed to merge versions. Please try again.");
    }
  };

  const handleSetDefaultVersion = async (docId, versionNumber) => {
    try {
      await api.put(
        `/api/versions/resumes/${docId}/versions/${versionNumber}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Version set as default!");
      // Refresh resumes to show the default version
      await fetchResumes();
      await handleViewVersionHistory(docId, "resume");
    } catch (err) {
      console.error("Failed to set default version:", err);
      alert("Failed to set default version. Please try again.");
    }
  };

  const handleArchiveVersion = async (resumeId, versionNumber, archive) => {
    try {
      await api.put(
        `/api/versions/resumes/${resumeId}/versions/${versionNumber}/archive`,
        { archive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(archive ? "✅ Version archived!" : "✅ Version unarchived!");
      await handleViewVersionHistory(resumeId, "resume");
    } catch (err) {
      console.error("Failed to archive version:", err);
      alert("Failed to archive version. Please try again.");
    }
  };

  const handleDeleteVersion = async (docId, docType, versionNumber) => {
    if (!window.confirm(`Are you sure you want to permanently delete version ${versionNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      const endpoint = docType === "resume"
        ? `/api/versions/resumes/${docId}/versions/${versionNumber}`
        : `/api/versions/cover-letters/${docId}/versions/${versionNumber}`;
      
      await api.delete(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      alert("✅ Version deleted!");
      await handleViewVersionHistory(docId, docType);
    } catch (err) {
      console.error("Failed to delete version:", err);
      alert("Failed to delete version. Please try again.");
    }
  };

  const handleLinkVersionToJob = async (docId, docType, versionNumber, jobId) => {
    try {
      const endpoint = docType === "resume"
        ? `/api/versions/resumes/${docId}/versions/${versionNumber}/link-job`
        : null; // Cover letters don't have link-job endpoint yet
      
      if (!endpoint) {
        alert("Linking cover letter versions to jobs is not yet supported.");
        return;
      }
      
      await api.put(
        endpoint,
        { job_id: jobId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Version linked to job!");
      setLinkJobModal({ open: false, docId: null, docType: null, versionNumber: null });
      await handleViewVersionHistory(docId, docType);
    } catch (err) {
      console.error("Failed to link version to job:", err);
      alert("Failed to link version to job. Please try again.");
    }
  };

  const handlePublishVersion = async (docId, docType, versionNumber) => {
    const docTypeName = docType === "resume" ? "resume" : "cover letter";
    
    // Debug logging
    console.log('🔍 [PUBLISH] Publishing version:', { docId, docType, versionNumber });
    
    if (!window.confirm(`Publish this version as a standalone ${docTypeName}? It will be saved as a new ${docTypeName} in the ${docType === "resume" ? "Resumes" : "Cover Letters"} tab, preserving job links and version history.`)) {
      return;
    }

    try {
      const endpoint = docType === "resume"
        ? `/api/versions/resumes/${docId}/versions/${versionNumber}/publish`
        : `/api/versions/cover-letters/${docId}/versions/${versionNumber}/publish`;
      
      console.log('🔍 [PUBLISH] Calling endpoint:', endpoint);
      
      const response = await api.post(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('🔍 [PUBLISH] Response:', response.data);
      
      const newDoc = docType === "resume" ? response.data.resume : response.data.cover_letter;
      
      if (!newDoc) {
        console.error('❌ [PUBLISH] No document returned in response:', response.data);
        alert(`Failed to publish version: No ${docTypeName} returned from server.`);
        return;
      }
      
      alert(`✅ Version published! New ${docTypeName} "${newDoc.title}" has been created.`);
      
      // Refresh data
      await Promise.all([
        docType === "resume" ? fetchResumes() : fetchCoverLetters(),
        fetchJobs()
      ]);
      
      // Keep the version control modal open so user can see it's still in the list
      await handleViewVersionHistory(docId, docType);
    } catch (err) {
      console.error("❌ [PUBLISH] Failed to publish version:", err);
      console.error("❌ [PUBLISH] Error details:", err.response?.data);
      alert(`Failed to publish version: ${err.response?.data?.error || err.message || 'Please try again.'}`);
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
                  const isVersion = resume.is_version || resume.original_resume_id;
                  const originalResume = isVersion ? resumes.find(r => r.id === resume.original_resume_id) : null;
                  
                  // Check if this is a published resume (description or title contains "Published from")
                  const isPublished = (resume.description && resume.description.includes("Published from")) || 
                                     (resume.title && resume.title.includes("Published from"));
                  let publishedSource = null;
                  let publishedVersionNum = null;
                  if (isPublished) {
                    // Try to extract from description first (new format)
                    if (resume.description) {
                      const descMatch = resume.description.match(/Published from "(.+?)" - Version (\d+)/);
                      if (descMatch) {
                        publishedSource = descMatch[1];
                        publishedVersionNum = descMatch[2];
                      }
                    }
                    // Fallback to title parsing (old format)
                    if (!publishedSource && resume.title) {
                      const titleMatch = resume.title.match(/Published from (.+?) - Version (\d+)\)/);
                      if (titleMatch) {
                        publishedSource = titleMatch[1];
                        publishedVersionNum = titleMatch[2];
                      }
                    }
                    // Debug logging for published resumes (only log once per resume, not on every render)
                    // Removed excessive logging - uncomment if needed for debugging
                    // console.log(`📋 [PUBLISHED RESUME] ID: ${resume.id}, Description: ${resume.description}, Title: ${resume.title}, Linked Jobs: ${linkedJobs.length}`);
                  }
                  
                  return (
                    <div key={resume.id} className={`doc-card ${isVersion ? 'version-card' : ''} ${isPublished ? 'published-card' : ''}`}>
                      <div className="doc-card-header">
                        {getFormatIcon(resume.format)}
                        <div className="doc-card-title">
                          <h3>{resume.title?.replace(/\s*\(Published from .+?\)/, '') || resume.title}</h3>
                          {isVersion && originalResume && (
                            <span className="version-badge">Version {resume.version_number} of {originalResume.title}</span>
                          )}
                          {!isVersion && <span className="doc-format">{resume.format?.toUpperCase() || "PDF"}</span>}
                        </div>
                      </div>

                      <div className="doc-card-body">
                        {isVersion && originalResume && (
                          <div className="version-info">
                            <FaCodeBranch className="version-icon" />
                            <span>Version {resume.version_number} of <strong>{originalResume.title}</strong></span>
                          </div>
                        )}
                        {isPublished && publishedSource && (
                          <div className="published-info">
                            <FaExternalLinkAlt className="published-icon" />
                            <span>Published from <strong>{publishedSource}</strong> - Version {publishedVersionNum}</span>
                          </div>
                        )}
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
                        {linkedJobs.length === 0 && !isVersion && (
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
                        <button
                          className="btn-optimize"
                          onClick={() => handleAIOptimize(resume.id)}
                          disabled={optimizingResume === resume.id}
                          title="AI Optimize Resume"
                        >
                          <FaMagic /> {optimizingResume === resume.id ? "Loading..." : "Optimize"}
                        </button>
                        <button
                          className="btn-version-control"
                          onClick={() => handleOpenVersionControl(resume.id, resume.title, "resume")}
                          title="Version Control"
                        >
                          <FaCodeBranch /> Versions
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
              <h2>Cover Letters</h2>
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
                <p>No cover letters found. Upload your first cover letter to get started!</p>
              </div>
            ) : (
              <div className="docs-grid">
                {coverLetters.map((coverLetter) => {
                  const linkedJobs = getLinkedJobs(coverLetter.id, "coverLetter");
                  // Debug logging
                  if (linkedJobs.length > 0) {
                    console.log(`✅ Cover Letter ${coverLetter.id} linked to jobs:`, linkedJobs.map(j => `${j.title} at ${j.company}`));
                  }
                  
                  // Check if this is a published cover letter (description contains "Published from")
                  const isPublished = coverLetter.description && coverLetter.description.includes("Published from");
                  let publishedSource = null;
                  let publishedVersionNum = null;
                  if (isPublished) {
                    // Extract source from description: "Published from Original Title - Version X"
                    const match = coverLetter.description.match(/Published from "(.+?)" - Version (\d+)/);
                    if (match) {
                      publishedSource = match[1];
                      publishedVersionNum = match[2];
                    }
                    // Debug logging for published cover letters
                    console.log(`📋 [PUBLISHED COVER LETTER] ID: ${coverLetter.id}, Description: ${coverLetter.description}, Linked Jobs: ${linkedJobs.length}`);
                  }
                  
                  return (
                    <div key={coverLetter.id} className={`doc-card ${isPublished ? 'published-card' : ''}`}>
                      <div className="doc-card-header">
                        {getFormatIcon(coverLetter.format)}
                        <div className="doc-card-title">
                          <h3>{coverLetter.title}</h3>
                          <span className="doc-format">{coverLetter.format?.toUpperCase() || "PDF"}</span>
                        </div>
                      </div>

                      <div className="doc-card-body">
                        {isPublished && publishedSource && (
                          <div className="published-info">
                            <FaExternalLinkAlt className="published-icon" />
                            <span>Published from <strong>{publishedSource}</strong> - Version {publishedVersionNum}</span>
                          </div>
                        )}
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
                          className="btn-version-control"
                          onClick={() => handleOpenVersionControl(coverLetter.id, coverLetter.title, "coverLetter")}
                          title="Version Control"
                        >
                          <FaCodeBranch /> Versions
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
                  style={{ width: '100%', height: '100%', border: 'none' }}
                >
                  <p>Your browser does not support PDF viewing. 
                    <a href={viewerModal.url} download>Download the PDF</a> instead.
                  </p>
                </object>
              ) : viewerModal.contentType && viewerModal.contentType.includes('text/plain') ? (
                <iframe
                  src={viewerModal.url}
                  className="viewer-iframe"
                  title={viewerModal.title}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p>Preview not available for this file type.</p>
                  <a 
                    href={viewerModal.url} 
                    download 
                    style={{ 
                      display: 'inline-block', 
                      marginTop: '1rem', 
                      padding: '0.5rem 1rem', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '4px' 
                    }}
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Version Control Modal */}
      {versionControlModal.open && (
        <div className="viewer-modal-overlay" onClick={() => setVersionControlModal({ open: false, docId: null, docTitle: null, docType: null })}>
          <div className="viewer-modal-content version-control-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>Version Control - {versionControlModal.docTitle}</h2>
              <button className="viewer-modal-close" onClick={() => setVersionControlModal({ open: false, docId: null, docTitle: null, docType: null })}>
                ×
              </button>
            </div>
            <div className="version-control-body">
              <div className="version-control-actions-header">
                <button
                  className="btn-primary"
                  onClick={() => setCreateVersionModal({ open: true, docId: versionControlModal.docId, docType: versionControlModal.docType })}
                >
                  <FaPlus /> Create New Version
                </button>
              </div>

              {versionHistoryModal.loading ? (
                <div className="version-history-loading">Loading versions...</div>
              ) : versionHistoryModal.versions.length === 0 ? (
                <div className="version-history-empty">
                  <p>No versions yet. Create your first version to get started!</p>
                </div>
              ) : (
                <div className="version-list-enhanced">
                  {versionHistoryModal.versions.map((version) => (
                    <div key={version.id || version.resume_id} className={`version-item-enhanced ${version.is_default ? 'default-version' : ''}`}>
                      <div className="version-header-enhanced">
                        <div className="version-info">
                          <span className="version-number">Version {version.version_number}</span>
                          {version.is_default && <span className="default-badge"><FaStar /> Default</span>}
                          {version.job_id && (
                            <span className="job-linked-badge" title={version.job_title && version.job_company ? `${version.job_title} at ${version.job_company}` : 'Linked to Job'}>
                              <FaLink /> {version.job_title && version.job_company ? `${version.job_title} at ${version.job_company}` : 'Linked to Job'}
                            </span>
                          )}
                        </div>
                        <span className="version-date">
                          <FaClock /> {new Date(version.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="version-title">{version.title}</div>
                      <div className="version-original-info">
                        <FaCodeBranch /> Version of <strong>
                          {versionControlModal.docType === "resume" 
                            ? (resumes.find(r => r.id === versionControlModal.docId)?.title || 'Original Resume')
                            : (coverLetters.find(cl => cl.id === versionControlModal.docId)?.title || 'Original Cover Letter')
                          }
                        </strong>
                      </div>
                      {version.description && (
                        <div className="version-description">{version.description}</div>
                      )}
                      {version.change_summary && (
                        <div className="version-summary">
                          <strong>Summary:</strong> {version.change_summary}
                        </div>
                      )}
                      {version.tags && version.tags.length > 0 && (
                        <div className="version-tags">
                          {version.tags.map((tag, idx) => (
                            <span key={idx} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="version-actions-enhanced">
                        <button
                          className="btn-view-version"
                          onClick={() => {
                            const docType = versionControlModal.docType;
                            if (docType === "resume" && version.resume_id) {
                              handleView(resumes.find(r => r.id === version.resume_id), "resume");
                            } else if (docType === "coverLetter") {
                              // For cover letters, use the version view endpoint
                              const viewerUrl = `${getApiBaseUrl()}/api/versions/cover-letters/${versionControlModal.docId}/versions/${version.version_number}/view`;
                              fetch(viewerUrl, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                                .then(response => response.blob())
                                .then(blob => {
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  setViewerModal({
                                    open: true,
                                    url: blobUrl,
                                    title: version.title,
                                    type: "coverLetter",
                                    contentType: 'application/pdf',
                                  });
                                })
                                .catch(err => {
                                  console.error("Failed to view version:", err);
                                  alert("Failed to view version. Please try again.");
                                });
                            } else {
                              handleViewVersion(versionControlModal.docId, version.version_number);
                            }
                          }}
                          title="View this version"
                        >
                          <FaEye /> View
                        </button>
                        {versionControlModal.docType === "resume" && (
                          <button
                            className="btn-edit-version"
                            onClick={() => handleEditVersion(versionControlModal.docId, versionControlModal.docType, version.version_number)}
                            title="Edit this version"
                          >
                            <FaCopy /> Edit
                          </button>
                        )}
                        {!version.is_default && versionControlModal.docType === "resume" && (
                          <button
                            className="btn-set-default"
                            onClick={() => handleSetDefaultVersion(versionControlModal.docId, version.version_number)}
                            title="Set as default"
                          >
                            <FaStar /> Set Default
                          </button>
                        )}
                        {versionControlModal.docType === "resume" && (
                          <button
                            className="btn-link-job"
                            onClick={() => setLinkJobModal({ open: true, docId: versionControlModal.docId, docType: versionControlModal.docType, versionNumber: version.version_number })}
                            title="Link to job application"
                          >
                            <FaLink /> Link Job
                          </button>
                        )}
                        <button
                          className="btn-publish-version"
                          onClick={() => {
                            // Validate docType and version number
                            const docType = versionControlModal.docType;
                            const versionNum = version.version_number;
                            
                            console.log('🔍 [PUBLISH BUTTON] Clicked:', { 
                              docId: versionControlModal.docId, 
                              docType, 
                              versionNumber: versionNum,
                              version: version 
                            });
                            
                            // Don't allow publishing version 0 or null (original document)
                            if (!versionNum || versionNum === 0) {
                              alert('Cannot publish the original document. Please publish a specific version.');
                              return;
                            }
                            
                            if (!docType) {
                              console.error('❌ [PUBLISH] docType is missing!');
                              alert('Error: Document type is missing. Please try again.');
                              return;
                            }
                            
                            handlePublishVersion(versionControlModal.docId, docType, versionNum);
                          }}
                          title={`Publish as standalone ${versionControlModal.docType === "resume" ? "resume" : "cover letter"} (keeps job links and version history)`}
                        >
                          <FaExternalLinkAlt /> Publish
                        </button>
                        <button
                          className="btn-delete-version"
                          onClick={async () => {
                            const docType = versionControlModal.docType;
                            if (docType === "resume" && version.resume_id) {
                              if (window.confirm(`Are you sure you want to delete this version? This will permanently delete the resume.`)) {
                                try {
                                  await api.delete(`/api/resumes/${version.resume_id}`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  alert("✅ Version deleted!");
                                  await fetchResumes();
                                  await handleViewVersionHistory(versionControlModal.docId, docType);
                                } catch (err) {
                                  console.error("Failed to delete version resume:", err);
                                  alert("Failed to delete version. Please try again.");
                                }
                              }
                            } else {
                              handleDeleteVersion(versionControlModal.docId, docType, version.version_number);
                            }
                          }}
                          title="Delete permanently"
                        >
                          <FaTrash /> Delete
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

      {/* Create Version Modal */}
      {createVersionModal.open && (
        <div className="viewer-modal-overlay" onClick={() => setCreateVersionModal({ open: false, docId: null, docType: null })}>
          <div className="viewer-modal-content create-version-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>{createVersionModal.editingVersion ? `Edit Version ${createVersionModal.editingVersion}` : "Create New Version"}</h2>
              <button className="viewer-modal-close" onClick={() => setCreateVersionModal({ open: false, docId: null, docType: null, editingVersion: null, versionData: null })}>
                ×
              </button>
            </div>
            {createVersionModal.docType === "resume" ? (
              <CreateVersionForm
                resumeId={createVersionModal.docId}
                jobs={jobs}
                token={token}
                editingVersion={createVersionModal.editingVersion}
                versionData={createVersionModal.versionData}
                onSubmit={(data) => handleCreateVersion(createVersionModal.docId, createVersionModal.docType, data)}
                onCancel={() => setCreateVersionModal({ open: false, docId: null, docType: null, editingVersion: null, versionData: null })}
              />
            ) : (
              <CreateCoverLetterVersionForm
                coverLetterId={createVersionModal.docId}
                jobs={jobs}
                token={token}
                onSubmit={(data) => handleCreateVersion(createVersionModal.docId, createVersionModal.docType, data)}
                onCancel={() => setCreateVersionModal({ open: false, docId: null, docType: null, editingVersion: null, versionData: null })}
              />
            )}
          </div>
        </div>
      )}

      {/* Compare Versions Modal */}
      {compareVersionsModal.open && compareVersionsModal.comparison && (
        <div className="viewer-modal-overlay" onClick={() => setCompareVersionsModal({ open: false, resumeId: null, version1: null, version2: null })}>
          <div className="viewer-modal-content compare-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>Compare Versions {compareVersionsModal.version1} & {compareVersionsModal.version2}</h2>
              <button className="viewer-modal-close" onClick={() => setCompareVersionsModal({ open: false, resumeId: null, version1: null, version2: null })}>
                ×
              </button>
            </div>
            <div className="compare-body">
              <div className="compare-columns">
                <div className="compare-column">
                  <h3>Version {compareVersionsModal.version1}</h3>
                  <div className="version-details">
                    <p><strong>Title:</strong> {compareVersionsModal.comparison.version1.title}</p>
                    <p><strong>Created:</strong> {new Date(compareVersionsModal.comparison.version1.created_at).toLocaleString()}</p>
                    {compareVersionsModal.comparison.differences.summary && <p className="diff-indicator">Summary differs</p>}
                    {compareVersionsModal.comparison.differences.experience && <p className="diff-indicator">Experience differs</p>}
                    {compareVersionsModal.comparison.differences.education && <p className="diff-indicator">Education differs</p>}
                    {compareVersionsModal.comparison.differences.skills && <p className="diff-indicator">Skills differ</p>}
                    {compareVersionsModal.comparison.differences.projects && <p className="diff-indicator">Projects differ</p>}
                  </div>
                </div>
                <div className="compare-column">
                  <h3>Version {compareVersionsModal.version2}</h3>
                  <div className="version-details">
                    <p><strong>Title:</strong> {compareVersionsModal.comparison.version2.title}</p>
                    <p><strong>Created:</strong> {new Date(compareVersionsModal.comparison.version2.created_at).toLocaleString()}</p>
                    {compareVersionsModal.comparison.differences.summary && <p className="diff-indicator">Summary differs</p>}
                    {compareVersionsModal.comparison.differences.experience && <p className="diff-indicator">Experience differs</p>}
                    {compareVersionsModal.comparison.differences.education && <p className="diff-indicator">Education differs</p>}
                    {compareVersionsModal.comparison.differences.skills && <p className="diff-indicator">Skills differ</p>}
                    {compareVersionsModal.comparison.differences.projects && <p className="diff-indicator">Projects differ</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Versions Modal */}
      {mergeVersionsModal.open && (
        <div className="viewer-modal-overlay" onClick={() => setMergeVersionsModal({ open: false, resumeId: null, sourceVersion: null, targetVersion: null })}>
          <div className="viewer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>Merge Versions</h2>
              <button className="viewer-modal-close" onClick={() => setMergeVersionsModal({ open: false, resumeId: null, sourceVersion: null, targetVersion: null })}>
                ×
              </button>
            </div>
            <MergeVersionForm
              resumeId={mergeVersionsModal.resumeId}
              sourceVersion={mergeVersionsModal.sourceVersion}
              targetVersion={mergeVersionsModal.targetVersion}
              onSubmit={(data) => handleMergeVersions(
                mergeVersionsModal.resumeId,
                mergeVersionsModal.sourceVersion,
                mergeVersionsModal.targetVersion,
                data.merge_strategy,
                data.title,
                data.description
              )}
              onCancel={() => setMergeVersionsModal({ open: false, resumeId: null, sourceVersion: null, targetVersion: null })}
            />
          </div>
        </div>
      )}

      {/* Link Job Modal */}
      {linkJobModal.open && (
        <div className="viewer-modal-overlay" onClick={() => setLinkJobModal({ open: false, docId: null, docType: null, versionNumber: null })}>
          <div className="viewer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-modal-header">
              <h2>Link Version to Job</h2>
              <button className="viewer-modal-close" onClick={() => setLinkJobModal({ open: false, docId: null, docType: null, versionNumber: null })}>
                ×
              </button>
            </div>
            <div className="link-job-body">
              <select
                className="job-select"
                onChange={(e) => {
                  const jobId = e.target.value ? parseInt(e.target.value) : null;
                  if (jobId) {
                    handleLinkVersionToJob(linkJobModal.docId, linkJobModal.docType, linkJobModal.versionNumber, jobId);
                  }
                }}
              >
                <option value="">Select a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Version Form Component with Side-by-Side Comparison
function CreateVersionForm({ resumeId, jobs, token, editingVersion, versionData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    change_summary: "",
    job_id: "",
    is_default: false,
    tags: ""
  });
  const [editableSections, setEditableSections] = useState(null);
  const [masterResume, setMasterResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const fetchMasterResume = async () => {
      if (!resumeId || !token) {
        setLoading(false);
        return;
      }
      
      try {
        // Always fetch the current resume first (this is the master)
        const { data: resumeData } = await api.get(`/api/resumes/${resumeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Parse sections if they're a string
        let parsedSections = resumeData.resume.sections;
        if (typeof parsedSections === 'string') {
          try {
            parsedSections = JSON.parse(parsedSections);
          } catch (e) {
            console.warn("Failed to parse sections:", e);
            parsedSections = {};
          }
        }
        
        // Set master resume from current resume
        setMasterResume({
          ...resumeData.resume,
          sections: parsedSections
        });
        setEditableSections(parsedSections);
        
        // Try to get default version for comparison (optional)
        try {
          const versionsResponse = await api.get(`/api/versions/resumes/${resumeId}/versions`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          const masterVersion = versionsResponse.data.versions?.find(v => v.is_default === true);
          
          if (masterVersion) {
            // Parse sections if they're a string
            let parsedVersionSections = masterVersion.sections;
            if (typeof parsedVersionSections === 'string') {
              try {
                parsedVersionSections = JSON.parse(parsedVersionSections);
              } catch (e) {
                console.warn("Failed to parse version sections:", e);
                parsedVersionSections = parsedSections; // Fallback to resume sections
              }
            }
            // Use master version if it exists and has sections
            if (parsedVersionSections && Object.keys(parsedVersionSections).length > 0) {
              setMasterResume({ 
                sections: parsedVersionSections, 
                title: masterVersion.title || resumeData.resume.title,
                format: masterVersion.format || resumeData.resume.format || 'pdf'
              });
              setEditableSections(parsedVersionSections);
            }
          }
        } catch (versionErr) {
          console.warn("Could not fetch versions, using current resume:", versionErr);
          // Continue with current resume data
        }
        
        // Set form data
        setFormData(prev => ({
          ...prev,
          title: editingVersion ? versionData?.title || "" : "",
          description: editingVersion ? versionData?.description || "" : "",
          change_summary: editingVersion ? versionData?.change_summary || "" : "",
          job_id: editingVersion ? (versionData?.job_id || "") : "",
          is_default: editingVersion ? (versionData?.is_default || false) : false,
          tags: editingVersion ? (versionData?.tags?.join(', ') || "") : ""
        }));
        
        // If editing, use version data
        if (editingVersion && versionData) {
          setEditableSections(versionData.sections);
          setFormData({
            title: versionData.title || "",
            description: versionData.description || "",
            change_summary: versionData.change_summary || "",
            job_id: versionData.job_id || "",
            is_default: versionData.is_default || false,
            tags: versionData.tags ? versionData.tags.join(', ') : ""
          });
        }
      } catch (err) {
        console.error("Failed to fetch master resume:", err);
        // Try to get current resume as fallback
        try {
          const { data } = await api.get(`/api/resumes/${resumeId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Parse sections if they're a string
          let parsedSections = data.resume.sections;
          if (typeof parsedSections === 'string') {
            try {
              parsedSections = JSON.parse(parsedSections);
            } catch (e) {
              console.warn("Failed to parse sections:", e);
              parsedSections = {};
            }
          }
          setMasterResume({
            ...data.resume,
            sections: parsedSections
          });
          setEditableSections(parsedSections);
        } catch (err2) {
          console.error("Failed to fetch current resume:", err2);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMasterResume();
  }, [resumeId, token, editingVersion, versionData]);

  // Synchronize scrolling between left and right columns
  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    if (!leftEl || !rightEl) return;

    const handleLeftScroll = (e) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      const scrollRatio = leftEl.scrollTop / (leftEl.scrollHeight - leftEl.clientHeight);
      const maxRightScroll = rightEl.scrollHeight - rightEl.clientHeight;
      // Make right side scroll 0.85x slower
      const adjustedRatio = Math.min(scrollRatio * 0.85, 1);
      rightEl.scrollTop = adjustedRatio * maxRightScroll;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handleRightScroll = (e) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      const scrollRatio = rightEl.scrollTop / (rightEl.scrollHeight - rightEl.clientHeight);
      const maxLeftScroll = leftEl.scrollHeight - leftEl.clientHeight;
      // Make left side scroll faster (divide by 0.85) when right side scrolls
      const adjustedRatio = Math.min(scrollRatio / 0.85, 1);
      leftEl.scrollTop = adjustedRatio * maxLeftScroll;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    leftEl.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightEl.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, [loading, masterResume, editableSections]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      sections: editableSections, // Include edited sections
      job_id: formData.job_id ? parseInt(formData.job_id) : null,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : null
    });
  };

  // Format date for display (converts various formats to readable format)
  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '';
    
    // Handle year-month format (yyyy-MM) - display as "Month YYYY"
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}$/.test(dateValue)) {
      const [year, month] = dateValue.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    // Handle full date format (yyyy-MM-dd) - display as "Month Day, YYYY"
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const date = new Date(dateValue + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    
    // Handle ISO datetime strings
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    
    // Try to parse as Date
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      // If parsing fails, return original value
    }
    
    // If all else fails, return original value
    return String(dateValue);
  };

  const renderResumeSections = (sections) => {
    if (!sections || typeof sections === 'string') {
      try {
        sections = sections ? JSON.parse(sections) : {};
      } catch {
        sections = {};
      }
    }

    return (
      <div className="resume-preview-content">
        {sections.summary && (
          <div className="resume-section">
            <h4>Summary</h4>
            <p className="resume-text"><strong>Name:</strong> {sections.summary.full_name || 'N/A'}</p>
            <p className="resume-text"><strong>Title:</strong> {sections.summary.title || 'N/A'}</p>
            {sections.summary.bio && <p className="resume-text"><strong>Bio:</strong> {sections.summary.bio}</p>}
            {sections.summary.contact && (
              <p className="resume-text"><strong>Contact:</strong> {[
                sections.summary.contact.email,
                sections.summary.contact.phone,
                sections.summary.contact.location
              ].filter(Boolean).join(' | ')}</p>
            )}
          </div>
        )}
        
        {sections.experience && sections.experience.length > 0 && (
          <div className="resume-section">
            <h4>Experience ({sections.experience.length})</h4>
            {sections.experience.map((exp, idx) => (
              <div key={idx} className="resume-item">
                <p className="resume-text"><strong>{exp.title || exp.role}</strong> at {exp.company}</p>
                {exp.location && <p className="resume-text resume-meta">{exp.location}</p>}
                {exp.start_date && (
                  <p className="resume-text resume-meta">
                    {formatDateForDisplay(exp.start_date)} - {exp.end_date ? formatDateForDisplay(exp.end_date) : (exp.current ? 'Present' : '')}
                  </p>
                )}
                {exp.description && (
                  <div className="resume-description">
                    {typeof exp.description === 'string' ? (
                      exp.description.split('\n').map((line, lineIdx) => (
                        <p key={lineIdx} className="resume-text resume-item-desc">{line}</p>
                      ))
                    ) : (
                      <p className="resume-text resume-item-desc">{JSON.stringify(exp.description)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sections.education && sections.education.length > 0 && (
          <div className="resume-section">
            <h4>Education ({sections.education.length})</h4>
            {sections.education.map((edu, idx) => (
              <div key={idx} className="resume-item">
                <p className="resume-text"><strong>{edu.institution}</strong></p>
                <p className="resume-text">{edu.degree_type || edu.education_level} in {edu.field_of_study}</p>
                {edu.graduation_date && <p className="resume-text resume-meta">Graduated: {formatDateForDisplay(edu.graduation_date)}</p>}
                {edu.gpa && <p className="resume-text resume-meta">GPA: {edu.gpa}</p>}
              </div>
            ))}
          </div>
        )}

        {sections.skills && sections.skills.length > 0 && (
          <div className="resume-section">
            <h4>Skills ({sections.skills.length})</h4>
            <p className="resume-text">{Array.isArray(sections.skills) ? sections.skills.join(', ') : String(sections.skills)}</p>
          </div>
        )}

        {sections.projects && sections.projects.length > 0 && (
          <div className="resume-section">
            <h4>Projects ({sections.projects.length})</h4>
            {sections.projects.map((proj, idx) => (
              <div key={idx} className="resume-item">
                <p className="resume-text"><strong>{proj.name}</strong></p>
                {proj.role && <p className="resume-text resume-meta">Role: {proj.role}</p>}
                {proj.description && (
                  <div className="resume-description">
                    {typeof proj.description === 'string' ? (
                      proj.description.split('\n').map((line, lineIdx) => (
                        <p key={lineIdx} className="resume-text resume-item-desc">{line}</p>
                      ))
                    ) : (
                      <p className="resume-text resume-item-desc">{JSON.stringify(proj.description)}</p>
                    )}
                  </div>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <p className="resume-text resume-meta">Technologies: {Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {sections.certifications && sections.certifications.length > 0 && (
          <div className="resume-section">
            <h4>Certifications ({sections.certifications.length})</h4>
            {sections.certifications.map((cert, idx) => (
              <div key={idx} className="resume-item">
                <p className="resume-text"><strong>{cert.name}</strong></p>
                {cert.organization && <p className="resume-text resume-meta">{cert.organization}</p>}
                {cert.date_earned && <p className="resume-text resume-meta">Earned: {formatDateForDisplay(cert.date_earned)}</p>}
              </div>
            ))}
          </div>
        )}

        {(!sections || Object.keys(sections).length === 0) && (
          <p className="no-content">No resume content available</p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="create-version-loading">Loading current resume...</div>;
  }

  return (
    <div className="create-version-with-comparison">
      <div className="create-version-layout">
        {/* Left Side: Master Version Preview */}
        <div className="comparison-column" ref={leftScrollRef}>
          <h3>{masterResume?.title || "Master Version"}</h3>
          <div className="resume-preview">
            {masterResume ? (
              <>
                <div className="resume-preview-header">
                  <p><strong>Title:</strong> {masterResume.title}</p>
                  <p><strong>Format:</strong> {masterResume.format || 'PDF'}</p>
                </div>
                {renderResumeSections(masterResume.sections)}
              </>
            ) : (
              <p className="no-content">Unable to load master resume</p>
            )}
          </div>
        </div>

        {/* Right Side: Editable Resume Form */}
        <div className="form-column" ref={rightScrollRef}>
          <h3>{editingVersion ? `Edit Version ${editingVersion}` : "New Version - Edit Content"}</h3>
          <p className="version-info-note">
            {editingVersion 
              ? "Edit the resume content below. Changes will be saved to this version."
              : "Edit the resume content below. This will create a new version with your changes."}
          </p>
          <form onSubmit={handleSubmit} className="create-version-form">
            <div className="form-group">
              <label>Version Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Software Engineer - Google Tailored"
              />
            </div>
            
            {/* Editable Resume Sections */}
            {editableSections && (
              <div className="editable-resume-container">
                <EditableResumeForm 
                  sections={editableSections} 
                  onChange={setEditableSections}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Change Summary</label>
              <input
                type="text"
                value={formData.change_summary}
                onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                placeholder="Brief one-line summary of changes"
              />
            </div>
            <div className="form-group">
              <label>Link to Job Application</label>
              <select
                value={formData.job_id}
                onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
              >
                <option value="">None</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" onClick={onCancel}>Cancel</button>
              <button type="submit" className="btn-primary">
                {editingVersion ? "Update Version" : "Create Version"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Create Cover Letter Version Form Component with Side-by-Side Comparison
function CreateCoverLetterVersionForm({ coverLetterId, jobs, token, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    change_summary: "",
    job_id: "",
  });
  const [masterContent, setMasterContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [masterCoverLetter, setMasterCoverLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const fetchMasterCoverLetter = async () => {
      if (!coverLetterId || !token) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch the current cover letter
        const { data: coverLetterData } = await api.get(`/api/cover-letter/${coverLetterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const coverLetter = coverLetterData.cover_letter;
        const content = coverLetter.content || "";
        
        // Set master cover letter
        setMasterCoverLetter({
          ...coverLetter,
          content: content
        });
        setMasterContent(content);
        setEditableContent(content); // Copy to editable side
        
      } catch (err) {
        console.error("Failed to fetch master cover letter:", err);
        // Try to get from local state if available
        try {
          const { data } = await api.get(`/api/cover-letter/${coverLetterId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const content = data.cover_letter?.content || "";
          setMasterCoverLetter({
            ...data.cover_letter,
            content: content
          });
          setMasterContent(content);
          setEditableContent(content);
        } catch (err2) {
          console.error("Failed to fetch current cover letter:", err2);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMasterCoverLetter();
  }, [coverLetterId, token]);

  // Synchronize scrolling between left and right columns
  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    if (!leftEl || !rightEl) return;

    const handleLeftScroll = (e) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      const scrollRatio = leftEl.scrollTop / (leftEl.scrollHeight - leftEl.clientHeight);
      const maxRightScroll = rightEl.scrollHeight - rightEl.clientHeight;
      const adjustedRatio = Math.min(scrollRatio * 0.85, 1);
      rightEl.scrollTop = adjustedRatio * maxRightScroll;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handleRightScroll = (e) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      const scrollRatio = rightEl.scrollTop / (rightEl.scrollHeight - rightEl.clientHeight);
      const maxLeftScroll = leftEl.scrollHeight - leftEl.clientHeight;
      const adjustedRatio = Math.min(scrollRatio / 0.85, 1);
      leftEl.scrollTop = adjustedRatio * maxLeftScroll;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    leftEl.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightEl.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, [loading, masterContent, editableContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      content: editableContent, // Include edited content
      job_id: formData.job_id ? parseInt(formData.job_id) : null,
    });
  };

  if (loading) {
    return <div className="create-version-loading">Loading current cover letter...</div>;
  }

  return (
    <div className="create-version-with-comparison">
      <div className="create-version-layout">
        {/* Left Side: Master Version Preview */}
        <div className="comparison-column" ref={leftScrollRef}>
          <h3>{masterCoverLetter?.title || "Current Cover Letter"}</h3>
          <div className="resume-preview">
            {masterCoverLetter ? (
              <>
                <div className="resume-preview-header">
                  <p><strong>Title:</strong> {masterCoverLetter.title}</p>
                  <p><strong>Format:</strong> {masterCoverLetter.format || 'PDF'}</p>
                </div>
                <div className="cover-letter-preview-content">
                  {masterContent ? (
                    <div className="cover-letter-text" style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      padding: '1rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      minHeight: '400px',
                      color: '#333333',
                      border: '1px solid #e0e0e0'
                    }}>
                      {masterContent}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#666',
                      fontStyle: 'italic' 
                    }}>
                      <p>No text content available.</p>
                      <p style={{ fontSize: '0.9em', marginTop: '0.5rem' }}>
                        This cover letter may have been uploaded as a file. The text content will be extracted when you create a version.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="no-content">Unable to load cover letter</p>
            )}
          </div>
        </div>

        {/* Right Side: Editable Cover Letter Form */}
        <div className="form-column" ref={rightScrollRef}>
          <h3>New Version - Edit Content</h3>
          <p className="version-info-note">
            Edit the cover letter content below. This will create a new version with your changes.
          </p>
          <form onSubmit={handleSubmit} className="create-version-form">
            <div className="form-group">
              <label>Version Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Software Engineer Cover Letter - Google Tailored"
              />
            </div>
            
            {/* Editable Cover Letter Content */}
            <div className="form-group">
              <label>Cover Letter Content *</label>
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                required
                placeholder="Enter your cover letter content here..."
                rows={20}
                style={{
                  width: '100%',
                  minHeight: '400px',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div className="form-group">
              <label>Change Summary</label>
              <input
                type="text"
                value={formData.change_summary}
                onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                placeholder="Brief one-line summary of changes"
              />
            </div>
            
            <div className="form-group">
              <label>Link to Job Application</label>
              <select
                value={formData.job_id}
                onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
              >
                <option value="">None</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={onCancel}>Cancel</button>
              <button type="submit" className="btn-primary">
                Create Version
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Merge Version Form Component
function MergeVersionForm({ resumeId, sourceVersion, targetVersion, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    merge_strategy: "smart",
    title: "",
    description: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="merge-version-form">
      <div className="form-group">
        <label>Merge Strategy *</label>
        <select
          value={formData.merge_strategy}
          onChange={(e) => setFormData({ ...formData, merge_strategy: e.target.value })}
          required
        >
          <option value="source">Use Source Version (v{sourceVersion})</option>
          <option value="target">Use Target Version (v{targetVersion})</option>
          <option value="smart">Smart Merge (combine best of both)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Merged Version Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="e.g., Merged Version - Software Engineer"
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description of the merge"
          rows={3}
        />
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Merge Versions</button>
      </div>
    </form>
  );
}

