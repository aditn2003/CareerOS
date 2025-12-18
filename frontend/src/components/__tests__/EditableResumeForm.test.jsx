/**
 * EditableResumeForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../__tests__/helpers/test-utils";
import EditableResumeForm from "../EditableResumeForm";

describe("EditableResumeForm", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders all section headers", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Certifications")).toBeInTheDocument();
  });

  it("renders full name input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
  });

  it("renders professional title input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByPlaceholderText("Software Engineer")
    ).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(screen.getByPlaceholderText("john@example.com")).toBeInTheDocument();
  });

  it("renders phone input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByPlaceholderText("+1 (555) 123-4567")
    ).toBeInTheDocument();
  });

  it("renders location input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(screen.getByPlaceholderText("City, State")).toBeInTheDocument();
  });

  it("renders bio textarea", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByPlaceholderText("Professional summary or objective")
    ).toBeInTheDocument();
  });

  it("renders Add Experience button", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByRole("button", { name: /Add Experience/i })
    ).toBeInTheDocument();
  });

  it("renders Add Education button", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByRole("button", { name: /Add Education/i })
    ).toBeInTheDocument();
  });

  it("renders Add Project button", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByRole("button", { name: /Add Project/i })
    ).toBeInTheDocument();
  });

  it("renders Add Certification button", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByRole("button", { name: /Add Certification/i })
    ).toBeInTheDocument();
  });

  it("renders skills input", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    expect(
      screen.getByPlaceholderText("Type a skill and press Enter")
    ).toBeInTheDocument();
  });

  it("updates full name on change", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("John Doe");
    fireEvent.change(input, { target: { value: "Jane Smith" } });
    expect(input).toHaveValue("Jane Smith");
    expect(mockOnChange).toHaveBeenCalled();
  });

  it("updates professional title on change", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Software Engineer");
    fireEvent.change(input, { target: { value: "Senior Developer" } });
    expect(input).toHaveValue("Senior Developer");
  });

  it("adds experience entry when button clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Experience/i }));
    expect(screen.getByText("Experience 1")).toBeInTheDocument();
  });

  it("adds education entry when button clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));
    expect(screen.getByText("Education 1")).toBeInTheDocument();
  });

  it("adds project entry when button clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Project/i }));
    expect(screen.getByText("Project 1")).toBeInTheDocument();
  });

  it("adds certification entry when button clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Certification/i }));
    expect(screen.getByText("Certification 1")).toBeInTheDocument();
  });

  it("removes experience entry when delete button clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Experience/i }));
    expect(screen.getByText("Experience 1")).toBeInTheDocument();

    // Find and click remove button (FaTrash icon button)
    const removeButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.className.includes("btn-remove"));
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByText("Experience 1")).not.toBeInTheDocument();
  });

  it("adds skill on Enter key", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Type a skill and press Enter");
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("does not add empty skill", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Type a skill and press Enter");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Should not add empty skill
    const skillTags = document.querySelectorAll(".skill-tag");
    expect(skillTags.length).toBe(0);
  });

  it("removes skill when X clicked", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Type a skill and press Enter");

    // Add a skill
    fireEvent.change(input, { target: { value: "JavaScript" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("JavaScript")).toBeInTheDocument();

    // Remove the skill
    const removeButton = screen.getByText("×");
    fireEvent.click(removeButton);
    expect(screen.queryByText("JavaScript")).not.toBeInTheDocument();
  });

  it("pre-fills form with initial sections as object", () => {
    const initialSections = {
      summary: {
        full_name: "John Doe",
        title: "Developer",
        contact: { email: "john@test.com", phone: "555-1234", location: "NYC" },
        bio: "A developer",
      },
      experience: [],
      education: [],
      skills: ["React", "Node.js"],
      projects: [],
      certifications: [],
    };

    render(
      <EditableResumeForm sections={initialSections} onChange={mockOnChange} />
    );

    expect(screen.getByPlaceholderText("John Doe")).toHaveValue("John Doe");
    expect(screen.getByPlaceholderText("Software Engineer")).toHaveValue(
      "Developer"
    );
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("pre-fills form with initial sections as JSON string", () => {
    const initialSections = JSON.stringify({
      summary: {
        full_name: "Jane Smith",
        title: "Engineer",
        contact: { email: "jane@test.com", phone: "555-5678", location: "LA" },
        bio: "An engineer",
      },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    });

    render(
      <EditableResumeForm sections={initialSections} onChange={mockOnChange} />
    );

    expect(screen.getByPlaceholderText("John Doe")).toHaveValue("Jane Smith");
    expect(screen.getByPlaceholderText("Software Engineer")).toHaveValue(
      "Engineer"
    );
  });

  it("calls onChange when sections are updated", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("John Doe");
    fireEvent.change(input, { target: { value: "Test Name" } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("formats dates correctly for input fields", () => {
    const initialSections = {
      summary: { full_name: "", title: "", contact: {}, bio: "" },
      experience: [
        {
          title: "Dev",
          company: "Corp",
          start_date: "2024-01-15T00:00:00.000Z",
          end_date: "",
        },
      ],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    };

    render(
      <EditableResumeForm sections={initialSections} onChange={mockOnChange} />
    );

    // The date should be formatted as yyyy-MM-dd
    const startDateInput = document.querySelector('input[type="date"]');
    expect(startDateInput).toHaveValue("2024-01-15");
  });

  it("handles experience with current position checkbox", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);

    // Add experience
    fireEvent.click(screen.getByRole("button", { name: /Add Experience/i }));

    // Find and toggle current position checkbox
    const checkbox = screen.getByLabelText(/Current Position/i);
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("handles project technologies as comma-separated string", () => {
    render(<EditableResumeForm onChange={mockOnChange} />);

    // Add project
    fireEvent.click(screen.getByRole("button", { name: /Add Project/i }));

    // Find technologies input
    const techInput = screen.getByPlaceholderText("React, Node.js, MongoDB");
    fireEvent.change(techInput, {
      target: { value: "Python, Django, PostgreSQL" },
    });
    expect(techInput).toHaveValue("Python, Django, PostgreSQL");
  });
});
