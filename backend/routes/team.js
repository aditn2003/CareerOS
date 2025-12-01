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

// Check if this is a Supabase connection
const dbUrl = process.env.DATABASE_URL || '';
const isSupabase = dbUrl.includes('supabase') || 
                   dbUrl.includes('pooler.supabase') ||
                   (dbUrl.includes('aws-') && dbUrl.includes('pooler'));

// Supabase Session mode has VERY strict connection limits (typically 4-5 total connections across ALL pools)
// Use VERY small pool size for Supabase to avoid "MaxClientsInSessionMode" errors
const poolSize = isSupabase ? 1 : 20; // Maximum 1 connection for Supabase (extremely conservative)
const minPoolSize = isSupabase ? 0 : 2; // No minimum for Supabase - allow full closure when idle

const pool = new Pool({
  connectionString: dbUrl,
  ...(sslConfig && { ssl: sslConfig }),
  max: poolSize, // Maximum connections (1 for Supabase - extremely conservative)
  min: minPoolSize, // Minimum connections (0 for Supabase to allow full closure)
  idleTimeoutMillis: 60000, // Close idle clients after 1 minute (aggressive to free connections)
  connectionTimeoutMillis: 5000, // Return error after 5 seconds
  allowExitOnIdle: isSupabase ? true : false, // Allow pool to fully close when idle for Supabase
  keepAlive: false, // Disable keep-alive for Supabase to reduce connection overhead
});

// Handle pool errors gracefully - don't terminate on error, try to reconnect
pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle client in team.js:', err.message);
  // Don't throw - let the pool handle reconnection automatically
});

// Remove health check interval - it consumes connections unnecessarily
// Connections will be created on-demand when needed

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
        COUNT(DISTINCT tm_all.user_id) FILTER (WHERE tm_all.status = 'active') AS "memberCount"
      FROM teams t
      INNER JOIN team_members tm_admin ON tm_admin.team_id = t.id
      LEFT JOIN team_members tm_all ON tm_all.team_id = t.id
      WHERE tm_admin.user_id = $1 AND tm_admin.role = 'admin'
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

// ============================================================
// MENTOR FEEDBACK SYSTEM
// ============================================================

// GET /api/team/:teamId/feedback - Get all feedback for a team
// Mentors/Admins: See all feedback
// Candidates: See only feedback about themselves
router.get("/:teamId/feedback", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";

    let query;
    let params;

    if (isManager) {
      // Mentors/Admins see all feedback in the team
      query = `
        SELECT 
          mf.id,
          mf.team_id,
          mf.mentor_id,
          mf.candidate_id,
          mf.job_id,
          mf.feedback_type,
          mf.content,
          mf.skill_name,
          mf.created_at,
          mf.updated_at,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          mentor_u.email AS mentor_email,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          candidate_u.email AS candidate_email,
          j.title AS job_title,
          j.company AS job_company,
          t.id AS task_id,
          t.title AS task_title
        FROM mentor_feedback mf
        LEFT JOIN profiles mentor_prof ON mf.mentor_id = mentor_prof.user_id
        LEFT JOIN users mentor_u ON mf.mentor_id = mentor_u.id
        LEFT JOIN profiles candidate_prof ON mf.candidate_id = candidate_prof.user_id
        LEFT JOIN users candidate_u ON mf.candidate_id = candidate_u.id
        LEFT JOIN jobs j ON mf.job_id = j.id
        LEFT JOIN tasks t ON mf.task_id = t.id
        WHERE mf.team_id = $1
        ORDER BY mf.created_at DESC
      `;
      params = [teamId];
    } else if (isCandidate) {
      // Candidates only see feedback about themselves
      query = `
        SELECT 
          mf.id,
          mf.team_id,
          mf.mentor_id,
          mf.candidate_id,
          mf.job_id,
          mf.feedback_type,
          mf.content,
          mf.skill_name,
          mf.created_at,
          mf.updated_at,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          mentor_u.email AS mentor_email,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          candidate_u.email AS candidate_email,
          j.title AS job_title,
          j.company AS job_company,
          t.id AS task_id,
          t.title AS task_title
        FROM mentor_feedback mf
        LEFT JOIN profiles mentor_prof ON mf.mentor_id = mentor_prof.user_id
        LEFT JOIN users mentor_u ON mf.mentor_id = mentor_u.id
        LEFT JOIN profiles candidate_prof ON mf.candidate_id = candidate_prof.user_id
        LEFT JOIN users candidate_u ON mf.candidate_id = candidate_u.id
        LEFT JOIN jobs j ON mf.job_id = j.id
        LEFT JOIN tasks t ON mf.task_id = t.id
        WHERE mf.team_id = $1 AND mf.candidate_id = $2
        ORDER BY mf.created_at DESC
      `;
      params = [teamId, userId];
    } else {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const result = await pool.query(query, params);
    
    console.log(`[Feedback] Fetched ${result.rows.length} feedback entries for team ${teamId}, user ${userId}`);
    
    res.json({
      feedback: result.rows.map(fb => ({
        id: fb.id,
        teamId: fb.team_id,
        mentorId: fb.mentor_id,
        candidateId: fb.candidate_id,
        jobId: fb.job_id,
        feedbackType: fb.feedback_type,
        content: fb.content,
        skillName: fb.skill_name,
        createdAt: fb.created_at,
        updatedAt: fb.updated_at,
        mentorName: fb.mentor_name,
        mentorEmail: fb.mentor_email,
        candidateName: fb.candidate_name,
        candidateEmail: fb.candidate_email,
        jobTitle: fb.job_title,
        jobCompany: fb.job_company,
        taskId: fb.task_id,
        taskTitle: fb.task_title,
      })),
    });
  } catch (err) {
    console.error("Get feedback failed:", err);
    res.status(500).json({ error: "FEEDBACK_FETCH_FAILED" });
  }
});

