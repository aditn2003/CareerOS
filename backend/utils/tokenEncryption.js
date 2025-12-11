// backend/utils/tokenEncryption.js
// Utility for encrypting and decrypting GitHub personal access tokens
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable or generate a default one
 * In production, this should be set in environment variables
 */
function getEncryptionKey() {
  const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    // Only warn once per process start to avoid log spam
    if (!process.env._ENCRYPTION_KEY_WARNED) {
      console.warn('⚠️  GITHUB_TOKEN_ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
      console.warn('⚠️  Set GITHUB_TOKEN_ENCRYPTION_KEY environment variable with a secure random 32-byte hex string');
      process.env._ENCRYPTION_KEY_WARNED = 'true';
    }
    // Default key for development only - should be changed in production
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }
  // If key is provided as hex string, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  // Otherwise derive key from the string
  return crypto.scryptSync(key, 'github-token-salt', KEY_LENGTH);
}

/**
 * Encrypt a GitHub token
 * @param {string} token - Plain text GitHub token
 * @returns {string} - Encrypted token (hex encoded)
 */
export function encryptToken(token) {
  if (!token) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return result;
  } catch (error) {
    console.error('❌ Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a GitHub token
 * @param {string} encryptedToken - Encrypted token (hex encoded)
 * @returns {string} - Plain text GitHub token
 */
export function decryptToken(encryptedToken) {
  if (!encryptedToken) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedToken.split(':');
    
    if (parts.length !== 3) {
      // Legacy format - might be unencrypted, return as is
      console.warn('⚠️  Token format not recognized, assuming unencrypted');
      return encryptedToken;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting token:', error);
    // If decryption fails, might be unencrypted legacy token
    console.warn('⚠️  Decryption failed, returning token as-is (might be unencrypted)');
    return encryptedToken;
  }
}

