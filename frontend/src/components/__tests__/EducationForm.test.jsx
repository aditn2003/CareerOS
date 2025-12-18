/**
 * EducationForm Component Tests - Target: 90%+ Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import EducationForm from "../EducationForm";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaGraduationCap: () => <span data-testid="icon-graduation" />,
  FaUniversity: () => <span data-testid="icon-university" />,
  FaAward: () => <span data-testid="icon-award" />,
  FaCalendarAlt: () => <span data-testid="icon-calendar" />,
  FaCheckCircle: () => <span data-testid="icon-check" />,
  FaLock: () => <span data-testid="icon-lock" />,
  FaTrophy: () => <span data-testid="icon-trophy" />,
  FaCheck: () => <span data-testid="icon-check-submit" />,
  FaTimes: () => <span data-testid="icon-times" />,
  FaPlus: () => <span data-testid="icon-plus" />,
}));

import { api } from "../../api";

describe("EducationForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    token: mockToken,
    onSaved: mockOnSaved,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getAllByText("Add Education").length).toBeGreaterThan(0);
    });

    it("renders edit mode when edu prop is provided", () => {
      const existingEdu = {
        id: 1,
        institution: "MIT",
        degree_type: "BS",
        field_of_study: "Computer Science",
      };
      render(<EducationForm {...defaultProps} edu={existingEdu} />);
      expect(screen.getByText("Edit Education")).toBeInTheDocument();
    });

    it("renders institution input", () => {
      render(<EducationForm {...defaultProps} />);
      expect(
        screen.getByPlaceholderText(/MIT, Stanford University/i)
      ).toBeInTheDocument();
    });

    it("renders degree input", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getByPlaceholderText(/BS, MS, PhD/i)).toBeInTheDocument();
    });

    it("renders field of study input", () => {
      render(<EducationForm {...defaultProps} />);
      expect(
        screen.getByPlaceholderText(/Computer Science/i)
      ).toBeInTheDocument();
    });

    it("renders education level select", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getByText("Select level")).toBeInTheDocument();
      expect(screen.getByText("High School")).toBeInTheDocument();
      expect(screen.getByText("Bachelor's")).toBeInTheDocument();
      expect(screen.getByText("Master's")).toBeInTheDocument();
      expect(screen.getByText("PhD")).toBeInTheDocument();
    });

    it("renders graduation date input", () => {
      render(<EducationForm {...defaultProps} />);
      const dateInput = document.getElementById("edu-graduation-date");
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute("type", "date");
    });

    it("renders GPA input", () => {
      render(<EducationForm {...defaultProps} />);
      const gpaInput = document.getElementById("edu-gpa");
      expect(gpaInput).toBeInTheDocument();
      expect(gpaInput).toHaveAttribute("type", "number");
    });

    it("renders currently enrolled checkbox", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getByText("Currently Enrolled")).toBeInTheDocument();
    });

    it("renders GPA private checkbox", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getByText("Hide GPA (private)")).toBeInTheDocument();
    });

    it("renders honors textarea", () => {
      render(<EducationForm {...defaultProps} />);
      expect(
        screen.getByPlaceholderText(/honors, awards, or achievements/i)
      ).toBeInTheDocument();
    });

    it("renders submit button with correct text for new entry", () => {
      render(<EducationForm {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Add Education/i })
      ).toBeInTheDocument();
    });

    it("renders submit button with correct text for edit mode", () => {
      const existingEdu = { id: 1, institution: "MIT" };
      render(<EducationForm {...defaultProps} edu={existingEdu} />);
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("renders cancel button", () => {
      render(<EducationForm {...defaultProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    it("updates institution value on change", () => {
      render(<EducationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(/MIT, Stanford University/i);
      fireEvent.change(input, { target: { value: "Harvard University" } });
      expect(input).toHaveValue("Harvard University");
    });

    it("updates degree value on change", () => {
      render(<EducationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(/BS, MS, PhD/i);
      fireEvent.change(input, { target: { value: "Master of Science" } });
      expect(input).toHaveValue("Master of Science");
    });

    it("updates field of study value on change", () => {
      render(<EducationForm {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Computer Science/i);
      fireEvent.change(input, { target: { value: "Data Science" } });
      expect(input).toHaveValue("Data Science");
    });

    it("updates education level on select change", () => {
      render(<EducationForm {...defaultProps} />);
      const select = document.getElementById("edu-level");
      fireEvent.change(select, { target: { value: "Master's" } });
      expect(select).toHaveValue("Master's");
    });

    it("updates graduation date on change", () => {
      render(<EducationForm {...defaultProps} />);
      const input = document.getElementById("edu-graduation-date");
      fireEvent.change(input, { target: { value: "2024-05-15" } });
      expect(input).toHaveValue("2024-05-15");
    });

    it("updates GPA on change", () => {
      render(<EducationForm {...defaultProps} />);
      const input = document.getElementById("edu-gpa");
      fireEvent.change(input, { target: { value: "3.8" } });
      expect(input).toHaveValue(3.8);
    });

    it("toggles currently enrolled checkbox", () => {
      render(<EducationForm {...defaultProps} />);
      const checkbox = document.getElementById("edu-currently-enrolled");
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("toggles GPA private checkbox", () => {
      render(<EducationForm {...defaultProps} />);
      const checkbox = document.getElementById("edu-gpa-private");
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("updates honors textarea on change", () => {
      render(<EducationForm {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        /honors, awards, or achievements/i
      );
      fireEvent.change(textarea, { target: { value: "Dean's List" } });
      expect(textarea).toHaveValue("Dean's List");
    });

    it("calls onCancel when cancel button is clicked", () => {
      render(<EducationForm {...defaultProps} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Form Submission - New Entry", () => {
    it("calls api.post for new entry on submit", async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });

      render(<EducationForm {...defaultProps} />);

      // Fill in required fields
      fireEvent.change(
        screen.getByPlaceholderText(/MIT, Stanford University/i),
        {
          target: { value: "Stanford University" },
        }
      );
      fireEvent.change(screen.getByPlaceholderText(/BS, MS, PhD/i), {
        target: { value: "PhD" },
      });
      fireEvent.change(screen.getByPlaceholderText(/Computer Science/i), {
        target: { value: "Artificial Intelligence" },
      });

      // Submit the form
      fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "/api/education",
          expect.objectContaining({
            institution: "Stanford University",
            degree_type: "PhD",
            field_of_study: "Artificial Intelligence",
          }),
          { headers: { Authorization: `Bearer ${mockToken}` } }
        );
      });
    });

    it("calls onSaved after successful submit", async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });

      render(<EducationForm {...defaultProps} />);

      fireEvent.change(
        screen.getByPlaceholderText(/MIT, Stanford University/i),
        {
          target: { value: "MIT" },
        }
      );

      fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalled();
      });
    });

    it("shows alert on API failure", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      api.post.mockRejectedValueOnce(new Error("Network error"));

      render(<EducationForm {...defaultProps} />);

      fireEvent.change(
        screen.getByPlaceholderText(/MIT, Stanford University/i),
        {
          target: { value: "MIT" },
        }
      );

      fireEvent.click(screen.getByRole("button", { name: /Add Education/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Failed to save education entry."
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe("Form Submission - Edit Entry", () => {
    const existingEdu = {
      id: 123,
      institution: "MIT",
      degree_type: "BS",
      field_of_study: "Computer Science",
      graduation_date: "2020-05-15",
      currently_enrolled: false,
      education_level: "Bachelor's",
      gpa: "3.9",
      gpa_private: false,
      honors: "Summa Cum Laude",
    };

    it("pre-fills form with existing education data", () => {
      render(<EducationForm {...defaultProps} edu={existingEdu} />);

      expect(
        screen.getByPlaceholderText(/MIT, Stanford University/i)
      ).toHaveValue("MIT");
      expect(screen.getByPlaceholderText(/BS, MS, PhD/i)).toHaveValue("BS");
      expect(screen.getByPlaceholderText(/Computer Science/i)).toHaveValue(
        "Computer Science"
      );
    });

    it("calls api.put for existing entry on submit", async () => {
      api.put.mockResolvedValueOnce({ data: { success: true } });

      render(<EducationForm {...defaultProps} edu={existingEdu} />);

      // Modify a field
      fireEvent.change(
        screen.getByPlaceholderText(/MIT, Stanford University/i),
        {
          target: { value: "Harvard University" },
        }
      );

      // Submit the form
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/api/education/${existingEdu.id}`,
          expect.objectContaining({
            institution: "Harvard University",
          }),
          { headers: { Authorization: `Bearer ${mockToken}` } }
        );
      });
    });

    it("calls onSaved after successful edit", async () => {
      api.put.mockResolvedValueOnce({ data: { success: true } });

      render(<EducationForm {...defaultProps} edu={existingEdu} />);

      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalled();
      });
    });
  });

  describe("Checkbox Group Click Handlers", () => {
    it("toggles currently enrolled when clicking the container div", () => {
      render(<EducationForm {...defaultProps} />);
      const checkbox = document.getElementById("edu-currently-enrolled");
      // Find the parent div and click it
      const container = checkbox.closest(".education-form-checkbox-group");
      expect(checkbox).not.toBeChecked();
      fireEvent.click(container);
      expect(checkbox).toBeChecked();
    });

    it("toggles GPA private when clicking the container div", () => {
      render(<EducationForm {...defaultProps} />);
      const checkbox = document.getElementById("edu-gpa-private");
      const container = checkbox.closest(".education-form-checkbox-group");
      expect(checkbox).not.toBeChecked();
      fireEvent.click(container);
      expect(checkbox).toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("has accessible labels for all inputs", () => {
      render(<EducationForm {...defaultProps} />);

      expect(
        screen.getByLabelText(/Educational institution/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Degree type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Field of study/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Education level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Graduation date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Grade point average/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Currently enrolled/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Hide GPA from public view/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Honors and achievements/i)
      ).toBeInTheDocument();
    });

    it("has aria-required on required fields", () => {
      render(<EducationForm {...defaultProps} />);
      const institutionInput = screen.getByLabelText(
        /Educational institution/i
      );
      expect(institutionInput).toHaveAttribute("aria-required", "true");
    });
  });
});
