# Email Forwarding Setup - Complete Walkthrough

## Overview
Users forward job application emails to **one email address**, and your system automatically imports them.

---

## STEP 1: Set Up SendGrid (15 minutes)

### 1.1 Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up for free account (100 emails/day free)
3. Complete email verification

### 1.2 Set Up Inbound Parse Webhook
1. In SendGrid dashboard, go to **Settings** → **Inbound Parse**
2. Click **"Add Host & URL"**
3. Fill in:
   - **Subdomain**: `jobs` (or leave blank to use root domain)
   - **Domain**: Use SendGrid's test domain OR your domain:
     - **Option A (Easiest)**: Leave blank - uses `inbound.sendgrid.net`
     - **Option B**: Enter `atscareeros.com` (requires DNS setup)
   - **Destination URL**: `https://atscareeros.com/api/jobs/inbound-email`
   - **Method**: POST
4. Click **"Add"**

**Your email address will be:**
- `jobs@inbound.sendgrid.net` (if using Option A)
- `jobs@atscareeros.com` (if using Option B)

**Note**: You can set up your domain later. Start with `inbound.sendgrid.net` for now.

---

## STEP 2: Install Dependency (2 minutes)

```bash
cd backend
npm install mailparser
```

---

## STEP 3: Create Email Parser Service (30 minutes)

Create file: `backend/services/emailParserService.js`

```javascript
import { simpleParser } from 'mailparser';

/**
 * Parse email and extract job details
 */
export async function parseJobEmail(rawEmail) {
  try {
    const parsed = await simpleParser(rawEmail);
    
    const emailData = {
      from: parsed.from?.text || '',
      fromEmail: parsed.from?.value?.[0]?.address || '',
      subject: parsed.subject || '',
      textBody: parsed.text || '',
      htmlBody: parsed.html || '',
      date: parsed.date || new Date()
    };
    
    // Detect platform (LinkedIn, Indeed, Glassdoor)
    const platform = detectPlatform(emailData);
    
    // Extract job details
    const jobDetails = extractJobDetails(emailData, platform);
    
    return {
      platform,
      ...jobDetails,
      emailFrom: emailData.fromEmail, // User's email address
      rawEmail: emailData
    };
  } catch (error) {
    throw new Error(`Failed to parse email: ${error.message}`);
  }
}

function detectPlatform(emailData) {
  const from = emailData.from.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  
  if (from.includes('linkedin.com') || from.includes('linkedin')) {
    return 'linkedin';
  }
  if (from.includes('indeed.com') || from.includes('indeed')) {
    return 'indeed';
  }
  if (from.includes('glassdoor.com') || from.includes('glassdoor')) {
    return 'glassdoor';
  }
  
  // Check subject patterns
  if (subject.includes('linkedin')) return 'linkedin';
  if (subject.includes('indeed')) return 'indeed';
  if (subject.includes('glassdoor')) return 'glassdoor';
  
  return 'company_site'; // Default fallback
}

function extractJobDetails(emailData, platform) {
  const { subject, textBody, htmlBody } = emailData;
  
  switch (platform) {
    case 'linkedin':
      return extractLinkedInDetails(subject, textBody, htmlBody);
    case 'indeed':
      return extractIndeedDetails(subject, textBody);
    case 'glassdoor':
      return extractGlassdoorDetails(subject, textBody);
    default:
      return extractGenericDetails(subject, textBody);
  }
}

function extractLinkedInDetails(subject, text, html) {
  // Pattern: "You applied for [Job Title] at [Company]"
  const pattern = /You applied for (.+?) at (.+?)(?:\.|$)/i;
  const match = subject.match(pattern) || text.match(pattern);
  
  if (match) {
    return {
      title: match[1].trim(),
      company: match[2].trim(),
      status: 'Applied'
    };
  }
  
  // Try HTML parsing if available
  if (html) {
    const titleMatch = html.match(/<strong[^>]*>(.+?)<\/strong>/i);
    const companyMatch = html.match(/at <strong[^>]*>(.+?)<\/strong>/i);
    
    if (titleMatch && companyMatch) {
      return {
        title: cleanHtml(titleMatch[1]),
        company: cleanHtml(companyMatch[1]),
        status: 'Applied'
      };
    }
  }
  
  // Fallback
  return extractGenericDetails(subject, text);
}

function extractIndeedDetails(subject, text) {
  // Pattern: "Your application to [Company]"
  const companyMatch = subject.match(/Your application to (.+?)(?:\.|$)/i) ||
                       text.match(/Your application to (.+?)(?:\.|$)/i);
  
  // Try to find job title in body
  const titlePatterns = [
    /position[:\s]+(.+?)(?:\n|$)/i,
    /role[:\s]+(.+?)(?:\n|$)/i,
    /job[:\s]+(.+?)(?:\n|$)/i
  ];
  
  let title = null;
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      title = match[1].trim();
      break;
    }
  }
  
  return {
    title: title || 'Unknown Position',
    company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
    status: 'Applied'
  };
}

function extractGlassdoorDetails(subject, text) {
  const companyMatch = subject.match(/application.*?to (.+?)(?:\.|$)/i) ||
                       text.match(/application.*?to (.+?)(?:\.|$)/i);
  
  return {
    title: extractGenericDetails(subject, text).title || 'Unknown Position',
    company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
    status: 'Applied'
  };
}

function extractGenericDetails(subject, text) {
  let title = 'Unknown Position';
  let company = 'Unknown Company';
  
  // Try to extract company from "at [Company]"
  const atMatch = subject.match(/at (.+?)(?:\.|$)/i);
  if (atMatch) company = atMatch[1].trim();
  
  // Try to extract title before "at"
  const titleMatch = subject.match(/(.+?) at /i);
  if (titleMatch) title = titleMatch[1].trim();
  
  return { title, company, status: 'Applied' };
}

function cleanHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}
```

