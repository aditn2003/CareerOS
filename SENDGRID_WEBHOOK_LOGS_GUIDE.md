# How to Check SendGrid Webhook Logs

## Method 1: SendGrid Dashboard (Inbound Parse Activity)

1. **Log into SendGrid Dashboard**
   - Go to: https://app.sendgrid.com/

2. **Navigate to Inbound Parse Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Inbound Parse** under "Mail Settings"

3. **View Your Webhook Configuration**
   - You'll see your configured webhook (e.g., `jobs@atscareeros.com`)
   - Click on it to see details

4. **Check Activity/Logs**
   - SendGrid doesn't show detailed webhook logs in the Inbound Parse section
   - However, you can check:
     - **Email Activity** (see Method 2 below)
     - **Your backend logs** (see Method 3 below)

---

## Method 2: SendGrid Email Activity (Recommended)

1. **Go to Email Activity**
   - In SendGrid dashboard, click **Activity** in the left sidebar
   - Or go directly to: https://app.sendgrid.com/email_activity

2. **Filter for Inbound Emails**
   - Look for emails sent TO `jobs@atscareeros.com`
   - These are the forwarded emails

3. **Check Delivery Status**
   - Click on an email to see details
   - Check if it was delivered to your webhook endpoint

---

## Method 3: Your Backend Logs (Most Important!)

**This is where you'll see the actual webhook calls and any errors.**

### If using Render:
1. Go to your Render dashboard
2. Click on your backend service
3. Click **Logs** tab
4. Look for:
   - `📧 Inbound email endpoint called`
   - Any error messages
   - Parsing results

### If running locally:
- Check your terminal/console where you're running the server
- Look for the same log messages

---

## Method 4: SendGrid Event Webhook (Advanced)

If you want more detailed webhook logging, you can set up an Event Webhook:

1. **Settings** → **Mail Settings** → **Event Webhook**
2. Configure it to POST to a logging endpoint
3. This will log all email events (delivered, opened, etc.)

**Note**: This is separate from Inbound Parse and mainly for tracking email delivery events.

---

## What to Look For

### In SendGrid Email Activity:
- ✅ Email received by SendGrid
- ✅ Email forwarded to your webhook URL
- ❌ Any bounce or error messages

### In Your Backend Logs:
- ✅ `📧 Inbound email endpoint called` - Webhook received
- ✅ `📧 Email received, length: [number]` - Email parsed
- ✅ `📧 Parsed job: {...}` - Job details extracted
- ❌ `⚠️ Email from unknown user` - User lookup failed
- ❌ `❌ Email parsing error` - Email format issue
- ❌ `Database migration required` - Need to run SQL migration

---

## Quick Test

To verify your webhook is working:

1. **Forward a test email** to `jobs@atscareeros.com`
2. **Check SendGrid Email Activity** - Should show email received
3. **Check your backend logs** - Should show `📧 Inbound email endpoint called`
4. **Check your database** - Should have a new job with `is_imported = true`

---

## Troubleshooting

### No logs in backend?
- **Check SendGrid webhook URL** is correct: `https://atscareeros.com/api/jobs/inbound-email`
- **Check your server is running** and accessible
- **Check SendGrid Email Activity** to see if email was received

### Webhook called but job not created?
- **Check backend logs** for error messages
- **Check if user email matches** database
- **Check if database migration was run**

### Email not showing in SendGrid Activity?
- **Check spam folder** in your email
- **Verify MX records** are configured correctly
- **Check SendGrid domain authentication** is complete
