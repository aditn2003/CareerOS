# Application Material Comparison Dashboard - Implementation Summary

## Overview
This feature allows users to compare the performance of different resume and cover letter versions (A, B, C, etc.) by tracking which versions were used for each application and manually marking outcomes.

## Implementation Phases

### Phase 1: Database Schema ✅
**File:** `backend/db/add_material_comparison_schema.sql`

**Changes:**
- Added `version_label` column to `resume_versions` and `cover_letter_versions` tables (single uppercase letter A-Z)
- Added `application_outcome` column to `jobs` table (response_received, interview, offer, rejection, no_response)
- Added `response_received_at` timestamp to `jobs` table for calculating average time to response
- Added `resume_version_label` and `cover_letter_version_label` columns to `application_materials_history` table
- Created `material_comparison_metrics` view for aggregated metrics
- Added helper functions and indexes

**To Apply:**
```sql
-- Run the migration script
\i backend/db/add_material_comparison_schema.sql
```

### Phase 2: Backend Routes ✅
**File:** `backend/routes/materialComparison.js`

**Endpoints:**
- `PUT /api/material-comparison/resume-versions/:versionId/label` - Label a resume version (A, B, C, etc.)
- `PUT /api/material-comparison/cover-letter-versions/:versionId/label` - Label a cover letter version
- `PUT /api/material-comparison/jobs/:jobId/materials/versions` - Track which version was used for an application
- `PUT /api/material-comparison/jobs/:jobId/outcome` - Mark application outcome (response_received, interview, offer, rejection, no_response)
- `GET /api/material-comparison/comparison/metrics` - Get comparison metrics for all versions
- `GET /api/material-comparison/comparison/applications` - Get applications filtered by version labels
- `GET /api/material-comparison/versions/labeled` - Get all labeled versions
- `PUT /api/material-comparison/resume-versions/:versionId/archive` - Archive (remove label from) a version
- `PUT /api/material-comparison/cover-letter-versions/:versionId/archive` - Archive a cover letter version

**Registration:** Added to `backend/server.js`

### Phase 3: Frontend Components ✅
**Files:**
- `frontend/src/pages/Match/MaterialComparisonTab.jsx` - Main comparison dashboard component
- `frontend/src/pages/Match/MaterialComparisonTab.css` - Styling
- Updated `frontend/src/pages/Match/JobMatch.jsx` - Added Comparison tab

**Features:**
- Version Manager: Label resume and cover letter versions (A, B, C, etc.)
- Metrics Dashboard: View performance metrics (response rate, interview rate, offer rate, avg days to response)
- Comparison Chart: Visual bar chart comparing versions using Recharts
- Applications List: Filter and view applications by version, mark outcomes
- Warning note: "Meaningful comparisons require 10+ applications per version"

### Phase 4: Integration ✅
- Tab added to JobMatch navigation
- Styled with green/teal theme to match other tabs
- Fully integrated with backend APIs

## Usage Flow

### 1. Label Versions
1. Navigate to Job Match → Comparison tab
2. Click "Manage Version Labels"
3. For each resume/cover letter version, enter a label (A, B, C, etc.)
4. Click "Label" to save

### 2. Track Version Usage
When linking materials to a job application:
- Use the endpoint `PUT /api/material-comparison/jobs/:jobId/materials/versions` with `resume_version_label` and/or `cover_letter_version_label`
- Or update via the UI in the Comparison tab

### 3. Mark Application Outcomes
1. In the Comparison tab, filter applications by version
2. Click "Mark Outcome" on an application
3. Select outcome: Response Received, Interview, Offer, Rejection, or No Response
4. Optionally set response date for calculating average time to response
5. Click "Save"

### 4. View Comparison Metrics
- Metrics automatically calculate:
  - Total Applications
  - Response Rate %
  - Interview Rate %
  - Offer Rate %
  - Average Days to Response
  - Breakdown by outcome type
- Visual chart compares response/interview/offer rates across versions
- Warning shown if less than 10 applications per version

## Database Schema Details

### Version Labels
- Stored in `resume_versions.version_label` and `cover_letter_versions.version_label`
- Constraint: Single uppercase letter (A-Z)
- Can be NULL (unlabeled versions)

### Application Outcomes
- Stored in `jobs.application_outcome`
- Values: `response_received`, `interview`, `offer`, `rejection`, `no_response`, or NULL
- `jobs.response_received_at` stores timestamp for calculating average time to response

### Version Tracking
- Stored in `application_materials_history.resume_version_label` and `cover_letter_version_label`
- Links specific version labels to job applications
- Used for aggregating metrics by version

## Metrics Calculation

### Response Rate
```
(response_received + interview + offer) / total_applications * 100
```

### Interview Rate
```
interviews / (response_received + interview + offer) * 100
```

### Offer Rate
```
offers / interviews * 100
```

### Average Days to Response
```
AVG(response_received_at - applied_on) in days
```

## Testing Checklist

- [ ] Run database migration
- [ ] Label resume versions (A, B, C)
- [ ] Label cover letter versions (A, B, C)
- [ ] Link materials to jobs with version labels
- [ ] Mark outcomes for applications
- [ ] View comparison metrics
- [ ] Verify chart displays correctly
- [ ] Test filtering applications by version
- [ ] Test archiving versions
- [ ] Verify warning shows for < 10 applications

## Future Enhancements

1. **Automatic Version Detection**: Automatically detect which version was used based on file hash or content
2. **Version Comparison View**: Side-by-side comparison of version content
3. **Statistical Significance**: Show confidence intervals and statistical significance
4. **Export Reports**: Export comparison data to CSV/PDF
5. **Time-based Analysis**: Track performance over time periods
6. **Industry/Company Filtering**: Compare versions within specific industries or companies

## Notes

- Version labels must be unique per resume/cover letter (can't have two versions of the same resume with label "A")
- Application outcomes are manually marked - not automatically synced with job status
- The comparison view shows a warning if there are fewer than 10 applications per version for meaningful statistical comparison
- Archived versions (labels removed) are excluded from comparison metrics

