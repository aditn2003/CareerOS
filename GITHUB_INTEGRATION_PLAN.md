# GitHub Integration Implementation Plan

## Overview
Add a "GitHub" tab to the profile page that integrates with GitHub API to showcase user's repositories, contribution activity, and link them to skills.

---

## Stage 1: Database Schema & Setup
**Goal**: Create database tables to store GitHub data

### Tasks:
1. **Create `github_repositories` table**
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (INTEGER REFERENCES users(id))
   - `github_username` (VARCHAR) - User's GitHub username
   - `repository_id` (BIGINT) - GitHub repo ID (unique identifier)
   - `name` (VARCHAR) - Repository name
   - `full_name` (VARCHAR) - Full repo name (username/repo)
   - `description` (TEXT) - Repository description
   - `url` (VARCHAR) - GitHub URL
   - `html_url` (VARCHAR) - GitHub HTML URL
   - `clone_url` (VARCHAR) - Clone URL
   - `language` (VARCHAR) - Primary language
   - `languages` (JSONB) - All languages with percentages
   - `stars_count` (INTEGER) - Number of stars
   - `forks_count` (INTEGER) - Number of forks
   - `watchers_count` (INTEGER) - Number of watchers
   - `is_private` (BOOLEAN) - Private/public status
   - `is_fork` (BOOLEAN) - Is it a fork
   - `is_featured` (BOOLEAN DEFAULT FALSE) - User-selected featured repos
   - `is_archived` (BOOLEAN) - Archived status
   - `default_branch` (VARCHAR) - Default branch name
   - `created_at` (TIMESTAMP) - GitHub creation date
   - `updated_at` (TIMESTAMP) - GitHub last update
   - `pushed_at` (TIMESTAMP) - Last push date
   - `local_created_at` (TIMESTAMP DEFAULT NOW()) - When added to our DB
   - `local_updated_at` (TIMESTAMP DEFAULT NOW()) - Last sync time
   - UNIQUE constraint on (user_id, repository_id)

2. **Create `github_contributions` table**
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (INTEGER REFERENCES users(id))
   - `repository_id` (BIGINT) - References github_repositories.repository_id
   - `date` (DATE) - Contribution date
   - `commit_count` (INTEGER) - Number of commits on that date
   - `additions` (INTEGER) - Lines added
   - `deletions` (INTEGER) - Lines deleted
   - `created_at` (TIMESTAMP DEFAULT NOW())
   - UNIQUE constraint on (user_id, repository_id, date)

3. **Create `github_repository_skills` table** (Many-to-many relationship)
   - `id` (SERIAL PRIMARY KEY)
   - `repository_id` (BIGINT) - References github_repositories.repository_id
   - `user_id` (INTEGER REFERENCES users(id))
   - `skill_id` (INTEGER REFERENCES skills(id))
   - `created_at` (TIMESTAMP DEFAULT NOW())
   - UNIQUE constraint on (repository_id, skill_id)

4. **Create `github_user_settings` table**
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (INTEGER UNIQUE REFERENCES users(id))
   - `github_username` (VARCHAR) - User's GitHub username
   - `github_token` (VARCHAR) - Encrypted GitHub personal access token (optional)
   - `auto_sync_enabled` (BOOLEAN DEFAULT TRUE) - Auto-sync repositories
   - `sync_frequency` (VARCHAR DEFAULT 'daily') - 'hourly', 'daily', 'weekly'
   - `last_sync_at` (TIMESTAMP) - Last successful sync
   - `sync_status` (VARCHAR) - 'success', 'failed', 'in_progress'
   - `sync_error` (TEXT) - Last error message if sync failed
   - `created_at` (TIMESTAMP DEFAULT NOW())
   - `updated_at` (TIMESTAMP DEFAULT NOW())

5. **Create indexes for performance**
   - Index on `github_repositories(user_id, is_featured)`
   - Index on `github_repositories(user_id, updated_at DESC)`
   - Index on `github_contributions(user_id, date DESC)`
   - Index on `github_repository_skills(repository_id)`
   - Index on `github_repository_skills(skill_id)`

6. **Create triggers**
   - Auto-update `updated_at` timestamp for `github_user_settings`

---

## Stage 2: Backend API Routes
**Goal**: Create API endpoints for GitHub integration

