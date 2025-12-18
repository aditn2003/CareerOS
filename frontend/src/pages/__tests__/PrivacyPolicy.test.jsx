/**
 * PrivacyPolicy Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import PrivacyPolicy from "../Help/PrivacyPolicy";

describe("PrivacyPolicy Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main heading", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByRole("heading", { name: /^Privacy Policy$/i })
    ).toBeInTheDocument();
  });

  it("renders effective date", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByText(/Effective Date: December 15, 2025/i)
    ).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Help/i })).toBeInTheDocument();
  });

  it("renders all 12 sections", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(screen.getByText("1. Introduction")).toBeInTheDocument();
    expect(screen.getByText("2. Information We Collect")).toBeInTheDocument();
    expect(
      screen.getByText("3. How We Use Your Information")
    ).toBeInTheDocument();
    expect(screen.getByText("4. Data Sharing")).toBeInTheDocument();
    expect(screen.getByText("5. Data Security")).toBeInTheDocument();
    expect(screen.getByText("6. Data Retention")).toBeInTheDocument();
    expect(screen.getByText("7. Your Rights")).toBeInTheDocument();
    expect(screen.getByText("8. Cookies and Tracking")).toBeInTheDocument();
    expect(screen.getByText("9. Children's Privacy")).toBeInTheDocument();
    expect(
      screen.getByText("10. International Data Transfers")
    ).toBeInTheDocument();
    expect(screen.getByText("11. Changes to This Policy")).toBeInTheDocument();
    expect(screen.getByText("12. Contact Us")).toBeInTheDocument();
  });

  it("renders data not sold notice", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByText(/We do NOT sell your personal data/i)
    ).toBeInTheDocument();
  });

  it("renders security measures", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByText(/HTTPS\/TLS for all data in transit/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Passwords are hashed using bcrypt/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/JWT tokens with expiration/i)).toBeInTheDocument();
  });

  it("renders user rights", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByText(/Request a copy of your personal data/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Update or correct inaccurate data/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Request deletion of your account/i)
    ).toBeInTheDocument();
  });

  it("renders contact information", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(screen.getAllByText(/Aandsz Forces Team/i).length).toBeGreaterThan(
      0
    );
    expect(
      screen.getAllByText(/support@atscareeros.com/i).length
    ).toBeGreaterThan(0);
  });

  it("renders academic project notice", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(screen.getByText(/Academic Project Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/CS490 academic course/i)).toBeInTheDocument();
  });

  it("renders last updated date", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getAllByText(/Last Updated: December 15, 2025/i).length
    ).toBeGreaterThan(0);
  });

  it("renders data collection categories", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(screen.getByText("2.1 Information You Provide")).toBeInTheDocument();
    expect(
      screen.getByText("2.2 Information Collected Automatically")
    ).toBeInTheDocument();
    expect(
      screen.getByText("2.3 Third-Party Authentication")
    ).toBeInTheDocument();
  });

  it("renders children's privacy notice", () => {
    renderWithProviders(<PrivacyPolicy />);
    expect(
      screen.getByText(/CareerOS is not intended for users under 18/i)
    ).toBeInTheDocument();
  });
});
