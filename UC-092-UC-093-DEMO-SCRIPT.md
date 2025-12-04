# UC-092 & UC-093 Demo Script

**Date:** December 6, 2024
**Duration:** 8-10 minutes
**Audience:** Demo 2.4 Stakeholders

---

## Pre-Demo Checklist (5 minutes before)

- [ ] Backend running: `npm start` in `/backend`
- [ ] Frontend running: `npm run dev` in `/frontend`
- [ ] Browser open to: `http://localhost:5173`
- [ ] Logged in as test user
- [ ] Clear browser cache (DevTools → Clear Storage)
- [ ] Set zoom to 100%
- [ ] Close unnecessary windows

---

## Demo Flow (10 minutes)

### Section 1: Introduction (1 minute)

**Script:**
> "Today we're demonstrating two major features we've implemented: UC-092 Industry Contact Discovery and UC-093 Relationship Maintenance Automation.
>
> These features help users build and maintain their professional network by discovering industry contacts and setting up follow-up reminders.
>
> Let me walk you through the complete workflow."

**Visual:** Show landing page with "🤝 Network" button visible in NavBar

---

### Section 2: UC-092 - Industry Contact Discovery (4 minutes)

**Action 1: Navigate to Industry Contacts** (1 minute)
1. Click "🤝 Network" button in NavBar
2. Show Network page loads with tabs
3. Click "Industry Contacts" tab

**Script:**
> "First, let's look at Industry Contact Discovery. This feature helps you find relevant professionals based on different criteria."

**Visual:** Show 5 tabs at top:
- Suggestions
- Warm Connections  
- Industry Leaders
- Alumni
- Event Participants

---

**Action 2: Show Contact Suggestions** (1 minute)
1. Stay on "Suggestions" tab (default)
2. Show list of suggested contacts

**Script:**
> "In the Suggestions tab, we show AI-powered recommendations based on your target companies and roles. Each contact shows their title, company, and match score."

**Action:** Point to:
- Contact names and titles
- Company associations
- Match scores (80-92%)

---

**Action 3: Show Warm Connections** (1 minute)
1. Click "Warm Connections" tab
2. Scroll to show connection path cards

**Script:**
> "The Warm Connections tab helps you find people to introduce you. You can see the mutual connections and the strength of the relationship.
>
> Each card shows who you know in common and how you can be introduced."

**Action:** Show one connection path card:
- Mutual contact name
- Target contact name
- Relationship strength indicator
- Add/Edit/Delete buttons

---

**Action 4: Load Demo Data** (1 minute)
1. Scroll to bottom of page
2. Click "📊 Load Demo Data" button
3. Show loading animation and success message

**Script:**
> "For the demo, let me load sample data so you can see the features in action."

**Wait:** Let data load (2-3 seconds)

**Then:** Refresh page by clicking "Suggestions" tab to show populated data

**Visual:** Contacts appear in all tabs with varied data

---

### Section 3: UC-093 - Relationship Maintenance (5 minutes)

**Action 1: Navigate to Maintenance** (1 minute)
1. Click "💌 Maintenance" button in NavBar
2. Show Maintenance page loads

**Script:**
> "Now let's look at UC-093 - Relationship Maintenance Automation. This helps you stay on top of your network relationships.
>
> We have three main areas here: Statistics, Reminders, and Templates."

**Visual:** Show statistics dashboard:
- Total Reminders count
- Overdue count
- Due Today count
- Due This Week count

---

**Action 2: Show Templates** (2 minutes)
1. Click "Templates" sub-tab
2. Scroll through templates

**Script:**
> "Let me show you the Templates first. We have 15 professional outreach templates organized by category:
>
> - Check In (3 variations)
> - Congratulations (3 variations)
> - Birthday (3 variations)
> - Follow Up (3 variations)
> - Industry Update (3 variations)
> - Custom options (3 variations)"

**Action:** Scroll through categories:
1. Point to "✅ Check In" section - show 3 templates
2. Point to "🎉 Congratulations" section - show 3 templates
3. Point to "🎂 Birthday" section - show 3 templates

**Script:**
> "Each template has personalization placeholders like [Name], [Company], and [Topic] that you can fill in when you use them."

**Action:** 
1. Find a template in Birthday section
2. Click "📋 Copy" button
3. Show success message: "Template copied to clipboard!"

---

**Action 3: Create a Reminder** (1.5 minutes)
1. Click "Reminders" sub-tab
2. Click "➕ Add Reminder" button
3. Show modal form

**Script:**
> "Now let's create a reminder using one of these templates. I'll fill in the form."

**Action:** Fill out form with example data:
```
Contact Name: Sarah Chen
Company: Google
Reminder Type: birthday
Date: December 15, 2024
Custom Message: [paste template text and personalize it]
```

