# Testing Email Import Locally

## Step 1: Start Your Backend Server Locally

1. **Open a terminal** and navigate to your backend folder:
   ```bash
   cd backend
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   # or
   node server.js
   ```

4. **Verify it's running** - You should see something like:
   ```
   Server running on port 5000
   ✅ Connected to PostgreSQL
   ```

---

## Step 2: Expose Your Local Server to Internet (ngrok)

SendGrid needs to call your webhook, but your local server isn't accessible from the internet. Use ngrok to create a tunnel.

### Option A: Using ngrok (Recommended)

1. **Install ngrok** (if not already installed):
   - Download from: https://ngrok.com/download
   - Or install via Homebrew: `brew install ngrok`

2. **Start ngrok** in a NEW terminal window:
   ```bash
   ngrok http 5000
   ```
   (Replace `5000` with your backend port if different)

3. **Copy the HTTPS URL** ngrok gives you:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:5000
   ```
   Copy the `https://abc123.ngrok.io` part

### Option B: Using the PowerShell Script

If you have the `start-ngrok.ps1` script:
```powershell
.\start-ngrok.ps1
```

---

## Step 3: Update SendGrid Webhook URL

1. **Go to SendGrid** → **Settings** → **Inbound Parse**

2. **Click on your webhook** (the one for `jobs@atscareeros.com`)

3. **Update the webhook URL** to:
   ```
   https://YOUR-NGROK-URL.ngrok.io/api/jobs/inbound-email
   ```
   Replace `YOUR-NGROK-URL` with your actual ngrok URL

4. **Save** the changes

---

## Step 4: Test!

1. **Forward an email** to `jobs@atscareeros.com`

2. **Watch your local terminal** (where you ran `npm start`) for:
   ```
   📧 Inbound email endpoint called
   📧 Email received, length: 1234
   📧 Parsed job: {...}
   ✅ Job imported: [title] at [company]
   ```

3. **Check your database** to see if the job was created

---

## Step 5: Check Database

Run this SQL query to see if the job was imported:
```sql
SELECT * FROM jobs WHERE is_imported = true ORDER BY created_at DESC LIMIT 5;
```

---

## Troubleshooting

### ngrok URL changes every time?
- **Free ngrok**: URL changes each time you restart
- **Solution**: Update SendGrid webhook URL each time, or use ngrok's paid plan for static URLs

### Can't connect to database?
- Make sure your `.env` file has correct `DATABASE_URL`
- Check if PostgreSQL is running locally or if you're connecting to remote database

### Port already in use?
- Change the port in your `server.js` or `.env`
- Update ngrok command: `ngrok http NEW_PORT`

### SendGrid still not calling?
- Verify ngrok is running and showing "Forwarding" status
- Check SendGrid webhook URL is correct (must be HTTPS)
- Make sure "POST the raw, full MIME message" is checked in SendGrid

---

## Quick Checklist

- [ ] Backend server running locally (`npm start`)
- [ ] ngrok running (`ngrok http 5000`)
- [ ] SendGrid webhook URL updated to ngrok URL
- [ ] Forwarded test email
- [ ] Checked local terminal logs
- [ ] Checked database for new job

---

## After Testing

Once you're done testing locally:
1. **Merge your branch** to main
2. **Deploy to Render**
3. **Update SendGrid webhook URL** back to: `https://atscareeros.com/api/jobs/inbound-email`
