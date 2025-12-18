/**
 * LinkedInOAuthButton Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LinkedInOAuthButton from "../LinkedInOAuthButton";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LinkedInOAuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete window.location;
    window.location = { href: "", search: "" };
  });

  const renderButton = (search = "") => {
    window.location.search = search;
    return render(
      <MemoryRouter>
        <LinkedInOAuthButton />
      </MemoryRouter>
    );
  };

  it("renders Login with LinkedIn button", () => {
    renderButton();
    expect(
      screen.getByRole("button", { name: /Login with LinkedIn/i })
    ).toBeInTheDocument();
  });

  it("shows LinkedIn icon", () => {
    renderButton();
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("redirects to LinkedIn OAuth on click", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(window.location.href).toBe(
      "http://localhost:4000/api/auth/linkedin"
    );
  });

  it("shows loading state when clicked", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
  });

  it("disables button when loading", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("saves token from URL params", () => {
    renderButton("?token=test-token");
    expect(localStorage.getItem("token")).toBe("test-token");
  });

  it("saves user info from URL params", () => {
    renderButton("?token=test-token&user=john");
    expect(localStorage.getItem("linkedinUser")).toBe("john");
  });

  it("redirects to dashboard after OAuth callback", () => {
    renderButton("?token=test-token");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("does not redirect without token", () => {
    renderButton("");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles hover styles", () => {
    renderButton();
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    // Just verify no errors occur
    expect(button).toBeInTheDocument();
  });
});
