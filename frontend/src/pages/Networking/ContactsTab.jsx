// frontend/src/pages/Networking/ContactsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  getContacts, createContact, updateContact, deleteContact,
  getActivities, createActivity 
} from '../../api';
import './ContactsTab.css';

export default function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showActivityForm, setShowActivityForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    industry: '',
    linkedin_url: '',
    relationship_strength: 5,
    engagement_score: 0,
    reciprocity_score: 0,
    notes: '',
    tags: []
  });

  const [activityForm, setActivityForm] = useState({
    contact_id: null,
    activity_type: 'outreach',
    channel: 'linkedin',
    direction: 'outbound',
    subject: '',
    notes: '',
    outcome: 'positive',
    relationship_impact: 0,
    time_spent_minutes: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsRes, activitiesRes] = await Promise.all([
        getContacts(),
        getActivities()
      ]);
      setContacts(contactsRes.data.contacts || []);
      setActivities(activitiesRes.data.activities || []);
    } catch (err) {
      console.error('Error loading data:', err);
      alert('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData);
      } else {
        await createContact(formData);
      }
      await loadData();
      resetForm();
      alert(editingContact ? 'Contact updated!' : 'Contact added!');
    } catch (err) {
      console.error('Error saving contact:', err);
      alert('Failed to save contact');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deleteContact(id);
      await loadData();
      alert('Contact deleted!');
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Failed to delete contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      company: contact.company || '',
      title: contact.title || '',
      industry: contact.industry || '',
      linkedin_url: contact.linkedin_url || '',
      relationship_strength: contact.relationship_strength || 5,
      engagement_score: contact.engagement_score || 0,
      reciprocity_score: contact.reciprocity_score || 0,
      notes: contact.notes || '',
      tags: contact.tags || []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      company: '',
      title: '',
      industry: '',
      linkedin_url: '',
      relationship_strength: 5,
      engagement_score: 0,
      reciprocity_score: 0,
      notes: '',
      tags: []
    });
    setEditingContact(null);
    setShowForm(false);
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    try {
      await createActivity(activityForm);
      await loadData();
      setShowActivityForm(false);
      setActivityForm({
        contact_id: null,
        activity_type: 'outreach',
        channel: 'linkedin',
        direction: 'outbound',
        subject: '',
        notes: '',
        outcome: 'positive',
        relationship_impact: 0,
        time_spent_minutes: 0
      });
      alert('Activity logged!');
    } catch (err) {
      console.error('Error saving activity:', err);
      alert('Failed to save activity');
    }
  };

  const getRelationshipBadge = (strength) => {
    if (strength >= 8) return 'badge-strong';
    if (strength >= 5) return 'badge-medium';
    return 'badge-weak';
  };

  const getRelationshipLabel = (strength) => {
    if (strength >= 8) return 'Strong';
    if (strength >= 5) return 'Medium';
    return 'Weak';
  };

  if (loading) {
    return <div className="loading">Loading contacts...</div>;
  }

  return (
    <div className="contacts-tab">
      <div className="networking-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Professional Contacts</h2>
          <button 
            className="networking-button" 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Contact
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="networking-form">
            <div>
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label>Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div>
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label>Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>

            <div>
              <label>LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>

            <div>
              <label>Relationship Strength (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.relationship_strength}
                onChange={(e) => setFormData({ ...formData, relationship_strength: parseInt(e.target.value) })}
              />
            </div>

            <div className="full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="4"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="networking-button">
                {editingContact ? 'Update' : 'Add'} Contact
              </button>
              <button 
                type="button" 
                className="networking-button networking-button-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>No contacts yet. Add your first professional contact to get started!</p>
          </div>
        ) : (
          <table className="networking-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Title</th>
                <th>Industry</th>
                <th>Relationship</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <strong>{contact.name}</strong>
                    {contact.email && <div style={{ fontSize: '0.875rem', color: '#666' }}>{contact.email}</div>}
                  </td>
                  <td>{contact.company || '-'}</td>
                  <td>{contact.title || '-'}</td>
                  <td>{contact.industry || '-'}</td>
                  <td>
                    <span className={`networking-badge ${getRelationshipBadge(contact.relationship_strength)}`}>
                      {getRelationshipLabel(contact.relationship_strength)} ({contact.relationship_strength}/10)
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="networking-button"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                        onClick={() => {
                          setSelectedContact(contact);
                          setActivityForm({ ...activityForm, contact_id: contact.id });
                          setShowActivityForm(true);
                        }}
                      >
                        Log Activity
                      </button>
                      <button
                        className="networking-button networking-button-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                        onClick={() => handleEdit(contact)}
                      >
                        Edit
                      </button>
                      <button
                        className="networking-button networking-button-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem', background: '#ef4444' }}
                        onClick={() => handleDelete(contact.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showActivityForm && selectedContact && (
        <div className="networking-card">
          <h2>Log Activity - {selectedContact.name}</h2>
          <form onSubmit={handleActivitySubmit} className="networking-form">
            <div>
              <label>Activity Type *</label>
              <select
                value={activityForm.activity_type}
                onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                required
              >
                <option value="outreach">Outreach</option>
                <option value="conversation">Conversation</option>
                <option value="follow_up">Follow-up</option>
                <option value="coffee_chat">Coffee Chat</option>
                <option value="email">Email</option>
                <option value="linkedin_message">LinkedIn Message</option>
                <option value="phone_call">Phone Call</option>
                <option value="event_meeting">Event Meeting</option>
              </select>
            </div>

            <div>
              <label>Channel</label>
              <select
                value={activityForm.channel}
                onChange={(e) => setActivityForm({ ...activityForm, channel: e.target.value })}
              >
                <option value="linkedin">LinkedIn</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="in_person">In Person</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label>Direction</label>
              <select
                value={activityForm.direction}
                onChange={(e) => setActivityForm({ ...activityForm, direction: e.target.value })}
              >
                <option value="outbound">Outbound (You reached out)</option>
                <option value="inbound">Inbound (They reached out)</option>
              </select>
            </div>

            <div>
              <label>Outcome</label>
              <select
                value={activityForm.outcome}
                onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="no_response">No Response</option>
                <option value="referral">Referral</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>

            <div>
              <label>Relationship Impact (-2 to +2)</label>
              <input
                type="number"
                min="-2"
                max="2"
                value={activityForm.relationship_impact}
                onChange={(e) => setActivityForm({ ...activityForm, relationship_impact: parseInt(e.target.value) })}
              />
            </div>

            <div className="full-width">
              <label>Notes</label>
              <textarea
                value={activityForm.notes}
                onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="networking-button">
                Log Activity
              </button>
              <button
                type="button"
                className="networking-button networking-button-secondary"
                onClick={() => {
                  setShowActivityForm(false);
                  setSelectedContact(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

