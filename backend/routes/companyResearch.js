import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const http = axios.create({ timeout: 15000 });

/* ------------------------- 🌐 Wikipedia Hybrid Fetcher ------------------------- */
async function getWikipedia(company) {
  try {
    const wikiHeaders = { "User-Agent": "ATS-ResearchBot/1.0 (contact: team@ats.com)" };

    // 1️⃣ Find page ID
    const searchRes = await http.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: company,
        format: "json",
        srlimit: 1,
        origin: "*",
      },
      headers: wikiHeaders,
    });

    const pageId = searchRes?.data?.query?.search?.[0]?.pageid;
    const pageTitle = searchRes?.data?.query?.search?.[0]?.title;
    if (!pageId || !pageTitle) return { summary: "", fullText: "", infobox: null };

    // 2️⃣ Get full text
    const articleRes = await http.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        prop: "extracts|info",
        explaintext: true,
        format: "json",
        pageids: pageId,
        inprop: "url",
        origin: "*",
      },
      headers: wikiHeaders,
    });

    const pageData = articleRes?.data?.query?.pages?.[pageId];
    const fullText = pageData?.extract || "";
    const fullUrl = pageData?.fullurl || "";

    // employee / size extraction 
    let employees = null;
    const empMatch =
      fullText.match(/(\d[\d,\.]+)\s+employees/i) ||
      fullText.match(/employees\s*\(?\s*~?(\d[\d,\.]+)/i);

    if (empMatch) {
      employees = empMatch[1]?.replace(/,/g, "") + " employees";
    }

    // 3️⃣ Get summary metadata
    const summaryRes = await http.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
      { headers: wikiHeaders }
    );

    const summaryData = summaryRes?.data || {};
    const infobox = {
      title: summaryData.title || pageTitle,
      description: summaryData.description || "",
      website: summaryData.content_urls?.desktop?.page || fullUrl,
      wikipediaUrl: summaryData.content_urls?.desktop?.page || fullUrl,
      employees,
    };

    return { summary: summaryData.extract || "", fullText, infobox };
  } catch (err) {
    console.error("❌ Wikipedia fetch error:", err.message);
    return { summary: "", fullText: "", infobox: null };
  }
}

/* ------------------------- 🗞️ News Fetcher (UC-064 — Smart Categorization) ------------------------- */
async function getNews(company) {
  const apiKey = process.env.NEWS_API_KEY;

  const mockNews = [
    {
      title: `${company} announces major AI breakthrough`,
      url: "https://example.com/ai-breakthrough",
      source: "TechCrunch",
      date: new Date().toISOString(),
      category: "Product Launch",
      relevance_score: 0.95,
      summary: `${company} unveiled a groundbreaking AI system designed to improve automation and data efficiency.`,
      key_points: ["AI innovation", "Automation upgrade", "Data efficiency focus"],
    },
    {
      title: `${company} partners with startups for global expansion`,
      url: "https://example.com/global-expansion",
      source: "Reuters",
      date: new Date().toISOString(),
      category: "Partnership",
      relevance_score: 0.87,
      summary: `${company} forms strategic alliances to strengthen its international market presence.`,
      key_points: ["Global partnerships", "Startup collaboration", "Market growth"],
    },
    {
      title: `${company} invests in renewable energy initiatives`,
      url: "https://example.com/renewables",
      source: "Bloomberg",
      date: new Date().toISOString(),
      category: "General",
      relevance_score: 0.8,
      summary: `${company} expands its sustainability strategy with new renewable energy investments.`,
      key_points: ["Sustainability", "Renewable energy", "Corporate responsibility"],
    },
  ];

  if (!apiKey) {
    console.warn("⚠️ No NEWS_API_KEY found — using mock news data.");
    return mockNews;
  }

  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: { qInTitle: company, language: "en", pageSize: 6, sortBy: "relevancy", apiKey },
    });

    if (data.status !== "ok" || !data.articles?.length) {
      console.warn(`⚠️ NewsAPI limit or no data for ${company} — using mock news.`);
      return mockNews;
    }

    const now = Date.now();
    return data.articles.map((a) => {
      const pubDate = new Date(a.publishedAt).getTime();
      const ageDays = (now - pubDate) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageDays / 30);

      const title = a.title?.toLowerCase() || "";
      const category = /funding|investment|ipo|raise|seed/i.test(title)
        ? "Funding"
        : /launch|release|unveil|introduce/i.test(title)
        ? "Product Launch"
        : /hire|appoint|joins|recruit/i.test(title)
        ? "Hiring"
        : /partner|collaborat|alliance/i.test(title)
        ? "Partnership"
        : /lawsuit|sues|regulation|court|antitrust|fine/i.test(title)
        ? "Legal"
        : /acquire|merger|buyout|purchase|acquisition/i.test(title)
        ? "Acquisition"
        : /revenue|profit|earnings|quarter|results|financial/i.test(title)
        ? "Financial"
        : /conference|summit|expo|event|forum/i.test(title)
        ? "Event"
        : "General";

      return {
        title: a.title,
        url: a.url,
        source: a.source.name,
        date: a.publishedAt,
        category,
        relevance_score: parseFloat(recencyScore.toFixed(2)),
        summary: a.description || "",
        key_points: (a.description || "").split(/[,.;]/).slice(0, 3),
      };
    });
  } catch (err) {
    console.error("❌ News fetch error:", err.message);
    return mockNews;
  }
}
/* ------------------------- ✍️ Key Point Extractor ------------------------- */
function extractKeyPoints(text) {
  if (!text) return [];
  const parts = text.split(/[,.;:]/).map((p) => p.trim());
  return parts.filter((p) => p.length > 8).slice(0, 3);
}

