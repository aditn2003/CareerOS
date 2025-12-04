# Career Goals Tracking Setup Guide

## Overview
The Career Goals feature allows users to set and track SMART career goals with progress monitoring, milestone celebrations, and personalized insights.

## Database Setup

### For Supabase Users:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/db/add_career_goals.sql`
4. Run the SQL script
5. Verify tables are created: `career_goals`, `goal_milestones`, `goal_progress_history`, `goal_achievements`

### For Local PostgreSQL:
```bash
psql -U your_username -d your_database -f backend/db/add_career_goals.sql
```

## Features Implemented

### ✅ SMART Goal Framework
- **Specific**: What exactly do you want to achieve?
- **Measurable**: How will you measure success?
- **Achievable**: Is this goal realistic?
- **Relevant**: Why is this goal important?
- **Time-bound**: When is the deadline?

### ✅ Goal Management
- Create, edit, and delete goals
- Set priorities (Low, Medium, High, Critical)
- Categorize goals (Salary, Role Level, Skills, Networking, etc.)
- Track progress with target and current values

### ✅ Progress Tracking
- Automatic progress percentage calculation
- Progress history tracking
- Visual progress bars
- Quick progress updates

### ✅ Milestone Celebrations
- Automatic milestone detection (25%, 50%, 75%, 100%)
- Achievement badges
- Early completion recognition
- Achievement history

### ✅ Insights & Recommendations
- Goal completion rate analysis
- Overdue goal detection
- Category performance insights
- Personalized recommendations

### ✅ Multiple Views
- **Active Goals**: Focus on current objectives
- **All Goals**: Complete goal history
- **Achievements**: Celebrate milestones
- **Insights & Recommendations**: Get personalized advice

## API Endpoints

- `GET /api/career-goals` - Get all goals
- `GET /api/career-goals/:id` - Get goal details
- `POST /api/career-goals` - Create new goal
- `PUT /api/career-goals/:id` - Update goal
- `DELETE /api/career-goals/:id` - Delete goal
- `GET /api/career-goals/analytics/insights` - Get analytics and insights

## Usage

1. Navigate to **Statistics** page
2. Click on **Career Goals** tab
3. Click **New Goal** to create a SMART goal
4. Fill in all required fields (Title, Specific, Measurable, Target Date)
5. Track progress by updating the current value
6. View achievements and insights in the respective tabs

## Goal Categories

- Salary
- Role Level
- Skills
- Networking
- Applications
- Interviews
- Offers
- Certifications
- Education
- Other

## Automatic Features

- Progress percentage auto-calculation
- Milestone achievement detection
- Status auto-update on completion
- Progress history recording
- Achievement generation

## Next Steps

After running the migration, restart your backend server and the Career Goals tab will be available in the Statistics page!

