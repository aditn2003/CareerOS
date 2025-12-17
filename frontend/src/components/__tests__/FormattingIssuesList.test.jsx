/**
 * FormattingIssuesList Component Tests
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../../__tests__/helpers/test-utils";
import FormattingIssuesList from "../FormattingIssuesList";

describe("FormattingIssuesList", () => {
  it("renders nothing when no issues or inconsistencies", () => {
    const { container } = render(<FormattingIssuesList />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing with empty arrays", () => {
    const { container } = render(
      <FormattingIssuesList formattingIssues={[]} inconsistencies={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title when issues exist", () => {
    const issues = [
      { type: "Spacing", issue: "Too many spaces", severity: "low" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("Issues & Inconsistencies")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    const issues = [
      { type: "Spacing", issue: "Too many spaces", severity: "low" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(
      screen.getByText(
        "Formatting problems and inconsistencies found in your application materials"
      )
    ).toBeInTheDocument();
  });

  it("renders formatting issues section header", () => {
    const issues = [{ type: "Spacing", issue: "Test issue", severity: "low" }];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("Formatting Issues (1)")).toBeInTheDocument();
  });

  it("renders inconsistencies section header", () => {
    const inconsistencies = [
      { type: "Date", issue: "Inconsistent dates", severity: "medium" },
    ];
    render(<FormattingIssuesList inconsistencies={inconsistencies} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.getByText("Inconsistencies (1)")).toBeInTheDocument();
  });

  it("renders formatting issue details", () => {
    const issues = [
      {
        type: "Spacing",
        issue: "Too many spaces between words",
        severity: "low",
        location: "Resume header",
      },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("Spacing")).toBeInTheDocument();
    expect(
      screen.getByText("Too many spaces between words")
    ).toBeInTheDocument();
    expect(screen.getByText("Resume header")).toBeInTheDocument();
  });

  it("renders inconsistency details", () => {
    const inconsistencies = [
      {
        type: "Date Format",
        issue: "Dates use different formats",
        severity: "medium",
        location: "Experience section",
      },
    ];
    render(<FormattingIssuesList inconsistencies={inconsistencies} />);
    expect(screen.getByText("Date Format")).toBeInTheDocument();
    expect(screen.getByText("Dates use different formats")).toBeInTheDocument();
    expect(screen.getByText("Experience section")).toBeInTheDocument();
  });

  it("renders HIGH severity badge correctly", () => {
    const issues = [
      { type: "Error", issue: "Critical issue", severity: "high" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders MEDIUM severity badge correctly", () => {
    const issues = [
      { type: "Warning", issue: "Medium issue", severity: "medium" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("renders LOW severity badge correctly", () => {
    const issues = [{ type: "Info", issue: "Low issue", severity: "low" }];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("defaults to MEDIUM when severity not provided", () => {
    const issues = [{ type: "Unknown", issue: "No severity" }];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("handles missing type gracefully", () => {
    const issues = [{ issue: "Issue without type", severity: "low" }];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("Issue")).toBeInTheDocument();
  });

  it("handles missing location gracefully", () => {
    const issues = [
      { type: "Error", issue: "Issue without location", severity: "low" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders multiple formatting issues", () => {
    const issues = [
      {
        type: "Spacing",
        issue: "Issue 1",
        severity: "low",
        location: "Header",
      },
      { type: "Font", issue: "Issue 2", severity: "medium", location: "Body" },
      {
        type: "Alignment",
        issue: "Issue 3",
        severity: "high",
        location: "Footer",
      },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    expect(screen.getByText("Formatting Issues (3)")).toBeInTheDocument();
    expect(screen.getByText("Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Issue 2")).toBeInTheDocument();
    expect(screen.getByText("Issue 3")).toBeInTheDocument();
  });

  it("renders multiple inconsistencies", () => {
    const inconsistencies = [
      {
        type: "Date",
        issue: "Inconsistency 1",
        severity: "low",
        location: "Sec 1",
      },
      {
        type: "Style",
        issue: "Inconsistency 2",
        severity: "medium",
        location: "Sec 2",
      },
    ];
    render(<FormattingIssuesList inconsistencies={inconsistencies} />);
    expect(screen.getByText("Inconsistencies (2)")).toBeInTheDocument();
    expect(screen.getByText("Inconsistency 1")).toBeInTheDocument();
    expect(screen.getByText("Inconsistency 2")).toBeInTheDocument();
  });

  it("renders both formatting issues and inconsistencies", () => {
    const formattingIssues = [
      { type: "Spacing", issue: "Formatting issue", severity: "low" },
    ];
    const inconsistencies = [
      { type: "Date", issue: "Date inconsistency", severity: "medium" },
    ];
    render(
      <FormattingIssuesList
        formattingIssues={formattingIssues}
        inconsistencies={inconsistencies}
      />
    );
    expect(screen.getByText("Formatting Issues (1)")).toBeInTheDocument();
    expect(screen.getByText("Inconsistencies (1)")).toBeInTheDocument();
    expect(screen.getByText("Formatting issue")).toBeInTheDocument();
    expect(screen.getByText("Date inconsistency")).toBeInTheDocument();
  });

  it("handles case-insensitive severity", () => {
    const issues = [
      { type: "Test1", issue: "High case", severity: "HIGH" },
      { type: "Test2", issue: "Mixed case", severity: "Medium" },
      { type: "Test3", issue: "Low case", severity: "LOW" },
    ];
    render(<FormattingIssuesList formattingIssues={issues} />);
    // All should be converted to uppercase in display
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("uses default type for inconsistencies", () => {
    const inconsistencies = [{ issue: "No type provided" }];
    render(<FormattingIssuesList inconsistencies={inconsistencies} />);
    expect(screen.getByText("Inconsistency")).toBeInTheDocument();
  });
});
