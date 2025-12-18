// =======================
// server.js — Auth + Database (UC-001 → UC-012)
// =======================
import "./instrument.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import validator from "validator";
//import pkg from "pg";
import profileRoutes from "./routes/profile.js";
import uploadRoutes from "./routes/upload.js";
import employmentRoutes from "./routes/employment.js";
import skillsRouter from "./routes/skills.js";
import educationRoutes from "./routes/education.js";
import certifications from "./routes/certification.js";
import projectRoutes from "./routes/projects.js";
import path from "path";
import { fileURLToPath } from "url";
import jobRoutes from "./routes/job.js";
import { auth } from "./auth.js";
import companyRoutes from "./routes/company.js";
import resumeRoutes from "./routes/resumes.js";
import resumePresetsRoutes from "./routes/resumePresets.js";
import sectionPresetsRoutes from "./routes/sectionPresets.js";
import jobDescriptionsRoutes from "./routes/jobDescriptions.js";
import companyResearchRoutes from "./routes/companyResearch.js";
import matchRoutes from "./routes/match.js";
import skillsGapRoutes from "./routes/skillsGap.js";
import skillProgressRoutes from "./routes/skillProgress.js";
import interviewInsights from "./routes/interviewInsights.js";
import salaryResearchRouter from "./routes/salaryResearch.js";
import coverLetterTemplatesRouter from "./routes/coverLetterTemplates.js";
import coverLetterAIRoutes from "./routes/coverLetterAI.js";
import coverLetterExportRoutes from "./routes/coverLetterExport.js";
import pool from "./db/pool.js";
import dashboardRoutes from "./routes/dashboard.js";
import optimizationDashboardRoutes from "./routes/optimizationDashboard.js";
import teamRoutes from "./routes/team.js";
import salaryNegotiationRoutes from "./routes/salaryNegotiation.js";

import responseCoachingRoutes from "./routes/responseCoaching.js";
import mockInterviewsRoutes from "./routes/mockInterviews.js";
import interviewAnalyticsRoutes from "./routes/interviewAnalytics.js";
import technicalPrepRoutes from "./routes/technicalPrep.js"; // ✅ UC-078

import coverLetterRoutes from "./routes/cover_letter.js";
import fileUploadRoutes from "./routes/fileUpload.js";
import jobImportRoutes from "./routes/jobRoutes.js";
import contactsRoutes, { setContactsPool } from "./routes/contacts.js";
import referralsRoutes from "./routes/referrals.js";
import networkingRoutes from "./routes/networking.js";
import linkedinRoutes from "./routes/linkedin.js";
import mentorsRoutes from "./routes/mentors.js";
import informationalInterviewsRoutes from "./routes/informationalInterviews.js";
import industryContactsRoutes from "./routes/industryContacts.js";
import versionControlRoutes from "./routes/versionControl.js";
import puppeteer from "puppeteer";
import successAnalysisRoutes from "./routes/successAnalysis.js";
import goalsRoutes from "./routes/goals.js";
import interviewAnalysisRoutes from "./routes/interviewAnalysis.js";
import networkingAnalysisRoutes from "./routes/networkingAnalysis.js";
import offersRoutes from "./routes/offers.js";
import offerComparisonRoutes from "./routes/offerComparison.js";
import compensationAnalyticsRoutes from "./routes/compensationAnalytics.js";
import marketIntelRoutes from "./routes/marketIntel.js";
import timeInvestmentRoutes from "./routes/timeInvestment.js";
import competitiveAnalysisRoutes from "./routes/competitiveAnalysis.js";
import successPatternsRoutes from "./routes/successPatterns.js";
import customReportsRoutes from "./routes/customReports.js";
import performancePredictionRoutes from "./routes/performancePrediction.js";
import compensationHistoryRoutes from "./routes/compensationHistory.js";
import marketBenchmarksRoutes from "./routes/marketBenchmarks.js";
import careerGoalsRoutes from "./routes/careerGoals.js";
import calendarRoutes from "./routes/calendar.js";
import qualityScoringRoutes from "./routes/qualityScoring.js";
import githubRoutes from "./routes/github.js";
import { syncAllUsers } from "./services/githubSyncService.js";
import timingRoutes from "./routes/timing.js";
import materialComparisonRoutes from "./routes/materialComparison.js";

