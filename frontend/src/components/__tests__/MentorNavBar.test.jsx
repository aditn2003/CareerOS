/**
 * MentorNavBar Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MentorNavBar from "../MentorNavBar";

// Mock TeamContext
vi.mock("../../contexts/TeamContext", () => ({
  useTeam: vi.fn(() => null),
}));

import { useTeam } from "../../contexts/TeamContext";

const renderNavBar = () => {
  return render(
    <MemoryRouter>
      <MentorNavBar />
    </MemoryRouter>
  );
};

describe("MentorNavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeam.mockReturnValue({ teamState: { isMentor: false, isAdmin: false } });
  });

  it("renders nav groups", () => {
    renderNavBar();
    expect(screen.getByText("COMMUNICATION")).toBeInTheDocument();
    expect(screen.getByText("MANAGEMENT")).toBeInTheDocument();
    expect(screen.getByText("ANALYTICS")).toBeInTheDocument();
  });

  it("renders Feedback tab", () => {
    renderNavBar();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Feedback/i })).toHaveAttribute(
      "href",
      "/mentor/feedback"
    );
  });

  it("renders Tasks tab", () => {
    renderNavBar();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tasks/i })).toHaveAttribute(
      "href",
      "/mentor/tasks"
    );
  });

  it("renders Jobs tab", () => {
    renderNavBar();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Jobs/i })).toHaveAttribute(
      "href",
      "/mentor/shared-jobs"
    );
  });

  it("renders Analytics tab", () => {
    renderNavBar();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Analytics/i })).toHaveAttribute(
      "href",
      "/mentor/analytics"
    );
  });

  it("does not show Activity tab for non-mentor/non-admin", () => {
    useTeam.mockReturnValue({ teamState: { isMentor: false, isAdmin: false } });
    renderNavBar();
    expect(screen.queryByText("Activity")).not.toBeInTheDocument();
  });

  it("shows Activity tab for mentor", () => {
    useTeam.mockReturnValue({ teamState: { isMentor: true, isAdmin: false } });
    renderNavBar();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Activity/i })).toHaveAttribute(
      "href",
      "/mentor/activity"
    );
  });

  it("shows Activity tab for admin", () => {
    useTeam.mockReturnValue({ teamState: { isMentor: false, isAdmin: true } });
    renderNavBar();
    expect(screen.getByText("Activity")).toBeInTheDocument();
  });

  it("handles null teamState gracefully", () => {
    useTeam.mockReturnValue(null);
    renderNavBar();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.queryByText("Activity")).not.toBeInTheDocument();
  });

  it("handles undefined useTeam return", () => {
    useTeam.mockReturnValue(undefined);
    renderNavBar();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
  });
});
