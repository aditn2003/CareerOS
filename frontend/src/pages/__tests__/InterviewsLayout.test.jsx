/**
 * InterviewsLayout Page Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../__tests__/helpers/test-utils";
import InterviewsLayout from "../Interviews/InterviewsLayout";

describe("InterviewsLayout Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("Interview Command Center")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(
      screen.getByText("Your complete toolkit from research to offer")
    ).toBeInTheDocument();
  });

  it("renders Research nav group", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("Research")).toBeInTheDocument();
  });

  it("renders Practice nav group", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("Practice")).toBeInTheDocument();
  });

  it("renders Track nav group", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("renders Offer nav group", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("Offer")).toBeInTheDocument();
  });

  it("renders Company Research link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Company/i })).toHaveAttribute(
      "href",
      "/interviews/company-research"
    );
  });

  it("renders Insights link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Insights/i })).toHaveAttribute(
      "href",
      "/interviews/insights"
    );
  });

  it("renders Questions link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Questions/i })).toHaveAttribute(
      "href",
      "/interviews/question-bank"
    );
  });

  it("renders Technical link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Technical/i })).toHaveAttribute(
      "href",
      "/interviews/technical-prep"
    );
  });

  it("renders AI Coach link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /AI Coach/i })).toHaveAttribute(
      "href",
      "/interviews/response-coaching"
    );
  });

  it("renders Mock link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Mock/i })).toHaveAttribute(
      "href",
      "/interviews/mock-interview"
    );
  });

  it("renders Interviews tracker link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Interviews/i })).toHaveAttribute(
      "href",
      "/interviews/tracker"
    );
  });

  it("renders Follow-Up link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Follow-Up/i })).toHaveAttribute(
      "href",
      "/interviews/follow-up"
    );
  });

  it("renders Analytics link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Analytics/i })).toHaveAttribute(
      "href",
      "/interviews/analytics"
    );
  });

  it("renders Salary Data link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Salary Data/i })).toHaveAttribute(
      "href",
      "/interviews/salary-research"
    );
  });

  it("renders Negotiate link", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByRole("link", { name: /Negotiate/i })).toHaveAttribute(
      "href",
      "/interviews/salary-negotiation"
    );
  });

  it("renders nav icons", () => {
    renderWithProviders(<InterviewsLayout />, { route: "/interviews" });
    expect(screen.getByText("🏢")).toBeInTheDocument();
    expect(screen.getByText("🔍")).toBeInTheDocument();
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("💻")).toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.getByText("🎭")).toBeInTheDocument();
    expect(screen.getByText("📋")).toBeInTheDocument();
    expect(screen.getByText("📧")).toBeInTheDocument();
    expect(screen.getByText("📊")).toBeInTheDocument();
    expect(screen.getByText("💰")).toBeInTheDocument();
    expect(screen.getByText("💵")).toBeInTheDocument();
  });
});
