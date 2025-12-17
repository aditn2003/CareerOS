/**
 * SkillsForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import SkillsForm from "../SkillsForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("SkillsForm", () => {
  const mockToken = "test-token";
  const mockOnAdded = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    expect(screen.getByText("Add New Skill")).toBeInTheDocument();
  });

  it("renders skill name input", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    expect(
      screen.getByPlaceholderText(/JavaScript, Python, Leadership/i)
    ).toBeInTheDocument();
  });

  it("renders category select", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    // Check for category options
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Soft Skills")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Industry-Specific")).toBeInTheDocument();
  });

  it("renders proficiency select", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("Expert")).toBeInTheDocument();
  });

  it("renders Add Skill button", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    expect(
      screen.getByRole("button", { name: /Add Skill/i })
    ).toBeInTheDocument();
  });

  it("renders Cancel button when onCancel provided", () => {
    render(
      <SkillsForm
        token={mockToken}
        onAdded={mockOnAdded}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("does not render Cancel button when onCancel not provided", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    expect(
      screen.queryByRole("button", { name: /Cancel/i })
    ).not.toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <SkillsForm
        token={mockToken}
        onAdded={mockOnAdded}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates skill name value on change", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "React" } });
    expect(input).toHaveValue("React");
  });

  it("shows alert when submitting empty skill name", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    expect(alertSpy).toHaveBeenCalledWith("Please enter a skill name.");
    expect(api.post).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("shows alert when submitting whitespace-only skill name", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    expect(alertSpy).toHaveBeenCalledWith("Please enter a skill name.");
    expect(api.post).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("calls api.post with correct data on submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "React" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/skills",
        { name: "React", category: "Technical", proficiency: "Beginner" },
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });
  });

  it("calls onAdded after successful submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "Python" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(mockOnAdded).toHaveBeenCalled();
    });
  });

  it("resets form after successful submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "Python" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("shows error alert on API failure", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce({
      response: { data: { error: "Skill already exists" } },
    });

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "React" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Skill already exists");
    });

    alertSpy.mockRestore();
  });

  it("shows generic error on API failure without response", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "React" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to add skill. Try again.");
    });

    alertSpy.mockRestore();
  });

  it("renders datalist with common skills", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const datalist = document.getElementById("common-skills");
    expect(datalist).toBeInTheDocument();
    expect(datalist.querySelectorAll("option").length).toBeGreaterThan(0);
  });

  it("has common skills in datalist", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const datalist = document.getElementById("common-skills");
    const options = Array.from(datalist.querySelectorAll("option")).map(
      (o) => o.value
    );

    expect(options).toContain("JavaScript");
    expect(options).toContain("Python");
    expect(options).toContain("React");
    expect(options).toContain("Leadership");
  });

  it("changes category on select", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const categorySelect = document.getElementById("skill-category");

    fireEvent.change(categorySelect, { target: { value: "Soft Skills" } });
    expect(categorySelect).toHaveValue("Soft Skills");
  });

  it("changes proficiency on select", () => {
    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);
    const proficiencySelect = document.getElementById("skill-proficiency");

    fireEvent.change(proficiencySelect, { target: { value: "Expert" } });
    expect(proficiencySelect).toHaveValue("Expert");
  });

  it("trims whitespace from skill name before submitting", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<SkillsForm token={mockToken} onAdded={mockOnAdded} />);

    const input = screen.getByPlaceholderText(
      /JavaScript, Python, Leadership/i
    );
    fireEvent.change(input, { target: { value: "  React  " } });

    fireEvent.click(screen.getByRole("button", { name: /Add Skill/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/skills",
        expect.objectContaining({ name: "React" }),
        expect.any(Object)
      );
    });
  });
});
