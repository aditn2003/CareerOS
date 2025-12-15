// ======================================
// REFERRAL REQUEST ROUTES
// ======================================

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logApiUsage, logApiError } from '../utils/apiTrackingService.js';

dotenv.config();

const { Pool } = pkg;
const router = express.Router();

// Database pool for querying profiles (not in Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Resend client for sending emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to ensure user is authenticated
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  try {
    const token = header.split(' ')[1]; // Extract token from "Bearer <token>"
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set req.user so routes can use it
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized - Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
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

    // Get the existing referral request to check current status and job_id
    const { data: existing, error: checkError } = await supabase
      .from('referral_requests')
      .select('*')
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

    // If status is being changed to "accepted" or "referred" and job_id is null, create a job
    if (status && (status === 'accepted' || status === 'referred') && !existing.job_id) {
      try {
        // Check if a job with the same title and company already exists
        const existingJobCheck = await pool.query(
          `SELECT id FROM jobs 
           WHERE user_id = $1 
           AND LOWER(TRIM(title)) = LOWER(TRIM($2))
           AND LOWER(TRIM(company)) = LOWER(TRIM($3))
           AND ("isArchived" = false OR "isArchived" IS NULL)
           LIMIT 1`,
          [req.user.id, existing.job_title, existing.company]
        );

        let jobId;
        if (existingJobCheck.rows.length > 0) {
          // Job already exists, use it
          jobId = existingJobCheck.rows[0].id;
          console.log(`✅ Found existing job ${jobId} for referral ${req.params.id}`);
        } else {
          // Create new job with "Interested" status
          const newJobResult = await pool.query(
            `INSERT INTO jobs (
              user_id, title, company, status, created_at, status_updated_at
            ) VALUES ($1, $2, $3, 'Interested', NOW(), NOW())
            RETURNING id`,
            [req.user.id, existing.job_title.trim(), existing.company.trim()]
          );
          jobId = newJobResult.rows[0].id;
          console.log(`✅ Created new job ${jobId} for referral ${req.params.id}`);
        }

        // Link the job to the referral request
        updateData.job_id = jobId;
      } catch (jobError) {
        console.error('Error creating job for referral:', jobError);
        // Continue with referral update even if job creation fails
      }
    }

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

// ======================================
// SEND REFERRAL EMAIL ENDPOINT
// ======================================

// POST send referral email to contact
router.post('/requests/:id/send-email', authMiddleware, async (req, res) => {
  try {
    // Get the referral request with contact information
    const { data: referralRequest, error: referralError } = await supabase
      .from('referral_requests')
      .select(`
        *,
        contact:professional_contacts(first_name, last_name, email, company, title)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (referralError) throw referralError;
    if (!referralRequest) {
      return res.status(404).json({ error: 'Referral request not found' });
    }

    // Check if contact email exists
    if (!referralRequest.contact?.email) {
      return res.status(400).json({ 
        error: 'Contact email is required. Please add an email address to this contact.' 
      });
    }

    // Check if referral message exists
    if (!referralRequest.referral_message || referralRequest.referral_message.trim() === '') {
      return res.status(400).json({ 
        error: 'Referral message is required. Please add a message before sending.' 
      });
    }

    const contactEmail = referralRequest.contact.email;
    const contactName = referralRequest.contact.first_name 
      ? `${referralRequest.contact.first_name} ${referralRequest.contact.last_name || ''}`.trim()
      : 'there';

    // Get user email - should be available from req.user set by auth middleware
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(500).json({ 
        error: 'User email not available. Please ensure you are properly authenticated.' 
      });
    }

    // Get user's name from profile (try profiles.full_name first, then users.first_name + last_name)
    let userName = '';
    try {
      // First try to get full_name from profiles table
      const profileResult = await pool.query(
        'SELECT full_name FROM profiles WHERE user_id = $1',
        [req.user.id]
      );
      
      if (profileResult.rows.length > 0 && profileResult.rows[0].full_name) {
        userName = profileResult.rows[0].full_name.trim();
      } else {
        // Fallback to users table first_name and last_name
        const userResult = await pool.query(
          'SELECT first_name, last_name FROM users WHERE id = $1',
          [req.user.id]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          if (user.first_name || user.last_name) {
            userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          }
        }
      }
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue without name - will use email instead
    }

    // Use user's name if available, otherwise use email
    const userDisplayName = userName || userEmail;

    // Prepare email content
    const emailSubject = `Referral Request: ${referralRequest.job_title} at ${referralRequest.company}`;
    
    // Convert referral message to HTML (preserve line breaks)
    const messageHtml = referralRequest.referral_message
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>');

    // Create HTML email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin-top: 0;">Referral Request</h2>
          <p style="margin: 10px 0;"><strong>Position:</strong> ${referralRequest.job_title}</p>
          <p style="margin: 10px 0;"><strong>Company:</strong> ${referralRequest.company}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; line-height: 1.6;">
          <p style="margin-top: 0;">Hi ${contactName},</p>
          
          <p style="margin: 15px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
            <strong>This email is from ${userDisplayName} (${userEmail})</strong> asking you for a referral.
          </p>
          
          <div style="margin: 20px 0;">
            ${messageHtml}
          </div>
          
          <p style="margin-top: 20px; margin-bottom: 0;">
            Best regards,<br>
            <strong>${userDisplayName}</strong><br>
            ${userEmail}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0;">This email was sent via ATS for Candidates on behalf of ${userDisplayName}</p>
          <p style="margin: 5px 0 0 0;">You can reply directly to ${userEmail}</p>
        </div>
      </div>
    `;

    // Send email using Resend
    const userId = req.user?.id || null;
    const startTime = Date.now();
    const emailResult = await resend.emails.send({
      from: `ATS for Candidates <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: contactEmail,
      subject: emailSubject,
      html: emailHtml,
      replyTo: userEmail, // Allow contact to reply directly to the user
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage
    try {
      if (emailResult.error) {
        await logApiError({
          serviceName: 'resend',
          endpoint: '/emails/send',
          userId: userId,
          errorType: 'api_error',
          errorMessage: emailResult.error.message || 'Email send failed',
          statusCode: emailResult.error.statusCode || 500,
          requestPayload: { from: process.env.EMAIL_FROM, to: contactEmail, purpose: 'referral_request' }
        });
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: contactEmail, purpose: 'referral_request' },
          responseStatus: emailResult.error.statusCode || 500,
          responseTimeMs,
          success: false
        });
      } else {
        await logApiUsage({
          serviceName: 'resend',
          endpoint: '/emails/send',
          method: 'POST',
          userId: userId,
          requestPayload: { to: contactEmail, purpose: 'referral_request' },
          responseStatus: 200,
          responseTimeMs,
          success: true
        });
      }
    } catch (trackErr) {
      console.warn("Failed to track Resend API call:", trackErr);
    }

    if (emailResult.error) {
      console.error('Resend API error:', emailResult.error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: emailResult.error.message 
      });
    }

    // Update referral request status to indicate email was sent
    // Optionally, you could add a field like email_sent_at
    const { error: updateError } = await supabase
      .from('referral_requests')
      .update({ 
        status: 'pending', // Keep as pending until contact responds
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Error updating referral request:', updateError);
      // Don't fail the request if update fails, email was already sent
    }

    console.log(`📧 Sent referral email to ${contactEmail} for referral request ${req.params.id}`);

    res.json({
      message: 'Referral email sent successfully',
      emailId: emailResult.data?.id,
      sentTo: contactEmail
    });
  } catch (err) {
    console.error('Error sending referral email:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

export default router;
