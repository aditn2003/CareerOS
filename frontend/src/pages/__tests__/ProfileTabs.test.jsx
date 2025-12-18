/**
 * Profile Tab Pages Tests - Target: 100% Coverage
 * Tests for simple profile tab pages
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ token: "mock-token", setToken: vi.fn() }),
}));

// Mock child components
vi.mock("../../components/ProfileDashboard", () => ({
  default: ({ token }) => (
    <div data-testid="profile-dashboard">Dashboard with token: {token}</div>
  ),
}));
vi.mock("../../components/CertificationSection", () => ({
  default: ({ token }) => (
    <div data-testid="cert-section">Certs with token: {token}</div>
  ),
}));
vi.mock("../../components/GitHubSection", () => ({
  default: ({ token }) => (
    <div data-testid="github-section">GitHub with token: {token}</div>
  ),
}));
vi.mock("../../components/ProjectSection", () => ({
  default: ({ token }) => (
    <div data-testid="project-section">Projects with token: {token}</div>
  ),
}));
vi.mock("../../components/SkillsSection", () => ({
  default: ({ token }) => (
    <div data-testid="skills-section">Skills with token: {token}</div>
  ),
}));
vi.mock("../../components/SkillsForm", () => ({
  default: ({ onAdded, onCancel }) => (
    <div data-testid="skills-form">
      <button onClick={onAdded}>Save Skill</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));
vi.mock("../../components/EducationSection", () => ({
  default: ({ token, onEdit }) => (
    <div data-testid="education-section">
      Education
      <button onClick={() => onEdit({ id: 1, school: "Test" })}>Edit</button>
    </div>
  ),
}));
vi.mock("../../components/EducationForm", () => ({
  default: ({ onSaved, onCancel }) => (
    <div data-testid="education-form">
      <button onClick={onSaved}>Save Education</button>
      <button onClick={onCancel}>Cancel Education</button>
    </div>
  ),
}));
vi.mock("../../api", () => ({
  api: { post: vi.fn() },
}));

import DashboardTab from "../Profile/DashboardTab";
import CertificationsTab from "../Profile/CertificationsTab";
import GitHubTab from "../Profile/GitHubTab";
import ProjectsTab from "../Profile/ProjectsTab";
import SkillsTab from "../Profile/SkillsTab";
import EducationTab from "../Profile/EducationTab";
import DangerTab from "../Profile/DangerTab";
import { api } from "../../api";

describe("DashboardTab", () => {
  it("renders ProfileDashboard with token", () => {
    render(<DashboardTab />);
    expect(screen.getByTestId("profile-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/mock-token/)).toBeInTheDocument();
  });
});

describe("CertificationsTab", () => {
  it("renders title", () => {
    render(<CertificationsTab />);
    expect(screen.getByText("Certifications")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<CertificationsTab />);
    expect(
      screen.getByText(/Add certifications and credentials/i)
    ).toBeInTheDocument();
  });

  it("renders CertificationSection with token", () => {
    render(<CertificationsTab />);
    expect(screen.getByTestId("cert-section")).toBeInTheDocument();
  });
});

describe("GitHubTab", () => {
  it("renders title", () => {
    render(<GitHubTab />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<GitHubTab />);
    expect(
      screen.getByText(/Showcase your GitHub projects/i)
    ).toBeInTheDocument();
  });

  it("renders GitHubSection with token", () => {
    render(<GitHubTab />);
    expect(screen.getByTestId("github-section")).toBeInTheDocument();
  });
});

describe("ProjectsTab", () => {
  it("renders title", () => {
    render(<ProjectsTab />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<ProjectsTab />);
    expect(
      screen.getByText(/Showcase academic, professional, or personal projects/i)
    ).toBeInTheDocument();
  });

  it("renders ProjectSection with token", () => {
    render(<ProjectsTab />);
    expect(screen.getByTestId("project-section")).toBeInTheDocument();
  });
});

describe("SkillsTab", () => {
  it("renders title", () => {
    render(<SkillsTab />);
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("renders Add Skill button by default", () => {
    render(<SkillsTab />);
    expect(screen.getByText("Add Skill")).toBeInTheDocument();
  });

  it("shows SkillsForm when Add Skill clicked", () => {
    render(<SkillsTab />);
    fireEvent.click(screen.getByText("Add Skill"));
    expect(screen.getByTestId("skills-form")).toBeInTheDocument();
  });

  it("hides form when cancel clicked", () => {
    render(<SkillsTab />);
    fireEvent.click(screen.getByText("Add Skill"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("skills-form")).not.toBeInTheDocument();
  });

  it("hides form when saved", () => {
    render(<SkillsTab />);
    fireEvent.click(screen.getByText("Add Skill"));
    fireEvent.click(screen.getByText("Save Skill"));
    expect(screen.queryByTestId("skills-form")).not.toBeInTheDocument();
  });

  it("renders SkillsSection when form is hidden", () => {
    render(<SkillsTab />);
    expect(screen.getByTestId("skills-section")).toBeInTheDocument();
  });
});

describe("EducationTab", () => {
  it("renders title", () => {
    render(<EducationTab />);
    expect(
      screen.getByRole("heading", { name: "Education" })
    ).toBeInTheDocument();
  });

  it("renders Add Education button by default", () => {
    render(<EducationTab />);
    expect(screen.getByText("Add Education")).toBeInTheDocument();
  });

  it("shows EducationForm when Add Education clicked", () => {
    render(<EducationTab />);
    fireEvent.click(screen.getByText("Add Education"));
    expect(screen.getByTestId("education-form")).toBeInTheDocument();
  });

  it("hides form when cancel clicked", () => {
    render(<EducationTab />);
    fireEvent.click(screen.getByText("Add Education"));
    fireEvent.click(screen.getByText("Cancel Education"));
    expect(screen.queryByTestId("education-form")).not.toBeInTheDocument();
  });

  it("shows form when edit clicked", () => {
    render(<EducationTab />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("education-form")).toBeInTheDocument();
  });
});

describe("DangerTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn();
    global.prompt = vi.fn();
    global.alert = vi.fn();
  });

  it("renders title", () => {
    render(<DangerTab />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("renders warning description", () => {
    render(<DangerTab />);
    expect(
      screen.getByText(/This action cannot be undone/i)
    ).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(<DangerTab />);
    expect(
      screen.getByRole("button", { name: /Delete My Account/i })
    ).toBeInTheDocument();
  });

  it("shows confirmation dialog on delete click", () => {
    global.confirm.mockReturnValue(false);
    render(<DangerTab />);
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));
    expect(global.confirm).toHaveBeenCalled();
  });

  it("prompts for password after confirmation", () => {
    global.confirm.mockReturnValue(true);
    global.prompt.mockReturnValue(null);
    render(<DangerTab />);
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));
    expect(global.prompt).toHaveBeenCalled();
  });

  it("shows alert if no password entered", () => {
    global.confirm.mockReturnValue(true);
    global.prompt.mockReturnValue("");
    render(<DangerTab />);
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));
    expect(global.alert).toHaveBeenCalledWith("Password is required.");
  });

  it("calls API on successful deletion", async () => {
    global.confirm.mockReturnValue(true);
    global.prompt.mockReturnValue("password123");
    api.post.mockResolvedValue({});

    render(<DangerTab />);
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    expect(api.post).toHaveBeenCalledWith(
      "/delete",
      { password: "password123" },
      expect.anything()
    );
  });
});
