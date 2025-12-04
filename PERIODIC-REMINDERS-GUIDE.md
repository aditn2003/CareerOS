# Periodic Check-in Reminders - Implementation Guide

**Status:** ✅ Backend APIs created
**Feature:** UC-093 Enhancement - Automatic periodic reminders for important contacts
**Date:** December 3, 2025

---

## Overview

The periodic check-in system automatically generates reminders for important contacts on a regular schedule (weekly, biweekly, monthly, or quarterly).

---

## How It Works

### System Flow

```
User Creates Recurring Check-in
    ↓
System Creates First Reminder Immediately
    ↓
Scheduler Runs Daily (cron job)
    ↓
Finds All Due Check-ins (next_reminder_date <= today)
    ↓
Creates New Reminders for Each Due Contact
    ↓
Calculates Next Reminder Date
    ↓
Updates Recurring Check-in Schedule
    ↓
User Receives Reminder on Schedule
```

---

## Database Schema

### `recurring_check_ins` Table

```sql
id                  - UUID primary key
user_id             - User's ID (links to auth.users)
contact_name        - Name of contact to check in with
contact_company     - Their company
frequency           - "weekly" | "biweekly" | "monthly" | "quarterly"
frequency_days      - Actual days between reminders (7, 14, 30, 90)
priority            - "high" | "medium" | "low"
last_reminder_date  - When last reminder was generated
next_reminder_date  - When next reminder should be generated
custom_message      - Optional custom message template
is_active          - Whether this schedule is active
created_at         - When schedule was created
updated_at         - Last update timestamp
```

**Indexes for Performance:**
- user_id (filter by user)
- next_reminder_date (find due reminders)
- is_active (only active schedules)

---

## API Endpoints

### 1. Create Recurring Check-in

```
POST /api/industry-contacts/recurring-check-ins
Authorization: Bearer [token]

Request Body:
{
  "contact_name": "Sarah Chen",
  "contact_company": "Google",
  "frequency": "weekly",           // weekly, biweekly, monthly, quarterly
  "priority": "high",              // high, medium, low
  "custom_message": "Optional custom message template"
}

Response (201):
{
  "success": true,
  "recurring_check_in": {
    "id": 1,
    "contact_name": "Sarah Chen",
    "frequency": "weekly",
    "next_reminder_date": "2025-12-10",
    "created_at": "2025-12-03T..."
  }
}
```

**What Happens:**
1. Creates recurring schedule
2. Generates first reminder immediately
3. Sets next_reminder_date based on frequency

---

### 2. Get All Recurring Check-ins

```
GET /api/industry-contacts/recurring-check-ins
Authorization: Bearer [token]

Response (200):
{
  "recurring_check_ins": [
    {
      "id": 1,
      "contact_name": "Sarah Chen",
      "contact_company": "Google",
      "frequency": "weekly",
      "priority": "high",
      "next_reminder_date": "2025-12-10",
      "last_reminder_date": "2025-12-03"
    },
    {
      "id": 2,
      "contact_name": "Mike Johnson",
      "contact_company": "Microsoft",
      "frequency": "monthly",
      "priority": "medium",
      "next_reminder_date": "2025-01-03"
    }
  ]
}
```

**Use Cases:**
- Show user's active check-in schedules
- Display summary of periodic reminders
- User can manage/update frequencies

---

### 3. Generate Periodic Reminders (Scheduler)

```
POST /api/industry-contacts/generate-periodic-reminders
Authorization: Bearer [token]

Response (200):
{
  "success": true,
  "reminders_generated": 3,
  "message": "Generated 3 periodic reminders"
}
```

**Important Notes:**
- This endpoint should be called by a scheduled job (cron)
- NOT meant to be called frequently by users
- Should run once daily (e.g., 8 AM UTC)
- Can be called with or without user context

---

### 4. Stop Recurring Check-ins

```
DELETE /api/industry-contacts/recurring-check-ins/:id
Authorization: Bearer [token]

Response (200):
{
  "success": true,
  "message": "Recurring check-in stopped"
}
```

**What Happens:**
- Sets `is_active = false`
- No more reminders generated
- Can be reactivated later if needed

---

## Implementation Options

### Option 1: Node-Cron (Simplest - Local)

```javascript
// In backend/server.js
import cron from 'node-cron';
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

// Run every day at 8 AM UTC
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily reminder generation...');
  const result = await generatePeriodicReminders();
  console.log(`Reminders generated: ${result.reminders_generated}`);
});
```

**Pros:** Simple, built-in to Node
**Cons:** Only works if server is always running

**Install:**
```bash
npm install node-cron
```

---

