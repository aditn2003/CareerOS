/**
 * InfoTab Page Tests - Target: High Coverage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InfoTab from "../Profile/InfoTab";
import { ProfileProvider } from "../../contexts/ProfileContext";
import { AuthProvider } from "../../contexts/AuthContext";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock child components
vi.mock("../../components/LinkedInProfileOptimization", () => ({
  default: () => (
    <div data-testid="linkedin-optimization">LinkedIn Optimization</div>
  ),
}));

vi.mock("../../components/LinkedInMessageTemplates", () => ({
  default: () => <div data-testid="linkedin-templates">LinkedIn Templates</div>,
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("InfoTab", () => {
  const mockProfile = {
    full_name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    location: "New York",
    title: "Software Engineer",
    bio: "Test bio",
    picture_url: "/uploads/test.jpg",
  };

  const mockToken = "mock-token";

  const renderWithProviders = (profile = mockProfile) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <ProfileProvider>
            <InfoTab />
          </ProfileProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return null;
      return null;
    });
    api.get.mockResolvedValue({ data: { profile: mockProfile } });
    api.post.mockResolvedValue({
      data: { url: "https://example.com/image.jpg" },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("shows loading state when profile is null", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(null);
    expect(screen.getByText(/Loading profile/i)).toBeInTheDocument();
  });

  it("renders profile header with name and title", async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText(/📍 New York/i)).toBeInTheDocument();
    });
  });

  it("renders profile picture", async () => {
    renderWithProviders();
    await waitFor(() => {
      const img = screen.getByAltText("Profile");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/uploads/test.jpg");
    });
  });

  it("renders all form fields", async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123-456-7890")).toBeInTheDocument();
      expect(screen.getByDisplayValue("New York")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test bio")).toBeInTheDocument();
    });
  });

  it("pre-fills form fields with profile data", async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123-456-7890")).toBeInTheDocument();
      expect(screen.getByDisplayValue("New York")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test bio")).toBeInTheDocument();
    });
  });

  it("updates profile when form fields change", async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("John Doe");
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    });
  });

  it("updates other contact fields when form inputs change", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    });

    const emailInput = screen.getByDisplayValue("john@example.com");
    const phoneInput = screen.getByDisplayValue("123-456-7890");
    const locationInput = screen.getByDisplayValue("New York");
    const titleInput = screen.getByDisplayValue("Software Engineer");
    const bioInput = screen.getByDisplayValue("Test bio");

    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "999-999-9999" } });
    fireEvent.change(locationInput, { target: { value: "San Francisco" } });
    fireEvent.change(titleInput, { target: { value: "Senior Engineer" } });
    fireEvent.change(bioInput, { target: { value: "Updated bio" } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("new@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("999-999-9999")).toBeInTheDocument();
      expect(screen.getByDisplayValue("San Francisco")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Senior Engineer")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Updated bio")).toBeInTheDocument();
    });
  });

  it("saves profile on Save Changes click", async () => {
    const mockSaveProfile = vi.fn().mockResolvedValue({});
    // We need to mock the ProfileContext's saveProfile
    // Since we can't easily inject it, we'll test the API call instead
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Save Changes/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Profile saved!");
    });
  });

  it("resets profile on Reset click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Reset/i)).toBeInTheDocument();
    });

    const resetButton = screen.getByText(/Reset/i);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/profile", expect.any(Object));
    });
  });

  it("shows LinkedIn banner when LinkedIn profile exists", async () => {
    const linkedInProfile = {
      first_name: "John",
      last_name: "Doe",
      email: "john@linkedin.com",
      profile_pic_url: "https://linkedin.com/pic.jpg",
    };
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return JSON.stringify(linkedInProfile);
      return null;
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/LinkedIn Connected/i)).toBeInTheDocument();
      expect(screen.getByText(/john@linkedin.com/i)).toBeInTheDocument();
    });
  });

  it("syncs LinkedIn profile data on Sync click", async () => {
    const linkedInProfile = {
      first_name: "John",
      last_name: "Doe",
      email: "john@linkedin.com",
      profile_pic_url: "https://linkedin.com/pic.jpg",
    };
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return JSON.stringify(linkedInProfile);
      return null;
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Sync/i)).toBeInTheDocument();
    });

    const syncButton = screen.getByText(/Sync/i);
    fireEvent.click(syncButton);

    // Profile should be updated with LinkedIn data
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });
  });

  it("disconnects LinkedIn on Disconnect click", async () => {
    const linkedInProfile = {
      first_name: "John",
      last_name: "Doe",
      email: "john@linkedin.com",
      profile_pic_url: "https://linkedin.com/pic.jpg",
    };
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return JSON.stringify(linkedInProfile);
      return null;
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Disconnect/i)).toBeInTheDocument();
    });

    const disconnectButton = screen.getByText(/Disconnect/i);
    fireEvent.click(disconnectButton);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("linkedinProfile");
  });

  it("allows file selection for profile picture", async () => {
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(screen.getByText(/Photo ready/i)).toBeInTheDocument();
    });
  });

  it("shows upload button when file is selected", async () => {
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });
  });

  it("uploads profile picture on Upload click", async () => {
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/Upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/upload-profile-pic",
        expect.any(FormData),
        expect.any(Object)
      );
      expect(api.post).toHaveBeenCalledWith(
        "/api/profile/picture",
        expect.objectContaining({ url: "https://example.com/image.jpg" }),
        expect.any(Object)
      );
    });
  });

  it("shows upload progress while uploading profile picture", async () => {
    // Mock first upload call to report progress
    api.post.mockImplementationOnce((url, formData, config) => {
      if (
        url === "/api/upload-profile-pic" &&
        config &&
        config.onUploadProgress
      ) {
        config.onUploadProgress({ loaded: 50, total: 100 });
      }
      // Never resolve to keep uploading=true during assertion
      return new Promise(() => {});
    });

    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/Upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  it("validates file size before upload", async () => {
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    // Create a file larger than 5MB
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      "large.jpg",
      {
        type: "image/jpeg",
      }
    );
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/Upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Max file size is 5MB.");
    });
  });

  it("cancels file selection on Cancel click", async () => {
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  it("toggles LinkedIn tools visibility", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/LinkedIn Tools/i)).toBeInTheDocument();
    });

    const toggleButton = screen.getByText(/LinkedIn Tools/i).closest("button");
    expect(toggleButton).toBeInTheDocument();

    // Tools should not be visible initially
    expect(
      screen.queryByTestId("linkedin-optimization")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("linkedin-templates")).not.toBeInTheDocument();

    // Click to show tools
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId("linkedin-optimization")).toBeInTheDocument();
      expect(screen.getByTestId("linkedin-templates")).toBeInTheDocument();
    });

    // Click again to hide tools
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId("linkedin-optimization")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("linkedin-templates")
      ).not.toBeInTheDocument();
    });
  });

  it("handles upload error gracefully", async () => {
    api.post.mockRejectedValueOnce(new Error("Upload failed"));
    renderWithProviders();

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/Upload/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Upload failed");
    });
  });

  it("handles save profile error gracefully", async () => {
    // Mock saveProfile to fail
    api.post.mockRejectedValueOnce(new Error("Save failed"));
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Save Changes/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to save profile");
    });
  });

  it("uses LinkedIn profile picture when available", async () => {
    const linkedInProfile = {
      first_name: "John",
      last_name: "Doe",
      email: "john@linkedin.com",
      profile_pic_url: "https://linkedin.com/pic.jpg",
    };
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return JSON.stringify(linkedInProfile);
      return null;
    });

    const profileWithoutPic = { ...mockProfile, picture_url: null };
    api.get.mockResolvedValue({ data: { profile: profileWithoutPic } });

    renderWithProviders(profileWithoutPic);

    await waitFor(() => {
      const img = screen.getByAltText("Profile");
      expect(img).toHaveAttribute("src", "https://linkedin.com/pic.jpg");
    });
  });

  it("auto-fills profile fields from stored LinkedIn profile when empty", async () => {
    const linkedInProfile = {
      first_name: "John",
      last_name: "Doe",
      email: "john@linkedin.com",
      profile_pic_url: "https://linkedin.com/pic.jpg",
    };

    const emptyProfile = {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      title: "",
      bio: "",
      picture_url: null,
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === "token") return mockToken;
      if (key === "linkedinProfile") return JSON.stringify(linkedInProfile);
      return null;
    });
    api.get.mockResolvedValue({ data: { profile: emptyProfile } });

    renderWithProviders(emptyProfile);

    await waitFor(
      () => {
        expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        expect(
          screen.getByDisplayValue("john@linkedin.com")
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("uses default avatar when no picture available", async () => {
    const profileWithoutPic = { ...mockProfile, picture_url: null };
    api.get.mockResolvedValue({ data: { profile: profileWithoutPic } });
    localStorageMock.getItem.mockReturnValue(mockToken);

    renderWithProviders(profileWithoutPic);

    await waitFor(() => {
      const img = screen.getByAltText("Profile");
      expect(img).toHaveAttribute("src", "/uploads/default-avatar.png");
    });
  });
});
