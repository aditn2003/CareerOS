import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Factory function for dependency injection (for testing)
function createJobRoutes(genAIClient = null) {
  const router = express.Router();
  // Use injected client or create default one
  const genAI = genAIClient || new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  /* ============================================================
     🔹 AI JOB IMPORT — Axios + Gemini only (No Puppeteer)
     Fast, lightweight, and AI-powered job info extraction.
  ============================================================ */
  router.post("/import-job", async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ status: "failed", error: "Invalid URL" });
  }

  try {
    console.log("🌐 Fetching job page:", url);

    // 1️⃣ Fetch static HTML content
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 20000,
    });

    // 2️⃣ Extract text content from HTML
    const $ = cheerio.load(data);
    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    if (!bodyText || bodyText.length < 200) {
      console.warn("⚠️ Not enough text extracted for AI processing.");
      return res.status(200).json({
        status: "partial",
        job: {
          title: "",
          company: "Unknown",
          description:
            "⚠️ Could not extract visible text. Please fill details manually.",
          url,
        },
      });
    }

    console.log("🧾 Extracted text length:", bodyText.length);

    // 3️⃣ Send text to Gemini for structured extraction
    const prompt = `
You are an AI assistant that extracts job information from text.

Return ONLY valid JSON in this exact format:
{
  "title": string,
  "company": string,
  "location": string,
  "salary_min": string,
  "salary_max": string,
  "description": string
}

If information is missing, leave it as an empty string.
Keep the job description full and readable.

Job posting text:
${bodyText}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    console.log("🤖 Sending extracted text to Gemini...");
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    let job;
    try {
      job = JSON.parse(aiResponse);
    } catch (err) {
      console.error(
        "⚠️ Gemini returned invalid JSON:",
        aiResponse.slice(0, 200)
      );
      return res.status(500).json({
        status: "failed",
        error: "AI returned malformed JSON",
      });
    }

    // 4️⃣ Final cleanup
    job.url = url;
    for (const key of ["title", "company", "location", "description"]) {
      if (job[key]) job[key] = job[key].trim();
    }

    console.log("✅ Gemini extracted structured job data:", job);

    return res.status(200).json({
      status: "success",
      source: "axios+gemini",
      job,
    });
  } catch (err) {
    console.error("❌ Job import error:", err.message);
    return res.status(500).json({
      status: "failed",
      error: "Failed to import job. Please fill manually.",
    });
  }
  });

  router.get("/test-ai", async (req, res) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(
        "Respond only with 'Gemini is working ✅'"
      );
      res.json({ success: true, response: result.response.text() });
    } catch (err) {
      console.error("Gemini test error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

// Export default router (production use - maintains backward compatibility)
const router = createJobRoutes();
export default router;

// Export factory function for testing
export { createJobRoutes };
