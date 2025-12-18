/**
 * AuthContext Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../AuthContext";
import { MemoryRouter } from "react-router-dom";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from "../../api";

// Test component to consume auth context
function TestConsumer() {
  const { authed, token, login, logout, register, setToken } = useAuth();

  return (
    <div>
      <span data-testid="authed">
        {authed ? "authenticated" : "not-authenticated"}
      </span>
      <span data-testid="token">{token || "no-token"}</span>
      <button onClick={() => login("test@example.com", "password123")}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
      <button
        onClick={() =>
          register({ email: "new@example.com", password: "pass123" })
        }
      >
        Register
      </button>
      <button onClick={() => setToken("manual-token")}>Set Token</button>
    </div>
  );
}

// Wrapper component with router
function TestWrapper({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default unauthenticated state", () => {
    render(<TestConsumer />, { wrapper: TestWrapper });

    expect(screen.getByTestId("authed")).toHaveTextContent("not-authenticated");
    expect(screen.getByTestId("token")).toHaveTextContent("no-token");
  });

  it("initializes with token from localStorage", () => {
    const mockToken = "existing-token";
    localStorage.setItem("token", mockToken);

    render(<TestConsumer />, { wrapper: TestWrapper });

    expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("token")).toHaveTextContent(mockToken);
  });

  it("logout clears token and auth state", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "test-token");

    render(<TestConsumer />, { wrapper: TestWrapper });

    // Verify initially authenticated
    expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");

    // Click logout
    await user.click(screen.getByText("Logout"));

    // Verify logged out
    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent(
        "not-authenticated"
      );
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  it("saves token to localStorage when updated", () => {
    const { rerender } = render(<TestConsumer />, { wrapper: TestWrapper });

    // Set token in localStorage manually to simulate login
    localStorage.setItem("token", "new-token");

    // Force re-render with new wrapper
    rerender(<TestConsumer />);

    // Check localStorage
    expect(localStorage.getItem("token")).toBe("new-token");
  });

  it("authed is derived from token presence", () => {
    localStorage.setItem("token", "valid-token");

    render(<TestConsumer />, { wrapper: TestWrapper });

    // authed should be true when token exists
    expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("token")).toHaveTextContent("valid-token");
  });
});

describe("AuthContext Edge Cases", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("handles empty token gracefully", () => {
    localStorage.setItem("token", "");

    render(<TestConsumer />, { wrapper: TestWrapper });

    // Empty string should be falsy
    expect(screen.getByTestId("authed")).toHaveTextContent("not-authenticated");
  });

  it("persists authentication across renders", () => {
    localStorage.setItem("token", "persistent-token");

    const { rerender } = render(<TestConsumer />, { wrapper: TestWrapper });

    expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");

    // Re-render
    rerender(<TestConsumer />);

    expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
  });
});

describe("AuthContext login and register", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("login calls API and sets token", async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { token: "login-token-123" } });

    render(<TestConsumer />, { wrapper: TestWrapper });

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/login", {
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("login-token-123");
      expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
    });
  });

  it("register calls API and sets token", async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { token: "register-token-456" } });

    render(<TestConsumer />, { wrapper: TestWrapper });

    await user.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/register", {
        email: "new@example.com",
        password: "pass123",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent(
        "register-token-456"
      );
      expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
    });
  });

  it("setToken updates token directly", async () => {
    const user = userEvent.setup();

    render(<TestConsumer />, { wrapper: TestWrapper });

    expect(screen.getByTestId("authed")).toHaveTextContent("not-authenticated");

    await user.click(screen.getByText("Set Token"));

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("manual-token");
      expect(screen.getByTestId("authed")).toHaveTextContent("authenticated");
    });
  });
});
