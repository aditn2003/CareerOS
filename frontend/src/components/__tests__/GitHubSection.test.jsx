/**
 * GitHubSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import GitHubSection from "../GitHubSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock recharts to avoid rendering issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe("GitHubSection", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no settings (not connected)
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({ data: { settings: null } });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({ data: { repositories: [] } });
      }
      if (url.includes("/stats")) {
        return Promise.resolve({ data: { stats: null } });
      }
      if (url.includes("/skills")) {
        return Promise.resolve({ data: { skills: [] } });
      }
      if (url.includes("/contributions")) {
        return Promise.resolve({ data: { contributions: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("renders without crashing", async () => {
    render(<GitHubSection token={mockToken} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("shows connect prompt when not connected", async () => {
    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByText("Connect Your GitHub Account")
      ).toBeInTheDocument();
    });
  });

  it("shows Connect GitHub button when not connected", async () => {
    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Connect GitHub/i })
      ).toBeInTheDocument();
    });
  });

  it("shows username input when Connect GitHub clicked", async () => {
    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Connect GitHub/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Connect GitHub/i }));

    expect(
      screen.getByPlaceholderText("Enter your GitHub username")
    ).toBeInTheDocument();
  });

  it("shows connected state with username", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: {
            settings: {
              github_username: "testuser",
              last_sync_at: "2024-01-15T12:00:00Z",
            },
          },
        });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({ data: { repositories: [] } });
      }
      if (url.includes("/stats")) {
        return Promise.resolve({
          data: {
            stats: {
              repositories: { total: 10, featured: 2, total_stars: 50 },
              contributions: { total_commits: 100 },
            },
          },
        });
      }
      if (url.includes("/skills")) {
        return Promise.resolve({ data: { skills: [] } });
      }
      if (url.includes("/contributions")) {
        return Promise.resolve({ data: { contributions: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Connected as: testuser/)).toBeInTheDocument();
    });
  });

  it("shows Sync Repositories button when connected", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: {
            settings: { github_username: "testuser" },
          },
        });
      }
      return Promise.resolve({
        data: { repositories: [], stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Sync Repositories/i })
      ).toBeInTheDocument();
    });
  });

  it("shows Disconnect GitHub button when connected", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: {
            settings: { github_username: "testuser" },
          },
        });
      }
      return Promise.resolve({
        data: { repositories: [], stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Disconnect GitHub/i })
      ).toBeInTheDocument();
    });
  });

  it("displays repository statistics", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      if (url.includes("/stats")) {
        return Promise.resolve({
          data: {
            stats: {
              repositories: { total: 15, featured: 3, total_stars: 100 },
              contributions: { total_commits: 500 },
            },
          },
        });
      }
      return Promise.resolve({
        data: { repositories: [], skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument(); // total repos
      expect(screen.getByText("3")).toBeInTheDocument(); // featured
      expect(screen.getByText("100")).toBeInTheDocument(); // stars
      expect(screen.getByText("500")).toBeInTheDocument(); // commits
    });
  });

  it("displays repositories list", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({
          data: {
            repositories: [
              {
                id: 1,
                repository_id: 1,
                name: "my-repo",
                description: "A test repository",
                language: "JavaScript",
                stars_count: 10,
                forks_count: 5,
                watchers_count: 3,
                html_url: "https://github.com/testuser/my-repo",
                is_featured: false,
              },
            ],
          },
        });
      }
      return Promise.resolve({
        data: { stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
      expect(screen.getByText("A test repository")).toBeInTheDocument();
      // JavaScript may appear both in repo card and filter dropdown
      expect(screen.getAllByText("JavaScript").length).toBeGreaterThan(0);
    });
  });

  it("shows empty state when no repositories", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      return Promise.resolve({
        data: { repositories: [], stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/No repositories found/i)).toBeInTheDocument();
    });
  });

  it("renders Featured Only filter", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({
          data: { repositories: [{ id: 1, repository_id: 1, name: "repo" }] },
        });
      }
      return Promise.resolve({
        data: { stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Featured Only")).toBeInTheDocument();
    });
  });

  it("renders Language filter", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({
          data: {
            repositories: [
              { id: 1, repository_id: 1, name: "repo", language: "JavaScript" },
            ],
          },
        });
      }
      return Promise.resolve({
        data: { stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("All Languages")).toBeInTheDocument();
    });
  });

  it("renders Sort By filter", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      if (url.includes("/repositories")) {
        return Promise.resolve({
          data: { repositories: [{ id: 1, repository_id: 1, name: "repo" }] },
        });
      }
      return Promise.resolve({
        data: { stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Last Updated")).toBeInTheDocument();
    });
  });

  it("shows token settings section", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      return Promise.resolve({
        data: { repositories: [], stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      // The heading and description both contain "personal access token"
      expect(
        screen.getAllByText(/Personal Access Token/i).length
      ).toBeGreaterThan(0);
    });
  });

  it("shows private repos toggle", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/settings")) {
        return Promise.resolve({
          data: { settings: { github_username: "testuser" } },
        });
      }
      return Promise.resolve({
        data: { repositories: [], stats: null, skills: [], contributions: [] },
      });
    });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByText("Include Private Repositories")
      ).toBeInTheDocument();
    });
  });

  it("calls connect API when form submitted", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Connect GitHub/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Connect GitHub/i }));

    fireEvent.change(
      screen.getByPlaceholderText("Enter your GitHub username"),
      {
        target: { value: "newuser" },
      }
    );

    const connectButton = screen.getByRole("button", { name: "Connect" });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/github/connect",
        { github_username: "newuser" },
        expect.any(Object)
      );
    });
  });

  it("shows error when username is empty", async () => {
    render(<GitHubSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Connect GitHub/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Connect GitHub/i }));

    const connectButton = screen.getByRole("button", { name: "Connect" });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a GitHub username")
      ).toBeInTheDocument();
    });
  });
});
