/**
 * ResetPassword Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "../ResetPassword";
import { api } from "../../api";

// Mock api
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
  },
}));

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

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );
  };

  it("renders title", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
  });

  it("renders email input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("renders reset code input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Reset Code")).toBeInTheDocument();
  });

  it("renders new password input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
  });

  it("renders confirm password input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Reset Password/i })).toBeInTheDocument();
  });

  it("updates email input", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Email");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    expect(input).toHaveValue("test@example.com");
  });

  it("updates reset code input", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Reset Code");
    fireEvent.change(input, { target: { value: "123456" } });
    expect(input).toHaveValue("123456");
  });

  it("updates new password input", () => {
    renderPage();
    const input = screen.getByPlaceholderText("New Password");
    fireEvent.change(input, { target: { value: "newpass123" } });
    expect(input).toHaveValue("newpass123");
  });

  it("updates confirm password input", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Confirm New Password");
    fireEvent.change(input, { target: { value: "newpass123" } });
    expect(input).toHaveValue("newpass123");
  });

  it("calls API with form data on submit", async () => {
    api.post.mockResolvedValue({ data: { token: "new-token" } });
    renderPage();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Reset Code"), {
      target: { value: "ABC123" },
    });
    fireEvent.change(screen.getByPlaceholderText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/reset", {
        email: "user@test.com",
        code: "ABC123",
        newPassword: "password123",
        confirmPassword: "password123",
      });
    });
  });

  it("shows success message on successful reset", async () => {
    api.post.mockResolvedValue({ data: { token: "new-token" } });
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("✅ Password reset successful!");
    });
  });

  it("sets token on success", async () => {
    api.post.mockResolvedValue({ data: { token: "new-auth-token" } });
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith("new-auth-token");
    });
  });

  it("navigates to /profile/info on success", async () => {
    api.post.mockResolvedValue({ data: { token: "token" } });
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/profile/info");
    });
  });

  it("shows error message on API failure", async () => {
    api.post.mockRejectedValue({
      response: { data: { error: "Invalid reset code" } },
    });
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Invalid reset code");
    });
  });

  it("shows default error message when no error in response", async () => {
    api.post.mockRejectedValue({});
    renderPage();
    
    fireEvent.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("❌ Reset failed");
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

  it("password inputs have type password", () => {
    renderPage();
    const newPassword = screen.getByPlaceholderText("New Password");
    const confirmPassword = screen.getByPlaceholderText("Confirm New Password");
    expect(newPassword).toHaveAttribute("type", "password");
    expect(confirmPassword).toHaveAttribute("type", "password");
  });
});
