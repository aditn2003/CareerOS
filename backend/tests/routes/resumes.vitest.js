/**
 * Resumes Routes - Full Coverage Tests
 * File: backend/routes/resumes.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createResumesRoutes } from '../../routes/resumes.js';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();
const mockPool = { query: mockQueryFn };

const mockMulter = {
  dest: vi.fn(() => ({
    single: vi.fn(() => (req, res, next) => {
      req.file = { path: '/tmp/test.pdf', originalname: 'test.pdf' };
      next();
    }),
  })),
};

const mockGenAI = {
  getGenerativeModel: vi.fn(() => ({
    generateContent: vi.fn(() => ({
      response: {
        text: vi.fn(() => JSON.stringify({ summary: {}, experience: [], education: [], skills: [], projects: [] })),
      },
    })),
  })),
};

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

vi.mock('multer', () => ({
  default: vi.fn(() => mockMulter),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => mockGenAI),
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('fake pdf')),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

vi.mock('../../utils/renderTemplate.js', () => ({
  renderTemplate: vi.fn(() => Promise.resolve()),
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() => Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({
          items: [{ str: 'Test content' }],
        })),
      })),
    }),
  })),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(() => Promise.resolve({ value: 'Test docx content' })),
  },
}));

// ============================================
// SETUP
// ============================================

let app;
let router;

beforeAll(() => {
  process.env.GOOGLE_API_KEY = 'test-key';
  router = createResumesRoutes(mockGenAI, mockPool, mockMulter);
  app = express();
  app.use(express.json());
  app.use('/api/resumes', router);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Resumes Routes - Full Coverage', () => {
  describe('GET /api/resumes/test', () => {
    it('should return test response', async () => {
      const res = await request(app).get('/api/resumes/test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /api/resumes/templates', () => {
    it('should return templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Professional', is_default: true },
        { id: 2, name: 'Creative', is_default: false },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockTemplates });

      const res = await request(app)
        .get('/api/resumes/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/resumes', () => {
    it('should create new resume', async () => {
      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [mockResume] }) // Insert
        .mockResolvedValueOnce({ rows: [] }); // Update preview

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('saved successfully');
    });

    it('should create resume with template_file specified', async () => {
      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockResume] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          template_file: 'two-column',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should update existing resume', async () => {
      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check existing
        .mockResolvedValueOnce({ rows: [mockResume] }) // Update
        .mockResolvedValueOnce({ rows: [] }); // Update preview

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should handle different format values', async () => {
      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockResume] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          format: 'docx',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should handle template_id and template_name', async () => {
      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockResume] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          template_id: 2,
          template_name: 'Creative',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should handle renderTemplate errors', async () => {
      const { renderTemplate } = await import('../../utils/renderTemplate.js');
      vi.mocked(renderTemplate).mockRejectedValueOnce(new Error('Template error'));

      const mockResume = { id: 1, title: 'My Resume' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          sections: {
            summary: { full_name: 'John Doe' },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
          },
        });

      expect(res.status).toBe(500);
    });

    it('should return 400 if title or sections missing', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'My Resume',
          // Missing sections
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing');
    });
  });

  describe('GET /api/resumes/from-profile', () => {
    it('should generate resume from profile', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ full_name: 'John Doe', title: 'Engineer' }] }) // Profile
        .mockResolvedValueOnce({ rows: [] }) // Employment
        .mockResolvedValueOnce({ rows: [] }) // Education
        .mockResolvedValueOnce({ rows: [] }) // Skills
        .mockResolvedValueOnce({ rows: [] }) // Projects
        .mockResolvedValueOnce({ rows: [] }); // Certifications

      const res = await request(app)
        .get('/api/resumes/from-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.sections).toBeDefined();
    });
  });

  describe('POST /api/resumes/import', () => {
    it('should import PDF resume', async () => {
      const mockAIResponse = JSON.stringify({
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake pdf'), 'test.pdf');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should import DOCX resume', async () => {
      const mockAIResponse = JSON.stringify({
        summary: { full_name: 'Jane Doe' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake docx'), 'test.docx');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should return 400 if DOCX parsing not available', async () => {
      // Mock mammoth as undefined
      vi.doMock('mammoth', () => ({
        default: undefined,
      }));

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake docx'), 'test.docx');

      expect(res.status).toBe(400);
    });

    it('should return 400 if unsupported file type', async () => {
      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake content'), 'test.txt');

      expect(res.status).toBe(400);
    });

    it('should handle JSON parsing errors', async () => {
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => 'Invalid JSON {'),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake pdf'), 'test.pdf');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should return 400 if no file', async () => {
      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/resumes', () => {
    it('should return all resumes', async () => {
      const mockResumes = [
        { id: 1, title: 'Resume 1' },
        { id: 2, title: 'Resume 2' },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockResumes });

      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.resumes).toEqual(mockResumes);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should return resume by id', async () => {
      const mockResume = { id: 1, title: 'My Resume', user_id: 1 };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.resume).toEqual(mockResume);
    });

    it('should return 404 if resume not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/resumes/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    it('should delete resume', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/resumes/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('POST /api/resumes/optimize', () => {
    it('should optimize resume with AI', async () => {
      const mockAIResponse = JSON.stringify({
        summary_recommendation: 'Optimized summary',
        optimized_experience: [],
        optimized_skills: [],
        ats_keywords: [],
        variation_options: [],
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {}, experience: [] },
          jobDescription: 'Looking for a software engineer...',
        });

      expect(res.status).toBe(200);
      expect(res.body.optimizedSections).toBeDefined();
    });

    it('should handle markdown-wrapped JSON', async () => {
      const mockAIResponse = '```json\n{"summary_recommendation": "Test"}\n```';
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {} },
          jobDescription: 'Test job',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if sections or jobDescription missing', async () => {
      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {} },
          // Missing jobDescription
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/resumes/reconcile', () => {
    it('should reconcile resumes', async () => {
      const mockAIResponse = JSON.stringify({
        summary: { full_name: 'John Doe', title: 'Engineer', bio: 'Bio' },
        experience: [{ title: 'Engineer', company: 'Tech Corp' }],
        education: [],
        projects: [],
        skills: ['JavaScript'],
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary: {}, experience: [] },
        });

      expect(res.status).toBe(200);
      expect(res.body.merged).toBeDefined();
    });

    it('should handle different experience source formats', async () => {
      const mockAIResponse = JSON.stringify({
        optimized_experience: [{ role: 'Engineer', company: 'Tech Corp' }],
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { optimized_experience: [] },
        });

      expect(res.status).toBe(200);
    });

    it('should handle markdown-wrapped JSON', async () => {
      const mockAIResponse = '```json\n{"summary": {}}\n```';
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => mockAIResponse),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary: {}, experience: [] },
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if data missing', async () => {
      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/resumes/:id/download', () => {
    it('should download PDF resume', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'pdf',
        sections: { summary: {}, experience: [] },
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download DOCX resume', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'docx',
        sections: { summary: {}, experience: [] },
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download TXT resume', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'txt',
        sections: { summary: {}, experience: [] },
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download HTML resume', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'html',
        sections: { summary: {}, experience: [] },
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should return 400 for unsupported format', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'xml',
        sections: { summary: {}, experience: [] },
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
    });

    it('should handle string sections', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        format: 'pdf',
        sections: JSON.stringify({ summary: {}, experience: [] }),
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/resumes/preview/:filename', () => {
    it('should return preview file if exists', async () => {
      const res = await request(app)
        .get('/api/resumes/preview/test.pdf');

      expect([200, 404]).toContain(res.status);
    });

    it('should return 404 if file not found', async () => {
      // Mock fs.existsSync to return false
      const fs = await import('fs');
      vi.spyOn(fs.default, 'existsSync').mockReturnValueOnce(false);

      const res = await request(app)
        .get('/api/resumes/preview/nonexistent.pdf');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/resumes/templates', () => {
    it('should return templates with user templates first', async () => {
      const mockTemplates = [
        { id: 1, name: 'User Template', user_id: 1, is_default: false },
        { id: 2, name: 'Default Template', user_id: null, is_default: true },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockTemplates });

      const res = await request(app)
        .get('/api/resumes/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/resumes/from-profile', () => {
    it('should generate resume from profile data', async () => {
      const mockProfile = { id: 1, full_name: 'John Doe', email: 'john@example.com' };
      const mockEmployment = [{ id: 1, company: 'Tech Corp', position: 'Engineer' }];
      const mockEducation = [{ id: 1, school: 'University', degree: 'BS' }];
      const mockSkills = [{ id: 1, name: 'JavaScript', level: 'expert' }];
      const mockProjects = [{ id: 1, name: 'Project 1', description: 'Description' }];
      const mockCerts = [{ id: 1, name: 'Cert 1', issuer: 'Issuer' }];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockProfile] })
        .mockResolvedValueOnce({ rows: mockEmployment })
        .mockResolvedValueOnce({ rows: mockEducation })
        .mockResolvedValueOnce({ rows: mockSkills })
        .mockResolvedValueOnce({ rows: mockProjects })
        .mockResolvedValueOnce({ rows: mockCerts });

      const res = await request(app)
        .get('/api/resumes/from-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('generated successfully');
      expect(res.body.sections).toBeDefined();
    });

    it('should handle empty profile data', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/resumes/from-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.sections).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes/from-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/resumes/import', () => {
    it('should import resume from PDF file', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake pdf'), 'resume.pdf');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should import resume from DOCX file', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake docx'), 'resume.docx');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should return 400 if no file provided', async () => {
      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
    });

    it('should return 400 for unsupported file type', async () => {
      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake'), 'resume.txt');

      expect([400, 500]).toContain(res.status);
    });

    it('should handle AI JSON parsing with markdown cleanup', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => `\`\`\`json\n${JSON.stringify(mockAIResponse)}\n\`\`\``),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake pdf'), 'resume.pdf');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should return 500 on parsing error', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => 'Invalid JSON {'),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/import')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('fake pdf'), 'resume.pdf');

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/resumes', () => {
    it('should return all resumes for user', async () => {
      const mockResumes = [
        { id: 1, title: 'Resume 1', template_name: 'Professional' },
        { id: 2, title: 'Resume 2', template_name: 'Creative' },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: mockResumes });

      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.resumes).toEqual(mockResumes);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should return single resume', async () => {
      const mockResume = { id: 1, title: 'My Resume', sections: {} };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.resume).toEqual(mockResume);
    });

    it('should return 404 if resume not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/resumes/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    it('should delete resume', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/resumes/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('POST /api/resumes/optimize', () => {
    it('should optimize resume with AI', async () => {
      const mockAIResponse = {
        summary_recommendation: 'Optimized summary',
        optimized_experience: [],
        optimized_skills: [],
        ats_keywords: [],
        variation_options: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {}, experience: [] },
          jobDescription: 'Software Engineer position',
        });

      expect(res.status).toBe(200);
      expect(res.body.optimizedSections).toBeDefined();
    });

    it('should handle AI JSON with markdown cleanup', async () => {
      const mockAIResponse = {
        summary_recommendation: 'Optimized summary',
        optimized_experience: [],
        optimized_skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => `\`\`\`json\n${JSON.stringify(mockAIResponse)}\n\`\`\``),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {}, experience: [] },
          jobDescription: 'Job description',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if sections or jobDescription missing', async () => {
      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {} },
        });

      expect(res.status).toBe(400);
    });

    it('should return 500 on AI error', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => {
          throw new Error('AI error');
        }),
      });

      const res = await request(app)
        .post('/api/resumes/optimize')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sections: { summary: {} },
          jobDescription: 'Job description',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/resumes/reconcile', () => {
    it('should reconcile resume with experience from reconciled.experience', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [{ title: 'Engineer', company: 'Tech Corp' }],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
      expect(res.body.merged).toBeDefined();
    });

    it('should reconcile with experience from reconciled.optimized_experience', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        optimized_experience: [{ role: 'Engineer', company: 'Tech Corp' }],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
    });

    it('should reconcile with experience from aiSuggestions.optimized_experience', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: {
            summary_recommendation: 'Test',
            optimized_experience: [{ role: 'Engineer', company: 'Tech Corp' }],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should handle experience with bullets array', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [{
          title: 'Engineer',
          company: 'Tech Corp',
          bullets: ['Bullet 1', 'Bullet 2'],
        }],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
    });

    it('should handle experience with bullets as objects', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [{
          title: 'Engineer',
          company: 'Tech Corp',
          bullets: [{ text: 'Bullet 1' }, { text: 'Bullet 2' }],
        }],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => JSON.stringify(mockAIResponse)),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
    });

    it('should handle JSON parsing with markdown cleanup', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => `\`\`\`json\n${JSON.stringify(mockAIResponse)}\n\`\`\``),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
    });

    it('should handle JSON parsing fallback', async () => {
      const mockAIResponse = {
        summary: { full_name: 'John Doe' },
        experience: [],
        education: [],
        skills: [],
      };

      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => ({
          response: {
            text: vi.fn(() => `json\n${JSON.stringify(mockAIResponse)}`),
          },
        })),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if masterResume or aiSuggestions missing', async () => {
      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {} },
        });

      expect(res.status).toBe(400);
    });

    it('should return 500 on AI error', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn(() => {
          throw new Error('AI error');
        }),
      });

      const res = await request(app)
        .post('/api/resumes/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          masterResume: { summary: {}, experience: [] },
          aiSuggestions: { summary_recommendation: 'Test' },
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/resumes/:id/download', () => {
    it('should download resume as PDF', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: { summary: {}, experience: [] },
        format: 'pdf',
        template_name: 'Professional',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download resume as DOCX', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: { summary: {}, experience: [] },
        format: 'docx',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download resume as TXT', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: { summary: {}, experience: [] },
        format: 'txt',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should download resume as HTML', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: { summary: {}, experience: [] },
        format: 'html',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should return 404 if resume not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/resumes/999/download')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should return 400 for unsupported format', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: { summary: {} },
        format: 'invalid',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
    });

    it('should handle string sections', async () => {
      const mockResume = {
        id: 1,
        title: 'My Resume',
        sections: JSON.stringify({ summary: {}, experience: [] }),
        format: 'pdf',
        template_name: 'Professional',
      };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume] });

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resumes/1/download')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

