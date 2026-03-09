# Sentry Setup Guide - Step by Step

## Overview
This guide walks you through setting up Sentry error tracking for the ATS application. Sentry provides real-time error tracking, performance monitoring, and alerting.

## Step-by-Step Instructions

### Step 1: Create a Sentry Account

1. **Go to Sentry website**
   - Visit: https://sentry.io/signup/
   - Or visit: https://sentry.io and click "Get Started"

2. **Sign up for free account**
   - Click "Sign up for free" or "Get Started"
   - You can sign up with:
     - Email and password
     - GitHub account
     - Google account
     - Microsoft account
   
3. **Complete account setup**
   - Enter your email address
   - Create a password (if using email signup)
   - Accept terms of service
   - Click "Create Account"

4. **Verify your email** (if required)
   - Check your email inbox
   - Click the verification link

### Step 2: Create a New Project

1. **Access the Sentry dashboard**
   - After logging in, you'll see the Sentry dashboard
   - If prompted, click "Create Project" or "Get Started"

2. **Select platform**
   - You'll see a list of platforms
   - Select **"Node.js"** from the list
   - Click "Create Project"

3. **Configure project settings**
   - **Project Name**: Enter a name (e.g., "ATS-Backend" or "ATS-Application")
   - **Team**: Select or create a team (default team is fine)
   - **Platform**: Should be "Node.js" (already selected)
   - Click "Create Project"

4. **Skip the onboarding** (optional)
   - Sentry may show you setup instructions
   - You can skip this for now since we've already integrated Sentry
   - Click "Skip this step" or close the modal

### Step 3: Get Your DSN (Data Source Name)

1. **Navigate to project settings**
   - In the Sentry dashboard, click on your project name (top left)
   - Or go to: **Settings** → **Projects** → Select your project

2. **Find the DSN**
   - In the project settings, look for **"Client Keys (DSN)"** section
   - You'll see a DSN that looks like:
     ```
     https://abc123def456@o123456.ingest.sentry.io/789012
     ```
   - Click the **"Show"** or **"Copy"** button to reveal/copy the DSN

3. **Copy the DSN**
   - Click the copy icon next to the DSN
   - Or manually select and copy the entire DSN string
   - **Important**: Copy the entire DSN including `https://` at the beginning

### Step 4: Add DSN to Your Application

1. **Locate your `.env` file**
   - Navigate to your backend directory
   - Open or create the `.env` file in the root of the `backend` folder

2. **Add the SENTRY_DSN variable**
   - Open `.env` file in a text editor
   - Add the following line:
     ```bash
     SENTRY_DSN=https://your-actual-dsn-here@o123456.ingest.sentry.io/789012
     ```
   - Replace `https://your-actual-dsn-here@o123456.ingest.sentry.io/789012` with your actual DSN from Step 3
   - **Example**:
     ```bash
     SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
     ```

3. **Save the file**
   - Save the `.env` file
   - Make sure the file is in `.gitignore` (it should be by default)

### Step 5: Verify the Setup

1. **Restart your application**
   - Stop your current server (if running)
   - Start the server again:
     ```bash
     npm start
     # or
     npm run dev
     ```

2. **Check the console output**
   - You should see: `Sentry initialized for error tracking`
   - If you see: `SENTRY_DSN not configured. Error tracking disabled.`
     - Check that your `.env` file has the correct DSN
     - Make sure there are no extra spaces or quotes around the DSN

3. **Test error tracking**
   - Make a request that triggers an error (or use the test endpoint below)
   - Check your Sentry dashboard
   - You should see the error appear in Sentry within a few seconds

### Step 6: Test Error Tracking (Optional)

1. **Create a test endpoint** (temporary, for testing only)
   - Add this to `server.js` temporarily:
     ```javascript
     app.get('/test-sentry', (req, res) => {
       throw new Error('Test Sentry error tracking');
     });
     ```

2. **Trigger the error**
   ```bash
   curl http://localhost:4000/test-sentry
   ```

3. **Check Sentry dashboard**
   - Go to your Sentry project dashboard
   - Click on "Issues" in the left sidebar
   - You should see the test error appear
   - Click on it to see error details, stack trace, and context

4. **Remove the test endpoint** (after testing)
   - Remove the test endpoint from `server.js`

## Verification Checklist

- [ ] Sentry account created
- [ ] Node.js project created in Sentry
- [ ] DSN copied from Sentry dashboard
- [ ] `SENTRY_DSN` added to `.env` file
- [ ] Application restarted
- [ ] Console shows "Sentry initialized for error tracking"
- [ ] Test error appears in Sentry dashboard

## What Sentry Will Track

Once configured, Sentry will automatically track:

1. **Unhandled Errors**
   - Exceptions that crash the application
   - Unhandled promise rejections
   - Errors in route handlers

2. **Error Context**
   - Request details (method, path, query, body)
   - User information (if available)
   - Stack traces
   - Environment information

3. **Performance Data**
   - Response times
   - Slow queries
   - Performance bottlenecks

4. **Release Tracking**
   - Which version of your app had the error
   - Deploy tracking

## Sentry Dashboard Features

### Issues Tab
- View all errors and exceptions
- Filter by environment, release, user, etc.
- See error frequency and trends

### Performance Tab
- View API endpoint performance
- Identify slow queries
- Track response times

### Alerts
- Set up alerts for:
  - New errors
  - Error rate spikes
  - Performance degradation
  - Specific error types

### Releases
- Track which version introduced errors
- See error trends across releases

## Configuration Options

You can customize Sentry behavior by modifying `backend/utils/sentry.js`:

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  
  // Sample rate for performance monitoring (0.0 to 1.0)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release version for tracking
  release: process.env.APP_VERSION || '1.0.0',
  
  // Filter out certain errors
  beforeSend(event, hint) {
    // Don't send health check errors
    if (event.request?.url?.includes('/health')) {
      return null;
    }
    return event;
  },
});
```

## Troubleshooting

### Issue: "SENTRY_DSN not configured" warning

**Solution:**
1. Check that `.env` file exists in the `backend` directory
2. Verify `SENTRY_DSN` is spelled correctly (case-sensitive)
3. Make sure there are no quotes around the DSN value
4. Restart the application after adding the DSN

### Issue: Errors not appearing in Sentry

**Solution:**
1. Verify the DSN is correct (check for typos)
2. Check your internet connection
3. Verify Sentry project is active
4. Check Sentry dashboard for any account issues
5. Look for error messages in application logs

### Issue: Too many errors in Sentry

**Solution:**
1. Filter out health check endpoints (already done)
2. Adjust `tracesSampleRate` to reduce performance data
3. Use `beforeSend` to filter specific errors
4. Set up alert rules to only notify on important errors

## Free Tier Limits

Sentry's free tier includes:
-  5,000 errors per month
-  10,000 performance units per month
-  1 project
-  1 team member
-  30 days of error history
-  Basic alerting

For most development and small production deployments, this is sufficient.

## Next Steps

After setting up Sentry:

1. **Set up alerts** in Sentry dashboard for critical errors
2. **Configure release tracking** by setting `APP_VERSION` in `.env`
3. **Review error patterns** regularly in Sentry dashboard
4. **Set up team members** if working with a team
5. **Configure alert notifications** (email, Slack, etc.)

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/javascript/guides/nodejs/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)

---

**Need Help?**
- Check Sentry's [support documentation](https://docs.sentry.io/)
- Review application logs in `backend/logs/error.log`
- Verify DSN is correctly configured in `.env`

