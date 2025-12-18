/**
 * ContactsTab Page Tests - Target: High Coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ContactsTab from "../Networking/ContactsTab";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getActivities,
  createActivity,
} from "../../api";

vi.mock("../../api", () => ({
  getContacts: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  getActivities: vi.fn(),
  createActivity: vi.fn(),
}));

describe("ContactsTab", () => {
  const mockContacts = [
    {
      id: 1,
      name: "Alice Smith",
      email: "alice@example.com",
      company: "Acme",
      title: "Recruiter",
      industry: "Tech",
      relationship_strength: 9,
      notes: "Helpful recruiter",
    },
    {
      id: 2,
      name: "Bob Jones",
      email: "bob@example.com",
      company: "Beta",
      title: "Engineer",
      industry: "Finance",
      relationship_strength: 5,
      notes: "Met at meetup",
    },
  ];

  const mockActivities = [{ id: 1, contact_id: 1, activity_type: "outreach" }];

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    global.confirm = vi.fn();
    getContacts.mockResolvedValue({ data: { contacts: mockContacts } });
    getActivities.mockResolvedValue({ data: { activities: mockActivities } });
  });

  const renderPage = () => render(<ContactsTab />);

  it("shows loading state initially", () => {
    // make getContacts never resolve to keep loading
    getContacts.mockImplementation(() => new Promise(() => {}));
    getActivities.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading contacts/i)).toBeInTheDocument();
  });

  it("fetches contacts and activities on mount", async () => {
    renderPage();

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalled();
      expect(getActivities).toHaveBeenCalled();
    });
  });

  it("shows empty state when no contacts", async () => {
    getContacts.mockResolvedValueOnce({ data: { contacts: [] } });
    getActivities.mockResolvedValueOnce({ data: { activities: [] } });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          /No contacts yet\. Add your first professional contact/i
        )
      ).toBeInTheDocument();
    });
  });

  it("renders contacts in table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Acme")).toBeInTheDocument();
      expect(screen.getByText("Recruiter")).toBeInTheDocument();
    });
  });

  it("shows Add Contact form when button clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Contact/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    const form = document.querySelector(".networking-form");
    expect(form).toBeInTheDocument();
  });

  it("creates a new contact on submit", async () => {
    createContact.mockResolvedValue({});
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Contact/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    const form = document.querySelector(".networking-form");
    const nameInput = form.querySelector("input[type='text']");

    fireEvent.change(nameInput, { target: { value: "New Contact" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createContact).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Contact" })
      );
    });
  });

  it("edits an existing contact", async () => {
    updateContact.mockResolvedValue({});
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    const form = document.querySelector(".networking-form");
    expect(form).toBeInTheDocument();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(updateContact).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it("confirms before deleting a contact", async () => {
    global.confirm.mockReturnValue(false);
    renderPage();

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Delete/i })[0]
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete/i })[0]);
    expect(global.confirm).toHaveBeenCalled();
    expect(deleteContact).not.toHaveBeenCalled();
  });

  it("deletes a contact after confirmation", async () => {
    deleteContact.mockResolvedValue({});
    global.confirm.mockReturnValue(true);
    renderPage();

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Delete/i })[0]
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete/i })[0]);

    await waitFor(() => {
      expect(deleteContact).toHaveBeenCalledWith(1);
    });
  });

  it("shows relationship badge labels", async () => {
    renderPage();

    await waitFor(() => {
      // Strong (>=8) and Medium (>=5)
      expect(screen.getByText(/Strong \(9\/10\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Medium \(5\/10\)/i)).toBeInTheDocument();
    });
  });

  it("opens log activity form for a contact", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    expect(screen.getByText(/Log Activity - Alice Smith/i)).toBeInTheDocument();
  });

  it("submits activity form", async () => {
    createActivity.mockResolvedValue({});
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    const forms = document.querySelectorAll(".networking-form");
    const activityForm = forms[forms.length - 1];

    fireEvent.submit(activityForm);

    await waitFor(() => {
      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({ contact_id: 1 })
      );
    });
  });

  it("handles data load error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getContacts.mockRejectedValueOnce(new Error("fail"));
    getActivities.mockRejectedValueOnce(new Error("fail"));

    renderPage();

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to load contacts");
    });

    consoleSpy.mockRestore();
  });

  it("shows weak relationship badge for strength < 5", async () => {
    const weakContact = {
      id: 3,
      name: "Weak Contact",
      relationship_strength: 3,
    };
    getContacts.mockResolvedValueOnce({
      data: { contacts: [...mockContacts, weakContact] },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Weak \(3\/10\)/i)).toBeInTheDocument();
    });
  });

  it("renders all activity form fields", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Log Activity - Alice Smith/i)
      ).toBeInTheDocument();
    });

    // Check that labels are present
    expect(screen.getByText(/Activity Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Channel/i)).toBeInTheDocument();
    expect(screen.getByText(/Direction/i)).toBeInTheDocument();
    expect(screen.getByText(/Outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Relationship Impact/i)).toBeInTheDocument();

    // Check that form controls are present (selects and input)
    const forms = document.querySelectorAll(".networking-form");
    const activityForm = forms[forms.length - 1];
    const selects = activityForm.querySelectorAll("select");
    const inputs = activityForm.querySelectorAll("input[type='number']");
    expect(selects.length).toBeGreaterThanOrEqual(4); // Activity Type, Channel, Direction, Outcome
    expect(inputs.length).toBeGreaterThanOrEqual(1); // Relationship Impact
  });

  it("updates activity form fields", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Log Activity - Alice Smith/i)
      ).toBeInTheDocument();
    });

    // Find the Activity Type select by finding the form and then the first select
    const forms = document.querySelectorAll(".networking-form");
    const activityForm = forms[forms.length - 1];
    const selects = activityForm.querySelectorAll("select");
    const activityTypeSelect = selects[0]; // First select is Activity Type

    expect(activityTypeSelect).toBeInTheDocument();
    fireEvent.change(activityTypeSelect, { target: { value: "conversation" } });
    expect(activityTypeSelect.value).toBe("conversation");
  });

  it("handles activity form submission error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createActivity.mockRejectedValueOnce(new Error("Network error"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Log Activity - Alice Smith/i)
      ).toBeInTheDocument();
    });

    const forms = document.querySelectorAll(".networking-form");
    const activityForm = forms[forms.length - 1];
    fireEvent.submit(activityForm);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error saving activity:",
        expect.any(Error)
      );
      expect(global.alert).toHaveBeenCalledWith("Failed to save activity");
    });

    consoleSpy.mockRestore();
  });

  it("closes activity form when cancel is clicked", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Log Activity - Alice Smith/i)
      ).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    // Get the last cancel button (activity form cancel)
    const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.queryByText(/Log Activity - Alice Smith/i)
      ).not.toBeInTheDocument();
    });
  });

  it("populates all activity form field options", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Log Activity/i })[0]
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Log Activity - Alice Smith/i)
      ).toBeInTheDocument();
    });

    // Check Activity Type options (unique text)
    expect(screen.getByText("Outreach")).toBeInTheDocument();
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    expect(screen.getByText("Coffee Chat")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn Message")).toBeInTheDocument();
    expect(screen.getByText("Phone Call")).toBeInTheDocument();
    expect(screen.getByText("Event Meeting")).toBeInTheDocument();

    // Email appears in both Activity Type and Channel, so use getAllByText
    const emailOptions = screen.getAllByText("Email");
    expect(emailOptions.length).toBeGreaterThanOrEqual(1);

    // Check Channel options (unique text)
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("In Person")).toBeInTheDocument();
    expect(screen.getByText("Event")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });
});
