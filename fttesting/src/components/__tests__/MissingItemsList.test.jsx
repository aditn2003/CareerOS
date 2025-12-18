/**
 * MissingItemsList Component Tests - Target: 100% Coverage
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MissingItemsList from "../MissingItemsList";

describe("MissingItemsList", () => {
  it("returns null when both arrays are empty", () => {
    const { container } = render(
      <MissingItemsList missingKeywords={[]} missingSkills={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null with default props", () => {
    const { container } = render(<MissingItemsList />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title when keywords exist", () => {
    render(<MissingItemsList missingKeywords={["React"]} />);
    expect(screen.getByText("Missing Items")).toBeInTheDocument();
  });

  it("renders title when skills exist", () => {
    render(<MissingItemsList missingSkills={["JavaScript"]} />);
    expect(screen.getByText("Missing Items")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<MissingItemsList missingKeywords={["Python"]} />);
    expect(
      screen.getByText(/Keywords and skills from the job description/i)
    ).toBeInTheDocument();
  });

  it("renders missing keywords section with count", () => {
    render(<MissingItemsList missingKeywords={["API", "REST"]} />);
    // Check that section title contains the count
    const sectionTitle = document.querySelector(".missing-items-section-title");
    expect(sectionTitle).toBeInTheDocument();
    expect(sectionTitle.textContent).toContain("Missing Keywords");
    expect(sectionTitle.textContent).toContain("2");
  });

  it("displays keyword icon", () => {
    render(<MissingItemsList missingKeywords={["Docker"]} />);
    expect(screen.getByText("🔑")).toBeInTheDocument();
  });

  it("renders all keywords as tags", () => {
    render(<MissingItemsList missingKeywords={["AWS", "Azure", "GCP"]} />);
    expect(screen.getByText("AWS")).toBeInTheDocument();
    expect(screen.getByText("Azure")).toBeInTheDocument();
    expect(screen.getByText("GCP")).toBeInTheDocument();
  });

  it("renders missing skills section with count", () => {
    render(<MissingItemsList missingSkills={["TypeScript", "Node.js"]} />);
    // Check that section title contains the count
    const sectionTitle = document.querySelector(".missing-items-section-title");
    expect(sectionTitle).toBeInTheDocument();
    expect(sectionTitle.textContent).toContain("Missing Skills");
    expect(sectionTitle.textContent).toContain("2");
  });

  it("displays skills icon", () => {
    render(<MissingItemsList missingSkills={["SQL"]} />);
    expect(screen.getByText("💼")).toBeInTheDocument();
  });

  it("renders all skills as tags", () => {
    render(<MissingItemsList missingSkills={["Go", "Rust", "C++"]} />);
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.getByText("C++")).toBeInTheDocument();
  });

  it("renders both sections when both have items", () => {
    render(
      <MissingItemsList missingKeywords={["Agile"]} missingSkills={["Scrum"]} />
    );
    expect(screen.getByText("🔑")).toBeInTheDocument();
    expect(screen.getByText("💼")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    render(<MissingItemsList missingKeywords={["Test"]} />);
    expect(document.querySelector(".missing-items-card")).toBeInTheDocument();
    expect(document.querySelector(".missing-items-title")).toBeInTheDocument();
    expect(
      document.querySelector(".missing-items-content")
    ).toBeInTheDocument();
  });

  it("applies keyword class to keyword tags", () => {
    render(<MissingItemsList missingKeywords={["Leadership"]} />);
    const tag = screen.getByText("Leadership");
    expect(tag).toHaveClass("missing-item-tag");
    expect(tag).toHaveClass("keyword");
  });

  it("applies skill class to skill tags", () => {
    render(<MissingItemsList missingSkills={["Management"]} />);
    const tag = screen.getByText("Management");
    expect(tag).toHaveClass("missing-item-tag");
    expect(tag).toHaveClass("skill");
  });
});
