// ======================================
// REFERRAL REQUEST ROUTES
// ======================================

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to ensure user is authenticated
const authMiddleware = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ======================================
// REFERRAL REQUEST ENDPOINTS
// ======================================

// GET all referral requests for a user with filters
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const { status, contact_id, job_id, outcome } = req.query;
    
    let query = supabase
      .from('referral_requests')
      .select(`
        *,
        contact:professional_contacts(first_name, last_name, email, company, title),
        job:jobs(id, title, company)
      `)
      .eq('user_id', req.user.id)
      .order('requested_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (contact_id) query = query.eq('contact_id', contact_id);
    if (job_id) query = query.eq('job_id', job_id);
    
    // Handle outcome filter - "unknown" means NULL values
    if (outcome) {
      if (outcome === 'unknown') {
        query = query.is('referral_outcome', null);
      } else {
        query = query.eq('referral_outcome', outcome);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching referral requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single referral request
router.get('/requests/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referral_requests')
      .select(`
        *,
        contact:professional_contacts(first_name, last_name, email, company, title),
        job:jobs(id, title, company),
        followups:referral_followups(*)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Referral request not found' });

    res.json(data);
  } catch (err) {
    console.error('Error fetching referral request:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new referral request
router.post('/requests', authMiddleware, async (req, res) => {
  try {
    const {
      contact_id,
      job_id,
      job_title,
      company,
      referral_message,
      why_good_fit,
      industry_keywords,
      request_timing_score,
      personalization_score
    } = req.body;

    if (!contact_id || !job_title || !company) {
      return res.status(400).json({ error: 'Missing required fields: contact_id, job_title, company' });
    }

    // Get contact to verify ownership and get relationship strength
    const { data: contact, error: contactError } = await supabase
      .from('professional_contacts')
      .select('relationship_strength')
      .eq('id', contact_id)
      .eq('user_id', req.user.id)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { data, error } = await supabase
      .from('referral_requests')
      .insert([{
        user_id: req.user.id,
        contact_id,
        job_id: job_id || null,
        job_title,
        company,
        status: 'pending',
        referral_message,
        why_good_fit,
        industry_keywords,
        relationship_strength_before: contact.relationship_strength,
        request_timing_score: request_timing_score || 5,
        personalization_score: personalization_score || 5,
        requested_date: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Referral request created successfully',
      referralRequest: data[0]
    });
  } catch (err) {
    console.error('Error creating referral request:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE referral request status and details
router.put('/requests/:id', authMiddleware, async (req, res) => {
  try {
    const {
      status,
      response_date,
      referral_submitted_date,
      relationship_strength_after,
      relationship_impact,
      referral_outcome,
      followup_score,
      gratitude_expressed,
      referrer_notes
    } = req.body;

    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from('referral_requests')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Referral request not found' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (response_date) updateData.response_date = response_date;
    if (referral_submitted_date) updateData.referral_submitted_date = referral_submitted_date;
    if (relationship_strength_after) updateData.relationship_strength_after = relationship_strength_after;
    if (relationship_impact) updateData.relationship_impact = relationship_impact;
    // Handle referral_outcome - explicitly allow null for "Unknown"
    if (referral_outcome !== undefined) updateData.referral_outcome = referral_outcome || null;
    if (followup_score) updateData.followup_score = followup_score;
    if (gratitude_expressed !== undefined) updateData.gratitude_expressed = gratitude_expressed;
    if (referrer_notes) updateData.referrer_notes = referrer_notes;

    const { data, error } = await supabase
      .from('referral_requests')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({
      message: 'Referral request updated successfully',
      referralRequest: data[0]
    });
  } catch (err) {
    console.error('Error updating referral request:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE referral request
router.delete('/requests/:id', authMiddleware, async (req, res) => {
  try {
    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from('referral_requests')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Referral request not found' });
    }

    const { error } = await supabase
      .from('referral_requests')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Referral request deleted successfully' });
  } catch (err) {
    console.error('Error deleting referral request:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERRAL FOLLOWUP ENDPOINTS
// ======================================

// GET followups for a referral request
router.get('/requests/:id/followups', authMiddleware, async (req, res) => {
  try {
    // Verify ownership of referral request
    const { data: referral, error: refError } = await supabase
      .from('referral_requests')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (refError || !referral) {
      return res.status(404).json({ error: 'Referral request not found' });
    }

    const { data, error } = await supabase
      .from('referral_followups')
      .select('*')
      .eq('referral_request_id', req.params.id)
      .order('followup_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching followups:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE followup for referral request
router.post('/requests/:id/followups', authMiddleware, async (req, res) => {
  try {
    const { followup_type, followup_message, followup_date, notes } = req.body;

    // Verify ownership
    const { data: referral, error: refError } = await supabase
      .from('referral_requests')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (refError || !referral) {
      return res.status(404).json({ error: 'Referral request not found' });
    }

    if (!followup_type || !followup_date) {
      return res.status(400).json({ error: 'Missing required fields: followup_type, followup_date' });
    }

    const { data, error } = await supabase
      .from('referral_followups')
      .insert([{
        referral_request_id: req.params.id,
        followup_type,
        followup_message,
        followup_date,
        notes,
        completed: false
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Followup created successfully',
      followup: data[0]
    });
  } catch (err) {
    console.error('Error creating followup:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE followup status
router.put('/followups/:id', authMiddleware, async (req, res) => {
  try {
    const { completed, completed_date, notes } = req.body;

    // Verify ownership through referral request
    const { data: followup, error: followupError } = await supabase
      .from('referral_followups')
      .select('referral_request_id')
      .eq('id', req.params.id)
      .single();

    if (followupError || !followup) {
      return res.status(404).json({ error: 'Followup not found' });
    }

    const { data: referral, error: refError } = await supabase
      .from('referral_requests')
      .select('id')
      .eq('id', followup.referral_request_id)
      .eq('user_id', req.user.id)
      .single();

    if (refError || !referral) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = {};
    if (completed !== undefined) updateData.completed = completed;
    if (completed_date) updateData.completed_date = completed_date;
    if (notes) updateData.notes = notes;

    const { data, error } = await supabase
      .from('referral_followups')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({
      message: 'Followup updated successfully',
      followup: data[0]
    });
  } catch (err) {
    console.error('Error updating followup:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERRAL TEMPLATES ENDPOINTS
// ======================================

// GET all templates for user
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referral_templates')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new template
router.post('/templates', authMiddleware, async (req, res) => {
  try {
    const { template_name, template_type, template_text, industry_focus, is_default } = req.body;

    if (!template_name || !template_type || !template_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('referral_templates')
      .insert([{
        user_id: req.user.id,
        template_name,
        template_type,
        template_text,
        industry_focus,
        is_default: is_default || false
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Template created successfully',
      template: data[0]
    });
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERRAL STATISTICS ENDPOINTS
// ======================================

// GET referral statistics for user
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referral_statistics')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no stats exist, return defaults
    if (!data) {
      return res.json({
        total_requests: 0,
        successful_referrals: 0,
        referrals_resulted_in_interview: 0,
        referrals_resulted_in_offer: 0,
        average_response_time_days: null,
        average_relationship_impact_score: null,
        total_interviews_from_referrals: 0,
        total_offers_from_referrals: 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET analytics dashboard data
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    // Get all referral requests
    const { data: requests, error: requestsError } = await supabase
      .from('referral_requests')
      .select('status, referral_outcome, requested_date, response_date, relationship_impact')
      .eq('user_id', req.user.id);

    if (requestsError) throw requestsError;

    // Calculate analytics
    const totalRequests = requests.length;
    const statusCounts = {};
    const outcomeCounts = {};
    let totalResponseTime = 0;
    let responseCounts = 0;

    requests.forEach(req => {
      statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
      if (req.referral_outcome) {
        outcomeCounts[req.referral_outcome] = (outcomeCounts[req.referral_outcome] || 0) + 1;
      }
      if (req.response_date && req.requested_date) {
        const diff = new Date(req.response_date) - new Date(req.requested_date);
        totalResponseTime += diff;
        responseCounts++;
      }
    });

    const averageResponseTime = responseCounts > 0 ? Math.round(totalResponseTime / responseCounts / (1000 * 60 * 60 * 24)) : null;
    const successRate = totalRequests > 0 ? ((statusCounts['referred'] || 0) / totalRequests * 100).toFixed(2) : 0;

    res.json({
      totalRequests,
      statusBreakdown: statusCounts,
      outcomeBreakdown: outcomeCounts,
      averageResponseTimeDays: averageResponseTime,
      successRate: `${successRate}%`,
      interviewsFromReferrals: outcomeCounts['interview_scheduled'] || 0,
      offersFromReferrals: outcomeCounts['job_offer'] || 0
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERRAL SUGGESTIONS/RECOMMENDATIONS
// ======================================

// GET suggested contacts for a job (based on industry, company connections, etc.)
router.get('/suggestions/contacts/:job_id', authMiddleware, async (req, res) => {
  try {
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.job_id)
      .eq('user_id', req.user.id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Find contacts in the same industry or company
    const { data: contacts, error: contactsError } = await supabase
      .from('professional_contacts')
      .select('*')
      .eq('user_id', req.user.id)
      .or(`industry.ilike.%${job.industry}%, company.ilike.%${job.company}%`)
      .order('relationship_strength', { ascending: false })
      .limit(10);

    if (contactsError) throw contactsError;

    res.json({
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        industry: job.industry
      },
      suggestedContacts: contacts
    });
  } catch (err) {
    console.error('Error getting contact suggestions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET optimal timing recommendations for a referral request
router.get('/recommendations/timing/:contact_id', authMiddleware, async (req, res) => {
  try {
    // Get contact's interaction history
    const { data: contact, error: contactError } = await supabase
      .from('professional_contacts')
      .select('id, last_interaction_date:contact_interactions(interaction_date)')
      .eq('id', req.params.contact_id)
      .eq('user_id', req.user.id)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get ALL referral requests to this contact (regardless of status)
    const { data: allReferrals, error: refError } = await supabase
      .from('referral_requests')
      .select('requested_date, status')
      .eq('contact_id', req.params.contact_id)
      .eq('user_id', req.user.id)
      .order('requested_date', { ascending: false })
      .limit(5);

    if (refError) throw refError;

    // Calculate recommendations
    const now = new Date();
    let recommendedTiming = 'good';
    let reason = '';
    let daysToWait = 0;
    let totalReferralCount = allReferrals?.length || 0;

    // Check if already MORE THAN 2 total referrals to this contact
    if (totalReferralCount > 2) {
      recommendedTiming = 'multiple';
      reason = `You've already made ${totalReferralCount} referrals to this contact. Consider reaching out to someone new to avoid overusing your network.`;
      daysToWait = 0;
    } else if (allReferrals && allReferrals.length > 0) {
      const lastRequest = new Date(recentReferrals[0].requested_date);
      const daysSinceLast = Math.floor((now - lastRequest) / (1000 * 60 * 60 * 24));

      if (daysSinceLast < 7) {
        recommendedTiming = 'wait';
        daysToWait = 7 - daysSinceLast;
        reason = 'Too soon - consider waiting to avoid overwhelming your contact';
      } else if (daysSinceLast < 30) {
        recommendedTiming = 'caution';
        reason = 'Recent request - consider if your contact might be busy';
      } else {
        recommendedTiming = 'good';
        reason = 'Good timing - enough time has passed';
      }
    }

    res.json({
      recommendedTiming,
      reason,
      daysToWait: daysToWait > 0 ? daysToWait : 0,
      recentReferralCount: allReferrals?.length || 0
    });
  } catch (err) {
    console.error('Error getting timing recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
