/**
 * StageTimeChart Component Tests
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../__tests__/helpers/test-utils";
import StageTimeChart from "../StageTimeChart";

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-items={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill} />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ allowDecimals }) => (
    <div data-testid="y-axis" data-decimals={allowDecimals} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: ({ strokeDasharray }) => (
    <div data-testid="grid" data-dash={strokeDasharray} />
  ),
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("StageTimeChart", () => {
  const mockData = [
    { status: "Applied", avg_days: 5 },
    { status: "Interview", avg_days: 10 },
    { status: "Offer", avg_days: 3 },
  ];

  it("renders without crashing", () => {
    render(<StageTimeChart data={mockData} />);
    expect(screen.getByText("⏱ Avg Time in Stage (days)")).toBeInTheDocument();
  });

  it("displays the title", () => {
    render(<StageTimeChart data={mockData} />);
    expect(screen.getByText("⏱ Avg Time in Stage (days)")).toBeInTheDocument();
  });

  it("renders with default empty data", () => {
    render(<StageTimeChart />);
    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));
    expect(data).toEqual([]);
  });

  it("renders with empty array", () => {
    render(<StageTimeChart data={[]} />);
    expect(screen.getByText("⏱ Avg Time in Stage (days)")).toBeInTheDocument();
  });

  it("formats data correctly with status and days", () => {
    render(<StageTimeChart data={mockData} />);
    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ status: "Applied", days: 5 });
    expect(data[1]).toEqual({ status: "Interview", days: 10 });
    expect(data[2]).toEqual({ status: "Offer", days: 3 });
  });

  it("handles missing status with Unknown", () => {
    const dataWithMissing = [{ avg_days: 5 }];
    render(<StageTimeChart data={dataWithMissing} />);

    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data[0].status).toBe("Unknown");
  });

  it("handles missing avg_days with 0", () => {
    const dataWithMissing = [{ status: "Applied" }];
    render(<StageTimeChart data={dataWithMissing} />);

    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data[0].days).toBe(0);
  });

  it("converts string avg_days to number", () => {
    const dataWithStrings = [{ status: "Applied", avg_days: "15" }];
    render(<StageTimeChart data={dataWithStrings} />);

    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(typeof data[0].days).toBe("number");
    expect(data[0].days).toBe(15);
  });

  it("renders bar chart components", () => {
    render(<StageTimeChart data={mockData} />);

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("uses correct bar color", () => {
    render(<StageTimeChart data={mockData} />);
    const bar = screen.getByTestId("bar");
    expect(bar.getAttribute("data-fill")).toBe("#60a5fa");
  });

  it("uses days as data key for bar", () => {
    render(<StageTimeChart data={mockData} />);
    const bar = screen.getByTestId("bar");
    expect(bar.getAttribute("data-key")).toBe("days");
  });

  it("uses status as data key for x-axis", () => {
    render(<StageTimeChart data={mockData} />);
    const xAxis = screen.getByTestId("x-axis");
    expect(xAxis.getAttribute("data-key")).toBe("status");
  });

  it("disables decimals on y-axis", () => {
    render(<StageTimeChart data={mockData} />);
    const yAxis = screen.getByTestId("y-axis");
    expect(yAxis.getAttribute("data-decimals")).toBe("false");
  });

  it("has dashed grid lines", () => {
    render(<StageTimeChart data={mockData} />);
    const grid = screen.getByTestId("grid");
    expect(grid.getAttribute("data-dash")).toBe("3 3");
  });

  it("renders with correct CSS class", () => {
    const { container } = render(<StageTimeChart data={mockData} />);
    expect(container.querySelector(".chart-box")).toBeInTheDocument();
  });
});
