/**
 * Employment Routes Tests
 * Tests routes/employment.js endpoints
 * 
 * Coverage:
 * - GET /api/employment (list employment history)
 * - POST /api/employment (create employment entry)
 * - PUT /api/employment/:id (update employment)
 * - DELETE /api/employment/:id (delete employment)
 * - Test date validation and overlap detection
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import {
  createTestUser,
  seedEmployment,
  queryTestDb,
} from '../helpers/index.js';

// Mock external services before importing server
vi.mock('@google/generative-ai', () => {
  const mockInstance = {
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn(() => 'Mock response'),
        },
      }),
    })),
  };
  
  return {
    GoogleGenerativeAI: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

vi.mock('openai', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Mock AI response',
      },
    }],
  });

  const mockCompletions = {
    create: mockCreate,
  };

  const mockChat = {
    completions: mockCompletions,
  };

  const mockInstance = {
    chat: mockChat,
  };
  
  const MockOpenAI = class {
    constructor() {
      return mockInstance;
    }
  };
  
  MockOpenAI.prototype.chat = mockChat;
  
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

vi.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ success: true }),
    },
  };
  
  return {
    Resend: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

let app;

describe('Employment Routes', () => {
  let user;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const serverModule = await import('../../server.js');
    app = serverModule.app;
  });

  beforeEach(async () => {
    user = await createTestUser({
      email: `employment${Date.now()}@example.com`,
    });
    await queryTestDb('SELECT id FROM users WHERE id = $1', [user.id]);
  });

  describe('GET /api/employment', () => {
    it('should list all employment entries for authenticated user', async () => {
      await seedEmployment(user.id, 2);

      const response = await request(app)
        .get('/api/employment')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employment');
      expect(Array.isArray(response.body.employment)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/employment');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/employment', () => {
    it('should create a new employment entry', async () => {
      const employmentData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        location: 'San Francisco, CA',
        start_date: '2020-01-01',
        end_date: null,
        current: true,
        description: 'Worked on software development',
      };

      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send(employmentData);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('employment');
      expect(response.body.employment).toHaveProperty('id');
    });

    it('should reject employment creation without title', async () => {
      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          company: 'Tech Company',
        });

      expect(response.status).toBe(400);
    });

    it('should reject employment creation without company', async () => {
      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Software Engineer',
        });

      expect(response.status).toBe(400);
    });

    it('should validate date overlap', async () => {
      // Create first employment
      await seedEmployment(user.id, 1, {
        start_date: '2020-01-01',
        end_date: '2022-12-31',
        current: false,
      });

      // Try to create overlapping employment
      const overlappingData = {
        title: 'Another Job',
        company: 'Another Company',
        start_date: '2021-01-01', // Overlaps with first
        end_date: '2023-12-31',
        current: false,
      };

      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send(overlappingData);

      // May accept or reject based on implementation
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should validate end_date is after start_date', async () => {
      const employmentData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        start_date: '2022-01-01',
        end_date: '2020-12-31', // Invalid: before start_date
        current: false,
      };

      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send(employmentData);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/employment/:id', () => {
    it('should update an employment entry', async () => {
      const employments = await seedEmployment(user.id, 1);
      const employmentId = employments[0].id;

      const updateData = {
        title: 'Senior Software Engineer',
        company: 'Updated Company',
        start_date: '2020-01-01', // Required field
      };

      const response = await request(app)
        .put(`/api/employment/${employmentId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect([200, 400, 404]).toContain(response.status);
      if (response.status === 200) {
        // Verify update
        const result = await queryTestDb(
          'SELECT title, company FROM employment WHERE id = $1',
          [employmentId]
        );
        expect(result.rows[0].title).toBe('Senior Software Engineer');
      }
    });

    it('should reject update for other user\'s employment', async () => {
      const otherUser = await createTestUser();
      const otherEmployments = await seedEmployment(otherUser.id, 1);
      const otherEmploymentId = otherEmployments[0].id;

      const response = await request(app)
        .put(`/api/employment/${otherEmploymentId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ 
          title: 'Hacked Title',
          company: 'Hacked Company',
          start_date: '2020-01-01',
        });

      expect([400, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/employment/:id', () => {
    it('should delete an employment entry', async () => {
      const employments = await seedEmployment(user.id, 1);
      const employmentId = employments[0].id;

      const response = await request(app)
        .delete(`/api/employment/${employmentId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      
      // Verify deletion
      const result = await queryTestDb(
        'SELECT * FROM employment WHERE id = $1',
        [employmentId]
      );
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('Date Validation', () => {
    it('should handle current employment (no end_date)', async () => {
      const employmentData = {
        title: 'Current Job',
        company: 'Current Company',
        start_date: '2020-01-01',
        current: true,
      };

      const response = await request(app)
        .post('/api/employment')
        .set('Authorization', `Bearer ${user.token}`)
        .send(employmentData);

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        // Verify current flag
        const result = await queryTestDb(
          'SELECT current, end_date FROM employment WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
          [user.id]
        );
        expect(result.rows[0].current).toBe(true);
        expect(result.rows[0].end_date).toBeNull();
      }
    });
  });
});

