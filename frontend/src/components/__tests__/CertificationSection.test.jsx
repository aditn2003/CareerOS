/**
 * CertificationSection Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "../../__tests__/helpers/test-utils";
import CertificationSection from "../CertificationSection";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    defaults: { baseURL: "http://localhost:4000" },
  },
}));

describe("CertificationSection", () => {
  const mockToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { certifications: [] } });
  });

  it("renders without crashing", async () => {
    render(<CertificationSection token={mockToken} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it("shows empty state when no certifications", async () => {
    api.get.mockResolvedValueOnce({ data: { certifications: [] } });
    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/No certifications found/i)).toBeInTheDocument();
    });
  });

  it("shows Add Certification button", async () => {
    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Certification/i })
      ).toBeInTheDocument();
    });
  });

  it("shows form when Add Certification clicked", async () => {
    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Certification/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Certification/i }));

    expect(screen.getByText("Add Certification")).toBeInTheDocument();
  });

  it("displays certifications grouped by category", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
          {
            id: 2,
            name: "Security+",
            organization: "CompTIA",
            category: "Security",
            date_earned: "2024-02-20",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      // Categories appear both as headings and in filter dropdown
      expect(screen.getAllByText("Cloud").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Security").length).toBeGreaterThan(0);
      expect(screen.getByText("AWS Certified")).toBeInTheDocument();
      expect(screen.getByText("Security+")).toBeInTheDocument();
    });
  });

  it("displays certification details", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Solutions Architect",
            organization: "Amazon Web Services",
            category: "Cloud",
            date_earned: "2024-01-15",
            cert_number: "ABC123",
            verified: true,
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      expect(screen.getByText("Amazon Web Services")).toBeInTheDocument();
      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText("✅ Verified")).toBeInTheDocument();
    });
  });

  it("displays pending verification status", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
            verified: false,
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("⏳ Pending Verification")).toBeInTheDocument();
    });
  });

  it("displays does not expire indicator", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
            does_not_expire: true,
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("✓ Does not expire")).toBeInTheDocument();
    });
  });

  it("renders search input when certifications exist", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Search by name or organization/i)
      ).toBeInTheDocument();
    });
  });

  it("filters certifications by search", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
          {
            id: 2,
            name: "Azure Expert",
            organization: "Microsoft",
            category: "Cloud",
            date_earned: "2024-02-20",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("AWS Certified")).toBeInTheDocument();
      expect(screen.getByText("Azure Expert")).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(/Search by name or organization/i),
      {
        target: { value: "AWS" },
      }
    );

    expect(screen.getByText("AWS Certified")).toBeInTheDocument();
    expect(screen.queryByText("Azure Expert")).not.toBeInTheDocument();
  });

  it("renders Edit button for each certification", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });
  });

  it("renders Delete button for each certification", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });
  });

  it("calls delete API when confirmed", async () => {
    api.get.mockResolvedValue({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
          },
        ],
      },
    });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        "/api/certifications/1",
        expect.any(Object)
      );
    });
  });

  it("displays scores when present", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
            scores: {
              score: 95,
              percentile: 87,
              skills_assessed: ["AWS", "Cloud Architecture"],
            },
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Assessment Scores:")).toBeInTheDocument();
      expect(screen.getByText("95")).toBeInTheDocument();
      expect(screen.getByText("87%")).toBeInTheDocument();
    });
  });

  it("displays verification URL as link", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        certifications: [
          {
            id: 1,
            name: "AWS Certified",
            organization: "Amazon",
            category: "Cloud",
            date_earned: "2024-01-15",
            verification_url: "https://verify.aws.com/cert",
          },
        ],
      },
    });

    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("🔗 Verify Certification →")).toBeInTheDocument();
    });
  });

  it("fetches certifications on mount", async () => {
    render(<CertificationSection token={mockToken} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/certifications", {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });
  });
});
