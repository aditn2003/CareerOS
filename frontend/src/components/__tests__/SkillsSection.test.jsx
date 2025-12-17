/**
 * SkillsSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import SkillsSection from "../SkillsSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock URL.createObjectURL for CSV export
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");

describe("SkillsSection", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { skills: [] } });
  });

  it("renders without crashing", async () => {
    render(<SkillsSection token={mockToken} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("shows empty state when no skills", async () => {
    api.get.mockResolvedValueOnce({ data: { skills: [] } });
    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("No skills yet.")).toBeInTheDocument();
    });
  });

  it("displays skills grouped by category", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
          {
            id: 2,
            name: "Communication",
            category: "Soft Skills",
            proficiency: "Advanced",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      // Category headers - using getAllByText for categories that appear in select options too
      expect(screen.getAllByText("Technical").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Soft Skills").length).toBeGreaterThan(0);
      // Skill names
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByText("Communication")).toBeInTheDocument();
    });
  });

  it("displays statistics when skills exist", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
          {
            id: 2,
            name: "Python",
            category: "Technical",
            proficiency: "Advanced",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Total Skills")).toBeInTheDocument();
      expect(screen.getByText("Expert Level")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Avg Proficiency")).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search skills...")
      ).toBeInTheDocument();
    });
  });

  it("filters skills by search", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
          {
            id: 2,
            name: "Python",
            category: "Technical",
            proficiency: "Advanced",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search skills..."), {
      target: { value: "java" },
    });

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });

  it("renders export button", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Export Skills/i)).toBeInTheDocument();
    });
  });

  it("displays proficiency badge", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      // Expert appears both as badge and in select option
      expect(screen.getAllByText("Expert").length).toBeGreaterThan(0);
    });
  });

  it("renders proficiency select for each skill", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Beginner")).toBeInTheDocument();
      expect(screen.getByText("Intermediate")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });
  });

  it("renders category select for each skill", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Soft Skills")).toBeInTheDocument();
      expect(screen.getByText("Languages")).toBeInTheDocument();
      expect(screen.getByText("Industry-Specific")).toBeInTheDocument();
    });
  });

  it("renders delete button for each skill", async () => {
    api.get.mockResolvedValue({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });
  });

  it("calls delete API when confirmed", async () => {
    api.get.mockResolvedValue({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/skills/1", expect.any(Object));
    });
  });

  it("updates proficiency when select changed", async () => {
    api.get.mockResolvedValue({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
        ],
      },
    });
    api.put.mockResolvedValueOnce({});

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
    });

    const selects = document.querySelectorAll(".skills-select");
    fireEvent.change(selects[0], { target: { value: "Advanced" } });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/skills/1",
        { proficiency: "Advanced" },
        expect.any(Object)
      );
    });
  });

  it("displays category count", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        skills: [
          {
            id: 1,
            name: "JavaScript",
            category: "Technical",
            proficiency: "Expert",
          },
          {
            id: 2,
            name: "TypeScript",
            category: "Technical",
            proficiency: "Advanced",
          },
        ],
      },
    });

    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      // Should show count of 2 in both stats and category header
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });
  });

  it("fetches skills on mount", async () => {
    render(<SkillsSection token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/skills", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