### Tasks:
1. **Create `backend/routes/github.js`**
   - Factory function pattern: `createGitHubRoutes(dbPool = null)`
   - Use shared database pool from `backend/db/pool.js`
   - Import `auth` middleware for authentication

2. **POST `/api/github/connect`** - Connect GitHub account
   - Accept `github_username` in request body
   - Validate username exists (optional: verify with GitHub API)
   - Store username in `github_user_settings`
   - Return success message

3. **POST `/api/github/sync`** - Manual sync repositories
   - Fetch user's public repositories from GitHub API
   - Use GitHub REST API: `GET https://api.github.com/users/{username}/repos`
   - Handle rate limiting (60 requests/hour for unauthenticated, 5000/hour with token)
   - Store/update repositories in `github_repositories` table
   - Update `last_sync_at` and `sync_status` in `github_user_settings`
   - Return sync summary (repos added, updated, errors)

4. **GET `/api/github/repositories`** - Get user's repositories
   - Fetch from `github_repositories` table
   - Support query params:
     - `featured=true` - Only featured repos
     - `language=JavaScript` - Filter by language
     - `sort=stars|updated|created` - Sort order
   - Return repository list with all stats

5. **GET `/api/github/repositories/:repoId`** - Get single repository details
   - Fetch repository by `repository_id`
   - Include contribution stats if available
   - Return full repository data

6. **PUT `/api/github/repositories/:repoId/feature`** - Toggle featured status
   - Update `is_featured` boolean for repository
   - Return updated repository

7. **GET `/api/github/contributions`** - Get contribution activity
   - Fetch from `github_contributions` table
   - Support date range query params: `start_date`, `end_date`
   - Return contribution calendar data (commits per day)
   - Calculate commit frequency statistics

8. **POST `/api/github/repositories/:repoId/skills`** - Link repository to skills
   - Accept array of `skill_ids` in request body
   - Create/update entries in `github_repository_skills`
   - Return linked skills

9. **DELETE `/api/github/repositories/:repoId/skills/:skillId`** - Unlink skill from repository
   - Remove entry from `github_repository_skills`

10. **GET `/api/github/stats`** - Get GitHub statistics
    - Total repositories
    - Total stars
    - Total forks
    - Languages breakdown
    - Contribution streak
    - Most active repository

11. **Error Handling**
    - Handle GitHub API rate limits (429 errors)
    - Handle invalid usernames
    - Handle network errors
    - Return appropriate HTTP status codes and error messages

12. **Register route in `backend/server.js`**
    - Import `githubRoutes` from `./routes/github.js`
    - Add `app.use("/api/github", githubRoutes);`

---

## Stage 3: GitHub API Integration Service
**Goal**: Create a service layer for GitHub API calls

### Tasks:
1. **Create `backend/services/githubService.js`**
   - Factory function: `createGitHubService(dbPool = null)`

2. **Implement GitHub API client**
   - Use `axios` for HTTP requests
   - Base URL: `https://api.github.com`
   - Support optional authentication token (for higher rate limits)
   - Implement retry logic for rate limits (429 errors)

3. **Functions to implement:**
   - `fetchUserRepositories(username, token = null)` - Fetch all public repos
   - `fetchRepositoryDetails(username, repoName, token = null)` - Get single repo details
   - `fetchRepositoryLanguages(username, repoName, token = null)` - Get language breakdown
   - `fetchRepositoryContributors(username, repoName, token = null)` - Get contributors (optional)
   - `normalizeRepositoryData(githubRepo)` - Transform GitHub API response to our schema

4. **Rate Limit Handling**
   - Check `X-RateLimit-Remaining` header
   - Implement exponential backoff for 429 errors
   - Log rate limit status

5. **Data Normalization**
   - Map GitHub API response fields to our database schema
   - Handle null/undefined values
   - Extract and parse language data
   - Format dates consistently

---

## Stage 4: Frontend Components
**Goal**: Create UI components for GitHub tab

### Tasks:
1. **Add GitHub tab to ProfileNavBar**
   - Add `{ key: "github", label: "GitHub" }` to tabs array in `ProfileNavBar.jsx`

2. **Create `frontend/src/pages/Profile/GitHubTab.jsx`**
   - Main component for GitHub tab
   - State management:
     - `repositories` - List of repositories
     - `loading` - Loading state
     - `error` - Error message
     - `githubUsername` - Connected GitHub username
     - `stats` - GitHub statistics
     - `contributions` - Contribution data

