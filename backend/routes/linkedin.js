// routes/linkedin.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// STEP 1: Redirect user to LinkedIn for OAuth
router.get("/auth", (req, res) => {
  const redirectUri = encodeURIComponent(
    "http://localhost:4000/api/linkedin/callback"
  );
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const scope = encodeURIComponent("r_liteprofile r_emailaddress");
  const state = "xyz" + Date.now();

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
    process.env.LINKEDIN_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=r_liteprofile%20r_emailaddress`;
  res.redirect(authUrl);
});

// STEP 2: Handle LinkedIn callback → exchange for access token
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: "http://localhost:4000/api/linkedin/callback",
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // ✅ Send token back to frontend popup via postMessage
    res.send(`
      <script>
        window.opener.postMessage({ type: "linkedin_token", accessToken: "${accessToken}" }, "*");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("LinkedIn OAuth failed:", err.response?.data || err.message);
    res.status(500).send("OAuth Error. Check backend logs.");
  }
});

export default router;
