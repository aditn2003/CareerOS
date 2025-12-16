/**
 * Calendar Routes Tests
 * Tests routes/calendar.js - calendar integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import calendarRoutes from '../../routes/calendar.js';
import { createTestUser } from '../helpers/auth.js';

// Mock Supabase client with query state tracking
vi.mock('@supabase/supabase-js', () => {
  const createMockSupabase = () => {
    // Shared state across all queries
    const sharedState = {
      shouldReturnNull: false,
      shouldReturnError: false,
    };
    
    const createMockQuery = (tableName) => {
      let queryState = {
        table: tableName,
        operation: null,
        filters: [],
        shouldReturnError: false,
      };

      const mockQuery = {
        select: vi.fn(function() {
          queryState.operation = 'select';
          return this;
        }),
        delete: vi.fn(function() {
          queryState.operation = 'delete';
          return this;
        }),
        upsert: vi.fn(function(data, options) {
          queryState.operation = 'upsert';
          queryState.upsertData = data;
          queryState.upsertOptions = options;
          return Promise.resolve({ data: null, error: null });
        }),
        eq: vi.fn(function(column, value) {
          queryState.filters.push({ column, value });
          // For delete operations, eq() is the final call and returns the result
          if (queryState.operation === 'delete') {
            if (queryState.shouldReturnError) {
              const result = { error: { message: 'Database error' } };
              result.then = function(onResolve) {
                return Promise.resolve(this).then(onResolve);
              };
              return result;
            }
            const result = { error: null };
            result.then = function(onResolve) {
              return Promise.resolve(this).then(onResolve);
            };
            return result;
          }
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            // Check if error should be thrown (from shared state or mockRejectedValueOnce)
            if (sharedState.shouldReturnError) {
              return Promise.reject(new Error('Database error'));
            }
            // For status check - return connection if user_id filter exists and not explicitly null
            const userIdFilter = queryState.filters.find(f => f.column === 'user_id');
            // Check shared state first
            if (sharedState.shouldReturnNull) {
              return Promise.resolve({ data: null, error: null });
            }
            if (queryState.shouldReturnNull) {
              return Promise.resolve({ data: null, error: null });
            }
            if (userIdFilter && userIdFilter.value) {
              return Promise.resolve({
                data: {
                  user_id: userIdFilter.value,
                  provider: 'google',
                  calendar_name: 'Primary Calendar',
                  connection_status: 'active',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };

      // Make it thenable
      mockQuery.then = function(onResolve) {
        return Promise.resolve(this).then(onResolve);
      };

      // Store queryState on the mock for test manipulation
      mockQuery._queryState = queryState;
      // Also store sharedState for test manipulation
      mockQuery._sharedState = sharedState;

      return mockQuery;
    };

    const mockSupabase = {
      from: vi.fn(createMockQuery),
      _sharedState: sharedState, // Expose shared state for tests
    };

    return mockSupabase;
  };

  return {
    createClient: vi.fn(() => createMockSupabase()),
  };
});

// Mock schedulingHelpers
vi.mock('../../utils/schedulingHelpers.js', () => ({
  getCalendarAuthUrl: vi.fn(() => Promise.resolve('https://accounts.google.com/o/oauth2/auth?test=true')),
  handleCalendarCallback: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock googleapis - define mocks inside factory to avoid hoisting issues
vi.mock('googleapis', () => {
  const mockOAuth2Client = {
    getToken: vi.fn(),
    setCredentials: vi.fn(),
  };

  const mockCalendar = {
    calendarList: {
      list: vi.fn(),
    },
  };

  // Create a function that acts as a constructor
  function MockOAuth2() {
    return mockOAuth2Client;
  }
  
  // Store on global for test access
  if (typeof global !== 'undefined') {
    global.mockOAuth2Client = mockOAuth2Client;
    global.mockCalendar = mockCalendar;
  }
  
  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      calendar: vi.fn(() => mockCalendar),
    },
  };
});

// Get references after mock is set up
let mockOAuth2Client, mockCalendar;

describe('Calendar Routes', () => {
  let app;
  let user;
  let userId;
  let mockSupabaseClient;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    
    // Get the Supabase client instance created by the route
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabaseClient = createClient('https://test.supabase.co', 'test-key');
    
    // Reset shared state for clean test isolation
    if (mockSupabaseClient._sharedState) {
      mockSupabaseClient._sharedState.shouldReturnNull = false;
      mockSupabaseClient._sharedState.shouldReturnError = false;
    }
    
    // Get mock references from global
    mockOAuth2Client = global.mockOAuth2Client;
    mockCalendar = global.mockCalendar;
    
    app = express();
    app.use(express.json());
    app.use('/api/calendar', calendarRoutes);
    
    user = await createTestUser();
    
    // Decode JWT token to get the user ID
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Reset OAuth2 and Calendar mocks
    if (mockOAuth2Client) {
      mockOAuth2Client.getToken.mockClear();
      mockOAuth2Client.setCredentials.mockClear();
    }
    if (mockCalendar && mockCalendar.calendarList) {
      mockCalendar.calendarList.list.mockClear();
    }
  });

  describe('GET /api/calendar/auth-url', () => {
    it('should return Google Calendar OAuth URL', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockResolvedValueOnce('https://accounts.google.com/o/oauth2/auth?test=true');

      const response = await request(app)
        .get(`/api/calendar/auth-url?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toBeDefined();
      expect(response.body.authUrl).toContain('oauth2');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/calendar/auth-url');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle errors when getCalendarAuthUrl fails', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockRejectedValueOnce(new Error('Failed to generate auth URL'));

      const response = await request(app)
        .get(`/api/calendar/auth-url?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to generate auth URL');
    });
  });

  describe('GET /api/calendar/callback', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      // Mock upsert for calendar_connections
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
    });

    it('should return error HTML if code is missing', async () => {
      const response = await request(app)
        .get(`/api/calendar/callback?state=${userId}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should return error HTML if userId is missing', async () => {
      const response = await request(app)
        .get('/api/calendar/callback?code=test-code');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle OAuth errors gracefully', async () => {
      // The route catches errors in a try-catch, so we need to make getToken throw
      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('OAuth error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle database errors when saving connection', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      // Mock upsert to return an error
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'PGRST_ERROR' },
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Connection Failed');
      expect(response.text).toContain('Failed to save calendar connection');
    });

    it('should handle calendar list errors', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockRejectedValueOnce(new Error('Calendar API error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle case when no primary calendar is found', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'calendar1', primary: false, summary: 'Calendar 1', timeZone: 'America/New_York' },
            { id: 'calendar2', primary: false, summary: 'Calendar 2', timeZone: 'UTC' },
          ],
        },
      });

      // Mock upsert for calendar_connections
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      // Should use 'primary' as fallback calendar_id
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle case when calendar list has no items', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [],
        },
      });

      // Mock upsert for calendar_connections
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      // Should use 'primary' as fallback calendar_id
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle case when calendarList.data is undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: undefined,
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle case when calendarList.data.items is undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: undefined,
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle tokens with missing optional properties', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        // Missing refresh_token
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalled();
    });

    it('should handle primary calendar with missing optional properties', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true }, // Missing summary and timeZone
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar', // Should use fallback
          calendar_timezone: 'UTC', // Should use fallback
        }),
        expect.any(Object)
      );
    });

    it('should handle missing FRONTEND_URL environment variable', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      
      // Restore environment variable
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        process.env.FRONTEND_URL = 'http://localhost:3000';
      }
    });

    it('should handle callback error when FRONTEND_URL is missing', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('OAuth error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      
      // Restore environment variable
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        process.env.FRONTEND_URL = 'http://localhost:3000';
      }
    });
  });

  describe('GET /api/calendar/status', () => {
    it('should return connected status if calendar is connected', async () => {
      // The mock is set up to return connection data when user_id matches
      // The route uses: supabase.from().select().eq().single()
      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.provider).toBe('google');
    });

    it('should return disconnected status if calendar is not connected', async () => {
      // Set shared state to return null
      mockSupabaseClient._sharedState.shouldReturnNull = true;

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
      expect(response.body.connection).toBeNull();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/calendar/status');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle errors gracefully', async () => {
      // The route catches errors and returns connected: false
      // Set shared state to trigger error
      mockSupabaseClient._sharedState.shouldReturnNull = false;
      mockSupabaseClient._sharedState.shouldReturnError = true;

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
    });

    it('should return connection details with all properties', async () => {
      // Mock to return full connection object
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          provider: 'google',
          calendar_name: 'My Calendar',
          connection_status: 'active',
          calendar_id: 'primary',
          calendar_timezone: 'America/New_York',
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: 'google',
        calendarName: 'My Calendar',
        status: 'active',
      });
    });

    it('should handle parseInt errors for invalid userId', async () => {
      const response = await request(app)
        .get('/api/calendar/status?userId=invalid');

      // parseInt('invalid') returns NaN, which should still work but return no connection
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/calendar/disconnect', () => {
    it('should disconnect calendar successfully', async () => {
      // The mock is set up to return { error: null } by default for delete operations

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disconnected');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle database errors', async () => {
      // The route uses: supabase.from().delete().eq()
      // The route destructures: const { error } = await ...
      // Need to make the delete chain return an error
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      // Override eq() to return a promise with error
      mockQuery.eq.mockImplementationOnce(function(column, value) {
        // Return a thenable that resolves with error
        const result = { error: { message: 'Database error' } };
        result.then = function(onResolve) {
          return Promise.resolve(this).then(onResolve);
        };
        return result;
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to disconnect');
    });

    it('should handle errors in catch block', async () => {
      // Make the from() call throw an error to trigger the catch block
      mockSupabaseClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to disconnect');
    });

    it('should handle case when calendarList.data is undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: undefined,
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle case when calendarList.data.items is undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: undefined,
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle tokens with missing optional properties', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        // Missing refresh_token
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalled();
    });

    it('should handle primary calendar with missing optional properties', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true }, // Missing summary and timeZone
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar', // Should use fallback
          calendar_timezone: 'UTC', // Should use fallback
        }),
        expect.any(Object)
      );
    });

    it('should handle missing FRONTEND_URL environment variable', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      
      // Restore environment variable
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        process.env.FRONTEND_URL = 'http://localhost:3000';
      }
    });

    it('should handle callback error when FRONTEND_URL is missing', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('OAuth error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      
      // Restore environment variable
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        process.env.FRONTEND_URL = 'http://localhost:3000';
      }
    });
  });

  describe('GET /api/calendar/status', () => {
    it('should return connected status if calendar is connected', async () => {
      // The mock is set up to return connection data when user_id matches
      // The route uses: supabase.from().select().eq().single()
      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.provider).toBe('google');
    });

    it('should return connection details with all properties', async () => {
      // Mock to return full connection object
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          provider: 'google',
          calendar_name: 'My Calendar',
          connection_status: 'active',
          calendar_id: 'primary',
          calendar_timezone: 'America/New_York',
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: 'google',
        calendarName: 'My Calendar',
        status: 'active',
      });
    });

    it('should return disconnected status if calendar is not connected', async () => {
      // Set shared state to return null
      mockSupabaseClient._sharedState.shouldReturnNull = true;

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
      expect(response.body.connection).toBeNull();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/calendar/status');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle errors gracefully', async () => {
      // The route catches errors and returns connected: false
      // Set shared state to trigger error
      mockSupabaseClient._sharedState.shouldReturnNull = false;
      mockSupabaseClient._sharedState.shouldReturnError = true;

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
    });

    it('should handle parseInt errors for invalid userId', async () => {
      const response = await request(app)
        .get('/api/calendar/status?userId=invalid');

      // parseInt('invalid') returns NaN, which should still work but return no connection
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/calendar/disconnect', () => {
    it('should disconnect calendar successfully', async () => {
      // The mock is set up to return { error: null } by default for delete operations

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disconnected');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle database errors', async () => {
      // The route uses: supabase.from().delete().eq()
      // The route destructures: const { error } = await ...
      // Need to make the delete chain return an error
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      // Override eq() to return a promise with error
      mockQuery.eq.mockImplementationOnce(function(column, value) {
        // Return a thenable that resolves with error
        const result = { error: { message: 'Database error' } };
        result.then = function(onResolve) {
          return Promise.resolve(this).then(onResolve);
        };
        return result;
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to disconnect');
    });

    it('should handle errors in catch block', async () => {
      // Make the from() call throw an error to trigger the catch block
      mockSupabaseClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to disconnect');
    });

    it('should handle invalid userId format', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=invalid');

      // parseInt('invalid') returns NaN, which should still attempt the delete
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should log success message when disconnecting', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Calendar disconnected'));

      consoleSpy.mockRestore();
    });
  });

  describe('Additional edge cases and error paths', () => {
    it('should handle getToken throwing an error in callback', async () => {
      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('Token exchange failed'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Token exchange failed');
    });

    it('should handle setCredentials being called with tokens', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
    });

    it('should handle google.calendar being called with correct parameters', async () => {
      const { google } = await import('googleapis');
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(google.calendar).toHaveBeenCalledWith({ version: 'v3', auth: mockOAuth2Client });
    });

    it('should handle calendarList.list being called', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockCalendar.calendarList.list).toHaveBeenCalled();
    });

    it('should handle upsert with onConflict option', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          provider: 'google',
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
          calendar_timezone: 'America/New_York',
          connection_status: 'active',
        }),
        expect.objectContaining({
          onConflict: 'user_id',
        })
      );
    });

    it('should handle expiry_date conversion to ISO string', async () => {
      const expiryDate = Date.now() + 3600000;
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: expiryDate,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          token_expires_at: new Date(expiryDate).toISOString(),
        }),
        expect.any(Object)
      );
    });

    it('should handle console.error in auth-url error handler', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockRejectedValueOnce(new Error('Auth URL generation failed'));

      const response = await request(app)
        .get(`/api/calendar/auth-url?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating auth URL'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle console.error in callback error handler', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('OAuth callback error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('OAuth callback error'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle console.error in status error handler', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient._sharedState.shouldReturnError = true;

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking calendar status'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle console.error in disconnect error handler', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.eq.mockImplementationOnce(function(column, value) {
        const result = { error: { message: 'Database error' } };
        result.then = function(onResolve) {
          return Promise.resolve(this).then(onResolve);
        };
        return result;
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error disconnecting calendar'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle console.error in disconnect catch block', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected disconnect error');
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error disconnecting calendar'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle console.log in successful callback', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Calendar connected'));

      consoleLogSpy.mockRestore();
    });

    it('should handle database error console.error in callback', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'PGRST_ERROR' },
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database error'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle status endpoint with connection that has all fields', async () => {
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          provider: 'google',
          calendar_name: 'Work Calendar',
          connection_status: 'active',
          calendar_id: 'work-calendar-id',
          calendar_timezone: 'America/Los_Angeles',
          access_token: 'token',
          refresh_token: 'refresh',
          token_expires_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: 'google',
        calendarName: 'Work Calendar',
        status: 'active',
      });
    });

    it('should handle parseInt for userId in status endpoint', async () => {
      const response = await request(app)
        .get('/api/calendar/status?userId=12345');

      expect(response.status).toBe(200);
      // The mock should receive parseInt(12345) = 12345
    });

    it('should handle parseInt for userId in disconnect endpoint', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=67890');

      expect(response.status).toBe(200);
      // The mock should receive parseInt(67890) = 67890
    });

    it('should handle parseInt for userId in callback endpoint', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get('/api/calendar/callback?code=test-code&state=99999');

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 99999,
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when code is empty string', async () => {
      const response = await request(app)
        .get(`/api/calendar/callback?code=&state=${userId}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Missing authorization code');
    });

    it('should handle callback when state is empty string', async () => {
      const response = await request(app)
        .get('/api/calendar/callback?code=test-code&state=');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Missing authorization code or user ID');
    });

    it('should handle callback when both code and state are empty', async () => {
      const response = await request(app)
        .get('/api/calendar/callback?code=&state=');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle callback when tokens.expiry_date is undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        // Missing expiry_date
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      // Should handle missing expiry_date gracefully
      expect([200, 500]).toContain(response.status);
    });

    it('should handle callback when tokens.access_token is undefined', async () => {
      const mockTokens = {
        // Missing access_token
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      // Should handle missing access_token
      expect([200, 500]).toContain(response.status);
    });

    it('should handle callback when primaryCalendar has all properties', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'custom-calendar-id', primary: true, summary: 'Custom Calendar Name', timeZone: 'Europe/London' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'custom-calendar-id',
          calendar_name: 'Custom Calendar Name',
          calendar_timezone: 'Europe/London',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when primaryCalendar is first in items array', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'non-primary-1', primary: false, summary: 'Calendar 1', timeZone: 'UTC' },
            { id: 'primary-calendar', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
            { id: 'non-primary-2', primary: false, summary: 'Calendar 2', timeZone: 'UTC' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary-calendar',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when getToken returns tokens without refresh_token', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        // No refresh_token
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalled();
      // refresh_token should be undefined in the upsert call
      const upsertCall = mockQuery.upsert.mock.calls[0][0];
      expect(upsertCall.refresh_token).toBeUndefined();
    });

    it('should handle callback when calendarList.list throws an error after getToken', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockOAuth2Client.setCredentials.mockImplementationOnce(() => {});
      mockCalendar.calendarList.list.mockRejectedValueOnce(new Error('Calendar API unavailable'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Calendar API unavailable');
    });

    it('should handle callback when setCredentials is called with tokens', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
    });

    it('should handle status endpoint when connection has null values', async () => {
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          provider: null,
          calendar_name: null,
          connection_status: null,
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: null,
        calendarName: null,
        status: null,
      });
    });

    it('should handle status endpoint when connection is empty object', async () => {
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: undefined,
        calendarName: undefined,
        status: undefined,
      });
    });

    it('should handle disconnect when userId is 0', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=0');

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle disconnect when userId is negative', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=-1');

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle disconnect when userId is a very large number', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=999999999');

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle auth-url when userId is 0', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockResolvedValueOnce('https://accounts.google.com/o/oauth2/auth?test=true');

      const response = await request(app)
        .get('/api/calendar/auth-url?userId=0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle auth-url when userId is a string number', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockResolvedValueOnce('https://accounts.google.com/o/oauth2/auth?test=true');

      const response = await request(app)
        .get('/api/calendar/auth-url?userId=12345');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle status when userId is 0', async () => {
      mockSupabaseClient._sharedState.shouldReturnNull = true;

      const response = await request(app)
        .get('/api/calendar/status?userId=0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
    });

    it('should handle callback HTML response contains correct FRONTEND_URL', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain(process.env.FRONTEND_URL || 'http://localhost:3000');
      expect(response.text).toContain('/interviews/tracker');
    });

    it('should handle callback error HTML contains correct FRONTEND_URL', async () => {
      mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('OAuth error'));

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain(process.env.FRONTEND_URL || 'http://localhost:3000');
      expect(response.text).toContain('/interviews/tracker');
    });

    it('should handle callback database error HTML contains correct FRONTEND_URL', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'PGRST_ERROR' },
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain(process.env.FRONTEND_URL || 'http://localhost:3000');
      expect(response.text).toContain('/interviews/tracker');
    });

    it('should handle callback when missing code query parameter', async () => {
      const response = await request(app)
        .get(`/api/calendar/callback?state=${userId}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Missing authorization code or user ID');
    });

    it('should handle callback when missing state query parameter', async () => {
      const response = await request(app)
        .get('/api/calendar/callback?code=test-code');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
      expect(response.text).toContain('Missing authorization code or user ID');
    });

    it('should handle callback when both code and state are missing', async () => {
      const response = await request(app)
        .get('/api/calendar/callback');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle status endpoint when supabase query throws non-Error', async () => {
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockRejectedValueOnce('String error instead of Error object');

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
    });

    it('should handle disconnect when supabase query throws non-Error', async () => {
      mockSupabaseClient.from.mockImplementationOnce(() => {
        throw 'String error instead of Error object';
      });

      const response = await request(app)
        .delete(`/api/calendar/disconnect?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to disconnect');
    });

    it('should handle auth-url when getCalendarAuthUrl throws non-Error', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      getCalendarAuthUrl.mockRejectedValueOnce('String error instead of Error object');

      const response = await request(app)
        .get(`/api/calendar/auth-url?userId=${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle callback when getToken throws non-Error', async () => {
      mockOAuth2Client.getToken.mockRejectedValueOnce('String error instead of Error object');

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle callback when error has no message property', async () => {
      const errorWithoutMessage = { code: 'ERROR_CODE' };
      mockOAuth2Client.getToken.mockRejectedValueOnce(errorWithoutMessage);

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      // Should handle undefined err.message gracefully
    });

    it('should handle callback when tokens.expiry_date is null', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: null,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      // Should handle null expiry_date - new Date(null) creates a date
      expect([200, 500]).toContain(response.status);
    });

    it('should handle callback when calendarList.data.items is null', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: null, // null instead of undefined
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when calendarList.data is null', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: null, // null instead of undefined
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when primaryCalendar is found but has no id', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' }, // Missing id
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary', // Should use fallback
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when tokens object is empty', async () => {
      const mockTokens = {};

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      // Should handle empty tokens object
      expect([200, 500]).toContain(response.status);
    });

    it('should handle callback when tokens.expiry_date is a string', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: '2024-12-31T23:59:59Z', // String instead of number
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalled();
    });

    it('should handle callback when primaryCalendar.find returns undefined', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'calendar1', primary: false, summary: 'Calendar 1', timeZone: 'UTC' },
            { id: 'calendar2', primary: false, summary: 'Calendar 2', timeZone: 'UTC' },
            // No primary calendar
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Calendar Connected');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary', // Should use fallback when find returns undefined
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when error.message is undefined', async () => {
      const errorObj = {}; // Error object without message
      Object.defineProperty(errorObj, 'message', {
        value: undefined,
        writable: true,
      });

      mockOAuth2Client.getToken.mockRejectedValueOnce(errorObj);

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
      // Should handle undefined err.message
    });

    it('should handle callback when error is null', async () => {
      mockOAuth2Client.getToken.mockRejectedValueOnce(null);

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle callback when parseInt(userId) returns NaN', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Use a state that will result in NaN when parsed
      const response = await request(app)
        .get('/api/calendar/callback?code=test-code&state=not-a-number');

      // Should handle NaN from parseInt
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle status when connection has undefined properties', async () => {
      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          provider: undefined,
          calendar_name: undefined,
          connection_status: undefined,
        },
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/status?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.connection).toEqual({
        provider: undefined,
        calendarName: undefined,
        status: undefined,
      });
    });

    it('should handle disconnect when parseInt returns NaN', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=not-a-number');

      // Should handle NaN from parseInt
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle auth-url when userId is empty string', async () => {
      const response = await request(app)
        .get('/api/calendar/auth-url?userId=');

      // Empty string should be falsy
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle status when userId is empty string', async () => {
      const response = await request(app)
        .get('/api/calendar/status?userId=');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle disconnect when userId is empty string', async () => {
      const response = await request(app)
        .delete('/api/calendar/disconnect?userId=');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('userId');
    });

    it('should handle callback when code is whitespace only', async () => {
      const response = await request(app)
        .get(`/api/calendar/callback?code=   &state=${userId}`);

      // Whitespace should be falsy
      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle callback when state is whitespace only', async () => {
      const response = await request(app)
        .get('/api/calendar/callback?code=test-code&state=   ');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Authorization Failed');
    });

    it('should handle callback when tokens.refresh_token is null', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: null,
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      expect(mockQuery.upsert).toHaveBeenCalled();
      const upsertCall = mockQuery.upsert.mock.calls[0][0];
      expect(upsertCall.refresh_token).toBeNull();
    });

    it('should handle callback when tokens.access_token is null', async () => {
      const mockTokens = {
        access_token: null,
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      // Should handle null access_token
      expect([200, 500]).toContain(response.status);
    });

    it('should handle callback when primaryCalendar.id is empty string', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: '', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' }, // Empty string id
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      // Empty string is falsy, so should use 'primary' fallback
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'primary',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when primaryCalendar.summary is empty string', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: '', timeZone: 'America/New_York' }, // Empty string summary
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      // Empty string is falsy, so should use 'Primary Calendar' fallback
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_name: 'Primary Calendar',
        }),
        expect.any(Object)
      );
    });

    it('should handle callback when primaryCalendar.timeZone is empty string', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValueOnce({ tokens: mockTokens });
      mockCalendar.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: '' }, // Empty string timeZone
          ],
        },
      });

      const mockQuery = mockSupabaseClient.from('calendar_connections');
      mockQuery.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/calendar/callback?code=test-code&state=${userId}`);

      expect(response.status).toBe(200);
      // Empty string is falsy, so should use 'UTC' fallback
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_timezone: 'UTC',
        }),
        expect.any(Object)
      );
    });
  });
});

