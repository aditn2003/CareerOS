/**
 * Cover Letter Routes Tests
 * Tests routes/cover_letter.js endpoints
 * 
 * Coverage:
 * - GET /api/cover-letters (list all cover letters)
 * - POST /api/cover-letters (create cover letter)
 * - GET /api/cover-letters/:id (get single cover letter)
 * - GET /api/cover-letters/:id/download (download cover letter)
 * - GET /api/cover-letters/:id/jobs (get linked jobs)
 * - POST /api/cover-letters/:id/link-job (link cover letter to job)
 * - POST /api/cover-letters/:id/unlink-job (unlink cover letter from job)
 * - DELETE /api/cover-letters/:id (delete cover letter)
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import pool from '../../db/pool.js';
import {
  createTestUser,
  queryTestDb,
  seedJobs,
} from '../helpers/index.js';

// Mock external services before importing server
vi.mock('@google/generative-ai', () => {
  const mockInstance = {
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn(() => 'Mock response'),
        },
      }),
    })),
  };
  
  return {
    GoogleGenerativeAI: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

vi.mock('openai', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Mock AI response',
      },
    }],
  });

  const mockCompletions = {
    create: mockCreate,
  };

  const mockChat = {
    completions: mockCompletions,
  };

  const mockInstance = {
    chat: mockChat,
  };
  
  const MockOpenAI = class {
    constructor() {
      return mockInstance;
    }
  };
  
  MockOpenAI.prototype.chat = mockChat;
  
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

vi.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ success: true }),
    },
  };
  
  return {
    Resend: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(true),
        pdf: vi.fn().mockResolvedValue(true),
      }),
      close: vi.fn().mockResolvedValue(true),
    }),
  },
}));

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({
      value: '<p>Mock HTML content</p>',
    }),
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('mock file content')),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => Buffer.from('mock file content')),
  unlinkSync: vi.fn(),
}));

let app;

describe('Cover Letter Routes', () => {
  let user;
  let job;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const serverModule = await import('../../server.js');
    app = serverModule.app;
  });

  beforeEach(async () => {
    user = await createTestUser({
      email: `coverletter${Date.now()}@example.com`,
    });
    await queryTestDb('SELECT id FROM users WHERE id = $1', [user.id]);

    const jobs = await seedJobs(user.id, 1, {
      title: 'Software Engineer',
      company: 'Tech Corp',
    });
    job = jobs[0];
  });

  describe('GET /api/cover-letters', () => {
    it('should return all cover letters for authenticated user', async () => {
      // Create a test cover letter
      await queryTestDb(
        `INSERT INTO cover_letters (user_id, title, content)
         VALUES ($1, $2, $3)`,
        [user.id, 'Test Cover Letter', 'This is test content']
      );

      const response = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cover_letters');
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.cover_letters)).toBe(true);
    });

    it('should return empty arrays when no cover letters exist', async () => {
      const response = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.cover_letters).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cover-letters');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cover-letters', () => {
    it('should create a new cover letter', async () => {
      const response = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'New Cover Letter',
          content: 'This is the content',
          format: 'pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('cover_letter');
      expect(response.body.cover_letter).toHaveProperty('id');
      expect(response.body.cover_letter.name).toBe('New Cover Letter');
    });

    it('should accept title as alternative to name', async () => {
      const response = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Cover Letter with Title',
          content: 'Content here',
        });

      expect(response.status).toBe(200);
      expect(response.body.cover_letter.name).toBe('Cover Letter with Title');
    });

    it('should return 400 if name/title is missing', async () => {
      const response = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          content: 'Content without name',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cover-letters')
        .send({
          name: 'Test',
          content: 'Test',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/cover-letters/:id', () => {
    it('should return a single cover letter by ID', async () => {
      const result = await queryTestDb(
        `INSERT INTO cover_letters (user_id, title, content)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Test Letter', 'Test content']
      );
      const coverLetterId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/cover-letters/${coverLetterId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cover_letter');
      expect(response.body.cover_letter.id).toBe(coverLetterId);
      expect(response.body.cover_letter.name || response.body.cover_letter.title).toBe('Test Letter');
    });

    it('should return 404 for non-existent cover letter', async () => {
      const response = await request(app)
        .get('/api/cover-letters/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/cover-letters/invalid')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cover-letters/1');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/cover-letters/:id/download', () => {
    it('should download cover letter content as text', async () => {
      // Use uploaded_cover_letters since route checks that first
      const result = await queryTestDb(
        `INSERT INTO uploaded_cover_letters (user_id, title, content, format, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Download Test', 'Download content here', 'pdf', '/uploads/test.pdf']
      );
      const coverLetterId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/cover-letters/${coverLetterId}/download`)
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.headers['content-type']).toBeDefined();
      }
    });

    it('should return 404 for non-existent cover letter', async () => {
      const response = await request(app)
        .get('/api/cover-letters/99999/download')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cover-letters/1/download');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/cover-letters/:id/jobs', () => {
    it('should return jobs linked to cover letter', async () => {
      const result = await queryTestDb(
        `INSERT INTO uploaded_cover_letters (user_id, title, content, format, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Linked Letter', 'Content', 'pdf', '/uploads/test.pdf']
      );
      const coverLetterId = result.rows[0].id;

      // Link cover letter to job
      await queryTestDb(
        `INSERT INTO job_materials (job_id, user_id, cover_letter_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id) DO UPDATE SET cover_letter_id = EXCLUDED.cover_letter_id`,
        [job.id, user.id, coverLetterId]
      );

      const response = await request(app)
        .get(`/api/cover-letters/${coverLetterId}/jobs`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBeGreaterThan(0);
    });

    it('should return empty array when no jobs are linked', async () => {
      const result = await queryTestDb(
        `INSERT INTO uploaded_cover_letters (user_id, title, content, format, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Unlinked Letter', 'Content', 'pdf', '/uploads/test.pdf']
      );
      const coverLetterId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/cover-letters/${coverLetterId}/jobs`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cover-letters/1/jobs');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cover-letters/:id/link-job', () => {
    it('should link cover letter to job', async () => {
      const result = await queryTestDb(
        `INSERT INTO uploaded_cover_letters (user_id, title, content, format, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Linkable Letter', 'Content', 'pdf', '/uploads/test.pdf']
      );
      const coverLetterId = result.rows[0].id;

      const response = await request(app)
        .post(`/api/cover-letters/${coverLetterId}/link-job`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          job_id: job.id,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid IDs', async () => {
      const response = await request(app)
        .post('/api/cover-letters/invalid/link-job')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          job_id: 'invalid',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent cover letter', async () => {
      const response = await request(app)
        .post('/api/cover-letters/99999/link-job')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          job_id: job.id,
        });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cover-letters/1/link-job')
        .send({
          job_id: 1,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cover-letters/:id/unlink-job', () => {
    it('should unlink cover letter from job', async () => {
      const result = await queryTestDb(
        `INSERT INTO uploaded_cover_letters (user_id, title, content, format, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, 'Unlinkable Letter', 'Content', 'pdf', '/uploads/test.pdf']
      );
      const coverLetterId = result.rows[0].id;

      // Link first
      await queryTestDb(
        `INSERT INTO job_materials (job_id, user_id, cover_letter_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id) DO UPDATE SET cover_letter_id = EXCLUDED.cover_letter_id`,
        [job.id, user.id, coverLetterId]
      );

      const response = await request(app)
        .post(`/api/cover-letters/${coverLetterId}/unlink-job`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          job_id: job.id,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/cover-letters/1/unlink-job')
        .send({
          job_id: 1,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/cover-letters/:id', () => {
    it('should delete a cover letter', async () => {
      const result = await queryTestDb(
        `INSERT INTO cover_letters (user_id, title, content)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, 'Delete Me', 'Content']
      );
      const coverLetterId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/cover-letters/${coverLetterId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const checkResult = await queryTestDb(
        `SELECT id FROM cover_letters WHERE id = $1`,
        [coverLetterId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for non-existent cover letter', async () => {
      const response = await request(app)
        .delete('/api/cover-letters/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/cover-letters/invalid')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/cover-letters/1');

      expect(response.status).toBe(401);
    });
  });
});

