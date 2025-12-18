/**
 * FormField Component Tests - Target: 100% Coverage
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Field, TextArea } from "../FormField";

describe("Field", () => {
  it("renders label", () => {
    render(<Field label="Email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders input element", () => {
    render(<Field label="Email" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("uses default type of text", () => {
    render(<Field label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("accepts custom type", () => {
    render(<Field label="Password" type="password" />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it("uses provided id", () => {
    render(<Field label="Email" id="email-field" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "email-field");
  });

  it("generates random id if not provided", () => {
    render(<Field label="Username" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id");
    expect(input.id).toMatch(/^field-/);
  });

  it("associates label with input via htmlFor", () => {
    render(<Field label="Email" id="test-email" />);
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", "test-email");
  });

  it("sets aria-label on input", () => {
    render(<Field label="Search" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-label", "Search");
  });

  it("passes through additional props", () => {
    render(<Field label="Name" placeholder="Enter name" maxLength={50} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Enter name");
    expect(input).toHaveAttribute("maxLength", "50");
  });

  it("handles onChange", () => {
    const onChange = vi.fn();
    render(<Field label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Test" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders inside a field div", () => {
    render(<Field label="Test" />);
    expect(document.querySelector(".field")).toBeInTheDocument();
  });
});

describe("TextArea", () => {
  it("renders label", () => {
    render(<TextArea label="Description" />);
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("renders textarea element", () => {
    render(<TextArea label="Bio" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });

  it("uses provided id", () => {
    render(<TextArea label="Notes" id="notes-area" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("id", "notes-area");
  });

  it("generates random id if not provided", () => {
    render(<TextArea label="Comments" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("id");
    expect(textarea.id).toMatch(/^textarea-/);
  });

  it("associates label with textarea via htmlFor", () => {
    render(<TextArea label="Message" id="msg-area" />);
    const label = screen.getByText("Message");
    expect(label).toHaveAttribute("for", "msg-area");
  });

  it("sets aria-label on textarea", () => {
    render(<TextArea label="Feedback" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-label", "Feedback");
  });

  it("passes through additional props", () => {
    render(<TextArea label="Content" rows={5} cols={40} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("rows", "5");
    expect(textarea).toHaveAttribute("cols", "40");
  });

  it("handles onChange", () => {
    const onChange = vi.fn();
    render(<TextArea label="Notes" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Test" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders inside a field div", () => {
    render(<TextArea label="Test" />);
    expect(document.querySelector(".field")).toBeInTheDocument();
  });
});