// GET /api/team/:teamId/feedback/:feedbackId - Get single feedback entry
router.get("/:teamId/feedback/:feedbackId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);
    
    if (isNaN(teamId) || isNaN(feedbackId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";

    // Check if feedback exists and user has permission to view it
    let query;
    let params;

    if (isManager) {
      query = `
        SELECT 
          mf.*,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          j.title AS job_title,
          j.company AS job_company,
          t.id AS task_id,
          t.title AS task_title
        FROM mentor_feedback mf
        LEFT JOIN profiles mentor_prof ON mf.mentor_id = mentor_prof.user_id
        LEFT JOIN users mentor_u ON mf.mentor_id = mentor_u.id
        LEFT JOIN profiles candidate_prof ON mf.candidate_id = candidate_prof.user_id
        LEFT JOIN users candidate_u ON mf.candidate_id = candidate_u.id
        LEFT JOIN jobs j ON mf.job_id = j.id
        LEFT JOIN tasks t ON mf.task_id = t.id
        WHERE mf.id = $1 AND mf.team_id = $2
      `;
      params = [feedbackId, teamId];
    } else if (isCandidate) {
      query = `
        SELECT 
          mf.*,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          j.title AS job_title,
          j.company AS job_company,
          t.id AS task_id,
          t.title AS task_title
        FROM mentor_feedback mf
        LEFT JOIN profiles mentor_prof ON mf.mentor_id = mentor_prof.user_id
        LEFT JOIN users mentor_u ON mf.mentor_id = mentor_u.id
        LEFT JOIN profiles candidate_prof ON mf.candidate_id = candidate_prof.user_id
        LEFT JOIN users candidate_u ON mf.candidate_id = candidate_u.id
        LEFT JOIN jobs j ON mf.job_id = j.id
        LEFT JOIN tasks t ON mf.task_id = t.id
        WHERE mf.id = $1 AND mf.team_id = $2 AND mf.candidate_id = $3
      `;
      params = [feedbackId, teamId, userId];
    } else {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const fb = result.rows[0];
    res.json({
      id: fb.id,
      teamId: fb.team_id,
      mentorId: fb.mentor_id,
      candidateId: fb.candidate_id,
      jobId: fb.job_id,
      feedbackType: fb.feedback_type,
      content: fb.content,
      skillName: fb.skill_name,
      createdAt: fb.created_at,
      updatedAt: fb.updated_at,
      mentorName: fb.mentor_name,
      candidateName: fb.candidate_name,
      jobTitle: fb.job_title,
      jobCompany: fb.job_company,
      taskId: fb.task_id,
      taskTitle: fb.task_title,
    });
  } catch (err) {
    console.error("Get feedback failed:", err);
    res.status(500).json({ error: "FEEDBACK_FETCH_FAILED" });
  }
});

// POST /api/team/:teamId/feedback - Create feedback (mentor only - admins cannot create feedback)
router.post("/:teamId/feedback", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const { candidateId, jobId, feedbackType, content, skillName, taskId } = req.body;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    if (!candidateId || !feedbackType || !content) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    if (!["job", "skill", "general", "task"].includes(feedbackType)) {
      return res.status(400).json({ error: "INVALID_FEEDBACK_TYPE" });
    }

    // Enforce that if taskId is provided, feedbackType must be "task"
    if (taskId && feedbackType !== "task") {
      return res.status(400).json({ error: "TASK_FEEDBACK_MUST_HAVE_TASK_TYPE" });
    }

    // Enforce that if feedbackType is "task", taskId must be provided
    if (feedbackType === "task" && !taskId) {
      return res.status(400).json({ error: "TASK_FEEDBACK_REQUIRES_TASK_ID" });
    }

    if (feedbackType === "skill" && !skillName) {
      return res.status(400).json({ error: "SKILL_NAME_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors can create feedback - admins cannot create feedback (they can only view/edit/delete)
    if (membership.role !== "mentor") {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_CREATE_FEEDBACK" });
    }

    // Verify candidate is in the same team
    const candidateMembership = await getMembership(teamId, candidateId);
    if (!candidateMembership || candidateMembership.status !== "active") {
      return res.status(400).json({ error: "CANDIDATE_NOT_IN_TEAM" });
    }

    if (candidateMembership.role !== "candidate") {
      return res.status(400).json({ error: "FEEDBACK_ONLY_FOR_CANDIDATES" });
    }

    // If jobId is provided, verify it belongs to the candidate
    if (jobId) {
      const jobResult = await pool.query(
        "SELECT user_id FROM jobs WHERE id = $1",
        [jobId]
      );
      if (jobResult.rows.length === 0 || jobResult.rows[0].user_id !== candidateId) {
        return res.status(400).json({ error: "INVALID_JOB_ID" });
      }
    }

    // If taskId is provided, verify it exists and belongs to the candidate
    if (taskId) {
      const taskResult = await pool.query(
        "SELECT candidate_id FROM tasks WHERE id = $1 AND team_id = $2",
        [taskId, teamId]
      );
      if (taskResult.rows.length === 0 || taskResult.rows[0].candidate_id !== candidateId) {
        return res.status(400).json({ error: "INVALID_TASK_ID" });
      }
    }

    const result = await pool.query(
      `INSERT INTO mentor_feedback 
       (team_id, mentor_id, candidate_id, job_id, task_id, feedback_type, content, skill_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        teamId,
        userId,
        candidateId,
        jobId || null,
        taskId || null,
        feedbackType,
        content,
        skillName || null,
      ]
    );

    console.log(`[Feedback] Created feedback ${result.rows[0].id} for candidate ${candidateId} in team ${teamId}`);

    const feedback = result.rows[0];
    
    // Fetch mentor and candidate names for response
    const [mentorResult, candidateResult] = await Promise.all([
      pool.query("SELECT full_name FROM profiles WHERE user_id = $1", [userId]),
      pool.query("SELECT full_name FROM profiles WHERE user_id = $1", [candidateId]),
    ]);

    res.status(201).json({
      id: feedback.id,
      teamId: feedback.team_id,
      mentorId: feedback.mentor_id,
      candidateId: feedback.candidate_id,
      jobId: feedback.job_id,
      feedbackType: feedback.feedback_type,
      content: feedback.content,
      skillName: feedback.skill_name,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      mentorName: mentorResult.rows[0]?.full_name || "",
      candidateName: candidateResult.rows[0]?.full_name || "",
    });
  } catch (err) {
    console.error("Create feedback failed:", err);
    res.status(500).json({ error: "FEEDBACK_CREATE_FAILED" });
  }
});

// PATCH /api/team/:teamId/feedback/:feedbackId - Update feedback (mentor who created it only)
router.patch("/:teamId/feedback/:feedbackId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);
    const { content, skillName } = req.body;

    if (isNaN(teamId) || isNaN(feedbackId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    if (!content) {
      return res.status(400).json({ error: "CONTENT_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Check if feedback exists and user is the creator (or admin)
    const feedbackResult = await pool.query(
      "SELECT mentor_id, feedback_type FROM mentor_feedback WHERE id = $1 AND team_id = $2",
      [feedbackId, teamId]
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const feedback = feedbackResult.rows[0];
    const isAdmin = ADMIN_ROLES.has(membership.role);
    const isCreator = feedback.mentor_id === userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: "CAN_ONLY_EDIT_OWN_FEEDBACK" });
    }

    // Update feedback
    const updateFields = ["content = $1"];
    const updateValues = [content];
    let paramIndex = 2;

    if (feedback.feedback_type === "skill" && skillName) {
      updateFields.push(`skill_name = $${paramIndex}`);
      updateValues.push(skillName);
      paramIndex++;
    }

    updateValues.push(feedbackId, teamId);

    const result = await pool.query(
      `UPDATE mentor_feedback 
       SET ${updateFields.join(", ")}
       WHERE id = $${paramIndex} AND team_id = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const updatedFeedback = result.rows[0];
    res.json({
      id: updatedFeedback.id,
      teamId: updatedFeedback.team_id,
      mentorId: updatedFeedback.mentor_id,
      candidateId: updatedFeedback.candidate_id,
      jobId: updatedFeedback.job_id,
      feedbackType: updatedFeedback.feedback_type,
      content: updatedFeedback.content,
      skillName: updatedFeedback.skill_name,
      createdAt: updatedFeedback.created_at,
      updatedAt: updatedFeedback.updated_at,
    });
  } catch (err) {
    console.error("Update feedback failed:", err);
    res.status(500).json({ error: "FEEDBACK_UPDATE_FAILED" });
  }
});

// DELETE /api/team/:teamId/feedback/:feedbackId - Delete feedback
router.delete("/:teamId/feedback/:feedbackId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);

    if (isNaN(teamId) || isNaN(feedbackId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Check if feedback exists and user has permission to delete
    const feedbackResult = await pool.query(
      "SELECT mentor_id FROM mentor_feedback WHERE id = $1 AND team_id = $2",
      [feedbackId, teamId]
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const feedback = feedbackResult.rows[0];
    const isAdmin = ADMIN_ROLES.has(membership.role);
    const isCreator = feedback.mentor_id === userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: "CAN_ONLY_DELETE_OWN_FEEDBACK" });
    }

    await pool.query(
      "DELETE FROM mentor_feedback WHERE id = $1 AND team_id = $2",
      [feedbackId, teamId]
    );

    res.json({ message: "FEEDBACK_DELETED" });
  } catch (err) {
    console.error("Delete feedback failed:", err);
    res.status(500).json({ error: "FEEDBACK_DELETE_FAILED" });
  }
});

// ============================================================
// FEEDBACK REPLIES / THREADING SYSTEM
// ============================================================

// GET /api/team/:teamId/feedback/:feedbackId/replies - Get all replies for a feedback thread
router.get("/:teamId/feedback/:feedbackId/replies", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);

    if (isNaN(teamId) || isNaN(feedbackId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Verify feedback exists and user has permission to view it
    const feedbackResult = await pool.query(
      `SELECT mentor_id, candidate_id FROM mentor_feedback WHERE id = $1 AND team_id = $2`,
      [feedbackId, teamId]
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const feedback = feedbackResult.rows[0];
    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";

    // Verify user is either the mentor or candidate
    if (!isManager && userId !== feedback.candidate_id && userId !== feedback.mentor_id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Fetch all replies with user info, ordered by creation time
    const repliesResult = await pool.query(
      `
      SELECT 
        fr.id,
        fr.feedback_id,
        fr.user_id,
        fr.parent_reply_id,
        fr.content,
        fr.created_at,
        fr.updated_at,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
          u_prof.full_name,
          u.email,
          'Unknown'
        ) AS user_name,
        u.email AS user_email,
        mf.mentor_id,
        mf.candidate_id
      FROM feedback_replies fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN profiles u_prof ON fr.user_id = u_prof.user_id
      JOIN mentor_feedback mf ON fr.feedback_id = mf.id
      WHERE fr.feedback_id = $1
      ORDER BY fr.created_at ASC
      `,
      [feedbackId]
    );

    // Build threaded structure
    const repliesMap = new Map();
    const rootReplies = [];

    repliesResult.rows.forEach((reply) => {
      const replyData = {
        id: reply.id,
        feedbackId: reply.feedback_id,
        userId: reply.user_id,
        parentReplyId: reply.parent_reply_id,
        content: reply.content,
        createdAt: reply.created_at,
        updatedAt: reply.updated_at,
        userName: reply.user_name,
        userEmail: reply.user_email,
        isMentor: reply.user_id === reply.mentor_id,
        isCandidate: reply.user_id === reply.candidate_id,
        replies: [], // Child replies
      };

      repliesMap.set(reply.id, replyData);

      if (reply.parent_reply_id) {
        const parent = repliesMap.get(reply.parent_reply_id);
        if (parent) {
          parent.replies.push(replyData);
        }
      } else {
        rootReplies.push(replyData);
      }
    });

    res.json({ replies: rootReplies });
  } catch (err) {
    console.error("Get feedback replies failed:", err);
    res.status(500).json({ error: "REPLIES_FETCH_FAILED" });
  }
});

// POST /api/team/:teamId/feedback/:feedbackId/replies - Create a reply
router.post("/:teamId/feedback/:feedbackId/replies", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);
    const { content, parentReplyId } = req.body;

    if (isNaN(teamId) || isNaN(feedbackId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "CONTENT_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Verify feedback exists and get mentor/candidate info
    const feedbackResult = await pool.query(
      `SELECT mentor_id, candidate_id FROM mentor_feedback WHERE id = $1 AND team_id = $2`,
      [feedbackId, teamId]
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const feedback = feedbackResult.rows[0];
    const isManager = MANAGER_ROLES.has(membership.role);

    // Verify user is either the mentor or candidate (or admin can reply to any)
    if (!isManager && userId !== feedback.candidate_id && userId !== feedback.mentor_id) {
      return res.status(403).json({ error: "CAN_ONLY_REPLY_TO_OWN_FEEDBACK" });
    }

    // If parentReplyId is provided, verify it exists and belongs to the same feedback
    if (parentReplyId) {
      const parentCheck = await pool.query(
        `SELECT id FROM feedback_replies WHERE id = $1 AND feedback_id = $2`,
        [parentReplyId, feedbackId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: "INVALID_PARENT_REPLY" });
      }
    }

    // Insert reply
    const result = await pool.query(
      `INSERT INTO feedback_replies (feedback_id, user_id, parent_reply_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [feedbackId, userId, parentReplyId || null, content.trim()]
    );

    const reply = result.rows[0];

    // Fetch user info for response
    const userResult = await pool.query(
      `SELECT 
        COALESCE(p.full_name, u.email, 'Unknown') AS user_name,
        u.email AS user_email
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    const userInfo = userResult.rows[0];

    res.status(201).json({
      id: reply.id,
      feedbackId: reply.feedback_id,
      userId: reply.user_id,
      parentReplyId: reply.parent_reply_id,
      content: reply.content,
      createdAt: reply.created_at,
      updatedAt: reply.updated_at,
      userName: userInfo.user_name,
      userEmail: userInfo.user_email,
      isMentor: userId === feedback.mentor_id,
      isCandidate: userId === feedback.candidate_id,
      replies: [],
    });
  } catch (err) {
    console.error("Create feedback reply failed:", err);
    res.status(500).json({ error: "REPLY_CREATE_FAILED" });
  }
});

// PATCH /api/team/:teamId/feedback/:feedbackId/replies/:replyId - Edit a reply
router.patch("/:teamId/feedback/:feedbackId/replies/:replyId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);
    const replyId = parseInt(req.params.replyId);
    const { content } = req.body;

    if (isNaN(teamId) || isNaN(feedbackId) || isNaN(replyId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "CONTENT_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Verify reply exists and belongs to this feedback
    const replyResult = await pool.query(
      `SELECT user_id FROM feedback_replies WHERE id = $1 AND feedback_id = $2`,
      [replyId, feedbackId]
    );

    if (replyResult.rows.length === 0) {
      return res.status(404).json({ error: "REPLY_NOT_FOUND" });
    }

    const reply = replyResult.rows[0];
    const isAdmin = ADMIN_ROLES.has(membership.role);

    // Only the author or admin can edit
    if (!isAdmin && reply.user_id !== userId) {
      return res.status(403).json({ error: "CAN_ONLY_EDIT_OWN_REPLY" });
    }

    // Update reply
    const updateResult = await pool.query(
      `UPDATE feedback_replies SET content = $1, updated_at = now()
       WHERE id = $2 AND feedback_id = $3
       RETURNING *`,
      [content.trim(), replyId, feedbackId]
    );

    res.json({
      id: updateResult.rows[0].id,
      content: updateResult.rows[0].content,
      updatedAt: updateResult.rows[0].updated_at,
    });
  } catch (err) {
    console.error("Update feedback reply failed:", err);
    res.status(500).json({ error: "REPLY_UPDATE_FAILED" });
  }
});

// DELETE /api/team/:teamId/feedback/:feedbackId/replies/:replyId - Delete a reply
router.delete("/:teamId/feedback/:feedbackId/replies/:replyId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const feedbackId = parseInt(req.params.feedbackId);
    const replyId = parseInt(req.params.replyId);

    if (isNaN(teamId) || isNaN(feedbackId) || isNaN(replyId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Verify reply exists
    const replyResult = await pool.query(
      `SELECT user_id FROM feedback_replies WHERE id = $1 AND feedback_id = $2`,
      [replyId, feedbackId]
    );

    if (replyResult.rows.length === 0) {
      return res.status(404).json({ error: "REPLY_NOT_FOUND" });
    }

    const reply = replyResult.rows[0];
    const isAdmin = ADMIN_ROLES.has(membership.role);

    // Only the author or admin can delete
    if (!isAdmin && reply.user_id !== userId) {
      return res.status(403).json({ error: "CAN_ONLY_DELETE_OWN_REPLY" });
    }

    // Check if reply has children (replies to this reply)
    const childrenCheck = await pool.query(
      `SELECT COUNT(*) as count FROM feedback_replies WHERE parent_reply_id = $1`,
      [replyId]
    );

    if (childrenCheck.rows[0].count > 0) {
      // If it has children, we can't delete it (or we mark it as deleted, but for now we prevent deletion)
      return res.status(400).json({ error: "CANNOT_DELETE_REPLY_WITH_CHILDREN" });
    }

    await pool.query(
      `DELETE FROM feedback_replies WHERE id = $1 AND feedback_id = $2`,
      [replyId, feedbackId]
    );

    res.json({ message: "REPLY_DELETED" });
  } catch (err) {
    console.error("Delete feedback reply failed:", err);
    res.status(500).json({ error: "REPLY_DELETE_FAILED" });
  }
});

// ============================================================
// TASK/ASSIGNMENT SYSTEM
// ============================================================

// GET /api/team/:teamId/tasks - Get all tasks for a team
// Mentors/Admins: See all tasks in the team
// Candidates: See only tasks assigned to them
router.get("/:teamId/tasks", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";

    let query;
    let params;

    if (isManager) {
      // Mentors/Admins see all tasks in the team
      query = `
        SELECT 
          t.id,
          t.team_id,
          t.mentor_id,
          t.candidate_id,
          t.job_id,
          t.skill_name,
          t.title,
          t.description,
          t.status,
          t.due_date,
          t.created_at,
          t.updated_at,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          j.title AS job_title,
          j.company AS job_company
        FROM tasks t
        INNER JOIN users mentor_u ON t.mentor_id = mentor_u.id
        LEFT JOIN profiles mentor_prof ON mentor_u.id = mentor_prof.user_id
        INNER JOIN users candidate_u ON t.candidate_id = candidate_u.id
        LEFT JOIN profiles candidate_prof ON candidate_u.id = candidate_prof.user_id
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.team_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [teamId];
    } else {
      // Candidates see only tasks assigned to them
      query = `
        SELECT 
          t.id,
          t.team_id,
          t.mentor_id,
          t.candidate_id,
          t.job_id,
          t.skill_name,
          t.title,
          t.description,
          t.status,
          t.due_date,
          t.created_at,
          t.updated_at,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          j.title AS job_title,
          j.company AS job_company
        FROM tasks t
        INNER JOIN users mentor_u ON t.mentor_id = mentor_u.id
        LEFT JOIN profiles mentor_prof ON mentor_u.id = mentor_prof.user_id
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.team_id = $1 AND t.candidate_id = $2
        ORDER BY t.created_at DESC
      `;
      params = [teamId, userId];
    }

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error("Get tasks failed:", err);
    res.status(500).json({ error: "GET_TASKS_FAILED" });
  }
});

// GET /api/team/:teamId/tasks/:taskId - Get single task
router.get("/:teamId/tasks/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(teamId) || isNaN(taskId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";

    let query;
    let params;

    if (isManager) {
      query = `
        SELECT 
          t.*,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', candidate_u.first_name, candidate_u.last_name)), ''),
            candidate_prof.full_name,
            candidate_u.email,
            'Unknown'
          ) AS candidate_name,
          j.title AS job_title,
          j.company AS job_company
        FROM tasks t
        INNER JOIN users mentor_u ON t.mentor_id = mentor_u.id
        LEFT JOIN profiles mentor_prof ON mentor_u.id = mentor_prof.user_id
        INNER JOIN users candidate_u ON t.candidate_id = candidate_u.id
        LEFT JOIN profiles candidate_prof ON candidate_u.id = candidate_prof.user_id
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = $1 AND t.team_id = $2
      `;
      params = [taskId, teamId];
    } else {
      query = `
        SELECT 
          t.*,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', mentor_u.first_name, mentor_u.last_name)), ''),
            mentor_prof.full_name,
            mentor_u.email,
            'Unknown'
          ) AS mentor_name,
          j.title AS job_title,
          j.company AS job_company
        FROM tasks t
        INNER JOIN users mentor_u ON t.mentor_id = mentor_u.id
        LEFT JOIN profiles mentor_prof ON mentor_u.id = mentor_prof.user_id
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = $1 AND t.team_id = $2 AND t.candidate_id = $3
      `;
      params = [taskId, teamId, userId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "TASK_NOT_FOUND" });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error("Get task failed:", err);
    res.status(500).json({ error: "GET_TASK_FAILED" });
  }
});

// POST /api/team/:teamId/tasks - Create task (mentor/admin only)
router.post("/:teamId/tasks", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const { candidateId, jobId, skillName, title, description, dueDate } = req.body;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    if (!candidateId || !title) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_CREATE_TASKS" });
    }

    // Verify candidate is in the team
    const candidateMembership = await getMembership(teamId, candidateId);
    if (!candidateMembership || candidateMembership.status !== "active") {
      return res.status(400).json({ error: "CANDIDATE_NOT_IN_TEAM" });
    }

    if (candidateMembership.role !== "candidate") {
      return res.status(400).json({ error: "CAN_ONLY_ASSIGN_TO_CANDIDATES" });
    }

    // Verify job belongs to candidate if provided
    if (jobId) {
      const jobResult = await pool.query(
        "SELECT id FROM jobs WHERE id = $1 AND user_id = $2",
        [jobId, candidateId]
      );
      if (jobResult.rows.length === 0) {
        return res.status(400).json({ error: "JOB_NOT_FOUND_OR_NOT_OWNED_BY_CANDIDATE" });
      }
    }

    // Create task
    const result = await pool.query(
      `INSERT INTO tasks (
        team_id, mentor_id, candidate_id, job_id, skill_name, 
        title, description, status, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *`,
      [
        teamId,
        userId,
        candidateId,
        jobId || null,
        skillName || null,
        title,
        description || null,
        dueDate || null,
      ]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error("Create task failed:", err);
    res.status(500).json({ error: "CREATE_TASK_FAILED" });
  }
});

// PATCH /api/team/:teamId/tasks/:taskId - Update task
// Mentors can edit all fields, candidates can only update status
router.patch("/:teamId/tasks/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const taskId = parseInt(req.params.taskId);
    const { title, description, status, jobId, skillName, dueDate } = req.body;

    if (isNaN(teamId) || isNaN(taskId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Check if task exists and get details
    const taskResult = await pool.query(
      "SELECT mentor_id, candidate_id FROM tasks WHERE id = $1 AND team_id = $2",
      [taskId, teamId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "TASK_NOT_FOUND" });
    }

    const task = taskResult.rows[0];
    const isManager = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === "candidate";
    const isCreator = task.mentor_id === userId;
    const isAssignedTo = task.candidate_id === userId;

    // Determine what can be updated
    let updateFields = [];
    let updateValues = [];
    let valueIndex = 1;

    if (isManager && isCreator) {
      // Mentor who created can update everything EXCEPT status (status can only be updated by candidates)
      if (title !== undefined) {
        updateFields.push(`title = $${valueIndex++}`);
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        updateValues.push(description || null);
      }
      // Status updates are NOT allowed for mentors/admins - only candidates can update status
      if (status !== undefined) {
        return res.status(403).json({ error: "ONLY_CANDIDATES_CAN_UPDATE_TASK_STATUS" });
      }
      if (jobId !== undefined) {
        updateFields.push(`job_id = $${valueIndex++}`);
        updateValues.push(jobId || null);
      }
      if (skillName !== undefined) {
        updateFields.push(`skill_name = $${valueIndex++}`);
        updateValues.push(skillName || null);
      }
      if (dueDate !== undefined) {
        updateFields.push(`due_date = $${valueIndex++}`);
        updateValues.push(dueDate || null);
      }
    } else if (isCandidate && isAssignedTo) {
      // Candidate can only update status
      if (status !== undefined) {
        if (!["pending", "in_progress", "completed"].includes(status)) {
          return res.status(400).json({ error: "INVALID_STATUS" });
        }
        updateFields.push(`status = $${valueIndex++}`);
        updateValues.push(status);
      } else {
        return res.status(403).json({ error: "CANDIDATES_CAN_ONLY_UPDATE_STATUS" });
      }
    } else {
      return res.status(403).json({ error: "NO_PERMISSION_TO_UPDATE_TASK" });
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });
    }

    updateValues.push(taskId, teamId);
    const updateQuery = `
      UPDATE tasks
      SET ${updateFields.join(", ")}
      WHERE id = $${valueIndex++} AND team_id = $${valueIndex++}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);
    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error("Update task failed:", err);
    res.status(500).json({ error: "UPDATE_TASK_FAILED" });
  }
});

