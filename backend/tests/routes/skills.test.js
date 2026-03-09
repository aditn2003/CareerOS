/**
 * Skills Routes Tests
 * Tests all skill-related functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import skillsRoutes from '../../routes/skills.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

// Mock external services

describe('Skills Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/skills', skillsRoutes);
    
    user = await createTestUser({
      email: 'skills@test.com',
      first_name: 'Skills',
      last_name: 'Test',
    });
  });

  describe('GET /api/skills', () => {
    it('should return empty array when user has no skills', async () => {
      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.skills).toEqual([]);
    });

    it('should list all skills for authenticated user', async () => {
      // Insert test skills
      await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
        [
          user.id, 'JavaScript', 'Technical', 'Advanced',
          user.id, 'Communication', 'Soft Skills', 'Expert'
        ]
      );

      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.skills).toHaveLength(2);
      expect(response.body.skills[0]).toHaveProperty('name');
      expect(response.body.skills[0]).toHaveProperty('category');
      expect(response.body.skills[0]).toHaveProperty('proficiency');
    });

    it('should order skills by category and name', async () => {
      await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)`,
        [
          user.id, 'Python', 'Technical', 'Intermediate',
          user.id, 'JavaScript', 'Technical', 'Advanced',
          user.id, 'Communication', 'Soft Skills', 'Expert'
        ]
      );

      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.skills).toHaveLength(3);
      // Should be ordered by category, then name
      expect(response.body.skills[0].category).toBe('Soft Skills');
      expect(response.body.skills[1].category).toBe('Technical');
      expect(response.body.skills[2].category).toBe('Technical');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/skills');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token');
    });

    it('should only return skills for the authenticated user', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      // Insert skills for both users
      await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
        [
          user.id, 'My Skill', 'Technical', 'Advanced',
          otherUser.id, 'Other Skill', 'Technical', 'Intermediate'
        ]
      );

      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].name).toBe('My Skill');
    });
  });

  describe('POST /api/skills', () => {
    it('should add a new skill', async () => {
      const skillData = {
        name: 'React',
        category: 'Technical',
        proficiency: 'Advanced',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${user.token}`)
        .send(skillData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Skill added');
      expect(response.body.skill).toHaveProperty('id');
      expect(response.body.skill.name).toBe('React');
      expect(response.body.skill.category).toBe('Technical');
      expect(response.body.skill.proficiency).toBe('Advanced');
      expect(response.body.skill.user_id).toBe(user.id);
    });

    it('should reject skill creation without name', async () => {
      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          category: 'Technical',
          proficiency: 'Intermediate',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Skill name required');
    });

    it('should reject duplicate skill (case-insensitive)', async () => {
      // Insert existing skill
      await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'JavaScript', 'Technical', 'Advanced']
      );

      // Try to add duplicate (different case)
      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'javascript',
          category: 'Technical',
          proficiency: 'Intermediate',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Duplicate skill');
    });

    it('should accept optional category and proficiency', async () => {
      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'New Skill',
        });

      expect(response.status).toBe(200);
      expect(response.body.skill.name).toBe('New Skill');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/skills')
        .send({
          name: 'Test Skill',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill category and proficiency', async () => {
      // Create a skill
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Python', 'Technical', 'Intermediate']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          category: 'Languages',
          proficiency: 'Expert',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Skill updated');
      expect(response.body.skill.category).toBe('Languages');
      expect(response.body.skill.proficiency).toBe('Expert');
      expect(response.body.skill.name).toBe('Python'); // Name should not change
    });

    it('should update only proficiency when category is not provided', async () => {
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'React', 'Technical', 'Intermediate']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          proficiency: 'Advanced',
        });

      expect(response.status).toBe(200);
      expect(response.body.skill.proficiency).toBe('Advanced');
      expect(response.body.skill.category).toBe('Technical'); // Should remain unchanged
    });

    it('should update only category when proficiency is not provided', async () => {
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Vue', 'Technical', 'Intermediate']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          category: 'Industry-Specific',
        });

      expect(response.status).toBe(200);
      expect(response.body.skill.category).toBe('Industry-Specific');
      expect(response.body.skill.proficiency).toBe('Intermediate'); // Should remain unchanged
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .put('/api/skills/99999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          proficiency: 'Advanced',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });

    it('should not allow updating other user\'s skill', async () => {
      const otherUser = await createTestUser({
        email: 'other2@test.com',
        first_name: 'Other2',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other Skill', 'Technical', 'Intermediate']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          proficiency: 'Advanced',
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/skills/1')
        .send({
          proficiency: 'Advanced',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete a skill', async () => {
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'To Delete', 'Technical', 'Beginner']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Deleted');

      // Verify skill is deleted
      const check = await queryTestDb(
        'SELECT * FROM skills WHERE id = $1',
        [skillId]
      );
      expect(check.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .delete('/api/skills/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Skill not found');
    });

    it('should not allow deleting other user\'s skill', async () => {
      const otherUser = await createTestUser({
        email: 'other3@test.com',
        first_name: 'Other3',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other Skill', 'Technical', 'Intermediate']
      );
      const skillId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/skills/${skillId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/skills/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Skill Proficiency Levels', () => {
    it('should accept all valid proficiency levels', async () => {
      const proficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

      for (const proficiency of proficiencies) {
        const response = await request(app)
          .post('/api/skills')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            name: `Skill ${proficiency}`,
            category: 'Technical',
            proficiency,
          });

        expect(response.status).toBe(200);
        expect(response.body.skill.proficiency).toBe(proficiency);
      }
    });

    it('should accept all valid categories', async () => {
      const categories = ['Technical', 'Soft Skills', 'Languages', 'Industry-Specific'];

      for (const category of categories) {
        const response = await request(app)
          .post('/api/skills')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            name: `Skill ${category}`,
            category,
            proficiency: 'Intermediate',
          });

        expect(response.status).toBe(200);
        expect(response.body.skill.category).toBe(category);
      }
    });

    it('should update proficiency level', async () => {
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Learning Skill', 'Technical', 'Beginner']
      );
      const skillId = result.rows[0].id;

      // Update through levels
      const levels = ['Intermediate', 'Advanced', 'Expert'];
      for (const level of levels) {
        const response = await request(app)
          .put(`/api/skills/${skillId}`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({ proficiency: level });

        expect(response.status).toBe(200);
        expect(response.body.skill.proficiency).toBe(level);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in GET /api/skills', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to load skills');

      querySpy.mockRestore();
    });

    it('should handle database errors in POST /api/skills', async () => {
      const originalQuery = pool.query.bind(pool);
      const querySpy = vi.spyOn(pool, 'query');
      
      querySpy.mockImplementation((text, params) => {
        if (text.includes('SELECT id FROM skills')) {
          return Promise.resolve({ rows: [] });
        }
        if (text.includes('INSERT INTO skills')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return originalQuery(text, params);
      });

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Skill',
          category: 'Technical',
          proficiency: 'Intermediate',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('DB error');

      querySpy.mockRestore();
    });

    it('should handle database errors in PUT /api/skills/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          proficiency: 'Advanced',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Update failed');

      querySpy.mockRestore();
    });

    it('should handle database errors in DELETE /api/skills/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Delete failed');

      querySpy.mockRestore();
    });
  });
});

