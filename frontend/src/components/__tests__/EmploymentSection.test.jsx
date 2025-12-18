/**
 * EmploymentSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import EmploymentSection from "../EmploymentSection";
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

describe("EmploymentSection", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { employment: [] } });
  });

  it("renders without crashing", async () => {
    render(<EmploymentSection token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("Employment History")).toBeInTheDocument();
    });
  });

  it("shows empty state when no employment", async () => {
    api.get.mockResolvedValueOnce({ data: { employment: [] } });
    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByText("No employment history yet.")
      ).toBeInTheDocument();
    });
  });

  it("displays employment entries", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Software Engineer",
            company: "Tech Corp",
            location: "New York",
            start_date: "2022-01-15",
            end_date: "2023-12-31",
            current: false,
            description: "Building great software",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Software Engineer/)).toBeInTheDocument();
      expect(screen.getByText(/Tech Corp/)).toBeInTheDocument();
    });
  });

  it("shows Add Employment button", async () => {
    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Employment/i })
      ).toBeInTheDocument();
    });
  });

  it("shows form when Add Employment clicked", async () => {
    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Employment/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    // Should show the EmploymentForm
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Add Employment"
    );
  });

  it("displays current position indicator", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Software Engineer",
            company: "Tech Corp",
            start_date: "2022-01-15",
            current: true,
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Present/)).toBeInTheDocument();
    });
  });

  it("displays description", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
            description: "Building great things",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Building great things")).toBeInTheDocument();
    });
  });

  it("shows No description when description is empty", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
            description: "",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("No description.")).toBeInTheDocument();
    });
  });

  it("renders Edit button for each entry", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });
  });

  it("renders Delete button for each entry", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });
  });

  it("calls delete API when confirmed", async () => {
    api.get.mockResolvedValue({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
          },
        ],
      },
    });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        "/api/employment/1",
        expect.any(Object)
      );
    });
  });

  it("does not delete when cancelled", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
          },
        ],
      },
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows edit form when Edit clicked", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Developer",
            company: "Company",
            start_date: "2022-01-01",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    // Should show edit form
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Edit Employment"
    );
  });

  it("sorts employment by start date descending", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        employment: [
          {
            id: 1,
            title: "Old Job",
            company: "Old Corp",
            start_date: "2020-01-01",
          },
          {
            id: 2,
            title: "New Job",
            company: "New Corp",
            start_date: "2023-01-01",
          },
        ],
      },
    });

    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      const items = document.querySelectorAll(".timeline-item");
      // First item should be newer job
      expect(items[0]).toHaveTextContent("New Job");
    });
  });

  it("fetches employment on mount", async () => {
    render(<EmploymentSection token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/employment", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
