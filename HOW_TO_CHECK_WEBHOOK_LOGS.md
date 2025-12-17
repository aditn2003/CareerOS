# How to Check if Your Webhook is Working

## ❌ NOT Here: Email Logs Page
The "Email Logs" page you're looking at is for **outbound emails** (emails you send through SendGrid), not inbound emails.

## ✅ Check Here Instead: Your Backend Logs

### If Using Render:
1. Go to: https://dashboard.render.com/
2. Click on your **backend service**
3. Click the **Logs** tab
4. Look for: `📧 Inbound email endpoint called`

### If Running Locally:
- Check your terminal/console where you're running `npm start` or your server
- Look for the same log messages

---

## What You Should See in Backend Logs

When you forward an email to `jobs@atscareeros.com`, you should see:

```
📧 Inbound email endpoint called
📧 Request headers: {...}
📧 Body type: string
📧 Body length: [number]
📧 Email received, length: [number]
📧 First 500 chars: [email content preview]
📧 Parsing email, length: [number]
📧 Parsed email - From: [name] Email: [email]
📧 Subject: [subject]
📧 Final emailFrom: [email]
📧 Looking for user with email: [email]
📧 Parsed job: {...}
✅ Job imported: [title] at [company] for user [id] (job_id: [id])
```

---

## If You Don't See Any Logs

### Step 1: Verify SendGrid Webhook URL
1. Go to SendGrid → **Settings** → **Inbound Parse**
2. Click on your webhook configuration
3. Verify the URL is: `https://atscareeros.com/api/jobs/inbound-email`
4. Make sure "POST the raw, full MIME message" is checked

### Step 2: Test the Endpoint Directly
You can test if your endpoint is accessible:

```bash
curl -X POST https://atscareeros.com/api/jobs/inbound-email \
  -H "Content-Type: text/plain" \
  -d "From: test@example.com
Subject: Test
Body: Test"
```

If you see `📧 Inbound email endpoint called` in your logs, the endpoint is working!

### Step 3: Check SendGrid Activity Feed
1. In SendGrid, go to **Activity** → **Activity Feed** (not Email Logs)
2. This might show if SendGrid received the email
3. But the most reliable check is your backend logs

---

## Quick Checklist

- [ ] Forwarded email to `jobs@atscareeros.com`
- [ ] Checked backend logs (Render or local terminal)
- [ ] Looked for `📧 Inbound email endpoint called`
- [ ] If no logs: Verified webhook URL in SendGrid settings
- [ ] If logs show errors: Check error messages (user not found, parsing error, etc.)

---

## Most Common Issue

**"No logs at all"** usually means:
- SendGrid webhook URL is incorrect
- Your server isn't accessible from the internet
- The endpoint path is wrong

**"Logs show 'User not found'"** means:
- The email you forwarded FROM doesn't match a user email in your database
- Check the logs - it will show what email it's looking for

---

## Next Steps

1. **Check your backend logs right now** (Render dashboard or terminal)
2. **Forward a test email** to `jobs@atscareeros.com`
3. **Watch the logs** - you should see the `📧` messages appear
4. **Share what you see** and we can debug from there!
