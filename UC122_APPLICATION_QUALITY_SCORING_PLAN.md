# UC-122: Application Package Quality Scoring - Implementation Plan

## Overview
AI-powered quality scoring system for job application packages (resume, cover letter, LinkedIn) with actionable improvement suggestions and submission threshold enforcement.

---

## **STAGE 1: Database Schema & Core Infrastructure** 
*Estimated Time: 2-3 days*

### 1.1 Database Schema
**File**: `backend/db/create_application_quality_scores.sql`

```sql
-- Application Quality Scores Table
CREATE TABLE IF NOT EXISTS application_quality_scores (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score Components (0-100)
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    resume_score INTEGER NOT NULL CHECK (resume_score >= 0 AND resume_score <= 100),
    cover_letter_score INTEGER NOT NULL CHECK (cover_letter_score >= 0 AND cover_letter_score <= 100),
    linkedin_score INTEGER, -- Optional, nullable
    
    -- Detailed Breakdown (JSON)
    score_breakdown JSONB NOT NULL, -- Stores detailed analysis
    missing_keywords TEXT[], -- Keywords from JD not found
    missing_skills TEXT[], -- Skills from JD not found
    formatting_issues JSONB, -- Formatting/typo issues
    inconsistencies JSONB, -- Cross-material inconsistencies
    
    -- Improvement Suggestions (JSON)
    improvement_suggestions JSONB NOT NULL, -- Array of {priority, category, suggestion, impact}
    
    -- Comparison Metrics
    user_average_score DECIMAL(5,2), -- User's average across all applications
    top_performer_score DECIMAL(5,2), -- Top score in user's history
    
    -- Status
    meets_threshold BOOLEAN NOT NULL DEFAULT false, -- Whether score >= minimum_threshold
    minimum_threshold INTEGER NOT NULL DEFAULT 70, -- Configurable threshold
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one score per job (can be updated)
    CONSTRAINT unique_job_quality_score UNIQUE(job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_scores_job_id ON application_quality_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_user_id ON application_quality_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_created_at ON application_quality_scores(created_at);

-- Score History Table (for tracking improvements over time)
CREATE TABLE IF NOT EXISTS application_quality_score_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    score_breakdown JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_job_id ON application_quality_score_history(job_id);
CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON application_quality_score_history(user_id);
```

### 1.2 Backend Service Structure
**File**: `backend/services/qualityScoringService.js`

- Create service module for scoring logic
- Integrate with existing Gemini AI client
- Text extraction utilities for PDF/DOCX files
- Keyword matching algorithms
- Formatting/error detection utilities

### 1.3 API Route Setup
**File**: `backend/routes/qualityScoring.js`

- Create router module
- Set up authentication middleware
- Define route structure

---

## **STAGE 2: AI Analysis Engine - Core Scoring Logic**
*Estimated Time: 4-5 days*

### 2.1 Text Extraction & Material Aggregation
**Function**: `aggregateApplicationMaterials(jobId, userId)`
- Fetch resume from `resumes` table (sections JSON)
- Fetch cover letter from `cover_letters` table
- Extract text from PDF/DOCX if needed
- Fetch LinkedIn profile data (if available)
- Combine all materials into analysis-ready format

### 2.2 Job Description Analysis
**Function**: `analyzeJobDescription(jobDescription, requiredSkills)`
- Extract keywords from job description
- Identify required skills
- Parse job requirements and qualifications
- Create structured requirement object

### 2.3 AI-Powered Scoring Prompt
**Function**: `generateQualityScorePrompt(materials, jobDescription)`

Create comprehensive Gemini prompt that:
- Analyzes alignment between materials and job requirements
- Scores resume (0-100) based on:
  - Keyword match percentage
  - Skills alignment
  - Experience relevance
  - Quantified achievements
  - ATS optimization
- Scores cover letter (0-100) based on:
  - Job-specific customization
  - Keyword integration
  - Professional tone
  - Call-to-action clarity
- Identifies missing keywords and skills
- Flags formatting issues and typos
- Detects inconsistencies across materials
- Generates prioritized improvement suggestions

**Expected AI Response Structure**:
```json
{
  "overall_score": 75,
  "resume_score": 80,
  "cover_letter_score": 70,
  "linkedin_score": null,
  "score_breakdown": {
    "keyword_match": 85,
    "skills_alignment": 70,
    "experience_relevance": 80,
    "formatting_quality": 90,
    "quantification": 75
  },
  "missing_keywords": ["React", "TypeScript", "Agile"],
  "missing_skills": ["AWS", "Docker"],
  "formatting_issues": [
    {
      "type": "typo",
      "location": "resume.summary",
      "issue": "Incorrect spelling: 'expirience'",
      "severity": "high"
    }
  ],
  "inconsistencies": [
    {
      "type": "date_mismatch",
      "location": "resume vs cover_letter",
      "issue": "Employment dates don't match",
      "severity": "medium"
    }
  ],
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "keywords",
      "suggestion": "Add 'React' and 'TypeScript' to resume skills section",
      "impact": "Could increase keyword match by 10 points",
      "estimated_score_improvement": 5
    },
    {
      "priority": "medium",
      "category": "quantification",
      "suggestion": "Add metrics to 'Led team' bullet point (e.g., 'Led team of 5 engineers')",
      "impact": "Improves ATS parsing and demonstrates impact",
      "estimated_score_improvement": 3
    }
  ]
}
```

