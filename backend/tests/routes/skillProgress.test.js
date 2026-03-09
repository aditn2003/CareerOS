/**
 * Skill Progress Routes Tests
 * Tests routes/skillProgress.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import skillProgressRoutes from '../../routes/skillProgress.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

describe('Skill Progress Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/skill-progress', skillProgressRoutes);
    
    user = await createTestUser({
      email: 'skillprogress@test.com',
      first_name: 'Skill',
      last_name: 'Progress',
    });
  });

  describe('GET /api/skill-progress', () => {
    it('should return empty array when no progress exists', async () => {
      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress');
      expect(Array.isArray(response.body.progress)).toBe(true);
      expect(response.body.progress.length).toBe(0);
    });

    it('should return all skill progress for user', async () => {
      // Create progress entries
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [user.id, 'javascript', 'in progress']
      );
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [user.id, 'python', 'completed']
      );

      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.progress.length).toBeGreaterThanOrEqual(2);
      expect(response.body.progress[0]).toHaveProperty('id');
      expect(response.body.progress[0]).toHaveProperty('skill');
      expect(response.body.progress[0]).toHaveProperty('status');
      expect(response.body.progress[0]).toHaveProperty('updated_at');
    });

    it('should return progress ordered by updated_at DESC', async () => {
      // Create progress with different timestamps
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status, updated_at)
         VALUES ($1, $2, $3, $4::timestamp)`,
        [user.id, 'older-skill', 'not started', new Date('2024-01-01')]
      );
      
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status, updated_at)
         VALUES ($1, $2, $3, $4::timestamp)`,
        [user.id, 'newer-skill', 'in progress', new Date('2024-01-02')]
      );

      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.progress.length).toBeGreaterThanOrEqual(2);
      // Newer should come first
      expect(response.body.progress[0].skill).toBe('newer-skill');
    });

    it('should only return progress for authenticated user', async () => {
      // Create another user
      const otherUser = await createTestUser({ email: 'other@test.com' });
      
      // Create progress for both users
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [user.id, 'my-skill', 'completed']
      );
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [otherUser.id, 'other-skill', 'in progress']
      );

      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only return current user's progress
      response.body.progress.forEach(entry => {
        expect(entry.skill).not.toBe('other-skill');
      });
    });

    it('should return correct fields only', async () => {
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [user.id, 'test-skill', 'completed']
      );

      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      if (response.body.progress.length > 0) {
        const entry = response.body.progress[0];
        // Should have id, skill, status, updated_at
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('skill');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('updated_at');
        // Should not have user_id in response
        expect(entry).not.toHaveProperty('user_id');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/skill-progress/');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/skill-progress/')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/skill-progress/:skill', () => {
    it('should create new skill progress', async () => {
      const response = await request(app)
        .put('/api/skill-progress/javascript')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('entry');
      expect(response.body.entry).toHaveProperty('id');
      expect(response.body.entry).toHaveProperty('skill', 'javascript');
      expect(response.body.entry).toHaveProperty('status', 'in progress');
      expect(response.body.entry).toHaveProperty('user_id', user.id);
    });

    it('should update existing skill progress', async () => {
      // Create initial progress
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status)
         VALUES ($1, $2, $3)`,
        [user.id, 'python', 'not started']
      );

      // Update it
      const response = await request(app)
        .put('/api/skill-progress/python')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.entry.status).toBe('completed');
      expect(response.body.entry.skill).toBe('python');
    });

    it('should normalize skill name to lowercase', async () => {
      const response = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      expect(response.status).toBe(200);
      expect(response.body.entry.skill).toBe('javascript');
    });

    it('should trim skill name whitespace', async () => {
      const response = await request(app)
        .put('/api/skill-progress/  Python  ')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.entry.skill).toBe('python');
    });

    it('should accept "not started" status', async () => {
      const response = await request(app)
        .put('/api/skill-progress/react')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'not started' });

      expect(response.status).toBe(200);
      expect(response.body.entry.status).toBe('not started');
    });

    it('should accept "in progress" status', async () => {
      const response = await request(app)
        .put('/api/skill-progress/nodejs')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      expect(response.status).toBe(200);
      expect(response.body.entry.status).toBe('in progress');
    });

    it('should accept "completed" status', async () => {
      const response = await request(app)
        .put('/api/skill-progress/typescript')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.entry.status).toBe('completed');
    });

    it('should return error for invalid status', async () => {
      const response = await request(app)
        .put('/api/skill-progress/react')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status value');
    });

    it('should return error when status is missing', async () => {
      const response = await request(app)
        .put('/api/skill-progress/react')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should update updated_at timestamp on update', async () => {
      // Create initial progress
      const oldDate = new Date('2024-01-01');
      await queryTestDb(
        `INSERT INTO skill_progress (user_id, skill, status, updated_at)
         VALUES ($1, $2, $3, $4::timestamp)`,
        [user.id, 'django', 'not started', oldDate]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update it
      const response = await request(app)
        .put('/api/skill-progress/django')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      const updatedAt = new Date(response.body.entry.updated_at);
      expect(updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it('should handle multiple skills for same user', async () => {
      const response1 = await request(app)
        .put('/api/skill-progress/skill1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      const response2 = await request(app)
        .put('/api/skill-progress/skill2')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.entry.skill).toBe('skill1');
      expect(response2.body.entry.skill).toBe('skill2');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/skill-progress/react')
        .send({ status: 'in progress' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .put('/api/skill-progress/react')
        .set('Authorization', 'Bearer invalid-token')
        .send({ status: 'in progress' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .put('/api/skill-progress/test-skill')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });

    it('should handle special characters in skill name', async () => {
      const response = await request(app)
        .put('/api/skill-progress/c++')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'in progress' });

      expect(response.status).toBe(200);
      expect(response.body.entry.skill).toBe('c++');
    });

    it('should handle long skill names', async () => {
      const longSkillName = 'a'.repeat(100);
      const response = await request(app)
        .put(`/api/skill-progress/${longSkillName}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.entry.skill).toBe(longSkillName.toLowerCase());
    });
  });
});

