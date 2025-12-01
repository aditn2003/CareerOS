import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Default goals
const DEFAULT_GOALS = {
  monthly_applications: 30,
  interview_rate_target: 0.30,
  offer_rate_target: 0.05,
};

// ==========================
//     GET /api/goals
// ==========================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT monthly_applications, interview_rate_target, offer_rate_target 
       FROM user_goals 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no custom goals set
      return res.json({
        goals: DEFAULT_GOALS,
        isCustom: false,
      });
    }

    res.json({
      goals: {
        monthly_applications: Number(result.rows[0].monthly_applications),
        interview_rate_target: Number(result.rows[0].interview_rate_target),
        offer_rate_target: Number(result.rows[0].offer_rate_target),
      },
      isCustom: true,
    });
  } catch (err) {
    console.error("Goals fetch error:", err);
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

// ==========================
//     PUT /api/goals
// ==========================
router.put("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { monthly_applications, interview_rate_target, offer_rate_target } = req.body;

    // Validate inputs
    const monthlyApps = Math.max(1, Math.min(200, Number(monthly_applications) || 30));
    const interviewRate = Math.max(0.01, Math.min(1, Number(interview_rate_target) || 0.30));
    const offerRate = Math.max(0.01, Math.min(1, Number(offer_rate_target) || 0.05));

    // Upsert: Insert or update if exists
    const result = await pool.query(
      `INSERT INTO user_goals (user_id, monthly_applications, interview_rate_target, offer_rate_target, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         monthly_applications = $2,
         interview_rate_target = $3,
         offer_rate_target = $4,
         updated_at = NOW()
       RETURNING *`,
      [userId, monthlyApps, interviewRate, offerRate]
    );

    res.json({
      message: "Goals updated successfully",
      goals: {
        monthly_applications: Number(result.rows[0].monthly_applications),
        interview_rate_target: Number(result.rows[0].interview_rate_target),
        offer_rate_target: Number(result.rows[0].offer_rate_target),
      },
    });
  } catch (err) {
    console.error("Goals update error:", err);
    res.status(500).json({ error: "Failed to update goals" });
  }
});

// ==========================
//     DELETE /api/goals (reset to defaults)
// ==========================
router.delete("/", async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(`DELETE FROM user_goals WHERE user_id = $1`, [userId]);

    res.json({
      message: "Goals reset to defaults",
      goals: DEFAULT_GOALS,
    });
  } catch (err) {
    console.error("Goals reset error:", err);
    res.status(500).json({ error: "Failed to reset goals" });
  }
});

export default router;

