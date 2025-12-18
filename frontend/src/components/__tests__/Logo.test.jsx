/**
 * Logo Component Tests
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../../__tests__/helpers/test-utils";
import Logo from "../Logo";

describe("Logo", () => {
  it("renders without crashing", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toBeInTheDocument();
  });

  it("renders with default size of 100", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveAttribute("width", "100");
    expect(img).toHaveAttribute("height", "100");
  });

  it("renders with custom size", () => {
    render(<Logo size={50} />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveAttribute("width", "50");
    expect(img).toHaveAttribute("height", "50");
  });

  it("uses correct image source", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveAttribute("src", "/logo.png");
  });

  it("has correct alt text", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toBeInTheDocument();
  });

  it("applies border radius style", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveStyle({ borderRadius: "8px" });
  });

  it("applies object-fit contain style", () => {
    render(<Logo />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveStyle({ objectFit: "contain" });
  });

  it("is wrapped in a centered container", () => {
    const { container } = render(<Logo />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle({
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
  });

  it("renders with size 0", () => {
    render(<Logo size={0} />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveAttribute("width", "0");
    expect(img).toHaveAttribute("height", "0");
  });

  it("renders with large size", () => {
    render(<Logo size={500} />);
    const img = screen.getByAltText("ATS Logo");
    expect(img).toHaveAttribute("width", "500");
    expect(img).toHaveAttribute("height", "500");
  });
});
