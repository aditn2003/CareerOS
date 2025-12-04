/**
 * Calendar Routes - Full Coverage Tests
 * File: backend/routes/calendar.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockSupabaseQuery = vi.fn();
const mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  delete: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

const mockSupabaseClient = {
  from: mockSupabaseFrom,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Note: calendar.js doesn't actually use these functions, but we mock them anyway
const mockGetCalendarAuthUrl = vi.fn();
const mockHandleCalendarCallback = vi.fn();

vi.mock('../../utils/schedulingHelpers.js', () => ({
  getCalendarAuthUrl: mockGetCalendarAuthUrl,
  handleCalendarCallback: mockHandleCalendarCallback,
}));

const mockOAuth2Client = {
  getToken: vi.fn(),
  setCredentials: vi.fn(),
  generateAuthUrl: vi.fn(() => 'https://accounts.google.com/auth'),
};

const mockCalendar = {
  calendarList: {
    list: vi.fn(),
  },
};

// Mock googleapis BEFORE importing calendar route
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        constructor() {
          return mockOAuth2Client;
        }
      },
    },
    calendar: vi.fn(() => mockCalendar),
  },
}));

// ============================================
// SETUP
// ============================================

let app;
let calendarRouter;

beforeAll(async () => {
  // Set environment variables BEFORE importing
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  process.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.FRONTEND_URL = 'http://localhost:3000';

  // Import after mocks are set up
  const calendarModule = await import('../../routes/calendar.js');
  calendarRouter = calendarModule.default;
  app = express();
  app.use(express.json());
  app.use('/api/calendar', calendarRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCalendarAuthUrl.mockResolvedValue('https://accounts.google.com/auth');
  mockOAuth2Client.getToken.mockResolvedValue({
    tokens: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  });
  mockCalendar.calendarList.list.mockResolvedValue({
    data: {
      items: [
        { id: 'primary', primary: true, summary: 'Primary Calendar', timeZone: 'America/New_York' },
      ],
    },
  });
});

// ============================================
// TESTS
// ============================================

describe('Calendar Routes - Full Coverage', () => {
  describe('GET /api/calendar/auth-url', () => {
    it('should return auth URL successfully', async () => {
      // The route actually uses getCalendarAuthUrl from schedulingHelpers
      mockGetCalendarAuthUrl.mockResolvedValue('https://accounts.google.com/oauth');

      const res = await request(app)
        .get('/api/calendar/auth-url')
        .query({ userId: '1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authUrl).toBe('https://accounts.google.com/oauth');
      expect(mockGetCalendarAuthUrl).toHaveBeenCalledWith('1');
    });

    it('should return 400 if userId is missing', async () => {
      const res = await request(app)
        .get('/api/calendar/auth-url');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('userId is required');
    });

    it('should return 500 on error', async () => {
      mockGetCalendarAuthUrl.mockRejectedValue(new Error('Auth error'));

      const res = await request(app)
        .get('/api/calendar/auth-url')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Failed to generate auth URL');
    });
  });

  describe('GET /api/calendar/callback', () => {
    it('should handle OAuth callback successfully', async () => {
      mockSupabaseFrom.mockReturnValue({
        upsert: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
      });

      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code', state: '1' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Calendar Connected!');
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth-code');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
    });

    it('should return error HTML if code is missing', async () => {
      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ state: '1' });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Authorization Failed');
      expect(res.text).toContain('Missing authorization code');
    });

    it('should return error HTML if userId is missing', async () => {
      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code' });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Authorization Failed');
    });

    it('should handle database error', async () => {
      mockSupabaseFrom.mockReturnValue({
        upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } })),
      });

      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code', state: '1' });

      expect(res.status).toBe(500);
      expect(res.text).toContain('Connection Failed');
    });

    it('should handle OAuth error', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('OAuth error'));

      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code', state: '1' });

      expect(res.status).toBe(500);
      expect(res.text).toContain('Authorization Failed');
    });

    it('should handle calendar without primary calendar', async () => {
      mockCalendar.calendarList.list.mockResolvedValue({
        data: { items: [] },
      });

      mockSupabaseFrom.mockReturnValue({
        upsert: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
      });

      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code', state: '1' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Calendar Connected!');
    });
  });

  describe('GET /api/calendar/status', () => {
    it('should return connection status when connected', async () => {
      const mockConnection = {
        user_id: 1,
        provider: 'google',
        calendar_name: 'Primary Calendar',
        connection_status: 'active',
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockConnection, error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/calendar/status')
        .query({ userId: '1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(true);
      expect(res.body.connection.provider).toBe('google');
    });

    it('should return not connected when no connection exists', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/calendar/status')
        .query({ userId: '1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(false);
    });

    it('should return 400 if userId is missing', async () => {
      const res = await request(app)
        .get('/api/calendar/status');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('userId is required');
    });

    it('should handle errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('DB error'))),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/calendar/status')
        .query({ userId: '1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(false);
    });
  });

  describe('DELETE /api/calendar/disconnect', () => {
    it('should disconnect calendar successfully', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const res = await request(app)
        .delete('/api/calendar/disconnect')
        .query({ userId: '1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Calendar disconnected successfully');
    });

    it('should return 400 if userId is missing', async () => {
      const res = await request(app)
        .delete('/api/calendar/disconnect');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('userId is required');
    });

    it('should return 500 on database error', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } })),
        })),
      });

      const res = await request(app)
        .delete('/api/calendar/disconnect')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Failed to disconnect calendar');
    });

    it('should handle exceptions', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(new Error('Connection error'))),
        })),
      });

      const res = await request(app)
        .delete('/api/calendar/disconnect')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});