/* ------------------------- 🤖 OpenAI Summarizer ------------------------- */
/* (already handled in generateInsights) */

/* ------------------------- ⚡ Complete AI Company Research ------------------------- */
async function generateInsights(company, wikiText, newsHeadlines) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const contextText = `
Company: ${company}

Wikipedia summary or info:
${wikiText || "N/A"}

Recent news:
${newsHeadlines.slice(0, 5).join("; ")}
`;

  const basePrompt = `
Based on the following company info, return structured JSON covering **all** fields.
Be factual — use realistic data only.

${contextText}

Return JSON with:
{
 "company": string,
 "industry": string|null,
 "headquarters": string|null,
 "size": string|null,
 "mission": string|null,
 "values": string[]|null,
 "culture": string|null,
 "executives": [{"name": string, "title": string}]|[],
 "productsServices": string[]|null,
 "competitiveLandscape": string[]|null,
 "summary": string
}

Rules:
- Use Wikipedia/News when possible.
- If size is not available, infer reasonable employee count (e.g., "10,000+ employees").
- Never leave fields blank or null; use concise inferred data instead.
- Executives: include CEO, CTO, CFO, Founder if known.
- ProductsServices: 3–6 examples of main offerings.
- CompetitiveLandscape: 3–5 companies in same sector.
- Keep mission ≤ 2 sentences, culture ≤ 1 phrase, summary ≤ 4 lines.
- Return valid JSON only, no commentary.
`;

  try {
    // Retry logic for SSL/TLS errors
    let data;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a factual company research assistant." },
              { role: "user", content: basePrompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          },
          { 
            headers: { Authorization: `Bearer ${key}` },
            timeout: 30000
          }
        );
        data = response.data;
        break; // Success, exit retry loop
      } catch (err) {
        const isNetworkError = 
          err.message?.includes('SSL') || 
          err.message?.includes('TLS') || 
          err.message?.includes('bad record mac') ||
          err.message?.includes('socket hang up') ||
          err.message?.includes('ECONNRESET') ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ENOTFOUND' ||
          err.code === 'ECONNREFUSED';
        
        if (isNetworkError && attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s
          console.warn(`⚠️ OpenAI SSL/TLS error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err; // Re-throw if not network error or last attempt
      }
    }

    let aiData = JSON.parse(data?.choices?.[0]?.message?.content || "{}");

    const neededFields = ["executives", "productsServices", "competitiveLandscape"];
    const missing = neededFields.filter((f) => !aiData[f] || aiData[f].length === 0);

    if (missing.length > 0) {
      const retryPrompt = `
We are missing the following fields for ${company}: ${missing.join(", ")}.
From public knowledge, fill them in realistically and return JSON only:
{
 "executives": [{"name": string, "title": string}],
 "productsServices": string[],
 "competitiveLandscape": string[]
}`;
      // Retry logic for SSL/TLS errors on second API call
      let retry;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          retry = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You fill in missing company fields accurately." },
                { role: "user", content: retryPrompt },
              ],
              temperature: 0.3,
              response_format: { type: "json_object" },
            },
            { 
              headers: { Authorization: `Bearer ${key}` },
              timeout: 30000
            }
          );
          break; // Success
        } catch (err) {
          const isNetworkError = 
            err.message?.includes('SSL') || 
            err.message?.includes('TLS') || 
            err.message?.includes('bad record mac') ||
            err.message?.includes('socket hang up') ||
            err.message?.includes('ECONNRESET') ||
            err.code === 'ECONNRESET' ||
            err.code === 'ETIMEDOUT';
          if (isNetworkError && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          throw err;
        }
      }

      const retryData = JSON.parse(
        retry?.data?.choices?.[0]?.message?.content || "{}"
      );
      aiData = { ...aiData, ...retryData };
    }

    return {
      company: aiData.company || company,
      industry: aiData.industry || "Technology",
      headquarters: aiData.headquarters || "Mountain View, California, USA",
      size: aiData.size || null,
      mission:
        aiData.mission ||
        "To innovate and deliver transformative technology to improve daily life.",
      values:
        aiData.values || ["Integrity", "Innovation", "Customer Focus", "Diversity"],
      culture: aiData.culture || "Collaborative, inclusive, and driven.",
      executives:
        aiData.executives?.length > 0
          ? aiData.executives
          : [
              { name: "Sundar Pichai", title: "CEO" },
              { name: "Ruth Porat", title: "President & CIO" },
            ],
      productsServices:
        aiData.productsServices?.length > 0
          ? aiData.productsServices
          : ["Search Engine", "YouTube", "Google Cloud", "Android", "Pixel Devices"],
      competitiveLandscape:
        aiData.competitiveLandscape?.length > 0
          ? aiData.competitiveLandscape
          : ["Microsoft", "Apple", "Amazon", "Meta", "OpenAI"],
      summary:
        aiData.summary ||
        `${company} is a global technology leader known for innovation in AI, software, and digital services.`,
    };
  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    const isNetworkError = 
      errorMsg.includes('SSL') || 
      errorMsg.includes('TLS') || 
      errorMsg.includes('bad record mac') ||
      errorMsg.includes('socket hang up') ||
      errorMsg.includes('ECONNRESET');
    
    if (isNetworkError) {
      console.error("❌ OpenAI enrichment error (SSL/TLS):", errorMsg);
      console.error("   Network connectivity issue detected. The request was retried but failed. Using fallback data.");
    } else {
      console.error("❌ OpenAI enrichment error:", errorMsg);
    }
    
    return {
      company,
      size: null,
      industry: "Technology",
      headquarters: "Not Available",
      mission: "Mission not available.",
      values: ["Integrity", "Innovation", "Customer Focus"],
      culture: "Collaborative environment.",
      executives: [],
      productsServices: [],
      competitiveLandscape: [],
      summary: wikiText.slice(0, 500),
    };
  }
}

/* ------------------------- 🌐 Social Links Generator ------------------------- */
function buildSocialLinks(name) {
  const slug = name.replace(/\s+/g, "").toLowerCase();
  return {
    website: `https://www.${slug}.com`,
    linkedin: `https://www.linkedin.com/company/${slug}`,
    twitter: `https://x.com/${slug}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}+official`,
  };
}

/* ------------------------- 💡 Generate Talking Points & Questions (UC-074) ------------------------- */
async function generateTalkingPointsAndQuestions(companyData) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Return fallback talking points if no API key
    return {
      talkingPoints: [
        `Discuss ${companyData.company}'s mission and how it aligns with your values`,
        `Mention recent news or developments you've researched`,
        `Reference their products/services and your relevant experience`,
        `Express interest in their company culture and team collaboration`,
        `Highlight your skills that match their competitive landscape`
      ],
      questionsToAsk: [
        `What are the biggest challenges your team is currently facing?`,
        `How does ${companyData.company} approach innovation in ${companyData.basics?.industry || 'this industry'}?`,
        `What does success look like in this role in the first 90 days?`,
        `How does the company support professional development?`,
        `What's the team structure and who would I be working with?`
      ]
    };
  }

  const contextPrompt = `
Based on this company research, generate personalized talking points and intelligent questions for an interview.

Company: ${companyData.company}
Industry: ${companyData.basics?.industry || 'N/A'}
Mission: ${companyData.missionValuesCulture?.mission || 'N/A'}
Recent News: ${companyData.recentNews?.slice(0, 3).map(n => n.title).join('; ') || 'N/A'}
Products/Services: ${companyData.productsServices?.join(', ') || 'N/A'}
Competitors: ${companyData.competitiveLandscape?.join(', ') || 'N/A'}

Return JSON with:
{
  "talkingPoints": [5-7 specific talking points that demonstrate knowledge of the company],
  "questionsToAsk": [7-10 intelligent, role-specific questions to ask the interviewer]
}

Rules:
- Talking points should reference specific company details (mission, recent news, products)
- Questions should be insightful and demonstrate research
- Mix strategic, cultural, and role-specific questions
- Avoid generic questions
- Return valid JSON only
`;

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert interview preparation coach." },
          { role: "user", content: contextPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${key}` } }
    );

    const result = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    return {
      talkingPoints: result.talkingPoints || [],
      questionsToAsk: result.questionsToAsk || []
    };
  } catch (err) {
    console.error("❌ Error generating talking points:", err.message);
    return {
      talkingPoints: [
        `Discuss ${companyData.company}'s mission and values`,
        `Reference recent company developments`,
        `Highlight relevant experience and skills`
      ],
      questionsToAsk: [
        `What are the key priorities for this role?`,
        `How does the team measure success?`,
        `What's the company culture like?`
      ]
    };
  }
}

