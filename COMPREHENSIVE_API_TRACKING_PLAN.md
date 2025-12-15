# Comprehensive API Tracking Integration Plan

## Status

✅ **Completed:**
- Database schema created
- API tracking service created
- Admin dashboard created
- **companyResearch.js** - All API calls tracked (Wikipedia, News API, OpenAI)
- **interviewInsights.js** - SERP API, OpenAI calls, Resend emails tracked

## Remaining Routes to Integrate

Based on grep results, these routes use external APIs and need tracking:

### High Priority (Most Used APIs)

1. **coverLetterAI.js** - OpenAI API
2. **responseCoaching.js** - OpenAI API
3. **mockInterviews.js** - OpenAI API
4. **technicalPrep.js** - OpenAI API
5. **salaryResearch.js** - External APIs (check which ones)
6. **salaryNegotiation.js** - OpenAI API
7. **marketBenchmarks.js** - External APIs
8. **geocoding.js** - Google Geocoding API
9. **github.js** - GitHub API
10. **coverLetterTemplates.js** - Check if uses APIs

### Medium Priority

11. **resumes.js** - Check if uses APIs
12. **match.js** - Check if uses APIs
13. **jobRoutes.js** - Check if uses APIs

## Integration Pattern

For each route file:

1. **Import tracking:**
   ```javascript
   import { trackApiCall } from "../utils/apiTrackingService.js";
   ```

2. **Wrap API calls:**
   ```javascript
   // Before:
   const response = await axios.post("https://api.openai.com/...");
   
   // After:
   const response = await trackApiCall(
     'openai',
     () => axios.post("https://api.openai.com/..."),
     {
       endpoint: '/v1/chat/completions',
       method: 'POST',
       userId: req.user?.id || null,
       requestPayload: { model: 'gpt-4o-mini' },
       estimateCost: 0.001
     }
   );
   ```

3. **Track different service types:**
   - OpenAI → `'openai'`
   - SERP → `'serp'`
   - News API → `'news_api'`
   - Resend → `'resend'`
   - GitHub → `'github'`
   - Google Geocoding → `'google_geocoding'`
   - Wikipedia → `'wikipedia'`

## Next Steps

1. Integrate tracking into remaining routes
2. Test that dashboard shows data
3. Verify error logging works
4. Check quota tracking accuracy
