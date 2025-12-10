# GitHub Integration - Complete Testing Guide & Feature Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Feature List](#feature-list)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Complete Workflow](#complete-workflow)
7. [Manual Testing Guide](#manual-testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The GitHub Integration feature allows users to:
- Connect their GitHub account
- Import and sync their repositories
- Showcase projects with detailed information
- Link repositories to skills
- Feature important repositories
- View contribution activity
- Handle private repositories securely

---

## ✨ Feature List

### 1. **GitHub Account Connection**
- **What it does**: Connects a GitHub account by storing the username
- **Location**: Profile → GitHub Tab
- **Requirements**: Valid GitHub username
- **Optional**: GitHub Personal Access Token (for private repos and higher rate limits)

### 2. **Repository Synchronization**
- **What it does**: Fetches all repositories from GitHub and stores them locally
- **Types**: Manual sync (button click) and Automatic sync (cron job - hourly)
- **Data synced**: Name, description, languages, stars, forks, watchers, privacy status, dates
- **Frequency**: Configurable (hourly, daily, weekly)

### 3. **Repository Display**
- **What it shows**: 
  - Repository name and description
  - Primary language and language breakdown
  - Stars, forks, watchers count
  - Last updated date
  - Private/Archived indicators
  - Featured badge
- **Filters**: By featured status, by language
- **Sorting**: By stars, updated date, created date, pushed date

### 4. **Featured Repositories**
- **What it does**: Allows users to mark important repositories as "featured"
- **Display**: Featured repos appear in a dedicated section at the top
- **Visual**: Yellow gradient background with star icon
- **Use case**: Highlight your best projects to potential employers

### 5. **Skills Linking**
- **What it does**: Links repositories to skills from your profile
- **How it works**: 
  - Click "Link Skills" on any repository
  - Select skills from your profile
  - Repository now shows linked skills
  - Skills can be unlinked individually
- **Use case**: Demonstrate which skills you used in each project

### 6. **Contribution Activity**
- **What it shows**: 
  - Total commits
  - Active days (days with commits)
  - Average commits per day
  - Longest commit streak
  - Lines added/deleted
- **Charts**: 
  - Commits over time (Area chart)
  - Code changes: Additions vs Deletions (Bar chart)
  - Net code changes (Line chart)
- **Periods**: Last 7, 30, 90, or 365 days
- **Note**: Requires contribution data to be collected (currently placeholder)

### 7. **Private Repository Handling**
- **What it does**: Controls whether private repositories are synced and displayed
- **Default**: Private repos are excluded
- **Requirement**: GitHub Personal Access Token required to access private repos
- **Security**: Private repos only shown if explicitly enabled AND token is present
- **Visual**: Lock icon on private repositories

### 8. **Statistics Dashboard**
- **What it shows**:
  - Total repositories
  - Featured repositories count
  - Total stars across all repos
  - Total commits (from contribution data)

---

## 🗄️ Database Schema

### Tables

#### `github_user_settings`
Stores user's GitHub connection and preferences:
- `user_id` (FK to users)
- `github_username` - GitHub username
- `github_token` - Encrypted personal access token (optional)
- `auto_sync_enabled` - Whether to auto-sync (boolean)
- `sync_frequency` - 'hourly', 'daily', or 'weekly'
- `include_private_repos` - Whether to include private repos (boolean)
- `last_sync_at` - Timestamp of last sync
- `sync_status` - 'pending', 'success', 'failed', 'in_progress'
- `sync_error` - Error message if sync failed

#### `github_repositories`
Stores repository data:
- `user_id` (FK to users)
- `repository_id` - GitHub's unique repository ID
- `name` - Repository name
- `full_name` - username/repo-name
- `description` - Repository description
- `html_url` - GitHub URL
- `language` - Primary language
- `languages` - JSONB with all languages and percentages
- `stars_count`, `forks_count`, `watchers_count`
- `is_private`, `is_fork`, `is_archived`, `is_featured`
- `created_at`, `updated_at`, `pushed_at` - GitHub timestamps
- `local_updated_at` - When we last updated locally

#### `github_repository_skills`
Many-to-many relationship between repositories and skills:
- `repository_id` (FK to github_repositories)
- `skill_id` (FK to skills)
- `user_id` (FK to users)

#### `github_contributions`
Stores daily contribution data (for future use):
- `user_id` (FK to users)
- `repository_id` (FK to github_repositories)
- `date` - Date of contribution
- `commit_count` - Number of commits
- `additions` - Lines added
- `deletions` - Lines deleted

---

## 🔌 API Endpoints

### Authentication
All endpoints require authentication via Bearer token in Authorization header.

### 1. `POST /api/github/connect`
**Purpose**: Connect GitHub account
**Body**: 
```json
{
  "github_username": "your-username"
}
```
**Response**: Success message

### 2. `POST /api/github/sync`
**Purpose**: Manually trigger repository sync
**Body**: Empty
**Response**: 
```json
{
  "message": "Sync completed",
  "summary": {
    "total_fetched": 25,
    "added": 5,
    "updated": 20,
    "skippedPrivate": 3,
    "errors": 0
  }
}
```

### 3. `GET /api/github/repositories`
**Purpose**: Get user's repositories
**Query Parameters**:
- `featured` (optional): "true" to filter featured only
- `language` (optional): Filter by primary language
- `sort` (optional): "stars", "updated", "created", "pushed" (default: "updated")
- `include_private` (optional): "true" to include private repos

**Response**:
```json
{
  "repositories": [
    {
      "id": 1,
      "name": "my-project",
      "description": "A cool project",
      "language": "JavaScript",
      "languages": {"JavaScript": 70, "TypeScript": 30},
      "stars_count": 42,
      "forks_count": 5,
      "is_private": false,
      "is_featured": true,
      "linked_skills": [
        {"id": 1, "name": "React", "category": "Frontend"}
      ]
    }
  ]
}
```

### 4. `GET /api/github/repositories/:repoId`
**Purpose**: Get single repository details
**Response**: Single repository object with linked skills

### 5. `PUT /api/github/repositories/:repoId/feature`
**Purpose**: Toggle featured status
**Response**: Updated repository

### 6. `POST /api/github/repositories/:repoId/skills`
**Purpose**: Link skills to repository
**Body**:
```json
{
  "skill_ids": [1, 2, 3]
}
```
**Response**: Success message

### 7. `DELETE /api/github/repositories/:repoId/skills/:skillId`
**Purpose**: Unlink a skill from repository
**Response**: Success message

### 8. `GET /api/github/stats`
**Purpose**: Get aggregated statistics
**Response**:
```json
{
  "repositories": {
    "total": 25,
    "featured": 5,
    "public": 20,
    "private": 5
  },
  "total_stars": 150,
  "total_forks": 30,
  "contributions": {
    "total_commits": 500
  }
}
```

### 9. `GET /api/github/settings`
**Purpose**: Get user's GitHub settings
**Response**:
```json
{
  "settings": {
    "github_username": "username",
    "auto_sync_enabled": true,
    "sync_frequency": "daily",
    "include_private_repos": false,
    "last_sync_at": "2024-01-15T10:30:00Z"
  }
}
```

### 10. `PUT /api/github/settings`
**Purpose**: Update GitHub settings
**Body**:
```json
{
  "auto_sync_enabled": true,
  "sync_frequency": "daily",
  "include_private_repos": false
}
```
**Response**: Updated settings

### 11. `GET /api/github/contributions`
**Purpose**: Get contribution activity
**Query Parameters**:
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string

**Response**:
```json
{
  "contributions": [
    {
      "date": "2024-01-15",
      "total_commits": 5,
      "total_additions": 200,
      "total_deletions": 50
    }
  ]
}
```

---

## 🎨 Frontend Components

### Main Component: `GitHubSection.jsx`
**Location**: `frontend/src/components/GitHubSection.jsx`
**Props**: `token` (authentication token)

**Features**:
- Connection status display
- Sync button
- Private repo toggle
- Statistics cards
- Featured repositories section
- Repository grid with filters
- Skills linking modal
- Contribution activity charts

### Styling: `GitHubSection.css`
**Location**: `frontend/src/components/GitHubSection.css`
**Features**: Complete styling for all GitHub UI elements

---

## 🔄 Complete Workflow

### Initial Setup

1. **User navigates to Profile → GitHub Tab**
   - If not connected: Shows "Connect GitHub" card
   - If connected: Shows connection status and repositories

2. **Connecting GitHub Account**
   - User clicks "Connect GitHub"
   - Enters GitHub username
   - Clicks "Connect"
   - System stores username in `github_user_settings`
   - User can optionally add GitHub Personal Access Token

3. **First Sync**
   - User clicks "Sync Repositories" button
   - System fetches repositories from GitHub API
   - For each repository:
     - Fetches detailed info (languages, etc.)
     - Normalizes data
     - Inserts or updates in database
   - Shows sync summary

4. **Viewing Repositories**
   - Repositories displayed in grid
   - Can filter by featured status or language
   - Can sort by stars, updated, created, or pushed date
   - Private repos shown only if enabled and token present

### Daily Usage

1. **Automatic Sync** (if enabled)
   - Cron job runs hourly (or configured frequency)
   - Fetches updated repository data
   - Updates local database
   - No user action required

2. **Manual Sync**
   - User clicks "Sync Repositories"
   - Same process as first sync
   - Shows updated counts

3. **Managing Repositories**
   - **Feature a repo**: Click star icon on repository card
   - **Link skills**: Click "Link Skills" → Select skills → Save
   - **Unlink skill**: Click X on skill tag
   - **View on GitHub**: Click "View on GitHub" link

4. **Viewing Statistics**
   - Statistics cards show at top
   - Updates automatically after sync

5. **Contribution Activity** (when data available)
   - Select time period (7, 30, 90, 365 days)
   - View charts and statistics
   - See commit trends and code changes

### Private Repository Workflow

1. **Enabling Private Repos**
   - User toggles "Include Private Repositories" checkbox
   - If no token: Shows warning, prevents enabling
   - If token exists: Enables successfully
   - Repositories reload to include private ones

2. **Syncing Private Repos**
   - System uses token to fetch private repositories
   - Private repos marked with lock icon
   - Filtered based on user preference

3. **Disabling Private Repos**
   - User unchecks "Include Private Repositories"
   - Private repos hidden from view
   - Still stored in database but not displayed

---

## 🧪 Manual Testing Guide

### Prerequisites
1. Database migrations run:
   ```bash
   cd backend/db
   node run_github_migration.js
   node run_private_repo_migration.js
   ```
2. Backend server running
3. Frontend running
4. User account logged in
5. (Optional) GitHub Personal Access Token

### Test Case 1: Connect GitHub Account

**Steps**:
1. Navigate to Profile → GitHub Tab
2. Verify "Connect GitHub" card is shown
3. Click "Connect GitHub"
4. Enter a valid GitHub username (e.g., "octocat")
5. Click "Connect"
6. Verify success message
7. Verify connection status shows username

**Expected Results**:
- ✅ Connection card disappears
- ✅ Header shows "Connected as: [username]"
- ✅ Sync button appears
- ✅ Settings loaded

**Database Check**:
```sql
SELECT * FROM github_user_settings WHERE user_id = [your_user_id];
```
Should show your username.

---

### Test Case 2: Manual Repository Sync

**Steps**:
1. Ensure GitHub account is connected
2. Click "Sync Repositories" button
3. Wait for sync to complete (may take 10-30 seconds)
4. Verify sync summary message

**Expected Results**:
- ✅ Button shows "Syncing..." during process
- ✅ Success message with summary (added, updated counts)
- ✅ Repositories appear in grid
- ✅ Statistics cards update

**Database Check**:
```sql
SELECT COUNT(*) FROM github_repositories WHERE user_id = [your_user_id];
```
Should show number of repositories.

**API Test**:
```bash
curl -X POST http://localhost:4000/api/github/sync \
  -H "Authorization: Bearer [your_token]"
```

---

### Test Case 3: View Repositories

**Steps**:
1. After sync, verify repositories are displayed
2. Check repository cards show:
   - Name
   - Description
   - Language
   - Stars, forks, watchers
   - Last updated date
3. Verify private repos show lock icon (if any)
4. Verify archived repos show archive icon (if any)

**Expected Results**:
- ✅ All public repositories visible
- ✅ Correct information displayed
- ✅ Icons show for private/archived repos
- ✅ "View on GitHub" link works

---

### Test Case 4: Filter Repositories

**Steps**:
1. Click "Featured Only" filter
2. Verify only featured repos shown
3. Uncheck "Featured Only"
4. Select a language from dropdown
5. Verify only repos with that language shown
6. Change sort order (Stars, Updated, etc.)
7. Verify repositories reorder

**Expected Results**:
- ✅ Filters work correctly
- ✅ Sort order changes
- ✅ Featured section shows at top (if any featured)

---

### Test Case 5: Feature a Repository

**Steps**:
1. Find a repository card
2. Click the star icon (top right of card)
3. Verify star icon becomes filled/yellow
4. Verify "Featured" badge appears
5. Verify repository appears in "Featured Repositories" section
6. Click star again to unfeature
7. Verify it's removed from featured section

**Expected Results**:
- ✅ Star icon toggles correctly
- ✅ Featured badge appears/disappears
- ✅ Featured section updates
- ✅ Featured count in stats updates

**API Test**:
```bash
curl -X PUT http://localhost:4000/api/github/repositories/[repo_id]/feature \
  -H "Authorization: Bearer [your_token]"
```

**Database Check**:
```sql
SELECT * FROM github_repositories WHERE is_featured = true AND user_id = [your_user_id];
```

---

### Test Case 6: Link Skills to Repository

**Prerequisites**: User must have skills in their profile

**Steps**:
1. Click "Link Skills" button on a repository
2. Verify modal opens with list of your skills
3. Check multiple skills
4. Click "Save" or "Link Skills"
5. Verify modal closes
6. Verify skill tags appear on repository card
7. Click X on a skill tag to unlink
8. Verify skill removed

**Expected Results**:
- ✅ Modal shows all user skills
- ✅ Can select multiple skills
- ✅ Skills appear as tags on repo card
- ✅ Can unlink individual skills
- ✅ Changes persist after page refresh

**Database Check**:
```sql
SELECT s.name FROM skills s
JOIN github_repository_skills grs ON s.id = grs.skill_id
WHERE grs.repository_id = [repo_id] AND grs.user_id = [your_user_id];
```

**API Test**:
```bash
curl -X POST http://localhost:4000/api/github/repositories/[repo_id]/skills \
  -H "Authorization: Bearer [your_token]" \
  -H "Content-Type: application/json" \
  -d '{"skill_ids": [1, 2, 3]}'
```

---

### Test Case 7: Private Repository Handling

**Prerequisites**: 
- GitHub account with private repositories
- GitHub Personal Access Token (optional for this test)

**Steps**:
1. Verify "Include Private Repositories" checkbox is unchecked (default)
2. Sync repositories
3. Verify private repos are NOT shown
4. Check "Include Private Repositories" checkbox
5. If no token: Verify warning message appears, checkbox stays unchecked
6. If token exists: Verify checkbox enables
7. Sync again
8. Verify private repos now appear with lock icon
9. Uncheck "Include Private Repositories"
10. Verify private repos hidden again

**Expected Results**:
- ✅ Private repos excluded by default
- ✅ Warning shown if no token when trying to enable
- ✅ Private repos shown when enabled with token
- ✅ Lock icon on private repos
- ✅ Setting persists

**Database Check**:
```sql
SELECT include_private_repos FROM github_user_settings WHERE user_id = [your_user_id];
```

**API Test**:
```bash
# Get settings
curl http://localhost:4000/api/github/settings \
  -H "Authorization: Bearer [your_token]"

# Update settings
curl -X PUT http://localhost:4000/api/github/settings \
  -H "Authorization: Bearer [your_token]" \
  -H "Content-Type: application/json" \
  -d '{"include_private_repos": true}'
```

---

### Test Case 8: Statistics Display

**Steps**:
1. After syncing repositories, verify statistics cards show:
   - Total repositories count
   - Featured count
   - Total stars
   - Total commits (if contribution data available)
2. Feature/unfeature repos
3. Verify featured count updates
4. Sync new repos
5. Verify total count updates

**Expected Results**:
- ✅ All statistics accurate
- ✅ Updates in real-time
- ✅ Matches actual repository data

**API Test**:
```bash
curl http://localhost:4000/api/github/stats \
  -H "Authorization: Bearer [your_token]"
```

---

### Test Case 9: Contribution Activity (Placeholder)

**Note**: This feature requires contribution data collection to be implemented.

**Steps**:
1. Navigate to Contribution Activity section (if data exists)
2. Select different time periods (7, 30, 90, 365 days)
3. Verify charts update
4. Verify statistics cards show correct data
5. Verify charts render correctly:
   - Commits over time (Area chart)
   - Additions vs Deletions (Bar chart)
   - Net Code Changes (Line chart)

**Expected Results**:
- ✅ Section only shows if data exists
- ✅ Period selector works
- ✅ Charts render correctly
- ✅ Statistics accurate

**API Test**:
```bash
curl "http://localhost:4000/api/github/contributions?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer [your_token]"
```

---

### Test Case 10: Settings Management

**Steps**:
1. Navigate to GitHub section
2. Toggle "Include Private Repositories" (if token available)
3. Verify setting persists after page refresh
4. (Future: Test auto-sync settings when UI added)

**Expected Results**:
- ✅ Settings save correctly
- ✅ Persist across sessions
- ✅ Applied immediately

**API Test**:
```bash
# Get settings
curl http://localhost:4000/api/github/settings \
  -H "Authorization: Bearer [your_token]"

# Update settings
curl -X PUT http://localhost:4000/api/github/settings \
  -H "Authorization: Bearer [your_token]" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_sync_enabled": true,
    "sync_frequency": "daily",
    "include_private_repos": false
  }'
```

---

### Test Case 11: Error Handling

**Steps**:
1. Try to connect with invalid username
2. Verify error message shown
3. Try to sync with invalid token
4. Verify error handling
5. Try to access non-existent repository
6. Verify 404 handling

**Expected Results**:
- ✅ Clear error messages
- ✅ No crashes
- ✅ User can retry

---

### Test Case 12: Automatic Sync (Cron Job)

**Steps**:
1. Enable auto-sync in settings (if UI available)
2. Wait for cron job to run (hourly)
3. Check `last_sync_at` timestamp updates
4. Verify repositories updated

**Expected Results**:
- ✅ Cron job runs on schedule
- ✅ Repositories stay up to date
- ✅ No manual intervention needed

**Database Check**:
```sql
SELECT last_sync_at, sync_status FROM github_user_settings 
WHERE user_id = [your_user_id] AND auto_sync_enabled = true;
```

---

## 🐛 Troubleshooting

### Issue: Repositories not syncing

**Possible Causes**:
1. Invalid GitHub username
2. Rate limit exceeded
3. Network issues
4. Token expired (for private repos)

**Solutions**:
- Verify username is correct
- Check browser console for errors
- Wait for rate limit to reset
- Regenerate GitHub token if expired

### Issue: Private repos not showing

**Possible Causes**:
1. `include_private_repos` setting is false
2. No GitHub token provided
3. Token doesn't have repo scope

**Solutions**:
- Enable "Include Private Repositories" setting
- Add GitHub Personal Access Token
- Ensure token has `repo` scope

### Issue: Skills not linking

**Possible Causes**:
1. No skills in user profile
2. Database constraint violation
3. API error

**Solutions**:
- Add skills to profile first
- Check database for constraint errors
- Verify API response

### Issue: Contribution data not showing

**Possible Causes**:
1. Contribution data collection not implemented yet
2. No contribution data in database

**Solutions**:
- This is expected - contribution data collection is a placeholder
- Will be implemented in future update

### Issue: Sync fails with 403 error

**Possible Causes**:
1. GitHub API rate limit exceeded
2. Invalid token

**Solutions**:
- Wait for rate limit reset
- Use Personal Access Token for higher limits
- Check token validity

---

## 📊 Testing Checklist

Use this checklist to verify all features:

- [ ] Connect GitHub account
- [ ] Manual repository sync
- [ ] View repositories
- [ ] Filter by featured
- [ ] Filter by language
- [ ] Sort repositories
- [ ] Feature a repository
- [ ] Unfeature a repository
- [ ] Link skills to repository
- [ ] Unlink skill from repository
- [ ] View on GitHub link
- [ ] Private repo toggle (with token)
- [ ] Private repo toggle (without token - should warn)
- [ ] Statistics display
- [ ] Settings persistence
- [ ] Error handling
- [ ] Responsive design (mobile)
- [ ] Featured repositories section
- [ ] Contribution activity (if data available)

---

## 🔍 Database Verification Queries

Use these SQL queries to verify data:

```sql
-- Check user settings
SELECT * FROM github_user_settings WHERE user_id = [your_user_id];

-- Count repositories
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE is_featured = true) as featured,
       COUNT(*) FILTER (WHERE is_private = true) as private
FROM github_repositories WHERE user_id = [your_user_id];

-- Check linked skills
SELECT r.name, s.name as skill_name
FROM github_repositories r
JOIN github_repository_skills grs ON r.repository_id = grs.repository_id
JOIN skills s ON grs.skill_id = s.id
WHERE r.user_id = [your_user_id];

-- Check sync status
SELECT sync_status, last_sync_at, sync_error 
FROM github_user_settings 
WHERE user_id = [your_user_id];
```

---

## 📝 Notes

1. **Rate Limits**: GitHub API has rate limits (60 requests/hour without token, 5000/hour with token)
2. **Token Security**: Tokens are stored encrypted in database
3. **Sync Frequency**: Automatic sync runs hourly via cron job
4. **Contribution Data**: Currently placeholder - requires implementation of GitHub Stats API
5. **Private Repos**: Excluded by default for security
6. **Featured Repos**: Visual highlight for important projects

---

## 🚀 Next Steps for Full Implementation

1. **Contribution Data Collection**:
   - Implement GitHub Stats API integration
   - Collect daily commit data
   - Store in `github_contributions` table

2. **Enhanced Filtering**:
   - Filter by date range
   - Filter by multiple languages
   - Search by repository name

3. **Repository Details Page**:
   - Detailed view of single repository
   - Commit history
   - Pull requests
   - Issues

4. **Export Features**:
   - Export repository list as CSV
   - Generate portfolio PDF

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0

