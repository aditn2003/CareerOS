/**
 * ProjectDetailModal Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../__tests__/helpers/test-utils";
import ProjectDetailModal from "../ProjectDetailModal";

describe("ProjectDetailModal", () => {
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnShare = vi.fn();
  const mockOnPrint = vi.fn();

  const mockProject = {
    name: "Test Project",
    role: "Lead Developer",
    description: "A great project description",
    start_date: "2024-01-15",
    end_date: "2024-06-15",
    status: "Completed",
    industry: "Technology",
    project_type: "Web Application",
    team_size: 5,
    technologies: ["React", "Node.js", "PostgreSQL"],
    outcomes: "Increased efficiency by 50%",
    collaboration_details: "Worked with design team",
    repository_link: "https://github.com/test/project",
    media_url: "/images/project.png",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no project provided", () => {
    const { container } = render(
      <ProjectDetailModal
        project={null}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders project name", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders project role", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Lead Developer")).toBeInTheDocument();
  });

  it("renders project status", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders project description", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("A great project description")).toBeInTheDocument();
  });

  it("renders technologies", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("renders technologies from string", () => {
    const projectWithStringTech = {
      ...mockProject,
      technologies: "React, Node.js, PostgreSQL",
    };
    render(
      <ProjectDetailModal
        project={projectWithStringTech}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders outcomes section", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Outcomes & Achievements")).toBeInTheDocument();
    expect(screen.getByText("Increased efficiency by 50%")).toBeInTheDocument();
  });

  it("renders collaboration details", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Collaboration Details")).toBeInTheDocument();
    expect(screen.getByText("Worked with design team")).toBeInTheDocument();
  });

  it("renders repository link", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Repository")).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /github\.com\/test\/project/i,
    });
    expect(link).toHaveAttribute("href", "https://github.com/test/project");
  });

  it("calls onClose when close button clicked", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    fireEvent.click(screen.getByText("✕ Close"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onShare when Share button clicked", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    fireEvent.click(screen.getByText("🔗 Share Project"));
    expect(mockOnShare).toHaveBeenCalledTimes(1);
  });

  it("calls onPrint when Print button clicked", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    fireEvent.click(screen.getByText("🖨️ Print Summary"));
    expect(mockOnPrint).toHaveBeenCalledTimes(1);
  });

  it("calls onEdit when Edit button clicked", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    fireEvent.click(screen.getByText("✏️ Edit Project"));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when Delete button clicked", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    fireEvent.click(screen.getByText("🗑️ Delete Project"));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("shows Present when no end date", () => {
    const ongoingProject = { ...mockProject, end_date: null };
    render(
      <ProjectDetailModal
        project={ongoingProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText(/Present/)).toBeInTheDocument();
  });

  it("renders team size", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Team Size:")).toBeInTheDocument();
    expect(screen.getByText("5 members")).toBeInTheDocument();
  });

  it("renders industry", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );
    expect(screen.getByText("Industry:")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    // Simulate pressing the Escape key
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for non-Escape keys", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    // Simulate pressing a different key
    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("hides image on error", () => {
    render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    const img = screen.getByRole("img", { name: "Test Project" });

    // Simulate image load error
    fireEvent.error(img);

    expect(img.style.display).toBe("none");
  });

  it("renders without media_url", () => {
    const projectWithoutMedia = { ...mockProject, media_url: null };
    render(
      <ProjectDetailModal
        project={projectWithoutMedia}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(
      screen.queryByRole("img", { name: "Test Project" })
    ).not.toBeInTheDocument();
  });

  it("renders with default status when status is missing", () => {
    const projectWithoutStatus = { ...mockProject, status: null };
    render(
      <ProjectDetailModal
        project={projectWithoutStatus}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("renders N/A when role is missing", () => {
    const projectWithoutRole = { ...mockProject, role: null };
    render(
      <ProjectDetailModal
        project={projectWithoutRole}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders default description when description is missing", () => {
    const projectWithoutDesc = { ...mockProject, description: null };
    render(
      <ProjectDetailModal
        project={projectWithoutDesc}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.getByText("No description provided.")).toBeInTheDocument();
  });

  it("handles undefined technologies", () => {
    const projectWithoutTech = { ...mockProject, technologies: undefined };
    render(
      <ProjectDetailModal
        project={projectWithoutTech}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    // Should not render Technologies section
    expect(screen.queryByText("Technologies")).not.toBeInTheDocument();
  });

  it("handles empty technologies array", () => {
    const projectWithEmptyTech = { ...mockProject, technologies: [] };
    render(
      <ProjectDetailModal
        project={projectWithEmptyTech}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    // Should not render Technologies section for empty array
    expect(screen.queryByText("Technologies")).not.toBeInTheDocument();
  });

  it("does not render industry when missing", () => {
    const projectWithoutIndustry = { ...mockProject, industry: null };
    render(
      <ProjectDetailModal
        project={projectWithoutIndustry}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.queryByText("Industry:")).not.toBeInTheDocument();
  });

  it("does not render project_type when missing", () => {
    const projectWithoutType = { ...mockProject, project_type: null };
    render(
      <ProjectDetailModal
        project={projectWithoutType}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.queryByText("Project Type:")).not.toBeInTheDocument();
  });

  it("does not render team_size when missing", () => {
    const projectWithoutTeam = { ...mockProject, team_size: null };
    render(
      <ProjectDetailModal
        project={projectWithoutTeam}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.queryByText("Team Size:")).not.toBeInTheDocument();
  });

  it("does not render outcomes when missing", () => {
    const projectWithoutOutcomes = { ...mockProject, outcomes: null };
    render(
      <ProjectDetailModal
        project={projectWithoutOutcomes}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(
      screen.queryByText("Outcomes & Achievements")
    ).not.toBeInTheDocument();
  });

  it("does not render collaboration_details when missing", () => {
    const projectWithoutCollab = {
      ...mockProject,
      collaboration_details: null,
    };
    render(
      <ProjectDetailModal
        project={projectWithoutCollab}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.queryByText("Collaboration Details")).not.toBeInTheDocument();
  });

  it("does not render repository_link when missing", () => {
    const projectWithoutRepo = { ...mockProject, repository_link: null };
    render(
      <ProjectDetailModal
        project={projectWithoutRepo}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    expect(screen.queryByText("Repository")).not.toBeInTheDocument();
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <ProjectDetailModal
        project={mockProject}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        onPrint={mockOnPrint}
      />
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    removeEventListenerSpy.mockRestore();
  });
});
