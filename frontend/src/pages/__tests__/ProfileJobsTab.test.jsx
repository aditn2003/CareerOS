/**
 * Profile JobsTab Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobsTab from "../Profile/JobsTab";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ token: "mock-token" }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock child components
vi.mock("../../components/JobEntryForm", () => ({
  default: ({ onSaved, onCancel }) => (
    <div data-testid="job-entry-form">
      <button onClick={onSaved}>Save Job</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("../../components/JobPipeLine", () => ({
  default: ({ token, onApply }) => (
    <div data-testid="job-pipeline">
      Pipeline with token: {token}
      <button onClick={() => onApply(123)}>Apply to Job</button>
      <button onClick={() => onApply(null)}>Apply with null</button>
    </div>
  ),
}));

vi.mock("../../components/UpcomingDeadlinesWidget", () => ({
  default: ({ token }) => (
    <div data-testid="deadlines-widget">Deadlines: {token}</div>
  ),
}));

vi.mock("../../components/JobsCalendar", () => ({
  default: () => <div data-testid="jobs-calendar">Calendar</div>,
}));

vi.mock("../../components/JobTimeline", () => ({
  default: ({ token }) => (
    <div data-testid="job-timeline">Timeline: {token}</div>
  ),
}));

describe("JobsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <JobsTab />
      </MemoryRouter>
    );
  };

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText(/Job Opportunities/)).toBeInTheDocument();
  });

  it("renders Add New Job button", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /Add New Job/i })
    ).toBeInTheDocument();
  });

  it("renders job pipeline", () => {
    renderPage();
    expect(screen.getByTestId("job-pipeline")).toBeInTheDocument();
  });

  it("renders deadlines widget", () => {
    renderPage();
    expect(screen.getByTestId("deadlines-widget")).toBeInTheDocument();
  });

  it("renders job timeline", () => {
    renderPage();
    expect(screen.getByTestId("job-timeline")).toBeInTheDocument();
  });

  it("shows job form when Add New Job clicked", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add New Job/i }));
    expect(screen.getByTestId("job-entry-form")).toBeInTheDocument();
  });

  it("hides Add button when form is shown", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add New Job/i }));
    expect(
      screen.queryByRole("button", { name: /Add New Job/i })
    ).not.toBeInTheDocument();
  });

  it("hides form when cancel clicked", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add New Job/i }));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("job-entry-form")).not.toBeInTheDocument();
  });

  it("hides form when saved", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add New Job/i }));
    fireEvent.click(screen.getByText("Save Job"));
    expect(screen.queryByTestId("job-entry-form")).not.toBeInTheDocument();
  });

  it("shows Add button after form is closed", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add New Job/i }));
    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.getByRole("button", { name: /Add New Job/i })
    ).toBeInTheDocument();
  });

  it("navigates to job match when apply clicked", () => {
    renderPage();
    fireEvent.click(screen.getByText("Apply to Job"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "/job-match?jobId=123&tab=quality"
    );
  });

  it("does not navigate when jobId is null", () => {
    renderPage();
    fireEvent.click(screen.getByText("Apply with null"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("passes token to pipeline", () => {
    renderPage();
    expect(
      screen.getByText(/Pipeline with token: mock-token/)
    ).toBeInTheDocument();
  });

  it("passes token to timeline", () => {
    renderPage();
    expect(screen.getByText(/Timeline: mock-token/)).toBeInTheDocument();
  });

  it("passes token to deadlines widget", () => {
    renderPage();
    expect(screen.getByText(/Deadlines: mock-token/)).toBeInTheDocument();
  });

  it("has jobs layout class", () => {
    renderPage();
    expect(document.querySelector(".jobs-layout")).toBeInTheDocument();
  });

  it("renders sidebar with widget", () => {
    renderPage();
    expect(document.querySelector(".sidebar-widget")).toBeInTheDocument();
  });
});
