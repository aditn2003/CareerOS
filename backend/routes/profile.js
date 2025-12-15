import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import axios from "axios";
import pool from "../db/pool.js";

dotenv.config();

const router = express.Router();

// ✅ Use the shared database pool (same as server.js)
// This ensures transaction-based test isolation works correctly

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- HELPER: Geocode location ----------
async function geocodeLocation(locationString) {
  if (!locationString || !locationString.trim()) return null;

  try {
    // Check cache first
    const cacheResult = await pool.query(
      `SELECT latitude, longitude FROM geocoding_cache 
       WHERE LOWER(TRIM(location_string)) = LOWER(TRIM($1))`,
      [locationString]
    );

    if (cacheResult.rows.length > 0) {
      return {
        latitude: cacheResult.rows[0].latitude,
        longitude: cacheResult.rows[0].longitude,
      };
    }

    // Call Nominatim API with rate limiting (skip delay in test mode)
    if (process.env.NODE_ENV !== 'test') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simple rate limit
    }

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: locationString.trim(),
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "ATS-Job-Tracker/1.0",
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      // Cache the result
      await pool.query(
        `INSERT INTO geocoding_cache (location_string, latitude, longitude, display_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (location_string) DO UPDATE SET
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           updated_at = NOW()`,
        [locationString.trim(), lat, lon, result.display_name]
      );

      return { latitude: lat, longitude: lon };
    }

    return null;
  } catch (error) {
    console.error("❌ Geocoding error:", error.message);
    return null;
  }
}

