/**
 * EducationSection Component Tests - Target: 90%+ Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import EducationSection, { getDuration } from "../EducationSection";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaGraduationCap: () => <span data-testid="icon-graduation" />,
  FaUniversity: () => <span data-testid="icon-university" />,
  FaCalendarAlt: () => <span data-testid="icon-calendar" />,
  FaAward: () => <span data-testid="icon-award" />,
  FaTrophy: () => <span data-testid="icon-trophy" />,
  FaEdit: () => <span data-testid="icon-edit" />,
  FaTrash: () => <span data-testid="icon-trash" />,
  FaPlus: () => <span data-testid="icon-plus" />,
  FaCheckCircle: () => <span data-testid="icon-check" />,
  FaChartLine: () => <span data-testid="icon-chart" />,
  FaStar: () => <span data-testid="icon-star" />,
}));

import { api } from "../../api";

describe("EducationSection", () => {
  const mockToken = "test-token";
  const mockOnEdit = vi.fn();

  const defaultProps = {
    token: mockToken,
    onEdit: mockOnEdit,
  };

  const mockEducation = [
    {
      id: 1,
      institution: "MIT",
      degree_type: "BS",
      field_of_study: "Computer Science",
      graduation_date: "2020-05-15",
      currently_enrolled: false,
      education_level: "Bachelor's",
      gpa: "3.9",
      gpa_private: false,
      honors: "Summa Cum Laude",
    },
    {
      id: 2,
      institution: "Stanford University",
      degree_type: "MS",
      field_of_study: "Artificial Intelligence",
      graduation_date: null,
      currently_enrolled: true,
      education_level: "Master's",
      gpa: "4.0",
      gpa_private: false,
      honors: null,
    },
    {
      id: 3,
      institution: "Harvard",
      degree_type: "PhD",
      field_of_study: "Machine Learning",
      graduation_date: "2018-05-15",
      currently_enrolled: false,
      education_level: "PhD",
      gpa: "3.8",
      gpa_private: true,
      honors: "Research Award",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { education: mockEducation } });
  });

  describe("Loading State", () => {
    it("loads education on mount when token is provided", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith("/api/education", {
          headers: { Authorization: `Bearer ${mockToken}` },
        });
      });
    });

    it("does not load education when token is not provided", async () => {
      render(<EducationSection token={null} onEdit={mockOnEdit} />);

      await waitFor(
        () => {
          expect(api.get).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no education entries", async () => {
    api.get.mockResolvedValueOnce({ data: { education: [] } });

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(
          screen.getByText("No education history yet.")
        ).toBeInTheDocument();
    });
  });

    it("shows helpful message in empty state", async () => {
      api.get.mockResolvedValueOnce({ data: { education: [] } });

      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Add your first education entry/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Education List", () => {
    it("displays education entries", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
        expect(screen.getByText("Stanford University")).toBeInTheDocument();
        expect(screen.getByText("Harvard")).toBeInTheDocument();
      });
    });

    it("displays degree and field of study", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
      expect(screen.getByText("BS")).toBeInTheDocument();
        expect(screen.getByText(/Computer Science/i)).toBeInTheDocument();
      });
    });

    it("displays GPA when not private", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/GPA: 3.9/i)).toBeInTheDocument();
        expect(screen.getByText(/GPA: 4.0/i)).toBeInTheDocument();
      });
    });

    it("hides GPA when marked as private", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        // GPA 3.8 should not be visible because it's marked private
        expect(screen.queryByText(/GPA: 3.8/i)).not.toBeInTheDocument();
      });
    });

    it("displays honors when available", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Summa Cum Laude/i)).toBeInTheDocument();
        expect(screen.getByText(/Research Award/i)).toBeInTheDocument();
      });
    });

    it("shows current badge for enrolled students", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Current")).toBeInTheDocument();
    });
  });

    it("shows Currently Enrolled text for enrolled students", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        const enrolledTexts = screen.getAllByText("Currently Enrolled");
        expect(enrolledTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Statistics Section", () => {
    it("displays total degrees count", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Total Degrees")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("displays currently enrolled count", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        // The stat label says "Currently Enrolled"
        expect(
          screen.getAllByText("Currently Enrolled").length
        ).toBeGreaterThan(0);
        // 1 entry is currently enrolled - check the stat value
        expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

    it("displays average GPA", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Avg GPA")).toBeInTheDocument();
        // Average of 3.9 and 4.0 (3.8 is private)
        expect(screen.getByText("3.95")).toBeInTheDocument();
      });
    });

    it("displays with honors count", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(screen.getByText("With Honors")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

    it("shows N/A for average GPA when no public GPAs", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
              institution: "Test",
            degree_type: "BS",
              gpa: "3.5",
            gpa_private: true,
          },
        ],
      },
    });

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

    it("does not show stats when no education entries", async () => {
      api.get.mockResolvedValueOnce({ data: { education: [] } });

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(screen.queryByText("Total Degrees")).not.toBeInTheDocument();
      });
    });
  });

  describe("Actions", () => {
    it("calls onEdit when edit button is clicked", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(screen.getByText("Stanford University")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      // Currently enrolled (Stanford) is sorted first
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ institution: "Stanford University" })
      );
    });

    it("confirms before deleting", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Stanford University")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith("Delete this education entry?");
      expect(api.delete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it("calls api.delete when deletion is confirmed", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      api.delete.mockResolvedValueOnce({});

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(screen.getByText("Stanford University")).toBeInTheDocument();
    });

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      // Currently enrolled (Stanford, id: 2) is sorted first
      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith("/api/education/2", {
          headers: { Authorization: `Bearer ${mockToken}` },
        });
      });

      confirmSpy.mockRestore();
  });

    it("shows alert on delete failure", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      api.delete.mockRejectedValueOnce(new Error("Delete failed"));

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
    });

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Failed to delete education entry"
      );
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe("Sorting", () => {
    it("sorts currently enrolled entries first", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        const listItems = screen.getAllByRole("listitem");
        // Stanford (currently enrolled) should be first
        expect(listItems[0]).toHaveTextContent("Stanford University");
    });
    });
  });

  describe("Event Listeners", () => {
    it("reloads education on educationUpdated event", async () => {
      render(<EducationSection {...defaultProps} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
  });

      // Dispatch the custom event
      window.dispatchEvent(new Event("educationUpdated"));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("handles API error gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      api.get.mockRejectedValueOnce(new Error("Network error"));

      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Date Formatting", () => {
    it("formats graduation date correctly", async () => {
      render(<EducationSection {...defaultProps} />);

    await waitFor(() => {
        // May 2020 format
        expect(screen.getByText(/May 2020/i)).toBeInTheDocument();
      });
    });
  });

  describe("getDuration Helper Function", () => {
    it("returns 'Present' when currentlyEnrolled is true (covers line 30)", () => {
      expect(getDuration("2020-01-01", "2024-01-01", true)).toBe("Present");
    });

    it("returns empty string when startDate is missing (covers line 31)", () => {
      expect(getDuration(null, "2024-01-01", false)).toBe("");
      expect(getDuration(undefined, "2024-01-01", false)).toBe("");
    });

    it("returns empty string when endDate is missing (covers line 31)", () => {
      expect(getDuration("2020-01-01", null, false)).toBe("");
      expect(getDuration("2020-01-01", undefined, false)).toBe("");
    });

    it("returns '1 year' when duration is exactly 1 year (covers line 37)", () => {
      expect(getDuration("2020-01-01", "2021-01-01", false)).toBe("1 year");
    });

    it("returns 'X years' when duration is more than 1 year (covers line 38)", () => {
      expect(getDuration("2020-01-01", "2023-01-01", false)).toBe("3 years");
      expect(getDuration("2020-01-01", "2025-01-01", false)).toBe("5 years");
    });

    it("returns 'Less than 1 year' when duration is less than 1 year (covers line 39)", () => {
      // Exactly same date should be treated as less than 1 year
      expect(getDuration("2020-01-01", "2020-01-01", false)).toBe(
        "Less than 1 year"
      );
      // Another case within the same calendar year
      expect(getDuration("2020-03-15", "2020-11-20", false)).toBe(
        "Less than 1 year"
      );
    });

    it("handles date calculations correctly (covers lines 33-35)", () => {
      const start = new Date("2020-01-01");
      const end = new Date("2022-01-01");
      const years = end.getFullYear() - start.getFullYear();
      expect(years).toBe(2);
      expect(getDuration("2020-01-01", "2022-01-01", false)).toBe("2 years");
    });
  });
});
