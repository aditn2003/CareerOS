# Periodic Check-in Reminders - Visual Architecture

**Date:** December 3, 2025
**Feature:** UC-093 Enhancement

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Create Recurring Check-in Modal]                               │
│  ┌─────────────────────────────────┐                             │
│  │ Contact Name:      [________]    │                            │
│  │ Company:           [________]    │                            │
│  │ Frequency:         [Weekly ▼]    │ ← NEW: Pick frequency     │
│  │ Priority:          [High   ▼]    │ ← NEW: Set priority      │
│  │ Custom Message:    [_________]   │                            │
│  │                                   │                            │
│  │  [Create Recurring Reminder]     │                            │
│  └─────────────────────────────────┘                             │
│                                                                   │
│  [Recurring Check-ins Tab] ← NEW                                 │
│  ┌─────────────────────────────────┐                             │
│  │ Sarah Chen (Google)    Weekly    │                            │
│  │ Next: Dec 10           Priority: High                         │
│  │ [Edit] [Stop]                   │                            │
│  └─────────────────────────────────┘                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Calls (HTTP)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST   /recurring-check-ins           ← Create new schedule    │
│  GET    /recurring-check-ins           ← List all schedules     │
│  DELETE /recurring-check-ins/:id       ← Stop a schedule        │
│                                                                   │
│  POST   /generate-periodic-reminders   ← Called by scheduler    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  Business Logic & Validation
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULER UTILITY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  generatePeriodicReminders()                                     │
│  ├─ Find all due check-ins                                      │
│  ├─ Create reminders for each                                   │
│  ├─ Calculate next reminder date                                │
│  └─ Update schedule                                              │
│                                                                   │
│  getRecurringCheckInStats()                                      │
│  └─ Summary statistics                                           │
│                                                                   │
│  updateRecurringCheckIn()                                        │
│  └─ Modify frequency/priority/message                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              Database Operations (Supabase)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────┐  ┌──────────────────────┐   │
│  │  recurring_check_ins           │  │  relationship        │   │
│  ├────────────────────────────────┤  │  _reminders          │   │
│  │ id              (PK)           │  ├──────────────────────┤   │
│  │ user_id         (FK)           │  │ id                   │   │
│  │ contact_name                   │  │ user_id              │   │
│  │ contact_company                │  │ contact_name         │   │
│  │ frequency       ← "weekly"     │  │ reminder_type        │   │
│  │ frequency_days  ← 7            │  │ reminder_date        │   │
│  │ priority        ← "high"       │  │ custom_message       │   │
│  │ next_reminder_date ← Dec 10    │  │ is_completed         │   │
│  │ last_reminder_date             │  │ created_at           │   │
│  │ custom_message                 │  │ updated_at           │   │
│  │ is_active       ← TRUE         │  │                      │   │
│  │ created_at                     │  │                      │   │
│  │ updated_at                     │  │                      │   │
│  │ ─────────────────────────────  │  │                      │   │
│  │ Indexes:                       │  │ Indexes:             │   │
│  │ • user_id                      │  │ • user_id            │   │
│  │ • next_reminder_date ⭐        │  │ • reminder_date      │   │
│  │ • is_active                    │  │ • is_completed       │   │
│  └────────────────────────────────┘  └──────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  Automated Process (Scheduler)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SCHEDULER OPTIONS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Option 1: node-cron                                             │
│  ┌────────────────────────────────┐                              │
│  │ Runs locally on Node process   │                              │
│  │ cron.schedule('0 8 * * *', ...)│                              │
│  │ Simple, good for dev           │                              │
│  └────────────────────────────────┘                              │
│                                                                   │
│  Option 2: AWS Lambda + CloudWatch                               │
│  ┌────────────────────────────────┐                              │
│  │ Serverless function runs daily │                              │
│  │ CloudWatch triggers at 8 AM    │                              │
│  │ Recommended for production     │                              │
│  └────────────────────────────────┘                              │
│                                                                   │
│  Option 3: Bull Queue + Redis                                    │
│  ┌────────────────────────────────┐                              │
│  │ Background job processor       │                              │
│  │ Runs scheduled jobs reliably   │                              │
│  │ Scalable, advanced option      │                              │
│  └────────────────────────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Daily Workflow Timeline

