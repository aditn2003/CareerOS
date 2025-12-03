import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  MessageSquare,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Zap,
  Heart,
  FileText,
  Info,
  ChevronDown,
} from 'lucide-react';
import './ReferralRequests.css';

const API_BASE = 'http://localhost:4000/api';

const ReferralRequests = () => {
  // State management
  const [referrals, setReferrals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all'); // NEW: filter by outcome
  const [statistics, setStatistics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timingRecommendations, setTimingRecommendations] = useState(null);
  const [suggestedContacts, setSuggestedContacts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    contact_id: '',
    job_id: '',
    job_title: '',
    company: '',
    referral_message: '',
    why_good_fit: '',
    industry_keywords: '',
    request_timing_score: 5,
    personalization_score: 5,
  });

  // Fetch referral requests based on filter status
  useEffect(() => {
    fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterOutcome]);

  // Fetch jobs, contacts, statistics once on mount
  useEffect(() => {
    fetchJobs();
    fetchContacts();
    fetchStatistics();
    fetchAnalytics();
  }, []);

  // Fetch referral requests
  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('token');
      let query = '';
      
      if (filterStatus !== 'all') {
        query += `?status=${filterStatus}`;
      }
      
      if (filterOutcome !== 'all') {
        query += query ? `&outcome=${filterOutcome}` : `?outcome=${filterOutcome}`;
      }

      const { data } = await axios.get(
        `${API_BASE}/referrals/requests${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setReferrals([]);
    }
  };

  // Fetch jobs for dropdown
  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000, // 5 second timeout
      });
      console.log('Jobs response:', data);
      // Ensure data is an array
      setJobs(Array.isArray(data) ? data : data?.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err.message);
      setJobs([]);
      setError(`Failed to load jobs: ${err.message}`);
    }
  };

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000, // 5 second timeout
      });
      console.log('Contacts response:', data);
      // Ensure data is an array
      setContacts(Array.isArray(data) ? data : data?.contacts || []);
    } catch (err) {
      console.error('Error fetching contacts:', err.message);
      setContacts([]);
      setError(`Failed to load contacts: ${err.message}`);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/referrals/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatistics(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/referrals/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  // Get timing recommendations when contact changes
  const handleContactChange = async (contactId) => {
    setFormData({ ...formData, contact_id: contactId });

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/referrals/recommendations/timing/${contactId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimingRecommendations(data);
    } catch (err) {
      console.error('Error fetching timing recommendations:', err);
    }
  };

  // Get suggested contacts when job changes
  const handleJobChange = async (jobId) => {
    const selectedJob = jobs.find(j => j.id === parseInt(jobId));
    if (selectedJob) {
      setFormData({
        ...formData,
        job_id: jobId,
        job_title: selectedJob.title,
        company: selectedJob.company
      });

      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(
          `${API_BASE}/referrals/suggestions/contacts/${jobId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuggestedContacts(Array.isArray(data?.suggestedContacts) ? data.suggestedContacts : []);
      } catch (err) {
        console.error('Error fetching suggested contacts:', err);
        setSuggestedContacts([]);
      }
    }
  };

  // Create new referral request
  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!formData.contact_id || !formData.job_title || !formData.company) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/referrals/requests`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Referral request created successfully!');
      setFormData({
        contact_id: '',
        job_id: '',
        job_title: '',
        company: '',
        referral_message: '',
        why_good_fit: '',
        industry_keywords: '',
        request_timing_score: 5,
        personalization_score: 5,
      });
      setShowCreateModal(false);
      fetchReferrals();
      fetchAnalytics();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create referral request');
    } finally {
      setLoading(false);
    }
  };

  // Update referral request
  const handleUpdateReferral = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE}/referrals/requests/${selectedReferral.id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Referral request updated successfully!');
      fetchReferrals();
      setShowDetailsModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update referral request');
    }
  };

  // Delete referral request
  const handleDeleteReferral = async (id) => {
    if (window.confirm('Are you sure you want to delete this referral request?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE}/referrals/requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('Referral request deleted successfully!');
        fetchReferrals();
        setShowDetailsModal(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete referral request');
      }
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      contact_id: '',
      job_id: '',
      job_title: '',
      company: '',
      referral_message: '',
      why_good_fit: '',
      industry_keywords: '',
      request_timing_score: 5,
      personalization_score: 5,
    });
    setSuggestedContacts([]);
    setTimingRecommendations(null);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      accepted: '#4CAF50',
      referred: '#2196F3',
      rejected: '#F44336',
      withdrawn: '#9E9E9E',
      completed: '#8BC34A',
    };
    return colors[status] || '#757575';
  };

  // Get status badge icon
  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock size={16} />,
      accepted: <CheckCircle size={16} />,
      referred: <Send size={16} />,
      rejected: <AlertCircle size={16} />,
      withdrawn: <AlertCircle size={16} />,
      completed: <CheckCircle size={16} />,
    };
    return icons[status] || <Clock size={16} />;
  };

  return (
    <div className="referral-requests-container">
      {/* Header */}
      <div className="referral-header">
        <h1>Referral Requests</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            New Referral
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

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="analytics-grid">
          <div 
            className="analytics-card" 
            onClick={() => { setFilterStatus('all'); setFilterOutcome('all'); }}
            style={{ cursor: 'pointer' }}
            title="Click to see all referrals"
          >
            <div className="analytics-icon" style={{ color: '#2196F3' }}>
              <FileText size={32} />
            </div>
            <div className="analytics-content">
              <p className="analytics-label">Total Requests</p>
              <p className="analytics-value">{analytics.totalRequests}</p>
            </div>
          </div>

          <div 
            className="analytics-card"
            onClick={() => { setFilterStatus('all'); setFilterOutcome('interview_scheduled'); }}
            style={{ cursor: 'pointer' }}
            title="Click to see referrals that led to interviews"
          >
            <div className="analytics-icon" style={{ color: '#9C27B0' }}>
              <Zap size={32} />
            </div>
            <div className="analytics-content">
              <p className="analytics-label">Interviews</p>
              <p className="analytics-value">{analytics.interviewsFromReferrals}</p>
            </div>
          </div>

          <div 
            className="analytics-card"
            onClick={() => { setFilterStatus('all'); setFilterOutcome('job_offer'); }}
            style={{ cursor: 'pointer' }}
            title="Click to see referrals that led to offers"
          >
            <div className="analytics-icon" style={{ color: '#E91E63' }}>
              <TrendingUp size={32} />
            </div>
            <div className="analytics-content">
              <p className="analytics-label">Job Offers</p>
              <p className="analytics-value">{analytics.offersFromReferrals}</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon" style={{ color: '#4CAF50' }}>
              <CheckCircle size={32} />
            </div>
            <div className="analytics-content">
              <p className="analytics-label">Success Rate</p>
              <p className="analytics-value">{analytics.successRate}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="referral-filter">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <label>Filter by Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="referred">Referred</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label>Filter by Outcome:</label>
            <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
              <option value="all">All Outcomes</option>
              <option value="interview_scheduled">Interviews</option>
              <option value="job_offer">Job Offers</option>
              <option value="rejected">Rejected</option>
              <option value="in_progress">In Progress</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {(filterStatus !== 'all' || filterOutcome !== 'all') && (
          <button 
            onClick={() => { setFilterStatus('all'); setFilterOutcome('all'); }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Referrals List */}
      <div className="referrals-list">
        {referrals && referrals.length > 0 ? (
          referrals.map((referral) => (
            <div
              key={referral.id}
              className="referral-card"
              onClick={() => {
                setSelectedReferral(referral);
                setShowDetailsModal(true);
              }}
            >
              <div className="referral-card-header">
                <div className="referral-title">
                  <h3>{referral.job_title}</h3>
                  <p className="company">{referral.company}</p>
                </div>
                <div
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(referral.status) }}
                >
                  {getStatusIcon(referral.status)}
                  {referral.status}
                </div>
              </div>

              <div className="referral-card-body">
                <div className="referral-info">
                  <span className="info-item">
                    <Phone size={16} />
                    {referral.contact?.first_name} {referral.contact?.last_name}
                  </span>
                  <span className="info-item">
                    <Mail size={16} />
                    {referral.contact?.email || 'N/A'}
                  </span>
                  <span className="info-item">
                    <Calendar size={16} />
                    {new Date(referral.requested_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="referral-card-footer">
                <button
                  className="btn-small btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReferral(referral.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data">No referral requests yet. Create your first one!</p>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { resetForm(); setShowCreateModal(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Referral Request</h2>
              <button
                className="btn-close"
                onClick={() => { resetForm(); setShowCreateModal(false); }}
              >
                ✕
              </button>
            </div>

            {jobs.length === 0 || contacts.length === 0 ? (
              <div className="referral-form">
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    placeholder="e.g., Google"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Select Contact to Refer *</label>
                  {contacts.length === 0 ? (
                    <p style={{ color: '#999', padding: '10px' }}>Loading your contacts...</p>
                  ) : (
                    <select
                      value={formData.contact_id}
                      onChange={(e) => handleContactChange(e.target.value)}
                      required
                    >
                      <option value="">-- Select a contact --</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                          {contact.company ? ` (${contact.company})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Referral Message</label>
                  <textarea
                    value={formData.referral_message}
                    onChange={(e) =>
                      setFormData({ ...formData, referral_message: e.target.value })
                    }
                    placeholder="Write a personalized message to your referral contact"
                    rows={4}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { resetForm(); setShowCreateModal(false); }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    disabled={contacts.length === 0}
                    onClick={() => {
                      if (formData.job_title && formData.company && formData.contact_id) {
                        handleCreateReferral({ preventDefault: () => {} });
                      }
                    }}
                  >
                    {contacts.length === 0 ? 'Loading contacts...' : 'Create Referral Request'}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreateReferral} className="referral-form">
              <div className="form-group">
                <label>Job Title *</label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div className="form-group">
                <label>Company *</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder="e.g., Google"
                  required
                />
              </div>

              {suggestedContacts.length > 0 && (
                <div className="form-section">
                  <h4>Suggested Referral Contacts</h4>
                  <p className="section-hint">
                    These contacts have connections to this company/industry
                  </p>
                  {suggestedContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className="suggested-contact"
                      onClick={() => handleContactChange(contact.id)}
                    >
                      {contact.first_name} {contact.last_name}
                      {contact.company && <span> • {contact.company}</span>}
                    </button>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>Select Contact to Refer *</label>
                {contacts.length === 0 ? (
                  <p style={{ color: '#999' }}>Loading your contacts...</p>
                ) : (
                  <select
                    value={formData.contact_id}
                    onChange={(e) => handleContactChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select a contact --</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.company ? ` (${contact.company})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {timingRecommendations && (
                <div className="timing-recommendation" style={{
                  backgroundColor: 
                    timingRecommendations.recommendedTiming === 'wait' ? '#FFE0E0' :
                    timingRecommendations.recommendedTiming === 'multiple' ? '#FFF3CD' :
                    '#E0F0FF',
                  borderLeft: `4px solid ${
                    timingRecommendations.recommendedTiming === 'wait' ? '#F44336' :
                    timingRecommendations.recommendedTiming === 'multiple' ? '#FF9800' :
                    '#2196F3'
                  }`
                }}>
                  <Info size={16} />
                  <div>
                    <strong>
                      {timingRecommendations.recommendedTiming === 'multiple' 
                        ? '⚠️ Multiple Referrals' 
                        : 'Timing Recommendation:'}
                    </strong>
                    <p>{timingRecommendations.reason}</p>
                    {timingRecommendations.daysToWait > 0 && (
                      <p>Wait {timingRecommendations.daysToWait} more days</p>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Why Are They a Good Fit?</label>
                <textarea
                  value={formData.why_good_fit}
                  onChange={(e) =>
                    setFormData({ ...formData, why_good_fit: e.target.value })
                  }
                  placeholder="Explain how this person's background aligns with the position"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Industry Keywords</label>
                <input
                  type="text"
                  value={formData.industry_keywords}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      industry_keywords: e.target.value,
                    })
                  }
                  placeholder="e.g., Machine Learning, Cloud Architecture"
                />
              </div>

              <div className="form-group">
                <label>Referral Message</label>
                <textarea
                  value={formData.referral_message}
                  onChange={(e) =>
                    setFormData({ ...formData, referral_message: e.target.value })
                  }
                  placeholder="Write a personalized message to your referral contact"
                  rows={4}
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Request Timing Score (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.request_timing_score}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        request_timing_score: parseInt(e.target.value),
                      })
                    }
                  />
                  <span>{formData.request_timing_score}/10</span>
                </div>

                <div className="form-group">
                  <label>Personalization Score (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.personalization_score}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalization_score: parseInt(e.target.value),
                      })
                    }
                  />
                  <span>{formData.personalization_score}/10</span>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { resetForm(); setShowCreateModal(false); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Referral Request'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedReferral && (
        <ReferralDetailsModal
          referral={selectedReferral}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={handleUpdateReferral}
          onDelete={handleDeleteReferral}
        />
      )}
    </div>
  );
};

// Referral Details Modal Component
const ReferralDetailsModal = ({ referral, onClose, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: referral.status,
    referral_outcome: referral.referral_outcome,
    gratitude_expressed: referral.gratitude_expressed,
    referrer_notes: referral.referrer_notes,
  });

  const handleSave = async () => {
    await onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{referral.job_title}</h2>
            <p>{referral.company}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="referral-details">
          {/* Contact Information */}
          <div className="details-section">
            <h3>Referral Contact</h3>
            <div className="details-grid">
              <div className="detail-item">
                <label>Name</label>
                <p>{referral.contact?.first_name} {referral.contact?.last_name}</p>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <p>{referral.contact?.email || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <label>Company</label>
                <p>{referral.contact?.company || 'N/A'}</p>
              </div>
              <div className="detail-item">
                <label>Title</label>
                <p>{referral.contact?.title || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="details-section">
            <h3>Request Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <label>Status</label>
                {isEditing ? (
                  <select
                    value={editData.status}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="referred">Referred</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <p>{referral.status}</p>
                )}
              </div>
              <div className="detail-item">
                <label>Requested</label>
                <p>{new Date(referral.requested_date).toLocaleDateString()}</p>
              </div>
              <div className="detail-item">
                <label>Outcome</label>
                {isEditing ? (
                  <select
                    value={editData.referral_outcome || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, referral_outcome: e.target.value || null })
                    }
                  >
                    <option value="">Unknown</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="job_offer">Job Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                ) : (
                  <p>{referral.referral_outcome || 'Unknown'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {referral.referral_message && (
            <div className="details-section">
              <h3>Referral Message</h3>
              <p className="message-text">{referral.referral_message}</p>
            </div>
          )}

          {/* Notes */}
          <div className="details-section">
            <h3>Notes</h3>
            {isEditing ? (
              <textarea
                value={editData.referrer_notes || ''}
                onChange={(e) =>
                  setEditData({ ...editData, referrer_notes: e.target.value })
                }
                placeholder="Add notes about this referral request"
                rows={3}
              />
            ) : (
              <p>{referral.referrer_notes || 'No notes added'}</p>
            )}
          </div>

          {/* Gratitude */}
          <div className="details-section">
            {isEditing ? (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editData.gratitude_expressed}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      gratitude_expressed: e.target.checked,
                    })
                  }
                />
                <span>I have expressed gratitude to this person</span>
              </label>
            ) : (
              <p>
                {referral.gratitude_expressed ? (
                  <span style={{ color: '#4CAF50' }}>✓ Gratitude expressed</span>
                ) : (
                  <span style={{ color: '#9E9E9E' }}>Gratitude not yet expressed</span>
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            {!isEditing ? (
              <>
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  className="btn-danger"
                  onClick={() => onDelete(referral.id)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
                <button className="btn-primary" onClick={onClose}>
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralRequests;
