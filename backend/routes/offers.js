import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Helper: Calculate total compensation
function calculateTotalComp(offer) {
  const base = Number(offer.base_salary) || 0;
  const signing = Number(offer.signing_bonus) || 0;
  const bonus = offer.annual_bonus_guaranteed 
    ? base * (Number(offer.annual_bonus_percent) || 0) / 100
    : base * (Number(offer.annual_bonus_percent) || 0) / 100 * 0.7; // Assume 70% of target
  const equity = Number(offer.equity_value) || 0;
  const benefits = (Number(offer.health_insurance_value) || 0) + 
                   (Number(offer.other_benefits_value) || 0);
  
  const year1 = base + signing + bonus + (equity / 4) + benefits; // Equity vests over 4 years
  const year4 = (base * 4) + signing + (bonus * 4) + equity + (benefits * 4);
  
  return { year1: Math.round(year1), year4: Math.round(year4) };
}

// GET all offers
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT * FROM offers WHERE user_id = $1 ORDER BY offer_date DESC`,
      [userId]
    );
    res.json({ offers: rows });
  } catch (err) {
    console.error("Error fetching offers:", err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// GET single offer
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }
    res.json({ offer: rows[0] });
  } catch (err) {
    console.error("Error fetching offer:", err);
    res.status(500).json({ error: "Failed to fetch offer" });
  }
});

// POST create offer
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const offerData = req.body;
    
    // Calculate total compensation
    const totalComp = calculateTotalComp(offerData);
    
    // Set initial salary for negotiation tracking
    const initialBase = offerData.base_salary;
    
    const { rows } = await pool.query(
      `INSERT INTO offers (
        user_id, job_id, company, role_title, role_level, location, location_type,
        industry, company_size, base_salary, signing_bonus, annual_bonus_percent,
        annual_bonus_guaranteed, equity_type, equity_value, equity_vesting_schedule,
        equity_valuation_date, pto_days, health_insurance_value, retirement_match_percent,
        retirement_match_cap, other_benefits_value, total_comp_year1, total_comp_year4,
        offer_status, offer_date, expiration_date, initial_base_salary, years_of_experience
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *`,
      [
        userId,
        offerData.job_id || null,
        offerData.company,
        offerData.role_title,
        offerData.role_level,
        offerData.location,
        offerData.location_type,
        offerData.industry,
        offerData.company_size,
        offerData.base_salary,
        offerData.signing_bonus || 0,
        offerData.annual_bonus_percent || 0,
        offerData.annual_bonus_guaranteed || false,
        offerData.equity_type || 'none',
        offerData.equity_value || 0,
        offerData.equity_vesting_schedule,
        offerData.equity_valuation_date,
        offerData.pto_days || 0,
        offerData.health_insurance_value || 0,
        offerData.retirement_match_percent || 0,
        offerData.retirement_match_cap || 0,
        offerData.other_benefits_value || 0,
        totalComp.year1,
        totalComp.year4,
        offerData.offer_status || 'pending',
        offerData.offer_date,
        offerData.expiration_date,
        initialBase,
        offerData.years_of_experience
      ]
    );
    
    res.status(201).json({ offer: rows[0] });
  } catch (err) {
    console.error("Error creating offer:", err);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

// PUT update offer
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const offerData = req.body;
    
    // Recalculate total comp if salary components changed
    const currentOffer = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (currentOffer.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }
    
    const mergedOffer = { ...currentOffer.rows[0], ...offerData };
    const totalComp = calculateTotalComp(mergedOffer);
    
    const { rows } = await pool.query(
      `UPDATE offers SET
        company = COALESCE($3, company),
        role_title = COALESCE($4, role_title),
        role_level = COALESCE($5, role_level),
        location = COALESCE($6, location),
        location_type = COALESCE($7, location_type),
        industry = COALESCE($8, industry),
        company_size = COALESCE($9, company_size),
        base_salary = COALESCE($10, base_salary),
        signing_bonus = COALESCE($11, signing_bonus),
        annual_bonus_percent = COALESCE($12, annual_bonus_percent),
        annual_bonus_guaranteed = COALESCE($13, annual_bonus_guaranteed),
        equity_type = COALESCE($14, equity_type),
        equity_value = COALESCE($15, equity_value),
        equity_vesting_schedule = COALESCE($16, equity_vesting_schedule),
        equity_valuation_date = COALESCE($17, equity_valuation_date),
        pto_days = COALESCE($18, pto_days),
        health_insurance_value = COALESCE($19, health_insurance_value),
        retirement_match_percent = COALESCE($20, retirement_match_percent),
        retirement_match_cap = COALESCE($21, retirement_match_cap),
        other_benefits_value = COALESCE($22, other_benefits_value),
        total_comp_year1 = COALESCE($23, total_comp_year1),
        total_comp_year4 = COALESCE($24, total_comp_year4),
        offer_status = COALESCE($25, offer_status),
        expiration_date = COALESCE($26, expiration_date),
        decision_date = COALESCE($27, decision_date),
        competing_offers_count = COALESCE($28, competing_offers_count),
        competing_offers_ids = COALESCE($29, competing_offers_ids),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
      [
        id, userId,
        offerData.company,
        offerData.role_title,
        offerData.role_level,
        offerData.location,
        offerData.location_type,
        offerData.industry,
        offerData.company_size,
        offerData.base_salary,
        offerData.signing_bonus,
        offerData.annual_bonus_percent,
        offerData.annual_bonus_guaranteed,
        offerData.equity_type,
        offerData.equity_value,
        offerData.equity_vesting_schedule,
        offerData.equity_valuation_date,
        offerData.pto_days,
        offerData.health_insurance_value,
        offerData.retirement_match_percent,
        offerData.retirement_match_cap,
        offerData.other_benefits_value,
        totalComp.year1,
        totalComp.year4,
        offerData.offer_status,
        offerData.expiration_date,
        offerData.decision_date,
        offerData.competing_offers_count,
        offerData.competing_offers_ids
      ]
    );
    
    res.json({ offer: rows[0] });
  } catch (err) {
    console.error("Error updating offer:", err);
    res.status(500).json({ error: "Failed to update offer" });
  }
});

