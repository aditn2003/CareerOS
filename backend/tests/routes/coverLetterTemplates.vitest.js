/**
 * Cover Letter Templates Routes - Full Coverage Tests
 * File: backend/routes/coverLetterTemplates.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createCoverLetterTemplatesRoutes } from '../../routes/coverLetterTemplates.js';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();
const mockPool = { query: mockQueryFn };

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

vi.mock('pg', () => {
  function MockPool() {
    return mockPool;
  }
  return {
    default: {
      Pool: MockPool,
    },
    Pool: MockPool,
  };
});

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}));

// ============================================
// SETUP
// ============================================

let app;
let router;

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  router = createCoverLetterTemplatesRoutes(mockPool, mockOpenAI);
  app = express();
  app.use(express.json());
  app.use('/api/cover-letter-templates', router);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Cover Letter Templates Routes - Full Coverage', () => {
  describe('GET /api/cover-letter-templates/templates', () => {
    it('should return all templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Template 1', content: 'Content 1' },
        { id: 2, name: 'Template 2', content: 'Content 2' },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockTemplates });

      const res = await request(app)
        .get('/api/cover-letter-templates/templates');

      expect(res.status).toBe(200);
      expect(res.body.templates).toEqual(mockTemplates);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/cover-letter-templates/templates');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-templates/templates', () => {
    it('should create new template', async () => {
      const mockTemplate = {
        id: 1,
        name: 'Custom Template',
        industry: 'Technology',
        category: 'Formal',
        content: 'Template content',
        is_custom: true,
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockTemplate] });

      const res = await request(app)
        .post('/api/cover-letter-templates/templates')
        .send({
          name: 'Custom Template',
          industry: 'Technology',
          category: 'Formal',
          content: 'Template content',
        });

      expect(res.status).toBe(201);
      expect(res.body.template).toEqual(mockTemplate);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/cover-letter-templates/templates')
        .send({
          name: 'Template',
          // Missing industry and content
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });
  });

  describe('POST /api/cover-letter-templates/templates/:id/track-view', () => {
    it('should track template view', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/cover-letter-templates/templates/1/track-view');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letter-templates/templates/1/track-view');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-templates/templates/:id/track-use', () => {
    it('should track template use', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/cover-letter-templates/templates/1/track-use');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letter-templates/templates/1/track-use');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-templates/generate', () => {
    it('should generate AI cover letter', async () => {
      const mockResearch = {
        basics: { industry: 'Tech', size: 'Large' },
        mission_values_culture: { mission: 'Innovation' },
        products_services: { list: 'Products' },
        executives: { ceo: 'CEO Name' },
        competitive_landscape: { summary: 'Competitive' },
        news: [{ title: 'News 1' }],
        summary: 'Company summary',
      };
      const mockAIResponse = {
        output: [{
          content: [{
            text: 'Generated cover letter content',
          }],
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockResearch] });
      // The route uses openai.responses.create, not openai.chat.completions.create
      if (!mockOpenAI.responses) {
        mockOpenAI.responses = {
          create: vi.fn(() => Promise.resolve(mockAIResponse)),
        };
      } else {
        mockOpenAI.responses.create.mockResolvedValueOnce(mockAIResponse);
      }

      const res = await request(app)
        .post('/api/cover-letter-templates/generate')
        .send({
          userName: 'John Doe',
          targetRole: 'Software Engineer',
          company: 'Tech Corp',
          jobDescription: 'Job description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if company or targetRole missing', async () => {
      const res = await request(app)
        .post('/api/cover-letter-templates/generate')
        .send({
          userName: 'John Doe',
        });

      expect(res.status).toBe(400);
    });

    it('should handle missing company research', async () => {
      const mockAIResponse = {
        output: [{
          content: [{
            text: 'Generated content',
          }],
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [] }); // No research found
      mockOpenAI.responses.create.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .post('/api/cover-letter-templates/generate')
        .send({
          userName: 'John Doe',
          targetRole: 'Engineer',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on AI error', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.responses.create.mockRejectedValueOnce(new Error('AI error'));

      const res = await request(app)
        .post('/api/cover-letter-templates/generate')
        .send({
          targetRole: 'Engineer',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-templates/save-ai', () => {
    it('should save AI-generated cover letter', async () => {
      const mockSaved = { id: 1, name: 'AI Cover Letter', content: 'Content' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockSaved] });

      const res = await request(app)
        .post('/api/cover-letter-templates/save-ai')
        .send({
          user_id: 1,
          title: 'AI Cover Letter',
          content: 'Content',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if user_id or content missing', async () => {
      const res = await request(app)
        .post('/api/cover-letter-templates/save-ai')
        .send({
          user_id: 1,
        });

      expect(res.status).toBe(400);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letter-templates/save-ai')
        .send({
          user_id: 1,
          content: 'Content',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/cover-letter-templates/saved/:userId', () => {
    it('should return saved AI cover letters', async () => {
      const mockLetters = [
        { id: 1, name: 'Letter 1', content: 'Content 1' },
        { id: 2, name: 'Letter 2', content: 'Content 2' },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockLetters });

      const res = await request(app)
        .get('/api/cover-letter-templates/saved/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.letters).toEqual(mockLetters);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/cover-letter-templates/saved/1');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/cover-letter-templates/saved/:id', () => {
    it('should delete saved AI letter', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/cover-letter-templates/saved/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/cover-letter-templates/saved/1');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/cover-letter-templates/saved/:id', () => {
    it('should update saved AI letter', async () => {
      const mockUpdated = { id: 1, name: 'Updated', content: 'New content' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockUpdated] });

      const res = await request(app)
        .put('/api/cover-letter-templates/saved/1')
        .send({
          content: 'New content',
          name: 'Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/cover-letter-templates/saved/1')
        .send({
          content: 'Content',
        });

      expect(res.status).toBe(500);
    });
  });
});

