# Quick Setup: Periodic Reminders Scheduler

**Choose one implementation option below:**

---

## 🚀 Option 1: Node-Cron (Fastest - Local Development)

### Installation
```bash
cd backend
npm install node-cron
```

### Setup (in backend/server.js)

Add this to your server startup code:

```javascript
import cron from 'node-cron';
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

// ... other code ...

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  
  // Schedule periodic reminder generation
  // Runs every day at 8 AM UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('\n🔔 [SCHEDULER] Running daily reminder generation...');
    try {
      const result = await generatePeriodicReminders();
      console.log(`✅ [SCHEDULER] ${result.reminders_generated} reminders generated`);
    } catch (err) {
      console.error('❌ [SCHEDULER] Error:', err);
    }
  });
  
  console.log('📅 Reminder scheduler activated (8 AM UTC daily)');
});
```

### Testing

**Test the scheduler without waiting 24 hours:**

```bash
# Run this code in Node REPL or a test script
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

const result = await generatePeriodicReminders();
console.log('Generated reminders:', result.reminders_generated);
```

**Alternative: Change schedule for testing:**
```javascript
// Test every 2 minutes instead
cron.schedule('*/2 * * * *', async () => {
  // ... scheduler code ...
});
```

---

## ⚙️ Option 2: AWS Lambda (Production Recommended)

### Step 1: Create Lambda Function

In AWS Console:
1. Go to Lambda → Create Function
2. Runtime: Node.js 18.x
3. Name: `periodic-reminders-generator`

### Step 2: Lambda Code

Create `lambda.js`:

```javascript
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

export const handler = async (event, context) => {
  console.log('🔔 Lambda: Starting periodic reminder generation');
  
  try {
    const result = await generatePeriodicReminders();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Generated ${result.reminders_generated} reminders`,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

### Step 3: Set up CloudWatch Trigger

1. In Lambda → Add Trigger
2. Choose: CloudWatch Events
3. Create new rule:
   - Name: `daily-reminders`
   - Schedule expression: `cron(0 8 * * ? *)` (8 AM UTC daily)

### Step 4: Environment Variables

Add to Lambda environment:
```
SUPABASE_URL = your_supabase_url
SUPABASE_ANON_KEY = your_supabase_key
```

### Step 5: Test

Click "Test" in Lambda console → Verify output shows reminders generated

---

## 📦 Option 3: Bull Queue (Scalable)

### Installation

```bash
cd backend
npm install bull redis
```

### Setup (in backend/server.js)

```javascript
import Queue from 'bull';
import { generatePeriodicReminders } from './utils/reminderScheduler.js';

// Create queue
const reminderQueue = new Queue('periodic-reminders', {
  redis: {
    host: '127.0.0.1',  // Or your Redis server
    port: 6379
  }
});

// Define the job handler
reminderQueue.process(async (job) => {
  console.log('🔔 Bull: Running periodic reminder generation');
  const result = await generatePeriodicReminders();
  console.log(`✅ Generated ${result.reminders_generated} reminders`);
  return result;
});

// Schedule to run daily at 8 AM UTC
reminderQueue.add(
  { type: 'generate-periodic-reminders' },
  {
    repeat: {
      cron: '0 8 * * *'  // 8 AM UTC daily
    },
    attempts: 3,        // Retry 3 times if fails
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
);

// Listen for job events
reminderQueue.on('completed', (job, result) => {
  console.log('✅ Job completed successfully');
});

reminderQueue.on('failed', (job, err) => {
  console.error('❌ Job failed:', err.message);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('📅 Bull reminder scheduler activated');
});
```

### Testing Bull Queue

```bash
# Install bull-board to visualize jobs
npm install bull-board

# Then add to your server to see queue UI at http://localhost:4000/admin/queues
```

---

## 🧪 Manual Testing Without Scheduler

While setting up scheduler, test the API directly:

### 1. Create a Recurring Check-in
```bash
curl -X POST http://localhost:4000/api/industry-contacts/recurring-check-ins \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_name": "Test Contact",
    "contact_company": "Test Company",
    "frequency": "weekly",
    "priority": "high",
    "custom_message": "Time to check in!"
  }'
```

### 2. Check Recurring Schedules
```bash
curl http://localhost:4000/api/industry-contacts/recurring-check-ins \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Manually Generate Reminders
```bash
curl -X POST http://localhost:4000/api/industry-contacts/generate-periodic-reminders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update next_reminder_date in Database
To test without waiting, manually set a contact's `next_reminder_date` to today:

```sql
UPDATE recurring_check_ins 
SET next_reminder_date = TODAY()
WHERE contact_name = 'Test Contact';
```

Then call the generate endpoint again.

---

## 📊 How to Verify It's Working

### Check 1: Logs

After scheduler runs, you should see:
```
🔔 [SCHEDULER] Running daily reminder generation...
✅ [SCHEDULER] 3 reminders generated
```

### Check 2: Database

Query the tables to verify:

```sql
-- Check recurring check-ins were created
SELECT * FROM recurring_check_ins WHERE user_id = 'your_user_id';

-- Check reminders were generated
SELECT * FROM relationship_reminders 
WHERE reminder_type = 'check_in' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check 3: Timestamps

Last generated timestamp should match today's date:

```sql
SELECT 
  contact_name,
  last_reminder_date,
  next_reminder_date,
  DATEDIFF(next_reminder_date, CURDATE()) as days_until_next
FROM recurring_check_ins
WHERE user_id = 'your_user_id';
```

---

## 🐛 Troubleshooting

### Reminders Not Generating

1. **Check next_reminder_date:**
   ```sql
   SELECT * FROM recurring_check_ins 
   WHERE next_reminder_date <= CURDATE();
   ```
   If none found, no reminders are due yet.

2. **Check is_active:**
   ```sql
   SELECT is_active FROM recurring_check_ins 
   WHERE contact_name = 'Name';
   ```
   Must be `true` to generate reminders.

3. **Verify scheduler is running:**
   - Check logs for scheduler startup message
   - Manual call to `/generate-periodic-reminders` should work
   - If it does, check scheduler schedule expression

### Redis Connection Error (Bull)

If you get "Redis connection refused":
```bash
# Make sure Redis is running
redis-cli ping
# Should respond: PONG

# If not installed:
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt-get install redis-server && sudo systemctl start redis-server
# Windows: Download from https://github.com/microsoftarchive/redis/releases
```

### Scheduler Runs But Generates 0 Reminders

Check if any are actually due:
```sql
SELECT * FROM recurring_check_ins 
WHERE next_reminder_date <= CURDATE()
AND is_active = true;
```

If nothing, manually update for testing:
```sql
UPDATE recurring_check_ins 
SET next_reminder_date = CURDATE()
WHERE contact_name = 'Test Contact';
```

---

## 📋 Recommended Flow

### Development
1. ✅ Start with **node-cron** (Option 1)
2. Test manually via API
3. Verify reminders are created
4. Set scheduler to run every 2 minutes for testing
5. Once working, reset to daily schedule

### Production
1. ✅ Use **AWS Lambda + CloudWatch** (Option 2)
   - Guaranteed to run
   - No server required
   - Scales automatically
   
   OR
   
2. ✅ Use **Bull Queue** (Option 3)
   - Self-hosted, full control
   - Great if you have Redis already
   - Can scale with multiple workers

---

## 📝 Deployment Checklist

Before going live:

- [ ] Scheduler code deployed to production
- [ ] Environment variables set (SUPABASE_URL, KEY)
- [ ] Tested manual reminder generation
- [ ] Scheduler schedule verified (e.g., 8 AM UTC)
- [ ] Error logging configured
- [ ] Tested with at least 3 recurring check-ins
- [ ] Database backups configured
- [ ] Monitoring/alerts set up
- [ ] Team notified of new feature
- [ ] Documentation updated

---

## 💡 Pro Tips

1. **Stagger Scheduler Time:**
   - If you have many users, set it during low-traffic hours
   - 3 AM UTC is better than 8 AM if your peak traffic is morning

2. **Rate Limiting:**
   - If generating thousands of reminders, add rate limiting
   - Process in batches to avoid overwhelming database

3. **Monitoring:**
   - Log reminders generated each day
   - Alert if 0 reminders generated (might indicate a bug)
   - Track average generation time

4. **User Communication:**
   - Let users know periodic reminders exist
   - Show in help/onboarding
   - Display "Last reminder generated" timestamp

5. **Email Notifications:**
   - Consider emailing users when reminder is created
   - Improves engagement
   - Users won't forget to check in

---

## 🎯 Next Steps

1. Choose implementation option (recommend node-cron for dev, Lambda for prod)
2. Install dependencies
3. Add scheduler code
4. Test manually via API
5. Verify reminders created in database
6. Deploy to production
7. Monitor logs
8. Celebrate! 🎉

---

*Setup Time: 10-15 minutes*
*Complexity: Medium*
*Recommended: Start with Option 1 (node-cron), upgrade to Option 2 (Lambda) for production*
