/**
 * UC-117: Admin Authentication Middleware
 * Checks if user has admin/mentor privileges to access admin features
 */

import { auth } from "../auth.js";
import pool from "../db/pool.js";

/**
 * Middleware to check if user is an admin/mentor
 * Returns 403 if user is not authorized
 * Note: This should be used AFTER the auth middleware
 */
export function requireAdmin(req, res, next) {
  // This middleware assumes auth has already been verified
  // If req.user is not set, the auth middleware should have rejected the request
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      error: 'UNAUTHORIZED',
      message: 'Authentication required' 
    });
  }

  // Check admin status asynchronously
  (async () => {
    try {
      const userId = req.user.id;
      
      // Check if user is a mentor (admin access)
      const { rows } = await pool.query(
        "SELECT account_type FROM users WHERE id = $1",
        [userId]
      );
      
      const accountType = rows[0]?.account_type;
      
      if (accountType !== 'mentor') {
        return res.status(403).json({ 
          error: 'FORBIDDEN',
          message: 'Admin access required' 
        });
      }
      
      next();
    } catch (error) {
      console.error("Admin auth check failed:", error);
      return res.status(500).json({ error: 'AUTH_CHECK_FAILED' });
    }
  })();
}

/**
 * Helper function to check if user is admin (non-middleware)
 */
export async function isAdmin(userId) {
  try {
    const { rows } = await pool.query(
      "SELECT account_type FROM users WHERE id = $1",
      [userId]
    );
    return rows[0]?.account_type === 'mentor';
  } catch (error) {
    console.error("Admin check failed:", error);
    return false;
  }
}
