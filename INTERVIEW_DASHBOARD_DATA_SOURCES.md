# Interview Dashboard Data Sources

This document explains where each value in the Interview Analysis dashboard comes from.

## Dashboard Cards Data Sources

### 1. **Real Interviews** (Blue Card)
- **Value**: `summaryCards.totalRealInterviews`
- **Source**: `jobs` table (PostgreSQL)
- **Query**: 
  ```sql
  SELECT COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') AS total_interviews
  FROM jobs
  WHERE user_id = $1 AND ("isarchived" IS NULL OR "isarchived" = false)
  ```
- **Location**: `backend/routes/interviewAnalysis.js` lines 149-156
- **Subtitle**: `summaryCards.totalOffers` - Count of jobs with status = 'Offer'

### 2. **Conversion Rate** (Orange Card)
- **Value**: `summaryCards.overallConversionRate`
- **Calculation**: `realOffers / realInterviews * 100`
- **Source**: 
  - `realOffers`: Count of jobs with `status = 'Offer'`
  - `realInterviews`: Count of jobs with `status = 'Interview' OR status = 'Offer'`
- **Location**: `backend/routes/interviewAnalysis.js` lines 304-306
- **Industry Average**: Hardcoded as `25%` (0.25)
- **Formula**: `(total_offers / total_interviews) * 100`

### 3. **Mock Sessions** (Purple Card)
- **Value**: `summaryCards.totalMockSessions`
- **Source**: `mock_interview_sessions` table (Supabase)
- **Query**: 
  ```javascript
  supabase
    .from("mock_interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  ```
- **Location**: `backend/routes/interviewAnalysis.js` lines 176-183
- **Subtitle**: `summaryCards.avgMockScore` - Average of `overall_performance_score` from completed mock sessions
- **Calculation**: 
  ```javascript
  avgOverallScore = completedSessions.reduce((sum, s) => 
    sum + (s.overall_performance_score || 0), 0
  ) / completedSessions.length
  ```

### 4. **Confidence Score** (Light Blue Card)
- **Value**: `summaryCards.avgConfidence`
- **Source**: `mock_interview_sessions.mock_interview_summaries[0].confidence_level_score`
- **Location**: `backend/routes/interviewAnalysis.js` lines 195-197, 224
- **Calculation**: 
  ```javascript
  avgConfidence = completedSessions.reduce((sum, s) => 
    sum + (s.mock_interview_summaries[0]?.confidence_level_score || 0), 0
  ) / completedSessions.length
  ```
- **Subtitle**: `summaryCards.improvementFromMocks`
  - **Calculation**: Difference between latest and first confidence score in trend
  - **Formula**: `confidenceTrend[last].confidenceScore - confidenceTrend[first].confidenceScore`
  - **Location**: `backend/routes/interviewAnalysis.js` lines 443-445

### 5. **Anxiety Level** (Green Card)
- **Value**: `summaryCards.avgAnxiety`
- **Source**: Calculated from confidence scores and feedback analysis
- **Location**: `backend/routes/interviewAnalysis.js` lines 201-218, 225
- **Calculation**:
  ```javascript
  // Base anxiety = 100 - confidence_score
  anxietyScore = 100 - confidence_level_score
  
  // Check for anxiety keywords in improvement_areas
  anxietyKeywords = ['anxiety', 'nervous', 'stressed', 'worried', 'panic', 'fear', 'apprehensive']
  if (improvementText contains anxietyKeywords) {
    anxietyScore = Math.min(100, anxietyScore + 15)
  }
  
  // Average across all completed sessions
  avgAnxiety = anxietyScores.reduce((sum, a) => sum + a, 0) / anxietyScores.length
  ```
- **Subtitle**: `summaryCards.anxietyImprovement`
  - **Calculation**: Difference between first and last anxiety score in trend (inverse of confidence improvement)
  - **Formula**: `anxietyTrend[first].anxietyScore - anxietyTrend[last].anxietyScore`
  - **Location**: `backend/routes/interviewAnalysis.js` lines 447-449

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PostgreSQL (jobs table)                                 │
│     ├─ Real Interviews Count                                │
│     └─ Offers Count                                         │
│                                                              │
│  2. Supabase (mock_interview_sessions table)                │
│     ├─ Mock Sessions Count                                  │
│     ├─ Overall Performance Scores                           │
│     └─ Mock Interview Summaries                             │
│         ├─ confidence_level_score                           │
│         └─ improvement_areas (for anxiety detection)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend Route: /api/interview-analysis/full         │
│         File: backend/routes/interviewAnalysis.js           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Calculations:                                              │
│  ├─ Conversion Rate = offers / interviews                   │
│  ├─ Avg Mock Score = average(overall_performance_score)     │
│  ├─ Avg Confidence = average(confidence_level_score)         │
│  ├─ Avg Anxiety = average(100 - confidence + keyword_bonus) │
│  ├─ Confidence Improvement = latest - first                 │
│  └─ Anxiety Improvement = first - latest                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Frontend Component: InterviewAnalysis.jsx            │
│         File: frontend/src/components/InterviewAnalysis.jsx │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Displays:                                                   │
│  ├─ Summary Cards (5 cards)                                 │
│  ├─ Charts and Visualizations                               │
│  └─ Recommendations                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Database Tables

### 1. `jobs` (PostgreSQL)
- **Columns Used**: 
  - `status` (values: 'Interview', 'Offer')
  - `user_id`
  - `isarchived`
- **Purpose**: Track real interview counts and offer conversions

### 2. `mock_interview_sessions` (Supabase)
- **Columns Used**:
  - `user_id`
  - `status` (filter for 'completed')
  - `overall_performance_score`
  - `created_at`
  - `completed_at`
  - `interview_type`
- **Related Table**: `mock_interview_summaries`
  - `confidence_level_score` (0-100)
  - `improvement_areas` (array of strings)
- **Purpose**: Track mock interview practice sessions and performance

## Important Notes

1. **Real Interviews**: Only counts jobs with status 'Interview' OR 'Offer' that are not archived
2. **Conversion Rate**: Calculated as `offers / interviews`. If no interviews, returns 0
3. **Mock Sessions**: Only completed sessions with summaries are used for averages
4. **Confidence Score**: Comes from AI-generated summaries of mock interviews (0-100 scale)
5. **Anxiety Level**: Derived metric calculated as inverse of confidence, with keyword detection bonus
6. **Improvement Metrics**: Calculated from trend data (first vs last session in time series)

## API Endpoint

- **Route**: `GET /api/interview-analysis/full`
- **File**: `backend/routes/interviewAnalysis.js`
- **Authentication**: Required (uses `req.user.id`)
- **Response**: JSON object with `summaryCards` containing all dashboard values

## Frontend Usage

The frontend component receives data from:
```javascript
const res = await getInterviewAnalysis(); // Calls /api/interview-analysis/full
const { summaryCards } = res.data;
```

Then displays:
- `summaryCards.totalRealInterviews` → "Real Interviews" card
- `summaryCards.overallConversionRate` → "Conversion Rate" card
- `summaryCards.totalMockSessions` → "Mock Sessions" card
- `summaryCards.avgConfidence` → "Confidence Score" card
- `summaryCards.avgAnxiety` → "Anxiety Level" card

