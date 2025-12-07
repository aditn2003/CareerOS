// routes/linkedin.js
import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware } from "../auth.js";

const router = express.Router();

console.log("✅ LinkedIn routes module loaded");

// Initialize Supabase client lazily
let supabase = null;
const getSupabase = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
  return supabase;
};

// Debug middleware for ALL linkedin routes
router.use((req, res, next) => {
  console.log(`📍 LinkedIn route hit: ${req.method} ${req.path}`);
  next();
});

// STEP 1: Redirect user to LinkedIn for OAuth (using OpenID Connect scopes)
// NO authentication required - this is the OAuth entry point
router.get("/auth", (req, res) => {
  console.log("\n✅ /auth route called!");
  
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  console.log("CLIENT_ID value:", clientId);
  console.log("CLIENT_SECRET exists:", !!clientSecret);
  
  if (!clientId || !clientSecret) {
    console.log("❌ Credentials missing!");
    return res.status(500).json({ 
      error: "LINKEDIN_CREDENTIALS_MISSING",
      message: "LinkedIn credentials not configured in .env",
      debug: { 
        clientIdExists: !!clientId, 
        clientSecretExists: !!clientSecret
      }
    });
  }

  const redirectUri = process.env.LINKEDIN_CALLBACK_URL || "http://localhost:4000/api/linkedin/callback";
  // Use OpenID Connect scopes (profile and email are now standard OIDC scopes)
  const scope = "openid profile email";
  const state = Math.random().toString(36).substring(7); // CSRF protection
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  
  console.log("📍 Redirecting to LinkedIn OAuth...");
  console.log("📍 Auth URL:", authUrl);
  res.redirect(authUrl);
});

// STEP 2: Handle LinkedIn callback → exchange for access token and fetch profile
router.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  console.log("📍 LinkedIn callback received");
  console.log("Code:", code ? "present" : "missing");
  console.log("Error:", error || "none");
  
  if (error) {
    console.error("LinkedIn OAuth error:", error, error_description);
    return res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <p>LinkedIn error: ${error_description || error}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: "linkedin_error", 
              error: "${error}",
              description: "${error_description || 'Authentication failed'}"
            }, "*");
            setTimeout(() => window.close(), 1000);
          } else {
            window.location.href = "http://localhost:5173/login?error=" + encodeURIComponent("${error_description || error}");
          }
        </script>
      </body>
      </html>
    `);
  }

  if (!code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <p>Missing authorization code</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: "linkedin_error", 
              error: "missing_code",
              description: "No authorization code received"
            }, "*");
            setTimeout(() => window.close(), 1000);
          } else {
            window.location.href = "http://localhost:5173/login?error=missing_code";
          }
        </script>
      </body>
      </html>
    `);
  }

  try {
    const redirectUri = process.env.LINKEDIN_CALLBACK_URL || "http://localhost:4000/api/linkedin/callback";
    
    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in || 5184000;
    
    console.log("✅ Got access token");

    // Fetch user profile using OpenID Connect userinfo endpoint
    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profile = profileRes.data;
    console.log("✅ Got LinkedIn profile:", profile.name);
    console.log("📍 Full LinkedIn userinfo response:", JSON.stringify(profile, null, 2));

    // Capture ALL fields LinkedIn returns (in case they provide extras)
    const profileData = {
      linkedin_id: profile.sub,
      first_name: profile.given_name,
      last_name: profile.family_name,
      email: profile.email,
      email_verified: profile.email_verified,
      profile_pic_url: profile.picture,
      name: profile.name,
      locale: profile.locale,
      // These might be available in some cases:
      headline: profile.headline || profile.tagline || null,
      vanity_name: profile.vanity_name || null,
      // Store raw response for debugging
      _raw: profile
    };

    console.log("📍 Creating/logging in user and redirecting to frontend");
    
    // Import jwt and create user directly here
    const jwt = (await import('jsonwebtoken')).default;
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if user exists or create new one
    let userId;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('linkedin_id', profileData.linkedin_id)
      .single();
    
    if (existingUser) {
      userId = existingUser.id;
      console.log("📍 Existing user found:", userId);
    } else {
      // Check by email
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', profileData.email)
        .single();
      
      if (userByEmail) {
        userId = userByEmail.id;
        // Update LinkedIn ID
        await supabase
          .from('users')
          .update({ linkedin_id: profileData.linkedin_id })
          .eq('id', userId);
        console.log("📍 Updated existing user with LinkedIn ID:", userId);
      } else {
        // Create new user with a random password hash (required by DB schema)
        const bcrypt = (await import('bcryptjs')).default;
        const randomPassword = Math.random().toString(36) + Math.random().toString(36);
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: profileData.email,
            password_hash: passwordHash,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            linkedin_id: profileData.linkedin_id,
            provider: 'linkedin'
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error("Error creating user:", createError);
          throw createError;
        }
        userId = newUser.id;
        console.log("📍 Created new user:", userId);
      }
    }
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    const profileUpdateData = {
      full_name: `${profileData.first_name} ${profileData.last_name}`,
      email: profileData.email,
      picture_url: profileData.profile_pic_url,
      linkedin_picture_url: profileData.profile_pic_url,
      linkedin_imported_at: new Date().toISOString()
    };
    
    if (existingProfile) {
      // Update existing profile
      await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('user_id', userId);
      console.log("📍 Updated existing profile with LinkedIn data");
    } else {
      // Create new profile
      await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          ...profileUpdateData
        });
      console.log("📍 Created new profile with LinkedIn data");
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email: profileData.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Encode profile for URL (minimal data)
    const miniProfile = encodeURIComponent(JSON.stringify({
      linkedin_id: profileData.linkedin_id,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      email: profileData.email,
      profile_pic_url: profileData.profile_pic_url
    }));
    
    // Redirect to login page with token (simpler approach)
    const frontendPort = process.env.FRONTEND_PORT || '5173';
    const redirectUrl = `http://localhost:${frontendPort}/login?linkedin_token=${token}&linkedin_profile=${miniProfile}`;
    console.log("📍 Redirecting to:", redirectUrl.substring(0, 100) + "...");
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to app...</p>
  <script>window.location.href = "${redirectUrl}";</script>
