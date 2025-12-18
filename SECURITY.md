# UC-135: Production Security Hardening

This document outlines the security measures implemented in the ATS Career OS application.

## Table of Contents

1. [CSRF Protection](#csrf-protection)
2. [XSS Prevention](#xss-prevention)
3. [SQL Injection Prevention](#sql-injection-prevention)
4. [Secure Session Management](#secure-session-management)
5. [HTTP Security Headers](#http-security-headers)
6. [Dependency Security](#dependency-security)
7. [Security Audit](#security-audit)

---

## CSRF Protection

### Implementation

The application uses **JWT Bearer tokens** for authentication, which provides implicit CSRF protection:

- Tokens are stored in `localStorage` (not cookies)
- Tokens are sent via the `Authorization` header
- State-changing requests require the `Authorization: Bearer <token>` header
- External sites cannot access localStorage or inject Authorization headers

### Middleware

```javascript
// backend/middleware/security.js
export function verifyCsrfProtection(req, res, next) {
  // Skip for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Verify Authorization header for state-changing requests
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}
```

---

## XSS Prevention

### Input Sanitization

All user inputs are sanitized before processing:

```javascript
// backend/middleware/security.js
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/\x00/g, '')                                    // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '')                            // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '')                              // Remove event handlers
    .trim();
}
```

### Middleware Applied

```javascript
// server.js
app.use(inputSanitizer); // Sanitize all inputs (body, query, params)
```

### Output Encoding

- React automatically escapes content rendered in JSX
- Server-side HTML generation uses the `escapeHtml()` utility
- JSON responses are properly encoded

---

## SQL Injection Prevention

### Parameterized Queries

All database queries use parameterized queries with PostgreSQL's `$1`, `$2`, etc. placeholders:

```javascript
// Example from server.js
const result = await pool.query(
  "SELECT * FROM users WHERE email=$1",
  [email]
);
```

### Input Validation

ID parameters are validated before use:

```javascript
// backend/utils/inputValidation.js
export function validateIdParam(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  req.params.id = id;
  next();
}
```

---

## Secure Session Management

### JWT Token Security

```javascript
// server.js - Token generation
function makeToken(user) {
  return jwt.sign(
    { 
      sub: user.id,
      id: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    }, 
    JWT_SECRET, 
    {
      expiresIn: "2h",           // 2-hour expiration
      algorithm: 'HS256',        // Explicit algorithm
      issuer: 'ats-career-os',   // Token issuer
      audience: 'ats-users'      // Token audience
    }
  );
}
```

### Token Verification

```javascript
// backend/auth.js
const verifyOptions = {
  algorithms: ['HS256'],      // Only allow expected algorithm
  issuer: 'ats-career-os',    // Verify issuer
  audience: 'ats-users',      // Verify audience
  maxAge: '2h'                // Maximum age
};

const data = jwt.verify(token, JWT_SECRET, verifyOptions);
```

### Password Security

- Passwords hashed with bcrypt (10 rounds)
- Strong password requirements enforced
- Password reset uses time-limited codes

---

## HTTP Security Headers

### Helmet Configuration

```javascript
app.use(helmet({
  // Content Security Policy (production only)
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", /* trusted APIs */],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
    },
  } : false,
  
  // HSTS (production only)
  hsts: {
    maxAge: 31536000,         // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Other headers
  noSniff: true,              // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  hidePoweredBy: true,        // Remove X-Powered-By
}));
```

### Additional Headers

```javascript
// backend/middleware/security.js
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), ...');
res.setHeader('Cache-Control', 'no-store'); // For API routes
```

---

## Rate Limiting

### Authentication Endpoints

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window
  message: { error: 'Too many authentication attempts' },
});

app.post("/login", authLimiter, ...);
app.post("/register", authLimiter, ...);
```

### General API

```javascript
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 100,                   // 100 requests per minute
});

app.use('/api/', apiLimiter);
```

---

## Dependency Security

### Regular Audits

Run security audits regularly:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Run the security audit script
npm run security:audit
```

### Known Issues

Some dependencies have known vulnerabilities without available fixes:
- `html-docx-js` depends on `jszip` < 3.8.0 (moderate severity)
- `lodash.merge` has prototype pollution issues (high severity)

**Mitigation**: These packages are used only for document generation with trusted internal data.

---

## Security Audit

### Running the Audit

```bash
npm run security:audit
```

### What It Checks

1. **Hardcoded secrets** in source files
2. **Environment configuration** (JWT_SECRET, etc.)
3. **Security middleware** (helmet, cors, rate limiting)
4. **SQL query patterns** (parameterized queries)
5. **Security packages** installed
6. **Route protection** (auth middleware usage)

---

## Security Checklist

### Before Production Deployment

- [ ] Set strong, unique `JWT_SECRET` in production
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS for production domains only
- [ ] Enable all security headers (CSP, HSTS, etc.)
- [ ] Run `npm audit` and fix critical vulnerabilities
- [ ] Review and test rate limiting thresholds
- [ ] Set up security monitoring and alerting
- [ ] Configure secure database connection (SSL)
- [ ] Implement log rotation and monitoring
- [ ] Backup strategy for encrypted data

### Regular Maintenance

- [ ] Weekly: Run `npm audit`
- [ ] Monthly: Review access logs for anomalies
- [ ] Quarterly: Rotate API keys and secrets
- [ ] Annually: Full security review and penetration testing

---

## Reporting Security Issues

If you discover a security vulnerability, please report it to [security@example.com] rather than opening a public issue.

---

*Last Updated: December 2025*
*UC-135: Production Security Hardening*

