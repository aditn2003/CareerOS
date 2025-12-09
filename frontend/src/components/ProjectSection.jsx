import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import ProjectForm from "./ProjectForm";
import ProjectDetailModal from "./ProjectDetailModal";
import "./ProjectPortfolio.css";

export default function ProjectSection({ token }) {
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTech, setFilterTech] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for project ID in URL for sharing
  useEffect(() => {
    const projectId = searchParams.get("project");
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === parseInt(projectId));
      if (project) {
        setSelectedProject(project);
      }
    } else if (!projectId && selectedProject) {
      // Clear selection if URL param is removed
      setSelectedProject(null);
    }
  }, [searchParams, projects]);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(data.projects || []);
    } catch (err) {
      console.error("❌ Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadProjects();
  }, [token]);

  async function deleteProject(id) {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
    try {
      await api.delete(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadProjects();
      if (selectedProject?.id === id) {
        setSelectedProject(null);
        navigate("/profile/projects");
      }
    } catch (err) {
      console.error("❌ Error deleting project:", err);
    }
  }

  // Extract unique values for filters
  const technologies = useMemo(() => {
    const techSet = new Set();
    projects.forEach((p) => {
      if (Array.isArray(p.technologies)) {
        p.technologies.forEach((t) => techSet.add(t.trim()));
      } else if (p.technologies) {
        p.technologies.split(",").forEach((t) => techSet.add(t.trim()));
      }
    });
    return Array.from(techSet).sort();
  }, [projects]);

  const industries = useMemo(() => {
    const indSet = new Set();
    projects.forEach((p) => {
      if (p.industry) indSet.add(p.industry);
    });
    return Array.from(indSet).sort();
  }, [projects]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.role?.toLowerCase().includes(query) ||
          (Array.isArray(p.technologies)
            ? p.technologies.some((t) => t.toLowerCase().includes(query))
            : p.technologies?.toLowerCase().includes(query))
      );
    }

    // Technology filter
    if (filterTech) {
      filtered = filtered.filter((p) => {
        const techs = Array.isArray(p.technologies)
          ? p.technologies
          : p.technologies?.split(",").map((t) => t.trim()) || [];
        return techs.some((t) => t.toLowerCase() === filterTech.toLowerCase());
      });
    }

    // Industry filter
    if (filterIndustry) {
      filtered = filtered.filter(
        (p) => p.industry?.toLowerCase() === filterIndustry.toLowerCase()
      );
    }

    // Date filter
    if (filterDate) {
      const now = new Date();
      const filterDateObj = new Date(filterDate);
      filtered = filtered.filter((p) => {
        const startDate = new Date(p.start_date);
        switch (filterDate) {
          case "this-year":
            return startDate.getFullYear() === now.getFullYear();
          case "last-year":
            return startDate.getFullYear() === now.getFullYear() - 1;
          case "last-2-years":
            return (
              startDate >= new Date(now.getFullYear() - 2, 0, 1) &&
              startDate <= now
            );
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.start_date) - new Date(a.start_date);
        case "date-asc":
          return new Date(a.start_date) - new Date(b.start_date);
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchQuery, filterTech, filterIndustry, filterDate, sortBy]);

  const handleShareProject = (project) => {
    const url = `${window.location.origin}/profile/projects?project=${project.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert("Project link copied to clipboard!");
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Project link copied to clipboard!");
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Project link copied to clipboard!");
    }
  };

  const handlePrintProject = (project) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${project.name} - Project Portfolio</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #5b21b6; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .tech-tag { display: inline-block; background: #ede9fe; padding: 4px 8px; margin: 2px; border-radius: 4px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>${project.name}</h1>
          <div class="section">
            <span class="label">Role:</span> ${project.role || "N/A"}
          </div>
          <div class="section">
            <span class="label">Timeline:</span> 
            ${new Date(project.start_date).toLocaleDateString()} → 
            ${project.end_date ? new Date(project.end_date).toLocaleDateString() : "Present"}
          </div>
          <div class="section">
            <span class="label">Status:</span> ${project.status || "N/A"}
          </div>
          <div class="section">
            <span class="label">Description:</span>
            <p>${project.description || "N/A"}</p>
          </div>
          ${project.technologies ? `
          <div class="section">
            <span class="label">Technologies:</span>
            ${(Array.isArray(project.technologies) ? project.technologies : project.technologies.split(",")).map(t => `<span class="tech-tag">${t.trim()}</span>`).join("")}
          </div>
          ` : ""}
          ${project.industry ? `
          <div class="section">
            <span class="label">Industry:</span> ${project.industry}
          </div>
          ` : ""}
          ${project.outcomes ? `
          <div class="section">
            <span class="label">Outcomes:</span>
            <p>${project.outcomes}</p>
          </div>
          ` : ""}
          ${project.collaboration_details ? `
          <div class="section">
            <span class="label">Collaboration:</span>
            <p>${project.collaboration_details}</p>
          </div>
          ` : ""}
          ${project.repository_link ? `
          <div class="section">
            <span class="label">Repository:</span> <a href="${project.repository_link}">${project.repository_link}</a>
          </div>
          ` : ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <section className="project-portfolio">
      <div className="portfolio-header">
        <button
          className="add-btn portfolio-add-btn"
          onClick={() =>
            setProjectForm({
              name: "",
              description: "",
              role: "",
              start_date: "",
              end_date: "",
              technologies: "",
              repository_link: "",
              team_size: "",
              collaboration_details: "",
              outcomes: "",
              industry: "",
              project_type: "",
              media_url: "",
              status: "Planned",
            })
          }
        >
          ➕ Add Project
        </button>
      </div>

      {projectForm && (
        <ProjectForm
          token={token}
          project={projectForm}
          onCancel={() => setProjectForm(null)}
          onSaved={() => {
            setProjectForm(null);
            loadProjects();
          }}
        />
      )}

      {projects.length > 0 && (
        <div className="portfolio-controls">
          {/* Search */}
          <div className="control-group">
            <input
              type="text"
              placeholder="🔍 Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filters */}
          <div className="control-group">
            <select
              value={filterTech}
              onChange={(e) => setFilterTech(e.target.value)}
              className="filter-select"
            >
              <option value="">All Technologies</option>
              {technologies.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="filter-select"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-select"
            >
              <option value="">All Dates</option>
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="last-2-years">Last 2 Years</option>
            </select>
          </div>

          {/* Sort */}
          <div className="control-group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="status">By Status</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterTech || filterIndustry || filterDate) && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setFilterTech("");
                setFilterIndustry("");
                setFilterDate("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="loading-text">Loading projects...</p>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="empty-portfolio">
          {projects.length === 0 ? (
            <p className="empty-text">No projects yet. Add your first project to get started!</p>
          ) : (
            <p className="empty-text">No projects match your filters. Try adjusting your search criteria.</p>
          )}
        </div>
      ) : (
        <>
          <div className="portfolio-stats">
            Showing {filteredAndSortedProjects.length} of {projects.length} projects
          </div>
          <div className="portfolio-grid">
            {filteredAndSortedProjects.map((project, index) => (
              <div 
                key={project.id} 
                className="project-card"
                style={{ '--index': index }}
              >
                {project.media_url && (
                  <div className="project-thumbnail">
                    <img
                      src={project.media_url}
                      alt={project.name}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="project-card-content">
                  <div className="project-card-header">
                    <h3 className="project-name">{project.name}</h3>
                    <span className={`project-status status-${project.status?.toLowerCase() || "planned"}`}>
                      {project.status || "Planned"}
                    </span>
                  </div>
                  <p className="project-role">{project.role}</p>
                  <p className="project-description">
                    {project.description?.substring(0, 120)}
                    {project.description?.length > 120 ? "..." : ""}
                  </p>
                  <div className="project-meta">
                    <span className="project-date">
                      {new Date(project.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                      {project.end_date
                        ? ` - ${new Date(project.end_date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}`
                        : " - Present"}
                    </span>
                    {project.industry && (
                      <span className="project-industry">{project.industry}</span>
                    )}
                  </div>
                  {project.technologies && (
                    <div className="project-technologies">
                      {(Array.isArray(project.technologies)
                        ? project.technologies
                        : project.technologies.split(",").map((t) => t.trim())
                      )
                        .slice(0, 3)
                        .map((tech, idx) => (
                          <span key={idx} className="tech-tag">
                            {tech.trim()}
                          </span>
                        ))}
                      {(Array.isArray(project.technologies)
                        ? project.technologies.length
                        : project.technologies.split(",").length) > 3 && (
                        <span className="tech-tag more">+{(Array.isArray(project.technologies) ? project.technologies.length : project.technologies.split(",").length) - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="project-card-actions">
                    <button
                      className="action-btn view-btn"
                      onClick={() => {
                        setSelectedProject(project);
                        navigate(`/profile/projects?project=${project.id}`, { replace: true });
                      }}
                    >
                      👁️ View Details
                    </button>
                    <button
                      className="action-btn edit-btn"
                      onClick={() => setProjectForm(project)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="action-btn share-btn"
                      onClick={() => handleShareProject(project)}
                    >
                      🔗 Share
                    </button>
                    <button
                      className="action-btn print-btn"
                      onClick={() => handlePrintProject(project)}
                    >
                      🖨️ Print
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => deleteProject(project.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            navigate("/profile/projects", { replace: true });
          }}
          onEdit={() => {
            setSelectedProject(null);
            setProjectForm(selectedProject);
          }}
          onDelete={() => {
            deleteProject(selectedProject.id);
            setSelectedProject(null);
          }}
          onShare={() => handleShareProject(selectedProject)}
          onPrint={() => handlePrintProject(selectedProject)}
        />
      )}
    </section>
  );
}
