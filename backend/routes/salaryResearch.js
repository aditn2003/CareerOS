// backend/routes/salaryResearch.js
import express from "express";
import { auth } from "../auth.js";
import pkg from "pg";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- Helpers ---------- */

// Infer experience level from job title text
function inferLevelFromTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("junior") || t.includes("associate"))
    return "Entry";
  if (t.includes("senior") || t.includes("sr")) return "Senior";
  if (t.includes("lead") || t.includes("principal")) return "Lead";
  return "Mid";
}

// Super simple heuristic for company size (you can improve later)
function inferCompanySize(company = "") {
  const bigNames = ["google", "meta", "amazon", "microsoft", "apple", "walmart"];
  const c = company.toLowerCase();
  if (bigNames.some((name) => c.includes(name))) return "Large";
  return "Medium";
}

// Compute salary ranges dynamically based on title, level, location & size
// Returns object with low, avg, high, and percentiles
function computeSalary(jobTitle, level, location, companySize) {
  const roleBase = {
    "software engineer": { low: 80000, avg: 120000, high: 160000 },
    "data analyst": { low: 60000, avg: 85000, high: 110000 },
    "project manager": { low: 70000, avg: 100000, high: 130000 },
    "cybersecurity analyst": { low: 75000, avg: 110000, high: 145000 },
  };

  const base =
    roleBase[jobTitle.toLowerCase()] || // exact match
    { low: 60000, avg: 90000, high: 130000 }; // generic fallback

  const levelMultiplier = {
    Entry: 0.85,
    Mid: 1.0,
    Senior: 1.25,
    Lead: 1.55,
  };

  const sizeMultiplier = {
    Small: 0.9,
    Medium: 1.0,
    Large: 1.15,
  };

  const loc = (location || "").toLowerCase();
  const locationMultiplier =
    loc.includes("ny") ||
    loc.includes("new york") ||
    loc.includes("bay area") ||
    loc.includes("san francisco") ||
    loc.includes("sf")
      ? 1.25
      : 1.0;

  const mult =
    (levelMultiplier[level] || 1) *
    (sizeMultiplier[companySize] || 1) *
    locationMultiplier;

  let low = Math.round(base.low * mult);
  const avg = Math.round(base.avg * mult); // Keep avg fixed - this is our calculated average
  let high = Math.round(base.high * mult);

  // Ensure proper ordering: low <= avg <= high
  // Fix any ordering issues by adjusting low and high relative to avg (don't change avg)
  if (low > avg) {
    // If low is higher than avg, adjust low to be below avg (use 75% of avg)
    low = Math.round(avg * 0.75);
  }
  if (high < avg) {
    // If high is lower than avg, adjust high to be above avg (use 125% of avg)
    high = Math.round(avg * 1.25);
  }
  // Final check: ensure low < high (with some margin)
  if (low >= high || high <= avg || low >= avg) {
    // Reset to sensible defaults around avg
    low = Math.round(avg * 0.75);
    high = Math.round(avg * 1.25);
  }

  // Calculate percentiles: 25th, 50th (median), 75th
  // Using proper percentile calculations based on the full range from low to high
  const range = high - low;
  const percentile25 = Math.round(low + range * 0.25); // 25th percentile
  const percentile50 = Math.round(low + range * 0.50); // 50th percentile (median)
  const percentile75 = Math.round(low + range * 0.75); // 75th percentile

  // Final verification: ensure correct ordering
  // low <= percentile25 <= percentile50 <= percentile75 <= high
  // And ensure avg falls within the range (it should be close to percentile50)
  
  // Verify all values are properly ordered
  const result = {
    low: low, // Keep original low (already validated to be < avg)
    avg: avg, // Keep the original calculated average (already validated to be between low and high)
    high: high, // Keep original high (already validated to be > avg)
    percentile25: Math.max(low, Math.min(percentile25, percentile50)),
    percentile50: Math.max(percentile25, Math.min(percentile50, percentile75)),
    percentile75: Math.max(percentile50, Math.min(percentile75, high)),
  };

  // Final sanity check - if anything is still wrong, log it
  if (result.low > result.avg || result.avg > result.high) {
    console.error("❌ Salary calculation error: invalid ordering detected", result);
    // Force correct values
    result.low = Math.min(result.low, result.avg, result.high);
    result.high = Math.max(result.low, result.avg, result.high);
    // Recalculate avg to be between low and high
    result.avg = Math.round((result.low + result.high) / 2);
  }

  return result;
}

/* ---------- Cache Management ---------- */