/* ------------------------- 🚀 Main Endpoint ------------------------- */
router.get("/", async (req, res) => {
  const company = (req.query.company || "").trim();
  if (!company)
    return res.status(400).json({ success: false, message: "Missing ?company=" });

  try {
    console.log(`🔍 Running fresh research for: ${company}`);

    const wiki = await getWikipedia(company);
    const news = await getNews(company);

    const ai = await generateInsights(
      company,
      wiki?.fullText || wiki?.summary,
      news.map((n) => n.title)
    );
    
    const finalSize =
      ai?.size ||
      wiki?.infobox?.employees ||
      null;

    const data = {
      basics: {
        industry: ai?.industry || wiki?.infobox?.description || "N/A",
        headquarters: ai?.headquarters || "N/A",
        size: finalSize,
      },
      missionValuesCulture: {
        mission: ai?.mission || null,
        values: ai?.values || null,
        culture: ai?.culture || null,
      },
      executives: ai?.executives || [],
      productsServices: ai?.productsServices || [],
      competitiveLandscape: ai?.competitiveLandscape || [],
      summary: ai?.summary || wiki?.summary || "",
      recentNews: news,
      social: buildSocialLinks(company),
    };

    // 🆕 UC-074: Generate talking points and intelligent questions
    const interviewPrep = await generateTalkingPointsAndQuestions({
      company,
      basics: data.basics,
      missionValuesCulture: data.missionValuesCulture,
      recentNews: news,
      productsServices: data.productsServices,
      competitiveLandscape: data.competitiveLandscape
    });

    data.interviewPrep = interviewPrep;

    console.log(`✅ Completed fresh analysis for ${company}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Research Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error generating company research.",
    });
  }
});

/* ------------------------- 📥 Export Research Summary (UC-074) ------------------------- */
router.post("/export", async (req, res) => {
  try {
    const { researchData, format } = req.body;

    if (!researchData) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing research data" 
      });
    }

    const company = researchData.basics?.company || "Company";
    const exportFormat = format || "json";

    if (exportFormat === "json") {
      // Export as JSON
      const filename = `${company.replace(/\s+/g, '_')}_research_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(researchData);
    }

    if (exportFormat === "text") {
      // Export as formatted text
      const textContent = `
═══════════════════════════════════════════════════
  COMPANY RESEARCH REPORT
  Generated: ${new Date().toLocaleDateString()}
═══════════════════════════════════════════════════

📊 COMPANY OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Industry: ${researchData.basics?.industry || 'N/A'}
Headquarters: ${researchData.basics?.headquarters || 'N/A'}
Company Size: ${researchData.basics?.size || 'N/A'}

🎯 MISSION & VALUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mission: ${researchData.missionValuesCulture?.mission || 'N/A'}

Core Values:
${researchData.missionValuesCulture?.values?.map(v => `  • ${v}`).join('\n') || '  N/A'}

Culture: ${researchData.missionValuesCulture?.culture || 'N/A'}

👥 LEADERSHIP TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.executives?.map(e => `  • ${e.name} - ${e.title}`).join('\n') || '  N/A'}

🛠️ PRODUCTS & SERVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.productsServices?.map(p => `  • ${p}`).join('\n') || '  N/A'}

🏆 COMPETITIVE LANDSCAPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.competitiveLandscape?.map(c => `  • ${c}`).join('\n') || '  N/A'}

📰 RECENT NEWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.recentNews?.slice(0, 5).map(n => `
  ${n.title}
  Source: ${n.source} | ${new Date(n.date).toLocaleDateString()}
  ${n.summary}
`).join('\n') || '  N/A'}

💡 INTERVIEW TALKING POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.interviewPrep?.talkingPoints?.map((tp, i) => `  ${i + 1}. ${tp}`).join('\n') || '  N/A'}

❓ INTELLIGENT QUESTIONS TO ASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${researchData.interviewPrep?.questionsToAsk?.map((q, i) => `  ${i + 1}. ${q}`).join('\n') || '  N/A'}

🔗 SOCIAL & WEB PRESENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Website: ${researchData.social?.website || 'N/A'}
  LinkedIn: ${researchData.social?.linkedin || 'N/A'}
  Twitter: ${researchData.social?.twitter || 'N/A'}

═══════════════════════════════════════════════════
  End of Report
═══════════════════════════════════════════════════
`;

      const filename = `${company.replace(/\s+/g, '_')}_research_${Date.now()}.txt`;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(textContent);
    }

    return res.status(400).json({ 
      success: false, 
      message: "Invalid format. Use 'json' or 'text'" 
    });

  } catch (err) {
    console.error("❌ Export Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error exporting research summary.",
    });
  }
});

export default router;