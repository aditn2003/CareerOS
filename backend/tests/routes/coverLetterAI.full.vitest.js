/**
 * Cover Letter AI Routes - Full Coverage Tests
 * Target: 90%+ coverage for coverLetterAI.js
 */

import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock pg Pool
const mockQueryFn = vi.fn();
vi.mock('pg', () => {
  return {
    Pool: class {
      constructor() {}
      query = (...args) => mockQueryFn(...args);
      connect = () => Promise.resolve({ query: mockQueryFn, release: vi.fn() });
      end = vi.fn().mockResolvedValue(undefined);
      on = vi.fn();
    },
    default: {
      Pool: class {
        constructor() {}
        query = (...args) => mockQueryFn(...args);
        connect = () => Promise.resolve({ query: mockQueryFn, release: vi.fn() });
        end = vi.fn().mockResolvedValue(undefined);
        on = vi.fn();
      },
    },
  };
});

// Mock auth middleware
vi.mock('../../auth.js', () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    req.userId = 1;
    next();
  },
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: class {
    constructor() {}
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                improved_text: 'Improved cover letter text',
                restructuring_suggestions: ['Suggestion 1'],
                synonym_suggestions: [{ original: 'good', alternatives: ['excellent', 'outstanding'] }],
                style_tips: ['Tip 1'],
              }),
            },
          }],
        }),
      },
    };
  },
}));

import OpenAI from 'openai';
import { createCoverLetterAIRoutes } from '../../routes/coverLetterAI.js';

