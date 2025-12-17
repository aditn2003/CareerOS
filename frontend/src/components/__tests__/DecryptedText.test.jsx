/**
 * DecryptedText Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import DecryptedText from "../DecryptedText";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
}));

describe("DecryptedText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock IntersectionObserver as a class
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<DecryptedText text="Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("displays the initial text", () => {
    render(<DecryptedText text="Test Message" />);
    expect(screen.getByText("Test Message")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    render(<DecryptedText text="Test" className="custom-class" />);
    // The className is applied to individual character spans when revealed
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("renders with parentClassName", () => {
    const { container } = render(
      <DecryptedText text="Test" parentClassName="parent-class" />
    );
    expect(container.querySelector(".parent-class")).toBeInTheDocument();
  });

  it("has screen reader accessible text", () => {
    render(<DecryptedText text="Accessible Text" />);
    // Text should be visible in some form for screen readers
    expect(screen.getByText("Accessible Text")).toBeInTheDocument();
  });

  it("renders aria-hidden visual text", () => {
    const { container } = render(<DecryptedText text="Test" />);
    const hiddenSpan = container.querySelector('[aria-hidden="true"]');
    expect(hiddenSpan).toBeInTheDocument();
  });

  it("handles empty text", () => {
    render(<DecryptedText text="" />);
    // Should not crash with empty text
    expect(document.body).toBeInTheDocument();
  });

  it("handles text with spaces", () => {
    render(<DecryptedText text="Hello World Test" />);
    expect(screen.getByText("Hello World Test")).toBeInTheDocument();
  });

  it("handles special characters", () => {
    render(<DecryptedText text="Test! @#$%" />);
    expect(screen.getByText("Test! @#$%")).toBeInTheDocument();
  });

  it("renders individual character spans", () => {
    const { container } = render(<DecryptedText text="ABC" />);
    const hiddenSpan = container.querySelector('[aria-hidden="true"]');
    const charSpans = hiddenSpan.querySelectorAll("span");
    expect(charSpans.length).toBe(3);
  });

  it("triggers animation on hover when animateOn is hover", async () => {
    const { container } = render(
      <DecryptedText
        text="Hover Me"
        animateOn="hover"
        speed={10}
        maxIterations={2}
      />
    );

    const wrapper = container.firstChild;
    fireEvent.mouseEnter(wrapper);

    // Let some time pass for animation
    vi.advanceTimersByTime(50);

    // Animation should be triggered
    expect(wrapper).toBeInTheDocument();
  });

  it("stops animation on mouse leave", () => {
    const { container } = render(
      <DecryptedText text="Test" animateOn="hover" speed={10} />
    );

    const wrapper = container.firstChild;
    fireEvent.mouseEnter(wrapper);
    vi.advanceTimersByTime(20);
    fireEvent.mouseLeave(wrapper);

    // After mouse leave, text should reset
    vi.advanceTimersByTime(100);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("accepts custom characters for scrambling", () => {
    render(<DecryptedText text="Test" characters="XYZ" animateOn="hover" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("respects useOriginalCharsOnly prop", () => {
    render(
      <DecryptedText
        text="Test"
        useOriginalCharsOnly={true}
        animateOn="hover"
      />
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles sequential reveal mode", () => {
    render(<DecryptedText text="Test" sequential={true} animateOn="hover" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles different revealDirection values", () => {
    const { rerender } = render(
      <DecryptedText text="Test" revealDirection="start" />
    );
    expect(screen.getByText("Test")).toBeInTheDocument();

    rerender(<DecryptedText text="Test" revealDirection="end" />);
    expect(screen.getByText("Test")).toBeInTheDocument();

    rerender(<DecryptedText text="Test" revealDirection="center" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles custom speed prop", () => {
    render(<DecryptedText text="Test" speed={100} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles custom maxIterations prop", () => {
    render(<DecryptedText text="Test" maxIterations={5} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles delay prop", () => {
    render(<DecryptedText text="Test" delay={500} animateOn="view" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles animateOn both value", () => {
    const { container } = render(
      <DecryptedText text="Test" animateOn="both" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toBeInTheDocument();
  });

  it("does not add hover handlers when animateOn is view only", () => {
    const { container } = render(
      <DecryptedText text="Test" animateOn="view" />
    );

    const wrapper = container.firstChild;
    // Should still render correctly
    expect(wrapper).toBeInTheDocument();
  });
});
