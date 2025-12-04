# TROUBLESHOOTING: Contact Not Saving

## The Problem
When you try to add a contact, it doesn't save and there's likely a database error.

## The Solution

### Step 1: Apply the Database Schema
**IMPORTANT:** You must run the SQL schema file to create the tables before the API will work.

Open your terminal and run:
```bash
# Connect to your PostgreSQL database
psql -U your_postgres_username -d your_database_name -f backend/db/add_contacts_schema.sql
```

**Example:**
```bash
psql -U postgres -d ats_db -f backend/db/add_contacts_schema.sql
```

Or if using another client (pgAdmin, DBeaver), copy the SQL from `backend/db/add_contacts_schema.sql` and execute it.

### Step 2: Restart Backend Server
After applying the schema, **RESTART** your backend:

```bash
cd backend
npm start
# or
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL
✅ API running at http://localhost:4000
```

### Step 3: Try Adding Contact Again
1. Go to http://localhost:5173/network
2. Click "Add Contact"
3. Fill in First Name and Last Name (required)
4. Click "Add Contact"
5. Should appear immediately in the grid

---

## Verification Checklist

- [ ] PostgreSQL is running
- [ ] DATABASE_URL is correct in `.env`
- [ ] Schema SQL file has been executed
- [ ] Backend is restarted
- [ ] Frontend is also running (if not, see error in browser)
- [ ] Token exists (check browser localStorage → token key)

---

## If Still Not Working

### Check Backend Logs
Run backend with dev mode to see detailed errors:
```bash
cd backend
npm run dev
```

Look for error messages when you try to add a contact.

### Check Browser Console
1. Press F12 in browser
2. Go to Console tab
3. Try adding contact again
4. Look for error messages
5. Share the error with me

### Common Errors

**Error: "relation \"professional_contacts\" does not exist"**
- Solution: Run the SQL schema file (Step 1 above)

**Error: "Unauthorized"**
- Solution: Make sure you're logged in and token is in localStorage

**Error: "CORS error"**
- Solution: Make sure backend is running on localhost:4000

**Error: "Failed to save contact"**
- Check browser console for actual error
- Check backend logs for database error

---

## Quick Debug: Test the API Directly

Open terminal and test the API endpoint directly:

```bash
# Make sure you have a valid JWT token first
# Get it from: localStorage.getItem('token') in browser console

curl -X POST http://localhost:4000/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "title": "Engineer",
    "company": "TestCorp",
    "relationshipType": "Colleague",
    "relationshipStrength": 3
  }'
```

If this works, the problem is with the frontend. If it fails, the problem is the backend/database.

---

## Next Steps

1. **Apply the database schema** - This is the most likely issue
2. **Restart backend server**
3. **Try adding a contact again**
4. **If error persists, check console logs**
