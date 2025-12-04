# UC-091: Mentor & Career Coach Integration - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Apply Database Schema (2 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the entire contents of:
   ```
   backend/db/add_mentors_schema.sql
   ```
4. Click "Run" button
5. Verify all 6 tables created successfully

### Step 2: Restart Servers (2 minutes)
```bash
# Terminal 1: Backend
cd backend
npm start
# Should show: ✅ API running at http://localhost:4000

# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev
# Should show: VITE v... ready in ... ms
```

### Step 3: Access the Feature (1 minute)
1. Open browser to `http://localhost:5174`
2. Navigate to: **Network → 🎓 Mentors & Coaches**
3. You should see empty state with "+ Invite Mentor" button

---

## 🎯 Feature Testing Flow

### Test 1: Invite a Mentor
1. Click **"+ Invite Mentor"** button
2. Enter mentor email: `mentor@example.com`
3. Select relationship type: **Mentor** (or Coach/Advisor)
4. Click **"Send Invitation"**
5. ✅ Should show success message

### Test 2: Share Progress
1. After inviting, you'll see the mentor in the list
2. Click **"Share Progress"** button
3. Fill in the form:
   - Applications Submitted: `5`
   - Interviews Completed: `2`
   - Job Leads: `3`
   - Skills: `TypeScript, React`
   - Challenges: `Time management`
   - Wins: `Got 2 interviews`
   - Goals: `Apply to 10 more companies`
4. Click **"Share Progress"**
5. ✅ Should show success message

### Test 3: View Mentor Details
1. Click **"View Details"** on any mentor card
2. Modal opens showing:
   - Full mentor profile
   - Contact information
   - Experience and expertise
   - LinkedIn link (if available)
3. Can click **"End Relationship"** to remove mentor
4. ✅ Modal displays correctly

### Test 4: Check All Tabs
- **Manage Tab**: Shows mentor cards
- **Progress Tab**: Shows "Share Update" for active mentors
- **Feedback Tab**: Empty (ready for mentor feedback display)
- **Recommendations Tab**: Empty (ready for recommendations)

---

## 📱 What You Can Do Now

✅ Invite mentors by email
✅ Track mentoring relationships (pending → active → completed)
✅ Share weekly progress updates
✅ View mentor profiles and details
✅ End mentoring relationships
✅ Responsive design works on mobile

---

## 🔗 API Endpoints Available

All endpoints are at `http://localhost:4000/api/mentors/`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/my-mentors` | Get all user's mentors |
| POST | `/invite` | Invite a mentor |
| PUT | `/relationships/:id/accept` | Accept invitation |
| DELETE | `/relationships/:id` | End relationship |
| POST | `/progress-sharing` | Share progress |
| GET | `/progress/:id` | Get progress history |
| POST | `/feedback` | Add feedback |
| GET | `/feedback/:id` | Get feedback |
| POST | `/recommendations` | Add recommendation |
| GET | `/recommendations/:id` | Get recommendations |
| PUT | `/recommendations/:id/update-status` | Update status |

---

## 🐛 Troubleshooting

### Issue: "Cannot find module mentorsRoutes"
**Solution**: Make sure backend/routes/mentors.js file exists and import statement is correct in server.js

### Issue: Mentors & Coaches tab not showing
**Solution**: Restart frontend dev server
```bash
# Stop: Ctrl+C in frontend terminal
# Start: npm run dev
```

### Issue: API returns 401 Unauthorized
**Solution**: 
1. Make sure you're logged in
2. Check token is being sent in Authorization header
3. Verify token is valid (not expired)

### Issue: Database tables don't exist
**Solution**: 
1. Run the SQL schema in Supabase
2. Verify in Supabase → Table Editor that 6 new tables exist:
   - mentors
   - mentor_relationships
   - mentor_feedback
   - mentor_recommendations
   - mentor_notes
   - mentor_progress_sharing

---

## 📊 File Structure

```
UC-091 Implementation
├── Backend
│   ├── db/add_mentors_schema.sql (6 tables, indexes)
│   ├── routes/mentors.js (12 API endpoints)
│   └── server.js (route registration)
├── Frontend
│   ├── components/MentorsCoaches.jsx (React component)
│   ├── components/MentorsCoaches.css (styling)
│   └── pages/Network/NetworkLayout.jsx (navigation)
└── Docs
    ├── UC-091-IMPLEMENTATION-COMPLETE.md (detailed)
    └── UC-091-QUICK-START.md (this file)
```

---

## ✨ Code Highlights

### Invite a Mentor (Frontend)
```javascript
const handleInviteMentor = async (e) => {
  await axios.post(`${API_BASE}/mentors/invite`, 
    { mentor_email, relationship_type },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
```

### Share Progress (Frontend)
```javascript
const handleShareProgress = async (e) => {
  await axios.post(`${API_BASE}/mentors/progress-sharing`,
    { relationship_id, mentor_id, ...progressForm },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
```

### Get Mentors (Backend)
```javascript
router.get('/my-mentors', getSupabaseUserId, async (req, res) => {
  const { data } = await supabase
    .from('mentor_relationships')
    .select(`*, mentor:mentor_id(...)`)
    .eq('mentee_id', req.user.id);
  res.json({ data });
});
```

---

## 🎓 No Breaking Changes

✅ All existing UC-089 and earlier features still work
✅ No modifications to existing routes
✅ No modifications to existing components
✅ Only additions - new tables, new routes, new components
✅ Existing authentication system still in place

---

**Ready to test UC-091!** 🚀
