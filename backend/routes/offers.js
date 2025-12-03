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

// Helper: Find competing offers (within $5,000 salary difference)
async function findCompetingOffers(userId, baseSalary, excludeOfferId = null) {
  try {
    const salaryThreshold = 5000; // $5,000 difference threshold
    const currentSalary = Number(baseSalary) || 0;
    
    if (!currentSalary || currentSalary <= 0) {
      return { count: 0, ids: [] };
    }
    
    // Find all other offers for this user with salaries within $5,000
    let query = `
      SELECT id, base_salary, company, role_title
      FROM offers
      WHERE user_id = $1
        AND base_salary IS NOT NULL
        AND base_salary > 0
        AND ABS(base_salary - $2) <= $3
    `;
    const params = [userId, currentSalary, salaryThreshold];
    
    if (excludeOfferId) {
      query += ` AND id != $4`;
      params.push(excludeOfferId);
    }
    
    const result = await pool.query(query, params);
    
    return {
      count: result.rows.length,
      ids: result.rows.map(row => row.id)
    };
  } catch (err) {
    console.error("Error finding competing offers:", err);
    return { count: 0, ids: [] };
  }
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
    // Use provided initial_base_salary, or default to base_salary for new offers
    const initialBase = offerData.initial_base_salary || offerData.base_salary;
    
    // Automatically detect competing offers (within $5,000 salary difference)
    let competingOffers = { count: 0, ids: [] };
    if (offerData.base_salary && !offerData.competing_offers_count && !offerData.competing_offers_ids) {
      competingOffers = await findCompetingOffers(userId, offerData.base_salary);
    } else if (offerData.competing_offers_count !== undefined || offerData.competing_offers_ids) {
      // Use provided values if explicitly set
      competingOffers = {
        count: offerData.competing_offers_count || 0,
        ids: offerData.competing_offers_ids || []
      };
    }
    
    const { rows } = await pool.query(
      `INSERT INTO offers (
        user_id, job_id, company, role_title, role_level, location, location_type,
        industry, company_size, base_salary, signing_bonus, annual_bonus_percent,
        annual_bonus_guaranteed, equity_type, equity_value, equity_vesting_schedule,
        equity_valuation_date, pto_days, health_insurance_value, retirement_match_percent,
        retirement_match_cap, other_benefits_value, total_comp_year1, total_comp_year4,
        offer_status, offer_date, expiration_date, initial_base_salary, years_of_experience,
        negotiation_notes, competing_offers_count, competing_offers_ids
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
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
        offerData.years_of_experience,
        offerData.negotiation_notes || null,
        competingOffers.count,
        competingOffers.ids.length > 0 ? competingOffers.ids : null
      ]
    );
    
    // Update competing offers for other offers that are now competing with this one
    if (competingOffers.count > 0 && rows[0].id) {
      const newOfferId = rows[0].id;
      const newSalary = Number(offerData.base_salary) || 0;
      
      // For each competing offer, update it to include this new offer in its competing list
      for (const competingId of competingOffers.ids) {
        try {
          const competingOffer = await pool.query(
            `SELECT competing_offers_count, competing_offers_ids FROM offers WHERE id = $1`,
            [competingId]
          );
          
          if (competingOffer.rows.length > 0) {
            const existingIds = competingOffer.rows[0].competing_offers_ids || [];
            const existingCount = competingOffer.rows[0].competing_offers_count || 0;
            
            // Add this new offer to the competing list if not already there
            if (!existingIds.includes(newOfferId)) {
              const updatedIds = [...existingIds, newOfferId];
              await pool.query(
                `UPDATE offers 
                 SET competing_offers_count = $1, 
                     competing_offers_ids = $2,
                     updated_at = NOW()
                 WHERE id = $3`,
                [updatedIds.length, updatedIds, competingId]
              );
            }
          }
        } catch (updateErr) {
          console.error(`Error updating competing offer ${competingId}:`, updateErr);
          // Continue with other offers even if one fails
        }
      }
    }
    
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
    
    // Handle negotiation fields if provided
    const initialBase = offerData.initial_base_salary !== undefined 
      ? offerData.initial_base_salary 
      : currentOffer.rows[0].initial_base_salary || currentOffer.rows[0].base_salary;
    
    const newBase = offerData.base_salary !== undefined 
      ? offerData.base_salary 
      : currentOffer.rows[0].base_salary;
    
    // Calculate negotiation improvement if base salary changed
    let negotiationAttempted = offerData.negotiation_attempted;
    let negotiationSuccessful = offerData.negotiation_successful;
    let negotiationImprovementPercent = offerData.negotiation_improvement_percent;
    
    if (newBase && initialBase && Number(newBase) > Number(initialBase)) {
      negotiationAttempted = offerData.negotiation_attempted !== undefined 
        ? offerData.negotiation_attempted 
        : true;
      negotiationSuccessful = offerData.negotiation_successful !== undefined 
        ? offerData.negotiation_successful 
        : true;
      negotiationImprovementPercent = offerData.negotiation_improvement_percent !== undefined
        ? offerData.negotiation_improvement_percent
        : ((Number(newBase) - Number(initialBase)) / Number(initialBase)) * 100;
    }
    
    // Automatically detect competing offers if salary changed and not explicitly set
    let competingOffers = { count: 0, ids: [] };
    if (newBase && (!offerData.competing_offers_count && !offerData.competing_offers_ids)) {
      competingOffers = await findCompetingOffers(userId, newBase, id);
    } else if (offerData.competing_offers_count !== undefined || offerData.competing_offers_ids) {
      // Use provided values if explicitly set
      competingOffers = {
        count: offerData.competing_offers_count || 0,
        ids: offerData.competing_offers_ids || []
      };
    } else {
      // Keep existing values if not changed
      competingOffers = {
        count: currentOffer.rows[0].competing_offers_count || 0,
        ids: currentOffer.rows[0].competing_offers_ids || []
      };
    }

    // Check if status is being changed to 'accepted'
    const isStatusChangingToAccepted = offerData.offer_status === 'accepted' && 
                                       currentOffer.rows[0].offer_status !== 'accepted';
    
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
        initial_base_salary = COALESCE($11, initial_base_salary),
        signing_bonus = COALESCE($12, signing_bonus),
        annual_bonus_percent = COALESCE($13, annual_bonus_percent),
        annual_bonus_guaranteed = COALESCE($14, annual_bonus_guaranteed),
        equity_type = COALESCE($15, equity_type),
        equity_value = COALESCE($16, equity_value),
        equity_vesting_schedule = COALESCE($17, equity_vesting_schedule),
        equity_valuation_date = COALESCE($18, equity_valuation_date),
        pto_days = COALESCE($19, pto_days),
        health_insurance_value = COALESCE($20, health_insurance_value),
        retirement_match_percent = COALESCE($21, retirement_match_percent),
        retirement_match_cap = COALESCE($22, retirement_match_cap),
        other_benefits_value = COALESCE($23, other_benefits_value),
        total_comp_year1 = COALESCE($24, total_comp_year1),
        total_comp_year4 = COALESCE($25, total_comp_year4),
        offer_status = COALESCE($26, offer_status),
        expiration_date = COALESCE($27, expiration_date),
        decision_date = CASE 
          WHEN $26 = 'accepted' AND decision_date IS NULL THEN NOW() 
          ELSE COALESCE($28, decision_date) 
        END,
        competing_offers_count = COALESCE($29, competing_offers_count),
        competing_offers_ids = COALESCE($30, competing_offers_ids),
        negotiation_attempted = COALESCE($31, negotiation_attempted),
        negotiation_successful = COALESCE($32, negotiation_successful),
        negotiation_improvement_percent = COALESCE($33, negotiation_improvement_percent),
        negotiation_notes = COALESCE($34, negotiation_notes),
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
        initialBase,
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
        competingOffers.count,
        competingOffers.ids.length > 0 ? competingOffers.ids : null,
        negotiationAttempted,
        negotiationSuccessful,
        negotiationImprovementPercent,
        offerData.negotiation_notes
      ]
    );
    
    // Update competing offers for other offers that are now competing with this one
    if (competingOffers.count > 0 && rows[0].id) {
      const updatedOfferId = rows[0].id;
      const updatedSalary = Number(newBase) || Number(currentOffer.rows[0].base_salary) || 0;
      
      // For each competing offer, update it to include this offer in its competing list
      for (const competingId of competingOffers.ids) {
        if (competingId === updatedOfferId) continue; // Skip self
        
        try {
          const competingOffer = await pool.query(
            `SELECT competing_offers_count, competing_offers_ids FROM offers WHERE id = $1`,
            [competingId]
          );
          
          if (competingOffer.rows.length > 0) {
            const existingIds = competingOffer.rows[0].competing_offers_ids || [];
            const existingCount = competingOffer.rows[0].competing_offers_count || 0;
            
            // Add this offer to the competing list if not already there
            if (!existingIds.includes(updatedOfferId)) {
              const updatedIds = [...existingIds, updatedOfferId];
              await pool.query(
                `UPDATE offers 
                 SET competing_offers_count = $1, 
                     competing_offers_ids = $2,
                     updated_at = NOW()
                 WHERE id = $3`,
                [updatedIds.length, updatedIds, competingId]
              );
            }
          }
        } catch (updateErr) {
          console.error(`Error updating competing offer ${competingId}:`, updateErr);
          // Continue with other offers even if one fails
        }
      }
    }

    const updatedOffer = rows[0];

    // If status is being changed to 'accepted', create compensation history entry
    if (isStatusChangingToAccepted) {
      try {
        // Check if compensation history already exists for this offer
        const existingComp = await pool.query(
          `SELECT * FROM compensation_history WHERE offer_id = $1`,
          [id]
        );

        if (existingComp.rows.length === 0) {
          // Create compensation history entry
          const compResult = await pool.query(
            `INSERT INTO compensation_history (
              user_id, offer_id, company, role_title, role_level, start_date,
              base_salary_start, total_comp_start, base_salary_current, total_comp_current,
              pto_days, benefits_value
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
              userId,
              id,
              updatedOffer.company || 'Unknown',
              updatedOffer.role_title || 'Unknown',
              updatedOffer.role_level || null,
              new Date().toISOString().split('T')[0],
              Number(updatedOffer.base_salary) || 0,
              Number(updatedOffer.total_comp_year1) || Number(updatedOffer.base_salary) || 0,
              Number(updatedOffer.base_salary) || 0,
              Number(updatedOffer.total_comp_year1) || Number(updatedOffer.base_salary) || 0,
              Number(updatedOffer.pto_days) || 0,
              (Number(updatedOffer.health_insurance_value) || 0) + (Number(updatedOffer.other_benefits_value) || 0)
            ]
          );
          console.log(`✅ Compensation history created for offer ${id} (via status change in form)`);
        } else {
          console.log(`ℹ️ Compensation history already exists for offer ${id}`);
        }
      } catch (compErr) {
        console.error("❌ Error creating compensation history (via status change):", compErr);
        // Don't fail the offer update if compensation history creation fails
        // The offer status change should still succeed
      }
    }

    // If offer is already accepted, sync compensation history with any changes
    if (updatedOffer.offer_status === 'accepted') {
      try {
        const existingComp = await pool.query(
          `SELECT * FROM compensation_history WHERE offer_id = $1`,
          [id]
        );

        if (existingComp.rows.length > 0) {
          // Update existing compensation history entry to match the updated offer
          await pool.query(
            `UPDATE compensation_history SET
              company = COALESCE($1, company),
              role_title = COALESCE($2, role_title),
              role_level = COALESCE($3, role_level),
              base_salary_current = COALESCE($4, base_salary_current),
              total_comp_current = COALESCE($5, total_comp_current),
              pto_days = COALESCE($6, pto_days),
              benefits_value = COALESCE($7, benefits_value),
              updated_at = NOW()
            WHERE offer_id = $8`,
            [
              updatedOffer.company,
              updatedOffer.role_title,
              updatedOffer.role_level,
              Number(updatedOffer.base_salary) || null,
              Number(updatedOffer.total_comp_year1) || Number(updatedOffer.base_salary) || null,
              Number(updatedOffer.pto_days) || null,
              (Number(updatedOffer.health_insurance_value) || 0) + (Number(updatedOffer.other_benefits_value) || 0),
              id
            ]
          );
          console.log(`✅ Compensation history synced for accepted offer ${id}`);
        }
      } catch (syncErr) {
        console.error("❌ Error syncing compensation history:", syncErr);
        // Don't fail the offer update if sync fails
      }
    }
    
    res.json({ offer: updatedOffer });
  } catch (err) {
    console.error("Error updating offer:", err);
    res.status(500).json({ error: "Failed to update offer" });
  }
});

