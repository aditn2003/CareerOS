/**
 * TermsOfService Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import TermsOfService from "../Help/TermsOfService";

describe("TermsOfService Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main heading", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByRole("heading", { name: /^Terms of Service$/i })
    ).toBeInTheDocument();
  });

  it("renders effective date", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByText(/Effective Date: December 15, 2025/i)
    ).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Help/i })).toBeInTheDocument();
  });

  it("renders all main sections", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByText("1. Introduction")).toBeInTheDocument();
    expect(screen.getByText("2. Eligibility")).toBeInTheDocument();
    expect(screen.getByText("3. Account Registration")).toBeInTheDocument();
    expect(screen.getByText("4. Acceptable Use")).toBeInTheDocument();
    expect(screen.getByText("5. User Content")).toBeInTheDocument();
    expect(screen.getByText("6. AI-Generated Content")).toBeInTheDocument();
    expect(screen.getByText("7. Privacy")).toBeInTheDocument();
    expect(screen.getByText("8. Disclaimers")).toBeInTheDocument();
    expect(screen.getByText("9. Limitation of Liability")).toBeInTheDocument();
    expect(screen.getByText("10. Changes to Terms")).toBeInTheDocument();
    expect(screen.getByText("11. Contact Information")).toBeInTheDocument();
  });

  it("renders eligibility requirements", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByText(
        /Be at least 18 years old or have parental\/guardian consent/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Provide accurate registration information/i)
    ).toBeInTheDocument();
  });

  it("renders account creation methods", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByText(/Email address and password/i)).toBeInTheDocument();
    expect(screen.getByText(/Google OAuth sign-in/i)).toBeInTheDocument();
  });

  it("renders permitted uses", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByText(/Track job applications/i)).toBeInTheDocument();
    expect(screen.getByText(/Store and manage resumes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Generate AI-assisted cover letters/i)
    ).toBeInTheDocument();
  });

  it("renders prohibited uses", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByText(/Use the Service for illegal purposes/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upload malicious code or viruses/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Attempt to gain unauthorized access to our systems/i)
    ).toBeInTheDocument();
  });

  it("renders user content ownership notice", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByText(/You retain ownership of all content you upload/i)
    ).toBeInTheDocument();
  });

  it("renders AI content limitations", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByText(/AI-generated content may not always be accurate/i)
    ).toBeInTheDocument();
  });

  it("renders disclaimer notice", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByText(/provided "AS IS"/i)).toBeInTheDocument();
  });

  it("renders privacy policy link", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getByRole("link", { name: /Privacy Policy/i })
    ).toHaveAttribute("href", "/privacy");
  });

  it("renders academic project notice", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getByText(/Academic Project Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/CS490 course/i)).toBeInTheDocument();
  });

  it("renders contact information", () => {
    renderWithProviders(<TermsOfService />);
    expect(screen.getAllByText(/Aandsz Forces Team/i).length).toBeGreaterThan(
      0
    );
    expect(
      screen.getAllByText(/support@atscareeros.com/i).length
    ).toBeGreaterThan(0);
  });

  it("renders last updated date", () => {
    renderWithProviders(<TermsOfService />);
    expect(
      screen.getAllByText(/Last Updated: December 15, 2025/i).length
    ).toBeGreaterThan(0);
  });
});
