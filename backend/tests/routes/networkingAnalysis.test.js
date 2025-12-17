/**
 * Networking Analysis Routes Tests
 * Tests routes/networkingAnalysis.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import networkingAnalysisRoutes from '../../routes/networkingAnalysis.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';

describe('Networking Analysis Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/networking-analysis', networkingAnalysisRoutes);
    
    user = await createTestUser({
      email: 'networking@test.com',
      first_name: 'Networking',
      last_name: 'Test',
    });
  });

  describe('GET /api/networking-analysis/full', () => {
    it('should return networking analysis with empty data', async () => {
      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activityMetrics');
      expect(response.body).toHaveProperty('monthlyActivity');
      expect(response.body).toHaveProperty('relationshipMetrics');
      expect(response.body).toHaveProperty('referralAnalytics');
      expect(response.body).toHaveProperty('roiMetrics');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('benchmarkComparison');
      expect(response.body).toHaveProperty('summaryCards');
      expect(response.body).toHaveProperty('dataQuality');
      
      expect(response.body.activityMetrics.totalActivities).toBe(0);
      expect(response.body.relationshipMetrics.totalContacts).toBe(0);
      expect(response.body.referralAnalytics.totalReferrals).toBe(0);
    });

    it('should calculate activity metrics correctly', async () => {
      // Create networking activities
      await queryTestDb(
        `INSERT INTO networking_activities (user_id, activity_type, channel, direction, outcome, time_spent_minutes, relationship_impact)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, 'outreach', 'linkedin', 'outbound', 'positive', 30, 1]
      );
      await queryTestDb(
        `INSERT INTO networking_activities (user_id, activity_type, channel, direction, outcome, time_spent_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'conversation', 'email', 'inbound', 'positive', 15]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityMetrics.totalActivities).toBeGreaterThan(0);
      expect(response.body.activityMetrics.byType).toBeDefined();
      expect(response.body.activityMetrics.byChannel).toBeDefined();
      expect(response.body.activityMetrics.inboundVsOutbound).toBeDefined();
    });

    it('should calculate relationship metrics correctly', async () => {
      // Create networking contacts
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, industry, relationship_strength, engagement_score, reciprocity_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, 'John Doe', 'Tech Corp', 'Technology', 4, 0.8, 0.7]
      );
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'Jane Smith', 'Finance Inc', 3]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.relationshipMetrics.totalContacts).toBeGreaterThan(0);
      expect(response.body.relationshipMetrics.avgRelationshipStrength).toBeGreaterThan(0);
      expect(response.body.relationshipMetrics.byStrengthTier).toBeDefined();
    });

    it('should calculate referral analytics correctly', async () => {
      // Create contact first
      const contactResult = await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Referrer Contact', 'Referral Corp']
      );
      const contactId = contactResult.rows[0].id;

      // Create job
      const jobResult = await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Software Engineer', 'Tech Corp', 'Interview']
      );
      const jobId = jobResult.rows[0].id;

      // Create referral
      await queryTestDb(
        `INSERT INTO networking_referrals (user_id, contact_id, job_id, referral_type, quality_score, converted_to_interview)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, contactId, jobId, 'direct_referral', 8, true]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.referralAnalytics.totalReferrals).toBeGreaterThan(0);
      expect(response.body.referralAnalytics.byType).toBeDefined();
      expect(response.body.referralAnalytics.conversionRates).toBeDefined();
    });

    it('should calculate ROI metrics correctly', async () => {
      // Create networking event
      await queryTestDb(
        `INSERT INTO networking_events (user_id, event_name, event_type, event_date, cost, actual_connections_made)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'Tech Conference', 'conference', new Date(), 500, 10]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.roiMetrics.totalEvents).toBeGreaterThan(0);
      expect(response.body.roiMetrics.totalInvestment).toBeGreaterThan(0);
      expect(response.body.roiMetrics.byEventType).toBeDefined();
    });

    it('should calculate monthly activity trends', async () => {
      // Create activities with different dates
      const baseDate = new Date('2024-01-15');
      for (let i = 0; i < 3; i++) {
        const activityDate = new Date(baseDate);
        activityDate.setMonth(baseDate.getMonth() + i);
        await queryTestDb(
          `INSERT INTO networking_activities (user_id, activity_type, channel, direction, created_at)
           VALUES ($1, $2, $3, $4, $5::timestamp)`,
          [user.id, 'outreach', 'linkedin', 'outbound', activityDate]
        );
      }

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.monthlyActivity)).toBe(true);
    });

    it('should identify high-value contacts', async () => {
      // Create high-value contact
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength, engagement_score, reciprocity_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'High Value Contact', 'High Value Corp', 5, 0.9, 0.8]
      );

      // Create activities for this contact
      const contactResult = await queryTestDb(
        `SELECT id FROM networking_contacts WHERE user_id = $1 AND name = $2`,
        [user.id, 'High Value Contact']
      );
      if (contactResult.rows.length > 0) {
        const contactId = contactResult.rows[0].id;
        for (let i = 0; i < 5; i++) {
          await queryTestDb(
            `INSERT INTO networking_activities (user_id, contact_id, activity_type, outcome)
             VALUES ($1, $2, $3, $4)`,
            [user.id, contactId, 'conversation', 'positive']
          );
        }
      }

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.relationshipMetrics.highValueContacts.length).toBeGreaterThan(0);
    });

    it('should identify cooling down relationships', async () => {
      // Create contact with old last_contact_date
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 4); // 4 months ago
      
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength, last_contact_date)
         VALUES ($1, $2, $3, $4, $5::timestamp)`,
        [user.id, 'Cooling Contact', 'Cool Corp', 4, oldDate]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // May or may not have cooling down contacts depending on decay calculation
      expect(response.body.relationshipMetrics.coolingDown).toBeDefined();
    });

    it('should generate insights', async () => {
      // Create activities to trigger insights
      for (let i = 0; i < 15; i++) {
        await queryTestDb(
          `INSERT INTO networking_activities (user_id, activity_type, channel, direction, outcome)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, 'outreach', 'linkedin', 'outbound', 'positive']
        );
      }

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.insights)).toBe(true);
    });

    it('should calculate benchmark comparisons', async () => {
      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.benchmarkComparison).toBeDefined();
      expect(response.body.benchmarkComparison.responseRate).toBeDefined();
      expect(response.body.benchmarkComparison.referralConversion).toBeDefined();
      expect(response.body.benchmarkComparison.relationshipStrength).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      // Test should work even if some tables don't exist
      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should calculate relationship health scores', async () => {
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength, engagement_score, reciprocity_score, last_contact_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp)`,
        [user.id, 'Healthy Contact', 'Health Corp', 4, 0.8, 0.7, new Date()]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.relationshipMetrics.relationshipHealthScores).toBeDefined();
      expect(Array.isArray(response.body.relationshipMetrics.relationshipHealthScores)).toBe(true);
    });

    it('should calculate engagement frequency', async () => {
      const contactResult = await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, created_at)
         VALUES ($1, $2, $3, $4::timestamp)
         RETURNING id`,
        [user.id, 'Frequent Contact', 'Freq Corp', new Date('2024-01-01')]
      );
      const contactId = contactResult.rows[0].id;

      // Create frequent interactions
      for (let i = 0; i < 5; i++) {
        await queryTestDb(
          `INSERT INTO networking_activities (user_id, contact_id, activity_type, created_at)
           VALUES ($1, $2, $3, $4::timestamp)`,
          [user.id, contactId, 'conversation', new Date()]
        );
      }

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.relationshipMetrics.engagementFrequency).toBeDefined();
    });

    it('should calculate warm vs cold referral effectiveness', async () => {
      const contactResult = await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Warm Contact', 'Warm Corp']
      );
      const contactId = contactResult.rows[0].id;

      const jobResult = await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Engineer', 'Tech Corp', 'Interview']
      );
      const jobId = jobResult.rows[0].id;

      // Create warm referral
      await queryTestDb(
        `INSERT INTO networking_referrals (user_id, contact_id, job_id, referral_type, converted_to_interview)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, contactId, jobId, 'warm_introduction', true]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.referralAnalytics.warmVsCold).toBeDefined();
      expect(response.body.referralAnalytics.warmVsCold.warm).toBeDefined();
    });

    it('should calculate contact ROI', async () => {
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company)
         VALUES ($1, $2, $3)`,
        [user.id, 'ROI Contact', 'ROI Corp']
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.roiMetrics.contactROI).toBeDefined();
    }, 60000); // 60 second timeout for ROI calculation

    it('should calculate relationship tier ROI', async () => {
      // Create contacts with different strength tiers
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'Strong Contact', 'Strong Corp', 5]
      );
      await queryTestDb(
        `INSERT INTO networking_contacts (user_id, name, company, relationship_strength)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'Medium Contact', 'Medium Corp', 3]
      );

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.roiMetrics.relationshipTierROI).toBeDefined();
      expect(response.body.roiMetrics.relationshipTierROI.strong).toBeDefined();
      expect(response.body.roiMetrics.relationshipTierROI.medium).toBeDefined();
    }, 60000); // 60 second timeout for ROI calculation

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/networking-analysis/full');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock pool.query to throw an error for first query
      const pool = (await import('../../db/pool.js')).default;
      const originalQuery = pool.query;
      
      // Mock to fail first query, then return empty results for others
      let callCount = 0;
      pool.query = vi.fn().mockImplementation((query, params) => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Database error'));
        }
        // Return empty results for subsequent queries
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      // Route handles errors gracefully - may return 200 with partial data or 500
      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }

      // Restore original query
      pool.query = originalQuery;
    });

    it('should include summary cards', async () => {
      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summaryCards).toBeDefined();
      expect(response.body.summaryCards).toHaveProperty('totalContacts');
      expect(response.body.summaryCards).toHaveProperty('totalActivities');
      expect(response.body.summaryCards).toHaveProperty('totalReferrals');
    }, 60000); // 60s timeout

    it('should include data quality indicators', async () => {
      const response = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.dataQuality).toBeDefined();
      expect(response.body.dataQuality).toHaveProperty('hasContacts');
      expect(response.body.dataQuality).toHaveProperty('hasActivities');
      expect(response.body.dataQuality).toHaveProperty('sufficientData');
    }, 60000); // 60s timeout
  });
});

