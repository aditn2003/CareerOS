/**
 * MatchCompare Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
} from "../../../__tests__/helpers/test-utils";
import MatchCompare from "../MatchCompare";

// Mock API
vi.mock("../../../api", () => ({
  api: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes("/api/match/history")) {
        return Promise.resolve({
          data: {
            history: [
              { id: 1, jobId: 1, overallScore: 85 },
              { id: 2, jobId: 2, overallScore: 78 },
            ],
          },
        });
      }
      if (url.includes("/api/jobs")) {
        return Promise.resolve({
          data: [
            { id: 1, title: "Software Engineer", company: "Tech Corp" },
            { id: 2, title: "Senior Developer", company: "Web Inc" },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    }),
  },
}));

describe("MatchCompare Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", async () => {
    render(<MatchCompare />);
    await waitFor(() => {
      expect(screen.getByText(/Match Score Comparison/i)).toBeInTheDocument();
    });
  });

  it("renders the component without crashing", async () => {
    render(<MatchCompare />);
    // Just verify the component renders
    expect(screen.getByRole("heading") || screen.getByText(/match/i)).toBeInTheDocument();
  });

  it("shows empty state or content", async () => {
    render(<MatchCompare />);
    await waitFor(() => {
      // Either shows empty state or comparison content
      const content = screen.queryByText(/No match history found/i) || 
                      screen.queryByText(/comparison/i) ||
                      screen.queryByText(/Match Score/i);
      expect(content).toBeTruthy();
    });
  });
});

describe("MatchCompare - Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has proper CSS class", async () => {
    const { container } = render(<MatchCompare />);
    expect(container.querySelector('.compare-wrapper')).toBeInTheDocument();
  });

  it("displays heading", async () => {
    render(<MatchCompare />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
