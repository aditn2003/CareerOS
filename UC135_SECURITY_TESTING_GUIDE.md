# UC-135: Security Testing Guide

This guide walks you through testing all security features implemented for production hardening.

---

## Prerequisites

1. **Start the backend server:**
   ```bash
   cd backend && npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd frontend && npm run dev
   ```

3. **Have a terminal ready for curl commands**

4. **Open browser dev tools (F12)** - Network tab

---

## Test 1: CSRF Protection ✅

**What we're testing:** State-changing requests require JWT token (not vulnerable to CSRF)

### Test 1.1: Verify Protected Endpoints Require Auth

```bash
# Try to create a job WITHOUT authentication - should fail
curl -X POST http://localhost:4000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Job","company":"Test Company"}'
```

**Expected Result:**
```json
{"error":"Unauthorized"}
```

### Test 1.2: Verify POST Without Content-Type is Rejected

```bash
# POST request without proper Content-Type
curl -X POST http://localhost:4000/api/jobs \
  -d 'title=Test&company=Test'
```

**Expected Result:** Error or rejection (not processed as form data)

### Test 1.3: Verify Token-Based Auth Works

```bash
# First login to get a token
TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Use the token to make authenticated request
curl -X GET http://localhost:4000/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result:** User info returned (not an error)

---

## Test 2: XSS Protection ✅

**What we're testing:** Malicious scripts are sanitized from user input

### Test 2.1: Script Tag Injection

```bash
# Try to inject a script tag in login
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com","password":"test"}'
```

**Expected Result:** Error message (script tags stripped, email invalid)

### Test 2.2: Event Handler Injection

```bash
# Try to inject onclick handler
curl -X POST http://localhost:4000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"Test1234!",
    "confirmPassword":"Test1234!",
    "firstName":"<img onerror=alert(1)>",
    "lastName":"Test"
  }'
```

**Expected Result:** The `onerror=` should be stripped from firstName

### Test 2.3: JavaScript Protocol Injection

```bash
# Try javascript: protocol injection
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"javascript:alert(1)//test@test.com","password":"test"}'
```

**Expected Result:** `javascript:` stripped, invalid email error

### Test 2.4: Browser Test - Check Network Tab

1. Open http://localhost:5173/login
2. Open DevTools → Network tab
3. Try entering `<script>alert('xss')</script>` in the email field
4. Submit the form
5. Check the request payload - scripts should be sanitized **

---

## Test 3: SQL Injection Prevention ✅

**What we're testing:** SQL injection attempts are blocked

### Test 3.1: Classic SQL Injection in Login

```bash
# Try SQL injection in email field
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"anything"}'
```

**Expected Result:**
```json
{"error":"Invalid email or password"}
```
(Not a database error or unauthorized access)

### Test 3.2: SQL Injection in Query Parameters

```bash
# Try SQL injection in URL parameter
curl "http://localhost:4000/api/jobs?id=1;DROP%20TABLE%20users;--"
```

**Expected Result:** Normal response or validation error (not SQL error)

### Test 3.3: Union-Based SQL Injection

```bash
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com'\'' UNION SELECT * FROM users--","password":"test"}'
```

**Expected Result:** Invalid credentials error (query is parameterized)

---

## Test 4: Secure Session Management ✅

**What we're testing:** JWT tokens are properly secured

### Test 4.1: Token Expiration

```bash
# Login and get token
curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

**Check:** Token should have 2-hour expiry (decode at jwt.io)

### Test 4.2: Invalid Token Format

```bash
# Try malformed token
curl -X GET http://localhost:4000/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Expected Result:**
```json
{"error":"INVALID_TOKEN"}
```

### Test 4.3: Expired Token (if you have one)

```bash
# Use an expired token
curl -X GET http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_EXPIRED_TOKEN"
```

**Expected Result:**
```json
{"error":"TOKEN_EXPIRED"}
```

### Test 4.4: Token Algorithm Verification

```bash
# Create a token with wrong algorithm (HS384 instead of HS256)
# This requires manual token creation - the server should reject it
```

**Expected Result:** Token rejected (algorithm mismatch)

---

## Test 5: HTTP Security Headers ✅

**What we're testing:** All security headers are present

### Test 5.1: Check All Headers

```bash
curl -I http://localhost:4000/
```

**Expected Headers (verify ALL are present):**

| Header | Expected Value |
|--------|----------------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `Permissions-Policy` | (should restrict camera, mic, etc.) |

### Test 5.2: Verify X-Powered-By is Hidden

```bash
curl -I http://localhost:4000/ | grep -i "x-powered-by"
```

**Expected Result:** No output (header should NOT exist)

### Test 5.3: Check API Routes Have No-Cache Headers

```bash
curl -I http://localhost:4000/api/jobs
```

**Expected Headers for API routes:**
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `Pragma: no-cache`

---

## Test 6: Rate Limiting ✅

**What we're testing:** Brute force attacks are blocked

### Test 6.1: Authentication Rate Limit (10 requests/15 min)

```bash
# Run this to test rate limiting
for i in {1..12}; do
  echo "Request $i:"
  curl -s -X POST http://localhost:4000/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' | head -c 100
  echo ""
