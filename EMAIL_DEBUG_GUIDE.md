# Email Import Debugging Guide

## Step 1: Check if Endpoint is Being Called

Check your backend logs (Render logs or local console) for:
- `📧 Inbound email endpoint called`
- If you don't see this, SendGrid isn't calling your endpoint

## Step 2: Verify SendGrid Webhook Configuration

1. Go to SendGrid → Settings → Inbound Parse
2. Check your webhook URL: Should be `https://atscareeros.com/api/jobs/inbound-email`
3. Verify "POST the raw, full MIME message" is checked
4. Check SendGrid's webhook logs for delivery status

## Step 3: Check Email Parsing

Look for these log messages:
- `📧 Email received, length: [number]`
- `📧 Parsed job: {...}`
- If parsing fails, you'll see: `❌ Email parsing error:`

## Step 4: Check User Lookup

Look for:
- `📧 Looking for user with email: [email]`
- If user not found: `⚠️ Email from unknown user: [email]`
- This shows available users in database

**Common Issue**: The email you forwarded FROM must match a user email in your database.

## Step 5: Check Database

1. **Run the migration** (if not done):
   ```sql
   -- Run: backend/db/add_platform_tracking.sql
   ```

2. **Check if job was created**:
   ```sql
   SELECT * FROM jobs WHERE is_imported = true ORDER BY created_at DESC LIMIT 5;
   ```

3. **Check for errors**:
   ```sql
   -- Check if columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'jobs' 
   AND column_name IN ('platform', 'is_imported', 'source_url');
   ```

## Step 6: Test Manually

You can test the endpoint manually with curl:

```bash
# Get a sample email (save as test-email.txt)
# Then:
curl -X POST https://atscareeros.com/api/jobs/inbound-email \
  -H "Content-Type: text/plain" \
  --data-binary @test-email.txt
```

## Common Issues

### Issue 1: "User not found"
**Solution**: Make sure the email you forwarded FROM matches a user email in your database.

### Issue 2: "Database migration required"
**Solution**: Run `backend/db/add_platform_tracking.sql`

### Issue 3: Endpoint not being called
**Solution**: 
- Check SendGrid webhook URL is correct
- Check if your server is accessible from internet
- Check SendGrid webhook logs

### Issue 4: Email parsing fails
**Solution**: Check the email format. The parser expects standard email format.

## Quick Test

1. Forward an email FROM your registered user email
2. Check backend logs immediately
3. Check database for new job