// DELETE /api/team/:teamId/tasks/:taskId - Delete task (mentor/admin only)
router.delete("/:teamId/tasks/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const taskId = parseInt(req.params.taskId);

    if (isNaN(teamId) || isNaN(taskId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Check if task exists and user has permission to delete
    const taskResult = await pool.query(
      "SELECT mentor_id FROM tasks WHERE id = $1 AND team_id = $2",
      [taskId, teamId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "TASK_NOT_FOUND" });
    }

    const task = taskResult.rows[0];
    const isAdmin = ADMIN_ROLES.has(membership.role);
    const isCreator = task.mentor_id === userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: "NO_PERMISSION_TO_DELETE_TASK" });
    }

    await pool.query("DELETE FROM tasks WHERE id = $1 AND team_id = $2", [taskId, teamId]);

    res.json({ message: "TASK_DELETED" });
  } catch (err) {
    console.error("Delete task failed:", err);
    res.status(500).json({ error: "DELETE_TASK_FAILED" });
  }
});

// GET /api/team/:teamId/activity - Get team-wide activity feed (mentor/admin only)
router.get("/:teamId/activity", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors and admins can view activity feed
    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_VIEW_ACTIVITY" });
    }

    // Get all candidates in the team
    const membersResult = await pool.query(
      `SELECT tm.user_id, u.email, 
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
       ORDER BY name`,
      [teamId]
    );

    const candidateIds = membersResult.rows.map((m) => m.user_id);
    const candidateMap = new Map(membersResult.rows.map((m) => [m.user_id, m]));

    if (candidateIds.length === 0) {
      return res.json({
        activities: [],
        summary: {
          totalCandidates: 0,
          candidatesNeedingAttention: 0,
          recentApplications: 0,
          upcomingDeadlines: 0,
        },
      });
    }

    const candidateIdsArray = candidateIds;

    // Get recent job applications (last 30 days)
    const jobsResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT j.id, j.title, j.company, j.status, j.deadline, j.created_at, j.status_updated_at,
              j.user_id, j."applicationDate",
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY j.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get task completions (last 30 days)
    const tasksResult = await pool.query(
      `SELECT t.id, t.title, t.status, t.updated_at, t.due_date,
              t.candidate_id, t.mentor_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM tasks t
       JOIN users u ON t.candidate_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE t.team_id = $1
         AND t.status = 'completed'
         AND t.updated_at >= NOW() - INTERVAL '30 days'
       ORDER BY t.updated_at DESC
       LIMIT 50`,
      [teamId]
    );

    // Get job status changes (last 30 days)
    const statusChangesResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT j.id AS job_id, j.title, j.company, j.status, j.status_updated_at,
              j.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.status_updated_at >= NOW() - INTERVAL '30 days'
         AND j.status_updated_at IS NOT NULL
       ORDER BY j.status_updated_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get upcoming deadlines (next 30 days)
    const deadlinesResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT j.id, j.title, j.company, j.deadline, j.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.deadline IS NOT NULL
         AND j.deadline >= CURRENT_DATE
         AND j.deadline <= CURRENT_DATE + INTERVAL '30 days'
         AND j.status NOT IN ('Rejected', 'Offer', 'Accepted')
       ORDER BY j.deadline ASC
       LIMIT 20`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get candidates needing attention (overdue tasks or pending tasks > 7 days)
    const attentionTasksResult = await pool.query(
      `SELECT DISTINCT t.candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM tasks t
       JOIN users u ON t.candidate_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE t.team_id = $1
         AND t.status != 'completed'
         AND (
           (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) OR
           (t.created_at < NOW() - INTERVAL '7 days' AND t.status = 'pending')
         )`,
      [teamId]
    );

    // Get candidates with overdue or upcoming (within 3 days) job deadlines
    const attentionJobsResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT DISTINCT j.user_id AS candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.deadline IS NOT NULL
         AND j.deadline >= CURRENT_DATE
         AND j.deadline <= CURRENT_DATE + INTERVAL '3 days'
         AND j.status NOT IN ('Rejected', 'Offer', 'Accepted')
       UNION
       SELECT DISTINCT j.user_id AS candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.deadline IS NOT NULL
         AND j.deadline < CURRENT_DATE
         AND j.status NOT IN ('Rejected', 'Offer', 'Accepted')`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Combine attention candidates (deduplicate)
    const attentionMap = new Map();
    [...attentionTasksResult.rows, ...attentionJobsResult.rows].forEach((row) => {
      if (!attentionMap.has(row.candidate_id)) {
        attentionMap.set(row.candidate_id, row);
      }
    });
    const attentionResult = { rows: Array.from(attentionMap.values()) };

    // Combine and format activities
    const activities = [];

    // Add job applications
    jobsResult.rows.forEach((job) => {
      activities.push({
        type: "job_application",
        id: `job-${job.id}`,
        timestamp: job.created_at,
        candidateId: job.user_id,
        candidateName: job.candidate_name,
        title: `New job application: ${job.title} at ${job.company}`,
        details: {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          status: job.status,
          applicationDate: job.applicationDate,
        },
      });
    });

    // Add task completions
    tasksResult.rows.forEach((task) => {
      activities.push({
        type: "task_completion",
        id: `task-${task.id}`,
        timestamp: task.updated_at,
        candidateId: task.candidate_id,
        candidateName: task.candidate_name,
        title: `Task completed: ${task.title}`,
        details: {
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.due_date,
        },
      });
    });

    // Add status changes
    statusChangesResult.rows.forEach((job) => {
      activities.push({
        type: "status_change",
        id: `status-${job.job_id}-${job.status_updated_at}`,
        timestamp: job.status_updated_at,
        candidateId: job.user_id,
        candidateName: job.candidate_name,
        title: `Status changed: ${job.title} at ${job.company} → ${job.status}`,
        details: {
          jobId: job.job_id,
          jobTitle: job.title,
          company: job.company,
          status: job.status,
        },
      });
    });

    // Get profile updates - New skills added (last 30 days)
    const skillsResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT s.id, s.name, s.category, s.proficiency, s.created_at, s.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM skills s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE s.user_id = ANY($1)
         AND s.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get profile updates - New employment entries added (last 30 days)
    const employmentResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT e.id, e.title, e.company, e.location, e.created_at, e.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM employment e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE e.user_id = ANY($1)
         AND e.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get profile updates - New education entries added (last 30 days)
    const educationResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT ed.id, ed.institution, ed.degree_type, ed.field_of_study, ed.created_at, ed.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM education ed
       JOIN users u ON ed.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE ed.user_id = ANY($1)
         AND ed.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY ed.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get profile updates - New projects added (last 30 days)
    const projectsResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT pr.id, pr.name, pr.description, pr.created_at, pr.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM projects pr
       JOIN users u ON pr.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE pr.user_id = ANY($1)
         AND pr.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY pr.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Get profile updates - New certifications added (last 30 days)
    const certificationsResult = candidateIdsArray.length > 0 ? await pool.query(
      `SELECT c.id, c.name, c.organization, c.created_at, c.user_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name
       FROM certifications c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE c.user_id = ANY($1)
         AND c.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Add profile updates - Skills
    skillsResult.rows.forEach((skill) => {
      activities.push({
        type: "profile_update",
        id: `skill-${skill.id}`,
        timestamp: skill.created_at,
        candidateId: skill.user_id,
        candidateName: skill.candidate_name,
        title: `Added skill: ${skill.name} (${skill.proficiency})`,
        details: {
          updateType: "skill",
          skillId: skill.id,
          skillName: skill.name,
          category: skill.category,
          proficiency: skill.proficiency,
        },
      });
    });

    // Add profile updates - Employment
    employmentResult.rows.forEach((emp) => {
      activities.push({
        type: "profile_update",
        id: `employment-${emp.id}`,
        timestamp: emp.created_at,
        candidateId: emp.user_id,
        candidateName: emp.candidate_name,
        title: `Added employment: ${emp.title} at ${emp.company}`,
        details: {
          updateType: "employment",
          employmentId: emp.id,
          title: emp.title,
          company: emp.company,
          location: emp.location,
        },
      });
    });

    // Add profile updates - Education
    educationResult.rows.forEach((edu) => {
      activities.push({
        type: "profile_update",
        id: `education-${edu.id}`,
        timestamp: edu.created_at,
        candidateId: edu.user_id,
        candidateName: edu.candidate_name,
        title: `Added education: ${edu.degree_type} in ${edu.field_of_study} at ${edu.institution}`,
        details: {
          updateType: "education",
          educationId: edu.id,
          institution: edu.institution,
          degreeType: edu.degree_type,
          fieldOfStudy: edu.field_of_study,
        },
      });
    });

    // Add profile updates - Projects
    projectsResult.rows.forEach((project) => {
      activities.push({
        type: "profile_update",
        id: `project-${project.id}`,
        timestamp: project.created_at,
        candidateId: project.user_id,
        candidateName: project.candidate_name,
        title: `Added project: ${project.name}`,
        details: {
          updateType: "project",
          projectId: project.id,
          projectName: project.name,
        },
      });
    });

    // Add profile updates - Certifications
    certificationsResult.rows.forEach((cert) => {
      activities.push({
        type: "profile_update",
        id: `certification-${cert.id}`,
        timestamp: cert.created_at,
        candidateId: cert.user_id,
        candidateName: cert.candidate_name,
        title: `Added certification: ${cert.name} from ${cert.organization}`,
        details: {
          updateType: "certification",
          certificationId: cert.id,
          certificationName: cert.name,
          organization: cert.organization,
        },
      });
    });

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get summary statistics
    const totalCandidates = candidateIds.length;
    const candidatesNeedingAttention = new Set(attentionResult.rows.map((r) => r.candidate_id)).size;
    const recentApplications = jobsResult.rows.length;
    const upcomingDeadlines = deadlinesResult.rows.length;

    res.json({
      activities: activities.slice(0, 100), // Limit to 100 most recent activities
      summary: {
        totalCandidates,
        candidatesNeedingAttention,
        recentApplications,
        upcomingDeadlines,
      },
      upcomingDeadlines: deadlinesResult.rows.map((j) => ({
        jobId: j.id,
        title: j.title,
        company: j.company,
        deadline: j.deadline,
        candidateId: j.user_id,
        candidateName: j.candidate_name,
      })),
      candidatesNeedingAttention: attentionResult.rows.map((r) => ({
        candidateId: r.candidate_id,
        candidateName: r.candidate_name,
      })),
    });
  } catch (err) {
    console.error("Get activity feed failed:", err);
    res.status(500).json({ error: "ACTIVITY_FEED_FAILED" });
  }
});

// ============================================================
// JOB SHARING ROUTES
// ============================================================

// POST /api/team/:teamId/shared-jobs - Share a job with the team (mentor only)
router.post("/:teamId/shared-jobs", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const { jobId, comments } = req.body;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    if (!jobId) {
      return res.status(400).json({ error: "JOB_ID_REQUIRED" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors/admins can share jobs
    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_SHARE_JOBS" });
    }

    // Verify the job belongs to the mentor
    const jobResult = await pool.query(
      "SELECT id, title, company FROM jobs WHERE id = $1 AND user_id = $2",
      [jobId, userId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "JOB_NOT_FOUND_OR_NOT_OWNED" });
    }

    // Check if job is already shared in this team
    const existingResult = await pool.query(
      "SELECT id FROM shared_jobs WHERE team_id = $1 AND job_id = $2",
      [teamId, jobId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "JOB_ALREADY_SHARED" });
    }

    // Share the job
    const result = await pool.query(
      `INSERT INTO shared_jobs (team_id, job_id, shared_by_mentor_id, comments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teamId, jobId, userId, comments || null]
    );

    res.status(201).json({
      sharedJob: result.rows[0],
      message: "Job shared successfully",
    });
  } catch (err) {
    console.error("Share job failed:", err);
    res.status(500).json({ error: "SHARE_JOB_FAILED" });
  }
});

