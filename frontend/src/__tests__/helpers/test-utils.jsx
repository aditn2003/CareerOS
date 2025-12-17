/**
 * Test Utilities
 * Custom render function and test helpers
 */
import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext";
import { ProfileProvider } from "../../contexts/ProfileContext";
import { TeamProvider } from "../../contexts/TeamContext";

/**
 * Custom render function that wraps component with all providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {string} options.route - Initial route (default: "/")
 * @param {Array} options.initialEntries - Initial router entries for MemoryRouter
 * @param {boolean} options.withAuth - Include AuthProvider (default: true)
 * @param {boolean} options.withProfile - Include ProfileProvider (default: true)
 * @param {boolean} options.withTeam - Include TeamProvider (default: true)
 * @param {string} options.token - Initial auth token
 */
export function renderWithProviders(
  ui,
  {
    route = "/",
    initialEntries,
    withAuth = true,
    withProfile = true,
    withTeam = true,
    token = null,
    ...renderOptions
  } = {}
) {
  // Set token in localStorage if provided
  if (token) {
    localStorage.setItem("token", token);
  }

  // Build wrapper with selected providers
  function Wrapper({ children }) {
    let wrappedChildren = children;

    // Wrap with MemoryRouter for testing navigation
    const RouterWrapper = initialEntries ? (
      <MemoryRouter initialEntries={initialEntries}>{wrappedChildren}</MemoryRouter>
    ) : (
      <MemoryRouter initialEntries={[route]}>{wrappedChildren}</MemoryRouter>
    );

    wrappedChildren = RouterWrapper;

    // Wrap with ProfileProvider if needed
    if (withProfile) {
      wrappedChildren = <ProfileProvider>{wrappedChildren}</ProfileProvider>;
    }

    // Wrap with TeamProvider if needed
    if (withTeam) {
      wrappedChildren = <TeamProvider>{wrappedChildren}</TeamProvider>;
    }

    // Wrap with AuthProvider if needed
    if (withAuth) {
      wrappedChildren = <AuthProvider>{wrappedChildren}</AuthProvider>;
    }

    return wrappedChildren;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Return useful utilities
    rerender: (newUi) =>
      render(newUi, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Simple render with just BrowserRouter (no context providers)
 */
export function renderWithRouter(ui, { route = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  );
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock JWT token
 */
export function createMockToken(payload = {}) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = btoa(
    JSON.stringify({
      id: 1,
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      ...payload,
    })
  );
  const signature = btoa("mock-signature");
  return `${header}.${data}.${signature}`;
}

/**
 * Wait for async operations
 */
export function waitFor(callback, options = { timeout: 1000 }) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      try {
        const result = callback();
        resolve(result);
      } catch (error) {
        if (Date.now() - startTime > options.timeout) {
          reject(error);
        } else {
          setTimeout(check, 50);
        }
      }
    };
    check();
  });
}

/**
 * Mock localStorage
 */
export function mockLocalStorage(initialData = {}) {
  const store = { ...initialData };
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] || null,
  };
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

