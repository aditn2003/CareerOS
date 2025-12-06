// Mock for auth.js module
import { jest } from '@jest/globals';

export const auth = jest.fn((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token) {
    return res.status(401).json({ error: 'NO_TOKEN' });
  }
  
  if (token === 'invalid-token' || token === 'expired-token') {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
  
  // Set user on request
  req.user = { id: 1, email: 'test@example.com' };
  req.userId = 1;
  next();
});

export default { auth };



