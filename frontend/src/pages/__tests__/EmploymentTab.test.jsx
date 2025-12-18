/**
 * EmploymentTab Page Tests - Target: High Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EmploymentTab from "../Profile/EmploymentTab";
import { api } from "../../api";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

// Mock api
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock EmploymentForm
vi.mock("../../components/EmploymentForm", () => ({
  default: ({ job, onCancel, onSaved }) => (
    <div data-testid="employment-form">
      <div data-testid="employment-form-mode">
        {job && job.id ? `Editing ${job.title}` : "Adding"}
      </div>
      <button onClick={onSaved}>Save Employment</button>
      <button onClick={onCancel}>Cancel Employment</button>
    </div>
  ),
}));

describe("EmploymentTab", () => {
  const mockJobs = [
    {
      id: 1,
      title: "Software Engineer",
      company: "Acme Corp",
      location: "NYC",
      start_date: "2020-01-01",
      end_date: "2022-01-01",
      description: "Built things",
    },
    {
      id: 2,
      title: "Senior Engineer",
      company: "Beta Inc",
      location: "SF",
      start_date: "2022-02-01",
      end_date: null,
      description: "Lead stuff",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    global.confirm = vi.fn();
  });

  const mockGetWithData = () => {
    api.get.mockResolvedValue({ data: { employment: mockJobs } });
  };

  it("fetches employment on mount", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/employment", {
        headers: { Authorization: "Bearer test-token" },
      });
    });
  });

  it("shows loading state while fetching", () => {
    // Never resolve get
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<EmploymentTab />);
    expect(screen.getByText(/Loading employment history/i)).toBeInTheDocument();
  });

  it("shows empty state when no employment", async () => {
    api.get.mockResolvedValue({ data: { employment: [] } });
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getByText(/No employment history yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders header and Add Employment button", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(screen.getByText(/Employment History/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Add Employment/i })
    ).toBeInTheDocument();
  });

  it("shows statistics when employment exists", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      // Total Positions
      expect(screen.getByText("2")).toBeInTheDocument();
      // Current Roles (1 current job)
      expect(screen.getByText("1")).toBeInTheDocument();
      // Total Experience text exists
      expect(screen.getByText(/Total Experience/i)).toBeInTheDocument();
    });
  });

  it("renders employment list items", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
      expect(screen.getAllByText("Acme Corp")[0]).toBeInTheDocument();
    });
  });

  it("shows Current badge for ongoing roles", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      const badge = document.querySelector(".employment-current-badge");
      expect(badge).toBeInTheDocument();
    });
  });

  it("shows duration text", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      // Just assert that duration parentheses appear
      const duration = screen.getAllByText(/\(/i)[0];
      expect(duration.textContent).toContain("(");
      expect(duration.textContent).toContain(")");
    });
  });

  it("opens form in add mode", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Employment/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));
    expect(screen.getByTestId("employment-form")).toBeInTheDocument();
    expect(screen.getByTestId("employment-form-mode").textContent).toContain(
      "Adding"
    );
  });

  it("opens form in edit mode", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Edit/i })[0]);
    expect(screen.getByTestId("employment-form")).toBeInTheDocument();
    expect(screen.getByTestId("employment-form-mode").textContent).toContain(
      "Editing"
    );
  });

  it("closes form on cancel", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Employment/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));
    expect(screen.getByTestId("employment-form")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel Employment"));
    expect(screen.queryByTestId("employment-form")).not.toBeInTheDocument();
  });

  it("reloads employment after save", async () => {
    mockGetWithData();
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Employment/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));
    fireEvent.click(screen.getByText("Save Employment"));

    await waitFor(() => {
      // loadEmployment should call api.get again
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("confirms before deleting", async () => {
    mockGetWithData();
    global.confirm.mockReturnValue(false);
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Delete/i })[0]
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete/i })[0]);
    expect(global.confirm).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("deletes employment after confirmation", async () => {
    mockGetWithData();
    api.delete.mockResolvedValue({});
    global.confirm.mockReturnValue(true);
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Delete/i })[0]
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete/i })[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        "✅ Employment entry deleted successfully!"
      );
    });
  });

  it("shows error alert when delete fails", async () => {
    mockGetWithData();
    api.delete.mockRejectedValue(new Error("fail"));
    global.confirm.mockReturnValue(true);
    render(<EmploymentTab />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Delete/i })[0]
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete/i })[0]);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "❌ Could not delete employment entry."
      );
    });
  });
});




