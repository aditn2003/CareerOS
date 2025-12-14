# Material Comparison Tab - Testing Guide

## 📋 Overview

The **Material Comparison Tab** allows users to compare the performance of different resume and cover letter versions across their job applications. Users can label versions (A, B, C, etc.), track which versions were used for each application, and analyze success metrics.

## 🏗️ Architecture Overview

### Frontend Components
- **Location**: `frontend/src/pages/Match/MaterialComparisonTab.jsx`
- **Parent Component**: `frontend/src/pages/Match/JobMatch.jsx` (tab navigation)
- **Styling**: `frontend/src/pages/Match/MaterialComparisonTab.css`

### Backend Routes
- **Location**: `backend/routes/materialComparison.js`
- **Base Path**: `/api/material-comparison`
- **Mounted in**: `backend/server.js` at line 586

### Database Tables
1. **`resume_versions`** - Stores resume versions with optional `version_label` (A-Z)
2. **`cover_letter_versions`** - Stores cover letter versions with optional `version_label` (A-Z)
3. **`application_materials_history`** - Tracks which materials were used for each application
   - Columns: `resume_version_label`, `cover_letter_version_label`
4. **`jobs`** - Stores application outcomes
   - Columns: `application_outcome`, `response_received_at`
5. **`job_materials`** - Current materials linked to jobs (triggers history creation)

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/material-comparison/resume-versions/:versionId/label` | PUT | Label a resume version (A-Z) |
| `/api/material-comparison/cover-letter-versions/:versionId/label` | PUT | Label a cover letter version (A-Z) |
| `/api/material-comparison/jobs/:jobId/materials/versions` | PUT | Track which versions were used for an application |
| `/api/material-comparison/jobs/:jobId/outcome` | PUT | Mark application outcome (response_received, interview, offer, rejection, no_response) |
| `/api/material-comparison/comparison/metrics` | GET | Get aggregated performance metrics by version |
| `/api/material-comparison/comparison/applications` | GET | Get applications filtered by version labels |
| `/api/material-comparison/versions/labeled` | GET | Get all labeled resume and cover letter versions |
| `/api/material-comparison/resume-versions/:versionId/archive` | PUT | Remove label from resume version |
| `/api/material-comparison/cover-letter-versions/:versionId/archive` | PUT | Remove label from cover letter version |

## 🧪 Step-by-Step Testing Guide

### Prerequisites

1. **Database Setup**: Ensure all migration scripts have been run:
   ```sql
   -- Check if columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'resume_versions' AND column_name = 'version_label';
   
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'application_materials_history' AND column_name = 'resume_version_label';
   ```

2. **Test Data Requirements**:
   - At least 2-3 resume versions in `resume_versions` table
   - At least 2-3 cover letter versions in `cover_letter_versions` table
   - At least 5-10 jobs with linked materials in `job_materials` table
   - History entries in `application_materials_history` table

### Test Scenario 1: Label Versions

**Objective**: Test labeling resume and cover letter versions with letters A-Z.

**Steps**:
1. Navigate to Job Match page → Comparison tab
2. Click "Manage Version Labels" button
3. For each unlabeled resume version:
   - Select a letter from dropdown (A-Z)
   - Click "Label" button
   - Verify success message appears
   - Verify label appears as badge next to version name
4. Repeat for cover letter versions
5. Try to use the same letter twice → Should show error: "Label 'X' is already in use"

**Expected Results**:
- ✅ Labels are saved successfully
- ✅ Labels appear in UI immediately after refresh
- ✅ Duplicate labels are prevented
- ✅ Used letters are disabled in dropdown

**Common Issues**:
- ❌ **Issue**: Label not saving → Check backend logs for SQL errors
- ❌ **Issue**: Label appears but disappears on refresh → Check database transaction commits
- ❌ **Issue**: Can use same letter twice → Check validation logic in backend route

### Test Scenario 2: Track Version Usage for Applications

**Objective**: Test tracking which versions were used for each job application.

**Steps**:
1. Ensure you have jobs with materials linked in `job_materials` table
2. For each job, call the API endpoint:
   ```javascript
   PUT /api/material-comparison/jobs/:jobId/materials/versions
   Body: {
     resume_version_label: "A",
     cover_letter_version_label: "B"
   }
   ```
3. Verify the `application_materials_history` table is updated:
   ```sql
   SELECT * FROM application_materials_history 
   WHERE job_id = :jobId 
   ORDER BY changed_at DESC LIMIT 1;
   ```

**Expected Results**:
- ✅ Version labels are stored in `application_materials_history`
- ✅ Latest history entry contains the version labels
- ✅ Labels match the labeled versions in `resume_versions` and `cover_letter_versions`

**Common Issues**:
- ❌ **Issue**: Labels not appearing in history → Check if `job_materials` trigger is working
- ❌ **Issue**: Wrong version labels stored → Check the JOIN logic in the route handler

### Test Scenario 3: View Comparison Metrics

**Objective**: Test viewing aggregated performance metrics by version.

**Steps**:
1. Ensure you have:
   - Multiple applications with different version labels
   - At least some applications with marked outcomes
2. Navigate to Comparison tab
3. Verify metrics dashboard shows:
   - Performance comparison chart
   - Metric cards for each version combination
4. Check each metric card shows:
   - Total Applications
   - Response Rate %
   - Interview Rate %
   - Offer Rate %
   - Average Days to Response
   - Breakdown (Responses, Interviews, Offers, Rejections, No Response)

**Expected Results**:
- ✅ Chart displays all version combinations
- ✅ Metric cards show correct calculations
- ✅ Warning appears for versions with < 10 applications
- ✅ Rates are calculated correctly (check math)

**Common Issues**:
- ❌ **Issue**: No metrics showing → Check if `application_materials_history` has version labels
- ❌ **Issue**: Wrong calculations → Check SQL query in `/comparison/metrics` endpoint
- ❌ **Issue**: Chart not rendering → Check if Recharts library is imported correctly

### Test Scenario 4: Filter Applications by Version

**Objective**: Test filtering applications by resume/cover letter version labels.

**Steps**:
1. Navigate to Comparison tab
2. Scroll to "Applications by Version" section
3. Select a resume version from dropdown (e.g., "Resume A")
4. Select a cover letter version from dropdown (e.g., "Cover Letter B")
5. Verify applications list updates to show only matching applications
6. Verify each application shows:
   - Job title and company
   - Applied date
   - Version tags (Resume X, Cover Letter Y)
   - Current status and outcome badges

**Expected Results**:
- ✅ Applications filter correctly by selected versions
- ✅ Version tags display correctly
- ✅ Empty state shows when no filters selected
- ✅ Multiple filters work together (AND logic)

**Common Issues**:
- ❌ **Issue**: No applications showing → Check if `application_materials_history` has matching labels
- ❌ **Issue**: Wrong applications showing → Check SQL WHERE clause in `/comparison/applications` endpoint
- ❌ **Issue**: Filters not working → Check frontend state management

### Test Scenario 5: Mark Application Outcomes

**Objective**: Test marking application outcomes for tracking success.

**Steps**:
1. Navigate to Comparison tab
2. Filter applications by a version
3. For each application, click "Mark Outcome" button
4. Select an outcome:
   - Response Received
   - Interview
   - Offer
   - Rejection
   - No Response
5. Optionally enter response date
6. Click "Save"
7. Verify outcome badge appears on application
8. Verify metrics dashboard updates with new outcome

**Expected Results**:
- ✅ Outcome is saved to `jobs.application_outcome`
- ✅ Response date is saved to `jobs.response_received_at` if provided
- ✅ Metrics recalculate automatically
- ✅ Outcome badge displays correctly

**Common Issues**:
- ❌ **Issue**: Outcome not saving → Check backend route handler
- ❌ **Issue**: Metrics not updating → Check if metrics query includes the new outcome
- ❌ **Issue**: Date not saving → Check date format conversion

### Test Scenario 6: Archive Versions

**Objective**: Test removing labels from versions (archiving).

**Steps**:
1. Navigate to Comparison tab
2. Click "Manage Version Labels"
3. Find a labeled version
4. Click "Archive" button
5. Verify label is removed
6. Verify version no longer appears in metrics (if no applications use it)

**Expected Results**:
- ✅ Label is set to NULL in database
- ✅ Version appears as unlabeled in UI
- ✅ Metrics exclude archived versions (if no history entries)

**Common Issues**:
- ❌ **Issue**: Archive not working → Check UPDATE query in backend
- ❌ **Issue**: Archived versions still in metrics → Check if history entries still reference the label

## 🔍 Common Issues & Debugging

### Issue 1: No Versions Showing

**Symptoms**: Version Manager shows "No resume versions found" or "No cover letter versions found"

**Debugging Steps**:
1. Check database for versions:
   ```sql
   SELECT * FROM resume_versions WHERE user_id = :userId;
   SELECT * FROM cover_letter_versions WHERE user_id = :userId;
   ```
2. Check if versions exist in base tables:
   ```sql
   SELECT * FROM resumes WHERE user_id = :userId;
   SELECT * FROM uploaded_cover_letters WHERE user_id = :userId;
   ```
3. Check backend route `/versions/labeled` - verify it handles fallback to base tables

**Fix**: Ensure versions exist in `resume_versions` or `cover_letter_versions` tables, or the route should create entries from base tables.

### Issue 2: Metrics Not Calculating Correctly

**Symptoms**: Wrong percentages, missing data, or zero values

**Debugging Steps**:
1. Check raw data:
   ```sql
   SELECT 
     amh.resume_version_label,
     amh.cover_letter_version_label,
     j.application_outcome,
     COUNT(*) as count
   FROM application_materials_history amh
   JOIN jobs j ON j.id = amh.job_id
   WHERE amh.user_id = :userId
   GROUP BY amh.resume_version_label, amh.cover_letter_version_label, j.application_outcome;
   ```
2. Verify JOIN logic in `/comparison/metrics` endpoint
3. Check if `application_outcome` values match expected enum values

**Fix**: Ensure `application_materials_history` has `resume_version_label` and `cover_letter_version_label` populated, and `jobs` has `application_outcome` values.

### Issue 3: Version Labels Not Tracking in History

**Symptoms**: Applications don't show version labels, metrics are empty

**Debugging Steps**:
1. Check if `job_materials` trigger is working:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_materials_history';
   ```
