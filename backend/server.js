// =======================
// server.js — Auth + Database (UC-001 → UC-012)
// =======================

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
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


import coverLetterRoutes from "./routes/cover_letter.js";
import jobImportRoutes from "./routes/jobRoutes.js";
import contactsRoutes, { setContactsPool } from "./routes/contacts.js";
import referralsRoutes from "./routes/referrals.js";
import networkingRoutes from "./routes/networking.js";
import linkedinRoutes from "./routes/linkedin.js";
import mentorsRoutes from "./routes/mentors.js";
import informationalInterviewsRoutes from "./routes/informationalInterviews.js";
import industryContactsRoutes from "./routes/industryContacts.js";
// ====== 🔔 DAILY DEADLINE REMINDER CRON JOB (UC-012) ======
import crons from "node-cron";

// ===== Initialize =====
dotenv.config();
console.log(
  "🔑 GOOGLE_API_KEY loaded:",
  process.env.GOOGLE_API_KEY ? "✅ yes" : "❌ no"
);
const { Pool } = pkg;
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

// ===== Middleware =====
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true }));
app.use(express.json());

// ✅ Serve uploaded images so React can access them
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== PostgreSQL Setup =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => {
    console.log("✅ Connected to PostgreSQL");
    // Initialize contacts route with the pool
    setContactsPool(pool);
  })
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ===== Helpers =====
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "2h",
  });
}

// ===== In-memory password reset store (email -> { code, expires }) =====
const resetCodes = new Map(); // for demo; moves to DB later

// ========== UC-001: Register ==========
app.post("/register", async (req, res) => {
  const {
    email = "",
    password = "",
    confirmPassword = "",
    firstName = "",
    lastName = "",
  } = req.body;
  try {
    if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
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

    const lower = email.toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      lower,
    ]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, provider) VALUES ($1,$2,$3,$4,'local') RETURNING id",
      [lower, passwordHash, firstName.trim(), lastName.trim()]
    );
    const token = makeToken({ id: result.rows[0].id, email: lower });
    return res.status(201).json({ message: "Registered", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-002: Login ==========
app.post("/login", async (req, res) => {
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
    let result = await pool.query(
      "SELECT * FROM users WHERE linkedin_id=$1",
      [linkedin_id]
    );

    let user;
    if (result.rows.length > 0) {
      // User exists, log them in
      user = result.rows[0];
    } else if (lower) {
      // Check if user exists by email
      result = await pool.query("SELECT * FROM users WHERE email=$1", [
        lower,
      ]);
      if (result.rows.length > 0) {
        // User exists by email, update LinkedIn ID
        user = result.rows[0];
        await pool.query(
          "UPDATE users SET linkedin_id=$1 WHERE id=$2",
          [linkedin_id, user.id]
        );
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
          `INSERT INTO profiles (user_id, first_name, last_name, profile_picture, linkedin_picture_url, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [user.id, first_name, last_name, profile_pic_url, profile_pic_url]
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
app.post("/forgot", async (req, res) => {
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
      [req.userId]
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
      [firstName, lastName, req.userId]
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
      req.userId,
    ]);
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const user = userRes.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    await pool.query("DELETE FROM users WHERE id=$1", [req.userId]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== UC-003 & UC-004: OAuth (demo stubs) ==========
// ========== UC-003 & UC-004: Google OAuth ==========
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      result = await pool.query(
        "INSERT INTO users (email, first_name, last_name, provider) VALUES ($1,$2,$3,'google') RETURNING id",
        [email, firstName, lastName]
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
app.use("/api", profileRoutes);
app.use("/api", uploadRoutes);
app.use("/api", auth, employmentRoutes);
app.use("/skills", skillsRouter);
app.use("/api", educationRoutes);
app.use("/api", certifications);
app.use("/api", projectRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/skills-gap", skillsGapRoutes);
app.use("/api/skill-progress", skillProgressRoutes);
app.use("/api/salary-research", salaryResearchRouter);
app.use("/api/companyResearch", companyResearchRoutes);
app.use("/api/cover-letter", coverLetterTemplatesRouter);
app.use("/api/cover-letter", coverLetterAIRoutes);
app.use("/api/cover-letter/export", coverLetterExportRoutes);


// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// ===== Health Check =====
app.get("/", (_req, res) => res.json({ ok: true }));

// ====== 🔔 DAILY DEADLINE REMINDER CRON JOB ======
import cron from "node-cron";

// run every day at 9:00 AM server time
cron.schedule("0 9 * * *", async () => {
  console.log("📬 Running daily job deadline reminder...");

  try {
    // Fetch all jobs due in the next 3 days for all users
    const result = await pool.query(`
      SELECT j.id, j.title, j.deadline, u.email, u.first_name
      FROM jobs j
      JOIN users u ON u.id = j.user_id
      WHERE j.deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      ORDER BY j.deadline ASC
    `);

    if (result.rows.length === 0) {
      console.log("✅ No upcoming deadlines.");
      return;
    }

    // Send reminder emails
    for (const job of result.rows) {
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

      console.log(`📧 Reminder sent to ${job.email} for "${job.title}"`);
    }
  } catch (err) {
    console.error("❌ Reminder job failed:", err.message);
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

      const { data, error } = await resend.emails.send({
        from: `ATS for Candidates <${process.env.EMAIL_FROM}>`,
        to: job.email,
        subject,
        html,
      });

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
app.use("/api/jobs", jobRoutes);
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
app.use("/api/skill-progress", skillProgressRoutes);
app.use("/api/interview-insights", interviewInsights);

const REMINDER_DAYS =
  parseInt(process.env.REMINDER_DAYS_BEFORE || "3", 10) || 3;

crons.schedule("0 9 * * *", async () => {
  console.log("📬 Running daily job deadline reminder...");
  // 🧠 your code logic here (the pool.query, resend email sending, etc.)
});
app.post("/test-reminders", async (req, res) => {
  try {
    await sendDeadlineReminders();
    res.json({ message: "Reminder job executed (check server logs & email)." });
  } catch (err) {
    console.error("❌ /test-reminders failed:", err.message);
    res.status(500).json({ error: "Failed to run reminder job" });
  }
});
// ===== Start Server =====
app.listen(4000, () => console.log("✅ API running at http://localhost:4000"));
