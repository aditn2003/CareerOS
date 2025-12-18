/**
 * EducationTab Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EducationTab from "../EducationTab";

// Mock AuthContext
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ token: "mock-token" }),
}));

// Mock EducationSection and EducationForm
vi.mock("../../../components/EducationSection", () => ({
  default: ({ onEdit }) => (
    <div data-testid="education-section">
      <button onClick={() => onEdit({ id: 1, institution: "MIT" })}>
        Edit
      </button>
    </div>
  ),
}));

vi.mock("../../../components/EducationForm", () => ({
  default: ({ onCancel, onSaved }) => (
    <div data-testid="education-form">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSaved}>Save</button>
    </div>
  ),
}));

describe("EducationTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.dispatchEvent
    window.dispatchEvent = vi.fn();
  });

  const renderTab = () => {
    return render(
      <MemoryRouter>
        <EducationTab />
      </MemoryRouter>
    );
  };

  it("renders the component", () => {
    renderTab();
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("shows Add Education button initially", () => {
    renderTab();
    expect(screen.getByText("Add Education")).toBeInTheDocument();
  });

  it("shows form when Add Education button is clicked", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);
    expect(screen.getByTestId("education-form")).toBeInTheDocument();
  });

  it("hides Add Education button when form is shown", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);
    expect(screen.queryByText("Add Education")).not.toBeInTheDocument();
  });

  it("shows EducationSection when form is not shown", () => {
    renderTab();
    expect(screen.getByTestId("education-section")).toBeInTheDocument();
  });

  it("hides EducationSection when form is shown", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);
    expect(screen.queryByTestId("education-section")).not.toBeInTheDocument();
  });

  it("shows form when Edit button is clicked from EducationSection", () => {
    renderTab();
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    expect(screen.getByTestId("education-form")).toBeInTheDocument();
  });

  it("hides form when Cancel is clicked", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);

    expect(screen.getByTestId("education-form")).toBeInTheDocument();

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId("education-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("education-section")).toBeInTheDocument();
  });

  it("dispatches educationUpdated event when form is saved", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "educationUpdated",
      })
    );
  });

  it("hides form and shows section after saving", () => {
    renderTab();
    const addButton = screen.getByText("Add Education");
    fireEvent.click(addButton);

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(screen.queryByTestId("education-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("education-section")).toBeInTheDocument();
  });

  it("resets editing state when form is saved", () => {
    renderTab();
    // Start with edit
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);

    expect(screen.getByTestId("education-form")).toBeInTheDocument();

    // Save
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Should be able to add new education
    expect(screen.getByText("Add Education")).toBeInTheDocument();
  });
});
