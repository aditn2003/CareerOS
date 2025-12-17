/**
 * Register Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import Register from "../Register";

describe("Register Page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders registration form", () => {
    renderWithProviders(<Register />);
    
    // "Create Account" appears in both heading and button, use getByRole
    expect(screen.getByRole("heading", { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Start your career journey/i)).toBeInTheDocument();
  });

  it("renders first name input", () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/First name/i);
    expect(firstNameInput).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute("placeholder", "John");
  });

  it("renders last name input", () => {
    renderWithProviders(<Register />);
    
    const lastNameInput = screen.getByLabelText(/Last name/i);
    expect(lastNameInput).toBeInTheDocument();
    expect(lastNameInput).toHaveAttribute("placeholder", "Doe");
  });

  it("renders email input", () => {
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/Email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("renders password input", () => {
    renderWithProviders(<Register />);
    
    // Find by aria-label since there are multiple password fields
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toBeInTheDocument();
  });

  it("renders confirm password input", () => {
    renderWithProviders(<Register />);
    
    const confirmInput = screen.getByLabelText(/Confirm password/i);
    expect(confirmInput).toBeInTheDocument();
  });

  it("renders account type selector", () => {
    renderWithProviders(<Register />);
    
    const accountType = screen.getByLabelText(/Account type/i);
    expect(accountType).toBeInTheDocument();
  });

  it("renders account type options", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByRole("option", { name: /Job Seeker/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Team Mentor/i })).toBeInTheDocument();
  });

  it("renders create account button", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });
});

describe("Register Form Interactions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates first name on input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/First name/i);
    await user.type(input, "John");
    
    expect(input).toHaveValue("John");
  });

  it("updates last name on input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/Last name/i);
    await user.type(input, "Doe");
    
    expect(input).toHaveValue("Doe");
  });

  it("updates email on input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/Email address/i);
    await user.type(input, "john@example.com");
    
    expect(input).toHaveValue("john@example.com");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const toggleButtons = screen.getAllByRole("button");
    
    // Find password toggle button (not the submit buttons)
    const toggleButton = toggleButtons.find(btn => 
      btn.className?.includes("password-toggle")
    );
    
    expect(passwordInput).toHaveAttribute("type", "password");
    
    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  it("changes account type selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const accountType = screen.getByLabelText(/Account type/i);
    await user.selectOptions(accountType, "mentor");
    
    expect(accountType).toHaveValue("mentor");
  });
});

describe("Register Password Validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows password strength indicator", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, "Test1234!");
    
    // Check that strength indicator appears
    await waitFor(() => {
      const strengthIndicator = document.querySelector(".password-strength");
      expect(strengthIndicator).toBeInTheDocument();
    });
  });

  it("shows weak password indicator for short passwords", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, "abc");
    
    await waitFor(() => {
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });
  });

  it("shows password too short error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, "short");
    
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("shows passwords match indicator", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm password/i);
    
    await user.type(passwordInput, "TestPassword123!");
    await user.type(confirmInput, "TestPassword123!");
    
    await waitFor(() => {
      expect(screen.getByText(/Passwords match!/i)).toBeInTheDocument();
    });
  });

  it("shows passwords don't match error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm password/i);
    
    await user.type(passwordInput, "TestPassword123!");
    await user.type(confirmInput, "DifferentPassword");
    
    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });
  });
});

describe("Register Email Validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, "invalid-email");
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it("accepts valid email format", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, "valid@example.com");
    
    expect(screen.queryByText(/Please enter a valid email address/i)).not.toBeInTheDocument();
  });
});

describe("Register Legal", () => {
  it("renders terms of service link", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("renders privacy policy link", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("shows legal agreement text", () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText(/By creating an account, you agree to our/i)).toBeInTheDocument();
  });
});

describe("Register Accessibility", () => {
  it("has accessible first name input", () => {
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/First name/i);
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("has accessible last name input", () => {
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/Last name/i);
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("has accessible email input", () => {
    renderWithProviders(<Register />);
    
    const input = screen.getByLabelText(/Email address/i);
    expect(input).toHaveAttribute("aria-required", "true");
  });
});