### Option 2: AWS Lambda (Cloud - Recommended)

Create a Lambda function that:
1. Gets all users with recurring check-ins
2. Calls `generatePeriodicReminders()` for each
3. Runs on a CloudWatch schedule (daily)

```javascript
import { generatePeriodicReminders } from './reminderScheduler.js';

export async function handler(event, context) {
  console.log('Lambda: Running periodic reminder generation');
  const result = await generatePeriodicReminders();
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
}
```

**Pros:** Serverless, guaranteed to run, no server dependency
**Cons:** Requires AWS setup

---

### Option 3: GitHub Actions / Cloud Scheduler

```yaml
# .github/workflows/daily-reminders.yml
name: Daily Reminder Generation
on:
  schedule:
    - cron: '0 8 * * *'  # 8 AM UTC daily

jobs:
  generate-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate periodic reminders
        run: |
          curl -X POST https://your-api.com/api/industry-contacts/generate-periodic-reminders \
            -H "Authorization: Bearer ${{ secrets.SCHEDULER_TOKEN }}"
```

**Pros:** Free, no extra infrastructure
**Cons:** Need to create special API token for scheduler

---

### Option 4: Bull Queue (Background Job Queue)

```javascript
import Queue from 'bull';
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

const reminderQueue = new Queue('periodic-reminders', process.env.REDIS_URL);

// Define the job
reminderQueue.process(async (job) => {
  const result = await generatePeriodicReminders();
  return result;
});

// Schedule it to run daily at 8 AM
reminderQueue.add(
  {},
  {
    repeat: {
      cron: '0 8 * * *'  // 8 AM UTC
    }
  }
);

reminderQueue.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.data}`);
});
```

**Pros:** Reliable, scalable, persists across restarts
**Cons:** Requires Redis

**Install:**
```bash
npm install bull redis
```

---

## Frequency Examples

### Weekly Check-ins
- Set frequency to `"weekly"`
- Generates reminders every 7 days
- Good for: Close contacts, key relationships
- Example: Sarah Chen (high priority)

### Biweekly Check-ins
- Set frequency to `"biweekly"`
- Generates reminders every 14 days
- Good for: Important but not urgent contacts
- Example: Mike Johnson

### Monthly Check-ins
- Set frequency to `"monthly"`
- Generates reminders every 30 days
- Good for: Broader network
- Example: Conference attendees, alumni

### Quarterly Check-ins
- Set frequency to `"quarterly"`
- Generates reminders every 90 days
- Good for: Extended network
- Example: Old colleagues, distant connections

---

## User Interface Flow

### Creating a Recurring Check-in

**Current Modal:**
```
Contact Name:         [Sarah Chen]
Company:              [Google]
Reminder Type:        [Check In dropdown] ← Pre-selected
Reminder Date:        [Date picker]
Custom Message:       [Text area]
[Set Reminder]
```

**Should Add:**
```
Contact Name:         [Sarah Chen]
Company:              [Google]
Reminder Type:        [Check In dropdown]
Frequency:            [Weekly / Biweekly / Monthly / Quarterly] ← NEW
Priority:             [High / Medium / Low dropdown] ← NEW
Custom Message:       [Text area]
[Set Recurring Reminder]  ← Changed label
```

---

### New "Recurring Reminders" Tab

Add a new tab to show active recurring schedules:

```
Recurring Check-in Schedules

[Contact]          [Frequency]    [Priority]  [Next Due]    [Actions]
Sarah Chen         Weekly         High        Dec 10        Edit | Stop
Mike Johnson       Monthly        Medium      Jan 3         Edit | Stop
Conference Leads   Quarterly      Low         Mar 3         Edit | Stop

[+ Add New Recurring Schedule]
```

---

## Example Workflow

### Day 1 - User Creates Recurring Check-in
```
User: "I want to check in with Sarah Chen every week"
↓
Creates recurring schedule with frequency="weekly"
↓
System Creates Immediate Reminder: "Check in with Sarah Chen"
↓
Sets next_reminder_date = 2025-12-10
```

### Day 8 - Scheduler Runs
```
Scheduler Job: "Find all due check-ins"
↓
Finds: Sarah Chen's schedule (next_reminder_date = 2025-12-10)
↓
Creates New Reminder: "Weekly check-in with Sarah Chen at Google"
↓
Updates next_reminder_date = 2025-12-17
```

### Day 15 - Scheduler Runs Again
```
Finds: Sarah Chen's schedule again (next_reminder_date = 2025-12-17)
↓
Creates Another Reminder
↓
Updates next_reminder_date = 2025-12-24
```

---

## Key Features

### 1. Automatic Generation
- No manual reminder creation needed
- Happens automatically on schedule
- User doesn't need to log in

### 2. Flexible Frequencies
- Weekly: Keep close contacts warm
- Biweekly: Regular but not too frequent
- Monthly: Broader relationship maintenance
- Quarterly: Extended network nurturing

### 3. Priority Levels
- High: Urgent, important relationships
- Medium: Regular networking
- Low: Extended network
- UI can sort/highlight by priority

### 4. Custom Messages
- Users can set custom message templates
- Personalizes each reminder
- Includes contact name, company automatically
- Placeholders like [Name], [Company] supported

### 5. Last Reminder Tracking
- Records when reminder was last generated
- Prevents duplicate reminders
- Shows user when they last had a reminder

---

## Stats & Analytics

Show users insights about their check-in schedule:

```
Your Recurring Check-in Schedule

