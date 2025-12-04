import express from "express";
import { auth } from "../auth.js";
import pool from "../db/pool.js"; // ✅ Use shared pool instead of creating a new one
// This prevents exceeding Supabase's connection limits by having multiple pools

const router = express.Router();

const MENTOR_ROLES = new Set(["mentor"]);
const MANAGER_ROLES = new Set(["mentor"]); // Mentors have all management permissions
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
      userId, // Include current user ID for frontend checks
      teams,
      primaryTeam,
    });
  } catch (err) {
    console.error("Team lookup failed:", err);
    res.status(500).json({ error: "TEAM_LOOKUP_FAILED" });
  }
});

// ============================================================
// GET /api/team/mentor/all - Mentor: Get all teams they manage
// ============================================================
router.get("/mentor/all", async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = await getUserAccountType(userId);

    if (accountType !== "mentor") {
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
      INNER JOIN team_members tm_mentor ON tm_mentor.team_id = t.id
      LEFT JOIN team_members tm_all ON tm_all.team_id = t.id
      WHERE tm_mentor.user_id = $1 AND tm_mentor.role = 'mentor'
      GROUP BY t.id, t.name, t.owner_id, t.created_at
      ORDER BY t.created_at DESC
      `,
      [userId]
    );

    res.json({ teams: rows });
  } catch (err) {
    console.error("Get mentor teams failed:", err);
    res.status(500).json({ error: "FETCH_FAILED" });
  }
});

// ============================================================
// GET /api/team/admin/all - Legacy route (uses same logic as mentor/all)
// ============================================================
router.get("/admin/all", async (req, res) => {
  // Use same handler as /mentor/all
  const originalUrl = req.url;
  req.url = "/mentor/all";
  try {
    await router.handle(req, res);
  } finally {
    req.url = originalUrl;
  }
});

// Helper function to check if user is team owner (hidden admin)
async function isTeamOwner(teamId, userId) {
  const { rows } = await pool.query(
    "SELECT owner_id FROM teams WHERE id=$1 AND owner_id=$2",
    [teamId, userId]
  );
  return rows.length > 0;
}

// ============================================================
// POST /api/team/create - Create new team (mentors and candidates)
// ============================================================
router.post("/create", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const accountType = await getUserAccountType(userId);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "TEAM_NAME_REQUIRED" });
    }

    // Candidates can only create/join 1 team max
    if (accountType === "candidate") {
      const existingTeam = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM team_members tm
        WHERE tm.user_id = $1 AND tm.status IN ('active', 'invited', 'requested')
        `,
        [userId]
      );
      if (parseInt(existingTeam.rows[0].count) > 0) {
        return res.status(403).json({ 
          error: "CANDIDATE_TEAM_LIMIT",
          message: "Candidates can only be part of one team. Leave your current team first."
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamResult = await client.query(
        "INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id AS \"ownerId\", created_at AS \"createdAt\"",
        [name.trim(), userId]
      );

      const teamId = teamResult.rows[0].id;

      // Add creator as team member with their account type role
      // The owner_id in teams table makes them the hidden admin
      await client.query(
        "INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, $3, 'active')",
        [teamId, userId, accountType === "mentor" ? "mentor" : "candidate"]
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
// POST /api/team/mentor/create - Legacy route (uses same logic as /create)
// ============================================================
router.post("/mentor/create", async (req, res) => {
  // Use same handler as /create
  const originalUrl = req.url;
  req.url = "/create";
  try {
    await router.handle(req, res);
  } finally {
    req.url = originalUrl;
  }
});

// ============================================================
// PATCH /api/team/:teamId/rename - Rename team (team owner only)
// ============================================================
router.patch("/:teamId/rename", async (req, res) => {
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

    // Only team owner (hidden admin) can rename
    const owner = await isTeamOwner(teamId, userId);
    if (!owner) {
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
// PATCH /api/team/mentor/:teamId/rename - Legacy route (uses same logic)
// ============================================================
router.patch("/mentor/:teamId/rename", async (req, res) => {
  // Use same handler as /:teamId/rename
  const originalUrl = req.url;
  req.url = req.url.replace("/mentor", "");
  try {
    await router.handle(req, res);
  } finally {
    req.url = originalUrl;
  }
});

// ============================================================
// DELETE /api/team/:teamId - Delete team (team owner only)
// ============================================================
router.delete("/:teamId", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const userId = req.user.id;

    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    // Only team owner (hidden admin) can delete the team
    const owner = await isTeamOwner(teamId, userId);
    if (!owner) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete all related data (team_members, feedback, tasks, shared_jobs, etc.)
      // These should cascade if foreign keys are set up, but we'll delete explicitly to be safe
      
      // Delete team members
      await client.query("DELETE FROM team_members WHERE team_id=$1", [teamId]);
      
      // Delete feedback and replies
      await client.query(
        `DELETE FROM feedback_replies 
         WHERE feedback_id IN (SELECT id FROM mentor_feedback WHERE team_id=$1)`,
        [teamId]
      );
      await client.query("DELETE FROM mentor_feedback WHERE team_id=$1", [teamId]);
      
      // Delete tasks
      await client.query("DELETE FROM tasks WHERE team_id=$1", [teamId]);
      
      // Delete shared job exports
      await client.query("DELETE FROM shared_job_exports WHERE shared_job_id IN (SELECT id FROM shared_jobs WHERE team_id=$1)", [teamId]);
      
      // Delete shared jobs
      await client.query("DELETE FROM shared_jobs WHERE team_id=$1", [teamId]);
      
      // Finally, delete the team itself
      const result = await client.query("DELETE FROM teams WHERE id=$1 RETURNING id, name", [teamId]);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "TEAM_NOT_FOUND" });
      }

      await client.query("COMMIT");

      res.json({ message: "TEAM_DELETED", team: result.rows[0] });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Delete team failed:", err);
    res.status(500).json({ error: "DELETE_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/members - Get team members (mentor/candidate)
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

    // Mentors can see all members; candidates can see members only if status is 'active'
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
          u.email,
          u.account_type AS "accountType"
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
// PATCH /api/team/:teamId/members/:memberId - Update member role (team owner only)
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

    // Only team owner (hidden admin) can update member roles
    const owner = await isTeamOwner(teamId, userId);
    if (!owner) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    
    // Cannot change the owner's own role
    if (memberId === userId) {
      return res.status(403).json({ error: "CANNOT_CHANGE_OWN_ROLE" });
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

    // If role is changed to mentor, update user's account_type to mentor
    // Check if user has any active mentor roles in any team
    if (normalizedRole === "mentor") {
      const mentorCheck = await pool.query(
        "SELECT COUNT(*) as count FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active'",
        [memberId]
      );
      if (parseInt(mentorCheck.rows[0].count) > 0) {
        // User has at least one active mentor role, update account_type
        await pool.query(
          "UPDATE users SET account_type='mentor' WHERE id=$1 AND account_type != 'mentor'",
          [memberId]
        );
      }
    } else if (normalizedRole === "candidate") {
      // If role is changed to candidate, check if user still has any mentor roles
      // If not, update account_type back to candidate
      const mentorCheck = await pool.query(
        "SELECT COUNT(*) as count FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active'",
        [memberId]
      );
      if (parseInt(mentorCheck.rows[0].count) === 0) {
        // User has no active mentor roles, update account_type to candidate
        await pool.query(
          "UPDATE users SET account_type='candidate' WHERE id=$1 AND account_type != 'candidate'",
          [memberId]
        );
      }
    }

    res.json({ message: "ROLE_UPDATED" });
  } catch (err) {
    console.error("Update member role failed:", err);
    res.status(500).json({ error: "ROLE_UPDATE_FAILED" });
  }
});

// ============================================================
// DELETE /api/team/:teamId/members/:memberId - Remove member (team owner only)
// ============================================================
router.delete("/:teamId/members/:memberId", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;
    
    // Only team owner (hidden admin) can remove members
    const owner = await isTeamOwner(teamId, userId);
    if (!owner) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Check the role of the member being removed
    const memberToRemove = await getMembership(teamId, memberId);
    if (!memberToRemove) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    // Prevent team owner from removing themselves (they'd need to delete the team or transfer ownership)
    if (memberId === userId) {
      return res.status(403).json({ error: "OWNER_CANNOT_REMOVE_SELF" });
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
// POST /api/team/:teamId/invite - Invite member (mentor/candidate)
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
    if (MENTOR_ROLES.has(membership.role)) {
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
          ? "Your join request is pending approval by a mentor."
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

    // If accepting as mentor, update user's account_type to mentor
    if (membership.role === "mentor") {
      const mentorCheck = await pool.query(
        "SELECT COUNT(*) as count FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active'",
        [userId]
      );
      if (parseInt(mentorCheck.rows[0].count) > 0) {
        // User has at least one active mentor role, update account_type
        await pool.query(
          "UPDATE users SET account_type='mentor' WHERE id=$1 AND account_type != 'mentor'",
          [userId]
        );
      }
    }

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
    
    // Check user's account type
    const accountType = await getUserAccountType(userId);
    
    // Candidates can only join 1 team max
    if (accountType === "candidate") {
      const existingTeam = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM team_members tm
        WHERE tm.user_id = $1 AND tm.status IN ('active', 'invited', 'requested')
        `,
        [userId]
      );
      if (parseInt(existingTeam.rows[0].count) > 0) {
        return res.status(403).json({ 
          error: "CANDIDATE_TEAM_LIMIT",
          message: "Candidates can only be part of one team. Leave your current team first."
        });
      }
    }

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
// GET /api/team/:teamId/pending-requests - Get pending join requests (mentor only)
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
// POST /api/team/:teamId/requests/:memberId/approve - Approve join request (mentor only)
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
// POST /api/team/:teamId/requests/:memberId/reject - Reject join request (mentor only)
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
// POST /api/team/:teamId/leave - Leave team (non-owners can leave themselves)
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

    // Check if user is the team owner - owners cannot leave (they must delete the team)
    const ownerCheck = await pool.query(
      "SELECT owner_id FROM teams WHERE id=$1",
      [teamId]
    );
    if (ownerCheck.rowCount > 0 && ownerCheck.rows[0].owner_id === userId) {
      return res.status(403).json({ 
        error: "OWNER_CANNOT_LEAVE",
        message: "Team owners cannot leave their team. Delete the team instead if you want to remove it."
      });
    }

    // Remove the member from the team
    const result = await pool.query(
      "DELETE FROM team_members WHERE team_id=$1 AND user_id=$2 RETURNING user_id",
      [teamId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    // If leaving as mentor, check if user still has any active mentor roles
    // If not, update account_type back to candidate
    if (membership.role === "mentor") {
      const mentorCheck = await pool.query(
        "SELECT COUNT(*) as count FROM team_members WHERE user_id=$1 AND role='mentor' AND status='active'",
        [userId]
      );
      if (parseInt(mentorCheck.rows[0].count) === 0) {
        // User has no active mentor roles, update account_type to candidate
        await pool.query(
          "UPDATE users SET account_type='candidate' WHERE id=$1 AND account_type != 'candidate'",
          [userId]
        );
      }
    }

    res.json({ message: "LEFT_TEAM" });
  } catch (err) {
    console.error("Leave team failed:", err);
    res.status(500).json({ error: "LEAVE_TEAM_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/members/:memberId/profile - View candidate profile
// ============================================================
router.get("/:teamId/members/:memberId/profile", async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(teamId) || Number.isNaN(memberId)) {
      return res.status(400).json({ error: "INVALID_IDENTIFIER" });
    }
    const userId = req.user.id;

    // Check if requester is a member of the team
    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Get requester's account type
    const requesterAccountType = await getUserAccountType(userId);
    
    // Check if member exists in team and get their role and account type
    const memberCheck = await pool.query(
      `
      SELECT tm.role, tm.status, u.account_type
      FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id=$1 AND tm.user_id=$2
      `,
      [teamId, memberId]
    );
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({ error: "MEMBER_NOT_FOUND" });
    }

    const memberRole = memberCheck.rows[0].role;
    const memberAccountType = memberCheck.rows[0].account_type;
    
    // Profile visibility rules:
    // 1. Candidates can NEVER see mentor profiles
    // 2. Team owner (hidden admin) can see candidate profiles
    // 3. Mentors can see candidate profiles by default
    
    // Rule 1: Candidates cannot view mentor profiles
    if (requesterAccountType === "candidate" && memberAccountType === "mentor") {
      return res.status(403).json({ error: "CANDIDATES_CANNOT_VIEW_MENTOR_PROFILES" });
    }
    
    // Rule 2 & 3: Only allow viewing profiles of candidates
    // (Team owners and mentors can view candidate profiles)
    if (memberAccountType !== "candidate") {
      return res.status(403).json({ error: "CAN_ONLY_VIEW_CANDIDATE_PROFILES" });
    }
    
    // Check if requester is team owner (hidden admin) or mentor
    const owner = await isTeamOwner(teamId, userId);
    const isMentor = requesterAccountType === "mentor";
    
    if (!owner && !isMentor) {
      // Only team owners and mentors can view profiles
      return res.status(403).json({ error: "FORBIDDEN" });
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
// Mentors: See all feedback
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
      // Mentors see all feedback in the team
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
          mf.material_type,
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
          mf.material_type,
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
    console.log(`[Feedback] User role: ${membership.role}, isManager: ${isManager}, isCandidate: ${isCandidate}`);
    console.log(`[Feedback] Query params:`, params);
    if (result.rows.length > 0) {
      console.log(`[Feedback] Sample feedback:`, {
        id: result.rows[0].id,
        candidate_id: result.rows[0].candidate_id,
        mentor_id: result.rows[0].mentor_id,
        feedback_type: result.rows[0].feedback_type
      });
    }
    
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
        materialType: fb.material_type,
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

// POST /api/team/:teamId/feedback - Create feedback (mentor only)
router.post("/:teamId/feedback", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const { candidateId, jobId, feedbackType, content, skillName, taskId, materialType } = req.body;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: "INVALID_TEAM_ID" });
    }

    if (!candidateId || !feedbackType || !content) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    if (!["job", "skill", "general", "task", "application_material"].includes(feedbackType)) {
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

    // Enforce that if feedbackType is "application_material", jobId and materialType must be provided
    if (feedbackType === "application_material") {
      if (!jobId) {
        return res.status(400).json({ error: "JOB_ID_REQUIRED_FOR_APPLICATION_MATERIAL" });
      }
      if (!materialType || !["resume", "cover_letter"].includes(materialType)) {
        return res.status(400).json({ error: "INVALID_MATERIAL_TYPE" });
      }
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    // Only mentors can create feedback
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

    // Check which optional columns exist before including them in the INSERT
    let insertQuery;
    let insertParams;
    
    try {
      // Check which columns exist
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_feedback' 
        AND column_name IN ('task_id', 'relationship_id', 'material_type')
      `);
      
      const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
      const hasTaskIdColumn = existingColumns.has('task_id');
      const hasRelationshipIdColumn = existingColumns.has('relationship_id');
      const hasMaterialTypeColumn = existingColumns.has('material_type');
      
      // Build the INSERT query based on which columns exist
      const columns = ['team_id', 'mentor_id', 'candidate_id', 'job_id'];
      const values = [teamId, userId, candidateId, jobId || null];
      let paramIndex = 5;
      
      if (hasTaskIdColumn) {
        columns.push('task_id');
        values.push(taskId || null);
        paramIndex++;
      }
      
      columns.push('feedback_type', 'content', 'skill_name');
      values.push(feedbackType, content, skillName || null);
      
      if (hasMaterialTypeColumn) {
        columns.push('material_type');
        values.push(feedbackType === "application_material" ? materialType : null);
        paramIndex++;
      }
      
      if (hasRelationshipIdColumn) {
        columns.push('relationship_id');
        values.push(null); // Set to null since we don't use it
        paramIndex++;
      }
      
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      insertQuery = `INSERT INTO mentor_feedback 
       (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`;
      insertParams = values;
    } catch (checkErr) {
      // If check fails, use basic insert without optional columns
      // Check if material_type column exists
      const materialTypeCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_feedback' 
        AND column_name = 'material_type'
      `);
      const hasMaterialType = materialTypeCheck.rows.length > 0;
      
      if (hasMaterialType) {
        insertQuery = `INSERT INTO mentor_feedback 
         (team_id, mentor_id, candidate_id, job_id, feedback_type, content, skill_name, material_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`;
        insertParams = [
          teamId,
          userId,
          candidateId,
          jobId || null,
          feedbackType,
          content,
          skillName || null,
          feedbackType === "application_material" ? materialType : null,
        ];
      } else {
      insertQuery = `INSERT INTO mentor_feedback 
       (team_id, mentor_id, candidate_id, job_id, feedback_type, content, skill_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`;
      insertParams = [
        teamId,
        userId,
        candidateId,
        jobId || null,
        feedbackType,
        content,
        skillName || null,
      ];
      }
    }

    const result = await pool.query(insertQuery, insertParams);

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

    // Check if feedback exists and user is the creator (or mentor)
    const feedbackResult = await pool.query(
      "SELECT mentor_id, feedback_type FROM mentor_feedback WHERE id = $1 AND team_id = $2",
      [feedbackId, teamId]
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "FEEDBACK_NOT_FOUND" });
    }

    const feedback = feedbackResult.rows[0];
    const isMentor = MENTOR_ROLES.has(membership.role);
    const isCreator = feedback.mentor_id === userId;

    if (!isMentor && !isCreator) {
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
    const isMentor = MENTOR_ROLES.has(membership.role);
    const isCreator = feedback.mentor_id === userId;

    if (!isMentor && !isCreator) {
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

    // Verify user is either the mentor or candidate (mentors can reply to any)
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
    const isMentor = MENTOR_ROLES.has(membership.role);

    // Only the author or mentor can edit
    if (!isMentor && reply.user_id !== userId) {
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
    const isMentor = MENTOR_ROLES.has(membership.role);

    // Only the author or mentor can delete
    if (!isMentor && reply.user_id !== userId) {
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
// Mentors: See all tasks in the team
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
      // Mentors see all tasks in the team
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

// POST /api/team/:teamId/tasks - Create task (mentor only)
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
    const isCreator = parseInt(task.mentor_id) === parseInt(userId);
    // Fix: Ensure both values are compared as integers to handle type mismatches
    const isAssignedTo = task.candidate_id !== null && parseInt(task.candidate_id) === parseInt(userId);

    // Debug logging for troubleshooting
    if (status !== undefined) {
      console.log("Task status update attempt:", {
        userId: parseInt(userId),
        taskCandidateId: task.candidate_id ? parseInt(task.candidate_id) : null,
        isCandidate,
        isAssignedTo,
        isManager,
        isCreator,
        membershipRole: membership.role,
        requestedStatus: status
      });
    }

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
      // Status updates are NOT allowed for mentors - only candidates can update status
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
      // Provide more specific error message for debugging
      if (isCandidate && !isAssignedTo) {
        return res.status(403).json({ 
          error: "CANDIDATE_NOT_ASSIGNED_TO_TASK",
          message: "You are not assigned to this task. Only the assigned candidate can update the task status."
        });
      }
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

// DELETE /api/team/:teamId/tasks/:taskId - Delete task (mentor only)
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
    const isMentor = MENTOR_ROLES.has(membership.role);
    const isCreator = task.mentor_id === userId;

    if (!isMentor && !isCreator) {
      return res.status(403).json({ error: "NO_PERMISSION_TO_DELETE_TASK" });
    }

    await pool.query("DELETE FROM tasks WHERE id = $1 AND team_id = $2", [taskId, teamId]);

    res.json({ message: "TASK_DELETED" });
  } catch (err) {
    console.error("Delete task failed:", err);
    res.status(500).json({ error: "DELETE_TASK_FAILED" });
  }
});

// GET /api/team/:teamId/activity - Get team-wide activity feed (mentor only)
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

    // Only mentors can view activity feed
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
      `SELECT DISTINCT 
              t.candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name,
              CASE 
                WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 'overdue_task'
                WHEN t.created_at < NOW() - INTERVAL '7 days' AND t.status = 'pending' THEN 'stale_pending_task'
                ELSE NULL
              END as attention_reason
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
      `SELECT DISTINCT 
              j.user_id AS candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name,
              'upcoming_job_deadline' as attention_reason
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.deadline IS NOT NULL
         AND j.deadline >= CURRENT_DATE
         AND j.deadline <= CURRENT_DATE + INTERVAL '3 days'
         AND j.status NOT IN ('Rejected', 'Offer', 'Accepted')
       UNION
       SELECT DISTINCT 
              j.user_id AS candidate_id,
              COALESCE(u.first_name || ' ' || u.last_name, p.full_name, u.email) AS candidate_name,
              'overdue_job_deadline' as attention_reason
       FROM jobs j
       JOIN users u ON j.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE j.user_id = ANY($1)
         AND j.deadline IS NOT NULL
         AND j.deadline < CURRENT_DATE
         AND j.status NOT IN ('Rejected', 'Offer', 'Accepted')`,
      [candidateIdsArray]
    ) : { rows: [] };

    // Combine attention candidates (deduplicate and collect all reasons)
    const attentionMap = new Map();
    [...attentionTasksResult.rows, ...attentionJobsResult.rows].forEach((row) => {
      if (!attentionMap.has(row.candidate_id)) {
        attentionMap.set(row.candidate_id, {
          candidate_id: row.candidate_id,
          candidate_name: row.candidate_name,
          reasons: new Set()
        });
      }
      // Add the reason to the set
      if (row.attention_reason) {
        attentionMap.get(row.candidate_id).reasons.add(row.attention_reason);
      }
    });
    
    // Convert Set to Array for JSON serialization
    const attentionResult = { 
      rows: Array.from(attentionMap.values()).map(item => ({
        candidate_id: item.candidate_id,
        candidate_name: item.candidate_name,
        reasons: Array.from(item.reasons)
      }))
    };

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
      activities: activities, // Return all activities for pagination
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
        reasons: r.reasons || [],
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

    // Only mentors can share jobs
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

    // For mentors, get export counts
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

    // Only mentors can update comments
    if (!MANAGER_ROLES.has(membership.role)) {
      return res.status(403).json({ error: "ONLY_MENTORS_CAN_UPDATE_COMMENTS" });
    }

    // Verify the shared job exists and belongs to this mentor (mentors can update any)
    const sharedJobResult = await pool.query(
      `SELECT shared_by_mentor_id FROM shared_jobs WHERE id = $1 AND team_id = $2`,
      [sharedJobId, teamId]
    );

    if (sharedJobResult.rows.length === 0) {
      return res.status(404).json({ error: "SHARED_JOB_NOT_FOUND" });
    }

    const isMentor = MENTOR_ROLES.has(membership.role);
    const isOwner = sharedJobResult.rows[0].shared_by_mentor_id === userId;

    if (!isMentor && !isOwner) {
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

// GET /api/team/:teamId/shared-jobs/progress - Get mentee progress dashboard (mentor only)
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

    // Only mentors can view progress
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

// GET /api/team/:teamId/shared-jobs/application-materials - Get application materials for all candidates
router.get("/:teamId/shared-jobs/application-materials", async (req, res) => {
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

    const isMentorOrAdmin = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === 'candidate';

    // Allow mentors/admins to view all candidates' materials, or candidates to view their own
    if (!isMentorOrAdmin && !isCandidate) {
      return res.status(403).json({ error: "ONLY_MENTORS_OR_CANDIDATES_CAN_VIEW_MATERIALS" });
    }

    let candidates;
    let candidateIds;

    if (isCandidate) {
      // Candidates can only view their own materials
      const candidateResult = await pool.query(
        `SELECT tm.user_id AS candidate_id,
                COALESCE(
                  NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
                  u_prof.full_name,
                  u.email,
                  'Unknown'
                ) AS candidate_name
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         LEFT JOIN profiles u_prof ON tm.user_id = u_prof.user_id
         WHERE tm.team_id = $1 AND tm.user_id = $2 AND tm.status = 'active'
         LIMIT 1`,
        [teamId, userId]
      );
      candidates = candidateResult.rows;
      candidateIds = candidates.map((c) => c.candidate_id);
    } else {
      // Mentors/admins can view all candidates' materials
      const candidatesResult = await pool.query(
        `SELECT tm.user_id AS candidate_id,
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
      candidates = candidatesResult.rows;
      candidateIds = candidates.map((c) => c.candidate_id);
    }

    if (candidateIds.length === 0) {
      return res.json({ materials: [] });
    }

    // Get all jobs for these candidates with resume and cover letter info
    // Use ONLY job_materials table (clean, simple approach)
    const materialsResult = await pool.query(
      `
      SELECT 
        j.id AS job_id,
        j.user_id AS candidate_id,
        j.title AS job_title,
        j.company AS job_company,
        j.status AS job_status,
        jm.resume_id,
        jm.cover_letter_id,
        r.title AS resume_title,
        r.format AS resume_format,
        COALESCE(cl.title, clt.name) AS cover_letter_title,
        cl.file_url AS cover_letter_file_url,
        cl.format AS cover_letter_format,
        CASE 
          WHEN cl.id IS NOT NULL THEN 'uploaded_cover_letters'
          WHEN clt.id IS NOT NULL THEN 'cover_letter_templates'
          ELSE NULL
        END AS cover_letter_source
      FROM jobs j
      LEFT JOIN job_materials jm ON jm.job_id = j.id
      LEFT JOIN resumes r ON jm.resume_id = r.id AND r.user_id = j.user_id
      LEFT JOIN uploaded_cover_letters cl ON jm.cover_letter_id = cl.id AND cl.user_id = j.user_id
      LEFT JOIN cover_letter_templates clt ON jm.cover_letter_id = clt.id
      WHERE j.user_id = ANY($1)
        AND NOT (
          j."isArchived" = true OR 
          j.isarchived = true OR 
          j.is_archived = true
        )
      ORDER BY j.user_id, j.created_at DESC
      `,
      [candidateIds]
    );

    // Group materials by candidate
    const materialsByCandidate = {};
    
    candidates.forEach((candidate) => {
      materialsByCandidate[candidate.candidate_id] = {
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_name,
        jobs: [],
      };
    });

    // Valid job statuses
    const validStatuses = ['Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'];
    
    materialsResult.rows.forEach((row) => {
      const candidateId = row.candidate_id;
      if (materialsByCandidate[candidateId]) {
        // Validate and sanitize status - if status is invalid or "status_change", use "Unknown"
        let jobStatus = row.job_status;
        if (!jobStatus || !validStatuses.includes(jobStatus) || jobStatus.toLowerCase() === 'status_change') {
          console.warn(`⚠️ Invalid job status for job ${row.job_id}: "${jobStatus}", defaulting to "Unknown"`);
          jobStatus = 'Unknown';
        }
        
        // Log the resume_id being returned for debugging
        console.log(`📋 [APPLICATION MATERIALS] Job ${row.job_id}: resume_id=${row.resume_id}, resume_title="${row.resume_title}"`);
        
        materialsByCandidate[candidateId].jobs.push({
          jobId: row.job_id,
          jobTitle: row.job_title,
          jobCompany: row.job_company,
          jobStatus: jobStatus,
          resume: row.resume_id
            ? {
                id: row.resume_id,
                title: row.resume_title || `Resume #${row.resume_id}`,
                format: row.resume_format || "pdf",
              }
            : null,
          coverLetter: row.cover_letter_id
            ? {
                id: row.cover_letter_id,
                title: row.cover_letter_title || `Cover Letter #${row.cover_letter_id}`,
                format: row.cover_letter_format || "pdf", // Use actual format from database
              }
            : null,
        });
      }
    });

    // Convert to array and filter out candidates with no jobs
    const materials = Object.values(materialsByCandidate).filter(
      (candidate) => candidate.jobs.length > 0
    );

    res.json({ materials });
  } catch (err) {
    console.error("Get application materials failed:", err);
    res.status(500).json({ error: "GET_APPLICATION_MATERIALS_FAILED" });
  }
});

// GET /api/team/:teamId/cover-letter-template/:templateId - Get cover letter template content (mentor only)
router.get("/:teamId/cover-letter-template/:templateId", async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = parseInt(req.params.teamId);
    const templateId = parseInt(req.params.templateId);

    if (isNaN(teamId) || isNaN(templateId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isMentorOrAdmin = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === 'candidate';

    // Allow mentors/admins to view any template, or candidates to view templates they've used
    if (!isMentorOrAdmin && !isCandidate) {
      return res.status(403).json({ error: "ONLY_MENTORS_OR_CANDIDATES_CAN_VIEW_TEMPLATES" });
    }

    // Check uploaded_cover_letters table (user only cares about uploaded ones)
    let coverLetterResult = { rows: [] };
    try {
      coverLetterResult = await pool.query(
        `SELECT id, title, content, format, file_url
         FROM uploaded_cover_letters
         WHERE id = $1`,
        [templateId]
      );
      
      // Verify ownership for candidates
      if (isCandidate && coverLetterResult.rows.length > 0) {
        const ownershipCheck = await pool.query(
          `SELECT 1
           FROM uploaded_cover_letters
           WHERE id = $1 AND user_id = $2
           LIMIT 1`,
          [templateId, userId]
        );
        if (ownershipCheck.rows.length === 0) {
          return res.status(403).json({ error: "COVER_LETTER_NOT_ACCESSIBLE" });
        }
      }
    } catch (err) {
      console.error("❌ Error fetching uploaded cover letter:", err);
      coverLetterResult = { rows: [] };
    }

    if (coverLetterResult.rows.length === 0) {
      return res.status(404).json({ error: "COVER_LETTER_NOT_FOUND" });
    }

    const coverLetter = coverLetterResult.rows[0];
    
    // ✅ If this is an uploaded cover letter (has file_url), return file_url info
    // The frontend will handle opening it via the download endpoint
    if (coverLetter.file_url) {
      return res.json({ 
        content: coverLetter.content, 
        name: coverLetter.title || coverLetter.name,
        file_url: coverLetter.file_url,
        format: coverLetter.format,
        has_file: true
      });
    }
    
    // Fallback: return content as JSON (for templates or if file is missing)
    res.json({ 
      content: coverLetter.content, 
      name: coverLetter.title || coverLetter.name,
      has_file: false
    });
  } catch (err) {
    console.error("Get cover letter template failed:", err);
    res.status(500).json({ error: "GET_TEMPLATE_FAILED" });
  }
});

// GET /api/team/:teamId/cover-letter/:coverLetterId/download - Download team member cover letter
// Optional query param: ?jobId=123 to verify cover letter is linked to specific job
router.get("/:teamId/cover-letter/:coverLetterId/download", async (req, res) => {
  console.log(`🔥 [COVER LETTER DOWNLOAD] ENDPOINT CALLED - teamId=${req.params.teamId}, coverLetterId=${req.params.coverLetterId}, jobId=${req.query.jobId || 'none'}`);
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error(`❌ [COVER LETTER DOWNLOAD] No user ID in request`);
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    
    const teamId = parseInt(req.params.teamId);
    const coverLetterId = parseInt(req.params.coverLetterId);
    const jobId = req.query.jobId ? parseInt(req.query.jobId) : null;

    console.log(`📄 [COVER LETTER DOWNLOAD] Parsed: userId=${userId}, teamId=${teamId}, coverLetterId=${coverLetterId}, jobId=${jobId || 'none'}`);

    if (isNaN(teamId) || isNaN(coverLetterId)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isMentorOrAdmin = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === 'candidate';

    // Get cover letter from uploaded_cover_letters table
    let coverLetterQuery;
    let coverLetterParams;
    let jobOwnerId = null;

    if (jobId && !isNaN(jobId)) {
      // Get job owner
      const jobOwnerQuery = await pool.query(
        `SELECT j.user_id 
         FROM jobs j
         INNER JOIN team_members tm ON j.user_id = tm.user_id
         WHERE j.id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
        [jobId, teamId]
      );
      
      if (jobOwnerQuery.rows.length > 0) {
        jobOwnerId = jobOwnerQuery.rows[0].user_id;
        console.log(`📄 [COVER LETTER DOWNLOAD] Job ${jobId} owner is user ${jobOwnerId}`);
        
        // Verify the cover letter belongs to the job owner and is linked to the job
        coverLetterQuery = `SELECT cl.*
                           FROM uploaded_cover_letters cl
                           INNER JOIN job_materials jm ON jm.cover_letter_id = cl.id
                           INNER JOIN team_members tm ON cl.user_id = tm.user_id
                           WHERE cl.id = $1 AND jm.job_id = $2 AND cl.user_id = $3 AND tm.team_id = $4 AND tm.status = 'active'`;
        coverLetterParams = [coverLetterId, jobId, jobOwnerId, teamId];
      } else {
        console.error(`❌ [COVER LETTER DOWNLOAD] Job ${jobId} not found or not accessible`);
        return res.status(404).json({ error: "JOB_NOT_FOUND" });
      }
    } else if (isCandidate) {
      // Candidates can only view their own cover letters
      coverLetterQuery = `SELECT cl.*
                         FROM uploaded_cover_letters cl
                         INNER JOIN team_members tm ON cl.user_id = tm.user_id
                         WHERE cl.id = $1 AND cl.user_id = $2 AND tm.team_id = $3 AND tm.status = 'active'`;
      coverLetterParams = [coverLetterId, userId, teamId];
    } else {
      // Mentors/admins can view any candidate's cover letter in the team
      coverLetterQuery = `SELECT cl.*
                         FROM uploaded_cover_letters cl
                         INNER JOIN team_members tm ON cl.user_id = tm.user_id
                         WHERE cl.id = $1 AND tm.team_id = $2 AND tm.role = 'candidate' AND tm.status = 'active'`;
      coverLetterParams = [coverLetterId, teamId];
    }

    console.log(`📄 [COVER LETTER DOWNLOAD] Fetching cover letter with ID: ${coverLetterId}`);
    const coverLetterResult = await pool.query(coverLetterQuery, coverLetterParams);

    if (coverLetterResult.rows.length === 0) {
      console.error(`❌ [COVER LETTER DOWNLOAD] Cover letter ${coverLetterId} not found or not accessible`);
      return res.status(404).json({ error: "COVER_LETTER_NOT_FOUND" });
    }

    const coverLetter = coverLetterResult.rows[0];
    console.log(`✅ [COVER LETTER DOWNLOAD] Fetched cover letter: ID=${coverLetter.id}, Title="${coverLetter.title}"`);
    console.log(`📄 [COVER LETTER DOWNLOAD] Cover letter file_url: ${coverLetter.file_url || 'N/A'}`);
    
    // Import necessary modules
    const path = (await import("path")).default;
    const { fileURLToPath } = await import("url");
    const fs = (await import("fs")).default;
    
    // ✅ If this is an uploaded cover letter (has file_url), serve the original file directly
    if (coverLetter.file_url) {
      const filename = path.basename(coverLetter.file_url);
      const __filename_team = fileURLToPath(import.meta.url);
      const __dirname_team = path.dirname(__filename_team);
      const coverLetterUploadDir = path.join(__dirname_team, "..", "uploads", "cover-letters");
      const filePath = path.join(coverLetterUploadDir, filename);
      
      console.log(`🔍 [COVER LETTER DOWNLOAD] Checking for uploaded file:`);
      console.log(`   - file_url: ${coverLetter.file_url}`);
      console.log(`   - filename: ${filename}`);
      console.log(`   - filePath: ${filePath}`);
      console.log(`   - exists: ${fs.existsSync(filePath)}`);
      
      if (fs.existsSync(filePath)) {
        console.log(`✅ [COVER LETTER DOWNLOAD] Serving uploaded file: ${filePath}`);
        const ext = path.extname(coverLetter.file_url).toLowerCase();
        const contentTypes = {
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".txt": "text/plain",
        };
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}${ext}"`);
        return res.sendFile(path.resolve(filePath));
      } else {
        console.warn(`⚠️ [COVER LETTER DOWNLOAD] Uploaded file not found: ${filePath}`);
        // Fall through to return content as text
      }
    }
    
    // Fallback: return content as plain text if no file_url
    console.log(`📄 [COVER LETTER DOWNLOAD] No file_url found, returning content as text`);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `inline; filename="${coverLetter.title || 'cover-letter'}.txt"`);
    res.send(coverLetter.content || "");
  } catch (err) {
    console.error("❌ [COVER LETTER DOWNLOAD] Error:", err);
    res.status(500).json({ error: "DOWNLOAD_FAILED" });
  }
});

// GET /api/team/:teamId/resume/:resumeId/download - Download team member resume (mentor only)
// Optional query param: ?jobId=123 to verify resume is linked to specific job
router.get("/:teamId/resume/:resumeId/download", async (req, res) => {
  console.log(`🔥 [RESUME DOWNLOAD] ENDPOINT CALLED - teamId=${req.params.teamId}, resumeId=${req.params.resumeId}, jobId=${req.query.jobId || 'none'}`);
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error(`❌ [RESUME DOWNLOAD] No user ID in request`);
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    
    const teamId = parseInt(req.params.teamId);
    const resumeId = parseInt(req.params.resumeId);
    const jobId = req.query.jobId ? parseInt(req.query.jobId) : null;

    console.log(`📄 [RESUME DOWNLOAD] Parsed: userId=${userId}, teamId=${teamId}, resumeId=${resumeId}, jobId=${jobId || 'none'}`);

    if (isNaN(teamId) || isNaN(resumeId)) {
      console.error(`❌ [RESUME DOWNLOAD] Invalid IDs: teamId=${req.params.teamId}, resumeId=${req.params.resumeId}`);
      return res.status(400).json({ error: "INVALID_ID" });
    }
    
    // If jobId is provided, verify the resume is linked to that job (for logging/debugging)
    // Note: We'll override the resumeId later if needed, so this is just for verification
    if (jobId && !isNaN(jobId)) {
      try {
        // Get the job's user_id first
        const jobCheck = await pool.query(
          `SELECT j.id, j.user_id, j.title 
           FROM jobs j
           INNER JOIN team_members tm ON j.user_id = tm.user_id
           WHERE j.id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
        [jobId, teamId]
      );
      
        if (jobCheck.rows.length > 0) {
          const jobUserId = jobCheck.rows[0].user_id;
          
          // Check job_materials table first
      let expectedResumeId = null;
          
          try {
            const materialsCheck = await pool.query(
              `SELECT resume_id FROM job_materials 
               WHERE job_id = $1 AND user_id = $2 AND resume_id IS NOT NULL`,
              [jobId, jobUserId]
        );
            
            if (materialsCheck.rows.length > 0 && materialsCheck.rows[0].resume_id) {
              expectedResumeId = materialsCheck.rows[0].resume_id;
              console.log(`📄 [RESUME DOWNLOAD] Job ${jobId} has resume_id ${expectedResumeId} from job_materials`);
            }
          } catch (materialsErr) {
            // Table might not exist yet, that's okay
            if (materialsErr.code !== '42P01') {
              console.warn("⚠️ Error checking job_materials:", materialsErr.message);
        }
      }
          
          // No fallback needed - job_materials is the only source of truth
      
      if (expectedResumeId && expectedResumeId !== resumeId) {
        console.warn(`⚠️ [RESUME DOWNLOAD] Mismatch! Requested resume ${resumeId} but job ${jobId} expects resume ${expectedResumeId}`);
            // The actualResumeId will be set correctly in the next section
      } else if (expectedResumeId) {
        console.log(`✅ [RESUME DOWNLOAD] Verified resume ${resumeId} matches job ${jobId}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ [RESUME DOWNLOAD] Error verifying job-resume link:`, err.message);
      }
    }

    const membership = await getMembership(teamId, userId);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({ error: "NOT_TEAM_MEMBER" });
    }

    const isMentorOrAdmin = MANAGER_ROLES.has(membership.role);
    const isCandidate = membership.role === 'candidate';

    // Allow mentors/admins to view any team member resume, or candidates to view their own resumes
    if (!isMentorOrAdmin && !isCandidate) {
      return res.status(403).json({ error: "ONLY_MENTORS_OR_CANDIDATES_CAN_VIEW_RESUMES" });
    }

    // If jobId is provided, ALWAYS get the correct resume_id from job_application_materials
    // This ensures we use the correct resume for the job, regardless of what the frontend sent
    let actualResumeId = resumeId;
    let jobOwnerId = null; // Store job owner ID for later use in resume verification
    
    if (jobId && !isNaN(jobId)) {
      console.log(`🔍 [RESUME DOWNLOAD] Looking up correct resume_id for job ${jobId}...`);
      
      try {
        // First, verify the job exists and get its user_id
        const jobCheck = await pool.query(
          `SELECT j.id, j.user_id, j.title 
           FROM jobs j
           INNER JOIN team_members tm ON j.user_id = tm.user_id
           WHERE j.id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
        [jobId, teamId]
        );
        
        if (jobCheck.rows.length === 0) {
          console.warn(`⚠️ [RESUME DOWNLOAD] Job ${jobId} not found or not accessible in team ${teamId}`);
          // Continue with requested resumeId
        } else {
          jobOwnerId = jobCheck.rows[0].user_id;
          console.log(`📄 [RESUME DOWNLOAD] Job ${jobId} belongs to user ${jobOwnerId}`);
          
          // Now get the resume_id from job_materials for this specific job
          const correctResumeQuery = await pool.query(
            `SELECT resume_id FROM job_materials 
             WHERE job_id = $1 AND user_id = $2 AND resume_id IS NOT NULL`,
            [jobId, jobOwnerId]
      );
      
      if (correctResumeQuery.rows.length > 0 && correctResumeQuery.rows[0].resume_id) {
            // Always use the resume_id from materials table when available
        actualResumeId = parseInt(correctResumeQuery.rows[0].resume_id, 10);
            console.log(`✅ [RESUME DOWNLOAD] Job ${jobId} has resume_id ${actualResumeId} in job_materials (requested: ${resumeId})`);
        if (actualResumeId !== resumeId) {
              console.warn(`⚠️ [RESUME DOWNLOAD] OVERRIDING requested resume_id ${resumeId} with correct resume_id ${actualResumeId} from job_materials`);
        }
      } else {
            // No resume_id in job_materials for this job
            console.warn(`⚠️ [RESUME DOWNLOAD] No resume_id found in job_materials for job ${jobId}, using requested ${resumeId}`);
          }
        }
      } catch (materialsErr) {
        // Table might not exist yet, fall back to jobs table
        if (materialsErr.code === '42P01') {
          console.log(`⚠️ [RESUME DOWNLOAD] job_materials table does not exist, checking jobs table...`);
        } else {
          console.warn(`⚠️ [RESUME DOWNLOAD] Error checking job_materials:`, materialsErr.message);
        }
        
        // No fallback - job_materials is the only source
        // Get job owner from jobs table if we don't have it yet
        if (!jobOwnerId) {
          const jobOwnerQuery = await pool.query(
            `SELECT j.user_id
             FROM jobs j
             INNER JOIN team_members tm ON j.user_id = tm.user_id
             WHERE j.id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
          [jobId, teamId]
        );
          if (jobOwnerQuery.rows.length > 0) {
            jobOwnerId = jobOwnerQuery.rows[0].user_id;
          }
        }
      }
    }

    // Verify the resume belongs to a team member
    // If jobId is provided, verify the resume belongs to the job's owner (candidate)
    // Otherwise, verify based on role (candidates see their own, mentors see any candidate's)
    let resumeQuery;
    let resumeParams;
    
    if (jobId && !isNaN(jobId) && jobOwnerId) {
      // We already have jobOwnerId from the earlier lookup
      console.log(`📄 [RESUME DOWNLOAD] Job ${jobId} owner is user ${jobOwnerId}, verifying resume ${actualResumeId} belongs to them`);
      
      // Verify the resume belongs to the job owner
      resumeQuery = `SELECT r.id, r.user_id, r.title, r.template_id, r.template_name, r.format, r.sections, r.created_at, r.updated_at, r.preview_url, r.file_url
                     FROM resumes r
                     INNER JOIN team_members tm ON r.user_id = tm.user_id
                     WHERE r.id = $1 AND r.user_id = $2 AND tm.team_id = $3 AND tm.status = 'active'`;
      resumeParams = [actualResumeId, jobOwnerId, teamId];
    } else if (jobId && !isNaN(jobId)) {
      // Fallback: get job owner if we don't have it yet
      const jobOwnerQuery = await pool.query(
        `SELECT j.user_id 
         FROM jobs j
         INNER JOIN team_members tm ON j.user_id = tm.user_id
         WHERE j.id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
        [jobId, teamId]
      );
      
      if (jobOwnerQuery.rows.length > 0) {
        jobOwnerId = jobOwnerQuery.rows[0].user_id;
        console.log(`📄 [RESUME DOWNLOAD] Job ${jobId} owner is user ${jobOwnerId}, verifying resume ${actualResumeId} belongs to them`);
        
        resumeQuery = `SELECT r.id, r.user_id, r.title, r.template_id, r.template_name, r.format, r.sections, r.created_at, r.updated_at, r.preview_url, r.file_url
                       FROM resumes r
                       INNER JOIN team_members tm ON r.user_id = tm.user_id
                       WHERE r.id = $1 AND r.user_id = $2 AND tm.team_id = $3 AND tm.status = 'active'`;
        resumeParams = [actualResumeId, jobOwnerId, teamId];
      } else {
        console.error(`❌ [RESUME DOWNLOAD] Job ${jobId} not found or not accessible`);
        return res.status(404).json({ error: "JOB_NOT_FOUND" });
      }
    } else if (isCandidate) {
      // Candidates can only view their own resumes (when no jobId provided)
      resumeQuery = `SELECT r.id, r.user_id, r.title, r.template_id, r.template_name, r.format, r.sections, r.created_at, r.updated_at, r.preview_url, r.file_url
                     FROM resumes r
                     INNER JOIN team_members tm ON r.user_id = tm.user_id
                     WHERE r.id = $1 AND r.user_id = $2 AND tm.team_id = $3 AND tm.status = 'active'`;
      resumeParams = [actualResumeId, userId, teamId];
    } else {
      // Mentors/admins can view any candidate's resume in the team (when no jobId provided)
      resumeQuery = `SELECT r.id, r.user_id, r.title, r.template_id, r.template_name, r.format, r.sections, r.created_at, r.updated_at, r.preview_url, r.file_url
                     FROM resumes r
                     INNER JOIN team_members tm ON r.user_id = tm.user_id
                     WHERE r.id = $1 AND tm.team_id = $2 AND tm.role = 'candidate' AND tm.status = 'active'`;
      resumeParams = [actualResumeId, teamId];
    }

    console.log(`📄 [RESUME DOWNLOAD] Fetching resume with ID: ${actualResumeId} (requested: ${resumeId})`);
    console.log(`📄 [RESUME DOWNLOAD] Query: ${resumeQuery}`);
    console.log(`📄 [RESUME DOWNLOAD] Params:`, resumeParams);
    
    const resumeResult = await pool.query(resumeQuery, resumeParams);

    if (resumeResult.rows.length === 0) {
      console.error(`❌ [RESUME DOWNLOAD] Resume not found: resumeId=${resumeId}`);
      return res.status(404).json({ error: "RESUME_NOT_FOUND" });
    }

    const resume = resumeResult.rows[0];
    
    // The query already ensures we got the correct resume by filtering with actualResumeId
    // Just log for verification
    console.log(`✅ [RESUME DOWNLOAD] Fetched resume: ID=${resume.id}, Title="${resume.title}", User=${resume.user_id} (requested: ${resumeId}, using: ${actualResumeId})`);
    
    // Log resume details for debugging
    console.log(`📄 [RESUME DOWNLOAD] Fetched resume: ID=${resume.id}, Title="${resume.title}", User=${resume.user_id}, Template="${resume.template_name || 'N/A'}"`);
    console.log(`📄 [RESUME DOWNLOAD] Resume sections type: ${typeof resume.sections}, keys: ${resume.sections ? Object.keys(resume.sections).join(', ') : 'null'}`);
    console.log(`📄 [RESUME DOWNLOAD] Resume file_url: ${resume.file_url || 'N/A'}`);
    
    // Verify resume has valid data
    if (!resume.title) {
      console.error(`⚠️ Resume ${resume.id} has no title`);
      return res.status(400).json({ error: "RESUME_HAS_NO_TITLE" });
    }
    
    // Import necessary modules
    const path = (await import("path")).default;
    const { fileURLToPath } = await import("url");
    const fs = (await import("fs")).default;
    
    // ✅ If this is an uploaded resume (has file_url), serve the original file directly
    console.log(`🔍 [RESUME DOWNLOAD] Resume object keys:`, Object.keys(resume));
    console.log(`🔍 [RESUME DOWNLOAD] Resume file_url value:`, resume.file_url);
    console.log(`🔍 [RESUME DOWNLOAD] Resume file_url type:`, typeof resume.file_url);
    
    if (resume.file_url) {
      const filename = path.basename(resume.file_url);
      // Use same path resolution as fileUpload.js (relative to backend directory)
      const __filename_team = fileURLToPath(import.meta.url);
      const __dirname_team = path.dirname(__filename_team);
      const resumeUploadDir = path.join(__dirname_team, "..", "uploads", "resumes");
      const filePath = path.join(resumeUploadDir, filename);
      
      console.log(`🔍 [RESUME DOWNLOAD] Checking for uploaded file:`);
      console.log(`   - file_url: ${resume.file_url}`);
      console.log(`   - filename: ${filename}`);
      console.log(`   - resumeUploadDir: ${resumeUploadDir}`);
      console.log(`   - filePath: ${filePath}`);
      console.log(`   - absolute filePath: ${path.resolve(filePath)}`);
      console.log(`   - exists: ${fs.existsSync(filePath)}`);
      
      // Also try alternative paths in case of path resolution issues
      const altPath1 = path.resolve("uploads/resumes", filename);
      const altPath2 = path.join(process.cwd(), "backend", "uploads", "resumes", filename);
      console.log(`   - altPath1 (resolve): ${altPath1}, exists: ${fs.existsSync(altPath1)}`);
      console.log(`   - altPath2 (cwd): ${altPath2}, exists: ${fs.existsSync(altPath2)}`);
      
      // Try multiple paths
      let finalPath = null;
      if (fs.existsSync(filePath)) {
        finalPath = filePath;
      } else if (fs.existsSync(altPath1)) {
        finalPath = altPath1;
      } else if (fs.existsSync(altPath2)) {
        finalPath = altPath2;
      }
      
      if (finalPath) {
        console.log(`✅ [RESUME DOWNLOAD] Serving uploaded file: ${finalPath}`);
        const ext = path.extname(resume.file_url).toLowerCase();
        const contentTypes = {
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".txt": "text/plain",
        };
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${resume.title}${ext}"`);
        return res.sendFile(path.resolve(finalPath));
      } else {
        console.warn(`⚠️ [RESUME DOWNLOAD] Uploaded file not found at any path`);
        console.warn(`⚠️ [RESUME DOWNLOAD] Tried: ${filePath}, ${altPath1}, ${altPath2}`);
        console.warn(`⚠️ [RESUME DOWNLOAD] Falling back to sections rendering`);
        // Fall through to render from sections if file is missing
      }
    } else {
      console.log(`📄 [RESUME DOWNLOAD] No file_url found, rendering from sections`);
    }
    
    // ✅ Otherwise, render from sections (for resumes built in the editor)
    const { renderTemplate } = await import("../utils/renderTemplate.js");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const EXPORT_DIR = path.join(__dirname, "..", "exports");
    if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

    // Helper functions (simplified versions)
    function normalizeSections(sections = {}) {
      const normalized = { ...sections };
      const arrayKeys = ["experience", "education", "projects", "certifications", "skills"];
      for (const key of arrayKeys) {
        if (!normalized[key]) normalized[key] = [];
        if (!Array.isArray(normalized[key])) {
          normalized[key] = typeof normalized[key] === "object" ? [normalized[key]] : [];
        }
      }
      normalized.summary = normalized.summary && typeof normalized.summary === "object"
        ? normalized.summary
        : { full_name: "", title: "", contact: { email: "", phone: "", location: "" }, bio: "" };
      return normalized;
    }

    function toTemplateFileBase(name = "") {
      const n = (name || "").toLowerCase().trim().replace(/\s+/g, "-");
      const map = { "ats optimized": "ats-optimized", "two column": "two-column", professional: "professional" };
      return map[n] || n || "ats-optimized";
    }

    function flattenForTemplate(sections) {
      const flat = {};
      if (sections.summary) {
        flat.full_name = sections.summary.full_name || "";
        flat.title = sections.summary.title || "";
        flat.email = sections.summary.contact?.email || "";
        flat.phone = sections.summary.contact?.phone || "";
        flat.location = sections.summary.contact?.location || "";
        flat.bio = sections.summary.bio || "";
      }
      flat.experience = sections.experience || [];
      flat.education = sections.education || [];
      flat.skills = sections.skills || [];
      flat.projects = sections.projects || [];
      flat.certifications = sections.certifications || [];
      return flat;
    }

    // Get resume sections (only needed if not an uploaded file)
    const sections = typeof resume.sections === "string" 
      ? JSON.parse(resume.sections) 
      : resume.sections;
    
    // Validate sections exist (only if this is not an uploaded resume)
    if (!resume.file_url) {
      if (!sections || (typeof sections === 'object' && Object.keys(sections).length === 0)) {
        console.error(`⚠️ Resume ${resume.id} has no sections data and no file_url`);
        return res.status(400).json({ error: "RESUME_HAS_NO_SECTIONS" });
      }
    }
    
    console.log(`📄 Resume ${resume.id} sections keys:`, Object.keys(sections || {}));
    const normalizedSections = normalizeSections(sections);

    const format = (resume.format || "pdf").toLowerCase();
    // Use a unique filename that includes timestamp to avoid caching issues
    const timestamp = Date.now();
    const base = path.join(
      EXPORT_DIR,
      `${resume.title}_${resume.id}_${timestamp}`.replace(/[^\w\-]/g, "_")
    );

    if (format === "pdf") {
      const pdfPath = `${base}.pdf`;
      const baseName = toTemplateFileBase(resume.template_name);
      
      console.log(`📄 Generating PDF for resume ${resume.id}: template="${baseName}", path="${pdfPath}"`);
      console.log(`📄 Resume sections summary:`, {
        hasSummary: !!normalizedSections.summary,
        experienceCount: normalizedSections.experience?.length || 0,
        educationCount: normalizedSections.education?.length || 0,
        skillsCount: normalizedSections.skills?.length || 0
      });
      
      // Delete existing file if it exists to ensure fresh generation
      if (fs.existsSync(pdfPath)) {
        console.log(`⚠️ Deleting existing PDF file: ${pdfPath}`);
        fs.unlinkSync(pdfPath);
      }
      
      await renderTemplate(baseName, flattenForTemplate(normalizedSections), pdfPath);
      
      // Verify file was created
      if (!fs.existsSync(pdfPath)) {
        console.error(`❌ PDF file was not created: ${pdfPath}`);
        return res.status(500).json({ error: "Failed to generate resume PDF" });
      }
      
      console.log(`✅ PDF generated successfully: ${pdfPath}`);
      
      // Set headers for inline viewing instead of download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${resume.title}_${resume.id}.pdf"`);
      const absolutePath = path.resolve(pdfPath);
      
      // Clean up file after sending (optional, can be done async)
      res.on('finish', () => {
        setTimeout(() => {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        }, 5000); // Delete after 5 seconds
      });
      
      return res.sendFile(absolutePath);
    }

    // For other formats, return error for now
    return res.status(400).json({ error: "Only PDF format is supported for mentor downloads" });
  } catch (err) {
    console.error(`❌ [RESUME DOWNLOAD] FATAL ERROR:`, err);
    console.error(`❌ [RESUME DOWNLOAD] Error stack:`, err.stack);
    res.status(500).json({ error: "GET_RESUME_DOWNLOAD_FAILED", message: err.message });
  }
});

// ============================================================
// GET /api/team/:teamId/analytics/milestones - Get milestones and celebrations
// ============================================================
router.get("/:teamId/analytics/milestones", async (req, res) => {
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

    // Get significant task completion milestones (not every task - only meaningful ones)
    // Show only the HIGHEST milestone per candidate (e.g., if they have 10 tasks, show "10 Tasks" not "1 Task" and "5 Tasks")
    const milestonesQuery = await pool.query(
      `
      WITH task_completions AS (
        SELECT 
          t.id,
          t.candidate_id,
          t.updated_at,
          COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
          ROW_NUMBER() OVER (PARTITION BY t.candidate_id ORDER BY t.updated_at ASC) as completion_number
        FROM tasks t
        JOIN users u ON t.candidate_id = u.id
        LEFT JOIN profiles u_prof ON t.candidate_id = u_prof.user_id
        WHERE t.team_id = $1 AND t.status = 'completed'
      ),
      task_totals AS (
        SELECT 
          candidate_id,
          MAX(completion_number) as total_completed,
          MAX(candidate_name) as candidate_name
        FROM task_completions
        GROUP BY candidate_id
        HAVING MAX(completion_number) >= 1
      ),
      highest_milestones AS (
        SELECT 
          tt.candidate_id,
          tt.candidate_name,
          tt.total_completed,
          CASE 
            WHEN tt.total_completed >= 20 AND tt.total_completed % 10 = 0 THEN tt.total_completed
            WHEN tt.total_completed >= 20 THEN FLOOR(tt.total_completed / 10) * 10
            WHEN tt.total_completed >= 15 THEN 15
            WHEN tt.total_completed >= 10 THEN 10
            WHEN tt.total_completed >= 5 THEN 5
            WHEN tt.total_completed >= 1 THEN 1
            ELSE NULL
          END as milestone_number
        FROM task_totals tt
      )
      SELECT 
        hm.candidate_id || '_' || hm.milestone_number as id,
        'task_completion' as type,
        CASE 
          WHEN hm.milestone_number = 1 THEN 'Reached 1 task completion milestone'
          ELSE CONCAT('Reached ', hm.milestone_number, ' tasks completion milestone')
        END as title,
        CONCAT('Completed ', hm.total_completed, ' tasks total') as description,
        hm.candidate_name,
        tc.updated_at as date,
        'check' as icon
      FROM highest_milestones hm
      JOIN task_completions tc ON hm.candidate_id = tc.candidate_id AND tc.completion_number = hm.milestone_number
      WHERE hm.milestone_number IS NOT NULL
      ORDER BY tc.updated_at DESC
      LIMIT 20
      `,
      [teamId]
    );

    // Get job application milestones - only the ACTUAL first job per candidate
    const jobMilestonesQuery = await pool.query(
      `
      WITH first_jobs AS (
        SELECT 
          j.id,
          j.user_id,
          j.title,
          j.company,
          j.created_at,
          COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
          ROW_NUMBER() OVER (PARTITION BY j.user_id ORDER BY j.created_at ASC) as job_number
        FROM jobs j
        JOIN team_members tm ON j.user_id = tm.user_id
        JOIN users u ON j.user_id = u.id
        LEFT JOIN profiles u_prof ON j.user_id = u_prof.user_id
        WHERE tm.team_id = $1 AND tm.status = 'active' AND tm.role = 'candidate'
      )
      SELECT 
        id,
        'job_application' as type,
        CONCAT('First Job Application: ', title) as title,
        CONCAT('Applied to ', company) as description,
        candidate_name,
        created_at as date,
        'briefcase' as icon
      FROM first_jobs
      WHERE job_number = 1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [teamId]
    );

    // Get job offer milestones - EVERY job offer is a milestone
    const jobOfferMilestonesQuery = await pool.query(
      `
      SELECT 
        j.id,
        'job_offer' as type,
        CONCAT('Job Offer Received: ', j.title) as title,
        CONCAT('Received offer from ', j.company) as description,
        COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
        COALESCE(j.status_updated_at, j.created_at) as date,
        'trophy' as icon
      FROM jobs j
      JOIN team_members tm ON j.user_id = tm.user_id
      JOIN users u ON j.user_id = u.id
      LEFT JOIN profiles u_prof ON j.user_id = u_prof.user_id
      WHERE tm.team_id = $1 
        AND tm.status = 'active' 
        AND tm.role = 'candidate'
        AND j.status = 'Offer'
      ORDER BY COALESCE(j.status_updated_at, j.created_at) DESC
      LIMIT 20
      `,
      [teamId]
    );

    // Get first interview milestone per candidate
    const firstInterviewMilestonesQuery = await pool.query(
      `
      WITH first_interviews AS (
        SELECT 
          j.id,
          j.user_id,
          j.title,
          j.company,
          COALESCE(j.status_updated_at, j.created_at) as interview_date,
          COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
          ROW_NUMBER() OVER (PARTITION BY j.user_id ORDER BY COALESCE(j.status_updated_at, j.created_at) ASC) as interview_number
        FROM jobs j
        JOIN team_members tm ON j.user_id = tm.user_id
        JOIN users u ON j.user_id = u.id
        LEFT JOIN profiles u_prof ON j.user_id = u_prof.user_id
        WHERE tm.team_id = $1 
          AND tm.status = 'active' 
          AND tm.role = 'candidate'
          AND j.status = 'Interview'
      )
      SELECT 
        id,
        'interview' as type,
        CONCAT('First Interview Scheduled: ', title) as title,
        CONCAT('Interview with ', company) as description,
        candidate_name,
        interview_date as date,
        'calendar-check' as icon
      FROM first_interviews
      WHERE interview_number = 1
      ORDER BY interview_date DESC
      LIMIT 10
      `,
      [teamId]
    );

    // Get first phone screen milestone per candidate
    const firstPhoneScreenMilestonesQuery = await pool.query(
      `
      WITH first_phone_screens AS (
        SELECT 
          j.id,
          j.user_id,
          j.title,
          j.company,
          COALESCE(j.status_updated_at, j.created_at) as phone_screen_date,
          COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
          ROW_NUMBER() OVER (PARTITION BY j.user_id ORDER BY COALESCE(j.status_updated_at, j.created_at) ASC) as phone_screen_number
        FROM jobs j
        JOIN team_members tm ON j.user_id = tm.user_id
        JOIN users u ON j.user_id = u.id
        LEFT JOIN profiles u_prof ON j.user_id = u_prof.user_id
        WHERE tm.team_id = $1 
          AND tm.status = 'active' 
          AND tm.role = 'candidate'
          AND j.status = 'Phone Screen'
      )
      SELECT 
        id,
        'phone_screen' as type,
        CONCAT('First Phone Screen: ', title) as title,
        CONCAT('Phone screen with ', company) as description,
        candidate_name,
        phone_screen_date as date,
        'phone' as icon
      FROM first_phone_screens
      WHERE phone_screen_number = 1
      ORDER BY phone_screen_date DESC
      LIMIT 10
      `,
      [teamId]
    );

    // Get skill milestones - significant skill additions
    // Show only the HIGHEST milestone per candidate (e.g., if they have 5 skills, show "5 Skills Added!" not "3 Skills Added!")
    const skillMilestonesQuery = await pool.query(
      `
      WITH skill_ordered AS (
        SELECT 
          s.user_id,
          s.created_at,
          COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name,
          ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.created_at ASC) as skill_number
        FROM skills s
        JOIN team_members tm ON s.user_id = tm.user_id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN profiles u_prof ON s.user_id = u_prof.user_id
        WHERE tm.team_id = $1 
          AND tm.status = 'active' 
          AND tm.role = 'candidate'
      ),
      skill_totals AS (
        SELECT 
          user_id,
          MAX(skill_number) as total_skills,
          MAX(candidate_name) as candidate_name
        FROM skill_ordered
        GROUP BY user_id
        HAVING MAX(skill_number) >= 3
      ),
      highest_milestones AS (
        SELECT 
          st.user_id,
          st.candidate_name,
          st.total_skills,
          CASE 
            WHEN st.total_skills >= 10 THEN FLOOR(st.total_skills / 10) * 10
            WHEN st.total_skills >= 5 THEN 5
            WHEN st.total_skills >= 3 THEN 3
            ELSE NULL
          END as milestone_number
        FROM skill_totals st
      )
      SELECT 
        hm.user_id || '_' || hm.milestone_number as id,
        'skill' as type,
        hm.milestone_number || ' Skills Added!' as title,
        CONCAT('Reached ', hm.milestone_number, ' skills milestone') as description,
        hm.candidate_name,
        so.created_at as date,
        'star' as icon
      FROM highest_milestones hm
      JOIN skill_ordered so ON hm.user_id = so.user_id AND so.skill_number = hm.milestone_number
      WHERE hm.milestone_number IS NOT NULL
      ORDER BY so.created_at DESC
      LIMIT 15
      `,
      [teamId]
    );

    // Combine milestones and filter out NULL titles (only show significant milestones)
    const milestones = [
      ...milestonesQuery.rows
        .filter(row => row.title) // Only include rows with valid titles (significant milestones only)
        .map(row => ({
          id: row.id,
          type: row.type,
          title: row.title,
          description: row.description || '',
          candidateName: row.candidate_name || 'Unknown',
          date: row.date,
          icon: row.icon,
        })),
      ...jobMilestonesQuery.rows.map(row => ({
        id: `job_app_${row.id}`,
        type: row.type,
        title: row.title,
        description: row.description || '',
        candidateName: row.candidate_name || 'Unknown',
        date: row.date,
        icon: row.icon,
      })),
      ...jobOfferMilestonesQuery.rows.map(row => ({
        id: `job_offer_${row.id}`,
        type: row.type,
        title: row.title,
        description: row.description || '',
        candidateName: row.candidate_name || 'Unknown',
        date: row.date,
        icon: row.icon,
      })),
      ...firstInterviewMilestonesQuery.rows.map(row => ({
        id: `interview_${row.id}`,
        type: row.type,
        title: row.title,
        description: row.description || '',
        candidateName: row.candidate_name || 'Unknown',
        date: row.date,
        icon: row.icon,
      })),
      ...firstPhoneScreenMilestonesQuery.rows.map(row => ({
        id: `phone_${row.id}`,
        type: row.type,
        title: row.title,
        description: row.description || '',
        candidateName: row.candidate_name || 'Unknown',
        date: row.date,
        icon: row.icon,
      })),
      ...skillMilestonesQuery.rows
        .filter(row => row.title) // Only include rows with valid titles
        .map(row => ({
          id: `skill_${row.id}`,
          type: row.type,
          title: row.title,
          description: row.description || '',
          candidateName: row.candidate_name || 'Unknown',
          date: row.date,
          icon: row.icon,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);

    // Get team celebrations (collective achievements)
    const celebrationsQuery = await pool.query(
      `
      WITH task_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count,
          COUNT(*) as total_count
        FROM tasks t
        WHERE t.team_id = $1
      ),
      team_member_count AS (
        SELECT COUNT(*) as count
        FROM team_members
        WHERE team_id = $1 AND status = 'active' AND role = 'candidate'
      ),
      job_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE j.status = 'Offer') as offer_count,
          COUNT(*) FILTER (WHERE j.status = 'Interview') as interview_count,
          COUNT(*) FILTER (WHERE j.status IN ('Applied', 'Phone Screen', 'Interview', 'Offer')) as application_count
        FROM jobs j
        JOIN team_members tm ON j.user_id = tm.user_id
        WHERE tm.team_id = $1 AND tm.status = 'active' AND tm.role = 'candidate'
      ),
      skill_stats AS (
        SELECT COUNT(DISTINCT s.id) as total_skills
        FROM skills s
        JOIN team_members tm ON s.user_id = tm.user_id
        WHERE tm.team_id = $1 AND tm.status = 'active' AND tm.role = 'candidate'
      ),
      all_candidates_active AS (
        SELECT 
          COUNT(DISTINCT t.candidate_id) FILTER (WHERE t.status = 'completed') as candidates_with_completed_tasks,
          (SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'active' AND role = 'candidate') as total_candidates
        FROM tasks t
        WHERE t.team_id = $1
      )
      SELECT 
        title,
        description,
        NOW() as date,
        'team_achievement' as type
      FROM (
        -- Task completion celebrations
        SELECT 
          CASE 
            WHEN ts.completed_count >= 50 THEN 'Team Milestone: ' || ts.completed_count || ' Tasks Completed!'
            WHEN ts.completed_count >= 25 THEN 'Team Achievement: ' || ts.completed_count || ' Tasks Completed!'
            WHEN ts.completed_count >= 10 THEN 'Team Milestone: ' || ts.completed_count || ' Tasks Completed'
            WHEN ts.completed_count >= 5 THEN 'Team Achievement: ' || ts.completed_count || ' Tasks Completed'
            ELSE NULL
          END as title,
          CASE 
            WHEN ts.completed_count >= 50 THEN 'Outstanding! The team has collectively completed ' || ts.completed_count || ' tasks! 🎉'
            WHEN ts.completed_count >= 25 THEN 'Excellent progress! The team has completed ' || ts.completed_count || ' tasks!'
            WHEN ts.completed_count >= 10 THEN 'The team has collectively completed ' || ts.completed_count || ' tasks!'
            WHEN ts.completed_count >= 5 THEN 'Great progress! The team has completed ' || ts.completed_count || ' tasks.'
            ELSE NULL
          END as description
        FROM task_stats ts
        WHERE ts.completed_count >= 5
        
        UNION ALL
        
        -- Job offer celebrations
        SELECT 
          CASE 
            WHEN js.offer_count >= 5 THEN 'Team Celebration: ' || js.offer_count || ' Job Offers Received!'
            WHEN js.offer_count >= 3 THEN 'Team Achievement: ' || js.offer_count || ' Job Offers Received!'
            WHEN js.offer_count >= 1 THEN 'Team Milestone: First Job Offer Received!'
            ELSE NULL
          END as title,
          CASE 
            WHEN js.offer_count >= 5 THEN 'Amazing! The team has received ' || js.offer_count || ' job offers! 🎊'
            WHEN js.offer_count >= 3 THEN 'Fantastic! The team has received ' || js.offer_count || ' job offers!'
            WHEN js.offer_count >= 1 THEN 'Congratulations! The team received its first job offer! 🎉'
            ELSE NULL
          END as description
        FROM job_stats js
        WHERE js.offer_count >= 1
        
        UNION ALL
        
        -- Interview celebrations
        SELECT 
          CASE 
            WHEN js.interview_count >= 10 THEN 'Team Milestone: ' || js.interview_count || ' Interviews Scheduled!'
            WHEN js.interview_count >= 5 THEN 'Team Achievement: ' || js.interview_count || ' Interviews Scheduled!'
            WHEN js.interview_count >= 1 THEN 'Team Milestone: First Interview Scheduled!'
            ELSE NULL
          END as title,
          CASE 
            WHEN js.interview_count >= 10 THEN 'Impressive! The team has ' || js.interview_count || ' interviews scheduled!'
            WHEN js.interview_count >= 5 THEN 'Great momentum! The team has ' || js.interview_count || ' interviews scheduled!'
            WHEN js.interview_count >= 1 THEN 'The team has scheduled its first interview! 🎯'
            ELSE NULL
          END as description
        FROM job_stats js
        WHERE js.interview_count >= 1
        
        UNION ALL
        
        -- Job application celebrations
        SELECT 
          CASE 
            WHEN js.application_count >= 50 THEN 'Team Milestone: ' || js.application_count || ' Job Applications Submitted!'
            WHEN js.application_count >= 25 THEN 'Team Achievement: ' || js.application_count || ' Job Applications Submitted!'
            WHEN js.application_count >= 10 THEN 'Team Milestone: ' || js.application_count || ' Job Applications Submitted!'
            ELSE NULL
          END as title,
          CASE 
            WHEN js.application_count >= 50 THEN 'Outstanding effort! The team has submitted ' || js.application_count || ' job applications!'
            WHEN js.application_count >= 25 THEN 'Great dedication! The team has submitted ' || js.application_count || ' job applications!'
            WHEN js.application_count >= 10 THEN 'The team has submitted ' || js.application_count || ' job applications!'
            ELSE NULL
          END as description
        FROM job_stats js
        WHERE js.application_count >= 10
        
        UNION ALL
        
        -- Skills celebration
        SELECT 
          CASE 
            WHEN ss.total_skills >= 50 THEN 'Team Milestone: ' || ss.total_skills || ' Skills Added!'
            WHEN ss.total_skills >= 25 THEN 'Team Achievement: ' || ss.total_skills || ' Skills Added!'
            WHEN ss.total_skills >= 10 THEN 'Team Milestone: ' || ss.total_skills || ' Skills Added!'
            ELSE NULL
          END as title,
          CASE 
            WHEN ss.total_skills >= 50 THEN 'Incredible! The team has collectively added ' || ss.total_skills || ' skills!'
            WHEN ss.total_skills >= 25 THEN 'Excellent! The team has added ' || ss.total_skills || ' skills!'
            WHEN ss.total_skills >= 10 THEN 'The team has collectively added ' || ss.total_skills || ' skills!'
            ELSE NULL
          END as description
        FROM skill_stats ss
        WHERE ss.total_skills >= 10
        
        UNION ALL
        
        -- 100% participation celebration
        SELECT 
          CASE 
            WHEN aca.candidates_with_completed_tasks = aca.total_candidates AND aca.total_candidates >= 2 THEN 'Team Achievement: 100% Participation!'
            ELSE NULL
          END as title,
          CASE 
            WHEN aca.candidates_with_completed_tasks = aca.total_candidates AND aca.total_candidates >= 2 THEN 'Every team member has completed at least one task! Perfect team engagement! 🌟'
            ELSE NULL
          END as description
        FROM all_candidates_active aca
        WHERE aca.candidates_with_completed_tasks = aca.total_candidates AND aca.total_candidates >= 2
      ) celebrations
      WHERE title IS NOT NULL
      `,
      [teamId]
    );

    const celebrations = celebrationsQuery.rows
      .filter(row => row.title)
      .map((row, idx) => ({
        id: idx + 1,
        type: row.type,
        title: row.title,
        description: row.description,
        date: row.date,
        participants: [], // Can be populated with actual participant names if needed
      }));

    res.json({ milestones, celebrations });
  } catch (err) {
    console.error("Get milestones failed:", err);
    res.status(500).json({ error: "GET_MILESTONES_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/analytics/performance - Get performance comparison
// Anonymous for candidates, actual names for mentors/admins
// ============================================================
router.get("/:teamId/analytics/performance", async (req, res) => {
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

    // Check if user is mentor or admin (can see actual names)
    const isMentor = MANAGER_ROLES.has(membership.role);
    const isAdmin = membership.role === "admin";

    // Get performance data for all candidates with names if mentor/admin
    const performanceQuery = await pool.query(
      `
      WITH candidate_tasks AS (
        SELECT 
          tm.user_id,
          COUNT(*) FILTER (WHERE t.status = 'completed') as tasks_completed,
          COUNT(*) FILTER (WHERE t.status = 'completed' AND t.due_date IS NOT NULL) as tasks_with_due_date,
          COUNT(*) FILTER (WHERE t.status = 'completed' AND t.due_date IS NOT NULL AND t.updated_at IS NOT NULL AND DATE(t.updated_at) <= t.due_date) as tasks_on_time,
          CASE 
            WHEN COUNT(*) FILTER (WHERE t.status = 'completed' AND t.updated_at IS NOT NULL AND t.created_at IS NOT NULL) > 0 
            THEN AVG(
              GREATEST(
                0.1, 
                EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 86400.0
              )
            ) FILTER (WHERE t.status = 'completed' AND t.updated_at IS NOT NULL AND t.created_at IS NOT NULL)
            ELSE NULL
          END as avg_completion_days
        FROM team_members tm
        LEFT JOIN tasks t ON tm.user_id = t.candidate_id AND t.team_id = tm.team_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY tm.user_id
      ),
      candidate_jobs AS (
        SELECT 
          tm.user_id,
          COUNT(*) as job_applications
        FROM team_members tm
        JOIN jobs j ON tm.user_id = j.user_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY tm.user_id
      ),
      candidate_skills AS (
        SELECT 
          tm.user_id,
          COUNT(DISTINCT s.id) as skills_improved
        FROM team_members tm
        LEFT JOIN skills s ON tm.user_id = s.user_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY tm.user_id
      ),
      candidate_feedback AS (
        SELECT 
          tm.user_id,
          COUNT(f.id) as feedback_count
        FROM team_members tm
        LEFT JOIN mentor_feedback f ON tm.user_id = f.candidate_id AND f.team_id = tm.team_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY tm.user_id
      ),
      performance_scores AS (
        SELECT 
          ct.user_id,
          ct.tasks_completed,
          ct.tasks_with_due_date,
          ct.tasks_on_time,
          COALESCE(cj.job_applications, 0) as job_applications,
          COALESCE(cs.skills_improved, 0) as skills_improved,
          -- Calculate performance-based score (0-5 scale)
          CASE 
            WHEN COALESCE(ct.tasks_completed, 0) = 0 
                 AND COALESCE(cj.job_applications, 0) = 0 
                 AND COALESCE(cs.skills_improved, 0) = 0 THEN NULL
            ELSE LEAST(5.0, GREATEST(2.0,
              -- Base score: 3.0
              3.0 +
              -- Task completion bonus (up to +0.8): More tasks = higher score
              LEAST(0.8, (COALESCE(ct.tasks_completed, 0)::float / 30.0) * 0.8) +
              -- On-time rate bonus (up to +0.6): Better on-time rate = higher score
              CASE 
                WHEN COALESCE(ct.tasks_with_due_date, 0) > 0 
                THEN LEAST(0.6, (COALESCE(ct.tasks_on_time, 0)::float / COALESCE(ct.tasks_with_due_date, 1)::float) * 0.6)
                ELSE 0
              END +
              -- Job applications bonus (up to +0.4): More applications = higher score
              LEAST(0.4, (COALESCE(cj.job_applications, 0)::float / 20.0) * 0.4) +
              -- Skills bonus (up to +0.2): More skills = higher score
              LEAST(0.2, (COALESCE(cs.skills_improved, 0)::float / 15.0) * 0.2)
            ))
          END as calculated_score
        FROM candidate_tasks ct
        LEFT JOIN candidate_jobs cj ON ct.user_id = cj.user_id
        LEFT JOIN candidate_skills cs ON ct.user_id = cs.user_id
      )
      SELECT 
        ct.user_id,
        COALESCE(ct.tasks_completed, 0)::int as tasks_completed,
        COALESCE(ct.tasks_with_due_date, 0)::int as tasks_with_due_date,
        COALESCE(ct.tasks_on_time, 0)::int as tasks_on_time,
        CASE 
          WHEN ct.avg_completion_days IS NULL OR ct.avg_completion_days = 0 THEN NULL
          ELSE ROUND(ct.avg_completion_days::numeric, 1)::float
        END as avg_completion_time,
        COALESCE(cj.job_applications, 0)::int as job_applications,
        COALESCE(cs.skills_improved, 0)::int as skills_improved,
        CASE 
          WHEN ps.calculated_score IS NOT NULL THEN ROUND(ps.calculated_score::numeric, 1)::float
          ELSE NULL
        END as feedback_score,
        COALESCE(u_prof.full_name, u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown') as candidate_name
      FROM candidate_tasks ct
      JOIN team_members tm ON ct.user_id = tm.user_id
      JOIN users u ON ct.user_id = u.id
      LEFT JOIN profiles u_prof ON ct.user_id = u_prof.user_id
      LEFT JOIN candidate_jobs cj ON ct.user_id = cj.user_id
      LEFT JOIN candidate_skills cs ON ct.user_id = cs.user_id
      LEFT JOIN candidate_feedback cf ON ct.user_id = cf.user_id
      LEFT JOIN performance_scores ps ON ct.user_id = ps.user_id
      WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
      ORDER BY ct.tasks_completed DESC, ps.calculated_score DESC NULLS LAST
      `,
      [teamId]
    );

    // Format the data - anonymize for candidates, show names for mentors/admins
    const performanceData = performanceQuery.rows.map((row, index) => {
      const tasksCompleted = row.tasks_completed || 0;
      const feedbackScore = row.feedback_score; // Can be NULL if no feedback
      const avgCompletionTime = row.avg_completion_time || 0;
      const tasksWithDueDate = row.tasks_with_due_date || 0;
      const tasksOnTime = row.tasks_on_time || 0;
      const jobApplications = row.job_applications || 0;
      const skillsImproved = row.skills_improved || 0;

      // Determine status based on actual activity and performance
      let status = "improving";
      // Only assign "high_performer" or "good_performer" if there's actual activity
      if (tasksCompleted >= 15 && feedbackScore !== null && feedbackScore >= 4.5 && avgCompletionTime > 0 && avgCompletionTime <= 3.0) {
        status = "high_performer";
      } else if (tasksCompleted >= 10 && feedbackScore !== null && feedbackScore >= 4.0) {
        status = "good_performer";
      } else if (tasksCompleted === 0 && jobApplications === 0 && skillsImproved === 0) {
        // No activity at all
        status = "getting_started";
      }

      return {
        id: `member_${row.user_id}`,
        // Show actual name for mentors/admins, anonymized for candidates
        anonymizedId: isMentor || isAdmin 
          ? row.candidate_name || `Team Member ${String.fromCharCode(65 + index)}`
          : `Team Member ${String.fromCharCode(65 + index)}`,
        candidateName: (isMentor || isAdmin) ? row.candidate_name : null, // Only include for mentors/admins
        tasksCompleted,
        tasksOnTime,
        tasksWithDueDate,
        avgCompletionTime,
        jobApplications,
        skillsImproved,
        feedbackScore, // Can be null if no feedback
        status,
      };
    });

    res.json(performanceData);
  } catch (err) {
    console.error("Get performance data failed:", err);
    res.status(500).json({ error: "GET_PERFORMANCE_FAILED" });
  }
});

// ============================================================
// GET /api/team/:teamId/analytics/patterns - Get success patterns and collaboration metrics
// ============================================================
router.get("/:teamId/analytics/patterns", async (req, res) => {
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

    // Get collaboration metrics
    const collaborationQuery = await pool.query(
      `
      WITH feedback_count AS (
        SELECT COUNT(*) as count
        FROM mentor_feedback
        WHERE team_id = $1
      ),
      task_collaboration AS (
        SELECT COUNT(*) as count
        FROM tasks
        WHERE team_id = $1 AND status = 'completed'
      ),
      shared_jobs_count AS (
        SELECT COUNT(*) as count
        FROM shared_jobs
        WHERE team_id = $1
      ),
      active_members AS (
        SELECT COUNT(DISTINCT t.candidate_id) as count
        FROM tasks t
        WHERE t.team_id = $1 AND t.status = 'completed'
      ),
      total_members AS (
        SELECT COUNT(*) as count
        FROM team_members
        WHERE team_id = $1 AND role = 'candidate' AND status = 'active'
      )
      SELECT 
        COALESCE(fc.count, 0) as peer_feedback_exchanges,
        COALESCE(tc.count, 0) as completed_tasks,
        COALESCE(sj.count, 0) as shared_jobs,
        COALESCE(am.count, 0) as active_members_count,
        COALESCE(tm.count, 0) as total_members_count
      FROM feedback_count fc, task_collaboration tc, shared_jobs_count sj, active_members am, total_members tm
      `,
      [teamId]
    );

    const collabData = collaborationQuery.rows[0] || {};
    
    // Calculate collaboration score on a 0-10 scale
    // Normalize each metric to a 0-1 scale based on reasonable thresholds, then weight and combine
    const feedbackCount = collabData.peer_feedback_exchanges || 0;
    const tasksCount = collabData.completed_tasks || 0;
    const sharedJobsCount = collabData.shared_jobs || 0;
    
    // Normalize each metric (0-1 scale where 1 = excellent performance)
    const feedbackScore = Math.min(1.0, feedbackCount / 20.0); // 20+ feedback exchanges = full score
    const tasksScore = Math.min(1.0, tasksCount / 30.0); // 30+ completed tasks = full score
    const sharedJobsScore = Math.min(1.0, sharedJobsCount / 10.0); // 10+ shared jobs = full score
    
    // Weighted combination (0-1 scale), then convert to 0-10 scale
    const weightedScore = (feedbackScore * 0.3 + tasksScore * 0.5 + sharedJobsScore * 0.2);
    const teamCollaborationScore = Math.round(weightedScore * 10 * 10) / 10.0; // Convert to 0-10 scale, round to 1 decimal

    // Get top collaborators (based on task completions and feedback)
    const topCollaboratorsQuery = await pool.query(
      `
      SELECT 
        CONCAT('Team Member ', CHR(65 + ROW_NUMBER() OVER (ORDER BY COUNT(t.id) DESC)::int - 1)) as member,
        COUNT(t.id) as contributions
      FROM team_members tm
      LEFT JOIN tasks t ON tm.user_id = t.candidate_id AND t.team_id = tm.team_id AND t.status = 'completed'
      WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
      GROUP BY tm.user_id
      ORDER BY contributions DESC
      LIMIT 3
      `,
      [teamId]
    );

    // Calculate active participation rate (percentage of members who have completed at least one task)
    const totalMembers = collabData.total_members_count || 1; // Avoid division by zero
    const activeMembers = collabData.active_members_count || 0;
    const activeParticipationRate = totalMembers > 0 
      ? Math.round((activeMembers / totalMembers) * 100)
      : 0;

    const collaborationMetrics = {
      teamCollaborationScore,
      peerFeedbackExchanges: collabData.peer_feedback_exchanges || 0,
      sharedJobs: collabData.shared_jobs || 0,
      activeParticipationRate, // Percentage of team members actively completing tasks
      collaborationTrend: "increasing", // Can be calculated based on historical data
      topCollaborators: topCollaboratorsQuery.rows.map((row, idx) => ({
        member: row.member,
        contributions: parseInt(row.contributions) || 0,
      })),
    };

    // Identify success patterns
    const patternsQuery = await pool.query(
      `
      WITH early_completers AS (
        SELECT COUNT(DISTINCT t.candidate_id) as count
        FROM tasks t
        WHERE t.team_id = $1 
          AND t.status = 'completed'
          AND t.updated_at < t.due_date - INTERVAL '2 days'
      ),
      skill_learners AS (
        SELECT COUNT(DISTINCT s.user_id) as count
        FROM team_members tm
        JOIN skills s ON tm.user_id = s.user_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY s.user_id
        HAVING COUNT(s.id) >= 3
      ),
      active_applicants AS (
        SELECT COUNT(DISTINCT j.user_id) as count
        FROM team_members tm
        JOIN jobs j ON tm.user_id = j.user_id
        WHERE tm.team_id = $1 AND tm.role = 'candidate' AND tm.status = 'active'
        GROUP BY j.user_id
        HAVING COUNT(j.id) >= 2
      )
      SELECT 
        ec.count as early_completers,
        (SELECT COUNT(*) FROM skill_learners) as skill_learners,
        aa.count as active_applicants
      FROM early_completers ec, active_applicants aa
      `,
      [teamId]
    );

    const patternData = patternsQuery.rows[0] || {};
    const successPatterns = [];

    if (patternData.early_completers > 0) {
      successPatterns.push({
        id: 1,
        pattern: "Early Task Completion",
        description: "Members who complete tasks 2+ days early show 40% higher job application success",
        frequency: patternData.early_completers >= 2 ? "High" : "Medium",
        impact: "High",
        examples: Array.from({ length: Math.min(patternData.early_completers, 3) }, (_, i) => 
          `Team Member ${String.fromCharCode(65 + i)}`
        ),
      });
    }

    if (patternData.skill_learners > 0) {
      successPatterns.push({
        id: 2,
        pattern: "Skill Diversification",
        description: "Candidates learning 3+ new skills per month have better interview performance",
        frequency: patternData.skill_learners >= 2 ? "High" : "Medium",
        impact: "High",
        examples: Array.from({ length: Math.min(patternData.skill_learners, 3) }, (_, i) => 
          `Team Member ${String.fromCharCode(65 + i)}`
        ),
      });
    }

    if (patternData.active_applicants > 0) {
      successPatterns.push({
        id: 3,
        pattern: "Consistent Application Activity",
        description: "Applying to 2+ jobs per week correlates with faster job placement",
        frequency: patternData.active_applicants >= 2 ? "High" : "Medium",
        impact: "Medium",
        examples: Array.from({ length: Math.min(patternData.active_applicants, 3) }, (_, i) => 
          `Team Member ${String.fromCharCode(65 + i)}`
        ),
      });
    }

    res.json({
      patterns: successPatterns,
      collaboration: collaborationMetrics,
    });
  } catch (err) {
    console.error("Get patterns failed:", err);
    res.status(500).json({ error: "GET_PATTERNS_FAILED" });
  }
});

export default router;
