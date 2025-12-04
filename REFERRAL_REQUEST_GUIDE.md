# UC-087: Referral Request Management - Implementation Guide

## Overview
The Referral Request Management feature enables users to track and manage referral requests, effectively leveraging their professional network for job opportunities. This feature includes intelligent recommendations, relationship health tracking, and comprehensive analytics.

## Features Implemented

### 1. **Referral Request Creation**
- Create referral requests linked to specific job applications
- Select from a list of professional contacts
- Get suggested contacts based on job industry/company
- Personalize referral messages with context
- Track timing recommendations to avoid overwhelming contacts

**Files:**
- Backend: `backend/routes/referrals.js` - `POST /api/referrals/requests`
- Frontend: `frontend/src/components/ReferralRequests.jsx`

### 2. **Smart Contact Suggestions**
- Automatically suggests contacts from the same industry as the target job
- Suggests contacts who work at companies relevant to the position
- Filters by relationship strength
- Helps identify the best people to approach for referrals

**Endpoint:** `GET /api/referrals/suggestions/contacts/:job_id`

### 3. **Timing Recommendations**
- Analyzes recent referral requests to the same contact
- Alerts when a contact has been asked recently
- Suggests optimal timing based on relationship history
- Prevents referral fatigue

**Endpoint:** `GET /api/referrals/recommendations/timing/:contact_id`

### 4. **Request Status Tracking**
Track referral requests through their lifecycle:
- **pending** - Awaiting response from referrer
- **accepted** - Referrer has agreed to provide referral
- **referred** - Referral has been submitted
- **rejected** - Referrer declined to provide referral
- **withdrawn** - User withdrew the request
- **completed** - Process is complete (outcome determined)

**API:** `PUT /api/referrals/requests/:id`

### 5. **Outcome Tracking**
Monitor the actual results of referrals:
- Interview scheduled
- Job offer received
- Application rejected
- In progress
- Unknown outcome

**Database Field:** `referral_outcome` in `referral_requests` table

### 6. **Relationship Health Monitoring**
- Track relationship strength before and after referral request
- Monitor how referrals impact professional relationships
- Identify positive/neutral/negative impacts
- Measure reciprocity through gratitude tracking

**Fields:**
- `relationship_strength_before` - Baseline relationship score (1-5)
- `relationship_strength_after` - Updated score after referral
- `relationship_impact` - Positive/neutral/negative
- `gratitude_expressed` - Boolean flag for thank-you status

### 7. **Follow-up Management**
Create and track follow-up communications:
- **check_in** - Light check-in on status
- **reminder** - Gentle reminder about the referral
- **gratitude** - Thank you message
- **outcome_update** - Update with job outcome
- **custom** - Custom follow-up message

**Database:** `referral_followups` table

**API Endpoints:**
- `GET /api/referrals/requests/:id/followups`
- `POST /api/referrals/requests/:id/followups`
- `PUT /api/followups/:id`

### 8. **Referral Templates**
Pre-built personalized message templates:

**Types:**
- `initial_request` - Template for initial referral request
- `followup` - Template for follow-up messages
- `gratitude` - Template for thank-you notes
- `rejection_handling` - Template for handling rejections

**API Endpoints:**
- `GET /api/referrals/templates`
- `POST /api/referrals/templates`

### 9. **Analytics Dashboard**
Comprehensive analytics showing:
- Total referral requests
- Success rate (% that resulted in referrals)
- Average response time (in days)
- Number of interviews resulting from referrals
- Number of job offers from referrals
- Status breakdown chart
- Outcome breakdown chart

**Endpoint:** `GET /api/referrals/analytics`

### 10. **Referral Etiquette Guidance**
Built-in best practices:
- **Request Timing Score** (1-10) - How well-timed is the request?
- **Personalization Score** (1-10) - How personalized is the message?
- **Followup Score** (1-10) - How appropriate is the follow-up?
- Timing recommendations prevent requests too close together
- Guidance on expressing gratitude appropriately

## Database Schema

