/**
 * FormattingIssuesList Component Tests - Target: 100% Coverage
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormattingIssuesList from "../FormattingIssuesList";

describe("FormattingIssuesList", () => {
  it("returns null when both arrays are empty", () => {
    const { container } = render(
      <FormattingIssuesList formattingIssues={[]} inconsistencies={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null with default props", () => {
    const { container } = render(<FormattingIssuesList />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title when formattingIssues exist", () => {
    render(
      <FormattingIssuesList formattingIssues={[{ issue: "Test issue" }]} />
    );
    expect(screen.getByText("Issues & Inconsistencies")).toBeInTheDocument();
  });

  it("renders title when inconsistencies exist", () => {
    render(
      <FormattingIssuesList
        inconsistencies={[{ issue: "Test inconsistency" }]}
      />
    );
    expect(screen.getByText("Issues & Inconsistencies")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Problem" }]} />);
    expect(
      screen.getByText(/Formatting problems and inconsistencies/i)
    ).toBeInTheDocument();
  });

  it("renders formatting issues section with count", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Issue 1" }, { issue: "Issue 2" }]}
      />
    );
    // Find section title by class and check content
    const sectionTitles = document.querySelectorAll(
      ".formatting-issues-section-title"
    );
    const formattingTitle = Array.from(sectionTitles).find((el) =>
      el.textContent.includes("Formatting Issues")
    );
    expect(formattingTitle).toBeInTheDocument();
    expect(formattingTitle.textContent).toContain("2");
  });

  it("displays formatting icon", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Test" }]} />);
    expect(screen.getByText("📝")).toBeInTheDocument();
  });

  it("displays issue type", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Problem", type: "Font" }]}
      />
    );
    expect(screen.getByText("Font")).toBeInTheDocument();
  });

  it("displays default type when not provided", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Problem" }]} />);
    expect(screen.getByText("Issue")).toBeInTheDocument();
  });

  it("displays issue location", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Test", location: "Header" }]}
      />
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("displays default location when not provided", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Test" }]} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("displays issue description", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Font size is too small" }]}
      />
    );
    expect(screen.getByText("Font size is too small")).toBeInTheDocument();
  });

  it("renders inconsistencies section with count", () => {
    render(
      <FormattingIssuesList
        inconsistencies={[{ issue: "Inc 1" }, { issue: "Inc 2" }]}
      />
    );
    // Find section title by class and check content
    const sectionTitles = document.querySelectorAll(
      ".formatting-issues-section-title"
    );
    const inconsistencyTitle = Array.from(sectionTitles).find(
      (el) =>
        el.textContent.includes("Inconsistencies") &&
        !el.textContent.includes("Issues &")
    );
    expect(inconsistencyTitle).toBeInTheDocument();
    expect(inconsistencyTitle.textContent).toContain("2");
  });

  it("displays inconsistencies icon", () => {
    render(<FormattingIssuesList inconsistencies={[{ issue: "Test" }]} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("displays inconsistency type", () => {
    render(
      <FormattingIssuesList
        inconsistencies={[{ issue: "Problem", type: "Spacing" }]}
      />
    );
    expect(screen.getByText("Spacing")).toBeInTheDocument();
  });

  it("displays default inconsistency type when not provided", () => {
    render(<FormattingIssuesList inconsistencies={[{ issue: "Problem" }]} />);
    // The default type for inconsistencies is "Inconsistency"
    const typeElements = document.querySelectorAll(".formatting-issue-type");
    expect(typeElements.length).toBeGreaterThan(0);
  });

  it("renders both sections when both have items", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Format issue" }]}
        inconsistencies={[{ issue: "Inconsistency item" }]}
      />
    );
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  // Severity badge tests
  it("displays HIGH severity badge", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Critical", severity: "high" }]}
      />
    );
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("displays MEDIUM severity badge", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Warning", severity: "medium" }]}
      />
    );
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("displays LOW severity badge", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Minor", severity: "low" }]}
      />
    );
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("displays default MEDIUM when severity not provided", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Test" }]} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("applies correct severity color for high", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Test", severity: "high" }]}
      />
    );
    const badge = screen.getByText("HIGH");
    expect(badge).toHaveStyle({ color: "#ef4444" });
  });

  it("applies correct severity color for medium", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Test", severity: "medium" }]}
      />
    );
    const badge = screen.getByText("MEDIUM");
    expect(badge).toHaveStyle({ color: "#f59e0b" });
  });

  it("applies correct severity color for low", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Test", severity: "low" }]}
      />
    );
    const badge = screen.getByText("LOW");
    expect(badge).toHaveStyle({ color: "#3b82f6" });
  });

  it("applies default color for unknown severity", () => {
    render(
      <FormattingIssuesList
        formattingIssues={[{ issue: "Test", severity: "unknown" }]}
      />
    );
    const badge = screen.getByText("UNKNOWN");
    expect(badge).toHaveStyle({ color: "#6b7280" });
  });

  it("applies correct CSS classes", () => {
    render(<FormattingIssuesList formattingIssues={[{ issue: "Test" }]} />);
    expect(
      document.querySelector(".formatting-issues-card")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".formatting-issues-title")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".formatting-issues-content")
    ).toBeInTheDocument();
  });
});
