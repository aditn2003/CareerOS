# ngrok Authentication Setup

## Problem
ngrok requires a verified account and authtoken to use. The free tier is sufficient for testing.

## Quick Setup (5 minutes)

### Step 1: Sign Up for Free Account

1. **Go to ngrok dashboard**
   - Visit: https://dashboard.ngrok.com/signup
   - Or: https://ngrok.com and click "Get Started for Free"

2. **Create account**
   - Sign up with:
     - Email and password
     - Google account
     - GitHub account
   - Verify your email if required

3. **Complete signup**
   - You'll be redirected to the dashboard

### Step 2: Get Your Authtoken

1. **Go to authtoken page**
   - Visit: https://dashboard.ngrok.com/get-started/your-authtoken
   - Or: Dashboard → Your Authtoken

2. **Copy your authtoken**
   - You'll see a long string like: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`
   - Click "Copy" button
   - **Important**: Keep this token secret!

### Step 3: Configure ngrok

Run this command in PowerShell (replace with your actual token):

```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

**Example:**
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

You should see: `Authtoken saved to configuration file`

### Step 4: Verify Setup

Test ngrok:
```powershell
ngrok http 4000
```

You should now see the ngrok interface with a forwarding URL!

## Troubleshooting

### "authtoken is invalid"
- Make sure you copied the entire token (no spaces)
- Check you're using the correct token from your dashboard
- Try copying again from: https://dashboard.ngrok.com/get-started/your-authtoken

### "authtoken already exists"
- This is fine! Your token is already configured
- You can proceed to use ngrok

### "command not found: ngrok config"
- Make sure ngrok is in your PATH
- Or use full path: `C:\Users\Zaid Hasan\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken YOUR_TOKEN`

## Free Tier Limits

ngrok free tier includes:
- ✅ 1 ngrok agent
- ✅ 1 online ngrok agent
- ✅ 4 tunnels per agent
- ✅ 40 connections per minute
- ✅ Random subdomain (changes on restart)
- ✅ HTTP inspection

This is sufficient for testing and UptimeRobot monitoring!

## Next Steps

After authentication:

1. **Start your backend** (in one terminal):
   ```powershell
   cd backend
   npm start
   ```

2. **Start ngrok** (in another terminal):
   ```powershell
   .\start-ngrok.ps1 
   ```

3. **Copy the forwarding URL**:
   - Look for: `Forwarding   https://abc123.ngrok.io -> http://localhost:4000`
   - Copy the `https://` URL

4. **Use in UptimeRobot**:
   ```
   https://abc123.ngrok.io/api/monitoring/health
   ```

## Important Notes

- **Free tier URLs change**: Each time you restart ngrok, you get a new random URL
- **For permanent URLs**: Consider upgrading to a paid plan or deploying to a hosting service
- **Keep token secret**: Don't share your authtoken publicly
- **Token location**: Saved in `%USERPROFILE%\.ngrok2\ngrok.yml`