import referencesRoutes from "./routes/references.js";
import followupRemindersRoutes from "./routes/followupReminders.js";
import geocodingRoutes from "./routes/geocoding.js";
import apiMonitoringRoutes from "./routes/apiMonitoring.js";
import testTrackingRoutes from "./routes/testApiTracking.js";
// ====== 🔔 DAILY DEADLINE REMINDER CRON JOB (UC-012) ======
import crons from "node-cron";

// ====== 📊 PRODUCTION MONITORING AND LOGGING (UC-133) ======
import { initSentry, captureException, setUserContext } from "./utils/sentry.js";
import { requestLogger, errorLogger } from "./middleware/logging.js";
import logger, { logInfo, logError, logHttp } from "./utils/logger.js";
import monitoringRoutes from "./routes/monitoring.js";

// ====== 📈 SCALABILITY AND RESOURCE MANAGEMENT (UC-136) ======
import { metricsMiddleware } from "./utils/resourceMonitor.js";

// ===== Initialize =====
dotenv.config();

// Initialize Sentry before anything else
initSentry();

// Initialize logger
logInfo("Application starting", { 
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || 4000,
});

console.log(
  "🔑 GOOGLE_API_KEY loaded:",
  process.env.GOOGLE_API_KEY ? "✅ yes" : "❌ no"
);
//const { Pool } = pkg;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ===== Security Middleware (UC-135 & UC-145) =====
import { 
  inputSanitizer, 
  validateContentType, 
  additionalSecurityHeaders, 
  securityAuditLog,
  validateRequestSize 
} from './middleware/security.js';

// Helmet adds security headers (removes X-Powered-By, adds CSP, HSTS, etc.)
// For demo and local development we enable CSP and HSTS as well so headers
// are always visible in browser dev tools.
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://*.supabase.co"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // HTTP Strict Transport Security
  // (Browsers only enforce this over HTTPS, but the header is still sent in dev)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // X-Frame-Options - prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // IE no open
  ieNoOpen: true,
  
  // Disable DNS prefetching
  dnsPrefetchControl: { allow: false },
  
  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Allow embedding resources
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Disable X-Powered-By explicitly (also done by helmet, but being explicit)
app.disable('x-powered-by');

// Additional security headers
app.use(additionalSecurityHeaders);

// Rate limiting for authentication endpoints (UC-145: Prevent brute force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in test environment
});

// General API rate limiter (more permissive).
// In production we keep a conservative limit; in dev/local we allow
// a much higher ceiling so that load tests (50–100 concurrent users)
// don't get dominated by 429 responses.
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 300 : 5000,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

// ===== Middleware =====
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://atscareeros.com",
        "https://www.atscareeros.com",
      ];
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return cb(null, true);
      
      // Check exact match first
      if (allowed.includes(origin)) return cb(null, true);
      
      // In development, allow localhost and 127.0.0.1 on any port
      if (process.env.NODE_ENV !== 'production') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return cb(null, true);
        }
      }
      
      cb(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

// Enable gzip compression for all responses
app.use(
  compression({
    threshold: 1024,
  })
);

// Behind ngrok/Render, trust proxy so rate limiter & logging
// can safely use X-Forwarded-For (avoids ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set("trust proxy", 1);

// Special middleware for SendGrid inbound email (needs raw text)
// MUST be BEFORE express.json() so it can handle raw email body
app.use("/api/jobs/inbound-email", express.text({ type: "*/*", limit: "10mb" }));

app.use(express.json({ limit: '10mb' })); // Limit body size

// ✅ UC-135: Security middleware - input sanitization and audit logging
app.use(inputSanitizer); // Sanitize all inputs to prevent XSS
app.use(validateContentType); // Validate Content-Type headers
app.use(securityAuditLog); // Log suspicious patterns
// ✅ Production Monitoring and Logging
app.use(requestLogger);

// ✅ UC-136: Resource metrics tracking
app.use(metricsMiddleware);

// ✅ Rate limiting for API routes
app.use('/api/', apiLimiter);

// Lightweight health/root endpoint used by load testing script and uptime checks
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ATS backend is running" });
});

// ✅ Serve uploaded images with BOTH performance + cross-origin support
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "30d",
    etag: true,
    immutable: true,
  })
);


// ===== PostgreSQL Setup =====
// Pool is imported from ./db/pool.js - no need to create it here