// POST recalculate competing offers for all user's offers
router.post("/recalculate-competing", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all offers for this user
    const allOffers = await pool.query(
      `SELECT id, base_salary FROM offers WHERE user_id = $1 AND base_salary IS NOT NULL AND base_salary > 0`,
      [userId]
    );
    
    let updatedCount = 0;
    
    // For each offer, find competing offers and update
    for (const offer of allOffers.rows) {
      const competingOffers = await findCompetingOffers(userId, offer.base_salary, offer.id);
      
      // Update this offer with competing offers
      await pool.query(
        `UPDATE offers 
         SET competing_offers_count = $1, 
             competing_offers_ids = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          competingOffers.count,
          competingOffers.ids.length > 0 ? competingOffers.ids : null,
          offer.id
        ]
      );
      
      // Update each competing offer to include this one
      for (const competingId of competingOffers.ids) {
        const competingOffer = await pool.query(
          `SELECT competing_offers_ids FROM offers WHERE id = $1`,
          [competingId]
        );
        
        if (competingOffer.rows.length > 0) {
          const existingIds = competingOffer.rows[0].competing_offers_ids || [];
          if (!existingIds.includes(offer.id)) {
            const updatedIds = [...existingIds, offer.id];
            await pool.query(
              `UPDATE offers 
               SET competing_offers_count = $1, 
                   competing_offers_ids = $2,
                   updated_at = NOW()
               WHERE id = $3`,
              [updatedIds.length, updatedIds, competingId]
            );
          }
        }
      }
      
      if (competingOffers.count > 0) {
        updatedCount++;
      }
    }
    
    res.json({ 
      message: "Competing offers recalculated",
      totalOffers: allOffers.rows.length,
      offersWithCompeting: updatedCount
    });
  } catch (err) {
    console.error("Error recalculating competing offers:", err);
    res.status(500).json({ error: "Failed to recalculate competing offers" });
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
    
    console.log(`📝 Accepting offer ${id} for user ${userId}`);
    
    // Get offer
    const offerResult = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (offerResult.rows.length === 0) {
      console.error(`❌ Offer ${id} not found for user ${userId}`);
      return res.status(404).json({ error: "Offer not found" });
    }
    
    const offer = offerResult.rows[0];
    
    // Check if already accepted
    if (offer.offer_status === 'accepted') {
      // Check if compensation history already exists
      const existingComp = await pool.query(
        `SELECT * FROM compensation_history WHERE offer_id = $1`,
        [id]
      );
      
      if (existingComp.rows.length > 0) {
        return res.json({ 
          offer: offer,
          compensationHistory: existingComp.rows[0],
          message: "Offer already accepted"
        });
      }
    }

    // Check if user already has other accepted offers without end dates (active roles)
    const existingAcceptedOffers = await pool.query(
      `SELECT o.*, ch.end_date 
       FROM offers o
       LEFT JOIN compensation_history ch ON o.id = ch.offer_id
       WHERE o.user_id = $1 
         AND o.offer_status = 'accepted' 
         AND o.id != $2
         AND (ch.end_date IS NULL OR ch.end_date > CURRENT_DATE)
       ORDER BY o.decision_date DESC
       LIMIT 5`,
      [userId, id]
    );

    const hasActiveAcceptedOffers = existingAcceptedOffers.rows.length > 0;
    
    // Update offer status
    await pool.query(
      `UPDATE offers SET offer_status = 'accepted', decision_date = NOW() WHERE id = $1`,
      [id]
    );
    
    // Check if compensation_history table exists and has required columns
    try {
    // Create compensation history entry
    const compResult = await pool.query(
      `INSERT INTO compensation_history (
        user_id, offer_id, company, role_title, role_level, start_date,
        base_salary_start, total_comp_start, base_salary_current, total_comp_current,
        pto_days, benefits_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
          userId, 
          id, 
          offer.company || 'Unknown', 
          offer.role_title || 'Unknown', 
          offer.role_level || null,
        new Date().toISOString().split('T')[0],
          Number(offer.base_salary) || 0,
          Number(offer.total_comp_year1) || Number(offer.base_salary) || 0,
          Number(offer.base_salary) || 0,
          Number(offer.total_comp_year1) || Number(offer.base_salary) || 0,
          Number(offer.pto_days) || 0,
          (Number(offer.health_insurance_value) || 0) + (Number(offer.other_benefits_value) || 0)
        ]
      );
      
      console.log(`✅ Compensation history created for offer ${id}`);
    
    // Prepare response with warning if multiple active offers
    const response = { 
      offer: { ...offer, offer_status: 'accepted' },
      compensationHistory: compResult.rows[0]
    };

    if (hasActiveAcceptedOffers) {
      response.warning = `You already have ${existingAcceptedOffers.rows.length} other accepted offer(s) without end dates. This will create multiple active roles in your compensation history. Consider ending previous roles if you've moved to a new position.`;
      response.existingOffers = existingAcceptedOffers.rows.map(o => ({
        id: o.id,
        company: o.company,
        role_title: o.role_title,
        offer_date: o.offer_date
      }));
    }
    
    res.json(response);
    } catch (compErr) {
      console.error("❌ Error creating compensation history:", compErr);
      
      // If compensation_history table doesn't exist, still accept the offer
      if (compErr.message && compErr.message.includes('does not exist')) {
        console.warn("⚠️ compensation_history table not found, accepting offer without history entry");
        return res.json({ 
          offer: { ...offer, offer_status: 'accepted' },
          warning: "Compensation history table not found. Please run database migration."
        });
      }
      
      throw compErr; // Re-throw if it's a different error
    }
  } catch (err) {
    console.error("❌ Error accepting offer:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack
    });
    res.status(500).json({ 
      error: "Failed to accept offer",
      details: err.message,
      hint: "Check server logs for more details"
    });
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

