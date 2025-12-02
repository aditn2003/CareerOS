import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import "./CandidateProfileModal.css";

export default function CandidateProfileModal({
  teamId,
  candidateId,
  candidateName,
  onClose,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!teamId || !candidateId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(
          `/api/team/${teamId}/members/${candidateId}/profile`
        );
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch candidate profile:", err);
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [teamId, candidateId]);

  const formatDate = (dateString) => {
    if (!dateString) return "Present";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return "Not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max.toLocaleString()}`;
  };

  const formatTechnologies = (technologies) => {
    if (!technologies) return "";
    
    // If it's already an array, join it
    if (Array.isArray(technologies)) {
      return technologies
        .map(tech => String(tech).trim())
        .filter(tech => tech.length > 0)
        .join(", ");
    }
    
    // If it's a string, split and join
    if (typeof technologies === 'string') {
      return technologies
        .split(/[,;|\n]+/)
        .map(tech => tech.trim())
        .filter(tech => tech.length > 0)
        .join(", ");
    }
    
    // Fallback: convert to string
    return String(technologies);
  };

  const formatDescription = (description) => {
    if (!description) return null;
    
    // Split by bullet points (• or *) and filter empty lines
    const lines = description
      .split(/(?=•)|(?=\*)/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // If no bullet points found, return as single paragraph
    if (lines.length === 1) {
      return <p className="employment-description">{description}</p>;
    }
    
    // Return as list
    return (
      <ul className="employment-description-list">
        {lines.map((line, idx) => (
          <li key={idx}>{line.replace(/^[•*]\s*/, '')}</li>
        ))}
      </ul>
    );
  };

  const jobStages = [
    "Interested",
    "Applied",
    "Phone Screen",
    "Interview",
    "Offer",
    "Rejected",
  ];

  let modalContent;

  if (loading) {
    modalContent = (
      <div className="candidate-profile-overlay" onClick={onClose}>
        <div className="candidate-profile-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
          <div className="loading-state">Loading profile...</div>
        </div>
      </div>
    );
  } else if (error || !profile) {
    modalContent = (
      <div className="candidate-profile-overlay" onClick={onClose}>
        <div className="candidate-profile-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
          <div className="error-state">
            <p>Failed to load profile: {error || "Unknown error"}</p>
            <button className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    modalContent = (
      <div className="candidate-profile-overlay" onClick={onClose}>
        <div
          className="candidate-profile-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>

          <div className="profile-header">
            {profile.profile.pictureUrl && (
              <img
                src={profile.profile.pictureUrl.startsWith('http') 
                  ? profile.profile.pictureUrl 
                  : `http://localhost:4000/${profile.profile.pictureUrl.replace(/^\/+/, '')}`}
                alt={candidateName}
                className="profile-picture"
                onError={(e) => {
                  console.error('Failed to load image:', profile.profile.pictureUrl);
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="profile-header-info">
              <h2>{profile.profile.fullName || candidateName}</h2>
              {profile.profile.title && <p className="profile-title">{profile.profile.title}</p>}
              {profile.profile.location && (
                <p className="profile-location">📍 {profile.profile.location}</p>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="profile-section">
            <h3>Basic Information</h3>
            <div className="info-grid">
              {profile.profile.email && (
                <div>
                  <strong>Email:</strong> {profile.profile.email}
                </div>
              )}
              {profile.profile.industry && (
                <div>
                  <strong>Industry:</strong> {profile.profile.industry}
                </div>
              )}
              {profile.profile.bio && (
                <div className="full-width">
                  <strong>Bio:</strong>
                  <p>{profile.profile.bio}</p>
                </div>
              )}
              {profile.profile.experience && (
                <div className="full-width">
                  <strong>Experience Summary:</strong>
                  <p>{profile.profile.experience}</p>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="profile-section">
              <h3>Skills</h3>
              <div className="skills-container">
                {profile.skills.map((skill, idx) => (
                  <div key={idx} className="skill-item">
                    <span className="skill-name">{skill.name}</span>
                    {skill.category && (
                      <span className="skill-category">{skill.category}</span>
                    )}
                    {skill.proficiency && (
                      <span className="skill-proficiency">
                        {skill.proficiency}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employment */}
          {profile.employment && profile.employment.length > 0 && (
            <div className="profile-section">
              <h3>Employment History</h3>
              <div className="employment-list">
                {profile.employment.map((job, idx) => (
                  <div key={idx} className="employment-item">
                    <div className="employment-header">
                      <div className="employment-title-company">
                        <h4>{job.title}</h4>
                        <span className="company-name">{job.company}</span>
                      </div>
                      <div className="employment-meta">
                        <span className="employment-date">
                          {formatDate(job.start_date)} - {formatDate(job.end_date)}
                        </span>
                        {job.current && <span className="current-badge">Current</span>}
                      </div>
                    </div>
                    {job.location && (
                      <div className="employment-location">📍 {job.location}</div>
                    )}
                    {job.description && formatDescription(job.description)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className="profile-section">
              <h3>Education</h3>
              <div className="education-list">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="education-item">
                    <strong>{edu.institution}</strong>
                    <div>
                      {edu.degree_type} {edu.field_of_study && `in ${edu.field_of_study}`}
                      {edu.graduation_date && ` • ${formatDate(edu.graduation_date)}`}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div className="profile-section">
              <h3>Projects</h3>
              <div className="projects-list">
                {profile.projects.map((project, idx) => (
                  <div key={idx} className="project-item">
                    <strong>{project.name}</strong>
                    {project.description && <p>{project.description}</p>}
                    {project.technologies && (
                      <div className="project-tech">
                        <strong>Technologies:</strong> {formatTechnologies(project.technologies)}
                      </div>
                    )}
                    {project.repository_link && (
                      <a
                        href={project.repository_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link"
                      >
                        View Project →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <div className="profile-section">
              <h3>Certifications</h3>
              <div className="certifications-list">
                {profile.certifications.map((cert, idx) => (
                  <div key={idx} className="cert-item">
                    <strong>{cert.name}</strong>
                    <div>
                      {cert.organization}
                      {cert.date_earned && ` • ${formatDate(cert.date_earned)}`}
                      {cert.expiration_date && (
                        <span className="expires">
                          {" "}
                          • Expires: {formatDate(cert.expiration_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Pipeline */}
          {profile.jobs && profile.jobs.length > 0 && (
            <div className="profile-section">
              <h3>Job Pipeline ({profile.jobs.length} jobs)</h3>
              <div className="jobs-grid">
                {jobStages.map((stage) => {
                  const stageJobs = profile.jobs.filter(
                    (job) => job.status === stage
                  );
                  if (stageJobs.length === 0) return null;
                  return (
                    <div key={stage} className="job-stage-column">
                      <h4 className="stage-header">{stage}</h4>
                      <div className="stage-jobs">
                        {stageJobs.map((job) => (
                          <div key={job.id} className="job-card">
                            <div className="job-card-header">
                              <strong>{job.title}</strong>
                              <span className="job-company">{job.company}</span>
                            </div>
                            {job.location && (
                              <div className="job-location">📍 {job.location}</div>
                            )}
                            {job.deadline && (
                              <div className="job-deadline">
                                Deadline: {formatDate(job.deadline)}
                              </div>
                            )}
                            {(job.salaryMin || job.salaryMax) && (
                              <div className="job-salary">
                                {formatSalary(job.salaryMin, job.salaryMax)}
                              </div>
                            )}
                            {job.daysInStage !== undefined && (
                              <div className="job-days">
                                {job.daysInStage} days in this stage
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!profile.jobs || profile.jobs.length === 0) && (
            <div className="profile-section">
              <h3>Job Pipeline</h3>
              <p className="empty-state">No active jobs in pipeline</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render modal using Portal to document.body to escape parent constraints
  return createPortal(modalContent, document.body);
}