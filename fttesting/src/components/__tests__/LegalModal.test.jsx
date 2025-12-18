/**
 * LegalModal Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LegalModal, { TermsContent, PrivacyContent } from "../LegalModal";

// Mock FaTimes icon
vi.mock("react-icons/fa", () => ({
  FaTimes: () => <span data-testid="close-icon">X</span>,
}));

describe("TermsContent", () => {
  it("renders Terms of Service heading", () => {
    render(<TermsContent />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("renders effective date", () => {
    render(<TermsContent />);
    expect(screen.getByText(/Effective Date:/i)).toBeInTheDocument();
  });

  it("renders Introduction section", () => {
    render(<TermsContent />);
    expect(screen.getByText("1. Introduction")).toBeInTheDocument();
  });

  it("renders Eligibility section", () => {
    render(<TermsContent />);
    expect(screen.getByText("2. Eligibility")).toBeInTheDocument();
  });

  it("renders Account Responsibility section", () => {
    render(<TermsContent />);
    expect(screen.getByText("3. Account Responsibility")).toBeInTheDocument();
  });

  it("renders Acceptable Use section", () => {
    render(<TermsContent />);
    expect(screen.getByText("4. Acceptable Use")).toBeInTheDocument();
  });

  it("renders User Content section", () => {
    render(<TermsContent />);
    expect(screen.getByText("5. User Content")).toBeInTheDocument();
  });

  it("renders AI-Generated Content section", () => {
    render(<TermsContent />);
    expect(screen.getByText("6. AI-Generated Content")).toBeInTheDocument();
  });

  it("renders Contact section", () => {
    render(<TermsContent />);
    expect(screen.getByText("10. Contact")).toBeInTheDocument();
  });

  it("renders last updated text", () => {
    render(<TermsContent />);
    expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
  });
});

describe("PrivacyContent", () => {
  it("renders Privacy Policy heading", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("renders effective date", () => {
    render(<PrivacyContent />);
    expect(screen.getByText(/Effective Date:/i)).toBeInTheDocument();
  });

  it("renders Information We Collect section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
  });

  it("renders How We Use Your Information section", () => {
    render(<PrivacyContent />);
    expect(
      screen.getByText("2. How We Use Your Information")
    ).toBeInTheDocument();
  });

  it("renders Data Sharing section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("3. Data Sharing")).toBeInTheDocument();
  });

  it("renders Data Security section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("4. Data Security")).toBeInTheDocument();
  });

  it("renders Data Retention section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("5. Data Retention")).toBeInTheDocument();
  });

  it("renders Your Rights section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("6. Your Rights")).toBeInTheDocument();
  });

  it("renders Children's Privacy section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("7. Children's Privacy")).toBeInTheDocument();
  });

  it("renders Contact section", () => {
    render(<PrivacyContent />);
    expect(screen.getByText("8. Contact")).toBeInTheDocument();
  });

  it("mentions data not being sold", () => {
    render(<PrivacyContent />);
    expect(
      screen.getByText(/do NOT sell your personal data/i)
    ).toBeInTheDocument();
  });
});

describe("LegalModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not open", () => {
    const { container } = render(
      <LegalModal isOpen={false} onClose={mockOnClose} type="terms" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when open", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("renders terms content when type is terms", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("1. Introduction")).toBeInTheDocument();
  });

  it("renders privacy content when type is privacy", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="privacy" />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when overlay clicked", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    fireEvent.click(document.querySelector(".legal-modal-overlay"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not close when modal content clicked", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    fireEvent.click(document.querySelector(".legal-modal"));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("renders close icon", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(screen.getByTestId("close-icon")).toBeInTheDocument();
  });

  it("has modal overlay class", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(document.querySelector(".legal-modal-overlay")).toBeInTheDocument();
  });

  it("has modal content class", () => {
    render(<LegalModal isOpen={true} onClose={mockOnClose} type="terms" />);
    expect(document.querySelector(".legal-modal-content")).toBeInTheDocument();
  });
});
