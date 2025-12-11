# Resume Version Control System - Implementation Plan

## Overview
Implement a comprehensive version control system for resumes in the Docs Management section, allowing users to create, manage, compare, merge, and link multiple versions of their resumes to different job applications.

## Phases

### Phase 1: Database Schema Enhancements
**Goal**: Extend the existing version control tables to support all required features

**Tasks**:
1. Add columns to `resume_versions` table:
   - `description` TEXT (detailed description of changes)
   - `job_id` INTEGER (link to specific job application)
   - `is_default` BOOLEAN (mark as master/default version)
   - `is_archived` BOOLEAN (soft delete/archive)
   - `parent_version_number` INTEGER (for tracking version lineage)
   - `tags` TEXT[] (for categorization)

2. Create indexes for performance:
   - Index on `job_id`
   - Index on `is_default`
   - Index on `is_archived`

3. Add migration script to update existing data

### Phase 2: Backend API Routes
**Goal**: Create comprehensive API endpoints for version management

**New Routes**:
1. `POST /api/versions/resumes/:resumeId/create` - Create new version from existing
2. `GET /api/versions/resumes/:resumeId/versions/:versionNumber1/compare/:versionNumber2` - Compare two versions
3. `POST /api/versions/resumes/:resumeId/merge` - Merge changes between versions
4. `PUT /api/versions/resumes/:resumeId/versions/:versionNumber/set-default` - Set as default/master
5. `PUT /api/versions/resumes/:resumeId/versions/:versionNumber/archive` - Archive version
6. `DELETE /api/versions/resumes/:resumeId/versions/:versionNumber` - Delete version
7. `PUT /api/versions/resumes/:resumeId/versions/:versionNumber/link-job` - Link version to job
8. `GET /api/versions/resumes/:resumeId/versions/:versionNumber/jobs` - Get jobs linked to version

**Enhanced Routes**:
- Update existing version creation to support new fields
- Update version history to include job links and default status

### Phase 3: Frontend UI Components
**Goal**: Build intuitive UI for version management

**Components**:
1. **Version Control Button** - Add to each resume card in Docs Management
2. **Version Control Modal** - Main interface for version management
   - Version list with filters (all, default, archived, by job)
   - Create new version button
   - Version actions (compare, merge, set default, archive, delete, link job)
3. **Create Version Modal** - Form to create new version
   - Name/Title field
   - Description field
   - Option to link to job application
   - Option to set as default
4. **Compare Versions Modal** - Side-by-side comparison
   - Two-column layout
   - Highlight differences
   - Section-by-section comparison
5. **Merge Versions Modal** - Interactive merge interface
   - Show differences
   - Allow selection of which changes to keep
   - Preview merged result
6. **Link to Job Modal** - Select job to link version to

### Phase 4: Integration & Testing
**Goal**: Ensure all features work together seamlessly

**Tasks**:
1. Test version creation from existing resumes
2. Test version comparison
3. Test version merging
4. Test job linking
5. Test default version setting
6. Test archiving and deletion
7. Update Docs Management to show version indicators
8. Add version badges to resume cards

## Acceptance Criteria Checklist

- [x] Create new resume versions from existing ones
- [x] Version naming and description system
- [x] Compare versions side-by-side
- [x] Merge changes between versions
- [x] Version history with creation dates
- [x] Link versions to specific job applications
- [x] Set default/master resume version
- [x] Delete or archive old versions

## Technical Details

### Database Schema Changes
```sql
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_version_number INTEGER,
ADD COLUMN IF NOT EXISTS tags TEXT[];
```

### API Response Examples
```json
{
  "version": {
    "id": 1,
    "version_number": 2,
    "title": "Software Engineer - Google Tailored",
    "description": "Tailored for Google SWE position with emphasis on ML projects",
    "job_id": 123,
    "is_default": false,
    "is_archived": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Implementation Order
1. Phase 1: Database (30 min)
2. Phase 2: Backend Routes (1-2 hours)
3. Phase 3: Frontend Components (2-3 hours)
4. Phase 4: Integration & Testing (1 hour)

**Total Estimated Time**: 4-6 hours

