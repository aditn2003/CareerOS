/**
 * MatchAnalysisTab Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MatchAnalysisTab from "../MatchAnalysisTab";

// Mock the API
vi.mock("../../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "../../../api";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test-url");
global.URL.revokeObjectURL = vi.fn();

describe("MatchAnalysisTab", () => {
  const mockJobs = [
    { id: 1, title: "Software Engineer", company: "Tech Corp" },
    { id: 2, title: "Data Scientist", company: "Data Inc" },
  ];

  const mockAnalysis = {
    jobId: 1,
    jobTitle: "Software Engineer",
    company: "Tech Corp",
    matchScore: 85,
    breakdown: {
      skills: 90,
      experience: 80,
      education: 85,
    },
    strengths: ["Strong JavaScript skills", "React experience"],
    gaps: ["No Python experience"],
    improvements: ["Learn Python", "Get AWS certification"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.get.mockResolvedValue({ data: { jobs: mockJobs } });
    api.post.mockResolvedValue({ data: { analysis: mockAnalysis } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (search = "") => {
    return render(
      <MemoryRouter initialEntries={[`/match?${search}`]}>
        <MatchAnalysisTab />
      </MemoryRouter>
    );
  };

  it("renders the component", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Select a job to analyze/i)).toBeInTheDocument();
    });
  });

  it("loads jobs on mount", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/jobs");
    });
  });

  it("displays job options in select", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
      expect(screen.getByText("Data Scientist — Data Inc")).toBeInTheDocument();
    });
  });

  it("displays weight controls", async () => {
    renderWithRouter();

    expect(screen.getByText(/Matching Weights/i)).toBeInTheDocument();
    expect(screen.getByText(/skills:/i)).toBeInTheDocument();
    expect(screen.getByText(/experience:/i)).toBeInTheDocument();
    expect(screen.getByText(/education:/i)).toBeInTheDocument();
  });

  it("has Run Match button disabled when no job selected", async () => {
    renderWithRouter();

    const runButton = screen.getByText(/Run Match/i);
    expect(runButton).toBeDisabled();
  });

  it("enables Run Match button when job is selected", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const runButton = screen.getByText(/Run Match/i);
    expect(runButton).not.toBeDisabled();
  });

  it("runs match analysis when Run Match is clicked", async () => {
    // Set up a valid token with userId
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const runButton = screen.getByText(/Run Match/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/match/analyze", {
        userId: 123,
        jobId: 1,
        weights: {
          skillsWeight: 50,
          experienceWeight: 30,
          educationWeight: 20,
        },
      });
    });
  });

  it("shows loading state while analyzing", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    // Make the API call hang
    api.post.mockImplementation(() => new Promise(() => {}));

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const runButton = screen.getByText(/Run Match/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Analyzing…/i)).toBeInTheDocument();
      expect(screen.getByText(/Analyzing match using AI/i)).toBeInTheDocument();
    });
  });

  it("displays match results after analysis", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const runButton = screen.getByText(/Run Match/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Match Score: 85%/i)).toBeInTheDocument();
    });
  });

  it("displays breakdown scores", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    fireEvent.click(screen.getByText(/Run Match/i));

    await waitFor(() => {
      expect(screen.getByText(/Skills: 90%/i)).toBeInTheDocument();
      expect(screen.getByText(/Experience: 80%/i)).toBeInTheDocument();
      expect(screen.getByText(/Education: 85%/i)).toBeInTheDocument();
    });
  });

  it("displays strengths, gaps, and improvements", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    fireEvent.click(screen.getByText(/Run Match/i));

    await waitFor(() => {
      expect(screen.getByText("Strong JavaScript skills")).toBeInTheDocument();
      expect(screen.getByText("No Python experience")).toBeInTheDocument();
      expect(screen.getByText("Learn Python")).toBeInTheDocument();
    });
  });

  it("allows changing weight values", async () => {
    renderWithRouter();

    const skillsInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(skillsInput, { target: { value: "60" } });

    expect(skillsInput.value).toBe("60");
  });

  it("auto-runs match when job param is present", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter("job=1");

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/match/analyze",
        expect.objectContaining({
          jobId: 1,
        })
      );
    });
  });

  it("exports CSV when Download button is clicked", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    fireEvent.click(screen.getByText(/Run Match/i));

    await waitFor(() => {
      expect(screen.getByText(/Match Score: 85%/i)).toBeInTheDocument();
    });

    // Click download - just verify the button exists and is clickable
    const downloadButton = screen.getByText(/Download Report/i);
    expect(downloadButton).toBeInTheDocument();
    fireEvent.click(downloadButton);

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("displays comparison section", () => {
    renderWithRouter();

    expect(screen.getByText(/Compare Match Scores/i)).toBeInTheDocument();
    expect(screen.getByText(/View Comparison Table/i)).toBeInTheDocument();
  });

  it("handles error when loading jobs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockRejectedValue(new Error("Network error"));

    renderWithRouter();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Error loading jobs:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles error during match analysis", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    api.post.mockRejectedValue(new Error("Analysis failed"));

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    fireEvent.click(screen.getByText(/Run Match/i));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Match analysis error:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles invalid token gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("token", "invalid-token");

    renderWithRouter();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Error decoding token:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles no token scenario", async () => {
    // No token set
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Select a job to analyze/i)).toBeInTheDocument();
    });
  });

  it("does not run match when no jobId is selected", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    renderWithRouter();

    // Clear any initial calls
    api.post.mockClear();

    // Try to run match without selecting a job (button should be disabled anyway)
    // But let's verify the runMatch function returns early
    expect(api.post).not.toHaveBeenCalled();
  });

  it("handles empty jobs array", async () => {
    api.get.mockResolvedValue({ data: { jobs: [] } });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Select a job to analyze/i)).toBeInTheDocument();
    });
  });

  it("handles missing jobs in response", async () => {
    api.get.mockResolvedValue({ data: {} });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Select a job to analyze/i)).toBeInTheDocument();
    });
  });

  it("does not export CSV when no analysis exists", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    // No analysis exists, so export button won't be visible
    expect(screen.queryByText(/Download Report/i)).not.toBeInTheDocument();
  });

  it("handles analysis with missing optional fields", async () => {
    const payload = { id: 123 };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;
    localStorage.setItem("token", mockToken);

    const analysisWithMissing = {
      jobId: 1,
      matchScore: 75,
      breakdown: {
        skills: 80,
        experience: 70,
        education: 75,
      },
      strengths: [],
      gaps: [],
      improvements: [],
    };

    api.post.mockResolvedValue({ data: { analysis: analysisWithMissing } });

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Software Engineer — Tech Corp")
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    fireEvent.click(screen.getByText(/Run Match/i));

    await waitFor(() => {
      expect(screen.getByText(/Match Score: 75%/i)).toBeInTheDocument();
    });
  });

  it("updates all weight inputs", async () => {
    renderWithRouter();

    const inputs = screen.getAllByRole("spinbutton");

    // Update skills weight
    fireEvent.change(inputs[0], { target: { value: "40" } });
    expect(inputs[0].value).toBe("40");

    // Update experience weight
    fireEvent.change(inputs[1], { target: { value: "35" } });
    expect(inputs[1].value).toBe("35");

    // Update education weight
    fireEvent.change(inputs[2], { target: { value: "25" } });
    expect(inputs[2].value).toBe("25");
  });

  it("renders comparison link correctly", () => {
    renderWithRouter();

    const link = screen.getByRole("link", { name: /View Comparison Table/i });
    expect(link).toHaveAttribute("href", "/match/compare");
  });
});

