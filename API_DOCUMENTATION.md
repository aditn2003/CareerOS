# Professional Network Contacts - API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints Overview

### Contacts Management

#### 1. List All Contacts
```http
GET /contacts
```

**Query Parameters:**
- `industry` (optional): Filter by industry
- `relationshipType` (optional): Filter by relationship type
- `company` (optional): Filter by company
- `search` (optional): Search by name or email

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 42,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "title": "Senior Engineer",
    "company": "TechCorp",
    "industry": "Technology",
    "relationship_type": "Colleague",
    "relationship_strength": 4,
    "location": "San Francisco, CA",
    "linkedin_profile": "https://linkedin.com/in/johndoe",
    "notes": "Great contact for networking",
    "personal_interests": "Photography, Hiking",
    "professional_interests": "Cloud Architecture",
    "mutual_connections": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

#### 2. Get Single Contact with Details
```http
GET /contacts/:id
```

**Path Parameters:**
- `id` (required): Contact ID

**Response (200 OK):**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "title": "Senior Engineer",
  "company": "TechCorp",
  "industry": "Technology",
  "relationship_type": "Colleague",
  "relationship_strength": 4,
  "location": "San Francisco, CA",
  "linkedin_profile": "https://linkedin.com/in/johndoe",
  "notes": "Great contact for networking",
  "personal_interests": "Photography, Hiking",
  "professional_interests": "Cloud Architecture",
  "mutual_connections": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "interactions": [
    {
      "id": 101,
      "contact_id": 1,
      "interaction_type": "Email",
      "interaction_date": "2024-01-20",
      "notes": "Discussed new project opportunities",
      "outcome": "Positive",
      "created_at": "2024-01-20T14:00:00Z"
    }
  ],
  "reminders": [
    {
      "id": 201,
      "contact_id": 1,
      "reminder_type": "Follow-up",
      "reminder_date": "2024-02-01",
      "description": "Follow up on project discussion",
      "completed": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "links": [
    {
      "id": 301,
      "contact_id": 1,
      "link_type": "Company",
      "link_id": 50,
      "link_description": "Works at TechCorp",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "groups": [
    {
      "id": 10,
      "user_id": 42,
      "name": "Tech Network",
      "description": "Contacts in tech industry",
      "created_at": "2024-01-10T10:30:00Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Contact doesn't exist or not owned by user
- `403 Forbidden`: Not authorized to access this contact

---

#### 3. Create New Contact
```http
POST /contacts
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "title": "Senior Engineer",
  "company": "TechCorp",
  "industry": "Technology",
  "relationshipType": "Colleague",
  "relationshipStrength": 4,
  "location": "San Francisco, CA",
  "linkedinProfile": "https://linkedin.com/in/johndoe",
  "notes": "Great contact for networking",
  "personalInterests": "Photography, Hiking",
  "professionalInterests": "Cloud Architecture",
  "mutualConnections": null,
  "groups": [1, 2]
}
```

**Required Fields:**
- `firstName`
- `lastName`

**Response (201 Created):**
```json
{
  "id": 1,
  "user_id": 42,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "title": "Senior Engineer",
  "company": "TechCorp",
  "industry": "Technology",
  "relationship_type": "Colleague",
  "relationship_strength": 4,
  "location": "San Francisco, CA",
  "linkedin_profile": "https://linkedin.com/in/johndoe",
  "notes": "Great contact for networking",
  "personal_interests": "Photography, Hiking",
  "professional_interests": "Cloud Architecture",
  "mutual_connections": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Email already exists for user

---

#### 4. Update Contact
```http
PUT /contacts/:id
```

**Path Parameters:**
- `id` (required): Contact ID

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "relationshipStrength": 5
}
```

**Response (200 OK):**
Same as create response with updated fields

**Error Responses:**
- `404 Not Found`: Contact doesn't exist
- `403 Forbidden`: Not authorized

---

#### 5. Delete Contact
```http
DELETE /contacts/:id
```

**Path Parameters:**
- `id` (required): Contact ID

**Response (200 OK):**
```json
{
  "message": "Contact deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Contact doesn't exist
- `403 Forbidden`: Not authorized

---

### Interaction Management

#### 6. Log Interaction
```http
POST /contacts/:id/interactions
```

**Path Parameters:**
- `id` (required): Contact ID

**Request Body:**
```json
{
  "interactionType": "Email",
  "interactionDate": "2024-01-20",
  "notes": "Discussed new project opportunities",
  "outcome": "Positive"
}
```

**Valid Interaction Types:**
- Email
- Phone Call
- In-Person Meeting
- LinkedIn Message
- Video Call
- Coffee Chat

**Response (201 Created):**
```json
{
  "id": 101,
  "contact_id": 1,
  "interaction_type": "Email",
  "interaction_date": "2024-01-20",
  "notes": "Discussed new project opportunities",
  "outcome": "Positive",
  "created_at": "2024-01-20T14:00:00Z"
}
```

---

#### 7. Get Interactions for Contact
```http
GET /contacts/:id/interactions
```

**Path Parameters:**
- `id` (required): Contact ID

**Response (200 OK):**
```json
[
  {
    "id": 101,
    "contact_id": 1,
    "interaction_type": "Email",
    "interaction_date": "2024-01-20",
    "notes": "Discussed new project opportunities",
    "outcome": "Positive",
    "created_at": "2024-01-20T14:00:00Z"
  },
  {
    "id": 102,
    "contact_id": 1,
    "interaction_type": "Phone Call",
    "interaction_date": "2024-01-15",
    "notes": "Initial phone conversation",
    "outcome": "Follow-up scheduled",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### Reminder Management

#### 8. Set Reminder
```http
POST /contacts/:id/reminders
```

**Path Parameters:**
- `id` (required): Contact ID

**Request Body:**
```json
{
  "reminderType": "Follow-up",
  "reminderDate": "2024-02-01",
  "description": "Follow up on project discussion"
}
```

**Valid Reminder Types:**
- Follow-up
- Birthday
- Anniversary
- Catch-up
- Custom

**Response (201 Created):**
```json
{
  "id": 201,
  "contact_id": 1,
  "reminder_type": "Follow-up",
  "reminder_date": "2024-02-01",
  "description": "Follow up on project discussion",
  "completed": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

#### 9. Get Reminders for Contact
```http
GET /contacts/:id/reminders
```

**Path Parameters:**
- `id` (required): Contact ID

**Response (200 OK):**
```json
[
  {
    "id": 201,
    "contact_id": 1,
    "reminder_type": "Follow-up",
    "reminder_date": "2024-02-01",
    "description": "Follow up on project discussion",
    "completed": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

#### 10. Update Reminder Status
```http
PUT /contacts/reminders/:reminderId
```

**Path Parameters:**
- `reminderId` (required): Reminder ID

**Request Body:**
```json
{
  "completed": true
}
```

**Response (200 OK):**
```json
{
  "id": 201,
  "contact_id": 1,
  "reminder_type": "Follow-up",
  "reminder_date": "2024-02-01",
  "description": "Follow up on project discussion",
  "completed": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

---

### Contact Groups

#### 11. Create Contact Group
```http
POST /contact-groups
```

**Request Body:**
```json
{
  "name": "Tech Network",
  "description": "Contacts in tech industry"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "user_id": 42,
  "name": "Tech Network",
  "description": "Contacts in tech industry",
  "created_at": "2024-01-10T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing name field
- `409 Conflict`: Group name already exists

---

#### 12. Get Contact Groups
```http
GET /contact-groups
```

**Response (200 OK):**
```json
[
  {
    "id": 10,
    "user_id": 42,
    "name": "Tech Network",
    "description": "Contacts in tech industry",
    "created_at": "2024-01-10T10:30:00Z"
  },
  {
    "id": 11,
    "user_id": 42,
    "name": "Recruiters",
    "description": "Recruitment professionals",
    "created_at": "2024-01-12T10:30:00Z"
  }
]
```

---

#### 13. Add Contact to Group
```http
POST /contact-groups/:groupId/contacts/:contactId
```

**Path Parameters:**
- `groupId` (required): Group ID
- `contactId` (required): Contact ID

**Response (201 Created):**
```json
{
  "message": "Contact added to group"
}
```

**Error Responses:**
- `409 Conflict`: Contact already in group

---

#### 14. Remove Contact from Group
```http
DELETE /contact-groups/:groupId/contacts/:contactId
```

**Path Parameters:**
- `groupId` (required): Group ID
- `contactId` (required): Contact ID

**Response (200 OK):**
```json
{
  "message": "Contact removed from group"
}
```

---

### Contact Links

#### 15. Link Contact to Company/Job
```http
POST /contacts/:id/links
```

**Path Parameters:**
- `id` (required): Contact ID

**Request Body:**
```json
{
  "linkType": "Company",
  "linkId": 50,
  "linkDescription": "Works at TechCorp"
}
```

**Valid Link Types:**
- Company
- Job Opportunity
- Project
- Other

**Response (201 Created):**
```json
{
  "id": 301,
  "contact_id": 1,
  "link_type": "Company",
  "link_id": 50,
  "link_description": "Works at TechCorp",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Advanced Filters

#### 16. Get Contacts by Relationship Strength
```http
GET /contacts/strength/:strength
```

**Path Parameters:**
- `strength` (required): Minimum relationship strength (1-5)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "relationship_strength": 5,
    ...
  },
  {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "relationship_strength": 4,
    ...
  }
]
```

Returns all contacts with relationship_strength >= specified strength

---

### Import

#### 17. Import Contacts from CSV
```http
POST /contacts/import/csv
```

**Request Body:**
```json
{
  "contacts": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "title": "Engineer",
      "company": "TechCorp",
      "industry": "Technology",
      "relationshipType": "Colleague"
    },
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "555-5678",
      "title": "Manager",
      "company": "StartupXYZ",
      "industry": "Technology",
      "relationshipType": "Manager"
    }
  ],
  "importSource": "CSV"
}
```

**Response (201 Created):**
```json
{
  "message": "Successfully imported 2 contacts",
  "contacts": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      ...
    },
    {
      "id": 2,
      "first_name": "Jane",
      "last_name": "Smith",
      ...
    }
  ]
}
```

**Notes:**
- Duplicate emails per user are updated, not re-added
- Required: firstName and lastName
- Returns count of successfully imported contacts

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "First and last name are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized"
}
```

### 404 Not Found
```json
{
  "error": "Contact not found"
}
```

### 409 Conflict
```json
{
  "error": "Contact with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch contacts"
}
```

---

## Example Usage (cURL)

### Create a Contact
```bash
curl -X POST http://localhost:4000/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "title": "Engineer",
    "company": "TechCorp",
    "relationshipType": "Colleague",
    "relationshipStrength": 4
  }'
```

### Get All Contacts
```bash
curl -X GET http://localhost:4000/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Type
```bash
curl -X GET "http://localhost:4000/api/contacts?relationshipType=Colleague&industry=Technology" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Log Interaction
```bash
curl -X POST http://localhost:4000/api/contacts/1/interactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interactionType": "Email",
    "interactionDate": "2024-01-20",
    "notes": "Discussed opportunities",
    "outcome": "Positive"
  }'
```

### Set Reminder
```bash
curl -X POST http://localhost:4000/api/contacts/1/reminders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reminderType": "Follow-up",
    "reminderDate": "2024-02-01",
    "description": "Follow up on discussion"
  }'
```

---

## Rate Limiting
Not currently implemented. Add as needed for production.

## Pagination
Not currently implemented. Add limit/offset parameters to list endpoints as needed.

## Versioning
Current API version: v1 (implicit)

## Changelog
- v1.0.0 - Initial implementation (January 2024)
