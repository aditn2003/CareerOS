/**
 * MentorLayout Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import MentorLayout from "../Mentor/MentorLayout";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ authed: false, user: null })),
}));

// Mock TeamContext
vi.mock("../../contexts/TeamContext", () => ({
  useTeam: vi.fn(() => ({
    teamState: {
      status: "idle",
      isMentor: false,
      isAdmin: false,
      isCandidate: false,
      hasTeam: false,
      primaryTeam: null,
    },
  })),
}));

// Mock child components
vi.mock("../../components/MentorNavBar", () => ({
  default: () => <nav data-testid="mentor-nav">Mentor Navigation</nav>,
}));
vi.mock("../Mentor/FeedbackTab", () => ({
  default: () => <div data-testid="feedback-tab">Feedback Tab</div>,
}));
vi.mock("../Mentor/TaskManagementTab", () => ({
  default: () => <div data-testid="tasks-tab">Tasks Tab</div>,
}));
vi.mock("../Mentor/ActivityFeedTab", () => ({
  default: () => <div data-testid="activity-tab">Activity Tab</div>,
}));
vi.mock("../Mentor/SharedJobsTab", () => ({
  default: () => <div data-testid="shared-jobs-tab">Shared Jobs Tab</div>,
}));
vi.mock("../Mentor/TeamAnalyticsTab", () => ({
  default: () => <div data-testid="analytics-tab">Analytics Tab</div>,
}));
vi.mock("../Mentor/InviteHandler", () => ({
  default: () => <div data-testid="invite-handler">Invite Handler</div>,
}));

import { useAuth } from "../../contexts/AuthContext";
import { useTeam } from "../../contexts/TeamContext";

const renderMentorLayout = (route = "/mentor") => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/mentor/*" element={<MentorLayout />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("MentorLayout Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows login message when not authenticated", () => {
    useAuth.mockReturnValue({ authed: false, user: null });
    renderMentorLayout();

    expect(
      screen.getByText("You must log in to view your mentor space.")
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: { status: "loading" },
    });

    renderMentorLayout();

    expect(
      screen.getByText("Loading your mentoring details...")
    ).toBeInTheDocument();
  });

  it("shows InviteHandler when invite status is invited", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        primaryTeam: { status: "invited" },
        isMentor: false,
        isAdmin: false,
        isCandidate: false,
        hasTeam: false,
      },
    });

    renderMentorLayout();

    expect(screen.getByTestId("invite-handler")).toBeInTheDocument();
  });

  it("shows InviteHandler when invite status is requested", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        primaryTeam: { status: "requested" },
        isMentor: false,
        isAdmin: false,
        isCandidate: false,
        hasTeam: false,
      },
    });

    renderMentorLayout();

    expect(screen.getByTestId("invite-handler")).toBeInTheDocument();
  });

  it("shows no tools message when user has no team access", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: false,
        isAdmin: false,
        isCandidate: false,
        hasTeam: false,
        primaryTeam: null,
      },
    });

    renderMentorLayout();

    expect(
      screen.getByText("No mentor tools available for this account.")
    ).toBeInTheDocument();
  });

  it("renders page header when user has team", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        isAdmin: false,
        isCandidate: false,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout();

    expect(screen.getByText("Mentor Command Center")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your complete toolkit for team management and mentorship"
      )
    ).toBeInTheDocument();
  });

  it("renders MentorNavBar when user has team", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        isAdmin: false,
        isCandidate: false,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout();

    expect(screen.getByTestId("mentor-nav")).toBeInTheDocument();
  });

  it("renders FeedbackTab on /mentor/feedback route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout("/mentor/feedback");

    expect(screen.getByTestId("feedback-tab")).toBeInTheDocument();
  });

  it("renders TaskManagementTab on /mentor/tasks route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout("/mentor/tasks");

    expect(screen.getByTestId("tasks-tab")).toBeInTheDocument();
  });

  it("renders SharedJobsTab on /mentor/shared-jobs route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout("/mentor/shared-jobs");

    expect(screen.getByTestId("shared-jobs-tab")).toBeInTheDocument();
  });

  it("renders TeamAnalyticsTab on /mentor/analytics route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout("/mentor/analytics");

    expect(screen.getByTestId("analytics-tab")).toBeInTheDocument();
  });

  it("renders ActivityFeedTab on /mentor/activity route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    useTeam.mockReturnValue({
      teamState: {
        status: "idle",
        isMentor: true,
        hasTeam: true,
        primaryTeam: { status: "active" },
      },
    });

    renderMentorLayout("/mentor/activity");

    expect(screen.getByTestId("activity-tab")).toBeInTheDocument();
  });
});
