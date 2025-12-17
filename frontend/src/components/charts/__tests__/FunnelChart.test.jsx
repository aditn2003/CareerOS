/**
 * FunnelChart Component Tests
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../__tests__/helpers/test-utils";
import FunnelChart from "../FunnelChart";

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
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("FunnelChart", () => {
  it("renders without crashing", () => {
    render(<FunnelChart funnel={{}} />);
    expect(screen.getByText("📉 Funnel Conversion")).toBeInTheDocument();
  });

  it("displays the title", () => {
    render(<FunnelChart funnel={{}} />);
    expect(screen.getByText("📉 Funnel Conversion")).toBeInTheDocument();
  });

  it("renders with default empty funnel", () => {
    render(<FunnelChart />);
    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ stage: "Applied", count: 0 });
    expect(data[1]).toEqual({ stage: "Interview", count: 0 });
    expect(data[2]).toEqual({ stage: "Offer", count: 0 });
  });

  it("renders with provided funnel data", () => {
    const funnel = { applied: 100, interview: 25, offer: 5 };
    render(<FunnelChart funnel={funnel} />);

    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data[0]).toEqual({ stage: "Applied", count: 100 });
    expect(data[1]).toEqual({ stage: "Interview", count: 25 });
    expect(data[2]).toEqual({ stage: "Offer", count: 5 });
  });

  it("handles partial funnel data", () => {
    const funnel = { applied: 50 };
    render(<FunnelChart funnel={funnel} />);

    const chart = screen.getByTestId("bar-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data[0].count).toBe(50);
    expect(data[1].count).toBe(0);
    expect(data[2].count).toBe(0);
  });

  it("renders bar chart components", () => {
    render(<FunnelChart funnel={{}} />);

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("uses correct bar color", () => {
    render(<FunnelChart funnel={{}} />);
    const bar = screen.getByTestId("bar");
    expect(bar.getAttribute("data-fill")).toBe("#10b981");
  });

  it("uses count as data key for bar", () => {
    render(<FunnelChart funnel={{}} />);
    const bar = screen.getByTestId("bar");
    expect(bar.getAttribute("data-key")).toBe("count");
  });

  it("uses stage as data key for x-axis", () => {
    render(<FunnelChart funnel={{}} />);
    const xAxis = screen.getByTestId("x-axis");
    expect(xAxis.getAttribute("data-key")).toBe("stage");
  });

  it("disables decimals on y-axis", () => {
    render(<FunnelChart funnel={{}} />);
    const yAxis = screen.getByTestId("y-axis");
    expect(yAxis.getAttribute("data-decimals")).toBe("false");
  });

  it("renders with correct CSS class", () => {
    const { container } = render(<FunnelChart funnel={{}} />);
    expect(container.querySelector(".chart-box")).toBeInTheDocument();
  });
});
