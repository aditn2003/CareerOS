/**
 * Jobs Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import Jobs from "../Jobs";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ token: "mock-token", authed: true, user: { id: 1 } }),
}));

// Mock child components to isolate testing
vi.mock("../../components/JobEntryForm", () => ({
  default: ({ onSaved, onCancel }) => (
    <div data-testid="job-entry-form">
      <button onClick={onSaved}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("../../components/JobPipeLine", () => ({
  default: ({ onApply }) => (
    <div data-testid="job-pipeline">
      <button onClick={() => onApply(1)}>Apply to Job</button>
    </div>
  ),
}));

vi.mock("../../components/JobMapView", () => ({
  default: () => <div data-testid="job-map-view">Map View</div>,
}));

vi.mock("../../components/UpcomingDeadlinesWidget", () => ({
  default: () => <div data-testid="upcoming-deadlines">Deadlines</div>,
}));

vi.mock("../../components/JobsCalendar", () => ({
  default: () => <div data-testid="jobs-calendar">Calendar</div>,
}));

vi.mock("../../components/stats", () => ({
  default: () => <div data-testid="statistics-dashboard">Stats</div>,
}));

vi.mock("../../components/FollowUpReminders", () => ({
  default: () => <div data-testid="follow-up-reminders">Follow-ups</div>,
}));

vi.mock("../../components/OptimizationDashboard", () => ({
  default: () => <div data-testid="optimization-dashboard">Optimization</div>,
}));

vi.mock("../../components/OfferComparison", () => ({
  default: () => <div data-testid="offer-comparison">Offer Comparison</div>,
}));

vi.mock("../../components/CareerGrowthCalculator", () => ({
  default: () => (
    <div data-testid="career-growth-calculator">Career Growth</div>
  ),
}));

vi.mock("../../components/JobTimeline", () => ({
  default: () => <div data-testid="job-timeline">Timeline</div>,
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/jobs" }),
  };
});

describe("Jobs Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Jobs page title", () => {
    render(<Jobs />);
    expect(screen.getByText("Jobs")).toBeInTheDocument();
  });

  it("renders tab navigation", () => {
    render(<Jobs />);
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Map View")).toBeInTheDocument();
    expect(screen.getByText("Follow-Ups")).toBeInTheDocument();
    expect(screen.getByText("Optimization")).toBeInTheDocument();
    expect(screen.getByText("Offer Comparison")).toBeInTheDocument();
    expect(screen.getByText("Career Growth")).toBeInTheDocument();
  });

  it("shows Pipeline tab by default", () => {
    render(<Jobs />);
    expect(screen.getByText("Job Tracker")).toBeInTheDocument();
    expect(screen.getByText("Job Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Performance Dashboard")).toBeInTheDocument();
  });

  it("renders Add New Job button", () => {
    render(<Jobs />);
    expect(screen.getByText("Add New Job")).toBeInTheDocument();
  });

  it("shows job form when Add New Job is clicked", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Add New Job"));
    expect(screen.getByTestId("job-entry-form")).toBeInTheDocument();
  });

  it("hides job form when Cancel is clicked", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Add New Job"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("job-entry-form")).not.toBeInTheDocument();
  });

  it("hides job form when Save is clicked", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Add New Job"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("job-entry-form")).not.toBeInTheDocument();
  });

  it("renders JobPipeline component", () => {
    render(<Jobs />);
    expect(screen.getByTestId("job-pipeline")).toBeInTheDocument();
  });

  it("renders UpcomingDeadlinesWidget in sidebar", () => {
    render(<Jobs />);
    expect(screen.getByTestId("upcoming-deadlines")).toBeInTheDocument();
  });

  it("renders StatisticsDashboard", () => {
    render(<Jobs />);
    expect(screen.getByTestId("statistics-dashboard")).toBeInTheDocument();
  });

  it("navigates to job match when Apply is clicked", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Apply to Job"));
    expect(mockNavigate).toHaveBeenCalledWith("/job-match?jobId=1&tab=quality");
  });

  it("switches to Map View tab", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Map View"));
    expect(screen.getByTestId("job-map-view")).toBeInTheDocument();
    expect(screen.getByText("Job Locations Map")).toBeInTheDocument();
  });

  it("switches to Follow-Ups tab", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Follow-Ups"));
    expect(screen.getByTestId("follow-up-reminders")).toBeInTheDocument();
  });

  it("switches to Optimization tab", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Optimization"));
    expect(screen.getByTestId("optimization-dashboard")).toBeInTheDocument();
  });

  it("switches to Offer Comparison tab", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Offer Comparison"));
    expect(screen.getByTestId("offer-comparison")).toBeInTheDocument();
  });

  it("switches to Career Growth tab", () => {
    render(<Jobs />);
    fireEvent.click(screen.getByText("Career Growth"));
    expect(screen.getByTestId("career-growth-calculator")).toBeInTheDocument();
  });
});
