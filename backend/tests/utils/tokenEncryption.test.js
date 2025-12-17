/**
 * Token Encryption Tests
 * Tests utils/tokenEncryption.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptToken, decryptToken } from '../../utils/tokenEncryption.js';

describe('Token Encryption', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    delete process.env._ENCRYPTION_KEY_WARNED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encryptToken', () => {
    it('should return null for null input', () => {
      expect(encryptToken(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(encryptToken(undefined)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(encryptToken('')).toBe(null);
    });

    it('should encrypt a token successfully', () => {
      const token = 'ghp_xxxxxxxxxxxxxxxxxxxx';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':'); // Format: iv:authTag:encrypted
    });

    it('should produce different ciphertexts for same token (due to random IV)', () => {
      const token = 'ghp_xxxxxxxxxxxxxxxxxxxx';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should use environment key when provided', () => {
      // Set a 64-character hex key (32 bytes)
      process.env.GITHUB_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
      
      const token = 'ghp_test_token';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':');
    });

    it('should derive key from non-hex string', () => {
      process.env.GITHUB_TOKEN_ENCRYPTION_KEY = 'my-custom-encryption-key';
      
      const token = 'ghp_test_token';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
    });
  });

  describe('decryptToken', () => {
    it('should return null for null input', () => {
      expect(decryptToken(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(decryptToken(undefined)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(decryptToken('')).toBe(null);
    });

    it('should decrypt an encrypted token correctly', () => {
      const originalToken = 'ghp_xxxxxxxxxxxxxxxxxxxx';
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should handle legacy unencrypted tokens', () => {
      const legacyToken = 'ghp_unencrypted_legacy_token';
      const result = decryptToken(legacyToken);

      // Should return as-is since it doesn't have the encryption format
      expect(result).toBe(legacyToken);
    });

    it('should return token as-is if decryption fails', () => {
      // Invalid encrypted format but has colons
      const invalidToken = 'invalid:format:token';
      const result = decryptToken(invalidToken);

      // Should return as-is when decryption fails
      expect(result).toBe(invalidToken);
    });

    it('should roundtrip with custom key', () => {
      process.env.GITHUB_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64);
      
      const originalToken = 'ghp_custom_key_test';
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in token', () => {
      const specialToken = 'ghp_test!@#$%^&*()_+{}[]|\\:";\'<>?,./';
      const encrypted = encryptToken(specialToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(specialToken);
    });

    it('should handle very long tokens', () => {
      const longToken = 'ghp_' + 'x'.repeat(1000);
      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should handle unicode in token', () => {
      const unicodeToken = 'ghp_test_🔐_token_émoji';
      const encrypted = encryptToken(unicodeToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(unicodeToken);
    });
  });
});