**Script after filling:**
> "The custom message field is perfect for pasting a template and personalizing it with specific details."

**Action:** Click "Create Reminder" button

**Wait:** Show success message: "Reminder created successfully!"

---

**Action 4: Show Reminder Management** (0.5 minutes)
1. Scroll through reminders list
2. Point out urgency badges

**Script:**
> "Now you can see your reminder in the list. The colored badges show urgency:
> - Blue = Due today
> - Yellow = Due this week
> - Red = Overdue
>
> You can complete or delete reminders as needed."

**Visual:** Show reminder card with:
- Contact name
- Company
- Status badge
- Complete and Delete buttons

---

## Key Features to Highlight

### UC-092 Strengths
✅ Multiple discovery paths (suggestions, connections, leaders, alumni, events)
✅ Smart contact matching with scores
✅ Connection path visualization
✅ Demo data loading for testing
✅ Responsive UI

### UC-093 Strengths
✅ Real-time statistics dashboard
✅ 15 professional templates with 6 categories
✅ Easy reminder creation and management
✅ Urgency indicators (color-coded)
✅ One-click template copying
✅ Persistent reminders in database

---

## Q&A Likely Questions

**Q: How are contacts suggested?**
> A: We use company targeting and role matching. Contacts are weighted by similarity to your goals and relevance to your target industries.

**Q: Can I customize templates?**
> A: Currently, we provide 15 professional templates. In the future, we'll allow users to create custom templates and save favorites.

**Q: How do reminders work?**
> A: You set a date, and we display the reminder with increasing urgency as the date approaches. The status badge changes color (blue → yellow → red).

**Q: Where does the data come from?**
> A: For the demo, we load sample data. In production, data would come from LinkedIn integration and user-imported contacts.

**Q: What happens when I click Complete?**
> A: The reminder is marked complete and removed from your active list, but the history is maintained for analytics.

---

## Backup Plans

### If Backend Won't Start
- Show pre-recorded demo video on laptop
- Explain architecture and features verbally
- Show database schema in Supabase console

### If Templates Don't Display
- Clear browser cache: DevTools → Clear Storage → Refresh
- Reload page with Ctrl+Shift+R
- Fall back to showing code on screen

### If Reminders API Fails
- Check backend logs: Look for error messages
- Verify database connection in Supabase console
- Restart backend server

---

## Demo Success Metrics

- [ ] Navigation works smoothly without delay
- [ ] All 5 UC-092 tabs display content
- [ ] All 15 templates visible and organized
- [ ] Template copy functionality works
- [ ] Reminder creation successful
- [ ] Statistics dashboard calculates correctly
- [ ] No console errors or warnings
- [ ] All buttons and forms responsive
- [ ] Professional appearance maintained

---

## Post-Demo Next Steps

1. **Feedback Collection**
   - Ask about feature completeness
   - Gather enhancement suggestions
   - Confirm demo 2.4 requirements met

2. **Final Polish**
   - Fix any identified bugs
   - Optimize performance if needed
   - Add final styling touches

3. **Deployment Preparation**
   - Document deployment steps
   - Create production checklist
   - Prepare environment variables

4. **User Documentation**
   - Create user guide for features
   - Record feature walkthrough video
   - Prepare FAQ document

---

## Demo Timing Breakdown

| Section | Time | Notes |
|---------|------|-------|
| Introduction | 1 min | Set context |
| Industry Contacts Navigation | 1 min | Show tabs |
| Suggestions/Connections | 2 min | Show data |
| Demo Data Load | 1 min | Populate tabs |
| Maintenance Navigation | 1 min | Show layout |
| Templates Showcase | 2 min | Browse categories |
| Copy Template | 1 min | Show functionality |
| Create Reminder | 1.5 min | Fill and submit form |
| Show Reminder | 0.5 min | Point out features |
| Q&A | 3 min | Answer questions |
| **Total** | **~14 min** | **Within 15-min slot** |

---

## Success Story: Complete Workflow

**Scenario:** Following up with Sarah Chen after her birthday

**Before UC-093:**
- Remember to follow up (might forget)
- Manually compose message (time-consuming)
- Track in separate system (disconnected)

**With UC-093:**
1. Set birthday reminder (October)
2. On her birthday, get notification
3. Browse birthday templates
4. Copy professional template (2 seconds)
5. Personalize with her name and context
6. Send message same day
7. Mark complete in system

**Result:** Better relationship maintenance, less effort, professional follow-ups

---

**Demo Created:** December 5, 2024
**Status:** READY TO PRESENT
**Prepared By:** Development Team
**Reviewed:** Ready for stakeholder demo December 6, 2024
