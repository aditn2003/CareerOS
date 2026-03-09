# UptimeRobot Setup Guide - Step by Step

## Overview
This guide walks you through setting up UptimeRobot to monitor your ATS application's uptime. UptimeRobot checks your health endpoint every 5 minutes and sends alerts if your application goes down.

## Step-by-Step Instructions

### Step 1: Create an UptimeRobot Account

1. **Go to UptimeRobot website**
   - Visit: https://uptimerobot.com/
   - Click "Sign Up" or "Get Started Free" button (usually in the top right)

2. **Sign up for free account**
   - Enter your email address
   - Create a password (must be at least 8 characters)
   - Accept the Terms of Service and Privacy Policy
   - Click "Sign Up" or "Create Account"

3. **Verify your email**
   - Check your email inbox for a verification email from UptimeRobot
   - Click the verification link in the email
   - You'll be redirected back to UptimeRobot

4. **Complete account setup**
   - You may be asked to choose a plan
   - Select the **"Free"** plan (50 monitors, 5-minute intervals)
   - Click "Continue" or "Start Monitoring"

### Step 2: Add a New Monitor

1. **Access the dashboard**
   - After logging in, you'll see the UptimeRobot dashboard
   - Click the **"+ Add New Monitor"** button (usually a green button at the top)

2. **Select monitor type**
   - You'll see different monitor types:
     - HTTP(s)
     - Keyword
     - Ping
     - Port
   - Select **"HTTP(s)"** - this is the most common type for web applications

3. **Configure monitor settings**

   **Monitor Details:**
   - **Friendly Name**: Enter a descriptive name (e.g., "ATS Backend Health Check" or "ATS API Server")
   - **URL**: Enter your health check endpoint URL
     - For local development: `http://localhost:4000/api/monitoring/health`
     - For production: `https://your-domain.com/api/monitoring/health`
     - **Important**: Use the full URL including `http://` or `https://`
   
   **Monitoring Interval:**
   - **Monitoring Interval**: Select **"Every 5 minutes"** (free tier default)
   - This is the minimum interval for free accounts
   
   **Alert Contacts:**
   - Select which contacts should receive alerts
   - You'll need to add alert contacts first (see Step 3)

4. **Click "Create Monitor"**
   - Review your settings
   - Click the green "Create Monitor" button

### Step 3: Set Up Alert Contacts

1. **Go to Alert Contacts**
   - In the UptimeRobot dashboard, click **"My Settings"** (top right)
   - Or go to: https://uptimerobot.com/dashboard#mySettings
   - Click on **"Alert Contacts"** tab

2. **Add email alert**
   - Click **"Add Alert Contact"** or **"+ New Alert Contact"**
   - Select **"E-mail"** as the type
   - Enter your email address
   - Enter a friendly name (e.g., "My Email" or "Primary Email")
   - Click **"Create Alert Contact"** or **"Save"**

3. **Add SMS alert (optional)**
   - Click **"Add Alert Contact"** again
   - Select **"SMS"** as the type
   - Enter your phone number (with country code, e.g., +1234567890)
   - Enter a friendly name
   - **Note**: SMS alerts may require verification or have limits on free tier
   - Click **"Create Alert Contact"**

4. **Add other alert types (optional)**
   - **Webhook**: For Slack, Discord, or custom integrations
   - **Push**: For mobile app notifications
   - **Twitter**: For Twitter DM alerts

### Step 4: Configure Monitor Alerts

1. **Edit your monitor**
   - Go back to the main dashboard
   - Find your monitor in the list
   - Click the **"Edit"** button (pencil icon) next to your monitor

2. **Set alert contacts**
   - In the edit form, find **"Alert Contacts"** section
   - Check the boxes next to the alert contacts you want to use
   - You can select multiple contacts

