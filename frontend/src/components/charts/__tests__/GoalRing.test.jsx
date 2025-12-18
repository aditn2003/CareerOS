/**
 * GoalRing Component Tests
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../__tests__/helpers/test-utils";
import GoalRing from "../GoalRing";

// Mock recharts to avoid DOM measurement issues
vi.mock("recharts", () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, data }) => (
    <div data-testid="pie" data-progress={data[0]?.value}>
      {children}
    </div>
  ),
  Cell: ({ fill }) => <div data-testid="cell" data-fill={fill} />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("GoalRing", () => {
  it("renders without crashing", () => {
    render(<GoalRing current={5} target={10} label="Test Goal" />);
    expect(screen.getByText("Test Goal")).toBeInTheDocument();
  });

  it("displays the label", () => {
    render(<GoalRing current={5} target={10} label="Applications" />);
    expect(screen.getByText("Applications")).toBeInTheDocument();
  });

  it("calculates and displays progress percentage", () => {
    render(<GoalRing current={5} target={10} label="Test" />);
    // 5/10 = 50%
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });

  it("displays 0% when target is 0", () => {
    render(<GoalRing current={5} target={0} label="Test" />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("handles 100% completion", () => {
    render(<GoalRing current={10} target={10} label="Test" />);
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("handles over 100% progress", () => {
    render(<GoalRing current={15} target={10} label="Test" />);
    expect(screen.getByText("150.0%")).toBeInTheDocument();
  });

  it("displays actual rate when isRate is true", () => {
    render(
      <GoalRing current={0.75} target={1} label="Response Rate" isRate={true} />
    );
    // Should show 0.75 * 100 = 75.0%
    expect(screen.getByText("75.0%")).toBeInTheDocument();
  });

  it("renders pie chart components", () => {
    render(<GoalRing current={5} target={10} label="Test" />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders with correct CSS classes", () => {
    const { container } = render(
      <GoalRing current={5} target={10} label="Test" />
    );
    expect(container.querySelector(".chart-box")).toBeInTheDocument();
    expect(container.querySelector(".text-center")).toBeInTheDocument();
  });

  it("handles zero current value", () => {
    render(<GoalRing current={0} target={10} label="Test" />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("handles decimal values", () => {
    render(<GoalRing current={3.5} target={7} label="Test" />);
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });
});
