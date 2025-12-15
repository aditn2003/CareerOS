/**
 * Certification Routes Tests
 * Tests all certification-related functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import certificationRoutes from '../../routes/certification.js';
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

// Mock multer
vi.mock('multer', () => {
  const mockDiskStorage = vi.fn(() => ({
    destination: vi.fn(),
    filename: vi.fn(),
  }));
  
  const mockSingle = vi.fn(() => (req, res, next) => {
    req.file = {
      filename: 'test-cert.pdf',
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
    };
    next();
  });

  const multerMock = vi.fn(() => ({
    single: mockSingle,
  }));
  
  multerMock.diskStorage = mockDiskStorage;

  return {
    default: multerMock,
  };
});

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

describe('Certification Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', certificationRoutes);
    
    user = await createTestUser({
      email: 'cert@test.com',
      first_name: 'Cert',
      last_name: 'Test',
    });
  });

  describe('GET /api/certifications', () => {
    it('should return empty array when user has no certifications', async () => {
      const response = await request(app)
        .get('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.certifications).toEqual([]);
    });

    it('should list all certifications for authenticated user', async () => {
      // Insert test certifications
      await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned, expiration_date)
         VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
        [
          user.id, 'AWS Certified', 'Amazon', '2023-01-01', '2026-01-01',
          user.id, 'Google Cloud', 'Google', '2022-06-01', null
        ]
      );

      const response = await request(app)
        .get('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.certifications).toHaveLength(2);
      expect(response.body.certifications[0]).toHaveProperty('name');
      expect(response.body.certifications[0]).toHaveProperty('organization');
      expect(response.body.certifications[0]).toHaveProperty('date_earned');
    });

    it('should order certifications by date_earned DESC', async () => {
      await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)`,
        [
          user.id, 'Old Cert', 'Old Org', '2020-01-01',
          user.id, 'New Cert', 'New Org', '2024-01-01',
          user.id, 'Middle Cert', 'Middle Org', '2022-01-01'
        ]
      );

      const response = await request(app)
        .get('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.certifications).toHaveLength(3);
      // Should be ordered by date_earned DESC (newest first)
      expect(response.body.certifications[0].name).toBe('New Cert');
      expect(response.body.certifications[1].name).toBe('Middle Cert');
      expect(response.body.certifications[2].name).toBe('Old Cert');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/certifications');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should only return certifications for the authenticated user', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
        [
          user.id, 'My Cert', 'My Org', '2023-01-01',
          otherUser.id, 'Other Cert', 'Other Org', '2023-01-01'
        ]
      );

      const response = await request(app)
        .get('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.certifications).toHaveLength(1);
      expect(response.body.certifications[0].name).toBe('My Cert');
    });
  });

  describe('POST /api/certifications', () => {
    it('should create a new certification with required fields', async () => {
      const certData = {
        name: 'AWS Certified Solutions Architect',
        organization: 'Amazon Web Services',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Certification added');
      expect(response.body.certification).toHaveProperty('id');
      expect(response.body.certification.name).toBe('AWS Certified Solutions Architect');
      expect(response.body.certification.organization).toBe('Amazon Web Services');
      expect(response.body.certification.user_id).toBe(user.id);
    });

    it('should create certification with all optional fields', async () => {
      const certData = {
        name: 'Full Certification',
        organization: 'Test Org',
        platform: 'Coursera',
        category: 'Cloud',
        cert_number: 'CERT-12345',
        date_earned: '2023-06-15',
        expiration_date: '2026-06-15',
        does_not_expire: false,
        document_url: '/uploads/cert.pdf',
        badge_url: '/uploads/badge.png',
        verification_url: 'https://verify.example.com',
        description: 'Full certification details',
        scores: JSON.stringify({ overall: 95, sections: { part1: 90, part2: 100 } }),
        achievements: 'Distinguished',
        renewal_reminder: '2026-05-15',
        verified: true,
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.name).toBe('Full Certification');
      expect(response.body.certification.platform).toBe('Coursera');
      expect(response.body.certification.category).toBe('Cloud');
      expect(response.body.certification.cert_number).toBe('CERT-12345');
      expect(response.body.certification.verified).toBe(true);
    });

    it('should reject certification creation without name', async () => {
      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          organization: 'Test Org',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('should reject certification creation without organization', async () => {
      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Cert',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('organization');
    });

    it('should handle does_not_expire flag correctly', async () => {
      const certData = {
        name: 'Non-Expiring Cert',
        organization: 'Test Org',
        does_not_expire: true,
        expiration_date: '2026-01-01', // Should be ignored
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.does_not_expire).toBe(true);
      expect(response.body.certification.expiration_date).toBeNull();
    });

    it('should parse scores JSON string', async () => {
      const certData = {
        name: 'Scored Cert',
        organization: 'Test Org',
        scores: '{"overall": 95, "section1": 90}',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(typeof response.body.certification.scores).toBe('object');
      expect(response.body.certification.scores.overall).toBe(95);
    });

    it('should use badge_url or document_url for both fields', async () => {
      const certData = {
        name: 'File Cert',
        organization: 'Test Org',
        badge_url: '/uploads/badge.png',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.badge_url).toBe('/uploads/badge.png');
      expect(response.body.certification.document_url).toBe('/uploads/badge.png');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/certifications')
        .send({
          name: 'Test Cert',
          organization: 'Test Org',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/certifications/:id', () => {
    it('should update an existing certification', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned, expiration_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Original Cert', 'Original Org', '2023-01-01', '2026-01-01']
      );
      const certId = result.rows[0].id;

      const updateData = {
        name: 'Updated Cert',
        organization: 'Updated Org',
        category: 'Updated Category',
        verified: true,
      };

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Certification updated');
      expect(response.body.certification.name).toBe('Updated Cert');
      expect(response.body.certification.organization).toBe('Updated Org');
      expect(response.body.certification.category).toBe('Updated Category');
      expect(response.body.certification.verified).toBe(true);
    });

    it('should update expiration date', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned, expiration_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Cert', 'Org', '2023-01-01', '2026-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          expiration_date: '2027-01-01',
        });

      expect(response.status).toBe(200);
      expect(response.body.certification.expiration_date).toBeTruthy();
    });

    it('should handle empty string dates as null', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned, expiration_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Cert', 'Org', '2023-01-01', '2026-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          expiration_date: '',
          renewal_reminder: '',
        });

      expect(response.status).toBe(200);
      expect(response.body.certification.expiration_date).toBeNull();
      expect(response.body.certification.renewal_reminder).toBeNull();
    });

    it('should return 400 when no fields to update', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'Cert', 'Org', '2023-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent certification', async () => {
      const response = await request(app)
        .put('/api/certifications/99999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Certification not found');
    });

    it('should not allow updating other user\'s certification', async () => {
      const otherUser = await createTestUser({
        email: 'other2@test.com',
        first_name: 'Other2',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other Cert', 'Other Org', '2023-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/certifications/1')
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/certifications/:id', () => {
    it('should delete a certification', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'To Delete', 'Org', '2023-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Certification deleted successfully');

      // Verify certification is deleted
      const check = await queryTestDb(
        'SELECT * FROM certifications WHERE id = $1',
        [certId]
      );
      expect(check.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent certification', async () => {
      const response = await request(app)
        .delete('/api/certifications/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Certification not found');
    });

    it('should not allow deleting other user\'s certification', async () => {
      const otherUser = await createTestUser({
        email: 'other3@test.com',
        first_name: 'Other3',
        last_name: 'User',
      });

      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [otherUser.id, 'Other Cert', 'Other Org', '2023-01-01']
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/certifications/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Expiration Date Handling', () => {
    it('should set expiration_date to null when does_not_expire is true', async () => {
      const certData = {
        name: 'Non-Expiring',
        organization: 'Org',
        does_not_expire: true,
        expiration_date: '2026-01-01',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.does_not_expire).toBe(true);
      expect(response.body.certification.expiration_date).toBeNull();
    });

    it('should allow expiration_date when does_not_expire is false', async () => {
      const certData = {
        name: 'Expiring',
        organization: 'Org',
        does_not_expire: false,
        expiration_date: '2026-01-01',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.does_not_expire).toBe(false);
      expect(response.body.certification.expiration_date).toBeTruthy();
    });

    it('should handle renewal_reminder date', async () => {
      const certData = {
        name: 'With Reminder',
        organization: 'Org',
        expiration_date: '2026-01-01',
        renewal_reminder: '2025-12-01',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.renewal_reminder).toBeTruthy();
    });

    it('should set renewal_reminder to null for empty string', async () => {
      const certData = {
        name: 'No Reminder',
        organization: 'Org',
        renewal_reminder: '',
      };

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send(certData);

      expect(response.status).toBe(200);
      expect(response.body.certification.renewal_reminder).toBeNull();
    });

    it('should update does_not_expire flag', async () => {
      const result = await queryTestDb(
        `INSERT INTO certifications (user_id, name, organization, date_earned, expiration_date, does_not_expire)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, 'Cert', 'Org', '2023-01-01', '2026-01-01', false]
      );
      const certId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/certifications/${certId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          does_not_expire: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.certification.does_not_expire).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in GET /api/certifications', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to load certifications');

      querySpy.mockRestore();
    });

    it('should handle database errors in POST /api/certifications', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/certifications')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Test Cert',
          organization: 'Test Org',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error while adding certification');

      querySpy.mockRestore();
    });

    it('should handle database errors in PUT /api/certifications/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Update failed');

      querySpy.mockRestore();
    });

    it('should handle database errors in DELETE /api/certifications/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .delete('/api/certifications/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Delete failed');

      querySpy.mockRestore();
    });
  });
});