### referral_requests Table
```sql
CREATE TABLE referral_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id),
    job_id INTEGER REFERENCES jobs(id),
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP,
    referral_submitted_date TIMESTAMP,
    referral_message TEXT,
    why_good_fit TEXT,
    industry_keywords TEXT,
    relationship_strength_before INTEGER,
    relationship_strength_after INTEGER,
    relationship_impact VARCHAR(50),
    referral_outcome VARCHAR(50),
    request_timing_score INTEGER,
    personalization_score INTEGER,
    followup_score INTEGER,
    gratitude_expressed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    referrer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### referral_followups Table
```sql
CREATE TABLE referral_followups (
    id SERIAL PRIMARY KEY,
    referral_request_id INTEGER NOT NULL REFERENCES referral_requests(id),
    followup_type VARCHAR(50) NOT NULL,
    followup_message TEXT,
    followup_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### referral_templates Table
```sql
CREATE TABLE referral_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    template_text TEXT NOT NULL,
    industry_focus VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### referral_statistics Table
Aggregate statistics for each user:
```sql
CREATE TABLE referral_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    total_requests INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    referrals_resulted_in_interview INTEGER DEFAULT 0,
    referrals_resulted_in_offer INTEGER DEFAULT 0,
    average_response_time_days INTEGER,
    average_relationship_impact_score DECIMAL(3, 2),
    total_interviews_from_referrals INTEGER DEFAULT 0,
    total_offers_from_referrals INTEGER DEFAULT 0,
    most_helpful_industry VARCHAR(255),
    most_helpful_contact_id INTEGER,
    last_referral_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Referral Requests

#### Create Referral Request
```
POST /api/referrals/requests
Content-Type: application/json
Authorization: Bearer {token}

{
  "contact_id": 1,
  "job_id": 5,
  "job_title": "Senior Software Engineer",
  "company": "Google",
  "referral_message": "Hi John, I'm applying to Google for...",
  "why_good_fit": "I have 5+ years of backend experience...",
  "industry_keywords": "Machine Learning, Cloud Architecture",
  "request_timing_score": 8,
  "personalization_score": 9
}
```

#### Get All Referral Requests
```
GET /api/referrals/requests?status=pending&contact_id=1&job_id=5
Authorization: Bearer {token}
```

#### Get Single Referral Request
```
GET /api/referrals/requests/:id
Authorization: Bearer {token}
```

#### Update Referral Request
```
PUT /api/referrals/requests/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "referred",
  "referral_outcome": "interview_scheduled",
  "gratitude_expressed": true,
  "referrer_notes": "John mentioned the hiring manager knows about my background"
}
```

#### Delete Referral Request
```
DELETE /api/referrals/requests/:id
Authorization: Bearer {token}
```

### Follow-ups

#### Get Follow-ups for a Referral
```
GET /api/referrals/requests/:id/followups
Authorization: Bearer {token}
```

#### Create Follow-up
```
POST /api/referrals/requests/:id/followups
Content-Type: application/json
Authorization: Bearer {token}

{
  "followup_type": "check_in",
  "followup_message": "Just checking in on the referral status",
  "followup_date": "2025-12-15",
  "notes": "John seemed positive about it"
}
```

#### Update Follow-up
```
PUT /api/followups/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "completed": true,
  "completed_date": "2025-12-15T14:30:00Z",
  "notes": "Sent via email"
}
```

### Templates

#### Get All Templates
```
GET /api/referrals/templates
Authorization: Bearer {token}
```

#### Create Template
```
POST /api/referrals/templates
Content-Type: application/json
Authorization: Bearer {token}

{
  "template_name": "Tech Industry Initial Request",
  "template_type": "initial_request",
  "template_text": "Hi {{contact_name}}, I'm reaching out because...",
  "industry_focus": "Technology",
  "is_default": false
}
```

### Analytics & Statistics

#### Get Referral Statistics
```
GET /api/referrals/statistics
Authorization: Bearer {token}
```

#### Get Analytics Dashboard Data
```
GET /api/referrals/analytics
Authorization: Bearer {token}

Response:
{
  "totalRequests": 12,
  "statusBreakdown": {
    "pending": 2,
    "referred": 8,
    "rejected": 2
  },
  "outcomeBreakdown": {
    "interview_scheduled": 4,
    "job_offer": 1,
    "in_progress": 2,
    "unknown": 5
  },
  "averageResponseTimeDays": 5,
  "successRate": "66.67%",
  "interviewsFromReferrals": 4,
  "offersFromReferrals": 1
}
```

### Suggestions & Recommendations

#### Get Suggested Contacts for a Job
```
GET /api/referrals/suggestions/contacts/:job_id
Authorization: Bearer {token}

Response:
{
  "job": {
    "id": 5,
    "title": "Senior Software Engineer",
    "company": "Google",
    "industry": "Technology"
  },
  "suggestedContacts": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "company": "Google",
      "title": "Engineering Manager",
      "relationship_strength": 5
    }
  ]
}
```

#### Get Timing Recommendations
```
GET /api/referrals/recommendations/timing/:contact_id
Authorization: Bearer {token}

Response:
{
  "recommendedTiming": "caution",
  "reason": "Recent request - consider if your contact might be busy",
  "daysToWait": 0,
  "recentReferralCount": 1
}
```

## Frontend Components

### ReferralRequests Component
Main component located in `frontend/src/components/ReferralRequests.jsx`

**Features:**
- Create new referral requests
- View all referral requests with filtering
- See detailed view of each referral
- Update status and outcomes
- Track follow-ups
- View analytics dashboard
- Get smart recommendations

**Props:** None (uses context/localStorage for auth)

**State:**
- `referrals` - Array of referral requests
- `jobs` - Available jobs to link referrals to
- `contacts` - Available contacts to request referrals from
- `selectedReferral` - Currently selected referral for details
- `statistics` - User's referral statistics
- `analytics` - Analytics dashboard data
- `templates` - User's saved templates
- `timingRecommendations` - Smart timing recommendations

### ReferralDetailsModal Component
Modal for viewing and editing individual referral details

**Features:**
- View full referral information
- Edit status, outcome, and notes
- Mark gratitude as expressed
- Delete referral request

## Usage Instructions

### For Users

1. **Create a Referral Request:**
   - Click "New Referral Request" button
   - Select a job application from your list
   - Choose a contact who can provide a referral
   - Review suggested contacts (if available)
   - Add a personalized message
   - Set personalization and timing scores
   - Click "Create Referral Request"

2. **Track Status:**
   - View all requests in the list
   - Filter by status (pending, accepted, referred, etc.)
   - Click on a request to see full details
   - Update status when you hear back from the referrer

3. **Manage Follow-ups:**
   - Create follow-up reminders in the details modal
   - Track which follow-ups have been completed
   - Keep notes on each interaction

4. **View Analytics:**
   - See dashboard with key metrics
   - Track success rate and interview outcomes
   - Identify most helpful contacts and industries
   - Monitor average response times

5. **Optimize Your Process:**
   - Watch timing recommendations to avoid burnout
   - Use templates for consistent messaging
   - Express gratitude to maintain relationships
   - Track relationship impact to build stronger network

### For Developers

1. **Enable the Feature in App.jsx:**
   ```javascript
   import ReferralRequests from './components/ReferralRequests';
   
   // In your routing or component tree
   <Route path="/referrals" element={<ReferralRequests />} />
   ```

2. **Database Setup:**
   - Run the schema file: `backend/db/add_referrals_schema.sql`
   - Ensure Supabase connection is configured in `auth.js`

3. **Authentication:**
   - Component requires `Authorization: Bearer {token}` header
   - Token stored in localStorage as `'token'`
   - All endpoints check `req.user.id` from JWT

4. **Add Navigation Link:**
   Include referral management in your main navigation menu

## Best Practices for Referral Requests

### Timing
- **Wait 1-2 weeks** between requests to same contact
- **Avoid weekends and holidays**
- **Consider time zones** for international contacts
- **Don't ask multiple times** for same position

### Personalization
- **Explain why they specifically** can help
- **Reference your history** with the contact
- **Show knowledge** of their current role
- **Make it easy** for them to help

### Follow-up
- **Follow up within 1 week** if no response
- **Don't be pushy** - give them space
- **Provide updates** on the process
- **Express gratitude** regardless of outcome

### Relationship Maintenance
- **Always say thank you** - even for rejections
- **Keep referrer updated** on job outcome
- **Offer reciprocal help** when possible
- **Stay in touch** beyond the job search

## Acceptance Criteria Verification

✅ **Identify potential referral sources** - Component suggests contacts based on industry/company
✅ **Generate personalized referral request templates** - Template system with pre-built messages
✅ **Track referral request status** - Status field tracks: pending, accepted, referred, rejected, etc.
✅ **Monitor referral success rates** - Analytics show interviews and offers from referrals
✅ **Include referral etiquette guidance** - Timing scores, personalization scores, best practices
✅ **Suggest optimal timing** - Recommendations prevent asking contacts too frequently
✅ **Track referral outcomes** - Outcomes track interviews, offers, rejections
✅ **Maintain relationship health** - Relationship strength before/after, gratitude tracking
✅ **Frontend verification** - Can create, track status, manage follow-ups

## Future Enhancements

1. **Email Integration** - Send referral requests directly via email
2. **Calendar Integration** - Sync follow-up dates with calendar
3. **AI-Powered Message Generation** - Generate personalized messages automatically
4. **Referral Network Visualization** - Visual graph of your referral network
5. **Batch Follow-ups** - Send follow-ups to multiple referrals at once
6. **Referral Success Predictions** - ML model predicts likelihood of successful referral
7. **Networking Event Tracking** - Link referrals to networking events
8. **Reciprocal Referral Tracking** - Track when you provide referrals to others

## Troubleshooting

### Issue: Cannot see suggested contacts
**Solution:** Ensure you've selected a job with an industry field. Suggested contacts are filtered by matching industry or company.

### Issue: Timing recommendations not appearing
**Solution:** Click on a contact in the form to trigger the timing recommendation fetch.

### Issue: Analytics showing zero metrics
**Solution:** Wait for requests to be created and statuses updated. Analytics calculates based on actual referral history.

### Issue: Can't create referral request
**Solution:** Ensure you have:
1. At least one job in the system
2. At least one contact in the network
3. Valid job title and company filled in
4. Active authentication token

