// backend/routes/geocoding.js
// UC-116: Location and Geo-coding Services
// Integrates with OpenStreetMap Nominatim API for geocoding

import express from "express";
import axios from "axios";
import pool from "../db/pool.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Rate limiting: Nominatim allows 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

// ---------- HELPER: Get timezone from coordinates ----------
// Uses free timezone lookup API (TimeZoneDB with demo key, or falls back gracefully)
async function getTimezoneFromCoordinates(latitude, longitude) {
  try {
    // Try TimeZoneDB API (demo key works but is rate-limited)
    // You can set TIMEZONEDB_API_KEY in .env for better rate limits
    const response = await axios.get("http://api.timezonedb.com/v2.1/get-time-zone", {
      params: {
        key: process.env.TIMEZONEDB_API_KEY || "demo",
        format: "json",
        by: "position",
        lat: latitude,
        lng: longitude,
      },
      timeout: 5000,
    });

    if (response.data && response.data.status === "OK" && response.data.zoneName) {
      // Calculate UTC offset in minutes
      // gmtOffset is in seconds, convert to minutes
      const utcOffsetMinutes = response.data.gmtOffset ? Math.floor(response.data.gmtOffset / 60) : null;
      
      return {
        timezone: response.data.zoneName, // e.g., "America/New_York"
        utcOffset: utcOffsetMinutes,
      };
    }
    
    return null;
  } catch (error) {
    // If TimeZoneDB fails (rate limit, network issue, etc.), continue without timezone
    // Timezone is helpful but not critical for the feature to work
    console.log(`⚠️ Timezone lookup failed for (${latitude}, ${longitude}):`, error.message);
    return null;
  }
}

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.split(" ")[1];
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    req.user = { id: data.id };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- HELPER: Rate-limited geocoding request ----------
async function geocodeWithRateLimit(locationString) {
  // Check cache first
  const cacheResult = await pool.query(
    `SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset 
     FROM geocoding_cache 
     WHERE LOWER(TRIM(location_string)) = LOWER(TRIM($1))`,
    [locationString]
  );

  if (cacheResult.rows.length > 0) {
    console.log(`✅ Cache hit for: ${locationString}`);
    return cacheResult.rows[0];
  }

  // Rate limiting: wait if needed
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  try {
    // Call Nominatim API - request more results to find city/town level specificity
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: locationString,
        format: "json",
        limit: 10, // Get more results to find city/town level
        addressdetails: 1,
        "accept-language": "en",
      },
      headers: {
        "User-Agent": "ATS-Job-Tracker/1.0", // Required by Nominatim
      },
    });

    lastRequestTime = Date.now();

    if (response.data && response.data.length > 0) {
      // Prefer results with city/town level specificity
      // Look for results that have city, town, or village in the address
      let result = response.data[0];
      
      // Try to find a more specific result (city/town level)
      // Score candidates: prefer city/town over state/country level
      let bestScore = -1;
      for (const candidate of response.data) {
        const addr = candidate.address || {};
        let score = 0;
        
        // Highest priority: has city, town, or village
        if (addr.city) score += 10;
        if (addr.town) score += 10;
        if (addr.village) score += 9;
        if (addr.municipality && !addr.state) score += 8;
        
        // Medium priority: has more specific address components
        if (addr.postcode) score += 2;
        if (addr.road || addr.street) score += 1;
        
        // Lower priority: state or country only
        if (addr.state && !addr.city && !addr.town && !addr.village) score -= 5;
        if (addr.country && !addr.state && !addr.city && !addr.town) score -= 10;
        
        // Check display_name for city/town indicators
        const displayName = (candidate.display_name || "").toLowerCase();
        if (displayName.includes("city") || displayName.includes("town")) {
          score += 3;
        }
        
        if (score > bestScore) {
          bestScore = score;
          result = candidate;
        }
      }
      
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      // Determine location type from result
      let locationType = null;
      const address = result.address || {};
      if (locationString.toLowerCase().includes("remote")) {
        locationType = "remote";
      } else if (locationString.toLowerCase().includes("hybrid")) {
        locationType = "hybrid";
      } else if (address.office || address.building || address.road) {
        locationType = "on_site";
      }

      // Get timezone information (non-blocking - don't fail if timezone lookup fails)
      // Only lookup timezone if we have valid coordinates and not a remote location
      let timezoneInfo = null;
      if (!locationString.toLowerCase().includes("remote")) {
        try {
          timezoneInfo = await getTimezoneFromCoordinates(lat, lon);
        } catch (tzError) {
          // Continue without timezone - it's not critical for functionality
          console.log(`⚠️ Timezone lookup failed for ${locationString}:`, tzError.message);
        }
      }

      // Cache the result
      await pool.query(
        `INSERT INTO geocoding_cache (location_string, latitude, longitude, display_name, location_type, country_code, timezone, utc_offset)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (location_string) DO UPDATE SET
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           display_name = EXCLUDED.display_name,
           location_type = EXCLUDED.location_type,
           country_code = EXCLUDED.country_code,
           timezone = EXCLUDED.timezone,
           utc_offset = EXCLUDED.utc_offset,
           updated_at = NOW()`,
        [
          locationString,
          lat,
          lon,
          result.display_name,
          locationType,
          address.country_code?.toUpperCase() || null,
          timezoneInfo?.timezone || null,
          timezoneInfo?.utcOffset || null,
        ]
      );

      return {
        latitude: lat,
        longitude: lon,
        display_name: result.display_name,
        location_type: locationType,
        country_code: address.country_code?.toUpperCase() || null,
        timezone: timezoneInfo?.timezone || null,
        utc_offset: timezoneInfo?.utcOffset || null,
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Geocoding error:", error.message);
    throw error;
  }
}

