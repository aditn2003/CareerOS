// backend/routes/github.js
// GitHub Integration API Routes
import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js";
import { createGitHubService } from "../services/githubService.js";
import { syncUserRepositories } from "../services/githubSyncService.js";

// Factory function for dependency injection (for testing)
function createGitHubRoutes(dbPool = null) {
  const router = express.Router();
  const databasePool = dbPool || pool;
  const githubService = createGitHubService(databasePool);

  /* ============================================================
     POST /api/github/connect
     Connect GitHub account by storing username
  ============================================================ */
  router.post("/connect", auth, async (req, res) => {
    try {
      const { github_username } = req.body;
      const userId = req.user.id;

      if (!github_username || typeof github_username !== "string" || github_username.trim() === "") {
        return res.status(400).json({ error: "GitHub username is required" });
      }

      const username = github_username.trim();

      // Check if settings already exist
      const existing = await databasePool.query(
        "SELECT id FROM github_user_settings WHERE user_id = $1",
        [userId]
      );

      if (existing.rows.length > 0) {
        // Update existing settings
        await databasePool.query(
          `UPDATE github_user_settings 
           SET github_username = $1, updated_at = NOW()
           WHERE user_id = $2`,
          [username, userId]
        );
      } else {
        // Create new settings
        await databasePool.query(
          `INSERT INTO github_user_settings (user_id, github_username)
           VALUES ($1, $2)`,
          [userId, username]
        );
      }

      res.json({
        message: "GitHub account connected successfully",
        github_username: username,
      });
    } catch (err) {
      console.error("❌ Error connecting GitHub account:", err);
      res.status(500).json({ error: "Failed to connect GitHub account" });
    }
  });

  /* ============================================================
     POST /api/github/sync
     Manually sync repositories from GitHub
  ============================================================ */
  router.post("/sync", auth, async (req, res) => {
    try {
      const userId = req.user.id;

      // Get user's GitHub settings
      const settingsResult = await databasePool.query(
        "SELECT github_username, github_token FROM github_user_settings WHERE user_id = $1",
        [userId]
      );

      if (settingsResult.rows.length === 0 || !settingsResult.rows[0].github_username) {
        return res.status(400).json({ error: "GitHub account not connected. Please connect your GitHub account first." });
      }

      const { github_username, github_token } = settingsResult.rows[0];

      // Update sync status to in_progress
      await databasePool.query(
        `UPDATE github_user_settings 
         SET sync_status = 'in_progress', sync_error = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Fetch repositories from GitHub
      const repositories = await githubService.fetchUserRepositories(github_username, github_token || null);

      let added = 0;
      let updated = 0;
      let errors = [];

      // Process each repository
      for (const repo of repositories) {
        try {
          // Fetch detailed info including languages
          const repoDetails = await githubService.fetchRepositoryDetails(
            github_username,
            repo.name,
            github_token || null
          );

          const normalized = githubService.normalizeRepositoryData(repoDetails, github_username);

          // Check if repository already exists
          const existing = await databasePool.query(
            "SELECT id FROM github_repositories WHERE user_id = $1 AND repository_id = $2",
            [userId, normalized.repository_id]
          );

          if (existing.rows.length > 0) {
            // Update existing repository
            await databasePool.query(
              `UPDATE github_repositories 
               SET name = $1, full_name = $2, description = $3, url = $4, html_url = $5, 
                   clone_url = $6, language = $7, languages = $8, stars_count = $9, 
                   forks_count = $10, watchers_count = $11, is_private = $12, is_fork = $13, 
                   is_archived = $14, default_branch = $15, created_at = $16, updated_at = $17, 
                   pushed_at = $18, local_updated_at = NOW()
               WHERE user_id = $19 AND repository_id = $20`,
              [
                normalized.name,
                normalized.full_name,
                normalized.description,
                normalized.url,
                normalized.html_url,
                normalized.clone_url,
                normalized.language,
                JSON.stringify(normalized.languages),
                normalized.stars_count,
                normalized.forks_count,
                normalized.watchers_count,
                normalized.is_private,
                normalized.is_fork,
                normalized.is_archived,
                normalized.default_branch,
                normalized.created_at,
                normalized.updated_at,
                normalized.pushed_at,
                userId,
                normalized.repository_id,
              ]
            );
            updated++;
          } else {
            // Insert new repository
            await databasePool.query(
              `INSERT INTO github_repositories 
               (user_id, github_username, repository_id, name, full_name, description, url, 
                html_url, clone_url, language, languages, stars_count, forks_count, watchers_count, 
                is_private, is_fork, is_archived, default_branch, created_at, updated_at, pushed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
              [
                userId,
                normalized.github_username,
                normalized.repository_id,
                normalized.name,
                normalized.full_name,
                normalized.description,
                normalized.url,
                normalized.html_url,
                normalized.clone_url,
                normalized.language,
                JSON.stringify(normalized.languages),
                normalized.stars_count,
                normalized.forks_count,
                normalized.watchers_count,
                normalized.is_private,
                normalized.is_fork,
                normalized.is_archived,
                normalized.default_branch,
                normalized.created_at,
                normalized.updated_at,
                normalized.pushed_at,
              ]
            );
            added++;
          }
        } catch (repoError) {
          console.error(`❌ Error processing repository ${repo.name}:`, repoError.message);
          errors.push({ repository: repo.name, error: repoError.message });
        }
      }

      // Update sync status to success
      await databasePool.query(
        `UPDATE github_user_settings 
         SET sync_status = 'success', last_sync_at = NOW(), sync_error = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      res.json({
        message: "Sync completed",
        summary: {
          total_fetched: repositories.length,
          added,
          updated,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("❌ Error syncing repositories:", err);
      res.status(500).json({
        error: "Failed to sync repositories",
        message: err.message,
      });
    }
  });

  /* ============================================================
     GET /api/github/repositories
     Get user's repositories with optional filters
  ============================================================ */
  router.get("/repositories", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { featured, language, sort = "updated", include_private } = req.query;

      // Get user's private repo preference and token status
      const settingsResult = await databasePool.query(
        "SELECT include_private_repos, github_token FROM github_user_settings WHERE user_id = $1",
        [userId]
      );
      const userPrefersPrivate = settingsResult.rows[0]?.include_private_repos || false;
      const hasToken = !!settingsResult.rows[0]?.github_token;

      let query = `
        SELECT * FROM github_repositories 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      // Filter private repos based on query param or user preference
      if (include_private === "false" || (!userPrefersPrivate && include_private !== "true")) {
        query += ` AND is_private = false`;
      } else if (include_private === "true" && !hasToken) {
        // If user explicitly requests private but has no token, return empty with warning
        return res.json({ 
          repositories: [],
          warning: "Private repositories require a GitHub personal access token. Please add a token in your settings."
        });
      }

      // Filter by featured
      if (featured === "true") {
        query += ` AND is_featured = true`;
      }

      // Filter by language
      if (language) {
        query += ` AND language = $${paramIndex}`;
        params.push(language);
        paramIndex++;
      }

      // Sort order
      const validSorts = ["stars", "updated", "created", "pushed"];
      const sortField = validSorts.includes(sort) ? sort : "updated";
      const sortColumn = sortField === "stars" ? "stars_count" : 
                        sortField === "updated" ? "updated_at" :
                        sortField === "created" ? "created_at" : "pushed_at";
      
      query += ` ORDER BY ${sortColumn} DESC`;

      const result = await databasePool.query(query, params);

      // Parse languages JSONB and fetch linked skills for each repository
      const repositories = await Promise.all(
        result.rows.map(async (repo) => {
          // Fetch linked skills
          const skillsResult = await databasePool.query(
            `SELECT s.id, s.name, s.category, s.proficiency
             FROM skills s
             INNER JOIN github_repository_skills grs ON s.id = grs.skill_id
             WHERE grs.repository_id = $1 AND grs.user_id = $2`,
            [repo.repository_id, userId]
          );

          return {
            ...repo,
            languages: typeof repo.languages === "string" ? JSON.parse(repo.languages) : repo.languages,
            linked_skills: skillsResult.rows || [],
          };
        })
      );

      res.json({ repositories });
    } catch (err) {
      console.error("❌ Error fetching repositories:", err);
      res.status(500).json({ error: "Failed to fetch repositories" });
    }
  });

  /* ============================================================
     GET /api/github/repositories/:repoId
     Get single repository details
  ============================================================ */
  router.get("/repositories/:repoId", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const repoId = parseInt(req.params.repoId);

      if (isNaN(repoId)) {
        return res.status(400).json({ error: "Invalid repository ID" });
      }

      const result = await databasePool.query(
        `SELECT * FROM github_repositories 
         WHERE user_id = $1 AND repository_id = $2`,
        [userId, repoId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Repository not found" });
      }

      const repo = result.rows[0];
      repo.languages = typeof repo.languages === "string" ? JSON.parse(repo.languages) : repo.languages;

      // Fetch linked skills
      const skillsResult = await databasePool.query(
        `SELECT s.id, s.name, s.category, s.proficiency
         FROM skills s
         INNER JOIN github_repository_skills grs ON s.id = grs.skill_id
         WHERE grs.repository_id = $1 AND grs.user_id = $2`,
        [repoId, userId]
      );

      repo.linked_skills = skillsResult.rows || [];

      res.json({ repository: repo });
    } catch (err) {
      console.error("❌ Error fetching repository:", err);
      res.status(500).json({ error: "Failed to fetch repository" });
    }
  });

  /* ============================================================
     PUT /api/github/repositories/:repoId/feature
     Toggle featured status for a repository
  ============================================================ */
  router.put("/repositories/:repoId/feature", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const repoId = parseInt(req.params.repoId);
      const { is_featured } = req.body;

      if (isNaN(repoId)) {
        return res.status(400).json({ error: "Invalid repository ID" });
      }

      if (typeof is_featured !== "boolean") {
        return res.status(400).json({ error: "is_featured must be a boolean" });
      }

      const result = await databasePool.query(
        `UPDATE github_repositories 
         SET is_featured = $1, local_updated_at = NOW()
         WHERE user_id = $2 AND repository_id = $3
         RETURNING *`,
        [is_featured, userId, repoId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Repository not found" });
      }

      const repo = result.rows[0];
      repo.languages = typeof repo.languages === "string" ? JSON.parse(repo.languages) : repo.languages;

      res.json({
        message: `Repository ${is_featured ? "featured" : "unfeatured"} successfully`,
        repository: repo,
      });
    } catch (err) {
      console.error("❌ Error updating featured status:", err);
      res.status(500).json({ error: "Failed to update featured status" });
    }
  });

  /* ============================================================
     GET /api/github/contributions
     Get contribution activity (commits per day)
  ============================================================ */
  router.get("/contributions", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { start_date, end_date } = req.query;

      let query = `
        SELECT date, SUM(commit_count) as total_commits, 
               SUM(additions) as total_additions, SUM(deletions) as total_deletions
        FROM github_contributions
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (start_date) {
        query += ` AND date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      query += ` GROUP BY date ORDER BY date DESC`;

      const result = await databasePool.query(query, params);

      console.log(`📊 Returning ${result.rows.length} contribution records for user ${userId}`);
      
      // Debug: Check if any data exists at all
      if (result.rows.length === 0) {
        const debugQuery = await databasePool.query(
          `SELECT COUNT(*) as total, MIN(date) as earliest, MAX(date) as latest 
           FROM github_contributions WHERE user_id = $1`,
          [userId]
        );
        console.log(`🔍 Debug: Total contributions in DB for user ${userId}:`, debugQuery.rows[0]);
      }
      
      res.json({ contributions: result.rows });
    } catch (err) {
      console.error("❌ Error fetching contributions:", err);
      res.status(500).json({ error: "Failed to fetch contributions", details: err.message });
    }
  });

  /* ============================================================
     POST /api/github/repositories/:repoId/skills
     Link repository to skills
  ============================================================ */
  router.post("/repositories/:repoId/skills", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const repoId = parseInt(req.params.repoId);
      const { skill_ids } = req.body;

      if (isNaN(repoId)) {
        return res.status(400).json({ error: "Invalid repository ID" });
      }

      if (!Array.isArray(skill_ids)) {
        return res.status(400).json({ error: "skill_ids must be an array" });
      }

      // Verify repository belongs to user
      const repoCheck = await databasePool.query(
        "SELECT id FROM github_repositories WHERE user_id = $1 AND repository_id = $2",
        [userId, repoId]
      );

      if (repoCheck.rows.length === 0) {
        return res.status(404).json({ error: "Repository not found" });
      }

      // Remove existing links
      await databasePool.query(
        "DELETE FROM github_repository_skills WHERE repository_id = $1 AND user_id = $2",
        [repoId, userId]
      );

      // Add new links
      if (skill_ids.length > 0) {
        // Verify all skills belong to user
        const skillCheck = await databasePool.query(
          `SELECT id FROM skills WHERE id = ANY($1) AND user_id = $2`,
          [skill_ids, userId]
        );

        if (skillCheck.rows.length !== skill_ids.length) {
          return res.status(400).json({ error: "One or more skills not found or don't belong to user" });
        }

        // Insert new links
        const values = skill_ids.map((skillId, index) => 
          `($1, $2, $${index + 3})`
        ).join(", ");

        await databasePool.query(
          `INSERT INTO github_repository_skills (repository_id, user_id, skill_id)
           VALUES ${values}`,
          [repoId, userId, ...skill_ids]
        );
      }

      // Fetch linked skills
      const linkedSkills = await databasePool.query(
        `SELECT s.* FROM skills s
         INNER JOIN github_repository_skills grs ON s.id = grs.skill_id
         WHERE grs.repository_id = $1 AND grs.user_id = $2`,
        [repoId, userId]
      );

      res.json({
        message: "Skills linked successfully",
        skills: linkedSkills.rows,
      });
    } catch (err) {
      console.error("❌ Error linking skills:", err);
      res.status(500).json({ error: "Failed to link skills" });
    }
  });

  /* ============================================================
     DELETE /api/github/repositories/:repoId/skills/:skillId
     Unlink skill from repository
  ============================================================ */
  router.delete("/repositories/:repoId/skills/:skillId", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const repoId = parseInt(req.params.repoId);
      const skillId = parseInt(req.params.skillId);

      if (isNaN(repoId) || isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid repository ID or skill ID" });
      }

      const result = await databasePool.query(
        `DELETE FROM github_repository_skills 
         WHERE repository_id = $1 AND skill_id = $2 AND user_id = $3
         RETURNING id`,
        [repoId, skillId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Skill link not found" });
      }

      res.json({ message: "Skill unlinked successfully" });
    } catch (err) {
      console.error("❌ Error unlinking skill:", err);
      res.status(500).json({ error: "Failed to unlink skill" });
    }
  });

  /* ============================================================
     GET /api/github/stats
     Get GitHub statistics for user
  ============================================================ */
  router.get("/stats", auth, async (req, res) => {
    try {
      const userId = req.user.id;

      // Get repository statistics
      const repoStats = await databasePool.query(
        `SELECT 
           COUNT(*) as total_repositories,
           SUM(stars_count) as total_stars,
           SUM(forks_count) as total_forks,
           COUNT(CASE WHEN is_featured THEN 1 END) as featured_count
         FROM github_repositories
         WHERE user_id = $1`,
        [userId]
      );

      // Get language breakdown
      const languageStats = await databasePool.query(
        `SELECT language, COUNT(*) as repo_count, SUM(stars_count) as total_stars
         FROM github_repositories
         WHERE user_id = $1 AND language IS NOT NULL
         GROUP BY language
         ORDER BY repo_count DESC, total_stars DESC
         LIMIT 10`,
        [userId]
      );

      // Get contribution statistics
      const contributionStats = await databasePool.query(
        `SELECT 
           SUM(commit_count) as total_commits,
           COUNT(DISTINCT date) as active_days,
           COUNT(DISTINCT repository_id) as active_repositories
         FROM github_contributions
         WHERE user_id = $1`,
        [userId]
      );

      // Get most active repository
      const mostActiveRepo = await databasePool.query(
        `SELECT r.*, SUM(c.commit_count) as total_commits
         FROM github_repositories r
         LEFT JOIN github_contributions c ON r.repository_id = c.repository_id AND c.user_id = $1
         WHERE r.user_id = $1
         GROUP BY r.id
         ORDER BY total_commits DESC NULLS LAST, r.stars_count DESC
         LIMIT 1`,
        [userId]
      );

      const stats = {
        repositories: {
          total: parseInt(repoStats.rows[0]?.total_repositories || 0),
          featured: parseInt(repoStats.rows[0]?.featured_count || 0),
          total_stars: parseInt(repoStats.rows[0]?.total_stars || 0),
          total_forks: parseInt(repoStats.rows[0]?.total_forks || 0),
        },
        languages: languageStats.rows.map(row => ({
          language: row.language,
          repository_count: parseInt(row.repo_count),
          total_stars: parseInt(row.total_stars),
        })),
        contributions: {
          total_commits: parseInt(contributionStats.rows[0]?.total_commits || 0),
          active_days: parseInt(contributionStats.rows[0]?.active_days || 0),
          active_repositories: parseInt(contributionStats.rows[0]?.active_repositories || 0),
        },
        most_active_repository: mostActiveRepo.rows.length > 0 ? {
          ...mostActiveRepo.rows[0],
          languages: typeof mostActiveRepo.rows[0].languages === "string" 
            ? JSON.parse(mostActiveRepo.rows[0].languages) 
            : mostActiveRepo.rows[0].languages,
        } : null,
      };

      res.json({ stats });
    } catch (err) {
      console.error("❌ Error fetching GitHub stats:", err);
      res.status(500).json({ error: "Failed to fetch GitHub statistics" });
    }
  });

  /* ============================================================
     GET /api/github/settings
     Get user's GitHub settings
  ============================================================ */
  router.get("/settings", auth, async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await databasePool.query(
        "SELECT id, github_username, auto_sync_enabled, sync_frequency, last_sync_at, sync_status, sync_error, created_at, updated_at FROM github_user_settings WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({ settings: null });
      }

      // Don't return the token for security
      const settings = result.rows[0];
      res.json({ settings });
    } catch (err) {
      console.error("❌ Error fetching GitHub settings:", err);
      res.status(500).json({ error: "Failed to fetch GitHub settings" });
    }
  });

  /* ============================================================
     PUT /api/github/settings
     Update user's GitHub settings
  ============================================================ */
  router.put("/settings", auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { auto_sync_enabled, sync_frequency, include_private_repos } = req.body;

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (typeof auto_sync_enabled === "boolean") {
        updates.push(`auto_sync_enabled = $${paramIndex}`);
        params.push(auto_sync_enabled);
        paramIndex++;
      }

      if (sync_frequency && ["hourly", "daily", "weekly"].includes(sync_frequency)) {
        updates.push(`sync_frequency = $${paramIndex}`);
        params.push(sync_frequency);
        paramIndex++;
      }

      if (typeof include_private_repos === "boolean") {
        updates.push(`include_private_repos = $${paramIndex}`);
        params.push(include_private_repos);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      params.push(userId);

      await databasePool.query(
        `UPDATE github_user_settings 
         SET ${updates.join(", ")}, updated_at = NOW()
         WHERE user_id = $${paramIndex}`,
        params
      );

      // Fetch updated settings
      const result = await databasePool.query(
        "SELECT id, github_username, auto_sync_enabled, sync_frequency, last_sync_at, sync_status, sync_error, created_at, updated_at FROM github_user_settings WHERE user_id = $1",
        [userId]
      );

      res.json({
        message: "Settings updated successfully",
        settings: result.rows[0] || null,
      });
    } catch (err) {
      console.error("❌ Error updating GitHub settings:", err);
      res.status(500).json({ error: "Failed to update GitHub settings" });
    }
  });

  return router;
}

// Export default router (production use)
const router = createGitHubRoutes();
export default router;

