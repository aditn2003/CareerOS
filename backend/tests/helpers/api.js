/**
 * API Request Helpers
 * Provides utilities for making authenticated API requests in tests
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createAuthHeader } from './auth.js';

/**
 * Creates a test Express app with routes
 * @param {Function|Router} routes - Express router or route handler
 * @param {Object} options - Additional options
 * @returns {Express} Express app instance
 */
export function createTestApp(routes, options = {}) {
  const app = express();
  
  // Apply middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  if (options.cors !== false) {
    app.use(cors());
  }
  
  // Apply routes
  if (typeof routes === 'function') {
    app.use(options.prefix || '/api', routes);
  } else if (routes) {
    app.use(options.prefix || '/api', routes);
  }
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Test app error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'test' && { stack: err.stack }),
    });
  });
  
  return app;
}

/**
 * Makes an authenticated GET request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {string|Object} tokenOrHeaders - JWT token or headers object
 * @returns {Promise} Supertest response
 */
export function authenticatedGet(app, path, tokenOrHeaders) {
  const req = request(app).get(path);
  
  if (typeof tokenOrHeaders === 'string') {
    req.set(createAuthHeader(tokenOrHeaders));
  } else if (tokenOrHeaders) {
    req.set(tokenOrHeaders);
  }
  
  return req;
}

/**
 * Makes an authenticated POST request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {Object} data - Request body data
 * @param {string|Object} tokenOrHeaders - JWT token or headers object
 * @returns {Promise} Supertest response
 */
export function authenticatedPost(app, path, data, tokenOrHeaders) {
  const req = request(app).post(path).send(data);
  
  if (typeof tokenOrHeaders === 'string') {
    req.set(createAuthHeader(tokenOrHeaders));
  } else if (tokenOrHeaders) {
    req.set(tokenOrHeaders);
  }
  
  return req;
}

/**
 * Makes an authenticated PUT request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {Object} data - Request body data
 * @param {string|Object} tokenOrHeaders - JWT token or headers object
 * @returns {Promise} Supertest response
 */
export function authenticatedPut(app, path, data, tokenOrHeaders) {
  const req = request(app).put(path).send(data);
  
  if (typeof tokenOrHeaders === 'string') {
    req.set(createAuthHeader(tokenOrHeaders));
  } else if (tokenOrHeaders) {
    req.set(tokenOrHeaders);
  }
  
  return req;
}

/**
 * Makes an authenticated PATCH request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {Object} data - Request body data
 * @param {string|Object} tokenOrHeaders - JWT token or headers object
 * @returns {Promise} Supertest response
 */
export function authenticatedPatch(app, path, data, tokenOrHeaders) {
  const req = request(app).patch(path).send(data);
  
  if (typeof tokenOrHeaders === 'string') {
    req.set(createAuthHeader(tokenOrHeaders));
  } else if (tokenOrHeaders) {
    req.set(tokenOrHeaders);
  }
  
  return req;
}

/**
 * Makes an authenticated DELETE request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {string|Object} tokenOrHeaders - JWT token or headers object
 * @returns {Promise} Supertest response
 */
export function authenticatedDelete(app, path, tokenOrHeaders) {
  const req = request(app).delete(path);
  
  if (typeof tokenOrHeaders === 'string') {
    req.set(createAuthHeader(tokenOrHeaders));
  } else if (tokenOrHeaders) {
    req.set(tokenOrHeaders);
  }
  
  return req;
}

/**
 * Makes an unauthenticated GET request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @returns {Promise} Supertest response
 */
export function unauthenticatedGet(app, path) {
  return request(app).get(path);
}

/**
 * Makes an unauthenticated POST request
 * @param {Express} app - Express app instance
 * @param {string} path - Request path
 * @param {Object} data - Request body data
 * @returns {Promise} Supertest response
 */
export function unauthenticatedPost(app, path, data) {
  return request(app).post(path).send(data);
}

/**
 * Helper to expect a successful response (2xx status)
 * @param {Object} response - Supertest response
 * @param {number} expectedStatus - Expected status code (default: 200)
 */
export function expectSuccess(response, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    console.error('Response body:', JSON.stringify(response.body, null, 2));
  }
  expect(response.status).toBe(expectedStatus);
}

/**
 * Helper to expect an error response (4xx or 5xx status)
 * @param {Object} response - Supertest response
 * @param {number} expectedStatus - Expected status code
 */
export function expectError(response, expectedStatus) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error');
}

/**
 * Helper to expect an authentication error (401)
 * @param {Object} response - Supertest response
 */
export function expectAuthError(response) {
  expectError(response, 401);
}

/**
 * Helper to expect a validation error (400)
 * @param {Object} response - Supertest response
 */
export function expectValidationError(response) {
  expectError(response, 400);
}

export default {
  createTestApp,
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedPatch,
  authenticatedDelete,
  unauthenticatedGet,
  unauthenticatedPost,
  expectSuccess,
  expectError,
  expectAuthError,
  expectValidationError,
};

