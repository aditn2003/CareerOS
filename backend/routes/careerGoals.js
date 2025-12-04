import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

/**
 * GET all career goals for the user
 * GET /api/career-goals
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        cg.*,
        COUNT(DISTINCT gm.id) as total_milestones,
        COUNT(DISTINCT CASE WHEN gm.status = 'completed' THEN gm.id END) as completed_milestones,
        COUNT(DISTINCT ga.id) as achievement_count
       FROM career_goals cg
       LEFT JOIN goal_milestones gm ON cg.id = gm.goal_id
       LEFT JOIN goal_achievements ga ON cg.id = ga.goal_id
       WHERE cg.user_id = $1
       GROUP BY cg.id
       ORDER BY 
         CASE cg.priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         cg.target_date ASC`,
      [userId]
    );
    
    res.json({ goals: result.rows });
  } catch (err) {
    console.error("Error fetching career goals:", err);
    res.status(500).json({ error: "Failed to fetch career goals" });
  }
});

/**
 * GET a single goal with details
 * GET /api/career-goals/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get goal
    const goalResult = await pool.query(
      `SELECT * FROM career_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    
    const goal = goalResult.rows[0];
    
    // Get milestones
    const milestonesResult = await pool.query(
      `SELECT * FROM goal_milestones WHERE goal_id = $1 ORDER BY target_date ASC`,
      [id]
    );
    
    // Get progress history
    const progressResult = await pool.query(
      `SELECT * FROM goal_progress_history WHERE goal_id = $1 ORDER BY recorded_at DESC LIMIT 30`,
      [id]
    );
    
    // Get achievements
    const achievementsResult = await pool.query(
      `SELECT * FROM goal_achievements WHERE goal_id = $1 ORDER BY achievement_date DESC`,
      [id]
    );
    
    res.json({
      goal,
      milestones: milestonesResult.rows,
      progressHistory: progressResult.rows,
      achievements: achievementsResult.rows
    });
  } catch (err) {
    console.error("Error fetching goal details:", err);
    res.status(500).json({ error: "Failed to fetch goal details" });
  }
});

/**
 * POST create a new career goal
 * POST /api/career-goals
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      specific,
      measurable,
      achievable,
      relevant,
      time_bound,
      target_value,
      current_value,
      priority,
      start_date,
      target_date,
      notes,
      milestones
    } = req.body;

    // Validate required fields
    if (!title || !specific || !measurable || !time_bound || !target_date) {
      return res.status(400).json({
        error: "Missing required fields: title, specific, measurable, time_bound, target_date"
      });
    }

    // Calculate progress percentage
    const finalTargetValue = target_value ? Number(target_value) : null;
    const finalCurrentValue = current_value ? Number(current_value) : 0;
    const progressPercent = finalTargetValue && finalTargetValue > 0
      ? Math.min(100, Math.max(0, (finalCurrentValue / finalTargetValue) * 100))
      : 0;

    // Insert goal
    const goalResult = await pool.query(
      `INSERT INTO career_goals (
        user_id, title, description, category, specific, measurable, achievable, relevant,
        time_bound, target_value, current_value, progress_percent, priority, start_date, target_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        userId,
        title,
        description || null,
        category || 'other',
        specific,
        measurable,
        achievable !== undefined ? achievable : true,
        relevant || null,
        time_bound,
        finalTargetValue,
        finalCurrentValue,
        progressPercent,
        priority || 'medium',
        start_date || new Date().toISOString().split('T')[0],
        target_date,
        notes || null
      ]
    );

    const goal = goalResult.rows[0];

    // Create milestones if provided
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (const milestone of milestones) {
        await pool.query(
          `INSERT INTO goal_milestones (
            goal_id, user_id, title, description, target_date, target_value, current_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            goal.id,
            userId,
            milestone.title,
            milestone.description || null,
            milestone.target_date,
            milestone.target_value ? Number(milestone.target_value) : null,
            milestone.current_value ? Number(milestone.current_value) : 0
          ]
        );
      }
    }

    // Record initial progress
    await pool.query(
      `INSERT INTO goal_progress_history (goal_id, user_id, progress_value, progress_percent, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        goal.id,
        userId,
        goal.current_value,
        goal.progress_percent,
        'Goal created'
      ]
    );

    res.status(201).json({ goal, message: "Career goal created successfully" });
  } catch (err) {
    console.error("Error creating career goal:", err);
    res.status(500).json({ 
      error: "Failed to create career goal",
      details: err.message
    });
  }
});

/**
 * PUT update a career goal
 * PUT /api/career-goals/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if goal exists
    const existingGoal = await pool.query(
      `SELECT * FROM career_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingGoal.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const oldProgress = existingGoal.rows[0].progress_percent;
    const oldValue = existingGoal.rows[0].current_value;

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const fieldsToUpdate = {
      title: updateData.title,
      description: updateData.description,
      category: updateData.category,
      specific: updateData.specific,
      measurable: updateData.measurable,
      achievable: updateData.achievable,
      relevant: updateData.relevant,
      time_bound: updateData.time_bound,
      target_value: updateData.target_value !== undefined ? Number(updateData.target_value) : undefined,
      current_value: updateData.current_value !== undefined ? Number(updateData.current_value) : undefined,
      priority: updateData.priority,
      status: updateData.status,
      start_date: updateData.start_date,
      target_date: updateData.target_date,
      completed_date: updateData.completed_date,
      notes: updateData.notes
    };

    for (const [field, value] of Object.entries(fieldsToUpdate)) {
      if (value !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Calculate progress percentage if current_value or target_value is being updated
    const needsProgressCalc = updateData.current_value !== undefined || updateData.target_value !== undefined;
    if (needsProgressCalc) {
      // Get current values to calculate progress
      const currentGoal = existingGoal.rows[0];
      const newTargetValue = updateData.target_value !== undefined 
        ? Number(updateData.target_value) 
        : (currentGoal.target_value ? Number(currentGoal.target_value) : null);
      const newCurrentValue = updateData.current_value !== undefined 
        ? Number(updateData.current_value) 
        : (currentGoal.current_value ? Number(currentGoal.current_value) : 0);
      
      const progressPercent = newTargetValue && newTargetValue > 0
        ? Math.min(100, Math.max(0, (newCurrentValue / newTargetValue) * 100))
        : 0;
      
      updateFields.push(`progress_percent = $${paramIndex}`);
      updateValues.push(progressPercent);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id, userId);

    const result = await pool.query(
      `UPDATE career_goals 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    );

    const updatedGoal = result.rows[0];

    // Record progress change if current_value changed
    if (updateData.current_value !== undefined && updateData.current_value !== oldValue) {
      await pool.query(
        `INSERT INTO goal_progress_history (goal_id, user_id, progress_value, progress_percent, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          userId,
          updatedGoal.current_value,
          updatedGoal.progress_percent,
          updateData.progress_notes || 'Progress updated'
        ]
      );

      // Check for milestone achievements
      if (updatedGoal.progress_percent >= 25 && oldProgress < 25) {
        await pool.query(
          `INSERT INTO goal_achievements (goal_id, user_id, achievement_type, description, progress_at_achievement)
           VALUES ($1, $2, 'progress_milestone', 'Reached 25% progress milestone', $3)`,
          [id, userId, updatedGoal.progress_percent]
        );
      } else if (updatedGoal.progress_percent >= 50 && oldProgress < 50) {
        await pool.query(
          `INSERT INTO goal_achievements (goal_id, user_id, achievement_type, description, progress_at_achievement)
           VALUES ($1, $2, 'progress_milestone', 'Reached 50% progress milestone - Halfway there!', $3)`,
          [id, userId, updatedGoal.progress_percent]
        );
      } else if (updatedGoal.progress_percent >= 75 && oldProgress < 75) {
        await pool.query(
          `INSERT INTO goal_achievements (goal_id, user_id, achievement_type, description, progress_at_achievement)
           VALUES ($1, $2, 'progress_milestone', 'Reached 75% progress milestone - Almost there!', $3)`,
          [id, userId, updatedGoal.progress_percent]
        );
      }

      // Check for completion
      if (updatedGoal.status === 'completed' && existingGoal.rows[0].status !== 'completed') {
        const daysToComplete = Math.floor(
          (new Date(updatedGoal.completed_date || new Date()) - new Date(updatedGoal.start_date)) / (1000 * 60 * 60 * 24)
        );
        const targetDate = new Date(updatedGoal.target_date);
        const completedDate = new Date(updatedGoal.completed_date || new Date());
        const isEarly = completedDate < targetDate;

        await pool.query(
          `INSERT INTO goal_achievements (goal_id, user_id, achievement_type, description, progress_at_achievement, days_to_complete)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            userId,
            isEarly ? 'early_completion' : 'completion',
            isEarly 
              ? `Goal completed ${Math.floor((targetDate - completedDate) / (1000 * 60 * 60 * 24))} days early! 🎉`
              : 'Goal completed! 🎉',
            updatedGoal.progress_percent,
            daysToComplete
          ]
        );
      }
    }

    res.json({ goal: updatedGoal, message: "Goal updated successfully" });
  } catch (err) {
    console.error("Error updating goal:", err);
    res.status(500).json({ 
      error: "Failed to update goal",
      details: err.message
    });
  }
});

/**
 * DELETE a career goal
 * DELETE /api/career-goals/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM career_goals 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({ message: "Goal deleted successfully" });
  } catch (err) {
    console.error("Error deleting goal:", err);
    res.status(500).json({ 
      error: "Failed to delete goal",
      details: err.message
    });
  }
});

/**
 * GET goal analytics and insights
 * GET /api/career-goals/analytics/insights
 */
