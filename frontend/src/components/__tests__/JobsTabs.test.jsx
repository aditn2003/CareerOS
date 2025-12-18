/**
 * JobsTabs Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import JobsTab from "../JobsTabs";

describe("JobsTab", () => {
  const mockToken = "mock-jwt-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading state initially", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    render(<JobsTab token={mockToken} />);
    expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
  });

  it("shows no jobs message when empty", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("No jobs added yet.")).toBeInTheDocument();
    });
  });

  it("shows no jobs message when jobs is undefined", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    });
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("No jobs added yet.")).toBeInTheDocument();
    });
  });

  it("displays jobs when loaded", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Software Engineer",
              company: "Google",
              status: "Applied",
            },
          ],
        }),
    });
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("Status: Applied")).toBeInTheDocument();
    });
  });

  it("displays multiple jobs", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            { id: 1, title: "Job 1", company: "Company A", status: "Applied" },
            {
              id: 2,
              title: "Job 2",
              company: "Company B",
              status: "Interview",
            },
          ],
        }),
    });
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("Job 1")).toBeInTheDocument();
      expect(screen.getByText("Job 2")).toBeInTheDocument();
    });
  });

  it("fetches jobs with authorization header", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/jobs",
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error("Network error"));
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load jobs",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("shows no jobs after error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error("Network error"));
    render(<JobsTab token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("No jobs added yet.")).toBeInTheDocument();
    });
  });
});