// GET /api/team/:teamId/shared-jobs - Get all shared jobs (role-based visibility)
router.get("/:teamId/shared-jobs", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Fetch shared jobs with full job details and mentor info
    const result = await pool.query(
      `
      SELECT 
        sj.id AS shared_job_id,
        sj.comments,
        sj.created_at AS shared_at,
        sj.updated_at,
        j.id AS job_id,
        j.title,
        j.company,
        j.location,
        j.salary_min,
        j.salary_max,
        j.url,
        j.deadline,
        j.description,
        j.industry,
        j.type,
        j.required_skills,
        j.status,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
          u_prof.full_name,
          u.email,
          'Unknown'
        ) AS mentor_name,
        u.email AS mentor_email
      FROM shared_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      JOIN users u ON sj.shared_by_mentor_id = u.id
      LEFT JOIN profiles u_prof ON sj.shared_by_mentor_id = u_prof.user_id
      WHERE sj.team_id = $1
      ORDER BY sj.created_at DESC
      `,
      [teamId]
    );

    // For candidates, check which jobs they've already exported
    const exportedJobs = membership.role === "candidate"
      ? await pool.query(
          `SELECT shared_job_id FROM shared_job_exports WHERE candidate_id = $1`,
          [userId]
        )
      : { rows: [] };

    const exportedJobIds = new Set(exportedJobs.rows.map((row) => row.shared_job_id));

    // For mentors/admins, get export counts
    const sharedJobIds = result.rows.map((row) => row.shared_job_id);
    const exportCounts =
      MANAGER_ROLES.has(membership.role) && sharedJobIds.length > 0
        ? await pool.query(
            `SELECT shared_job_id, COUNT(*) as export_count
             FROM shared_job_exports
             WHERE shared_job_id = ANY($1)
             GROUP BY shared_job_id`,
            [sharedJobIds]
          )
        : { rows: [] };

    const exportCountMap = new Map(
      exportCounts.rows.map((row) => [row.shared_job_id, parseInt(row.export_count)])
    );

    const sharedJobs = result.rows.map((row) => ({
      id: row.shared_job_id,
      jobId: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      url: row.url,
      deadline: row.deadline,
      description: row.description,
      industry: row.industry,
      type: row.type,
      requiredSkills: row.required_skills || [],
      status: row.status,
      comments: row.comments,
      sharedAt: row.shared_at,
      mentorName: row.mentor_name,
      mentorEmail: row.mentor_email,
      isExported: exportedJobIds.has(row.shared_job_id),
      exportCount: exportCountMap.get(row.shared_job_id) || 0,
    }));

    res.json({ sharedJobs });
  } catch (err) {
    console.error("Get shared jobs failed:", err);
    res.status(500).json({ error: "GET_SHARED_JOBS_FAILED" });
  }
});

