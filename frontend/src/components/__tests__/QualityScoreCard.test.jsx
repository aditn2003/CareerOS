/**
 * QualityScoreCard Component Tests
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../../__tests__/helpers/test-utils";
import QualityScoreCard from "../QualityScoreCard";

describe("QualityScoreCard", () => {
  it("returns null when no score provided", () => {
    const { container } = render(<QualityScoreCard score={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders overall score", () => {
    const score = { overall_score: 75 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("displays Excellent label for high scores", () => {
    const score = { overall_score: 85 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("displays Good label for medium-high scores", () => {
    const score = { overall_score: 65 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("displays Fair label for medium scores", () => {
    const score = { overall_score: 55 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("displays Needs Improvement label for low scores", () => {
    const score = { overall_score: 40 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Needs Improvement")).toBeInTheDocument();
  });

  it("shows passing badge when meets threshold", () => {
    const score = {
      overall_score: 75,
      meets_threshold: true,
      minimum_threshold: 70,
    };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("✓ Meets Threshold (70+)")).toBeInTheDocument();
  });

  it("shows failing badge when below threshold", () => {
    const score = {
      overall_score: 55,
      meets_threshold: false,
      minimum_threshold: 70,
    };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("✗ Below Threshold (70+)")).toBeInTheDocument();
  });

  it("displays resume score from top level", () => {
    const score = { overall_score: 75, resume_score: 80 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("displays cover letter score from top level", () => {
    const score = { overall_score: 75, cover_letter_score: 70 };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("Cover Letter")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();
  });

  it("displays scores from score_breakdown", () => {
    const score = {
      overall_score: 75,
      score_breakdown: {
        resume_score: 85,
        cover_letter_score: 65,
      },
    };
    render(<QualityScoreCard score={score} />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
  });

  it("renders user stats comparison when provided", () => {
    const score = { overall_score: 75 };
    const userStats = { average_score: 70, top_score: 80 };
    render(<QualityScoreCard score={score} userStats={userStats} />);
    expect(screen.getByText("Your Performance")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("Top Score")).toBeInTheDocument();
  });

  it("shows positive diff when above average", () => {
    const score = { overall_score: 80 };
    const userStats = { average_score: 70, top_score: null };
    render(<QualityScoreCard score={score} userStats={userStats} />);
    expect(screen.getByText("+10.0")).toBeInTheDocument();
  });

  it("shows negative diff when below average", () => {
    const score = { overall_score: 65 };
    const userStats = { average_score: 70, top_score: null };
    render(<QualityScoreCard score={score} userStats={userStats} />);
    expect(screen.getByText("-5.0")).toBeInTheDocument();
  });

  it("does not render comparison when userStats is null", () => {
    const score = { overall_score: 75 };
    render(<QualityScoreCard score={score} userStats={null} />);
    expect(screen.queryByText("Your Performance")).not.toBeInTheDocument();
  });

  it("does not render comparison when both stats are null", () => {
    const score = { overall_score: 75 };
    const userStats = { average_score: null, top_score: null };
    render(<QualityScoreCard score={score} userStats={userStats} />);
    expect(screen.queryByText("Your Performance")).not.toBeInTheDocument();
  });
});
