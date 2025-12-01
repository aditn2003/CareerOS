# CSV Import Debugging Guide

## The Issue: Contacts Show "Successfully Imported" But Don't Appear

When you import a Google Contacts CSV file and get a success message but contacts don't show up, follow this debugging guide.

## Quick Checklist

1. **Open Browser Console (F12)** - This is critical for debugging
   - Press `F12` while viewing your app
   - Go to **Console** tab
   - Re-try the import
   - Look for log messages starting with `✓` or `✗`

2. **What Should Happen During Import:**
   - You should see: `Total lines in CSV: [number]`
   - You should see: `Parsed headers: [list of column names]`
   - You should see: `✓ Found column...` for each column found
   - You should see: `Row 1: Using First/Last Name: "John" / "Doe"` (or similar)
   - You should see: `Row 1: ✓ Added contact: John Doe`

3. **If You See `✗ Could not find any of: first name, ...`**
   - This means Google's column names don't match what we're looking for
   - The fix: **Check browser console for actual headers found**
   - Look for: `Parsed headers: [...]` to see exact column names
   - Contact support with those column names

## Understanding Google CSV Format

Google Contacts exports with these standard columns:

```
First Name, Middle Name, Last Name, Name Prefix, Name Suffix, Nickname, File As,
Organization, Organization Unit, Organization Title, Birthday, Notes, Photo, Labels,
E-mail 1, E-mail 1 Type, E-mail 2, E-mail 2 Type, E-mail 3, E-mail 3 Type,
Phone 1, Phone 1 Type, Phone 2, Phone 2 Type, Phone 3, Phone 3 Type, ...
```

The parser looks for:
- **Name Fields:** "First Name" + "Last Name" (primary) OR "File As" (full name)
- **Email Fields:** "E-mail 1", "E-mail 2", "Email Address", etc.
- **Phone Fields:** "Phone 1", "Phone 2", "Phone Number", etc.
- **Job Fields:** "Organization", "Organization Title" → stored as company & title

## Step-by-Step Debugging

### Step 1: Check CSV File Content
Open your downloaded CSV file in a text editor (Notepad, VS Code):
- First line should be column headers
- Second line should have data
- Look for your contact name in columns labeled "First Name", "Last Name", or "File As"

### Step 2: Import and Check Console
1. Go to your app → Network → Import Contacts
2. Click **CSV Import** tab
3. Select your CSV file
4. Click **Import CSV Contacts**
5. **Immediately open F12 Console** and look for log output
6. Watch for success/failure messages

### Step 3: Decode Console Messages

**Good signs (indicates it's working):**
```
✓ Found column "email" at index 14 (actual header: "E-mail 1")
✓ Found column "phone" at index 20 (actual header: "Phone 1")
Row 1: Using First/Last Name: "John" / "Doe"
Row 1: ✓ Added contact: John Doe
Parsed contacts: 5 Skipped: 0
```

**Bad signs (indicates a problem):**
```
✗ Could not find any of: first name, first_name, firstname, ...
CSV must have "First Name" and "Last Name" columns (or "File As" for full name)
```

### Step 4: Common Issues

**Issue: "No valid contacts found"**
- **Cause:** All rows skipped (empty names)
- **Fix:** Make sure contacts have first AND last names (or "File As" filled in)
- **Check in CSV:** Open file, look for "First Name" + "Last Name" columns with data

**Issue: "Successfully imported 0 contacts" but message says success**
- **Cause:** Backend database issue
- **Fix:** Check browser console for error details, take screenshot of error, contact support

**Issue: Imported but contacts don't show in list**
- **Cause:** Could be filter is hiding them or page didn't refresh
- **Fix:** 
  - Reload page (F5)
  - Check "Filter Type" dropdown - make sure it's set to show all contacts
  - Check search box is empty

## Contact Information Fields Mapping

| CSV Column | App Field | Notes |
|-----------|-----------|-------|
| First Name | firstName | Required if Last Name is empty |
| Last Name | lastName | Required if First Name is empty |
| File As | Full Name | Used if First/Last names are empty |
| E-mail 1 | email | Primary email (if multiple, uses first one) |
| Phone 1 | phone | Primary phone (if multiple, uses first one) |
| Organization | company | Company name |
| Organization Title | title | Job title |
| Notes | notes | Additional notes |

## Advanced: Export from Google Format

When you export from Google Contacts:

1. Go to **contacts.google.com**
2. Click **☰ menu** (top left)
3. Click **Export**
4. Select the contacts you want
5. Choose **"Google CSV"** (or **"vCard"** for alternative format)
6. Download file to Downloads folder

Your CSV file will have column names like:
- "First Name", "Last Name" (with spaces)
- "E-mail 1", "E-mail 2" (with spaces and "E-mail" prefix)
- "Phone 1", "Phone 2", "Phone 3" (with spaces)
- "Organization" (full organization name)
- "File As" (how the contact appears in Google)

## If Still Not Working

1. **Take a screenshot of console output** (F12 → Console tab)
2. **Open the CSV file in a text editor** and copy the first 3 lines
3. **Check that:**
   - CSV file is not corrupted (opens in Notepad/VS Code)
   - At least 2 contacts have First Name AND Last Name
   - No special characters in names (unless file opens correctly in text editor)

4. **Contact support with:**
   - Screenshot of console error
   - First 3 lines of CSV file
   - How many contacts you're trying to import

## Expected Success

After successful import, you should see:
- Green checkmark message: "✓ Successfully imported 5 contacts from CSV (0 skipped)"
- Modal closes automatically
- Contacts appear in Network list with:
  - Name (First + Last)
  - Email (if present in CSV)
  - Phone (if present in CSV)
  - Company/Title (if present in CSV)
