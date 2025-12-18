/**
 * Resume Page Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Resume from "../Resume/Resume";
import { api } from "../../api";

// Mock api
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock child components
vi.mock("../../components/ResumeTemplateChooser", () => ({
  default: ({ onTemplateSelect }) => (
    <div data-testid="template-chooser">
      <button onClick={() => onTemplateSelect({ id: 1, name: "Modern" })}>
        Select Template
      </button>
    </div>
  ),
}));

vi.mock("../../components/FileUpload", () => ({
  default: ({ onUploadSuccess }) => (
    <div data-testid="file-upload">
      <button onClick={() => onUploadSuccess({ id: 1 })}>
        Upload Complete
      </button>
    </div>
  ),
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

describe("Resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { resumes: [] } });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Resume />
      </MemoryRouter>
    );
  };

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText(/Resume Builder/)).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    renderPage();
    expect(screen.getByText(/Choose a template below/i)).toBeInTheDocument();
  });

  it("renders upload button", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /Upload Resume/i })
    ).toBeInTheDocument();
  });

  it("renders template chooser", () => {
    renderPage();
    expect(screen.getByTestId("template-chooser")).toBeInTheDocument();
  });

  it("fetches resumes on mount", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/resumes");
    });
  });

  it("toggles upload section when button clicked", () => {
    renderPage();
    const button = screen.getByRole("button", { name: /Upload Resume/i });
    fireEvent.click(button);
    expect(screen.getByTestId("file-upload")).toBeInTheDocument();
  });

  it("shows cancel button when upload is shown", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Upload Resume/i }));
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("hides upload when cancel clicked", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Upload Resume/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByTestId("file-upload")).not.toBeInTheDocument();
  });

  it("navigates to editor when template selected", () => {
    renderPage();
    fireEvent.click(screen.getByText("Select Template"));
    expect(mockNavigate).toHaveBeenCalledWith("/resume/editor", {
      state: { template: { id: 1, name: "Modern" } },
    });
  });

  it("reloads resumes after upload success", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Upload Resume/i }));
    fireEvent.click(screen.getByText("Upload Complete"));

    await waitFor(() => {
      // Should have been called twice: once on mount, once after upload
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("hides upload section after successful upload", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Upload Resume/i }));
    expect(screen.getByTestId("file-upload")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Upload Complete"));

    await waitFor(() => {
      expect(screen.queryByTestId("file-upload")).not.toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockRejectedValue(new Error("Failed"));

    renderPage();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("has correct CSS class", () => {
    renderPage();
    expect(document.querySelector(".resume-page")).toBeInTheDocument();
  });
});