// POST /api/team/:teamId/shared-jobs/:sharedJobId/comments - Add/update comments (mentor only)
router.post("/:teamId/shared-jobs/:sharedJobId/comments", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const sharedJobId = parseInt(req.params.sharedJobId);
    const { comments } = req.body;

    if (isNaN(teamId) || isNaN(sharedJobId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors/admins can update comments
    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_UPDATE_COMMENTS" });
    }

    // Verify the shared job exists and belongs to this mentor (or admin can update any)
    const sharedJobResult = await pool.query(
      `SELECT shared_by_mentor_id FROM shared_jobs WHERE id = $1 AND team_id = $2`,
      [sharedJobId, teamId]
    );

    if (sharedJobResult.rows.length === 0) {
      return res.status(404).json({ error: "SHARED_JOB_NOT_FOUND" });
    }

    const isAdmin = ADMIN_ROLES.has(membership.role);
    const isOwner = sharedJobResult.rows[0].shared_by_mentor_id === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "CAN_ONLY_UPDATE_OWN_SHARED_JOB_COMMENTS" });
    }

    // Update comments
    const result = await pool.query(
      `UPDATE shared_jobs SET comments = $1 WHERE id = $2 AND team_id = $3 RETURNING *`,
      [comments || null, sharedJobId, teamId]
    );

    res.json({
      sharedJob: result.rows[0],
      message: "Comments updated successfully",
    });
  } catch (err) {
    console.error("Update shared job comments failed:", err);
    res.status(500).json({ error: "UPDATE_COMMENTS_FAILED" });
  }
});