// POST record negotiation
router.post("/:id/negotiate", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { negotiated_base_salary, negotiation_notes, negotiation_type, value_before, value_after, outcome, leverage_points } = req.body;
    
    // Get current offer
    const offerResult = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }
    
    const offer = offerResult.rows[0];
    const initialBase = offer.initial_base_salary || offer.base_salary;
    const newBase = negotiated_base_salary || offer.base_salary;
    const improvement = initialBase > 0 ? ((newBase - initialBase) / initialBase) * 100 : 0;
    
    // Update offer with negotiation results
    await pool.query(
      `UPDATE offers SET
        negotiated_base_salary = $3,
        negotiation_attempted = TRUE,
        negotiation_successful = $4,
        negotiation_improvement_percent = $5,
        negotiation_notes = $6,
        base_salary = $7,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2`,
      [id, userId, newBase, improvement > 0, improvement, negotiation_notes, newBase]
    );
    
    // Record in negotiation history
    const roundResult = await pool.query(
      `SELECT COUNT(*) as count FROM negotiation_history WHERE offer_id = $1`,
      [id]
    );
    const round = parseInt(roundResult.rows[0].count) + 1;
    
    await pool.query(
      `INSERT INTO negotiation_history (
        user_id, offer_id, negotiation_round, negotiation_date, negotiation_type,
        value_before, value_after, improvement_percent, outcome, leverage_points, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId, id, round, new Date().toISOString().split('T')[0],
        negotiation_type || 'base_salary', value_before || initialBase,
        value_after || newBase, improvement, outcome || 'pending',
        leverage_points || [], negotiation_notes
      ]
    );
    
    // Recalculate total comp with new base
    const updatedOffer = await pool.query(
      `SELECT * FROM offers WHERE id = $1`,
      [id]
    );
    const totalComp = calculateTotalComp(updatedOffer.rows[0]);
    await pool.query(
      `UPDATE offers SET total_comp_year1 = $1, total_comp_year4 = $2 WHERE id = $3`,
      [totalComp.year1, totalComp.year4, id]
    );
    
    const finalOffer = await pool.query(
      `SELECT * FROM offers WHERE id = $1`,
      [id]
    );
    
    res.json({ offer: finalOffer.rows[0] });
  } catch (err) {
    console.error("Error recording negotiation:", err);
    res.status(500).json({ error: "Failed to record negotiation" });
  }
});

// POST accept offer (creates compensation history entry)
router.post("/:id/accept", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get offer
    const offerResult = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }
    
    const offer = offerResult.rows[0];
    
    // Update offer status
    await pool.query(
      `UPDATE offers SET offer_status = 'accepted', decision_date = NOW() WHERE id = $1`,
      [id]
    );
    
    // Create compensation history entry
    const compResult = await pool.query(
      `INSERT INTO compensation_history (
        user_id, offer_id, company, role_title, role_level, start_date,
        base_salary_start, total_comp_start, base_salary_current, total_comp_current,
        pto_days, benefits_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId, id, offer.company, offer.role_title, offer.role_level,
        new Date().toISOString().split('T')[0],
        offer.base_salary, offer.total_comp_year1,
        offer.base_salary, offer.total_comp_year1,
        offer.pto_days,
        (offer.health_insurance_value || 0) + (offer.other_benefits_value || 0)
      ]
    );
    
    res.json({ 
      offer: { ...offer, offer_status: 'accepted' },
      compensationHistory: compResult.rows[0]
    });
  } catch (err) {
    console.error("Error accepting offer:", err);
    res.status(500).json({ error: "Failed to accept offer" });
  }
});

// DELETE offer
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query(
      `DELETE FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ message: "Offer deleted" });
  } catch (err) {
    console.error("Error deleting offer:", err);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

export default router;

