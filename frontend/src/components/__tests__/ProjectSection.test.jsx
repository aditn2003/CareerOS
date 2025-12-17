/**
 * ProjectSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import ProjectSection from "../ProjectSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
  },
});

describe("ProjectSection", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { projects: [] } });
  });

  it("renders without crashing", async () => {
    render(<ProjectSection token={mockToken} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("shows Add Project button", async () => {
    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Project/i })
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no projects", async () => {
    api.get.mockResolvedValueOnce({ data: { projects: [] } });
    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
    });
  });

  it("shows form when Add Project clicked", async () => {
    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Project/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Project/i }));

    expect(screen.getByText("Add New Project")).toBeInTheDocument();
  });

  it("displays projects", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 1,
            name: "My Project",
            role: "Lead Developer",
            description: "A great project",
            start_date: "2024-01-01",
            status: "Completed",
            technologies: ["React", "Node.js"],
          },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("My Project")).toBeInTheDocument();
      expect(screen.getByText("Lead Developer")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("displays technologies as tags", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 1,
            name: "My Project",
            start_date: "2024-01-01",
            technologies: ["React", "Node.js", "TypeScript"],
          },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      // Technologies appear both as tags and in filter dropdown
      expect(screen.getAllByText("React").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Node.js").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TypeScript").length).toBeGreaterThan(0);
    });
  });

  it("displays project count", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          { id: 1, name: "Project 1", start_date: "2024-01-01" },
          { id: 2, name: "Project 2", start_date: "2024-02-01" },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 2 projects/i)).toBeInTheDocument();
    });
  });

  it("renders search input when projects exist", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Search projects/i)
      ).toBeInTheDocument();
    });
  });

  it("filters projects by search", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          { id: 1, name: "React App", start_date: "2024-01-01" },
          { id: 2, name: "Node Server", start_date: "2024-02-01" },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("React App")).toBeInTheDocument();
      expect(screen.getByText("Node Server")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search projects/i), {
      target: { value: "React" },
    });

    expect(screen.getByText("React App")).toBeInTheDocument();
    expect(screen.queryByText("Node Server")).not.toBeInTheDocument();
  });

  it("renders View Details button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /View Details/i })
      ).toBeInTheDocument();
    });
  });

  it("renders Edit button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });
  });

  it("renders Share button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Share/i })
      ).toBeInTheDocument();
    });
  });

  it("renders Print button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Print/i })
      ).toBeInTheDocument();
    });
  });

  it("renders Delete button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });
  });

  it("calls delete API when confirmed", async () => {
    api.get.mockResolvedValue({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        "/api/projects/1",
        expect.any(Object)
      );
    });
  });

  it("renders technology filter when projects exist", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 1,
            name: "React Project",
            start_date: "2024-01-01",
            technologies: ["React"],
          },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("All Technologies")).toBeInTheDocument();
    });
  });

  it("renders industry filter when projects exist", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 1,
            name: "Tech Project",
            start_date: "2024-01-01",
            industry: "Technology",
          },
        ],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("All Industries")).toBeInTheDocument();
    });
  });

  it("renders sort options", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        projects: [{ id: 1, name: "My Project", start_date: "2024-01-01" }],
      },
    });

    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Newest First")).toBeInTheDocument();
    });
  });

  it("shows loading state", async () => {
    // Don't resolve immediately
    api.get.mockImplementation(() => new Promise(() => {}));

    render(<ProjectSection token={mockToken} />);

    expect(screen.getByText(/Loading projects/i)).toBeInTheDocument();
  });

  it("fetches projects on mount", async () => {
    render(<ProjectSection token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/projects", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
