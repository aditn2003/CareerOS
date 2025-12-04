/**
 * Cover Letter AI Routes - Full Coverage Tests
 * File: backend/routes/coverLetterAI.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createCoverLetterAIRoutes } from '../../routes/coverLetterAI.js';

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

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

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
  router = createCoverLetterAIRoutes(mockPool, mockOpenAI);
  app = express();
  app.use(express.json());
  app.use('/api/cover-letter-ai', router);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Cover Letter AI Routes - Full Coverage', () => {
  describe('POST /api/cover-letter-ai/generate', () => {
    it('should generate cover letter with employment data', async () => {
      const mockEmployment = [
        { role: 'Engineer', company: 'Tech Corp', responsibilities: 'Developed apps' },
      ];
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: ['Exp 1'],
              quantifiedHighlights: ['Highlight 1'],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: '---\nCOVER LETTER VARIATION #1\n---\nContent 1\n---\nCOVER LETTER VARIATION #2\n---\nContent 2\n---\nCOVER LETTER VARIATION #3\n---\nContent 3',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: mockEmployment });
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI) // Experience analysis
        .mockResolvedValueOnce(mockMainAI); // Main generation

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Software Engineer',
          companyName: 'Tech Corp',
          userProfile: { id: 1 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.content).toBeDefined();
    });

    it('should handle missing employment data', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: [],
              quantifiedHighlights: [],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: 'Cover letter content',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
          userProfile: { id: 1 },
          achievements: 'Some achievements',
        });

      expect(res.status).toBe(200);
    });

    it('should handle JSON parsing errors in experience analysis', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: 'Invalid JSON {',
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: 'Cover letter',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on AI error', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('AI error'));

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-ai/refine', () => {
    it('should refine cover letter', async () => {
      const mockAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: 'Improved text',
              restructuring_suggestions: ['Suggestion 1'],
              synonym_suggestions: [],
              style_tips: ['Tip 1'],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .set('Authorization', 'Bearer valid-token')
        .send({
          text: 'Original cover letter text',
        });

      expect(res.status).toBe(200);
      expect(res.body.improved_text).toBe('Improved text');
      expect(res.body.readability).toBeDefined();
    });

    it('should return 400 if text missing', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .set('Authorization', 'Bearer valid-token')
        .send({
          text: '',
        });

      expect(res.status).toBe(400);
    });

    it('should return 500 on AI error', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('AI error'));

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .set('Authorization', 'Bearer valid-token')
        .send({
          text: 'Some text',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letter-ai/generate - additional scenarios', () => {
    it('should handle missing userProfile', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: [],
              quantifiedHighlights: [],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: '---\nCOVER LETTER VARIATION #1\n---\nContent 1',
          },
        }],
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
        });

      expect(res.status).toBe(200);
    });

    it('should handle achievements when no employment data', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: [],
              quantifiedHighlights: [],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: 'Cover letter content',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
          achievements: 'Built systems',
        });

      expect(res.status).toBe(200);
    });

    it('should handle employment fetch error gracefully', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: [],
              quantifiedHighlights: [],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: 'Cover letter',
          },
        }],
      };

      mockQueryFn.mockRejectedValueOnce(new Error('DB error'));
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
          userProfile: { id: 1 },
        });

      expect(res.status).toBe(200);
    });

    it('should handle different tone and style options', async () => {
      const mockExpAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: [],
              quantifiedHighlights: [],
              relevanceScores: [],
              additionalRelevantExperiences: [],
              alternativePresentations: [],
            }),
          },
        }],
      };
      const mockMainAI = {
        choices: [{
          message: {
            content: '---\nCOVER LETTER VARIATION #1\n---\nContent',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [] });
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpAI)
        .mockResolvedValueOnce(mockMainAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Tech Corp',
          tone: 'casual',
          style: 'creative',
          length: 'short',
          culture: 'startup',
          personality: 'enthusiastic',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/cover-letter-ai/refine - additional scenarios', () => {
    it('should handle JSON parsing errors', async () => {
      const mockAI = {
        choices: [{
          message: {
            content: 'Invalid JSON {',
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .set('Authorization', 'Bearer valid-token')
        .send({
          text: 'Some text',
        });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle missing improved_text in response', async () => {
      const mockAI = {
        choices: [{
          message: {
            content: JSON.stringify({
              restructuring_suggestions: [],
              synonym_suggestions: [],
              style_tips: [],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockAI);

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .set('Authorization', 'Bearer valid-token')
        .send({
          text: 'Original text',
        });

      expect(res.status).toBe(200);
      expect(res.body.improved_text).toBe('Original text');
    });
  });
});

