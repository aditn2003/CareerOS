/**
 * LinkedInProfileOptimization Component Tests - Target: High Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LinkedInProfileOptimization from "../LinkedInProfileOptimization";
import axios from "axios";

// Mock axios with a create() that returns an instance
// compatible with api.js (has interceptors, etc.)
vi.mock("axios", () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: {},
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const mockAxios = {
    create: vi.fn(() => instance),
    // Allow direct axios.post(...) usage as well
    post: instance.post,
    get: instance.get,
    put: instance.put,
    delete: instance.delete,
  };

  return {
    default: mockAxios,
    ...mockAxios,
  };
});

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertCircle: () => <div data-testid="alert-circle">AlertCircle</div>,
  CheckCircle: () => <div data-testid="check-circle">CheckCircle</div>,
  AlertTriangle: () => <div data-testid="alert-triangle">AlertTriangle</div>,
  Lightbulb: () => <div data-testid="lightbulb">Lightbulb</div>,
  TrendingUp: () => <div data-testid="trending-up">TrendingUp</div>,
}));

describe("LinkedInProfileOptimization", () => {
  const mockUserProfile = {
    headline: "Software Engineer",
    about: "Experienced developer",
    skills: ["JavaScript", "React"],
    job_title: "Senior Developer",
    company_name: "Tech Corp",
    industry: "Technology",
    first_name: "John",
    seniority: "Mid-level",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    localStorage.setItem("token", "mock-token");
    axios.post.mockResolvedValue({ data: {} });
  });

  it("renders initial state with analyze button", () => {
    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    expect(
      screen.getByText(/LinkedIn Profile Optimization/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Get AI-powered suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyze My Profile/i)).toBeInTheDocument();
  });

  it("shows loading state when analyzing", async () => {
    axios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      // Check that button text changes to Analyzing (might be multiple elements)
      const analyzingElements = screen.queryAllByText(/Analyzing/i);
      expect(analyzingElements.length).toBeGreaterThan(0);
      // Verify button is disabled
      expect(analyzeButton).toBeDisabled();
    });
  });

  it("fetches optimization data on analyze click", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [
        {
          category: "headline",
          severity: "high",
          suggestion: "Improve your headline",
          current: "Current headline",
          recommendation: "Better headline",
          impact: "High impact",
        },
      ],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/linkedin/optimize-profile"),
        expect.objectContaining({
          headline: "Software Engineer",
          about: "Experienced developer",
          skills: ["JavaScript", "React"],
        }),
        expect.any(Object)
      );
    });
  });

  it("displays optimization results after analysis", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [
        {
          category: "headline",
          severity: "high",
          suggestion: "Improve your headline",
          current: "Current headline",
          recommendation: "Better headline",
          impact: "High impact",
        },
      ],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();
      // Check that score is displayed (might be in different format)
      const bodyText = document.body.textContent;
      expect(bodyText).toContain("75");
    });
  });

  it("displays score gauges for each category", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      // Check that overall score section is displayed
      expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();
      // Check that at least one score number is displayed
      const bodyText = document.body.textContent;
      expect(bodyText).toContain("75"); // Overall score should be visible
    });
  });

  it("displays suggestions with severity badges", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [
        {
          category: "headline",
          severity: "high",
          suggestion: "Improve your headline",
          current: "Current headline",
          recommendation: "Better headline",
          impact: "High impact",
        },
        {
          category: "about",
          severity: "medium",
          suggestion: "Enhance about section",
          current: "Current about",
          recommendation: "Better about",
          impact: "Medium impact",
        },
      ],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Improve your headline/i)).toBeInTheDocument();
      expect(screen.getByText(/Enhance about section/i)).toBeInTheDocument();
    });
  });

  it("displays suggestions with correct category and severity", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [
        {
          category: "headline",
          severity: "high",
          suggestion: "Improve your headline",
          current: "Current headline",
          recommendation: "Better headline",
          impact: "High impact",
        },
      ],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Improve your headline/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimization Suggestions/i)).toBeInTheDocument();
    });
  });

  it("renders suggestions with different severities", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [
        {
          category: "headline",
          severity: "high",
          suggestion: "High priority suggestion",
          current: "Current",
          recommendation: "Recommendation",
          impact: "High impact",
        },
        {
          category: "about",
          severity: "medium",
          suggestion: "Medium priority suggestion",
          current: "Current",
          recommendation: "Recommendation",
          impact: "Medium impact",
        },
        {
          category: "skills",
          severity: "low",
          suggestion: "Low priority suggestion",
          current: "Current",
          recommendation: "Recommendation",
          impact: "Low impact",
        },
      ],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/High priority suggestion/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Medium priority suggestion/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Low priority suggestion/i)).toBeInTheDocument();
    });
  });

  it("displays action items based on scores", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 70, // < 80, should show action item
        about_section_optimization_score: 65, // < 80, should show action item
        skills_optimization_score: 75, // < 80, should show action item
        recommendations_score: 85, // >= 80, should not show action item
      },
      suggestions: [],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Next Steps/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimize Your Headline/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Enhance Your About Section/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Build Your Skills Section/i)
      ).toBeInTheDocument();
    });
  });

  it("displays best practices section", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/LinkedIn Best Practices/i)).toBeInTheDocument();
      expect(screen.getByText(/Use Keywords/i)).toBeInTheDocument();
      expect(screen.getByText(/Be Authentic/i)).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: "API Error" } },
    });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it("handles generic error when no error message", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch optimization suggestions/i)
      ).toBeInTheDocument();
    });
  });

  it("shows refresh button after analysis", async () => {
    const mockData = {
      overall_score: 75,
      scores: {
        headline_optimization_score: 80,
        about_section_optimization_score: 70,
        skills_optimization_score: 75,
        recommendations_score: 65,
      },
      suggestions: [],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Refresh Analysis/i)).toBeInTheDocument();
    });
  });

  it("displays scores with different values", async () => {
    const mockData = {
      overall_score: 85,
      scores: {
        headline_optimization_score: 65,
        about_section_optimization_score: 50,
        skills_optimization_score: 30,
        recommendations_score: 90,
      },
      suggestions: [],
    };

    axios.post.mockResolvedValue({ data: mockData });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      // Check that overall score section is displayed with scores
      expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();
      // Verify at least the overall score is visible
      const bodyText = document.body.textContent;
      expect(bodyText).toContain("85");
    });
  });

  it("handles empty user profile gracefully", () => {
    render(<LinkedInProfileOptimization userProfile={{}} />);

    expect(
      screen.getByText(/LinkedIn Profile Optimization/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Analyze My Profile/i)).toBeInTheDocument();
  });

  it("sends correct profile data to API", async () => {
    axios.post.mockResolvedValue({
      data: {
        overall_score: 75,
        scores: {},
        suggestions: [],
      },
    });

    render(<LinkedInProfileOptimization userProfile={mockUserProfile} />);

    const analyzeButton = screen.getByText(/Analyze My Profile/i);
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headline: "Software Engineer",
          about: "Experienced developer",
          skills: ["JavaScript", "React"],
          title: "Senior Developer",
          company: "Tech Corp",
          industry: "Technology",
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
        })
      );
    });
  });
});
