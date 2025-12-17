/**
 * EducationSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import EducationSection from "../EducationSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("EducationSection", () => {
  const mockToken = "test-token";
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { education: [] } });
  });

  it("renders without crashing", async () => {
    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("shows empty state when no education", async () => {
    api.get.mockResolvedValueOnce({ data: { education: [] } });
    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("No education history yet.")).toBeInTheDocument();
    });
  });

  it("displays education entries", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            field_of_study: "Computer Science",
            graduation_date: "2024-05-15",
            gpa: "3.8",
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
      expect(screen.getByText("BS")).toBeInTheDocument();
      expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
    });
  });

  it("displays statistics when education exists", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            gpa: "3.8",
            currently_enrolled: false,
          },
          {
            id: 2,
            institution: "Stanford",
            degree_type: "MS",
            gpa: "3.9",
            currently_enrolled: true,
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("Total Degrees")).toBeInTheDocument();
      // "2" may appear in multiple stats - use getAllByText
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
      // "Currently Enrolled" appears in stats and entry
      expect(screen.getAllByText("Currently Enrolled").length).toBeGreaterThan(
        0
      );
      expect(screen.getByText("Avg GPA")).toBeInTheDocument();
    });
  });

  it("displays GPA when not private", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            gpa: "3.8",
            gpa_private: false,
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("GPA: 3.8")).toBeInTheDocument();
    });
  });

  it("hides GPA when private", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            gpa: "3.8",
            gpa_private: true,
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.queryByText("GPA: 3.8")).not.toBeInTheDocument();
    });
  });

  it("displays honors when present", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            honors: "Magna Cum Laude",
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("Honors & Achievements")).toBeInTheDocument();
      expect(screen.getByText("Magna Cum Laude")).toBeInTheDocument();
    });
  });

  it("shows current badge for enrolled students", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "MIT",
            degree_type: "BS",
            currently_enrolled: true,
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("Current")).toBeInTheDocument();
      // "Currently Enrolled" appears in both stats and in entry - use getAllByText
      expect(screen.getAllByText("Currently Enrolled").length).toBeGreaterThan(
        0
      );
    });
  });

  it("calls onEdit when edit button clicked", async () => {
    const educationEntry = {
      id: 1,
      institution: "MIT",
      degree_type: "BS",
    };
    api.get.mockResolvedValueOnce({
      data: { education: [educationEntry] },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(educationEntry);
  });

  it("calls delete API when delete button clicked and confirmed", async () => {
    api.get.mockResolvedValue({
      data: {
        education: [{ id: 1, institution: "MIT", degree_type: "BS" }],
      },
    });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        "/api/education/1",
        expect.any(Object)
      );
    });
  });

  it("does not delete when cancel is clicked on confirm", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [{ id: 1, institution: "MIT", degree_type: "BS" }],
      },
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("sorts education by currently enrolled first", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        education: [
          {
            id: 1,
            institution: "Harvard",
            degree_type: "PhD",
            currently_enrolled: false,
            graduation_date: "2020-05-01",
          },
          {
            id: 2,
            institution: "MIT",
            degree_type: "BS",
            currently_enrolled: true,
          },
        ],
      },
    });

    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      // First item should be MIT (currently enrolled)
      expect(items[0]).toHaveTextContent("MIT");
    });
  });

  it("fetches education on mount", async () => {
    render(<EducationSection token={mockToken} onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/education", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
