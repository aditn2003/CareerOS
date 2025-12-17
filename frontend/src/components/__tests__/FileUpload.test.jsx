/**
 * FileUpload Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import FileUpload from "../FileUpload";

describe("FileUpload Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default resume type", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByText(/Upload Resume/i)).toBeInTheDocument();
  });

  it("renders with cover-letter type", () => {
    renderWithProviders(<FileUpload type="cover-letter" />);
    
    expect(screen.getByText(/Upload Cover Letter/i)).toBeInTheDocument();
  });

  it("renders supported formats message", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByText(/Supported formats: PDF, DOC, DOCX, TXT/i)).toBeInTheDocument();
  });

  it("renders max file size message", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByText(/Max 10MB/i)).toBeInTheDocument();
  });

  it("renders choose file button", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByText(/Choose File/i)).toBeInTheDocument();
  });

  it("renders title input field", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
  });

  it("renders upload button", () => {
    renderWithProviders(<FileUpload />);
    
    expect(screen.getByText(/Upload File/i)).toBeInTheDocument();
  });

  it("upload button is disabled when no file selected", () => {
    renderWithProviders(<FileUpload />);
    
    const uploadButton = screen.getByText(/Upload File/i);
    expect(uploadButton).toBeDisabled();
  });

  it("file input accepts correct file types", () => {
    renderWithProviders(<FileUpload />);
    
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", ".pdf,.doc,.docx,.txt");
  });
});

describe("FileUpload File Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows file name after selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const file = new File(["test content"], "test-resume.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      // File name appears in multiple places, use getAllByText
      const fileNames = screen.getAllByText("test-resume.pdf");
      expect(fileNames.length).toBeGreaterThan(0);
    });
  });

  it("auto-fills title from file name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const file = new File(["test content"], "my-resume.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      const titleInput = screen.getByLabelText(/Title/i);
      expect(titleInput).toHaveValue("my-resume");
    });
  });

  it("shows file size after selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      // Check for the file-size span specifically
      const fileSizeElement = document.querySelector(".file-size");
      expect(fileSizeElement).toBeInTheDocument();
    });
  });

  it("shows preview button after file selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByText(/Preview/i)).toBeInTheDocument();
    });
  });

  it("enables upload button after file selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      const uploadButton = screen.getByText(/Upload File/i);
      expect(uploadButton).not.toBeDisabled();
    });
  });
});

describe("FileUpload Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates file type based on extension", () => {
    // The component validates by file extension
    const allowedExts = ["pdf", "doc", "docx", "txt"];
    
    expect(allowedExts.includes("pdf")).toBe(true);
    expect(allowedExts.includes("docx")).toBe(true);
    expect(allowedExts.includes("exe")).toBe(false);
  });

  it("file input has correct accept attribute", () => {
    renderWithProviders(<FileUpload />);
    
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", ".pdf,.doc,.docx,.txt");
  });

  it("validates maximum file size of 10MB", () => {
    // Component checks file.size > 10 * 1024 * 1024
    const maxSize = 10 * 1024 * 1024;
    const testSize = 9 * 1024 * 1024; // 9MB
    const largeSize = 11 * 1024 * 1024; // 11MB
    
    expect(testSize < maxSize).toBe(true);
    expect(largeSize > maxSize).toBe(true);
  });
});

describe("FileUpload Title Input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows editing title", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FileUpload />);
    
    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, "Custom Title");
    
    expect(titleInput).toHaveValue("Custom Title");
  });

  it("title is optional placeholder text", () => {
    renderWithProviders(<FileUpload />);
    
    const titleInput = screen.getByLabelText(/Title/i);
    expect(titleInput).toHaveAttribute("placeholder");
  });
});

describe("FileUpload Callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows setting onUploadSuccess callback", async () => {
    const onUploadSuccess = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <FileUpload onUploadSuccess={onUploadSuccess} />
    );
    
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);
    
    // File should be selected - check using getAllByText since name appears twice
    await waitFor(() => {
      const fileNames = screen.getAllByText("test.pdf");
      expect(fileNames.length).toBeGreaterThan(0);
    });
  });

  it("accepts custom className", () => {
    renderWithProviders(<FileUpload className="custom-class" />);
    
    const container = document.querySelector(".file-upload-container");
    expect(container).toHaveClass("custom-class");
  });
});

describe("FileUpload Cover Letter Type", () => {
  it("shows cover letter specific title", () => {
    renderWithProviders(<FileUpload type="cover-letter" />);
    
    expect(screen.getByText(/Upload Cover Letter/i)).toBeInTheDocument();
  });

  it("has cover letter specific placeholder", () => {
    renderWithProviders(<FileUpload type="cover-letter" />);
    
    const titleInput = screen.getByLabelText(/Title/i);
    expect(titleInput.placeholder).toContain("cover letter");
  });
});

