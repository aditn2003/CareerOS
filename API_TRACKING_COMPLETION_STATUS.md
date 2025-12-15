# API Tracking Completion Status

## ✅ Files with Tracking Added/Updated

### Resend Email API
- ✅ `backend/routes/interviewInsights.js` - Follow-up email sending
- ✅ `backend/routes/informationalInterviews.js` - Interview request and follow-up emails
- ✅ `backend/routes/referrals.js` - Referral request emails
- ✅ `backend/server.js` - Deadline reminder emails
- ✅ `backend/utils/schedulingHelpers.js` - Interview reminders and confirmations

### OpenAI API
- ✅ `backend/routes/companyResearch.js` - Company research
- ✅ `backend/routes/interviewInsights.js` - Interview insights, question banks, follow-up templates
- ✅ `backend/routes/match.js` - Job match analysis
- ✅ `backend/routes/coverLetterAI.js` - Cover letter generation, experience analysis, refinement
- ✅ `backend/routes/resumes.js` - OpenAI fallback (when Gemini rate limited)

### Google Gemini AI
- ✅ `backend/routes/marketBenchmarks.js` - Market benchmark generation
- ✅ `backend/routes/jobRoutes.js` - Job import from URLs
- ✅ `backend/routes/resumes.js` - Resume parsing, optimization, reconciliation

### Geocoding Services
- ✅ `backend/routes/geocoding.js` - Nominatim (OpenStreetMap) and TimeZoneDB

### SERP API
- ✅ `backend/routes/companyResearch.js` - Company research
- ✅ `backend/routes/interviewInsights.js` - Community snippets search

### News API
- ✅ `backend/routes/companyResearch.js` - Company news

### LinkedIn API
- ✅ `backend/routes/linkedin.js` - OAuth and profile fetching

### Wikipedia API
- ✅ `backend/routes/companyResearch.js` - Company information

### GitHub API
- ⚠️ `backend/services/githubService.js` - Needs tracking (uses axios.get)
- ⚠️ `backend/routes/github.js` - Routes call githubService, may need tracking

## ⚠️ Files That May Need Tracking (Need to Verify)

These files make API calls but tracking status needs verification:

- `backend/routes/responseCoaching.js` - Check for OpenAI calls
- `backend/routes/mockInterviews.js` - Check for OpenAI/Gemini calls
- `backend/routes/technicalPrep.js` - Check for OpenAI/Gemini calls
- `backend/routes/salaryResearch.js` - Check for API calls
- `backend/routes/interviewAnalytics.js` - Check for OpenAI calls
- `backend/routes/salaryNegotiation.js` - Check for API calls
- `backend/routes/coverLetterTemplates.js` - Check for SERP/OpenAI calls
- `backend/routes/dashboard.js` - Check for SERP/API calls
- `backend/routes/marketIntel.js` - Check for SERP/OpenAI calls
- `backend/routes/successAnalysis.js` - Check for API calls
- `backend/routes/interviewAnalysis.js` - Check for API calls
- `backend/routes/job.js` - Check for geocoding/API calls

## Notes

- All Resend email calls are now tracked with userId
- All OpenAI calls now use `trackApiCall` wrapper
- Google Gemini calls in resumes.js now track with userId
- Geocoding (Nominatim and TimeZoneDB) is tracked
- Need to verify remaining files and add tracking as needed

## Next Steps

1. Verify remaining route files for API calls
2. Add tracking to GitHub service if needed
3. Test all tracked services to ensure usage numbers appear in dashboard
