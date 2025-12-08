// ======================================
// UC-095: PROFESSIONAL REFERENCE MANAGEMENT ROUTES
// ======================================

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { auth as authMiddleware } from '../auth.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ======================================
// PROFESSIONAL REFERENCES CRUD
// ======================================

// GET all references for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, available } = req.query;
    
    let query = supabase
      .from('professional_references')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('reference_type', type);
    if (available !== undefined) query = query.eq('is_available', available === 'true');

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, references: data || [] });
  } catch (err) {
    console.error('Error fetching references:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single reference
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('professional_references')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Reference not found' });

    res.json({ success: true, reference: data });
  } catch (err) {
    console.error('Error fetching reference:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new reference
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      linkedin_url,
      title,
      company,
      relationship,
      years_known,
      reference_strength,
      key_skills_can_speak_to,
      notable_projects,
      reference_notes,
      is_available,
      preferred_contact_method,
      reference_type
    } = req.body;

    const { data, error } = await supabase
      .from('professional_references')
      .insert({
        user_id: req.user.id,
        first_name,
        last_name,
        email,
        phone,
        linkedin_url,
        title,
        company,
        relationship,
        years_known,
        reference_strength: reference_strength || 'strong',
        key_skills_can_speak_to: key_skills_can_speak_to ? JSON.stringify(key_skills_can_speak_to) : null,
        notable_projects: notable_projects ? JSON.stringify(notable_projects) : null,
        reference_notes,
        is_available: is_available !== false,
        preferred_contact_method: preferred_contact_method || 'email',
        reference_type: reference_type || 'professional'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, reference: data });
  } catch (err) {
    console.error('Error creating reference:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE reference
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    
    // Handle JSON fields
    if (updateData.key_skills_can_speak_to && Array.isArray(updateData.key_skills_can_speak_to)) {
      updateData.key_skills_can_speak_to = JSON.stringify(updateData.key_skills_can_speak_to);
    }
    if (updateData.notable_projects && Array.isArray(updateData.notable_projects)) {
      updateData.notable_projects = JSON.stringify(updateData.notable_projects);
    }

    const { data, error } = await supabase
      .from('professional_references')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, reference: data });
  } catch (err) {
    console.error('Error updating reference:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE reference
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('professional_references')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Reference deleted' });
  } catch (err) {
    console.error('Error deleting reference:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERENCE REQUESTS
// ======================================

// GET all reference requests
router.get('/requests/all', authMiddleware, async (req, res) => {
  try {
    const { status, reference_id } = req.query;
    
    let query = supabase
      .from('reference_requests')
      .select(`
        *,
        reference:professional_references(first_name, last_name, email, company, title)
      `)
      .eq('user_id', req.user.id)
      .order('request_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (reference_id) query = query.eq('reference_id', reference_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, requests: data || [] });
  } catch (err) {
    console.error('Error fetching reference requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE reference request
router.post('/requests', authMiddleware, async (req, res) => {
  try {
    const {
      reference_id,
      job_id,
      job_title,
      company,
      deadline,
      talking_points,
      role_specific_guidance,
      key_achievements_to_highlight,
      request_message
    } = req.body;

    // Validate that reference_id is provided and not empty
    if (!reference_id) {
      return res.status(400).json({ error: 'Please select a reference from the dropdown' });
    }

    const { data, error } = await supabase
      .from('reference_requests')
      .insert({
        user_id: req.user.id,
        reference_id: parseInt(reference_id),
        job_id: job_id || null,
        job_title,
        company,
        deadline: deadline || null,
        talking_points: talking_points ? JSON.stringify(talking_points) : null,
        role_specific_guidance,
        key_achievements_to_highlight: key_achievements_to_highlight ? JSON.stringify(key_achievements_to_highlight) : null,
        request_message,
        status: 'pending'
      })
      .select(`
        *,
        reference:professional_references(first_name, last_name, email, company, title)
      `)
      .single();

    if (error) throw error;

    // Update reference usage count
    if (reference_id) {
      try {
        await supabase.rpc('increment_reference_usage', { ref_id: parseInt(reference_id) });
      } catch {
        // Silently fail if RPC doesn't exist
      }
    }

    res.status(201).json({ success: true, request: data });
  } catch (err) {
    console.error('Error creating reference request:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE reference request status
router.put('/requests/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    
    // Handle JSON fields
    if (updateData.talking_points && Array.isArray(updateData.talking_points)) {
      updateData.talking_points = JSON.stringify(updateData.talking_points);
    }
    if (updateData.key_achievements_to_highlight && Array.isArray(updateData.key_achievements_to_highlight)) {
      updateData.key_achievements_to_highlight = JSON.stringify(updateData.key_achievements_to_highlight);
    }

    const { data, error } = await supabase
      .from('reference_requests')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        reference:professional_references(first_name, last_name, email, company, title)
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, request: data });
  } catch (err) {
    console.error('Error updating reference request:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE reference request
router.delete('/requests/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('reference_requests')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Request deleted' });
  } catch (err) {
    console.error('Error deleting reference request:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERENCE TEMPLATES
// ======================================

// GET all templates
router.get('/templates/all', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = supabase
      .from('reference_templates')
      .select('*')
      .eq('user_id', req.user.id)
      .order('use_count', { ascending: false });

    if (type) query = query.eq('template_type', type);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, templates: data || [] });
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE template
router.post('/templates', authMiddleware, async (req, res) => {
  try {
    const { template_name, template_type, template_subject, template_body, is_default } = req.body;

    const { data, error } = await supabase
      .from('reference_templates')
      .insert({
        user_id: req.user.id,
        template_name,
        template_type,
        template_subject,
        template_body,
        is_default: is_default || false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, template: data });
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE template
router.put('/templates/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, template: data });
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE template
router.delete('/templates/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('reference_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERENCE FEEDBACK
// ======================================

// GET feedback for a reference
router.get('/feedback/:referenceId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reference_feedback')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('reference_id', req.params.referenceId)
      .order('feedback_date', { ascending: false });

    if (error) throw error;
    res.json({ success: true, feedback: data || [] });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE feedback
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    const {
      reference_id,
      request_id,
      feedback_source,
      feedback_text,
      overall_rating,
      helpfulness_rating,
      timeliness_rating,
      contributed_to_offer
    } = req.body;

    const { data, error } = await supabase
      .from('reference_feedback')
      .insert({
        user_id: req.user.id,
        reference_id,
        request_id,
        feedback_source,
        feedback_text,
        overall_rating,
        helpfulness_rating,
        timeliness_rating,
        contributed_to_offer
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, feedback: data });
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// REFERENCE REMINDERS
// ======================================

// GET all reminders
router.get('/reminders/all', authMiddleware, async (req, res) => {
  try {
    const { completed } = req.query;
    
    let query = supabase
      .from('reference_reminders')
      .select(`
        *,
        reference:professional_references(first_name, last_name, company)
      `)
      .eq('user_id', req.user.id)
      .order('reminder_date', { ascending: true });

    if (completed !== undefined) {
      query = query.eq('is_completed', completed === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, reminders: data || [] });
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE reminder
router.post('/reminders', authMiddleware, async (req, res) => {
  try {
    const { reference_id, reminder_type, reminder_date, reminder_message } = req.body;

    const { data, error } = await supabase
      .from('reference_reminders')
      .insert({
        user_id: req.user.id,
        reference_id,
        reminder_type,
        reminder_date,
        reminder_message
      })
      .select(`
        *,
        reference:professional_references(first_name, last_name, company)
      `)
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, reminder: data });
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE reminder (mark complete)
router.put('/reminders/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.is_completed) {
      updateData.completed_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('reference_reminders')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        reference:professional_references(first_name, last_name, company)
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, reminder: data });
  } catch (err) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE reminder
router.delete('/reminders/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('reference_reminders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// ANALYTICS & STATISTICS
// ======================================

// GET reference statistics
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    // Get all references
    const { data: references, error: refError } = await supabase
      .from('professional_references')
      .select('*')
      .eq('user_id', req.user.id);

    if (refError) throw refError;

    // Get all requests
    const { data: requests, error: reqError } = await supabase
      .from('reference_requests')
      .select('*')
      .eq('user_id', req.user.id);

    if (reqError) throw reqError;

    // Get all feedback
    const { data: feedback, error: fbError } = await supabase
      .from('reference_feedback')
      .select('*')
      .eq('user_id', req.user.id);

    if (fbError) throw fbError;

    // Calculate statistics
    const stats = {
      total_references: references?.length || 0,
      available_references: references?.filter(r => r.is_available).length || 0,
      total_requests: requests?.length || 0,
      pending_requests: requests?.filter(r => r.status === 'pending').length || 0,
      completed_requests: requests?.filter(r => r.status === 'completed').length || 0,
      average_rating: feedback?.length > 0 
        ? (feedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / feedback.filter(f => f.overall_rating).length).toFixed(1)
        : 0,
      offers_with_references: feedback?.filter(f => f.contributed_to_offer).length || 0,
      reference_types: {
        professional: references?.filter(r => r.reference_type === 'professional').length || 0,
        academic: references?.filter(r => r.reference_type === 'academic').length || 0,
        personal: references?.filter(r => r.reference_type === 'personal').length || 0,
        character: references?.filter(r => r.reference_type === 'character').length || 0
      }
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET reference impact on applications
router.get('/stats/impact', authMiddleware, async (req, res) => {
  try {
    const { data: feedback, error } = await supabase
      .from('reference_feedback')
      .select(`
        *,
        reference:professional_references(first_name, last_name, company, relationship)
      `)
      .eq('user_id', req.user.id)
      .order('feedback_date', { ascending: false });

    if (error) throw error;

    // Calculate impact metrics
    const totalFeedback = feedback?.length || 0;
    const positiveImpact = feedback?.filter(f => f.contributed_to_offer).length || 0;
    const impactRate = totalFeedback > 0 ? ((positiveImpact / totalFeedback) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      impact: {
        total_feedback: totalFeedback,
        positive_outcomes: positiveImpact,
        impact_rate: impactRate,
        recent_feedback: feedback?.slice(0, 5) || []
      }
    });
  } catch (err) {
    console.error('Error fetching impact stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// PREPARATION MATERIALS
// ======================================

// Generate talking points for a reference request
router.post('/generate-talking-points', authMiddleware, async (req, res) => {
  try {
    const { reference_id, job_title, company, job_description } = req.body;

    // Get reference details
    const { data: reference, error } = await supabase
      .from('professional_references')
      .select('*')
      .eq('id', reference_id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!reference) return res.status(404).json({ error: 'Reference not found' });

    // Parse skills and projects
    const skills = reference.key_skills_can_speak_to 
      ? JSON.parse(reference.key_skills_can_speak_to) 
      : [];
    const projects = reference.notable_projects 
      ? JSON.parse(reference.notable_projects) 
      : [];

    // Generate talking points based on reference's knowledge
    const talkingPoints = [
      `Highlight your ${reference.relationship} relationship spanning ${reference.years_known || 'several'} years`,
      ...skills.map(skill => `Discuss expertise in ${skill} demonstrated during your time together`),
      ...projects.slice(0, 3).map(project => `Reference the ${project} project and its outcomes`),
      `Emphasize qualities relevant to the ${job_title} role at ${company}`,
      `Mention specific examples of leadership/collaboration/problem-solving`
    ];

    // Generate role-specific guidance
    const guidance = `
As a ${reference.relationship}, ${reference.first_name} can speak to:
- Your professional capabilities and work ethic
- Specific achievements and contributions
- How you handle challenges and collaborate with others
- Your growth and development over time

For the ${job_title} position at ${company}, ask ${reference.first_name} to emphasize:
- Relevant technical skills: ${skills.join(', ')}
- Key projects: ${projects.join(', ')}
- Qualities that align with the role requirements
    `.trim();

    res.json({
      success: true,
      talking_points: talkingPoints,
      role_specific_guidance: guidance
    });
  } catch (err) {
    console.error('Error generating talking points:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
