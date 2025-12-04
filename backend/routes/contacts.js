// ======================================
// Professional Network Contacts Routes
// ======================================

import express from 'express';
import { auth } from '../auth.js';

const router = express.Router();

// Database pool will be passed from server.js
let pool;

// ========== GET ALL CONTACTS FOR USER ==========
// GET /api/contacts
router.get('/contacts', auth, async (req, res) => {
  try {
    const { industry, relationshipType, company, search } = req.query;
    
    let query = `
      SELECT * FROM professional_contacts 
      WHERE user_id = $1
    `;
    let params = [req.user.id];
    let paramIndex = 2;

    // Apply filters
    if (industry) {
      query += ` AND industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }
    if (relationshipType) {
      query += ` AND relationship_type = $${paramIndex}`;
      params.push(relationshipType);
      paramIndex++;
    }
    if (company) {
      query += ` AND company = $${paramIndex}`;
      params.push(company);
      paramIndex++;
    }
    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// ========== GET SINGLE CONTACT WITH DETAILS ==========
// GET /api/contacts/:id
router.get('/contacts/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact
    const contactResult = await pool.query(
      'SELECT * FROM professional_contacts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];

    // Get interaction history
    const interactionsResult = await pool.query(
      'SELECT * FROM contact_interactions WHERE contact_id = $1 ORDER BY interaction_date DESC',
      [id]
    );

    // Get reminders
    const remindersResult = await pool.query(
      'SELECT * FROM contact_reminders WHERE contact_id = $1 ORDER BY reminder_date ASC',
      [id]
    );

    // Get linked opportunities
    const linksResult = await pool.query(
      'SELECT * FROM contact_links WHERE contact_id = $1',
      [id]
    );

    // Get groups
    const groupsResult = await pool.query(
      `SELECT cg.* FROM contact_groups cg
       JOIN contact_group_mapping cgm ON cg.id = cgm.group_id
       WHERE cgm.contact_id = $1`,
      [id]
    );

    res.json({
      ...contact,
      interactions: interactionsResult.rows,
      reminders: remindersResult.rows,
      links: linksResult.rows,
      groups: groupsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contact details' });
  }
});

// ========== ADD NEW CONTACT ==========
// POST /api/contacts
router.post('/contacts', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      title,
      company,
      industry,
      relationshipType,
      relationshipStrength,
      location,
      linkedinProfile,
      notes,
      personalInterests,
      professionalInterests,
      mutualConnections,
      groups,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First and last name are required' });
    }

    console.log('Creating contact for user:', req.user.id, 'with data:', { firstName, lastName, email });

    // Insert contact
    const result = await pool.query(
      `INSERT INTO professional_contacts 
       (user_id, first_name, last_name, email, phone, title, company, industry, 
        relationship_type, relationship_strength, location, linkedin_profile, notes, 
        personal_interests, professional_interests, mutual_connections)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        req.user.id,
        firstName,
        lastName,
        email || null,
        phone || null,
        title || null,
        company || null,
        industry || null,
        relationshipType || 'Acquaintance',
        relationshipStrength || 3,
        location || null,
        linkedinProfile || null,
        notes || null,
        personalInterests || null,
        professionalInterests || null,
        mutualConnections || null,
      ]
    );

    console.log('Contact created successfully:', result.rows[0]);

    const contactId = result.rows[0].id;

    // Add to groups if provided
    if (groups && Array.isArray(groups) && groups.length > 0) {
      for (const groupId of groups) {
        await pool.query(
          'INSERT INTO contact_group_mapping (contact_id, group_id) VALUES ($1, $2)',
          [contactId, groupId]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating contact:', err.message);
    console.error('Full error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Contact with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create contact: ' + err.message });
  }
});

// ========== UPDATE CONTACT ==========
// PUT /api/contacts/:id
router.put('/contacts/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      title,
      company,
      industry,
      relationshipType,
      relationshipStrength,
      location,
      linkedinProfile,
      notes,
      personalInterests,
      professionalInterests,
      mutualConnections,
    } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE professional_contacts 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, title = $5, 
           company = $6, industry = $7, relationship_type = $8, relationship_strength = $9,
           location = $10, linkedin_profile = $11, notes = $12, personal_interests = $13,
           professional_interests = $14, mutual_connections = $15, updated_at = NOW()
       WHERE id = $16 AND user_id = $17
       RETURNING *`,
      [
        firstName,
        lastName,
        email || null,
        phone || null,
        title || null,
        company || null,
        industry || null,
        relationshipType,
        relationshipStrength,
        location || null,
        linkedinProfile || null,
        notes || null,
        personalInterests || null,
        professionalInterests || null,
        mutualConnections || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// ========== DELETE CONTACT ==========
// DELETE /api/contacts/:id
router.delete('/contacts/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM professional_contacts WHERE id = $1', [id]);

    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ========== ADD INTERACTION ==========
// POST /api/contacts/:id/interactions
router.post('/contacts/:id/interactions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { interactionType, interactionDate, notes, outcome } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO contact_interactions (contact_id, interaction_type, interaction_date, notes, outcome)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, interactionType, interactionDate, notes || null, outcome || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add interaction' });
  }
});

// ========== GET INTERACTIONS FOR CONTACT ==========
// GET /api/contacts/:id/interactions
router.get('/contacts/:id/interactions', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'SELECT * FROM contact_interactions WHERE contact_id = $1 ORDER BY interaction_date DESC',
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// ========== SET REMINDER ==========
// POST /api/contacts/:id/reminders
router.post('/contacts/:id/reminders', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderType, reminderDate, description } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO contact_reminders (contact_id, reminder_type, reminder_date, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, reminderType, reminderDate, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set reminder' });
  }
});

// ========== GET REMINDERS FOR CONTACT ==========
// GET /api/contacts/:id/reminders
router.get('/contacts/:id/reminders', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'SELECT * FROM contact_reminders WHERE contact_id = $1 ORDER BY reminder_date ASC',
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// ========== UPDATE REMINDER STATUS ==========
// PUT /api/contacts/reminders/:reminderId
router.put('/contacts/reminders/:reminderId', auth, async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { completed } = req.body;

    // Verify ownership via contact
    const checkResult = await pool.query(
      `SELECT cr.id FROM contact_reminders cr
       JOIN professional_contacts pc ON cr.contact_id = pc.id
       WHERE cr.id = $1 AND pc.user_id = $2`,
      [reminderId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'UPDATE contact_reminders SET completed = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [completed, reminderId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// ========== CREATE CONTACT GROUP ==========
// POST /api/contact-groups
router.post('/contact-groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const result = await pool.query(
      'INSERT INTO contact_groups (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Group with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// ========== GET CONTACT GROUPS FOR USER ==========
// GET /api/contact-groups
router.get('/contact-groups', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_groups WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// ========== ADD CONTACT TO GROUP ==========
// POST /api/contact-groups/:groupId/contacts/:contactId
router.post('/contact-groups/:groupId/contacts/:contactId', auth, async (req, res) => {
  try {
    const { groupId, contactId } = req.params;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM contact_groups WHERE id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to modify this group' });
    }

    // Verify contact ownership
    const contactCheck = await pool.query(
      'SELECT id FROM professional_contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user.id]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to modify this contact' });
    }

    await pool.query(
      'INSERT INTO contact_group_mapping (contact_id, group_id) VALUES ($1, $2)',
      [contactId, groupId]
    );

    res.status(201).json({ message: 'Contact added to group' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Contact already in this group' });
    }
    res.status(500).json({ error: 'Failed to add contact to group' });
  }
});

// ========== REMOVE CONTACT FROM GROUP ==========
// DELETE /api/contact-groups/:groupId/contacts/:contactId
router.delete('/contact-groups/:groupId/contacts/:contactId', auth, async (req, res) => {
  try {
    const { groupId, contactId } = req.params;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM contact_groups WHERE id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to modify this group' });
    }

    await pool.query(
      'DELETE FROM contact_group_mapping WHERE contact_id = $1 AND group_id = $2',
      [contactId, groupId]
    );

    res.json({ message: 'Contact removed from group' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove contact from group' });
  }
});

// ========== LINK CONTACT TO COMPANY/JOB ==========
// POST /api/contacts/:id/links
router.post('/contacts/:id/links', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { linkType, linkId, linkDescription } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM professional_contacts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO contact_links (contact_id, link_type, link_id, link_description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, linkType, linkId || null, linkDescription || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// ========== GET CONTACTS BY RELATIONSHIP STRENGTH ==========
// GET /api/contacts/strength/:strength
router.get('/contacts/strength/:strength', auth, async (req, res) => {
  try {
    const { strength } = req.params;

    const result = await pool.query(
      'SELECT * FROM professional_contacts WHERE user_id = $1 AND relationship_strength >= $2 ORDER BY relationship_strength DESC',
      [req.user.id, strength]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// ========== IMPORT CONTACTS FROM CSV ==========
// POST /api/contacts/import/csv
router.post('/contacts/import/csv', auth, async (req, res) => {
  try {
    const { contacts, importSource } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }

    const importedContacts = [];

    for (const contact of contacts) {
      const { firstName, lastName, email, phone, title, company, industry, relationshipType } = contact;

      if (!firstName || !lastName) continue;

      try {
        let result;
        
        // If email is provided and not empty, check for conflict
        if (email && email.trim()) {
          result = await pool.query(
            `INSERT INTO professional_contacts 
             (user_id, first_name, last_name, email, phone, title, company, industry, relationship_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id, email) DO UPDATE SET updated_at = NOW()
             RETURNING *`,
            [
              req.user.id,
              firstName,
              lastName,
              email.trim(),
              phone || null,
              title || null,
              company || null,
              industry || null,
              relationshipType || 'Acquaintance',
            ]
          );
        } else {
          // If no email, just insert (no conflict check)
          result = await pool.query(
            `INSERT INTO professional_contacts 
             (user_id, first_name, last_name, email, phone, title, company, industry, relationship_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              req.user.id,
              firstName,
              lastName,
              null,
              phone || null,
              title || null,
              company || null,
              industry || null,
              relationshipType || 'Acquaintance',
            ]
          );
        }

        importedContacts.push(result.rows[0]);
      } catch (contactErr) {
        // Log individual contact errors but continue import
        console.error(`Failed to import contact ${firstName} ${lastName}:`, contactErr.message);
      }
    }

    // Log import
    if (importedContacts.length > 0) {
      await pool.query(
        `INSERT INTO imported_contacts (user_id, import_source, contact_count, import_data)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, importSource || 'CSV', importedContacts.length, JSON.stringify({ contacts: importedContacts })]
      );
    }

    res.status(201).json({
      message: `Successfully imported ${importedContacts.length} contacts`,
      contacts: importedContacts,
    });
  } catch (err) {
    console.error('CSV Import Error:', err);
    res.status(500).json({ error: 'Failed to import contacts: ' + err.message });
  }
});

// ========== IMPORT CONTACTS FROM GOOGLE CONTACTS (vCard) ==========
// POST /api/contacts/import/google
router.post('/contacts/import/google', auth, async (req, res) => {
  try {
    const { vCardData } = req.body;

    if (!vCardData || typeof vCardData !== 'string') {
      return res.status(400).json({ error: 'No vCard data provided' });
    }

    const importedContacts = [];
    
    // Parse vCard format
    const vCards = vCardData.split('BEGIN:VCARD');
    
    for (const vCard of vCards) {
      if (!vCard.trim()) continue;
      
      try {
        const lines = ('BEGIN:VCARD' + vCard).split('\n');
        const contact = {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          title: '',
          company: '',
          linkedinProfile: '',
          notes: '',
        };

        for (const line of lines) {
          const trimmed = line.trim();
          
          // Parse FN (Full Name) - fallback if N is not available
          if (trimmed.startsWith('FN:')) {
            const fullName = trimmed.substring(3).trim();
            const parts = fullName.split(' ');
            if (parts.length >= 2) {
              contact.firstName = parts[0];
              contact.lastName = parts.slice(1).join(' ');
            }
          }
          
          // Parse N (Name) - preferred
          if (trimmed.startsWith('N:')) {
            const nameParts = trimmed.substring(2).split(';');
            if (nameParts.length >= 2) {
              contact.lastName = nameParts[0]?.trim() || '';
              contact.firstName = nameParts[1]?.trim() || '';
            }
          }
          
          // Parse EMAIL
          if (trimmed.startsWith('EMAIL')) {
            const emailMatch = trimmed.match(/EMAIL.*?:(.+)/);
            if (emailMatch) {
              contact.email = emailMatch[1].trim();
            }
          }
          
          // Parse TEL (Phone)
          if (trimmed.startsWith('TEL')) {
            const phoneMatch = trimmed.match(/TEL.*?:(.+)/);
            if (phoneMatch && !contact.phone) {
              contact.phone = phoneMatch[1].trim();
            }
          }
          
          // Parse TITLE (Job Title)
          if (trimmed.startsWith('TITLE:')) {
            contact.title = trimmed.substring(6).trim();
          }
          
          // Parse ORG (Organization/Company)
          if (trimmed.startsWith('ORG:')) {
            const org = trimmed.substring(4).trim();
            const orgParts = org.split(';');
            contact.company = orgParts[0]?.trim() || '';
          }
          
          // Parse URL (LinkedIn or other profile)
          if (trimmed.startsWith('URL')) {
            const urlMatch = trimmed.match(/URL.*?:(.+)/);
            if (urlMatch && trimmed.toLowerCase().includes('linkedin')) {
              contact.linkedinProfile = urlMatch[1].trim();
            }
          }
          
          // Parse NOTE
          if (trimmed.startsWith('NOTE:')) {
            contact.notes = trimmed.substring(5).trim();
          }
        }

        // Only add if we have at least first and last name
        if (contact.firstName && contact.lastName) {
          try {
            let result;
            
            if (contact.email && contact.email.trim()) {
              result = await pool.query(
                `INSERT INTO professional_contacts 
                 (user_id, first_name, last_name, email, phone, title, company, linkedin_profile, notes, relationship_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (user_id, email) DO UPDATE SET updated_at = NOW()
                 RETURNING *`,
                [
                  req.user.id,
                  contact.firstName,
                  contact.lastName,
                  contact.email.trim(),
                  contact.phone || null,
                  contact.title || null,
                  contact.company || null,
                  contact.linkedinProfile || null,
                  contact.notes || null,
                  'Professional Contact',
                ]
              );
            } else {
              result = await pool.query(
                `INSERT INTO professional_contacts 
                 (user_id, first_name, last_name, phone, title, company, linkedin_profile, notes, relationship_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                  req.user.id,
                  contact.firstName,
                  contact.lastName,
                  contact.phone || null,
                  contact.title || null,
                  contact.company || null,
                  contact.linkedinProfile || null,
                  contact.notes || null,
                  'Professional Contact',
                ]
              );
            }
            
            importedContacts.push(result.rows[0]);
          } catch (contactErr) {
            console.error(`Failed to import vCard contact ${contact.firstName} ${contact.lastName}:`, contactErr.message);
          }
        }
      } catch (vCardErr) {
        console.error('Failed to parse vCard:', vCardErr.message);
      }
    }

    // Log import
    if (importedContacts.length > 0) {
      await pool.query(
        `INSERT INTO imported_contacts (user_id, import_source, contact_count, import_data)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, 'Google Contacts', importedContacts.length, JSON.stringify({ contacts: importedContacts })]
      );
    }

    res.status(201).json({
      message: `Successfully imported ${importedContacts.length} contacts from Google Contacts`,
      contacts: importedContacts,
    });
  } catch (err) {
    console.error('Google Import Error:', err);
    res.status(500).json({ error: 'Failed to import Google Contacts: ' + err.message });
  }
});

// Export router and function to initialize pool
export const setContactsPool = (dbPool) => {
  pool = dbPool;
};

export default router;
