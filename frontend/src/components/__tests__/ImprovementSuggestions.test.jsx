/**
 * ImprovementSuggestions Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../__tests__/helpers/test-utils";
import ImprovementSuggestions from "../ImprovementSuggestions";

describe("ImprovementSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title", () => {
    render(<ImprovementSuggestions suggestions={[]} />);
    expect(screen.getByText("Improvement Suggestions")).toBeInTheDocument();
  });

  it("shows empty message when no suggestions", () => {
    render(<ImprovementSuggestions suggestions={[]} />);
    expect(
      screen.getByText(
        /No suggestions available. Your application looks great!/i
      )
    ).toBeInTheDocument();
  });

  it("shows empty message when suggestions is null", () => {
    render(<ImprovementSuggestions suggestions={null} />);
    expect(
      screen.getByText(
        /No suggestions available. Your application looks great!/i
      )
    ).toBeInTheDocument();
  });

  it("shows empty message when suggestions is undefined", () => {
    render(<ImprovementSuggestions />);
    expect(
      screen.getByText(
        /No suggestions available. Your application looks great!/i
      )
    ).toBeInTheDocument();
  });

  it("renders suggestions list", () => {
    const suggestions = [
      {
        suggestion: "Add more keywords",
        priority: "high",
        category: "keywords",
      },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("Add more keywords")).toBeInTheDocument();
  });

  it("renders subtitle when suggestions exist", () => {
    const suggestions = [{ suggestion: "Test suggestion", priority: "medium" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(
      screen.getByText(/Prioritized recommendations to improve/i)
    ).toBeInTheDocument();
  });

  it("sorts suggestions by priority (high first)", () => {
    const suggestions = [
      { suggestion: "Low priority item", priority: "low" },
      { suggestion: "High priority item", priority: "high" },
      { suggestion: "Medium priority item", priority: "medium" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    // Find the suggestion items by their text - they should be sorted high -> medium -> low
    const suggestionItems = document.querySelectorAll(
      ".improvement-suggestion-item"
    );
    expect(suggestionItems.length).toBe(3);
    expect(suggestionItems[0]).toHaveTextContent("High priority item");
    expect(suggestionItems[1]).toHaveTextContent("Medium priority item");
    expect(suggestionItems[2]).toHaveTextContent("Low priority item");
  });

  it("shows priority badge for each suggestion", () => {
    const suggestions = [{ suggestion: "Test", priority: "high" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("shows medium priority by default", () => {
    const suggestions = [{ suggestion: "No priority set" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("shows category icon for keywords", () => {
    const suggestions = [{ suggestion: "Add keywords", category: "keywords" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("🔑")).toBeInTheDocument();
  });

  it("shows category icon for skills", () => {
    const suggestions = [{ suggestion: "Add skills", category: "skills" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("💼")).toBeInTheDocument();
  });

  it("shows category icon for formatting", () => {
    const suggestions = [
      { suggestion: "Fix formatting", category: "formatting" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("📝")).toBeInTheDocument();
  });

  it("shows category icon for quantification", () => {
    const suggestions = [
      { suggestion: "Add numbers", category: "quantification" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("📊")).toBeInTheDocument();
  });

  it("shows category icon for cover letter", () => {
    const suggestions = [
      { suggestion: "Improve cover letter", category: "cover_letter" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("✉️")).toBeInTheDocument();
  });

  it("shows estimated score improvement", () => {
    const suggestions = [
      { suggestion: "Test", estimated_score_improvement: 10 },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("+10 pts")).toBeInTheDocument();
  });

  it("expands suggestion on click", () => {
    const suggestions = [
      {
        suggestion: "Test suggestion",
        category: "keywords",
        impact: "High impact",
        estimated_score_improvement: 5,
      },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    const header = screen
      .getByText("Test suggestion")
      .closest(".improvement-suggestion-header");
    fireEvent.click(header);

    expect(screen.getByText("Category:")).toBeInTheDocument();
    expect(screen.getByText("keywords")).toBeInTheDocument();
    expect(screen.getByText("Impact:")).toBeInTheDocument();
    expect(screen.getByText("High impact")).toBeInTheDocument();
  });

  it("collapses suggestion on second click", () => {
    const suggestions = [
      {
        suggestion: "Test suggestion",
        impact: "High impact",
      },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    const header = screen
      .getByText("Test suggestion")
      .closest(".improvement-suggestion-header");

    // Expand
    fireEvent.click(header);
    expect(screen.getByText("High impact")).toBeInTheDocument();

    // Collapse
    fireEvent.click(header);
    expect(screen.queryByText("Impact:")).not.toBeInTheDocument();
  });

  it("shows expand indicator (+) when collapsed", () => {
    const suggestions = [{ suggestion: "Test" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("shows collapse indicator (−) when expanded", () => {
    const suggestions = [{ suggestion: "Test" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    const header = screen
      .getByText("Test")
      .closest(".improvement-suggestion-header");
    fireEvent.click(header);

    expect(screen.getByText("−")).toBeInTheDocument();
  });

  it("shows General category when none specified", () => {
    const suggestions = [{ suggestion: "Test" }];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    const header = screen
      .getByText("Test")
      .closest(".improvement-suggestion-header");
    fireEvent.click(header);

    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders multiple suggestions", () => {
    const suggestions = [
      { suggestion: "First suggestion" },
      { suggestion: "Second suggestion" },
      { suggestion: "Third suggestion" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    expect(screen.getByText("First suggestion")).toBeInTheDocument();
    expect(screen.getByText("Second suggestion")).toBeInTheDocument();
    expect(screen.getByText("Third suggestion")).toBeInTheDocument();
  });

  it("adds high-priority class for high priority items", () => {
    const suggestions = [
      { suggestion: "High priority item", priority: "high" },
    ];
    render(<ImprovementSuggestions suggestions={suggestions} />);

    const item = document.querySelector(
      ".improvement-suggestion-item.high-priority"
    );
    expect(item).toBeInTheDocument();
  });
});
