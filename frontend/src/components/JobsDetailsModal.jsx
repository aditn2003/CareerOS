import React, { useEffect, useState } from "react";
import "./JobDetails.css";
import { api, createOffer, getOffers, updateOffer } from "../api";
import FileUpload from "./FileUpload";
import QualityScoreCard from "./QualityScoreCard";
import ScoreBreakdown from "./ScoreBreakdown";
import ImprovementSuggestions from "./ImprovementSuggestions";

const STAGES = [
  "Interested",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

export default function JobDetailsModal({
  token,
  jobId,
  onClose,
  onStatusUpdate,
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resume, setResume] = useState(null);

  const [resumes, setResumes] = useState([]); // ✅ LIST OF RESUMES
  const [coverLetters, setCoverLetters] = useState([]); // ✅ LIST OF COVER LETTERS

  const [selectedResume, setSelectedResume] = useState(""); // ✅ CURRENTLY CHOSEN RESUME
  const [selectedCover, setSelectedCover] = useState(""); // ✅ CURRENTLY CHOSEN COVER
  const [coverLetter, setCoverLetter] = useState(null);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCoverLetterUpload, setShowCoverLetterUpload] = useState(false);
  
  // Quality Scoring
  const [qualityScore, setQualityScore] = useState(null);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);
  const [qualityError, setQualityError] = useState(null);
  const [userStats, setUserStats] = useState(null);
  
  // Offer management
  const [existingOffer, setExistingOffer] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerData, setOfferData] = useState({
    base_salary: "",
    signing_bonus: 0,
    annual_bonus_percent: 0,
    equity_value: 0,
    pto_days: 0,
    offer_date: new Date().toISOString().split('T')[0],
    offer_status: "pending"
  });

  // Cover letter generation
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState(null);
  // Salary benchmark data
  const [salaryBenchmark, setSalaryBenchmark] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState(null);

  // 🟢 Load job details

  // Load quality score
  async function loadQualityScore() {
    if (!jobId) return;
    
    try {
      const res = await api.get(`/api/quality-scoring/${jobId}`);
      const score = res.data.score;
      
      // Parse JSONB fields if they're strings
      if (typeof score.score_breakdown === 'string') {
        score.score_breakdown = JSON.parse(score.score_breakdown);
      }
      if (typeof score.formatting_issues === 'string') {
        score.formatting_issues = JSON.parse(score.formatting_issues);
      }
      if (typeof score.inconsistencies === 'string') {
        score.inconsistencies = JSON.parse(score.inconsistencies);
      }
      if (typeof score.improvement_suggestions === 'string') {
        score.improvement_suggestions = JSON.parse(score.improvement_suggestions);
      }
      
      setQualityScore(score);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("❌ Error loading quality score:", err);
      }
      // 404 is okay - no score exists yet
      setQualityScore(null);
    }
  }

  // Load user stats
  async function loadUserStats() {
    try {
      const res = await api.get("/api/quality-scoring/user/stats");
      setUserStats(res.data.stats);
    } catch (err) {
      console.error("❌ Error loading user stats:", err);
    }
  }

  // Analyze quality score
  async function analyzeQuality() {
    if (!jobId) return;

    try {
      setAnalyzingQuality(true);
      setQualityError(null);
      
      const res = await api.post(`/api/quality-scoring/${jobId}/analyze`, {
        forceRefresh: true,
      });
      
      const score = res.data.score;
      
      // Parse JSONB fields if they're strings
      if (typeof score.score_breakdown === 'string') {
        score.score_breakdown = JSON.parse(score.score_breakdown);
      }
      if (typeof score.formatting_issues === 'string') {
        score.formatting_issues = JSON.parse(score.formatting_issues);
      }
      if (typeof score.inconsistencies === 'string') {
        score.inconsistencies = JSON.parse(score.inconsistencies);
      }
      if (typeof score.improvement_suggestions === 'string') {
        score.improvement_suggestions = JSON.parse(score.improvement_suggestions);
      }
      
      setQualityScore(score);
      
      // Refresh user stats
      await loadUserStats();
    } catch (err) {
      console.error("❌ Error analyzing quality:", err);
      setQualityError(err.response?.data?.message || "Failed to analyze application quality");
    } finally {
      setAnalyzingQuality(false);
    }
  }

  // Load salary benchmark data
  async function loadSalaryBenchmark() {
    if (!jobId) return;
    
    try {
      setLoadingBenchmark(true);
      setBenchmarkError(null);
      const res = await api.get(`/api/salary-research/benchmark/${jobId}`);
      setSalaryBenchmark(res.data);
    } catch (err) {
      console.error("❌ Error loading salary benchmark:", err);
      // Graceful error handling - don't show error, just don't display benchmark
      setBenchmarkError(err.response?.data?.message || "Unable to load salary data");
      setSalaryBenchmark(null);
    } finally {
      setLoadingBenchmark(false);
    }
  }

  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch job details");
        const data = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error("❌ Failed to fetch job details:", err);
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadJob();
      loadExistingOffer(); // Load offer if it exists
      loadQualityScore(); // Load quality score
      loadUserStats(); // Load user stats
    }
  }, [jobId, token]);

  // Load salary benchmark when job data is available
  useEffect(() => {
    if (job && job.title && job.location && jobId) {
      loadSalaryBenchmark();
    }
  }, [job, jobId]);

  // Load existing offer for this job
  async function loadExistingOffer() {
    try {
      const res = await getOffers();
      const offer = res.data.offers?.find(o => o.job_id === jobId);
      if (offer) {
        setExistingOffer(offer);
        setOfferData({
          base_salary: offer.base_salary || "",
          signing_bonus: offer.signing_bonus || 0,
          annual_bonus_percent: offer.annual_bonus_percent || 0,
          equity_value: offer.equity_value || 0,
          pto_days: offer.pto_days || 0,
          offer_date: offer.offer_date || new Date().toISOString().split('T')[0],
          offer_status: offer.offer_status || "pending"
        });
      } else if (job && job.status === "Offer" && job.salary_min) {
        // Initialize offer data with job's minimum salary if no offer exists yet
        setOfferData(prev => ({
          ...prev,
          base_salary: prev.base_salary || job.salary_min || ""
        }));
      }
    } catch (err) {
      console.error("Error loading offer:", err);
    }
  }
  
  // Update offer data when job changes
  useEffect(() => {
    if (job && job.status === "Offer" && !existingOffer && job.salary_min) {
      setOfferData(prev => ({
        ...prev,
        base_salary: prev.base_salary || job.salary_min || ""
      }));
    }
  }, [job, existingOffer]);

  useEffect(() => {
    // Use cover letter data from job object if available (loaded directly from backend)
    if (job?.cover_letter) {
      setCoverLetter(job.cover_letter);
    } else if (job?.cover_letter_id) {
      // Fallback: try to load via API if not included in job object
      async function loadCoverLetter() {
        try {
          const res = await fetch(
            `http://localhost:4000/api/cover-letters/${job.cover_letter_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          if (!res.ok) {
            if (res.status === 404) {
              console.warn(`⚠️ Cover letter ${job.cover_letter_id} not found. It may have been deleted.`);
              setCoverLetter(null);
              return;
            }
            throw new Error(`Failed to load cover letter: ${res.status}`);
          }
          
          const data = await res.json();
          if (data.cover_letter) setCoverLetter(data.cover_letter);
        } catch (err) {
          console.error("❌ Failed to load linked cover letter:", err);
          setCoverLetter(null);
        }
      }
      loadCoverLetter();
    } else {
      setCoverLetter(null);
    }
  }, [job, token]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const r = await api.get("/api/resumes");
        setResumes(r.data.resumes || []);

        const c = await api.get("/api/cover-letters");
        setCoverLetters(c.data.cover_letters || []);
      } catch (err) {
        console.error("❌ Failed to load materials list", err);
      }
    }

    loadMaterials();
  }, []);

  useEffect(() => {
    if (job) {
      setSelectedResume(job.resume_id || "");
      setSelectedCover(job.cover_letter_id || "");
    }
  }, [job]);

  useEffect(() => {
    async function loadResume() {
      if (!job?.resume_id) return;

      try {
        const res = await fetch(
          `http://localhost:4000/api/resumes/${job.resume_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`⚠️ Resume ${job.resume_id} not found. It may have been deleted.`);
            // Clear the resume_id from the job if it doesn't exist
            setResume(null);
            return;
          }
          throw new Error(`Failed to load resume: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.resume) setResume(data.resume);
      } catch (err) {
        console.error("❌ Failed to load linked resume:", err);
        setResume(null);
      }
    }

    loadResume();
  }, [job, token]);

  async function handleResumeDownload() {
    if (!job.resume_id) return alert("No resume linked.");

    try {
      const res = await fetch(
        `http://localhost:4000/api/resumes/${job.resume_id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const resumeTitle = resume?.title || job.resume?.title || `Resume_${job.resume_id}`;
      const resumeFormat = resume?.format || job.resume?.format || "pdf";
      link.download = `${resumeTitle}.${resumeFormat}`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Resume download failed:", err);
      alert("Failed to download resume.");
    }
  }

  async function handleCoverLetterDownload() {
    if (!job.cover_letter_id) return alert("No cover letter linked.");

    try {
      const res = await fetch(
        `http://localhost:4000/api/cover-letters/${job.cover_letter_id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const coverLetterTitle = coverLetter?.title || coverLetter?.name || job.cover_letter?.title || job.cover_letter?.name || `CoverLetter_${job.cover_letter_id}`;
      const coverLetterFormat = coverLetter?.format || job.cover_letter?.format || "pdf";
      link.download = `${coverLetterTitle}.${coverLetterFormat}`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Cover letter download failed:", err);
      alert("Failed to download cover letter.");
    }
  }

  async function handleMaterialUpdate() {
    try {
      const res = await api.put(`/api/jobs/${jobId}/materials`, {
        resume_id: selectedResume || null,
        cover_letter_id: selectedCover || null,
      });

      alert("Materials updated successfully!");
      
      // Update job state with the response (includes updated materials)
      const updatedJob = res.data.job;
      setJob(updatedJob);
      
      // Update selected values to match the saved state
      setSelectedResume(updatedJob.resume_id || "");
      setSelectedCover(updatedJob.cover_letter_id || "");

      // Reload resume and cover letter if IDs changed
      if (updatedJob.resume_id) {
        try {
          const resumeRes = await fetch(
            `http://localhost:4000/api/resumes/${updatedJob.resume_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (resumeRes.ok) {
            const resumeData = await resumeRes.json();
            if (resumeData.resume) setResume(resumeData.resume);
          }
        } catch (err) {
          console.error("Failed to reload resume:", err);
        }
      } else {
        setResume(null);
      }

      if (updatedJob.cover_letter_id) {
        try {
          const coverRes = await fetch(
            `http://localhost:4000/api/cover-letters/${updatedJob.cover_letter_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (coverRes.ok) {
            const coverData = await coverRes.json();
            if (coverData.cover_letter) setCoverLetter(coverData.cover_letter);
          }
        } catch (err) {
          console.error("Failed to reload cover letter:", err);
        }
      } else {
        setCoverLetter(null);
      }

      // Re-analyze quality score if materials changed
      if (jobId) {
        await analyzeQuality();
      }
    } catch (err) {
      console.error("Failed to update materials:", err);
      const errorMessage = err.response?.data?.error || err.message || "Unknown error";
      const errorHint = err.response?.data?.hint || "";
      const errorDetails = err.response?.data?.details || "";
      alert(`Failed to update materials.\n\nError: ${errorMessage}${errorHint ? `\n\nHint: ${errorHint}` : ''}${errorDetails ? `\n\nDetails: ${errorDetails}` : ''}`);
    }
  }

  // Generate cover letter for this job
  async function handleGenerateCoverLetter() {
    if (!jobId) return;

    try {
      setGeneratingCoverLetter(true);
      setCoverLetterError(null);

      const res = await api.post(`/api/jobs/${jobId}/generate-cover-letter`);

      if (res.data.success) {
        alert("✅ Cover letter generated and linked successfully!");
        
        // Reload job to get updated cover_letter_id
        const jobRes = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setJob(jobData.job);
          
          // Reload cover letter if it exists
          if (jobData.job.cover_letter_id) {
            try {
              const clRes = await fetch(
                `http://localhost:4000/api/cover-letter/${jobData.job.cover_letter_id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (clRes.ok) {
                const clData = await clRes.json();
                if (clData.cover_letter) setCoverLetter(clData.cover_letter);
              }
            } catch (err) {
              console.error("Failed to reload cover letter:", err);
            }
          }
        }

        // Refresh cover letters list
        try {
          const c = await api.get("/api/cover-letters");
          setCoverLetters(c.data.cover_letters || []);
          if (res.data.cover_letter?.id) {
            setSelectedCover(res.data.cover_letter.id.toString());
          }
        } catch (err) {
          console.error("Failed to reload cover letters:", err);
        }
      }
    } catch (err) {
      console.error("❌ Failed to generate cover letter:", err);
      setCoverLetterError(
        err.response?.data?.error || "Failed to generate cover letter. Please try again."
      );
      alert(`Failed to generate cover letter: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingCoverLetter(false);
    }
  }

  // 🟡 Save job updates
  async function handleSave() {
    if (!job.title?.trim() || !job.company?.trim()) {
      return alert("Job title and company name are required.");
    }

    try {
      setSaving(true);
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(job),
      });

      if (!res.ok) throw new Error("Failed to update job");
      const data = await res.json();
      const previousStatus = job.status;
      setJob(data.job);
      
      // If status changed to "Offer", auto-create offer if it doesn't exist
      if (data.job.status === "Offer" && previousStatus !== "Offer" && !existingOffer) {
        await createOfferFromJob(data.job);
      }
      
      alert("✅ Job updated successfully!");
      onStatusUpdate?.(jobId, data.job.status);
      onClose(); // close after save
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Failed to save job changes.");
    } finally {
      setSaving(false);
    }
  }

  // Create offer from job data
  async function createOfferFromJob(jobData) {
    try {
      const offerPayload = {
        job_id: jobId,
        company: jobData.company,
        role_title: jobData.title,
        location: jobData.location || "",
        industry: jobData.industry || "",
        base_salary: jobData.salary_min || 0, // Use salary_min as default
        offer_date: new Date().toISOString().split('T')[0],
        offer_status: "pending",
        role_level: "mid", // Default, user can edit
        location_type: "on_site", // Default, user can edit
        company_size: "medium" // Default, user can edit
      };
      
      const res = await createOffer(offerPayload);
      setExistingOffer(res.data.offer);
      setOfferData({
        base_salary: res.data.offer.base_salary || jobData.salary_min || "",
        signing_bonus: res.data.offer.signing_bonus || 0,
        annual_bonus_percent: res.data.offer.annual_bonus_percent || 0,
        equity_value: res.data.offer.equity_value || 0,
        pto_days: res.data.offer.pto_days || 0,
        offer_date: res.data.offer.offer_date || new Date().toISOString().split('T')[0],
        offer_status: res.data.offer.offer_status || "pending"
      });
      alert("✅ Offer created automatically with base salary = minimum salary. You can edit it below.");
    } catch (err) {
      console.error("Error creating offer:", err);
      alert("Failed to auto-create offer. You can create it manually.");
    }
  }

  // Save offer updates
  async function handleSaveOffer() {
    if (!existingOffer) {
      // Create new offer
      try {
        const offerPayload = {
          job_id: jobId,
          company: job.company,
          role_title: job.title,
          location: job.location || "",
          industry: job.industry || "",
          base_salary: offerData.base_salary || job.salary_min || 0,
          signing_bonus: offerData.signing_bonus || 0,
          annual_bonus_percent: offerData.annual_bonus_percent || 0,
          equity_value: offerData.equity_value || 0,
          pto_days: offerData.pto_days || 0,
          offer_date: offerData.offer_date,
          offer_status: offerData.offer_status,
          role_level: "mid",
          location_type: "on_site",
          company_size: "medium"
        };
        const res = await createOffer(offerPayload);
        setExistingOffer(res.data.offer);
        alert("✅ Offer created successfully!");
      } catch (err) {
        console.error("Error creating offer:", err);
        alert("Failed to create offer.");
      }
    } else {
      // Update existing offer
      try {
        const res = await updateOffer(existingOffer.id, offerData);
        setExistingOffer(res.data.offer);
        alert("✅ Offer updated successfully!");
      } catch (err) {
        console.error("Error updating offer:", err);
        alert("Failed to update offer.");
      }
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="job-details-overlay">
      <div className="job-details-modal edit-mode">
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
        <h2>Edit Job Details</h2>

        {/* BASIC INFO */}
        <label>Job Title *</label>
        <input
          value={job.title || ""}
          onChange={(e) => setJob({ ...job, title: e.target.value })}
          placeholder="e.g., Software Engineer"
        />

        <label>Company *</label>
        <input
          value={job.company || ""}
          onChange={(e) => setJob({ ...job, company: e.target.value })}
          placeholder="e.g., Palantir Technologies"
        />

        <label>Location</label>
        <input
          value={job.location || ""}
          onChange={(e) => setJob({ ...job, location: e.target.value })}
          placeholder="e.g., New York, NY"
        />

        {/* STAGE */}
        <label>Status</label>
        <select
          value={job.status || ""}
          onChange={(e) => {
            setJob({ ...job, status: e.target.value });
            // If changing to "Offer", show offer form
            if (e.target.value === "Offer" && !existingOffer) {
              setShowOfferForm(true);
            }
          }}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        
        {/* Show message if status is Offer */}
        {job.status === "Offer" && !existingOffer && (
          <div style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            marginTop: "8px",
            fontSize: "13px"
          }}>
            💡 <strong>Offer Status:</strong> Create an offer entry below to track compensation details.
          </div>
        )}

        {/* SALARY */}
        <label>Salary Range ($)</label>
        <div className="salary-group">
          <input
            type="number"
            placeholder="Min"
            value={job.salary_min || ""}
            onChange={(e) => setJob({ ...job, salary_min: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={job.salary_max || ""}
            onChange={(e) => setJob({ ...job, salary_max: e.target.value })}
          />
        </div>

        {/* SALARY BENCHMARK SECTION */}
        {job && (job.title || job.location) && (
          <div style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>💰 Market Salary Benchmarks</h3>
              {!loadingBenchmark && (
                <button
                  type="button"
                  onClick={() => loadSalaryBenchmark()}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  🔄 Refresh
                </button>
              )}
            </div>

            {loadingBenchmark && (
              <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
                Loading salary benchmarks...
              </p>
            )}

            {benchmarkError && !salaryBenchmark && !loadingBenchmark && (
              <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>
                ⚠️ {benchmarkError}
              </p>
            )}

            {!loadingBenchmark && !salaryBenchmark && !benchmarkError && (
              <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
                Click "Refresh" to load salary benchmark data.
              </p>
            )}

            {salaryBenchmark && salaryBenchmark.available && salaryBenchmark.range && (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase" }}>Low</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: 600 }}>
                        ${salaryBenchmark.range.low?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase" }}>Average</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: 600, color: "#2563eb" }}>
                        ${salaryBenchmark.range.avg?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase" }}>High</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: 600 }}>
                        ${salaryBenchmark.range.high?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Percentiles */}
                  {salaryBenchmark.range.percentile25 && salaryBenchmark.range.percentile50 && salaryBenchmark.range.percentile75 && (
                    <div style={{
                      padding: "12px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      marginTop: "12px"
                    }}>
                      <strong style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Percentile Breakdown
                      </strong>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                        <div>
                          <small style={{ color: "#6b7280" }}>25th (Lower)</small>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.95rem", fontWeight: 500, color: "#dc2626" }}>
                            ${salaryBenchmark.range.percentile25.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <small style={{ color: "#6b7280" }}>50th (Median)</small>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.95rem", fontWeight: 500, color: "#2563eb" }}>
                            ${salaryBenchmark.range.percentile50.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <small style={{ color: "#6b7280" }}>75th (Upper)</small>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.95rem", fontWeight: 500, color: "#059669" }}>
                            ${salaryBenchmark.range.percentile75.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {salaryBenchmark.dataSource && (
                  <div style={{
                    padding: "8px 12px",
                    backgroundColor: "#eff6ff",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    color: "#1e40af"
                  }}>
                    <strong>Data Source:</strong> {salaryBenchmark.dataSource}
                  </div>
                )}

                <div style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  color: "#92400e"
                }}>
                  <strong>Note:</strong> Salary benchmarks are estimates based on job title and location. 
                  For detailed analysis, visit the <strong>Salary Data</strong> tab under Interviews.
                </div>
              </div>
            )}

            {salaryBenchmark && !salaryBenchmark.available && (
              <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
                Salary benchmark data is not available for this position. 
                Try refreshing or check back later.
              </p>
            )}
          </div>
        )}

        {job && (!job.title && !job.location) && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "6px",
            border: "1px solid #f59e0b",
            fontSize: "0.875rem",
            color: "#92400e"
          }}>
            💡 <strong>Tip:</strong> Add a job title and location to see salary benchmarks.
          </div>
        )}

        {/* DEADLINE */}
        <label>Application Deadline</label>
        <input
          type="date"
          value={job.deadline ? job.deadline.split("T")[0] : ""}
          onChange={(e) => setJob({ ...job, deadline: e.target.value })}
        />
        <label>Date Applied</label>
        <input
          type="date"
          value={job.applied_on ? job.applied_on.split("T")[0] : ""}
          onChange={(e) => setJob({ ...job, applied_on: e.target.value })}
        />

        {/* DESCRIPTION */}
        <label>Job Description</label>
        <textarea
          rows={4}
          maxLength={2000}
          value={job.description || ""}
          onChange={(e) => setJob({ ...job, description: e.target.value })}
          placeholder="Describe responsibilities, qualifications, etc."
        />
        <label>Job Posting URL</label>
        <input
          type="url"
          value={job.url || ""}
          onChange={(e) => setJob({ ...job, url: e.target.value })}
          placeholder="https://www.linkedin.com/jobs/view/..."
        />

        {/* Optional: Quick link preview */}
        {job.url && (
          <p className="url-preview">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "0.9rem",
              }}
            >
              Open job posting ↗
            </a>
          </p>
        )}

        {/* INDUSTRY */}
        <label>Industry</label>
        <input
          value={job.industry || ""}
          onChange={(e) => setJob({ ...job, industry: e.target.value })}
          placeholder="e.g., Technology, Finance"
        />

        {/* TYPE */}
        <label>Job Type</label>
        <select
          value={job.type || ""}
          onChange={(e) => setJob({ ...job, type: e.target.value })}
        >
          <option value="">Select job type</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>

        {/* ROLE LEVEL */}
        <label>Role Level</label>
        <select
          value={job.role_level || ""}
          onChange={(e) => setJob({ ...job, role_level: e.target.value })}
        >
          <option value="">Select role level</option>
          <option value="intern">Intern</option>
          <option value="entry">Entry Level</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid-Level</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="principal">Principal</option>
          <option value="lead">Lead</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
          <option value="vp">VP</option>
        </select>
        {/* NOTES */}
        <label>Personal Notes</label>
        <textarea
          rows={3}
          value={job.notes || ""}
          onChange={(e) => setJob({ ...job, notes: e.target.value })}
          placeholder="Add your thoughts, next steps, etc."
        />

        {/* CONTACT INFO */}
        <label>Contact Name</label>
        <input
          value={job.contact_name || ""}
          onChange={(e) => setJob({ ...job, contact_name: e.target.value })}
          placeholder="e.g., John Doe"
        />

        <label>Contact Email</label>
        <input
          type="email"
          value={job.contact_email || ""}
          onChange={(e) => setJob({ ...job, contact_email: e.target.value })}
          placeholder="e.g., john.doe@company.com"
        />

        <label>Contact Phone</label>
        <input
          type="tel"
          value={job.contact_phone || ""}
          onChange={(e) => setJob({ ...job, contact_phone: e.target.value })}
          placeholder="e.g., (555) 123-4567"
        />

        {/* SALARY NEGOTIATION NOTES */}
        <label>Salary Negotiation Notes</label>
        <textarea
          rows={2}
          value={job.salary_notes || ""}
          onChange={(e) => setJob({ ...job, salary_notes: e.target.value })}
          placeholder="Negotiation history, offers, etc."
        />

        {/* INTERVIEW FEEDBACK */}
        <label>Interview Notes / Feedback</label>
        <textarea
          rows={2}
          value={job.interview_feedback || ""}
          onChange={(e) =>
            setJob({ ...job, interview_feedback: e.target.value })
          }
          placeholder="Feedback, interviewer names, or impressions"
        />

        {/* APPLICATION MATERIALS */}
        <div className="linked-materials">
          <h3>Application Materials</h3>

          {/* RESUME */}
          <div className="material-item">
            <strong>Resume Used:</strong>
            {job.resume_id ? (
              <>
                <p>{resume?.title || "Resume"}</p>

                <button
                  onClick={handleResumeDownload}
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    marginTop: "8px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  ⬇ Download Resume
                </button>
              </>
            ) : (
              <p>No resume linked.</p>
            )}
          </div>

          {/* COVER LETTER */}
          <div className="material-item" style={{ marginTop: "16px" }}>
            <strong>Cover Letter Used:</strong>
            {job.cover_letter_id ? (
              <>
                <p>{coverLetter?.title || "Cover Letter"}</p>

                <a
                  href={`http://localhost:4000/api/cover-letter/${job.cover_letter_id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                <button
                  onClick={handleCoverLetterDownload}
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    marginTop: "8px",
                    fontWeight: 500,
                    marginRight: "8px",
                    cursor: "pointer",
                  }}
                >
                  Download Cover Letter
                </button>
              </>
            ) : (
              <>
                <p>No cover letter linked.</p>
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCoverLetter}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: generatingCoverLetter ? "#94a3b8" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    marginTop: "8px",
                    fontWeight: 500,
                    cursor: generatingCoverLetter ? "not-allowed" : "pointer",
                  }}
                >
                  {generatingCoverLetter ? "Generating..." : "✨ Generate Cover Letter for This Job"}
                </button>
                {coverLetterError && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "8px" }}>
                    {coverLetterError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="change-materials">
          <h4>Change Materials</h4>

          <label>Resume</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">-- Select Resume --</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowResumeUpload(!showResumeUpload)}
              style={{
                padding: "8px 16px",
                background: showResumeUpload ? "#dc2626" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {showResumeUpload ? "✕" : "⬆️ Upload"}
            </button>
          </div>
          
          {showResumeUpload && (
            <div style={{ marginBottom: "16px" }}>
              <FileUpload
                type="resume"
                onUploadSuccess={async (data) => {
                  setShowResumeUpload(false);
                  // Reload resumes
                  try {
                    const res = await api.get("/api/resumes");
                    setResumes(res.data.resumes || []);
                    if (data.resume?.id) {
                      setSelectedResume(data.resume.id.toString());
                    }
                  } catch (err) {
                    console.error("Failed to reload resumes:", err);
                  }
                }}
              />
            </div>
          )}

          <label style={{ marginTop: "10px" }}>Cover Letter</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={selectedCover}
              onChange={(e) => setSelectedCover(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">-- Select Cover Letter --</option>
              {coverLetters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCoverLetterUpload(!showCoverLetterUpload)}
              style={{
                padding: "8px 16px",
                background: showCoverLetterUpload ? "#dc2626" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {showCoverLetterUpload ? "✕" : "⬆️ Upload"}
            </button>
          </div>
          
          {showCoverLetterUpload && (
            <div style={{ marginTop: "16px" }}>
              <FileUpload
                type="cover-letter"
                onUploadSuccess={async (data) => {
                  setShowCoverLetterUpload(false);
                  // Reload cover letters
                  try {
                    const res = await api.get("/api/cover-letters");
                    setCoverLetters(res.data.cover_letters || []);
                    if (data.cover_letter?.id) {
                      setSelectedCover(data.cover_letter.id.toString());
                    }
                  } catch (err) {
                    console.error("Failed to reload cover letters:", err);
                  }
                }}
              />
            </div>
          )}

          <button
            onClick={handleMaterialUpdate}
            style={{
              marginTop: "14px",
              padding: "8px 14px",
              background: "#2563eb",
              color: "white",
              borderRadius: "6px",
              border: "none",
            }}
          >
            Save Changes
          </button>
        </div>

        {/* ---------------------------------------- */}
        {/* QUALITY SCORE SECTION                   */}
        {/* ---------------------------------------- */}
        <div className="quality-score-section" style={{
          marginTop: "24px",
          padding: "20px",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>⭐ Application Quality Score</h3>
            <button
              type="button"
              onClick={analyzeQuality}
              disabled={analyzingQuality}
              style={{
                padding: "8px 16px",
                background: analyzingQuality ? "#94a3b8" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: analyzingQuality ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {analyzingQuality ? "Analyzing..." : qualityScore ? "Re-analyze" : "Analyze Quality"}
            </button>
          </div>

          {qualityError && (
            <div style={{ 
              padding: "12px", 
              background: "#fee2e2", 
              borderRadius: "6px", 
              marginBottom: "16px",
              color: "#991b1b",
              fontSize: "0.875rem"
            }}>
              ❌ {qualityError}
            </div>
          )}

          {qualityScore ? (
            <div>
              <QualityScoreCard score={qualityScore} userStats={userStats} />
              <ScoreBreakdown scoreBreakdown={qualityScore.score_breakdown} />
              <ImprovementSuggestions suggestions={qualityScore.improvement_suggestions || []} />
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
              Click "Analyze Quality" to get an AI-powered quality score for this application.
            </p>
          )}
        </div>


        {/* OFFER SECTION - Show when status is "Offer" */}
        {(job.status === "Offer" || existingOffer) && (
          <div className="offer-section" style={{
            marginTop: "24px",
            padding: "20px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              💼 Offer Details {existingOffer && <span style={{ fontSize: "14px", color: "#6b7280" }}>(Linked)</span>}
            </h3>
            
            {!existingOffer ? (
              <div>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Create an offer entry to track compensation. Base salary will default to minimum salary ({job.salary_min ? `$${job.salary_min.toLocaleString()}` : 'N/A'}), but you can edit it.
                </p>
                <button
                  onClick={() => setShowOfferForm(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  ➕ Create Offer Entry
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <strong>Current Offer:</strong> ${existingOffer.base_salary?.toLocaleString() || 'N/A'} base salary
                  {existingOffer.total_comp_year1 && (
                    <span style={{ color: "#6b7280", marginLeft: "8px" }}>
                      (Total Comp Year 1: ${existingOffer.total_comp_year1.toLocaleString()})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowOfferForm(!showOfferForm)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  {showOfferForm ? "Hide" : "Edit"} Offer
                </button>
              </div>
            )}
            
            {showOfferForm && (
              <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "white", borderRadius: "6px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Base Salary ($) *
                  {job.salary_min && (
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                      (Job min: ${job.salary_min.toLocaleString()}, max: ${job.salary_max ? `$${job.salary_max.toLocaleString()}` : 'N/A'})
                    </span>
                  )}
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    value={offerData.base_salary}
                    onChange={(e) => setOfferData({ ...offerData, base_salary: e.target.value })}
                    placeholder="Base salary"
                    required
                    style={{ flex: 1, minWidth: "200px", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                  />
                  {job.salary_min && (
                    <button
                      type="button"
                      onClick={() => setOfferData({ ...offerData, base_salary: job.salary_min })}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #10b981",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#059669"
                      }}
                    >
                      Use Min (${job.salary_min.toLocaleString()})
                    </button>
                  )}
                  {job.salary_max && (
                    <button
                      type="button"
                      onClick={() => setOfferData({ ...offerData, base_salary: job.salary_max })}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#fef3c7",
                        border: "1px solid #f59e0b",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#d97706"
                      }}
                    >
                      Use Max (${job.salary_max.toLocaleString()})
                    </button>
                  )}
                  {job.salary_min && job.salary_max && (
                    <button
                      type="button"
                      onClick={() => setOfferData({ ...offerData, base_salary: Math.round((job.salary_min + job.salary_max) / 2) })}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#eff6ff",
                        border: "1px solid #3b82f6",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#2563eb"
                      }}
                    >
                      Use Mid (${Math.round((job.salary_min + job.salary_max) / 2).toLocaleString()})
                    </button>
                  )}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Signing Bonus ($)</label>
                    <input
                      type="number"
                      value={offerData.signing_bonus}
                      onChange={(e) => setOfferData({ ...offerData, signing_bonus: e.target.value || 0 })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Annual Bonus %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={offerData.annual_bonus_percent}
                      onChange={(e) => setOfferData({ ...offerData, annual_bonus_percent: e.target.value || 0 })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Equity Value ($)</label>
                    <input
                      type="number"
                      value={offerData.equity_value}
                      onChange={(e) => setOfferData({ ...offerData, equity_value: e.target.value || 0 })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>PTO Days</label>
                    <input
                      type="number"
                      value={offerData.pto_days}
                      onChange={(e) => setOfferData({ ...offerData, pto_days: e.target.value || 0 })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Offer Date</label>
                    <input
                      type="date"
                      value={offerData.offer_date}
                      onChange={(e) => setOfferData({ ...offerData, offer_date: e.target.value })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Offer Status</label>
                    <select
                      value={offerData.offer_status}
                      onChange={(e) => setOfferData({ ...offerData, offer_status: e.target.value })}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    onClick={handleSaveOffer}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    {existingOffer ? "💾 Update Offer" : "✅ Create Offer"}
                  </button>
                  {existingOffer && (
                    <button
                      onClick={() => setShowOfferForm(false)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="modal-actions">
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
