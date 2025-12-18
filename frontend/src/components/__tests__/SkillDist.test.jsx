/**
 * SkillDistributionChart Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SkillDistributionChart from "../SkillDist";

describe("SkillDistributionChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title", () => {
    render(<SkillDistributionChart data={[{ category: "Test", count: 5 }]} />);
    expect(screen.getByText("Skill Distribution")).toBeInTheDocument();
  });

  it("shows empty state when data is null", () => {
    render(<SkillDistributionChart data={null} />);
    expect(
      screen.getByText(
        "📊 No skills added yet. Add skills to see your distribution!"
      )
    ).toBeInTheDocument();
  });

  it("shows empty state when data is undefined", () => {
    render(<SkillDistributionChart data={undefined} />);
    expect(
      screen.getByText(
        "📊 No skills added yet. Add skills to see your distribution!"
      )
    ).toBeInTheDocument();
  });

  it("shows empty state when data is empty array", () => {
    render(<SkillDistributionChart data={[]} />);
    expect(
      screen.getByText(
        "📊 No skills added yet. Add skills to see your distribution!"
      )
    ).toBeInTheDocument();
  });

  it("shows empty state when total count is 0", () => {
    render(<SkillDistributionChart data={[{ category: "Test", count: 0 }]} />);
    expect(
      screen.getByText(
        "📊 No skills added yet. Add skills to see your distribution!"
      )
    ).toBeInTheDocument();
  });

  it("shows empty state when counts are missing", () => {
    render(<SkillDistributionChart data={[{ category: "Test" }]} />);
    expect(
      screen.getByText(
        "📊 No skills added yet. Add skills to see your distribution!"
      )
    ).toBeInTheDocument();
  });

  it("renders single skill bar", () => {
    render(
      <SkillDistributionChart data={[{ category: "JavaScript", count: 10 }]} />
    );
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("renders multiple skill bars", () => {
    render(
      <SkillDistributionChart
        data={[
          { category: "JavaScript", count: 50 },
          { category: "Python", count: 30 },
          { category: "Java", count: 20 },
        ]}
      />
    );
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("calculates percentages correctly", () => {
    render(
      <SkillDistributionChart
        data={[
          { category: "A", count: 25 },
          { category: "B", count: 75 },
        ]}
      />
    );
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
  });

  it("renders with 5+ skills using color cycle", () => {
    render(
      <SkillDistributionChart
        data={[
          { category: "Skill 1", count: 10 },
          { category: "Skill 2", count: 10 },
          { category: "Skill 3", count: 10 },
          { category: "Skill 4", count: 10 },
          { category: "Skill 5", count: 10 },
          { category: "Skill 6", count: 10 },
        ]}
      />
    );
    expect(screen.getByText("Skill 1")).toBeInTheDocument();
    expect(screen.getByText("Skill 6")).toBeInTheDocument();
  });

  it("renders bars with correct structure", () => {
    const { container } = render(
      <SkillDistributionChart data={[{ category: "Test", count: 10 }]} />
    );
    expect(container.querySelector(".bars")).toBeInTheDocument();
    expect(container.querySelector(".bar")).toBeInTheDocument();
    expect(container.querySelector(".bar-bg")).toBeInTheDocument();
    expect(container.querySelector(".bar-fill")).toBeInTheDocument();
    expect(container.querySelector(".label")).toBeInTheDocument();
    expect(container.querySelector(".value")).toBeInTheDocument();
  });
});
