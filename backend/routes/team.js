import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import { auth } from "../auth.js";

dotenv.config();
const { Pool } = pkg;

const router = express.Router();
// Configure SSL for Supabase connections
const sslConfig = process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('pooler.supabase')
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(sslConfig && { ssl: sslConfig }),
});

const ADMIN_ROLES = new Set(["admin"]);
const MANAGER_ROLES = new Set(["admin", "mentor"]);
const MUTABLE_ROLES = new Set(["mentor", "candidate"]);

async function getMembership(teamId, userId) {
  const { rows } = await pool.query(
    "SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2",
    [teamId, userId]
  );
  return rows[0] || null;
}

async function getUserAccountType(userId) {
  const { rows } = await pool.query(
    "SELECT account_type FROM users WHERE id=$1",
    [userId]
  );
  return rows[0]?.account_type || "candidate";
}

router.use(auth);

// ============================================================
// GET /api/team/me - Get user's teams and role info
// ============================================================
router.get("/me", async (req, res) => {
  try {
    const userId = req.user.id;
    const [userResult, teamsResult] = await Promise.all([
      pool.query("SELECT account_type FROM users WHERE id=$1", [userId]),
      pool.query(
        `
        SELECT
          t.id,
          t.name,
          t.owner_id AS "ownerId",
          t.created_at AS "createdAt",
          tm.role,
          tm.status,
          tm.user_id AS "userId"
        FROM team_members tm
        INNER JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY t.created_at ASC
        `,
        [userId]
      ),
    ]);

    const teams = teamsResult.rows;
    const primaryTeam = teams[0] || null;
    res.json({
      accountType: userResult.rows[0]?.account_type || "candidate",
      teams,
      primaryTeam,
    });
  } catch (err) {
    console.error("Team lookup failed:", err);
    res.status(500).json({ error: "TEAM_LOOKUP_FAILED" });
  }
});

// ============================================================
// GET /api/team/admin/all - Admin: Get all teams they manage
// ============================================================
router.get("/admin/all", async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = await getUserAccountType(userId);

    if (accountType !== "team_admin") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { rows } = await pool.query(
      `
      SELECT DISTINCT
        t.id,
        t.name,
        t.owner_id AS "ownerId",
        t.created_at AS "createdAt",
        COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.status = 'active') AS "memberCount"
      FROM teams t
      INNER JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = $1 AND tm.role = 'admin'
      GROUP BY t.id, t.name, t.owner_id, t.created_at
      ORDER BY t.created_at DESC
      `,
      [userId]
    );

    res.json({ teams: rows });
  } catch (err) {
    console.error("Get admin teams failed:", err);
    res.status(500).json({ error: "FETCH_FAILED" });
  }
});

// ============================================================
// POST /api/team/admin/create - Admin: Create new team
// ============================================================
router.post("/admin/create", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const accountType = await getUserAccountType(userId);

    if (accountType !== "team_admin") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "TEAM_NAME_REQUIRED" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamResult = await client.query(
        "INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id AS \"ownerId\", created_at AS \"createdAt\"",
        [name.trim(), userId]
      );

      const teamId = teamResult.rows[0].id;

      await client.query(
        "INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, 'admin', 'active')",
        [teamId, userId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "TEAM_CREATED",
        team: teamResult.rows[0],
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Create team failed:", err);
    res.status(500).json({ error: "CREATE_FAILED" });
  }
});

