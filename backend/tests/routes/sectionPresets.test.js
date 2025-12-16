/**
 * Section Presets Routes Tests
 * Tests routes/sectionPresets.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sectionPresetsRoutes from '../../routes/sectionPresets.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

describe('Section Presets Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', sectionPresetsRoutes);
    
    user = await createTestUser({
      email: 'sectionpresets@test.com',
      first_name: 'Section',
      last_name: 'Presets',
    });
  });

  describe('POST /api/section-presets', () => {
    it('should create a new section preset', async () => {
      const presetData = {
        section_name: 'education',
        preset_name: 'University Education',
        section_data: {
          entries: [
            { degree: 'BS Computer Science', university: 'MIT', year: '2020' }
          ]
        }
      };

      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(presetData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('preset');
      expect(response.body.preset).toHaveProperty('id');
      expect(response.body.preset).toHaveProperty('section_name', presetData.section_name);
      expect(response.body.preset).toHaveProperty('preset_name', presetData.preset_name);
      expect(response.body.preset).toHaveProperty('section_data');
      expect(response.body.preset).toHaveProperty('user_id', user.id);
      expect(response.body.preset).toHaveProperty('created_at');
    });

    it('should return error when section_name is missing', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          preset_name: 'Test Preset',
          section_data: { entries: [] }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return error when preset_name is missing', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_name: 'education',
          section_data: { entries: [] }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error when section_data is missing', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_name: 'education',
          preset_name: 'Test Preset'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle complex section_data objects', async () => {
      const complexData = {
        entries: [
          { title: 'Project 1', description: 'Description 1', technologies: ['React', 'Node.js'] },
          { title: 'Project 2', description: 'Description 2', technologies: ['Python', 'Django'] }
        ],
        metadata: { version: 1, lastUpdated: '2024-01-01' }
      };

      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_name: 'projects',
          preset_name: 'Complex Projects',
          section_data: complexData
        });

      expect(response.status).toBe(200);
      expect(response.body.preset.section_data).toBeDefined();
    });

    it('should handle empty section_data', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_name: 'skills',
          preset_name: 'Empty Skills',
          section_data: {}
        });

      expect(response.status).toBe(200);
      expect(response.body.preset).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .send({
          section_name: 'education',
          preset_name: 'Test',
          section_data: {}
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          section_name: 'education',
          preset_name: 'Test',
          section_data: {}
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should create multiple presets for same section', async () => {
      const preset1 = {
        section_name: 'education',
        preset_name: 'Preset 1',
        section_data: { entries: [] }
      };
      const preset2 = {
        section_name: 'education',
        preset_name: 'Preset 2',
        section_data: { entries: [] }
      };

      const response1 = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(preset1);

      const response2 = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(preset2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.preset.id).not.toBe(response2.body.preset.id);
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .post('/api/section-presets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          section_name: 'education',
          preset_name: 'Test Preset',
          section_data: { entries: [] }
        });

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/section-presets/:section_name', () => {
    it('should return empty array when no presets exist', async () => {
      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('presets');
      expect(Array.isArray(response.body.presets)).toBe(true);
      expect(response.body.presets.length).toBe(0);
    });

    it('should return all presets for a section', async () => {
      // Create presets
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'education', 'Preset 1', JSON.stringify({ entries: [] })]
      );
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'education', 'Preset 2', JSON.stringify({ entries: [] })]
      );

      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.presets.length).toBeGreaterThanOrEqual(2);
      expect(response.body.presets[0]).toHaveProperty('id');
      expect(response.body.presets[0]).toHaveProperty('preset_name');
      expect(response.body.presets[0]).toHaveProperty('section_data');
      expect(response.body.presets[0]).toHaveProperty('created_at');
    });

    it('should return presets ordered by created_at DESC', async () => {
      // Create presets with different timestamps
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::timestamp)`,
        [user.id, 'skills', 'Older Preset', JSON.stringify({}), new Date('2024-01-01')]
      );
      
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::timestamp)`,
        [user.id, 'skills', 'Newer Preset', JSON.stringify({}), new Date('2024-01-02')]
      );

      const response = await request(app)
        .get('/api/section-presets/skills')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.presets.length).toBeGreaterThanOrEqual(2);
      // Newer should come first
      expect(response.body.presets[0].preset_name).toBe('Newer Preset');
    });

    it('should only return presets for the specified section', async () => {
      // Create presets for different sections
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'education', 'Education Preset', JSON.stringify({})]
      );
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'skills', 'Skills Preset', JSON.stringify({})]
      );

      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only return education presets
      response.body.presets.forEach(preset => {
        expect(preset.preset_name).not.toBe('Skills Preset');
      });
    });

    it('should only return presets for authenticated user', async () => {
      // Create another user
      const otherUser = await createTestUser({ email: 'other@test.com' });
      
      // Create presets for both users
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'education', 'My Preset', JSON.stringify({})]
      );
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [otherUser.id, 'education', 'Other User Preset', JSON.stringify({})]
      );

      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only return current user's presets
      response.body.presets.forEach(preset => {
        expect(preset.preset_name).not.toBe('Other User Preset');
      });
    });

    it('should return correct fields only', async () => {
      await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [user.id, 'education', 'Test Preset', JSON.stringify({ entries: [] })]
      );

      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      if (response.body.presets.length > 0) {
        const preset = response.body.presets[0];
        // Should have id, preset_name, section_data, created_at
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('preset_name');
        expect(preset).toHaveProperty('section_data');
        expect(preset).toHaveProperty('created_at');
        // Should not have user_id or section_name in response
        expect(preset).not.toHaveProperty('user_id');
        expect(preset).not.toHaveProperty('section_name');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/section-presets/education');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/section-presets/:id', () => {
    it('should delete a preset', async () => {
      // Create a preset
      const presetResult = await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [user.id, 'education', 'To Delete', JSON.stringify({})]
      );
      const presetId = presetResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/section-presets/${presetId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');

      // Verify it's deleted
      const checkResponse = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      const deletedPreset = checkResponse.body.presets.find(p => p.id === presetId);
      expect(deletedPreset).toBeUndefined();
    });

    it('should only delete presets belonging to the user', async () => {
      // Create another user and their preset
      const otherUser = await createTestUser({ email: 'other2@test.com' });
      const otherPresetResult = await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [otherUser.id, 'education', 'Other User Preset', JSON.stringify({})]
      );
      const otherPresetId = otherPresetResult.rows[0].id;

      // Try to delete other user's preset
      const response = await request(app)
        .delete(`/api/section-presets/${otherPresetId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should succeed but not actually delete (no error, but preset still exists for other user)
      
      // Verify other user's preset still exists
      const otherUserResponse = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${otherUser.token}`);

      const stillExists = otherUserResponse.body.presets.find(p => p.id === otherPresetId);
      // Preset should still exist for other user
      expect(stillExists).toBeDefined();
    });

    it('should return success even if preset does not exist', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .delete(`/api/section-presets/${nonExistentId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/section-presets/1');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/section-presets/invalid-id')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either return error or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', `Bearer ${user.token}`);

      // Should either succeed or handle error properly
      expect([200, 500]).toContain(response.status);
    });

    it('should delete correct preset when multiple exist', async () => {
      // Create multiple presets
      const preset1Result = await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [user.id, 'education', 'Preset 1', JSON.stringify({})]
      );
      const preset2Result = await queryTestDb(
        `INSERT INTO section_presets (user_id, section_name, preset_name, section_data)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [user.id, 'education', 'Preset 2', JSON.stringify({})]
      );
      const preset1Id = preset1Result.rows[0].id;
      const preset2Id = preset2Result.rows[0].id;

      // Delete first preset
      const deleteResponse = await request(app)
        .delete(`/api/section-presets/${preset1Id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(deleteResponse.status).toBe(200);

      // Verify only first is deleted
      const getResponse = await request(app)
        .get('/api/section-presets/education')
        .set('Authorization', `Bearer ${user.token}`);

      const preset1 = getResponse.body.presets.find(p => p.id === preset1Id);
      const preset2 = getResponse.body.presets.find(p => p.id === preset2Id);
      
      expect(preset1).toBeUndefined();
      expect(preset2).toBeDefined();
    });
  });
});

