import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  MessageCircle,
  Star,
  Loader,
  ChevronDown,
  Filter,
  Download,
  Upload,
} from 'lucide-react';
import './NetworkContacts.css';

const API_BASE = 'http://localhost:4000/api';

const NetworkContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [groups, setGroups] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    company: '',
    industry: '',
    relationshipType: 'Acquaintance',
    relationshipStrength: 3,
    location: '',
    linkedinProfile: '',
    notes: '',
    personalInterests: '',
    professionalInterests: '',
  });

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(response.data);
      applyFilters(response.data);
    } catch (err) {
      setError('Failed to fetch contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/contact-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(response.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  // Apply filters
  const applyFilters = (contactsList) => {
    let filtered = contactsList;

    if (searchTerm) {
      filtered = filtered.filter(
        (contact) =>
          `${contact.first_name} ${contact.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(
        (contact) => contact.relationship_type === filterType
      );
    }

    if (filterIndustry !== 'all') {
      filtered = filtered.filter((contact) => contact.industry === filterIndustry);
    }

    setFilteredContacts(filtered);
  };

  // Handle search and filters
  useEffect(() => {
    applyFilters(contacts);
  }, [searchTerm, filterType, filterIndustry, contacts]);

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📤 Submitting form with data:', formData);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      if (editingContact) {
        console.log('✏️ Updating contact:', editingContact.id);
        await axios.put(
          `${API_BASE}/contacts/${editingContact.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        console.log('➕ Creating new contact');
        await axios.post(`${API_BASE}/contacts`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      console.log('✅ Contact saved successfully');
      setShowForm(false);
      setEditingContact(null);
      resetForm();
      fetchContacts();
    } catch (err) {
      console.error('❌ Error saving contact:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.error || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  // Delete contact
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchContacts();
    } catch (err) {
      setError('Failed to delete contact');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Edit contact
  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      company: contact.company || '',
      industry: contact.industry || '',
      relationshipType: contact.relationship_type,
      relationshipStrength: contact.relationship_strength,
      location: contact.location || '',
      linkedinProfile: contact.linkedin_profile || '',
      notes: contact.notes || '',
      personalInterests: contact.personal_interests || '',
      professionalInterests: contact.professional_interests || '',
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      company: '',
      industry: '',
      relationshipType: 'Acquaintance',
      relationshipStrength: 3,
      location: '',
      linkedinProfile: '',
      notes: '',
      personalInterests: '',
      professionalInterests: '',
    });
    setEditingContact(null);
  };

  // Get unique industries
  const industries = [...new Set(contacts.map((c) => c.industry).filter(Boolean))];
  const relationshipTypes = [
    'Colleague',
    'Manager',
    'Mentor',
    'Friend',
    'Acquaintance',
    'Recruiter',
    'Client',
  ];

  // Render relationship strength indicator
  const renderStrength = (strength) => {
    return (
      <div className="strength-indicator">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            fill={i < strength ? '#FFB84D' : 'none'}
            color={i < strength ? '#FFB84D' : '#ccc'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="network-contacts-container">
      <div className="contacts-header">
        <h1>Professional Network</h1>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={20} /> Add Contact
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={20} /> Import
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search and Filter */}
      <div className="contacts-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {relationshipTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="contacts-section">
        {loading ? (
          <div className="loading-state">
            <Loader size={32} className="spinner" />
            <p>Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={48} />
            <h3>No contacts found</h3>
            <p>
              {searchTerm || filterType !== 'all' || filterIndustry !== 'all'
                ? 'Try adjusting your filters'
                : 'Start building your professional network'}
            </p>
          </div>
        ) : (
          <div className="contacts-grid">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="contact-card"
                onClick={() => setSelectedContact(contact)}
              >
                <div className="contact-card-header">
                  <div className="contact-name">
                    <h3>
                      {contact.first_name} {contact.last_name}
                    </h3>
                    <p className="contact-title">{contact.title}</p>
                  </div>
                  <div className="contact-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(contact);
                      }}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact.id);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="contact-card-body">
                  {contact.company && (
                    <p className="contact-info">
                      <strong>Company:</strong> {contact.company}
                    </p>
                  )}
                  {contact.email && (
                    <p className="contact-info">
                      <strong>Email:</strong> {contact.email}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="contact-info">
                      <strong>Phone:</strong> {contact.phone}
                    </p>
                  )}
                  <div className="contact-tags">
                    <span className="tag relationship-tag">
                      {contact.relationship_type}
                    </span>
                    {contact.industry && (
                      <span className="tag industry-tag">{contact.industry}</span>
                    )}
                  </div>

                  <div className="relationship-strength">
                    <label>Relationship Strength:</label>
                    {renderStrength(contact.relationship_strength)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Job title"
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="Industry"
                    list="industries"
                  />
                  <datalist id="industries">
                    {industries.map((ind) => (
                      <option key={ind} value={ind} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Relationship Type</label>
                  <select
                    name="relationshipType"
                    value={formData.relationshipType}
                    onChange={handleInputChange}
                  >
                    {relationshipTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Relationship Strength (1-5)</label>
                  <input
                    type="number"
                    name="relationshipStrength"
                    min="1"
                    max="5"
                    value={formData.relationshipStrength}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>LinkedIn Profile</label>
                <input
                  type="url"
                  name="linkedinProfile"
                  value={formData.linkedinProfile}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="form-group full-width">
                <label>Professional Interests</label>
                <textarea
                  name="professionalInterests"
                  value={formData.professionalInterests}
                  onChange={handleInputChange}
                  placeholder="What they're interested in professionally"
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Personal Interests</label>
                <textarea
                  name="personalInterests"
                  value={formData.personalInterests}
                  onChange={handleInputChange}
                  placeholder="Their hobbies and interests"
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about this contact"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {selectedContact && (
        <ContactDetailsModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onRefresh={fetchContacts}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportContactsModal
          onClose={() => setShowImportModal(false)}
          onImport={() => {
            setShowImportModal(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
};

// Contact Details Modal Component
const ContactDetailsModal = ({ contact, onClose, onRefresh }) => {
  const [interactions, setInteractions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [interactionData, setInteractionData] = useState({
    interactionType: 'Email',
    interactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    outcome: '',
  });

  const [reminderData, setReminderData] = useState({
    reminderType: 'Follow-up',
    reminderDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    fetchDetails();
  }, [contact.id]);

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const [interactionsRes, remindersRes] = await Promise.all([
        axios.get(`${API_BASE}/contacts/${contact.id}/interactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/contacts/${contact.id}/reminders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setInteractions(interactionsRes.data);
      setReminders(remindersRes.data);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/contacts/${contact.id}/interactions`,
        interactionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInteractionData({
        interactionType: 'Email',
        interactionDate: new Date().toISOString().split('T')[0],
        notes: '',
        outcome: '',
      });
      setShowInteractionForm(false);
      fetchDetails();
    } catch (err) {
      console.error('Failed to add interaction:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/contacts/${contact.id}/reminders`,
        reminderData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReminderData({
        reminderType: 'Follow-up',
        reminderDate: new Date().toISOString().split('T')[0],
        description: '',
      });
      setShowReminderForm(false);
      fetchDetails();
    } catch (err) {
      console.error('Failed to add reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-large" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <div className="contact-details-header">
          <h2>
            {contact.first_name} {contact.last_name}
          </h2>
          <div className="contact-meta">
            <span className="badge">{contact.relationship_type}</span>
            {contact.industry && <span className="badge">{contact.industry}</span>}
          </div>
        </div>

        <div className="contact-details-grid">
          <div className="details-section">
            <h3>Contact Information</h3>
            {contact.email && (
              <p>
                <strong>Email:</strong> {contact.email}
              </p>
            )}
            {contact.phone && (
              <p>
                <strong>Phone:</strong> {contact.phone}
              </p>
            )}
            {contact.title && (
              <p>
                <strong>Title:</strong> {contact.title}
              </p>
            )}
            {contact.company && (
              <p>
                <strong>Company:</strong> {contact.company}
              </p>
            )}
            {contact.location && (
              <p>
                <strong>Location:</strong> {contact.location}
              </p>
            )}
            {contact.linkedin_profile && (
              <p>
                <strong>LinkedIn:</strong>{' '}
                <a href={contact.linkedin_profile} target="_blank" rel="noreferrer">
                  View Profile
                </a>
              </p>
            )}
          </div>

          <div className="details-section">
            <h3>Relationship Details</h3>
            <p>
              <strong>Strength:</strong> {contact.relationship_strength}/5 ⭐
            </p>
            {contact.professional_interests && (
              <p>
                <strong>Professional Interests:</strong>{' '}
                {contact.professional_interests}
              </p>
            )}
            {contact.personal_interests && (
              <p>
                <strong>Personal Interests:</strong> {contact.personal_interests}
              </p>
            )}
            {contact.notes && (
              <p>
                <strong>Notes:</strong> {contact.notes}
              </p>
            )}
          </div>
        </div>

        {/* Interactions Section */}
        <div className="details-section interactions-section">
          <div className="section-header">
            <h3>Interaction History</h3>
            <button
              className="btn btn-small"
              onClick={() => setShowInteractionForm(true)}
            >
              <Plus size={16} /> Log Interaction
            </button>
          </div>

          {showInteractionForm && (
            <form onSubmit={handleAddInteraction} className="interaction-form">
              <select
                value={interactionData.interactionType}
                onChange={(e) =>
                  setInteractionData((prev) => ({
                    ...prev,
                    interactionType: e.target.value,
                  }))
                }
              >
                <option value="Email">Email</option>
                <option value="Phone Call">Phone Call</option>
                <option value="In-Person Meeting">In-Person Meeting</option>
                <option value="LinkedIn Message">LinkedIn Message</option>
                <option value="Video Call">Video Call</option>
                <option value="Coffee Chat">Coffee Chat</option>
              </select>
              <input
                type="date"
                value={interactionData.interactionDate}
                onChange={(e) =>
                  setInteractionData((prev) => ({
                    ...prev,
                    interactionDate: e.target.value,
                  }))
                }
              />
              <textarea
                placeholder="Notes"
                value={interactionData.notes}
                onChange={(e) =>
                  setInteractionData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows="2"
              />
              <input
                type="text"
                placeholder="Outcome"
                value={interactionData.outcome}
                onChange={(e) =>
                  setInteractionData((prev) => ({
                    ...prev,
                    outcome: e.target.value,
                  }))
                }
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInteractionForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Log
                </button>
              </div>
            </form>
          )}

          <div className="interactions-list">
            {interactions.length === 0 ? (
              <p className="empty-text">No interactions logged yet</p>
            ) : (
              interactions.map((interaction) => (
                <div key={interaction.id} className="interaction-item">
                  <div className="interaction-header">
                    <strong>{interaction.interaction_type}</strong>
                    <span className="date">
                      {new Date(interaction.interaction_date).toLocaleDateString()}
                    </span>
                  </div>
                  {interaction.notes && <p>{interaction.notes}</p>}
                  {interaction.outcome && (
                    <p className="outcome">
                      <strong>Outcome:</strong> {interaction.outcome}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reminders Section */}
        <div className="details-section reminders-section">
          <div className="section-header">
            <h3>Reminders</h3>
            <button
              className="btn btn-small"
              onClick={() => setShowReminderForm(true)}
            >
              <Plus size={16} /> Set Reminder
            </button>
          </div>

          {showReminderForm && (
            <form onSubmit={handleAddReminder} className="reminder-form">
              <select
                value={reminderData.reminderType}
                onChange={(e) =>
                  setReminderData((prev) => ({
                    ...prev,
                    reminderType: e.target.value,
                  }))
                }
              >
                <option value="Follow-up">Follow-up</option>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Catch-up">Catch-up</option>
                <option value="Custom">Custom</option>
              </select>
              <input
                type="date"
                value={reminderData.reminderDate}
                onChange={(e) =>
                  setReminderData((prev) => ({
                    ...prev,
                    reminderDate: e.target.value,
                  }))
                }
              />
              <textarea
                placeholder="Description"
                value={reminderData.description}
                onChange={(e) =>
                  setReminderData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows="2"
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReminderForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Set Reminder
                </button>
              </div>
            </form>
          )}

          <div className="reminders-list">
            {reminders.length === 0 ? (
              <p className="empty-text">No reminders set</p>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`reminder-item ${reminder.completed ? 'completed' : ''}`}
                >
                  <div className="reminder-header">
                    <strong>{reminder.reminder_type}</strong>
                    <span className="date">
                      {new Date(reminder.reminder_date).toLocaleDateString()}
                    </span>
                  </div>
                  {reminder.description && <p>{reminder.description}</p>}
                  <label className="reminder-checkbox">
                    <input type="checkbox" checked={reminder.completed} readOnly />
                    {reminder.completed ? 'Completed' : 'Mark as complete'}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Import Contacts Modal
const ImportContactsModal = ({ onClose, onImport }) => {
  const [importMethod, setImportMethod] = useState('csv');
  const [csvData, setCsvData] = useState('');
  const [vCardData, setVCardData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleCsvFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('CSV File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      console.log('CSV Content preview (first 500 chars):', content.substring(0, 500));
      setCsvData(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read CSV file');
    };
    reader.readAsText(file);
  };

  const handleGoogleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setVCardData(event.target.result);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage('');

      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        setError('CSV file appears to be empty');
        return;
      }

      // Simple CSV parsing
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const firstNameIdx = headers.findIndex(h => h.includes('first'));
      const lastNameIdx = headers.findIndex(h => h.includes('last'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const phoneIdx = headers.findIndex(h => h.includes('phone'));
      const titleIdx = headers.findIndex(h => h.includes('title'));
      const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('organization'));

      if (firstNameIdx === -1 || lastNameIdx === -1) {
        setError('CSV must have "First Name" and "Last Name" columns');
        return;
      }

      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        const firstName = values[firstNameIdx];
        const lastName = values[lastNameIdx];

        if (firstName && lastName) {
          contacts.push({
            firstName,
            lastName,
            email: emailIdx !== -1 ? values[emailIdx] : '',
            phone: phoneIdx !== -1 ? values[phoneIdx] : '',
            title: titleIdx !== -1 ? values[titleIdx] : '',
            company: companyIdx !== -1 ? values[companyIdx] : '',
            relationshipType: 'Acquaintance',
          });
        }
      }

      if (contacts.length === 0) {
        setError('No valid contacts found in CSV');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/contacts/import/csv`,
        { contacts },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`Successfully imported ${response.data.contacts.length} contacts`);
      setTimeout(() => {
        onImport();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import CSV contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage('');

      if (!vCardData.trim()) {
        setError('No vCard data provided');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/contacts/import/google`,
        { vCardData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`✓ Successfully imported ${response.data.contacts.length} contacts from Google Contacts`);
      setTimeout(() => {
        onImport();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import Google Contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Import Contacts</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <div className="import-options">
          <div className="option active">
              <h3>Import from CSV</h3>
              <p>Upload a CSV file with contacts from Google Contacts, Outlook, Apple Contacts, or other sources.</p>
              <p className="help-text">Required: At least a "First Name" OR "Last Name" column</p>
              <p className="help-text">Supports Google Contacts export (Google CSV format) - just download and upload!</p>
              <p className="help-text">Optional columns: Email, Phone, Title, Company, Industry, Relationship Type</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="file-input"
              />
              {csvData && <p className="preview-text">✓ File ready for import</p>}
              
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCsvImport}
                  disabled={!csvData || loading}
                >
                  {loading ? 'Importing...' : 'Import CSV'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkContacts;
