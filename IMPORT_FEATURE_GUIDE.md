# Contact Import Feature Guide

## Overview
The professional network management system now supports importing contacts from two sources:
1. **CSV Files** - General comma-separated values format
2. **Google Contacts** - vCard format (standard iOS/Android format)

## ✨ New Features

### 1. CSV Import
- **File Format**: `.csv`
- **Required Columns**: 
  - `first_name`
  - `last_name`
- **Optional Columns**: 
  - `email`
  - `phone`
  - `title`
  - `company`
  - `industry`
  - `relationship_type`
- **Supported Relationship Types**: Colleague, Manager, Mentor, Friend, Acquaintance, Recruiter, Client, Other

**Example CSV:**
```csv
first_name,last_name,email,phone,title,company,industry,relationship_type
John,Smith,john@example.com,555-0101,Senior Developer,Tech Corp,Technology,Colleague
Sarah,Johnson,sarah@example.com,555-0102,Product Manager,Innovation Inc,Technology,Manager
Michael,Brown,michael@example.com,555-0103,Sales Manager,Sales Pro,Sales,Recruiter
```

### 2. Google Contacts Import (vCard)
- **File Format**: `.vcf` or `.vcard`
- **Extracted Data**:
  - Full name (parsed into first/last)
  - Email addresses
  - Phone numbers
  - Job title
  - Company/Organization
  - LinkedIn profile URLs
  - Personal notes
  - Relationship type (set to "Professional Contact")

**How to Export from Google Contacts:**
1. Go to [contacts.google.com](https://contacts.google.com)
2. Click "Manage" → "Export" (left sidebar)
3. Select "vCard (for iOS Contacts)"
4. Choose contacts to export (All Contacts, Google Contacts, or specific groups)
5. Click "Export"
6. Save the `.vcf` file

## 🚀 Using the Import Feature

### Step 1: Open Import Dialog
- Click the **"Import"** button in the contacts header
- A modal will open with two tabs: "📄 CSV Import" and "📧 Google Contacts"

### Step 2: Choose Import Method

#### CSV Import
1. Select the "📄 CSV Import" tab
2. Click the file input area to browse or drag-and-drop a CSV file
3. Ensure your CSV has required columns (first_name, last_name)
4. Click "Import CSV"
5. Wait for confirmation message

#### Google Contacts Import
1. Select the "📧 Google Contacts" tab
2. Follow the on-screen instructions to export from Google Contacts
3. Click the file input area to browse or drag-and-drop the .vcf file
4. Click "Import Google Contacts"
5. Wait for confirmation message

### Step 3: Verify Imported Contacts
- Contacts appear in your main contact list
- Check that all information was correctly imported
- Edit any contacts if needed to add missing details

## 🔄 Backend API Endpoints

### CSV Import
```
POST /api/contacts/import/csv
Authorization: Bearer <token>

Request Body:
{
  "contacts": [
    {
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "phone": "555-0101",
      "title": "Developer",
      "company": "Tech Corp",
      "industry": "Technology",
      "relationshipType": "Colleague"
    }
  ],
  "importSource": "CSV"
}

Response:
{
  "message": "Successfully imported 1 contacts",
  "contacts": [...]
}
```

### Google Contacts Import
```
POST /api/contacts/import/google
Authorization: Bearer <token>

Request Body:
{
  "vCardData": "BEGIN:VCARD\nVERSION:3.0\n..."
}

Response:
{
  "message": "Successfully imported 1 contacts from Google Contacts",
  "contacts": [...]
}
```

## 🛠️ Technical Implementation

### Backend Changes
- **File**: `backend/routes/contacts.js`
- **New Endpoints**:
  - `POST /api/contacts/import/csv` - CSV import with smart parsing
  - `POST /api/contacts/import/google` - vCard parsing and import
- **Features**:
  - Null email handling (doesn't require email)
  - Duplicate email detection (ON CONFLICT for existing emails)
  - Individual error handling (continues import if one contact fails)
  - Comprehensive logging of imports

### Frontend Changes
- **File**: `frontend/src/components/NetworkContacts.jsx`
- **Updated Component**: `ImportContactsModal`
- **Features**:
  - Tab-based UI for easy switching between import methods
  - Drag-and-drop file upload support
  - Real-time validation feedback
  - Success/error messages
  - Instructions for Google Contacts export
- **File**: `frontend/src/components/NetworkContacts.css`
- **New Styles**: 
  - `.import-tabs` - Tab navigation
  - `.import-options` - Tab content display
  - `.instructions` - Step-by-step export guide
  - Responsive design for mobile/tablet

## ✅ Duplicate Handling

### CSV Import
- If email is provided and matches existing contact email: **Updates** the existing contact (updates timestamp)
- If no email or empty email: **Creates** new contact (no duplicate check)
- Multiple imports from same batch: Allows duplicates within batch

### Google Contacts Import
- Same logic as CSV import
- LinkedIn profiles linked if present in vCard

## 📊 Supported vCard Format

The system parses standard vCard format (v3.0) with these properties:

| Property | Maps To | Notes |
|----------|---------|-------|
| FN | Full Name (fallback) | Used if N property missing |
| N | Last Name, First Name | Preferred name format |
| EMAIL | Email | Extracted from EMAIL:value |
| TEL | Phone | First phone number used |
| TITLE | Job Title | Stored in title field |
| ORG | Company | First part of organization |
| URL | LinkedIn Profile | If URL contains "linkedin" |
| NOTE | Notes | Personal notes/comments |

## 🐛 Troubleshooting

### CSV Import Issues
- **"No valid contacts found in CSV"**: Check that CSV has `first_name` and `last_name` columns
- **Partial import**: Some contacts may have been skipped if missing required fields. Check console for details.
- **Email formatting**: Remove any extra spaces around email addresses

### Google Contacts Issues
- **"Failed to import Google Contacts"**: Ensure you exported as vCard format, not CSV
- **Missing data**: Some Google Contacts fields may not map perfectly. Check imported contacts and edit as needed
- **LinkedIn URLs not importing**: Google Contacts may store URLs differently. You can manually add LinkedIn profiles after import

## 📝 Sample Files

Sample files are included in the project root:
- `sample_contacts_import.csv` - Example CSV format
- `sample_contacts.vcf` - Example vCard format (Google Contacts)

Use these to test the import functionality!

## 🔐 Notes

- All imports are user-specific (each user sees only their imported contacts)
- Import data is logged in the `imported_contacts` table with metadata
- Imports can be done repeatedly - the system handles duplicates intelligently
- All import operations require valid authentication token