// ---------- SAVE OR UPDATE PROFILE ----------
router.post("/profile", auth, async (req, res) => {
  const {
    full_name,
    email,
    phone,
    location,
    title,
    bio,
    industry,
    experience,
  } = req.body;
  try {
    // Geocode location if provided
    let homeLat = null;
    let homeLon = null;
    if (location && location.trim()) {
      const geocodeResult = await geocodeLocation(location);
      if (geocodeResult) {
        homeLat = geocodeResult.latitude;
        homeLon = geocodeResult.longitude;
      }
    }

    const existing = await pool.query(
      "SELECT id FROM profiles WHERE user_id=$1",
      [req.userId]
    );
    if (existing.rows.length > 0) {
      // For updates, only set fields that are provided (not undefined)
      // Use COALESCE to preserve existing values when new values are null/undefined
      await pool.query(
        `UPDATE profiles SET 
         full_name=COALESCE($1, full_name),
         email=COALESCE($2, email),
         phone=COALESCE($3, phone),
         location=COALESCE($4, location),
         title=COALESCE($5, title),
         bio=COALESCE($6, bio),
         industry=COALESCE($7, industry),
         experience=COALESCE($8, experience),
         home_latitude=COALESCE($9, home_latitude),
         home_longitude=COALESCE($10, home_longitude),
         home_location_geocoded_at=$11
         WHERE user_id=$12`,
        [
          full_name || null,
          email || null,
          phone || null,
          location || null,
          title || null,
          bio || null,
          industry || null,
          experience || null,
          homeLat,
          homeLon,
          homeLat && homeLon ? new Date() : null,
          req.userId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, email, phone, location, title, bio, industry, experience,
         home_latitude, home_longitude, home_location_geocoded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          req.userId,
          full_name,
          email,
          phone,
          location,
          title,
          bio,
          industry,
          experience,
          homeLat,
          homeLon,
          homeLat && homeLon ? new Date() : null,
        ]
      );
    }
    res.json({ message: "Profile saved successfully" });
  } catch (err) {
    console.error("❌ Profile save error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- FETCH PROFILE ----------
router.get("/profile", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT full_name, email, phone, location, title, bio, industry, experience, picture_url,
       home_latitude, home_longitude, home_location_geocoded_at
       FROM profiles WHERE user_id=$1`,
      [req.userId]
    );

    const profile = result.rows[0] || {};
    res.json({ profile });
  } catch (err) {
    console.error("❌ Profile fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- UPDATE PROFILE PICTURE ----------
router.post("/profile/picture", auth, async (req, res) => {
  const { url } = req.body;
  try {
    // Store the full backend URL
    const fullUrl = `http://localhost:4000${url}`;

    // Check if the profile already exists
    const check = await pool.query("SELECT id FROM profiles WHERE user_id=$1", [
      req.userId,
    ]);
    if (check.rows.length === 0) {
      await pool.query(
        "INSERT INTO profiles (user_id, picture_url) VALUES ($1, $2)",
        [req.userId, fullUrl]
      );
    } else {
      await pool.query("UPDATE profiles SET picture_url=$1 WHERE user_id=$2", [
        fullUrl,
        req.userId,
      ]);
    }

    res.json({
      message: "✅ Profile picture saved successfully",
      picture_url: fullUrl,
    });
  } catch (err) {
    console.error("❌ Error updating profile picture:", err);
    res.status(500).json({ error: "Database error while saving picture" });
  }
});
// ---------- PROFILE SUMMARY (for Dashboard) ----------
router.get("/profile/summary", auth, async (req, res) => {
  try {
    // Support both req.userId (local auth) and req.user.id (global auth)
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      console.error("❌ No userId found in request:", { userId: req.userId, user: req.user });
      return res.status(401).json({ error: "User ID not found" });
    }

    console.log("📊 Fetching profile summary for userId:", userId);
    
    // TODO: adjust table names/columns if yours differ
    const q = (text, params) => pool.query(text, params);

    // Debug queries only in non-test mode (they slow down tests significantly)
    if (process.env.NODE_ENV !== 'test') {
      console.log("🔍 userId type:", typeof userId, "value:", userId);
      const userCheck = await pool.query("SELECT id FROM users WHERE id=$1", [userId]);
      console.log("🔍 User exists:", userCheck.rows.length > 0);
      
      // Check if data exists with this userId (try both string and number)
      const testEmployment = await pool.query("SELECT user_id, COUNT(*)::int AS c FROM employment GROUP BY user_id LIMIT 5");
      const testSkills = await pool.query("SELECT user_id, COUNT(*)::int AS c FROM skills GROUP BY user_id LIMIT 5");
      console.log("🔍 Sample user_ids in employment:", testEmployment.rows);
      console.log("🔍 Sample user_ids in skills:", testSkills.rows);
      
      // Try querying with explicit type casting
      const testQuery = await pool.query("SELECT COUNT(*)::int AS c FROM employment WHERE user_id::text = $1::text", [String(userId)]);
      console.log("🔍 Test query with string cast:", testQuery.rows[0]?.c);
    }

    const [employment, skills, education, certifications, projects, info, skillsDist] =
      await Promise.all([
        q("SELECT COUNT(*)::int AS c FROM employment WHERE user_id=$1", [
          userId,
        ]),
        q("SELECT COUNT(*)::int AS c FROM skills WHERE user_id=$1", [
          userId,
        ]),
        q("SELECT COUNT(*)::int AS c FROM education WHERE user_id=$1", [
          userId,
        ]),
        q("SELECT COUNT(*)::int AS c FROM certifications WHERE user_id=$1", [
          userId,
        ]),
        q("SELECT COUNT(*)::int AS c FROM projects WHERE user_id=$1", [
          userId,
        ]),
        q(
          `SELECT 
           (full_name IS NOT NULL AND full_name <> '') AS has_name,
           (email IS NOT NULL AND email <> '')         AS has_email,
           (phone IS NOT NULL AND phone <> '')         AS has_phone,
           (location IS NOT NULL AND location <> '')   AS has_location,
           (title IS NOT NULL AND title <> '')         AS has_title,
           (bio IS NOT NULL AND bio <> '')             AS has_bio,
           (picture_url IS NOT NULL AND picture_url <> '') AS has_picture
         FROM profiles WHERE user_id=$1`,
          [userId]
        ),
        q(
          `SELECT category, COUNT(*)::int AS count 
           FROM skills 
           WHERE user_id=$1 
           GROUP BY category 
           ORDER BY count DESC`,
          [userId]
        ),
      ]);

    const counts = {
      employment_count: employment.rows[0]?.c || 0,
      skills_count: skills.rows[0]?.c || 0,
      education_count: education.rows[0]?.c || 0,
      certifications_count: certifications.rows[0]?.c || 0,
      projects_count: projects.rows[0]?.c || 0,
    };

    if (process.env.NODE_ENV !== 'test') {
      console.log("📊 Profile summary counts:", counts);
    }

    const infoRow = info.rows[0] || {};
    const info_complete =
      !!infoRow.has_name &&
      !!infoRow.has_email &&
      !!infoRow.has_phone &&
      !!infoRow.has_location;

    // --- Simple completeness model (tweak weights as you like)
    const weights = {
      info: 25,
      employment: 25,
      skills: 20,
      education: 15,
      certifications: 10,
      projects: 5,
    };

    let score = 0;
    if (info_complete) score += weights.info;
    if (counts.employment_count > 0) score += weights.employment;
    if (counts.skills_count >= 5)
      score += weights.skills; // full points at >=5 skills
    else if (counts.skills_count > 0) score += Math.round(weights.skills / 2);

    if (counts.education_count > 0) score += weights.education;
    if (counts.certifications_count > 0) score += weights.certifications;
    if (counts.projects_count > 0) score += weights.projects;

    // --- Suggestions
    const suggestions = [];
    if (!info_complete)
      suggestions.push(
        "Complete your basic profile info (name, email, phone, location)."
      );
    if (counts.employment_count === 0)
      suggestions.push("Add at least one employment entry.");
    if (counts.skills_count < 5)
      suggestions.push("List 5+ skills to strengthen your profile.");
    if (counts.education_count === 0)
      suggestions.push("Add an education record.");
    if (counts.certifications_count === 0)
      suggestions.push("Add certifications to showcase your professional credentials.");
    if (counts.projects_count === 0)
      suggestions.push("Showcase a project you're proud of.");
    if (!infoRow.has_picture)
      suggestions.push("Upload a professional profile picture.");
    if (!infoRow.has_title)
      suggestions.push(
        "Add a headline (e.g., 'Software Engineer | ML Enthusiast')."
      );

    // Format skills distribution
    const skills_distribution = skillsDist.rows.map(row => ({
      category: row.category || 'Other',
      count: row.count || 0
    }));

    // respond
    const response = {
      info_complete,
      ...counts,
      completeness: { score: Math.max(0, Math.min(100, score)), suggestions },
      skills_distribution,
    };
    
    if (process.env.NODE_ENV !== 'test') {
      console.log("📊 Sending response:", JSON.stringify(response, null, 2));
    }
    
    return res.json(response);
  } catch (err) {
    console.error("❌ Profile summary error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
