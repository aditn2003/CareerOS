# Email Forwarding Implementation Guide (UC-125)

## Overview
Users forward job application confirmation emails to a dedicated email address, and the system automatically parses and imports them.

---

## Step-by-Step Implementation

### **STEP 1: Set Up Email Receiving Service (2-3 hours)**

#### Option A: SendGrid Inbound Parse (Recommended - Easiest)
1. **Sign up for SendGrid** (free tier: 100 emails/day)
   - Go to https://sendgrid.com
   - Create account
   - Get API key

2. **Set up Inbound Parse Webhook**
   - Go to Settings → Inbound Parse
   - Add new hostname: `jobs.yourdomain.com` (or use SendGrid subdomain)
   - Set destination URL: 
     - **Production**: `https://atscareeros.com/api/jobs/inbound-email`
     - **Local Testing**: Use ngrok (see below)
   - Choose POST method
   - Save
   
   **For Local Testing with ngrok:**
   ```bash
   # Run ngrok to expose localhost
   ngrok http 4000
   # Use the https URL it gives you, e.g.:
   # https://abc123.ngrok.io/api/jobs/inbound-email
   ```

3. **Point DNS to SendGrid** (if using custom domain)
   - Add MX record: `jobs.yourdomain.com` → `mx.sendgrid.net`
   - Or use SendGrid's provided subdomain for testing

#### Option B: AWS SES (More complex, more scalable)
- Set up SES domain
- Configure SNS webhook
- More setup, but better for production

#### Option C: Mailgun (Alternative)
- Similar to SendGrid
- Good free tier

**Recommended:** Start with SendGrid Inbound Parse (easiest)

---

### **STEP 2: Install Required Dependencies (5 minutes)**

```bash
cd backend
npm install mailparser
```

`mailparser` - Parses raw email content (HTML, text, attachments)

---

### **STEP 3: Create Email Parsing Service (2-3 hours)**

Create `backend/services/emailParserService.js`:

```javascript
import { simpleParser } from 'mailparser';

/**
 * Extract job details from email content
 * Supports: LinkedIn, Indeed, Glassdoor
 */
export async function parseJobEmail(rawEmail) {
  try {
    // Parse raw email
    const parsed = await simpleParser(rawEmail);
    
    const emailData = {
      from: parsed.from?.text || '',
      subject: parsed.subject || '',
      textBody: parsed.text || '',
      htmlBody: parsed.html || '',
      date: parsed.date
    };
    
    // Detect platform
    const platform = detectPlatform(emailData);
    
    // Extract job details based on platform
    const jobDetails = extractJobDetails(emailData, platform);
    
    return {
      platform,
      ...jobDetails,
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
  
  // Check subject line patterns
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
      return extractIndeedDetails(subject, textBody, htmlBody);
    case 'glassdoor':
      return extractGlassdoorDetails(subject, textBody, htmlBody);
    default:
      return extractGenericDetails(subject, textBody);
  }
}

function extractLinkedInDetails(subject, text, html) {
  // Pattern 1: "You applied for [Job Title] at [Company]"
  const pattern1 = /You applied for (.+?) at (.+?)(?:\.|$)/i;
  const match1 = subject.match(pattern1) || text.match(pattern1);
  
  if (match1) {
    return {
      title: match1[1].trim(),
      company: match1[2].trim(),
      status: 'Applied'
    };
  }
  
  // Pattern 2: HTML parsing (if available)
  if (html) {
    // LinkedIn often includes structured data in HTML
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
  
  // Fallback: Try to extract from text
  return extractGenericDetails(subject, text);
}

function extractIndeedDetails(subject, text, html) {
  // Pattern: "Your application to [Company]"
  const companyMatch = subject.match(/Your application to (.+?)(?:\.|$)/i) ||
                       text.match(/Your application to (.+?)(?:\.|$)/i);
  
  // Look for job title in email body
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

function extractGlassdoorDetails(subject, text, html) {
  // Similar to Indeed patterns
  const companyMatch = subject.match(/application.*?to (.+?)(?:\.|$)/i) ||
                       text.match(/application.*?to (.+?)(?:\.|$)/i);
  
  return {
    title: extractGenericDetails(subject, text).title || 'Unknown Position',
    company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
    status: 'Applied'
  };
}

function extractGenericDetails(subject, text) {
  // Generic extraction - try to find company and title
  // Look for common patterns
  const patterns = [
    { regex: /at (.+?)(?:\.|$)/i, type: 'company' },
    { regex: /(.+?) at /i, type: 'title' }
  ];
  
  let title = 'Unknown Position';
  let company = 'Unknown Company';
  
  // Try subject first
  const atMatch = subject.match(/at (.+?)(?:\.|$)/i);
  if (atMatch) company = atMatch[1].trim();
  
  const titleMatch = subject.match(/(.+?) at /i);
  if (titleMatch) title = titleMatch[1].trim();
  
  return { title, company, status: 'Applied' };
}

function cleanHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}
```

---

### **STEP 4: Create Inbound Email Endpoint (1-2 hours)**

Create route: `backend/routes/job.js` - Add this endpoint:

```javascript
import { parseJobEmail } from '../services/emailParserService.js';

// Email forwarding endpoint
router.post("/inbound-email", async (req, res) => {
  try {
    // SendGrid sends email data in req.body (raw email)
    // Other services may send it differently - check their docs
    
    const rawEmail = req.body;
    
    // If using SendGrid, the email is in req.body already
    // If using other services, you may need to fetch it
    // e.g., AWS SES sends SNS notification, then you fetch email
    
    // Parse email to extract job details
    const parsedJob = await parseJobEmail(rawEmail);
    
    // Extract user ID from email address
    // Format: jobs-user123@yourdomain.com → user_id = 123
    const userEmail = req.body.to || req.headers['x-forwarded-to'] || '';
    const userIdMatch = userEmail.match(/jobs-(\d+)@/);
    
    if (!userIdMatch) {
      return res.status(400).json({ error: "Invalid email address format" });
    }
    
    const userId = parseInt(userIdMatch[1], 10);
    
    // Check for duplicates
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
      // Update existing job with platform info
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
          JSON.stringify({ email_subject: parsedJob.rawEmail.subject })
        ]
      );
      
      return res.status(200).json({ 
        success: true, 
        message: "Job consolidated with existing application",
        consolidated: true
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
          email_from: parsedJob.rawEmail.from
        })
      ]
    );
    
    // Log to application history
    await pool.query(
      `INSERT INTO application_history (job_id, user_id, event, from_status, to_status)
       VALUES ($1, $2, $3, NULL, $4)`,
      [newJob.id, userId, `Application imported from ${parsedJob.platform} email`, newJob.status]
    );
    
    res.status(200).json({ 
      success: true, 
      message: "Job imported successfully",
      job_id: newJob.id
    });
    
  } catch (error) {
    console.error("❌ Email import error:", error);
    // Always return 200 to email service (so they don't retry)
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

**Important:** Always return 200 status to email service even on errors (prevents retries)

---

### **STEP 5: Database Schema (Already Done ✓)**

You already have:
- `jobs` table with `platform`, `is_imported`, `imported_at` columns
- `job_platforms` table for multi-platform tracking

Just need to ensure columns exist. Run if needed:
```sql
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;
```

---

### **STEP 6: Get User Email Address (30 minutes)**

Add endpoint to get user's forwarding email:

```javascript
// GET /api/jobs/forwarding-email
router.get("/forwarding-email", auth, async (req, res) => {
  try {
    // Format: jobs-{userId}@yourdomain.com
    // Option 1: Use your domain (requires MX record setup in DNS)
    // Option 2: Use SendGrid's test domain (no setup needed)
    const domain = process.env.EMAIL_DOMAIN || 'inbound.sendgrid.net';
    // For production with your domain: process.env.EMAIL_DOMAIN || 'atscareeros.com'
    const forwardingEmail = `jobs-${req.userId}@${domain}`;
    
    res.json({
      forwarding_email: forwardingEmail,
      instructions: `Forward job application confirmation emails to this address to automatically import them.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **STEP 7: Update Frontend (1 hour)**

Add UI to show forwarding email address:

```jsx
// In Jobs.jsx or Settings page
const [forwardingEmail, setForwardingEmail] = useState('');

useEffect(() => {
  fetch('/api/jobs/forwarding-email')
    .then(res => res.json())
    .then(data => setForwardingEmail(data.forwarding_email));
}, []);

return (
  <div>
    <h3>Email Forwarding</h3>
    <p>Forward job application emails to:</p>
    <code>{forwardingEmail}</code>
    <button onClick={() => navigator.clipboard.writeText(forwardingEmail)}>
      Copy
    </button>
  </div>
);
```

---

### **STEP 8: Testing (2-3 hours)**

1. **Test with sample emails:**
   - Forward a LinkedIn application email
   - Forward an Indeed application email
   - Check if jobs are imported correctly

2. **Test duplicate detection:**
   - Forward same job twice
   - Should consolidate, not create duplicate

3. **Test edge cases:**
   - Malformed emails
   - Unknown platforms
   - Missing fields

---

## Quick Start Checklist

- [ ] **Set up SendGrid account** and get API key
- [ ] **Configure Inbound Parse webhook** in SendGrid
- [ ] **Install mailparser**: `npm install mailparser`
- [ ] **Create email parsing service** (`backend/services/emailParserService.js`)
- [ ] **Add inbound email endpoint** (`POST /api/jobs/inbound-email`)
- [ ] **Test endpoint** with sample email
- [ ] **Add forwarding email endpoint** (`GET /api/jobs/forwarding-email`)
- [ ] **Update frontend** to show forwarding address
- [ ] **Test with real forwarded emails**

---

## Email Format Examples

### LinkedIn Email:
```
Subject: You applied for Software Engineer at Google

Body:
You applied for Software Engineer at Google
San Francisco, CA
Applied 2 days ago
```

### Indeed Email:
```
Subject: Your application to Microsoft

Body:
Your application to Microsoft for the position of Software Engineer has been received.
```

---

## Security Considerations

1. **Verify sender:** Only accept emails from known job platforms
2. **Rate limiting:** Prevent spam/abuse
3. **User validation:** Ensure email belongs to valid user
4. **Sanitize input:** Clean extracted data before saving

---

## Troubleshooting

### Email not being received?
- Check SendGrid webhook is configured correctly
- Verify DNS MX records (if using custom domain)
- **For local testing**: Make sure ngrok is running and URL is correct
- **For production**: Verify Render.com service is running and URL is accessible
- Check SendGrid webhook logs to see if requests are being sent

### Parsing not working?
- Log raw email content to debug
- Test regex patterns separately
- Check email format matches expected patterns

### Jobs not importing?
- Check database connection
- Verify user_id extraction from email address
- Check for errors in application logs

---

## Next Steps After MVP

1. **Improve parsing:** Add AI extraction (Gemini) as fallback
2. **Auto-sync:** Periodically check user's email (if using IMAP)
3. **Better UI:** Show import history, allow manual correction
4. **Multiple email providers:** Support Gmail, Outlook, etc.
