/**
 * Test Utilities
 * Custom render function and test helpers
 */
import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";

/**
 * Custom render function that wraps component with MemoryRouter for navigation
 * Context providers are NOT included by default to avoid mock conflicts.
 * Tests that need specific providers should mock them or wrap manually.
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {string} options.route - Initial route (default: "/")
 * @param {Array} options.initialEntries - Initial router entries for MemoryRouter
 * @param {string} options.token - Initial auth token
 */
export function renderWithProviders(
  ui,
  { route = "/", initialEntries, token = null, ...renderOptions } = {}
) {
  // Set token in localStorage if provided
  if (token) {
    localStorage.setItem("token", token);
  }

  // Build wrapper with just MemoryRouter
  function Wrapper({ children }) {
    // Wrap with MemoryRouter for testing navigation
    return initialEntries ? (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ) : (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Return useful utilities
    rerender: (newUi) => render(newUi, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Simple render with just BrowserRouter (no context providers)
 */
export function renderWithRouter(ui, { route = "/" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
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

// Note: Using waitFor from @testing-library/react (re-exported below)
// Do not define a custom waitFor here as it conflicts with the testing library

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

// Re-export everything from testing library EXCEPT render
// We override render with our custom one that includes Router
export {
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  cleanup,
  queries,
  prettyDOM,
  getDefaultNormalizer,
  getRoles,
  logRoles,
  isInaccessible,
  configure,
  getQueriesForElement,
  buildQueries,
  queryByAttribute,
  queryAllByAttribute,
} from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Export our router-wrapped render as the default render
export { renderWithProviders as render };
