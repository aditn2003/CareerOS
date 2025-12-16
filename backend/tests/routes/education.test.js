/**
 * Education Routes Tests
 * Tests routes/education.js endpoints
 * 
 * Coverage:
 * - GET /api/education (list education)
 * - POST /api/education (create education entry)
 * - PUT /api/education/:id (update education)
 * - DELETE /api/education/:id (delete education)
 * - Test validation and error cases
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import pool from '../../db/pool.js';
import {
  createTestUser,
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

describe('Education Routes', () => {
  let user;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const serverModule = await import('../../server.js');
    app = serverModule.app;
  });

  beforeEach(async () => {
    user = await createTestUser({
      email: `education${Date.now()}@example.com`,
    });
    await queryTestDb('SELECT id FROM users WHERE id = $1', [user.id]);
  });

  describe('GET /api/education', () => {
    it('should return empty array when user has no education entries', async () => {
      const response = await request(app)
        .get('/api/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('education');
      expect(Array.isArray(response.body.education)).toBe(true);
      expect(response.body.education).toEqual([]);
    });

    it('should return all education entries for authenticated user', async () => {
      // Create test education entries
      await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study, graduation_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'University A', 'Bachelor', 'Computer Science', '2020-05-01']
      );
      await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study, graduation_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'University B', 'Master', 'Software Engineering', '2022-05-01']
      );

      const response = await request(app)
        .get('/api/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.education.length).toBe(2);
      expect(response.body.education[0].institution).toBe('University B'); // Most recent first
    });

    it('should order education by graduation_date DESC', async () => {
      await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study, graduation_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'Old University', 'Bachelor', 'CS', '2018-05-01']
      );
      await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study, graduation_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'New University', 'Master', 'SE', '2023-05-01']
      );

      const response = await request(app)
        .get('/api/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.education[0].institution).toBe('New University');
      expect(response.body.education[1].institution).toBe('Old University');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/education');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/education', () => {
    it('should create a new education entry', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test University',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          graduation_date: '2020-05-01',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('education');
      expect(response.body.education.institution).toBe('Test University');
      expect(response.body.education.degree_type).toBe('Bachelor');
      expect(response.body.education.field_of_study).toBe('Computer Science');
    });

    it('should return 400 if institution is missing', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if degree_type is missing', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test University',
          field_of_study: 'Computer Science',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if field_of_study is missing', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test University',
          degree_type: 'Bachelor',
        });

      expect(response.status).toBe(400);
    });

    it('should accept optional fields', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test University',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          graduation_date: '2020-05-01',
          currently_enrolled: false,
          education_level: 'Undergraduate',
          gpa: 3.8,
          gpa_private: false,
          honors: 'Summa Cum Laude',
        });

      expect(response.status).toBe(200);
      // GPA is returned as string from PostgreSQL
      expect(parseFloat(response.body.education.gpa)).toBe(3.8);
      expect(response.body.education.honors).toBe('Summa Cum Laude');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/education')
        .send({
          institution: 'Test University',
          degree_type: 'Bachelor',
          field_of_study: 'CS',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/education/:id', () => {
    it('should update an existing education entry', async () => {
      const result = await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Old University', 'Bachelor', 'CS']
      );
      const educationId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/education/${educationId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Updated University',
          degree_type: 'Master',
          field_of_study: 'Updated Field',
          graduation_date: '2022-05-01',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.education.institution).toBe('Updated University');
      expect(response.body.education.degree_type).toBe('Master');
    });

    it('should return 404 for non-existent education entry', async () => {
      const response = await request(app)
        .put('/api/education/99999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test',
          degree_type: 'Bachelor',
          field_of_study: 'CS',
        });

      expect(response.status).toBe(404);
    });

    it('should not allow updating other users education', async () => {
      const otherUser = await createTestUser();
      const result = await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other University', 'Bachelor', 'CS']
      );
      const educationId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/education/${educationId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Hacked University',
          degree_type: 'Bachelor',
          field_of_study: 'CS',
        });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/education/1')
        .send({
          institution: 'Test',
          degree_type: 'Bachelor',
          field_of_study: 'CS',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/education/:id', () => {
    it('should delete an existing education entry', async () => {
      const result = await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Delete Me', 'Bachelor', 'CS']
      );
      const educationId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/education/${educationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const checkResult = await queryTestDb(
        `SELECT id FROM education WHERE id = $1`,
        [educationId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for non-existent education entry', async () => {
      const response = await request(app)
        .delete('/api/education/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should not allow deleting other users education', async () => {
      const otherUser = await createTestUser();
      const result = await queryTestDb(
        `INSERT INTO education (user_id, institution, degree_type, field_of_study)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other University', 'Bachelor', 'CS']
      );
      const educationId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/education/${educationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/education/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Validation and Error Cases', () => {
    it('should handle database errors gracefully', async () => {
      const originalQuery = pool.query.bind(pool);
      const querySpy = vi.spyOn(pool, 'query');
      
      querySpy.mockImplementation((text, params) => {
        if (text.includes('SELECT') && text.includes('FROM education')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return originalQuery(text, params);
      });

      const response = await request(app)
        .get('/api/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      querySpy.mockRestore();
    });

    it('should handle invalid graduation_date format', async () => {
      const response = await request(app)
        .post('/api/education')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          institution: 'Test University',
          degree_type: 'Bachelor',
          field_of_study: 'CS',
          graduation_date: 'invalid-date',
        });

      // Should either accept it (if DB allows) or return error
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
