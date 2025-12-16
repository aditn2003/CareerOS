import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { trackApiCall } from "../utils/apiTrackingService.js";

dotenv.config();

const router = express.Router();
router.use(auth);

// Check if Google API key is available
if (!process.env.GOOGLE_API_KEY) {
  console.warn("⚠️ GOOGLE_API_KEY not found in environment variables");
  console.warn("   Make sure GOOGLE_API_KEY is set in your .env file in the backend directory");
} else {
  const keyLength = process.env.GOOGLE_API_KEY.length;
  const keyPreview = process.env.GOOGLE_API_KEY.substring(0, 10) + "..." + process.env.GOOGLE_API_KEY.substring(keyLength - 4);
  console.log("✅ GOOGLE_API_KEY loaded:", keyPreview, `(${keyLength} chars)`);
}

const genAI = process.env.GOOGLE_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

/**
 * Fetch market benchmark data using Gemini AI
 * POST /api/market-benchmarks/fetch
 * Body: { role_title, role_level, location, industry?, company_size? }
 */
router.post("/fetch", async (req, res) => {
  try {
    // Check if Google API key is available
    if (!genAI || !process.env.GOOGLE_API_KEY) {
      return res.status(503).json({
        error: "Google API key not configured",
        message: "GOOGLE_API_KEY is missing from environment variables. Please add it to your .env file."
      });
    }

    const { role_title, role_level, location, industry, company_size, location_type } = req.body;

    // Validate required fields
    if (!role_title || !role_level || !location) {
      return res.status(400).json({
        error: "Missing required fields: role_title, role_level, location"
      });
    }

    console.log(`🤖 Fetching market benchmark for: ${role_title} (${role_level}) in ${location}`);

    // Create prompt for Gemini
    const prompt = `You are a compensation data expert. Provide current market salary data for the following role.

Role Title: ${role_title}
Level: ${role_level}
Location: ${location}
${industry ? `Industry: ${industry}` : ''}
${company_size ? `Company Size: ${company_size}` : ''}
${location_type ? `Location Type: ${location_type}` : 'Location Type: on_site'}

Based on current market data (as of 2024-2025), provide salary percentiles for this role in this location.

Return ONLY valid JSON in this exact format:
{
  "percentile_10": number,
  "percentile_25": number,
  "percentile_50": number,
  "percentile_75": number,
  "percentile_90": number,
  "total_comp_percentile_50": number (optional, total compensation median),
  "total_comp_percentile_75": number (optional),
  "total_comp_percentile_90": number (optional),
  "years_of_experience_min": number,
  "years_of_experience_max": number,
  "sample_size": number (estimated),
  "data_source": "string (e.g., 'levels.fyi', 'glassdoor', 'payscale', 'gemini_estimate')",
  "notes": "string (brief explanation of data source or methodology)"
}

Use realistic market data. For tech roles, reference Levels.fyi data. For other roles, use Glassdoor/PayScale ranges.
All salary values should be in USD per year (base salary unless specified as total comp).
Experience ranges should be appropriate for the level (e.g., senior = 4-7 years, mid = 2-4 years).
Sample size can be an estimate based on typical data sources.

Be accurate and realistic based on 2024-2025 market conditions.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2, // Lower temperature for more consistent data
        responseMimeType: "application/json",
      },
    });

    const userId = req.user?.id || null;
    
    // Track Gemini API call
    let geminiResult;
    let aiResponse;
    try {
      geminiResult = await model.generateContent(prompt);
      aiResponse = geminiResult.response.text();
      
      // Log successful API usage
      const { logApiUsage } = await import("../utils/apiTrackingService.js");
      await logApiUsage({
        serviceName: 'google_gemini',
        endpoint: '/v1/models/gemini-2.0-flash:generateContent',
        method: 'POST',
        userId,
        requestPayload: { model: 'gemini-2.0-flash', purpose: 'market_benchmark', role_title, role_level, location },
        responseStatus: 200,
        responseTimeMs: 0, // Can't measure easily with SDK
        success: true,
        costEstimate: 0.0001
      });
    } catch (apiError) {
      // Log failed API usage
      const { logApiError, logApiUsage } = await import("../utils/apiTrackingService.js");
      await logApiError({
        serviceName: 'google_gemini',
        endpoint: '/v1/models/gemini-2.0-flash:generateContent',
        userId,
        errorType: 'api_error',
        errorMessage: apiError.message || 'Gemini API error',
        requestPayload: { model: 'gemini-2.0-flash', purpose: 'market_benchmark' }
      });
      await logApiUsage({
        serviceName: 'google_gemini',
        endpoint: '/v1/models/gemini-2.0-flash:generateContent',
        method: 'POST',
        userId,
        requestPayload: { model: 'gemini-2.0-flash', purpose: 'market_benchmark' },
        responseStatus: 500,
        responseTimeMs: 0,
        success: false
      });
      throw apiError; // Re-throw to be handled by outer catch
    }

    // Parse Gemini response
    let benchmarkData;
    try {
      benchmarkData = JSON.parse(aiResponse);
    } catch (err) {
      // Try cleaning if wrapped in markdown
      const cleaned = aiResponse.replace(/```json|```/g, "").trim();
      benchmarkData = JSON.parse(cleaned);
    }

    // Validate the data structure
    if (!benchmarkData.percentile_50 || !benchmarkData.percentile_10) {
      return res.status(500).json({
        error: "AI returned incomplete data",
        raw: benchmarkData
      });
    }

    // Insert or update in database
    const insertQuery = `
      INSERT INTO market_benchmarks (
        role_title, role_level, industry, company_size, location, location_type,
        percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
        total_comp_percentile_50, total_comp_percentile_75, total_comp_percentile_90,
        years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (role_title, role_level, industry, company_size, location, location_type)
      DO UPDATE SET
        percentile_10 = EXCLUDED.percentile_10,
        percentile_25 = EXCLUDED.percentile_25,
        percentile_50 = EXCLUDED.percentile_50,
        percentile_75 = EXCLUDED.percentile_75,
        percentile_90 = EXCLUDED.percentile_90,
        total_comp_percentile_50 = EXCLUDED.total_comp_percentile_50,
        total_comp_percentile_75 = EXCLUDED.total_comp_percentile_75,
        total_comp_percentile_90 = EXCLUDED.total_comp_percentile_90,
        years_of_experience_min = EXCLUDED.years_of_experience_min,
        years_of_experience_max = EXCLUDED.years_of_experience_max,
        sample_size = EXCLUDED.sample_size,
        data_source = EXCLUDED.data_source,
        data_date = EXCLUDED.data_date,
        updated_at = NOW()
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      role_title,
      role_level,
      industry || null,
      company_size || null,
      location,
      location_type || 'on_site',
      Number(benchmarkData.percentile_10),
      Number(benchmarkData.percentile_25),
      Number(benchmarkData.percentile_50),
      Number(benchmarkData.percentile_75),
      Number(benchmarkData.percentile_90),
      benchmarkData.total_comp_percentile_50 ? Number(benchmarkData.total_comp_percentile_50) : null,
      benchmarkData.total_comp_percentile_75 ? Number(benchmarkData.total_comp_percentile_75) : null,
      benchmarkData.total_comp_percentile_90 ? Number(benchmarkData.total_comp_percentile_90) : null,
      Number(benchmarkData.years_of_experience_min) || 0,
      Number(benchmarkData.years_of_experience_max) || 10,
      Number(benchmarkData.sample_size) || 100,
      benchmarkData.data_source || 'gemini_estimate',
      new Date().toISOString().split('T')[0] // Current date
    ]);

    console.log(`✅ Market benchmark saved: ${role_title} in ${location}`);

    res.json({
      success: true,
      message: "Market benchmark data fetched and saved",
      benchmark: insertResult.rows[0],
      ai_notes: benchmarkData.notes || null
    });

  } catch (err) {
    console.error("❌ Error fetching market benchmark:", err);
    
    // Handle specific API key errors
    if (err.message?.includes("API key") || err.message?.includes("API_KEY_INVALID") || err.status === 400) {
      return res.status(401).json({
        error: "Google API key error",
        message: "Your Google API key has expired or is invalid. Please renew it in your Google Cloud Console.",
        details: err.message,
        help: "Go to https://console.cloud.google.com/apis/credentials to create or renew your API key"
      });
    }
    
    res.status(500).json({
      error: "Failed to fetch market benchmark data",
      details: err.message
    });
  }
});