2. Check if history entries exist:
   ```sql
   SELECT * FROM application_materials_history WHERE job_id = :jobId ORDER BY changed_at DESC;
   ```
3. Verify version labels are being set via API:
   ```sql
   SELECT resume_version_label, cover_letter_version_label 
   FROM application_materials_history 
   WHERE job_id = :jobId 
   ORDER BY changed_at DESC LIMIT 1;
   ```

**Fix**: Ensure the trigger exists and is firing. The `/jobs/:jobId/materials/versions` endpoint should update the latest history entry.

### Issue 4: Duplicate Labels Allowed

**Symptoms**: Can assign same letter to multiple versions

**Debugging Steps**:
1. Check backend validation in labeling routes
2. Verify database constraint:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints 
   WHERE table_name = 'resume_versions' AND constraint_name LIKE '%label%';
   ```
3. Check if validation checks both resume and cover letter versions

**Fix**: The backend should check for existing labels across BOTH `resume_versions` AND `cover_letter_versions` tables before allowing a new label.

### Issue 5: Chart Not Rendering

**Symptoms**: Blank chart area, console errors

**Debugging Steps**:
1. Check browser console for errors
2. Verify Recharts is installed: `npm list recharts`
3. Check if chart data is valid:
   ```javascript
   console.log('Chart data:', chartData);
   ```
4. Verify ResponsiveContainer is properly imported

**Fix**: Ensure Recharts is installed and chart data is in correct format.

## 📊 Database Verification Queries

### Check Schema
```sql
-- Verify version_label columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('resume_versions', 'cover_letter_versions', 'application_materials_history')
AND column_name LIKE '%version_label%';