3. **Configure alert settings**
   - **Alert When**: 
     - Select **"Down"** - Alert when the site goes down
     - Select **"Up"** (optional) - Alert when the site comes back up
   - **Alert Threshold**: 
     - Leave as default (usually 0 consecutive failures)
     - This means you'll be alerted immediately when the site goes down

4. **Save changes**
   - Click **"Update Monitor"** or **"Save"**

### Step 5: Test Your Health Endpoint

Before setting up UptimeRobot, make sure your health endpoint is working:

1. **Start your application**
   ```bash
   npm start
   # or
   npm run dev
   ```

2. **Test the health endpoint**
   ```bash
   # For local testing
   curl http://localhost:4000/api/monitoring/health
   
   # Or open in browser
   http://localhost:4000/api/monitoring/health
   ```

3. **Verify the response**
   You should see a JSON response like:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-01-XX...",
     "uptime": 12345,
     "checks": {
       "database": {
         "status": "healthy",
         "responseTime": "5ms"
       },
       "memory": {
         "status": "healthy",
         "heapUsed": "50MB",
         "heapTotal": "100MB",
         "rss": "150MB"
       }
     }
   }
   ```

4. **For production**
   - Make sure your production server is running
   - Test the production URL: `https://your-domain.com/api/monitoring/health`
   - Verify it returns a 200 status code

### Step 6: Verify Monitor is Working

1. **Check monitor status**
   - Go to your UptimeRobot dashboard
   - You should see your monitor in the list
   - Status should show:
     - **Up** - If your application is running
     - **Down** - If your application is down
     - **Paused** - If monitoring is paused

2. **Wait for first check**
   - UptimeRobot will check your endpoint within 5 minutes
   - The status will update automatically
   - You can also click **"Test Now"** to force an immediate check

3. **View monitor details**
   - Click on your monitor name to see details
   - You'll see:
     - Current status
     - Uptime percentage
     - Response time
     - Last check time
     - Response details

### Step 7: Test Alert System (Optional)

1. **Temporarily stop your server**
   - Stop your application server
   - Wait 5-10 minutes for UptimeRobot to detect the downtime

2. **Check for alerts**
   - You should receive an email/SMS alert
   - The monitor status will change to **"Down"** (red)

3. **Restart your server**
   - Start your application again
   - Wait 5-10 minutes
   - You should receive an "Up" alert (if configured)
   - Status will change back to **"Up"** (green)

4. **Verify alert content**
   - Check your email for the alert
   - It should include:
     - Monitor name
     - Status (Down/Up)
     - Timestamp
     - Response details

## Monitor Configuration Details

### Recommended Settings

**Monitor Type**: HTTP(s)
**URL**: `https://your-domain.com/api/monitoring/health`
**Monitoring Interval**: Every 5 minutes (free tier)
**Alert When**: Down (and optionally Up)
**Alert Threshold**: 0 (immediate alert)

### Advanced Settings (Optional)

1. **Keyword Monitoring**
   - If you want to check for specific content in the response
   - Add keyword: `"status":"healthy"`
   - This ensures the health check is actually working, not just returning 200

2. **HTTP Method**
   - Default: GET (correct for health check)
   - No need to change

3. **HTTP Headers**
   - Usually not needed for health check
   - Can add custom headers if required

4. **HTTP Authentication**
   - If your health endpoint requires auth, add credentials here
   - Note: Our health endpoint is public, so this isn't needed

## Understanding Monitor Status

### Status Indicators

- **Up (Paused)**: Monitor is paused (not checking)
- **Up**: Application is responding correctly
- **Unknown**: Monitor hasn't checked yet or there's an issue
- **Down**: Application is not responding or returning errors

### Response Codes

- **200 OK**: Healthy (expected)
- **503 Service Unavailable**: Unhealthy (database down, high memory, etc.)
- **Timeout**: Application not responding
- **Connection Error**: Cannot reach the server

## Free Tier Limits

UptimeRobot's free tier includes:
-  50 monitors
-  5-minute check intervals
-  Email alerts
-  SMS alerts (limited)
-  2 months of log history
-  Basic status pages