/**
 * Batch fetch multiple benchmarks
 * POST /api/market-benchmarks/batch-fetch
 * Body: { benchmarks: [{ role_title, role_level, location, ... }, ...] }
 */
router.post("/batch-fetch", async (req, res) => {
  try {
    // Check if Google API key is available
    if (!genAI || !process.env.GOOGLE_API_KEY) {
      return res.status(503).json({
        error: "Google API key not configured",
        message: "GOOGLE_API_KEY is missing from environment variables. Please add it to your .env file."
      });
    }

    const { benchmarks } = req.body;

    if (!Array.isArray(benchmarks) || benchmarks.length === 0) {
      return res.status(400).json({
        error: "benchmarks must be a non-empty array"
      });
    }

    if (benchmarks.length > 10) {
      return res.status(400).json({
        error: "Maximum 10 benchmarks per batch request"
      });
    }

    const results = [];
    const errors = [];

    for (const benchmark of benchmarks) {
      try {
        // Create a mock request object for the fetch endpoint
        const mockReq = {
          body: benchmark,
          user: req.user
        };
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              if (code === 200) {
                results.push(data);
              } else {
                errors.push({ benchmark, error: data });
              }
            }
          }),
          json: (data) => {
            if (data.success) {
              results.push(data);
            } else {
              errors.push({ benchmark, error: data });
            }
          }
        };

        // Call the fetch logic directly
        const { role_title, role_level, location, industry, company_size, location_type } = benchmark;
        
        if (!role_title || !role_level || !location) {
          errors.push({ benchmark, error: "Missing required fields" });
          continue;
        }

        const prompt = `You are a compensation data expert. Provide current market salary data for the following role.

Role Title: ${role_title}
Level: ${role_level}
Location: ${location}
${industry ? `Industry: ${industry}` : ''}
${company_size ? `Company Size: ${company_size}` : ''}
${location_type ? `Location Type: ${location_type}` : 'Location Type: on_site'}

Based on current market data (as of 2024-2025), provide salary percentiles for this role in this location.

Return ONLY valid JSON in this exact format:
{
  "percentile_10": number,
  "percentile_25": number,
  "percentile_50": number,
  "percentile_75": number,
  "percentile_90": number,
  "total_comp_percentile_50": number (optional),
  "total_comp_percentile_75": number (optional),
  "total_comp_percentile_90": number (optional),
  "years_of_experience_min": number,
  "years_of_experience_max": number,
  "sample_size": number,
  "data_source": "string",
  "notes": "string"
}

Use realistic market data based on 2024-2025 conditions.`;

        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();
        let benchmarkData = JSON.parse(aiResponse.replace(/```json|```/g, "").trim());

        const insertQuery = `
          INSERT INTO market_benchmarks (
            role_title, role_level, industry, company_size, location, location_type,
            percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
            total_comp_percentile_50, total_comp_percentile_75, total_comp_percentile_90,
            years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (role_title, role_level, industry, company_size, location, location_type)
          DO UPDATE SET
            percentile_10 = EXCLUDED.percentile_10,
            percentile_25 = EXCLUDED.percentile_25,
            percentile_50 = EXCLUDED.percentile_50,
            percentile_75 = EXCLUDED.percentile_75,
            percentile_90 = EXCLUDED.percentile_90,
            total_comp_percentile_50 = EXCLUDED.total_comp_percentile_50,
            total_comp_percentile_75 = EXCLUDED.total_comp_percentile_75,
            total_comp_percentile_90 = EXCLUDED.total_comp_percentile_90,
            years_of_experience_min = EXCLUDED.years_of_experience_min,
            years_of_experience_max = EXCLUDED.years_of_experience_max,
            sample_size = EXCLUDED.sample_size,
            data_source = EXCLUDED.data_source,
            data_date = EXCLUDED.data_date,
            updated_at = NOW()
          RETURNING *
        `;

        const insertResult = await pool.query(insertQuery, [
          role_title,
          role_level,
          industry || null,
          company_size || null,
          location,
          location_type || 'on_site',
          Number(benchmarkData.percentile_10),
          Number(benchmarkData.percentile_25),
          Number(benchmarkData.percentile_50),
          Number(benchmarkData.percentile_75),
          Number(benchmarkData.percentile_90),
          benchmarkData.total_comp_percentile_50 ? Number(benchmarkData.total_comp_percentile_50) : null,
          benchmarkData.total_comp_percentile_75 ? Number(benchmarkData.total_comp_percentile_75) : null,
          benchmarkData.total_comp_percentile_90 ? Number(benchmarkData.total_comp_percentile_90) : null,
          Number(benchmarkData.years_of_experience_min) || 0,
          Number(benchmarkData.years_of_experience_max) || 10,
          Number(benchmarkData.sample_size) || 100,
          benchmarkData.data_source || 'gemini_estimate',
          new Date().toISOString().split('T')[0]
        ]);

        results.push({
          success: true,
          benchmark: insertResult.rows[0],
          role_title,
          location
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`❌ Error fetching benchmark for ${benchmark.role_title}:`, err.message);
        
        // Check if it's an API key error
        const isApiKeyError = err.message?.includes("API key") || 
                             err.message?.includes("API_KEY_INVALID") ||
                             err.status === 400;
        
        errors.push({
          benchmark,
          error: isApiKeyError 
            ? "Google API key expired or invalid. Please renew your API key."
            : err.message
        });
        
        // If it's an API key error, stop processing to avoid repeated failures
        if (isApiKeyError && results.length === 0) {
          return res.status(401).json({
            error: "Google API key error",
            message: "Your Google API key has expired or is invalid. Please renew it in your Google Cloud Console.",
            help: "Go to https://console.cloud.google.com/apis/credentials to create or renew your API key",
            total: benchmarks.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
          });
        }
      }
    }

    res.json({
      success: true,
      total: benchmarks.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("❌ Error in batch fetch:", err);
    
    // Handle API key errors
    if (err.message?.includes("API key") || err.message?.includes("API_KEY_INVALID")) {
      return res.status(401).json({
        error: "Google API key error",
        message: "Your Google API key has expired or is invalid. Please renew it in your Google Cloud Console.",
        details: err.message,
        help: "Go to https://console.cloud.google.com/apis/credentials to create or renew your API key"
      });
    }
    
    res.status(500).json({
      error: "Failed to batch fetch market benchmarks",
      details: err.message
    });
  }
});