// REMOVED: Periodic health check consumes connections unnecessarily
// Connections will be created on-demand when needed

pool
  .connect()
  .then((client) => {
    logInfo("Connected to PostgreSQL", {});
    console.log("✅ Connected to PostgreSQL");
    // Initialize contacts route with the pool
    setContactsPool(pool);

    // Release the test connection
    if (client && typeof client.release === "function") {
      client.release();
    } else {
      logError("Client object does not have release method", null, {
        clientType: typeof client,
      });
      console.error(
        "⚠️ Client object does not have release method:",
        typeof client,
        client
      );
    }
  })
  .catch((err) => {
    logError("DB connection error", err);
    console.error("❌ DB connection error:", err.message);
    captureException(err, { context: "database_connection" });
  });

// ===== Helpers =====
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const ACCOUNT_TYPES = new Set(["candidate", "mentor"]);
const DEFAULT_ACCOUNT_TYPE = "candidate";

// UC-135: Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev_secret_change_me') {
  console.error('⚠️ WARNING: Using default JWT_SECRET in production! This is a critical security risk.');
  logError('Security warning: Using default JWT_SECRET in production', null, {});
}

/**
 * UC-135: Generate secure JWT token
 * - Uses HS256 algorithm (default, secure for symmetric keys)
 * - Includes essential claims (sub, iat, exp)
 * - Token expires in 2 hours for security
 */
function makeToken(user) {
  return jwt.sign(
    { 
      sub: user.id,  // Subject - standard claim
      id: user.id,   // Keep for backward compatibility
      email: user.email,
      iat: Math.floor(Date.now() / 1000), // Issued at
    }, 
    JWT_SECRET, 
    {
      expiresIn: "2h",
      algorithm: 'HS256',
      issuer: 'ats-career-os',
      audience: 'ats-users'
    }
  );
}

// ===== In-memory password reset store (email -> { code, expires }) =====
const resetCodes = new Map(); // for demo; moves to DB later

