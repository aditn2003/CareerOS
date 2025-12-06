// Mock for jsonwebtoken module
import { jest } from '@jest/globals';

export const verify = jest.fn((token, secret, callback) => {
  if (token === 'invalid-token' || token === 'expired-token') {
    const error = new Error('jwt malformed');
    if (callback) return callback(error, null);
    throw error;
  }
  const decoded = { id: 1, email: 'test@example.com' };
  if (callback) return callback(null, decoded);
  return decoded;
});

export const sign = jest.fn((payload, secret, options) => {
  return 'mock-jwt-token';
});

export const decode = jest.fn((token) => {
  if (!token || token === 'invalid-token') return null;
  return { id: 1, email: 'test@example.com' };
});

export default {
  verify,
  sign,
  decode
};




