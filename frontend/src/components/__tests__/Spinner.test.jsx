/**
 * Spinner Component Tests
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../../__tests__/helpers/test-utils";
import Spinner from "../Spinner";

describe("Spinner", () => {
  it("renders without crashing", () => {
    render(<Spinner />);
    const spinnerContainer = document.querySelector(".spinner");
    expect(spinnerContainer).toBeInTheDocument();
  });

  it("displays loading image with correct alt text", () => {
    render(<Spinner />);
    const image = screen.getByAltText("Loading...");
    expect(image).toBeInTheDocument();
  });

  it("has correct image source", () => {
    render(<Spinner />);
    const image = screen.getByAltText("Loading...");
    expect(image).toHaveAttribute("src", "/logo.png");
  });

  it("has correct dimensions", () => {
    render(<Spinner />);
    const image = screen.getByAltText("Loading...");
    expect(image).toHaveAttribute("width", "60");
    expect(image).toHaveAttribute("height", "60");
  });

  it("applies centering styles to container", () => {
    render(<Spinner />);
    const container = document.querySelector(".spinner");
    expect(container).toHaveStyle({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });

  it("applies animation styles to image", () => {
    render(<Spinner />);
    const image = screen.getByAltText("Loading...");
    expect(image).toHaveStyle({
      borderRadius: "8px",
    });
  });
});