---

## STEP 4: Add Inbound Email Endpoint (30 minutes)

Add this to `backend/routes/job.js` (before `export default router;`):

```javascript
import { parseJobEmail } from '../services/emailParserService.js';

// ==================================================================
// INBOUND EMAIL ENDPOINT (UC-125)
// Receives forwarded emails from SendGrid
// ==================================================================
router.post("/inbound-email", async (req, res) => {
  try {
    // SendGrid sends email data in req.body
    // The raw email is typically in req.body or req.body['email']
    const rawEmail = req.body;
    
    // Parse email to extract job details
    const parsedJob = await parseJobEmail(rawEmail);
    
    // Find user by email address (from the "From" field)
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [parsedJob.emailFrom]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`⚠️ Email from unknown user: ${parsedJob.emailFrom}`);
      // Return 200 so SendGrid doesn't retry, but don't process
      return res.status(200).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    const userId = userResult.rows[0].id;
    
    // Check for duplicates (same company + title within last 30 days)
    const duplicateCheck = await pool.query(
      `SELECT id FROM jobs 
       WHERE user_id = $1 
       AND LOWER(company) = LOWER($2)
       AND LOWER(title) = LOWER($3)
       AND created_at > NOW() - INTERVAL '30 days'
       AND ("isArchived" = false OR "isArchived" IS NULL)`,
      [userId, parsedJob.company, parsedJob.title]
    );
    
    if (duplicateCheck.rows.length > 0) {
      // Update existing job - add platform tracking
      const existingJobId = duplicateCheck.rows[0].id;
      
      await pool.query(
        `INSERT INTO job_platforms (job_id, platform, source_url, applied_at, platform_metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (job_id, platform) DO UPDATE SET updated_at = NOW()`,
        [
          existingJobId,
          parsedJob.platform,
          parsedJob.source_url || null,
          parsedJob.date || new Date(),
          JSON.stringify({ 
            email_subject: parsedJob.rawEmail.subject,
            imported_from_email: true
          })
        ]
      );
      
      return res.status(200).json({ 
        success: true, 
        message: "Job consolidated with existing application"
      });
    }
    
    // Create new job
    const result = await pool.query(
      `INSERT INTO jobs (
        user_id, title, company, location, description,
        status, platform, source_url, is_imported, imported_at,
        "applicationDate", status_updated_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        parsedJob.title,
        parsedJob.company,
        parsedJob.location || null,
        parsedJob.description || '',
        parsedJob.status || 'Applied',
        parsedJob.platform,
        parsedJob.source_url || null,
        true, // is_imported
        new Date(), // imported_at
        parsedJob.date || new Date() // applicationDate
      ]
    );
    
    const newJob = result.rows[0];
    
    // Add to job_platforms table
    await pool.query(
      `INSERT INTO job_platforms (job_id, platform, source_url, applied_at, platform_metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        newJob.id,
        parsedJob.platform,
        parsedJob.source_url || null,
        parsedJob.date || new Date(),
        JSON.stringify({ 
          email_subject: parsedJob.rawEmail.subject,
          email_from: parsedJob.rawEmail.from,
          imported_from_email: true
        })
      ]
    );
    
    // Log to application history
    await pool.query(
      `INSERT INTO application_history (job_id, user_id, event, from_status, to_status)
       VALUES ($1, $2, $3, NULL, $4)`,
      [newJob.id, userId, `Application imported from ${parsedJob.platform} email`, newJob.status]
    );
    
    console.log(`✅ Job imported: ${parsedJob.title} at ${parsedJob.company} for user ${userId}`);
    
    // Always return 200 so SendGrid doesn't retry
    res.status(200).json({ 
      success: true, 
      message: "Job imported successfully",
      job_id: newJob.id
    });
    
  } catch (error) {
    console.error("❌ Email import error:", error);
    // Always return 200 so SendGrid doesn't retry failed emails
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

**Important**: Always return 200 status code (even on errors) so SendGrid doesn't keep retrying.

---

## STEP 5: Add Forwarding Email Endpoint (10 minutes)

Add this to `backend/routes/job.js`:

```javascript
// ==================================================================
// GET FORWARDING EMAIL ADDRESS (UC-125)
// Returns the email address users should forward to
// ==================================================================
router.get("/forwarding-email", auth, async (req, res) => {
  try {
    // Use environment variable or default to SendGrid test domain
    const emailDomain = process.env.EMAIL_FORWARDING_DOMAIN || 'inbound.sendgrid.net';
    const forwardingEmail = `jobs@${emailDomain}`;
    
    res.json({
      forwarding_email: forwardingEmail,
      instructions: "Forward job application confirmation emails to this address to automatically import them into your job tracker."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## STEP 6: Update Frontend (20 minutes)

Add UI to show forwarding email. Add to Jobs page or Settings:

```jsx
// In Jobs.jsx or Settings page
import { useState, useEffect } from 'react';
import { api } from '../api';

const [forwardingEmail, setForwardingEmail] = useState('');
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.get('/api/jobs/forwarding-email')
    .then(res => {
      setForwardingEmail(res.data.forwarding_email);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to get forwarding email:', err);
      setLoading(false);
    });
}, []);

// In your JSX:
<div className="profile-box">
  <h3>📧 Email Forwarding</h3>
  <p>Forward job application confirmation emails to:</p>
  {loading ? (
    <p>Loading...</p>
  ) : (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
        <code style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {forwardingEmail}
        </code>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(forwardingEmail);
            alert('Email address copied!');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Copy
        </button>
      </div>
      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        When you forward emails from LinkedIn, Indeed, or Glassdoor, they'll be automatically imported.
      </p>
    </>
  )}
</div>
```

---

## STEP 7: Environment Variable (Optional)

Add to your `.env` file if you want to customize the email domain:

```env
EMAIL_FORWARDING_DOMAIN=inbound.sendgrid.net
# Or later when you set up your domain:
# EMAIL_FORWARDING_DOMAIN=atscareeros.com
```

---

## STEP 8: Testing (30 minutes)

### 8.1 Test Locally (using ngrok)

1. **Start your backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 4000
   ```

3. **Update SendGrid webhook** temporarily to use ngrok URL:
   - Destination URL: `https://abc123.ngrok.io/api/jobs/inbound-email`

4. **Send a test email:**
   - Forward a real job application email to `jobs@inbound.sendgrid.net`
   - Check your backend logs to see if it was received

5. **Check the database:**
   - Verify job was created
   - Check user_id matches the email sender

### 8.2 Test in Production

1. Deploy your code to Render
2. Make sure SendGrid webhook points to: `https://atscareeros.com/api/jobs/inbound-email`
3. Forward a test email
4. Check if job appears in your app

---

## Troubleshooting

### Email not being received?
- Check SendGrid webhook logs (Settings → Inbound Parse → click your host)
- Verify endpoint URL is correct
- Make sure backend is running and accessible
- Check CORS settings if testing from different origin

### User not found error?
- Make sure user's email in database matches the "From" field in forwarded email
- Check case sensitivity (emails should be stored lowercase)

### Job not importing?
- Check backend logs for errors
- Verify database connection
- Check if email format matches expected patterns

---

## Summary Checklist

- [ ] Set up SendGrid account
- [ ] Configure Inbound Parse webhook pointing to `https://atscareeros.com/api/jobs/inbound-email`
- [ ] Install `mailparser`: `npm install mailparser`
- [ ] Create `backend/services/emailParserService.js`
- [ ] Add `/api/jobs/inbound-email` endpoint to `backend/routes/job.js`
- [ ] Add `/api/jobs/forwarding-email` endpoint
- [ ] Update frontend to show forwarding email address
- [ ] Test by forwarding a real email
- [ ] Verify job appears in database

---

## That's it!

Once set up, users just forward job application emails to `jobs@inbound.sendgrid.net` and they'll automatically appear in their job tracker!
