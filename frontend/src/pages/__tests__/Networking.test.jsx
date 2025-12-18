/**
 * Networking Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { useState } from "react";

// Mock MUI components
vi.mock("@mui/material", () => ({
  Tabs: ({ children, value, onChange }) => (
    <div role="tablist" data-testid="tabs">
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, {
          onClick: () => onChange(null, index),
          "aria-selected": value === index ? "true" : "false",
        })
      )}
    </div>
  ),
  Tab: ({ label, onClick, ...props }) => (
    <button role="tab" onClick={onClick} {...props}>
      {label}
    </button>
  ),
  Box: ({ children, ...props }) => <div {...props}>{children}</div>,
  Paper: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// Mock all child tab components
vi.mock("../Networking/ContactsTab", () => ({
  default: () => <div data-testid="contacts-tab">Contacts Tab</div>,
}));
vi.mock("../Networking/ReferralsTab", () => ({
  default: () => <div data-testid="referrals-tab">Referrals Tab</div>,
}));
vi.mock("../Networking/EventsTab", () => ({
  default: () => <div data-testid="events-tab">Events Tab</div>,
}));
vi.mock("../Networking/InformationalInterviewsTab", () => ({
  default: () => (
    <div data-testid="info-interviews-tab">Info Interviews Tab</div>
  ),
}));
vi.mock("../Networking/DiscoveryTab", () => ({
  default: () => <div data-testid="discovery-tab">Discovery Tab</div>,
}));
vi.mock("../Networking/MaintenanceTab", () => ({
  default: () => <div data-testid="maintenance-tab">Maintenance Tab</div>,
}));
vi.mock("../Networking/ReferencesTab", () => ({
  default: () => <div data-testid="references-tab">References Tab</div>,
}));

import Networking from "../Networking/Networking";

describe("Networking Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title", () => {
    render(<Networking />);
    expect(screen.getByText("Professional Networking")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<Networking />);
    expect(
      screen.getByText(/Manage your professional network/i)
    ).toBeInTheDocument();
  });

  it("renders all tab labels", () => {
    render(<Networking />);
    expect(screen.getByRole("tab", { name: /Contacts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Referrals/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Events/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Info Interviews/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Discovery/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Maintenance/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /References/i })
    ).toBeInTheDocument();
  });

  it("shows Contacts tab by default", () => {
    render(<Networking />);
    expect(screen.getByTestId("contacts-tab")).toBeInTheDocument();
  });

  it("switches to Referrals tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /Referrals/i }));
    expect(screen.getByTestId("referrals-tab")).toBeInTheDocument();
  });

  it("switches to Events tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /Events/i }));
    expect(screen.getByTestId("events-tab")).toBeInTheDocument();
  });

  it("switches to Info Interviews tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /Info Interviews/i }));
    expect(screen.getByTestId("info-interviews-tab")).toBeInTheDocument();
  });

  it("switches to Discovery tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /Discovery/i }));
    expect(screen.getByTestId("discovery-tab")).toBeInTheDocument();
  });

  it("switches to Maintenance tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /Maintenance/i }));
    expect(screen.getByTestId("maintenance-tab")).toBeInTheDocument();
  });

  it("switches to References tab when clicked", () => {
    render(<Networking />);
    fireEvent.click(screen.getByRole("tab", { name: /References/i }));
    expect(screen.getByTestId("references-tab")).toBeInTheDocument();
  });

  it("has Contacts tab selected by default", () => {
    render(<Networking />);
    const contactsTab = screen.getByRole("tab", { name: /Contacts/i });
    expect(contactsTab).toHaveAttribute("aria-selected", "true");
  });
});
