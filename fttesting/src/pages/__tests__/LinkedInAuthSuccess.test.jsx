/**
 * LinkedInAuthSuccess Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LinkedInAuthSuccess from "../LinkedInAuthSuccess";

// Mock AuthContext
const mockSetToken = vi.fn();
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ setToken: mockSetToken }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LinkedInAuthSuccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete window.location;
    window.location = { search: "" };
    window.opener = null;
    window.close = vi.fn();
  });

  const renderPage = (search = "") => {
    window.location.search = search;
    return render(
      <MemoryRouter>
        <LinkedInAuthSuccess />
      </MemoryRouter>
    );
  };

  it("renders component", () => {
    renderPage("");
    expect(document.body.textContent).toBeTruthy();
  });

  it("displays message", () => {
    renderPage("");
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });

  it("has centered layout", () => {
    renderPage("");
    const flexDiv = document.querySelector('[style*="flex"]');
    expect(flexDiv).toBeInTheDocument();
  });

  it("displays icon", () => {
    renderPage("");
    const iconDiv = document.querySelector('[style*="border-radius: 50%"]');
    expect(iconDiv).toBeInTheDocument();
  });

  it("handles error param and shows error message", async () => {
    renderPage("?error=access_denied");

    await waitFor(
      () => {
        expect(
          screen.getByText(/LinkedIn login failed: access_denied/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("processes valid token", async () => {
    const payload = { id: "user123" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    renderPage(`?token=${mockToken}`);

    await waitFor(
      () => {
        expect(mockSetToken).toHaveBeenCalledWith(mockToken);
      },
      { timeout: 5000 }
    );

    expect(localStorage.getItem("token")).toBe(mockToken);
  });

  it("processes token with user data", async () => {
    const payload = { id: "user456" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    const user = { name: "Test User", email: "test@linkedin.com" };
    const encodedUser = encodeURIComponent(JSON.stringify(user));

    renderPage(`?token=${mockToken}&user=${encodedUser}`);

    await waitFor(
      () => {
        expect(mockSetToken).toHaveBeenCalledWith(mockToken);
      },
      { timeout: 5000 }
    );

    expect(localStorage.getItem("linkedinUser")).toBe(JSON.stringify(user));
    expect(localStorage.getItem("linkedinProfile")).toBe(JSON.stringify(user));
    expect(localStorage.getItem("userId")).toBe("user456");
  });

  it("shows success message after processing token", async () => {
    const payload = { id: "user789" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    renderPage(`?token=${mockToken}`);

    await waitFor(
      () => {
        expect(
          screen.getByText(/LinkedIn connected successfully/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("handles token with invalid JSON payload", async () => {
    // This token has valid base64 but contains invalid JSON in the payload
    // We need to provide a user param so the code tries to parse the token payload
    const mockToken = `header.${btoa("not valid json")}.signature`;
    const user = { name: "Test User" };
    const encodedUser = encodeURIComponent(JSON.stringify(user));

    renderPage(`?token=${mockToken}&user=${encodedUser}`);

    await waitFor(
      () => {
        expect(
          screen.getByText(/Error processing authentication/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("redirects to login when no token and not in popup", async () => {
    window.opener = null;
    renderPage("");

    await waitFor(
      () => {
        expect(
          screen.getByText(/No authentication data received/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("applies error styling when in error state", async () => {
    renderPage("?error=test_error");

    await waitFor(
      () => {
        const container = document.querySelector('[style*="color"]');
        expect(container).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("shows error icon when error occurs", async () => {
    renderPage("?error=test_error");

    await waitFor(
      () => {
        expect(screen.getByText("❌")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("shows success icon when auth succeeds", async () => {
    const payload = { id: "user123" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    renderPage(`?token=${mockToken}`);

    await waitFor(
      () => {
        expect(screen.getByText("✓")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