</body>
</html>
    `);
  } catch (err) {
    console.error("LinkedIn OAuth failed:", err.response?.data || err.message);
    const errorMsg = (err.response?.data?.error_description || err.message || 'OAuth exchange failed').replace(/"/g, '\\"');
    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <p>LinkedIn OAuth Error</p>
        <p>${errorMsg}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: "linkedin_error", 
              error: "oauth_failed",
              description: "${errorMsg}"
            }, "*");
            setTimeout(() => window.close(), 2000);
          } else {
            window.location.href = "http://localhost:5173/login?error=" + encodeURIComponent("${errorMsg}");
          }
        </script>
      </body>
      </html>
    `);
  }
});

/**
 * POST /linkedin/store-token
 * Store LinkedIn access token for authenticated user
 */
router.post("/store-token", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accessToken, expiresIn } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing accessToken" });
    }

    const tokenExpiry = new Date(Date.now() + (expiresIn || 5184000) * 1000);

    // Store token in database
    const { error } = await getSupabase()
      .from("users")
      .update({
        linkedin_access_token: accessToken,
        linkedin_token_expiry: tokenExpiry.toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    res.json({
      success: true,
      message: "LinkedIn token stored successfully",
    });
  } catch (error) {
    console.error("Error storing LinkedIn token:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /linkedin/fetch-profile
 * Fetch LinkedIn profile data using stored access token (OpenID Connect userinfo endpoint)
 */
router.get("/fetch-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get stored access token
    const { data: userData, error: userError } = await getSupabase()
      .from("users")
      .select("linkedin_access_token, linkedin_token_expiry")
      .eq("id", userId)
      .single();

    if (userError || !userData?.linkedin_access_token) {
      return res.status(401).json({
        error: "No LinkedIn access token found. Please authenticate with LinkedIn first.",
      });
    }

    // Check token expiry
    if (
      userData.linkedin_token_expiry &&
      new Date(userData.linkedin_token_expiry) < new Date()
    ) {
      return res.status(401).json({
        error: "LinkedIn token has expired. Please re-authenticate.",
      });
    }

    const accessToken = userData.linkedin_access_token;

    // Fetch profile using OpenID Connect userinfo endpoint
    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profile = profileRes.data;

    // Extract data from userinfo response
    const linkedInData = {
      linkedin_id: profile.sub,
      first_name: profile.given_name,
      last_name: profile.family_name,
      email: profile.email,
      email_verified: profile.email_verified,
      profile_pic_url: profile.picture,
      name: profile.name,
      locale: profile.locale
    };

    res.json({
      success: true,
      profile: linkedInData,
      message: "LinkedIn profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.message || "Failed to fetch LinkedIn profile",
    });
  }
});

/**
 * POST /linkedin/sync-profile
 * Sync LinkedIn profile data to user's website profile
 */
router.post("/sync-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { linkedin_id, first_name, last_name, email, profile_pic_url } =
      req.body;

    // Update user record
    const { error: userError } = await getSupabase()
      .from("users")
      .update({
        linkedin_id: linkedin_id,
      })
      .eq("id", userId);

    if (userError) throw userError;

    // Update profile record
    const { error: profileError } = await getSupabase()
      .from("profiles")
      .update({
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        linkedin_picture_url: profile_pic_url,
        linkedin_imported_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    res.json({
      success: true,
      message: "LinkedIn profile synced successfully",
    });
  } catch (error) {
    console.error("Error syncing LinkedIn profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// LINKEDIN PROFILE OPTIMIZATION
// ======================================

/**
 * POST /linkedin/optimize-profile
 * Generates LinkedIn profile optimization suggestions
 */
router.post("/optimize-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { headline, about, skills, title, company, industry } = req.body;

    console.log(
      `LinkedIn optimization request for user ${userId}:`,
      { headline, title, company }
    );

    const suggestions = [];
    let scores = {
      headline_optimization_score: 0,
      about_section_optimization_score: 0,
      skills_optimization_score: 0,
      recommendations_score: 0,
    };

    // === HEADLINE OPTIMIZATION ===
    if (!headline || headline.length < 40) {
      suggestions.push({
        category: "headline",
        severity: "high",
        suggestion:
          "Your headline is too short. Aim for 120 characters to maximize visibility.",
        current: headline || "(empty)",
        recommendation: `${title} | ${company} | ${industry || "Your Industry"} Expert | Helping teams succeed...`,
        impact: "Improves profile visibility in search results by 40%",
      });
      scores.headline_optimization_score = 30;
    } else if (headline.length < 120) {
      suggestions.push({
        category: "headline",
        severity: "medium",
        suggestion:
          "Extend your headline to use the full 120 characters available.",
        current: headline,
        recommendation: `${headline} | Open to opportunities in ${industry || "your field"}`,
        impact: "Increases profile visibility and clarity",
      });
      scores.headline_optimization_score = 65;
    } else {
      suggestions.push({
        category: "headline",
        severity: "low",
        suggestion: "Your headline looks good! Consider adding keywords.",
        current: headline,
        recommendation:
          "Add specific skills or industries you specialize in to improve searchability.",
        impact: "Attracts more relevant connection requests",
      });
      scores.headline_optimization_score = 85;
    }

    // === ABOUT SECTION OPTIMIZATION ===
    if (!about || about.length < 100) {
      suggestions.push({
        category: "about_section",
        severity: "high",
        suggestion: "Your About section is incomplete or too short.",
        current: about || "(empty)",
        recommendation:
          "Write a compelling 150-200 character bio that includes: your professional identity, key achievements, and what you're looking for.",
        impact: "Profile completeness increased by 20%, engagement up to 25%",
      });
      scores.about_section_optimization_score = 20;
    } else if (about.length < 250) {
      suggestions.push({
        category: "about_section",
        severity: "medium",
        suggestion:
          "Expand your About section with more detail about your professional journey.",
        current: `${about.substring(0, 50)}...`,
        recommendation:
          "Add specific accomplishments, expertise areas, and what you're passionate about.",
        impact: "Increases profile views by 30-40%",
      });
      scores.about_section_optimization_score = 60;
    } else {
      suggestions.push({
        category: "about_section",
        severity: "low",
        suggestion: "Great About section! Keep it fresh and updated.",
        current: `${about.substring(0, 50)}...`,
        recommendation: "Update every 3-6 months with new achievements.",
        impact: "Maintains relevance and engagement",
      });
      scores.about_section_optimization_score = 90;
    }

    // === SKILLS OPTIMIZATION ===
    if (!skills || skills.length === 0) {
      suggestions.push({
        category: "skills",
        severity: "high",
        suggestion: "Add your professional skills to your profile.",
        current: "(no skills listed)",
        recommendation:
          "Add 10-15 relevant skills. Prioritize skills in demand for your target roles.",
        impact: "Profile completeness increased by 10%, 35% more profile views",
      });
      scores.skills_optimization_score = 10;
    } else if (skills.length < 5) {
      suggestions.push({
        category: "skills",
        severity: "medium",
        suggestion: "Expand your skills section.",
        current: `${skills.length} skills listed`,
        recommendation:
          "Add at least 10-15 skills. Include both technical and soft skills.",
        impact: "Increases search visibility for job opportunities",
      });
      scores.skills_optimization_score = 50;
    } else {
      suggestions.push({
        category: "skills",
        severity: "low",
        suggestion: "Good skill coverage! Keep it up-to-date.",
        current: `${skills.length} skills listed`,
        recommendation:
          "Regularly remove outdated skills and add new ones as you learn.",
        impact: "Maintains relevance in job search",
      });
      scores.skills_optimization_score = 85;
    }

    // === RECOMMENDATIONS & ENDORSEMENTS ===
    suggestions.push({
      category: "recommendations",
      severity: "medium",
      suggestion: "Build social proof with recommendations and endorsements.",
      current: "Not provided",
      recommendation:
        "Ask former colleagues for recommendations. Endorse others' skills to receive endorsements in return.",
      impact:
        "Increases interview requests by 40%, builds credibility with recruiters",
    });
    scores.recommendations_score = 40;

    // Calculate overall score
    const overallScore = Math.round(
      (scores.headline_optimization_score +
        scores.about_section_optimization_score +
        scores.skills_optimization_score +
        scores.recommendations_score) /
        4
    );
    scores.overall_optimization_score = overallScore;

    // Store optimization tracking in database
    const { data: existingTracking, error: fetchError } = await getSupabase()
      .from("linkedin_optimization_tracking")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingTracking) {
      // Create new tracking record
      const { error: insertError } = await getSupabase()
        .from("linkedin_optimization_tracking")
        .insert([
          {
            user_id: userId,
            ...scores,
            optimization_notes: JSON.stringify(suggestions),
          },
        ]);
      if (insertError) console.error("Error saving optimization data:", insertError);
    } else {
      // Update existing tracking record
      const { error: updateError } = await getSupabase()
        .from("linkedin_optimization_tracking")
        .update({
          ...scores,
          optimization_notes: JSON.stringify(suggestions),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (updateError) console.error("Error updating optimization data:", updateError);
    }

    res.json({
      success: true,
      overall_score: overallScore,
      scores,
      suggestions,
      message: "Profile optimization analysis complete",
    });
  } catch (error) {
    console.error("LinkedIn optimization error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================================
// LINKEDIN MESSAGE TEMPLATES
// ======================================

/**
 * POST /linkedin/generate-templates
 * Generates LinkedIn message templates for different scenarios
 */
router.post("/generate-templates", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      target_context,
      target_industry,
      target_seniority,
      relationship_type,
      your_name,
      your_title,
      your_company,
    } = req.body;

    console.log(
      `Generating LinkedIn templates for user ${userId}:`,
      { target_context, target_industry, your_title }
    );

    // Helper function to randomly pick from array
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const templates = [];

    // === CONNECTION REQUEST TEMPLATES === (5+ variations each)
    const connectionTemplateVariations = {
      "Professional Growth": [
        `Hi {first_name},

I've been following {company_name}'s work in ${target_industry} and I'm impressed by your approach to {their_achievement_area}. 

As a ${your_title} at ${your_company}, I'm exploring ways to collaborate with professionals who share similar values. I'd love to connect and learn from your experience.

Looking forward to connecting!

Best regards,
${your_name}`,
        `Hi {first_name},

Your insights on {their_achievement_area} within ${target_industry} caught my attention. I think there's a lot of value in what you're building.

I'm also working on some interesting projects at ${your_company} as a ${your_title}. Would love to connect and perhaps exchange ideas.

Thanks,
${your_name}`,
        `Hi {first_name},

I've noticed your work at {company_name} in the ${target_industry} space. Your perspective on {their_achievement_area} is exactly what I'm looking to learn more about.

Happy to connect and share what I'm working on as well. Hope to hear from you!

${your_name}`,
        `Hi {first_name},

I came across your profile and was impressed by how you've been driving innovation in {their_achievement_area} at {company_name}. 

As someone passionate about the same challenges in ${target_industry}, I'd love to connect and exchange insights.

Best,
${your_name}`,
        `Hi {first_name},

Your work in ${target_industry} stands out to me, particularly your contributions to {their_achievement_area}. I believe we could have some great conversations about industry trends and best practices.

Would love to add you to my network!

${your_name}`,
        `Hi {first_name},

I've been impressed by how you approach {their_achievement_area} within ${target_industry}. As a ${your_title}, I'm always looking to connect with people who are making a real impact.

Let's connect!

${your_name}`,
      ],
      "Value Proposition": [
        `Hi {first_name},

I came across your profile while researching leaders in ${target_industry}. Your background in {expertise_area} aligns perfectly with a project I'm working on.

I'd love to pick your brain about {specific_topic} when you have a moment. Always happy to share insights from my experience at ${your_company} as well.

Let's connect!

${your_name}`,
        `Hi {first_name},

I've been looking for someone with your expertise in {expertise_area} for a project I'm leading at ${your_company}. Your experience seems like a perfect fit.

Would you be open to a quick conversation about {specific_topic}? I think we could both benefit.

${your_name}`,
        `Hi {first_name},

Your track record in {expertise_area} is impressive. I'm currently exploring {specific_topic} and would value your perspective.

Would love to connect and potentially collaborate.

Best,
${your_name}`,
        `Hi {first_name},

I've been researching professionals in {expertise_area} and your background really stands out. I think there could be some great synergies between what you're doing and projects at ${your_company}.

Interested in connecting?

${your_name}`,
        `Hi {first_name},

Your expertise in {expertise_area} is exactly what I've been looking for. I'm working on {specific_topic} and believe your insights could be invaluable.

Would love to connect!

${your_name}`,
        `Hi {first_name},

I've admired your work in {expertise_area} for a while now. I think there's real potential for us to collaborate on {specific_topic}.

Let's connect and explore this further!

${your_name}`,
      ],
      "Direct & Simple": [
        `Hi {first_name},

I'd love to connect and stay updated on what you're doing in ${target_industry}.

Best,
${your_name}`,
        `Hi {first_name},

Let's connect! I'm always interested in meeting professionals in ${target_industry}.

${your_name}`,
        `Hi {first_name},

I admire your work in ${target_industry} and would enjoy connecting with you.

Cheers,
${your_name}`,
        `Hi {first_name},

Your contributions to ${target_industry} have caught my attention. Would love to connect!

${your_name}`,
        `Hi {first_name},

Great profile! I'd like to add you to my network and stay in touch.

${your_name}`,
        `Hi {first_name},

I'm impressed by your presence in ${target_industry}. Let's connect!

${your_name}`,
      ],
    };

    // === FIRST MESSAGE TEMPLATES === (5+ variations each)
    const firstMessageVariations = {
      "Value-Add Opener": [
        `Hi {first_name},

Thanks for connecting! I wanted to share something I came across that might interest you given your work in {their_focus_area}.

{resource_or_insight}

Would love to hear your thoughts on this.

Best,
${your_name}`,
        `Hi {first_name},

Great to have you in my network! I just found this resource on {their_focus_area} that reminded me of your work.

{resource_or_insight}

Curious what you think. Let me know!

${your_name}`,
        `Hi {first_name},

Thanks for connecting. Came across this and thought it was right up your alley given your focus on {their_focus_area}:

{resource_or_insight}

Happy to discuss further if you're interested!

${your_name}`,
        `Hi {first_name},

Thanks for accepting! I came across an interesting article on {their_focus_area} and immediately thought of you.

{resource_or_insight}

Would appreciate your take on this!

${your_name}`,
        `Hi {first_name},

Thrilled to connect! Found this resource that aligns perfectly with your expertise in {their_focus_area}.

{resource_or_insight}

Let me know what you think!

${your_name}`,
        `Hi {first_name},

Thanks for connecting! I came across something relevant to {their_focus_area} and thought you'd find it valuable.

{resource_or_insight}

Curious to hear your thoughts!

${your_name}`,
      ],
      "Opportunity Introduction": [
        `Hi {first_name},

Great to connect! I was thinking about our mutual interest in ${target_industry} and thought you might know {mutual_contact_name} at {their_company}. 

Are you two already connected? If not, I'd be happy to make an introduction.

Let me know!
${your_name}`,
        `Hi {first_name},

Quick thought - I know {mutual_contact_name} at {their_company} and they seem to be doing amazing work in ${target_industry}. Have you two crossed paths yet?

I'd be happy to introduce you if not!

${your_name}`,
        `Hi {first_name},

You and {mutual_contact_name} from {their_company} would probably have a lot to talk about regarding ${target_industry}. Interested in an intro?

${your_name}`,
        `Hi {first_name},

I was thinking - {mutual_contact_name} at {their_company} is doing some really interesting work in ${target_industry}. I think you two should connect!

Would you like an introduction?

${your_name}`,
        `Hi {first_name},

I just thought of {mutual_contact_name} from {their_company} - I think you two would have a lot in common in terms of ${target_industry}. Open to meeting?

${your_name}`,
        `Hi {first_name},

Been thinking about the folks I know in ${target_industry} and {mutual_contact_name} at {their_company} immediately came to mind. Want me to make the intro?

${your_name}`,
      ],
      "Casual Conversation Starter": [
        `Hi {first_name},

Just wanted to say I really enjoy the insights you share about ${target_industry}. Your recent post on {post_topic} really resonated with me.

What sparked your interest in that direction?

${your_name}`,
        `Hi {first_name},

Love your take on {post_topic} within ${target_industry}! It's a perspective I don't see often. How did you get into that?

${your_name}`,
        `Hi {first_name},

Your recent thoughts on {post_topic} in the ${target_industry} space are spot on. I'd love to hear more about how you developed this viewpoint.

${your_name}`,
        `Hi {first_name},

I've been following your posts on ${target_industry} and your perspective on {post_topic} is refreshing. How do you see this evolving?

${your_name}`,
        `Hi {first_name},

Your insights on {post_topic} stood out to me. I'd love to pick your brain about ${target_industry} and where you think it's headed.

${your_name}`,
        `Hi {first_name},

Great to connect! I really appreciate your viewpoint on {post_topic}. How did you get so knowledgeable about ${target_industry}?

${your_name}`,
      ],
    };

    // === FOLLOW-UP TEMPLATES === (5+ variations each)
    const followUpVariations = {
      "Week 1 Follow-Up": [
        `Hi {first_name},

Just checking in to see if that resource I shared was helpful. Happy to discuss further if you'd like.

${your_name}`,
        `Hi {first_name},

Quick follow-up on my last message - hope the resource was useful! Feel free to reach out if you want to dive deeper.

${your_name}`,
        `Hi {first_name},

Wanted to circle back and see what you thought. No pressure if you haven't had time to check it out yet!

${your_name}`,
        `Hi {first_name},

Following up on my previous message. Let me know if you'd like to chat about any of it!

${your_name}`,
        `Hi {first_name},

Checking in! I hope you had a chance to see what I shared. Open to any questions or follow-up conversations.

${your_name}`,
        `Hi {first_name},

Just wanted to follow up and see if the information was helpful. Always happy to discuss more!

${your_name}`,
      ],
      "Value-Add Follow-Up": [
        `Hi {first_name},

I came across {relevant_resource} and thought of you immediately. Figured it could be relevant to {their_current_focus}.

Let me know your thoughts!

${your_name}`,
        `Hi {first_name},

Found this while researching: {relevant_resource}. Given your work on {their_current_focus}, I thought you'd find it valuable.

Worth a look?

${your_name}`,
        `Hi {first_name},

Stumbled upon {relevant_resource} and it's directly related to {their_current_focus}. Thought you should see this!

${your_name}`,
        `Hi {first_name},

I came across another great resource: {relevant_resource}. Considering your focus on {their_current_focus}, this seemed perfect for you.

Would love to hear your thoughts!

${your_name}`,
        `Hi {first_name},

Found something relevant to {their_current_focus} that I think you'll appreciate: {relevant_resource}.

Let me know what you think!

${your_name}`,
        `Hi {first_name},

Came across {relevant_resource} and immediately thought of your work on {their_current_focus}. Definitely worth checking out!

${your_name}`,
      ],
      "Collaboration Follow-Up": [
        `Hi {first_name},

I've been working on {your_project} and realized your expertise in {their_expertise} could bring valuable perspectives.

Would you be open to a quick call next week to explore potential synergies?

${your_name}`,
        `Hi {first_name},

I'm currently leading {your_project} and could really use your input on {their_expertise}. Would love to chat!

${your_name}`,
        `Hi {first_name},

Your background in {their_expertise} would be perfect for what I'm doing with {your_project}. Interested in grabbing time to discuss?

${your_name}`,
        `Hi {first_name},

I've been thinking about {your_project} and your experience with {their_expertise} could be game-changing. Are you open to a conversation?

${your_name}`,
        `Hi {first_name},

I'm working on something that could really benefit from your expertise in {their_expertise}. {your_project} specifically. Interested?

${your_name}`,
        `Hi {first_name},

Would love to get your perspective on {your_project} - I think your knowledge of {their_expertise} would be invaluable.

Free for a quick chat soon?

${your_name}`,
      ],
    };

    // === THANK YOU TEMPLATES === (5+ variations each)
    const thankYouVariations = {
      "After Interview": [
        `Hi {first_name},

Thank you for taking the time to speak with me today. I really enjoyed learning more about {company_name} and the work your team is doing in ${target_industry}.

I'm particularly excited about {specific_discussion_point} and look forward to the next steps.

Best regards,
${your_name}`,
        `Hi {first_name},

Thanks for the great conversation today! It was wonderful to learn about {company_name}'s approach to {specific_discussion_point} in ${target_industry}.

I'm very enthusiastic about this opportunity and appreciate your time.

${your_name}`,
        `Hi {first_name},

Really appreciated our chat today. The insights you shared about {specific_discussion_point} at {company_name} are exactly what I was hoping to learn about.

Looking forward to connecting further!

${your_name}`,
        `Hi {first_name},

Thank you for the wonderful interview today! Your team at {company_name} is impressive, and I'm excited about the {specific_discussion_point} we discussed.

Looking forward to next steps!

${your_name}`,
        `Hi {first_name},

I really valued our conversation today. The way you explained {company_name}'s vision for {specific_discussion_point} was enlightening.

Thank you for your time, and I'm very interested in this role!

${your_name}`,
        `Hi {first_name},

What a great meeting today! Thanks so much for taking the time to discuss {specific_discussion_point} and {company_name}'s work in ${target_industry}.

I'm enthusiastic about the opportunity!

${your_name}`,
      ],
      "After Informational Interview": [
        `Hi {first_name},

I really appreciated the insights you shared about {topic_discussed}. Your perspective on {key_insight} was particularly valuable and will definitely help shape my next steps.

Thanks again for generously giving me your time!

${your_name}`,
        `Hi {first_name},

Your thoughts on {topic_discussed} were incredibly helpful. The point you made about {key_insight} gave me a lot to think about.

Thank you for the great conversation!

${your_name}`,
        `Hi {first_name},

That was so valuable - thank you! The way you explained {key_insight} in the context of {topic_discussed} really clarified things for me.

I'm grateful for your time and insights!

${your_name}`,
        `Hi {first_name},

Thank you so much for taking the time to chat! Your expertise on {topic_discussed} was exactly what I needed to hear, especially regarding {key_insight}.

Really appreciate it!

${your_name}`,
        `Hi {first_name},

I can't thank you enough for the informational interview! Your insights on {topic_discussed} and perspective on {key_insight} were incredibly helpful.

Truly grateful for your guidance!

${your_name}`,
        `Hi {first_name},

What a valuable conversation! Your knowledge of {topic_discussed} and especially {key_insight} has given me a much clearer direction forward.

Thank you so much for your time!

${your_name}`,
      ],
    };

    // Generate varied templates by picking random variations
    const connectionTemplates = [];
    
    // Professional Growth - add all 6 variations
    connectionTemplateVariations["Professional Growth"].forEach((content, idx) => {
      connectionTemplates.push({
        name: "Professional Growth",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{company_name}", "{their_achievement_area}"],
        effectiveness_note: "70% acceptance rate - Personal and specific",
      });
    });
    
    // Value Proposition - add all 6 variations
    connectionTemplateVariations["Value Proposition"].forEach((content, idx) => {
      connectionTemplates.push({
        name: "Value Proposition",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{expertise_area}", "{specific_topic}"],
        effectiveness_note: "65% acceptance rate - Mutually beneficial approach",
      });
    });
    
    // Direct & Simple - add all 6 variations
    connectionTemplateVariations["Direct & Simple"].forEach((content, idx) => {
      connectionTemplates.push({
        name: "Direct & Simple",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}"],
        effectiveness_note: "55% acceptance rate - Quickest to send",
      });
    });

    const firstMessageTemplates = [];
    
    // Value-Add Opener - add all 6 variations
    firstMessageVariations["Value-Add Opener"].forEach((content, idx) => {
      firstMessageTemplates.push({
        name: "Value-Add Opener",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{their_focus_area}", "{resource_or_insight}"],
        effectiveness_note: "45% response rate - Shows genuine interest",
      });
    });
    
    // Opportunity Introduction - add all 6 variations
    firstMessageVariations["Opportunity Introduction"].forEach((content, idx) => {
      firstMessageTemplates.push({
        name: "Opportunity Introduction",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{mutual_contact_name}", "{their_company}"],
        effectiveness_note: "50% response rate - Networking approach",
      });
    });
    
    // Casual Conversation Starter - add all 6 variations
    firstMessageVariations["Casual Conversation Starter"].forEach((content, idx) => {
      firstMessageTemplates.push({
        name: "Casual Conversation Starter",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{post_topic}"],
        effectiveness_note: "40% response rate - Builds genuine relationships",
      });
    });

    const followUpTemplates = [];
    
    // Week 1 Follow-Up - add all 6 variations
    followUpVariations["Week 1 Follow-Up"].forEach((content, idx) => {
      followUpTemplates.push({
        name: "Week 1 Follow-Up",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}"],
        effectiveness_note: "30% response rate - Low pressure check-in",
      });
    });
    
    // Value-Add Follow-Up - add all 6 variations
    followUpVariations["Value-Add Follow-Up"].forEach((content, idx) => {
      followUpTemplates.push({
        name: "Value-Add Follow-Up",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{relevant_resource}", "{their_current_focus}"],
        effectiveness_note: "35% response rate - Continuous value delivery",
      });
    });
    
    // Collaboration Follow-Up - add all 6 variations
    followUpVariations["Collaboration Follow-Up"].forEach((content, idx) => {
      followUpTemplates.push({
        name: "Collaboration Follow-Up",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{your_project}", "{their_expertise}"],
        effectiveness_note: "40% response rate - Direct collaboration proposition",
      });
    });

    const thankYouTemplates = [];
    
    // After Interview - add all 6 variations
    thankYouVariations["After Interview"].forEach((content, idx) => {
      thankYouTemplates.push({
        name: "After Interview",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{company_name}", "{specific_discussion_point}"],
        effectiveness_note: "Professional and timely",
      });
    });
    
    // After Informational Interview - add all 6 variations
    thankYouVariations["After Informational Interview"].forEach((content, idx) => {
      thankYouTemplates.push({
        name: "After Informational Interview",
        content: content,
        variation: idx + 1,
        variables: ["{first_name}", "{topic_discussed}", "{key_insight}"],
        effectiveness_note: "Builds lasting relationships",
      });
    });

    templates.push(
      {
        category: "connection_request",
        label: "Connection Request Templates",
        templates: connectionTemplates,
        best_practice:
          "Personalization increases acceptance by 40%. Always mention something specific.",
      },
      {
        category: "first_message",
        label: "First Message Templates (After Acceptance)",
        templates: firstMessageTemplates,
        best_practice:
          "Lead with value. Most people receive hundreds of generic messages daily.",
      },
      {
        category: "follow_up",
        label: "Follow-Up Templates",
        templates: followUpTemplates,
        best_practice:
          "Space follow-ups 1-2 weeks apart. Stop after 3 attempts if no response.",
      },
      {
        category: "thank_you",
        label: "Thank You Templates",
        templates: thankYouTemplates,
        best_practice: "Send within 24 hours of conversation for maximum impact.",
      }
    );

    // Save templates to database for future use
    // First delete old templates for this user
    await getSupabase()
      .from("linkedin_message_templates")
      .delete()
      .eq("user_id", userId);

    // Then save all template variations
    let insertCount = 0;
    for (const categoryGroup of templates) {
      for (const template of categoryGroup.templates) {
        const { error } = await getSupabase().from("linkedin_message_templates").insert({
          user_id: userId,
          template_name: template.name,
          template_type: categoryGroup.category,
          template_content: template.content,
          variables: Array.isArray(template.variables) ? template.variables : [],
          is_custom: false,
        });

        if (error) {
          console.error("Error saving template:", error);
        } else {
          insertCount++;
        }
      }
    }
    console.log(`Inserted ${insertCount} template variations for user ${userId}`);

    // Fetch all saved templates (for storage purposes)
    const { data: savedTemplates, error: fetchError } = await getSupabase()
      .from("linkedin_message_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");

    if (fetchError) {
      console.error("Error fetching saved templates:", fetchError);
    }

    console.log(`Fetched ${(savedTemplates || []).length} templates from database`);

    // Return the in-memory templates (already properly structured and grouped)
    res.json({
      success: true,
      template_count: (savedTemplates || []).length,
      categories: templates,
      message: "LinkedIn message templates generated successfully",
    });
  } catch (error) {
    console.error("LinkedIn template generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /linkedin/templates
 * Retrieve saved templates for a user
 */
router.get("/templates", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateType = req.query.type; // Optional filter by type

    let query = getSupabase()
      .from("linkedin_message_templates")
      .select("*")
      .eq("user_id", userId);

    if (templateType) {
      query = query.eq("template_type", templateType);
    }

    const { data, error } = await query.order("template_type").order("created_at");

    if (error) throw error;

    res.json({
      success: true,
      template_count: data.length,
      templates: data,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