For most applications, this is sufficient.

## Troubleshooting

### Issue: Monitor shows "Down" but application is running

**Solutions:**
1. **Check the URL** - Make sure it's correct and accessible
2. **Test the endpoint manually** - Use curl or browser to verify
3. **Check firewall** - Ensure port 4000 (or your port) is open
4. **Check CORS** - Health endpoint should be public
5. **Verify response format** - Should return JSON with status field

### Issue: Not receiving alerts

**Solutions:**
1. **Check spam folder** - Alerts might be in spam
2. **Verify alert contacts** - Make sure contacts are added and enabled
3. **Check alert settings** - Ensure "Down" alerts are enabled
4. **Verify email/SMS** - Test that your contact methods work
5. **Check UptimeRobot account** - Ensure account is verified

### Issue: Monitor shows "Unknown" status

**Solutions:**
1. **Wait a few minutes** - First check takes time
2. **Click "Test Now"** - Force an immediate check
3. **Verify URL is accessible** - Test manually
4. **Check monitor configuration** - Review settings

### Issue: False positives (showing down when it's up)

**Solutions:**
1. **Increase alert threshold** - Require 2-3 consecutive failures
2. **Check network issues** - Temporary network problems
3. **Review response time** - If response is slow, it might timeout
4. **Check server resources** - High load might cause timeouts

## Best Practices

1. **Use descriptive monitor names**
   - Example: "ATS Backend - Production"
   - Makes it easy to identify which service is down

2. **Set up multiple alert contacts**
   - Email for general alerts
   - SMS for critical alerts
   - Slack/Discord for team notifications

3. **Monitor both production and staging**
   - Set up separate monitors for each environment
   - Helps catch issues before they reach production

4. **Review uptime statistics regularly**
   - Check weekly/monthly reports
   - Identify patterns or recurring issues

5. **Set up status page** (optional)
   - UptimeRobot offers public status pages
   - Share with users to show system status

## Integration with Other Services

### Slack Integration
1. Create a Slack webhook
2. Add webhook URL as alert contact in UptimeRobot
3. Receive alerts in Slack channel

### Discord Integration
1. Create a Discord webhook
2. Add webhook URL as alert contact
3. Receive alerts in Discord channel

### Custom Webhooks
- UptimeRobot can send POST requests to any webhook URL
- Useful for custom integrations or automation

## Verification Checklist

- [ ] UptimeRobot account created
- [ ] Email verified
- [ ] Alert contacts added (email, SMS, etc.)
- [ ] Health endpoint tested and working
- [ ] Monitor created with correct URL
- [ ] Alert contacts assigned to monitor
- [ ] Monitor shows "Up" status
- [ ] Test alert received (optional test)
- [ ] Monitor checking every 5 minutes

## Next Steps

After setting up UptimeRobot:

1. **Set up additional monitors** (if needed)
   - Monitor other endpoints
   - Monitor staging environment
   - Monitor database connectivity

2. **Configure alert preferences**
   - Set up different alert rules for different severities
   - Configure quiet hours (if needed)

3. **Create status page** (optional)
   - Share public status page with users
   - Shows overall system health

4. **Review uptime reports**
   - Check weekly/monthly uptime statistics
   - Identify areas for improvement

5. **Set up team notifications**
   - Add team members to alert contacts
   - Configure team-specific alert channels

## Additional Resources

- [UptimeRobot Documentation](https://uptimerobot.com/api/)
- [UptimeRobot Status Pages](https://status.uptimerobot.com/)
- [UptimeRobot API](https://uptimerobot.com/api/) - For programmatic access

---

**Need Help?**
- Check UptimeRobot's [help center](https://uptimerobot.com/help/)
- Review your health endpoint: `/api/monitoring/health`
- Test the endpoint manually before setting up the monitor
- Verify your server is accessible from the internet (for production)

