import { useEffect } from "react";
import "./ProjectPortfolio.css";

export default function ProjectDetailModal({
  project,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onPrint,
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!project) return null;

  const technologies = Array.isArray(project.technologies)
    ? project.technologies
    : project.technologies?.split(",").map((t) => t.trim()) || [];

  return (
    <div className="project-detail-inline">
      <div className="project-detail-header-inline">
        <h2>{project.name}</h2>
        <button className="close-btn-inline" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div className="project-detail">
          {project.media_url && (
            <div className="project-detail-image">
              <img
                src={project.media_url}
                alt={project.name}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="project-detail-header">
            <span className={`project-status status-${project.status?.toLowerCase() || "planned"}`}>
              {project.status || "Planned"}
            </span>
          </div>

          <div className="project-detail-meta">
            <div className="detail-item">
              <span className="detail-label">Role:</span>
              <span className="detail-value">{project.role || "N/A"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Timeline:</span>
              <span className="detail-value">
                {new Date(project.start_date).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
                {project.end_date
                  ? ` - ${new Date(project.end_date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}`
                  : " - Present"}
              </span>
            </div>
            {project.industry && (
              <div className="detail-item">
                <span className="detail-label">Industry:</span>
                <span className="detail-value">{project.industry}</span>
              </div>
            )}
            {project.project_type && (
              <div className="detail-item">
                <span className="detail-label">Project Type:</span>
                <span className="detail-value">{project.project_type}</span>
              </div>
            )}
            {project.team_size && (
              <div className="detail-item">
                <span className="detail-label">Team Size:</span>
                <span className="detail-value">{project.team_size} members</span>
              </div>
            )}
          </div>

          <div className="project-detail-section">
            <h3>Description</h3>
            <p>{project.description || "No description provided."}</p>
          </div>

          {technologies.length > 0 && (
            <div className="project-detail-section">
              <h3>Technologies</h3>
              <div className="technologies-list">
                {technologies.map((tech, idx) => (
                  <span key={idx} className="tech-tag large">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {project.outcomes && (
            <div className="project-detail-section">
              <h3>Outcomes & Achievements</h3>
              <p>{project.outcomes}</p>
            </div>
          )}

          {project.collaboration_details && (
            <div className="project-detail-section">
              <h3>Collaboration Details</h3>
              <p>{project.collaboration_details}</p>
            </div>
          )}

          {project.repository_link && (
            <div className="project-detail-section">
              <h3>Repository</h3>
              <a
                href={project.repository_link}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                🔗 {project.repository_link}
              </a>
            </div>
          )}

          <div className="project-detail-actions">
            <button className="action-btn view-btn" onClick={onShare}>
              🔗 Share Project
            </button>
            <button className="action-btn print-btn" onClick={onPrint}>
              🖨️ Print Summary
            </button>
            <button className="action-btn edit-btn" onClick={onEdit}>
              ✏️ Edit Project
            </button>
            <button className="action-btn delete-btn" onClick={onDelete}>
              🗑️ Delete Project
            </button>
          </div>
        </div>
    </div>
  );
}