Total Active: 12

By Frequency:
  Weekly: 3 contacts
  Biweekly: 4 contacts
  Monthly: 4 contacts
  Quarterly: 1 contact

By Priority:
  High: 3 contacts
  Medium: 6 contacts
  Low: 3 contacts

Upcoming This Week: 2 reminders
Upcoming This Month: 5 reminders
```

---

## Error Handling

### If scheduler fails to run:
- Old reminders not deleted (safe)
- next_reminder_date might be in the past
- User can manually create reminders
- No data loss

### If duplicate reminders created:
- User gets multiple reminders (annoying but not harmful)
- Can mark multiple as complete
- Consider adding de-duplication logic

### If database is down:
- Reminders not created that day
- Will catch up when database is back
- next_reminder_date will be in past
- Catches up when database restores

---

## Testing Checklist

- [ ] Create recurring check-in with weekly frequency
- [ ] Verify first reminder created immediately
- [ ] Verify next_reminder_date set correctly (7 days from now)
- [ ] Manually call /generate-periodic-reminders endpoint
- [ ] Verify new reminder NOT created (next_reminder_date is in future)
- [ ] Manually update next_reminder_date to today in database
- [ ] Call /generate-periodic-reminders again
- [ ] Verify reminder created this time
- [ ] Verify next_reminder_date updated to future date
- [ ] Test all 4 frequencies (weekly, biweekly, monthly, quarterly)
- [ ] Test priority display
- [ ] Test stopping a recurring check-in
- [ ] Verify reminders show in statistics

---

## Future Enhancements

1. **Email Notifications**
   - Send email when reminder is due
   - Include suggested template
   - Click to mark complete

2. **SMS Reminders**
   - Text message notifications
   - Better for important high-priority reminders

3. **Calendar Integration**
   - Sync reminders to Google Calendar
   - Show in calendar view
   - Integration with Outlook

4. **Smart Suggestions**
   - ML suggests contacts who need check-ins
   - Analyzes last interaction date
   - Recommends frequency based on relationship

5. **Bulk Management**
   - Create multiple recurring check-ins at once
   - Import from LinkedIn
   - Create from contact groups

6. **Analytics**
   - Track completion rate
   - Show which contacts you check in with regularly
   - Insights on network maintenance habits

---

## API Summary

| Endpoint | Method | Purpose | Frequency |
|----------|--------|---------|-----------|
| `/recurring-check-ins` | POST | Create new recurring schedule | User initiated |
| `/recurring-check-ins` | GET | List all active schedules | User initiated |
| `/recurring-check-ins/:id` | DELETE | Stop a recurring schedule | User initiated |
| `/generate-periodic-reminders` | POST | Generate due reminders | Scheduled job (daily) |

---

## Files Modified/Created

- ✅ `backend/db/add_relationship_reminders.sql` - Added `recurring_check_ins` table
- ✅ `backend/routes/industryContacts.js` - Added 4 new API endpoints
- ✅ `backend/utils/reminderScheduler.js` - Created scheduler utility functions

---

## Next Steps

1. **Choose a Scheduler:**
   - Local: node-cron (simplest for development)
   - Production: AWS Lambda or Bull Queue (recommended)

2. **Test the Endpoints:**
   - Create a recurring check-in via API
   - Verify first reminder created
   - Test manual reminder generation

3. **Frontend Implementation:**
   - Add frequency selection to reminder modal
   - Create recurring-reminders tab/view
   - Show statistics dashboard

4. **Deploy Scheduler:**
   - Set up cron job / scheduled task
   - Monitor execution
   - Set up error alerts

---

**Status:** ✅ Backend complete
**Next:** Frontend UI and scheduler setup
**Demo:** Ready for testing

---

*Created: December 3, 2025*
*Feature: UC-093 Enhancement - Periodic Check-in Reminders*
