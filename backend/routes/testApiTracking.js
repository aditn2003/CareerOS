/**
 * Test endpoint to verify API tracking is working
 * GET /api/test-tracking
 */

import express from "express";
import { logApiUsage } from "../utils/apiTrackingService.js";

const router = express.Router();

router.get("/test-tracking", async (req, res) => {
  try {
    console.log("🧪 Testing API tracking...");
    
    // Test logging a dummy API call
    await logApiUsage({
      serviceName: 'openai',
      endpoint: '/v1/test',
      method: 'GET',
      userId: req.user?.id || 1, // Use user ID from auth if available, or 1 for testing
      requestPayload: { test: true },
      responseStatus: 200,
      responseTimeMs: 100,
      success: true,
      costEstimate: 0.001
    });
    
    console.log("✅ Test API usage logged successfully");
    
    res.json({
      success: true,
      message: "Test API call tracked successfully. Check the dashboard to verify it appears."
    });
  } catch (error) {
    console.error("❌ Test tracking failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
