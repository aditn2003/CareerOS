/**
 * Spinner Component Tests - Target: 100% Coverage
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Spinner from "../Spinner";

describe("Spinner", () => {
  it("renders spinner container", () => {
    render(<Spinner />);
    expect(document.querySelector(".spinner")).toBeInTheDocument();
  });

  it("renders loading image", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
  });

  it("has correct src attribute", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/logo.png");
  });

  it("has correct alt text", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Loading...");
  });

  it("has correct dimensions", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "60");
    expect(img).toHaveAttribute("height", "60");
  });

  it("has flex centering styles", () => {
    render(<Spinner />);
    const container = document.querySelector(".spinner");
    expect(container).toHaveStyle({ display: "flex" });
    expect(container).toHaveStyle({ justifyContent: "center" });
    expect(container).toHaveStyle({ alignItems: "center" });
  });

  it("has minimum height", () => {
    render(<Spinner />);
    const container = document.querySelector(".spinner");
    expect(container).toHaveStyle({ minHeight: "100px" });
  });

  it("image has animation style", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toHaveStyle({ animation: "spin 1.2s linear infinite" });
  });

  it("image has border radius style", () => {
    render(<Spinner />);
    const img = screen.getByRole("img");
    expect(img).toHaveStyle({ borderRadius: "8px" });
  });
});
