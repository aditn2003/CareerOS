/**
 * Projects Routes Tests
 * Tests all project-related functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import projectsRoutes from '../../routes/projects.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

// Mock external services
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: vi.fn(() => 'Mocked AI response') }
      })
    }))
  }))
}));

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    }
  }))
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  }))
}));

describe('Projects Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', projectsRoutes);
    
    user = await createTestUser({
      email: 'projects@test.com',
      first_name: 'Projects',
      last_name: 'Test',
    });
  });

  describe('GET /api/projects', () => {
    it('should return empty array when user has no projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
    });

    it('should list all projects for authenticated user', async () => {
      // Insert test projects
      await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)`,
        [
          user.id, 'Project 1', 'Description 1', 'Developer', '2023-01-01', 'Completed',
          user.id, 'Project 2', 'Description 2', 'Lead', '2024-01-01', 'Ongoing'
        ]
      );

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(2);
      expect(response.body.projects[0]).toHaveProperty('name');
      expect(response.body.projects[0]).toHaveProperty('description');
      expect(response.body.projects[0]).toHaveProperty('role');
    });

    it('should order projects by start_date DESC', async () => {
      await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18)`,
        [
          user.id, 'Old Project', 'Old', 'Developer', '2020-01-01', 'Completed',
          user.id, 'New Project', 'New', 'Lead', '2024-01-01', 'Ongoing',
          user.id, 'Middle Project', 'Middle', 'Developer', '2022-01-01', 'Completed'
        ]
      );

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(3);
      // Should be ordered by start_date DESC (newest first)
      expect(response.body.projects[0].name).toBe('New Project');
      expect(response.body.projects[1].name).toBe('Middle Project');
      expect(response.body.projects[2].name).toBe('Old Project');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should only return projects for the authenticated user', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)`,
        [
          user.id, 'My Project', 'My Description', 'Developer', '2023-01-01', 'Completed',
          otherUser.id, 'Other Project', 'Other Description', 'Lead', '2024-01-01', 'Ongoing'
        ]
      );

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('My Project');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get a single project by ID', async () => {
      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, 'Single Project', 'Description', 'Developer', '2023-01-01', 'Completed']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.project).toHaveProperty('id', projectId);
      expect(response.body.project.name).toBe('Single Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should not return other user\'s project', async () => {
      const otherUser = await createTestUser({
        email: 'other2@test.com',
        first_name: 'Other2',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [otherUser.id, 'Other Project', 'Description', 'Developer', '2023-01-01', 'Completed']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/projects/1');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project with required fields', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Project description',
        role: 'Developer',
        start_date: '2024-01-01',
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send(projectData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Project added successfully');
      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project.name).toBe('New Project');
      expect(response.body.project.description).toBe('Project description');
      expect(response.body.project.role).toBe('Developer');
      expect(response.body.project.user_id).toBe(user.id);
      expect(response.body.project.status).toBe('Planned'); // Default status
    });

    it('should create project with all optional fields', async () => {
      const projectData = {
        name: 'Full Project',
        description: 'Full description',
        role: 'Lead Developer',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        technologies: 'React,Node.js,PostgreSQL',
        repository_link: 'https://github.com/user/repo',
        team_size: 5,
        collaboration_details: 'Worked with team',
        outcomes: 'Successful launch',
        industry: 'Technology',
        project_type: 'Web Application',
        media_url: 'https://example.com/image.jpg',
        status: 'Completed',
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send(projectData);

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe('Full Project');
      expect(response.body.project.end_date).toBeTruthy();
      expect(Array.isArray(response.body.project.technologies)).toBe(true);
      expect(response.body.project.technologies).toContain('React');
      expect(response.body.project.repository_link).toBe('https://github.com/user/repo');
      expect(response.body.project.team_size).toBe(5);
      expect(response.body.project.status).toBe('Completed');
    });

    it('should reject project creation without name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('should reject project creation without description', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Project',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('description');
    });

    it('should reject project creation without role', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Project',
          description: 'Description',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('role');
    });

    it('should reject project creation without start_date', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Project',
          description: 'Description',
          role: 'Developer',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('start date');
    });

    it('should parse technologies string into array', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Tech Project',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
          technologies: 'React, Node.js, PostgreSQL',
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.project.technologies)).toBe(true);
      expect(response.body.project.technologies).toContain('React');
      expect(response.body.project.technologies).toContain('Node.js');
      expect(response.body.project.technologies).toContain('PostgreSQL');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update an existing project', async () => {
      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, 'Original Project', 'Original Description', 'Developer', '2023-01-01', 'Planned']
      );
      const projectId = result.rows[0].id;

      const updateData = {
        name: 'Updated Project',
        description: 'Updated Description',
        role: 'Lead Developer',
        start_date: '2023-06-01',
        end_date: '2023-12-31',
        status: 'Completed',
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Project updated successfully');
      expect(response.body.project.name).toBe('Updated Project');
      expect(response.body.project.description).toBe('Updated Description');
      expect(response.body.project.role).toBe('Lead Developer');
      expect(response.body.project.status).toBe('Completed');
    });

    it('should reject update without required fields', async () => {
      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, 'Project', 'Description', 'Developer', '2023-01-01', 'Planned']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
          // Missing description, role, start_date
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .put('/api/projects/99999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should not allow updating other user\'s project', async () => {
      const otherUser = await createTestUser({
        email: 'other3@test.com',
        first_name: 'Other3',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [otherUser.id, 'Other Project', 'Description', 'Developer', '2023-01-01', 'Planned']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/projects/1')
        .send({
          name: 'Updated',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, 'To Delete', 'Description', 'Developer', '2023-01-01', 'Planned']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Project entry deleted successfully');

      // Verify project is deleted
      const check = await queryTestDb(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );
      expect(check.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should not allow deleting other user\'s project', async () => {
      const otherUser = await createTestUser({
        email: 'other4@test.com',
        first_name: 'Other4',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO projects (user_id, name, description, role, start_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [otherUser.id, 'Other Project', 'Description', 'Developer', '2023-01-01', 'Planned']
      );
      const projectId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/projects/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in GET /api/projects', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error while fetching projects');

      querySpy.mockRestore();
    });

    it('should handle database errors in POST /api/projects', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Project',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error while adding project');

      querySpy.mockRestore();
    });

    it('should handle database errors in PUT /api/projects/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
          description: 'Description',
          role: 'Developer',
          start_date: '2024-01-01',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error while updating project');

      querySpy.mockRestore();
    });

    it('should handle database errors in DELETE /api/projects/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .delete('/api/projects/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error while deleting project');

      querySpy.mockRestore();
    });
  });
});

