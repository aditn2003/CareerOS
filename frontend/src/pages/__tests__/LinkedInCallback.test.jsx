/**
 * LinkedInCallback Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LinkedInCallback from "../LinkedInCallback";

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

describe("LinkedInCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset window.location
    delete window.location;
    window.location = { search: "" };
  });

  const renderPage = (search = "") => {
    window.location.search = search;
    return render(
      <MemoryRouter>
        <LinkedInCallback />
      </MemoryRouter>
    );
  };

  it("renders component", () => {
    renderPage("");
    expect(document.body.textContent).toBeTruthy();
  });

  it("displays message when rendered", () => {
    renderPage("");
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });

  it("handles no token scenario and shows error", async () => {
    renderPage("");

    await waitFor(
      () => {
        expect(
          screen.getByText(/No authentication token received/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("renders with gradient background", () => {
    renderPage("");
    const styledDiv = document.querySelector('[style*="background"]');
    expect(styledDiv).toBeInTheDocument();
  });

  it("has centered content layout", () => {
    renderPage("");
    const flexDiv = document.querySelector('[style*="flex"]');
    expect(flexDiv).toBeInTheDocument();
  });

  it("processes valid token and sets auth", async () => {
    // Create a valid JWT-like token (base64 encoded payload)
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
    expect(localStorage.getItem("userId")).toBe("user123");
  });

  it("processes token with profile data", async () => {
    const payload = { id: "user456" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    const profile = { name: "Test User", email: "test@linkedin.com" };
    const encodedProfile = encodeURIComponent(JSON.stringify(profile));

    renderPage(`?token=${mockToken}&profile=${encodedProfile}`);

    await waitFor(
      () => {
        expect(mockSetToken).toHaveBeenCalledWith(mockToken);
      },
      { timeout: 5000 }
    );

    expect(localStorage.getItem("linkedinProfile")).toBe(
      JSON.stringify(profile)
    );
  });

  it("shows success message after processing token", async () => {
    const payload = { id: "user789" };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockToken = `header.${encodedPayload}.signature`;

    renderPage(`?token=${mockToken}`);

    await waitFor(
      () => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("handles invalid token parsing error", async () => {
    // Invalid token that will fail JSON.parse
    const mockToken = "header.invalid-base64.signature";

    renderPage(`?token=${mockToken}`);

    await waitFor(
      () => {
        // Should show error message
        const hasError =
          screen.queryByText(/Login failed|error/i) || screen.queryByText("❌");
        expect(hasError).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it("displays error icon when error occurs", async () => {
    renderPage("");

    await waitFor(
      () => {
        expect(screen.getByText("❌")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("displays redirect message when error occurs", async () => {
    renderPage("");

    await waitFor(
      () => {
        expect(screen.getByText(/Redirecting to login/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
