# UC-087: Referral Request Management - Quick Start

## 🚀 5-Minute Setup

### Step 1: Database
Add the referrals schema to your Supabase database:
```bash
# Copy contents of backend/db/add_referrals_schema.sql
# Paste into Supabase SQL Editor and execute
```

### Step 2: Backend
The backend is already configured in `backend/server.js`:
```javascript
// Already added:
import referralsRoutes from "./routes/referrals.js";
app.use("/api/referrals", referralsRoutes);
```

No additional backend setup needed! ✅

### Step 3: Frontend
Add to your App.jsx or routing setup:
```javascript
import ReferralRequests from './components/ReferralRequests';

// In your routing:
<Route path="/referrals" element={<ReferralRequests />} />

// In your navigation menu:
<Link to="/referrals">Referral Requests</Link>
```

### Step 4: Start Using!
1. Navigate to `/referrals`
2. Click "New Referral Request"
3. Start tracking referrals!

## 📊 Key Features at a Glance

| Feature | What It Does |
|---------|-------------|
| **Smart Suggestions** | Recommends contacts in same industry/company |
| **Timing Alerts** | Warns if you've asked a contact too recently |
| **Status Tracking** | Track: pending → accepted → referred → completed |
| **Outcome Tracking** | Monitor interviews and job offers from referrals |
| **Analytics** | See your success rate, response times, interview count |
| **Follow-ups** | Create reminders for check-ins and thank yous |
| **Relationship Health** | Track how referral affects your relationship |
| **Etiquette Scoring** | Score how well-timed and personalized your request is |

## 🎯 Common Tasks

### Create Your First Referral Request
```
1. Click "New Referral Request"
2. Select a job you're applying for
3. Choose someone from your network to ask
4. Write a personalized message
5. Click "Create Referral Request"
```

### Update Status When You Hear Back
```
1. Click the referral in your list
2. Click "Edit"
3. Change status to "accepted" or "rejected"
4. Update outcome if you know it
5. Click "Save Changes"
```

### View Your Analytics
```
The dashboard shows:
- Total requests sent
- Success rate (%)
- Average response time (days)
- Interviews from referrals
- Job offers from referrals
```

### Create a Follow-up Reminder
```
1. Open a referral request
2. Click the follow-up section
3. Add a reminder (check-in, gratitude, etc.)
4. Set the date
5. Mark as complete when done
```

## 📱 API Quick Reference

### Create Referral
```bash
POST /api/referrals/requests
{
  "contact_id": 1,
  "job_id": 5,
  "job_title": "Senior Engineer",
  "company": "Google",
  "referral_message": "Hi John, I'm applying to Google...",
  "why_good_fit": "I have 5+ years experience..."
}
```

### Get All Referrals
```bash
GET /api/referrals/requests
```

### Update Referral Status
```bash
PUT /api/referrals/requests/1
{
  "status": "referred",
  "referral_outcome": "interview_scheduled",
  "gratitude_expressed": true
}
```

### Get Analytics
```bash
GET /api/referrals/analytics
```

### Get Timing Recommendations
```bash
GET /api/referrals/recommendations/timing/:contact_id
```

### Get Suggested Contacts
```bash
GET /api/referrals/suggestions/contacts/:job_id
```

## 🎨 UI Components

### Main Dashboard
- Analytics cards (total, success rate, response time, interviews, offers)
- Filter by status
- List of all referral requests
- "New Referral Request" button

### Create Modal
- Job selector with suggested contacts
- Contact selector
- Personalized message field
- Why they're a good fit explanation
- Timing score slider
- Personalization score slider

### Details Modal
- Full referral information
- Status updates
- Outcome tracking
- Gratitude tracking
- Notes and comments
- Edit and delete options

### Analytics Dashboard
- 5 key metric cards with icons and colors
- Real-time calculation from referral data

## 🔧 Troubleshooting

**Problem:** No suggested contacts appear
- **Solution:** Make sure the job has an industry field and you have contacts in that industry

**Problem:** Can't create a referral
- **Solution:** Ensure you have at least one job and one contact in the system

**Problem:** Analytics showing zeros
- **Solution:** Analytics updates when referrals are created. Create a few first!

**Problem:** Timing recommendations don't show
- **Solution:** Select a contact from the dropdown, don't just type

## 💡 Pro Tips

1. **Use the timing recommendations** - They prevent you from asking people too often
2. **Fill in the scores** - Help you track what messaging works best
3. **Express gratitude** - Always mark when you've thanked someone
4. **Track outcomes** - Update when you hear back to measure effectiveness
5. **Create templates** - Save common messages for reuse
6. **Monitor analytics** - See which industries/people refer successfully

## 📚 Full Documentation

For complete details, see:
- **REFERRAL_REQUEST_GUIDE.md** - Comprehensive guide
- **UC-087-IMPLEMENTATION-SUMMARY.md** - Technical summary
- **ReferralRequests.jsx** - Component source code
- **referrals.js** - Backend API source code

## 🎓 Best Practices

### Request Timing
- ⏰ Wait 1-2 weeks between requests to the same person
- 📅 Avoid weekends/holidays
- 🌍 Consider time zones
- 🎯 Don't ask multiple times for the same position

### Personalization
- 🗣️ Explain why they specifically can help
- 📝 Reference your shared history
- 👤 Show you know their current role
- ✨ Make it easy for them to say yes

### Follow-up
- 📬 Follow up within 1 week if no response
- 🤐 Don't be pushy - give them space
- 📊 Provide updates on the process
- 🙏 Express gratitude regardless of outcome

### Relationship Maintenance
- 💌 Always say thank you (even for "no")
- 📞 Keep referrer updated
- 🤝 Offer reciprocal help
- 🔗 Stay in touch beyond job search

## 🎉 Success!

You're now ready to:
- ✅ Track all your referral requests
- ✅ Get smart timing recommendations
- ✅ Monitor your success rate
- ✅ Maintain relationship health
- ✅ Leverage your network effectively

**Start using Referral Request Management today!**
