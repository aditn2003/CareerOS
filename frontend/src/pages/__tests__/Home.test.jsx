/**
 * Home Page Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import Home from "../Home";

describe("Home Page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders welcome heading", () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByText(/ATS for Candidates/i)).toBeInTheDocument();
  });

  it("renders description text", () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Manage job applications, resumes, and professional profiles/i)).toBeInTheDocument();
  });

  it("renders coming soon message", () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Exciting updates are coming soon!/i)).toBeInTheDocument();
  });

  it("shows login and register links when not authenticated", () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByRole("link", { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create an account/i })).toBeInTheDocument();
  });

  it("hides login and register links when authenticated", () => {
    // Set token to simulate authenticated state
    localStorage.setItem("token", "test-token");
    
    renderWithProviders(<Home />, { token: "test-token" });
    
    // Links should not be present
    expect(screen.queryByRole("link", { name: /Login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create an account/i })).not.toBeInTheDocument();
  });

  it("login link navigates to /login", () => {
    renderWithProviders(<Home />);
    
    const loginLink = screen.getByRole("link", { name: /Login/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("register link navigates to /register", () => {
    renderWithProviders(<Home />);
    
    const registerLink = screen.getByRole("link", { name: /Create an account/i });
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("renders with home-section class", () => {
    renderWithProviders(<Home />);
    
    const section = document.querySelector(".home-section");
    expect(section).toBeInTheDocument();
  });

  it("renders home-content container", () => {
    renderWithProviders(<Home />);
    
    const content = document.querySelector(".home-content");
    expect(content).toBeInTheDocument();
  });
});