// Check cache for existing salary data
async function getCachedSalary(jobTitle, location, level) {
  try {
    const result = await pool.query(
      `SELECT percentile_25, percentile_50, percentile_75, salary_low, salary_high, 
              salary_average, data_source, metadata, updated_at, expires_at
       FROM salary_cache
       WHERE job_title = $1 AND location = $2 AND experience_level = $3
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [jobTitle, location, level]
    );

    if (result.rows.length > 0) {
      return {
        cached: true,
        data: result.rows[0],
      };
    }
    return { cached: false, data: null };
  } catch (err) {
    console.error("❌ Cache lookup error:", err);
    return { cached: false, data: null };
  }
}

// Save salary data to cache
async function saveToCache(jobTitle, location, level, salaryData, dataSource = "Computed") {
  try {
    const { low, avg, high, percentile25, percentile50, percentile75 } = salaryData;

    // Validate data before caching - ensure low <= avg <= high
    if (!low || !avg || !high || low > avg || avg > high) {
      console.error("❌ Attempted to cache invalid salary data:", { low, avg, high, jobTitle, location });
      return; // Don't cache invalid data
    }

    await pool.query(
      `INSERT INTO salary_cache 
       (job_title, location, experience_level, percentile_25, percentile_50, percentile_75,
        salary_low, salary_high, salary_average, data_source, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (job_title, location, experience_level)
       DO UPDATE SET
         percentile_25 = EXCLUDED.percentile_25,
         percentile_50 = EXCLUDED.percentile_50,
         percentile_75 = EXCLUDED.percentile_75,
         salary_low = EXCLUDED.salary_low,
         salary_high = EXCLUDED.salary_high,
         salary_average = EXCLUDED.salary_average,
         data_source = EXCLUDED.data_source,
         updated_at = NOW(),
         expires_at = NOW() + INTERVAL '7 days'`,
      [jobTitle, location, level, percentile25, percentile50, percentile75, low, avg, high, dataSource]
    );
  } catch (err) {
    console.error("❌ Cache save error:", err);
    // Don't throw - caching failures shouldn't break the request
  }
}

/* ---------- External Salary Data Sources ---------- */

// Use OpenAI to fetch realistic salary data based on job market knowledge
// Returns null if OpenAI unavailable, causing fallback to computed estimates
async function fetchBLSData(jobTitle, location, level) {
  try {
    // Use OpenAI to generate realistic salary data based on market knowledge
    if (process.env.OPENAI_API_KEY && openai) {
      try {
        const prompt = `You are a salary data expert. Based on current 2024-2025 US job market data (including BLS OEWS data, Glassdoor, Levels.fyi, and other reliable sources), provide realistic salary ranges for this position.

Job Title: ${jobTitle}
Location: ${location}
Experience Level: ${level}

Return ONLY valid JSON in this exact format (all values should be annual salaries in USD):
{
  "low": number,
  "avg": number,
  "high": number,
  "percentile25": number,
  "percentile50": number,
  "percentile75": number,
  "dataSource": "string (e.g., 'Market Analysis based on BLS, Glassdoor, Levels.fyi')",
  "notes": "brief explanation of the data sources used"
}

Requirements:
- Ensure low <= percentile25 <= percentile50 <= percentile75 <= high
- Ensure low <= avg <= high
- Values should reflect 2024-2025 market rates
- Consider cost of living adjustments for the location
- Consider experience level multipliers
- Be realistic based on actual market data you know

Return ONLY the JSON, no other text.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3, // Lower temperature for more consistent, factual data
          max_tokens: 300,
        });

        const responseText = aiResponse.choices[0]?.message?.content?.trim() || "";
        
        // Extract JSON from response (handle markdown code blocks)
        let jsonText = responseText;
        if (responseText.includes("```json")) {
          jsonText = responseText.split("```json")[1].split("```")[0].trim();
        } else if (responseText.includes("```")) {
          jsonText = responseText.split("```")[1].split("```")[0].trim();
        }

        const salaryData = JSON.parse(jsonText);

        // Validate the data
        if (salaryData.low && salaryData.avg && salaryData.high &&
            salaryData.percentile25 && salaryData.percentile50 && salaryData.percentile75) {
          
          // Ensure proper ordering
          const values = {
            low: Math.round(salaryData.low),
            avg: Math.round(salaryData.avg),
            high: Math.round(salaryData.high),
            percentile25: Math.round(salaryData.percentile25),
            percentile50: Math.round(salaryData.percentile50),
            percentile75: Math.round(salaryData.percentile75),
          };

          // Final validation and ordering
          if (values.low <= values.avg && values.avg <= values.high &&
              values.low <= values.percentile25 && values.percentile25 <= values.percentile50 &&
              values.percentile50 <= values.percentile75 && values.percentile75 <= values.high) {
            
            console.log(`✅ Fetched salary data from OpenAI for ${jobTitle} in ${location}`);
            return values;
          } else {
            console.log("⚠️ OpenAI returned invalid salary ordering, using computed estimates");
          }
        }
      } catch (openaiErr) {
        console.log("⚠️ OpenAI salary data fetch failed:", openaiErr.message);
        // Continue to fallback
      }
    }

    // Fallback: Try Adzuna API if configured
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_API_KEY) {
      try {
        const country = 'us';
        const locationCode = location.split(',')[0]?.trim() || location;
        const adzunaUrl = `https://api.adzuna.com/v1/api/pro/${country}/salary_history?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_API_KEY}&location0=${encodeURIComponent(locationCode)}&what=${encodeURIComponent(jobTitle)}&content-type=application/json`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(adzunaUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const salaries = data.results
              .map(r => r.salary || r.mean || r.median)
              .filter(s => s && s > 0 && typeof s === 'number');
              
            if (salaries.length > 0) {
              salaries.sort((a, b) => a - b);
              const low = salaries[0];
              const high = salaries[salaries.length - 1];
              const avg = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);
              const percentile25 = salaries[Math.floor(salaries.length * 0.25)] || low;
              const percentile50 = salaries[Math.floor(salaries.length * 0.50)] || avg;
              const percentile75 = salaries[Math.floor(salaries.length * 0.75)] || high;
              
              console.log(`✅ Fetched salary data from Adzuna for ${jobTitle} in ${location}`);
              return { low, avg, high, percentile25, percentile50, percentile75 };
            }
          }
        }
      } catch (adzunaErr) {
        // Continue to fallback
      }
    }
    
    // If no external sources available, return null to use computed estimates
    return null;
  } catch (err) {
    console.error("❌ External salary data fetch error:", err);
    return null;
  }
}