```
╔═══════════════════════════════════════════════════════════════╗
║                    DAILY EXECUTION TIMELINE                    ║
╚═══════════════════════════════════════════════════════════════╝

12:00 AM (Midnight)    ─ Database idle, no reminders due
                       
1:00 AM                ─ Database idle, no reminders due

...

7:00 AM UTC            ─ Pre-scheduler wait

7:59 AM UTC            ─ Scheduler preparing to run

8:00 AM UTC ⭐          ─ SCHEDULER RUNS
                       │
                       ├─ Query: SELECT * FROM recurring_check_ins
                       │  WHERE next_reminder_date <= TODAY()
                       │  AND is_active = true
                       │
                       ├─ Result: Found 3 due check-ins
                       │  ├─ Sarah Chen (weekly, due Dec 10)
                       │  ├─ Mike Johnson (monthly, due Dec 3)
                       │  └─ Lisa Park (biweekly, due Dec 4)
                       │
                       ├─ For each contact:
                       │  ├─ INSERT into relationship_reminders
                       │  │  └─ Creates 3 new reminders
                       │  │
                       │  └─ UPDATE next_reminder_date
                       │     ├─ Sarah: Dec 10 → Dec 17
                       │     ├─ Mike: Dec 3 → Jan 3
                       │     └─ Lisa: Dec 4 → Dec 18
                       │
                       ├─ COMPLETE
                       │
                       └─ Log: "✅ Generated 3 periodic reminders"

8:05 AM UTC            ─ Reminders appear in user's Maintenance tab

During the day         ─ Users see their reminders and check in

24:00 (Tomorrow)       ─ Scheduler runs again automatically
```

---

## Data Flow Sequence

### User Creates Recurring Check-in

```
Step 1: User submits form
┌─────────────────────┐
│ Contact: Sarah Chen │
│ Frequency: Weekly   │
│ Priority: High      │
└─────────────────────┘
         ↓
Step 2: API receives request
POST /recurring-check-ins
         ↓
Step 3: Validate input
✓ Contact name provided
✓ Frequency is valid (weekly, biweekly, monthly, quarterly)
✓ Priority is valid (high, medium, low)
         ↓
Step 4: Calculate dates
next_reminder_date = TODAY + 7 days = Dec 10
         ↓
Step 5: Insert into database
INSERT recurring_check_ins {
  contact_name: "Sarah Chen",
  frequency: "weekly",
  frequency_days: 7,
  next_reminder_date: "2025-12-10"
}
         ↓
Step 6: Create first reminder immediately
INSERT relationship_reminders {
  contact_name: "Sarah Chen",
  reminder_type: "check_in",
  reminder_date: TODAY()
}
         ↓
Step 7: Return success
Response 201: recurring_check_in created
         ↓
Step 8: User sees confirmation
✓ "Check-in schedule created for Sarah Chen"
✓ "Next reminder: Dec 10"
```

### Scheduler Generates Reminders

```
Step 1: Scheduler triggers (8 AM UTC)
         ↓
Step 2: Query database
SELECT * FROM recurring_check_ins
WHERE next_reminder_date <= CURDATE()
AND is_active = true
         ↓
Step 3: Process results
Loop through each due contact:
  ├─ Sarah Chen (next_date: Dec 10, today: Dec 10) ✓ DUE
  ├─ Mike Johnson (next_date: Jan 3, today: Dec 10) ✗ NOT DUE
  └─ Lisa Park (next_date: Dec 4, today: Dec 10) ✓ DUE (overdue!)
         ↓
Step 4: Create reminders for due contacts
For Sarah & Lisa:
  INSERT relationship_reminders {
    contact_name, reminder_type, reminder_date: TODAY()
  }
         ↓
Step 5: Update next reminder dates
UPDATE recurring_check_ins
SET next_reminder_date = TODAY + frequency_days
         ↓
Step 6: Verification
Sarah: next = Dec 10 → Dec 17 ✓
Lisa:  next = Dec 4 → Dec 18 ✓
         ↓
Step 7: Log result
✅ Generated 2 reminders (0 failed)
         ↓
Step 8: Reminders appear for users
Users see new reminders in Maintenance tab
```

