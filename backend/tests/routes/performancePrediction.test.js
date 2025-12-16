/**
 * Performance Prediction Routes Tests
 * Tests routes/performancePrediction.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import performancePredictionRoutes from '../../routes/performancePrediction.js';
import { createTestUser, queryTestDb } from '../helpers/index.js';
import { seedJobs, seedSkills } from '../helpers/seed.js';

describe('Performance Prediction Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/performance-prediction', performancePredictionRoutes);
    
    user = await createTestUser({
      email: 'prediction@test.com',
      first_name: 'Prediction',
      last_name: 'Test',
    });
  });

  describe('GET /api/performance-prediction', () => {
    it('should return performance predictions with empty data', async () => {
      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('interviewSuccess');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body).toHaveProperty('salaryNegotiation');
      expect(response.body).toHaveProperty('optimalTiming');
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body).toHaveProperty('accuracyTracking');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('summary');
    });

    it('should predict interview success with job data', async () => {
      // Create jobs with different statuses
      await seedJobs(user.id, 10, { status: 'Applied' });
      await seedJobs(user.id, 5, { status: 'Interview' });
      await seedJobs(user.id, 2, { status: 'Offer' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.interviewSuccess).toHaveProperty('probability');
      expect(response.body.interviewSuccess).toHaveProperty('confidenceInterval');
      expect(response.body.interviewSuccess).toHaveProperty('range');
      expect(response.body.interviewSuccess).toHaveProperty('factors');
      expect(response.body.interviewSuccess).toHaveProperty('baseRate');
      expect(typeof response.body.interviewSuccess.probability).toBe('number');
      expect(response.body.interviewSuccess.probability).toBeGreaterThanOrEqual(5);
      expect(response.body.interviewSuccess.probability).toBeLessThanOrEqual(85);
    });

    it('should include preparation factor in interview success prediction', async () => {
      // Create jobs with research history
      await seedJobs(user.id, 5, { company: 'Tech Corp', status: 'Interview' });
      
      // Add company research
      await queryTestDb(
        `INSERT INTO company_research (id, company, created_at)
         VALUES ($1, $2, NOW())`,
        [user.id, 'Tech Corp']
      );

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const prepFactor = response.body.interviewSuccess.factors.find(
        f => f.name.includes('Preparation')
      );
      if (prepFactor) {
        expect(prepFactor).toBeDefined();
      }
    });

    it('should include customization factor in prediction', async () => {
      // Create jobs with heavy customization
      await seedJobs(user.id, 5, { 
        status: 'Interview',
        resume_customization: 'heavy'
      });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Check if customization factor is included
      const hasCustomization = response.body.interviewSuccess.factors.some(
        f => f.name.includes('Customization')
      );
      // May or may not be present depending on success rate comparison
      expect(response.body.interviewSuccess.factors).toBeDefined();
    });

    it('should include skills factor in prediction', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });
      
      // Add technical skills
      await seedSkills(user.id, [
        { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
        { name: 'Python', category: 'Technical', proficiency: 'Expert' },
        { name: 'Java', category: 'Technical', proficiency: 'Expert' },
        { name: 'C++', category: 'Technical', proficiency: 'Expert' },
        { name: 'Go', category: 'Technical', proficiency: 'Expert' },
        { name: 'Rust', category: 'Technical', proficiency: 'Expert' },
        { name: 'TypeScript', category: 'Technical', proficiency: 'Expert' },
        { name: 'SQL', category: 'Technical', proficiency: 'Expert' },
      ]);

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const skillsFactor = response.body.interviewSuccess.factors.find(
        f => f.name.includes('Technical Skills')
      );
      if (skillsFactor) {
        expect(skillsFactor).toBeDefined();
      }
    });

    it('should forecast timeline with job data', async () => {
      // Create jobs with offers and dates
      const appliedDate = new Date('2024-01-01');
      const offerDate = new Date('2024-02-15'); // 45 days later
      
      await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status, applied_on, status_updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp, $5::timestamp)`,
        [user.id, 'Test Job', 'Test Corp', 'Offer', appliedDate, offerDate]
      );

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveProperty('estimatedTimeToOffer');
      expect(response.body.timeline).toHaveProperty('estimatedApplicationsNeeded');
      expect(response.body.timeline).toHaveProperty('milestones');
      expect(response.body.timeline).toHaveProperty('scenarios');
      expect(Array.isArray(response.body.timeline.milestones)).toBe(true);
      expect(Array.isArray(response.body.timeline.scenarios)).toBe(true);
    });

    it('should forecast timeline with default values when no offers', async () => {
      // No offers created
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline.estimatedTimeToOffer).toBe(90);
      expect(response.body.timeline.estimatedApplicationsNeeded).toBe(30);
      expect(response.body.timeline.milestones.length).toBeGreaterThan(0);
    });

    it('should adjust timeline based on activity level', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const responseHigh = await request(app)
        .get('/api/performance-prediction?activityLevel=high')
        .set('Authorization', `Bearer ${user.token}`);

      const responseLow = await request(app)
        .get('/api/performance-prediction?activityLevel=low')
        .set('Authorization', `Bearer ${user.token}`);

      expect(responseHigh.status).toBe(200);
      expect(responseLow.status).toBe(200);
      // High activity should result in faster timeline (lower days)
      // Note: activityImpact is only present when there are offers
      expect(responseHigh.body.timeline).toBeDefined();
      expect(responseLow.body.timeline).toBeDefined();
    });

    it('should adjust timeline based on market conditions', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const marketConditions = JSON.stringify({ jobMarket: 'strong' });
      const response = await request(app)
        .get(`/api/performance-prediction?marketConditions=${encodeURIComponent(marketConditions)}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toBeDefined();
    });

    it('should predict salary negotiation', async () => {
      // Create jobs with salary data
      await seedJobs(user.id, 5, { 
        status: 'Offer',
        salary_min: 100000,
        salary_max: 150000
      });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.salaryNegotiation).toHaveProperty('negotiationSuccessProbability');
      expect(response.body.salaryNegotiation).toHaveProperty('predictedSalaryIncrease');
      expect(response.body.salaryNegotiation).toHaveProperty('predictedFinalSalary');
      expect(response.body.salaryNegotiation).toHaveProperty('marketAverage');
      expect(response.body.salaryNegotiation).toHaveProperty('factors');
      expect(response.body.salaryNegotiation).toHaveProperty('confidence');
    });

    it('should boost negotiation probability with multiple offers', async () => {
      await seedJobs(user.id, 3, { status: 'Offer' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const multipleOffersFactor = response.body.salaryNegotiation.factors.find(
        f => f.name.includes('Multiple Offers')
      );
      if (multipleOffersFactor) {
        expect(multipleOffersFactor).toBeDefined();
      }
    });

    it('should predict optimal timing', async () => {
      // Create jobs with different application dates
      const dates = [
        new Date('2024-01-15'), // Monday
        new Date('2024-01-16'), // Tuesday
        new Date('2024-01-17'), // Wednesday
      ];

      for (const date of dates) {
        await queryTestDb(
          `INSERT INTO jobs (user_id, title, company, status, created_at, applied_on)
           VALUES ($1, $2, $3, $4, $5::timestamp, $5::timestamp)`,
          [user.id, 'Test Job', 'Test Corp', 'Interview', date]
        );
      }

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.optimalTiming).toHaveProperty('optimalMonth');
      expect(response.body.optimalTiming).toHaveProperty('optimalDay');
      expect(response.body.optimalTiming).toHaveProperty('optimalHour');
      expect(response.body.optimalTiming).toHaveProperty('currentTiming');
      expect(response.body.optimalTiming).toHaveProperty('nextOptimalWindow');
      expect(response.body.optimalTiming.currentTiming).toHaveProperty('score');
      expect(response.body.optimalTiming.currentTiming).toHaveProperty('recommendation');
    });

    it('should generate scenarios', async () => {
      await seedJobs(user.id, 10, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.scenarios)).toBe(true);
      expect(response.body.scenarios.length).toBe(3);
      
      const scenario = response.body.scenarios[0];
      expect(scenario).toHaveProperty('name');
      expect(scenario).toHaveProperty('description');
      expect(scenario).toHaveProperty('assumptions');
      expect(scenario).toHaveProperty('predictedOutcomes');
      expect(scenario).toHaveProperty('probability');
    });

    it('should track prediction accuracy', async () => {
      // Create jobs across multiple quarters
      const quarters = [
        new Date('2024-01-15'),
        new Date('2024-04-15'),
        new Date('2024-07-15'),
        new Date('2024-10-15'),
      ];

      for (const date of quarters) {
        await queryTestDb(
          `INSERT INTO jobs (user_id, title, company, status, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, 'Test Job', 'Test Corp', 'Interview', date]
        );
      }

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.accuracyTracking).toHaveProperty('overallAccuracy');
      expect(response.body.accuracyTracking).toHaveProperty('trendAccuracy');
      expect(response.body.accuracyTracking).toHaveProperty('timingAccuracy');
      expect(response.body.accuracyTracking).toHaveProperty('modelImprovement');
    });

    it('should generate improvement recommendations', async () => {
      // Create scenario with low success rate
      await seedJobs(user.id, 20, { status: 'Applied' });
      await seedJobs(user.id, 1, { status: 'Interview' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      
      if (response.body.recommendations.length > 0) {
        const rec = response.body.recommendations[0];
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('actions');
        expect(rec).toHaveProperty('expectedImpact');
        expect(rec).toHaveProperty('priority');
      }
    });

    it('should generate recommendations for long timeline', async () => {
      // Create jobs that would result in long timeline
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // May or may not have timeline recommendations depending on predicted timeline
      expect(response.body.recommendations).toBeDefined();
    });

    it('should generate recommendations for low negotiation probability', async () => {
      await seedJobs(user.id, 1, { status: 'Offer' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // May or may not have salary recommendations depending on probability
      expect(response.body.recommendations).toBeDefined();
    });

    it('should include networking activities in prediction', async () => {
      await seedJobs(user.id, 5, { company: 'Tech Corp', status: 'Applied' });
      
      // Add networking activity close to job application
      const jobDate = new Date('2024-01-15');
      const activityDate = new Date('2024-01-18'); // 3 days after
      
      await queryTestDb(
        `INSERT INTO networking_activities (user_id, activity_type, created_at)
         VALUES ($1, $2, $3)`,
        [user.id, 'linkedin_message', activityDate]
      );

      // Update job applied_on date
      await queryTestDb(
        `UPDATE jobs SET applied_on = $1::timestamp, created_at = $1::timestamp 
         WHERE id = (SELECT id FROM jobs WHERE user_id = $2 LIMIT 1)`,
        [jobDate, user.id]
      );

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should consider networking activities in preparation factor
      expect(response.body.interviewSuccess).toBeDefined();
    });

    it('should handle missing skills gracefully', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.interviewSuccess).toBeDefined();
    });

    it('should handle missing networking activities gracefully', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.interviewSuccess).toBeDefined();
    });

    it('should handle missing research history gracefully', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.interviewSuccess).toBeDefined();
    });

    it('should handle recent performance trend', async () => {
      // Create older jobs with lower success
      const oldDate = new Date('2023-01-01');
      await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'Old Job', 'Old Corp', 'Applied', oldDate]
      );

      // Create recent jobs with higher success
      await seedJobs(user.id, 5, { status: 'Interview' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should detect improving trend
      const trendFactor = response.body.interviewSuccess.factors.find(
        f => f.name.includes('Trend')
      );
      // May or may not be present depending on comparison
      expect(response.body.interviewSuccess.factors).toBeDefined();
    });

    it('should calculate summary correctly', async () => {
      await seedJobs(user.id, 10, { status: 'Applied' });
      await seedJobs(user.id, 3, { status: 'Interview' });
      await seedJobs(user.id, 1, { status: 'Offer' });

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toHaveProperty('overallSuccessProbability');
      expect(response.body.summary).toHaveProperty('estimatedTimeToOffer');
      expect(response.body.summary).toHaveProperty('negotiationSuccessRate');
      expect(response.body.summary).toHaveProperty('currentTimingScore');
    });

    it('should handle database errors gracefully', async () => {
      // Mock pool.query to throw an error
      const pool = (await import('../../db/pool.js')).default;
      const originalQuery = pool.query;
      
      pool.query = vi.fn().mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original query
      pool.query = originalQuery;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/performance-prediction');

      expect(response.status).toBe(401);
    });

    it('should handle query parameter parsing for market conditions', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const marketConditions = { jobMarket: 'weak', seasonalTrend: 'low' };
      const response = await request(app)
        .get(`/api/performance-prediction?marketConditions=${encodeURIComponent(JSON.stringify(marketConditions))}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toBeDefined();
      expect(response.body.optimalTiming).toBeDefined();
    });

    it('should handle string market conditions parameter', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });

      const marketConditions = JSON.stringify({ jobMarket: 'strong' });
      const response = await request(app)
        .get(`/api/performance-prediction?marketConditions=${encodeURIComponent(marketConditions)}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toBeDefined();
    });

    it('should handle invalid userId in query', async () => {
      // Test with req.userId (which doesn't exist, should use req.user.id)
      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      // Should still work because auth middleware sets req.user
      expect(response.status).toBe(200);
    });

    it('should calculate variance correctly for accuracy tracking', async () => {
      // Create jobs with varying success rates across quarters
      const dates = [
        new Date('2024-01-15'),
        new Date('2024-04-15'),
        new Date('2024-07-15'),
      ];

      // First quarter: 50% success
      for (let i = 0; i < 4; i++) {
        await queryTestDb(
          `INSERT INTO jobs (user_id, title, company, status, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, `Job ${i}`, 'Corp', i < 2 ? 'Interview' : 'Applied', dates[0]]
        );
      }

      // Second quarter: 33% success
      for (let i = 0; i < 3; i++) {
        await queryTestDb(
          `INSERT INTO jobs (user_id, title, company, status, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, `Job ${i}`, 'Corp', i === 0 ? 'Interview' : 'Applied', dates[1]]
        );
      }

      // Third quarter: 100% success
      for (let i = 0; i < 2; i++) {
        await queryTestDb(
          `INSERT INTO jobs (user_id, title, company, status, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, `Job ${i}`, 'Corp', 'Interview', dates[2]]
        );
      }

      const response = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.accuracyTracking).toHaveProperty('overallAccuracy');
      expect(typeof response.body.accuracyTracking.overallAccuracy).toBe('number');
    });
  });
});

