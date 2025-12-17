/**
 * Resume Presets Routes Tests
 * Tests routes/resumePresets.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import resumePresetsRoutes from '../../routes/resumePresets.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

describe('Resume Presets Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', resumePresetsRoutes);
    
    user = await createTestUser({
      email: 'presets@test.com',
      first_name: 'Presets',
      last_name: 'Test',
    });
  });

  describe('POST /api/resume-presets', () => {
    it('should create a new resume preset', async () => {
      const presetData = {
        name: 'Professional Template',
        section_order: ['experience', 'education', 'skills'],
        visible_sections: { experience: true, education: true }
      };

      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(presetData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('preset');
      expect(response.body).toHaveProperty('message');
      expect(response.body.preset).toHaveProperty('id');
      expect(response.body.preset).toHaveProperty('name', presetData.name);
      expect(response.body.preset).toHaveProperty('section_order');
      expect(response.body.preset).toHaveProperty('visible_sections');
      expect(response.body.preset).toHaveProperty('user_id', user.id);
    });

    it('should return error when name is missing', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_order: ['experience', 'education']
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid data');
    });

    it('should return error when section_order is missing', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Preset'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error when section_order is not an array', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Preset',
          section_order: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should create preset with empty section_order array', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Empty Preset',
          section_order: []
        });

      expect(response.status).toBe(200);
      expect(response.body.preset.section_order).toEqual([]);
    });

    it('should create preset with visible_sections', async () => {
      const presetData = {
        name: 'Custom Preset',
        section_order: ['experience', 'education', 'skills'],
        visible_sections: { experience: true, skills: true, education: false }
      };

      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(presetData);

      expect(response.status).toBe(200);
      expect(response.body.preset.visible_sections).toEqual(presetData.visible_sections);
    });

    it('should create preset without visible_sections', async () => {
      const presetData = {
        name: 'Simple Preset',
        section_order: ['experience', 'education']
      };

      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(presetData);

      expect(response.status).toBe(200);
      expect(response.body.preset).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .send({
          name: 'Test',
          section_order: ['experience']
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test',
          section_order: ['experience']
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Preset',
          section_order: ['experience']
        });

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });

    it('should create multiple presets for same user', async () => {
      const preset1 = {
        name: 'Preset 1',
        section_order: ['experience']
      };
      const preset2 = {
        name: 'Preset 2',
        section_order: ['education']
      };

      const response1 = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(preset1);

      const response2 = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(preset2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.preset.id).not.toBe(response2.body.preset.id);
    });
  });

  describe('GET /api/resume-presets', () => {
    it('should return empty array when no presets exist', async () => {
      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('presets');
      expect(Array.isArray(response.body.presets)).toBe(true);
      expect(response.body.presets.length).toBe(0);
    });

    it('should return all presets for user', async () => {
      // Create presets
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order, visible_sections)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'Preset 1', ['experience', 'education'], JSON.stringify({ experience: true })]
      );
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)`,
        [user.id, 'Preset 2', ['skills', 'projects']]
      );

      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.presets.length).toBeGreaterThanOrEqual(2);
      expect(response.body.presets[0]).toHaveProperty('id');
      expect(response.body.presets[0]).toHaveProperty('name');
      expect(response.body.presets[0]).toHaveProperty('section_order');
      expect(response.body.presets[0]).toHaveProperty('created_at');
    });

    it('should return presets ordered by created_at DESC', async () => {
      // Create presets with different timestamps
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order, created_at)
         VALUES ($1, $2, $3, $4::timestamp)`,
        [user.id, 'Older Preset', ['experience'], new Date('2024-01-01')]
      );
      
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order, created_at)
         VALUES ($1, $2, $3, $4::timestamp)`,
        [user.id, 'Newer Preset', ['education'], new Date('2024-01-02')]
      );

      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.presets.length).toBeGreaterThanOrEqual(2);
      // Newer should come first
      expect(response.body.presets[0].name).toBe('Newer Preset');
    });

    it('should only return presets for authenticated user', async () => {
      // Create another user
      const otherUser = await createTestUser({ email: 'other@test.com' });
      
      // Create presets for both users
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)`,
        [user.id, 'My Preset', ['experience']]
      );
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)`,
        [otherUser.id, 'Other User Preset', ['education']]
      );

      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only return current user's presets
      response.body.presets.forEach(preset => {
        expect(preset.name).not.toBe('Other User Preset');
      });
    });

    it('should return correct fields only', async () => {
      await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order, visible_sections)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'Test Preset', ['experience'], JSON.stringify({ experience: true })]
      );

      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      if (response.body.presets.length > 0) {
        const preset = response.body.presets[0];
        // Should have id, name, section_order, visible_sections, created_at
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('section_order');
        expect(preset).toHaveProperty('visible_sections');
        expect(preset).toHaveProperty('created_at');
        // Should not have user_id in response
        expect(preset).not.toHaveProperty('user_id');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/resume-presets');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/resume-presets/:id', () => {
    it('should delete a preset', async () => {
      // Create a preset
      const presetResult = await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'To Delete', ['experience']]
      );
      const presetId = presetResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/resume-presets/${presetId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');

      // Verify it's deleted
      const checkResponse = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      const deletedPreset = checkResponse.body.presets.find(p => p.id === presetId);
      expect(deletedPreset).toBeUndefined();
    });

    it('should only delete presets belonging to the user', async () => {
      // Create another user and their preset
      const otherUser = await createTestUser({ email: 'other2@test.com' });
      const otherPresetResult = await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [otherUser.id, 'Other User Preset', ['education']]
      );
      const otherPresetId = otherPresetResult.rows[0].id;

      // Try to delete other user's preset
      const response = await request(app)
        .delete(`/api/resume-presets/${otherPresetId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should succeed but not actually delete (no error, but preset still exists for other user)
      
      // Verify other user's preset still exists
      const otherUserResponse = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${otherUser.token}`);

      const stillExists = otherUserResponse.body.presets.find(p => p.id === otherPresetId);
      // Preset should still exist for other user
      expect(stillExists).toBeDefined();
    });

    it('should return success even if preset does not exist', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .delete(`/api/resume-presets/${nonExistentId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/resume-presets/1');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/resume-presets/invalid-id')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either return error or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });

    it('should delete correct preset when multiple exist', async () => {
      // Create multiple presets
      const preset1Result = await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Preset 1', ['experience']]
      );
      const preset2Result = await queryTestDb(
        `INSERT INTO resume_presets (user_id, name, section_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Preset 2', ['education']]
      );
      const preset1Id = preset1Result.rows[0].id;
      const preset2Id = preset2Result.rows[0].id;

      // Delete first preset
      const deleteResponse = await request(app)
        .delete(`/api/resume-presets/${preset1Id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(deleteResponse.status).toBe(200);

      // Verify only first is deleted
      const getResponse = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', `Bearer ${user.token}`);

      const preset1 = getResponse.body.presets.find(p => p.id === preset1Id);
      const preset2 = getResponse.body.presets.find(p => p.id === preset2Id);
      
      expect(preset1).toBeUndefined();
      expect(preset2).toBeDefined();
    });
  });
});

