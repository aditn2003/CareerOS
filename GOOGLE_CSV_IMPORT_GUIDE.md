# Google Contacts CSV Import - Complete Guide

## 🎯 Two-Step Process

### Step 1: Export from Google Contacts
1. Go to [contacts.google.com](https://contacts.google.com)
2. Click **"Manage"** → **"Export"**
3. Select **"Google CSV"** format (NOT vCard!)
4. Choose contacts to export
5. Click **"Export"**
6. File downloads to your Downloads folder as `contacts.csv`

### Step 2: Import to Your App
1. In your app, go to **Network** section
2. Click **"Import"** button (top right)
3. Select **"📄 CSV Import"** tab
4. Click file input to browse
5. Select your `contacts.csv` file from Downloads
6. Click **"Import CSV"**
7. ✅ Success! See message showing how many imported

## 📊 What Google CSV Looks Like

**Typical Google Export Columns:**
```
First Name, Last Name, Full Name, Phone, Email Address, Organization, 
Job Title, Website, Notes, Birthday, Relationship
```

**Example Data:**
```csv
First Name,Last Name,Email Address,Organization,Job Title,Website
John,Smith,john@example.com,Tech Corp,Developer,https://linkedin.com/in/john
Sarah,Johnson,sarah@example.com,StartupXYZ,Manager,https://linkedin.com/in/sarah
Michael,Brown,michael@example.com,,,
```

## ✅ Supported Google Columns

The import system recognizes all standard Google Contacts columns:

| Column Name | What It Does | Examples |
|---|---|---|
| First Name | Contact's first name | John, Jane, Michael |
| Last Name | Contact's last name | Smith, Doe, Brown |
| Email Address | Contact's email | john@example.com |
| Phone | Contact's phone number | 555-1234, (555) 123-4567 |
| Organization | Company name | Tech Corp, Google, Apple |
| Job Title | Position/role | Developer, Manager, CEO |
| Website | LinkedIn or other profile | https://linkedin.com/in/john |
| Notes | Personal notes | "Met at conference", "Important client" |

## 🔍 Column Name Matching

Our system is **SMART** and recognizes variations:

| Variation | What It Matches |
|---|---|
| "First Name", "first_name", "firstname" | First name field |
| "Last Name", "last_name", "lastname" | Last name field |
| "Full Name", "Name" | Parses into first + last |
| "Email", "Email Address", "e-mail" | Email field |
| "Phone", "Phone Number", "Mobile" | Phone field |
| "Company", "Organization", "Org" | Company field |
| "Title", "Job Title", "Position" | Title field |

**Why this matters:** Whether Google exports it as "Email Address" or you create a CSV with "Email", it works!

## 🆘 Troubleshooting

### "No valid contacts found in CSV"

**Most likely cause:** You didn't actually upload the file, or export didn't have contacts

**Fix:**
1. Make sure you followed BOTH steps:
   - ✅ Step 1: Export from Google Contacts (get CSV file)
   - ✅ Step 2: Upload that CSV file to your app (select file and click Import)
2. Check that you exported as **"Google CSV"** (not vCard)
3. Make sure you selected contacts to export (not empty export)
4. Verify the CSV file actually has data:
   - Right-click file → Open with Notepad
   - Should see column headers and contact data

### Import says "successful" but no contacts appear

**Most likely cause:** You saw the Google "export successful" message, but didn't upload to the app yet

**This is normal!** The Google export and app import are **two separate steps:**

1. **Google Export = Just downloads a file**
   - You see: "Export successful"
   - File goes to: Downloads folder
   - Nothing is added to your app yet

2. **App Import = Actually adds contacts to your app**
   - You must upload the CSV file to the app
   - You must click "Import CSV" button
   - Then contacts appear in your app

**What you need to do:**
1. Check Downloads folder for the CSV file you exported
2. Go to Network → Import in your app
3. Upload that CSV file
4. Click "Import CSV"
5. NOW you'll see contacts added

### Only some contacts were imported

**Why:** Some rows in CSV might be missing names or have issues

**Check:**
1. Import shows message like "Imported 5 (2 skipped)"
2. The skipped ones had issues (no name, incomplete data)
3. You can edit these manually after importing
4. Or fix the CSV file and re-import

**To see which ones were skipped:**
1. After import, open the original CSV file in Excel/Notepad
2. Look for rows with empty First Name AND Last Name columns
3. Those will be skipped
4. Edit them and re-import if needed

### File picker doesn't show my download

**This is a browser issue, not the app:**

1. Click "Choose File" button
2. Look for "Downloads" folder in the left sidebar
3. If not there:
   - Click the folder icon to navigate
   - On Windows: look for C:\Users\YourUsername\Downloads
   - On Mac: press Cmd+Shift+L to open Downloads

## 📝 Quick Checklist

- [ ] Went to [contacts.google.com](https://contacts.google.com)
- [ ] Clicked Manage → Export
- [ ] Selected "Google CSV" format
- [ ] Downloaded the file
- [ ] Found the CSV file in Downloads folder
- [ ] Opened the app and went to Network → Import
- [ ] Selected the CSV Import tab
- [ ] Uploaded the CSV file
- [ ] Clicked "Import CSV" button
- [ ] Saw success message
- [ ] Contacts appear in the list

## 🎓 Tips for Best Results

1. **Before exporting:**
   - Clean up duplicates in Google Contacts
   - Make sure important contacts have email addresses
   - Add job titles and companies if available

2. **Exporting:**
   - Choose "Google Contacts" to get all your main contacts
   - Can export multiple times from different groups

3. **After importing:**
   - Edit contacts to add more details
   - Set relationship types (Colleague, Manager, etc.)
   - Add personal notes
   - Link to job opportunities
   - Set reminders

4. **Multiple imports:**
   - Same email = system updates that contact
   - Different email = creates new contact
   - Can import from Google, Outlook, Apple, etc.

## 🆘 Still Not Working?

1. **Open browser console (F12):**
   - Look for error messages in red
   - Screenshot the error
   - Check what it says about the file/data

2. **Test with sample file:**
   - Create a simple CSV in Notepad:
   ```
   First Name,Last Name,Email
   John,Smith,john@example.com
   Jane,Doe,jane@example.com
   ```
   - Save as `test.csv`
   - Try importing this test file
   - If it works, your Google CSV format is different

3. **Check the Google CSV directly:**
   - Right-click downloaded CSV file
   - Open with Notepad
   - Look at the column headers
   - Make sure there's actual data below headers
   - Check for any weird characters or formatting

## ✨ Success!

When it works, you should see:
- ✅ Import modal shows "✓ File ready for import"
- ✅ Click Import CSV and see "Successfully imported X contacts"
- ✅ Contacts appear in your Network list
- ✅ You can search for the imported names
- ✅ You can edit/view full details
- ✅ You can track interactions with imported contacts

### "No valid contacts found in CSV"
**Problem**: CSV doesn't have First Name and Last Name columns, or they're empty for all rows

**Solution**:
1. Open the CSV file in Excel or a text editor
2. Check the first row (headers) - should have "First Name" and "Last Name" columns
3. Check that at least first and last names are filled for each contact
4. Re-export from Google Contacts and try again

### File picker doesn't show the downloaded file
**Problem**: The file might be in a different folder

**Solution**:
1. Check your **Downloads** folder first
2. If not there, check your Desktop
3. Check any other locations you selected during export
4. The downloaded file should be named something like `contacts.csv`

### Import shows error after selecting file
**Problem**: File format or encoding issue

**Solution**:
1. Make sure you exported as **"Google CSV"** format, not vCard
2. Try opening the CSV in Excel and resaving it
3. Make sure First Name and Last Name columns have data
4. Check the browser console (F12) for detailed error messages

## 📝 Manual CSV Format

If you want to create your own CSV file instead of exporting from Google:

### Required Format:
```csv
First Name,Last Name,Email Address,Phone,Organization,Website
John,Smith,john@example.com,555-1234,Tech Corp,https://linkedin.com/in/john
Jane,Doe,jane@example.com,555-5678,StartupXYZ,
Michael,Brown,michael@example.com,,,
```

### Column Name Variations (All Work):
```csv
first_name,last_name,email,phone,company,website
OR
First Name,Last Name,Email,Phone,Company,Website
OR
firstName,lastName,email_address,phone_number,organization,linkedin_profile
```

**Key Points:**
- At least First Name and Last Name required
- Other columns can be empty (just leave blank)
- Column names are case-insensitive
- Underscores and spaces both work
- All common CSV variants are supported

## ✨ Tips

- **Best Practice**: Export from Google Contacts directly for most complete data
- **Clean Imports**: Remove duplicate contacts in Google before exporting
- **Update Option**: If you import same email twice, it updates the existing contact
- **No Email Okay**: Contacts without emails will still import (but may need manual entry later)
- **Multiple Imports**: You can import from different sources multiple times

## 🎯 Next Steps After Import

1. Review imported contacts in the list
2. Edit any contacts to add missing information
3. Set relationship types (Colleague, Manager, Mentor, etc.)
4. Add personal notes
5. Link to job opportunities
6. Set reminders for follow-ups