### 2.4 Score Calculation & Normalization
**Function**: `calculateOverallScore(aiResponse)`
- Weighted average of component scores
- Normalize to 0-100 scale
- Apply business rules for edge cases

---

## **STAGE 3: Backend API Endpoints**
*Estimated Time: 3-4 days*

### 3.1 Generate/Update Quality Score
**Endpoint**: `POST /api/quality-scoring/:jobId/analyze`
- Trigger AI analysis for a job application
- Store score in `application_quality_scores` table
- Create history entry in `application_quality_score_history`
- Return score with breakdown and suggestions

**Request**: `{ forceRefresh?: boolean }`
**Response**: Full score object with suggestions

### 3.2 Get Quality Score
**Endpoint**: `GET /api/quality-scoring/:jobId`
- Retrieve existing score for a job
- Include comparison metrics (user average, top performer)
- Return cached score if recent (< 24 hours old)

### 3.3 Get User Statistics
**Endpoint**: `GET /api/quality-scoring/user/stats`
- Calculate user's average score across all applications
- Find top-performing application score
- Return comparison metrics

### 3.4 Get Score History
**Endpoint**: `GET /api/quality-scoring/:jobId/history`
- Retrieve score history for a job (tracking improvements)
- Return timeline of score changes

### 3.5 Update Minimum Threshold
**Endpoint**: `PUT /api/quality-scoring/user/threshold`
- Allow user to configure minimum score threshold
- Default: 70, but user can customize

---

## **STAGE 4: Frontend Components - Score Display**
*Estimated Time: 3-4 days*

### 4.1 Quality Score Card Component
**File**: `frontend/src/components/QualityScoreCard.jsx`

**Features**:
- Large score display (0-100) with color coding:
  - Red: 0-59 (Below threshold)
  - Yellow: 60-69 (Near threshold)
  - Green: 70-100 (Meets threshold)
- Score breakdown visualization (radar chart or progress bars)
- Comparison indicators (vs. user average, vs. top performer)
- "Meets Threshold" badge/indicator

### 4.2 Improvement Suggestions List
**File**: `frontend/src/components/ImprovementSuggestions.jsx`

**Features**:
- Prioritized list of suggestions (High → Medium → Low)
- Category badges (Keywords, Skills, Formatting, etc.)
- Estimated impact on score
- Actionable, specific recommendations
- Expandable details for each suggestion

### 4.3 Score Breakdown Visualization
**File**: `frontend/src/components/ScoreBreakdown.jsx`

**Features**:
- Visual breakdown of score components:
  - Keyword Match
  - Skills Alignment
  - Experience Relevance
  - Formatting Quality
  - Quantification
- Progress bars or radar chart
- Tooltips with explanations

---

## **STAGE 5: Integration with Job Application Flow**
*Estimated Time: 2-3 days*

### 5.1 Job Entry Form Integration
**File**: `frontend/src/components/JobEntryForm.jsx`

**Changes**:
- Add "Analyze Quality" button after selecting resume/cover letter
- Display quality score card inline
- Show threshold status
- Disable "Save Job" button if score < threshold (with warning)

### 5.2 Job Details/Edit Page
**File**: `frontend/src/pages/Jobs/JobDetails.jsx` (or similar)

**Changes**:
- Display quality score prominently
- Show improvement suggestions
- "Re-analyze" button to refresh score after making changes
- Score history timeline

### 5.3 Submission Blocking Logic
**Function**: `validateSubmission(jobId)`
- Check if `meets_threshold === true`
- If false, show modal/warning:
  - "Your application quality score is below the minimum threshold (70)."
  - Display current score vs. threshold
  - Show top 3 improvement suggestions
  - Options: "Improve Application" or "Submit Anyway" (with confirmation)

---

## **STAGE 6: Real-Time Score Updates & History Tracking**
*Estimated Time: 2-3 days*

### 6.1 Auto-Refresh on Material Changes
**Function**: `handleMaterialChange(jobId)`
- When resume/cover letter is updated for a job
- Automatically trigger re-analysis
- Update score in database
- Create history entry
- Show notification: "Quality score updated"

### 6.2 Score History Timeline
**Component**: `frontend/src/components/ScoreHistoryTimeline.jsx`
- Visual timeline of score changes
- Show improvement trends
- Highlight when threshold was met
- Display date/time of each analysis

