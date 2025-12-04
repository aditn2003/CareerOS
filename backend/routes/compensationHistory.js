import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

/**
 * GET all compensation history entries for the user
 * GET /api/compensation-history
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM compensation_history 
       WHERE user_id = $1 
       ORDER BY start_date DESC`,
      [userId]
    );
    
    res.json({ compensationHistory: result.rows });
  } catch (err) {
    console.error("Error fetching compensation history:", err);
    res.status(500).json({ error: "Failed to fetch compensation history" });
  }
});

/**
 * POST create a new compensation history entry
 * POST /api/compensation-history
 * Body: { company, role_title, role_level, start_date, end_date?, base_salary_start, total_comp_start, ... }
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      offer_id,
      company,
      role_title,
      role_level,
      start_date,
      end_date,
      base_salary_start,
      total_comp_start,
      base_salary_current,
      total_comp_current,
      promotion_date,
      promotion_from_level,
      promotion_to_level,
      salary_increase_percent,
      equity_refresher_date,
      equity_refresher_value,
      pto_days,
      benefits_value
    } = req.body;

    // Validate required fields
    if (!company || !role_title || !start_date) {
      return res.status(400).json({
        error: "Missing required fields: company, role_title, start_date"
      });
    }

    // If base_salary_current not provided, use base_salary_start
    const finalBaseCurrent = base_salary_current !== undefined 
      ? base_salary_current 
      : base_salary_start;
    const finalTotalCurrent = total_comp_current !== undefined 
      ? total_comp_current 
      : total_comp_start;

    const result = await pool.query(
      `INSERT INTO compensation_history (
        user_id, offer_id, company, role_title, role_level, start_date, end_date,
        base_salary_start, total_comp_start, base_salary_current, total_comp_current,
        promotion_date, promotion_from_level, promotion_to_level, salary_increase_percent,
        equity_refresher_date, equity_refresher_value, pto_days, benefits_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        userId,
        offer_id || null,
        company,
        role_title,
        role_level || null,
        start_date,
        end_date || null,
        Number(base_salary_start) || 0,
        Number(total_comp_start) || Number(base_salary_start) || 0,
        Number(finalBaseCurrent) || Number(base_salary_start) || 0,
        Number(finalTotalCurrent) || Number(total_comp_start) || Number(base_salary_start) || 0,
        promotion_date || null,
        promotion_from_level || null,
        promotion_to_level || null,
        Number(salary_increase_percent) || null,
        equity_refresher_date || null,
        Number(equity_refresher_value) || null,
        Number(pto_days) || 0,
        Number(benefits_value) || 0
      ]
    );

    console.log(`✅ Compensation history entry created for user ${userId}`);

    res.status(201).json({ 
      compensationHistory: result.rows[0],
      message: "Compensation history entry created successfully"
    });
  } catch (err) {
    console.error("Error creating compensation history:", err);
    res.status(500).json({ 
      error: "Failed to create compensation history entry",
      details: err.message
    });
  }
});

/**
 * PUT update a compensation history entry
 * PUT /api/compensation-history/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if entry exists and belongs to user
    const existing = await pool.query(
      `SELECT * FROM compensation_history WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Compensation history entry not found" });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const fieldsToUpdate = {
      company: updateData.company,
      role_title: updateData.role_title,
      role_level: updateData.role_level,
      start_date: updateData.start_date,
      end_date: updateData.end_date,
      base_salary_start: updateData.base_salary_start !== undefined ? Number(updateData.base_salary_start) : undefined,
      total_comp_start: updateData.total_comp_start !== undefined ? Number(updateData.total_comp_start) : undefined,
      base_salary_current: updateData.base_salary_current !== undefined ? Number(updateData.base_salary_current) : undefined,
      total_comp_current: updateData.total_comp_current !== undefined ? Number(updateData.total_comp_current) : undefined,
      promotion_date: updateData.promotion_date,
      promotion_from_level: updateData.promotion_from_level,
      promotion_to_level: updateData.promotion_to_level,
      salary_increase_percent: updateData.salary_increase_percent !== undefined ? Number(updateData.salary_increase_percent) : undefined,
      equity_refresher_date: updateData.equity_refresher_date,
      equity_refresher_value: updateData.equity_refresher_value !== undefined ? Number(updateData.equity_refresher_value) : undefined,
      pto_days: updateData.pto_days !== undefined ? Number(updateData.pto_days) : undefined,
      benefits_value: updateData.benefits_value !== undefined ? Number(updateData.benefits_value) : undefined
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

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id, userId);

    const result = await pool.query(
      `UPDATE compensation_history 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    );

    res.json({ 
      compensationHistory: result.rows[0],
      message: "Compensation history entry updated successfully"
    });
  } catch (err) {
    console.error("Error updating compensation history:", err);
    res.status(500).json({ 
      error: "Failed to update compensation history entry",
      details: err.message
    });
  }
});

/**
 * DELETE a compensation history entry
 * DELETE /api/compensation-history/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM compensation_history 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Compensation history entry not found" });
    }

    res.json({ 
      message: "Compensation history entry deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting compensation history:", err);
    res.status(500).json({ 
      error: "Failed to delete compensation history entry",
      details: err.message
    });
  }
});

export default router;

