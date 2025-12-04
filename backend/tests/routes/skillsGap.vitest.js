/**
 * Skills Gap Routes - Full Coverage Tests
 * File: backend/routes/skillsGap.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import skillsGapRouter from '../../routes/skillsGap.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('pg', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__skillsGapMockQueryFn = queryFn;
  }
  
  const mockPool = {
    query: queryFn,
  };
  // Create a proper constructor function
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

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1 };
      throw new Error('Invalid token');
    }),
  },
}));

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => JSON.stringify({})),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__skillsGapMockQueryFn || vi.fn();
  
  app = express();
  app.use(express.json());
  app.use('/api/skills-gap', skillsGapRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__skillsGapMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__skillsGapMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Skills Gap Routes - Full Coverage', () => {
  describe('GET /api/skills-gap/:jobId', () => {
    it('should return skill gap analysis', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency: 4 },
        { name: 'Python', proficiency: 3 },
      ];
      const mockJob = {
        required_skills: ['JavaScript', 'React', 'Node.js'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills }) // User skills
        .mockResolvedValueOnce({ rows: [mockJob] }); // Job

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('matchedSkills');
      expect(res.body).toHaveProperty('weakSkills');
      expect(res.body).toHaveProperty('missingSkills');
      expect(res.body).toHaveProperty('priorityList');
      expect(res.body).toHaveProperty('learningResources');
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] }) // User skills
        .mockResolvedValueOnce({ rows: [] }); // Job not found

      const res = await request(app)
        .get('/api/skills-gap/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should handle weak skills (proficiency < 3)', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency: 2 },
        { name: 'Python', proficiency: 1 },
      ];
      const mockJob = {
        required_skills: ['JavaScript', 'Python', 'React'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.weakSkills.length).toBeGreaterThan(0);
    });

    it('should handle matched skills (proficiency >= 3)', async () => {
      const mockUserSkills = [
        { name: 'JavaScript', proficiency: 4 },
        { name: 'Python', proficiency: 5 },
      ];
      const mockJob = {
        required_skills: ['JavaScript', 'Python'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.matchedSkills.length).toBeGreaterThan(0);
    });

    it('should handle high-demand skills priority', async () => {
      const mockUserSkills = [];
      const mockJob = {
        required_skills: ['Python', 'JavaScript', 'SQL'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.priorityList.length).toBeGreaterThan(0);
      // High-demand skills should have higher priority
      const pythonPriority = res.body.priorityList.find(p => p.skill.toLowerCase() === 'python');
      expect(pythonPriority.priority).toBeGreaterThan(1);
    });

    it('should handle learning resources', async () => {
      const mockUserSkills = [];
      const mockJob = {
        required_skills: ['React'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.learningResources).toBeDefined();
    });

    it('should handle empty required_skills array', async () => {
      const mockUserSkills = [{ name: 'JavaScript', proficiency: 4 }];
      const mockJob = {
        required_skills: [],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.matchedSkills).toEqual([]);
      expect(res.body.weakSkills).toEqual([]);
      expect(res.body.missingSkills).toEqual([]);
    });

    it('should normalize skill names (case insensitive)', async () => {
      const mockUserSkills = [
        { name: 'JAVASCRIPT', proficiency: 4 },
        { name: '  python  ', proficiency: 3 },
      ];
      const mockJob = {
        required_skills: ['javascript', 'Python', 'React'],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserSkills })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.matchedSkills.length).toBeGreaterThan(0);
    });
  });
});

