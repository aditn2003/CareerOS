// backend/services/githubSyncService.js
// GitHub Repository Synchronization Service
import pool from "../db/pool.js";
import { createGitHubService } from "./githubService.js";
import { decryptToken } from "../utils/tokenEncryption.js";

const githubService = createGitHubService();

/**
 * Sync repositories for a single user
 * @param {number} userId - User ID
 * @param {Object} settings - User's GitHub settings
 * @returns {Promise<Object>} Sync result
 */
async function syncUserRepositories(userId, settings) {
  const { github_username, github_token, include_private_repos = false } = settings;

  if (!github_username) {
    return {
      success: false,
      error: "GitHub username not set",
    };
  }

  // Decrypt token if it exists
  const decryptedToken = github_token ? decryptToken(github_token) : null;

  // Validate private repo access
  if (include_private_repos && !decryptedToken) {
    return {
      success: false,
      error: "GitHub personal access token is required to sync private repositories. Please add a token in your GitHub settings.",
    };
  }

  try {
    // Update sync status to in_progress
    await pool.query(
      `UPDATE github_user_settings 
       SET sync_status = 'in_progress', sync_error = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // Fetch repositories from GitHub
    const repositories = await githubService.fetchUserRepositories(
      github_username,
      decryptedToken || null,
      userId
    );

    // Filter private repositories based on user preference
    const filteredRepositories = include_private_repos
      ? repositories // Include all repos (public + private)
      : repositories.filter((repo) => !repo.private); // Only public repos

    let added = 0;
    let updated = 0;
    let errors = [];
    let skippedPrivate = 0;

    // Process each repository
    for (let i = 0; i < filteredRepositories.length; i++) {
      const repo = filteredRepositories[i];
      
      // Add delay between requests to avoid rate limits (except for first request)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between repos
      }

      try {
        // Fetch detailed info including languages
        let repoDetails;
        let useBasicData = false;
        try {
          repoDetails = await githubService.fetchRepositoryDetails(
            github_username,
            repo.name,
            decryptedToken || null,
            userId
          );
        } catch (detailError) {
          // If we can't get details (403, 404, etc.), use basic repo info
          if (detailError.response?.status === 403) {
            console.warn(`⚠️ Access denied for ${repo.name} (403). Using basic repository info.`);
            // Use basic repo data from the list - normalize it
            useBasicData = true;
            repoDetails = repo;
          } else if (detailError.response?.status === 404) {
            console.warn(`⚠️ Repository ${repo.name} not found (404). Skipping.`);
            continue; // Skip this repo entirely
          } else {
            // For other errors, try to continue with basic data
            console.warn(`⚠️ Error fetching details for ${repo.name}: ${detailError.message}. Using basic info.`);
            useBasicData = true;
            repoDetails = repo;
          }
        }

        const normalized = githubService.normalizeRepositoryData(repoDetails, github_username);
        
        // If we used basic data, some fields might be missing - set defaults
        if (useBasicData) {
          normalized.languages = normalized.languages || {};
          normalized.description = normalized.description || repo.description || null;
        }

        // Check if repository already exists
        const existing = await pool.query(
          "SELECT id FROM github_repositories WHERE user_id = $1 AND repository_id = $2",
          [userId, normalized.repository_id]
        );

        if (existing.rows.length > 0) {
          // Update existing repository
          await pool.query(
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
          await pool.query(
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

        // Fetch and store contribution data for this repository (only if we have access)
        // Skip if we got a 403 error earlier (useBasicData flag)
        if (!useBasicData) {
          try {
            // Add small delay before contribution fetch
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log(`🔄 Fetching contributions for ${github_username}/${repo.name}...`);
            const contributions = await githubService.fetchRepositoryContributions(
              github_username,
              repo.name,
              decryptedToken || null,
              365, // Last 365 days
              userId
            );
            
            console.log(`📊 Received ${contributions?.length || 0} contribution records for ${repo.name}`);

            // Store contribution data in database
            if (contributions && contributions.length > 0) {
              let storedCount = 0;
              for (const contribution of contributions) {
                try {
                  await pool.query(
                    `INSERT INTO github_contributions 
                     (user_id, repository_id, date, commit_count, additions, deletions)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (user_id, repository_id, date) 
                     DO UPDATE SET 
                       commit_count = EXCLUDED.commit_count,
                       additions = EXCLUDED.additions,
                       deletions = EXCLUDED.deletions`,
                    [
                      userId,
                      normalized.repository_id,
                      contribution.date,
                      contribution.commit_count || 0,
                      contribution.additions || 0,
                      contribution.deletions || 0,
                    ]
                  );
                  storedCount++;
                } catch (dbError) {
                  console.error(`❌ Error storing contribution for ${repo.name} on ${contribution.date}:`, dbError.message);
                }
              }
              console.log(`✅ Stored ${storedCount}/${contributions.length} days of contribution data for ${repo.name}`);
            } else {
              console.log(`ℹ️ No contribution data to store for ${repo.name} (may have no commits in last 365 days)`);
            }
          } catch (contribError) {
            // Don't fail the entire sync if contribution fetch fails
            if (contribError.response?.status === 403) {
              console.warn(`⚠️ Access denied for contributions in ${repo.name} (403). Skipping.`);
            } else {
              console.warn(`⚠️ Could not fetch contributions for ${repo.name}:`, contribError.message);
            }
          }
        } else {
          console.warn(`⚠️ Skipping contribution fetch for ${repo.name} due to access restrictions.`);
        }
      } catch (repoError) {
        console.error(`❌ Error processing repository ${repo.name} for user ${userId}:`, repoError.message);
        errors.push({ repository: repo.name, error: repoError.message });
      }
    }

    // Update sync status to success
    await pool.query(
      `UPDATE github_user_settings 
       SET sync_status = 'success', last_sync_at = NOW(), sync_error = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    return {
      success: true,
      summary: {
        total_fetched: filteredRepositories.length,
        added,
        updated,
        skippedPrivate: include_private_repos ? 0 : repositories.length - filteredRepositories.length,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error(`❌ Error syncing repositories for user ${userId}:`, err);

    // Update sync status to failed
    try {
      await pool.query(
        `UPDATE github_user_settings 
         SET sync_status = 'failed', sync_error = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [err.message, userId]
      );
    } catch (updateError) {
      console.error("Failed to update sync status:", updateError);
    }

    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Check if a user's repositories need to be synced based on sync_frequency
 * @param {Object} settings - User's GitHub settings
 * @returns {boolean} True if sync is needed
 */
function shouldSync(settings) {
  if (!settings.auto_sync_enabled) {
    return false;
  }

  if (!settings.last_sync_at) {
    return true; // Never synced, should sync
  }

  const lastSync = new Date(settings.last_sync_at);
  const now = new Date();
  const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

  switch (settings.sync_frequency) {
    case "hourly":
      return hoursSinceSync >= 1;
    case "daily":
      return hoursSinceSync >= 24;
    case "weekly":
      return hoursSinceSync >= 168; // 7 days
    default:
      return hoursSinceSync >= 24; // Default to daily
  }
}

/**
 * Sync repositories for all users with auto-sync enabled
 * @returns {Promise<Object>} Summary of sync results
 */
async function syncAllUsers() {
  try {
    console.log("🔄 Starting GitHub repository sync for all users...");

    // Get all users with auto-sync enabled
    const result = await pool.query(
      `SELECT user_id, github_username, github_token, auto_sync_enabled, 
              sync_frequency, last_sync_at, include_private_repos
       FROM github_user_settings
       WHERE auto_sync_enabled = true 
         AND github_username IS NOT NULL
         AND github_username != ''`
    );

    // Decrypt tokens for all users
    const usersWithDecryptedTokens = result.rows.map(row => ({
      ...row,
      github_token: row.github_token ? decryptToken(row.github_token) : null,
    }));

    if (usersWithDecryptedTokens.length === 0) {
      console.log("✅ No users with auto-sync enabled");
      return {
        success: true,
        users_processed: 0,
        users_synced: 0,
        users_skipped: 0,
      };
    }

    console.log(`📋 Found ${usersWithDecryptedTokens.length} users with auto-sync enabled`);

    let usersSynced = 0;
    let usersSkipped = 0;
    const errors = [];

    for (const settings of usersWithDecryptedTokens) {
      const userId = settings.user_id;

      // Check if sync is needed based on frequency
      if (!shouldSync(settings)) {
        console.log(`⏭️  Skipping user ${userId} (${settings.github_username}): sync not due yet`);
        usersSkipped++;
        continue;
      }

      console.log(`🔄 Syncing repositories for user ${userId} (${settings.github_username})...`);

      const syncResult = await syncUserRepositories(userId, settings);

      if (syncResult.success) {
        usersSynced++;
        console.log(
          `✅ User ${userId} synced: ${syncResult.summary.added} added, ${syncResult.summary.updated} updated`
        );
      } else {
        errors.push({
          user_id: userId,
          github_username: settings.github_username,
          error: syncResult.error,
        });
        console.error(`❌ Failed to sync user ${userId}: ${syncResult.error}`);
      }

      // Add a small delay between users to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `✅ GitHub sync completed: ${usersSynced} synced, ${usersSkipped} skipped, ${errors.length} errors`
    );

    return {
      success: true,
      users_processed: usersWithDecryptedTokens.length,
      users_synced: usersSynced,
      users_skipped: usersSkipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error("❌ Error in syncAllUsers:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

export { syncUserRepositories, syncAllUsers, shouldSync };

