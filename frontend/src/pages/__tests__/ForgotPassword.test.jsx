/**
 * ForgotPassword Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../ForgotPassword";
import { api } from "../../api";

// Mock api
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
  },
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

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
  };

  it("renders title", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Forgot Password" })).toBeInTheDocument();
  });

  it("renders email input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Send Reset Code/i })).toBeInTheDocument();
  });

  it("updates email input on change", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Email");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    expect(input).toHaveValue("test@example.com");
  });

  it("calls API with email on submit", async () => {
    api.post.mockResolvedValue({ data: { message: "Code sent" } });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/forgot", { email: "user@test.com" });
    });
  });

  it("shows success message from API", async () => {
    api.post.mockResolvedValue({ data: { message: "Reset code sent!" } });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Reset code sent!");
    });
  });

  it("shows default message when API response has no message", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Check your email for the reset code.");
    });
  });

  it("navigates to /reset on success", async () => {
    api.post.mockResolvedValue({ data: { message: "Code sent" } });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/reset");
    });
  });

  it("shows error message on API failure", async () => {
    api.post.mockRejectedValue({
      response: { data: { error: "User not found" } },
    });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "invalid@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("User not found");
    });
  });

  it("shows default error message when no error in response", async () => {
    api.post.mockRejectedValue({});
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Request failed");
    });
  });

  it("does not navigate on error", async () => {
    api.post.mockRejectedValue({ response: { data: { error: "Error" } } });
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
