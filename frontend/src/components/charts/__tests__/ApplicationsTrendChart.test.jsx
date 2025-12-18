/**
 * ApplicationsTrendChart Component Tests
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../__tests__/helpers/test-utils";
import ApplicationsTrendChart from "../ApplicationsTrendChart";

// Mock recharts
vi.mock("recharts", () => ({
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-items={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, name }) => (
    <div
      data-testid={`line-${dataKey}`}
      data-stroke={stroke}
      data-name={name}
    />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ allowDecimals }) => (
    <div data-testid="y-axis" data-decimals={allowDecimals} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: ({ strokeDasharray }) => (
    <div data-testid="grid" data-dash={strokeDasharray} />
  ),
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("ApplicationsTrendChart", () => {
  const mockData = [
    { week_start: "2024-01-01", applications: 10, interviews: 2, offers: 0 },
    { week_start: "2024-01-08", applications: 15, interviews: 3, offers: 1 },
    { week_start: "2024-01-15", applications: 12, interviews: 4, offers: 0 },
  ];

  it("renders without crashing", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    expect(
      screen.getByText("📈 Weekly Application / Interview / Offer Trend")
    ).toBeInTheDocument();
  });

  it("displays the title", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    expect(
      screen.getByText("📈 Weekly Application / Interview / Offer Trend")
    ).toBeInTheDocument();
  });

  it("renders with empty data array", () => {
    render(<ApplicationsTrendChart data={[]} />);
    expect(
      screen.getByText("📈 Weekly Application / Interview / Offer Trend")
    ).toBeInTheDocument();
  });

  it("formats week dates correctly", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    // Check that dates are formatted as "Mon DD" format
    expect(data[0].week).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it("converts string numbers to numbers", () => {
    const dataWithStrings = [
      {
        week_start: "2024-01-01",
        applications: "10",
        interviews: "2",
        offers: "1",
      },
    ];
    render(<ApplicationsTrendChart data={dataWithStrings} />);

    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(typeof data[0].applications).toBe("number");
    expect(typeof data[0].interviews).toBe("number");
    expect(typeof data[0].offers).toBe("number");
  });

  it("handles missing values with 0", () => {
    const incompleteData = [{ week_start: "2024-01-01" }];
    render(<ApplicationsTrendChart data={incompleteData} />);

    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-items"));

    expect(data[0].applications).toBe(0);
    expect(data[0].interviews).toBe(0);
    expect(data[0].offers).toBe(0);
  });

  it("renders three lines for applications, interviews, and offers", () => {
    render(<ApplicationsTrendChart data={mockData} />);

    expect(screen.getByTestId("line-applications")).toBeInTheDocument();
    expect(screen.getByTestId("line-interviews")).toBeInTheDocument();
    expect(screen.getByTestId("line-offers")).toBeInTheDocument();
  });

  it("uses correct colors for each line", () => {
    render(<ApplicationsTrendChart data={mockData} />);

    expect(
      screen.getByTestId("line-applications").getAttribute("data-stroke")
    ).toBe("#4f46e5");
    expect(
      screen.getByTestId("line-interviews").getAttribute("data-stroke")
    ).toBe("#10b981");
    expect(screen.getByTestId("line-offers").getAttribute("data-stroke")).toBe(
      "#f59e0b"
    );
  });

  it("uses correct names for each line", () => {
    render(<ApplicationsTrendChart data={mockData} />);

    expect(
      screen.getByTestId("line-applications").getAttribute("data-name")
    ).toBe("Applications");
    expect(
      screen.getByTestId("line-interviews").getAttribute("data-name")
    ).toBe("Interviews");
    expect(screen.getByTestId("line-offers").getAttribute("data-name")).toBe(
      "Offers"
    );
  });

  it("renders chart components", () => {
    render(<ApplicationsTrendChart data={mockData} />);

    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("uses week as x-axis data key", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    const xAxis = screen.getByTestId("x-axis");
    expect(xAxis.getAttribute("data-key")).toBe("week");
  });

  it("disables decimals on y-axis", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    const yAxis = screen.getByTestId("y-axis");
    expect(yAxis.getAttribute("data-decimals")).toBe("false");
  });

  it("has dashed grid lines", () => {
    render(<ApplicationsTrendChart data={mockData} />);
    const grid = screen.getByTestId("grid");
    expect(grid.getAttribute("data-dash")).toBe("3 3");
  });

  it("renders with correct CSS class", () => {
    const { container } = render(<ApplicationsTrendChart data={mockData} />);
    expect(container.querySelector(".chart-box")).toBeInTheDocument();
  });
});
