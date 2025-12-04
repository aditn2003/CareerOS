/**
 * Reminder Scheduler Utility - Full Coverage Tests
 * File: backend/utils/reminderScheduler.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import {
  generatePeriodicReminders,
  getRecurringCheckInStats,
  updateRecurringCheckIn,
} from '../../utils/reminderScheduler.js';

// ============================================
// MOCKS
// ============================================

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockLte = vi.fn();
const mockSelectResult = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    lte: mockLte,
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ============================================
// SETUP
// ============================================

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Reminder Scheduler Utility - Full Coverage', () => {
  describe('generatePeriodicReminders', () => {
    it('should generate reminders for due check-ins', async () => {
      const mockCheckIns = [
        {
          id: 1,
          user_id: 1,
          contact_name: 'John Doe',
          contact_company: 'Tech Corp',
          frequency_days: 7,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn(() => ({
              data: mockCheckIns,
              error: null,
            })),
          })),
        })),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn(() => ({
              data: mockCheckIns,
              error: null,
            })),
          })),
        })),
      }).mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: 1 }],
            error: null,
          })),
        })),
      }).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null,
          })),
        })),
      });

      const result = await generatePeriodicReminders();

      expect(result.success).toBe(true);
      expect(result.reminders_generated).toBe(1);
    });

    it('should return success with 0 reminders if none due', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      });

      const result = await generatePeriodicReminders();

      expect(result.success).toBe(true);
      expect(result.reminders_generated).toBe(0);
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn(() => ({
              data: null,
              error: { message: 'Fetch error' },
            })),
          })),
        })),
      });

      const result = await generatePeriodicReminders();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle reminder creation error', async () => {
      const mockCheckIns = [
        {
          id: 1,
          user_id: 1,
          contact_name: 'John Doe',
          frequency_days: 7,
        },
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: mockCheckIns,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              data: null,
              error: { message: 'Insert error' },
            })),
          })),
        });

      const result = await generatePeriodicReminders();

      expect(result.success).toBe(true);
      expect(result.errors).toBeDefined();
    });

    it('should handle update error gracefully', async () => {
      const mockCheckIns = [
        {
          id: 1,
          user_id: 1,
          contact_name: 'John Doe',
          frequency_days: 7,
        },
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: mockCheckIns,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              data: [{ id: 1 }],
              error: null,
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: { message: 'Update error' },
            })),
          })),
        });

      const result = await generatePeriodicReminders();

      expect(result.success).toBe(true);
    });
  });

  describe('getRecurringCheckInStats', () => {
    it('should return stats for user', async () => {
      const mockCheckIns = [
        {
          id: 1,
          frequency: 'weekly',
          priority: 'high',
          next_reminder_date: '2024-01-15',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: mockCheckIns,
              error: null,
            })),
          })),
        })),
      });

      const result = await getRecurringCheckInStats(1);

      expect(result).toBeDefined();
      expect(result.total_active).toBe(1);
    });

    it('should handle error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: null,
              error: { message: 'Error' },
            })),
          })),
        })),
      });

      const result = await getRecurringCheckInStats(1);

      expect(result).toBeNull();
    });
  });

  describe('updateRecurringCheckIn', () => {
    it('should update check-in', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                data: [{ id: 1 }],
                error: null,
              })),
            })),
          })),
        })),
      });

      const result = await updateRecurringCheckIn(1, 1, { priority: 'high' });

      expect(result.success).toBe(true);
    });

    it('should calculate next date when frequency updated', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                data: [{ id: 1 }],
                error: null,
              })),
            })),
          })),
        })),
      });

      const result = await updateRecurringCheckIn(1, 1, { frequency: 'weekly' });

      expect(result.success).toBe(true);
    });

    it('should handle error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                data: null,
                error: { message: 'Error' },
              })),
            })),
          })),
        })),
      });

      const result = await updateRecurringCheckIn(1, 1, { priority: 'high' });

      expect(result.success).toBe(false);
    });
  });
});

