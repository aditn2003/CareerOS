import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './MentorsCoaches.css';

const MentorsCoaches = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('manage'); // manage, progress, feedback, recommendations
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    mentor_email: '',
    relationship_type: 'mentor'
  });

  const [progressForm, setProgressForm] = useState({
    applications_submitted: 0,
    interviews_completed: 0,
    job_leads_identified: 0,
    skills_developed: '',
    challenges_faced: '',
    wins_and_achievements: '',
    next_week_goals: ''
  });

  const API_BASE = 'http://localhost:4000/api';

  // Fetch mentors
  const fetchMentors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/mentors/my-mentors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMentors(response.data.data || []);
    } catch (err) {
      console.error('Error fetching mentors:', err);
      setError('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMentors();
    }
  }, [token, fetchMentors]);

  const handleInviteMentor = async (e) => {
    e.preventDefault();
    if (!inviteForm.mentor_email) {
      setError('Please enter mentor email');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/mentors/invite`,
        inviteForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Invitation sent successfully!');
      setInviteForm({ mentor_email: '', relationship_type: 'mentor' });
      setShowInviteModal(false);
      fetchMentors();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleShareProgress = async (e) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/mentors/progress-sharing`,
        {
          relationship_id: selectedMentor.id,
          mentor_id: selectedMentor.mentor_id,
          ...progressForm
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Progress shared successfully!');
      setProgressForm({
        applications_submitted: 0,
        interviews_completed: 0,
        job_leads_identified: 0,
        skills_developed: '',
        challenges_faced: '',
        wins_and_achievements: '',
        next_week_goals: ''
      });
      setShowProgressModal(false);
      fetchMentors();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share progress');
    } finally {
      setLoading(false);
    }
  };

  const handleEndRelationship = async (relationshipId) => {
    if (window.confirm('Are you sure you want to end this mentoring relationship?')) {
      try {
        await axios.delete(
          `${API_BASE}/mentors/relationships/${relationshipId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSuccessMessage('Relationship ended');
        fetchMentors();
        setShowDetailsModal(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to end relationship');
      }
    }
  };

  const resetForms = () => {
    setInviteForm({ mentor_email: '', relationship_type: 'mentor' });
    setProgressForm({
      applications_submitted: 0,
      interviews_completed: 0,
      job_leads_identified: 0,
      skills_developed: '',
      challenges_faced: '',
      wins_and_achievements: '',
      next_week_goals: ''
    });
    setSelectedMentor(null);
  };

  // ===== MANAGE MENTORS TAB =====
  const ManageTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>My Mentors & Coaches</h2>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
          + Invite Mentor
        </button>
      </div>

      {mentors.length === 0 ? (
        <div className="empty-state">
          <p>No mentors yet. Invite a mentor or career coach to get started!</p>
        </div>
      ) : (
        <div className="mentors-grid">
          {mentors.map(rel => (
            <div key={rel.id} className="mentor-card">
              <div className="card-header">
                <h3>{rel.mentor.first_name} {rel.mentor.last_name}</h3>
                <span className={`badge-status status-${rel.status}`}>
                  {rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Title:</strong> {rel.mentor.title || 'Not specified'}</p>
                <p><strong>Company:</strong> {rel.mentor.company || 'Not specified'}</p>
                <p><strong>Experience:</strong> {rel.mentor.years_of_experience || 'N/A'} years</p>
                <p><strong>Type:</strong> {rel.relationship_type.replace('_', ' ').toUpperCase()}</p>
                {rel.mentor.expertise_areas && (
                  <p><strong>Expertise:</strong> {rel.mentor.expertise_areas}</p>
                )}
              </div>
              <div className="card-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedMentor(rel);
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedMentor(rel);
                    setShowProgressModal(true);
                  }}
                >
                  Share Progress
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===== PROGRESS SHARING TAB =====
  const ProgressTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Progress Sharing</h2>
      </div>

      {mentors.filter(m => m.status === 'active').length === 0 ? (
        <div className="empty-state">
          <p>No active mentors to share progress with. Invite a mentor first!</p>
        </div>
      ) : (
        <div className="progress-list">
          {mentors
            .filter(m => m.status === 'active')
            .map(rel => (
              <div key={rel.id} className="progress-card">
                <h3>Share Progress with {rel.mentor.first_name}</h3>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSelectedMentor(rel);
                    setShowProgressModal(true);
                  }}
                >
                  Share Update
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  // ===== FEEDBACK TAB =====
  const FeedbackTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Mentor Feedback</h2>
      </div>

      {mentors.filter(m => m.status === 'active').length === 0 ? (
        <div className="empty-state">
          <p>No active mentors. Feedback from mentors will appear here.</p>
        </div>
      ) : (
        <div className="feedback-list">
          {mentors
            .filter(m => m.status === 'active')
            .map(rel => (
              <div key={rel.id} className="feedback-card">
                <h3>Feedback from {rel.mentor.first_name}</h3>
                <p className="help-text">Feedback and guidance from your mentor will appear here</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  // ===== RECOMMENDATIONS TAB =====
  const RecommendationsTab = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Mentor Recommendations</h2>
      </div>

      {mentors.filter(m => m.status === 'active').length === 0 ? (
        <div className="empty-state">
          <p>No active mentors. Recommendations will appear here.</p>
        </div>
      ) : (
        <div className="recommendations-list">
          {mentors
            .filter(m => m.status === 'active')
            .map(rel => (
              <div key={rel.id} className="recommendation-card">
                <h3>Recommendations from {rel.mentor.first_name}</h3>
                <p className="help-text">Action items and recommendations will appear here</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mentors-coaches-container">
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          👥 Manage
        </button>
        <button
          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📊 Progress
        </button>
        <button
          className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          💬 Feedback
        </button>
        <button
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          ⭐ Recommendations
        </button>
      </div>

      {activeTab === 'manage' && <ManageTab />}
      {activeTab === 'progress' && <ProgressTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
      {activeTab === 'recommendations' && <RecommendationsTab />}

      {/* Invite Mentor Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => { setShowInviteModal(false); resetForms(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Mentor or Coach</h2>
              <button
                className="btn-close"
                onClick={() => { setShowInviteModal(false); resetForms(); }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteMentor} className="form">
              <div className="form-group">
                <label htmlFor="mentor_email">Mentor Email *</label>
                <input
                  type="email"
                  id="mentor_email"
                  value={inviteForm.mentor_email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, mentor_email: e.target.value })
                  }
                  placeholder="mentor@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="relationship_type">Relationship Type</label>
                <select
                  id="relationship_type"
                  value={inviteForm.relationship_type}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, relationship_type: e.target.value })
                  }
                >
                  <option value="mentor">Mentor</option>
                  <option value="career_coach">Career Coach</option>
                  <option value="advisor">Advisor</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowInviteModal(false); resetForms(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Sharing Modal */}
      {showProgressModal && selectedMentor && (
        <div className="modal-overlay" onClick={() => { setShowProgressModal(false); resetForms(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Progress with {selectedMentor.mentor.first_name}</h2>
              <button
                className="btn-close"
                onClick={() => { setShowProgressModal(false); resetForms(); }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleShareProgress} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="applications">Applications Submitted</label>
                  <input
                    type="number"
                    id="applications"
                    value={progressForm.applications_submitted}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        applications_submitted: parseInt(e.target.value) || 0
                      })
                    }
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="interviews">Interviews Completed</label>
                  <input
                    type="number"
                    id="interviews"
                    value={progressForm.interviews_completed}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        interviews_completed: parseInt(e.target.value) || 0
                      })
                    }
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="leads">Job Leads</label>
                  <input
                    type="number"
                    id="leads"
                    value={progressForm.job_leads_identified}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        job_leads_identified: parseInt(e.target.value) || 0
                      })
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills Developed</label>
                <textarea
                  id="skills"
                  value={progressForm.skills_developed}
                  onChange={(e) =>
                    setProgressForm({ ...progressForm, skills_developed: e.target.value })
                  }
                  placeholder="List skills you've developed or improved..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="challenges">Challenges Faced</label>
                <textarea
                  id="challenges"
                  value={progressForm.challenges_faced}
                  onChange={(e) =>
                    setProgressForm({ ...progressForm, challenges_faced: e.target.value })
                  }
                  placeholder="Share any challenges or obstacles..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="wins">Wins & Achievements</label>
                <textarea
                  id="wins"
                  value={progressForm.wins_and_achievements}
                  onChange={(e) =>
                    setProgressForm({
                      ...progressForm,
                      wins_and_achievements: e.target.value
                    })
                  }
                  placeholder="Share your achievements and wins..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="goals">Next Week Goals</label>
                <textarea
                  id="goals"
                  value={progressForm.next_week_goals}
                  onChange={(e) =>
                    setProgressForm({ ...progressForm, next_week_goals: e.target.value })
                  }
                  placeholder="What are your goals for next week?..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowProgressModal(false); resetForms(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sharing...' : 'Share Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedMentor && (
        <div className="modal-overlay" onClick={() => { setShowDetailsModal(false); resetForms(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMentor.mentor.first_name} {selectedMentor.mentor.last_name}</h2>
              <button
                className="btn-close"
                onClick={() => { setShowDetailsModal(false); resetForms(); }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="details-section">
                <p><strong>Email:</strong> {selectedMentor.mentor.email}</p>
                <p><strong>Title:</strong> {selectedMentor.mentor.title}</p>
                <p><strong>Company:</strong> {selectedMentor.mentor.company}</p>
                <p><strong>Years of Experience:</strong> {selectedMentor.mentor.years_of_experience}</p>
                {selectedMentor.mentor.bio && (
                  <p><strong>Bio:</strong> {selectedMentor.mentor.bio}</p>
                )}
                {selectedMentor.mentor.expertise_areas && (
                  <p><strong>Expertise:</strong> {selectedMentor.mentor.expertise_areas}</p>
                )}
                {selectedMentor.mentor.linkedin_url && (
                  <p>
                    <strong>LinkedIn:</strong>{' '}
                    <a href={selectedMentor.mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                      View Profile
                    </a>
                  </p>
                )}
              </div>

              <div className="details-section">
                <p><strong>Relationship Status:</strong> {selectedMentor.status}</p>
                {selectedMentor.start_date && (
                  <p><strong>Started:</strong> {selectedMentor.start_date}</p>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDetailsModal(false); resetForms(); }}
              >
                Close
              </button>
              {selectedMentor.status === 'active' && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleEndRelationship(selectedMentor.id)}
                >
                  End Relationship
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorsCoaches;
