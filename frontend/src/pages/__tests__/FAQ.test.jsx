/**
 * FAQ Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import FAQ from "../Help/FAQ";

describe("FAQ Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders FAQ heading", () => {
    renderWithProviders(<FAQ />);
    expect(
      screen.getByRole("heading", { name: /Frequently Asked Questions/i })
    ).toBeInTheDocument();
  });

  it("renders intro paragraph", () => {
    renderWithProviders(<FAQ />);
    expect(
      screen.getByText(/Find answers to common questions about CareerOS/i)
    ).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    renderWithProviders(<FAQ />);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Help/i })).toBeInTheDocument();
  });

  it("renders all FAQ categories", () => {
    renderWithProviders(<FAQ />);
    expect(screen.getByText("Account & Login")).toBeInTheDocument();
    expect(screen.getByText("Job Tracking")).toBeInTheDocument();
    expect(screen.getByText("Resume Features")).toBeInTheDocument();
    expect(screen.getByText("Cover Letters")).toBeInTheDocument();
    expect(screen.getByText("Privacy & Security")).toBeInTheDocument();
    expect(screen.getByText("Technical Issues")).toBeInTheDocument();
    expect(screen.getByText("Billing & Pricing")).toBeInTheDocument();
  });

  it("renders FAQ questions as buttons", () => {
    renderWithProviders(<FAQ />);
    expect(
      screen.getByRole("button", { name: /How do I create an account\?/i })
    ).toBeInTheDocument();
  });

  it("expands FAQ item when clicked", () => {
    renderWithProviders(<FAQ />);
    const question = screen.getByRole("button", {
      name: /How do I create an account\?/i,
    });

    fireEvent.click(question);

    expect(
      screen.getByText(/Click 'Sign Up' on the homepage/i)
    ).toBeInTheDocument();
  });

  it("collapses FAQ item when clicked again", () => {
    renderWithProviders(<FAQ />);
    const question = screen.getByRole("button", {
      name: /How do I create an account\?/i,
    });

    // Open
    fireEvent.click(question);
    expect(
      screen.getByText(/Click 'Sign Up' on the homepage/i)
    ).toBeInTheDocument();

    // Close
    fireEvent.click(question);
    expect(
      screen.queryByText(/Click 'Sign Up' on the homepage/i)
    ).not.toBeInTheDocument();
  });

  it("shows aria-expanded attribute on FAQ buttons", () => {
    renderWithProviders(<FAQ />);
    const question = screen.getByRole("button", {
      name: /How do I create an account\?/i,
    });

    expect(question).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
  });

  it("renders team section", () => {
    renderWithProviders(<FAQ />);
    expect(screen.getByText("About the Team")).toBeInTheDocument();
    expect(
      screen.getByText(/CareerOS was built by the Aandsz Forces team/i)
    ).toBeInTheDocument();
  });

  it("renders team members", () => {
    renderWithProviders(<FAQ />);
    expect(screen.getByText(/Digant/)).toBeInTheDocument();
    // Note: "Adit" matches both "Adit" and "Aditya"
    expect(screen.getAllByText(/Adit/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sujal/)).toBeInTheDocument();
    expect(screen.getByText(/Abhi/)).toBeInTheDocument();
    expect(screen.getByText(/Zaid/)).toBeInTheDocument();
  });

  it("renders contact email", () => {
    renderWithProviders(<FAQ />);
    const contactLink = screen.getByRole("link", {
      name: /support@atscareeros.com/i,
    });
    expect(contactLink).toHaveAttribute(
      "href",
      "mailto:support@atscareeros.com"
    );
  });

  it("renders last updated date", () => {
    renderWithProviders(<FAQ />);
    expect(
      screen.getByText(/Last Updated: December 2025/i)
    ).toBeInTheDocument();
  });

  it("renders CareerOS free pricing question", () => {
    renderWithProviders(<FAQ />);
    const pricingQuestion = screen.getByRole("button", {
      name: /Is CareerOS free\?/i,
    });
    fireEvent.click(pricingQuestion);
    expect(
      screen.getByText(/CareerOS is currently free for all users/i)
    ).toBeInTheDocument();
  });
});
