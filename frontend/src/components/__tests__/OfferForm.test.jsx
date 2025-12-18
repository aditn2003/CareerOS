/**
 * OfferForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "../../__tests__/helpers/test-utils";
import OfferForm from "../OfferForm";
import * as api from "../../api";

// Mock the API functions
vi.mock("../../api", () => ({
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  getJobs: vi.fn(),
  recordNegotiation: vi.fn(),
}));

describe("OfferForm", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getJobs.mockResolvedValue({ data: { jobs: [] } });
  });

  it("renders without crashing", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Add New Offer")).toBeInTheDocument();
  });

  it("renders Edit Offer title when offer prop provided", () => {
    const existingOffer = { id: 1, company: "Tech Co" };
    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Edit Offer")).toBeInTheDocument();
  });

  it("renders company input", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText("Company *")).toBeInTheDocument();
  });

  it("renders role title input", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText("Role Title *")).toBeInTheDocument();
  });

  it("renders location input", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText("Location")).toBeInTheDocument();
  });

  it("renders base salary input", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText("Base Salary *")).toBeInTheDocument();
  });

  it("renders signing bonus input", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText("Signing Bonus")).toBeInTheDocument();
  });

  it("renders role level select", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Mid")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Junior")).toBeInTheDocument();
  });

  it("renders location type select", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("On-Site")).toBeInTheDocument();
  });

  it("renders equity section", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Stock Options")).toBeInTheDocument();
    expect(screen.getByText("RSU")).toBeInTheDocument();
  });

  it("renders benefits section", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Benefits")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("PTO Days")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Health Insurance Annual Value ($)")
    ).toBeInTheDocument();
  });

  it("renders offer status select", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(
      screen.getByRole("button", { name: /Create Offer/i })
    ).toBeInTheDocument();
  });

  it("renders Update Offer button for existing offer", () => {
    const existingOffer = { id: 1, company: "Tech Co" };
    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByRole("button", { name: /Update Offer/i })
    ).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("updates company on change", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    const input = screen.getByPlaceholderText("Company *");
    fireEvent.change(input, { target: { value: "Big Tech" } });
    expect(input).toHaveValue("Big Tech");
  });

  it("updates role title on change", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    const input = screen.getByPlaceholderText("Role Title *");
    fireEvent.change(input, { target: { value: "Software Engineer" } });
    expect(input).toHaveValue("Software Engineer");
  });

  it("updates base salary on change", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    const input = screen.getByPlaceholderText("Base Salary *");
    fireEvent.change(input, { target: { value: "150000" } });
    expect(input).toHaveValue(150000);
  });

  it("pre-fills form when offer prop provided", () => {
    const existingOffer = {
      id: 1,
      company: "Big Tech Co",
      role_title: "Senior Developer",
      base_salary: 180000,
      location: "San Francisco",
      offer_status: "pending",
    };
    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByPlaceholderText("Company *")).toHaveValue("Big Tech Co");
    expect(screen.getByPlaceholderText("Role Title *")).toHaveValue(
      "Senior Developer"
    );
    expect(screen.getByPlaceholderText("Base Salary *")).toHaveValue(180000);
  });

  it("calls createOffer for new offer on submit", async () => {
    api.createOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByPlaceholderText("Company *"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByPlaceholderText("Role Title *"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Base Salary *"), {
      target: { value: "100000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Offer/i }));

    await waitFor(() => {
      expect(api.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          company: "Tech Co",
          role_title: "Developer",
          base_salary: 100000,
        })
      );
    });
  });

  it("calls updateOffer for existing offer on submit", async () => {
    api.updateOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });
    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Update Offer/i }));

    await waitFor(() => {
      expect(api.updateOffer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          company: "Tech Co",
          role_title: "Developer",
        })
      );
    });
  });

  it("calls onSave after successful submit", async () => {
    api.createOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByPlaceholderText("Company *"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByPlaceholderText("Role Title *"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Base Salary *"), {
      target: { value: "100000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Offer/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it("shows alert on save error", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.createOffer.mockRejectedValueOnce(new Error("Network error"));

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByPlaceholderText("Company *"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByPlaceholderText("Role Title *"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Base Salary *"), {
      target: { value: "100000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Offer/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to save offer");
    });

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("loads jobs on mount", async () => {
    api.getJobs.mockResolvedValueOnce({
      data: {
        jobs: [
          { id: 1, company: "Tech Co", title: "Developer", status: "Offer" },
        ],
      },
    });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });
  });

  it("renders negotiation section", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("💬 Negotiation Details")).toBeInTheDocument();
  });

  it("shows Add Negotiation Notes button for new offers", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Add Negotiation Notes")).toBeInTheDocument();
  });

  it("shows negotiation textarea when button clicked", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText("Add Negotiation Notes"));
    expect(
      screen.getByPlaceholderText(/Record your negotiation strategy/i)
    ).toBeInTheDocument();
  });

  it("renders section headers", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Role Details")).toBeInTheDocument();
    expect(screen.getByText("Compensation")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Benefits")).toBeInTheDocument();
    expect(screen.getByText("Offer Details")).toBeInTheDocument();
  });

  it("toggles bonus guaranteed checkbox", () => {
    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    const checkbox = screen.getByLabelText(/Bonus Guaranteed/i);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("shows initial salary info for existing offers", () => {
    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 120000,
      initial_base_salary: 100000,
    };
    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    // Check that initial offer info is displayed (may appear multiple times in negotiation summary)
    const initialOfferLabels = screen.getAllByText("Initial Offer:");
    expect(initialOfferLabels.length).toBeGreaterThan(0);
    const salaryValues = screen.getAllByText("$100,000");
    expect(salaryValues.length).toBeGreaterThan(0);
  });

  it("shows improvement badge when negotiated salary is higher", () => {
    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 110000,
      initial_base_salary: 100000,
    };
    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(
      screen.getByText(/Negotiated \+10.0% improvement/i)
    ).toBeInTheDocument();
  });

  it("auto-populates form when job_id is selected", async () => {
    const mockJobs = [
      {
        id: 1,
        company: "Tech Co",
        title: "Software Engineer",
        location: "SF",
        industry: "Tech",
        salary_min: 100000,
        salary_max: 150000,
        status: "Applied",
      },
    ];
    api.getJobs.mockResolvedValueOnce({ data: { jobs: mockJobs } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    // Find the job select dropdown by finding select element
    const jobSelect = document.querySelector('select[name="job_id"]');
    expect(jobSelect).toBeInTheDocument();
    fireEvent.change(jobSelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Company *")).toHaveValue("Tech Co");
      expect(screen.getByPlaceholderText("Role Title *")).toHaveValue(
        "Software Engineer"
      );
    });
  });

  it("handles error loading jobs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.getJobs.mockRejectedValueOnce(new Error("Network error"));

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading jobs:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("records negotiation when updating offer with negotiation notes", async () => {
    api.updateOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });
    api.recordNegotiation.mockResolvedValueOnce({});

    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
      initial_base_salary: 90000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill negotiation notes
    const notesButton = screen.getByText("Add Negotiation Notes");
    fireEvent.click(notesButton);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /Record your negotiation strategy/i
      );
      fireEvent.change(textarea, {
        target: { value: "Asked for 10% increase, got 11%" },
      });
    });

    // Update salary (placeholder is always "Base Salary *", label changes to "Negotiated Base Salary")
    const salaryInput = screen.getByPlaceholderText("Base Salary *");
    fireEvent.change(salaryInput, { target: { value: "110000" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Update Offer/i }));

    await waitFor(() => {
      expect(api.updateOffer).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(api.recordNegotiation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          negotiation_notes: "Asked for 10% increase, got 11%",
        })
      );
    });
  });

  it("marks negotiation as successful when salary increases", async () => {
    api.updateOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });

    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
      initial_base_salary: 90000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Update salary to be higher than initial (placeholder is always "Base Salary *")
    const salaryInput = screen.getByPlaceholderText("Base Salary *");
    fireEvent.change(salaryInput, { target: { value: "110000" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Update Offer/i }));

    await waitFor(() => {
      expect(api.updateOffer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          negotiation_successful: true,
          negotiated_base_salary: 110000,
        })
      );
    });
  });

  it("shows salary hint buttons when job with salary range is selected", async () => {
    const mockJobs = [
      {
        id: 1,
        company: "Tech Co",
        title: "Software Engineer",
        salary_min: 100000,
        salary_max: 150000,
        status: "Applied",
      },
    ];
    api.getJobs.mockResolvedValueOnce({ data: { jobs: mockJobs } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    const jobSelect = document.querySelector('select[name="job_id"]');
    fireEvent.change(jobSelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText(/Use Min/i)).toBeInTheDocument();
      expect(screen.getByText(/Use Max/i)).toBeInTheDocument();
      expect(screen.getByText(/Use Mid/i)).toBeInTheDocument();
    });
  });

  it("fills base salary when Use Min button is clicked", async () => {
    const mockJobs = [
      {
        id: 1,
        company: "Tech Co",
        title: "Software Engineer",
        salary_min: 100000,
        salary_max: 150000,
        status: "Applied",
      },
    ];
    api.getJobs.mockResolvedValueOnce({ data: { jobs: mockJobs } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    const jobSelect = document.querySelector('select[name="job_id"]');
    fireEvent.change(jobSelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText(/Use Min/i)).toBeInTheDocument();
    });

    const useMinBtn = screen.getByText(/Use Min/i);
    fireEvent.click(useMinBtn);

    await waitFor(() => {
      const salaryInput = screen.getByPlaceholderText(/Base Salary/i);
      expect(salaryInput).toHaveValue(100000);
    });
  });

  it("shows negotiation summary when improvement exists", () => {
    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 110000,
      initial_base_salary: 100000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Click to show negotiation section
    const notesButton = screen.getByText("Add Negotiation Notes");
    fireEvent.click(notesButton);

    expect(screen.getByText(/Negotiated Salary:/i)).toBeInTheDocument();
    expect(screen.getByText(/Improvement:/i)).toBeInTheDocument();
  });

  it("shows tip when no improvement exists but offer has initial salary", () => {
    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
      initial_base_salary: 100000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.getByText(/If you negotiate and get a higher salary/i)
    ).toBeInTheDocument();
  });

  it("handles negotiation recording error gracefully", async () => {
    api.updateOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });
    api.recordNegotiation.mockRejectedValueOnce(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
      initial_base_salary: 90000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill negotiation notes
    const notesButton = screen.getByText("Add Negotiation Notes");
    fireEvent.click(notesButton);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /Record your negotiation strategy/i
      );
      fireEvent.change(textarea, {
        target: { value: "Negotiation notes" },
      });
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Update Offer/i }));

    await waitFor(() => {
      expect(api.updateOffer).toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalled(); // Should still call onSave even if negotiation recording fails
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error recording negotiation:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("sets initial_base_salary for new offers when base_salary is provided", async () => {
    api.createOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByPlaceholderText("Company *"), {
      target: { value: "Tech Co" },
    });
    fireEvent.change(screen.getByPlaceholderText("Role Title *"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Base Salary *"), {
      target: { value: "100000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Offer/i }));

    await waitFor(() => {
      expect(api.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          base_salary: 100000,
          initial_base_salary: 100000,
        })
      );
    });
  });

  it("uses Use Max button to fill base salary", async () => {
    const mockJobs = [
      {
        id: 1,
        company: "Tech Co",
        title: "Software Engineer",
        salary_min: 100000,
        salary_max: 150000,
        status: "Applied",
      },
    ];
    api.getJobs.mockResolvedValueOnce({ data: { jobs: mockJobs } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    const jobSelect = document.querySelector('select[name="job_id"]');
    fireEvent.change(jobSelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText(/Use Max/i)).toBeInTheDocument();
    });

    const useMaxBtn = screen.getByText(/Use Max/i);
    fireEvent.click(useMaxBtn);

    await waitFor(() => {
      const salaryInput = screen.getByPlaceholderText(/Base Salary/i);
      expect(salaryInput).toHaveValue(150000);
    });
  });

  it("uses Use Mid button to fill base salary", async () => {
    const mockJobs = [
      {
        id: 1,
        company: "Tech Co",
        title: "Software Engineer",
        salary_min: 100000,
        salary_max: 150000,
        status: "Applied",
      },
    ];
    api.getJobs.mockResolvedValueOnce({ data: { jobs: mockJobs } });

    render(<OfferForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    const jobSelect = document.querySelector('select[name="job_id"]');
    fireEvent.change(jobSelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText(/Use Mid/i)).toBeInTheDocument();
    });

    const useMidBtn = screen.getByText(/Use Mid/i);
    fireEvent.click(useMidBtn);

    await waitFor(() => {
      const salaryInput = screen.getByPlaceholderText(/Base Salary/i);
      expect(salaryInput).toHaveValue(125000); // (100000 + 150000) / 2
    });
  });

  it("marks negotiation_attempted when notes are present", async () => {
    api.updateOffer.mockResolvedValueOnce({ data: { offer: { id: 1 } } });

    const existingOffer = {
      id: 1,
      company: "Tech Co",
      role_title: "Developer",
      base_salary: 100000,
      initial_base_salary: 100000,
    };

    render(
      <OfferForm
        offer={existingOffer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill negotiation notes
    const notesButton = screen.getByText("Add Negotiation Notes");
    fireEvent.click(notesButton);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /Record your negotiation strategy/i
      );
      fireEvent.change(textarea, {
        target: { value: "Asked for increase" },
      });
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Update Offer/i }));

    await waitFor(() => {
      expect(api.updateOffer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          negotiation_attempted: true,
        })
      );
    });
  });
});
