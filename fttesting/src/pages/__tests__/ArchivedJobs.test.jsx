/**
 * ArchivedJobs Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ArchivedJobs from "../ArchivedJobs";
import { api } from "../../api";

// Mock api
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock MUI components
vi.mock("@mui/material", () => ({
  Container: ({ children }) => <div data-testid="container">{children}</div>,
  Typography: ({ children, variant }) => {
    const Tag = variant === "h4" ? "h1" : variant === "h6" ? "h2" : "p";
    return <Tag>{children}</Tag>;
  },
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardActions: ({ children }) => <div data-testid="card-actions">{children}</div>,
  Button: ({ children, onClick, color }) => (
    <button onClick={onClick} data-color={color}>{children}</button>
  ),
  CircularProgress: () => <div data-testid="loading">Loading...</div>,
  Box: ({ children }) => <div>{children}</div>,
  Grid: ({ children }) => <div>{children}</div>,
}));

describe("ArchivedJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn();
  });

  it("shows loading spinner initially", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<ArchivedJobs />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders title after loading", async () => {
    api.get.mockResolvedValue({ data: { jobs: [] } });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Archived Jobs" })).toBeInTheDocument();
    });
  });

  it("shows empty message when no jobs", async () => {
    api.get.mockResolvedValue({ data: { jobs: [] } });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByText("You have no archived jobs.")).toBeInTheDocument();
    });
  });

  it("fetches archived jobs on mount", async () => {
    api.get.mockResolvedValue({ data: { jobs: [] } });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/jobs/archived");
    });
  });

  it("displays job titles", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Software Engineer", company: "Acme Inc" },
        ],
      },
    });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Software Engineer" })).toBeInTheDocument();
    });
  });

  it("displays company names", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Developer", company: "Tech Corp" },
        ],
      },
    });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByText("Tech Corp")).toBeInTheDocument();
    });
  });

  it("renders restore button for each job", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Job 1", company: "Company 1" },
        ],
      },
    });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    });
  });

  it("renders delete button for each job", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Job 1", company: "Company 1" },
        ],
      },
    });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });
  });

  it("calls restore API on restore click", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [{ id: 42, title: "Job", company: "Co" }],
      },
    });
    api.put.mockResolvedValue({});
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    });
    
    expect(api.put).toHaveBeenCalledWith("/api/jobs/42/restore");
  });

  it("removes job from list after restore", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Job to Restore", company: "Co" },
        ],
      },
    });
    api.put.mockResolvedValue({});
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByText("Job to Restore")).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    
    await waitFor(() => {
      expect(screen.queryByText("Job to Restore")).not.toBeInTheDocument();
    });
  });

  it("shows confirmation before delete", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [{ id: 1, title: "Job", company: "Co" }],
      },
    });
    global.confirm.mockReturnValue(false);
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    
    expect(global.confirm).toHaveBeenCalledWith(
      "Are you sure you want to permanently delete this job? This action cannot be undone."
    );
  });

  it("does not delete if confirmation cancelled", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [{ id: 1, title: "Job", company: "Co" }],
      },
    });
    global.confirm.mockReturnValue(false);
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("calls delete API on confirmed delete", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [{ id: 99, title: "Job", company: "Co" }],
      },
    });
    global.confirm.mockReturnValue(true);
    api.delete.mockResolvedValue({});
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    
    expect(api.delete).toHaveBeenCalledWith("/api/jobs/99");
  });

  it("removes job from list after delete", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [{ id: 1, title: "Job to Delete", company: "Co" }],
      },
    });
    global.confirm.mockReturnValue(true);
    api.delete.mockResolvedValue({});
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByText("Job to Delete")).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    
    await waitFor(() => {
      expect(screen.queryByText("Job to Delete")).not.toBeInTheDocument();
    });
  });

  it("handles API error on fetch", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockRejectedValue(new Error("Network error"));
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch archived jobs", expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it("handles API error on restore", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockResolvedValue({
      data: { jobs: [{ id: 1, title: "Job", company: "Co" }] },
    });
    api.put.mockRejectedValue(new Error("Restore failed"));
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    });
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to restore job", expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it("handles API error on delete", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockResolvedValue({
      data: { jobs: [{ id: 1, title: "Job", company: "Co" }] },
    });
    global.confirm.mockReturnValue(true);
    api.delete.mockRejectedValue(new Error("Delete failed"));
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to delete job", expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it("displays multiple jobs", async () => {
    api.get.mockResolvedValue({
      data: {
        jobs: [
          { id: 1, title: "Job A", company: "Company A" },
          { id: 2, title: "Job B", company: "Company B" },
          { id: 3, title: "Job C", company: "Company C" },
        ],
      },
    });
    render(<ArchivedJobs />);
    
    await waitFor(() => {
      expect(screen.getByText("Job A")).toBeInTheDocument();
      expect(screen.getByText("Job B")).toBeInTheDocument();
      expect(screen.getByText("Job C")).toBeInTheDocument();
    });
  });
});
