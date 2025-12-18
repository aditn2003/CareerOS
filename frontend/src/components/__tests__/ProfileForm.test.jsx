/**
 * ProfileForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import ProfileForm from "../ProfileForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ProfileForm", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { profile: null } });
  });

  it("renders without crashing", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByText("Basic Profile Information")).toBeInTheDocument();
  });

  it("renders full name input", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("renders phone input", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
  });

  it("renders location input", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByPlaceholderText("City, State")).toBeInTheDocument();
  });

  it("renders title input", () => {
    render(<ProfileForm token={mockToken} />);
    expect(
      screen.getByPlaceholderText("Professional Headline")
    ).toBeInTheDocument();
  });

  it("renders bio textarea", () => {
    render(<ProfileForm token={mockToken} />);
    expect(
      screen.getByPlaceholderText("Brief bio (max 500 chars)")
    ).toBeInTheDocument();
  });

  it("renders industry select", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByText("Select Industry")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Healthcare")).toBeInTheDocument();
  });

  it("renders experience select", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByText("Select Experience Level")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("Mid")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("updates full name on change", () => {
    render(<ProfileForm token={mockToken} />);
    const input = screen.getByPlaceholderText("Full Name");
    fireEvent.change(input, { target: { value: "John Doe" } });
    expect(input).toHaveValue("John Doe");
  });

  it("updates email on change", () => {
    render(<ProfileForm token={mockToken} />);
    const input = screen.getByPlaceholderText("Email");
    fireEvent.change(input, { target: { value: "john@example.com" } });
    expect(input).toHaveValue("john@example.com");
  });

  it("updates bio and character count", () => {
    render(<ProfileForm token={mockToken} />);
    const textarea = screen.getByPlaceholderText("Brief bio (max 500 chars)");
    fireEvent.change(textarea, { target: { value: "Test bio content" } });
    expect(textarea).toHaveValue("Test bio content");
    expect(screen.getByText("16/500 characters")).toBeInTheDocument();
  });

  it("limits bio to 500 characters", () => {
    render(<ProfileForm token={mockToken} />);
    const textarea = screen.getByPlaceholderText("Brief bio (max 500 chars)");
    const longText = "a".repeat(501);
    fireEvent.change(textarea, { target: { value: longText } });
    // Bio should not update beyond 500 chars
    expect(textarea).toHaveValue("");
  });

  it("loads existing profile on mount", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          phone: "555-1234",
          location: "NYC",
          bio: "Developer",
        },
      },
    });

    render(<ProfileForm token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full Name")).toHaveValue("Jane Doe");
      expect(screen.getByPlaceholderText("Email")).toHaveValue(
        "jane@example.com"
      );
    });
  });

  it("calls api.post on form submit", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<ProfileForm token={mockToken} />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "555-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("City, State"), {
      target: { value: "NYC" },
    });

    // Select industry and experience using document selectors
    const industrySelect = document.querySelector('select[name="industry"]');
    fireEvent.change(industrySelect, { target: { value: "Technology" } });
    const experienceSelect = document.querySelector(
      'select[name="experience"]'
    );
    fireEvent.change(experienceSelect, { target: { value: "Mid" } });

    // Submit form
    const form = document.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/profile",
        expect.objectContaining({
          fullName: "John Doe",
          email: "john@example.com",
        }),
        expect.any(Object)
      );
    });

    alertSpy.mockRestore();
  });

  it("shows success alert after save", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(<ProfileForm token={mockToken} />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "j@e.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "555" },
    });
    fireEvent.change(screen.getByPlaceholderText("City, State"), {
      target: { value: "NY" },
    });

    // Select industry and experience
    const industrySelect = document.querySelector('select[name="industry"]');
    fireEvent.change(industrySelect, { target: { value: "Technology" } });
    const experienceSelect = document.querySelector(
      'select[name="experience"]'
    );
    fireEvent.change(experienceSelect, { target: { value: "Mid" } });

    // Submit form
    const form = document.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Profile saved successfully!");
    });

    alertSpy.mockRestore();
  });

  it("shows error alert on save failure", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(<ProfileForm token={mockToken} />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "j@e.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "555" },
    });
    fireEvent.change(screen.getByPlaceholderText("City, State"), {
      target: { value: "NY" },
    });

    // Select industry and experience
    const industrySelect = document.querySelector('select[name="industry"]');
    fireEvent.change(industrySelect, { target: { value: "Technology" } });
    const experienceSelect = document.querySelector(
      'select[name="experience"]'
    );
    fireEvent.change(experienceSelect, { target: { value: "Mid" } });

    // Submit form
    const form = document.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error saving profile");
    });

    alertSpy.mockRestore();
  });

  it("resets form on cancel", () => {
    render(<ProfileForm token={mockToken} />);

    const input = screen.getByPlaceholderText("Full Name");
    fireEvent.change(input, { target: { value: "Test Name" } });
    expect(input).toHaveValue("Test Name");

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(input).toHaveValue("");
  });

  it("fetches profile on mount", async () => {
    render(<ProfileForm token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/profile", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });

  it("shows character count starting at 0", () => {
    render(<ProfileForm token={mockToken} />);
    expect(screen.getByText("0/500 characters")).toBeInTheDocument();
  });
});
