/**
 * CertificationForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import CertificationForm from "../CertificationForm";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    defaults: { baseURL: "http://localhost:4000" },
  },
}));

describe("CertificationForm", () => {
  const mockToken = "test-token";
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();
  let fetchMock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for file upload
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it("renders without crashing", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Add Certification")).toBeInTheDocument();
  });

  it("renders Edit Certification title when cert prop provided", () => {
    const existingCert = { id: 1, name: "AWS Certified" };
    render(
      <CertificationForm
        token={mockToken}
        cert={existingCert}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Edit Certification")).toBeInTheDocument();
  });

  it("renders certification name input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Certification name/i)).toBeInTheDocument();
  });

  it("renders organization select", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Issuing organization/i)).toBeInTheDocument();
  });

  it("renders category select", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification category/i)
    ).toBeInTheDocument();
  });

  it("renders certification number input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Certification number/i)).toBeInTheDocument();
  });

  it("renders date earned input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Date certification was earned/i)
    ).toBeInTheDocument();
  });

  it("renders does not expire checkbox", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/does not expire/i)).toBeInTheDocument();
  });

  it("renders verification URL input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification verification URL/i)
    ).toBeInTheDocument();
  });

  it("renders verified checkbox", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Mark certification as verified/i)
    ).toBeInTheDocument();
  });

  it("renders file upload input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Upload certification file/i)
    ).toBeInTheDocument();
  });

  it("renders score input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Certification score/i)).toBeInTheDocument();
  });

  it("renders percentile input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification percentile/i)
    ).toBeInTheDocument();
  });

  it("renders skills assessed input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Skills assessed/i)).toBeInTheDocument();
  });

  it("renders achievements textarea", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification achievements/i)
    ).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification description/i)
    ).toBeInTheDocument();
  });

  it("renders renewal reminder input", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification renewal reminder/i)
    ).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates certification name on change", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const input = screen.getByLabelText(/Certification name/i);
    fireEvent.change(input, { target: { value: "AWS Certified Developer" } });
    expect(input).toHaveValue("AWS Certified Developer");
  });

  it("shows expiration date when does not expire is unchecked", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByLabelText(/Certification expiration date/i)
    ).toBeInTheDocument();
  });

  it("hides expiration date when does not expire is checked", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const checkbox = screen.getByLabelText(/does not expire/i);
    fireEvent.click(checkbox);
    expect(
      screen.queryByLabelText(/Certification expiration date/i)
    ).not.toBeInTheDocument();
  });

  it("shows custom organization input when Custom selected", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    const select = screen.getByLabelText(/Issuing organization/i);
    fireEvent.change(select, { target: { value: "Custom" } });
    expect(screen.getByLabelText(/Custom organization/i)).toBeInTheDocument();
  });

  it("pre-fills form when cert prop provided", () => {
    const existingCert = {
      id: 1,
      name: "AWS Solutions Architect",
      organization: "AWS",
      category: "Cloud",
      cert_number: "ABC123",
      date_earned: "2024-01-15",
    };
    render(
      <CertificationForm
        token={mockToken}
        cert={existingCert}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Certification name/i)).toHaveValue(
      "AWS Solutions Architect"
    );
    expect(screen.getByLabelText(/Certification number/i)).toHaveValue(
      "ABC123"
    );
  });

  it("calls api.post for new certification on submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Certification name/i), {
      target: { value: "Test Cert" },
    });
    fireEvent.change(screen.getByLabelText(/Issuing organization/i), {
      target: { value: "AWS" },
    });
    fireEvent.change(screen.getByLabelText(/Date certification was earned/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/certifications",
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls api.put for existing certification on submit", async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });
    const existingCert = {
      id: 1,
      name: "AWS Cert",
      organization: "AWS",
      date_earned: "2024-01-01",
    };

    render(
      <CertificationForm
        token={mockToken}
        cert={existingCert}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/certifications/1",
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      );
    });
  });

  it("calls onSaved after successful submit", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Certification name/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/Issuing organization/i), {
      target: { value: "AWS" },
    });
    fireEvent.change(screen.getByLabelText(/Date certification was earned/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText(/Certification name/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/Issuing organization/i), {
      target: { value: "AWS" },
    });
    fireEvent.change(screen.getByLabelText(/Date certification was earned/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to save certification");
    });

    alertSpy.mockRestore();
  });

  it("auto-marks as verified when valid URL provided", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    const verificationInput = screen.getByLabelText(
      /Certification verification URL/i
    );
    fireEvent.change(verificationInput, {
      target: { value: "https://verify.example.com/cert" },
    });

    const verifiedCheckbox = screen.getByLabelText(
      /Mark certification as verified/i
    );
    expect(verifiedCheckbox).toBeChecked();
  });

  it("renders organization options", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("CompTIA")).toBeInTheDocument();
    expect(screen.getByText("HackerRank")).toBeInTheDocument();
    expect(screen.getByText("AWS (Amazon Web Services)")).toBeInTheDocument();
    expect(screen.getByText("Google Cloud")).toBeInTheDocument();
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
  });

  it("renders category options", () => {
    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Coding")).toBeInTheDocument();
    expect(screen.getByText("Cloud")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Data Science")).toBeInTheDocument();
  });

  it("handles scores in submission", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <CertificationForm
        token={mockToken}
        onSaved={mockOnSaved}
        onCancel={mockOnCancel}
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Certification name/i), {
      target: { value: "Test Cert" },
    });
    fireEvent.change(screen.getByLabelText(/Issuing organization/i), {
      target: { value: "AWS" },
    });
    fireEvent.change(screen.getByLabelText(/Date certification was earned/i), {
      target: { value: "2024-01-01" },
    });

    // Fill score fields
    fireEvent.change(screen.getByLabelText(/Certification score/i), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByLabelText(/Certification percentile/i), {
      target: { value: "87" },
    });
    fireEvent.change(screen.getByLabelText(/Skills assessed/i), {
      target: { value: "JavaScript, React" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/certifications",
        expect.objectContaining({
          scores: expect.objectContaining({
            score: 95,
            percentile: 87,
            skills_assessed: ["JavaScript", "React"],
          }),
        }),
        expect.any(Object)
      );
    });
  });
});
