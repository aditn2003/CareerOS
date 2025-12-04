/**
 * Projects Routes - 90%+ Coverage Tests
 * File: backend/routes/projects.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('pg', () => {
  return {
    default: {
      Pool: class {
        constructor() {}
        query = mockQueryFn;
        connect = vi.fn();
        end = vi.fn();
        on = vi.fn();
      },
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockProject = {
  id: 1,
  user_id: 1,
  name: 'E-commerce Platform',
  description: 'Built a full-stack e-commerce platform with React and Node.js',
  role: 'Lead Developer',
  start_date: '2023-01-15',
  end_date: '2023-06-30',
  technologies: ['React', 'Node.js', 'PostgreSQL'],
  repository_link: 'https://github.com/user/project',
  team_size: 5,
  collaboration_details: 'Worked with design and product teams',
  outcomes: 'Increased sales by 25%',
  industry: 'E-commerce',
  project_type: 'Web Application',
  media_url: 'https://example.com/demo.mp4',
  status: 'Completed',
};

// ============================================
// TEST SUITE
// ============================================

describe('Projects Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const projectsModule = await import('../../routes/projects.js');
    
    app = express();
    app.use(express.json());
    app.use('/api', projectsModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/projects - Add Project
  // ========================================
  describe('POST /api/projects', () => {
    it('should add project with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProject],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'E-commerce Platform',
          description: 'Built a full-stack e-commerce platform',
          role: 'Lead Developer',
          start_date: '2023-01-15',
          end_date: '2023-06-30',
          technologies: 'React, Node.js, PostgreSQL',
          repository_link: 'https://github.com/user/project',
          team_size: 5,
          collaboration_details: 'Worked with design and product teams',
          outcomes: 'Increased sales by 25%',
          industry: 'E-commerce',
          project_type: 'Web Application',
          media_url: 'https://example.com/demo.mp4',
          status: 'Completed',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project added successfully');
      expect(res.body.project).toEqual(mockProject);
    });

    it('should add project with only required fields', async () => {
      const minimalProject = {
        ...mockProject,
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

      mockQueryFn.mockResolvedValueOnce({
        rows: [minimalProject],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project added successfully');
    });

    it('should handle technologies as comma-separated string', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProject],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
          technologies: 'React, Node.js, PostgreSQL',
        });

      expect(res.status).toBe(200);
      // Verify the query was called
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it('should handle empty technologies', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockProject, technologies: [] }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
          technologies: '', // Empty string
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project name, description, role, and start date are required.');
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project name, description, role, and start date are required.');
    });

    it('should return 400 when role is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project name, description, role, and start date are required.');
    });

    it('should return 400 when start_date is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project name, description, role, and start date are required.');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding project');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /api/projects - View Projects
  // ========================================
  describe('GET /api/projects', () => {
    it('should return all projects for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProject, { ...mockProject, id: 2, name: 'Another Project' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(2);
    });

    it('should return empty array when user has no projects', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/projects');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/projects/:id - Update Project
  // ========================================
  describe('PUT /api/projects/:id', () => {
    it('should update project with all fields', async () => {
      const updatedProject = {
        ...mockProject,
        name: 'Updated Project',
        status: 'In Progress',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedProject],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Project',
          description: 'Updated description',
          role: 'Lead Developer',
          start_date: '2023-01-15',
          end_date: '2023-12-31',
          technologies: 'React, TypeScript',
          repository_link: 'https://github.com/user/updated',
          team_size: 8,
          collaboration_details: 'Updated collaboration',
          outcomes: 'Updated outcomes',
          industry: 'Technology',
          project_type: 'Mobile App',
          media_url: 'https://example.com/new.mp4',
          status: 'In Progress',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project updated successfully');
    });

    it('should update project with minimal fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProject],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(200);
    });

    it('should handle technologies string properly on update', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProject],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
          technologies: 'Python, Django, Redis',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project name, description, role, and start date are required.');
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when role is missing', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when start_date is missing', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 when project not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .put('/api/projects/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/projects/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating project');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/projects/1')
        .send({
          name: 'My Project',
          description: 'A cool project',
          role: 'Developer',
          start_date: '2023-01-15',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/projects/:id - Delete Project
  // ========================================
  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/projects/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Project entry deleted successfully');
    });

    it('should return 404 when project not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/projects/1');

      expect(res.status).toBe(401);
    });
  });
});

