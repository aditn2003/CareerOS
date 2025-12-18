/**
 * GettingStarted Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import GettingStarted from "../Help/GettingStarted";

describe("GettingStarted Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main heading", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByRole("heading", { name: /Getting Started with CareerOS/i })
    ).toBeInTheDocument();
  });

  it("renders welcome intro", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByText(/your personal job search companion/i)
    ).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Help/i })).toBeInTheDocument();
  });

  it("renders Quick Start section", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByText(/Quick Start/i)).toBeInTheDocument();
  });

  it("renders all 4 setup steps", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByText(/Create Your Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Your First Job/i)).toBeInTheDocument();
  });

  it("renders Core Features section", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByRole("heading", { name: /Core Features/i })
    ).toBeInTheDocument();
  });

  it("renders all core features", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByText(/Job Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Resume Tailoring/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Cover Letters/i)).toBeInTheDocument();
    expect(screen.getByText(/Interview Preparation/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Networking Contacts/i)).toBeInTheDocument();
  });

  it("renders job status descriptions", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getAllByText(/Wishlist/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Applied/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Interview/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Offer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rejected/).length).toBeGreaterThan(0);
  });

  it("renders Tips for Success section", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByRole("heading", { name: /Tips for Success/i })
    ).toBeInTheDocument();
  });

  it("renders all tips", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByText(/Be Consistent/i)).toBeInTheDocument();
    expect(screen.getByText(/Use AI Wisely/i)).toBeInTheDocument();
    expect(screen.getByText(/Track Everything/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Network/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prepare/i).length).toBeGreaterThan(0);
  });

  it("renders Need More Help section", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByRole("heading", { name: /Need More Help\?/i })
    ).toBeInTheDocument();
  });

  it("renders FAQ link", () => {
    renderWithProviders(<GettingStarted />);
    expect(screen.getByRole("link", { name: /FAQ/i })).toHaveAttribute(
      "href",
      "/faq"
    );
  });

  it("renders email support link", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByRole("link", { name: /support@atscareeros.com/i })
    ).toHaveAttribute("href", "mailto:support@atscareeros.com");
  });

  it("renders good luck message", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByText(/Good luck with your job search/i)
    ).toBeInTheDocument();
  });

  it("renders congratulations message in step 4", () => {
    renderWithProviders(<GettingStarted />);
    expect(
      screen.getByText(/Congratulations! You've set up your CareerOS account!/i)
    ).toBeInTheDocument();
  });
});
