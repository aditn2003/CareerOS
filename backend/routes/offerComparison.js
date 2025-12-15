// ======================================
// OFFER COMPARISON ROUTES
// ======================================

import express from 'express';
import pool from '../db/pool.js';
import { auth } from '../auth.js';
import OpenAI from 'openai';

const router = express.Router();
router.use(auth);

// Initialize OpenAI if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Log API key status on module load
if (openai && process.env.OPENAI_API_KEY) {
  const keyPreview = process.env.OPENAI_API_KEY.substring(0, 10) + '...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4);
  console.log(`✅ [OFFER COMPARISON] OpenAI initialized with API key: ${keyPreview}`);
} else {
  console.warn('⚠️ [OFFER COMPARISON] OpenAI not available - OPENAI_API_KEY missing');
}

// Helper: Calculate total compensation including benefits
function calculateTotalCompensation(offer) {
  const base = Number(offer.base_salary) || 0;
  const signing = Number(offer.signing_bonus) || 0;
  const bonus = offer.annual_bonus_guaranteed 
    ? base * (Number(offer.annual_bonus_percent) || 0) / 100
    : base * (Number(offer.annual_bonus_percent) || 0) / 100 * 0.7; // Assume 70% of target
  
  // Benefits value
  const healthInsurance = Number(offer.health_insurance_value) || 0;
  const retirementMatch = Math.min(
    base * (Number(offer.retirement_match_percent) || 0) / 100,
    Number(offer.retirement_match_cap) || Infinity
  );
  const ptoValue = (Number(offer.pto_days) || 0) * (base / 260); // Assuming 260 working days
  const otherBenefits = Number(offer.other_benefits_value) || 0;
  const totalBenefits = healthInsurance + retirementMatch + ptoValue + otherBenefits;
  
  // Equity (vested over 4 years for year 1, full value for year 4)
  const equity = Number(offer.equity_value) || 0;
  
  const year1 = base + signing + bonus + (equity / 4) + totalBenefits;
  const year4 = (base * 4) + signing + (bonus * 4) + equity + (totalBenefits * 4);
  
  return {
    base,
    signing,
    bonus: Math.round(bonus),
    equity,
    benefits: Math.round(totalBenefits),
    year1: Math.round(year1),
    year4: Math.round(year4)
  };
}

