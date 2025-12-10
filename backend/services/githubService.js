// backend/services/githubService.js
// GitHub API Integration Service
import axios from "axios";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Factory function for GitHub service
 * @param {Object} dbPool - Database connection pool (optional)
 */
export function createGitHubService(dbPool = null) {
  /**
   * Fetch user's public repositories from GitHub API
   * @param {string} username - GitHub username
   * @param {string} token - Optional GitHub personal access token
   * @returns {Promise<Array>} Array of repository objects
   */
  async function fetchUserRepositories(username, token = null) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ATS-Forces-App/1.0",
      };

      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const response = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos`, {
        headers,
        params: {
          type: "all", // Get all repos (public + private if token provided)
          sort: "updated",
          direction: "desc",
          per_page: 100, // Max per page
        },
        timeout: 15000,
      });

      return response.data || [];
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      }
      if (error.response?.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again later or use a personal access token.");
      }
      if (error.response?.status === 429) {
        const resetTime = error.response.headers["x-ratelimit-reset"];
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
        throw new Error(`GitHub API rate limit exceeded. Reset time: ${resetDate?.toLocaleString() || "unknown"}`);
      }
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Fetch repository details including languages
   * @param {string} username - GitHub username
   * @param {string} repoName - Repository name
   * @param {string} token - Optional GitHub personal access token
   * @returns {Promise<Object>} Repository details with languages
   */
  async function fetchRepositoryDetails(username, repoName, token = null) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ATS-Forces-App/1.0",
      };

      if (token) {
        headers.Authorization = `token ${token}`;
      }

      // Check rate limit first
      try {
        const rateLimitResponse = await axios.get(`${GITHUB_API_BASE}/rate_limit`, { headers });
        const rateLimit = rateLimitResponse.data.rate;
        if (rateLimit.remaining < 10) {
          const resetTime = new Date(rateLimit.reset * 1000);
          throw new Error(`GitHub API rate limit nearly exhausted. Remaining: ${rateLimit.remaining}. Resets at: ${resetTime.toLocaleString()}`);
        }
      } catch (rateError) {
        // If rate limit check fails, continue anyway (might be network issue)
        console.warn("⚠️ Could not check rate limit:", rateError.message);
      }

      // Fetch repository details
      const [repoResponse, languagesResponse] = await Promise.all([
        axios.get(`${GITHUB_API_BASE}/repos/${username}/${repoName}`, {
          headers,
          timeout: 15000,
        }),
        axios.get(`${GITHUB_API_BASE}/repos/${username}/${repoName}/languages`, {
          headers,
          timeout: 15000,
        }).catch(() => ({ data: {} })), // Languages endpoint may fail, continue without it
      ]);

      const repo = repoResponse.data;
      const languages = languagesResponse.data || {};

      // Calculate language percentages
      const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
      const languagePercentages = {};
      if (totalBytes > 0) {
        for (const [lang, bytes] of Object.entries(languages)) {
          languagePercentages[lang] = Math.round((bytes / totalBytes) * 100);
        }
      }

      return {
        ...repo,
        languages: languagePercentages,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Repository '${username}/${repoName}' not found`);
      }
      if (error.response?.status === 403) {
        // Check if it's a rate limit or access issue
        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          throw new Error(`GitHub API rate limit exceeded. Resets at: ${resetDate?.toLocaleString() || 'unknown'}`);
        }
        throw new Error(`Access denied to repository '${username}/${repoName}'. It may be private or you don't have permission.`);
      }
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
        throw new Error(`GitHub API rate limit exceeded. Resets at: ${resetDate?.toLocaleString() || 'unknown'}`);
      }
      throw new Error(`Failed to fetch repository details: ${error.message}`);
    }
  }

  /**
   * Normalize GitHub API repository data to our database schema
   * @param {Object} githubRepo - Repository object from GitHub API
   * @param {string} username - GitHub username
   * @returns {Object} Normalized repository data
   */
  function normalizeRepositoryData(githubRepo, username) {
    return {
      github_username: username,
      repository_id: githubRepo.id,
      name: githubRepo.name || "",
      full_name: githubRepo.full_name || `${username}/${githubRepo.name}`,
      description: githubRepo.description || null,
      url: githubRepo.url || null,
      html_url: githubRepo.html_url || null,
      clone_url: githubRepo.clone_url || null,
      language: githubRepo.language || null,
      languages: githubRepo.languages || null, // Should be JSONB object with percentages
      stars_count: githubRepo.stargazers_count || 0,
      forks_count: githubRepo.forks_count || 0,
      watchers_count: githubRepo.watchers_count || 0,
      is_private: githubRepo.private || false,
      is_fork: githubRepo.fork || false,
      is_archived: githubRepo.archived || false,
      default_branch: githubRepo.default_branch || "main",
      created_at: githubRepo.created_at ? new Date(githubRepo.created_at) : null,
      updated_at: githubRepo.updated_at ? new Date(githubRepo.updated_at) : null,
      pushed_at: githubRepo.pushed_at ? new Date(githubRepo.pushed_at) : null,
    };
  }

  /**
   * Check GitHub API rate limit status
   * @param {string} token - Optional GitHub personal access token
   * @returns {Promise<Object>} Rate limit information
   */
  async function checkRateLimit(token = null) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ATS-Forces-App/1.0",
      };

      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const response = await axios.get(`${GITHUB_API_BASE}/rate_limit`, {
        headers,
        timeout: 5000,
      });

      return response.data.rate || {};
    } catch (error) {
      console.warn("Failed to check rate limit:", error.message);
      return { remaining: 0, limit: 0, reset: 0 };
    }
  }

  /**
   * Fetch contribution statistics for a repository
   * Uses GitHub Commits API to get commits and aggregate by day
   * @param {string} username - GitHub username
   * @param {string} repoName - Repository name
   * @param {string} token - Optional GitHub personal access token
   * @param {number} daysBack - Number of days to look back (default: 365)
   * @returns {Promise<Array>} Array of contribution data with date, commit_count, additions, deletions
   */
  async function fetchRepositoryContributions(username, repoName, token = null, daysBack = 365) {
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ATS-Forces-App/1.0",
      };

      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysBack);
      const sinceISO = sinceDate.toISOString();

      // Fetch commits from the last N days
      const commits = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore && commits.length < 1000) { // Limit to 1000 commits to avoid rate limits
        try {
          const response = await axios.get(
            `${GITHUB_API_BASE}/repos/${username}/${repoName}/commits`,
            {
              headers,
              params: {
                since: sinceISO,
                per_page: perPage,
                page: page,
              },
              timeout: 15000,
            }
          );

          if (response.data && response.data.length > 0) {
            commits.push(...response.data);
            if (response.data.length < perPage) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.warn(`Repository ${username}/${repoName} not found or no access`);
            return [];
          }
          throw error;
        }
      }

      console.log(`📊 Fetched ${commits.length} commits for ${username}/${repoName}`);

      // Aggregate commits by date
      const contributionsByDate = {};
      
      for (const commit of commits) {
        const commitDate = new Date(commit.commit.author.date).toISOString().split("T")[0];
        
        if (!contributionsByDate[commitDate]) {
          contributionsByDate[commitDate] = {
            date: commitDate,
            commit_count: 0,
            additions: 0,
            deletions: 0,
          };
        }
        
        contributionsByDate[commitDate].commit_count++;

        // Try to get stats from commit details (if available)
        // Note: This requires an additional API call per commit, which is rate-limited
        // For now, we'll just count commits. Stats can be fetched separately if needed.
      }

      const result = Object.values(contributionsByDate).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      console.log(`✅ Aggregated ${result.length} days of contribution data for ${username}/${repoName}`);
      return result;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Repository ${username}/${repoName} not found`);
        return [];
      }
      if (error.response?.status === 403 || error.response?.status === 429) {
        console.warn(`Rate limit or access denied for ${username}/${repoName}`);
        return [];
      }
      console.error(`Error fetching contributions for ${username}/${repoName}:`, error.message);
      return [];
    }
  }

  return {
    fetchUserRepositories,
    fetchRepositoryDetails,
    normalizeRepositoryData,
    checkRateLimit,
    fetchRepositoryContributions,
  };
}

// Export default instance
export default createGitHubService();

