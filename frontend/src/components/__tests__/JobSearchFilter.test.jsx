/**
 * JobSearchFilter Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import JobSearchFilter from "../JobSearchFilter";

describe("JobSearchFilter", () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    expect(
      screen.getByPlaceholderText(/Search by title, company, or keyword/i)
    ).toBeInTheDocument();
  });

  it("renders all filter controls", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    expect(screen.getByLabelText("Filter by job status")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by industry")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by location")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum salary filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum salary filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort jobs by")).toBeInTheDocument();
  });

  it("renders status options", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    const statusSelect = screen.getByLabelText("Filter by job status");
    expect(statusSelect).toBeInTheDocument();
    expect(screen.getByText("All Stages")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
  });

  it("renders sort options", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Sort: Date Added")).toBeInTheDocument();
    expect(screen.getByText("Deadline")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("renders Clear, Save, and Load buttons", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Load/i })).toBeInTheDocument();
  });

  it("updates search input", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    const searchInput = screen.getByPlaceholderText(
      /Search by title, company, or keyword/i
    );
    fireEvent.change(searchInput, { target: { value: "Software Engineer" } });
    expect(searchInput).toHaveValue("Software Engineer");
  });

  it("calls onFilterChange with debounce", async () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    const searchInput = screen.getByPlaceholderText(
      /Search by title, company, or keyword/i
    );
    fireEvent.change(searchInput, { target: { value: "React" } });

    // Should not be called immediately
    expect(mockOnFilterChange).not.toHaveBeenCalled();

    // Advance timers past debounce delay
    vi.advanceTimersByTime(500);

    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it("clears all filters when Clear clicked", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);

    // Set some values first
    fireEvent.change(screen.getByLabelText("Filter by industry"), {
      target: { value: "Tech" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByLabelText("Filter by industry")).toHaveValue("");
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "",
        industry: "",
        location: "",
        search: "",
      })
    );
  });

  it("saves search to localStorage", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.change(screen.getByLabelText("Filter by industry"), {
      target: { value: "Technology" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    const saved = JSON.parse(localStorage.getItem("savedJobSearch"));
    expect(saved.industry).toBe("Technology");
    expect(window.alert).toHaveBeenCalledWith("✅ Search preferences saved!");
  });

  it("loads search from localStorage", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    localStorage.setItem(
      "savedJobSearch",
      JSON.stringify({
        status: "Applied",
        industry: "Finance",
        location: "NYC",
        search: "Analyst",
        sortBy: "salary",
      })
    );

    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Load/i }));

    expect(screen.getByLabelText("Filter by industry")).toHaveValue("Finance");
    expect(screen.getByLabelText("Filter by location")).toHaveValue("NYC");
    expect(window.alert).toHaveBeenCalledWith(
      "✅ Loaded saved search preferences!"
    );
  });

  it("shows alert when no saved search exists", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Load/i }));

    expect(window.alert).toHaveBeenCalledWith("⚠️ No saved search found");
  });

  it("uses saved preferences from props", () => {
    const savedPreferences = {
      search: "Developer",
      status: "Interview",
      industry: "Tech",
      location: "Remote",
    };

    render(
      <JobSearchFilter
        onFilterChange={mockOnFilterChange}
        savedPreferences={savedPreferences}
      />
    );

    expect(
      screen.getByPlaceholderText(/Search by title, company, or keyword/i)
    ).toHaveValue("Developer");
    expect(screen.getByLabelText("Filter by job status")).toHaveValue(
      "Interview"
    );
    expect(screen.getByLabelText("Filter by industry")).toHaveValue("Tech");
    expect(screen.getByLabelText("Filter by location")).toHaveValue("Remote");
  });

  it("renders date range inputs", () => {
    render(<JobSearchFilter onFilterChange={mockOnFilterChange} />);
    expect(screen.getByLabelText("Deadline start date")).toBeInTheDocument();
    expect(screen.getByLabelText("Deadline end date")).toBeInTheDocument();
  });
});