// Helper: Fetch cost of living from OpenAI (ChatGPT) with retry logic
async function fetchCostOfLivingFromOpenAI(location, maxRetries = 3) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    console.warn('⚠️ [COL] OpenAI not available - OPENAI_API_KEY missing');
    return null;
  }

  const prompt = `What is the cost of living index for ${location}? Return only a number. US average is 100. Example: San Francisco, CA is 169, New York, NY is 163, Austin, TX is 105.`;

  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      if (retryCount === 0) {
        console.log(`🤖 [COL] Fetching cost of living for "${location}" from OpenAI...`);
      } else {
        console.log(`🔄 [COL] Retrying OpenAI request for "${location}" (attempt ${retryCount + 1}/${maxRetries})...`);
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cost of living data expert. Return only a number, no text or explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 50,
      });

      const responseText = completion.choices[0]?.message?.content?.trim() || '';
      
      // Extract number from response (handle various formats)
      let colIndex = null;
      
      // Try to extract number from response
      const numberMatch = responseText.match(/\d+(?:\.\d+)?/);
      if (numberMatch) {
        colIndex = parseFloat(numberMatch[0]);
      } else {
        // Try parsing as JSON if it's wrapped
        try {
          const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (typeof parsed === 'number') {
            colIndex = parsed;
          } else if (parsed.col_index) {
            colIndex = parseFloat(parsed.col_index);
          }
        } catch (parseError) {
          console.error('⚠️ [COL] Failed to parse OpenAI response:', responseText);
          return null;
        }
      }

      if (colIndex && colIndex > 0 && colIndex < 500) {
        console.log(`✅ [COL] OpenAI returned COL index: ${colIndex} for "${location}"`);
        
        // Store in database for future use
        try {
          await pool.query(
            `INSERT INTO cost_of_living_index (location, col_index, data_source, data_year)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (location) DO UPDATE SET
               col_index = EXCLUDED.col_index,
               data_source = EXCLUDED.data_source,
               data_year = EXCLUDED.data_year`,
            [
              location,
              colIndex,
              'openai_estimate',
              new Date().getFullYear()
            ]
          );
          console.log(`💾 [COL] Stored COL data for "${location}" in database`);
        } catch (dbError) {
          console.warn('⚠️ [COL] Failed to store COL data in database:', dbError.message);
          // Continue even if storage fails
        }
        
        return colIndex;
      }

      return null;
    } catch (err) {
      lastError = err;
      retryCount++;
      
      // Check if it's a rate limit error (429)
      const isRateLimit = err.status === 429 || 
                         err.statusCode === 429 ||
                         err.message?.includes('429') || 
                         err.message?.includes('quota') ||
                         err.message?.includes('rate limit') ||
                         err.message?.includes('rate_limit_exceeded') ||
                         err.message?.includes('insufficient_quota');
      
      if (isRateLimit && retryCount < maxRetries) {
        // Exponential backoff: 15s, 30s, 60s
        const waitTime = Math.min(15000 * Math.pow(2, retryCount - 1), 60000);
        
        console.warn(`⚠️ [COL] Rate limit hit for "${location}". Waiting ${waitTime/1000}s before retry ${retryCount + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If it's not a rate limit error or we've exhausted retries, break
      if (!isRateLimit) {
        console.error(`❌ [COL] Error fetching from OpenAI (non-rate-limit):`, err.message);
        break;
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    const isRateLimit = lastError.message?.includes('quota') || lastError.message?.includes('429');
    if (isRateLimit) {
      console.error(`❌ [COL] OpenAI quota exceeded after ${maxRetries} retries for "${location}". Using default COL index.`);
    } else {
      console.error(`❌ [COL] Error fetching from OpenAI after ${maxRetries} retries:`, lastError.message);
    }
  }
  
  return null;
}

// Helper: Get cost of living index for location
async function getCostOfLivingIndex(location) {
  if (!location) return 100; // Default to US average
  
  try {
    // First, try exact match in database
    const result = await pool.query(
      `SELECT col_index FROM cost_of_living_index WHERE location = $1 LIMIT 1`,
      [location]
    );
    
    if (result.rows.length > 0) {
      const colIndex = parseFloat(result.rows[0].col_index) || 100;
      console.log(`✅ [COL] Found COL index ${colIndex} for "${location}" in database`);
      return colIndex;
    }
    
    // Try to find partial match (city name only)
    const cityName = location.split(',')[0]?.trim();
    if (cityName) {
      const partialResult = await pool.query(
        `SELECT col_index FROM cost_of_living_index 
         WHERE location ILIKE $1 LIMIT 1`,
        [`%${cityName}%`]
      );
      
      if (partialResult.rows.length > 0) {
        const colIndex = parseFloat(partialResult.rows[0].col_index) || 100;
        console.log(`✅ [COL] Found COL index ${colIndex} for "${location}" (partial match: ${cityName})`);
        return colIndex;
      }
    }
    
    // If not in database, try fetching from OpenAI
    console.log(`🔍 [COL] Location "${location}" not found in database, fetching from OpenAI...`);
    const openaiColIndex = await fetchCostOfLivingFromOpenAI(location);
    
    if (openaiColIndex !== null && openaiColIndex > 0) {
      return openaiColIndex;
    }
    
    // Default to US average if all else fails
    console.log(`⚠️ [COL] Using default COL index 100 (US average) for "${location}"`);
    return 100;
  } catch (err) {
    console.error('❌ [COL] Error fetching COL index:', err);
    return 100; // Default to US average on error
  }
}

// Helper: Calculate adjusted compensation for cost of living
function adjustForCostOfLiving(compensation, colIndex, baseColIndex = 100) {
  const adjustmentFactor = baseColIndex / colIndex;
  return {
    adjustedYear1: Math.round(compensation.year1 * adjustmentFactor),
    adjustedYear4: Math.round(compensation.year4 * adjustmentFactor),
    adjustmentFactor: parseFloat(adjustmentFactor.toFixed(2))
  };
}


// Helper: Score non-financial factors (1-10 scale) - Fallback when AI is not available
function scoreNonFinancialFactors(offer, userPreferences = {}) {
  const scores = {
    cultureFit: 5,
    growthOpportunities: 5,
    workLifeBalance: 5,
    remoteFlexibility: 5
  };
  
  // Score based on offer data
  if (offer.location_type === 'remote') {
    scores.remoteFlexibility = 10;
  } else if (offer.location_type === 'hybrid') {
    scores.remoteFlexibility = 7;
  } else if (offer.location_type === 'flexible') {
    scores.remoteFlexibility = 8;
  } else {
    scores.remoteFlexibility = 3;
  }
  
  // Company size impact on growth
  if (offer.company_size === 'startup' || offer.company_size === 'small') {
    scores.growthOpportunities = 8;
  } else if (offer.company_size === 'medium') {
    scores.growthOpportunities = 6;
  } else {
    scores.growthOpportunities = 5;
  }
  
  // PTO days impact on work-life balance
  if (offer.pto_days >= 25) {
    scores.workLifeBalance = 9;
  } else if (offer.pto_days >= 20) {
    scores.workLifeBalance = 7;
  } else if (offer.pto_days >= 15) {
    scores.workLifeBalance = 5;
  } else {
    scores.workLifeBalance = 3;
  }
  
  // Remote flexibility based on location type
  if (offer.location_type === 'remote') {
    scores.remoteFlexibility = 10;
  } else if (offer.location_type === 'hybrid') {
    scores.remoteFlexibility = 7;
  } else if (offer.location_type === 'flexible') {
    scores.remoteFlexibility = 8;
  } else {
    scores.remoteFlexibility = 3;
  }
  
  // Override with user preferences if provided
  if (userPreferences.cultureFit !== undefined) scores.cultureFit = userPreferences.cultureFit;
  if (userPreferences.growthOpportunities !== undefined) scores.growthOpportunities = userPreferences.growthOpportunities;
  if (userPreferences.workLifeBalance !== undefined) scores.workLifeBalance = userPreferences.workLifeBalance;
  if (userPreferences.remoteFlexibility !== undefined) scores.remoteFlexibility = userPreferences.remoteFlexibility;
  
  // Calculate weighted average (default weights for 4 factors)
  const weights = {
    cultureFit: 0.25,
    growthOpportunities: 0.30,
    workLifeBalance: 0.25,
    remoteFlexibility: 0.20
  };
  
  const overallScore = Object.keys(scores).reduce((sum, key) => {
    return sum + (scores[key] * (weights[key] || 0));
  }, 0);
  
  return {
    ...scores,
    overallScore: parseFloat(overallScore.toFixed(2))
  };
}

// Helper: Calculate weighted total score
function calculateWeightedScore(offer, financialWeight = 0.6, nonFinancialWeight = 0.4, maxCompensation = 0) {
  // Normalize financial score (0-10 scale based on max compensation)
  const financialScore = maxCompensation > 0 
    ? (offer.compensation.year1 / maxCompensation) * 10 
    : 5;
  
  // Get non-financial score
  const nonFinancialScore = offer.nonFinancialScore.overallScore;
  
  // Calculate weighted total
  const totalScore = (financialScore * financialWeight) + (nonFinancialScore * nonFinancialWeight);
  
  return {
    financialScore: parseFloat(financialScore.toFixed(2)),
    nonFinancialScore: parseFloat(nonFinancialScore.toFixed(2)),
    totalScore: parseFloat(totalScore.toFixed(2))
  };
}

// Helper: Generate negotiation recommendations
function generateNegotiationRecommendations(offer, allOffers) {
  const recommendations = [];
  
  // Compare with other offers
  const higherOffers = allOffers.filter(o => 
    o.id !== offer.id && 
    o.compensation.year1 > offer.compensation.year1
  );
  
  if (higherOffers.length > 0) {
    const highestOffer = higherOffers.reduce((max, o) => 
      o.compensation.year1 > max.compensation.year1 ? o : max
    );
    const difference = highestOffer.compensation.year1 - offer.compensation.year1;
    
    recommendations.push({
      type: 'competing_offer',
      priority: 'high',
      title: 'Competing Offer Leverage',
      message: `You have a competing offer from ${highestOffer.company} that's $${difference.toLocaleString()} higher. Use this as leverage.`,
      suggestedAction: `Request ${Math.round((difference / offer.compensation.year1) * 100)}% increase to match or exceed competing offer`
    });
  }
  
  // Check if base salary is low compared to total comp
  const basePercentage = (offer.compensation.base / offer.compensation.year1) * 100;
  if (basePercentage < 70) {
    recommendations.push({
      type: 'salary_structure',
      priority: 'medium',
      title: 'Base Salary Structure',
      message: `Your base salary is only ${basePercentage.toFixed(1)}% of total compensation. Consider negotiating for a higher base.`,
      suggestedAction: 'Request 10-15% increase in base salary for more stability'
    });
  }
  
  // Check equity value
  if (offer.equity_type !== 'none' && offer.equity_value > 0) {
    const equityPercentage = (offer.compensation.equity / offer.compensation.year1) * 100;
    if (equityPercentage < 5) {
      recommendations.push({
        type: 'equity',
        priority: 'low',
        title: 'Equity Consideration',
        message: `Equity represents ${equityPercentage.toFixed(1)}% of total compensation. Consider negotiating for more equity.`,
        suggestedAction: 'Request additional equity or faster vesting schedule'
      });
    }
  }
  
  // Check benefits
  if (offer.pto_days < 20) {
    recommendations.push({
      type: 'benefits',
      priority: 'medium',
      title: 'PTO Negotiation',
      message: `You have ${offer.pto_days} PTO days. Industry standard is 20-25 days.`,
      suggestedAction: 'Request additional PTO days (target: 20-25 days)'
    });
  }
  
  if (!offer.retirement_match_percent || offer.retirement_match_percent < 3) {
    recommendations.push({
      type: 'benefits',
      priority: 'low',
      title: 'Retirement Benefits',
      message: '401k match is below industry standard (typically 3-6%).',
      suggestedAction: 'Request improved 401k matching (target: 3-6%)'
    });
  }
  
  return recommendations;
}

