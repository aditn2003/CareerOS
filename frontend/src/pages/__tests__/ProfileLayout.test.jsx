/**
 * ProfileLayout Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProfileLayout from "../Profile/ProfileLayout";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ authed: false, user: null })),
}));

// Mock all child tab components
vi.mock("../Profile/InfoTab", () => ({
  default: () => <div data-testid="info-tab">Info Tab</div>,
}));
vi.mock("../Profile/EmploymentTab", () => ({
  default: () => <div data-testid="employment-tab">Employment Tab</div>,
}));
vi.mock("../Profile/SkillsTab", () => ({
  default: () => <div data-testid="skills-tab">Skills Tab</div>,
}));
vi.mock("../Profile/EducationTab", () => ({
  default: () => <div data-testid="education-tab">Education Tab</div>,
}));
vi.mock("../Profile/CertificationsTab", () => ({
  default: () => <div data-testid="certifications-tab">Certifications Tab</div>,
}));
vi.mock("../Profile/ProjectsTab", () => ({
  default: () => <div data-testid="projects-tab">Projects Tab</div>,
}));
vi.mock("../Profile/GitHubTab", () => ({
  default: () => <div data-testid="github-tab">GitHub Tab</div>,
}));
vi.mock("../Profile/JobsTab", () => ({
  default: () => <div data-testid="jobs-tab">Jobs Tab</div>,
}));
vi.mock("../Profile/DashboardTab", () => ({
  default: () => <div data-testid="dashboard-tab">Dashboard Tab</div>,
}));
vi.mock("../Profile/DangerTab", () => ({
  default: () => <div data-testid="danger-tab">Danger Tab</div>,
}));
vi.mock("../Profile/MentorTab", () => ({
  default: () => <div data-testid="mentor-tab">Mentor Tab</div>,
}));
vi.mock("../Profile/TeamManagement", () => ({
  default: () => <div data-testid="team-management">Team Management</div>,
}));
vi.mock("../ArchivedJobs", () => ({
  default: () => <div data-testid="archived-jobs">Archived Jobs</div>,
}));
vi.mock("../../components/ProfileNavBar", () => ({
  default: () => <nav data-testid="profile-nav">Profile Navigation</nav>,
}));

import { useAuth } from "../../contexts/AuthContext";

const renderProfileLayout = (route = "/profile") => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/profile/*" element={<ProfileLayout />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ProfileLayout Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows login message when not authenticated", () => {
    useAuth.mockReturnValue({ authed: false, user: null });
    renderProfileLayout();

    expect(
      screen.getByText("You must log in to view your profile.")
    ).toBeInTheDocument();
  });

  it("renders profile header when authenticated", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1, name: "Test" } });
    renderProfileLayout();

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage your professional information and career details"
      )
    ).toBeInTheDocument();
  });

  it("renders ProfileNavBar when authenticated", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout();

    expect(screen.getByTestId("profile-nav")).toBeInTheDocument();
  });

  it("renders InfoTab by default", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile");

    expect(screen.getByTestId("info-tab")).toBeInTheDocument();
  });

  it("renders InfoTab on /profile/info route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/info");

    expect(screen.getByTestId("info-tab")).toBeInTheDocument();
  });

  it("renders EmploymentTab on /profile/employment route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/employment");

    expect(screen.getByTestId("employment-tab")).toBeInTheDocument();
  });

  it("renders SkillsTab on /profile/skills route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/skills");

    expect(screen.getByTestId("skills-tab")).toBeInTheDocument();
  });

  it("renders EducationTab on /profile/education route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/education");

    expect(screen.getByTestId("education-tab")).toBeInTheDocument();
  });

  it("renders CertificationsTab on /profile/certifications route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/certifications");

    expect(screen.getByTestId("certifications-tab")).toBeInTheDocument();
  });

  it("renders ProjectsTab on /profile/projects route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/projects");

    expect(screen.getByTestId("projects-tab")).toBeInTheDocument();
  });

  it("renders GitHubTab on /profile/github route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/github");

    expect(screen.getByTestId("github-tab")).toBeInTheDocument();
  });

  it("renders JobsTab on /profile/jobs route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/jobs");

    expect(screen.getByTestId("jobs-tab")).toBeInTheDocument();
  });

  it("renders DashboardTab on /profile/dashboard route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/dashboard");

    expect(screen.getByTestId("dashboard-tab")).toBeInTheDocument();
  });

  it("renders DangerTab on /profile/danger route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/danger");

    expect(screen.getByTestId("danger-tab")).toBeInTheDocument();
  });

  it("renders TeamManagement on /profile/team route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/team");

    expect(screen.getByTestId("team-management")).toBeInTheDocument();
  });

  it("renders ArchivedJobs on /profile/archived route", () => {
    useAuth.mockReturnValue({ authed: true, user: { id: 1 } });
    renderProfileLayout("/profile/archived");

    expect(screen.getByTestId("archived-jobs")).toBeInTheDocument();
  });
});
