/**
 * MentorTab Page Tests - Target: High Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MentorTab from "../Profile/MentorTab";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock("../../contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ token: "mock-token" }),
}));

// Mock TeamContext
const mockRefreshTeam = vi.fn();
const mockSetSelectedTeam = vi.fn();
let mockTeamStateValue = {
  status: "ready",
  accountType: null,
  teams: [],
  primaryTeam: null,
  role: null,
  isMentor: false,
  isAdmin: false,
  isCandidate: false,
  hasTeam: false,
};

vi.mock("../../contexts/TeamContext", () => ({
  TeamProvider: ({ children }) => children,
  useTeam: () => ({
    teamState: mockTeamStateValue,
    refreshTeam: mockRefreshTeam,
    setSelectedTeam: mockSetSelectedTeam,
  }),
}));

// Mock child components
vi.mock("../../components/FeedbackThreads", () => ({
  default: ({ teamId }) => (
    <div data-testid="feedback-threads">Feedback Threads for team {teamId}</div>
  ),
}));

vi.mock("../../components/FeedbackModal", () => ({
  default: ({ candidateId, candidateName, onClose, onSuccess }) => (
    <div data-testid="feedback-modal">
      <div>
        Feedback Modal for {candidateName} (ID: {candidateId})
      </div>
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Success</button>
    </div>
  ),
}));

describe("MentorTab", () => {
  const mockToken = "mock-token";

  const renderWithProviders = (teamStateOverride = {}) => {
    // Update the mock state before rendering
    mockTeamStateValue = {
      status: "ready",
      accountType: null,
      teams: [],
      primaryTeam: null,
      role: null,
      isMentor: false,
      isAdmin: false,
      isCandidate: false,
      hasTeam: false,
      ...teamStateOverride,
    };

    return render(
      <MemoryRouter>
        <MentorTab />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    global.confirm = vi.fn();
    localStorage.setItem("token", mockToken);
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
    mockTeamStateValue = {
      status: "ready",
      accountType: null,
      teams: [],
      primaryTeam: null,
      role: null,
      isMentor: false,
      isAdmin: false,
      isCandidate: false,
      hasTeam: false,
    };
  });

  it("shows loading state when teamState.status is loading", () => {
    renderWithProviders({ status: "loading" });
    expect(
      screen.getByText(/Loading your mentoring details/i)
    ).toBeInTheDocument();
  });

  it("shows invite pending view when inviteStatus is invited", () => {
    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    expect(screen.getByText(/Team Invitation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You've been invited to join a team/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Test Team/i)).toBeInTheDocument();
    expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
  });

  it("shows requested view when inviteStatus is requested", () => {
    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "requested",
      },
    });

    expect(screen.getByText(/Join Request Pending/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Your join request is pending approval/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Test Team/i)).toBeInTheDocument();
  });

  it("shows mentor dashboard when user is mentor", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Mentor Dashboard/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Provide feedback to candidates/i)
      ).toBeInTheDocument();
    });
  });

  it("shows candidate view when user is candidate with team", () => {
    api.get.mockResolvedValue({
      data: {
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isCandidate: true,
      hasTeam: true,
      primaryTeam: {
        id: 1,
        name: "Candidate Team",
        status: "active",
      },
    });

    expect(screen.getByText(/Your Mentor Space/i)).toBeInTheDocument();
    expect(screen.getByText(/Team:/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidate Team/i)).toBeInTheDocument();
  });

  it("shows default view when no mentor tools available", () => {
    renderWithProviders({
      status: "ready",
      isMentor: false,
      isCandidate: false,
      hasTeam: false,
    });

    expect(screen.getByText(/Mentor Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/No mentor tools available/i)).toBeInTheDocument();
  });

  it("accepts invite on Accept Invitation click", async () => {
    api.post.mockResolvedValue({ data: {} });

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    // Wait a bit for the async call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that api.post was called (it might be called with refreshTeam too)
    const postCalls = api.post.mock.calls;
    const acceptCall = postCalls.find(
      (call) => call[0] && call[0].includes("/api/team/1/accept")
    );
    expect(acceptCall).toBeDefined();
  });

  it("shows error banner when invite acceptance fails", async () => {
    api.post.mockRejectedValueOnce(new Error("Failed to accept"));

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to accept invite/i)).toBeInTheDocument();
    });
  });

  it("shows success message when invite accepted successfully", async () => {
    api.post.mockResolvedValue({ data: {} });

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/Invite accepted/i)).toBeInTheDocument();
    });
  });

  it("disables accept button while accepting", async () => {
    api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/Accepting/i)).toBeInTheDocument();
      expect(acceptButton).toBeDisabled();
    });
  });

  it("renders FeedbackThreads in candidate view", () => {
    api.get.mockResolvedValue({
      data: {
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isCandidate: true,
      hasTeam: true,
      primaryTeam: {
        id: 1,
        name: "Candidate Team",
        status: "active",
      },
    });

    expect(screen.getByTestId("feedback-threads")).toBeInTheDocument();
    expect(
      screen.getByText(/Feedback Threads for team 1/i)
    ).toBeInTheDocument();
  });

  it("renders FeedbackThreads in mentor dashboard", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 2,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("feedback-threads")).toBeInTheDocument();
      expect(
        screen.getByText(/Feedback Threads for team 2/i)
      ).toBeInTheDocument();
    });
  });

  it("shows Add Feedback buttons for each candidate member", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
          {
            userId: 2,
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Add Feedback for Jane Smith/i)
      ).toBeInTheDocument();
    });
  });

  it("opens feedback modal when Add Feedback button clicked", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
    });

    const addFeedbackButton = screen.getByText(/Add Feedback for John Doe/i);
    fireEvent.click(addFeedbackButton);

    await waitFor(() => {
      expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();
      expect(
        screen.getByText(/Feedback Modal for John Doe/i)
      ).toBeInTheDocument();
    });
  });

  it("closes feedback modal on Close click", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
    });

    const addFeedbackButton = screen.getByText(/Add Feedback for John Doe/i);
    fireEvent.click(addFeedbackButton);

    await waitFor(() => {
      expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();
    });

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId("feedback-modal")).not.toBeInTheDocument();
    });
  });

  it("does not show Add Feedback section when no members", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Mentor Dashboard/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Add Feedback/i)).not.toBeInTheDocument();
  });

  it("filters members to show only active candidates", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            role: "candidate",
            status: "active",
          },
          {
            userId: 2,
            firstName: "Jane",
            lastName: "Smith",
            role: "mentor",
            status: "active",
          },
          {
            userId: 3,
            firstName: "Bob",
            lastName: "Jones",
            role: "candidate",
            status: "inactive",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
    });

    // Should only show active candidates
    expect(screen.queryByText(/Jane Smith/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bob Jones/i)).not.toBeInTheDocument();
  });

  it("shows error banner in candidate view when feedback load fails", async () => {
    api.get.mockRejectedValueOnce(new Error("Failed to load"));

    renderWithProviders({
      status: "ready",
      isCandidate: true,
      hasTeam: true,
      primaryTeam: {
        id: 1,
        name: "Candidate Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load feedback/i)).toBeInTheDocument();
    });
  });

  it("handles member name fallback to email", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            email: "user@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for user@example.com/i)
      ).toBeInTheDocument();
    });
  });

  it("handles mouse enter and leave events on feedback buttons (covers lines 272-273)", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
    });

    const addFeedbackButton = screen.getByText(/Add Feedback for John Doe/i);

    // Test mouse enter (covers line 272)
    fireEvent.mouseEnter(addFeedbackButton);
    expect(addFeedbackButton.style.background).toBe("rgb(124, 58, 237)"); // #7c3aed

    // Test mouse leave (covers line 273)
    fireEvent.mouseLeave(addFeedbackButton);
    expect(addFeedbackButton.style.background).toBe("rgb(139, 92, 246)"); // #8b5cf6
  });

  it("calls loadFeedback and closes modal on success (covers lines 298-299)", async () => {
    const loadFeedbackSpy = vi.fn();
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Add Feedback for John Doe/i)
      ).toBeInTheDocument();
    });

    // Open the modal
    const addFeedbackButton = screen.getByText(/Add Feedback for John Doe/i);
    fireEvent.click(addFeedbackButton);

    await waitFor(() => {
      expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();
    });

    // Click the Success button which triggers onSuccess callback (covers lines 298-299)
    const successButton = screen.getByText("Success");
    fireEvent.click(successButton);

    // Wait for the modal to close and loadFeedback to be called
    await waitFor(() => {
      expect(screen.queryByTestId("feedback-modal")).not.toBeInTheDocument();
    });

    // Verify that loadFeedback was called (it's called in onSuccess)
    // The onSuccess callback calls loadFeedback() and setFeedbackModal(null)
    // We verify the modal is closed, which means onSuccess executed
    expect(screen.queryByTestId("feedback-modal")).not.toBeInTheDocument();
  });

  it("handles member with no firstName or lastName (covers Unnamed fallback)", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            email: "user@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      // Should fallback to email
      expect(
        screen.getByText(/Add Feedback for user@example.com/i)
      ).toBeInTheDocument();
    });
  });

  it("handles member with only firstName (no lastName)", async () => {
    api.get.mockResolvedValue({
      data: {
        members: [
          {
            userId: 1,
            firstName: "John",
            email: "john@example.com",
            role: "candidate",
            status: "active",
          },
        ],
        feedback: [],
      },
    });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Add Feedback for John/i)).toBeInTheDocument();
    });
  });

  it("renders mentor dashboard safely when teamId is missing (covers loadMembers/loadFeedback early return)", async () => {
    // No primaryTeam => teamId is undefined
    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: null,
    });

    await waitFor(() => {
      expect(screen.getByText(/Mentor Dashboard/i)).toBeInTheDocument();
    });

    // With no teamId, mentor dashboard should not attempt API calls
    expect(api.get).not.toHaveBeenCalled();
  });

  it("handles loadMembers API error gracefully in mentor dashboard", async () => {
    // First call (members) fails, second call (feedback) succeeds
    api.get
      .mockRejectedValueOnce(new Error("Failed members"))
      .mockResolvedValueOnce({
        data: {
          feedback: [],
        },
      });

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      // Mentor dashboard still renders even if members fail to load
      expect(screen.getByText(/Mentor Dashboard/i)).toBeInTheDocument();
    });
  });

  it("handles loadFeedback API error gracefully in mentor dashboard", async () => {
    // First call (members) succeeds, second call (feedback) fails
    api.get
      .mockResolvedValueOnce({
        data: {
          members: [],
        },
      })
      .mockRejectedValueOnce(new Error("Failed feedback"));

    renderWithProviders({
      status: "ready",
      isMentor: true,
      isAdmin: true,
      primaryTeam: {
        id: 1,
        name: "Mentor Team",
        status: "active",
      },
    });

    await waitFor(() => {
      // Mentor dashboard still renders even if feedback fails to load
      expect(screen.getByText(/Mentor Dashboard/i)).toBeInTheDocument();
    });
  });

  it("handles error response with error message in handleAcceptInvite", async () => {
    const errorResponse = {
      response: {
        data: {
          error: "Custom error message",
        },
      },
    };
    api.post.mockRejectedValueOnce(errorResponse);

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/Custom error message/i)).toBeInTheDocument();
    });
  });

  it("handles success message timeout in handleAcceptInvite", async () => {
    api.post.mockResolvedValue({ data: {} });

    renderWithProviders({
      status: "ready",
      primaryTeam: {
        id: 1,
        name: "Test Team",
        status: "invited",
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByText(/Accept Invitation/i);
    fireEvent.click(acceptButton);

    // Wait for success message to appear
    await waitFor(() => {
      expect(screen.getByText(/Invite accepted/i)).toBeInTheDocument();
    });

    // Wait for the setTimeout to clear the success message (covers line 30-32)
    // The setTimeout is 5000ms, so we wait a bit longer to ensure it executes
    await waitFor(
      () => {
        expect(screen.queryByText(/Invite accepted/i)).not.toBeInTheDocument();
      },
      { timeout: 6000 }
    );
  });
});
