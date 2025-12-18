/**
 * ResumeView Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ResumeView from "../Resumeview";

const renderResumeView = (resumeId = "123") => {
  return render(
    <MemoryRouter initialEntries={[`/resume/${resumeId}`]}>
      <Routes>
        <Route path="/resume/:id" element={<ResumeView />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ResumeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", "mock-token");
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("shows loading state initially", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    renderResumeView();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("fetches resume on mount", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({ resume: { title: "My Resume", sections: {} } }),
    });
    renderResumeView("456");
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/resumes/456",
        { headers: { Authorization: "Bearer mock-token" } }
      );
    });
  });

  it("displays resume title after loading", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          resume: { title: "Software Engineer Resume", sections: {} },
        }),
    });
    renderResumeView();
    await waitFor(() => {
      expect(screen.getByText("Software Engineer Resume")).toBeInTheDocument();
    });
  });

  it("displays resume sections as JSON", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          resume: {
            title: "Test Resume",
            sections: { skills: ["JavaScript", "React"] },
          },
        }),
    });
    renderResumeView();
    await waitFor(() => {
      expect(screen.getByText(/JavaScript/)).toBeInTheDocument();
    });
  });

  it("renders Download PDF button", async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ resume: { title: "Test", sections: {} } }),
    });
    renderResumeView();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Download PDF" })
      ).toBeInTheDocument();
    });
  });

  it("downloads PDF when button clicked", async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ resume: { title: "MyResume", sections: {} } }),
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(new Blob(["pdf content"])),
      });

    const mockClick = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const element = createElement(tag);
      if (tag === "a") {
        element.click = mockClick;
      }
      return element;
    });

    renderResumeView();

    await waitFor(() => {
      expect(screen.getByText("MyResume")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