3. **Create `frontend/src/components/GitHubConnect.jsx`**
   - Form to enter GitHub username
   - "Connect GitHub" button
   - Display connection status
   - "Sync Repositories" button

4. **Create `frontend/src/components/GitHubRepositoryList.jsx`**
   - Display list of repositories in cards
   - Show: name, description, language, stars, forks, last updated
   - "Featured" toggle button for each repo
   - Filter by language dropdown
   - Sort options (stars, updated, created)
   - Search/filter input

5. **Create `frontend/src/components/GitHubRepositoryCard.jsx`**
   - Individual repository card component
   - Display repository stats (stars, forks, language)
   - Featured badge/indicator
   - "View on GitHub" link
   - "Link to Skills" button/modal
   - Last updated date

6. **Create `frontend/src/components/GitHubStats.jsx`**
   - Display overall statistics:
     - Total repositories
     - Total stars
     - Total forks
     - Languages pie chart (using Recharts)
     - Contribution activity graph

7. **Create `frontend/src/components/GitHubContributions.jsx`**
   - Contribution calendar (heatmap)
   - Commit frequency chart
   - Daily/weekly/monthly breakdown
   - Use Recharts for visualization

8. **Create `frontend/src/components/GitHubSkillLinker.jsx`**
   - Modal/dropdown to link repository to skills
   - Multi-select skill picker
   - Display currently linked skills
   - Save/unlink functionality

9. **Add route in `ProfileLayout.jsx`**
   - Import `GitHubTab`
   - Add `<Route path="github" element={<GitHubTab />} />`

10. **Create `frontend/src/pages/Profile/GitHubTab.css`**
    - Styles for GitHub tab components
    - Repository card styling
    - Stats visualization styling
    - Contribution calendar styling

---

## Stage 5: Data Synchronization
**Goal**: Implement periodic repository updates

### Tasks:
1. **Create sync function in `githubService.js`**
   - `syncUserRepositories(userId, username, token = null)`
   - Fetch latest repositories from GitHub
   - Compare with existing data
   - Update changed repositories
   - Insert new repositories
   - Mark deleted repositories (optional: soft delete)

2. **Create background job/cron task**
   - Option 1: Use `node-cron` package (already in use for deadlines)
   - Option 2: Create manual sync endpoint that can be called
   - Sync repositories based on `sync_frequency` setting
   - Run daily sync for users with `auto_sync_enabled = true`

3. **Implement sync logic**
   - Check `last_sync_at` vs `sync_frequency`
   - Only sync if enough time has passed
   - Update `sync_status` during sync
   - Handle errors gracefully
   - Log sync results

4. **Add manual sync button in UI**
   - "Sync Now" button in GitHubTab
   - Show sync status (in progress, last sync time)
   - Display sync errors if any

---

## Stage 6: Skills Linking
**Goal**: Link repositories to user skills

### Tasks:
1. **Auto-detect skills from repository languages**
   - When repository is synced, extract languages
   - Match languages to existing skills in user's profile
   - Suggest skill links (user can approve/reject)

2. **Manual skill linking UI**
   - In repository card, show "Link Skills" button
   - Open modal with skill selector
   - Display current linked skills
   - Allow adding/removing skill links

3. **Display linked skills in repository card**
   - Show skill badges/tags
   - Click to navigate to skills tab

4. **Reverse view: Show repositories in Skills tab**
   - In SkillsTab, show linked repositories for each skill
   - Display repository cards with stats

---

## Stage 7: Featured Repositories
**Goal**: Allow users to select featured repositories

### Tasks:
1. **Featured toggle in repository card**
   - Checkbox or star icon to mark as featured
   - Update `is_featured` via API

2. **Featured repositories section**
   - Separate section showing only featured repos
   - Limit to 6-8 featured repos (optional)
   - Prominent display at top of GitHub tab

3. **Use featured repos in profile/resume**
   - Display featured repos in profile dashboard
   - Option to include in resume generation
   - Show in public profile views (if applicable)

---

## Stage 8: Contribution Activity
**Goal**: Display contribution statistics and activity

### Tasks:
1. **Fetch contribution data**
   - Use GitHub API: `GET /repos/{owner}/{repo}/stats/contributors` (if authenticated)
   - Or use GitHub GraphQL API for contribution calendar
   - Store daily contribution data in `github_contributions` table