// ============================================================
// PATCH /api/team/admin/:teamId/rename - Admin: Rename team
// ============================================================
router.patch("/admin/:teamId/rename", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const userId = req.user.id;
    const { name } = req.body;

    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "TEAM_NAME_REQUIRED" });
    }

    const accountType = await getUserAccountType(userId);
    if (accountType !== "team_admin") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || !ADMIN_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const result = await pool.query(
      "UPDATE teams SET name=$1 WHERE id=$2 RETURNING id, name",
      [name.trim(), teamId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "TEAM_NOT_FOUND" });
    }

    res.json({ message: "TEAM_RENAMED", team: result.rows[0] });
  } catch (err) {
    console.error("Rename team failed:", err);
    res.status(500).json({ error: "RENAME_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/members - Get team members (admin/mentor/candidate)
// ============================================================
router.get("/:teamId/members", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;
    const membership = await getMembership(teamId, userId);

    if (!membership) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Users with "requested" or "invited" status cannot see team members yet
    // They must accept the invitation first (invited → active) or get approved (requested → active)
    if (membership.status === "requested" || membership.status === "invited") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Admin/mentor can see all members; candidates can see members only if status is 'active'
    const [teamResult, memberResult] = await Promise.all([
      pool.query(
        'SELECT id, name, owner_id AS "ownerId" FROM teams WHERE id=$1',
        [teamId]
      ),
      pool.query(
        `
        SELECT
          tm.user_id AS "userId",
          tm.role,
          tm.status,
          tm.created_at AS "joinedAt",
          u.first_name AS "firstName",
          u.last_name AS "lastName",
          u.email
        FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY tm.created_at ASC
        `,
        [teamId]
      ),
    ]);

    if (teamResult.rowCount === 0) {
      return res.status(404).json({ error: "TEAM_NOT_FOUND" });
    }

    res.json({
      team: teamResult.rows[0],
      members: memberResult.rows,
    });
  } catch (err) {
    console.error("Fetch team members failed:", err);
    res.status(500).json({ error: "TEAM_MEMBERS_FETCH_FAILED" });
  }
});

// ============================================================
// PATCH /api/team/:teamId/members/:memberId - Update member role (admin/mentor only)
// ============================================================
router.patch("/:teamId/members/:memberId", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;
    const { role } = req.body;

    const membership = await getMembership(teamId, userId);
    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const normalizedRole = (role || "").toLowerCase();
    if (!MUTABLE_ROLES.has(normalizedRole)) {
      return res.status(400).json({ error: "INVALID_ROLE" });
    }

    // Check mentor constraint: if assigning mentor role, ensure they're not already a mentor elsewhere
    if (normalizedRole === "mentor") {
      const existingMentorTeam = await pool.query(
        "SELECT team_id FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active' AND team_id != $2",
        [memberId, teamId]
      );
      if (existingMentorTeam.rowCount > 0) {
        return res.status(409).json({ error: "MENTOR_ALREADY_IN_TEAM" });
      }
    }

    const result = await pool.query(
      "UPDATE team_members SET role=$1 WHERE team_id=$2 AND user_id=$3 RETURNING team_id",
      [normalizedRole, teamId, memberId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    res.json({ message: "ROLE_UPDATED" });
  } catch (err) {
    console.error("Update member role failed:", err);
    res.status(500).json({ error: "ROLE_UPDATE_FAILED" });
  }
});

// ============================================================
// DELETE /api/team/:teamId/members/:memberId - Remove member (admin/mentor only)
// ============================================================
router.delete("/:teamId/members/:memberId", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;
    const membership = await getMembership(teamId, userId);

    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Check the role of the member being removed
    const memberToRemove = await getMembership(teamId, memberId);
    if (!memberToRemove) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    // Prevent mentors from removing admins - only admins can remove admins
    if (memberToRemove.role === "admin" && membership.role !== "admin") {
      return res.status(403).json({ error: "CANNOT_REMOVE_ADMIN" });
    }

    // Prevent mentors from removing themselves - they must be removed by an admin
    if (memberId === userId && membership.role === "mentor") {
      return res.status(403).json({ error: "MENTOR_CANNOT_REMOVE_SELF" });
    }

    const result = await pool.query(
      "DELETE FROM team_members WHERE team_id=$1 AND user_id=$2 RETURNING user_id",
      [teamId, memberId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    res.json({ message: "MEMBER_REMOVED" });
  } catch (err) {
    console.error("Remove member failed:", err);
    res.status(500).json({ error: "MEMBER_REMOVE_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/invite - Invite member (admin/mentor/candidate)
// ============================================================
router.post("/:teamId/invite", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;
    const { email, role = "candidate" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Determine allowed roles based on inviter's role
    let allowedRoles = new Set(["candidate"]);
    if (ADMIN_ROLES.has(membership.role)) {
      allowedRoles = MUTABLE_ROLES;
    } else if (membership.role === "mentor") {
      allowedRoles = MUTABLE_ROLES;
    } else if (membership.role === "candidate") {
      // Candidates can invite mentors or other candidates
      allowedRoles = MUTABLE_ROLES;
    }

    const normalizedRole = allowedRoles.has((role || "").toLowerCase())
      ? (role || "").toLowerCase()
      : "candidate";
    const normalizedEmail = email.trim().toLowerCase();

    const userResult = await pool.query("SELECT id FROM users WHERE email=$1", [
      normalizedEmail,
    ]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const inviteeId = userResult.rows[0].id;

    // Check if already a member
    const existing = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, inviteeId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "ALREADY_MEMBER" });
    }

    // Check mentor constraint: one mentor per team
    if (normalizedRole === "mentor") {
      const existingMentor = await pool.query(
        "SELECT team_id FROM team_members WHERE user_id=$1 AND role='mentor' AND status IN ('active', 'invited')",
        [inviteeId]
      );
      if (existingMentor.rowCount > 0) {
        return res.status(409).json({
          error: "MENTOR_ALREADY_IN_TEAM",
          message: "This user is already a mentor in another team.",
        });
      }
    }

    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1,$2,$3,'invited')",
      [teamId, inviteeId, normalizedRole]
    );

    res.status(201).json({ message: "INVITE_CREATED" });
  } catch (err) {
    console.error("Invite member failed:", err);
    res.status(500).json({ error: "INVITE_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/request-mentor - Candidate: Request mentor by email or team name
// ============================================================
router.post("/:teamId/request-mentor", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;
    const { email, teamName } = req.body;

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.role !== "candidate" || membership.status !== "active") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    let mentorId = null;

    if (email) {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE email=$1",
        [email.trim().toLowerCase()]
      );
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }
      mentorId = userResult.rows[0].id;
    } else if (teamName) {
      // Find mentor by team name - get any active mentor from that team
      const mentorResult = await pool.query(
        `
        SELECT tm.user_id
        FROM team_members tm
        INNER JOIN teams t ON t.id = tm.team_id
        WHERE LOWER(t.name) = LOWER($1) AND tm.role = 'mentor' AND tm.status = 'active'
        LIMIT 1
        `,
        [teamName.trim()]
      );
      if (mentorResult.rowCount === 0) {
        return res.status(404).json({ error: "MENTOR_NOT_FOUND_IN_TEAM" });
      }
      mentorId = mentorResult.rows[0].user_id;
    } else {
      return res.status(400).json({ error: "EMAIL_OR_TEAM_NAME_REQUIRED" });
    }

    // Check if already a member
    const existing = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, mentorId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "ALREADY_MEMBER" });
    }

    // Check mentor constraint
    const existingMentorTeam = await pool.query(
      "SELECT team_id FROM team_members WHERE user_id=$1 AND role='mentor' AND status IN ('active', 'invited')",
      [mentorId]
    );
    if (existingMentorTeam.rowCount > 0) {
      // Mentor is in another team - invite them to this team (they'll need to leave their current team first)
      return res.status(409).json({
        error: "MENTOR_ALREADY_IN_TEAM",
        message: "This mentor is already part of another team. They must leave that team first.",
      });
    }

    // Invite mentor to candidate's team
    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1,$2,'mentor','invited')",
      [teamId, mentorId]
    );

    res.status(201).json({ message: "MENTOR_REQUEST_SENT" });
  } catch (err) {
    console.error("Request mentor failed:", err);
    res.status(500).json({ error: "REQUEST_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/accept - Accept invitation
// ============================================================
router.post("/:teamId/accept", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;

    const membership = await getMembership(teamId, userId);
    if (!membership) {
      return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    }
    // Only allow accepting actual invites, not join requests (requested status)
    if (membership.status !== "invited") {
      return res.status(400).json({ 
        error: "NOT_INVITED",
        message: membership.status === "requested" 
          ? "Your join request is pending approval by a mentor or admin."
          : "You can only accept invitations, not requests."
      });
    }

    // If accepting as mentor, ensure they're not already a mentor elsewhere
    if (membership.role === "mentor") {
      const existingMentorTeam = await pool.query(
        "SELECT team_id FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active' AND team_id != $2",
        [userId, teamId]
      );
      if (existingMentorTeam.rowCount > 0) {
        return res.status(409).json({
          error: "MENTOR_ALREADY_IN_TEAM",
          message: "You are already a mentor in another team. Leave that team first.",
        });
      }
    }

    await pool.query(
      "UPDATE team_members SET status='active' WHERE team_id=$1 AND user_id=$2",
      [teamId, userId]
    );

    res.json({ message: "INVITE_ACCEPTED" });
  } catch (err) {
    console.error("Accept invite failed:", err);
    res.status(500).json({ error: "ACCEPT_FAILED" });
  }
});

// ============================================================
// GET /api/team/search?q=teamName - Candidate: Search for teams to join
// ============================================================
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "SEARCH_QUERY_REQUIRED" });
    }

    const { rows } = await pool.query(
      `
      SELECT DISTINCT
        t.id,
        t.name,
        COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.status = 'active') AS "memberCount"
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE LOWER(t.name) LIKE LOWER($1)
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
      LIMIT 20
      `,
      [`%${q.trim()}%`]
    );

    res.json({ teams: rows });
  } catch (err) {
    console.error("Search teams failed:", err);
    res.status(500).json({ error: "SEARCH_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/request-join - Candidate: Request to join a team
// ============================================================
router.post("/:teamId/request-join", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;

    // Check if team exists
    const teamResult = await pool.query("SELECT id, name FROM teams WHERE id=$1", [
      teamId,
    ]);
    if (teamResult.rowCount === 0) {
      return res.status(404).json({ error: "TEAM_NOT_FOUND" });
    }

    // Check if already a member
    const existing = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, userId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "ALREADY_MEMBER" });
    }

    // Create join request (candidate role, requested status - requires approval)
    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, 'candidate', 'requested')",
      [teamId, userId]
    );

    res.status(201).json({ message: "JOIN_REQUEST_SENT" });
  } catch (err) {
    console.error("Request join team failed:", err);
    res.status(500).json({ error: "REQUEST_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/pending-requests - Get pending join requests (admin/mentor only)
// ============================================================
router.get("/:teamId/pending-requests", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;

    const membership = await getMembership(teamId, userId);
    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        tm.user_id AS "userId",
        tm.role,
        tm.status,
        tm.created_at AS "requestedAt",
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email
      FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = $1 AND tm.status = 'requested'
      ORDER BY tm.created_at ASC
      `,
      [teamId]
    );

    res.json({ requests: rows });
  } catch (err) {
    console.error("Get pending requests failed:", err);
    res.status(500).json({ error: "FETCH_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/requests/:memberId/approve - Approve join request (admin/mentor only)
// ============================================================
router.post("/:teamId/requests/:memberId/approve", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;

    const membership = await getMembership(teamId, userId);
    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Check if request exists and is in requested status
    const requestCheck = await pool.query(
      "SELECT status FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, memberId]
    );
    if (requestCheck.rowCount === 0) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }
    if (requestCheck.rows[0].status !== "requested") {
      return res.status(400).json({ error: "NOT_A_REQUEST" });
    }

    // Approve: change status directly to 'active' (they requested, we approved, they're in)
    await pool.query(
      "UPDATE team_members SET status='active' WHERE team_id=$1 AND user_id=$2",
      [teamId, memberId]
    );

    res.json({ message: "REQUEST_APPROVED" });
  } catch (err) {
    console.error("Approve request failed:", err);
    res.status(500).json({ error: "APPROVE_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/requests/:memberId/reject - Reject join request (admin/mentor only)
// ============================================================
router.post("/:teamId/requests/:memberId/reject", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;

    const membership = await getMembership(teamId, userId);
    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Check if request exists and is in requested status
    const requestCheck = await pool.query(
      "SELECT status FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, memberId]
    );
    if (requestCheck.rowCount === 0) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }
    if (requestCheck.rows[0].status !== "requested") {
      return res.status(400).json({ error: "NOT_A_REQUEST" });
    }

    // Reject: remove the request
    await pool.query(
      "DELETE FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, memberId]
    );

    res.json({ message: "REQUEST_REJECTED" });
  } catch (err) {
    console.error("Reject request failed:", err);
    res.status(500).json({ error: "REJECT_FAILED" });
  }
});

// ============================================================
// POST /api/team/:teamId/leave - Leave team (candidates can leave themselves)
// ============================================================
router.post("/:teamId/leave", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }
    const userId = req.user.id;

    const membership = await getMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: "NOT_A_MEMBER" });
    }

    // Only candidates can leave themselves (admins and mentors must be removed by admins)
    if (membership.role !== "candidate") {
      return res.status(403).json({ error: "ONLY_CANDIDATES_CAN_LEAVE" });
    }

    // Remove the member from the team
    const result = await pool.query(
      "DELETE FROM team_members WHERE team_id=$1 AND user_id=$2 RETURNING user_id",
      [teamId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    res.json({ message: "LEFT_TEAM" });
  } catch (err) {
    console.error("Leave team failed:", err);
    res.status(500).json({ error: "LEAVE_TEAM_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/members/:memberId/profile - View candidate profile (mentor/admin only)
// ============================================================
router.get("/:teamId/members/:memberId/profile", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;

    // Check if requester is mentor/admin in the team
    const membership = await getMembership(teamId, userId);
    if (!membership || !MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Check if member exists in team and is a candidate
    const memberCheck = await pool.query(
      "SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2",
      [teamId, memberId]
    );
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    const memberRole = memberCheck.rows[0].role;
    // Only allow viewing profiles of candidates (mentors/admins can't be viewed)
    if (memberRole !== "candidate") {
      return res.status(403).json({ error: "CAN_ONLY_VIEW_CANDIDATE_PROFILES" });
    }

    // Fetch profile data (excluding sensitive information like phone, user_id)
    const [profileResult, employmentResult, educationResult, skillsResult, projectsResult, certificationsResult, jobsResult] = await Promise.all([
      pool.query(
        `SELECT full_name, email, location, title, bio, industry, experience, picture_url 
         FROM profiles WHERE user_id=$1`,
        [memberId]
      ),
      pool.query(
        `SELECT title, company, location, start_date, end_date, current, description
         FROM employment WHERE user_id=$1 ORDER BY start_date DESC`,
        [memberId]
      ),
      pool.query(
        `SELECT institution, degree_type, field_of_study, graduation_date, gpa, education_level
         FROM education WHERE user_id=$1 ORDER BY graduation_date DESC NULLS LAST`,
        [memberId]
      ),
      pool.query(
        `SELECT name, category, proficiency FROM skills WHERE user_id=$1 ORDER BY category, name`,
        [memberId]
      ),
      pool.query(
        `SELECT name, description, technologies, start_date, end_date, repository_link
         FROM projects WHERE user_id=$1 ORDER BY start_date DESC`,
        [memberId]
      ),
      pool.query(
        `SELECT name, organization, category, date_earned, expiration_date
         FROM certifications WHERE user_id=$1 ORDER BY date_earned DESC NULLS LAST`,
        [memberId]
      ),
      pool.query(
        `SELECT id, title, company, location, status, deadline, salary_min, salary_max, industry, created_at, status_updated_at,
         GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - COALESCE(status_updated_at, created_at))) / 86400.0))::int AS days_in_stage
         FROM jobs WHERE user_id=$1 AND "isarchived"=false ORDER BY created_at DESC`,
        [memberId]
      ),
    ]);

    const profile = profileResult.rows[0] || {};
    
    res.json({
      profile: {
        fullName: profile.full_name || "",
        email: profile.email || "",
        location: profile.location || "",
        title: profile.title || "",
        bio: profile.bio || "",
        industry: profile.industry || "",
        experience: profile.experience || "",
        pictureUrl: profile.picture_url || null,
      },
      employment: employmentResult.rows,
      education: educationResult.rows,
      skills: skillsResult.rows,
      projects: projectsResult.rows.map(proj => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        start_date: proj.start_date,
        end_date: proj.end_date,
        repository_link: proj.repository_link,
      })),
      certifications: certificationsResult.rows,
      jobs: jobsResult.rows.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        status: job.status,
        deadline: job.deadline,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        industry: job.industry,
        createdAt: job.created_at,
        statusUpdatedAt: job.status_updated_at,
        daysInStage: job.days_in_stage || 0,
      })),
    });
  } catch (err) {
    console.error("View candidate profile failed:", err);
    res.status(500).json({ error: "PROFILE_FETCH_FAILED" });
  }
});

export default router;