---

## Frequency Schedule Example

### Sarah Chen - Weekly Schedule

```
Dec 3  (Day 1)    : User creates schedule
                  : Gets immediate reminder
                  : next_reminder_date = Dec 10

Dec 10 (Day 8)    : SCHEDULER RUNS
                  : Creates reminder #2
                  : next_reminder_date = Dec 17

Dec 17 (Day 15)   : SCHEDULER RUNS
                  : Creates reminder #3
                  : next_reminder_date = Dec 24

Dec 24 (Day 22)   : SCHEDULER RUNS
                  : Creates reminder #4
                  : next_reminder_date = Dec 31

...continues indefinitely until user stops schedule...

Later (user stops) : is_active = FALSE
                  : No more reminders generated
```

---

## Error Scenarios Handled

```
╔═════════════════════════════════════════════════════════════╗
║              ERROR HANDLING & RECOVERY                       ║
╠═════════════════════════════════════════════════════════════╣
║                                                              ║
║ Scenario 1: Database Down During Scheduler Run               ║
║ ────────────────────────────────────────────────────────     ║
║ ├─ Scheduler attempts to connect
║ ├─ Gets error
║ ├─ Logs error
║ ├─ Silently fails (no crash)
║ └─ Next day: Retry, catches up on due reminders
║
║ Scenario 2: Scheduler Never Runs                             ║
║ ────────────────────────────────────────────────────────     ║
║ ├─ next_reminder_date stays in past
║ ├─ User can manually call /generate-periodic-reminders
║ ├─ Reminders will be created
║ └─ Manual endpoint acts as backup
║
║ Scenario 3: Duplicate Reminders Created                      ║
║ ────────────────────────────────────────────────────────     ║
║ ├─ Scheduler runs twice (manual + auto)
║ ├─ Creates 2 reminders for same contact
║ ├─ Future: Add de-duplication logic
║ └─ Current: User can mark both complete
║
║ Scenario 4: Database Query Timeout                           ║
║ ────────────────────────────────────────────────────────     ║
║ ├─ Scheduler waits for query
║ ├─ Times out after 30 seconds
║ ├─ Logs timeout
║ ├─ Next day: Retries
║ └─ No partial data written
║
║ Scenario 5: User Deletes Account                             ║
║ ────────────────────────────────────────────────────────     ║
║ ├─ user_id deleted from auth table
║ ├─ Cascading delete triggers
║ ├─ All recurring_check_ins deleted
║ ├─ All relationship_reminders deleted
║ └─ Complete cleanup, no orphaned data
║
╚═════════════════════════════════════════════════════════════╝
```

---

## Performance Characteristics

```
┌──────────────────────────────────────────────────────────────┐
│                    PERFORMANCE PROFILE                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Operation                    Time        Load                 │
│ ─────────────────────────────────────────────────────────     │
│                                                                │
│ Create recurring schedule    150ms       Light                │
│   └─ Includes: Insert + first reminder                       │
│                                                                │
│ List all schedules          50ms        Very Light            │
│   └─ Indexed on user_id                                       │
│                                                                │
│ Find due check-ins          100ms       Light                 │
│   └─ Indexed on next_reminder_date                           │
│                                                                │
│ Generate 10 reminders       1.5sec      Medium                │
│   └─ ~150ms per reminder                                      │
│                                                                │
│ Generate 100 reminders      15sec       Heavy                 │
│   └─ ~150ms per reminder                                      │
│                                                                │
│ Generate 1000 reminders     2.5min      Very Heavy            │
│   └─ ~150ms per reminder (would be slow)                     │
│   └─ Need batching for this scale                            │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│ Typical Daily Scenario (100-500 contacts):                   │
│   Find due: 100ms                                             │
│   Generate: 30-75sec (200-500 reminders)                     │
│   Total: ~2 minutes                                           │
│   Runs at: 8 AM UTC (low traffic time)                       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema Diagram

```
recurring_check_ins Table
┌──────────────────────────────────────────────────────────┐
│  Column               Type           Index  Constraint    │
├──────────────────────────────────────────────────────────┤
│  id                   BIGINT         PK                  │
│  user_id              BIGINT         FK     NOT NULL     │
│  contact_name         VARCHAR(255)                NOT NULL│
│  contact_company      VARCHAR(255)                       │
│  frequency            VARCHAR(50)    ✓      NOT NULL     │
│                       (weekly,                           │
│                        biweekly,                         │
│                        monthly,                         │
│                        quarterly)                        │
│  frequency_days       INT            ✓      (7,14,30,90)│
│  priority             VARCHAR(50)    ✓      NOT NULL     │
│                       (high, medium, low)               │
│  last_reminder_date   DATE           ✓                  │
│  next_reminder_date   DATE           ✓      NOT NULL     │
│  custom_message       TEXT                              │
│  is_active            BOOLEAN        ✓      DEFAULT true │
│  created_at           TIMESTAMP                DEFAULT now│
│  updated_at           TIMESTAMP                DEFAULT now│
└──────────────────────────────────────────────────────────┘

