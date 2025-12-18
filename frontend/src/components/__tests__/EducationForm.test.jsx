/**
 * EducationForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import EducationForm from "../EducationForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("EducationForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Add Education"
    );
  });

  it("renders Add Education title when no edu prop", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Add Education"
    );
  });

  it("renders Edit Education title when edu prop provided", () => {
    const existingEdu = { id: 1, institution: "MIT" };
    render(
      <EducationForm
        token={mockToken}
        edu={existingEdu}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Edit Education"
    );
  });

  it("renders institution input", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Educational institution/i)
    ).toBeInTheDocument();
  });

  it("renders degree input", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Degree type/i)).toBeInTheDocument();
  });

  it("renders field of study input", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Field of study/i)).toBeInTheDocument();
  });

  it("renders education level select", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Education level/i)).toBeInTheDocument();
  });

  it("renders graduation date input", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Graduation date/i)).toBeInTheDocument();
  });

  it("renders GPA input", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Grade point average/i)).toBeInTheDocument();
  });

  it("renders currently enrolled checkbox", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Currently enrolled/i)).toBeInTheDocument();
  });

  it("renders GPA private checkbox", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Hide GPA/i)).toBeInTheDocument();
  });

  it("renders honors textarea", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Honors and achievements/i)
    ).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByRole("button", { name: /Add Education/i })
    ).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates institution value on change", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText(/Educational institution/i);
    fireEvent.change(input, { target: { value: "Harvard University" } });
    expect(input).toHaveValue("Harvard University");
  });

  it("updates degree value on change", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText(/Degree type/i);
    fireEvent.change(input, { target: { value: "BS" } });
    expect(input).toHaveValue("BS");
  });

  it("toggles currently enrolled checkbox", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const checkbox = screen.getByLabelText(/Currently enrolled/i);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("toggles GPA private checkbox", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const checkbox = screen.getByLabelText(/Hide GPA/i);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("pre-fills form when edu prop provided", () => {
    const existingEdu = {
      id: 1,
      institution: "MIT",
      degree_type: "PhD",
      field_of_study: "Computer Science",
      education_level: "PhD",
      gpa: "3.9",
      currently_enrolled: true,
    };
    render(
      <EducationForm
        token={mockToken}
        edu={existingEdu}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Educational institution/i)).toHaveValue(
      "MIT"
    );
    expect(screen.getByLabelText(/Degree type/i)).toHaveValue("PhD");
    expect(screen.getByLabelText(/Field of study/i)).toHaveValue(
      "Computer Science"
    );
  });

  it("calls api.post for new education on submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Educational institution/i), {
      target: { value: "Test University" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/education",
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls api.put for existing education on submit", async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });
    const existingEdu = { id: 1, institution: "MIT" };

    render(
      <EducationForm
        token={mockToken}
        edu={existingEdu}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/education/1",
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls onSaved after successful submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to save education entry.");
    });

    alertSpy.mockRestore();
  });

  it("renders education level options", () => {
    render(
      <EducationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    const select = screen.getByLabelText(/Education level/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText("High School")).toBeInTheDocument();
    expect(screen.getByText("Associate")).toBeInTheDocument();
    expect(screen.getByText("Bachelor's")).toBeInTheDocument();
    expect(screen.getByText("Master's")).toBeInTheDocument();
    expect(screen.getByText("PhD")).toBeInTheDocument();
  });
});
