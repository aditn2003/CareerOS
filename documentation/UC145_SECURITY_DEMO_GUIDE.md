UC-145: Security Demo Guide

## Terminal Commands

### 1. Run Security Tests

```bash
cd backend && npx vitest run tests/security/security-penetration.test.js --no-coverage --config vitest.security.config.js
```

### 2. Frontend Audit

```bash
cd frontend && npm audit --audit-level=critical
```

### 3. Backend Audit

```bash
cd backend && npm audit --audit-level=critical
```

---

## Demo Directions

### 1. CSRF Protection

1. Open DevTools → Network tab
2. Make any request (view jobs)
3. Show `Authorization: Bearer <token>` header
4. Say: _"JWT tokens provide CSRF protection"_

### 2. XSS Protection

1. Go to Add Job page
2. Type in title: `<script>alert('XSS')</script>`
3. Save and view the job
4. Show script displays as text (not executed)
5. Say: _"React escapes all user input"_

### 3. Security Headers

1. DevTools → Network → click any request
2. Show Response Headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - No `X-Powered-By` header
3. Say: _"Helmet middleware adds security headers"_

### 4. Test Results

1. Run the security test command above
2. Point to output: `Critical: 0, High: 0, Passed: 22`
3. Say: _"23 tests passing, zero critical vulnerabilities"_

---

## Quick Script

> _"We have SQL injection protection with parameterized queries, XSS protection via React, CSRF protection with JWT tokens, and security headers via Helmet. 23 security tests passing, zero critical vulnerabilities."_