-- Verify application_outcome column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'application_outcome';
```

### Check Data
```sql
-- Count labeled versions
SELECT 
  (SELECT COUNT(*) FROM resume_versions WHERE version_label IS NOT NULL) as labeled_resumes,
  (SELECT COUNT(*) FROM cover_letter_versions WHERE version_label IS NOT NULL) as labeled_cover_letters;

-- Check history entries with labels
SELECT COUNT(*) as total_history,
       COUNT(resume_version_label) as with_resume_label,
       COUNT(cover_letter_version_label) as with_cl_label
FROM application_materials_history;

-- Check jobs with outcomes
SELECT application_outcome, COUNT(*) 
FROM jobs 
WHERE application_outcome IS NOT NULL 
GROUP BY application_outcome;
```

## 🚀 Quick Test Checklist

- [ ] Can label resume versions (A-Z)
- [ ] Can label cover letter versions (A-Z)
- [ ] Duplicate labels are prevented
- [ ] Version labels appear in UI
- [ ] Can track version usage for applications
- [ ] Metrics dashboard displays correctly
- [ ] Chart renders with data
- [ ] Can filter applications by version
- [ ] Can mark application outcomes
- [ ] Outcomes appear in metrics
- [ ] Can archive versions
- [ ] Archived versions removed from active labels
- [ ] All API endpoints return correct data
- [ ] Error handling works (invalid labels, missing data, etc.)

## 📝 Notes

- **Minimum Sample Size**: The UI warns when versions have < 10 applications for meaningful comparison
- **Label Uniqueness**: Each letter (A-Z) can only be used once across ALL resume AND cover letter versions
- **History Tracking**: The system automatically creates history entries when `job_materials` is updated via trigger
- **Version Labels**: Must be manually set via the API endpoints - they don't auto-populate from version tables