// ========== UC-001: Register ==========
app.post("/register", authLimiter, async (req, res) => {
  const {
    email = "",
    password = "",
    confirmPassword = "",
    firstName = "",
    lastName = "",
    accountType = DEFAULT_ACCOUNT_TYPE,
  } = req.body;
  try {
    // UC-145: Strengthen email validation using validator library
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({
        error: "Password must be 8+ chars incl. uppercase, lowercase, number",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (!firstName.trim() || !lastName.trim()) {
      return res
        .status(400)
        .json({ error: "First and last name are required" });
    }
    const normalizedAccountType = (accountType || DEFAULT_ACCOUNT_TYPE)
      .toString()
      .trim()
      .toLowerCase();
    if (!ACCOUNT_TYPES.has(normalizedAccountType)) {
      return res.status(400).json({ error: "Invalid account type" });
    }

    const lower = email.toLowerCase();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        "SELECT id FROM users WHERE email=$1",
        [lower]
      );
      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(409).json({ error: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, provider, account_type) VALUES ($1,$2,$3,$4,'local',$5) RETURNING id, first_name, last_name",
        [
          lower,
          passwordHash,
          firstName.trim(),
          lastName.trim(),
          normalizedAccountType,
        ]
      );
      const userId = userResult.rows[0].id;

      // No auto-team creation - users can create teams manually after registration
      // Both mentors and candidates can create teams, with candidates limited to 1 team max

      await client.query("COMMIT");
      const token = makeToken({ id: userId, email: lower });
      client.release();
      return res.status(201).json({ message: "Registered", token });
    } catch (dbErr) {
      try {
        if (client && typeof client.query === "function") {
          await client.query("ROLLBACK");
        }
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr.message);
      }
      if (client && typeof client.release === "function") {
        client.release();
      } else if (client) {
        console.error(
          "⚠️ Client object does not have release method:",
          typeof client,
          client
        );
      }
      throw dbErr;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-002: Login ==========
app.post("/login", authLimiter, async (req, res) => {
  const { email = "", password = "" } = req.body;
  try {
    const lower = email.toLowerCase();
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      lower,
    ]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = makeToken({ id: user.id, email: user.email });
    return res.json({ message: "Logged in", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== LINKEDIN LOGIN ==========
app.post("/linkedin-login", async (req, res) => {
  const { linkedin_id, email, first_name, last_name, profile_pic_url } =
    req.body;

  try {
    if (!linkedin_id) {
      return res.status(400).json({ error: "Missing LinkedIn ID" });
    }

    const lower = email?.toLowerCase();

    // Check if user exists by LinkedIn ID
    let result = await pool.query("SELECT * FROM users WHERE linkedin_id=$1", [
      linkedin_id,
    ]);

    let user;
    if (result.rows.length > 0) {
      // User exists, log them in
      user = result.rows[0];
    } else if (lower) {
      // Check if user exists by email
      result = await pool.query("SELECT * FROM users WHERE email=$1", [lower]);
      if (result.rows.length > 0) {
        // User exists by email, update LinkedIn ID
        user = result.rows[0];
        await pool.query("UPDATE users SET linkedin_id=$1 WHERE id=$2", [
          linkedin_id,
          user.id,
        ]);
      } else {
        // Create new user with LinkedIn data
        const hashedPassword = await bcrypt.hash(
          Math.random().toString(36),
          10
        ); // Random password for OAuth users
        const insertResult = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, linkedin_id, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW()) 
           RETURNING id, email, first_name, last_name`,
          [lower, hashedPassword, first_name, last_name, linkedin_id]
        );
        user = insertResult.rows[0];

        // Create profile for new user
        await pool.query(
          `INSERT INTO profiles (user_id, full_name, picture_url, linkedin_picture_url, created_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [user.id, `${first_name} ${last_name}`, profile_pic_url, profile_pic_url]
        );
      }
    } else {
      return res.status(400).json({ error: "Email is required" });
    }

    const token = makeToken({ id: user.id, email: user.email });
    return res.json({ message: "LinkedIn login successful", token, user });
  } catch (err) {
    console.error("LinkedIn login error:", err);
    return res.status(500).json({ error: "LinkedIn login failed" });
  }
});

// ========== UC-005: Logout ==========
app.post("/logout", (_req, res) => {
  return res.json({ message: "Logged out" });
});

// ========== UC-006: Password Reset Request ==========
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

// ========== UC-006: Password Reset Request ==========
app.post("/forgot", authLimiter, async (req, res) => {
  try {
    const { email = "" } = req.body;
    const lower = email.toLowerCase();
    const result = await pool.query("SELECT id FROM users WHERE email=$1", [
      lower,
    ]);

    // Always send success message to avoid revealing user existence
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    resetCodes.set(lower, { code, expires });

    if (result.rows.length > 0) {
      // 📤 Send real email through Resend
      await resend.emails.send({
        from: `ATS for Candidates <${process.env.EMAIL_FROM}>`,
        to: lower,
        subject: "Your Password Reset Code",
        html: `
          <div style="font-family:Arial,sans-serif;font-size:16px;">
            <h2 style="color:#2563eb;">Password Reset Code</h2>
            <p>Use this code to reset your password. It will expire in 10 minutes.</p>
            <div style="font-size:32px;font-weight:bold;color:#2563eb;">${code}</div>
          </div>
        `,
      });

      console.log(`📤 Sent reset code ${code} to ${lower}`);
    }

    return res.json({
      message: "If that email exists, a reset code was sent.",
    });
  } catch (err) {
    console.error("❌ Reset email error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-007: Password Reset Completion ==========
app.post("/reset", async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword)
      return res.status(400).json({ error: "Missing fields" });
    if (newPassword !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });
    if (!PASSWORD_RULE.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be 8+ chars incl. uppercase, lowercase, number",
      });
    }

    const lower = email.toLowerCase();
    const entry = resetCodes.get(lower);
    if (!entry || entry.code !== code || entry.expires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE email=$2", [
      passwordHash,
      lower,
    ]);
    resetCodes.delete(lower);

    return res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-008: Profile Access Control ==========
app.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, first_name AS firstName, last_name AS lastName FROM users WHERE id=$1",
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/me", auth, async (req, res) => {
  const { firstName = "", lastName = "" } = req.body;
  try {
    await pool.query(
      "UPDATE users SET first_name=$1, last_name=$2 WHERE id=$3",
      [firstName, lastName, req.user.id]
    );
    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/test-token", (req, res) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;

  console.log("Raw header:", h);
  console.log("Extracted token:", token);
  console.log("JWT_SECRET:", process.env.JWT_SECRET);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, decoded });
  } catch (err) {
    res.status(401).json({
      error: err.name,
      message: err.message,
      token: token?.substring(0, 20) + "...",
    });
  }
});
// ========== UC-009: Account Deletion ==========
app.post("/delete", auth, async (req, res) => {
  try {
    const { password = "" } = req.body;
    const userRes = await pool.query("SELECT * FROM users WHERE id=$1", [
      req.user.id,
    ]);
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const user = userRes.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    await pool.query("DELETE FROM users WHERE id=$1", [req.user.id]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-003 & UC-004: Google OAuth ==========
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Export client for testing
export { client as googleOAuthClient };

app.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ error: "Missing Google ID token" });

    // ✅ Verify the ID token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase();
    const firstName = payload.given_name || "Google";
    const lastName = payload.family_name || "User";

    // ✅ Check or create user in DB
    let result = await pool.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);
    if (result.rows.length === 0) {
      // Create a random password hash for OAuth users (they won't use password login)
      const randomPassword = Math.random().toString(36) + Date.now().toString(36);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      result = await pool.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, provider, account_type) VALUES ($1,$2,$3,$4,'google','candidate') RETURNING id",
        [email, passwordHash, firstName, lastName]
      );
    }

    const token = makeToken({ id: result.rows[0].id, email });
    res.json({ message: "Google login successful", token });
  } catch (err) {
    console.error("❌ Google login error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// ===== Routes =====
app.use("/api/calendar", calendarRoutes);
app.use("/api", profileRoutes);
app.use("/api", uploadRoutes);
// Employment routes - auth middleware is already applied inside the routes
app.use("/api/upload", fileUploadRoutes);
app.use("/api", employmentRoutes);
app.use("/skills", skillsRouter);
app.use("/api", educationRoutes);
app.use("/api", certifications);
app.use("/api", projectRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/optimization-dashboard", optimizationDashboardRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api", resumePresetsRoutes);
app.use("/api", sectionPresetsRoutes);
app.use("/api", jobDescriptionsRoutes);
app.use("/api/companyResearch", companyResearchRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/skills-gap", skillsGapRoutes);
app.use("/api/skill-progress", skillProgressRoutes);
app.use("/api/salary-research", salaryResearchRouter);
app.use("/api/interview-insights", interviewInsights);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/cover-letters", coverLetterRoutes); // User cover letters + templates
app.use("/api/cover-letter", coverLetterTemplatesRouter);
app.use("/api/cover-letter", coverLetterAIRoutes);
app.use("/api/cover-letter/export", coverLetterExportRoutes);
app.use("/api/versions", versionControlRoutes);
app.use("/api/success-analysis", successAnalysisRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/interview-analysis", interviewAnalysisRoutes);
app.use("/api/networking-analysis", networkingAnalysisRoutes);
app.use("/api/networking", networkingRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/offer-comparison", offerComparisonRoutes);
app.use("/api/compensation-analytics", compensationAnalyticsRoutes);
app.use("/api/market-intel", marketIntelRoutes);
app.use("/api/time-investment", timeInvestmentRoutes);
app.use("/api/competitive-analysis", competitiveAnalysisRoutes);
app.use("/api/success-patterns", successPatternsRoutes);
app.use("/api/custom-reports", customReportsRoutes);
app.use("/api/performance-prediction", performancePredictionRoutes);

app.use("/api/compensation-history", compensationHistoryRoutes);
app.use("/api/market-benchmarks", marketBenchmarksRoutes);
app.use("/api/career-goals", careerGoalsRoutes);
app.use("/api/quality-scoring", qualityScoringRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/timing", timingRoutes);
app.use("/api/material-comparison", materialComparisonRoutes);

app.use("/api/team", teamRoutes);
app.use("/api", jobImportRoutes);
app.use("/api/admin", apiMonitoringRoutes); // UC-117: API Monitoring Dashboard
app.use("/api/test", testTrackingRoutes); // Test endpoint for API tracking

// ===== Global Error Handler =====
// Error logger middleware (logs errors before handling)
app.use(errorLogger);

// Error handler with Sentry integration
app.use((err, req, res, next) => {
  // Capture error in Sentry
  captureException(err, {
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      userId: req.user?.id || null,
    },
  });

  // Log error
  logError("Unhandled error in request", err, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id || null,
  });

  console.error(err.stack);
  
  // Don't expose error details in production
  const errorMessage = process.env.NODE_ENV === "production" 
    ? "Something went wrong" 
    : err.message;
  
  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ===== Health Check =====
app.get("/", (_req, res) => {
  logHttp("Health check", { path: "/" });
  res.json({ ok: true });
});

// ====== 🔄 GITHUB REPOSITORY SYNC CRON JOB ======
// Run GitHub sync every hour
crons.schedule("0 * * * *", async () => {
  logInfo("Running GitHub repository sync", {});
  console.log("🔄 Running GitHub repository sync...");
  try {
    const result = await syncAllUsers();
    if (result.success) {
      logInfo("GitHub sync completed", {
        usersSynced: result.users_synced,
        usersSkipped: result.users_skipped,
      });
      console.log(
        `✅ GitHub sync completed: ${result.users_synced} users synced, ${result.users_skipped} skipped`
      );
    } else {
      logError("GitHub sync failed", null, { error: result.error });
      console.error(`❌ GitHub sync failed: ${result.error}`);
      captureException(new Error(result.error), { context: "github_sync_cron" });
    }
  } catch (err) {
    logError("GitHub sync cron job error", err);
    console.error("❌ GitHub sync cron job error:", err.message);
    captureException(err, { context: "github_sync_cron" });
  }
});

// ====== 🔔 DAILY DEADLINE REMINDER CRON JOB ======

// run every day at 9:00 AM server time
crons.schedule("0 9 * * *", async () => {
  logInfo("Running daily job deadline reminder", {});
  console.log("📬 Running daily job deadline reminder...");

  try {
    // Fetch all jobs due in the next 3 days for all users
    const result = await pool.query(`
      SELECT j.id, j.title, j.deadline, j.user_id, u.email, u.first_name
      FROM jobs j
      JOIN users u ON u.id = j.user_id
      WHERE j.deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      ORDER BY j.deadline ASC
    `);

    if (result.rows.length === 0) {
      logInfo("No upcoming deadlines", {});
      console.log("✅ No upcoming deadlines.");
      return;
    }

    // Send reminder emails
    let emailsSent = 0;
    for (const job of result.rows) {
      try {
        const daysLeft = Math.ceil(
          (new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24)
        );
        const subject = `⏰ Reminder: ${job.title} deadline in ${daysLeft} day${
          daysLeft !== 1 ? "s" : ""
        }`;
        const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5;">
          <h2 style="color:#4f46e5;">Upcoming Application Deadline</h2>
          <p>Hi ${job.first_name || "there"},</p>
          <p>This is a friendly reminder that your job application for 
          <strong>${
            job.title
          }</strong> is due in <strong>${daysLeft}</strong> day${
        daysLeft !== 1 ? "s" : ""
      }.</p>
          <p><strong>Deadline:</strong> ${new Date(
            job.deadline
          ).toLocaleDateString()}</p>
          <p>Please review your application status in your <a href="http://localhost:5173/profile/jobs">ATS Dashboard</a>.</p>
          <p style="color:#888;">— ATS for Candidates</p>
        </div>
      `;

        await transporter.sendMail({
          from: "ATS for Candidates <njit_job_alerts@aditnuwal.com>",
          to: job.email,
          subject,
          html,
        });

        emailsSent++;
        logInfo("Reminder email sent", {
          jobId: job.id,
          email: job.email,
          title: job.title,
        });
        console.log(`📧 Reminder sent to ${job.email} for "${job.title}"`);
      } catch (emailErr) {
        logError("Failed to send reminder email", emailErr, {
          jobId: job.id,
          email: job.email,
        });
        captureException(emailErr, { context: "deadline_reminder_email" });
      }
    }
    
    logInfo("Deadline reminder job completed", {
      totalJobs: result.rows.length,
      emailsSent,
    });
  } catch (err) {
    logError("Reminder job failed", err);
    console.error("❌ Reminder job failed:", err.message);
    captureException(err, { context: "deadline_reminder_cron" });
  }
});

// ====== 📅 SCHEDULED SUBMISSION REMINDER CRON JOB ======
// Run every 5 minutes to check for upcoming scheduled submissions
crons.schedule("*/5 * * * *", async () => {
  console.log("⏰ Checking for scheduled submission reminders...");
  try {
    const port = process.env.PORT || 4000;
    // Make internal API call to process reminders
    const response = await fetch(`http://localhost:${port}/api/timing/process-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.processed > 0) {
        console.log(`📧 Processed ${result.processed} scheduled submission reminder(s)`);
      }
    }
  } catch (err) {
    console.error("❌ Scheduled submission reminder check failed:", err.message);
  }
});

async function sendDeadlineReminders() {
  console.log("📬 Running job deadline reminder (manual/cron)...");

  const REMINDER_DAYS =
    parseInt(process.env.REMINDER_DAYS_BEFORE || "3", 10) || 3;

  try {
    const result = await pool.query(
      `
      SELECT
        j.id,
        j.title,
        j.deadline,
        j.user_id,
        u.email,
        u.first_name
      FROM jobs j
      JOIN users u ON u.id = j.user_id
      WHERE
        j.deadline IS NOT NULL
        AND j.deadline BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
      ORDER BY j.deadline ASC
      `,
      [REMINDER_DAYS]
    );

    if (result.rows.length === 0) {
      console.log("✅ No upcoming deadlines.");
      return;
    }

    for (const job of result.rows) {
      const now = new Date();
      const deadline = new Date(job.deadline);
      const daysLeft = Math.max(
        1,
        Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
      );

      const subject = `⏰ ${job.title} deadline in ${daysLeft} day${
        daysLeft !== 1 ? "s" : ""
      }`;

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">Upcoming Application Deadline</h2>
          <p>Hi ${job.first_name || "there"},</p>
          <p>This is a friendly reminder that your application for <strong>${
            job.title
          }</strong> has an upcoming deadline.</p>
          <p><strong>Deadline:</strong> ${deadline.toLocaleDateString()}</p>
          <p>
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/profile/jobs"
               style="display:inline-block;padding:10px 18px;margin-top:10px;
                      background:#4f46e5;color:#ffffff;text-decoration:none;
                      border-radius:6px;font-weight:500;">
              Review this job in your ATS dashboard
            </a>
          </p>
          <p style="color:#888;font-size:13px;margin-top:13px;">
            You are receiving this reminder because you tracked this job in ATS for Candidates.
          </p>
        </div>
      `;

      const startTime = Date.now();
      const { data, error } = await resend.emails.send({
        from: `ATS for Candidates <${process.env.EMAIL_FROM}>`,
        to: job.email,
        subject,
        html,
      });
      const responseTimeMs = Date.now() - startTime;

      // Track API usage (userId is job.user_id from the query)
      try {
        const { logApiUsage, logApiError } = await import("./utils/apiTrackingService.js");
        if (error) {
          await logApiError({
            serviceName: 'resend',
            endpoint: '/emails/send',
            userId: job.user_id || null,
            errorType: 'api_error',
            errorMessage: error.message || 'Email send failed',
            statusCode: error.statusCode || 500,
            requestPayload: { from: process.env.EMAIL_FROM, to: job.email, purpose: 'deadline_reminder' }
          });
          await logApiUsage({
            serviceName: 'resend',
            endpoint: '/emails/send',
            method: 'POST',
            userId: job.user_id || null,
            requestPayload: { to: job.email, purpose: 'deadline_reminder' },
            responseStatus: error.statusCode || 500,
            responseTimeMs,
            success: false
          });
        } else {
          await logApiUsage({
            serviceName: 'resend',
            endpoint: '/emails/send',
            method: 'POST',
            userId: job.user_id || null,
            requestPayload: { to: job.email, purpose: 'deadline_reminder' },
            responseStatus: 200,
            responseTimeMs,
            success: true
          });
        }
      } catch (trackErr) {
        console.warn("Failed to track Resend API call:", trackErr);
      }

      if (error) {
        console.error(
          `❌ Failed to send reminder to ${job.email} for job ${job.id}:`,
          error
        );
      } else {
        console.log(
          `📧 Reminder sent to ${job.email} for "${job.title}" (job_id=${job.id})`,
          data
        );
      }
    }
  } catch (err) {
    console.error("❌ Reminder job failed:", err.message);
  }
}
app.use("/api", jobImportRoutes);
//app.use("/api/jobs", jobRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api", resumePresetsRoutes);
app.use("/api", sectionPresetsRoutes);
app.use("/api", jobDescriptionsRoutes);
app.use("/api/company-research", companyResearchRoutes);
app.use("/api/match", matchRoutes);
app.use("/api", contactsRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/networking", networkingRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/mentors", mentorsRoutes);
app.use("/api/informational-interviews", informationalInterviewsRoutes);
app.use("/api/industry-contacts", industryContactsRoutes);
app.use("/api/references", referencesRoutes);
app.use("/api/followup-reminders", followupRemindersRoutes);
app.use("/api/skill-progress", skillProgressRoutes);
app.use("/api/interview-insights", interviewInsights);
app.use("/api/response-coaching", responseCoachingRoutes);
app.use("/api/mock-interviews", mockInterviewsRoutes);
app.use("/api/salary-negotiation", salaryNegotiationRoutes);
app.use("/api/interview-analytics", interviewAnalyticsRoutes);
app.use("/api/technical-prep", technicalPrepRoutes); // ✅ UC-078
app.use("/api/geocoding", geocodingRoutes); // ✅ UC-116: Location and Geo-coding Services

// ✅ Production Monitoring Routes (UC-133)
app.use("/api/monitoring", monitoringRoutes);

// ✅ Scalability and Resource Management Routes (UC-136)

app.use("/api/jobs", jobRoutes);
const REMINDER_DAYS =
  parseInt(process.env.REMINDER_DAYS_BEFORE || "3", 10) || 3;

app.post("/test-reminders", async (req, res) => {
  try {
    await sendDeadlineReminders();
    res.json({ message: "Reminder job executed (check server logs & email)." });
  } catch (err) {
    console.error("❌ /test-reminders failed:", err.message);
    res.status(500).json({ error: "Failed to run reminder job" });
  }
});

// ===== Global Error Handlers =====
// Handle unhandled promise rejections (like database connection terminations)
process.on("unhandledRejection", (reason, promise) => {
  // Database connection termination errors are common with Supabase
  if (reason && typeof reason === "object") {
    const reasonStr = String(reason);
    const reasonMessage = reason.message || reasonStr;

    if (
      reason.code === "XX000" ||
      reasonMessage.includes("shutdown") ||
      reasonMessage.includes("termination") ||
      reasonMessage.includes("db_termination") ||
      reasonStr.includes("shutdown") ||
      reasonStr.includes("db_termination") ||
      (reason.code && String(reason.code).includes("XX000"))
    ) {
      // These are expected with Supabase connection limits - log quietly
      logger.warn("Database connection terminated (expected). Pool will reconnect on next query.");
      console.warn(
        "⚠️ Database connection terminated (expected). Pool will reconnect on next query."
      );
      // Don't crash - the pool will handle reconnection
      return;
    }
  }
  // For other unhandled rejections, log them but don't crash
  logError("Unhandled Rejection", reason instanceof Error ? reason : new Error(String(reason)), {
    promise: String(promise),
  });
  captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    context: "unhandled_rejection",
  });
  console.error("⚠️ Unhandled Rejection at:", promise);
  console.error("   Reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  // Database connection errors should not crash the server
  const errorStr = String(error);
  const errorMessage = error.message || errorStr;

  if (
    error.code === "XX000" ||
    errorMessage.includes("shutdown") ||
    errorMessage.includes("termination") ||
    errorMessage.includes("db_termination") ||
    errorStr.includes("shutdown") ||
    errorStr.includes("db_termination") ||
    (error.code && String(error.code).includes("XX000"))
  ) {
    // These are expected with Supabase connection limits - log quietly
    logger.warn("Database connection error (expected). Server will continue running.");
    console.warn(
      "⚠️ Database connection error (expected). Server will continue running."
    );
    // Don't exit - let the server continue
    return;
  }
  // For other uncaught exceptions, log and exit gracefully
  logError("Uncaught Exception", error);
  captureException(error, { context: "uncaught_exception" });
  console.error("❌ Uncaught Exception:", error);
  console.error("   Stack:", error.stack);
  // Give time for logs to be written, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ===== Start Server =====
// FIX: Only start the server if we are NOT testing
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logInfo("API server started", { port: PORT, nodeEnv: process.env.NODE_ENV });
    console.log(`✅ API running at http://localhost:${PORT}`);
  });
}

// Export for tests
export { app, pool, resetCodes };
