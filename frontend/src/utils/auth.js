// src/utils/auth.js
// Frontend utility for getting authenticated user ID from JWT token

/**
 * Get the current user's ID from the JWT token
 * This matches the backend token structure where user ID is stored as "id"
 * @returns {number|null} User ID or null if not authenticated
 */
export const getUserId = () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token found - user not logged in');
        return null;
      }
      
      // Decode JWT token (format: header.payload.signature)
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      
      // Backend stores user ID as "id" field (see backend auth middleware)
      const userId = payload.id || payload.userId || payload.sub || payload.user_id;
      
      if (!userId) {
        console.error('No user ID found in token payload:', payload);
        return null;
      }
      
      // Ensure it's a number
      return typeof userId === 'number' ? userId : parseInt(userId, 10);
    } catch (err) {
      console.error('Error decoding auth token:', err);
      return null;
    }
  };
  
  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };
  
  /**
   * Get user email from token
   * @returns {string|null}
   */
  export const getUserEmail = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      return payload.email || null;
    } catch (err) {
      console.error('Error getting user email:', err);
      return null;
    }
  };
  
  /**
   * Get the full decoded token payload
   * @returns {object|null}
   */
  export const getTokenPayload = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const base64Payload = token.split('.')[1];
      return JSON.parse(atob(base64Payload));
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };