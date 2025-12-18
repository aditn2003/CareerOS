/**
 * ProjectForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import ProjectForm from "../ProjectForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("ProjectForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Add New Project")).toBeInTheDocument();
  });

  it("renders Edit Project title when project prop provided", () => {
    const existingProject = { id: 1, name: "My Project" };
    render(
      <ProjectForm
        token={mockToken}
        project={existingProject}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Edit Project")).toBeInTheDocument();
  });

  it("renders project name input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Project Name")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument();
  });

  it("renders role input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Your Role")).toBeInTheDocument();
  });

  it("renders start date input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const startDateInputs = screen
      .getAllByRole("textbox")
      .filter(
        (el) =>
          el.getAttribute("type") === "date" ||
          el.getAttribute("name") === "start_date"
      );
    // Use document.querySelector for date input
    const startDateInput = document.querySelector('input[name="start_date"]');
    expect(startDateInput).toBeInTheDocument();
  });

  it("renders technologies input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByPlaceholderText("Technologies (comma separated)")
    ).toBeInTheDocument();
  });

  it("renders repository link input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByPlaceholderText("Repository/URL (optional)")
    ).toBeInTheDocument();
  });

  it("renders team size input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Team Size")).toBeInTheDocument();
  });

  it("renders status select with options", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates project name on change", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByPlaceholderText("Project Name");
    fireEvent.change(input, { target: { value: "My Awesome Project" } });
    expect(input).toHaveValue("My Awesome Project");
  });

  it("updates description on change", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const textarea = screen.getByPlaceholderText("Description");
    fireEvent.change(textarea, { target: { value: "A great project" } });
    expect(textarea).toHaveValue("A great project");
  });

  it("pre-fills form when project prop provided", () => {
    const existingProject = {
      id: 1,
      name: "Existing Project",
      description: "Project description",
      role: "Lead Developer",
      technologies: ["React", "Node.js"],
      status: "Completed",
    };
    render(
      <ProjectForm
        token={mockToken}
        project={existingProject}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Project Name")).toHaveValue(
      "Existing Project"
    );
    expect(screen.getByPlaceholderText("Description")).toHaveValue(
      "Project description"
    );
    expect(screen.getByPlaceholderText("Your Role")).toHaveValue(
      "Lead Developer"
    );
    expect(
      screen.getByPlaceholderText("Technologies (comma separated)")
    ).toHaveValue("React, Node.js");
  });

  it("calls api.post for new project on submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Project Name"), {
      target: { value: "New Project" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Project description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Role"), {
      target: { value: "Developer" },
    });
    const startDateInput = document.querySelector('input[name="start_date"]');
    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/projects",
        expect.any(FormData),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls api.put for existing project on submit", async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });
    const existingProject = {
      id: 1,
      name: "Existing Project",
      description: "Description",
      role: "Developer",
      start_date: "2024-01-01",
    };

    render(
      <ProjectForm
        token={mockToken}
        project={existingProject}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/projects/1",
        expect.any(FormData),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls onSaved after successful submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Project Name"), {
      target: { value: "New Project" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Role"), {
      target: { value: "Developer" },
    });
    const startDateInput = document.querySelector('input[name="start_date"]');
    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Project Name"), {
      target: { value: "New Project" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Role"), {
      target: { value: "Developer" },
    });
    const startDateInput = document.querySelector('input[name="start_date"]');
    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error saving project");
    });

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("renders section headers", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Basic Details")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Technical Details")).toBeInTheDocument();
    expect(screen.getByText("Collaboration & Outcome")).toBeInTheDocument();
    expect(screen.getByText("Status & Media")).toBeInTheDocument();
  });

  it("renders file upload input", () => {
    render(
      <ProjectForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it("handles technologies as array", () => {
    const existingProject = {
      id: 1,
      name: "Project",
      technologies: ["React", "Node.js", "TypeScript"],
    };
    render(
      <ProjectForm
        token={mockToken}
        project={existingProject}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByPlaceholderText("Technologies (comma separated)")
    ).toHaveValue("React, Node.js, TypeScript");
  });

  it("handles technologies as string", () => {
    const existingProject = {
      id: 1,
      name: "Project",
      technologies: "React, Node.js",
    };
    render(
      <ProjectForm
        token={mockToken}
        project={existingProject}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByPlaceholderText("Technologies (comma separated)")
    ).toHaveValue("React, Node.js");
  });
});
