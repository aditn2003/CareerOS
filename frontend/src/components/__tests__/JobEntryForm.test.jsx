/**
 * JobEntryForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import JobEntryForm from "../JobEntryForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock FileUpload component
vi.mock("../FileUpload", () => ({
  default: ({ onUploadSuccess }) => (
    <div data-testid="file-upload">
      <button onClick={() => onUploadSuccess({ resume: { id: 1 } })}>
        Mock Upload
      </button>
    </div>
  ),
}));

// Mock QualityScoreCard component
vi.mock("../QualityScoreCard", () => ({
  default: ({ score }) => (
    <div data-testid="quality-score-card">Score: {score?.overall_score}</div>
  ),
}));

describe("JobEntryForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();
  let fetchMock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for API calls
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Default mock responses
    fetchMock.mockImplementation((url) => {
      if (url.includes("/api/resumes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resumes: [] }),
        });
      }
      if (url.includes("/api/cover-letters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cover_letters: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("renders without crashing", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Add Job Opportunity")).toBeInTheDocument();
  });

  it("renders job URL input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Job posting URL/i)).toBeInTheDocument();
  });

  it("renders job title input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Job title")).toBeInTheDocument();
  });

  it("renders company input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
  });

  it("renders location input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Job location")).toBeInTheDocument();
  });

  it("renders location type select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Location type")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("On-Site")).toBeInTheDocument();
  });

  it("renders salary inputs", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Minimum salary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum salary/i)).toBeInTheDocument();
  });

  it("renders date applied input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Date applied")).toBeInTheDocument();
  });

  it("renders deadline input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Application deadline")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();
  });

  it("renders industry select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Industry")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("renders job type select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Job type")).toBeInTheDocument();
    expect(screen.getByText("Full Time")).toBeInTheDocument();
    expect(screen.getByText("Part Time")).toBeInTheDocument();
    expect(screen.getByText("Internship")).toBeInTheDocument();
  });

  it("renders role level select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText("Role level")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Mid-Level")).toBeInTheDocument();
    expect(screen.getByText("Entry Level")).toBeInTheDocument();
  });

  it("renders required skills input", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Required skills/i)).toBeInTheDocument();
  });

  it("renders resume select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Select resume/i)).toBeInTheDocument();
  });

  it("renders cover letter select", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Select cover letter/i)).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("renders import button", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates job title on change", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText("Job title");
    fireEvent.change(input, { target: { value: "Software Engineer" } });
    expect(input).toHaveValue("Software Engineer");
  });

  it("updates company on change", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText("Company name");
    fireEvent.change(input, { target: { value: "Big Tech Co" } });
    expect(input).toHaveValue("Big Tech Co");
  });

  it("shows alert when required fields are missing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Job Title and Company Name are required."
    );
    alertSpy.mockRestore();
  });

  it("shows alert when deadline is missing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Tech Co" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter an application deadline date."
    );
    alertSpy.mockRestore();
  });

  it("calls fetch to save job on submit", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes("/api/jobs")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: { id: 1 } }),
        });
      }
      if (url.includes("/api/resumes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resumes: [] }),
        });
      }
      if (url.includes("/api/cover-letters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cover_letters: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText("Application deadline"), {
      target: { value: "2025-12-31" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobs"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("calls onSaved after successful submit", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes("/api/jobs")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: { id: 1 } }),
        });
      }
      if (url.includes("/api/resumes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resumes: [] }),
        });
      }
      if (url.includes("/api/cover-letters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cover_letters: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText("Application deadline"), {
      target: { value: "2025-12-31" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchMock.mockImplementation((url) => {
      if (url.includes("/api/jobs")) {
        return Promise.resolve({
          ok: false,
        });
      }
      if (url.includes("/api/resumes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resumes: [] }),
        });
      }
      if (url.includes("/api/cover-letters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cover_letters: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText("Application deadline"), {
      target: { value: "2025-12-31" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("❌ Could not save job entry.");
    });

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("shows alert when importing without valid URL", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter a valid job posting URL."
    );
    alertSpy.mockRestore();
  });

  it("renders application materials section", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Application Materials")).toBeInTheDocument();
  });

  it("fetches materials on mount", async () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/resumes"),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/cover-letters"),
        expect.any(Object)
      );
    });
  });

  it("toggles resume upload section", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    const uploadButtons = screen.getAllByRole("button", { name: /Upload/i });
    // First upload button is for resume
    fireEvent.click(uploadButtons[0]);
    expect(screen.getByTestId("file-upload")).toBeInTheDocument();
  });

  it("converts required skills to array on submit", async () => {
    let submittedData;
    fetchMock.mockImplementation((url, options) => {
      if (url.includes("/api/jobs") && options?.method === "POST") {
        submittedData = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: { id: 1 } }),
        });
      }
      if (url.includes("/api/resumes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resumes: [] }),
        });
      }
      if (url.includes("/api/cover-letters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cover_letters: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText("Application deadline"), {
      target: { value: "2025-12-31" },
    });
    fireEvent.change(screen.getByLabelText(/Required skills/i), {
      target: { value: "Python, React, SQL" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(submittedData.required_skills).toEqual(["python", "react", "sql"]);
    });
  });

  it("sets today as default applied_on date", () => {
    render(
      <JobEntryForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    const today = new Date().toISOString().split("T")[0];
    const dateInput = screen.getByLabelText("Date applied");
    expect(dateInput).toHaveValue(today);
  });
});