// POST /api/team/:teamId/shared-jobs/:sharedJobId/export - Export shared job to candidate's pipeline
router.post("/:teamId/shared-jobs/:sharedJobId/export", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const sharedJobId = parseInt(req.params.sharedJobId);

    if (isNaN(teamId) || isNaN(sharedJobId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only candidates can export jobs
    if (membership.role !== "candidate") {
      return res.status(403).json({ error: "ONLY_CANDIDATES_CAN_EXPORT_JOBS" });
    }

    // Verify the shared job exists in this team
    const sharedJobResult = await pool.query(
      `
      SELECT sj.id, sj.job_id, j.*
      FROM shared_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      WHERE sj.id = $1 AND sj.team_id = $2
      `,
      [sharedJobId, teamId]
    );

    if (sharedJobResult.rows.length === 0) {
      return res.status(404).json({ error: "SHARED_JOB_NOT_FOUND" });
    }

    const originalJob = sharedJobResult.rows[0];

    // Check if already exported
    const existingExport = await pool.query(
      `SELECT id FROM shared_job_exports WHERE shared_job_id = $1 AND candidate_id = $2`,
      [sharedJobId, userId]
    );

    if (existingExport.rows.length > 0) {
      return res.status(409).json({ error: "JOB_ALREADY_EXPORTED" });
    }

    // Create the job in candidate's pipeline (status = 'Interested')
    const newJobResult = await pool.query(
      `
      INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type,
        required_skills, status, status_updated_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Interested', NOW(), NOW())
      RETURNING *
      `,
      [
        userId,
        originalJob.title,
        originalJob.company,
        originalJob.location,
        originalJob.salary_min,
        originalJob.salary_max,
        originalJob.url,
        originalJob.deadline,
        originalJob.description,
        originalJob.industry,
        originalJob.type,
        originalJob.required_skills || [],
      ]
    );

    const newJob = newJobResult.rows[0];

    // Record the export
    await pool.query(
      `INSERT INTO shared_job_exports (shared_job_id, candidate_id, exported_job_id)
       VALUES ($1, $2, $3)`,
      [sharedJobId, userId, newJob.id]
    );

    res.status(201).json({
      job: newJob,
      message: "Job exported to your pipeline successfully",
    });
  } catch (err) {
    console.error("Export shared job failed:", err);
    res.status(500).json({ error: "EXPORT_JOB_FAILED" });
  }
});

