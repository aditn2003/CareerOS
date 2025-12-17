/**
 * ProfileContext Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileProvider, useProfile } from "../ProfileContext";
import { AuthProvider } from "../AuthContext";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Test component to consume profile context
function TestConsumer() {
  const { profile, setProfile, loadProfile, saveProfile } = useProfile();

  return (
    <div>
      <span data-testid="profile">
        {profile ? JSON.stringify(profile) : "no-profile"}
      </span>
      <button onClick={loadProfile} data-testid="load-btn">
        Load Profile
      </button>
      <button onClick={saveProfile} data-testid="save-btn">
        Save Profile
      </button>
      <button
        onClick={() =>
          setProfile({ name: "Test User", email: "test@test.com" })
        }
        data-testid="set-btn"
      >
        Set Profile
      </button>
    </div>
  );
}

// Wrapper component with providers
function TestWrapper({ children, token = null }) {
  // Set token in localStorage if provided
  if (token) {
    localStorage.setItem("token", token);
  }

  return (
    <MemoryRouter>
      <AuthProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProfileContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides default null profile state", () => {
    render(<TestConsumer />, { wrapper: TestWrapper });

    expect(screen.getByTestId("profile")).toHaveTextContent("no-profile");
  });

  it("provides setProfile function that updates profile", async () => {
    const user = userEvent.setup();
    render(<TestConsumer />, { wrapper: TestWrapper });

    await user.click(screen.getByTestId("set-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Test User");
      expect(screen.getByTestId("profile")).toHaveTextContent("test@test.com");
    });
  });

  it("loadProfile fetches profile when token exists", async () => {
    const user = userEvent.setup();
    const mockProfile = {
      name: "John Doe",
      email: "john@example.com",
      bio: "Developer",
    };

    api.get.mockResolvedValueOnce({ data: { profile: mockProfile } });
    localStorage.setItem("token", "valid-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProfileProvider>
            <TestConsumer />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByTestId("load-btn"));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/profile", {
        headers: { Authorization: "Bearer valid-token" },
      });
    });
  });

  it("loadProfile does nothing when no token", async () => {
    const user = userEvent.setup();

    render(<TestConsumer />, { wrapper: TestWrapper });

    await user.click(screen.getByTestId("load-btn"));

    // API should not be called
    expect(api.get).not.toHaveBeenCalled();
  });

  it("saveProfile posts profile data when token exists", async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { success: true } });
    localStorage.setItem("token", "valid-token");

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProfileProvider>
            <TestConsumer />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // First set a profile
    await user.click(screen.getByTestId("set-btn"));

    // Then save it
    await user.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/profile",
        { name: "Test User", email: "test@test.com" },
        { headers: { Authorization: "Bearer valid-token" } }
      );
    });
  });

  it("exposes all required context values", () => {
    let contextValues;

    function ContextInspector() {
      contextValues = useProfile();
      return null;
    }

    render(
      <TestWrapper>
        <ContextInspector />
      </TestWrapper>
    );

    expect(contextValues).toHaveProperty("profile");
    expect(contextValues).toHaveProperty("setProfile");
    expect(contextValues).toHaveProperty("loadProfile");
    expect(contextValues).toHaveProperty("saveProfile");
    expect(typeof contextValues.setProfile).toBe("function");
    expect(typeof contextValues.loadProfile).toBe("function");
    expect(typeof contextValues.saveProfile).toBe("function");
  });

  it("profile updates trigger re-renders", async () => {
    const user = userEvent.setup();
    const renderCount = vi.fn();

    function RenderCounter() {
      const { profile } = useProfile();
      renderCount();
      return <span data-testid="count">{profile?.name || "none"}</span>;
    }

    render(
      <TestWrapper>
        <RenderCounter />
        <TestConsumer />
      </TestWrapper>
    );

    const initialCalls = renderCount.mock.calls.length;

    await user.click(screen.getByTestId("set-btn"));

    await waitFor(() => {
      expect(renderCount.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(screen.getByTestId("count")).toHaveTextContent("Test User");
    });
  });
});