2. **Contribution calendar visualization**
   - Heatmap showing commits per day
   - Color intensity based on commit count
   - Hover to show exact commit count

3. **Contribution statistics**
   - Total commits
   - Commit streak (consecutive days)
   - Most active day of week
   - Most active repository
   - Commit frequency trend (chart)

4. **Display in GitHubTab**
   - Contribution calendar component
   - Statistics cards
   - Activity timeline

---

## Stage 9: Private Repository Handling
**Goal**: Handle private repositories appropriately

### Tasks:
1. **GitHub Personal Access Token (PAT)**
   - Add input field for GitHub token (optional)
   - Store encrypted token in `github_user_settings`
   - Use token for authenticated API calls (higher rate limits, access to private repos)

2. **Private repository detection**
   - Mark `is_private = true` in database
   - Option 1: Exclude from display by default
   - Option 2: Show with "Private" badge, allow user to include/exclude
   - Option 3: Only show if user has provided token

3. **Token security**
   - Encrypt token before storing (use `crypto` or similar)
   - Never return token in API responses
   - Clear token option in settings

---

## Stage 10: Testing & Polish
**Goal**: Test and refine the feature

### Tasks:
1. **Error handling**
   - Test with invalid GitHub usernames
   - Test with rate limit scenarios
   - Test with network failures
   - Test with empty repository lists

2. **UI/UX improvements**
   - Loading states for all async operations
   - Empty states (no repos, not connected)
   - Error messages with retry options
   - Success notifications

3. **Performance optimization**
   - Lazy load contribution data
   - Paginate repository list if many repos
   - Cache repository data
   - Optimize database queries

4. **Documentation**
   - Add comments to code
   - Update API documentation
   - User guide for GitHub integration

---

## Implementation Order (Recommended)

1. **Stage 1** - Database schema (foundation)
2. **Stage 3** - GitHub API service (core functionality)
3. **Stage 2** - Backend API routes (connect service to DB)
4. **Stage 4** - Frontend components (basic UI)
5. **Stage 5** - Data synchronization (keep data fresh)
6. **Stage 6** - Skills linking (enhancement)
7. **Stage 7** - Featured repositories (enhancement)
8. **Stage 8** - Contribution activity (enhancement)
9. **Stage 9** - Private repo handling (edge case)
10. **Stage 10** - Testing & polish (final touches)

---

## Technical Considerations

### GitHub API Rate Limits:
- **Unauthenticated**: 60 requests/hour per IP
- **Authenticated**: 5,000 requests/hour per token
- **Best Practice**: Use token when available, implement caching

### GitHub API Endpoints Needed:
- `GET /users/{username}/repos` - List user repositories
- `GET /repos/{owner}/{repo}` - Get repository details
- `GET /repos/{owner}/{repo}/languages` - Get language breakdown
- `GET /repos/{owner}/{repo}/stats/contributors` - Get contribution stats (if authenticated)
- GraphQL API for contribution calendar (alternative)

### Dependencies:
- `axios` - HTTP client (already in use)
- `node-cron` - Scheduled tasks (already in use)
- `recharts` - Data visualization (already in use)
- `crypto` - Token encryption (Node.js built-in)

---

## Acceptance Criteria Checklist

- [ ] Integrate with GitHub API (free tier)
- [ ] Import user's public repositories with descriptions and stats
- [ ] Display repository languages, stars, forks, and last update
- [ ] Allow selection of featured repositories for profile
- [ ] Show contribution activity and commit frequency
- [ ] Link repositories to relevant skills in profile
- [ ] Update repository data periodically
- [ ] Handle private repositories appropriately (exclude or request access)

---

## Estimated Timeline

- **Stage 1**: 1-2 hours
- **Stage 2**: 2-3 hours
- **Stage 3**: 2-3 hours
- **Stage 4**: 4-5 hours
- **Stage 5**: 2-3 hours
- **Stage 6**: 2-3 hours
- **Stage 7**: 1-2 hours
- **Stage 8**: 3-4 hours
- **Stage 9**: 2-3 hours
- **Stage 10**: 2-3 hours

**Total**: ~22-30 hours

---

## Notes

- Start with public repositories only (no token required)
- Add token support later for private repos and higher rate limits
- Contribution calendar may require GraphQL API or third-party service
- Consider using GitHub's GraphQL API for more efficient data fetching
- Cache repository data to reduce API calls
- Implement incremental sync (only fetch changed repos)

