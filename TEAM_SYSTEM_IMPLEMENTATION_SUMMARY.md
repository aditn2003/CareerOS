# Team System Implementation Summary

## Overview
A comprehensive hierarchical team system has been implemented for the ATS platform, allowing candidates, mentors, and team admins to collaborate within teams. The system supports multi-team membership for candidates, one-team restriction for mentors, and full administrative control for team admins.

---

## Phase 1: Database Foundation & Account Types ✅

### 1.1 Database Schema Changes

#### Migration Files Created:
- **`backend/db/add_team_accounts.sql`**
  - Added `account_type` column to `users` table (`'candidate'` or `'team_admin'`)
  - Created `teams` table:
    - `id`, `name`, `owner_id`, `created_at`
  - Created `team_members` table:
    - `id`, `team_id`, `user_id`, `role`, `status`, `created_at`
    - Roles: `'admin'`, `'mentor'`, `'candidate'`
    - Initial statuses: `'invited'`, `'active'`, `'removed'`

- **`backend/db/add_requested_status.sql`**
  - Added `'requested'` status to `team_members.status` constraint
  - Now supports: `'requested'`, `'invited'`, `'active'`, `'removed'`

- **`backend/db/update_team_hierarchy.sql`**
  - Added performance indexes:
    - `idx_team_members_user_role`
    - `idx_teams_owner_id`
    - `idx_teams_name`
    - `idx_users_email`

### 1.2 Backend Registration Updates

#### Modified: `backend/server.js`
- Updated `/register` endpoint:
  - Accepts `accountType` in request body
  - Validates `accountType` is either `'candidate'` or `'team_admin'`
  - **Auto-creates team for `team_admin`**: When a user registers as `team_admin`, the system automatically:
    - Creates a team with their name
    - Adds them as an `'admin'` member with `'active'` status
    - Uses database transactions for atomicity
- Updated `/google` OAuth endpoint:
  - Defaults new users to `account_type = 'candidate'`

### 1.3 Frontend Registration Updates

#### Modified: `frontend/src/pages/Register.jsx`
- Added account type selection dropdown:
  - "Individual job seeker (candidate)"
  - "Team mentor / admin"
- Sends `accountType` to backend during registration

---

## Phase 2: Team Management System ✅

### 2.1 Backend API Routes

#### Created: `backend/routes/team.js`
Comprehensive REST API with 15+ endpoints for team management:

#### Core Routes:
1. **`GET /api/team/me`**
   - Returns user's account type, all teams, primary team, role, and status
   - Used by frontend to initialize team context

2. **`GET /api/team/:teamId/members`**
   - Returns team details and all members (with name, email, role, status)
   - Access restricted: Admin/Mentor always; Candidates only if status is not `'requested'`
   - Blocks `'requested'` status users from viewing members

3. **`PATCH /api/team/:teamId/members/:memberId`**
   - Update member role (admin/mentor only)
   - Enforces one-mentor-per-team constraint
   - Validates role transitions

4. **`DELETE /api/team/:teamId/members/:memberId`**
   - Remove member from team (admin/mentor only)

5. **`POST /api/team/:teamId/invite`**
   - Invite user to team by email (admin/mentor only)
   - Creates `team_members` entry with `status='invited'`
   - Validates mentor constraint (one team per mentor)

6. **`POST /api/team/:teamId/accept`**
   - Accept invitation (changes `'invited'` → `'active'`)
   - Only works for users with `status='invited'`

#### Join Request Flow:
7. **`POST /api/team/:teamId/request-join`**
   - Candidate requests to join a team
   - Creates `team_members` entry with `status='requested'`
   - Requires mentor/admin approval

8. **`GET /api/team/:teamId/pending-requests`**
   - Get all pending join requests for a team (admin/mentor only)
   - Returns requests with `status='requested'`

9. **`POST /api/team/:teamId/requests/:memberId/approve`**
   - Approve join request (admin/mentor only)
   - **Status transition: `'requested'` → `'active'`** (direct approval, no invitation step)

10. **`POST /api/team/:teamId/requests/:memberId/reject`**
    - Reject join request (admin/mentor only)
    - Deletes the `team_members` entry

#### Admin-Only Routes:
11. **`GET /api/team/admin/all`**
    - List all teams in system (admin only)
    - Includes member counts

12. **`POST /api/team/admin/create`**
    - Create new team (admin only)
    - Auto-adds creator as `'admin'` member

13. **`PATCH /api/team/admin/:teamId/rename`**
    - Rename team (admin only)

#### Candidate Routes:
14. **`GET /api/team/search?q=teamName`**
    - Search for teams by name (candidate access)
    - Returns teams with member counts