// GET /api/team/:teamId/shared-jobs/progress - Get mentee progress dashboard (mentor/admin only)
router.get("/:teamId/shared-jobs/progress", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors/admins can view progress
    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_VIEW_PROGRESS" });
    }

    // Get all shared jobs with export details
    const progressResult = await pool.query(
      `
      SELECT 
        sj.id AS shared_job_id,
        j.id AS job_id,
        j.title,
        j.company,
        sj.created_at AS shared_at,
        COUNT(sje.id) AS export_count,
        ARRAY_AGG(
          json_build_object(
            'candidateId', sje.candidate_id,
            'candidateName', COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
              u_prof.full_name,
              u.email,
              'Unknown'
            ),
            'exportedAt', sje.exported_at,
            'exportedJobId', sje.exported_job_id,
            'exportedJobStatus', ej.status
          )
        ) FILTER (WHERE sje.id IS NOT NULL) AS exports
      FROM shared_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      LEFT JOIN shared_job_exports sje ON sj.id = sje.shared_job_id
      LEFT JOIN users u ON sje.candidate_id = u.id
      LEFT JOIN profiles u_prof ON sje.candidate_id = u_prof.user_id
      LEFT JOIN jobs ej ON sje.exported_job_id = ej.id
      WHERE sj.team_id = $1
      GROUP BY sj.id, j.id, j.title, j.company, sj.created_at
      ORDER BY sj.created_at DESC
      `,
      [teamId]
    );

    // Get candidate list for the team
    const candidatesResult = await pool.query(
      `SELECT tm.user_id,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
                u_prof.full_name,
                u.email,
                'Unknown'
              ) AS candidate_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN profiles u_prof ON tm.user_id = u_prof.user_id
       WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
       ORDER BY candidate_name`,
      [teamId]
    );

    const progress = progressResult.rows.map((row) => ({
      sharedJobId: row.shared_job_id,
      jobId: row.job_id,
      title: row.title,
      company: row.company,
      sharedAt: row.shared_at,
      exportCount: parseInt(row.export_count) || 0,
      exports: (row.exports && Array.isArray(row.exports)) ? row.exports.filter((e) => e.candidateId) : [],
    }));

    res.json({
      progress,
      candidates: candidatesResult.rows.map((c) => ({
        candidateId: c.user_id,
        candidateName: c.candidate_name,
      })),
    });
  } catch (err) {
    console.error("Get shared jobs progress failed:", err);
    res.status(500).json({ error: "GET_PROGRESS_FAILED" });
  }
});

export default router;
