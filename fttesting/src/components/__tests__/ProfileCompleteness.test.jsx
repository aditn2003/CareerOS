/**
 * ProfileCompleteness Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileCompletenessMeter from "../ProfileCompleteness";

// Mock react-circular-progressbar
vi.mock("react-circular-progressbar", () => ({
  CircularProgressbar: ({ value, text, styles }) => (
    <div data-testid="progress-bar" data-value={value} data-text={text}>
      Progress: {value}%
    </div>
  ),
  buildStyles: (styles) => styles,
}));

describe("ProfileCompletenessMeter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with 0 score when data is null", () => {
    render(<ProfileCompletenessMeter data={null} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "data-value",
      "0"
    );
  });

  it("renders with 0 score when data is undefined", () => {
    render(<ProfileCompletenessMeter data={undefined} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "data-value",
      "0"
    );
  });

  it("renders with 0 score when score is missing", () => {
    render(<ProfileCompletenessMeter data={{}} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "data-value",
      "0"
    );
  });

  it("renders with provided score", () => {
    render(<ProfileCompletenessMeter data={{ score: 75 }} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "data-value",
      "75"
    );
  });

  it("shows 'Needs Work' label for score below 60", () => {
    render(<ProfileCompletenessMeter data={{ score: 45 }} />);
    expect(screen.getByText("Needs Work")).toBeInTheDocument();
  });

  it("shows 'Good' label for score between 60-79", () => {
    render(<ProfileCompletenessMeter data={{ score: 65 }} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows 'Good' label for score exactly 60", () => {
    render(<ProfileCompletenessMeter data={{ score: 60 }} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows 'Excellent' label for score 80 or above", () => {
    render(<ProfileCompletenessMeter data={{ score: 85 }} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("shows 'Excellent' label for score exactly 80", () => {
    render(<ProfileCompletenessMeter data={{ score: 80 }} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("shows 'Excellent' label for score 100", () => {
    render(<ProfileCompletenessMeter data={{ score: 100 }} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("displays the percentage text", () => {
    render(<ProfileCompletenessMeter data={{ score: 55 }} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "data-text",
      "55%"
    );
  });
});
