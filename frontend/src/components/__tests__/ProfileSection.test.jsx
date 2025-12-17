/**
 * ProfileSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import ProfileSection from "../ProfileSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ProfileSection", () => {
  const mockToken = "test-token";
  const mockProfile = {
    full_name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    location: "New York",
    title: "Software Engineer",
    bio: "A passionate developer",
    picture_url: "/uploads/photo.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/api/profile")) {
        return Promise.resolve({ data: { profile: mockProfile } });
      }
      if (url.includes("/api/employment")) {
        return Promise.resolve({ data: { employment: [] } });
      }
      return Promise.resolve({ data: {} });
    });
    api.post.mockResolvedValue({});
  });

  it("renders without crashing", async () => {
    render(<ProfileSection token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByText("My Profile")).toBeInTheDocument();
    });
  });

  it("displays profile data when loaded", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123-456-7890")).toBeInTheDocument();
      expect(screen.getByDisplayValue("New York")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("A passionate developer")
      ).toBeInTheDocument();
    });
  });

  it("renders profile picture", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      const img = screen.getByAltText("Profile");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/uploads/photo.jpg");
    });
  });

  it("renders all input fields with labels", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Full Name *")).toBeInTheDocument();
      expect(screen.getByText("Email *")).toBeInTheDocument();
      expect(screen.getByText("Phone *")).toBeInTheDocument();
      expect(screen.getByText("Location *")).toBeInTheDocument();
      expect(screen.getByText("Professional Title")).toBeInTheDocument();
      expect(screen.getByText(/Bio \(max 500 chars\)/)).toBeInTheDocument();
    });
  });

  it("renders Save button", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  it("calls save API when Save clicked", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockResolvedValueOnce({});

    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/profile",
        expect.objectContaining({
          full_name: "John Doe",
          email: "john@example.com",
        }),
        expect.any(Object)
      );
    });
  });

  it("updates name when input changes", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("John Doe"), {
      target: { value: "Jane Doe" },
    });

    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
  });

  it("updates email when input changes", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("john@example.com"), {
      target: { value: "jane@example.com" },
    });

    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
  });

  it("shows bio character count", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      // "A passionate developer" = 22 chars. Text is split across elements, so check for presence of count
      expect(screen.getByText(/\/500/)).toBeInTheDocument();
    });
  });

  it("renders Profile Picture section", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Profile Picture")).toBeInTheDocument();
    });
  });

  it("renders Replace Picture button", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Replace Picture" })
      ).toBeInTheDocument();
    });
  });

  it("renders Remove button", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove" })
      ).toBeInTheDocument();
    });
  });

  it("shows alert when uploading without file", async () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Replace Picture" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Replace Picture" }));

    expect(alertMock).toHaveBeenCalledWith("Please choose a file first!");
  });

  it("removes picture when Remove clicked", async () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(alertMock).toHaveBeenCalledWith("Profile picture removed");
  });

  it("uses default avatar when no picture_url", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/api/profile")) {
        return Promise.resolve({
          data: {
            profile: { ...mockProfile, picture_url: null },
          },
        });
      }
      if (url.includes("/api/employment")) {
        return Promise.resolve({ data: { employment: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      const img = screen.getByAltText("Profile");
      expect(img).toHaveAttribute("src", "/uploads/default-avatar.png");
    });
  });

  it("includes EmploymentSection component", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Employment History")).toBeInTheDocument();
    });
  });

  it("renders file input for picture upload", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });
  });

  it("fetches profile on mount", async () => {
    render(<ProfileSection token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/profile", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