/**
 * Auto-fetch benchmark for an offer
 * POST /api/market-benchmarks/auto-fetch-for-offer
 * Body: { offer_id } - Fetches benchmark based on offer details
 */
router.post("/auto-fetch-for-offer", async (req, res) => {
  try {
    // Check if Google API key is available
    if (!genAI || !process.env.GOOGLE_API_KEY) {
      return res.status(503).json({
        error: "Google API key not configured",
        message: "GOOGLE_API_KEY is missing from environment variables. Please add it to your .env file."
      });
    }

    const { offer_id } = req.body;
    const userId = req.user.id;

    if (!offer_id) {
      return res.status(400).json({ error: "offer_id is required" });
    }

    // Get offer details
    const offerResult = await pool.query(
      `SELECT role_title, role_level, location, industry, company_size, location_type
       FROM offers
       WHERE id = $1 AND user_id = $2`,
      [offer_id, userId]
    );

    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const offer = offerResult.rows[0];

    // Check if benchmark already exists
    const existingBenchmark = await pool.query(
      `SELECT * FROM market_benchmarks
       WHERE role_title ILIKE $1
         AND role_level = $2
         AND location = $3
         AND (industry = $4 OR industry IS NULL)
         AND (company_size = $5 OR company_size IS NULL)
         AND location_type = $6
       LIMIT 1`,
      [
        `%${offer.role_title}%`,
        offer.role_level,
        offer.location,
        offer.industry,
        offer.company_size,
        offer.location_type || 'on_site'
      ]
    );

    if (existingBenchmark.rows.length > 0) {
      return res.json({
        success: true,
        message: "Benchmark already exists",
        benchmark: existingBenchmark.rows[0],
        cached: true
      });
    }

    // Fetch new benchmark using Gemini directly
    const prompt = `You are a compensation data expert. Provide current market salary data for the following role.

Role Title: ${offer.role_title}
Level: ${offer.role_level}
Location: ${offer.location}
${offer.industry ? `Industry: ${offer.industry}` : ''}
${offer.company_size ? `Company Size: ${offer.company_size}` : ''}
Location Type: ${offer.location_type || 'on_site'}

Based on current market data (as of 2024-2025), provide salary percentiles for this role in this location.

Return ONLY valid JSON in this exact format:
{
  "percentile_10": number,
  "percentile_25": number,
  "percentile_50": number,
  "percentile_75": number,
  "percentile_90": number,
  "total_comp_percentile_50": number (optional),
  "total_comp_percentile_75": number (optional),
  "total_comp_percentile_90": number (optional),
  "years_of_experience_min": number,
  "years_of_experience_max": number,
  "sample_size": number,
  "data_source": "string",
  "notes": "string"
}

Use realistic market data based on 2024-2025 conditions.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    let benchmarkData;
    try {
      benchmarkData = JSON.parse(aiResponse);
    } catch (err) {
      const cleaned = aiResponse.replace(/```json|```/g, "").trim();
      benchmarkData = JSON.parse(cleaned);
    }

    const insertQuery = `
      INSERT INTO market_benchmarks (
        role_title, role_level, industry, company_size, location, location_type,
        percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
        total_comp_percentile_50, total_comp_percentile_75, total_comp_percentile_90,
        years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (role_title, role_level, industry, company_size, location, location_type)
      DO UPDATE SET
        percentile_10 = EXCLUDED.percentile_10,
        percentile_25 = EXCLUDED.percentile_25,
        percentile_50 = EXCLUDED.percentile_50,
        percentile_75 = EXCLUDED.percentile_75,
        percentile_90 = EXCLUDED.percentile_90,
        total_comp_percentile_50 = EXCLUDED.total_comp_percentile_50,
        total_comp_percentile_75 = EXCLUDED.total_comp_percentile_75,
        total_comp_percentile_90 = EXCLUDED.total_comp_percentile_90,
        years_of_experience_min = EXCLUDED.years_of_experience_min,
        years_of_experience_max = EXCLUDED.years_of_experience_max,
        sample_size = EXCLUDED.sample_size,
        data_source = EXCLUDED.data_source,
        data_date = EXCLUDED.data_date,
        updated_at = NOW()
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      offer.role_title,
      offer.role_level,
      offer.industry || null,
      offer.company_size || null,
      offer.location,
      offer.location_type || 'on_site',
      Number(benchmarkData.percentile_10),
      Number(benchmarkData.percentile_25),
      Number(benchmarkData.percentile_50),
      Number(benchmarkData.percentile_75),
      Number(benchmarkData.percentile_90),
      benchmarkData.total_comp_percentile_50 ? Number(benchmarkData.total_comp_percentile_50) : null,
      benchmarkData.total_comp_percentile_75 ? Number(benchmarkData.total_comp_percentile_75) : null,
      benchmarkData.total_comp_percentile_90 ? Number(benchmarkData.total_comp_percentile_90) : null,
      Number(benchmarkData.years_of_experience_min) || 0,
      Number(benchmarkData.years_of_experience_max) || 10,
      Number(benchmarkData.sample_size) || 100,
      benchmarkData.data_source || 'gemini_estimate',
      new Date().toISOString().split('T')[0]
    ]);

    res.json({
      success: true,
      message: "Market benchmark fetched and saved",
      benchmark: insertResult.rows[0],
      ai_notes: benchmarkData.notes || null
    });

  } catch (err) {
    console.error("❌ Error auto-fetching benchmark:", err);
    
    // Handle specific API key errors
    if (err.message?.includes("API key") || err.message?.includes("API_KEY_INVALID") || err.status === 400) {
      return res.status(401).json({
        error: "Google API key error",
        message: "Your Google API key has expired or is invalid. Please renew it in your Google Cloud Console.",
        details: err.message,
        help: "Go to https://console.cloud.google.com/apis/credentials to create or renew your API key"
      });
    }
    
    res.status(500).json({
      error: "Failed to auto-fetch market benchmark",
      details: err.message
    });
  }
});