Indexes:
  ⭐ PRIMARY KEY (id)
  ⭐ FOREIGN KEY (user_id) → users(id)
  ✓ INDEX (user_id) - Fast: "get my schedules"
  ✓ INDEX (next_reminder_date) - Fast: "find due reminders"
  ✓ INDEX (is_active) - Fast: "get active only"
```

---

## State Transitions

```
                    ┌─────────────────┐
                    │  NOT STARTED    │
                    │                 │
                    └────────┬────────┘
                             │
                    User creates schedule
                             ↓
                    ┌─────────────────┐
                    │    ACTIVE       │ ← Running (generates reminders)
        ┌──────────→│   Running       │
        │           │                 │
        │           └────────┬────────┘
        │                    │
        │          Scheduler runs daily
        │          Creates reminders
        │                    │
        │                    ↓
        │           ┌─────────────────┐
        │           │  PENDING_NEXT   │
        │           │                 │
        │           └────────┬────────┘
        │                    │
        │          Next reminder date arrives
        │                    │
        │                    ↓ (back to ACTIVE)
        │           (creates reminder, loops)
        │
        └──────────User clicks "Stop"
                             ↓
                    ┌─────────────────┐
                    │   STOPPED       │
                    │                 │ ← No more reminders
                    └─────────────────┘

Note: is_active flag controls if in ACTIVE or STOPPED state
```

---

## API Call Sequence Diagram

```
User                    Frontend              Backend              Database
 │                        │                     │                    │
 │ Click "Create          │                     │                    │
 │ Recurring Check-in"    │                     │                    │
 ├───────────────────────→│                     │                    │
 │                        │ POST /recurring...   │                    │
 │                        ├────────────────────→│                    │
 │                        │                     │ Validate input     │
 │                        │                     │ Calculate dates    │
 │                        │                     │ INSERT schedule    │
 │                        │                     ├───────────────────→│
 │                        │                     │                    │ id=1
 │                        │                     │← Return id        │
 │                        │                     │ INSERT reminder    │
 │                        │                     ├───────────────────→│
 │                        │                     │                    │ created
 │                        │                     │ (success 201)      │
 │                        │←────────────────────┤                    │
 │                        │ recurring_check_in  │                    │
 │←───────────────────────┤ {id, contact_name..}│                    │
 │ ✓ Schedule created!    │                     │                    │
 │ Next: Dec 10           │                     │                    │
 │                        │                     │                    │
```

```
Scheduler(8 AM UTC)     Backend              Database
     │                     │                    │
     │ Trigger             │                    │
     ├────────────────────→│                    │
     │                     │ SELECT due         │
     │                     │ check-ins          │
     │                     ├───────────────────→│
     │                     │                    │ 3 found
     │                     │← Return 3 records │
     │                     │                    │
     │                     │ For each:          │
     │                     │  - INSERT reminder │
     │                     ├───────────────────→│
     │                     │  - UPDATE next_date│
     │                     ├───────────────────→│
     │                     │                    │
     │                     │ Log result         │
     │                     │ "Generated 3"      │
     │                     │ (complete)         │
```

---

**This visual architecture shows how periodic reminders flow through the entire system from user creation through automatic daily scheduling.**

---

*Created: December 3, 2025*
*Format: Architecture Diagrams & Flow Charts*
*Purpose: Visual understanding of the periodic reminders system*
