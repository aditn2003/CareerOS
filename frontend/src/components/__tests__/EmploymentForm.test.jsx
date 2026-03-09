/**
 * EmploymentForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import EmploymentForm from "../EmploymentForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("EmploymentForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Add Employment"
    );
  });

  it("renders Edit Employment title when job prop provided", () => {
    const existingJob = { id: 1, title: "Software Engineer" };
    render(
      <EmploymentForm
        token={mockToken}
        job={existingJob}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Edit Employment"
    );
  });

  it("renders job title input", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Job title/i)).toBeInTheDocument();
  });

  it("renders company name input", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Company name/i)).toBeInTheDocument();
  });

  it("renders location input", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Job location/i)).toBeInTheDocument();
  });

  it("renders start date input", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Employment start date/i)).toBeInTheDocument();
  });

  it("renders end date input when not current position", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Employment end date/i)).toBeInTheDocument();
  });

  it("renders current position checkbox", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Current position/i)).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Job description/i)).toBeInTheDocument();
  });

  it("renders Add Employment button for new entries", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByRole("button", { name: /Add Employment/i })
    ).toBeInTheDocument();
  });

  it("renders Save Changes button for existing entries", () => {
    const existingJob = { id: 1, title: "Developer" };
    render(
      <EmploymentForm
        token={mockToken}
        job={existingJob}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByRole("button", { name: /Save Changes/i })
    ).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates job title on change", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText(/Job title/i);
    fireEvent.change(input, { target: { value: "Software Engineer" } });
    expect(input).toHaveValue("Software Engineer");
  });

  it("updates company name on change", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText(/Company name/i);
    fireEvent.change(input, { target: { value: "Tech Corp" } });
    expect(input).toHaveValue("Tech Corp");
  });

  it("hides end date when current position is checked", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const checkbox = screen.getByLabelText(/Current position/i);
    fireEvent.click(checkbox);
    expect(
      screen.queryByLabelText(/Employment end date/i)
    ).not.toBeInTheDocument();
  });

  it("pre-fills form when job prop provided", () => {
    const existingJob = {
      id: 1,
      title: "Senior Developer",
      company: "Big Tech Co",
      location: "New York, NY",
      start_date: "2022-01-15",
      description: "Building great things",
    };
    render(
      <EmploymentForm
        token={mockToken}
        job={existingJob}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Job title/i)).toHaveValue("Senior Developer");
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Big Tech Co");
    expect(screen.getByLabelText(/Job location/i)).toHaveValue("New York, NY");
  });

  it("shows alert when required fields are missing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Title, company, and start date are required."
    );
    alertSpy.mockRestore();
  });

  it("shows alert when end date is before start date", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Job title/i), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText(/Employment start date/i), {
      target: { value: "2024-06-01" },
    });
    fireEvent.change(screen.getByLabelText(/Employment end date/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date.");
    alertSpy.mockRestore();
  });

  it("calls api.post for new employment on submit", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Job title/i), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText(/Employment start date/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/employment",
        expect.objectContaining({
          title: "Developer",
          company: "Tech Co",
          start_date: "2024-01-01",
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });

    alertSpy.mockRestore();
  });

  it("calls api.put for existing employment on submit", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.put.mockResolvedValueOnce({ data: { success: true } });
    const existingJob = {
      id: 1,
      title: "Developer",
      company: "Tech Co",
      start_date: "2024-01-01",
    };

    render(
      <EmploymentForm
        token={mockToken}
        job={existingJob}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/employment/1",
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });

    alertSpy.mockRestore();
  });

  it("calls onSaved after successful submit", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Job title/i), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText(/Employment start date/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Job title/i), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText(/Company name/i), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByLabelText(/Employment start date/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Employment/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Could not save employment entry.");
    });

    alertSpy.mockRestore();
  });

  it("shows character count for description", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("0/1000 characters")).toBeInTheDocument();
  });

  it("updates character count when description changes", () => {
    render(
      <EmploymentForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const textarea = screen.getByLabelText(/Job description/i);
    fireEvent.change(textarea, { target: { value: "Test description" } });
    expect(screen.getByText("16/1000 characters")).toBeInTheDocument();
  });
});
