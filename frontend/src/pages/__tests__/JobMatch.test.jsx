/**
 * JobMatch Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobMatch from "../Match/JobMatch";

// Mock child tab components
vi.mock("../Match/MatchAnalysisTab", () => ({
  default: () => <div data-testid="match-analysis-tab">Match Analysis Tab</div>,
}));
vi.mock("../Match/QualityScoringTab", () => ({
  default: ({ jobId }) => (
    <div data-testid="quality-scoring-tab">Quality Scoring Tab {jobId}</div>
  ),
}));
vi.mock("../Match/TimingTab", () => ({
  default: ({ jobId }) => (
    <div data-testid="timing-tab">Timing Tab {jobId}</div>
  ),
}));
vi.mock("../Match/MaterialComparisonTab", () => ({
  default: () => (
    <div data-testid="material-comparison-tab">Material Comparison Tab</div>
  ),
}));

const renderJobMatch = (searchParams = "") => {
  return render(
    <MemoryRouter initialEntries={[`/match${searchParams}`]}>
      <JobMatch />
    </MemoryRouter>
  );
};

describe("JobMatch Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title", () => {
    renderJobMatch();
    expect(screen.getByText("Job Match")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    renderJobMatch();
    expect(
      screen.getByText("Analyze job fit and application quality")
    ).toBeInTheDocument();
  });

  it("renders Analysis nav group", () => {
    renderJobMatch();
    expect(screen.getByText("Analysis")).toBeInTheDocument();
  });

  it("renders all navigation tabs", () => {
    renderJobMatch();
    expect(screen.getByRole("button", { name: /Match/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Quality/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Timing/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Comparison/i })
    ).toBeInTheDocument();
  });

  it("renders nav icons", () => {
    renderJobMatch();
    expect(screen.getByText("📊")).toBeInTheDocument();
    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.getByText("⏰")).toBeInTheDocument();
    expect(screen.getByText("📈")).toBeInTheDocument();
  });

  it("shows Match Analysis tab by default", () => {
    renderJobMatch();
    expect(screen.getByTestId("match-analysis-tab")).toBeInTheDocument();
  });

  it("switches to Quality Scoring tab when clicked", () => {
    renderJobMatch();
    fireEvent.click(screen.getByRole("button", { name: /Quality/i }));
    expect(screen.getByTestId("quality-scoring-tab")).toBeInTheDocument();
  });

  it("switches to Timing tab when clicked", () => {
    renderJobMatch();
    fireEvent.click(screen.getByRole("button", { name: /Timing/i }));
    expect(screen.getByTestId("timing-tab")).toBeInTheDocument();
  });

  it("switches to Comparison tab when clicked", () => {
    renderJobMatch();
    fireEvent.click(screen.getByRole("button", { name: /Comparison/i }));
    expect(screen.getByTestId("material-comparison-tab")).toBeInTheDocument();
  });

  it("activates Match tab by default", () => {
    renderJobMatch();
    const matchTab = screen.getByRole("button", { name: /Match/i });
    expect(matchTab).toHaveClass("active");
  });

  it("shows Quality tab from URL param", () => {
    renderJobMatch("?tab=quality");
    expect(screen.getByTestId("quality-scoring-tab")).toBeInTheDocument();
  });

  it("shows Timing tab from URL param", () => {
    renderJobMatch("?tab=timing");
    expect(screen.getByTestId("timing-tab")).toBeInTheDocument();
  });

  it("shows Comparison tab from URL param", () => {
    renderJobMatch("?tab=comparison");
    expect(screen.getByTestId("material-comparison-tab")).toBeInTheDocument();
  });
});
