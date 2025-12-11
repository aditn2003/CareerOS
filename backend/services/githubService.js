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

      // When token is provided, use /user/repos endpoint to get private repos
      // This endpoint returns repos for the authenticated user (token owner)
      // We'll filter by username afterward if needed
      const endpoint = token 
        ? `${GITHUB_API_BASE}/user/repos`  // Authenticated user endpoint - returns private repos
        : `${GITHUB_API_BASE}/users/${username}/repos`; // Public endpoint - only public repos

      const response = await axios.get(endpoint, {
        headers,
        params: {
          type: "all", // Get all repos (public + private if token provided)
          sort: "updated",
          direction: "desc",
          per_page: 100, // Max per page
        },
        timeout: 15000,
      });

      let repos = response.data || [];

      // If using token endpoint, verify repos belong to the requested username
      // The /user/repos endpoint returns repos for the token owner, so we need to filter
      if (token) {
        // Get the authenticated user's login to verify
        try {
          const userResponse = await axios.get(`${GITHUB_API_BASE}/user`, {
            headers,
            timeout: 5000,
          });
          const tokenOwner = userResponse.data.login?.toLowerCase();
          const requestedUser = username.toLowerCase();
          
          // Check token scopes (if available in response headers)
          const scopes = userResponse.headers['x-oauth-scopes'] || 'unknown';
          console.log(`🔍 Token owner: ${tokenOwner}, Requested user: ${requestedUser}`);
          console.log(`🔑 Token scopes: ${scopes}`);
          console.log(`📦 Fetched ${repos.length} repos before filtering`);
          
          // Log repo ownership info for debugging
          const privateRepos = repos.filter(r => r.private === true);
          const publicRepos = repos.filter(r => r.private === false);
          console.log(`🔒 Private repos found: ${privateRepos.length}`);
          console.log(`🌐 Public repos found: ${publicRepos.length}`);
          
          if (privateRepos.length > 0) {
            console.log(`🔒 Private repo details:`, privateRepos.slice(0, 5).map(r => ({
              name: r.name,
              owner: r.owner?.login,
              private: r.private,
              full_name: r.full_name
            })));
          }
          
          // Check if token has repo scope
          if (!scopes.includes('repo') && privateRepos.length === 0) {
            console.warn(`⚠️ Token may not have 'repo' scope. Scopes: ${scopes}`);
            console.warn(`⚠️ To access private repos, token needs 'repo' scope`);
          }
          
          if (tokenOwner !== requestedUser) {
            console.warn(`⚠️ Token belongs to ${tokenOwner}, but username is ${requestedUser}. Filtering repos...`);
            const beforeFilter = repos.length;
            // Filter to only repos owned by the requested user
            repos = repos.filter(repo => {
              const repoOwner = repo.owner?.login?.toLowerCase();
              const matches = repoOwner === requestedUser || repo.full_name?.toLowerCase().startsWith(`${requestedUser}/`);
              return matches;
            });
            const afterPrivate = repos.filter(r => r.private === true).length;
            console.log(`📊 Filtered from ${beforeFilter} to ${repos.length} repos (${afterPrivate} private)`);
          } else {
            console.log(`✅ Token owner matches requested user, using all ${repos.length} repos`);
          }
        } catch (userError) {
          console.warn("⚠️ Could not verify token owner, filtering by username:", userError.message);
          // Fallback: filter by owner login
          const beforeFilter = repos.length;
          repos = repos.filter(repo => {
            const repoOwner = repo.owner?.login?.toLowerCase();
            return repoOwner === username.toLowerCase();
          });
          const afterPrivate = repos.filter(r => r.private === true).length;
          console.log(`📊 Fallback filtered from ${beforeFilter} to ${repos.length} repos (${afterPrivate} private)`);
        }
      }

      return repos;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Invalid GitHub token. Please check your personal access token.");
      }
      if (error.response?.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      }
      if (error.response?.status === 403) {
        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          const resetTime = error.response.headers["x-ratelimit-reset"];
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          throw new Error(`GitHub API rate limit exceeded. Reset time: ${resetDate?.toLocaleString() || "unknown"}`);
        }
        throw new Error("GitHub API access denied. Check your token permissions (needs 'repo' scope for private repos).");
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

      // Get authenticated user info first to filter commits by author
      // Use a shorter timeout and make it non-blocking
      let authenticatedUserLogin = null;
      if (token) {
        try {
          // Use Promise.race to enforce timeout more reliably
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          );
          
          const userResponse = await Promise.race([
            axios.get(`${GITHUB_API_BASE}/user`, {
              headers,
              timeout: 3000,
            }),
            timeoutPromise
          ]);
          
          authenticatedUserLogin = userResponse.data.login?.toLowerCase();
          console.log(`🔍 Authenticated user: ${authenticatedUserLogin}`);
        } catch (userError) {
          // Don't let this block the contribution fetch - use fallback
          console.warn(`⚠️ Could not get authenticated user info (using fallback):`, userError.message);
          // Fallback: use the username parameter
          authenticatedUserLogin = username.toLowerCase();
          console.log(`🔍 Using fallback username: ${authenticatedUserLogin}`);
        }
      } else {
        // Without token, use the username parameter
        authenticatedUserLogin = username.toLowerCase();
      }

      // Fetch commits from the last N days, filtered by author if we have authenticated user
      const commits = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore && commits.length < 1000) { // Limit to 1000 commits to avoid rate limits
        try {
          const params = {
            since: sinceISO,
            per_page: perPage,
            page: page,
          };
          
          // Add author parameter if we have authenticated user login
          // This filters commits server-side, reducing API calls
          if (authenticatedUserLogin && token) {
            params.author = authenticatedUserLogin;
          }

          const response = await axios.get(
            `${GITHUB_API_BASE}/repos/${username}/${repoName}/commits`,
            {
              headers,
              params,
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

      console.log(`📊 Fetched ${commits.length} commits for ${username}/${repoName}${authenticatedUserLogin && token ? ` (filtered by author: ${authenticatedUserLogin})` : ''}`);

      // Additional client-side filtering to ensure we only count user's commits
      // (GitHub API author parameter may not catch all cases, e.g., different git config names)
      const userCommits = commits.filter(commit => {
        const commitAuthor = commit.author?.login?.toLowerCase();
        
        // Primary match: GitHub username
        if (commitAuthor === authenticatedUserLogin) {
          return true;
        }
        
        // If no author info or doesn't match, exclude it
        // (This handles edge cases where API filtering didn't work)
        return false;
      });

      if (commits.length > userCommits.length) {
        console.log(`✅ Filtered to ${userCommits.length} commits by user ${authenticatedUserLogin} (out of ${commits.length} total)`);
      }

      // Helper function to convert UTC date to EST date string (YYYY-MM-DD)
      // This properly handles timezone conversion from UTC to America/New_York (EST/EDT)
      function convertToEST(utcDateString) {
        // Parse the UTC date string (e.g., "2024-12-09T23:30:00Z")
        const utcDate = new Date(utcDateString);
        
        // Use Intl.DateTimeFormat to get date parts in EST/EDT timezone
        // This automatically handles daylight saving time transitions
        const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        
        // Format returns YYYY-MM-DD directly
        return formatter.format(utcDate);
      }

      // Aggregate commits by date (in EST timezone)
      const contributionsByDate = {};
      
      for (const commit of userCommits) {
        // Get the UTC date string from GitHub API
        const utcDateString = commit.commit.author.date;
        
        // Convert commit date from UTC to EST before grouping
        const commitDate = convertToEST(utcDateString);
        
        // Debug logging for December 9th specifically - log ALL commits that convert to Dec 9 EST
        if (commitDate === '2024-12-09') {
          console.log(`🔍 Dec 9 EST conversion: UTC=${utcDateString} -> EST=${commitDate} (commit SHA: ${commit.sha?.substring(0, 7)})`);
        }
        // Also log commits from Dec 8-10 UTC to see what they convert to
        if (utcDateString.includes('2024-12-08') || utcDateString.includes('2024-12-09') || utcDateString.includes('2024-12-10')) {
          if (commitDate === '2024-12-09') {
            console.log(`⚠️ UTC commit converted to Dec 9 EST: UTC=${utcDateString} -> EST=${commitDate}`);
          }
        }
        
        if (!contributionsByDate[commitDate]) {
          contributionsByDate[commitDate] = {
            date: commitDate,
            commit_count: 0,
            additions: 0,
            deletions: 0,
          };
        }
        
        contributionsByDate[commitDate].commit_count++;
      }
      
      // Log summary of dates with contributions
      const datesWithCommits = Object.keys(contributionsByDate).filter(
        date => contributionsByDate[date].commit_count > 0
      ).sort();
      console.log(`📅 Contribution dates (EST): ${datesWithCommits.slice(-10).join(', ')}...`);

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

