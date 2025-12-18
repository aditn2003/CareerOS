/**
 * ResumeOptimize Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import ResumeOptimize from "../ResumeOptimize";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: vi.fn(),
  };
});

import { useLocation as mockUseLocation } from "react-router-dom";

describe("ResumeOptimize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
    global.fetch = vi.fn();
  });

  const renderComponent = (state = {}) => {
    mockUseLocation.mockReturnValue({ state });
    return render(
      <MemoryRouter>
        <ResumeOptimize />
      </MemoryRouter>
    );
  };

  it("redirects if no sections in state", () => {
    renderComponent(null);
    expect(mockNavigate).toHaveBeenCalledWith("/profile/jobs");
  });

  it("renders page title", () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: { education: [] }, resumeTitle: "Test" });
    expect(
      screen.getByText("✨ Choose a Job to Tailor For")
    ).toBeInTheDocument();
  });

  it("renders subtitle", async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(
        screen.getByText(/generate tailored content/i)
      ).toBeInTheDocument();
    });
  });

  it("renders back button", () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: {} });
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("navigates back when back button clicked", () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: {} });
    fireEvent.click(screen.getByText("← Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows loading state initially", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    renderComponent({ sections: {} });
    expect(screen.getByText("Loading your jobs…")).toBeInTheDocument();
  });

  it("shows empty state when no jobs", async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(
        screen.getByText("No jobs found. Add a job in your Jobs tab first.")
      ).toBeInTheDocument();
    });
  });

  it("fetches jobs on mount", async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ jobs: [] }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/jobs",
        { headers: { Authorization: "Bearer mock-token" } }
      );
    });
  });

  it("displays job cards", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Software Engineer",
              company: "Google",
              location: "NYC",
              status: "Applied",
            },
          ],
        }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("NYC")).toBeInTheDocument();
      expect(screen.getByText("Status: Applied")).toBeInTheDocument();
    });
  });

  it("displays job deadline", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Dev",
              company: "Co",
              deadline: "2025-01-15",
              status: "Applied",
            },
          ],
        }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(screen.getByText(/Deadline:/)).toBeInTheDocument();
    });
  });

  it("shows dash for missing location", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          jobs: [{ id: 1, title: "Dev", company: "Co", status: "Applied" }],
        }),
    });
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("navigates to optimize/run on job click", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          jobs: [
            { id: 1, title: "Developer", company: "Co", status: "Applied" },
          ],
        }),
    });
    renderComponent({
      sections: { test: true },
      resumeTitle: "MyResume",
      selectedTemplate: "modern",
    });

    await waitFor(() => {
      expect(screen.getByText("Developer")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Developer"));

    expect(mockNavigate).toHaveBeenCalledWith("/resume/optimize/run", {
      state: expect.objectContaining({
        sections: { test: true },
        resumeTitle: "MyResume",
        selectedTemplate: "modern",
      }),
    });
    consoleSpy.mockRestore();
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockRejectedValue(new Error("Network error"));
    renderComponent({ sections: {} });
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load jobs",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });
});
