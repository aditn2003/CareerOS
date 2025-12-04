/**
 * Scheduling Helpers - Full Coverage Tests
 * File: backend/utils/schedulingHelpers.js
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ============================================
// MOCKS
// ============================================

const mockGenerateAuthUrl = vi.fn(() => 'https://accounts.google.com/oauth/authorize?test');
const mockGetToken = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockSetCredentials = vi.fn();
const mockEventsInsert = vi.fn();
const mockEventsUpdate = vi.fn();
const mockEventsDelete = vi.fn();

const mockOAuth2Client = {
  generateAuthUrl: mockGenerateAuthUrl,
  getToken: mockGetToken,
  refreshAccessToken: mockRefreshAccessToken,
  setCredentials: mockSetCredentials,
};

const mockCalendar = vi.fn(() => ({
  events: {
    insert: mockEventsInsert,
    update: mockEventsUpdate,
    delete: mockEventsDelete,
  },
}));

// Mock googleapis - must be before any imports
vi.mock('googleapis', () => {
  function MockOAuth2() {
    Object.assign(this, mockOAuth2Client);
  }
  Object.assign(MockOAuth2.prototype, mockOAuth2Client);
  
  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      calendar: mockCalendar,
    },
  };
});

const mockEmailsSend = vi.fn();
const mockResend = vi.fn(() => ({
  emails: {
    send: mockEmailsSend,
  },
}));

vi.mock('resend', () => ({
  Resend: mockResend,
}));

const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSupabaseSelect,
    update: mockSupabaseUpdate,
    eq: vi.fn(() => ({
      single: vi.fn(),
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

// ============================================
// SETUP
// ============================================

beforeAll(() => {
  process.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.EMAIL_FROM = 'test@example.com';
  process.env.FRONTEND_URL = 'http://localhost:5173';
});

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  mockSupabaseSelect.mockReturnValue({
    eq: vi.fn(() => ({
      single: vi.fn(),
    })),
  });
  
  mockEmailsSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
  mockGetToken.mockResolvedValue({
    tokens: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  });
  mockRefreshAccessToken.mockResolvedValue({
    credentials: {
      access_token: 'new-access-token',
      expiry_date: Date.now() + 3600000,
    },
  });
  mockEventsInsert.mockResolvedValue({ data: { id: 'event-123' } });
  mockEventsUpdate.mockResolvedValue({ data: { id: 'event-123' } });
  mockEventsDelete.mockResolvedValue({});
});

// ============================================
// TESTS
// ============================================

describe('Scheduling Helpers - Full Coverage', () => {
  describe('getCalendarAuthUrl', () => {
    it('should generate auth URL with user ID', async () => {
      const { getCalendarAuthUrl } = await import('../../utils/schedulingHelpers.js');
      
      const url = await getCalendarAuthUrl(123);
      
      expect(mockGenerateAuthUrl).toHaveBeenCalled();
      expect(url).toBe('https://accounts.google.com/oauth/authorize?test');
    });
  });

  describe('handleCalendarCallback', () => {
    it('should handle callback and return tokens', async () => {
      const { handleCalendarCallback } = await import('../../utils/schedulingHelpers.js');
      
      const tokens = await handleCalendarCallback('auth-code', mockSupabase);
      
      expect(mockGetToken).toHaveBeenCalledWith('auth-code');
      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBe('access-token');
    });

    it('should throw error on OAuth failure', async () => {
      mockGetToken.mockRejectedValueOnce(new Error('Invalid code'));
      
      const { handleCalendarCallback } = await import('../../utils/schedulingHelpers.js');
      
      await expect(handleCalendarCallback('invalid-code', mockSupabase)).rejects.toThrow();
    });
  });

  describe('syncToGoogleCalendar', () => {
    it('should create new calendar event', async () => {
      const mockConnection = {
        user_id: 1,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        calendar_id: 'primary',
        calendar_timezone: 'America/New_York',
      };

      const mockInterview = {
        user_id: 1,
        interview_date: '2024-12-25',
        interview_time: '14:00:00',
        duration_minutes: 60,
        role: 'Software Engineer',
        company: 'TechCorp',
        interview_type: 'Technical',
        interview_round: 1,
        notes: 'Be prepared',
        video_link: 'https://meet.google.com/abc',
        location_address: '123 Main St',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      const eventId = await syncToGoogleCalendar(mockInterview, mockSupabase);
      
      expect(mockEventsInsert).toHaveBeenCalled();
      expect(eventId).toBe('event-123');
    });

    it('should update existing calendar event', async () => {
      const mockConnection = {
        user_id: 1,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        calendar_id: 'primary',
        calendar_timezone: 'UTC',
      };

      const mockInterview = {
        user_id: 1,
        interview_date: '2024-12-25',
        interview_time: '14:00:00',
        duration_minutes: 90,
        role: 'Software Engineer',
        company: 'TechCorp',
        google_calendar_event_id: 'existing-event-123',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      const eventId = await syncToGoogleCalendar(mockInterview, mockSupabase);
      
      expect(mockEventsUpdate).toHaveBeenCalled();
      expect(eventId).toBe('event-123');
    });

    it('should return null if no calendar connection', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      const result = await syncToGoogleCalendar(
        { user_id: 1, interview_date: '2024-12-25' },
        mockSupabase
      );
      
      expect(result).toBeNull();
    });

    it('should refresh token if expired', async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const mockConnection = {
        user_id: 1,
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        token_expires_at: expiredDate,
        calendar_id: 'primary',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await syncToGoogleCalendar(
        {
          user_id: 1,
          interview_date: '2024-12-25',
          interview_time: '14:00:00',
          role: 'Engineer',
          company: 'TechCorp',
        },
        mockSupabase
      );
      
      expect(mockRefreshAccessToken).toHaveBeenCalled();
    });

    it('should handle interview without time', async () => {
      const mockConnection = {
        user_id: 1,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        calendar_id: 'primary',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await syncToGoogleCalendar(
        {
          user_id: 1,
          interview_date: '2024-12-25',
          role: 'Engineer',
          company: 'TechCorp',
        },
        mockSupabase
      );
      
      expect(mockEventsInsert).toHaveBeenCalled();
    });

    it('should throw error on sync failure', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockRejectedValue(new Error('Sync failed')),
        })),
      });

      const { syncToGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await expect(
        syncToGoogleCalendar(
          { user_id: 1, interview_date: '2024-12-25' },
          mockSupabase
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteFromGoogleCalendar', () => {
    it('should delete calendar event', async () => {
      const mockConnection = {
        user_id: 1,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        calendar_id: 'primary',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      const { deleteFromGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await deleteFromGoogleCalendar('event-123', 1, mockSupabase);
      
      expect(mockEventsDelete).toHaveBeenCalled();
    });

    it('should return early if no connection', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      const { deleteFromGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await deleteFromGoogleCalendar('event-123', 1, mockSupabase);
      
      expect(mockEventsDelete).not.toHaveBeenCalled();
    });

    it('should return early if no eventId', async () => {
      const { deleteFromGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      await deleteFromGoogleCalendar(null, 1, mockSupabase);
      
      expect(mockEventsDelete).not.toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      const mockConnection = {
        user_id: 1,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        calendar_id: 'primary',
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
        })),
      });

      mockEventsDelete.mockRejectedValueOnce(new Error('Delete failed'));

      const { deleteFromGoogleCalendar } = await import('../../utils/schedulingHelpers.js');
      
      // Should not throw
      await expect(deleteFromGoogleCalendar('event-123', 1, mockSupabase)).resolves.not.toThrow();
    });
  });

  describe('sendInterviewReminder', () => {
    it('should send 24h reminder email', async () => {
      const mockInterview = {
        company: 'TechCorp',
        role: 'Software Engineer',
        interview_type: 'Technical',
        interview_date: '2024-12-25',
        interview_time: '14:00:00',
        video_link: 'https://meet.google.com/abc',
        location_address: '123 Main St',
        interviewer_name: 'John Doe',
        interviewer_email: 'john@techcorp.com',
      };

      const { sendInterviewReminder } = await import('../../utils/schedulingHelpers.js');
      
      const result = await sendInterviewReminder(mockInterview, 'user@example.com', '24h');
      
      expect(mockEmailsSend).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should send 2h reminder email', async () => {
      const mockInterview = {
        company: 'TechCorp',
        role: 'Software Engineer',
        interview_date: '2024-12-25',
        interview_time: '14:00:00',
      };

      const { sendInterviewReminder } = await import('../../utils/schedulingHelpers.js');
      
      await sendInterviewReminder(mockInterview, 'user@example.com', '2h');
      
      expect(mockEmailsSend).toHaveBeenCalled();
    });

    it('should handle email send errors', async () => {
      mockEmailsSend.mockRejectedValueOnce(new Error('Email failed'));

      const { sendInterviewReminder } = await import('../../utils/schedulingHelpers.js');
      
      await expect(
        sendInterviewReminder(
          { company: 'TechCorp', interview_date: '2024-12-25' },
          'user@example.com',
          '24h'
        )
      ).rejects.toThrow();
    });

    it('should handle interview without optional fields', async () => {
      const { sendInterviewReminder } = await import('../../utils/schedulingHelpers.js');
      
      await sendInterviewReminder(
        {
          company: 'TechCorp',
          role: 'Engineer',
          interview_date: '2024-12-25',
        },
        'user@example.com',
        '24h'
      );
      
      expect(mockEmailsSend).toHaveBeenCalled();
    });
  });

  describe('sendInterviewConfirmation', () => {
    it('should send confirmation email', async () => {
      const mockInterview = {
        company: 'TechCorp',
        role: 'Software Engineer',
        interview_date: '2024-12-25',
        interview_time: '14:00:00',
        video_link: 'https://meet.google.com/abc',
      };

      const { sendInterviewConfirmation } = await import('../../utils/schedulingHelpers.js');
      
      const result = await sendInterviewConfirmation(mockInterview, 'user@example.com');
      
      expect(mockEmailsSend).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle email errors gracefully', async () => {
      mockEmailsSend.mockResolvedValueOnce({ data: null, error: { message: 'Email failed' } });

      const { sendInterviewConfirmation } = await import('../../utils/schedulingHelpers.js');
      
      // Should not throw
      await expect(
        sendInterviewConfirmation(
          { company: 'TechCorp', interview_date: '2024-12-25' },
          'user@example.com'
        )
      ).resolves.not.toThrow();
    });

    it('should handle interview without video link', async () => {
      const { sendInterviewConfirmation } = await import('../../utils/schedulingHelpers.js');
      
      await sendInterviewConfirmation(
        {
          company: 'TechCorp',
          role: 'Engineer',
          interview_date: '2024-12-25',
        },
        'user@example.com'
      );
      
      expect(mockEmailsSend).toHaveBeenCalled();
    });
  });
});