/* ============================================================
   GET /api/salary-research/:jobId
============================================================ */
router.get("/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id || req.userId;
  const forceRefresh = req.query.forceRefresh === "true";

  try {
    // 1. Fetch job for this user
    const jobQuery = await pool.query(
      "SELECT id, title, company, location FROM jobs WHERE id=$1 AND user_id=$2",
      [jobId, userId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = jobQuery.rows[0];
    const title = job.title || "Unknown";
    const company = job.company || "Unknown";
    const location = job.location || "Not specified";

    const level = inferLevelFromTitle(title);
    const companySize = inferCompanySize(company);

    // 2. Get user's current compensation
    const userSalary = Number(req.query.userSalary) || 0;

    // 3. Check cache first (unless force refresh)
    let range = null;
    let dataSource = "Computed";
    let cached = false;
    let cacheTimestamp = null;

    if (!forceRefresh) {
      const cacheResult = await getCachedSalary(title, location, level);
      if (cacheResult.cached) {
        const cachedData = cacheResult.data;
        
        // Validate cached data - ensure low <= avg <= high
        // If invalid, don't use cache and recompute
        const isValid = cachedData.salary_low && 
                       cachedData.salary_average && 
                       cachedData.salary_high &&
                       cachedData.salary_low <= cachedData.salary_average &&
                       cachedData.salary_average <= cachedData.salary_high;
        
        if (isValid) {
          range = {
            low: cachedData.salary_low,
            avg: cachedData.salary_average,
            high: cachedData.salary_high,
            percentile25: cachedData.percentile_25,
            percentile50: cachedData.percentile_50,
            percentile75: cachedData.percentile_75,
          };
          dataSource = cachedData.data_source || "Cached";
          cached = true;
          cacheTimestamp = cachedData.updated_at;
        } else {
          // Invalid cache data - will recompute and update cache below
          console.log("⚠️ Invalid cached salary data detected, recomputing...");
        }
      }
    }

    // 4. If not cached, fetch from external APIs or compute
    if (!range) {
      // Try external APIs first (Adzuna, BLS, etc.)
      const externalData = await fetchBLSData(title, location, level);
      
      if (externalData) {
        range = externalData;
        dataSource = "AI-Powered Market Data"; // Shows when using OpenAI
        console.log(`✅ Using AI-powered salary data for ${title}`);
      } else {
        // Fall back to computed estimates based on market data
        range = computeSalary(title, level, location, companySize);
        dataSource = "Computed (Market Estimate)";
        console.log(`ℹ️ Using computed salary estimates for ${title} (no external data available)`);
      }

      // Save to cache for future requests
      await saveToCache(title, location, level, range, dataSource);
    }

    // 5. Compute total compensation
    const comp = {
      base: range.avg,
      bonus: Math.round(range.avg * 0.12),
      stock: Math.round(range.avg * 0.15),
      total: Math.round(
        range.avg + range.avg * 0.12 + range.avg * 0.15
      ),
    };

    // 4. Compare across different companies
    const companies = [
      {
        company: `${company} (Target)`,
        low: range.low,
        avg: range.avg,
        high: range.high,
      },
      {
        company: "Google",
        low: range.low + 15000,
        avg: range.avg + 30000,
        high: range.high + 45000,
      },
      {
        company: "Amazon",
        low: range.low + 10000,
        avg: range.avg + 20000,
        high: range.high + 30000,
      },
      {
        company: "Deloitte",
        low: range.low - 15000,
        avg: range.avg - 10000,
        high: range.high - 5000,
      },
    ];

    // 5. Historical trend
    const trends = [
      { year: 2020, avg: Math.round(range.avg * 0.82) },
      { year: 2021, avg: Math.round(range.avg * 0.88) },
      { year: 2022, avg: Math.round(range.avg * 0.93) },
      { year: 2023, avg: Math.round(range.avg * 0.97) },
      { year: 2024, avg: range.avg },
    ];

    // 6. Negotiation recommendations (AI)
    const prompt = `
You are an expert salary negotiation coach.
Job title: ${title}
Company: ${company}
Location: ${location}
Level: ${level}
Company size: ${companySize}
Average market salary: ${range.avg}

Based on current market data, give 5 concise bullet-point salary negotiation recommendations.
`;
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const recommendations =
      aiRes.choices[0]?.message?.content || "No recommendations available.";

    // 7. Compare user vs market
    const marketDiff = userSalary
      ? Math.round(((range.avg - userSalary) / userSalary) * 100)
      : 0;

    // 8. Final payload
    res.json({
      jobId: job.id,
      title,
      company,
      location,
      level,
      companySize,
      range: {
        low: range.low,
        avg: range.avg,
        high: range.high,
        percentile25: range.percentile25,
        percentile50: range.percentile50,
        percentile75: range.percentile75,
      },
      comp,
      companies,
      trends,
      recommendations,
      userSalary,
      marketDiff,
      dataSource,
      cached,
      cacheTimestamp,
      lastUpdated: cacheTimestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Salary research error:", err);
    
    // Graceful error handling - return partial data if possible
    if (err.response?.status === 404) {
      return res.status(404).json({ 
        message: "Job not found",
        error: "The requested job could not be found." 
      });
    }

    // If we have job info but salary fetch failed, return error with job details
    res.status(500).json({ 
      message: "Failed to generate salary research",
      error: err.message,
      // Include job info so frontend can still display something
      job: job ? { title: job.title, company: job.company, location: job.location } : null,
      dataAvailable: false,
    });
  }
});

/* ============================================================
   GET /api/salary-research/benchmark/:jobId
   Simplified endpoint for job detail pages
============================================================ */
router.get("/benchmark/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?.id || req.userId;

  try {
    // Fetch job
    const jobQuery = await pool.query(
      "SELECT id, title, company, location FROM jobs WHERE id=$1 AND user_id=$2",
      [jobId, userId]
    );

    if (jobQuery.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = jobQuery.rows[0];
    const title = job.title || "Unknown";
    const location = job.location || "Not specified";
    const level = inferLevelFromTitle(title);

    // Check cache
    let range = null;
    let dataSource = "Computed";

    const cacheResult = await getCachedSalary(title, location, level);
    if (cacheResult.cached) {
      const cachedData = cacheResult.data;
      
      // Validate cached data - ensure low <= avg <= high
      const isValid = cachedData.salary_low && 
                     cachedData.salary_average && 
                     cachedData.salary_high &&
                     cachedData.salary_low <= cachedData.salary_average &&
                     cachedData.salary_average <= cachedData.salary_high;
      
      if (isValid) {
        range = {
          low: cachedData.salary_low,
          avg: cachedData.salary_average,
          high: cachedData.salary_high,
          percentile25: cachedData.percentile_25,
          percentile50: cachedData.percentile_50,
          percentile75: cachedData.percentile_75,
        };
        dataSource = cachedData.data_source || "Cached";
      } else {
        // Invalid cache data - will recompute
        console.log("⚠️ Invalid cached salary data detected, recomputing...");
      }
    }
    
    if (!range) {
      // Compute if not cached - try external APIs first
      const companySize = inferCompanySize(job.company);
      const externalData = await fetchBLSData(title, location, level);
      
      if (externalData) {
        range = externalData;
        dataSource = "AI-Powered Market Data"; // Shows when using OpenAI
      } else {
        range = computeSalary(title, level, location, companySize);
        dataSource = "Computed (Market Estimate)";
      }
      
      await saveToCache(title, location, level, range, dataSource);
    }

    res.json({
      jobId: job.id,
      title,
      location,
      range,
      dataSource,
      available: true,
    });
  } catch (err) {
    console.error("❌ Salary benchmark error:", err);
    // Return graceful error - frontend should handle missing data
    res.status(500).json({
      message: "Salary data temporarily unavailable",
      available: false,
      error: err.message,
    });
  }
});

export default router;
