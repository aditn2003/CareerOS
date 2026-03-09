import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Send,
  Info,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { baseURL } from '../api';
import './FollowUpReminders.css';

const API_BASE = `${baseURL}/api`;

const FollowUpReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'all', 'completed'
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEtiquetteModal, setShowEtiquetteModal] = useState(false);
  const [etiquetteTips, setEtiquetteTips] = useState([]);
  const [expandedReminders, setExpandedReminders] = useState(new Set());
  const [snoozeDays, setSnoozeDays] = useState(1);

  useEffect(() => {
    fetchReminders();
    fetchEtiquetteTips();
    
    // Set up polling for due reminders (check every 5 minutes)
    const interval = setInterval(() => {
      fetchReminders();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      // Fetch upcoming reminders
      const upcomingRes = await axios.get(`${API_BASE}/followup-reminders/upcoming?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpcomingReminders(upcomingRes.data);
      
      // Fetch all reminders
      const allRes = await axios.get(`${API_BASE}/followup-reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(allRes.data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError(err.response?.data?.error || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const fetchEtiquetteTips = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_BASE}/followup-reminders/etiquette/tips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEtiquetteTips(res.data);
    } catch (err) {
      console.error('Error fetching etiquette tips:', err);
    }
  };

  const handleSnooze = async (reminderId, days = 1) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_BASE}/followup-reminders/${reminderId}/snooze`,
        { days },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('Reminder snoozed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to snooze reminder');
    }
  };

  const handleDismiss = async (reminderId) => {
    if (!window.confirm('Are you sure you want to dismiss this reminder?')) {
      return;
    }
    
    try {
      const token = getToken();
      await axios.post(
        `${API_BASE}/followup-reminders/${reminderId}/dismiss`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('Reminder dismissed');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dismiss reminder');
    }
  };

  const handleComplete = async (reminderId, formData) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_BASE}/followup-reminders/${reminderId}/complete`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('Follow-up marked as completed');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowDetailsModal(false);
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete reminder');
    }
  };

  const handleAutoSchedule = async () => {
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_BASE}/followup-reminders/auto-schedule`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(res.data.message || 'Reminders created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to auto-schedule reminders');
    }
  };

  const getReminderStatus = (reminder) => {
    const now = new Date();
    const dueDate = new Date(reminder.due_date);
    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (reminder.status === 'completed') return { label: 'Completed', color: '#10b981', icon: CheckCircle };
    if (reminder.status === 'dismissed') return { label: 'Dismissed', color: '#6b7280', icon: XCircle };
    if (reminder.status === 'snoozed') return { label: 'Snoozed', color: '#f59e0b', icon: Clock };
    if (daysUntil < 0) return { label: 'Overdue', color: '#ef4444', icon: AlertCircle };
    if (daysUntil === 0) return { label: 'Due Today', color: '#f59e0b', icon: Bell };
    if (daysUntil <= 3) return { label: `Due in ${daysUntil} days`, color: '#f59e0b', icon: Clock };
    return { label: `Due in ${daysUntil} days`, color: '#3b82f6', icon: Calendar };
  };

  const getReminderTypeLabel = (type) => {
    const labels = {
      'application_followup': 'Application Follow-Up',
      'interview_followup': 'Interview Follow-Up',
      'post_interview_thank_you': 'Thank You Note',
      'offer_response': 'Offer Response',
      'status_check': 'Status Check',
      'custom': 'Custom Reminder'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const toggleExpanded = (reminderId) => {
    const newExpanded = new Set(expandedReminders);
    if (newExpanded.has(reminderId)) {
      newExpanded.delete(reminderId);
    } else {
      newExpanded.add(reminderId);
    }
    setExpandedReminders(newExpanded);
  };

  const displayReminders = activeTab === 'upcoming' ? upcomingReminders : 
                          activeTab === 'completed' ? reminders.filter(r => r.status === 'completed') :
                          reminders;

  if (loading && reminders.length === 0) {
    return (
      <div className="followup-reminders-container">
        <div className="loading">Loading reminders...</div>
      </div>
    );
  }

  return (
    <div className="followup-reminders-container">
      <div className="followup-header">
        <div className="header-content">
          <h1>
            <Bell className="header-icon" />
            Follow-Up Reminders
          </h1>
          <p className="header-subtitle">
            Smart reminders to help you maintain appropriate contact with employers
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => setShowEtiquetteModal(true)}
          >
            <Info size={16} /> Etiquette Tips
          </button>
          <button 
            className="btn-primary"
            onClick={handleAutoSchedule}
          >
            <Zap size={16} /> Auto-Schedule Reminders
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="followup-tabs">
        <button
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Bell size={16} /> Upcoming ({upcomingReminders.length})
        </button>
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Calendar size={16} /> All ({reminders.length})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <CheckCircle size={16} /> Completed ({reminders.filter(r => r.status === 'completed').length})
        </button>
      </div>

      {/* Reminders List */}
      {displayReminders.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} className="empty-icon" />
          <h3>No reminders found</h3>
          <p>
            {activeTab === 'upcoming' 
              ? 'No upcoming reminders. Use "Auto-Schedule Reminders" to create reminders for your active applications.'
              : 'No reminders in this category.'}
          </p>
          {activeTab === 'upcoming' && (
            <button className="btn-primary" onClick={handleAutoSchedule}>
              <Zap size={16} /> Auto-Schedule Reminders
            </button>
          )}
        </div>
      ) : (
        <div className="reminders-list">
          {displayReminders.map((reminder) => {
            const status = getReminderStatus(reminder);
            const isExpanded = expandedReminders.has(reminder.id);
            const StatusIcon = status.icon;

            return (
              <div 
                key={reminder.id} 
                className={`reminder-card ${reminder.status} ${status.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="reminder-card-header">
                  <div className="reminder-main-info">
                    <div className="reminder-title-row">
                      <h3>{reminder.company} - {reminder.title}</h3>
                      <span className="reminder-type-badge">
                        {getReminderTypeLabel(reminder.reminder_type)}
                      </span>
                    </div>
                    <div className="reminder-meta">
                      <span className="reminder-status" style={{ color: status.color }}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                      <span className="reminder-date">
                        <Calendar size={14} />
                        {formatDate(reminder.due_date)}
                      </span>
                      {reminder.company_responsiveness_score !== null && (
                        <span className="responsiveness-score">
                          Responsiveness: {(reminder.company_responsiveness_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="reminder-actions-header">
                    <button
                      className="btn-icon"
                      onClick={() => toggleExpanded(reminder.id)}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="reminder-details">
                    <div className="detail-section">
                      <h4>Email Template</h4>
                      <div className="email-preview">
                        <div className="email-subject">
                          <strong>Subject:</strong> {reminder.email_subject}
                        </div>
                        <div className="email-body">
                          <strong>Body:</strong>
                          <pre>{reminder.email_template}</pre>
                        </div>
                      </div>
                    </div>

                    {reminder.user_notes && (
                      <div className="detail-section">
                        <h4>Your Notes</h4>
                        <p>{reminder.user_notes}</p>
                      </div>
                    )}

                    <div className="reminder-actions">
                      {reminder.status !== 'completed' && reminder.status !== 'dismissed' && (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setSelectedReminder(reminder);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Send size={16} /> Complete Follow-Up
                          </button>
                          <div className="snooze-controls">
                            <label>Snooze for:</label>
                            <select 
                              value={snoozeDays} 
                              onChange={(e) => setSnoozeDays(parseInt(e.target.value))}
                            >
                              <option value={1}>1 day</option>
                              <option value={3}>3 days</option>
                              <option value={7}>7 days</option>
                              <option value={14}>14 days</option>
                            </select>
                            <button
                              className="btn-secondary"
                              onClick={() => handleSnooze(reminder.id, snoozeDays)}
                            >
                              <Clock size={16} /> Snooze
                            </button>
                          </div>
                          <button
                            className="btn-danger"
                            onClick={() => handleDismiss(reminder.id)}
                          >
                            <XCircle size={16} /> Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Details/Complete Modal */}
      {showDetailsModal && selectedReminder && (
        <CompleteReminderModal
          reminder={selectedReminder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReminder(null);
          }}
          onComplete={handleComplete}
        />
      )}

      {/* Etiquette Tips Modal */}
      {showEtiquetteModal && (
        <EtiquetteTipsModal
          tips={etiquetteTips}
          onClose={() => setShowEtiquetteModal(false)}
        />
      )}
    </div>
  );
};

// Complete Reminder Modal Component
const CompleteReminderModal = ({ reminder, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    followup_method: 'email',
    message_sent: reminder.email_template || '',
    response_received: false,
    response_type: null,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(reminder.id, formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Complete Follow-Up</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="complete-form">
          <div className="form-group">
            <label>Follow-Up Method</label>
            <select
              value={formData.followup_method}
              onChange={(e) => setFormData({ ...formData, followup_method: e.target.value })}
              required
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="linkedin">LinkedIn</option>
              <option value="in_person">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Message Sent</label>
            <textarea
              value={formData.message_sent}
              onChange={(e) => setFormData({ ...formData, message_sent: e.target.value })}
              rows={6}
              placeholder="Enter the message you sent (or leave as template)"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.response_received}
                onChange={(e) => setFormData({ ...formData, response_received: e.target.checked })}
              />
              Received Response
            </label>
          </div>

          {formData.response_received && (
            <div className="form-group">
              <label>Response Type</label>
              <select
                value={formData.response_type || ''}
                onChange={(e) => setFormData({ ...formData, response_type: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
                <option value="no_response">No Response</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about this follow-up..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle size={16} /> Mark as Completed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Etiquette Tips Modal Component
const EtiquetteTipsModal = ({ tips, onClose }) => {
  const [selectedType, setSelectedType] = useState('all');

  const filteredTips = selectedType === 'all' 
    ? tips 
    : tips.filter(tip => tip.reminder_type === selectedType);

  const groupedTips = filteredTips.reduce((acc, tip) => {
    const category = tip.tip_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tip);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Follow-Up Etiquette Tips</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="etiquette-content">
          <div className="filter-controls">
            <label>Filter by type:</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="application_followup">Application Follow-Up</option>
              <option value="interview_followup">Interview Follow-Up</option>
              <option value="post_interview_thank_you">Thank You Note</option>
              <option value="offer_response">Offer Response</option>
              <option value="status_check">Status Check</option>
            </select>
          </div>

          {Object.entries(groupedTips).map(([category, categoryTips]) => (
            <div key={category} className="tips-category">
              <h3>{category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}</h3>
              {categoryTips.map((tip) => (
                <div key={tip.id} className="tip-card">
                  <h4>{tip.tip_title}</h4>
                  <p>{tip.tip_content}</p>
                </div>
              ))}
            </div>
          ))}

          {filteredTips.length === 0 && (
            <div className="empty-state">
              <p>No tips found for the selected type.</p>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpReminders;

