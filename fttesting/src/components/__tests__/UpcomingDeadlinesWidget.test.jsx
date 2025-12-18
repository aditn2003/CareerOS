/**
 * UpcomingDeadlinesWidget Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import UpcomingDeadlinesWidget from "../UpcomingDeadlinesWidget";

// Mock JobsCalendar to avoid its dependencies
vi.mock("../JobsCalendar", () => ({
  default: () => <div data-testid="mock-jobs-calendar">Calendar</div>,
}));

describe("UpcomingDeadlinesWidget", () => {
  const mockToken = "mock-jwt-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading state initially", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    expect(screen.getByText("Loading deadlines...")).toBeInTheDocument();
  });

  it("renders widget title after loading", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });
  });

  it("shows no deadlines message when empty", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("No deadlines set yet.")).toBeInTheDocument();
    });
  });

  it("fetches jobs with authorization header", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/jobs?sortBy=deadline",
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("displays job with deadline", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Software Engineer",
              company: "Google",
              deadline: futureDate.toISOString(),
            },
          ],
        }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    });
  });

  it("shows days remaining for upcoming deadline", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Software Engineer",
              deadline: futureDate.toISOString(),
            },
          ],
        }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\d+ days remaining/)).toBeInTheDocument();
    });
  });

  it("shows overdue for past deadline", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 1,
              title: "Missed Job",
              deadline: pastDate.toISOString(),
            },
          ],
        }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    });
  });

  it("filters out jobs without deadlines", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          jobs: [
            { id: 1, title: "Job with deadline", deadline: "2025-01-15" },
            { id: 2, title: "Job without deadline", deadline: null },
          ],
        }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Job with deadline")).toBeInTheDocument();
      expect(
        screen.queryByText("Job without deadline")
      ).not.toBeInTheDocument();
    });
  });

  it("opens calendar modal when button clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByTitle("Open Calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Open Calendar"));

    await waitFor(() => {
      expect(screen.getByText("📅 Job Calendar")).toBeInTheDocument();
    });
  });

  it("closes calendar modal when close button clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByTitle("Open Calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Open Calendar"));

    await waitFor(() => {
      expect(screen.getByText("📅 Job Calendar")).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = document.querySelector(".calendar-close-btn");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("📅 Job Calendar")).not.toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to load deadlines:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("limits to 5 deadlines", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Job ${i + 1}`,
      deadline: `2025-01-${String(i + 10).padStart(2, "0")}`,
    }));

    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      const items = document.querySelectorAll(".deadlines-list li");
      expect(items.length).toBeLessThanOrEqual(5);
    });
  });

  it("renders JobsCalendar inside modal", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ jobs: [] }),
    });

    render(<UpcomingDeadlinesWidget token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByTitle("Open Calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Open Calendar"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-jobs-calendar")).toBeInTheDocument();
    });
  });
});
