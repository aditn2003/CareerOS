# UC-145: Security Penetration Testing Report

## Executive Summary

This document presents the findings from a comprehensive security penetration test conducted on the ATS (Applicant Tracking System) application. The assessment was conducted according to OWASP Top 10 2021 guidelines and industry best practices.

**Assessment Date:** December 15, 2025  
**Scope:** Backend API endpoints, Authentication mechanisms, Authorization controls, Input validation  
**Overall Risk Level:** MEDIUM

---

## Table of Contents

1. [Test Methodology](#test-methodology)
2. [Security Findings Summary](#security-findings-summary)
3. [Detailed Findings](#detailed-findings)
4. [Recommendations](#recommendations)
5. [Verification Checklist](#verification-checklist)

---

## Test Methodology

### OWASP Top 10 Coverage

| Category | Description | Status |
|----------|-------------|--------|
| A01 | Broken Access Control | ✅ Tested |
| A02 | Cryptographic Failures | ✅ Tested |
| A03 | Injection | ✅ Tested |
| A04 | Insecure Design | ✅ Tested |
| A05 | Security Misconfiguration | ✅ Tested |
| A06 | Vulnerable Components | ⚠️ Partial |
| A07 | Authentication Failures | ✅ Tested |
| A08 | Software & Data Integrity | ✅ Tested |
| A09 | Security Logging | ⚠️ Reviewed |
| A10 | Server-Side Request Forgery | ✅ Tested |

### Testing Tools Used

- Vitest (Automated testing framework)
- Supertest (HTTP assertions)
- Custom SQL injection payloads
- Custom XSS payloads
- JWT manipulation tests

---

## Security Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🚨 Critical | 0 | N/A |
| ⚠️ High | 0 | N/A |
| 📋 Medium | 2 | Requires attention |
| 📌 Low | 2 | Should fix |
| ℹ️ Info | 4 | Recommendations |

---

## Detailed Findings

### 📋 MEDIUM SEVERITY

#### M1: No Server-Side Rate Limiting on Authentication Endpoints

**Category:** A07 - Identification and Authentication Failures

**Description:**
No server-side rate limiting was detected on the following authentication endpoints:
- `POST /login`
- `POST /register`
- `POST /forgot`

This allows attackers to perform brute-force attacks against user accounts without restriction.

**Evidence:**
```
10 rapid login attempts with wrong passwords all returned 401 (no 429 rate limit response)
```

**Risk:** An attacker can attempt thousands of password combinations to gain unauthorized access.

**Recommendation:**
```javascript
// Install and configure express-rate-limit
npm install express-rate-limit

// Add to server.js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to auth routes
app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/forgot', authLimiter);
```

---

#### M2: Insufficient Email Validation

**Category:** A03 - Injection / A04 - Insecure Design

**Description:**
The registration endpoint accepts some malformed email addresses. While basic validation exists (checks for `@` and `.`), more sophisticated invalid patterns may be accepted.

**Evidence:**
```
Email "spaces in@email.com" was accepted (should be rejected)
```

**Recommendation:**
```javascript
// Use a comprehensive email validation library
npm install validator

import validator from 'validator';

// In registration handler
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

---

### 📌 LOW SEVERITY

#### L1: X-Powered-By Header Exposed

**Category:** A05 - Security Misconfiguration

**Description:**
The `X-Powered-By: Express` header is exposed in HTTP responses, revealing the underlying technology stack.

**Risk:** Information disclosure helps attackers target known Express.js vulnerabilities.

**Recommendation:**
```javascript
// Add to server.js (before route definitions)
app.disable('x-powered-by');

// Or use helmet middleware for comprehensive security headers
npm install helmet

import helmet from 'helmet';
app.use(helmet());
```

---

#### L2: Invalid ID Parameters Return 500 Instead of 400

**Category:** A05 - Security Misconfiguration / Input Validation

**Description:**
When invalid (non-integer) ID parameters are passed to API endpoints like `/api/jobs/:id`, the server returns a 500 Internal Server Error instead of a 400 Bad Request.

**Evidence:**
```
GET /api/jobs/1%20OR%201=1 returns 500
Error: invalid input syntax for type integer: "1 OR 1=1"
```

**Risk:** Leaks internal error information, poor user experience, difficult debugging.

**Recommendation:**
```javascript
// Add input validation middleware
const validateIdParam = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  req.params.id = id; // Normalize to integer
  next();
};

// Apply to routes with :id parameter
router.get('/:id', auth, validateIdParam, async (req, res) => {
  // ...
});
```

---

### ℹ️ INFORMATIONAL

#### I1: XSS Payloads Stored As-Is (Frontend Must Escape)

**Category:** A03 - Injection

**Description:**
The backend stores XSS payloads in the database without sanitization. This is acceptable as long as the frontend properly escapes output.

**Verification Required:**
- ✅ React's JSX automatically escapes content in `{variable}` expressions
- ⚠️ Verify `dangerouslySetInnerHTML` is never used with user content
- ⚠️ Use DOMPurify for any rich text/HTML rendering

---

#### I2: CSRF Protection via JWT Bearer Tokens

**Category:** A08 - Software and Data Integrity Failures

**Description:**
The application uses JWT Bearer tokens stored in localStorage rather than cookies, which provides implicit CSRF protection since the token must be manually attached to requests.

**Note:** If cookies are ever used for authentication in the future, explicit CSRF tokens should be implemented.

---

#### I3: Security Logging Recommendations

**Category:** A09 - Security Logging and Monitoring Failures

**Description:**
The application should implement centralized security event logging for:
- Failed login attempts (with IP address)
- Password changes
- Account deletions
- Privilege escalation attempts
- Suspicious activity patterns

**Recommendation:**
Consider implementing a security logging middleware and integrating with a SIEM solution.

---

#### I4: CORS Configuration is Secure

**Category:** A05 - Security Misconfiguration

**Status:** ✅ PASSED

**Description:**
CORS is properly configured to only allow specific origins:
- `http://localhost:5173`
- `http://localhost:5174`
- Production domains

Requests from unauthorized origins are correctly blocked.

---

## Passed Security Tests ✅

The following security controls were verified and passed:

### SQL Injection Protection
- ✅ Login email field protected (parameterized queries)
- ✅ Registration fields protected
- ✅ Search parameters protected
- ✅ Job creation uses parameterized queries

### Access Control
- ✅ Cannot access other user's jobs (IDOR protection)
- ✅ Cannot update other user's jobs
- ✅ Cannot delete other user's jobs
- ✅ Protected endpoints require authentication
- ✅ Tampered tokens rejected
- ✅ Invalid tokens rejected

### Authentication
- ✅ Weak passwords rejected (enforces uppercase, lowercase, number, 8+ chars)
- ✅ User enumeration prevented in login (same error for wrong email/password)
- ✅ User enumeration prevented in password reset
- ✅ Passwords properly hashed with bcrypt
- ✅ Token includes reasonable expiration (≤24 hours)

### Sensitive Data
- ✅ Password hashes not exposed in API responses
- ✅ Database credentials not exposed
- ✅ API keys not exposed in responses

---

## Recommendations

### Immediate Actions (Within 1 Week)

1. **Implement Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```
   Apply to `/login`, `/register`, `/forgot` endpoints

2. **Add Helmet Middleware**
   ```bash
   npm install helmet
   ```
   Adds security headers including removing X-Powered-By

3. **Add ID Parameter Validation**
   Create middleware to validate numeric IDs before database queries

### Short-term Actions (Within 2 Weeks)

4. **Strengthen Email Validation**
   Use `validator` library for comprehensive email validation

5. **Implement Security Event Logging**
   Log failed login attempts, suspicious activities

### Long-term Actions (Within 1 Month)

6. **Security Audit of Dependencies**
   Run `npm audit` and address vulnerabilities

7. **Implement Content Security Policy (CSP)**
   Use helmet's CSP configuration

8. **Add API Abuse Detection**
   Monitor for unusual patterns and automated attacks

---

## Verification Checklist

Use this checklist to verify fixes have been implemented:

### Rate Limiting
- [ ] express-rate-limit package installed
- [ ] Rate limiter applied to /login endpoint
- [ ] Rate limiter applied to /register endpoint
- [ ] Rate limiter applied to /forgot endpoint
- [ ] Rate limit returns 429 status code
- [ ] Rate limit error message is user-friendly

### Security Headers
- [ ] helmet package installed
- [ ] X-Powered-By header removed
- [ ] Content-Security-Policy header present
- [ ] X-Frame-Options header present
- [ ] X-Content-Type-Options header present

### Input Validation
- [ ] ID parameters validated as integers
- [ ] Invalid IDs return 400 status
- [ ] Email validation strengthened
- [ ] Spaces in emails rejected

### Logging
- [ ] Failed login attempts logged
- [ ] Account changes logged
- [ ] Suspicious activity alerts configured

---

## Test Execution

To run the security tests:

```bash
cd backend
npm test -- --run tests/security/security-penetration.test.js
```

---

## Appendix: Test File Location

Security penetration tests are located at:
```
backend/tests/security/security-penetration.test.js
```

---

**Report Generated:** December 15, 2025  
**Assessment Conducted By:** Security Testing Suite (UC-145)  
**Next Review:** Quarterly security assessment recommended

