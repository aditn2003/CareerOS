/**
 * Authentication Helpers for Testing
 * Provides utilities for creating mock JWT tokens and authenticated requests
 */

import jwt from "jsonwebtoken";
import { queryTestDb } from "./db.js";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/**
 * Creates a mock JWT token for a user
 * @param {Object} userData - User data to encode in token
 * @param {number} userData.id - User ID
 * @param {string} userData.email - User email
 * @param {number} expiresIn - Token expiration in seconds (default: 1 hour)
 * @returns {string} JWT token
 */
export function createMockToken(userData, expiresIn = 3600) {
  const payload = {
    id: userData.id,
    email: userData.email || `test${userData.id}@example.com`,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Creates a test user in the database and returns user data with token
 * @param {Object} userData - Optional user data to override defaults
 * @returns {Promise<Object>} User object with id, email, password_hash, and token
 */
export async function createTestUser(userData = {}) {
  const defaultUser = {
    email: `testuser${Date.now()}@example.com`,
    password: "TestPassword123!",
    first_name: "Test",
    last_name: "User",
    provider: "local",
    ...userData,
  };

  // Use minimal rounds in test mode for faster hashing (tests only, not production)
  const saltRounds = process.env.NODE_ENV === "test" ? 1 : 10;
  const password_hash = await bcrypt.hash(defaultUser.password, saltRounds);

  const result = await queryTestDb(
    `INSERT INTO users (email, password_hash, first_name, last_name, provider)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, provider`,
    [
      defaultUser.email,
      password_hash,
      defaultUser.first_name,
      defaultUser.last_name,
      defaultUser.provider,
    ]
  );

  const user = result.rows[0];
  const token = createMockToken({ id: user.id, email: user.email });

  return {
    ...user,
    password: defaultUser.password,
    password_hash,
    token,
  };
}

/**
 * Creates multiple test users
 * @param {number} count - Number of users to create
 * @param {Object} baseData - Base data to use for all users
 * @returns {Promise<Array>} Array of user objects with tokens
 */
export async function createTestUsers(count, baseData = {}) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      ...baseData,
      email: `testuser${Date.now()}_${i}@example.com`,
    });
    users.push(user);
  }
  return users;
}

/**
 * Creates an authenticated request header
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization header
 */
export function createAuthHeader(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Creates an authenticated request header from a user object
 * @param {Object} user - User object with token property
 * @returns {Object} Headers object with Authorization header
 */
export function createAuthHeaderFromUser(user) {
  if (!user.token) {
    throw new Error("User object must have a token property");
  }
  return createAuthHeader(user.token);
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Creates an expired token for testing token expiration scenarios
 * @param {Object} userData - User data to encode
 * @returns {string} Expired JWT token
 */
export function createExpiredToken(userData) {
  const payload = {
    id: userData.id,
    email: userData.email || `test${userData.id}@example.com`,
  };

  // Create token that expired 1 hour ago
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "-1h" });
}

/**
 * Creates an invalid token (wrong secret) for testing invalid token scenarios
 * @param {Object} userData - User data to encode
 * @returns {string} Invalid JWT token
 */
export function createInvalidToken(userData) {
  const payload = {
    id: userData.id,
    email: userData.email || `test${userData.id}@example.com`,
  };

  return jwt.sign(payload, "wrong-secret-key", { expiresIn: "1h" });
}

export default {
  createMockToken,
  createTestUser,
  createTestUsers,
  createAuthHeader,
  createAuthHeaderFromUser,
  verifyToken,
  createExpiredToken,
  createInvalidToken,
};
