# Debugging: Webhook Not Being Called

## Issue: No logs appearing after forwarding email

If you don't see `📧 Inbound email endpoint called` in your terminal, SendGrid isn't reaching your server.

---

## Step 1: Verify ngrok is Running

**Check if ngrok is running:**
- Look for the ngrok terminal window
- It should show: `Forwarding https://xxxxx.ngrok-free.app -> http://localhost:4000`
- If ngrok is NOT running, start it: `ngrok http 4000`

---

## Step 2: Test the Endpoint Directly

Open a NEW terminal and test if your endpoint works:

```bash
curl -X POST http://localhost:4000/api/jobs/inbound-email \
  -H "Content-Type: text/plain" \
  -d "From: test@example.com
Subject: Test
Body: Test email"
```

**Expected result:** You should see `📧 Inbound email endpoint called` in your backend terminal.

**If you DON'T see it:**
- The endpoint might not be set up correctly
- Check if the route is registered

---

## Step 3: Test Through ngrok

Test if ngrok is forwarding requests:

```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/jobs/inbound-email \
  -H "Content-Type: text/plain" \
  -d "From: test@example.com
Subject: Test
Body: Test email"
```

Replace `YOUR-NGROK-URL` with your actual ngrok URL.

**Expected result:** You should see `📧 Inbound email endpoint called` in your backend terminal.

**If you see an ngrok warning page:**
- ngrok free plan shows a warning page on first visit
- SendGrid might be blocked by this
- Solution: Visit the ngrok URL in your browser first, click "Visit Site", then try again

---

## Step 4: Check SendGrid Webhook URL

1. Go to SendGrid → Settings → Inbound Parse
2. Verify the URL is EXACTLY:
   ```
   https://YOUR-NGROK-URL.ngrok-free.app/api/jobs/inbound-email
   ```
3. Make sure there are no extra spaces or typos

---

## Step 5: Check ngrok Web Interface

1. Open your browser
2. Go to: `http://localhost:4040` (ngrok's web interface)
3. You should see a list of requests
4. Look for requests to `/api/jobs/inbound-email`
5. If you see requests but they're failing, check the error details

---

## Step 6: Common Issues

### Issue 1: ngrok Warning Page
**Problem:** ngrok free plan shows a warning page that blocks automated requests.

**Solution:**
1. Visit your ngrok URL in browser: `https://YOUR-NGROK-URL.ngrok-free.app/api/jobs/inbound-email`
2. Click "Visit Site" button
3. This allows SendGrid to bypass the warning

### Issue 2: ngrok Not Running
**Problem:** ngrok stopped or was never started.

**Solution:**
```bash
ngrok http 4000
```

### Issue 3: Wrong Port
**Problem:** Backend running on different port than ngrok expects.

**Solution:**
- Check backend logs: Should say `✅ API running at http://localhost:4000`
- Make sure ngrok matches: `ngrok http 4000`

### Issue 4: SendGrid Not Calling
**Problem:** SendGrid webhook URL is wrong or SendGrid hasn't received the email.

**Solution:**
- Check SendGrid → Activity → Activity Feed
- Look for emails sent TO `jobs@atscareeros.com`
- If no emails, the forwarding isn't working

---

## Quick Test Checklist

- [ ] Backend running (`node server.js` shows "API running at http://localhost:4000")
- [ ] ngrok running (`ngrok http 4000` shows forwarding URL)
- [ ] Tested endpoint locally (`curl http://localhost:4000/api/jobs/inbound-email`)
- [ ] Tested endpoint through ngrok (`curl https://ngrok-url/api/jobs/inbound-email`)
- [ ] Visited ngrok URL in browser (to bypass warning page)
- [ ] SendGrid webhook URL is correct
- [ ] Forwarded email to `jobs@atscareeros.com`
- [ ] Checked backend terminal for logs

---

## Next Steps

1. **First, test locally** - Make sure the endpoint works:
   ```bash
   curl -X POST http://localhost:4000/api/jobs/inbound-email \
     -H "Content-Type: text/plain" \
     -d "From: test@example.com
   Subject: Test
   Body: Test"
   ```

2. **Then test through ngrok** - Make sure ngrok forwarding works:
   ```bash
   curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/jobs/inbound-email \
     -H "Content-Type: text/plain" \
     -d "From: test@example.com
   Subject: Test
   Body: Test"
   ```

3. **Visit ngrok URL in browser** - Bypass the warning page

4. **Forward email again** - Check backend terminal

Let me know what you see when you test with curl!
