/**
 * NetworkLayout Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NetworkLayout from "../Network/NetworkLayout";

// Mock all child components
vi.mock("../../components/NetworkContacts", () => ({
  default: () => <div data-testid="network-contacts">Network Contacts</div>,
}));
vi.mock("../../components/ReferralRequests", () => ({
  default: () => <div data-testid="referral-requests">Referral Requests</div>,
}));
vi.mock("../../components/NetworkingEvents", () => ({
  default: () => <div data-testid="networking-events">Networking Events</div>,
}));
vi.mock("../../components/InformationalInterviews", () => ({
  default: () => (
    <div data-testid="informational-interviews">Informational Interviews</div>
  ),
}));
vi.mock("../../components/IndustryContactDiscovery", () => ({
  default: () => <div data-testid="industry-discovery">Industry Discovery</div>,
}));
vi.mock("../../components/RelationshipMaintenance", () => ({
  default: () => (
    <div data-testid="relationship-maintenance">Relationship Maintenance</div>
  ),
}));
vi.mock("../../components/ProfessionalReferences", () => ({
  default: () => (
    <div data-testid="professional-references">Professional References</div>
  ),
}));

describe("NetworkLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders page title", () => {
    render(<NetworkLayout />);
    expect(screen.getByText(/Network & Relationships/)).toBeInTheDocument();
  });

  it("renders page description", () => {
    render(<NetworkLayout />);
    expect(
      screen.getByText(/Manage your professional network/i)
    ).toBeInTheDocument();
  });

  it("renders all tab buttons", () => {
    render(<NetworkLayout />);
    expect(screen.getByText(/Professional Network/)).toBeInTheDocument();
    expect(screen.getByText(/Referrals/)).toBeInTheDocument();
    expect(screen.getByText(/Networking Events/)).toBeInTheDocument();
    expect(screen.getByText(/Industry Contacts/)).toBeInTheDocument();
    expect(screen.getByText(/Informational Interviews/)).toBeInTheDocument();
    expect(screen.getByText(/Relationship Maintenance/)).toBeInTheDocument();
    expect(screen.getByText(/References/)).toBeInTheDocument();
  });

  it("shows network contacts by default", () => {
    render(<NetworkLayout />);
    expect(screen.getByTestId("network-contacts")).toBeInTheDocument();
  });

  it("switches to referrals tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Referrals/));
    expect(screen.getByTestId("referral-requests")).toBeInTheDocument();
  });

  it("switches to events tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Networking Events/));
    expect(screen.getByTestId("networking-events")).toBeInTheDocument();
  });

  it("switches to discovery tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Industry Contacts/));
    expect(screen.getByTestId("industry-discovery")).toBeInTheDocument();
  });

  it("switches to interviews tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Informational Interviews/));
    expect(screen.getByTestId("informational-interviews")).toBeInTheDocument();
  });

  it("switches to maintenance tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Relationship Maintenance/));
    expect(screen.getByTestId("relationship-maintenance")).toBeInTheDocument();
  });

  it("switches to references tab", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/References/));
    expect(screen.getByTestId("professional-references")).toBeInTheDocument();
  });

  it("saves active tab to localStorage", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Referrals/));
    expect(localStorage.getItem("networkLayoutActiveTab")).toBe("referrals");
  });

  it("restores active tab from localStorage", () => {
    localStorage.setItem("networkLayoutActiveTab", "events");
    render(<NetworkLayout />);
    expect(screen.getByTestId("networking-events")).toBeInTheDocument();
  });

  it("applies active class to current tab", () => {
    render(<NetworkLayout />);
    const networkTab = screen
      .getByText(/Professional Network/)
      .closest("button");
    expect(networkTab).toHaveClass("active");
  });

  it("removes active class from non-current tabs", () => {
    render(<NetworkLayout />);
    fireEvent.click(screen.getByText(/Referrals/));
    const networkTab = screen
      .getByText(/Professional Network/)
      .closest("button");
    expect(networkTab).not.toHaveClass("active");
  });

  it("has correct CSS class", () => {
    render(<NetworkLayout />);
    expect(document.querySelector(".network-layout")).toBeInTheDocument();
  });
});
