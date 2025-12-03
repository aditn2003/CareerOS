import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Send,
  Trash2,
  Edit2,
  AlertCircle,
  Phone,
  Mail,
  Linkedin,
  FileText,
  ChevronDown,
} from 'lucide-react';
import './NetworkingEvents.css';

const API_BASE = 'http://localhost:4000/api';

// Helper function to convert date string to EST timezone (YYYY-MM-DD format)
const convertToEST = (dateString) => {
  // dateString format: YYYY-MM-DD from date input
  if (!dateString) return dateString;
  
  // Split the date string
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a date object in EST (not UTC)
  // We want to interpret the date string as if it's already in EST
  // So we just return it as-is without any timezone conversion
  return dateString;
};

// Helper function to display date in EST (handles both YYYY-MM-DD and full ISO strings)
const displayDateEST = (dateString) => {
  if (!dateString) return '';
  
  // If it's just YYYY-MM-DD format, parse it as EST
  if (dateString.length === 10 && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  // For full ISO strings, parse with timezone awareness
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Helper function to handle 401 errors and redirect to login
const handleAuthError = (err) => {
  if (err.response?.status === 401 || err.response?.data?.error === 'TOKEN_EXPIRED') {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return true;
  }
  return false;
};

const NetworkingEvents = () => {
  // State management
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tempEventStatus, setTempEventStatus] = useState(null);
  const [selectedFollowupConnection, setSelectedFollowupConnection] = useState(null);
  const [eventEditMode, setEventEditMode] = useState(false);
  const [editedEventData, setEditedEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingFollowups, setPendingFollowups] = useState([]);
  const [completedFollowups, setCompletedFollowups] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'followups'
  const [followupsSubTab, setFollowupsSubTab] = useState('pending'); // 'pending' or 'done'
  const [showEventDiscovery, setShowEventDiscovery] = useState(false);
  const [discoverySearchForm, setDiscoverySearchForm] = useState({
    industry: '',
    location: '',
    event_type: '',
  });
  const [discoveredEvents, setDiscoveredEvents] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Form states
  const [eventForm, setEventForm] = useState({
    event_name: '',
    event_type: 'conference',
    location: '',
    is_virtual: false,
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    description: '',
    industry: '',
    expected_connections: 0,
    cost: 0,
  });

  const [connectionForm, setConnectionForm] = useState({
    contact_name: '',
    contact_title: '',
    contact_company: '',
    contact_email: '',
    contact_linkedin: '',
    relationship_type: 'general_contact',
    connection_quality: 3,
    conversation_topic: '',
  });

  const [followupForm, setFollowupForm] = useState({
    followup_type: 'thank_you',
    followup_message: '',
    scheduled_date: '',
    connection_id: '',
    attended: false, // Track if follow-up was already attended
  });

  // Fetch all events on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchEvents();
    fetchStatistics();
    fetchUpcomingEvents();
    fetchPendingFollowups();
    fetchCompletedFollowups();
  }, []);

  // Fetch events when filter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchEvents();
  }, [filterStatus]);

  // Fetch all networking events
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      // Always fetch ALL events (don't filter by status here)
      const { data } = await axios.get(
        `${API_BASE}/networking/events`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('Error fetching events:', err);
        setEvents([]);
      }
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/networking/statistics`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setStatistics(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('Error fetching statistics:', err);
      }
    }
  };

  // Fetch upcoming events
  const fetchUpcomingEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/networking/upcoming`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setUpcomingEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('Error fetching upcoming events:', err);
      }
    }
  };

  // Fetch pending follow-ups
  const fetchPendingFollowups = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/networking/pending-followups`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      console.log('Pending follow-ups fetched:', data);
      setPendingFollowups(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('Error fetching pending follow-ups:', err);
        console.error('Error response:', err.response?.data);
      }
    }
  };

  const fetchCompletedFollowups = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/networking/completed-followups`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setCompletedFollowups(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('Error fetching completed follow-ups:', err);
      }
    }
  };

  // Format follow-up type for display (thank_you -> Thank You)
  const formatFollowupType = (type) => {
    if (!type) return '';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Create new event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.event_name || !eventForm.event_date) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Convert date to EST timezone and keep as YYYY-MM-DD format
      const eventData = {
        ...eventForm,
        event_date: convertToEST(eventForm.event_date)
      };
      
      await axios.post(
        `${API_BASE}/networking/events`,
        eventData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Event created successfully!');
      setEventForm({
        event_name: '',
        event_type: 'conference',
        location: '',
        is_virtual: false,
        event_date: '',
        event_start_time: '',
        event_end_time: '',
        description: '',
        industry: '',
        expected_connections: 0,
        cost: 0,
      });
      setShowCreateModal(false);
      fetchEvents();
      fetchStatistics();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  // Add connection to event
  const handleAddConnection = async (e) => {
    e.preventDefault();
    if (!connectionForm.contact_name) {
      setError('Please enter contact name');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/networking/events/${selectedEvent.id}/connections`,
        connectionForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch updated event immediately to refresh connections list BEFORE closing modal
      const { data: updatedEvent } = await axios.get(
        `${API_BASE}/networking/events/${selectedEvent.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedEvent(updatedEvent);
      
      setSuccessMessage('✓ Connection added!');
      
      // Reset form
      setConnectionForm({
        contact_name: '',
        contact_title: '',
        contact_company: '',
        contact_email: '',
        contact_linkedin: '',
        relationship_type: 'general_contact',
        connection_quality: 3,
        conversation_topic: '',
      });
      
      // Close modal after brief delay so user sees success
      setTimeout(() => setShowConnectionModal(false), 300);
      
      fetchEvents();
      fetchStatistics();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add connection');
    } finally {
      setLoading(false);
    }
  };

  // Create follow-up
  const handleCreateFollowup = async (e) => {
    e.preventDefault();
    if (!followupForm.scheduled_date) {
      setError('Please select a follow-up date');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const followupData = {
        event_id: selectedEvent.id,
        connection_id: followupForm.connection_id || null,
        followup_type: followupForm.followup_type,
        followup_message: followupForm.followup_message || null,
        scheduled_date: followupForm.scheduled_date,
        attended: followupForm.attended
      };
      
      console.log('Creating follow-up with data:', followupData);
      console.log('Selected event ID:', selectedEvent.id);
      console.log('Connection ID:', followupForm.connection_id);
      
      const response = await axios.post(
        `${API_BASE}/networking/followups`,
        followupData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Follow-up created successfully:', response.data);

      setSuccessMessage(followupForm.attended ? '✓ Follow-up marked as attended!' : 'Follow-up scheduled!');
      
      // Reset form
      setFollowupForm({
        followup_type: 'thank_you',
        followup_message: '',
        scheduled_date: '',
        connection_id: '',
        attended: false,
      });
      setSelectedFollowupConnection(null);
      setShowFollowupModal(false);
      
      // Fetch updated event to refresh follow-ups
      const { data: updatedEvent } = await axios.get(
        `${API_BASE}/networking/events/${selectedEvent.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedEvent(updatedEvent);
      
      // Refresh follow-ups lists - use await to ensure they complete
      console.log('Fetching pending follow-ups...');
      await fetchPendingFollowups();
      console.log('Fetching completed follow-ups...');
      await fetchCompletedFollowups();
      
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Switch to follow-ups tab if follow-up was not attended
      if (!followupForm.attended) {
        setActiveTab('followups');
        setFollowupsSubTab('pending');
      }
      
      fetchEvents();
      fetchStatistics();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error creating follow-up:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to create follow-up');
    } finally {
      setLoading(false);
    }
  };

  // Mark follow-up as done
  const handleMarkFollowupDone = async (followupId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE}/networking/followups/${followupId}`,
        { completed: true, completed_date: new Date().toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('✓ Follow-up marked as done!');
      
      // Remove from pending and add to completed immediately
      const followupToMove = pendingFollowups.find(f => f.id === followupId);
      if (followupToMove) {
        const newPending = pendingFollowups.filter(f => f.id !== followupId);
        const newCompleted = [...completedFollowups, { ...followupToMove, completed: true, completed_date: new Date().toISOString() }];
        setPendingFollowups(newPending);
        setCompletedFollowups(newCompleted);
      }
      
      // Also refresh from server for data consistency
      await fetchPendingFollowups();
      await fetchCompletedFollowups();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to mark follow-up as done');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete follow-up
  const handleDeleteFollowup = async (followupId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE}/networking/followups/${followupId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('✓ Follow-up deleted!');
      
      // Remove from local state
      setPendingFollowups(pendingFollowups.filter(f => f.id !== followupId));
      setCompletedFollowups(completedFollowups.filter(f => f.id !== followupId));
      
      // Refresh from server
      await fetchPendingFollowups();
      await fetchCompletedFollowups();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to delete follow-up');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update event status
  const handleUpdateEventStatus = async (eventId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE}/networking/events/${eventId}`,
        { status: newStatus, actual_attendance_date: newStatus === 'attended' ? new Date().toISOString() : null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('✓ Event status updated!');
      setTempEventStatus(null); // Reset temp status
      setShowEventDetailsModal(false); // Close modal after status change
      fetchEvents();
      fetchStatistics();
      fetchUpcomingEvents(); // Refresh upcoming events to remove attended events
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.error || 'Failed to update event');
      }
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `${API_BASE}/networking/events/${eventId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMessage('Event deleted!');
        fetchEvents();
        setShowEventDetailsModal(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete event');
      }
    }
  };

  // Enter event edit mode
  const handleStartEditEvent = () => {
    setEditedEventData({ ...selectedEvent });
    setEventEditMode(true);
  };

  // Save event edits
  const handleSaveEventEdit = async () => {
    try {
      if (!selectedEvent || !selectedEvent.id) {
        setError('Event ID not found');
        return;
      }

      if (!editedEventData) {
        setError('No changes to save');
        return;
      }

      setLoading(true);
      setError(''); // Clear any previous errors
      const token = localStorage.getItem('token');
      
      // Only include the fields that should be updated
      const updateData = {
        event_name: editedEventData.event_name,
        event_date: convertToEST(editedEventData.event_date),
        event_type: editedEventData.event_type || 'conference',
        location: editedEventData.location,
        industry: editedEventData.industry,
        description: editedEventData.description,
        status: editedEventData.status,
        expected_connections: editedEventData.expected_connections || 0,
        actual_connections_made: editedEventData.actual_connections_made || 0,
        is_virtual: editedEventData.is_virtual || false,
        cost: editedEventData.cost || 0
      };
      
      console.log('Saving event with ID:', selectedEvent.id);
      console.log('Update data:', updateData);
      
      const { data: updatedEvent } = await axios.put(
        `${API_BASE}/networking/events/${selectedEvent.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Updated event:', updatedEvent);
      
      setSuccessMessage('✓ Event updated successfully!');
      
      // Immediately reset edit mode and close modal
      setEventEditMode(false);
      setEditedEventData(null);
      setShowEventDetailsModal(false);
      setSelectedEvent(null);
      
      // Refresh data in background
      await fetchEvents();
      await fetchStatistics();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err.response?.data?.error || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  // Cancel event edit
  const handleCancelEditEvent = () => {
    setEventEditMode(false);
    setEditedEventData(null);
  };

  // Open follow-up modal with specific connection
  const handleScheduleFollowupForConnection = (connection) => {
    setSelectedFollowupConnection(connection);
    setFollowupForm({
      ...followupForm,
      connection_id: connection.id,
    });
    setShowFollowupModal(true);
  };

  // Search for events by location, industry, or type
  const handleEventSearch = async () => {
    try {
      setDiscoveryLoading(true);
      setError(null);
      
      // Require at least one search criteria
      if (!discoverySearchForm.location && !discoverySearchForm.industry && !discoverySearchForm.event_type) {
        setError('Please enter at least one search criteria (location, industry, or event type)');
        setDiscoveryLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (discoverySearchForm.location?.trim()) params.append('location', discoverySearchForm.location.trim());
      if (discoverySearchForm.industry?.trim()) params.append('industry', discoverySearchForm.industry.trim());
      if (discoverySearchForm.event_type?.trim()) params.append('eventType', discoverySearchForm.event_type);

      console.log('Searching with params:', Object.fromEntries(params));
      console.log('Full URL:', `${API_BASE}/networking/discover/search?${params.toString()}`);

      const response = await axios.get(
        `${API_BASE}/networking/discover/search?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      console.log('Search response:', response);
      console.log('Search results:', response.data);
      
      setDiscoveredEvents(response.data || []);
      if (!response.data || response.data.length === 0) {
        setSuccessMessage(`No events found matching your search criteria`);
      } else {
        setSuccessMessage(`✓ Found ${response.data.length} matching event(s)!`);
      }
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Search error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error message:', err.message);
      setError(err.response?.data?.error || err.message || 'Failed to search events');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Fetch full event data with connections and follow-ups
  const handleOpenEventDetails = async (event) => {
    try {
      const token = localStorage.getItem('token');
      const { data: fullEvent } = await axios.get(
        `${API_BASE}/networking/events/${event.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedEvent(fullEvent);
      setShowEventDetailsModal(true);
    } catch (err) {
      console.error('Error fetching event details:', err);
      // Fallback to basic event data
      setSelectedEvent(event);
      setShowEventDetailsModal(true);
    }
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      conference: '🏢',
      meetup: '👥',
      webinar: '💻',
      workshop: '🛠️',
      virtual: '🌐',
      social: '🎉',
      trade_show: '🎪',
      panel_discussion: '🎤',
      networking_mixer: '🍹',
      industry_event: '📊',
    };
    return icons[type] || '📅';
  };

  return (
    <div className="networking-events-container">
      {/* Header */}
      <div className="networking-header">
        <h1>Networking Events</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Add Event
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowEventDiscovery(true)}
          >
            <Calendar size={16} />
            Discover Events
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Statistics Dashboard */}
      {statistics && (
        <div className="stats-grid">
          {(() => {
            // Calculate counts from ALL events, not filtered ones
            const totalAttended = events.filter(e => e.status === 'attended').length;
            const totalWithConnections = events.filter(e => e.actual_connections_made > 0).length;
            
            return (
              <>
                <div className="stat-card" onClick={() => setFilterStatus('attended')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon" style={{ color: '#2196F3' }}>
                    <Calendar size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Events Attended</p>
                    <p className="stat-value">{totalAttended}</p>
                  </div>
                </div>

                <div className="stat-card" onClick={() => setFilterStatus('has_connections')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon" style={{ color: '#4CAF50' }}>
                    <Users size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Connections Made</p>
                    <p className="stat-value">{totalWithConnections}</p>
                  </div>
                </div>

                <div className="stat-card" onClick={() => {
                  setActiveTab('followups');
                  setFollowupsSubTab('pending');
                }} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon" style={{ color: '#9C27B0' }}>
                    <Send size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Follow-ups</p>
                    <p className="stat-value">{pendingFollowups.length + completedFollowups.length}</p>
                  </div>
                </div>

                <div className="stat-card" onClick={() => setFilterStatus('interested')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon" style={{ color: '#E91E63' }}>
                    <TrendingUp size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Success Rate</p>
                    <p className="stat-value">{statistics.followupSuccessRate}%</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-navigation" style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'events' ? '#7c3aed' : 'transparent',
            color: activeTab === 'events' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'events' ? '600' : '500',
            transition: 'all 0.2s'
          }}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'followups' ? '#7c3aed' : 'transparent',
            color: activeTab === 'followups' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'followups' ? '600' : '500',
            transition: 'all 0.2s'
          }}
        >
          Follow-ups
        </button>
      </div>

      {/* Events Tab Content */}
      {activeTab === 'events' && (
        <>
      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <div className="upcoming-section">
          <h2>Upcoming Events</h2>
          <div className="upcoming-events">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="upcoming-event-card"
                onClick={() => handleOpenEventDetails(event)}
              >
                <div className="event-type-badge">{getEventTypeIcon(event.event_type)}</div>
                <h3>{event.event_name}</h3>
                <p className="event-date">
                  <Calendar size={16} />
                  {displayDateEST(event.event_date)}
                </p>
                {event.location && (
                  <p className="event-location">
                    <MapPin size={16} />
                    {event.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Follow-ups Tab Content */}
      {activeTab === 'followups' && (
        <>
          {/* Follow-ups Subtabs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0'
          }}>
            <button
              onClick={() => setFollowupsSubTab('pending')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: followupsSubTab === 'pending' ? '600' : '500',
                color: followupsSubTab === 'pending' ? 'white' : '#6b7280',
                backgroundColor: followupsSubTab === 'pending' ? '#f59e0b' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              ⏳ Pending ({pendingFollowups.length})
            </button>
            <button
              onClick={() => setFollowupsSubTab('done')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: followupsSubTab === 'done' ? '600' : '500',
                color: followupsSubTab === 'done' ? 'white' : '#6b7280',
                backgroundColor: followupsSubTab === 'done' ? '#16a34a' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              ✓ Done ({completedFollowups.length})
            </button>
          </div>

          {/* Follow-ups Section */}
          {(pendingFollowups.length > 0 || completedFollowups.length > 0) && (
            <div className="followups-section">
          
              {/* Pending Follow-ups Subsection */}
              {followupsSubTab === 'pending' && pendingFollowups.length > 0 && (
                <div className="followups-subsection">
                  <div className="pending-followups">
                    {pendingFollowups.map((followup) => (
                      <div key={followup.id} className="pending-card">
                        <div className="pending-content">
                          <h4>✓ {formatFollowupType(followup.followup_type)}</h4>
                          {followup.event && (
                            <p style={{ margin: '4px 0', fontSize: '13px', color: '#7c3aed', fontWeight: '500' }}>
                              📍 Event: {followup.event.event_name}
                            </p>
                          )}
                          {followup.connection && (
                            <p className="connection-name">{followup.connection.contact_name} at {followup.connection.contact_company}</p>
                          )}
                          <p className="scheduled-date">
                            <Clock size={16} />
                            Due: {new Date(followup.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          className="btn-small btn-primary"
                          onClick={() => handleMarkFollowupDone(followup.id)}
                          disabled={loading}
                        >
                          {loading ? 'Marking...' : 'Mark Done'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Empty State */}
              {followupsSubTab === 'pending' && pendingFollowups.length === 0 && (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  color: '#999',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '14px' }}>No pending follow-ups. Schedule one to get started!</p>
                </div>
              )}
              
              {/* Done Follow-ups Subsection */}
              {followupsSubTab === 'done' && completedFollowups.length > 0 && (
                <div className="followups-subsection">
                  <div className="completed-followups">
                    {completedFollowups.map((followup) => (
                      <div key={followup.id} className="completed-card" style={{ 
                        backgroundColor: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        borderLeft: '4px solid #16a34a',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div className="completed-content">
                          <h4 style={{ margin: '0 0 8px 0', color: '#16a34a' }}>✓ {formatFollowupType(followup.followup_type)}</h4>
                          {followup.event && (
                            <p style={{ margin: '4px 0', fontSize: '13px', color: '#7c3aed', fontWeight: '500' }}>
                              📍 Event: {followup.event.event_name}
                            </p>
                          )}
                          {followup.connection && (
                            <p className="connection-name" style={{ margin: '4px 0', color: '#374151' }}>
                              <strong>{followup.connection.contact_name}</strong>
                              {followup.connection.contact_company && ` at ${followup.connection.contact_company}`}
                            </p>
                          )}
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                            Completed: {new Date(followup.completed_date || followup.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => {
                            if (window.confirm('Delete this completed follow-up?')) {
                              handleDeleteFollowup(followup.id);
                            }
                          }}
                          disabled={loading}
                          style={{ marginLeft: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Done Empty State */}
              {followupsSubTab === 'done' && completedFollowups.length === 0 && (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  color: '#999',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '14px' }}>No completed follow-ups yet. Mark some as done to see them here!</p>
                </div>
              )}
            </div>
          )}

          {/* No Follow-ups State */}
          {pendingFollowups.length === 0 && completedFollowups.length === 0 && (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              color: '#999',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>No follow-ups yet</p>
              <p style={{ fontSize: '14px' }}>Create a follow-up from your connections to get started!</p>
            </div>
          )}
        </>
      )}

      {/* Events Tab - Filter and Events List */}
      {activeTab === 'events' && (
        <>
          {/* Filter */}
          <div className="events-filter">
            <label>Filter by Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Events</option>
              <option value="interested">Interested</option>
              <option value="registered">Registered</option>
              <option value="attended">Attended</option>
              <option value="cancelled">Cancelled</option>
          <option value="has_connections">Events with Connections</option>
        </select>
      </div>

      {/* Events List */}
      <div className="events-list">
        {(() => {
          // Filter events based on filterStatus
          let filteredEvents = events;
          
          if (filterStatus === 'has_connections') {
            filteredEvents = events.filter(e => e.actual_connections_made > 0);
          } else if (filterStatus === 'attended') {
            filteredEvents = events.filter(e => e.status === 'attended');
          } else if (filterStatus === 'interested') {
            filteredEvents = events.filter(e => e.status === 'interested');
          } else if (filterStatus === 'registered') {
            filteredEvents = events.filter(e => e.status === 'registered');
          } else if (filterStatus === 'cancelled') {
            filteredEvents = events.filter(e => e.status === 'cancelled');
          }
          
          return (
            <>
              <h2>Your Events ({filteredEvents.length})</h2>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="event-card"
                    onClick={() => handleOpenEventDetails(event)}
                  >
              <div className="event-card-header">
                <div className="event-title">
                  <div className="event-type-icon">{getEventTypeIcon(event.event_type)}</div>
                  <div>
                    <h3>{event.event_name}</h3>
                    <p className="event-company">{event.industry || 'General'}</p>
                  </div>
                </div>
                <div className="status-badge" style={{ backgroundColor: getStatusColor(event.status) }}>
                  {event.status}
                </div>
              </div>

              <div className="event-card-body">
                <div className="event-info">
                  <span className="info-item">
                    <Calendar size={16} />
                    {displayDateEST(event.event_date)}
                  </span>
                  {event.location && (
                    <span className="info-item">
                      <MapPin size={16} />
                      {event.location}
                    </span>
                  )}
                  {event.is_virtual && <span className="info-item">🌐 Virtual</span>}
                  <span className="info-item">
                    <Users size={16} />
                    {event.actual_connections_made || 0} connections
                  </span>
                </div>
              </div>

              <div className="event-card-footer">
                <button
                  className="btn-small btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(event.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No events yet. Create your first one!</p>
              )}
            </>
          );
        })()}
      </div>
        </>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Networking Event</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateEvent} className="event-form">
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={eventForm.event_name}
                  onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                  placeholder="e.g., Tech Leaders Conference"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Type *</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  >
                    <option value="conference">Conference</option>
                    <option value="meetup">Meetup</option>
                    <option value="webinar">Webinar</option>
                    <option value="workshop">Workshop</option>
                    <option value="virtual">Virtual</option>
                    <option value="social">Social</option>
                    <option value="trade_show">Trade Show</option>
                    <option value="panel_discussion">Panel Discussion</option>
                    <option value="networking_mixer">Networking Mixer</option>
                    <option value="industry_event">Industry Event</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Event Date *</label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>

                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={eventForm.industry}
                    onChange={(e) => setEventForm({ ...eventForm, industry: e.target.value })}
                    placeholder="e.g., Technology"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="What is this event about?"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expected Connections</label>
                  <input
                    type="number"
                    min="0"
                    value={eventForm.expected_connections}
                    onChange={(e) => setEventForm({ ...eventForm, expected_connections: parseInt(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={eventForm.cost}
                    onChange={(e) => setEventForm({ ...eventForm, cost: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={eventForm.is_virtual}
                    onChange={(e) => setEventForm({ ...eventForm, is_virtual: e.target.checked })}
                  />
                  Virtual Event
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isEditMode={eventEditMode}
          editedData={editedEventData}
          onEditChange={setEditedEventData}
          onStartEdit={handleStartEditEvent}
          onSaveEdit={handleSaveEventEdit}
          onCancelEdit={handleCancelEditEvent}
          onClose={() => {
            setShowEventDetailsModal(false);
            setEventEditMode(false);
            setTempEventStatus(null);
          }}
          onAddConnection={() => setShowConnectionModal(true)}
          onScheduleFollowupForConnection={handleScheduleFollowupForConnection}
          onStatusChange={handleUpdateEventStatus}
          tempEventStatus={tempEventStatus}
          setTempEventStatus={setTempEventStatus}
          error={error}
          loading={loading}
        />
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="modal-overlay" onClick={() => setShowConnectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Connection</h2>
              <button className="btn-close" onClick={() => setShowConnectionModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddConnection} className="connection-form">
              <div className="form-group">
                <label>Contact Name *</label>
                <input
                  type="text"
                  value={connectionForm.contact_name}
                  onChange={(e) => setConnectionForm({ ...connectionForm, contact_name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={connectionForm.contact_title}
                    onChange={(e) => setConnectionForm({ ...connectionForm, contact_title: e.target.value })}
                    placeholder="Job title"
                  />
                </div>

                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={connectionForm.contact_company}
                    onChange={(e) => setConnectionForm({ ...connectionForm, contact_company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={connectionForm.contact_email}
                  onChange={(e) => setConnectionForm({ ...connectionForm, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>LinkedIn URL</label>
                <input
                  type="url"
                  value={connectionForm.contact_linkedin}
                  onChange={(e) => setConnectionForm({ ...connectionForm, contact_linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="form-group">
                <label>Connection Quality (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={connectionForm.connection_quality}
                  onChange={(e) => setConnectionForm({ ...connectionForm, connection_quality: parseInt(e.target.value) })}
                />
                <span>{connectionForm.connection_quality}/5</span>
              </div>

              <div className="form-group">
                <label>Conversation Topic</label>
                <textarea
                  value={connectionForm.conversation_topic}
                  onChange={(e) => setConnectionForm({ ...connectionForm, conversation_topic: e.target.value })}
                  placeholder="What did you discuss?"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowConnectionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowupModal && (
        <div className="modal-overlay" onClick={() => {
          setShowFollowupModal(false);
          setSelectedFollowupConnection(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Schedule Follow-up
                {selectedFollowupConnection && ` - ${selectedFollowupConnection.contact_name}`}
              </h2>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowFollowupModal(false);
                  setSelectedFollowupConnection(null);
                }}
              >✕</button>
            </div>

            <form onSubmit={handleCreateFollowup} className="followup-form">
              {selectedFollowupConnection && (
                <div className="form-group" style={{ 
                  padding: '12px', 
                  backgroundColor: '#f0f4ff',
                  borderLeft: '4px solid #7C3AED',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                    <strong>For:</strong> {selectedFollowupConnection.contact_name}
                    {selectedFollowupConnection.contact_title && ` - ${selectedFollowupConnection.contact_title}`}
                  </p>
                  {selectedFollowupConnection.contact_company && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                      {selectedFollowupConnection.contact_company}
                    </p>
                  )}
                </div>
              )}
              <div className="form-group">
                <label>Follow-up Type *</label>
                <select
                  value={followupForm.followup_type}
                  onChange={(e) => setFollowupForm({ ...followupForm, followup_type: e.target.value })}
                >
                  <option value="thank_you">Thank You</option>
                  <option value="connection_request">Connection Request</option>
                  <option value="information_request">Information Request</option>
                  <option value="coffee_meeting">Coffee Meeting</option>
                  <option value="job_opportunity">Job Opportunity</option>
                  <option value="check_in">Check In</option>
                </select>
              </div>

              <div className="form-group">
                <label>Follow-up Date *</label>
                <input
                  type="date"
                  value={followupForm.scheduled_date}
                  onChange={(e) => setFollowupForm({ ...followupForm, scheduled_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={followupForm.followup_message}
                  onChange={(e) => setFollowupForm({ ...followupForm, followup_message: e.target.value })}
                  placeholder="What would you like to say?"
                  rows={4}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="attended-checkbox"
                  checked={followupForm.attended}
                  onChange={(e) => setFollowupForm({ ...followupForm, attended: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="attended-checkbox" style={{ margin: 0, cursor: 'pointer' }}>
                  I already attended this follow-up
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFollowupModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Scheduling...' : followupForm.attended ? 'Mark as Done' : 'Schedule Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Discovery Modal */}
      {showEventDiscovery && (
        <div className="modal-overlay" onClick={() => setShowEventDiscovery(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Discover Events</h2>
              <button className="btn-close" onClick={() => setShowEventDiscovery(false)}>✕</button>
            </div>

            <div className="discovery-section">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Search for events by industry, location, or type. Add events you're interested in to your calendar.
              </p>

              <form onSubmit={(e) => e.preventDefault()} className="discovery-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      value={discoverySearchForm.industry}
                      onChange={(e) => setDiscoverySearchForm({ ...discoverySearchForm, industry: e.target.value })}
                      placeholder="e.g., Technology, Finance, Healthcare"
                    />
                  </div>

                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={discoverySearchForm.location}
                      onChange={(e) => setDiscoverySearchForm({ ...discoverySearchForm, location: e.target.value })}
                      placeholder="e.g., San Francisco, Remote, New York"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Event Type</label>
                  <select
                    value={discoverySearchForm.event_type}
                    onChange={(e) => setDiscoverySearchForm({ ...discoverySearchForm, event_type: e.target.value })}
                  >
                    <option value="">All Types</option>
                    <option value="conference">Conference</option>
                    <option value="meetup">Meetup</option>
                    <option value="webinar">Webinar</option>
                    <option value="workshop">Workshop</option>
                    <option value="networking_mixer">Networking Mixer</option>
                  </select>
                </div>

                <div className="discovery-info">
                  <AlertCircle size={18} style={{ color: '#2196F3', marginRight: '10px' }} />
                  <p>
                    {discoveredEvents.length > 0 
                      ? `Found ${discoveredEvents.length} matching event(s). Use external platforms to register.`
                      : 'Search your existing events or use external platforms like Eventbrite, LinkedIn Events, Meetup, and Lunchclub to find and register for new events.'}
                  </p>
                </div>

                {discoveredEvents.length > 0 && (
                  <div className="discovered-events-list" style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4 style={{ marginBottom: '15px' }}>Matching Events:</h4>
                    {discoveredEvents.map((evt) => (
                      <div 
                        key={evt.id} 
                        onClick={() => {
                          handleOpenEventDetails(evt);
                          setShowEventDiscovery(false);
                          setDiscoveredEvents([]);
                        }}
                        style={{ 
                          padding: '12px', 
                          borderLeft: '4px solid #2196F3', 
                          marginBottom: '10px', 
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                          e.currentTarget.style.borderLeftColor = '#1976d2';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                          e.currentTarget.style.borderLeftColor = '#2196F3';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{evt.event_name}</p>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>
                          📅 {new Date(evt.event_date).toLocaleDateString()} | 📍 {evt.location || 'Virtual'} | {evt.event_type}
                        </p>
                        {evt.industry && <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>Industry: {evt.industry}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowEventDiscovery(false);
                      setDiscoveredEvents([]);
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleEventSearch}
                    disabled={discoveryLoading}
                  >
                    <FileText size={16} />
                    {discoveryLoading ? 'Searching...' : 'Search Events'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Event Details Modal Component
const EventDetailsModal = ({ 
  event, 
  isEditMode,
  editedData,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onClose, 
  onAddConnection, 
  onScheduleFollowupForConnection,
  onStatusChange,
  tempEventStatus,
  setTempEventStatus,
  error,
  loading
}) => {
  const [connections, setConnections] = useState(event.connections || []);

  // Update connections when event changes
  useEffect(() => {
    setConnections(event.connections || []);
  }, [event]);

  // Guard: ensure editedData exists when in edit mode
  if (isEditMode && !editedData) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Event' : event.event_name}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: '6px',
            marginBottom: '16px',
            marginLeft: '16px',
            marginRight: '16px',
            marginTop: '12px',
            border: '1px solid #fcc'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div className="event-details">
          <div className="detail-section">
            <h3>Event Information</h3>
            {isEditMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Event Name *</label>
                  <input
                    type="text"
                    value={editedData?.event_name || ''}
                    onChange={(e) => onEditChange({ ...editedData, event_name: e.target.value })}
                    placeholder="e.g., Tech Leaders Conference"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Event Type</label>
                    <select
                      value={editedData?.event_type || 'conference'}
                      onChange={(e) => onEditChange({ ...editedData, event_type: e.target.value })}
                    >
                      <option value="conference">Conference</option>
                      <option value="meetup">Meetup</option>
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="virtual">Virtual</option>
                      <option value="social">Social</option>
                      <option value="trade_show">Trade Show</option>
                      <option value="panel_discussion">Panel Discussion</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Event Date *</label>
                    <input
                      type="date"
                      value={editedData?.event_date || ''}
                      onChange={(e) => onEditChange({ ...editedData, event_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={editedData?.location || ''}
                      onChange={(e) => onEditChange({ ...editedData, location: e.target.value })}
                      placeholder="City, State"
                    />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      value={editedData?.industry || ''}
                      onChange={(e) => onEditChange({ ...editedData, industry: e.target.value })}
                      placeholder="e.g., Technology"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editedData?.description || ''}
                    onChange={(e) => onEditChange({ ...editedData, description: e.target.value })}
                    placeholder="What is this event about?"
                    rows={4}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expected Connections</label>
                    <input
                      type="number"
                      value={editedData?.expected_connections || 0}
                      onChange={(e) => onEditChange({ ...editedData, expected_connections: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost ($)</label>
                    <input
                      type="number"
                      value={editedData?.cost || 0}
                      onChange={(e) => onEditChange({ ...editedData, cost: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={editedData?.is_virtual || false}
                      onChange={(e) => onEditChange({ ...editedData, is_virtual: e.target.checked })}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Virtual Event
                  </label>
                </div>
              </div>
            ) : (
              <div className="detail-grid">
                <div>
                  <p className="detail-label">Date</p>
                  <p>{displayDateEST(event.event_date)}</p>
                </div>
                <div>
                  <p className="detail-label">Location</p>
                  <p>{event.location || 'Virtual'}</p>
                </div>
                <div>
                  <p className="detail-label">Type</p>
                  <p>{event.event_type}</p>
                </div>
                <div>
                  <p className="detail-label">Industry</p>
                  <p>{event.industry || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Status & Goals</h3>
            {!isEditMode && (
              <div>
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">Status</p>
                    <select
                      value={tempEventStatus !== null ? tempEventStatus : (event.status || 'registered')}
                      onChange={(e) => setTempEventStatus(e.target.value)}
                      className="status-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: 'white' }}
                    >
                      <option value="interested">Interested</option>
                      <option value="registered">Registered</option>
                      <option value="attended">Attended</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                  <div>
                    <p className="detail-label">Connections Made</p>
                    <p>{event.actual_connections_made || 0} / {event.expected_connections || 0}</p>
                  </div>
                </div>
                {tempEventStatus !== null && tempEventStatus !== event.status && (
                  <button 
                    className="btn-primary" 
                    onClick={() => onStatusChange(event.id, tempEventStatus)}
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    ✓ Done
                  </button>
                )}
              </div>
            )}
          </div>

          {event.description && !isEditMode && (
            <div className="detail-section">
              <h3>Description</h3>
              <p>{event.description}</p>
            </div>
          )}

          {connections && connections.length > 0 && !isEditMode && (
            <div className="detail-section">
              <h3>Connections Made ({connections.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    onClick={() => onScheduleFollowupForConnection(conn)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#f0f4ff',
                        borderColor: '#7c3aed',
                        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)'
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f4ff';
                      e.currentTarget.style.borderColor = '#7c3aed';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                      👤 {conn.contact_name}
                    </p>
                    {conn.contact_title && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4b5563' }}>
                        💼 {conn.contact_title}
                      </p>
                    )}
                    {conn.contact_company && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4b5563' }}>
                        🏢 {conn.contact_company}
                      </p>
                    )}
                    {conn.contact_email && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4b5563' }}>
                        📧 {conn.contact_email}
                      </p>
                    )}
                    {conn.connection_quality && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                        ⭐ Quality: {conn.connection_quality}/5
                      </p>
                    )}
                    {conn.conversation_topic && (
                      <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', fontStyle: 'italic', backgroundColor: '#fff3cd', padding: '8px', borderLeft: '3px solid #ffc107', borderRadius: '4px' }}>
                        💬 <strong>Conversation:</strong> {conn.conversation_topic}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#7c3aed', fontWeight: '500' }}>
                      👉 Click to schedule follow-up
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer">
            {isEditMode ? (
              <>
                <button className="btn-secondary" onClick={onCancelEdit} disabled={loading}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={onSaveEdit} disabled={loading}>
                  {loading ? '⏳ Saving...' : '✓ Done Editing'}
                </button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={onAddConnection}>
                  ➕ Add Connection
                </button>
                <button className="btn-secondary" onClick={onStartEdit}>
                  <Edit2 size={16} />
                  Edit Event
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const getStatusColor = (status) => {
    const colors = {
      interested: '#FFA500',
      registered: '#2196F3',
      attended: '#4CAF50',
      cancelled: '#F44336',
      no_show: '#9E9E9E',
    };
    return colors[status] || '#757575';
  };

  export default NetworkingEvents;