/**
 * Render Template Utility - Full Coverage Tests
 * File: backend/utils/renderTemplate.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderTemplate, categorizeSkills } from '../../utils/renderTemplate.js';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// ============================================
// MOCKS
// ============================================

const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();

const mockBrowser = {
  newPage: vi.fn(),
  close: vi.fn(),
};

const mockPage = {
  setContent: vi.fn(),
  pdf: vi.fn(),
};

vi.mock('fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  },
}));

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve(mockBrowser)),
  },
}));

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
  mockBrowser.newPage.mockResolvedValue(mockPage);
  mockPage.setContent.mockResolvedValue();
  mockPage.pdf.mockResolvedValue();
});

// ============================================
// TESTS
// ============================================

describe('Render Template Utility - Full Coverage', () => {
  describe('renderTemplate', () => {
    it('should render template to PDF', async () => {
      const templateContent = '<h1>{{summary.full_name}}</h1>';
      const cssContent = 'body { margin: 0; }';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(templateContent) // Template
        .mockReturnValueOnce(cssContent); // CSS

      const data = {
        summary: { full_name: 'John Doe' },
        experience: [],
        skills: [],
      };

      const outputPath = '/tmp/test.pdf';

      await renderTemplate('ats-optimized', data, outputPath);

      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle missing CSS file', async () => {
      const templateContent = '<h1>Test</h1>';

      mockExistsSync
        .mockReturnValueOnce(true) // Template exists
        .mockReturnValueOnce(false); // CSS doesn't exist

      mockReadFileSync.mockReturnValueOnce(templateContent);

      const data = { summary: {}, experience: [], skills: [] };
      await renderTemplate('ats-optimized', data, '/tmp/test.pdf');

      expect(mockPage.setContent).toHaveBeenCalled();
    });

    it('should throw error if template not found', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        renderTemplate('nonexistent', {}, '/tmp/test.pdf')
      ).rejects.toThrow();
    });

    it('should categorize skills', async () => {
      const templateContent = '<h1>Test</h1>';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValueOnce(templateContent);

      const data = {
        summary: {},
        experience: [],
        skills: ['JavaScript', 'Python', 'React', 'Leadership', 'AWS'],
      };

      await renderTemplate('ats-optimized', data, '/tmp/test.pdf');

      expect(mockPage.setContent).toHaveBeenCalled();
      const htmlContent = mockPage.setContent.mock.calls[0][0];
      expect(htmlContent).toContain('skillCategories');
    });

    it('should handle puppeteer errors', async () => {
      const templateContent = '<h1>Test</h1>';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValueOnce(templateContent);
      mockPage.setContent.mockRejectedValueOnce(new Error('Puppeteer error'));

      await expect(
        renderTemplate('ats-optimized', {}, '/tmp/test.pdf')
      ).rejects.toThrow();
    });
  });

  describe('categorizeSkills', () => {
    it('should categorize programming languages', () => {
      const skills = ['JavaScript', 'Python', 'Java'];
      const result = categorizeSkills(skills);

      expect(result.programming.length).toBeGreaterThan(0);
    });

    it('should categorize libraries', () => {
      const skills = ['React', 'Express', 'Pandas'];
      const result = categorizeSkills(skills);

      expect(result.libraries.length).toBeGreaterThan(0);
    });

    it('should categorize tools', () => {
      const skills = ['Git', 'AWS', 'Docker'];
      const result = categorizeSkills(skills);

      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should categorize soft skills', () => {
      const skills = ['Leadership', 'Communication', 'Teamwork'];
      const result = categorizeSkills(skills);

      expect(result.soft.length).toBeGreaterThan(0);
    });

    it('should handle special case capitalization', () => {
      const skills = ['sql', 'api', 'javascript'];
      const result = categorizeSkills(skills);

      expect(result.programming.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const result = categorizeSkills([]);

      expect(result.programming).toEqual([]);
      expect(result.libraries).toEqual([]);
    });

    it('should handle skills as objects', () => {
      const skills = [{ name: 'JavaScript' }, { name: 'Python' }];
      const result = categorizeSkills(skills);

      expect(result.programming.length).toBeGreaterThan(0);
    });
  });
});

