// ======================================
// NETWORKING EVENT MANAGEMENT ROUTES
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
// NETWORKING EVENT ENDPOINTS
// ======================================

// GET all networking events for a user
router.get('/events', authMiddleware, async (req, res) => {
  try {
    const { status, industry, eventType, year } = req.query;
    
    let query = supabase
      .from('networking_events')
      .select('*')
      .eq('user_id', req.user.id)
      .order('event_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (industry) query = query.eq('industry', industry);
    if (eventType) query = query.eq('event_type', eventType);

    const { data, error } = await query;

    if (error) throw error;
    
    // Filter by year if provided
    let filteredData = data;
    if (year) {
      filteredData = data.filter(event => new Date(event.event_date).getFullYear() === parseInt(year));
    }

    res.json(filteredData);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single event with all related data
router.get('/events/:id', authMiddleware, async (req, res) => {
  try {
    const { data: event, error: eventError } = await supabase
      .from('networking_events')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Get goals
    const { data: goals } = await supabase
      .from('event_goals')
      .select('*')
      .eq('event_id', req.params.id);

    // Get connections
    const { data: connections } = await supabase
      .from('event_connections')
      .select('*')
      .eq('event_id', req.params.id);

    // Get follow-ups
    const { data: followups } = await supabase
      .from('event_followups')
      .select('*')
      .eq('event_id', req.params.id);

    res.json({
      ...event,
      goals,
      connections,
      followups
    });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new networking event
router.post('/events', authMiddleware, async (req, res) => {
  try {
    const {
      event_name,
      event_type,
      location,
      is_virtual,
      event_date,
      event_start_time,
      event_end_time,
      registration_deadline,
      description,
      industry,
      target_audience,
      registration_url,
      cost,
      expected_connections
    } = req.body;

    if (!event_name || !event_type || !event_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('networking_events')
      .insert([{
        user_id: req.user.id,
        event_name,
        event_type,
        location: location || null,
        is_virtual: is_virtual || false,
        event_date,
        event_start_time: event_start_time || null,
        event_end_time: event_end_time || null,
        registration_deadline: registration_deadline || null,
        description: description || null,
        industry: industry || null,
        target_audience: target_audience || null,
        registration_url: registration_url || null,
        cost: cost || 0,
        expected_connections: expected_connections || 0
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE networking event
router.put('/events/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('networking_events')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });

    res.json(data);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE networking event
router.delete('/events/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('networking_events')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// EVENT GOALS ENDPOINTS
// ======================================

// CREATE event goal
router.post('/events/:eventId/goals', authMiddleware, async (req, res) => {
  try {
    const { goal_description, goal_type, target_count, notes } = req.body;

    if (!goal_description || !goal_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('event_goals')
      .insert([{
        event_id: req.params.eventId,
        user_id: req.user.id,
        goal_description,
        goal_type,
        target_count: target_count || null,
        notes: notes || null
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creating goal:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE event goal (mark as achieved)
router.put('/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_goals')
      .update({
        ...req.body,
        achievement_date: req.body.achieved ? new Date().toISOString() : null
      })
      .eq('id', req.params.goalId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating goal:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE event goal
router.delete('/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('event_goals')
      .delete()
      .eq('id', req.params.goalId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// EVENT CONNECTIONS ENDPOINTS
// ======================================

// CREATE connection from event
router.post('/events/:eventId/connections', authMiddleware, async (req, res) => {
  try {
    const {
      contact_name,
      contact_title,
      contact_company,
      contact_email,
      contact_phone,
      contact_linkedin,
      relationship_type,
      conversation_topic,
      common_interests,
      connection_quality
    } = req.body;

    if (!contact_name) {
      return res.status(400).json({ error: 'Missing contact name' });
    }

    const { data, error } = await supabase
      .from('event_connections')
      .insert([{
        event_id: req.params.eventId,
        user_id: req.user.id,
        contact_name,
        contact_title: contact_title || null,
        contact_company: contact_company || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        contact_linkedin: contact_linkedin || null,
        relationship_type: relationship_type || 'general_contact',
        conversation_topic: conversation_topic || null,
        common_interests: common_interests || null,
        connection_quality: connection_quality || 3
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Update actual_connections_made count
    const { data: eventData } = await supabase
      .from('networking_events')
      .select('actual_connections_made')
      .eq('id', req.params.eventId)
      .single();

    if (eventData) {
      await supabase
        .from('networking_events')
        .update({ actual_connections_made: (eventData.actual_connections_made || 0) + 1 })
        .eq('id', req.params.eventId);
    }

    res.json(data);
  } catch (err) {
    console.error('Error creating connection:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE connection
router.put('/connections/:connectionId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_connections')
      .update(req.body)
      .eq('id', req.params.connectionId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating connection:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE connection
router.delete('/connections/:connectionId', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('event_connections')
      .delete()
      .eq('id', req.params.connectionId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting connection:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// EVENT FOLLOWUPS ENDPOINTS
// ======================================

// CREATE follow-up
router.post('/followups', authMiddleware, async (req, res) => {
  try {
    const {
      event_id,
      connection_id,
      followup_type,
      followup_message,
      scheduled_date,
      attended
    } = req.body;

    console.log('POST /followups - received data:', {
      event_id,
      connection_id,
      followup_type,
      followup_message,
      scheduled_date,
      attended,
      user_id: req.user.id
    });

    if (!event_id || !followup_type || !scheduled_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If attended is true, mark as completed with current date
    const insertData = {
      event_id,
      connection_id: connection_id || null,
      user_id: req.user.id,
      followup_type,
      followup_message: followup_message || null,
      scheduled_date,
      completed: attended || false
    };

    // If marked as completed, set completed_date
    if (attended) {
      insertData.completed_date = new Date().toISOString();
    }

    console.log('Inserting follow-up data:', insertData);

    const { data, error } = await supabase
      .from('event_followups')
      .insert([insertData])
      .select()
      .single();

    console.log('Follow-up insert result:', { data, error });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creating follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE follow-up
router.put('/followups/:followupId', authMiddleware, async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // If marking as completed, set completed_date
    if (req.body.completed && !req.body.completed_date) {
      updates.completed_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('event_followups')
      .update(updates)
      .eq('id', req.params.followupId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE follow-up
router.delete('/followups/:followupId', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('event_followups')
      .delete()
      .eq('id', req.params.followupId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting follow-up:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// ANALYTICS ENDPOINTS
// ======================================

// GET networking statistics
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    // Get all events and connections
    const { data: events, error: eventsError } = await supabase
      .from('networking_events')
      .select('id, status, event_date, actual_connections_made, expected_connections, networking_roi_score, industry')
      .eq('user_id', req.user.id)
      .eq('status', 'attended');

    if (eventsError) throw eventsError;

    // Get all connections
    const { data: connections, error: connectionsError } = await supabase
      .from('event_connections')
      .select('id, connection_quality, relationship_type')
      .eq('user_id', req.user.id);

    if (connectionsError) throw connectionsError;

    // Get follow-ups
    const { data: followups, error: followupsError } = await supabase
      .from('event_followups')
      .select('id, completed, response_received')
      .eq('user_id', req.user.id);

    if (followupsError) throw followupsError;

    // Calculate statistics
    const totalEventsAttended = events.length;
    const totalConnections = connections.length;
    const avgConnectionsPerEvent = totalEventsAttended > 0 ? (totalConnections / totalEventsAttended).toFixed(2) : 0;
    const followupsCompleted = followups.filter(f => f.completed).length;
    const followupSuccessRate = followups.length > 0 ? ((followupsCompleted / followups.length) * 100).toFixed(2) : 0;

    res.json({
      totalEventsAttended,
      totalConnections,
      averageConnectionsPerEvent: parseFloat(avgConnectionsPerEvent),
      followupsCompleted,
      followupSuccessRate: parseFloat(followupSuccessRate),
      upcomingFollowups: followups.filter(f => !f.completed).length
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET upcoming events
router.get('/upcoming', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('networking_events')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('event_date', today)
      .neq('status', 'attended')
      .order('event_date', { ascending: true })
      .limit(5);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET pending follow-ups
router.get('/pending-followups', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_followups')
      .select(`
        *,
        connection:event_connections(contact_name, contact_company),
        event:networking_events(event_name)
      `)
      .eq('user_id', req.user.id)
      .eq('completed', false)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching pending follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET completed follow-ups
router.get('/completed-followups', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_followups')
      .select(`
        *,
        connection:event_connections(contact_name, contact_company),
        event:networking_events(event_name)
      `)
      .eq('user_id', req.user.id)
      .eq('completed', true)
      .order('completed_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching completed follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// EVENT DISCOVERY/SEARCH ENDPOINTS
// ======================================

// Search for events by location, industry, or type
router.get('/discover/search', authMiddleware, async (req, res) => {
  try {
    const { location, industry, eventType } = req.query;
    console.log('Discover search request:', { location, industry, eventType, userId: req.user.id });
    
    // First, get all events
    const { data: allEvents, error: fetchError } = await supabase
      .from('networking_events')
      .select('*')
      .eq('user_id', req.user.id)
      .order('event_date', { ascending: true });

    console.log('All events fetched:', allEvents?.length || 0, 'events');

    if (fetchError) throw fetchError;

    // Filter in-memory for more control
    let results = allEvents || [];
    
    if (location && location.trim()) {
      const locLower = location.toLowerCase();
      results = results.filter(e => 
        e.location?.toLowerCase().includes(locLower) || 
        e.description?.toLowerCase().includes(locLower)
      );
      console.log(`After location filter: ${results.length} events`);
    }
    
    if (industry && industry.trim()) {
      const indLower = industry.toLowerCase();
      results = results.filter(e => 
        e.industry?.toLowerCase().includes(indLower)
      );
      console.log(`After industry filter: ${results.length} events`);
    }
    
    if (eventType && eventType.trim() !== '' && eventType !== 'All Types') {
      results = results.filter(e => e.event_type === eventType);
      console.log(`After eventType filter: ${results.length} events`);
    }

    console.log(`Search: location=${location}, industry=${industry}, eventType=${eventType} → Found ${results.length} events`);
    
    res.json(results);
  } catch (err) {
    console.error('Error searching events:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get available industries for discovery
router.get('/discover/industries', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('networking_events')
      .select('industry')
      .eq('user_id', req.user.id)
      .not('industry', 'is', null);

    if (error) throw error;
    
    // Get unique industries
    const industries = [...new Set(data.map(e => e.industry).filter(Boolean))];
    
    res.json(industries);
  } catch (err) {
    console.error('Error fetching industries:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get available locations for discovery
router.get('/discover/locations', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('networking_events')
      .select('location')
      .eq('user_id', req.user.id)
      .not('location', 'is', null);

    if (error) throw error;
    
    // Get unique locations
    const locations = [...new Set(data.map(e => e.location).filter(Boolean))];
    
    res.json(locations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

