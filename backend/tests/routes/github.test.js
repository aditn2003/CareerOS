/**
 * GitHub Routes Tests
 * Tests routes/github.js - GitHub integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock dependencies
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Create a shared mock service instance that will be returned by createGitHubService
const mockGitHubService = {
  fetchUserRepositories: vi.fn(),
  fetchRepositoryDetails: vi.fn(),
  fetchRepositoryContributions: vi.fn(),
  normalizeRepositoryData: vi.fn(),
};

vi.mock('../../services/githubService.js', () => ({
  createGitHubService: vi.fn(() => mockGitHubService),
}));

vi.mock('../../services/githubSyncService.js', () => ({
  syncUserRepositories: vi.fn(),
}));

vi.mock('../../utils/tokenEncryption.js', () => ({
  encryptToken: vi.fn((token) => `encrypted_${token}`),
  decryptToken: vi.fn((encrypted) => encrypted.replace('encrypted_', '')),
}));

describe('GitHub Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    // Import default router
    const githubRoutes = (await import('../../routes/github.js')).default;
    
    app = express();
    app.use(express.json());
    app.use('/api/github', githubRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    const { auth } = await import('../../auth.js');
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe('POST /api/github/connect', () => {
    it('should connect GitHub account with new username', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, github_username FROM github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('DELETE FROM github_contributions')) {
          return Promise.resolve({ rowCount: 0 });
        }
        if (query.includes('INSERT INTO github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ github_username: 'testuser' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('connected');
      expect(response.body.github_username).toBe('testuser');
    });

    it('should reconnect same GitHub account', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, github_username FROM github_user_settings')) {
          return Promise.resolve({
            rows: [{ id: 1, github_username: 'testuser' }],
          });
        }
        if (query.includes('DELETE FROM github_contributions')) {
          return Promise.resolve({ rowCount: 0 });
        }
        if (query.includes('SELECT COUNT(*) as count FROM github_repositories')) {
          return Promise.resolve({ rows: [{ count: '5' }] });
        }
        if (query.includes('UPDATE github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ github_username: 'testuser' });

      expect(response.status).toBe(200);
      expect(response.body.is_reconnect).toBe(true);
      expect(response.body.existing_repos).toBe(5);
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/github/sync', () => {
    it('should sync repositories successfully', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
        { name: 'repo2', private: true, id: 2 },
      ];

      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT github_username, github_token')) {
          return Promise.resolve({
            rows: [{
              github_username: 'testuser',
              github_token: null,
              include_private_repos: false,
            }],
          });
        }
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id FROM github_repositories WHERE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO github_repositories')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('DELETE FROM github_contributions WHERE')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockGitHubService.fetchUserRepositories.mockResolvedValue(mockRepos);
      mockGitHubService.fetchRepositoryDetails.mockResolvedValue({
        name: 'repo1',
        languages: { JavaScript: 100 },
        full_name: 'testuser/repo1',
        description: 'Test repo',
        html_url: 'https://github.com/testuser/repo1',
        clone_url: 'https://github.com/testuser/repo1.git',
        stargazers_count: 10,
        forks_count: 5,
        watchers_count: 8,
        private: false,
        fork: false,
        archived: false,
        default_branch: 'main',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        pushed_at: '2024-01-03T00:00:00Z',
      });
      mockGitHubService.normalizeRepositoryData.mockReturnValue({
        repository_id: 1,
        name: 'repo1',
        full_name: 'testuser/repo1',
        github_username: 'testuser',
        language: 'JavaScript',
        languages: { JavaScript: 100 },
        stars_count: 10,
        forks_count: 5,
        watchers_count: 8,
        is_private: false,
        is_fork: false,
        is_archived: false,
        default_branch: 'main',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        pushed_at: '2024-01-03',
        description: 'Test repo',
        url: 'https://api.github.com/repos/testuser/repo1',
        html_url: 'https://github.com/testuser/repo1',
        clone_url: 'https://github.com/testuser/repo1.git',
      });
      mockGitHubService.fetchRepositoryContributions.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('completed');
      expect(response.body.summary).toBeDefined();
    });

    it('should return 400 if GitHub account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not connected');
    });
  });

  describe('GET /api/github/repositories', () => {
    it('should get user repositories', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              repository_id: 1,
              name: 'repo1',
              languages: JSON.stringify({ JavaScript: 100 }),
              is_private: false,
            }],
          });
        }
        if (query.includes('SELECT s.id, s.name')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/repositories')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.repositories).toBeDefined();
      expect(Array.isArray(response.body.repositories)).toBe(true);
    });

    it('should filter by language', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('language =')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT s.id, s.name')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/repositories?language=JavaScript')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/github/repositories/:repoId', () => {
    it('should get single repository', async () => {
      pool.query.mockImplementation((query) => {
        // The route uses: WHERE user_id = $1 AND repository_id = $2
        if (query.includes('SELECT * FROM github_repositories') && query.includes('repository_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              repository_id: 1,
              user_id: userId,
              github_username: 'testuser',
              name: 'repo1',
              full_name: 'testuser/repo1',
              languages: JSON.stringify({ JavaScript: 100 }),
              is_private: false,
            }],
          });
        }
        if (query.includes('SELECT s.id, s.name') || query.includes('FROM skills s')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/repositories/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.repository).toBeDefined();
    });

    it('should return 404 if repository not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/github/repositories/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/github/repositories/:repoId/feature', () => {
    it('should toggle featured status', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          repository_id: 1,
          name: 'repo1',
          is_featured: true,
          languages: JSON.stringify({}),
        }],
      });

      const response = await request(app)
        .put('/api/github/repositories/1/feature')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ is_featured: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('featured');
    });

    it('should return 400 if is_featured is not boolean', async () => {
      const response = await request(app)
        .put('/api/github/repositories/1/feature')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ is_featured: 'true' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/github/contributions', () => {
    it('should get contribution data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT date, SUM(commit_count)')) {
          return Promise.resolve({
            rows: [
              { date: '2024-01-01', total_commits: '5' },
              { date: '2024-01-02', total_commits: '3' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.contributions).toBeDefined();
    });
  });

  describe('GET /api/github/stats', () => {
    it('should get GitHub statistics', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('COUNT(*) as total_repositories')) {
          return Promise.resolve({
            rows: [{
              total_repositories: '10',
              total_stars: '100',
              total_forks: '50',
              featured_count: '2',
            }],
          });
        }
        if (query.includes('SELECT language, COUNT(*)')) {
          return Promise.resolve({
            rows: [
              { language: 'JavaScript', repo_count: '5', total_stars: '50' },
            ],
          });
        }
        if (query.includes('SUM(commit_count) as total_commits')) {
          return Promise.resolve({
            rows: [{
              total_commits: '200',
              active_days: '30',
              active_repositories: '5',
            }],
          });
        }
        if (query.includes('SELECT r.*, SUM(c.commit_count)')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.repositories).toBeDefined();
      expect(response.body.stats.languages).toBeDefined();
      expect(response.body.stats.contributions).toBeDefined();
    });
  });

  describe('GET /api/github/settings', () => {
    it('should get user GitHub settings', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          github_username: 'testuser',
          auto_sync_enabled: false,
          has_token: false,
        }],
      });

      const response = await request(app)
        .get('/api/github/settings')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.settings).toBeDefined();
    });

    it('should return null if no settings exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/github/settings')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.settings).toBeNull();
    });
  });

  describe('PUT /api/github/settings', () => {
    it('should update GitHub settings', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos FROM github_user_settings')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false }],
          });
        }
        if (query.includes('UPDATE github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, github_username')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              github_username: 'testuser',
              auto_sync_enabled: true,
              has_token: false,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/github/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          auto_sync_enabled: true,
          sync_frequency: 'daily',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
    });
  });

  describe('PUT /api/github/token', () => {
    it('should update GitHub token', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_user_settings')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('UPDATE github_user_settings') && query.includes('github_token')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, github_username')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              github_username: 'testuser',
              has_token: true,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ github_token: 'test_token_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ github_token: 'test_token_123' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/github/disconnect', () => {
    it('should disconnect GitHub account', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_user_settings')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('DELETE FROM github_repository_skills')) {
          return Promise.resolve({ rowCount: 5 });
        }
        if (query.includes('DELETE FROM github_contributions')) {
          return Promise.resolve({ rowCount: 10 });
        }
        if (query.includes('DELETE FROM github_repositories')) {
          return Promise.resolve({ rowCount: 3 });
        }
        if (query.includes('DELETE FROM github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/github/disconnect')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deleted).toBeDefined();
    });

    it('should return 400 if account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/github/disconnect')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);
    });
  });
});