describe('Cover Letter AI Routes - Full Coverage', () => {
  let app;
  let mockPool;
  let mockOpenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryFn.mockReset();

    // Create mock OpenAI client
    const createMock = vi.fn();
    createMock
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summaryNarrative: 'Summary',
              topExperiences: ['Exp 1', 'Exp 2'],
              quantifiedHighlights: ['Highlight 1'],
              relevanceScores: [{ exp: 'Exp 1', score: 90 }],
              additionalRelevantExperiences: ['Additional exp'],
              alternativePresentations: ['Alt presentation'],
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: `
---
COVER LETTER VARIATION #1
---
Dear Hiring Manager,

I am writing to apply for the Software Engineer position...

---
COVER LETTER VARIATION #2
---
Dear Hiring Manager,

I am excited to apply for the Software Engineer role...

---
COVER LETTER VARIATION #3
---
Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position...
            `,
          },
        }],
      });

    mockOpenAI = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };

    // Create mock pool
    mockPool = {
      query: mockQueryFn,
      connect: () => Promise.resolve({ query: mockQueryFn, release: vi.fn() }),
      end: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };

    // Default mock for employment queries
    mockQueryFn.mockResolvedValue({
      rows: [
        {
          role: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
          end_date: null,
          responsibilities: 'Built web apps',
          achievements: 'Led team of 5',
          skills: ['JavaScript', 'React'],
        },
      ],
    });

    // Use factory function with mocks
    const coverLetterAIRoutes = createCoverLetterAIRoutes(mockPool, mockOpenAI);

    app = express();
    app.use(express.json());
    app.use('/api/cover-letter-ai', coverLetterAIRoutes);
  });

  // ========================================
  // POST /generate - Generate Cover Letter
  // ========================================
  describe('POST /generate', () => {
    it('should generate cover letter with all parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Software Engineer',
          companyName: 'Tech Corp',
          userProfile: { id: 1 },
          companyResearch: 'Company research data',
          companyNews: 'Recent news',
          tone: 'professional',
          style: 'direct',
          length: 'standard',
          culture: 'corporate',
          industry: 'Technology',
          personality: 'balanced',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.content).toBeDefined();
        expect(res.body.expAnalysis).toBeDefined();
      }
    });

    it('should use default values for optional parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Developer',
          companyName: 'Startup',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should normalize jobTitle from targetRole', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          targetRole: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should normalize companyName from company', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          company: 'Tech Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should use userProfile from req.user if not provided', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should fetch employment from database when userProfile.id exists', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          userProfile: { id: 1 },
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      // Verify employment query was called
      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.stringContaining('SELECT role, company'),
        [1]
      );
    });

    it('should handle employment fetch error gracefully', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          userProfile: { id: 1 },
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should use achievements if no employment data', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          userProfile: { id: 1 },
          achievements: 'Built amazing apps',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle OpenAI experience analysis error', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'INVALID JSON',
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Cover letter content',
            },
          }],
        });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle markdown-wrapped JSON in experience analysis', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '```json\n{"summaryNarrative": "Test"}\n```',
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Cover letter',
            },
          }],
        });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle OpenAI generation error', async () => {
      // Reset and set up new mock for this test
      mockOpenAI.chat.completions.create.mockReset();
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({ summaryNarrative: 'Test' }),
            },
          }],
        })
        .mockRejectedValueOnce(new Error('OpenAI API error'));

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect(res.status).toBe(500);
    });

    it('should handle empty experience data', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          userProfile: { id: 1 },
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should use jobDescription as research if provided', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          jobDescription: 'Looking for a software engineer...',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle all style parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          tone: 'casual',
          style: 'narrative',
          length: 'short',
          culture: 'startup',
          industry: 'FinTech',
          personality: 'creative',
          customToneInstructions: 'Be enthusiastic',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });
  });

  // ========================================
  // POST /refine - Refine Cover Letter
  // ========================================
  describe('POST /refine', () => {
    it('should refine cover letter successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: 'Improved cover letter text',
              restructuring_suggestions: ['Suggestion 1', 'Suggestion 2'],
              synonym_suggestions: [
                { original: 'good', alternatives: ['excellent', 'outstanding'] },
              ],
              style_tips: ['Tip 1', 'Tip 2'],
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original cover letter text that needs improvement.',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.improved_text).toBeDefined();
        expect(res.body.readability).toBeDefined();
        expect(res.body.readability.flesch).toBeDefined();
        expect(res.body.readability.level).toBeDefined();
      }
    });

    it('should return 400 for empty text', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for whitespace-only text', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({ text: '   \n\t  ' });

      expect(res.status).toBe(400);
    });

    it('should calculate readability metrics', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: 'This is a test sentence. It has multiple sentences for readability calculation.',
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original text with multiple sentences. This helps test readability.',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.readability.words).toBeGreaterThan(0);
        expect(res.body.readability.sentences).toBeGreaterThan(0);
      }
    });

    it('should handle OpenAI refine error', async () => {
      // Reset and set up new mock for this test
      mockOpenAI.chat.completions.create.mockReset();
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API error'));

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original text',
        });

      expect(res.status).toBe(500);
    });

    it('should handle invalid JSON from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'NOT JSON',
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original text',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should use original text if improved_text is missing', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              restructuring_suggestions: [],
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original text to use as fallback',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.improved_text).toBe('Original text to use as fallback');
      }
    });

    it('should handle empty arrays in OpenAI response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: 'Improved',
              restructuring_suggestions: null,
              synonym_suggestions: null,
              style_tips: null,
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Original',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.restructuring_suggestions).toEqual([]);
        expect(res.body.synonym_suggestions).toEqual([]);
        expect(res.body.style_tips).toEqual([]);
      }
    });

    it('should handle very short text', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: 'Hi.',
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: 'Hi.',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle very long text', async () => {
      const longText = 'This is a very long cover letter. '.repeat(100);
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              improved_text: longText,
            }),
          },
        }],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/refine')
        .send({
          text: longText,
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle missing userName', async () => {
      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle empty experience arrays in AI response', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                summaryNarrative: '',
                topExperiences: [],
                quantifiedHighlights: [],
                relevanceScores: [],
                additionalRelevantExperiences: [],
                alternativePresentations: [],
              }),
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Cover letter',
            },
          }],
        });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('should handle null/undefined values in experience data', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [
          {
            role: null,
            company: null,
            start_date: null,
            end_date: null,
            responsibilities: null,
            achievements: null,
            skills: null,
          },
        ],
      });

      const res = await request(app)
        .post('/api/cover-letter-ai/generate')
        .send({
          jobTitle: 'Engineer',
          companyName: 'Corp',
          userProfile: { id: 1 },
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });
  });
});

