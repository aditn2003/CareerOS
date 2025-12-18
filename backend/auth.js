import jwt from "jsonwebtoken";

/**
 * UC-135: Secure Authentication Middleware
 * 
 * Security features:
 * - Validates JWT token from Authorization header
 * - Verifies token issuer and audience
 * - Handles token expiration gracefully
 * - Prevents timing attacks via constant-time comparison (built into jwt.verify)
 */
export function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
  
  if (!token) {
    return res.status(401).json({ error: "NO_TOKEN" });
  }

  // Basic token format validation (3 parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return res.status(401).json({ error: "INVALID_TOKEN_FORMAT" });
  }

  try {
    const verifyOptions = {
      algorithms: ['HS256'], // Only allow expected algorithm
      issuer: 'ats-career-os',
      audience: 'ats-users',
      // Require expiration claim
      maxAge: '2h'
    };
    
    const data = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
    
    // ✅ Attach user object so routes can use req.user.id
    // Support both 'sub' (standard) and 'id' (legacy) claims
    req.user = { 
      id: data.sub || data.id, 
      email: data.email 
    };
    
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "TOKEN_EXPIRED" });
    }
    if (err.name === "JsonWebTokenError") {
      // Log suspicious activity for security monitoring
      if (process.env.NODE_ENV !== 'test') {
        console.warn('🔒 [AUTH] Invalid token attempt:', {
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          error: err.message
        });
      }
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }
    if (err.name === "NotBeforeError") {
      return res.status(401).json({ error: "TOKEN_NOT_ACTIVE" });
    }
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

// Export as authMiddleware for consistency across routes
export const authMiddleware = auth;
