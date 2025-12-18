const express = require("express");
const passport = require("passport");
const router = express.Router();

// Step 1: Initiate LinkedIn Login
router.get("/linkedin", passport.authenticate("linkedin", { state: true }));

// Step 2: LinkedIn callback (after user authorizes)
router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    failureRedirect: `http://localhost:5173/auth/login?error=linkedin_auth_failed`,
    session: false,
  }),
  (req, res) => {
    // Successful authentication
    const user = req.user;

    // Create JWT token for your app
    const token = require("jsonwebtoken").sign(
      {
        id: user.linkedinId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        linkedinId: user.linkedinId,
      },
      process.env.JWT_SECRET || "dev_secret_change_me",
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    res.redirect(
      `http://localhost:5173/auth/linkedin/success?token=${token}&user=${encodeURIComponent(
        JSON.stringify(user)
      )}`
    );
  }
);

// Step 3: Logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Step 4: Get current user
router.get("/user", (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = require("jsonwebtoken").verify(
      token,
      process.env.JWT_SECRET || "dev_secret_change_me"
    );
    res.json(decoded);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
