# UC-090: Informational Interview Management - Quick Start

## ⚡ 5-Minute Setup

### Step 1: Apply Database Schema (2 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the entire contents of:
   ```
   backend/db/add_informational_interviews_schema.sql
   ```
4. Click "Run" button
5. ✅ Verify: All 5 tables created + 11 indexes

### Step 2: Restart Servers (2 minutes)
```bash
# Terminal 1: Backend
cd backend
npm start
# Should show: ✅ API running at http://localhost:4000

# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev
# Should show: VITE ... ready
```

### Step 3: Access Feature (1 minute)
1. Open browser: http://localhost:5174
2. Login to dashboard
3. Navigate to: **Network → 💼 Informational Interviews**
4. ✅ You should see the "Find Candidates" tab

---

## 🎯 Quick Testing Flow (5 minutes)

### Test 1: Add Your First Candidate
```
Click: + Add Candidate
Fill:
  - First Name: Sarah
  - Last Name: Johnson
  - Company: Microsoft
  - Title: Product Manager
  - Industry: Technology
  - Source: LinkedIn
Click: Add Candidate
Result: ✅ "Candidate added successfully"
```

### Test 2: Request Interview
```
Click: Request Interview (on candidate card)
Fill:
  - Interview Type: Video
  - Duration: 30 minutes
  - Topics: Career path, company culture, remote work
  - Platform: Zoom
Click: Create Interview Request
Result: ✅ "Interview request created"
```

### Test 3: Prepare for Interview
```
Click: 📚 Prepare (on interview card)
Fill:
  - Framework: SITUATION-CONTEXT-ACTION-RESULT
  - Company Research: Microsoft is the leading software company...
  - Role Research: PM roles focus on strategy and product...
  - Personal Prep: I have 5 years experience in PM...
  - Conversation Starters: "What's the product roadmap?", "How do you measure success?"
Click: Save Preparation
Result: ✅ "Preparation framework saved"
```

### Test 4: Complete & Follow-up
```
Click: ✅ Complete (mark interview as done)
Result: Interview status changes to "completed"

Click: ✉️ Follow-up
Fill:
  - Type: Thank you
  - Message: "Thanks for the great conversation about Microsoft's mobile strategy..."
  - Action Items: "Research mobile team", "Connect on LinkedIn"
Click: Send Follow-up
Result: ✅ "Follow-up sent"
```

### Test 5: View Insights
```
Navigate to: Industry Insights tab
Result: See captured insights from your interviews
```

---

## 📋 Feature Overview

### 🔍 Find Candidates Tab
- ✅ Add new candidates with full profile
- ✅ View candidate information
- ✅ Track candidate status (identified → contacted → scheduled → completed)
- ✅ Quick action buttons for requesting interviews

### 📅 Track Interviews Tab
- ✅ View all scheduled interviews
- ✅ Prepare using templates (4 actions per interview)
- ✅ Send follow-ups
- ✅ Mark interviews as completed
- ✅ View full interview details

### 💡 Industry Insights Tab
- ✅ View insights captured from interviews
- ✅ See impact on job search (high, medium, low)
- ✅ Track identified opportunities
- ✅ Monitor relationship value

---

## 🔌 API Endpoints Reference

All endpoints require Bearer token in Authorization header.

### Candidates
```
GET    /api/informational-interviews/candidates
POST   /api/informational-interviews/candidates
PUT    /api/informational-interviews/candidates/:id
DELETE /api/informational-interviews/candidates/:id
```

### Interviews
```
GET    /api/informational-interviews/interviews
POST   /api/informational-interviews/interviews
PUT    /api/informational-interviews/interviews/:id
GET    /api/informational-interviews/interviews/:id
```

### Preparation
```
GET    /api/informational-interviews/preparation/:interviewId
POST   /api/informational-interviews/preparation
```

### Follow-ups
```
GET    /api/informational-interviews/followups/:interviewId
POST   /api/informational-interviews/followups
PUT    /api/informational-interviews/followups/:id
```

### Insights
```
GET    /api/informational-interviews/insights
GET    /api/informational-interviews/insights/:interviewId
POST   /api/informational-interviews/insights
```

### Dashboard
```
GET    /api/informational-interviews/dashboard/summary
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Tab not showing | Restart frontend: `npm run dev` |
| "Cannot find module" | Verify file at `backend/routes/informationalInterviews.js` |
| 401 Unauthorized | Check you're logged in, token in localStorage |
| Database error | Verify schema SQL ran in Supabase |
| Empty candidates list | Add candidates first with "+ Add Candidate" |

---

## ✨ What You Can Do Now

✅ Identify and track potential informational interview candidates
✅ Request interviews via email/platform links
✅ Use preparation frameworks for different interview types
✅ Track interview completion and outcomes
✅ Send professional follow-ups with templates
✅ Capture industry insights from conversations
✅ Measure relationship value (mentor potential)
✅ Track opportunities identified from interviews
✅ Monitor job search progress through relationship insights

---

## 🎓 Pro Tips

1. **Before Interview**: Fill preparation framework completely - it helps you stay focused
2. **During Interview**: Take notes in "notes_after" for reference
3. **After Interview**: Immediately mark as completed and send follow-up within 24h
4. **Insights**: Create insights for every completed interview
5. **Opportunities**: Mark if interview identified job opportunities

---

## 📁 File Locations

```
Backend:
  ✅ backend/db/add_informational_interviews_schema.sql
  ✅ backend/routes/informationalInterviews.js
  ✅ backend/server.js (route registered)

Frontend:
  ✅ frontend/src/components/InformationalInterviews.jsx
  ✅ frontend/src/styles/InformationalInterviews.css
  ✅ frontend/src/pages/Network/NetworkLayout.jsx (integrated)

Documentation:
  ✅ UC-090-IMPLEMENTATION-COMPLETE.md
  ✅ UC-090-QUICK-START.md (this file)
```

---

## 🚀 Next: Integration with Other Features

After UC-090 works, you can:
- **Link to Referrals**: Convert promising candidates to referrals
- **Link to Mentors**: Add high-value relationships as mentors
- **Link to Jobs**: Track job opportunities mentioned in interviews
- **Link to Skills**: Identify skill gaps from interview insights

---

**Status**: ✅ READY TO USE
**All UCs Working**: UC-089 ✅, UC-091 ✅, UC-090 ✅
**No Breaking Changes**: All existing features intact ✅

Start your first interview now! 🎯
