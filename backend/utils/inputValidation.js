/**
 * UC-145: Input Validation Utilities
 * 
 * Middleware and utilities for validating user input to prevent
 * injection attacks and ensure data integrity.
 */

import validator from 'validator';

/**
 * Middleware to validate ID parameters
 * Ensures the :id parameter is a valid positive integer
 */
export function validateIdParam(req, res, next) {
  const idParam = req.params.id;
  
  if (idParam === undefined || idParam === null) {
    return next();
  }
  
  // Parse the ID as an integer
  const id = parseInt(idParam, 10);
  
  // Check if it's a valid positive integer
  if (isNaN(id) || id < 1 || String(id) !== String(idParam)) {
    return res.status(400).json({ 
      error: 'Invalid ID parameter',
      message: 'ID must be a positive integer'
    });
  }
  
  // Replace string with parsed integer for type safety
  req.params.id = id;
  next();
}

/**
 * Middleware to validate multiple ID parameters
 * Pass an array of param names to validate
 */
export function validateIdParams(paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const idParam = req.params[paramName];
      
      if (idParam === undefined || idParam === null) {
        continue;
      }
      
      const id = parseInt(idParam, 10);
      
      if (isNaN(id) || id < 1 || String(id) !== String(idParam)) {
        return res.status(400).json({ 
          error: `Invalid ${paramName} parameter`,
          message: `${paramName} must be a positive integer`
        });
      }
      
      req.params[paramName] = id;
    }
    next();
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return validator.isEmail(email.trim());
}

/**
 * Sanitize string input
 * Removes null bytes and normalizes whitespace
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  return str
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize Unicode null characters
    .replace(/\u0000/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(value, defaultValue = null) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  
  return num;
}

/**
 * Validate array input
 */
export function validateArray(arr, maxLength = 1000) {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  // Limit array length to prevent DoS
  return arr.slice(0, maxLength);
}

/**
 * Middleware to log security events
 */
export function securityLogger(eventType) {
  return (req, res, next) => {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.id || req.userId || null,
    };
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔒 [SECURITY] ${eventType}:`, JSON.stringify(event));
    }
    
    // In production, you would send this to a logging service
    // e.g., Winston, Datadog, etc.
    
    next();
  };
}

export default {
  validateIdParam,
  validateIdParams,
  isValidEmail,
  sanitizeString,
  sanitizeNumber,
  validateArray,
  securityLogger,
};