done
```

**Expected Result:**
- Requests 1-10: `{"error":"Invalid email or password"}`
- Requests 11-12: `{"error":"Too many authentication attempts, please try again later"}`

### Test 6.2: API Rate Limit (100 requests/min)

```bash
# Run 105 rapid requests to a general API endpoint
for i in {1..105}; do
  curl -s http://localhost:4000/ > /dev/null
  if [ $i -eq 100 ] || [ $i -eq 105 ]; then
    echo "Request $i:"
    curl -s http://localhost:4000/
    echo ""
  fi
done
```

**Expected Result:** Request 105 should be rate limited

---

## Test 7: Security Audit Script ✅

**What we're testing:** Automated security checks pass

### Test 7.1: Run Security Audit

```bash
cd backend
npm run security:audit
```

**Expected Result:**
- ✅ All "PASS" checks should pass
- ⚠️ Warnings are acceptable (review them)
- ❌ No "FAIL" results

### Test 7.2: Run NPM Audit

```bash
cd backend
npm audit
```

**Expected Result:** Shows vulnerability report (document any unfixable ones)

---

## Test 8: Frontend Security Verification ✅

### Test 8.1: Check Token Storage

1. Open http://localhost:5173/login
2. Login with valid credentials
3. Open DevTools → Application → Local Storage
4. Verify token is stored in `localStorage` (not cookies)

### Test 8.2: Verify Token in Requests

1. After login, go to any authenticated page (e.g., Dashboard)
2. Open DevTools → Network tab
3. Click on any API request
4. Check Headers → Request Headers
5. Verify `Authorization: Bearer <token>` is present

### Test 8.3: Test Logout

1. Click Logout
2. Check localStorage - token should be removed
3. Try accessing protected page - should redirect to login

---

## Test 9: Browser Security Headers Check ✅

### Test 9.1: Use Security Headers Scanner

1. If deployed, use: https://securityheaders.com
2. For local testing, use browser DevTools:
   - Open http://localhost:4000
   - DevTools → Network → click any request → Headers tab
   - Verify all security headers are present

---

## Test Summary Checklist

Use this checklist to track your testing:

| # | Test | Status |
|---|------|--------|
| 1.1 | CSRF - Protected endpoints require auth | ☐ |
| 1.2 | CSRF - Content-Type validation | ☐ |
| 1.3 | CSRF - Token-based auth works | ☐ |
| 2.1 | XSS - Script tag injection blocked | ☐ |
| 2.2 | XSS - Event handler injection blocked | ☐ |
| 2.3 | XSS - JavaScript protocol blocked | ☐ |
| 2.4 | XSS - Browser form test | ☐ |
| 3.1 | SQLi - Classic injection blocked | ☐ |
| 3.2 | SQLi - Query parameter injection blocked | ☐ |
| 3.3 | SQLi - Union injection blocked | ☐ |
| 4.1 | JWT - Token has 2hr expiry | ☐ |
| 4.2 | JWT - Invalid token rejected | ☐ |
| 4.3 | JWT - Expired token rejected | ☐ |
| 5.1 | Headers - All security headers present | ☐ |
| 5.2 | Headers - X-Powered-By hidden | ☐ |
| 5.3 | Headers - API no-cache headers | ☐ |
| 6.1 | Rate limit - Auth (10/15min) | ☐ |
| 6.2 | Rate limit - API (100/min) | ☐ |
| 7.1 | Audit - security:audit passes | ☐ |
| 7.2 | Audit - npm audit documented | ☐ |
| 8.1 | Frontend - Token in localStorage | ☐ |
| 8.2 | Frontend - Auth header sent | ☐ |
| 8.3 | Frontend - Logout clears token | ☐ |

---

## Quick Reference Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend  
cd frontend && npm run dev

# Run security audit
cd backend && npm run security:audit

# Check npm vulnerabilities
npm audit

# Check security headers
curl -I http://localhost:4000/

# Test rate limiting
for i in {1..12}; do curl -s -X POST http://localhost:4000/login -H "Content-Type: application/json" -d '{"email":"t@t.com","password":"x"}' && echo ""; done
```

---

## Files Modified/Created for UC-135

| File | Purpose |
|------|---------|
| `backend/middleware/security.js` | XSS sanitization, security middleware |
| `backend/scripts/security-audit.js` | Automated security checks |
| `backend/server.js` | Security headers, middleware integration |
| `backend/auth.js` | Enhanced JWT verification |
| `SECURITY.md` | Security documentation |
| `UC135_SECURITY_TESTING_GUIDE.md` | This testing guide |

---

*Last Updated: December 2025*

