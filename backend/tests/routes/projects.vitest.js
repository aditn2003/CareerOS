/**
 * Projects Routes - Full Coverage Tests
 * File: backend/routes/projects.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../../routes/projects.js';

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
    globalThis.__projectsMockQueryFn = queryFn;
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

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__projectsMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', projectsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__projectsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__projectsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Projects Routes - Full Coverage', () => {
  describe('POST /api/projects', () => {
    it('should add project entry', async () => {
      const mockProject = {
        id: 1,
        user_id: 1,
        name: 'E-Commerce Platform',
        description: 'Full-stack e-commerce solution',
        role: 'Lead Developer',
        start_date: '2023-01-01',
        end_date: '2023-06-01',
        technologies: ['React', 'Node.js'],
        repository_link: 'https://github.com/example/project',
        team_size: 5,
        collaboration_details: 'Worked with 4 other developers',
        outcomes: 'Increased sales by 50%',
        industry: 'E-Commerce',
        project_type: 'Web Application',
        media_url: null,
        status: 'Completed',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'E-Commerce Platform',
          description: 'Full-stack e-commerce solution',
          role: 'Lead Developer',
          start_date: '2023-01-01',
          end_date: '2023-06-01',
          technologies: 'React, Node.js',
          repository_link: 'https://github.com/example/project',
          team_size: 5,
          collaboration_details: 'Worked with 4 other developers',
          outcomes: 'Increased sales by 50%',
          industry: 'E-Commerce',
          project_type: 'Web Application',
          status: 'Completed',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project added successfully');
      expect(res.body.project).toEqual(mockProject);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'E-Commerce Platform',
          // Missing description, role, start_date
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should handle optional fields', async () => {
      const mockProject = {
        id: 1,
        name: 'Simple Project',
        description: 'Basic project',
        role: 'Developer',
        start_date: '2023-01-01',
        end_date: null,
        technologies: [],
        repository_link: null,
        team_size: null,
        collaboration_details: '',
        outcomes: '',
        industry: '',
        project_type: '',
        media_url: '',
        status: 'Planned',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Simple Project',
          description: 'Basic project',
          role: 'Developer',
          start_date: '2023-01-01',
        });

      expect(res.status).toBe(200);
    });

    it('should parse technologies string to array', async () => {
      const mockProject = {
        id: 1,
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Project',
          description: 'Test',
          role: 'Developer',
          start_date: '2023-01-01',
          technologies: 'React, Node.js, PostgreSQL',
        });

      expect(res.status).toBe(200);
    });

    it('should handle technologies as empty string', async () => {
      const mockProject = {
        id: 1,
        technologies: [],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Project',
          description: 'Test',
          role: 'Developer',
          start_date: '2023-01-01',
          technologies: '',
        });

      expect(res.status).toBe(200);
    });

    it('should handle technologies with extra spaces', async () => {
      const mockProject = {
        id: 1,
        technologies: ['React', 'Node.js'],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Project',
          description: 'Test',
          role: 'Developer',
          start_date: '2023-01-01',
          technologies: 'React , Node.js ',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Project',
          description: 'Test',
          role: 'Developer',
          start_date: '2023-01-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding project');
    });
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', role: 'Developer' },
        { id: 2, name: 'Project 2', role: 'Lead' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockProjects, rowCount: 2 });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.projects).toEqual(mockProjects);
    });

    it('should return empty array when no projects', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.projects).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while fetching projects');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const updatedProject = {
        id: 1,
        name: 'Updated Project',
        description: 'Updated description',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [updatedProject], rowCount: 1 });

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Project',
          description: 'Updated description',
          role: 'Developer',
          start_date: '2023-01-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project updated successfully');
    });

    it('should return 404 if project not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/projects/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Project',
          description: 'Updated',
          role: 'Developer',
          start_date: '2023-01-01',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 400 if required fields missing in update', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Project',
          // Missing description, role, start_date
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Project',
          description: 'Updated description',
          role: 'Developer',
          start_date: '2023-01-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating project');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .delete('/api/projects/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project entry deleted successfully');
    });

    it('should return 404 if project not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/projects/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/projects/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while deleting project');
    });
  });
});

