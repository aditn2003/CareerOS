# File Picker Not Showing Downloaded Files - Troubleshooting

## Problem
When you click "Choose File" in the import dialog, the file picker doesn't show your downloaded CSV or vCard files.

## Solutions

### Solution 1: Check Your Downloads Folder
The browser file picker typically opens to your **Downloads** folder by default.

**Windows:**
1. Click the **"Choose File"** button
2. Look for a folder called **"Downloads"** in the left sidebar
3. Or navigate to: `C:\Users\[YourUsername]\Downloads`
4. Find your CSV file (should be named something like `contacts.csv`)
5. Click to select it

**Mac:**
1. Click the **"Choose File"** button
2. Look in the sidebar for **"Downloads"**
3. Or press `Cmd + Shift + L` to open Downloads
4. Find your CSV file

### Solution 2: Check File Type
Make sure the file has the right extension:
- For CSV files: `.csv` extension
- For Google Contacts vCard: `.vcf` or `.vcard` extension

**Windows - Show File Extensions:**
1. Open File Explorer
2. Go to Downloads folder
3. Click **View** tab → check **"File name extensions"**
4. Your file should show with full name like `contacts.csv`

### Solution 3: Different Location
If you didn't save to Downloads, it might be elsewhere:

**Common locations:**
- Desktop
- Documents
- Custom folder you selected during export
- Check your browser's **Settings** to see default download location

**To find your file:**
1. Windows: Press `Ctrl + Shift + Esc` to open Task Manager
   - Or press `Win + E` to open File Explorer
   - Search for your filename at the top right
2. Mac: Press `Cmd + Space` to open Spotlight
   - Type your filename (e.g., `contacts.csv`)

### Solution 4: File Was Downloaded
If you're unsure if the file exists:

1. **Google Contacts Export:**
   - Go back to [contacts.google.com](https://contacts.google.com)
   - Click **Manage** → **Export**
   - Select format and contacts to export
   - Click **Export** again
   - Check Downloads folder for new file

2. **Check Downloads Folder:**
   - Windows: Open File Explorer → click **Downloads** in sidebar
   - Mac: Click Finder → press `Cmd + Shift + L`
   - Look for recently modified files (check date/time)

### Solution 5: Browser Cache
Sometimes the file picker needs to refresh:

1. Close the import dialog (click X or Cancel)
2. Close the browser entirely (all tabs/windows)
3. Reopen the website
4. Go to Import again
5. Try selecting file

### Solution 6: File Permissions
Make sure Windows/Mac allows access to the file:

**Windows:**
1. Right-click the CSV file
2. Click **Properties**
3. At the bottom, check if there's a **Security** section
4. Click **Unblock** if available
5. Click **Apply** and **OK**

## Quick Checklist

- [ ] Did you actually export the CSV? (or did export fail?)
- [ ] Do you know which folder the file is in?
- [ ] Does the file have `.csv` extension?
- [ ] Can you see the file in File Explorer/Finder?
- [ ] Is the file more than 0 KB (has content)?
- [ ] Did you export as "Google CSV" and not "vCard"?

## Detailed Steps to Export and Import

### Step 1: Export from Google Contacts
1. Go to [contacts.google.com](https://contacts.google.com)
2. Click **Manage** (left sidebar)
3. Click **Export**
4. Select **"Google CSV"** (⚠️ NOT vCard for CSV import)
5. Choose **"Google Contacts"** or all contacts
6. Click **Export**
7. **Look for confirmation** - a popup might say "Preparing export" or similar
8. **Check Downloads folder** - should see `contacts.csv` file
9. **Note the location** - remember where it downloaded to

### Step 2: Import in App
1. Open your ATS app
2. Go to **Network** section
3. Click **Import** button (top right)
4. Make sure **"📄 CSV Import"** tab is selected
5. Click **"Choose File"** button
6. Navigate to your Downloads folder (default location)
7. Find and select your `contacts.csv` file
8. Click **Open** (or whatever your file picker says)
9. You should see "✓ File ready for import" message
10. Click **"Import CSV"** button

## Still Not Working?

If you've tried all solutions:

1. **Check browser console for errors:**
   - Press `F12` to open Developer Tools
   - Click **Console** tab
   - Look for red error messages
   - Screenshot the errors

2. **Try different browser:**
   - If using Chrome, try Firefox or Edge
   - Different browsers handle file pickers slightly differently

3. **Try manually created CSV:**
   - Create a simple test file:
     ```
     First Name,Last Name,Email
     John,Smith,john@example.com
     Jane,Doe,jane@example.com
     ```
   - Save as `test.csv` to Desktop
   - Try importing this test file instead

4. **Check file contents:**
   - Right-click the CSV file
   - Open with **Notepad**
   - Check that it has data (not empty)
   - Check that first row has column headers

## Success Indicators

✅ File picker shows the file in the list
✅ You can select the file
✅ After selecting, you see "✓ File ready for import" message
✅ Import button is no longer greyed out
✅ Click Import and see success message
✅ Contacts appear in your contacts list

## For Technical Help

If none of these solutions work, please provide:
1. Browser name and version (e.g., "Chrome 120")
2. Operating system (Windows/Mac)
3. Error message from browser console (F12)
4. Screenshot of the import dialog
5. Confirmation that file exists in Downloads folder
