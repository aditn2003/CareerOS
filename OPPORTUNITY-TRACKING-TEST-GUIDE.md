# Opportunity Tracking Feature - Quick Test Guide

## Quick Start (2 minutes)

### Step 1: Navigate to Feature
1. Go to **Network** → **💼 Informational Interviews**
2. Click **📅 Track Interviews** tab

### Step 2: Create/Edit Interview
1. Click **✏️ Edit** on any existing interview card
   - OR create a new interview if none exist yet

### Step 3: Mark Opportunity
1. Check the box: **✨ Opportunity Identified**
2. A text area appears below it
3. Type something like: "VP of Engineering interested in our conversation about hiring initiatives"
4. Click **Update Interview**

### Step 4: See Visual Indicator
1. Return to Track Interviews tab
2. Find the interview you just edited
3. **Notice:**
   - Gold badge with **✨ Opportunity** appears next to status
   - Below interview details, you see: **🎯 Opportunity:** [your description]

### Step 5: View Details
1. Click **View Details** on the interview
2. **Notice:**
   - New **✨ Opportunity Identified** section shows
   - It displays your description
   - Below that: **💡 Pro Tip** message about building opportunities through interactions

## What to Look For

### On Interview Cards ✓
- [ ] Gold badge appears when opportunity identified
- [ ] Badge says "✨ Opportunity"
- [ ] Badge is next to (not replacing) status badge
- [ ] Opportunity description shows on card
- [ ] Badge disappears when you uncheck the box

### In Edit Modal ✓
- [ ] Checkbox says "✨ Opportunity Identified"
- [ ] Textarea for description appears when checkbox is checked
- [ ] Textarea disappears when checkbox is unchecked
- [ ] Text area has placeholder: "Describe the opportunity identified..."

### In Details Modal ✓
- [ ] "✨ Opportunity Identified" section shows when opportunity exists
- [ ] Section displays the opportunity description
- [ ] Section has gold/amber background
- [ ] "💡 Pro Tip" section always visible below
- [ ] Pro tip reinforces: "Every interaction builds toward career opportunities"

### On Mobile ✓
- [ ] Badges wrap to new line if space is tight
- [ ] Opportunity description remains readable
- [ ] Modal works properly on small screens
- [ ] Edit button functionality unchanged

## Feature Complete Checklist

| Component | Status | Notes |
|-----------|--------|-------|
| Edit Interview Modal - Checkbox | ✅ | "✨ Opportunity Identified" |
| Edit Interview Modal - Textarea | ✅ | Conditionally shown |
| Interview Card - Badge | ✅ | Gold, sparkle emoji |
| Interview Card - Description | ✅ | Gold highlight, left border |
| Details Modal - Opportunity Section | ✅ | Conditional, gold background |
| Details Modal - Pro Tip Section | ✅ | Always visible, purple background |
| Backend API - PUT Endpoint | ✅ | Saves opportunity fields |
| CSS Styling | ✅ | All classes implemented |
| State Management | ✅ | opportunity_identified & opportunity_description |
| Mobile Responsive | ✅ | Tested on small screens |

## Expected Behavior

### Workflow: Complete Interview with Opportunity

```
1. Open Interview Card
   ↓
2. Click Edit Button
   ↓
3. Edit Modal Opens
   - Checkbox: unchecked (default)
   ↓
4. Check "✨ Opportunity Identified"
   - Textarea appears
   ↓
5. Type Opportunity Description
   - "Great connection with CTO at TechCorp"
   ↓
6. Click "Update Interview"
   ↓
7. Return to Card View
   - Gold badge ✨ visible
   - Description shows
   ↓
8. Click "View Details"
   - Opportunity section visible
   - Pro tip visible
```

## Styling Verification

### Opportunity Badge
- **Background:** Gold gradient (#fbbf24 → #f59e0b)
- **Text:** White, bold, 0.85rem font
- **Shape:** Rounded pill (20px border-radius)
- **Shadow:** Subtle shadow for depth

### Opportunity Description (Card)
- **Background:** Light gold (#fbbf24 @ 10% opacity)
- **Border:** Left accent, 3px solid gold
- **Text:** Dark brown (#7c4a1a), bold

### Pro Tip Box (Modal)
- **Background:** Light purple gradient
- **Border:** Left accent, 4px solid purple
- **Text:** Dark purple (#5b21b6), readable

## Troubleshooting

### Badge Not Showing?
- [ ] Check that you checked the "✨ Opportunity Identified" box
- [ ] Click Update Interview button
- [ ] Refresh page or navigate away and back

### Textarea Not Appearing?
- [ ] Make sure checkbox is actually checked
- [ ] May need to wait a moment for React state to update
- [ ] Try unchecking and rechecking

### Details Not Saving?
- [ ] Check browser console for errors
- [ ] Verify you're logged in
- [ ] Check network tab in DevTools for failed requests
- [ ] Verify backend is running on port 4000

### Mobile Issues?
- [ ] Reload page after viewport resize
- [ ] Clear browser cache if styling looks wrong
- [ ] Check that CSS file was updated

## API Endpoint Test

### Make Manual Request (DevTools Console)

```javascript
const token = localStorage.getItem("token");
const interviewId = 1; // Replace with actual ID

fetch("http://localhost:4000/api/informational-interviews/interviews/" + interviewId, {
  method: "PUT",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    status: "completed",
    opportunity_identified: true,
    opportunity_description: "Great opportunity - VP wants to hire"
  })
}).then(r => r.json()).then(console.log)
```

Expected response: `{ data: { ...interview with opportunity fields... } }`

## Success Criteria

✅ **Feature is working correctly when:**
1. Opportunity checkbox toggles textarea appearance/disappearance
2. Gold badge appears on card when opportunity identified
3. Badge disappears when checkbox unchecked
4. Opportunity description displays on card
5. Details modal shows opportunity section when opportunity exists
6. Pro tip message visible in details modal
7. All data persists after page refresh
8. Mobile view displays properly
9. API endpoint saves and retrieves data correctly

## Quick Commands

### Check Backend is Running
```powershell
# Terminal
curl http://localhost:4000/api/health

# Should return something if backend is ready
```

### Check Frontend Development Server
```powershell
# Should see Vite dev server output on port 5173 or 5174
```

### View Recent Changes
```powershell
# See what was modified
git diff frontend/src/components/InformationalInterviews.jsx
git diff frontend/src/styles/InformationalInterviews.css
git diff backend/routes/informationalInterviews.js
```

## Files Modified Summary

| File | Lines Changed | Purpose |
|------|----------------|---------|
| InformationalInterviews.jsx | ~50 | Add opportunity fields, form handlers, UI sections |
| InformationalInterviews.css | ~50 | Add styling for badges, boxes, sections |
| informationalInterviews.js (backend) | ~10 | Update PUT endpoint to handle opportunity fields |

## Notes

- Feature is opt-in (checkbox control)
- No breaking changes to existing functionality
- Database columns already existed - no migrations needed
- Fully backward compatible with existing interviews
- Mobile responsive design included
- Accessibility: Labels, semantic HTML, color contrasts

---

**Ready to test!** Start with Step 1 above and follow through Step 5. 
The feature should be fully functional and ready for user testing. 🚀