// ---------- GEOCODE A SINGLE LOCATION ----------
router.post("/geocode", auth, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({ error: "Location string is required" });
    }

    const result = await geocodeWithRateLimit(location.trim());

    if (!result) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Geocoding error:", error);
    res.status(500).json({ error: "Geocoding failed", details: error.message });
  }
});

// ---------- BATCH GEOCODE MULTIPLE LOCATIONS ----------
router.post("/geocode/batch", auth, async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: "Locations array is required" });
    }

    const results = [];
    for (const location of locations) {
      if (!location || !location.trim()) continue;

      try {
        const result = await geocodeWithRateLimit(location.trim());
        results.push({
          location,
          success: !!result,
          data: result || null,
        });
      } catch (error) {
        results.push({
          location,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("❌ Batch geocoding error:", error);
    res.status(500).json({ error: "Batch geocoding failed", details: error.message });
  }
});

// ---------- CALCULATE DISTANCE BETWEEN TWO POINTS (Haversine formula) ----------
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// ---------- CALCULATE COMMUTE DISTANCE AND TIME ----------
router.post("/commute", auth, async (req, res) => {
  try {
    const { jobId, homeLocation } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    // Get job location
    const jobResult = await pool.query(
      `SELECT id, location, latitude, longitude, company, title 
       FROM jobs 
       WHERE id = $1 AND user_id = $2`,
      [jobId, req.userId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobResult.rows[0];

    // If job doesn't have coordinates, geocode it
    let jobLat = job.latitude;
    let jobLon = job.longitude;

    if (!jobLat || !jobLon) {
      if (!job.location) {
        return res.status(400).json({ error: "Job location not available" });
      }

      const geocodeResult = await geocodeWithRateLimit(job.location);
      if (!geocodeResult) {
        return res.status(404).json({ error: "Could not geocode job location" });
      }

      jobLat = geocodeResult.latitude;
      jobLon = geocodeResult.longitude;

      // Update job with coordinates and timezone if available
      const jobTimezone = geocodeResult.timezone || null;
      const jobUtcOffset = geocodeResult.utc_offset || null;
      await pool.query(
        `UPDATE jobs 
         SET latitude = $1, longitude = $2, timezone = COALESCE($3, timezone), 
             utc_offset = COALESCE($4, utc_offset), geocoded_at = NOW() 
         WHERE id = $5`,
        [jobLat, jobLon, jobTimezone, jobUtcOffset, jobId]
      );
    }

    // Get or geocode home location
    let homeLat, homeLon;

    if (homeLocation) {
      // Use provided home location
      const geocodeResult = await geocodeWithRateLimit(homeLocation);
      if (!geocodeResult) {
        return res.status(404).json({ error: "Could not geocode home location" });
      }
      homeLat = geocodeResult.latitude;
      homeLon = geocodeResult.longitude;
    } else {
      // Get from user profile
      const profileResult = await pool.query(
        `SELECT home_latitude, home_longitude, location 
         FROM profiles 
         WHERE user_id = $1`,
        [req.userId]
      );

      if (profileResult.rows.length > 0) {
        const profile = profileResult.rows[0];
        if (profile.home_latitude && profile.home_longitude) {
          homeLat = profile.home_latitude;
          homeLon = profile.home_longitude;
        } else if (profile.location) {
          // Geocode profile location
          const geocodeResult = await geocodeWithRateLimit(profile.location);
          if (geocodeResult) {
            homeLat = geocodeResult.latitude;
            homeLon = geocodeResult.longitude;

            // Update profile with timezone if available
            const homeTimezone = geocodeResult.timezone || null;
            const homeUtcOffset = geocodeResult.utc_offset || null;
            await pool.query(
              `UPDATE profiles 
               SET home_latitude = $1, home_longitude = $2, 
                   home_timezone = COALESCE($3, home_timezone),
                   home_utc_offset = COALESCE($4, home_utc_offset),
                   home_location_geocoded_at = NOW() 
               WHERE user_id = $5`,
              [homeLat, homeLon, homeTimezone, homeUtcOffset, req.userId]
            );
          }
        }
      }
    }

    if (!homeLat || !homeLon) {
      return res.status(400).json({ 
        error: "Home location not set. Please set your home location in your profile." 
      });
    }

    // Calculate distance
    const distanceKm = calculateDistance(homeLat, homeLon, jobLat, jobLon);
    const distanceMiles = distanceKm * 0.621371;

    // Estimate travel time for driving (assuming average speed)
    // For driving: ~50 km/h average in cities, ~100 km/h on highways
    // Using conservative 60 km/h average
    const avgSpeedKmh = 60;
    const drivingTimeMinutes = (distanceKm / avgSpeedKmh) * 60;

    // Estimate travel time for plane
    // Average commercial plane speed: ~800 km/h (cruising speed)
    // Add 2 hours for airport time (check-in, security, boarding, etc.)
    const planeSpeedKmh = 800;
    const flightTimeMinutes = (distanceKm / planeSpeedKmh) * 60;
    const totalPlaneTimeMinutes = flightTimeMinutes + 120; // Add 2 hours for airport time

    res.json({
      success: true,
      data: {
        distance: {
          kilometers: Math.round(distanceKm * 10) / 10,
          miles: Math.round(distanceMiles * 10) / 10,
        },
        drivingTime: {
          minutes: Math.round(drivingTimeMinutes),
          hours: Math.round(drivingTimeMinutes / 60 * 10) / 10,
        },
        planeTime: {
          minutes: Math.round(totalPlaneTimeMinutes),
          hours: Math.round(totalPlaneTimeMinutes / 60 * 10) / 10,
          flightMinutes: Math.round(flightTimeMinutes),
        },
        jobLocation: {
          latitude: jobLat,
          longitude: jobLon,
          address: job.location,
        },
        homeLocation: {
          latitude: homeLat,
          longitude: homeLon,
        },
      },
    });
  } catch (error) {
    console.error("❌ Commute calculation error:", error);
    res.status(500).json({ error: "Commute calculation failed", details: error.message });
  }
});

// ---------- SET USER HOME LOCATION ----------
router.post("/home-location", auth, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({ error: "Location string is required" });
    }

    // Geocode the location
    const geocodeResult = await geocodeWithRateLimit(location.trim());

    if (!geocodeResult) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Update user profile with timezone
    await pool.query(
      `UPDATE profiles 
       SET location = $1, home_latitude = $2, home_longitude = $3,
           home_timezone = COALESCE($4, home_timezone),
           home_utc_offset = COALESCE($5, home_utc_offset),
           home_location_geocoded_at = NOW()
       WHERE user_id = $6`,
      [
        location.trim(), 
        geocodeResult.latitude, 
        geocodeResult.longitude,
        geocodeResult.timezone || null,
        geocodeResult.utc_offset || null,
        req.userId
      ]
    );

    res.json({
      success: true,
      message: "Home location updated",
      data: {
        location: location.trim(),
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        timezone: geocodeResult.timezone || null,
        utc_offset: geocodeResult.utc_offset || null,
      },
    });
  } catch (error) {
    console.error("❌ Set home location error:", error);
    res.status(500).json({ error: "Failed to set home location", details: error.message });
  }
});

export default router;
