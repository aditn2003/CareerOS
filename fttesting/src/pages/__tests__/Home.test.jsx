/**
 * Home Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ authed: false });
  });

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  };

  it("renders welcome title", () => {
    renderHome();
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.getByText("ATS for Candidates")).toBeInTheDocument();
  });

  it("renders description", () => {
    renderHome();
    expect(
      screen.getByText(/Manage job applications, resumes, and professional profiles/i)
    ).toBeInTheDocument();
  });

  it("renders coming soon message", () => {
    renderHome();
    expect(screen.getByText(/Exciting updates are coming soon/i)).toBeInTheDocument();
  });

  it("renders rocket emoji", () => {
    renderHome();
    expect(screen.getByText(/🚀/)).toBeInTheDocument();
  });

  it("renders login link when not authenticated", () => {
    mockUseAuth.mockReturnValue({ authed: false });
    renderHome();
    expect(screen.getByRole("link", { name: /Login/i })).toBeInTheDocument();
  });

  it("renders register link when not authenticated", () => {
    mockUseAuth.mockReturnValue({ authed: false });
    renderHome();
    expect(screen.getByRole("link", { name: /Create an account/i })).toBeInTheDocument();
  });

  it("login link points to /login", () => {
    mockUseAuth.mockReturnValue({ authed: false });
    renderHome();
    expect(screen.getByRole("link", { name: /Login/i })).toHaveAttribute("href", "/login");
  });

  it("register link points to /register", () => {
    mockUseAuth.mockReturnValue({ authed: false });
    renderHome();
    expect(screen.getByRole("link", { name: /Create an account/i })).toHaveAttribute("href", "/register");
  });

  it("hides login/register links when authenticated", () => {
    mockUseAuth.mockReturnValue({ authed: true });
    renderHome();
    expect(screen.queryByRole("link", { name: /Login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create an account/i })).not.toBeInTheDocument();
  });

  it("renders home section container", () => {
    renderHome();
    expect(document.querySelector(".home-section")).toBeInTheDocument();
  });

  it("renders home content container", () => {
    renderHome();
    expect(document.querySelector(".home-content")).toBeInTheDocument();
  });

  it("renders coming soon paragraph with class", () => {
    renderHome();
    expect(document.querySelector(".coming-soon")).toBeInTheDocument();
  });
});
