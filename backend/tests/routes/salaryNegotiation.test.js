/**
 * Salary Negotiation Routes Tests
 * Tests routes/salaryNegotiation.js - negotiation features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createSalaryNegotiationRoutes } from '../../routes/salaryNegotiation.js';
import { createTestUser } from '../helpers/auth.js';
import axios from 'axios';

// Mock axios for OpenAI API calls

// Create mock Supabase client factory
function createMockSupabaseClient() {
  const client = {
    from: vi.fn(function() { return this; }),
    select: vi.fn(function() { return this; }),
    insert: vi.fn(function() { return this; }),
    update: vi.fn(function() { return this; }),
    delete: vi.fn(function() { return this; }),
    eq: vi.fn(function() { return this; }),
    order: vi.fn(function() { return this; }),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return client;
}

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}));

describe('Salary Negotiation Routes', () => {
  let app;
  let user;
  let userId;
  let router;
  let mockSupabaseClient;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Import createClient to initialize mock
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabaseClient = createClient('https://test.supabase.co', 'test-key');
    
    // Create router with mocked dependencies
    router = createSalaryNegotiationRoutes(mockSupabaseClient, 'test-openai-key');
    
    app = express();
    app.use(express.json());
    app.use('/api/salary-negotiation', router);
    
    user = await createTestUser();
    
    // Decode JWT token to get the user ID
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
  });

  describe('POST /api/salary-negotiation/generate', () => {
    it('should generate a negotiation package', async () => {
      const requestData = {
        userId: userId.toString(),
        company: 'Test Company',
        role: 'Software Engineer',
        location: 'San Francisco',
        experienceYears: 5,
        currentSalary: 100000,
        offerAmount: 120000,
      };

      // Mock OpenAI API response
      const mockOpenAIResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                marketResearch: {
                  min: 110000,
                  median: 130000,
                  max: 150000,
                  percentile25: 120000,
                  percentile75: 140000,
                  sources: ['Glassdoor', 'Levels.fyi'],
                  analysis: 'Market analysis',
                },
                companyInsights: {
                  companyType: 'Mid-size',
                  negotiationReputation: 'Flexible',
                },
                roleInsights: {
                  demandLevel: 'High',
                },
                locationInsights: {
                  costOfLiving: 'High COL',
                },
                offerAnalysis: {
                  baseSalaryGap: 'Below market',
                },
                talkingPoints: ['Point 1', 'Point 2'],
                counterOfferStrategy: 'Strategy',
                benefitsGuidance: {},
                timingRecommendations: {},
                emailTemplates: {},
                recommendedCounterOffer: 140000,
                justification: 'Justification',
                negotiationTips: ['Tip 1'],
              }),
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockOpenAIResponse);

      // Mock Supabase insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 1,
          user_id: userId,
          company: requestData.company,
          role: requestData.role,
          target_salary: 140000,
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/salary-negotiation/generate')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.company).toBe(requestData.company);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/salary-negotiation/generate')
        .send({
          userId: userId.toString(),
          // Missing company and role
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 500 if OpenAI API fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/api/salary-negotiation/generate')
        .send({
          userId: userId.toString(),
          company: 'Test Company',
          role: 'Software Engineer',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/salary-negotiation/list', () => {
    it('should get all negotiations for a user', async () => {
      const mockNegotiations = [
        {
          id: 1,
          user_id: userId,
          company: 'Test Company',
          role: 'Software Engineer',
          negotiation_status: 'preparing',
        },
        {
          id: 2,
          user_id: userId,
          company: 'Another Company',
          role: 'Senior Engineer',
          negotiation_status: 'completed',
        },
      ];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockNegotiations,
        error: null,
      });

      const response = await request(app)
        .get(`/api/salary-negotiation/list?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.negotiations).toBeDefined();
    });

    it('should filter by status if provided', async () => {
      const mockNegotiations = [
        {
          id: 1,
          user_id: userId,
          company: 'Test Company',
          negotiation_status: 'preparing',
        },
      ];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockNegotiations,
        error: null,
      });

      const response = await request(app)
        .get(`/api/salary-negotiation/list?userId=${userId}&status=preparing`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/salary-negotiation/list');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/salary-negotiation/:id', () => {
    it('should get a specific negotiation', async () => {
      const negotiationId = 1;
      const mockNegotiation = {
        id: negotiationId,
        user_id: userId,
        company: 'Test Company',
        role: 'Software Engineer',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockNegotiation,
        error: null,
      });

      const response = await request(app)
        .get(`/api/salary-negotiation/${negotiationId}?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(negotiationId);
    });

    it('should return 404 if negotiation not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const response = await request(app)
        .get(`/api/salary-negotiation/999?userId=${userId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/salary-negotiation/1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/salary-negotiation/:id/update', () => {
    it('should update a negotiation', async () => {
      const negotiationId = 1;
      const updateData = {
        userId: userId.toString(),
        counterOfferAmount: 140000,
        negotiationStatus: 'negotiating',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: negotiationId,
          user_id: userId,
          ...updateData,
        },
        error: null,
      });

      const response = await request(app)
        .put(`/api/salary-negotiation/${negotiationId}/update`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .put('/api/salary-negotiation/1/update')
        .send({
          counterOfferAmount: 140000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/salary-negotiation/:id/outcome', () => {
    it('should track negotiation outcome', async () => {
      const negotiationId = 1;
      const outcomeData = {
        userId: userId.toString(),
        outcomeType: 'accepted_counter',
        outcomeNotes: 'Successfully negotiated',
        satisfactionRating: 5,
        finalAcceptedAmount: 140000,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: negotiationId,
          user_id: userId,
          outcome_type: outcomeData.outcomeType,
          outcome_notes: outcomeData.outcomeNotes,
          satisfaction_rating: outcomeData.satisfactionRating,
          final_accepted_amount: outcomeData.finalAcceptedAmount,
          negotiation_status: 'completed',
        },
        error: null,
      });

      const response = await request(app)
        .put(`/api/salary-negotiation/${negotiationId}/outcome`)
        .send(outcomeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.outcome_type).toBe(outcomeData.outcomeType);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .put('/api/salary-negotiation/1/outcome')
        .send({
          userId: userId.toString(),
          // Missing outcomeType
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/salary-negotiation/stats', () => {
    it('should get negotiation statistics', async () => {
      const mockNegotiations = [
        {
          id: 1,
          user_id: userId,
          negotiation_status: 'completed',
          outcome_type: 'accepted_counter',
          initial_offer_amount: 120000,
          final_accepted_amount: 140000,
          satisfaction_rating: 5,
        },
        {
          id: 2,
          user_id: userId,
          negotiation_status: 'completed',
          outcome_type: 'accepted_initial',
          initial_offer_amount: 100000,
          final_accepted_amount: 100000,
          satisfaction_rating: 4,
        },
        {
          id: 3,
          user_id: userId,
          negotiation_status: 'preparing',
        },
      ];

      // Stats endpoint uses retryDatabaseOperation which calls the query chain
      // The chain is: from().select().eq() which returns { data, error }
      // Set up the chain: from() -> select() -> eq() -> Promise
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({
        data: mockNegotiations,
        error: null,
      });

      const response = await request(app)
        .get(`/api/salary-negotiation/stats?userId=${userId.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.completed).toBeDefined();
      expect(response.body.data.avgIncrease).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/salary-negotiation/stats');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/salary-negotiation/:id', () => {
    it('should delete a negotiation', async () => {
      const negotiationId = 1;

      mockSupabaseClient.delete.mockResolvedValueOnce({
        error: null,
      });

      const response = await request(app)
        .delete(`/api/salary-negotiation/${negotiationId}?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .delete('/api/salary-negotiation/1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

