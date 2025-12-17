/**
 * ElectricBorder Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "../../__tests__/helpers/test-utils";
import ElectricBorder from "../ElectricBorder";

describe("ElectricBorder", () => {
  beforeEach(() => {
    // Mock ResizeObserver as a class
    global.ResizeObserver = class ResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <ElectricBorder>
        <div>Content</div>
      </ElectricBorder>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    render(
      <ElectricBorder>
        <span>Child Element</span>
      </ElectricBorder>
    );
    expect(screen.getByText("Child Element")).toBeInTheDocument();
  });

  it("applies electric-border class", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    expect(container.querySelector(".electric-border")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ElectricBorder className="custom-class">
        <div>Test</div>
      </ElectricBorder>
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("applies custom style", () => {
    const { container } = render(
      <ElectricBorder style={{ margin: "10px" }}>
        <div>Test</div>
      </ElectricBorder>
    );
    const border = container.querySelector(".electric-border");
    expect(border).toHaveStyle({ margin: "10px" });
  });

  it("sets CSS variable for color", () => {
    const { container } = render(
      <ElectricBorder color="#FF0000">
        <div>Test</div>
      </ElectricBorder>
    );
    const border = container.querySelector(".electric-border");
    expect(border.style.getPropertyValue("--electric-border-color")).toBe(
      "#FF0000"
    );
  });

  it("sets CSS variable for thickness", () => {
    const { container } = render(
      <ElectricBorder thickness={5}>
        <div>Test</div>
      </ElectricBorder>
    );
    const border = container.querySelector(".electric-border");
    expect(border.style.getPropertyValue("--eb-border-width")).toBe("5px");
  });

  it("uses default color when not provided", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const border = container.querySelector(".electric-border");
    expect(border.style.getPropertyValue("--electric-border-color")).toBe(
      "#5227FF"
    );
  });

  it("uses default thickness when not provided", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const border = container.querySelector(".electric-border");
    expect(border.style.getPropertyValue("--eb-border-width")).toBe("2px");
  });

  it("renders SVG element", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("eb-svg");
  });

  it("SVG has aria-hidden attribute", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden");
  });

  it("SVG is not focusable", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("renders layer elements", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );

    expect(container.querySelector(".eb-layers")).toBeInTheDocument();
    expect(container.querySelector(".eb-stroke")).toBeInTheDocument();
    expect(container.querySelector(".eb-glow-1")).toBeInTheDocument();
    expect(container.querySelector(".eb-glow-2")).toBeInTheDocument();
    expect(container.querySelector(".eb-background-glow")).toBeInTheDocument();
  });

  it("renders content wrapper", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    expect(container.querySelector(".eb-content")).toBeInTheDocument();
  });

  it("places children in content wrapper", () => {
    const { container } = render(
      <ElectricBorder>
        <div data-testid="child">Test</div>
      </ElectricBorder>
    );
    const content = container.querySelector(".eb-content");
    expect(content.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it("renders SVG filter with unique ID", () => {
    const { container } = render(
      <ElectricBorder>
        <div>Test</div>
      </ElectricBorder>
    );
    const filter = container.querySelector("filter");
    expect(filter).toBeInTheDocument();
    expect(filter.id).toContain("turbulent-displace");
  });

  it("handles speed prop", () => {
    const { container } = render(
      <ElectricBorder speed={2}>
        <div>Test</div>
      </ElectricBorder>
    );
    expect(container.querySelector(".electric-border")).toBeInTheDocument();
  });

  it("handles chaos prop", () => {
    const { container } = render(
      <ElectricBorder chaos={0.5}>
        <div>Test</div>
      </ElectricBorder>
    );
    expect(container.querySelector(".electric-border")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <ElectricBorder>
        <div>First</div>
        <div>Second</div>
      </ElectricBorder>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("handles null children gracefully", () => {
    render(<ElectricBorder>{null}</ElectricBorder>);
    expect(document.querySelector(".electric-border")).toBeInTheDocument();
  });
});
