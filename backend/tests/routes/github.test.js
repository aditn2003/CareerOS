/**
 * GitHub Routes Tests
 * Tests routes/github.js - GitHub integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
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
  const userId = 1;
  const token = 'test-token';

  beforeEach(async () => {
    // Import default router (uses mocked auth and pool)
    const githubRoutes = (await import('../../routes/github.js')).default;
    
    app = express();
    app.use(express.json());
    app.use('/api/github', githubRoutes);
    
    vi.clearAllMocks();
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
        .set('Authorization', `Bearer ${token}`)
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
        .set('Authorization', `Bearer ${token}`)
        .send({ github_username: 'testuser' });

      expect(response.status).toBe(200);
      expect(response.body.is_reconnect).toBe(true);
      expect(response.body.existing_repos).toBe(5);
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 if username is empty string', async () => {
      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_username: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if username is not a string', async () => {
      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_username: 123 });

      expect(response.status).toBe(400);
    });

    it('should update existing settings when reconnecting different account', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, github_username FROM github_user_settings')) {
          return Promise.resolve({
            rows: [{ id: 1, github_username: 'olduser' }],
          });
        }
        if (query.includes('DELETE FROM github_contributions')) {
          return Promise.resolve({ rowCount: 5 });
        }
        if (query.includes('UPDATE github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_username: 'newuser' });

      expect(response.status).toBe(200);
      expect(response.body.github_username).toBe('newuser');
      expect(response.body.sync_needed).toBe(true);
    });

    it('should handle errors when connecting', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/github/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_username: 'testuser' });

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('completed');
      expect(response.body.summary).toBeDefined();
    });

    it('should return 400 if GitHub account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not connected');
    });

    it('should return 400 if username is missing in settings', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ github_username: null, github_token: null, include_private_repos: false }],
      });

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 if private repos requested but no token', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT github_username, github_token')) {
          return Promise.resolve({
            rows: [{
              github_username: 'testuser',
              github_token: null,
              include_private_repos: true,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('personal access token');
    });

    it('should filter out private repos when include_private_repos is false', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
        { name: 'repo2', private: true, id: 2 },
        { name: 'repo3', private: false, id: 3 },
      ];

      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT github_username, github_token')) {
          return Promise.resolve({
            rows: [{
              github_username: 'testuser',
              github_token: 'encrypted_token',
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
        if (query.includes('INSERT INTO github_contributions')) {
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.filtered).toBe(2); // Only public repos
      expect(response.body.summary.total_fetched).toBe(3);
    });

    it('should include private repos when include_private_repos is true', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
        { name: 'repo2', private: true, id: 2 },
      ];

      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT github_username, github_token')) {
          return Promise.resolve({
            rows: [{
              github_username: 'testuser',
              github_token: 'encrypted_token',
              include_private_repos: true,
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
        if (query.includes('INSERT INTO github_contributions')) {
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.filtered).toBe(2); // Both repos included
    });

    it('should update existing repository', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
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
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('UPDATE github_repositories SET')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('DELETE FROM github_contributions WHERE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO github_contributions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockGitHubService.fetchUserRepositories.mockResolvedValue(mockRepos);
      mockGitHubService.fetchRepositoryDetails.mockResolvedValue({
        name: 'repo1',
        languages: { JavaScript: 100 },
        full_name: 'testuser/repo1',
        description: 'Updated description',
        html_url: 'https://github.com/testuser/repo1',
        clone_url: 'https://github.com/testuser/repo1.git',
        stargazers_count: 15,
        forks_count: 8,
        watchers_count: 12,
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
        stars_count: 15,
        forks_count: 8,
        watchers_count: 12,
        is_private: false,
        is_fork: false,
        is_archived: false,
        default_branch: 'main',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        pushed_at: '2024-01-03',
        description: 'Updated description',
        url: 'https://api.github.com/repos/testuser/repo1',
        html_url: 'https://github.com/testuser/repo1',
        clone_url: 'https://github.com/testuser/repo1.git',
      });
      mockGitHubService.fetchRepositoryContributions.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.updated).toBe(1);
      expect(response.body.summary.added).toBe(0);
    });

    it('should handle contribution fetch timeout', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
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
      mockGitHubService.fetchRepositoryContributions.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Contribution fetch timeout after 10s')), 100);
        });
      });

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should handle contribution fetch 403 error', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
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
      const mockError = new Error('Forbidden');
      mockError.response = { status: 403 };
      mockGitHubService.fetchRepositoryContributions.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should handle contribution fetch 404 error', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
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
      const mockError = new Error('Not Found');
      mockError.response = { status: 404 };
      mockGitHubService.fetchRepositoryContributions.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should store contribution data in batches', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
      ];
      const mockContributions = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        commit_count: i + 1,
        additions: (i + 1) * 10,
        deletions: (i + 1) * 5,
      }));

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
        if (query.includes('INSERT INTO github_contributions')) {
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
      mockGitHubService.fetchRepositoryContributions.mockResolvedValue(mockContributions);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should handle contribution storage errors gracefully', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
      ];
      const mockContributions = [
        { date: '2024-01-01', commit_count: 5, additions: 10, deletions: 5 },
        { date: '2024-01-02', commit_count: 3, additions: 8, deletions: 2 },
      ];

      let contributionInsertCount = 0;
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
        if (query.includes('INSERT INTO github_contributions')) {
          contributionInsertCount++;
          if (contributionInsertCount === 1) {
            throw new Error('Database error');
          }
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
      mockGitHubService.fetchRepositoryContributions.mockResolvedValue(mockContributions);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should handle no contribution data', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
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
      mockGitHubService.fetchRepositoryContributions.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.added).toBe(1);
    });

    it('should handle repository processing errors gracefully', async () => {
      const mockRepos = [
        { name: 'repo1', private: false, id: 1 },
        { name: 'repo2', private: false, id: 2 },
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
      mockGitHubService.fetchRepositoryDetails
        .mockResolvedValueOnce({
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
        })
        .mockRejectedValueOnce(new Error('Repository not found'));
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.errors).toBe(1);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle connection timeout errors', async () => {
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
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'in_progress\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'failed\'')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockError = new Error('Connection terminated');
      mockGitHubService.fetchUserRepositories.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle sync errors and update status', async () => {
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
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'in_progress\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'failed\'')) {
          return Promise.resolve({ rows: [] });
        }
        throw new Error('Sync failed');
      });

      mockGitHubService.fetchUserRepositories.mockRejectedValue(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });

    it('should handle sync status update errors', async () => {
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
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'in_progress\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE github_user_settings') && query.includes('sync_status = \'failed\'')) {
          throw new Error('Update failed');
        }
        throw new Error('Sync failed');
      });

      mockGitHubService.fetchUserRepositories.mockRejectedValue(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/github/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should filter by featured', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('is_featured = true')) {
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
        .get('/api/github/repositories?featured=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.repositories.length).toBe(1);
    });

    it('should sort by stars', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('ORDER BY stars_count DESC')) {
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
        .get('/api/github/repositories?sort=stars')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should sort by created date', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('ORDER BY created_at DESC')) {
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
        .get('/api/github/repositories?sort=created')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should sort by pushed date', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('ORDER BY pushed_at DESC')) {
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
        .get('/api/github/repositories?sort=pushed')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should show private repos when include_private=true and user has token', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: true, github_token: 'encrypted_token' }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                repository_id: 1,
                name: 'repo1',
                languages: JSON.stringify({ JavaScript: 100 }),
                is_private: false,
              },
              {
                id: 2,
                repository_id: 2,
                name: 'repo2',
                languages: JSON.stringify({ Python: 100 }),
                is_private: true,
              },
            ],
          });
        }
        if (query.includes('SELECT s.id, s.name')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/repositories?include_private=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.repositories.length).toBe(2);
    });

    it('should return warning when include_private=true but no token', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/repositories?include_private=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.warning).toBeDefined();
      expect(response.body.repositories).toEqual([]);
    });

    it('should filter out private repos when include_private=false', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos')) {
          return Promise.resolve({
            rows: [{ include_private_repos: false, github_token: null }],
          });
        }
        if (query.includes('SELECT * FROM github_repositories') && query.includes('is_private = false')) {
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
        .get('/api/github/repositories?include_private=false')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should handle errors when fetching repositories', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/github/repositories')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.repository).toBeDefined();
    });

    it('should return 404 if repository not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/github/repositories/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 if repository ID is invalid', async () => {
      const response = await request(app)
        .get('/api/github/repositories/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should handle errors when fetching repository', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/github/repositories/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`)
        .send({ is_featured: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('featured');
    });

    it('should return 400 if is_featured is not boolean', async () => {
      const response = await request(app)
        .put('/api/github/repositories/1/feature')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_featured: 'true' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if repository ID is invalid', async () => {
      const response = await request(app)
        .put('/api/github/repositories/invalid/feature')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_featured: true });

      expect(response.status).toBe(400);
    });

    it('should return 404 if repository not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/github/repositories/999/feature')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_featured: true });

      expect(response.status).toBe(404);
    });

    it('should handle errors when updating featured status', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .put('/api/github/repositories/1/feature')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_featured: true });

      expect(response.status).toBe(500);
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
        if (query.includes('SELECT date, SUM(commit_count) as total_commits') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total')) {
          return Promise.resolve({ rows: [{ total: '10', earliest: '2024-01-01', latest: '2024-12-31' }] });
        }
        if (query.includes('SELECT COUNT(*) as repo_count FROM github_repositories')) {
          return Promise.resolve({ rows: [{ repo_count: '5' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.contributions).toBeDefined();
    });

    it('should filter by start_date', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT date, SUM(commit_count)') && query.includes('date >=')) {
          return Promise.resolve({
            rows: [
              { date: '2024-01-15', total_commits: '5' },
            ],
          });
        }
        if (query.includes('SELECT date, SUM(commit_count) as total_commits') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total')) {
          return Promise.resolve({ rows: [{ total: '10', earliest: '2024-01-01', latest: '2024-12-31' }] });
        }
        if (query.includes('SELECT COUNT(*) as repo_count FROM github_repositories')) {
          return Promise.resolve({ rows: [{ repo_count: '5' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions?start_date=2024-01-15')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should filter by end_date', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT date, SUM(commit_count)') && query.includes('date <=')) {
          return Promise.resolve({
            rows: [
              { date: '2024-01-01', total_commits: '5' },
            ],
          });
        }
        if (query.includes('SELECT date, SUM(commit_count) as total_commits') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total')) {
          return Promise.resolve({ rows: [{ total: '10', earliest: '2024-01-01', latest: '2024-12-31' }] });
        }
        if (query.includes('SELECT COUNT(*) as repo_count FROM github_repositories')) {
          return Promise.resolve({ rows: [{ repo_count: '5' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions?end_date=2024-01-31')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should handle debug queries for December 9th', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT date, SUM(commit_count)')) {
          return Promise.resolve({
            rows: [
              { date: '2024-12-09', total_commits: '10' },
            ],
          });
        }
        if (query.includes('SELECT date, SUM(commit_count) as total_commits') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({
            rows: [{ date: '2024-12-09', total_commits: '10', repo_count: '2' }],
          });
        }
        if (query.includes('SELECT repository_id, date, commit_count') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({
            rows: [
              { repository_id: 1, date: '2024-12-09', commit_count: 5 },
              { repository_id: 2, date: '2024-12-09', commit_count: 5 },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should handle empty contributions with debug queries', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT date, SUM(commit_count)')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT date, SUM(commit_count) as total_commits') && query.includes('date = \'2024-12-09\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total')) {
          return Promise.resolve({ rows: [{ total: '0', earliest: null, latest: null }] });
        }
        if (query.includes('SELECT COUNT(*) as repo_count FROM github_repositories')) {
          return Promise.resolve({ rows: [{ repo_count: '5' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/contributions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should handle errors when fetching contributions', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/github/contributions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.repositories).toBeDefined();
      expect(response.body.stats.languages).toBeDefined();
      expect(response.body.stats.contributions).toBeDefined();
    });

    it('should handle most active repository', async () => {
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
          return Promise.resolve({
            rows: [{
              id: 1,
              repository_id: 1,
              name: 'repo1',
              languages: JSON.stringify({ JavaScript: 100 }),
              total_commits: '100',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/github/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.most_active_repository).toBeDefined();
    });

    it('should handle errors when fetching stats', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/github/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.settings).toBeDefined();
    });

    it('should return null if no settings exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/github/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.settings).toBeNull();
    });

    it('should handle errors when fetching settings', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/github/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`)
        .send({
          auto_sync_enabled: true,
          sync_frequency: 'daily',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
    });

    it('should delete private repos when disabling include_private_repos', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT include_private_repos FROM github_user_settings')) {
          return Promise.resolve({
            rows: [{ include_private_repos: true }],
          });
        }
        if (query.includes('UPDATE github_user_settings')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT repository_id FROM github_repositories') && query.includes('is_private = true')) {
          return Promise.resolve({
            rows: [
              { repository_id: 1 },
              { repository_id: 2 },
            ],
          });
        }
        if (query.includes('DELETE FROM github_contributions') && query.includes('repository_id = ANY')) {
          return Promise.resolve({ rowCount: 10 });
        }
        if (query.includes('DELETE FROM github_repository_skills') && query.includes('repository_id = ANY')) {
          return Promise.resolve({ rowCount: 5 });
        }
        if (query.includes('DELETE FROM github_repositories') && query.includes('is_private = true')) {
          return Promise.resolve({ rowCount: 2 });
        }
        if (query.includes('SELECT id, github_username')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              github_username: 'testuser',
              include_private_repos: false,
              has_token: false,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/github/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ include_private_repos: false });

      expect(response.status).toBe(200);
    });

    it('should return 400 if no valid fields to update', async () => {
      const response = await request(app)
        .put('/api/github/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 if sync_frequency is invalid', async () => {
      const response = await request(app)
        .put('/api/github/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ sync_frequency: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should handle errors when updating settings', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .put('/api/github/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ auto_sync_enabled: true });

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`)
        .send({ github_token: 'test_token_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_token: 'test_token_123' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 if token is empty string', async () => {
      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_token: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if token is not a string', async () => {
      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_token: 123 });

      expect(response.status).toBe(400);
    });

    it('should handle errors when updating token', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_user_settings')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        throw new Error('Database error');
      });

      const response = await request(app)
        .put('/api/github/token')
        .set('Authorization', `Bearer ${token}`)
        .send({ github_token: 'test_token_123' });

      expect(response.status).toBe(500);
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
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deleted).toBeDefined();
    });

    it('should return 400 if account not connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/github/disconnect')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should handle errors when disconnecting', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_user_settings')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/github/disconnect')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/github/repositories/:repoId/skills', () => {
    it('should link skills to repository', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_repositories WHERE')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('DELETE FROM github_repository_skills')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id FROM skills WHERE id = ANY')) {
          return Promise.resolve({
            rows: [{ id: 1 }, { id: 2 }],
          });
        }
        if (query.includes('INSERT INTO github_repository_skills')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT s.* FROM skills s')) {
          return Promise.resolve({
            rows: [
              { id: 1, name: 'JavaScript', category: 'Programming', proficiency: 'Expert' },
              { id: 2, name: 'React', category: 'Framework', proficiency: 'Advanced' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/repositories/1/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [1, 2] });

      expect(response.status).toBe(200);
      expect(response.body.skills).toBeDefined();
      expect(response.body.skills.length).toBe(2);
    });

    it('should return 400 if repository ID is invalid', async () => {
      const response = await request(app)
        .post('/api/github/repositories/invalid/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [1] });

      expect(response.status).toBe(400);
    });

    it('should return 400 if skill_ids is not an array', async () => {
      const response = await request(app)
        .post('/api/github/repositories/1/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: 'not-an-array' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if repository not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/github/repositories/999/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [1] });

      expect(response.status).toBe(404);
    });

    it('should return 400 if skill not found or does not belong to user', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_repositories WHERE')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('DELETE FROM github_repository_skills')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id FROM skills WHERE id = ANY')) {
          return Promise.resolve({ rows: [{ id: 1 }] }); // Only 1 skill found, but 2 requested
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/repositories/1/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [1, 2] });

      expect(response.status).toBe(400);
    });

    it('should handle empty skill_ids array', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM github_repositories WHERE')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('DELETE FROM github_repository_skills')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT s.* FROM skills s')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/github/repositories/1/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [] });

      expect(response.status).toBe(200);
      expect(response.body.skills).toEqual([]);
    });

    it('should handle errors when linking skills', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/github/repositories/1/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_ids: [1] });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/github/repositories/:repoId/skills/:skillId', () => {
    it('should unlink skill from repository', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .delete('/api/github/repositories/1/skills/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('unlinked');
    });

    it('should return 400 if repository ID is invalid', async () => {
      const response = await request(app)
        .delete('/api/github/repositories/invalid/skills/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 if skill ID is invalid', async () => {
      const response = await request(app)
        .delete('/api/github/repositories/1/skills/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 if skill link not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/github/repositories/1/skills/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should handle errors when unlinking skill', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/github/repositories/1/skills/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });
});

