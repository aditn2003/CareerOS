# Time Investment Page - Data Sources

## Overview
The Time Investment page pulls data from **multiple database tables** to calculate your job search activity and time spent.

## Data Sources

### 1. **Jobs Table** (`jobs`)
- **What it tracks**: All job applications
- **How it's used**:
  - Applications: Jobs with status `Applied`, `Interview`, `Offer`, `Rejected` = 30 min each
  - Research: Jobs with status `Interested` = 15 min each
  - Pipeline funnel: Counts by status (Interested → Applied → Interview → Offer)
- **Status values**: `Interested`, `Applied`, `Interview`, `Offer`, `Rejected`

### 2. **Application History Table** (`application_history`)
- **What it tracks**: Status change events with timestamps
- **How it's used**: 
  - Tracks when jobs moved between stages
  - Used for productivity patterns (hourly/daily activity)
  - Calculates time between stages

### 3. **Networking Activities Table** (`networking_activities`)
- **What it tracks**: Networking outreach, messages, follow-ups
- **How it's used**:
  - Uses `time_spent_minutes` field (actual tracked time)
  - Separates follow-ups from general networking
  - Counts toward total networking time

### 4. **Networking Events Table** (`networking_events`)
- **What it tracks**: Conferences, meetups, events attended
- **How it's used**:
  - Calculates duration from `event_start_time` and `event_end_time`
  - Defaults to 2 hours if times not specified
  - Counts toward events category

### 5. **Interview Outcomes Table** (`interview_outcomes`)
- **What it tracks**: Actual interviews with duration and prep time
- **How it's used**:
  - Uses `duration_minutes` for interview time
  - Uses `hours_prepared` for prep time
  - Counts toward interview category

### 6. **Mock Interview Sessions Table** (`mock_interview_sessions`)
- **What it tracks**: Practice interviews
- **How it's used**:
  - Estimates 45 minutes per mock interview
  - Counts toward interview prep category

### 7. **Technical Prep Sessions Table** (`technical_prep_sessions`)
- **What it tracks**: Coding practice, system design prep
- **How it's used**:
  - Uses `time_spent_seconds` converted to minutes
  - Counts toward skill development category

### 8. **Job Search Activities Table** (`job_search_activities`) ⭐ NEW
- **What it tracks**: Manual activity logging
- **How it's used**:
  - Uses actual `duration_minutes` from user input
  - Supports 16 activity types (application, research, networking, interview_prep, etc.)
  - Tracks energy level and productivity ratings
  - **REQUIRES MIGRATION**: Run `psql $DATABASE_URL -f backend/db/add_job_search_activities.sql`

## Why You Might See Zeros

### If ALL stats are zero:
1. **Check if you have jobs in the database**:
   ```sql
   SELECT COUNT(*) FROM jobs WHERE user_id = YOUR_USER_ID;
   ```

2. **Check job statuses**:
   ```sql
   SELECT DISTINCT status FROM jobs WHERE user_id = YOUR_USER_ID;
   ```
   - Jobs with status `Interested` count as research
   - Jobs with status `Applied`, `Interview`, `Offer`, `Rejected` count as applications

3. **Run the migration** (if manual activity logging doesn't work):
   ```bash
   psql $DATABASE_URL -f backend/db/add_job_search_activities.sql
   ```

### If some stats are zero but others show data:
- **Applications zero**: Check if jobs have status other than `Interested`
- **Networking zero**: Check `networking_activities` table has entries with `time_spent_minutes`
- **Interviews zero**: Check `interview_outcomes` table has entries
- **Events zero**: Check `networking_events` table has entries

## How to Add Data

### Automatic Tracking (from existing tables):
- **Applications**: Just add jobs with status `Applied` or higher
- **Interviews**: Add entries to `interview_outcomes` table
- **Networking**: Add entries to `networking_activities` with `time_spent_minutes`

### Manual Tracking (via form):
1. Click **"Log Activity"** button on Time Investment page
2. Fill in:
   - Activity type (16 options)
   - Duration in minutes
   - Date and optional time
   - Energy level (1-5)
   - Productivity rating (1-5)
3. Submit - data is saved to `job_search_activities` table

## Debugging

Check backend console logs for:
```
📊 Time Investment: Fetched X jobs for user Y
📊 Time Investment: Fetched X manual activities
📊 Time Investment Analytics:
  - Applications: X (Y min)
  - Interviews: X (Y min)
  ...
```

If you see warnings like "table may not exist", run the migration.

## Data Flow

```
User Action → Database Table → Backend Query → Aggregation → Frontend Display
     ↓              ↓                ↓              ↓              ↓
  Add Job    →   jobs table   →  Count by    →  Calculate   →  Show stats
  Log Time   →   job_search_  →  status      →  time spent  →  & charts
              activities      →  & duration  →  & patterns
```

