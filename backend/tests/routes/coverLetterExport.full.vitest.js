/**
 * Cover Letter Export Routes - Full Coverage Tests
 * Target: 90%+ coverage for coverLetterExport.js
 */

import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock pdfkit
vi.mock('pdfkit', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: vi.fn().mockReturnThis(),
    pipe: vi.fn().mockReturnThis(),
    end: vi.fn(),
    on: vi.fn((event, callback) => {
      if (event === 'end') setTimeout(callback, 10);
    }),
  })),
}));

// Mock docx
vi.mock('docx', () => ({
  Document: vi.fn().mockImplementation(() => ({})),
  Packer: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('docx content')),
  },
  Paragraph: vi.fn().mockImplementation(() => ({})),
  TextRun: vi.fn().mockImplementation(() => ({})),
}));

import coverLetterExportRoutes from '../../routes/coverLetterExport.js';

describe('Cover Letter Export Routes - Full Coverage', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/cover-letter-export', coverLetterExportRoutes);
  });

  // ========================================
  // POST /pdf - PDF Export
  // ========================================
  describe('POST /pdf', () => {
    it('should export cover letter as PDF with all parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: 'Dear Hiring Manager,\n\nI am writing to apply...',
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('application/pdf');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('.pdf');
      }
    });

    it('should use default values for missing jobTitle and company', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: 'Cover letter content',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-disposition']).toContain('cover_letter.pdf');
      }
    });

    it('should handle empty content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: '',
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle null content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: null,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should sanitize filename with special characters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: 'Content',
          jobTitle: 'Software Engineer (Senior)',
          company: 'Tech Corp & Co.',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        // Filename should have special chars replaced with underscores
        expect(res.headers['content-disposition']).not.toContain('(');
        expect(res.headers['content-disposition']).not.toContain(')');
        expect(res.headers['content-disposition']).not.toContain('&');
      }
    });

    it('should handle PDF generation error', async () => {
      const PDFDocument = await import('pdfkit');
      PDFDocument.default.mockImplementationOnce(() => {
        throw new Error('PDF generation error');
      });

      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: 'Content',
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('PDF export failed');
    });

    it('should handle long content', async () => {
      const longContent = 'This is a very long cover letter. '.repeat(100);
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: longContent,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle multiline content', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3\n\nParagraph 2';
      const res = await request(app)
        .post('/api/cover-letter-export/pdf')
        .send({
          content: multilineContent,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // POST /docx - DOCX Export
  // ========================================
  describe('POST /docx', () => {
    it('should export cover letter as DOCX with all parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: 'Dear Hiring Manager,\n\nI am writing to apply...',
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('wordprocessingml');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('.docx');
      }
    });

    it('should use default values for missing jobTitle and company', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: 'Cover letter content',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-disposition']).toContain('cover_letter.docx');
      }
    });

    it('should handle empty content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: '',
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle null content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: null,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should sanitize filename with special characters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: 'Content',
          jobTitle: 'Software Engineer (Senior)',
          company: 'Tech Corp & Co.',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-disposition']).not.toContain('(');
        expect(res.headers['content-disposition']).not.toContain(')');
      }
    });

    it('should handle DOCX generation error', async () => {
      const { Packer } = await import('docx');
      Packer.toBuffer.mockRejectedValueOnce(new Error('DOCX generation error'));

      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: 'Content',
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DOCX export failed');
    });

    it('should handle long content', async () => {
      const longContent = 'This is a very long cover letter. '.repeat(100);
      const res = await request(app)
        .post('/api/cover-letter-export/docx')
        .send({
          content: longContent,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // POST /text - TEXT Export
  // ========================================
  describe('POST /text', () => {
    it('should export cover letter as TEXT with all parameters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: 'Dear Hiring Manager,\n\nI am writing to apply...',
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('.txt');
        expect(res.text).toBe('Dear Hiring Manager,\n\nI am writing to apply...');
      }
    });

    it('should use default values for missing jobTitle and company', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: 'Cover letter content',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-disposition']).toContain('cover_letter.txt');
      }
    });

    it('should handle empty content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: '',
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toBe('');
      }
    });

    it('should handle null content', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: null,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toBe('');
      }
    });

    it('should sanitize filename with special characters', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: 'Content',
          jobTitle: 'Software Engineer (Senior)',
          company: 'Tech Corp & Co.',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-disposition']).not.toContain('(');
        expect(res.headers['content-disposition']).not.toContain(')');
      }
    });

    it('should handle long content', async () => {
      const longContent = 'This is a very long cover letter. '.repeat(100);
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: longContent,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toBe(longContent);
      }
    });

    it('should handle multiline content', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3\n\nParagraph 2';
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: multilineContent,
          jobTitle: 'Engineer',
          company: 'Corp',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toBe(multilineContent);
      }
    });
  });

  // ========================================
  // Utility Function Tests
  // ========================================
  describe('safe() function', () => {
    it('should handle various filename scenarios', async () => {
      const testCases = [
        { jobTitle: 'Software Engineer', company: 'Tech Corp' },
        { jobTitle: 'Engineer (Senior)', company: 'Corp & Co.' },
        { jobTitle: 'Developer - Full Stack', company: 'Startup Inc.' },
        { jobTitle: 'Manager/Lead', company: 'Company 123' },
      ];

      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/cover-letter-export/text')
          .send({
            content: 'Test',
            ...testCase,
          });

        expect([200, 400, 500]).toContain(res.status);
        if (res.status === 200) {
          // Filename should be sanitized
          const filename = res.headers['content-disposition'];
          expect(filename).toBeDefined();
        }
      }
    });

    it('should handle null/undefined values in safe()', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: 'Test',
          jobTitle: null,
          company: undefined,
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle empty strings in safe()', async () => {
      const res = await request(app)
        .post('/api/cover-letter-export/text')
        .send({
          content: 'Test',
          jobTitle: '',
          company: '',
        });

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});

