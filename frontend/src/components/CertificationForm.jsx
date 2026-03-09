import React, { useState, useEffect } from "react";
import { api } from "../api";

// Get the API base URL for file URLs
const API_BASE_URL = api.defaults.baseURL;

// Component to display PDF with blob URL (bypasses CORS for PDFs)
function PDFViewer({ url, title, style }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load PDF');
        return res.blob();
      })
      .then(blob => {
        if (isMounted) {
          const objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  if (loading) {
    return (
      <div style={{ 
        width: "100%", 
        maxWidth: style?.maxWidth || "400px", 
        height: style?.height || "300px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#f1f5f9",
        borderRadius: "8px",
        border: "1px solid #ddd",
      }}>
        Loading PDF...
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 20px",
          background: "#f1f5f9",
          borderRadius: "8px",
          color: "#2563eb",
          textDecoration: "none",
        }}
      >
        📄 View Certificate PDF
      </a>
    );
  }

  return (
    <iframe
      src={blobUrl}
      style={{
        width: "100%",
        maxWidth: style?.maxWidth || "400px",
        height: style?.height || "300px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        ...style,
      }}
      title={title}
    />
  );
}

export default function CertificationForm({ token, cert, onCancel, onSaved }) {
  // Helper function to format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    // If already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Try to parse and format
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return "";
    }
  };

  const [form, setForm] = useState(() => {
    // Use badge_url if available, otherwise document_url, for the combined file
    const fileUrl = cert?.badge_url || cert?.document_url || "";
    return {
      name: cert?.name || "",
      organization: cert?.organization || "",
      category: cert?.category || "",
      cert_number: cert?.cert_number || "",
      date_earned: formatDateForInput(cert?.date_earned),
      expiration_date: formatDateForInput(cert?.expiration_date),
      does_not_expire: cert?.does_not_expire || false,
      badge_url: fileUrl, // Combined file (image or PDF)
      document_url: fileUrl, // Also set for compatibility
      verification_url: cert?.verification_url || "",
      description: cert?.description || "",
      achievements: cert?.achievements || "",
      renewal_reminder: formatDateForInput(cert?.renewal_reminder),
      verified: cert?.verified || false, // Verification status
    };
  });

  // Score fields (extracted from JSON for user-friendly input)
  const [scores, setScores] = useState(() => {
    if (cert?.scores && typeof cert.scores === 'object') {
      return {
        score: cert.scores.score || "",
        percentile: cert.scores.percentile || "",
        skills_assessed: Array.isArray(cert.scores.skills_assessed) 
          ? cert.scores.skills_assessed.join(", ") 
          : cert.scores.skills_assessed || "",
        ...cert.scores
      };
    }
    return {
      score: "",
      percentile: "",
      skills_assessed: "",
    };
  });

  const [isCustomOrg, setIsCustomOrg] = useState(() => {
    // Check if existing cert has organization that's not in the dropdown list
    if (cert?.organization) {
      const commonOrgs = [
        "CompTIA", "HackerRank", "LeetCode", "Codecademy", "Coursera",
        "edX", "Udemy", "AWS", "Google Cloud", "Microsoft", "LinkedIn Learning"
      ];
      return !commonOrgs.includes(cert.organization);
    }
    return false;
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileType, setUploadedFileType] = useState(() => {
    // Detect file type from existing file URL
    const fileUrl = cert?.badge_url || cert?.document_url || "";
    if (fileUrl) {
      return fileUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    }
    return null;
  });

  // Handle certification file upload (image or PDF)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/certifications/upload-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      // Store in both badge_url and document_url for compatibility
      setForm({ ...form, badge_url: data.file_url, document_url: data.file_url });
      setUploadedFileType(data.file_type);
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("File upload error:", err);
      alert(err.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // Build scores JSON from form fields
      let scoresJson = null;
      const hasScores = scores.score || scores.percentile || scores.skills_assessed;
      if (hasScores) {
        scoresJson = {
          ...(scores.score && { score: parseFloat(scores.score) || scores.score }),
          ...(scores.percentile && { percentile: parseFloat(scores.percentile) || scores.percentile }),
          ...(scores.skills_assessed && { 
            skills_assessed: scores.skills_assessed.split(",").map(s => s.trim()).filter(Boolean)
          }),
          // Preserve any other fields that might exist
          ...(typeof scores === 'object' && Object.keys(scores).reduce((acc, key) => {
            if (!['score', 'percentile', 'skills_assessed'].includes(key) && scores[key]) {
              acc[key] = scores[key];
            }
            return acc;
          }, {}))
        };
      }

      const payload = {
        ...form,
        scores: scoresJson,
      };

      if (cert?.id) {
        await api.put(`/api/certifications/${cert.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/api/certifications", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onSaved();
    } catch (err) {
      alert("Failed to save certification");
      console.error(err);
    }
  }

  return (
    <form className="profile-box" onSubmit={handleSubmit}>
      <h4>{cert?.id ? "Edit Certification" : "Add Certification"}</h4>

      <label htmlFor="cert-name">Certification Name *</label>
      <input
        id="cert-name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        placeholder="e.g., AWS Certified Solutions Architect"
        aria-label="Certification name"
        aria-required="true"
      />

      <label htmlFor="cert-organization">Issuing Organization / Platform *</label>
      <select
        id="cert-organization"
        value={isCustomOrg ? "Custom" : form.organization}
        onChange={(e) => {
          if (e.target.value === "Custom") {
            setIsCustomOrg(true);
            setForm({ ...form, organization: "" });
          } else {
            setIsCustomOrg(false);
            setForm({ ...form, organization: e.target.value });
          }
        }}
        required
        aria-label="Issuing organization or platform"
        aria-required="true"
      >
        <option value="">Select organization/platform</option>
        <option value="CompTIA">CompTIA</option>
        <option value="HackerRank">HackerRank</option>
        <option value="LeetCode">LeetCode</option>
        <option value="Codecademy">Codecademy</option>
        <option value="Coursera">Coursera</option>
        <option value="edX">edX</option>
        <option value="Udemy">Udemy</option>
        <option value="AWS">AWS (Amazon Web Services)</option>
        <option value="Google Cloud">Google Cloud</option>
        <option value="Microsoft">Microsoft</option>
        <option value="LinkedIn Learning">LinkedIn Learning</option>
        <option value="Custom">Other (Enter custom name)</option>
      </select>
      {isCustomOrg && (
        <input
          type="text"
          id="cert-organization-custom"
          placeholder="Enter organization/platform name"
          value={form.organization}
          onChange={(e) => setForm({ ...form, organization: e.target.value })}
          required
          style={{ marginTop: "8px" }}
          aria-label="Custom organization or platform name"
          aria-required="true"
        />
      )}

      <label htmlFor="cert-category">Category</label>
      <select
        id="cert-category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        aria-label="Certification category"
      >
        <option value="">Select category</option>
        <option value="Coding">Coding</option>
        <option value="Business">Business</option>
        <option value="Design">Design</option>
        <option value="Technical">Technical</option>
        <option value="Industry-Specific">Industry-Specific</option>
        <option value="Soft Skills">Soft Skills</option>
        <option value="Management">Management</option>
        <option value="Security">Security</option>
        <option value="Cloud">Cloud</option>
        <option value="Data Science">Data Science</option>
      </select>

      <label htmlFor="cert-number">Certification Number / ID</label>
      <input
        id="cert-number"
        value={form.cert_number}
        onChange={(e) => setForm({ ...form, cert_number: e.target.value })}
        placeholder="e.g., ABC123456789"
        aria-label="Certification number or ID"
      />

      <label htmlFor="cert-date-earned">Date Earned *</label>
      <input
        type="date"
        id="cert-date-earned"
        value={form.date_earned}
        onChange={(e) => setForm({ ...form, date_earned: e.target.value })}
        required
        aria-label="Date certification was earned"
        aria-required="true"
      />

      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
        <input
          type="checkbox"
          id="cert-does-not-expire"
          checked={form.does_not_expire}
          onChange={(e) =>
            setForm({
              ...form,
              does_not_expire: e.target.checked,
              expiration_date: e.target.checked ? "" : form.expiration_date,
            })
          }
          aria-label="Certification does not expire"
          className="small-checkbox"
        />
        Does not expire
      </label>

      {!form.does_not_expire && (
        <>
          <label htmlFor="cert-expiration-date">Expiration Date</label>
          <input
            type="date"
            id="cert-expiration-date"
            value={form.expiration_date}
            onChange={(e) =>
              setForm({ ...form, expiration_date: e.target.value })
            }
            aria-label="Certification expiration date"
          />
        </>
      )}

      <label htmlFor="cert-verification-url">Verification URL</label>
      <input
        type="url"
        id="cert-verification-url"
        value={form.verification_url}
        onChange={(e) => {
          const url = e.target.value;
          setForm({ 
            ...form, 
            verification_url: url,
            // Auto-mark as verified when a valid URL is provided
            verified: url && url.trim().startsWith('http') ? true : form.verified
          });
        }}
        placeholder="https://verify.example.com/certificate/..."
        aria-label="Certification verification URL"
      />
      <small style={{ color: "#666", fontSize: "12px" }}>
        Link where employers can verify this certification
      </small>

      {/* Verification Status */}
      <label style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px",
        marginTop: "12px",
        padding: "10px 12px",
        background: form.verified ? "#dcfce7" : "#fef3c7",
        borderRadius: "8px",
        border: `1px solid ${form.verified ? "#86efac" : "#fde047"}`,
        cursor: "pointer",
        fontSize: "14px"
      }}>
        <input
          type="checkbox"
          id="cert-verified"
          checked={form.verified || false}
          onChange={(e) => setForm({ ...form, verified: e.target.checked })}
          aria-label="Mark certification as verified"
          className="small-checkbox"
        />
        <span style={{ fontWeight: 500 }}>
          {form.verified ? "✅ Verified" : "⏳ Pending Verification"}
        </span>
        <small style={{ color: "#666", marginLeft: "auto", fontSize: "12px" }}>
          {form.verified 
            ? "This certification has been verified" 
            : "Check to mark as verified"}
        </small>
      </label>

      {/* Certification File Upload (Image or PDF) */}
      <label htmlFor="cert-file-upload">Certification File (Image or PDF)</label>
      {form.badge_url && (
        <div style={{ marginBottom: "12px" }}>
          {(() => {
            const fullUrl = `${API_BASE_URL}${form.badge_url}`;
            const isPdf = uploadedFileType === "pdf" || form.badge_url.toLowerCase().endsWith(".pdf");
            console.log("Certification file URL:", fullUrl);
            
            return isPdf ? (
              <div style={{ marginBottom: "12px" }}>
                <PDFViewer 
                  url={fullUrl} 
                  title="Certification PDF preview"
                  style={{ maxWidth: "400px", height: "300px" }}
                />
                <div style={{ marginTop: "8px" }}>
                  <a 
                    href={fullUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: "#f1f5f9",
                      borderRadius: "6px",
                      color: "#2563eb",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    📄 Open in New Tab
                  </a>
                </div>
              </div>
            ) : (
              <img
                src={fullUrl}
                alt="Certification preview"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "8px",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            );
          })()}
          <button
            type="button"
            onClick={() => {
              setForm({ ...form, badge_url: "", document_url: "" });
              setUploadedFileType(null);
            }}
            style={{
              marginLeft: "12px",
              padding: "4px 8px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Remove
          </button>
        </div>
      )}
      <input
        type="file"
        id="cert-file-upload"
        accept="image/*,.pdf,application/pdf"
        onChange={handleFileUpload}
        disabled={uploadingFile}
        aria-label="Upload certification file (image or PDF)"
      />
      {uploadingFile && <p style={{ color: "#666", fontSize: "12px" }}>Uploading file...</p>}
      <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
        Upload an image (JPG, PNG, GIF, WEBP) or PDF document of your certification
      </small>

      {/* Skill Assessment Scores */}
      <div style={{ marginTop: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <label style={{ fontWeight: 600, marginBottom: "12px", display: "block" }}>Skill Assessment Scores (Optional)</label>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label htmlFor="cert-score" style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Score</label>
            <input
              type="number"
              id="cert-score"
              value={scores.score}
              onChange={(e) => setScores({ ...scores, score: e.target.value })}
              placeholder="e.g., 95"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              aria-label="Certification score"
            />
          </div>
          <div>
            <label htmlFor="cert-percentile" style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Percentile</label>
            <input
              type="number"
              id="cert-percentile"
              value={scores.percentile}
              onChange={(e) => setScores({ ...scores, percentile: e.target.value })}
              placeholder="e.g., 87"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              aria-label="Certification percentile"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="cert-skills-assessed" style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Skills Assessed</label>
          <input
            type="text"
            id="cert-skills-assessed"
            value={scores.skills_assessed}
            onChange={(e) => setScores({ ...scores, skills_assessed: e.target.value })}
            placeholder="e.g., JavaScript, React, Node.js"
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
            aria-label="Skills assessed by certification"
          />
          <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
            Separate multiple skills with commas
          </small>
        </div>
      </div>

      {/* Achievements */}
      <label htmlFor="cert-achievements">Achievements</label>
      <textarea
        id="cert-achievements"
        rows="3"
        value={form.achievements}
        onChange={(e) => setForm({ ...form, achievements: e.target.value })}
        placeholder="e.g., Top 10% performer, Solved 500+ problems, etc."
        aria-label="Certification achievements"
      />

      {/* Rich Text Description */}
      <label htmlFor="cert-description">Description</label>
      <textarea
        id="cert-description"
        rows="5"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Describe what this certification validates, what you learned, and how it demonstrates your skills..."
        aria-label="Certification description"
      />


      <label htmlFor="cert-renewal-reminder">Renewal Reminder</label>
      <input
        type="date"
        id="cert-renewal-reminder"
        value={form.renewal_reminder}
        onChange={(e) =>
          setForm({ ...form, renewal_reminder: e.target.value })
        }
        aria-label="Certification renewal reminder date"
      />

      <div className="button-group">
        <button type="submit">Save</button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onCancel()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
