# Comprehensive API Tracking Status

## ✅ Completed Tracking Integrations

### Resend Email API
- ✅ `backend/routes/interviewInsights.js` - Follow-up email sending
- ✅ `backend/routes/informationalInterviews.js` - Interview request emails (2 locations)
- ✅ `backend/routes/referrals.js` - Referral request emails
- ✅ `backend/server.js` - Deadline reminder emails (sendDeadlineReminders function)
- ✅ `backend/utils/schedulingHelpers.js` - Interview reminders and confirmations (2 functions)

### OpenAI API
- ✅ `backend/routes/companyResearch.js` - AI-powered company research
- ✅ `backend/routes/interviewInsights.js` - Interview insights generation, question banks, follow-up templates
- ✅ Already tracked via `trackApiCall` wrapper

### SERP API
- ✅ `backend/routes/interviewInsights.js` - Community snippets search
- ✅ `backend/routes/companyResearch.js` - Company research
- ✅ Already tracked via `trackApiCall` wrapper

### Google Gemini AI
- ✅ `backend/routes/marketBenchmarks.js` - Market benchmark generation
- ✅ `backend/routes/jobRoutes.js` - Job import from URLs
- ✅ Already tracked with manual logging (SDK pattern)

### LinkedIn API
- ✅ `backend/routes/linkedin.js` - OAuth token exchange and profile fetching
- ✅ Already tracked via `trackApiCall` wrapper

### Wikipedia API
- ✅ `backend/routes/companyResearch.js` - Company information scraping
- ✅ Already tracked via `trackApiCall` wrapper

### News API
- ✅ `backend/routes/companyResearch.js` - Company news fetching
- ✅ Already tracked via `trackApiCall` wrapper

### Geocoding Services
- ✅ `backend/routes/geocoding.js` - Nominatim (OpenStreetMap) geocoding
- ✅ `backend/routes/geocoding.js` - TimeZoneDB timezone lookup
- ✅ Just added tracking via `trackApiCall` wrapper

## ⚠️ Files That May Need Additional Tracking

### Files Using OpenAI (Check if tracking exists):
- `backend/routes/resumes.js`
- `backend/routes/match.js`
- `backend/routes/responseCoaching.js`
- `backend/routes/job.js`
- `backend/routes/marketIntel.js`
- `backend/routes/salaryResearch.js`
- `backend/routes/coverLetterAI.js`
- `backend/routes/coverLetterTemplates.js`
- `backend/routes/interviewAnalytics.js`
- `backend/routes/salaryNegotiation.js`
- `backend/routes/mockInterviews.js`
- `backend/routes/technicalPrep.js`

### Files Using SERP API (Check if tracking exists):
- `backend/routes/coverLetterTemplates.js`
- `backend/routes/dashboard.js`
- `backend/routes/marketIntel.js`
- `backend/routes/match.js`
- `backend/routes/github.js`
- `backend/routes/coverLetterAI.js`

### Files Using GitHub API:
- `backend/services/githubService.js` - Uses GitHub API via axios
- `backend/routes/github.js` - Routes that call githubService
- **Action Needed**: Add tracking to githubService.js for GitHub API calls

### Files Using Supabase:
- Many route files use Supabase client for database operations
- **Note**: Supabase is primarily used for database operations (not external API calls in the traditional sense), but if we want to track Supabase API calls, they would need to be instrumented in the Supabase client wrapper

## Database Schema Status

The following services are configured in `api_services` table:
- ✅ openai
- ✅ serp
- ✅ news_api
- ✅ resend
- ✅ github
- ✅ google_geocoding (used for Nominatim and TimeZoneDB)
- ✅ google_gemini
- ✅ linkedin
- ✅ wikipedia
- ✅ supabase

## Testing Recommendations

After adding tracking, test the following features to verify tracking works:

1. **Resend Emails**:
   - Send follow-up email from Interview Insights
   - Send informational interview request
   - Send referral request
   - Check that usage shows in dashboard

2. **Geocoding**:
   - Use geocoding endpoint to lookup a location
   - Check dashboard for google_geocoding usage

3. **Other APIs**:
   - Use Company Research → Should log Wikipedia, News API, SERP, OpenAI
   - Use Interview Insights → Should log SERP, OpenAI
   - Use Market Benchmarks → Should log Google Gemini
   - Use Job Import → Should log Google Gemini

## Next Steps

1. ✅ All Resend email calls are now tracked
2. ✅ Geocoding calls are now tracked
3. ⚠️ Review other route files to ensure all external API calls are tracked
4. ✅ Dashboard displays all data correctly
5. ⚠️ Consider adding tracking to GitHub service if needed

## Notes

- Some services (like Supabase) are used primarily for database operations and may not need explicit API tracking
- SDK-based services (Resend, GoogleGenerativeAI) require manual tracking due to their error-handling patterns
- All axios-based API calls can use the `trackApiCall` wrapper for automatic tracking
