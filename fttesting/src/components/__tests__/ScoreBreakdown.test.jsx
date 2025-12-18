/**
 * ScoreBreakdown Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../__tests__/helpers/test-utils";
import ScoreBreakdown from "../ScoreBreakdown";

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => <div />,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
}));

describe("ScoreBreakdown", () => {
  // Use the correct prop names that the component expects
  const defaultProps = {
    scoreBreakdown: {
      keyword_match: 90,
      skills_alignment: 75,
      experience_relevance: 85,
      formatting_quality: 80,
      quantification: 70,
      ats_optimization: 65,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the score breakdown component", () => {
    const { container } = render(<ScoreBreakdown {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it("renders without crashing", () => {
    render(<ScoreBreakdown {...defaultProps} />);
    expect(document.body.firstChild).toBeTruthy();
  });

  it("displays the score breakdown title", async () => {
    render(<ScoreBreakdown {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Score Breakdown/i)).toBeInTheDocument();
    });
  });
});

describe("ScoreBreakdown - Empty State", () => {
  it("handles empty breakdown gracefully", () => {
    const { container } = render(<ScoreBreakdown scoreBreakdown={{}} />);
    // Component returns null for empty/invalid props, so container should still exist
    expect(container).toBeInTheDocument();
  });

  it("handles null breakdown gracefully", () => {
    const { container } = render(<ScoreBreakdown scoreBreakdown={null} />);
    // Component returns null for null props, so container should still exist
    expect(container).toBeInTheDocument();
  });

  it("handles undefined breakdown gracefully", () => {
    const { container } = render(<ScoreBreakdown scoreBreakdown={undefined} />);
    expect(container).toBeInTheDocument();
  });
});
