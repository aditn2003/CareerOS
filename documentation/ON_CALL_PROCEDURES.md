# On-Call Procedures and Escalation Paths

## On-Call Schedule

| Week | Primary | Secondary |
|------|---------|-----------|
| 1 | Digant | Adit |
| 2 | Adit | Sujal |
| 3 | Sujal | Aditya |
| 4 | Aditya | Abhi |
| 5 | Abhi | Zaid |
| 6 | Zaid | Digant |

*Schedule rotates every 6 weeks*

---

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Complete outage | 15 minutes | Site down, data breach |
| **P2 - High** | Major feature broken | 1 hour | Login not working, API errors |
| **P3 - Medium** | Minor feature issue | 4 hours | Slow performance, UI bugs |
| **P4 - Low** | Cosmetic/minor | Next business day | Typos, styling issues |

---

## Incident Response Procedure

### Step 1: Acknowledge (5 min)

```
□ Acknowledge alert/report
□ Assess severity level
□ Notify team in Slack/Discord
```

### Step 2: Diagnose (15 min)

```
□ Check status pages (Vercel, Render, Supabase)
□ Review error logs
□ Identify affected components
□ Determine scope of impact
```

### Step 3: Mitigate (varies)

```
□ Implement temporary fix if possible
□ Consider rollback if recent deployment
□ Communicate status to stakeholders
```

### Step 4: Resolve

```
□ Implement permanent fix
□ Verify fix in production
□ Monitor for recurrence
```

### Step 5: Post-Mortem

```
□ Document incident timeline
□ Identify root cause
□ Create action items to prevent recurrence
□ Update documentation if needed
```

---

## Escalation Path

```
┌─────────────────────────────────────────────────────────────┐
│                      ESCALATION PATH                         │
└─────────────────────────────────────────────────────────────┘

Level 1: On-Call Engineer
    │
    │ (15 min no response OR needs help)
    ▼
Level 2: Secondary On-Call
    │
    │ (30 min no resolution OR P1 incident)
    ▼
Level 3: Team Lead
    │
    │ (1 hour no resolution OR data breach)
    ▼
Level 4: Course Instructor / Advisor
```

---

## Contact Information

| Role | Name | Contact | Backup Contact |
|------|------|---------|----------------|
| On-Call Primary | See schedule above | [Phone/Slack] | [Email] |
| On-Call Secondary | See schedule above | [Phone/Slack] | [Email] |
| Team Lead | Digant | [Phone/Slack] | [Email] |
| DevOps Lead | Sujal | [Phone/Slack] | [Email] |
| Database Admin | Digant | [Phone/Slack] | [Email] |
| Backend Lead | Adit | [Phone/Slack] | [Email] |
| Frontend Lead | Aditya | [Phone/Slack] | [Email] |

*Update with actual contact information (phone numbers, Slack handles, emails)*

---

## Communication Templates

### Incident Acknowledged

```
🔴 INCIDENT ACKNOWLEDGED
Severity: P[X]
Issue: [Brief description]
Status: Investigating
ETA: [Time estimate]
Updates: Every [15/30/60] minutes
```

### Status Update

```
🟡 INCIDENT UPDATE
Issue: [Brief description]
Status: [Investigating/Mitigating/Resolved]
Impact: [Who is affected]
Next Update: [Time]
```

### Incident Resolved

```
🟢 INCIDENT RESOLVED
Issue: [Brief description]
Duration: [Start time] - [End time]
Root Cause: [Brief explanation]
Post-Mortem: [Link or "To follow"]
```

---

## Quick Actions

### Restart Backend
```
Render Dashboard → Service → Manual Deploy → Deploy latest commit
```

### Rollback Frontend
```
Vercel Dashboard → Deployments → [Previous] → Promote to Production
```

### Rollback Backend
```
Render Dashboard → Deploys → [Previous] → Rollback to this deploy
```

### Check All Status Pages
- Vercel: https://vercel-status.com
- Render: https://status.render.com
- Supabase: https://status.supabase.com

---

## On-Call Checklist

### Start of On-Call Shift

```
□ Verify access to all dashboards
□ Check current system status
□ Review any ongoing issues
□ Confirm contact info is current
```

### End of On-Call Shift

```
□ Hand off any open issues to next on-call
□ Update incident log if needed
□ Note any recurring issues
```

---

## Post-Mortem Template

```markdown
# Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** HH:MM - HH:MM
**Severity:** P[X]
**Author:** [Digant/Adit/Sujal/Aditya/Abhi/Zaid]

## Summary
[1-2 sentence summary of what happened]

## Timeline
- HH:MM - [Event]
- HH:MM - [Event]

## Root Cause
[What caused the incident]

## Impact
- Users affected: [Number]
- Duration: [Time]
- Data loss: [Yes/No]

## Resolution
[How was it fixed]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

## Lessons Learned
[What we learned]
```

---

*Last Updated: December 2025*

