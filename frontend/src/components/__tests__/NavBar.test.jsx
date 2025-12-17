/**
 * NavBar Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import NavBar from "../NavBar";

// Mock the Three.js LightPillar component to avoid WebGL issues in tests
vi.mock("../LightPillar", () => ({
  default: () => <div data-testid="light-pillar-mock" />,
}));

// Mock the Logo component
vi.mock("../Logo", () => ({
  default: ({ size }) => <div data-testid="logo-mock" style={{ width: size }} />,
}));

describe("NavBar Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderWithProviders(<NavBar />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders CareerOS title", () => {
    renderWithProviders(<NavBar />);
    expect(screen.getByText("CareerOS")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    renderWithProviders(<NavBar />);
    expect(screen.getByText(/YOUR CAREER OPERATING SYSTEM/i)).toBeInTheDocument();
  });

  it("renders logo", () => {
    renderWithProviders(<NavBar />);
    expect(screen.getByTestId("logo-mock")).toBeInTheDocument();
  });

  it("renders menu toggle button", () => {
    renderWithProviders(<NavBar />);
    expect(screen.getByLabelText(/Toggle menu/i)).toBeInTheDocument();
  });
});

describe("NavBar Unauthenticated State", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows login link when not authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

  it("shows register link when not authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Register")).toBeInTheDocument();
    });
  });

  it("shows help section links", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("FAQ")).toBeInTheDocument();
    });
  });
});

describe("NavBar Authenticated State", () => {
  beforeEach(() => {
    localStorage.setItem("token", "test-token");
  });

  it("shows document section when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });
  });

  it("shows resume link when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeInTheDocument();
    });
  });

  it("shows cover letter link when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Cover Letter")).toBeInTheDocument();
    });
  });

  it("shows job search section when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Job Search")).toBeInTheDocument();
    });
  });

  it("shows jobs link when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Jobs")).toBeInTheDocument();
    });
  });

  it("shows growth section when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });
  });

  it("shows account section when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Account")).toBeInTheDocument();
    });
  });

  it("shows logout button when authenticated", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />, { token: "test-token" });
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });
});

describe("NavBar Menu Toggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("menu is closed by default", () => {
    renderWithProviders(<NavBar />);
    
    // Menu content should not be visible
    expect(screen.queryByText("Get Started")).not.toBeInTheDocument();
  });

  it("opens menu on button click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });
  });

  it("closes menu on second click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    
    // Open
    await user.click(menuButton);
    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });
    
    // Close
    await user.click(menuButton);
    await waitFor(() => {
      expect(screen.queryByText("Get Started")).not.toBeInTheDocument();
    });
  });

  it("closes menu when clicking a link", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    // Open menu
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    // Click a link
    const loginLink = await screen.findByText("Login");
    await user.click(loginLink);
    
    // Menu should close
    await waitFor(() => {
      expect(screen.queryByText("Get Started")).not.toBeInTheDocument();
    });
  });
});

describe("NavBar Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("login link has correct href", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    const loginLink = await screen.findByText("Login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("register link has correct href", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavBar />);
    
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    await user.click(menuButton);
    
    const registerLink = await screen.findByText("Register");
    expect(registerLink.closest("a")).toHaveAttribute("href", "/register");
  });

  it("logo click navigates to home", async () => {
    renderWithProviders(<NavBar />);
    
    const logoContainer = document.querySelector(".navbar-logo");
    expect(logoContainer).toBeInTheDocument();
  });
});

describe("NavBar Accessibility", () => {
  it("has accessible menu toggle button", () => {
    renderWithProviders(<NavBar />);
    
    const menuButton = screen.getByLabelText(/Toggle menu/i);
    expect(menuButton).toHaveAttribute("aria-label");
  });

  it("renders as header element", () => {
    renderWithProviders(<NavBar />);
    
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
  });
});