// GET comparison data for multiple offers
router.get('/compare', async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerIds, includeArchived } = req.query;
    
    // Parse offer IDs
    const ids = offerIds ? offerIds.split(',').map(id => parseInt(id.trim())) : [];
    
    // First, get all offers for the user
    let query = `SELECT * FROM offers WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;
    
    if (ids.length > 0) {
      query += ` AND id = ANY($${paramIndex}::int[])`;
      params.push(ids);
      paramIndex++;
    } else {
      // Get all pending/active offers
      if (includeArchived !== 'true') {
        query += ` AND offer_status IN ('pending', 'accepted')`;
      }
    }
    
    query += ` ORDER BY offer_date DESC`;
    
    console.log(`🔍 [OFFER COMPARISON] Query: ${query}`);
    console.log(`🔍 [OFFER COMPARISON] Params:`, params);
    
    const { rows: allOffers } = await pool.query(query, params);
    
    console.log(`📦 [OFFER COMPARISON] Found ${allOffers.length} offer(s) from database`);
    if (allOffers.length > 0) {
      console.log(`📦 [OFFER COMPARISON] Sample offers:`, allOffers.slice(0, 3).map(o => ({
        id: o.id,
        company: o.company,
        job_id: o.job_id,
        offer_status: o.offer_status
      })));
    }
    
    // Get all jobs to check their status
    let jobsMap = new Map(); // job_id -> { status, isArchived }
    try {
      const jobsResult = await pool.query(
        `SELECT id, status, "isArchived" 
         FROM jobs 
         WHERE user_id = $1`,
        [userId]
      );
      
      console.log(`📋 [OFFER COMPARISON] Found ${jobsResult.rows.length} job(s) in database`);
      
      for (const job of jobsResult.rows) {
        jobsMap.set(Number(job.id), {
          status: job.status ? job.status.toLowerCase().trim() : '',
          isArchived: job.isArchived === true
        });
      }
      
      if (jobsMap.size > 0) {
        console.log(`📋 [OFFER COMPARISON] Sample jobs in map:`, Array.from(jobsMap.entries()).slice(0, 5).map(([id, data]) => ({
          id,
          status: data.status,
          isArchived: data.isArchived
        })));
      }
    } catch (err) {
      console.warn('Could not fetch jobs for filtering:', err.message);
    }
    
    // Filter offers: Exclude offers linked to archived or rejected jobs
    // Only include offers that are:
    // 1. Standalone (no job_id), OR
    // 2. Linked to active, non-archived, non-rejected jobs
    console.log(`📊 [OFFER COMPARISON] Processing ${allOffers.length} offer(s), ${jobsMap.size} job(s) in lookup map`);
    
    const validOffers = allOffers.filter(offer => {
      if (!offer.job_id) {
        // Standalone offer without job_id - include it
        console.log(`✅ [OFFER COMPARISON] Including offer ${offer.id} (${offer.company}) - no job_id (standalone offer)`);
        return true;
      }
      
      const jobId = Number(offer.job_id);
      const job = jobsMap.get(jobId);
      
      // Exclude if job doesn't exist
      if (!job) {
        console.log(`⚠️ [OFFER COMPARISON] Skipping offer ${offer.id} (${offer.company}) - linked job ${jobId} does not exist`);
        return false;
      }
      
      // Exclude if job is archived
      if (job.isArchived) {
        console.log(`⚠️ [OFFER COMPARISON] Skipping offer ${offer.id} (${offer.company}) - linked job ${jobId} is archived`);
        return false;
      }
      
      // Exclude if job is rejected
      const normalizedStatus = job.status ? job.status.toLowerCase().trim() : '';
      if (['rejected', 'declined', 'withdrawn', 'not interested'].includes(normalizedStatus)) {
        console.log(`⚠️ [OFFER COMPARISON] Skipping offer ${offer.id} (${offer.company}) - linked job ${jobId} has status: ${normalizedStatus}`);
        return false;
      }
      
      // Job is valid - include the offer
      console.log(`✅ [OFFER COMPARISON] Including offer ${offer.id} (${offer.company}) - linked job ${jobId} is valid (status: ${normalizedStatus || 'none'})`);
      return true;
    });
    
    const offers = validOffers;
    
    console.log(`✅ [OFFER COMPARISON] Final result: ${offers.length} valid offer(s) out of ${allOffers.length} total (filtered ${allOffers.length - offers.length})`);
    
    if (offers.length === 0 && allOffers.length > 0) {
      console.warn(`⚠️ [OFFER COMPARISON] All ${allOffers.length} offer(s) were filtered out. Check logs above for reasons.`);
    }
    
    if (offers.length === 0) {
      return res.json({ offers: [], comparison: null });
    }
    
    // Process each offer
    const processedOffers = await Promise.all(offers.map(async (offer) => {
      const compensation = calculateTotalCompensation(offer);
      const colIndex = await getCostOfLivingIndex(offer.location);
      const adjusted = adjustForCostOfLiving(compensation, colIndex);
      
      // Check if user has saved custom scores, otherwise use auto-calculation
      let nonFinancialScore;
      let scoreSource = 'auto';
      
      if (offer.non_financial_scores) {
        // Use saved user scores
        try {
          const savedScores = typeof offer.non_financial_scores === 'string' 
            ? JSON.parse(offer.non_financial_scores)
            : offer.non_financial_scores;
          
          // Ensure all required scores are present
          const completeScores = {
            cultureFit: savedScores.cultureFit || 5,
            growthOpportunities: savedScores.growthOpportunities || 5,
            workLifeBalance: savedScores.workLifeBalance || 5,
            remoteFlexibility: savedScores.remoteFlexibility || 5
          };
          
          // Calculate overall score from saved scores
          const weights = {
            cultureFit: 0.25,
            growthOpportunities: 0.30,
            workLifeBalance: 0.25,
            remoteFlexibility: 0.20
          };
          
          const overallScore = Object.keys(completeScores).reduce((sum, key) => {
            return sum + ((completeScores[key] || 5) * (weights[key] || 0));
          }, 0);
          
          nonFinancialScore = {
            ...completeScores,
            overallScore: parseFloat(overallScore.toFixed(2))
          };
          scoreSource = 'user';
          console.log(`✅ [OFFER COMPARISON] Using saved scores for offer ${offer.id}:`, completeScores);
        } catch (err) {
          console.warn('Error parsing saved scores, using auto-calculation:', err);
          nonFinancialScore = scoreNonFinancialFactors(offer);
        }
      } else {
        // Use auto-calculation
        nonFinancialScore = scoreNonFinancialFactors(offer);
      }
      
      return {
        ...offer,
        compensation,
        colIndex,
        adjustedCompensation: adjusted,
        nonFinancialScore,
        scoreSource
      };
    }));
    
    // Find max compensation for normalization
    const maxCompensation = Math.max(...processedOffers.map(o => o.compensation.year1));
    
    // Calculate weighted scores
    const offersWithScores = processedOffers.map(offer => ({
      ...offer,
      weightedScore: calculateWeightedScore(offer, 0.6, 0.4, maxCompensation)
    }));
    
    // Generate negotiation recommendations for each
    const offersWithRecommendations = offersWithScores.map(offer => ({
      ...offer,
      negotiationRecommendations: generateNegotiationRecommendations(offer, offersWithScores)
    }));
    
    // Sort by total score (descending)
    offersWithRecommendations.sort((a, b) => b.weightedScore.totalScore - a.weightedScore.totalScore);
    
    res.json({
      offers: offersWithRecommendations,
      comparison: {
        maxCompensation,
        averageCompensation: Math.round(
          processedOffers.reduce((sum, o) => sum + o.compensation.year1, 0) / processedOffers.length
        ),
        totalOffers: processedOffers.length
      }
    });
  } catch (err) {
    console.error('Error fetching comparison data:', err);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// POST scenario analysis
router.post('/scenario', async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerId, changes } = req.body;
    
    // Get the original offer
    const { rows } = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND user_id = $2`,
      [offerId, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    const originalOffer = rows[0];
    
    // Apply changes
    const modifiedOffer = {
      ...originalOffer,
      ...changes
    };
    
    // Recalculate compensation
    const compensation = calculateTotalCompensation(modifiedOffer);
    const colIndex = await getCostOfLivingIndex(modifiedOffer.location);
    const adjusted = adjustForCostOfLiving(compensation, colIndex);
    const nonFinancialScore = scoreNonFinancialFactors(modifiedOffer);
    
    // Calculate improvement
    const originalComp = calculateTotalCompensation(originalOffer);
    const improvement = {
      year1: compensation.year1 - originalComp.year1,
      year1Percent: ((compensation.year1 - originalComp.year1) / originalComp.year1) * 100,
      year4: compensation.year4 - originalComp.year4,
      year4Percent: ((compensation.year4 - originalComp.year4) / originalComp.year4) * 100
    };
    
    res.json({
      original: {
        compensation: originalComp,
        nonFinancialScore: scoreNonFinancialFactors(originalOffer)
      },
      modified: {
        compensation,
        adjustedCompensation: adjusted,
        nonFinancialScore
      },
      improvement
    });
  } catch (err) {
    console.error('Error running scenario analysis:', err);
    res.status(500).json({ error: 'Failed to run scenario analysis' });
  }
});