15. **`POST /api/team/:teamId/request-mentor`**
    - Candidate requests a mentor by email or team name
    - Creates `team_members` entry with `status='invited'` (mentor must accept)
    - Validates mentor exists and isn't already in another team

#### Helper Functions:
- `getMembership(teamId, userId)` - Get user's role and status in a team
- `getUserAccountType(userId)` - Get user's account type
- Role constants: `ADMIN_ROLES`, `MANAGER_ROLES`, `MUTABLE_ROLES`

### 2.2 Frontend Team Context

#### Created: `frontend/src/contexts/TeamContext.jsx`
- Global React Context for team state management
- Provides:
  - `accountType` - User's account type
  - `teams` - Array of all user's teams
  - `primaryTeam` - First team in list (team ID, name, role, status)
  - `role` - User's role in primary team
  - `status` - User's status in primary team
- Derived flags:
  - `isAdmin` - True if `accountType === 'team_admin'`
  - `isMentor` - True if primary team role is `'mentor'`
  - `isCandidate` - True if primary team role is `'candidate'`
  - `hasTeam` - True if user has at least one team
- Methods:
  - `refreshTeam()` - Fetch latest team data from `/api/team/me`

#### Modified: `frontend/src/App.jsx`
- Wrapped app with `TeamProvider` to make team context available globally

### 2.3 Navigation & Tab Visibility

#### Modified: `frontend/src/components/ProfileNavBar.jsx`
- Dynamic tab rendering based on team roles:
  - **"Team Management" tab**:
    - Shows for: Admin, Mentor, Candidate (all roles)
  - **"Mentor" tab**:
    - Shows for: Admin, Mentor, Candidate (all roles)
- Uses `TeamContext` to determine visibility

### 2.4 Team Management UI

#### Created: `frontend/src/pages/Profile/TeamManagement.jsx`
Role-based team management component with three sub-views:

##### **AdminTeamManagement Component:**
- **Features:**
  - List all teams in system (sidebar navigation)
  - Create new teams
  - Rename selected team
  - Select team to manage
  - View all members of selected team
  - Change member roles (admin ↔ mentor)
  - Remove members
  - Invite new members by email
  - **View pending join requests** (conditional - only shows when requests exist)
  - Approve/reject join requests

##### **MentorTeamManagement Component:**
- **Features:**
  - View their single team
  - View all team members
  - Invite members by email (mentors or candidates)
  - Change member roles (mentor ↔ candidate)
  - Remove members
  - **View pending join requests** (conditional - only shows when requests exist)
  - Approve/reject join requests

##### **CandidateTeamManagement Component:**
- **No Team View:**
  - Search teams by name
  - Request to join a team (creates `status='requested'`)
  - Request a mentor by email or team name
- **Has Team View (status='active' or 'invited'):**
  - View team name
  - View team members (filtered: only mentors and candidates, excludes admin)
  - Request a mentor (by email or team name)
  - Invite peers (other candidates)
- **Pending Request View (status='requested'):**
  - Shows only pending message
  - **No team details visible** until approved

#### Created: `frontend/src/pages/Profile/TeamManagement.css`
- Comprehensive styling:
  - Team cards and grids
  - Member lists and tables
  - Form inputs and buttons
  - Role/status badges
  - Admin sidebar layout
  - Pending requests section
  - Candidate search/results
  - Success/error banners
  - Pending request message styling

### 2.5 Mentor Tab

#### Modified: `frontend/src/pages/Profile/MentorTab.jsx`
- Simplified to focus on invitation/request status
- **Removed:** Team members display (moved to Team Management tab)
- **Shows:**
  - "Join Request Pending" message when `status='requested'`
  - "Team Invitation" with "Accept Invitation" button when `status='invited'`
  - Placeholder message for active members

---

## Workflow Status Transitions

### Correct Workflows (As Implemented):

1. **Join Request Flow:**
   - Candidate requests to join → `status='requested'`
   - Admin/Mentor approves → `status='active'` ✅ (direct approval)

2. **Invitation Flow:**
   - Admin/Mentor invites → `status='invited'`
   - Invited user accepts → `status='active'`

3. **Mentor Request Flow:**
   - Candidate requests mentor → `status='invited'`
   - Mentor accepts → `status='active'`

4. **Registration Flow:**
   - User registers as `team_admin` → Team auto-created → `status='active'`
   - User registers as `candidate` → No team created

---

## Key Features & Constraints

### Multi-Team Support:
- ✅ Candidates can belong to **multiple teams**
- ✅ Mentors can belong to **only one team** (enforced)
- ✅ Admins can create and manage **multiple teams**

### Permissions:

#### **Admin (`account_type='team_admin'`):**
- Create unlimited teams
- Rename any team
- Manage members across all teams
- Invite/remove members
- Approve/reject join requests
- View all teams and members

#### **Mentor (`role='mentor'`):**
- Manage members in their single team
- Invite/remove members
- Change member roles (mentor ↔ candidate)
- Approve/reject join requests
- Cannot create or rename teams

#### **Candidate (`role='candidate'`):**
- Request to join teams
- Request mentors
- Invite peers (candidates)
- View team members (when status is `'active'` or `'invited'`)
- Cannot see team details when status is `'requested'` (pending approval)
- Cannot remove or change roles of others

### Status Visibility:
- ✅ `status='requested'`: Candidate cannot see team members
- ✅ `status='invited'`: Candidate can see team, must accept invitation
- ✅ `status='active'`: Full access to team features

---

## UI/UX Improvements

### Error Handling:
- Centralized error messages in `errorMessages` object
- User-friendly error banners (success/error)
- Clear error messages for:
  - `ALREADY_MEMBER`
  - `USER_NOT_FOUND`
  - `MENTOR_ALREADY_IN_TEAM`
  - `FORBIDDEN`
  - And more...

### Conditional Rendering:
- Pending requests section only shows when requests exist
- Team members hidden from candidates with `status='requested'`
- Empty states for no teams, no members, no requests

### Visual Design:
- Modern card-based layout
- Role badges (Admin, Mentor, Candidate)
- Status badges (Active, Invited, Requested, Removed)
- Responsive grid layouts
- Clear action buttons with loading states

---

## Security & Validation

### Backend:
- ✅ All routes protected with `auth` middleware
- ✅ Role-based access control enforced
- ✅ Membership validation before operations
- ✅ One-mentor-per-team constraint enforced
- ✅ Status validation (e.g., can't accept if not `'invited'`)
- ✅ Database constraints for data integrity

### Frontend:
- ✅ Conditional UI based on roles and status
- ✅ API error handling with user-friendly messages
- ✅ Loading states for async operations
- ✅ Form validation

---

## Files Created/Modified

### Backend:
- ✅ `backend/db/add_team_accounts.sql` (created)
- ✅ `backend/db/add_requested_status.sql` (created)
- ✅ `backend/db/update_team_hierarchy.sql` (created)
- ✅ `backend/routes/team.js` (created - 760+ lines)
- ✅ `backend/server.js` (modified - registration & OAuth)

### Frontend:
- ✅ `frontend/src/contexts/TeamContext.jsx` (created)
- ✅ `frontend/src/pages/Profile/TeamManagement.jsx` (created - 1147+ lines)
- ✅ `frontend/src/pages/Profile/TeamManagement.css` (created - 700+ lines)
- ✅ `frontend/src/pages/Profile/MentorTab.jsx` (modified)
- ✅ `frontend/src/components/ProfileNavBar.jsx` (modified)
- ✅ `frontend/src/pages/Register.jsx` (modified)
- ✅ `frontend/src/App.jsx` (modified)

---

## Testing Checklist

### To Verify:
1. ✅ Register as team admin → Team auto-created
2. ✅ Register as candidate → No team created
3. ✅ Admin can create multiple teams
4. ✅ Admin can rename teams
5. ✅ Admin can invite members
6. ✅ Candidate can request to join team
7. ✅ Mentor can approve join request → Status goes to `'active'`
8. ✅ Candidate with `status='requested'` cannot see team members
9. ✅ Candidate can accept invitation → Status goes to `'active'`
10. ✅ Pending requests box only shows when requests exist
11. ✅ Mentor constraint: Can only be in one team
12. ✅ Candidate can belong to multiple teams
13. ✅ All tabs show correctly based on roles

---

## Current State: ✅ Phase 2 Complete

All Phase 2 requirements have been implemented:
- ✅ Team membership system
- ✅ Team visibility rules
- ✅ Basic Team Management screen for all roles
- ✅ Mentor tab for all roles
- ✅ Join request/approval flow
- ✅ Invitation flow
- ✅ Role-based permissions
- ✅ Status-based visibility

**Next Phase (Not Implemented Yet):**
- Mentor dashboards
- Feedback features
- Task assignment
- Activity feeds
- Shared job posts
- Cross-user profile viewing

---

## Summary

The hierarchical team system is fully functional with:
- **3 account types**: candidate, team_admin
- **3 team roles**: admin, mentor, candidate
- **4 status states**: requested, invited, active, removed
- **15+ API endpoints** for team management
- **Role-based UI** with 3 distinct management views
- **Multi-team support** for candidates
- **One-team restriction** for mentors
- **Complete invitation/approval workflows**

The system is ready for Phase 3 development (coaching tools and mentor features).