/**
 * Test endpoint to verify API key is working
 * GET /api/market-benchmarks/test
 */
router.get("/test", async (req, res) => {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "API key not configured",
        message: "GOOGLE_API_KEY is missing from environment variables",
        help: "Add GOOGLE_API_KEY to your backend/.env file and restart the server"
      });
    }

    if (!genAI) {
      return res.status(503).json({
        success: false,
        error: "Gemini AI not initialized",
        message: "Failed to initialize GoogleGenerativeAI client"
      });
    }

    // Try a simple API call
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 10,
      },
    });

    const result = await model.generateContent("Say 'API key is working' if you can read this.");
    const response = result.response.text();

    res.json({
      success: true,
      message: "API key is working!",
      apiResponse: response,
      keyLength: process.env.GOOGLE_API_KEY.length,
      keyPreview: process.env.GOOGLE_API_KEY.substring(0, 10) + "..." + process.env.GOOGLE_API_KEY.substring(process.env.GOOGLE_API_KEY.length - 4)
    });
  } catch (err) {
    console.error("❌ API key test failed:", err);
    
    // Check for specific API key errors
    if (err.message?.includes("API key") || err.message?.includes("API_KEY_INVALID") || err.status === 400) {
      return res.status(401).json({
        success: false,
        error: "API key invalid or expired",
        message: err.message || "Your Google API key has expired or is invalid",
        help: "Go to https://console.cloud.google.com/apis/credentials to create or renew your API key",
        details: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: "API test failed",
      message: err.message,
      details: err.toString()
    });
  }
});

export default router;