// PUT archive offer
router.put('/:id/archive', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason, notes } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE offers 
       SET offer_status = 'rejected',
           decision_date = CURRENT_DATE,
           negotiation_notes = COALESCE(negotiation_notes || '', '') || 
             CASE WHEN $3 IS NOT NULL THEN E'\n\nArchived: ' || $3 ELSE '' END ||
             CASE WHEN $4 IS NOT NULL THEN E'\nReason: ' || $4 ELSE '' END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, notes || '', reason || '']
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json({ offer: rows[0], message: 'Offer archived successfully' });
  } catch (err) {
    console.error('Error archiving offer:', err);
    res.status(500).json({ error: 'Failed to archive offer' });
  }
});

// PUT update non-financial scores
router.put('/:id/scores', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { scores } = req.body;
    
    // Validate scores object
    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ error: 'Invalid scores data' });
    }
    
    // Validate and normalize scores (ensure they're 1-10)
    const normalizedScores = {
      cultureFit: Math.max(1, Math.min(10, parseInt(scores.cultureFit) || 5)),
      growthOpportunities: Math.max(1, Math.min(10, parseInt(scores.growthOpportunities) || 5)),
      workLifeBalance: Math.max(1, Math.min(10, parseInt(scores.workLifeBalance) || 5)),
      remoteFlexibility: Math.max(1, Math.min(10, parseInt(scores.remoteFlexibility) || 5))
    };
    
    // Verify offer exists
    const { rows } = await pool.query(
      `SELECT id FROM offers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    // Check if non_financial_scores column exists, if not store in negotiation_notes
    // First, try to add the column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE offers 
        ADD COLUMN IF NOT EXISTS non_financial_scores JSONB
      `);
    } catch (alterErr) {
      // Column might already exist or there's a permission issue
      console.warn('Could not add non_financial_scores column:', alterErr.message);
    }
    
    // Store scores as JSONB
    await pool.query(
      `UPDATE offers 
       SET non_financial_scores = $3::jsonb,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, userId, JSON.stringify(normalizedScores)]
    );
    
    console.log(`✅ [OFFER COMPARISON] Saved scores for offer ${id}:`, normalizedScores);
    
    res.json({ 
      message: 'Scores updated successfully', 
      scores: normalizedScores 
    });
  } catch (err) {
    console.error('Error updating scores:', err);
    res.status(500).json({ error: 'Failed to update scores', details: err.message });
  }
});

// PUT update offer financial values
router.put('/:id/financial', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { base_salary, signing_bonus, annual_bonus_percent, equity_value, pto_days, health_insurance_value, retirement_match_percent, retirement_match_cap, other_benefits_value } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (base_salary !== undefined) {
      updates.push(`base_salary = $${paramIndex}`);
      values.push(parseFloat(base_salary) || 0);
      paramIndex++;
    }

    if (signing_bonus !== undefined) {
      updates.push(`signing_bonus = $${paramIndex}`);
      values.push(parseFloat(signing_bonus) || 0);
      paramIndex++;
    }

    if (annual_bonus_percent !== undefined) {
      updates.push(`annual_bonus_percent = $${paramIndex}`);
      values.push(parseFloat(annual_bonus_percent) || 0);
      paramIndex++;
    }

    if (equity_value !== undefined) {
      updates.push(`equity_value = $${paramIndex}`);
      values.push(parseFloat(equity_value) || 0);
      paramIndex++;
    }

    if (pto_days !== undefined) {
      updates.push(`pto_days = $${paramIndex}`);
      values.push(parseInt(pto_days) || 0);
      paramIndex++;
    }

    if (health_insurance_value !== undefined) {
      updates.push(`health_insurance_value = $${paramIndex}`);
      values.push(parseFloat(health_insurance_value) || 0);
      paramIndex++;
    }

    if (retirement_match_percent !== undefined) {
      updates.push(`retirement_match_percent = $${paramIndex}`);
      values.push(parseFloat(retirement_match_percent) || 0);
      paramIndex++;
    }

    if (retirement_match_cap !== undefined) {
      updates.push(`retirement_match_cap = $${paramIndex}`);
      values.push(parseFloat(retirement_match_cap) || 0);
      paramIndex++;
    }

    if (other_benefits_value !== undefined) {
      updates.push(`other_benefits_value = $${paramIndex}`);
      values.push(parseFloat(other_benefits_value) || 0);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at and WHERE clause
    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const query = `
      UPDATE offers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json({ message: 'Financial values updated successfully', offer: rows[0] });
  } catch (err) {
    console.error('Error updating financial values:', err);
    res.status(500).json({ error: 'Failed to update financial values' });
  }
});

// PUT update career milestones and notes
router.put('/:id/career', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { milestones, notes } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (milestones !== undefined) {
      updates.push(`career_milestones = $${paramIndex}`);
      values.push(JSON.stringify(milestones));
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`career_notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const query = `
      UPDATE offers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json({ message: 'Career data updated successfully', offer: rows[0] });
  } catch (err) {
    console.error('Error updating career data:', err);
    res.status(500).json({ error: 'Failed to update career data' });
  }
});

export default router;


