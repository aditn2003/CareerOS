/**
 * FormField Component Tests
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../__tests__/helpers/test-utils";
import { Field, TextArea } from "../FormField";

describe("Field Component", () => {
  it("renders without crashing", () => {
    render(<Field label="Test Label" />);
    expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
  });

  it("renders with correct label", () => {
    render(<Field label="Username" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("uses default type of text", () => {
    render(<Field label="Test" />);
    const input = screen.getByLabelText("Test");
    expect(input).toHaveAttribute("type", "text");
  });

  it("accepts custom type", () => {
    render(<Field label="Email" type="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
  });

  it("accepts password type", () => {
    render(<Field label="Password" type="password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
  });

  it("accepts number type", () => {
    render(<Field label="Age" type="number" />);
    const input = screen.getByLabelText("Age");
    expect(input).toHaveAttribute("type", "number");
  });

  it("accepts custom id", () => {
    render(<Field label="Test" id="custom-id" />);
    const input = document.getElementById("custom-id");
    expect(input).toBeInTheDocument();
  });

  it("generates unique id when not provided", () => {
    render(<Field label="Test" />);
    const input = screen.getByLabelText("Test");
    expect(input.id).toMatch(/^field-[a-z0-9]+$/);
  });

  it("passes additional props to input", () => {
    render(<Field label="Test" placeholder="Enter value" maxLength={50} />);
    const input = screen.getByLabelText("Test");
    expect(input).toHaveAttribute("placeholder", "Enter value");
    expect(input).toHaveAttribute("maxLength", "50");
  });

  it("handles value prop", () => {
    render(<Field label="Test" value="test value" onChange={() => {}} />);
    const input = screen.getByLabelText("Test");
    expect(input).toHaveValue("test value");
  });

  it("calls onChange when value changes", () => {
    const handleChange = vi.fn();
    render(<Field label="Test" onChange={handleChange} />);
    const input = screen.getByLabelText("Test");
    fireEvent.change(input, { target: { value: "new value" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("has aria-label attribute", () => {
    render(<Field label="Accessible Field" />);
    const input = screen.getByLabelText("Accessible Field");
    expect(input).toHaveAttribute("aria-label", "Accessible Field");
  });

  it("wraps in div with field class", () => {
    const { container } = render(<Field label="Test" />);
    expect(container.querySelector(".field")).toBeInTheDocument();
  });

  it("associates label with input via htmlFor", () => {
    render(<Field label="Test" id="my-input" />);
    const label = screen.getByText("Test");
    expect(label).toHaveAttribute("for", "my-input");
  });

  it("accepts disabled prop", () => {
    render(<Field label="Test" disabled />);
    const input = screen.getByLabelText("Test");
    expect(input).toBeDisabled();
  });

  it("accepts required prop", () => {
    render(<Field label="Test" required />);
    const input = screen.getByLabelText("Test");
    expect(input).toBeRequired();
  });
});

describe("TextArea Component", () => {
  it("renders without crashing", () => {
    render(<TextArea label="Description" />);
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("renders with correct label", () => {
    render(<TextArea label="Comments" />);
    expect(screen.getByText("Comments")).toBeInTheDocument();
  });

  it("renders as textarea element", () => {
    render(<TextArea label="Test" />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("accepts custom id", () => {
    render(<TextArea label="Test" id="custom-textarea" />);
    const textarea = document.getElementById("custom-textarea");
    expect(textarea).toBeInTheDocument();
  });

  it("generates unique id when not provided", () => {
    render(<TextArea label="Test" />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea.id).toMatch(/^textarea-[a-z0-9]+$/);
  });

  it("passes additional props to textarea", () => {
    render(<TextArea label="Test" placeholder="Enter description" rows={5} />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea).toHaveAttribute("placeholder", "Enter description");
    expect(textarea).toHaveAttribute("rows", "5");
  });

  it("handles value prop", () => {
    render(<TextArea label="Test" value="test content" onChange={() => {}} />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea).toHaveValue("test content");
  });

  it("calls onChange when value changes", () => {
    const handleChange = vi.fn();
    render(<TextArea label="Test" onChange={handleChange} />);
    const textarea = screen.getByLabelText("Test");
    fireEvent.change(textarea, { target: { value: "new content" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("has aria-label attribute", () => {
    render(<TextArea label="Bio" />);
    const textarea = screen.getByLabelText("Bio");
    expect(textarea).toHaveAttribute("aria-label", "Bio");
  });

  it("wraps in div with field class", () => {
    const { container } = render(<TextArea label="Test" />);
    expect(container.querySelector(".field")).toBeInTheDocument();
  });

  it("associates label with textarea via htmlFor", () => {
    render(<TextArea label="Test" id="my-textarea" />);
    const label = screen.getByText("Test");
    expect(label).toHaveAttribute("for", "my-textarea");
  });

  it("accepts disabled prop", () => {
    render(<TextArea label="Test" disabled />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea).toBeDisabled();
  });

  it("accepts maxLength prop", () => {
    render(<TextArea label="Test" maxLength={500} />);
    const textarea = screen.getByLabelText("Test");
    expect(textarea).toHaveAttribute("maxLength", "500");
  });
});