### 6.3 Progress Tracking
**Component**: `frontend/src/components/ScoreProgress.jsx`
- Show score improvement over time
- Line chart or bar chart
- Annotations for when suggestions were implemented

---

## **STAGE 7: Advanced Features & Polish**
*Estimated Time: 3-4 days*

### 7.1 LinkedIn Profile Integration
**Function**: `fetchLinkedInProfile(userId)`
- If LinkedIn profile URL is stored in user profile
- Extract LinkedIn data (via API or scraping)
- Include in quality analysis
- Score LinkedIn profile alignment

### 7.2 Batch Analysis
**Endpoint**: `POST /api/quality-scoring/batch-analyze`
- Analyze multiple jobs at once
- Useful for bulk quality check
- Return summary of all scores

### 7.3 Export Quality Report
**Endpoint**: `GET /api/quality-scoring/:jobId/export`
- Generate PDF report with:
  - Score breakdown
  - All improvement suggestions
  - Comparison metrics
  - Score history

### 7.4 Smart Suggestions Prioritization
**Enhancement**: Use ML to learn which suggestions users implement most
- Track suggestion implementation rates
- Prioritize high-impact, frequently-implemented suggestions
- Personalize suggestions based on user's improvement patterns

### 7.5 A/B Testing Framework
- Track which suggestions lead to better outcomes
- Measure correlation between score improvements and interview rates
- Refine scoring algorithm based on real-world results

---

## **STAGE 8: Testing & Optimization**
*Estimated Time: 2-3 days*

### 8.1 Unit Tests
- Test scoring calculation logic
- Test keyword extraction
- Test formatting detection
- Test inconsistency detection

### 8.2 Integration Tests
- Test full analysis flow
- Test API endpoints
- Test database operations
- Test threshold enforcement

### 8.3 Performance Optimization
- Cache AI responses (24-hour TTL)
- Optimize database queries
- Batch processing for bulk operations
- Rate limiting for AI API calls

### 8.4 Error Handling
- Graceful degradation if AI service is down
- Fallback scoring algorithm (rule-based)
- User-friendly error messages
- Retry logic with exponential backoff

---

## **Implementation Priority & Timeline**

### Phase 1 (MVP - Weeks 1-2)
- ✅ Stage 1: Database Schema
- ✅ Stage 2: Core Scoring Logic
- ✅ Stage 3: Basic API Endpoints
- ✅ Stage 4: Basic Frontend Display

### Phase 2 (Core Features - Weeks 3-4)
- ✅ Stage 5: Job Application Integration
- ✅ Stage 6: Score Updates & History
- ✅ Stage 7.1: LinkedIn Integration (if applicable)

### Phase 3 (Enhancements - Weeks 5-6)
- ✅ Stage 7.2-7.4: Advanced Features
- ✅ Stage 8: Testing & Optimization

---

## **Technical Considerations**

### AI API Usage
- **Current**: Using Gemini 2.0 Flash for resume optimization
- **For Quality Scoring**: Use same Gemini API with specialized prompts
- **Cost Management**: Cache scores for 24 hours, batch requests when possible
- **Rate Limiting**: Implement retry logic (already done for resume optimization)

### Database Performance
- Index on `job_id` and `user_id` for fast lookups
- JSONB for flexible score breakdown storage
- Consider materialized views for user statistics

### Frontend Performance
- Lazy load quality score components
- Cache scores in React state
- Debounce re-analysis requests
- Optimistic UI updates

### Security
- Ensure users can only access their own scores
- Validate job ownership before analysis
- Sanitize AI responses before storing
- Rate limit analysis requests per user

---

## **Dependencies**

### Backend
- Existing Gemini AI client setup ✅
- Database connection pool ✅
- Authentication middleware ✅
- File parsing utilities (PDF, DOCX) - may need enhancement

### Frontend
- Chart library (e.g., `recharts` or `chart.js`) for visualizations
- Modal component for threshold warnings
- Timeline component for history

### New Packages
- `recharts` or `chart.js` - for score visualizations
- `react-timeline` or custom timeline component
- Enhanced PDF/DOCX parsing if needed

---

## **Success Metrics**

1. **Accuracy**: Score correlates with application success rates
2. **User Engagement**: Users implement suggestions and see score improvements
3. **Performance**: Analysis completes in < 10 seconds
4. **Adoption**: 80%+ of users use quality scoring before submission
5. **Impact**: Applications with scores > 70 have higher interview rates

---

## **Future Enhancements (Post-MVP)**

1. **Industry-Specific Scoring**: Customize scoring weights by industry
2. **Role-Level Scoring**: Different criteria for entry vs. senior roles
3. **Company-Specific Optimization**: Learn from successful applications to specific companies
4. **Collaborative Scoring**: Allow mentors/peers to review and suggest improvements
5. **ML-Based Threshold**: Automatically adjust threshold based on job market competitiveness

