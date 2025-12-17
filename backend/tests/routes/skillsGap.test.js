/**
 * Skills Gap Routes Tests
 * Tests skills gap analysis and gap identification algorithm
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import skillsGapRoutes from '../../routes/skillsGap.js';
import { createTestUser, queryTestDb, seedSkills, seedJobs } from '../helpers/index.js';

// Mock external services

// Mock fs for learning resources
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => JSON.stringify({
      python: [
        { title: 'Python Tutorial', url: 'https://example.com/python' }
      ],
      javascript: [
        { title: 'JavaScript Guide', url: 'https://example.com/javascript' }
      ],
      default: [
        { title: 'General Learning', url: 'https://example.com/SKILL_NAME' }
      ]
    })),
    existsSync: vi.fn(() => true),
  },
}));

describe('Skills Gap Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/skills-gap', skillsGapRoutes);
    
    user = await createTestUser({
      email: 'skillsgap@test.com',
      first_name: 'Skills',
      last_name: 'Gap',
    });
  });

  describe('GET /api/skills-gap/:jobId', () => {
    it('should return 404 when job not found', async () => {
      const response = await request(app)
        .get('/api/skills-gap/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/skills-gap/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token');
    });

    it('should identify all skills as missing when user has no skills', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe(jobId);
      expect(response.body.userId).toBe(user.id);
      expect(response.body.matchedSkills).toEqual([]);
      expect(response.body.weakSkills).toEqual([]);
      expect(response.body.missingSkills.length).toBeGreaterThan(0);
      expect(response.body.priorityList.length).toBe(3);
      
      // All should be marked as missing
      response.body.priorityList.forEach(item => {
        expect(item.status).toBe('missing');
        expect(item.currentLevel).toBe(0);
      });
    });

    it('should identify matched skills correctly', async () => {
      // Add user skills with Advanced proficiency (level 3+)
      await seedSkills(user.id, [
        { name: 'Python', category: 'Technical', proficiency: 'Advanced' },
        { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
      ]);

      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.matchedSkills.length).toBe(2);
      expect(response.body.missingSkills.length).toBe(1);
      expect(response.body.missingSkills[0].toLowerCase()).toBe('react');
      
      // Check priority list
      const matchedItems = response.body.priorityList.filter(item => item.status === 'matched');
      expect(matchedItems.length).toBe(2);
      matchedItems.forEach(item => {
        expect(item.priority).toBe(1); // Low priority for matched skills
      });
    });

    it('should identify weak skills correctly', async () => {
      // Add user skills with Beginner/Intermediate proficiency (level < 3)
      await seedSkills(user.id, [
        { name: 'Python', category: 'Technical', proficiency: 'Beginner' },
        { name: 'JavaScript', category: 'Technical', proficiency: 'Intermediate' },
      ]);

      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.weakSkills.length).toBe(2);
      expect(response.body.missingSkills.length).toBe(1);
      
      // Check priority list
      const weakItems = response.body.priorityList.filter(item => item.status === 'weak');
      expect(weakItems.length).toBe(2);
      weakItems.forEach(item => {
        expect(item.currentLevel).toBeLessThan(3);
        expect(item.priority).toBeGreaterThan(1); // Higher priority for weak skills
      });
    });

    it('should calculate priority correctly for missing skills', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'SQL', 'AWS', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.priorityList.length).toBe(5);
      
      // High-demand skills (Python, JavaScript, SQL, AWS, React) should have higher priority
      const highDemandSkills = ['python', 'javascript', 'sql', 'aws', 'react'];
      response.body.priorityList.forEach(item => {
        const skillLower = item.skill.toLowerCase();
        if (highDemandSkills.includes(skillLower)) {
          expect(item.priority).toBeGreaterThan(1);
        }
      });
    }, 60000); // 60 second timeout for priority calculation

    it('should sort priority list from highest to lowest priority', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React', 'Vue', 'Angular']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.priorityList.length).toBe(5);
      
      // Verify sorting (highest priority first)
      for (let i = 0; i < response.body.priorityList.length - 1; i++) {
        expect(response.body.priorityList[i].priority).toBeGreaterThanOrEqual(
          response.body.priorityList[i + 1].priority
        );
      }
    });

    it('should normalize skill names (case-insensitive matching)', async () => {
      await seedSkills(user.id, [
        { name: 'python', category: 'Technical', proficiency: 'Advanced' },
        { name: 'JAVASCRIPT', category: 'Technical', proficiency: 'Expert' },
      ]);

      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should match despite case differences
      expect(response.body.matchedSkills.length).toBe(2);
      expect(response.body.missingSkills.length).toBe(1);
    });

    it('should attach learning resources for skills', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Learning resources keys are normalized to lowercase in the route
      expect(response.body.learningResources).toHaveProperty('python');
      expect(response.body.learningResources).toHaveProperty('javascript');
      expect(response.body.learningResources).toHaveProperty('react');
      
      // Check that resources are arrays
      expect(Array.isArray(response.body.learningResources.python)).toBe(true);
    });

    it('should handle empty required_skills array', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: []
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.matchedSkills).toEqual([]);
      expect(response.body.weakSkills).toEqual([]);
      expect(response.body.missingSkills).toEqual([]);
      expect(response.body.priorityList).toEqual([]);
    });

    it('should handle null required_skills', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: null
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.matchedSkills).toEqual([]);
      expect(response.body.weakSkills).toEqual([]);
      expect(response.body.missingSkills).toEqual([]);
      expect(response.body.priorityList).toEqual([]);
    });

    it('should only analyze jobs belonging to the user', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      const job = await seedJobs(otherUser.id, 1, {
        required_skills: ['Python', 'JavaScript']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      // Should return 404 since job doesn't belong to user
      expect(response.status).toBe(404);
    });
  });

  describe('Skills Gap Identification Algorithm', () => {
    it('should correctly categorize skills into matched, weak, and missing', async () => {
      await seedSkills(user.id, [
        { name: 'Python', category: 'Technical', proficiency: 'Advanced' }, // Matched
        { name: 'JavaScript', category: 'Technical', proficiency: 'Beginner' }, // Weak
        // React is missing
      ]);

      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.matchedSkills.length).toBe(1);
      expect(response.body.matchedSkills[0].skill.toLowerCase()).toBe('python');
      expect(response.body.weakSkills.length).toBe(1);
      expect(response.body.weakSkills[0].skill.toLowerCase()).toBe('javascript');
      expect(response.body.missingSkills.length).toBe(1);
      expect(response.body.missingSkills[0].toLowerCase()).toBe('react');
    });

    it('should assign higher priority to missing skills than weak skills', async () => {
      await seedSkills(user.id, [
        { name: 'JavaScript', category: 'Technical', proficiency: 'Beginner' }, // Weak
      ]);

      const job = await seedJobs(user.id, 1, {
        required_skills: ['JavaScript', 'React'] // React is missing
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const missingItem = response.body.priorityList.find(item => item.status === 'missing');
      const weakItem = response.body.priorityList.find(item => item.status === 'weak');
      
      expect(missingItem.priority).toBeGreaterThan(weakItem.priority);
    });
  });

  describe('Recommendations Generation', () => {
    it('should include learning resources in response', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.learningResources).toBeDefined();
      expect(typeof response.body.learningResources).toBe('object');
    });

    it('should provide priority list for recommendations', async () => {
      const job = await seedJobs(user.id, 1, {
        required_skills: ['Python', 'JavaScript', 'React', 'Vue']
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/skills-gap/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.priorityList).toBeDefined();
      expect(Array.isArray(response.body.priorityList)).toBe(true);
      expect(response.body.priorityList.length).toBe(4);
      
      // Each item should have required fields
      response.body.priorityList.forEach(item => {
        expect(item).toHaveProperty('skill');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('currentLevel');
        expect(item).toHaveProperty('priority');
        expect(['missing', 'weak', 'matched']).toContain(item.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/skills-gap/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Skills gap calculation failed');

      querySpy.mockRestore();
    });
  });
});

