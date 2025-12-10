// src/pages/Match/QualityScoringTab.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api";
import QualityScoreCard from "../../components/QualityScoreCard";
import ScoreBreakdown from "../../components/ScoreBreakdown";
import ImprovementSuggestions from "../../components/ImprovementSuggestions";
import MissingItemsList from "../../components/MissingItemsList";

export default function QualityScoringTab() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [qualityScore, setQualityScore] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Materials management
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [currentResumeId, setCurrentResumeId] = useState("");
  const [currentCoverLetterId, setCurrentCoverLetterId] = useState("");
  const [updatingMaterials, setUpdatingMaterials] = useState(false);

  // Load all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/api/jobs");
        setJobs(res.data.jobs || []);
      } catch (err) {
        console.error("❌ Error loading jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  // Load user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await api.get("/api/quality-scoring/user/stats");
        setUserStats(res.data.stats);
      } catch (err) {
        console.error("❌ Error loading user stats:", err);
      }
    };
    fetchUserStats();
  }, []);

  // Load materials lists
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const [resResumes, resCovers] = await Promise.all([
          api.get("/api/resumes"),
          api.get("/api/cover-letter")
        ]);
        
        setResumes(resResumes.data.resumes || []);
        
        // Handle cover letters - combine both uploaded_cover_letters and cover_letters
        const coverData = resCovers.data;
        // The API now returns combined cover_letters array with both types
        const allCovers = coverData.cover_letters || [];
        
        // Also include legacy cover_letters if separate
        if (coverData.cover_letters_legacy && coverData.cover_letters_legacy.length > 0) {
          // Merge if not already included
          const existingIds = new Set(allCovers.map(c => c.id));
          const additional = coverData.cover_letters_legacy.filter(c => !existingIds.has(c.id));
          allCovers.push(...additional);
        }
        
        setCoverLetters(allCovers);
        console.log(`📋 [QUALITY SCORING] Loaded ${allCovers.length} cover letters (from both tables)`);
      } catch (err) {
        console.error("❌ Error loading materials:", err);
      }
    };
    
    fetchMaterials();
  }, []);

  // Load job materials and quality score when job is selected
  useEffect(() => {
    if (selectedJobId) {
      loadJobMaterials(selectedJobId);
      loadQualityScore(selectedJobId);
    } else {
      setQualityScore(null);
      setCurrentResumeId("");
      setCurrentCoverLetterId("");
    }
  }, [selectedJobId]);
  
  const loadJobMaterials = async (jobId) => {
    try {
      const res = await api.get(`/api/jobs/${jobId}`);
      const job = res.data.job;
      
      // Get materials from job_materials (via job data)
      // The job object should have resume_id and cover_letter_id from job_materials
      // Convert to strings for select elements
      setCurrentResumeId(job.resume_id ? String(job.resume_id) : "");
      setCurrentCoverLetterId(job.cover_letter_id ? String(job.cover_letter_id) : "");
      
      console.log(`📋 [QUALITY SCORING] Loaded materials for job ${jobId}: resume=${job.resume_id}, cover=${job.cover_letter_id}`);
    } catch (err) {
      console.error("❌ Error loading job materials:", err);
    }
  };
  
  const updateMaterials = async () => {
    if (!selectedJobId) return;
    
    try {
      setUpdatingMaterials(true);
      setError(null);
      
      // Update job materials via API
      const res = await api.put(`/api/jobs/${selectedJobId}/materials`, {
        resume_id: currentResumeId ? parseInt(currentResumeId) : null,
        cover_letter_id: currentCoverLetterId ? parseInt(currentCoverLetterId) : null
      });
      
      // Reload job materials to confirm update
      await loadJobMaterials(selectedJobId);
      
      // Clear quality score and force re-analysis with new materials
      setQualityScore(null);
      if (currentResumeId || currentCoverLetterId) {
        // Force refresh to get new analysis with updated materials
        await analyzeQuality(true);
      }
    } catch (err) {
      console.error("❌ Error updating materials:", err);
      setError(err.response?.data?.message || "Failed to update materials");
    } finally {
      setUpdatingMaterials(false);
    }
  };

  const loadQualityScore = async (jobId) => {
    try {
      setLoading(true);
      setError(null);
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
      if (err.response?.status === 404) {
        // No score exists yet, that's okay
        setQualityScore(null);
      } else {
        console.error("❌ Error loading quality score:", err);
        setError("Failed to load quality score");
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeQuality = async (forceRefresh = false) => {
    if (!selectedJobId) return;

    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 [QUALITY SCORING] Starting analysis with forceRefresh=${forceRefresh}`);
      
      const res = await api.post(`/api/quality-scoring/${selectedJobId}/analyze`, {
        forceRefresh,
      });
      const score = res.data.score;
      
      console.log(`✅ [QUALITY SCORING] Received score:`, score);
      
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
      
      // Ensure arrays are arrays (not null/undefined)
      score.formatting_issues = Array.isArray(score.formatting_issues) ? score.formatting_issues : [];
      score.inconsistencies = Array.isArray(score.inconsistencies) ? score.inconsistencies : [];
      score.missing_keywords = Array.isArray(score.missing_keywords) ? score.missing_keywords : [];
      score.missing_skills = Array.isArray(score.missing_skills) ? score.missing_skills : [];
      
      console.log(`📊 [QUALITY SCORING] Parsed score - issues: ${score.formatting_issues.length}, inconsistencies: ${score.inconsistencies.length}`);
      
      setQualityScore(score);
      
      // Refresh user stats after analysis
      const statsRes = await api.get("/api/quality-scoring/user/stats");
      setUserStats(statsRes.data.stats);
    } catch (err) {
      console.error("❌ Error analyzing quality:", err);
      setError(err.response?.data?.message || "Failed to analyze application quality");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quality-tab-content">
      <div className="quality-header">
        <h2>Application Quality Scoring</h2>
        <p className="quality-subtitle">
          Get AI-powered quality scores for your application packages (resume, cover letter, LinkedIn)
          to identify weak applications before submitting.
        </p>
      </div>

      {/* Job Selector */}
      <div className="match-select-row">
        <select
          className="match-job-select"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          <option value="">Select a job to analyze</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} — {job.company}
            </option>
          ))}
        </select>

        <button
          className="match-run-btn"
          onClick={() => analyzeQuality(false)}
          disabled={!selectedJobId || loading}
        >
          {loading ? "Analyzing…" : "Analyze Quality"}
        </button>
      </div>

      {/* Materials Selector - Show when job is selected */}
      {selectedJobId && (
        <div className="quality-materials-selector">
          <h3>Application Materials</h3>
          <p className="quality-materials-subtitle">
            Select the resume and cover letter to use for this job application
          </p>
          
          <div className="quality-materials-fields">
            <div className="quality-material-field">
              <label>Resume</label>
              <select
                value={currentResumeId}
                onChange={(e) => setCurrentResumeId(e.target.value)}
                className="quality-material-select"
              >
                <option value="">No Resume Selected</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={String(resume.id)}>
                    {resume.title || `Resume ${resume.id}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="quality-material-field">
              <label>Cover Letter</label>
              <select
                value={currentCoverLetterId}
                onChange={(e) => setCurrentCoverLetterId(e.target.value)}
                className="quality-material-select"
              >
                <option value="">No Cover Letter Selected</option>
                {coverLetters.map((cover) => (
                  <option key={cover.id} value={String(cover.id)}>
                    {cover.title || cover.name || `Cover Letter ${cover.id}`}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              className="quality-update-materials-btn"
              onClick={updateMaterials}
              disabled={updatingMaterials}
            >
              {updatingMaterials ? "Updating…" : "Update Materials"}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="quality-error">
          <p>❌ {error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="quality-loading">
          <p>Analyzing application quality using AI…</p>
        </div>
      )}

      {/* Quality Score Display */}
      {qualityScore ? (
        <div className="quality-results">
          <div className="quality-score-header">
            <QualityScoreCard score={qualityScore} userStats={userStats} />
            <div className="quality-reanalyze-top">
              <button
                className="match-run-btn"
                onClick={() => analyzeQuality(true)}
                disabled={loading}
              >
                {loading ? "Re-analyzing…" : "Re-analyze Quality"}
              </button>
            </div>
          </div>
          
          <ScoreBreakdown scoreBreakdown={qualityScore.score_breakdown} />
          
          <MissingItemsList
            missingKeywords={qualityScore.missing_keywords || []}
            missingSkills={qualityScore.missing_skills || []}
          />
          
          <ImprovementSuggestions
            suggestions={qualityScore.improvement_suggestions || []}
          />
        </div>
      ) : (
        !loading && selectedJobId && (
          <div className="quality-placeholder">
            <p>Click "Analyze Quality" to get started.</p>
            <p className="quality-placeholder-note">
              This feature will analyze your resume, cover letter, and LinkedIn profile
              against the job requirements and provide actionable improvement suggestions.
            </p>
          </div>
        )
      )}

      {/* Info Box */}
      <div className="quality-info-box">
        <h3>📊 What gets analyzed?</h3>
        <ul>
          <li><strong>Resume:</strong> Keyword alignment, skills match, experience relevance, formatting quality</li>
          <li><strong>Cover Letter:</strong> Job-specific customization, keyword integration, professional tone</li>
          <li><strong>LinkedIn Profile:</strong> Profile completeness and alignment (if available)</li>
        </ul>
        <h3>🎯 Features</h3>
        <ul>
          <li>0-100 quality score with detailed breakdown</li>
          <li>Missing keywords and skills identification</li>
          <li>Formatting issues and typo detection</li>
          <li>Prioritized improvement suggestions</li>
          <li>Comparison to your average and top-performing applications</li>
          <li>Minimum threshold enforcement (default: 70)</li>
        </ul>
      </div>
    </div>
  );
}

