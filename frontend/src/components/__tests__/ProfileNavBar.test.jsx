/**
 * ProfileNavBar Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileNavBar from "../ProfileNavBar";

// Mock TeamContext
vi.mock("../../contexts/TeamContext", () => ({
  useTeam: vi.fn(() => null),
}));

import { useTeam } from "../../contexts/TeamContext";

const renderNavBar = () => {
  return render(
    <MemoryRouter>
      <ProfileNavBar />
    </MemoryRouter>
  );
};

describe("ProfileNavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeam.mockReturnValue({ teamState: null });
  });

  it("renders all default tabs", () => {
    renderNavBar();
    expect(screen.getByText("My Info")).toBeInTheDocument();
    expect(screen.getByText("Employment")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Certifications")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("renders correct links for tabs", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: "My Info" })).toHaveAttribute(
      "href",
      "/profile/info"
    );
    expect(screen.getByRole("link", { name: "Employment" })).toHaveAttribute(
      "href",
      "/profile/employment"
    );
    expect(screen.getByRole("link", { name: "Skills" })).toHaveAttribute(
      "href",
      "/profile/skills"
    );
    expect(screen.getByRole("link", { name: "Education" })).toHaveAttribute(
      "href",
      "/profile/education"
    );
  });

  it("does not show Team Management tab when user has no team role", () => {
    useTeam.mockReturnValue({
      teamState: { isAdmin: false, isMentor: false, isCandidate: false },
    });
    renderNavBar();
    expect(screen.queryByText("Team Management")).not.toBeInTheDocument();
  });

  it("shows Team Management tab for admin", () => {
    useTeam.mockReturnValue({
      teamState: { isAdmin: true, isMentor: false, isCandidate: false },
    });
    renderNavBar();
    expect(screen.getByText("Team Management")).toBeInTheDocument();
  });

  it("shows Team Management tab for mentor", () => {
    useTeam.mockReturnValue({
      teamState: { isAdmin: false, isMentor: true, isCandidate: false },
    });
    renderNavBar();
    expect(screen.getByText("Team Management")).toBeInTheDocument();
  });

  it("shows Team Management tab for candidate", () => {
    useTeam.mockReturnValue({
      teamState: { isAdmin: false, isMentor: false, isCandidate: true },
    });
    renderNavBar();
    expect(screen.getByText("Team Management")).toBeInTheDocument();
  });

  it("shows Team Management tab link to correct route", () => {
    useTeam.mockReturnValue({ teamState: { isAdmin: true } });
    renderNavBar();
    expect(
      screen.getByRole("link", { name: "Team Management" })
    ).toHaveAttribute("href", "/profile/team");
  });

  it("handles null teamState gracefully", () => {
    useTeam.mockReturnValue(null);
    renderNavBar();
    expect(screen.getByText("My Info")).toBeInTheDocument();
    expect(screen.queryByText("Team Management")).not.toBeInTheDocument();
  });

  it("handles undefined useTeam return gracefully", () => {
    useTeam.mockReturnValue(undefined);
    renderNavBar();
    expect(screen.getByText("My Info")).toBeInTheDocument();
  });
});
