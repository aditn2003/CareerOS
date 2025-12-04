// ======================================
// UC-091: MENTOR AND CAREER COACH INTEGRATION ROUTES
// ======================================

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to get user ID from JWT token
const getSupabaseUserId = (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
    if (!token) return res.status(401).json({ error: "NO_TOKEN" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = { 
      id: decoded.id,
      email: decoded.email
    };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========================================
// SPECIFIC ROUTES FIRST (before /:id catch-all)
// ========================================

/**
 * GET /api/mentors/dashboard
 * Get mentee progress for mentor dashboard
 */
router.get('/dashboard', getSupabaseUserId, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all relationships where this user is the mentor
    const { data: relationships, error: relError } = await supabase
      .from('mentor_relationships')
      .select(`
        *,
        mentee:mentee_id(id, email, first_name, last_name),
        feedback:mentor_feedback(*),
        recommendations:mentor_recommendations(*),
        progress:mentor_progress_sharing(*)
      `)
      .eq('mentor_id', userId);

    if (relError) throw relError;

    res.json({
      success: true,
      data: relationships || [],
      count: (relationships || []).length
    });
  } catch (error) {
    console.error('Error fetching mentor dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentors/my-mentors
 * Get all mentors/coaches for current user
 */
router.get('/my-mentors', getSupabaseUserId, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: relationships, error: relError } = await supabase
      .from('mentor_relationships')
      .select(`
        *,
        mentor:mentor_id(
          id, email, first_name, last_name, title, company, 
          expertise_areas, bio, years_of_experience, linkedin_url,
          is_career_coach
        )
      `)
      .eq('mentee_id', userId)
      .order('created_at', { ascending: false });

    if (relError) throw relError;

    res.json({
      success: true,
      data: relationships || [],
      count: (relationships || []).length
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mentors/invite
 * Send mentor invitation by email
 */
router.post('/invite', getSupabaseUserId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mentor_email, relationship_type = 'mentor' } = req.body;

    if (!mentor_email) {
      return res.status(400).json({ error: 'Mentor email is required' });
    }

    // Check if mentor exists
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('id')
      .eq('email', mentor_email)
      .single();

    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('mentor_relationships')
      .select('id')
      .eq('mentee_id', userId)
      .eq('mentor_id', mentor.id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    // Create new relationship
    const { data: relationship, error: createError } = await supabase
      .from('mentor_relationships')
      .insert({
        mentee_id: userId,
        mentor_id: mentor.id,
        relationship_type,
        status: 'pending',
        invitation_sent_at: new Date()
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      success: true,
      message: 'Invitation sent',
      data: relationship
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mentors/relationships/:id/accept
 * Accept mentor invitation
 */
router.put('/relationships/:id/accept', getSupabaseUserId, async (req, res) => {
  try {
    const relationshipId = req.params.id;
    const userId = req.user.id;

    const { data: relationship, error: fetchError } = await supabase
      .from('mentor_relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('mentee_id', userId)
      .single();

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('mentor_relationships')
      .update({
        status: 'active',
        accepted_at: new Date(),
        start_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', relationshipId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Mentor relationship accepted',
      data: updated
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mentors/feedback
 * Submit feedback from mentor
 */
router.post('/feedback', getSupabaseUserId, async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { relationship_id, feedback_type, title, content, priority = 'medium' } = req.body;

    if (!relationship_id || !feedback_type || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: feedback, error: createError } = await supabase
      .from('mentor_feedback')
      .insert({
        relationship_id,
        mentor_id: mentorId,
        feedback_type,
        title,
        content,
        priority,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      success: true,
      message: 'Feedback submitted',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentors/feedback/:relationshipId
 * Get feedback for a mentor relationship
 */
router.get('/feedback/:relationshipId', getSupabaseUserId, async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const { data: feedback, error: fetchError } = await supabase
      .from('mentor_feedback')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: feedback || [],
      count: (feedback || []).length
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mentors/recommendations
 * Submit recommendation from mentor
 */
router.post('/recommendations', getSupabaseUserId, async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { relationship_id, recommendation_type, title, description, priority = 'medium' } = req.body;

    if (!relationship_id || !recommendation_type || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: recommendation, error: createError } = await supabase
      .from('mentor_recommendations')
      .insert({
        relationship_id,
        mentor_id: mentorId,
        recommendation_type,
        title,
        description,
        priority,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      success: true,
      message: 'Recommendation submitted',
      data: recommendation
    });
  } catch (error) {
    console.error('Error submitting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentors/recommendations/:relationshipId
 * Get recommendations for a mentor relationship
 */
router.get('/recommendations/:relationshipId', getSupabaseUserId, async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const { data: recommendations, error: fetchError } = await supabase
      .from('mentor_recommendations')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: recommendations || [],
      count: (recommendations || []).length
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mentors/progress-sharing
 * Share progress update with mentor
 */
router.post('/progress-sharing', getSupabaseUserId, async (req, res) => {
  try {
    const menteeId = req.user.id;
    const {
      relationship_id,
      mentor_id,
      applications_submitted = 0,
      interviews_completed = 0,
      job_leads_identified = 0,
      skills_developed = '',
      challenges_faced = '',
      wins_and_achievements = '',
      next_week_goals = ''
    } = req.body;

    if (!relationship_id) {
      return res.status(400).json({ error: 'Relationship ID is required' });
    }

    const { data: progress, error: createError } = await supabase
      .from('mentor_progress_sharing')
      .insert({
        relationship_id,
        mentee_id: menteeId,
        mentor_id,
        sharing_date: new Date().toISOString().split('T')[0],
        applications_submitted,
        interviews_completed,
        job_leads_identified,
        skills_developed,
        challenges_faced,
        wins_and_achievements,
        next_week_goals
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      success: true,
      message: 'Progress shared',
      data: progress
    });
  } catch (error) {
    console.error('Error sharing progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentors/progress/:relationshipId
 * Get progress sharing history
 */
router.get('/progress/:relationshipId', getSupabaseUserId, async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const { data: progress, error: fetchError } = await supabase
      .from('mentor_progress_sharing')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('sharing_date', { ascending: false });

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: progress || [],
      count: (progress || []).length
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mentors/recommendations/:id/update-status
 * Update recommendation status
 */
router.put('/recommendations/:id/update-status', getSupabaseUserId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback_on_implementation } = req.body;

    const { data: updated, error: updateError } = await supabase
      .from('mentor_recommendations')
      .update({
        status,
        feedback_on_implementation,
        completion_date: status === 'completed' ? new Date() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Recommendation status updated',
      data: updated
    });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mentors/feedback/:id/mark-implemented
 * Mark feedback as implemented
 */
router.put('/feedback/:id/mark-implemented', getSupabaseUserId, async (req, res) => {
  try {
    const { id } = req.params;
    const { implementation_notes } = req.body;

    const { data: updated, error: updateError } = await supabase
      .from('mentor_feedback')
      .update({
        status: 'implemented',
        implementation_notes,
        implementation_date: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Feedback marked as implemented',
      data: updated
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mentors/relationships/:id
 * End mentor relationship
 */
router.delete('/relationships/:id', getSupabaseUserId, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: relationship } = await supabase
      .from('mentor_relationships')
      .select('*')
      .eq('id', id)
      .eq('mentee_id', userId)
      .single();

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const { error: deleteError } = await supabase
      .from('mentor_relationships')
      .update({ status: 'completed', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Mentor relationship ended'
    });
  } catch (error) {
    console.error('Error ending relationship:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GENERIC ROUTES (after specific routes)
// ========================================

/**
 * GET /api/mentors/:id
 * Get mentor details
 */
router.get('/:id', getSupabaseUserId, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: mentor, error: fetchError } = await supabase
      .from('mentors')
      .select('*')
      .eq('id', id)
      .single();

    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    res.json({
      success: true,
      data: mentor
    });
  } catch (error) {
    console.error('Error fetching mentor:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
