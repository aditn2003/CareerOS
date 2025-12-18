/**
 * CertificationSection Component Tests - Target: 90%+ Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import CertificationSection from "../CertificationSection";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    defaults: {
      baseURL: "http://localhost:5000",
    },
  },
}));

// Mock CertificationForm to simplify testing
vi.mock("../CertificationForm", () => ({
  default: ({ cert, onCancel, onSaved }) => (
    <div data-testid="certification-form">
      <span>Form: {cert?.name || "New"}</span>
      <button onClick={onCancel}>Cancel Form</button>
      <button onClick={onSaved}>Save Form</button>
    </div>
  ),
}));

import { api } from "../../api";

describe("CertificationSection", () => {
  const mockToken = "test-token";

  const mockCertifications = [
    {
      id: 1,
      name: "AWS Solutions Architect",
      organization: "AWS",
      category: "Cloud",
      cert_number: "AWS-123456",
      date_earned: "2023-01-15",
      expiration_date: "2026-01-15",
      does_not_expire: false,
      verification_url: "https://aws.com/verify/123",
      description: "Cloud architecture certification",
      achievements: "Passed on first attempt",
      verified: true,
      scores: {
        score: 95,
        percentile: 90,
        skills_assessed: ["EC2", "S3", "Lambda"],
      },
    },
    {
      id: 2,
      name: "Google Cloud Professional",
      organization: "Google Cloud",
      category: "Cloud",
      cert_number: "GCP-789",
      date_earned: "2022-06-20",
      expiration_date: null,
      does_not_expire: true,
      verification_url: null,
      description: null,
      achievements: null,
      verified: false,
      scores: null,
      renewal_reminder: "2025-06-01",
    },
    {
      id: 3,
      name: "CompTIA Security+",
      organization: "CompTIA",
      category: "Security",
      cert_number: "SEC-456",
      date_earned: "2021-03-10",
      does_not_expire: false,
      verified: true,
      badge_url: "/uploads/security-badge.png",
    },
    {
      id: 4,
      name: "PDF Certificate",
      organization: "Test Org",
      category: "Technical",
      date_earned: "2020-01-01",
      badge_url: "/uploads/cert.pdf",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { certifications: mockCertifications } });
  });

  describe("Loading State", () => {
    it("loads certifications on mount when token is provided", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith("/api/certifications", {
          headers: { Authorization: `Bearer ${mockToken}` },
        });
      });
    });

    it("does not load certifications when token is not provided", async () => {
      render(<CertificationSection token={null} />);

      await waitFor(
        () => {
          expect(api.get).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no certifications", async () => {
      api.get.mockResolvedValueOnce({ data: { certifications: [] } });

      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(
          screen.getByText(/No certifications found/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Certification List", () => {
    it("displays certification names", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
        expect(
          screen.getByText("Google Cloud Professional")
        ).toBeInTheDocument();
        expect(screen.getByText("CompTIA Security+")).toBeInTheDocument();
      });
    });

    it("displays organization names", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS")).toBeInTheDocument();
        expect(screen.getByText("Google Cloud")).toBeInTheDocument();
        expect(screen.getByText("CompTIA")).toBeInTheDocument();
      });
    });

    it("groups certifications by category", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        // Cloud category should be visible as a header (it has certifications)
        // It appears both in the dropdown and as an h4, so check for the header specifically
        const cloudElements = screen.getAllByText("Cloud");
        expect(cloudElements.length).toBeGreaterThan(0);
        // Verify at least one is an h4 header (category section)
        const headers = cloudElements.filter((el) => el.tagName === "H4");
        expect(headers.length).toBeGreaterThan(0);
      });
    });

    it("displays earned date", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        // Date formatting may vary based on timezone, check for date pattern
        expect(screen.getByText(/January.*2023/i)).toBeInTheDocument();
      });
    });

    it("displays expiration date when applicable", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Expires:/i)).toBeInTheDocument();
      });
    });

    it("shows does not expire indicator", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Does not expire/i)).toBeInTheDocument();
      });
    });

    it("displays certification number when available", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/AWS-123456/i)).toBeInTheDocument();
      });
    });

    it("displays scores when available", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Assessment Scores/i)).toBeInTheDocument();
        expect(screen.getByText(/Score:/i)).toBeInTheDocument();
        expect(screen.getByText("95")).toBeInTheDocument();
      });
    });

    it("displays achievements when available", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Achievements:/i)).toBeInTheDocument();
        expect(screen.getByText("Passed on first attempt")).toBeInTheDocument();
      });
    });

    it("displays description when available", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(
          screen.getByText("Cloud architecture certification")
        ).toBeInTheDocument();
      });
    });

    it("displays verification link when URL available", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Verify Certification/i)).toBeInTheDocument();
      });
    });

    it("shows verified status", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Verified/i).length).toBeGreaterThan(0);
      });
    });

    it("shows pending verification status", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        const pendingElements = screen.getAllByText(/Pending Verification/i);
        expect(pendingElements.length).toBeGreaterThan(0);
      });
    });

    it("displays renewal reminder when set", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Renewal reminder/i)).toBeInTheDocument();
      });
    });
  });

  describe("Search and Filter", () => {
    it("renders search input", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Search by name or organization/i)
        ).toBeInTheDocument();
      });
    });

    it("filters certifications by search term", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        /Search by name or organization/i
      );
      fireEvent.change(searchInput, { target: { value: "CompTIA" } });

      await waitFor(() => {
        expect(screen.getByText("CompTIA Security+")).toBeInTheDocument();
        expect(
          screen.queryByText("AWS Solutions Architect")
        ).not.toBeInTheDocument();
      });
    });

    it("renders category filter", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
      });
    });

    it("filters by category", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      });

      const categorySelect = screen.getByRole("combobox");
      fireEvent.change(categorySelect, { target: { value: "Security" } });

      await waitFor(() => {
        expect(screen.getByText("CompTIA Security+")).toBeInTheDocument();
        expect(
          screen.queryByText("AWS Solutions Architect")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Add Certification", () => {
    it("renders add certification button", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Add Certification/i)).toBeInTheDocument();
      });
    });

    it("shows certification form when add button clicked", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Add Certification/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Add Certification/i));

      expect(screen.getByTestId("certification-form")).toBeInTheDocument();
    });

    it("hides form when cancel is clicked", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/Add Certification/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Add Certification/i));
      expect(screen.getByTestId("certification-form")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel Form"));
      expect(
        screen.queryByTestId("certification-form")
      ).not.toBeInTheDocument();
    });

    it("reloads certifications after save", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByText(/Add Certification/i));
      fireEvent.click(screen.getByText("Save Form"));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Edit Certification", () => {
    it("shows form with certification data when edit clicked", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText(/Edit/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("certification-form")).toBeInTheDocument();
      expect(
        screen.getByText(/Form: AWS Solutions Architect/i)
      ).toBeInTheDocument();
    });
  });

  describe("Delete Certification", () => {
    it("confirms before deleting", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/Delete/i);
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith("Delete this certification?");
      expect(api.delete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it("calls api.delete when confirmed", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      api.delete.mockResolvedValueOnce({});

      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/Delete/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith("/api/certifications/1", {
          headers: { Authorization: `Bearer ${mockToken}` },
        });
      });

      confirmSpy.mockRestore();
    });

    it("reloads certifications after delete", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      api.delete.mockResolvedValueOnce({});

      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      const deleteButtons = screen.getAllByText(/Delete/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });

      confirmSpy.mockRestore();
    });
  });

  describe("Certificate Display", () => {
    it("displays image certificates", async () => {
      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        const images = document.querySelectorAll("img");
        expect(images.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("handles API error gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      api.get.mockRejectedValueOnce(new Error("Network error"));

      render(<CertificationSection token={mockToken} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