router.get("/analytics/insights", async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all goals
    const goalsResult = await pool.query(
      `SELECT * FROM career_goals WHERE user_id = $1`,
      [userId]
    );

    const goals = goalsResult.rows;

    if (goals.length === 0) {
      return res.json({
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        completionRate: 0,
        avgProgress: 0,
        insights: [],
        recommendations: []
      });
    }

    // Calculate metrics
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    const avgProgress = goals.reduce((sum, g) => sum + (Number(g.progress_percent) || 0), 0) / totalGoals;

    // Get achievements
    const achievementsResult = await pool.query(
      `SELECT * FROM goal_achievements WHERE user_id = $1 ORDER BY achievement_date DESC LIMIT 10`,
      [userId]
    );

    // Generate insights
    const insights = [];
    const recommendations = [];

    // Insight: Completion rate
    if (completionRate >= 70) {
      insights.push({
        type: 'success',
        title: 'High Goal Completion Rate',
        message: `You've completed ${completionRate.toFixed(1)}% of your goals. Great job maintaining focus!`
      });
    } else if (completionRate < 50 && totalGoals >= 3) {
      insights.push({
        type: 'warning',
        title: 'Low Completion Rate',
        message: `Only ${completionRate.toFixed(1)}% of your goals are completed. Consider setting more achievable goals.`
      });
      recommendations.push({
        type: 'info',
        title: 'Set More Realistic Goals',
        message: 'Break down large goals into smaller milestones. This increases your chances of success.',
        action: 'Review your active goals and add milestones'
      });
    }

    // Insight: Progress patterns
    const overdueGoals = goals.filter(g => 
      g.status === 'active' && 
      new Date(g.target_date) < new Date() && 
      Number(g.progress_percent) < 100
    );

    if (overdueGoals.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue Goals',
        message: `You have ${overdueGoals.length} goal(s) past their target date. Consider adjusting timelines or priorities.`
      });
      recommendations.push({
        type: 'warning',
        title: 'Review Overdue Goals',
        message: 'Update target dates or break goals into smaller steps to get back on track.',
        action: 'Review and update overdue goals'
      });
    }

    // Insight: Category performance
    const categoryStats = {};
    goals.forEach(goal => {
      const category = goal.category || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, completed: 0, avgProgress: 0 };
      }
      categoryStats[category].total++;
      if (goal.status === 'completed') {
        categoryStats[category].completed++;
      }
      categoryStats[category].avgProgress += Number(goal.progress_percent) || 0;
    });

    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.avgProgress = stats.avgProgress / stats.total;
      const categoryCompletionRate = (stats.completed / stats.total) * 100;

      if (categoryCompletionRate >= 80 && stats.total >= 2) {
        insights.push({
          type: 'success',
          title: `Strong Performance in ${category.charAt(0).toUpperCase() + category.slice(1)} Goals`,
          message: `You've completed ${categoryCompletionRate.toFixed(0)}% of your ${category} goals.`
        });
      }
    });

    // Recommendation: Set more goals if few exist
    if (totalGoals < 3) {
      recommendations.push({
        type: 'info',
        title: 'Set More Career Goals',
        message: 'Setting multiple goals helps maintain focus and provides more opportunities for achievement.',
        action: 'Create new career goals'
      });
    }

    // Recommendation: Celebrate achievements
    if (achievementsResult.rows.length > 0) {
      recommendations.push({
        type: 'success',
        title: 'Celebrate Your Achievements',
        message: `You've earned ${achievementsResult.rows.length} achievement(s)! Keep up the great work.`,
        action: 'View your achievements'
      });
    }

    res.json({
      totalGoals,
      activeGoals,
      completedGoals,
      completionRate,
      avgProgress,
      overdueGoals: overdueGoals.length,
      insights,
      recommendations,
      recentAchievements: achievementsResult.rows
    });
  } catch (err) {
    console.error("Error fetching goal analytics:", err);
    res.status(500).json({ error: "Failed to fetch goal analytics" });
  }
});

export default router;

