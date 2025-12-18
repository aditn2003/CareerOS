/**
 * UC-135: Production Security Hardening Middleware
 * 
 * Comprehensive security middleware including:
 * - XSS protection via input sanitization
 * - CSRF protection verification
 * - Security headers
 * - Input validation
 * - Request sanitization
 */

import validator from 'validator';

/**
 * HTML entities to escape for XSS prevention
 */
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=\/]/g, char => htmlEntities[char]);
}

/**
 * Sanitize string input - removes dangerous characters
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  
  return str
    // Remove null bytes
    .replace(/\x00/g, '')
    .replace(/\u0000/g, '')
    // Remove potential script injection patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Normalize whitespace
    .trim();
}

/**
 * Deep sanitize an object recursively
 */
export function sanitizeObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return obj;
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also sanitize keys
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware: Sanitize all request inputs (body, query, params)
 * Prevents XSS attacks by sanitizing user input
 */
export function inputSanitizer(req, res, next) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (err) {
    console.error('Input sanitization error:', err);
    next(); // Continue even if sanitization fails
  }
}

/**
 * Middleware: Validate Content-Type for POST/PUT/PATCH requests
 * Prevents CSRF attacks via form submissions from other sites
 */
export function validateContentType(req, res, next) {
  const methodsRequiringBody = ['POST', 'PUT', 'PATCH'];
  
  if (methodsRequiringBody.includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Allow JSON, form-urlencoded, and multipart (for file uploads)
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];
    
    if (contentType) {
      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        return res.status(415).json({ 
          error: 'Unsupported Media Type',
          message: 'Content-Type must be application/json, application/x-www-form-urlencoded, or multipart/form-data'
        });
      }
    }
  }
  
  next();
}

/**
 * Middleware: Additional security headers beyond Helmet defaults
 */
export function additionalSecurityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filter in browsers (legacy, but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy - don't leak URLs
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy - restrict browser features
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  
  // Cache control for sensitive routes
  if (req.path.includes('/api/') && !req.path.includes('/uploads')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

/**
 * Middleware: Verify JWT is present for protected routes
 * This provides CSRF protection since JWT is sent via Authorization header, not cookies
 */
export function verifyCsrfProtection(req, res, next) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for public routes
  const publicRoutes = ['/register', '/login', '/forgot', '/reset', '/google', '/linkedin-login'];
  if (publicRoutes.some(route => req.path === route || req.path.startsWith(route))) {
    return next();
  }
  
  // For state-changing requests, verify Authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Authorization header required for this request'
    });
  }
  
  next();
}

/**
 * Middleware: Validate request size to prevent DoS
 */
export function validateRequestSize(maxBodySize = '10mb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    const maxBytes = parseSize(maxBodySize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body must be smaller than ${maxBodySize}`
      });
    }
    
    next();
  };
}

/**
 * Parse size string (e.g., '10mb') to bytes
 */
function parseSize(size) {
  if (typeof size === 'number') return size;
  
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const num = parseInt(match[1], 10);
  const unit = match[2] || 'b';
  
  return num * units[unit];
}

/**
 * Middleware: Log security-relevant events
 */
export function securityAuditLog(req, res, next) {
  const securityEvents = [];
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /union\s+select/i,
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /'\s*or\s+'?1'?\s*=\s*'?1/i,
    /--\s*$/,
    /\/\*.*\*\//
  ];
  
  const checkForPatterns = (obj, path = '') => {
    if (typeof obj === 'string') {
      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(obj)) {
          securityEvents.push({
            type: 'SUSPICIOUS_INPUT',
            pattern: pattern.toString(),
            path,
            value: obj.substring(0, 100) // Truncate for logging
          });
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        checkForPatterns(value, `${path}.${key}`);
      });
    }
  };
  
  // Check body, query, and params
  checkForPatterns(req.body, 'body');
  checkForPatterns(req.query, 'query');
  checkForPatterns(req.params, 'params');
  
  if (securityEvents.length > 0) {
    console.warn('🚨 [SECURITY AUDIT] Suspicious patterns detected:', {
      ip: req.ip || req.connection?.remoteAddress,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      events: securityEvents
    });
  }
  
  next();
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email.trim());
}

/**
 * Validate URL format
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
}

/**
 * Validate that a value is a safe integer
 */
export function isValidId(id) {
  const parsed = parseInt(id, 10);
  return !isNaN(parsed) && parsed > 0 && parsed <= Number.MAX_SAFE_INTEGER;
}

/**
 * Middleware factory: Rate limit by user ID
 */
export function userRateLimit(maxRequests, windowMs) {
  const userRequests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.userId;
    if (!userId) return next();
    
    const now = Date.now();
    const userKey = `user:${userId}`;
    
    let userData = userRequests.get(userKey);
    if (!userData || now - userData.windowStart > windowMs) {
      userData = { count: 0, windowStart: now };
    }
    
    userData.count++;
    userRequests.set(userKey, userData);
    
    if (userData.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [key, data] of userRequests.entries()) {
        if (now - data.windowStart > windowMs) {
          userRequests.delete(key);
        }
      }
    }
    
    next();
  };
}

export default {
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  inputSanitizer,
  validateContentType,
  additionalSecurityHeaders,
  verifyCsrfProtection,
  validateRequestSize,
  securityAuditLog,
  isValidEmail,
  isValidUrl,
  isValidId,
  userRateLimit
};

