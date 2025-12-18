/**
 * ProfilePictureUpload Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePictureUpload from "../ProfilePictureUpload";
import { api } from "../../api";

vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ProfilePictureUpload", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { url: "/test-avatar.png" } });
    api.post.mockResolvedValue({ data: { url: "/uploaded-avatar.png" } });
  });

  it("renders component", () => {
    render(<ProfilePictureUpload token={mockToken} />);
    expect(screen.getByText("Profile Picture")).toBeInTheDocument();
  });

  it("renders file input", () => {
    render(<ProfilePictureUpload token={mockToken} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("fetches profile picture on mount", async () => {
    render(<ProfilePictureUpload token={mockToken} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/profile/picture", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });

  it("displays fetched profile picture", async () => {
    api.get.mockResolvedValue({ data: { url: "/my-avatar.png" } });
    render(<ProfilePictureUpload token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute("src", "/my-avatar.png");
    });
  });

  it("displays default avatar on fetch error", async () => {
    api.get.mockRejectedValue(new Error("Not found"));
    render(<ProfilePictureUpload token={mockToken} />);
    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        "/default-avatar.png"
      );
    });
  });

  it("shows error for invalid file type", async () => {
    render(<ProfilePictureUpload token={mockToken} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(["test"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Invalid file type")).toBeInTheDocument();
    });
  });

  it("shows error for file too large", async () => {
    render(<ProfilePictureUpload token={mockToken} />);
    const input = document.querySelector('input[type="file"]');
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      "large.jpg",
      { type: "image/jpeg" }
    );

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText("File too large (max 5MB)")).toBeInTheDocument();
    });
  });

  it("uploads valid image file", async () => {
    render(<ProfilePictureUpload token={mockToken} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/upload-profile-pic",
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "multipart/form-data",
          }),
        })
      );
    });
  });

  it("shows upload failed error on API error", async () => {
    api.post.mockRejectedValueOnce(new Error("Upload failed"));
    render(<ProfilePictureUpload token={mockToken} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(["image"], "photo.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("does nothing when no file selected", async () => {
    render(<ProfilePictureUpload token={mockToken} />);
    const input = document.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [] } });

    expect(api.post).not.toHaveBeenCalledWith(
      "/upload-profile-pic",
      expect.anything(),
      expect.anything()
    );
  });
});
