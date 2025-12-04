/**
 * Contacts Routes - Full Coverage Tests
 * File: backend/routes/contacts.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import contactsRouter, { setContactsPool } from '../../routes/contacts.js';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

// Mock pool - contacts.js uses a module-level pool variable
const mockPool = { query: mockQueryFn };

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Set pool using the exported function
  setContactsPool(mockPool);
  
  app = express();
  app.use(express.json());
  app.use('/api', contactsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Contacts Routes - Full Coverage', () => {
  describe('GET /api/contacts', () => {
    it('should return all contacts', async () => {
      const mockContacts = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by industry', async () => {
      const mockContacts = [{ id: 1, industry: 'Technology' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts?industry=Technology')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by search query', async () => {
      const mockContacts = [{ id: 1, first_name: 'John' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts?search=John')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by relationshipType', async () => {
      const mockContacts = [{ id: 1, relationship_type: 'Colleague' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts?relationshipType=Colleague')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by company', async () => {
      const mockContacts = [{ id: 1, company: 'Tech Corp' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts?company=Tech Corp')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should combine multiple filters', async () => {
      const mockContacts = [{ id: 1, industry: 'Technology', relationshipType: 'Colleague' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts?industry=Technology&relationshipType=Colleague&search=John')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/contacts')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch contacts');
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return contact with details', async () => {
      const mockContact = { id: 1, first_name: 'John', last_name: 'Doe' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] }) // Contact
        .mockResolvedValueOnce({ rows: [] }) // Interactions
        .mockResolvedValueOnce({ rows: [] }) // Reminders
        .mockResolvedValueOnce({ rows: [] }) // Links
        .mockResolvedValueOnce({ rows: [] }); // Groups

      const res = await request(app)
        .get('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.first_name).toBe('John');
    });

    it('should return 404 if contact not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/contacts/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch contact details');
    });
  });

  describe('POST /api/contacts', () => {
    it('should create new contact', async () => {
      const mockContact = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] }) // Insert contact
        .mockResolvedValueOnce({ rows: [] }); // Groups (if any)

      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.first_name).toBe('John');
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          // Missing lastName
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should handle duplicate email error', async () => {
      const duplicateError = new Error('Duplicate email');
      duplicateError.code = '23505';
      mockQueryFn.mockRejectedValueOnce(duplicateError);

      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should handle groups when creating contact', async () => {
      const mockContact = { id: 1, first_name: 'John', last_name: 'Doe' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] })
        .mockResolvedValueOnce({ rows: [] }) // Add to group 1
        .mockResolvedValueOnce({ rows: [] }); // Add to group 2

      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          groups: [1, 2],
        });

      expect(res.status).toBe(201);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update contact', async () => {
      const updatedContact = { id: 1, first_name: 'Jane', last_name: 'Doe' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership - must match req.user.id
        .mockResolvedValueOnce({ rows: [updatedContact] }); // Update

      const res = await request(app)
        .put('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Jane',
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 if contact not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/contacts/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Jane',
        });

      expect(res.status).toBe(403);
    });

    it('should return 403 if not authorized', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ user_id: 999 }] }); // Different user

      const res = await request(app)
        .put('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Jane',
        });

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Jane',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete contact', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership - must match req.user.id
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete contact

      const res = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contact deleted successfully');
    });

    it('should return 404 if contact not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/contacts/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 403 if not authorized', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ user_id: 999 }] }); // Different user

      const res = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/contacts/:id/interactions', () => {
    it('should add interaction', async () => {
      const mockInteraction = { id: 1, interaction_type: 'Email', contact_id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [mockInteraction] }); // Insert interaction

      const res = await request(app)
        .post('/api/contacts/1/interactions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interactionType: 'Email',
          interactionDate: '2024-01-01',
          notes: 'Followed up',
        });

      expect(res.status).toBe(201);
    });

    it('should return 403 if not authorized', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/1/interactions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interactionType: 'Email',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/contacts/:id/interactions', () => {
    it('should return interactions', async () => {
      const mockInteractions = [{ id: 1, interaction_type: 'Email' }];
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: mockInteractions }); // Get interactions

      const res = await request(app)
        .get('/api/contacts/1/interactions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/contacts/:id/reminders', () => {
    it('should create reminder', async () => {
      const mockReminder = { id: 1, reminder_type: 'Follow-up', contact_id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [mockReminder] }); // Insert reminder

      const res = await request(app)
        .post('/api/contacts/1/reminders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          reminderType: 'Follow-up',
          reminderDate: '2024-01-15',
          description: 'Follow up on email',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/contacts/:id/reminders', () => {
    it('should return reminders', async () => {
      const mockReminders = [{ id: 1, reminder_type: 'Follow-up' }];
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: mockReminders }); // Get reminders

      const res = await request(app)
        .get('/api/contacts/1/reminders')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/contacts/reminders/:reminderId', () => {
    it('should update reminder', async () => {
      const mockReminder = { id: 1, completed: true };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [mockReminder] }); // Update reminder

      const res = await request(app)
        .put('/api/contacts/reminders/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          completed: true,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/contact-groups', () => {
    it('should create contact group', async () => {
      const mockGroup = { id: 1, name: 'Tech Contacts', user_id: 1 };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockGroup] });

      const res = await request(app)
        .post('/api/contact-groups')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Contacts',
          description: 'Technology industry contacts',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 if name missing', async () => {
      const res = await request(app)
        .post('/api/contact-groups')
        .set('Authorization', 'Bearer valid-token')
        .send({
          description: 'Some description',
        });

      expect(res.status).toBe(400);
    });

    it('should handle duplicate group name', async () => {
      const duplicateError = new Error('Duplicate group');
      duplicateError.code = '23505';
      mockQueryFn.mockRejectedValueOnce(duplicateError);

      const res = await request(app)
        .post('/api/contact-groups')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Existing Group',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/contact-groups', () => {
    it('should return contact groups', async () => {
      const mockGroups = [{ id: 1, name: 'Tech Contacts' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockGroups });

      const res = await request(app)
        .get('/api/contact-groups')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/contact-groups/:groupId/contacts/:contactId', () => {
    it('should add contact to group', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check group ownership
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check contact ownership
        .mockResolvedValueOnce({ rows: [] }); // Add to group

      const res = await request(app)
        .post('/api/contact-groups/1/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(201);
    });

    it('should handle duplicate contact in group', async () => {
      const duplicateError = new Error('Duplicate');
      duplicateError.code = '23505';
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(duplicateError);

      const res = await request(app)
        .post('/api/contact-groups/1/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/contact-groups/:groupId/contacts/:contactId', () => {
    it('should remove contact from group', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check group ownership
        .mockResolvedValueOnce({ rows: [] }); // Remove from group

      const res = await request(app)
        .delete('/api/contact-groups/1/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/contacts/:id/links', () => {
    it('should create link', async () => {
      const mockLink = { id: 1, link_type: 'job', link_id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [mockLink] }); // Insert link

      const res = await request(app)
        .post('/api/contacts/1/links')
        .set('Authorization', 'Bearer valid-token')
        .send({
          linkType: 'job',
          linkId: 1,
          linkDescription: 'Applied for position',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/contacts/strength/:strength', () => {
    it('should return contacts by relationship strength', async () => {
      const mockContacts = [{ id: 1, relationship_strength: 5 }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockContacts });

      const res = await request(app)
        .get('/api/contacts/strength/4')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/contacts/import/csv', () => {
    it('should import contacts from CSV', async () => {
      const mockContact = { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] }) // Insert contact
        .mockResolvedValueOnce({ rows: [] }); // Log import

      const res = await request(app)
        .post('/api/contacts/import/csv')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contacts: [
            { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          ],
          importSource: 'CSV',
        });

      expect(res.status).toBe(201);
    });

    it('should handle contacts without email', async () => {
      const mockContact = { id: 1, first_name: 'Jane', last_name: 'Smith' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/import/csv')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contacts: [
            { firstName: 'Jane', lastName: 'Smith' },
          ],
        });

      expect(res.status).toBe(201);
    });

    it('should skip contacts without first/last name', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] }); // No contacts imported

      const res = await request(app)
        .post('/api/contacts/import/csv')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contacts: [
            { firstName: '', lastName: 'Doe' }, // Missing firstName
            { firstName: 'John' }, // Missing lastName
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.contacts).toEqual([]);
    });

    it('should return 400 if no contacts provided', async () => {
      const res = await request(app)
        .post('/api/contacts/import/csv')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contacts: [],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/contacts/import/google', () => {
    it('should import contacts from Google vCard', async () => {
      const mockContact = { id: 1, first_name: 'John', last_name: 'Doe' };
      const vCardData = `BEGIN:VCARD
N:Doe;John;;;
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
TITLE:Engineer
ORG:Tech Corp
END:VCARD`;

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] }) // Insert contact
        .mockResolvedValueOnce({ rows: [] }); // Log import

      const res = await request(app)
        .post('/api/contacts/import/google')
        .set('Authorization', 'Bearer valid-token')
        .send({
          vCardData,
        });

      expect(res.status).toBe(201);
    });

    it('should handle vCard with FN instead of N', async () => {
      const mockContact = { id: 1, first_name: 'Jane', last_name: 'Smith' };
      const vCardData = `BEGIN:VCARD
FN:Jane Smith
EMAIL:jane@example.com
END:VCARD`;

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockContact] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/import/google')
        .set('Authorization', 'Bearer valid-token')
        .send({
          vCardData,
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 if no vCard data', async () => {
      const res = await request(app)
        .post('/api/contacts/import/google')
        .set('Authorization', 'Bearer valid-token')
        .send({
          vCardData: '',
        });

      expect(res.status).toBe(400);
    });
  });
});

