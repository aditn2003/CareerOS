// backend/services/qualityScoringService.js
// UC-122: Application Package Quality Scoring - AI Analysis Engine

import { Pool } from "pg";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load mammoth for DOCX parsing
let mammoth;
(async () => {
  try {
    const mod = await import("mammoth");
    mammoth = mod.default || mod;
  } catch {
    console.warn("⚠️ DOCX parsing disabled (mammoth not available)");
  }
})();

/**
 * Factory function for Quality Scoring Service
 * @param {OpenAI} openaiClient - OpenAI client
 * @param {Pool} dbPool - PostgreSQL connection pool
 */
export function createQualityScoringService(openaiClient = null, dbPool = null) {
  const pool = dbPool || new Pool({ connectionString: process.env.DATABASE_URL });
  const openai = openaiClient || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Helper function for retry logic with exponential backoff
  async function callOpenAIWithRetry(messages, maxRetries = 3) {
    let retryCount = 0;
    let lastError = null;
    
    // Check if messages contain images (vision API needed)
    const hasImages = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === "image_url")
    );
    
    // Use vision model if images are present
    const model = hasImages ? "gpt-4o" : "gpt-4o-mini";
    
    if (hasImages) {
      console.log(`🖼️ [QUALITY SCORING] Using vision model (${model}) for PDF analysis`);
    }
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🤖 [QUALITY SCORING] Attempting OpenAI API call (attempt ${retryCount + 1}/${maxRetries})...`);
        const response = await openai.chat.completions.create({
          model: model,
          messages: messages,
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 4000,
        });
        
        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("OpenAI returned empty response");
        }
        
        return content;
      } catch (apiError) {
        lastError = apiError;
        retryCount++;
        
        const isRateLimit = apiError.status === 429 || 
                           apiError.message?.includes("429") || 
                           apiError.message?.includes("quota") ||
                           apiError.message?.includes("rate limit") ||
                           apiError.message?.includes("rate_limit_exceeded");
        
        const isNetworkError = 
          apiError.message?.includes('SSL') || 
          apiError.message?.includes('TLS') || 
          apiError.message?.includes('bad record mac') ||
          apiError.message?.includes('socket hang up') ||
          apiError.message?.includes('ECONNRESET') ||
          apiError.code === 'ECONNRESET' ||
          apiError.code === 'ETIMEDOUT' ||
          apiError.code === 'ENOTFOUND' ||
          apiError.code === 'ECONNREFUSED';
        
        if ((isRateLimit || isNetworkError) && retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.warn(`⚠️ [QUALITY SCORING] API error (${isRateLimit ? 'rate limit' : 'network'}). Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw apiError;
      }
    }
    
    throw lastError || new Error("Failed to call OpenAI API after retries");
  }

  /**
   * Extract text from PDF buffer
   */
  async function extractPdfText(buffer) {
    try {
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      let textContent = "";
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        textContent += content.items.map((t) => t.str).join(" ") + "\n";
      }
      return textContent.trim();
    } catch (err) {
      console.error("❌ PDF extraction error:", err);
      return "";
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  async function extractDocxText(buffer) {
    if (!mammoth) {
      console.warn("⚠️ Mammoth not available, cannot extract DOCX text");
      return "";
    }
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    } catch (err) {
      console.error("❌ DOCX extraction error:", err);
      return "";
    }
  }

  /**
   * Convert PDF pages to base64 images for vision API using puppeteer and pdfjs-dist
   */
  async function convertPdfToImages(filePath) {
    let browser = null;
    try {
      console.log(`🖼️ [QUALITY SCORING] Converting PDF to images: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ [QUALITY SCORING] PDF file not found: ${filePath}`);
        return [];
      }

      // Read PDF as base64 for embedding in HTML
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfBase64 = pdfBuffer.toString('base64');
      const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
      
      // Get PDF page count
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      
      console.log(`📄 [QUALITY SCORING] PDF has ${numPages} page(s)`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      const images = [];
      
      // Create HTML page with pdfjs-dist to render PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; background: white; }
    canvas { display: block; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <canvas id="pdf-canvas"></canvas>
  <script>
    const pdfjsLib = window['pdfjs-dist'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdfDataUri = '${pdfDataUri}';
    const pageNum = parseInt(new URLSearchParams(window.location.search).get('page') || '1');
    
    pdfjsLib.getDocument(pdfDataUri).promise.then(function(pdf) {
      return pdf.getPage(pageNum);
    }).then(function(page) {
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.getElementById('pdf-canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      page.render(renderContext).promise.then(function() {
        window.pdfReady = true;
      });
    });
  </script>
</body>
</html>`;
      
      // Convert each page to image
      for (let i = 1; i <= numPages; i++) {
        try {
          // Set content with page number
          const pageHtml = htmlContent.replace("const pageNum = parseInt(new URLSearchParams(window.location.search).get('page') || '1');", `const pageNum = ${i};`);
          await page.setContent(pageHtml, {
            waitUntil: 'networkidle0'
          });
          
          // Wait for PDF to render
          await page.waitForFunction('window.pdfReady === true', { timeout: 10000 });
          await page.waitForTimeout(500); // Extra wait for rendering
          
          // Set viewport for better quality
          await page.setViewport({ width: 1654, height: 2339, deviceScaleFactor: 2 });
          
          // Take screenshot of canvas
          const screenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64',
            clip: { x: 0, y: 0, width: 1654, height: 2339 }
          });
          
          images.push({
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${screenshot}`
            }
          });
          
          console.log(`✅ [QUALITY SCORING] Converted page ${i}/${numPages} to image`);
        } catch (pageErr) {
          console.error(`❌ [QUALITY SCORING] Error converting page ${i}:`, pageErr.message);
          // Continue with next page
        }
      }
      
      if (browser) {
        await browser.close();
      }
      console.log(`✅ [QUALITY SCORING] Converted ${images.length} PDF page(s) to images`);
      
      return images;
    } catch (err) {
      console.error("❌ [QUALITY SCORING] Error converting PDF to images:", err);
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          // Ignore close errors
        }
      }
      return [];
    }
  }

  /**
   * 2.1 Aggregate Application Materials
   * Fetches resume, cover letter, and LinkedIn data for a job application
   */
  async function aggregateApplicationMaterials(jobId, userId) {
    try {
      console.log(`📋 [QUALITY SCORING] Fetching job ${jobId} for user ${userId}`);
      
      // Fetch job details
      const jobResult = await pool.query(
        `SELECT id, title, company, description, required_skills 
         FROM jobs 
         WHERE id = $1 AND user_id = $2`,
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${jobId} not found for user ${userId}`);
      }

      const job = jobResult.rows[0];
      console.log(`✅ [QUALITY SCORING] Job found: ${job.title} at ${job.company}`);

      // Fetch job materials (resume_id, cover_letter_id)
      // First try job_materials table, then fallback to jobs table if needed
      let materials = {};
      
      const materialsResult = await pool.query(
        `SELECT resume_id, cover_letter_id 
         FROM job_materials 
         WHERE job_id = $1 AND user_id = $2`,
        [jobId, userId]
      );

      if (materialsResult.rows.length > 0) {
        materials = materialsResult.rows[0];
      } else {
        // Fallback: Check if materials are stored directly in jobs table
        const jobMaterialsResult = await pool.query(
          `SELECT resume_id, cover_letter_id 
           FROM jobs 
           WHERE id = $1 AND user_id = $2`,
          [jobId, userId]
        );
        
        if (jobMaterialsResult.rows.length > 0) {
          materials = jobMaterialsResult.rows[0];
          console.log(`⚠️ [QUALITY SCORING] Materials found in jobs table (not in job_materials). Consider migrating.`);
        } else {
          console.warn(`⚠️ [QUALITY SCORING] No materials found for job ${jobId}. Resume and cover letter may not be linked.`);
        }
      }

      // Fetch resume data
      let resumeData = null;
      if (materials.resume_id) {
        const resumeResult = await pool.query(
          `SELECT id, title, sections, format, file_url 
           FROM resumes 
           WHERE id = $1 AND user_id = $2`,
          [materials.resume_id, userId]
        );

        if (resumeResult.rows.length > 0) {
          const resume = resumeResult.rows[0];
          
          // Parse sections safely
          let parsedSections = null;
          if (resume.sections) {
            try {
              parsedSections = typeof resume.sections === 'string' 
                ? JSON.parse(resume.sections) 
                : resume.sections;
            } catch (parseErr) {
              console.warn(`⚠️ [QUALITY SCORING] Failed to parse resume sections for resume ${resume.id}:`, parseErr.message);
              parsedSections = null;
            }
          }
          
          resumeData = {
            id: resume.id,
            title: resume.title,
            sections: parsedSections,
            format: resume.format,
            file_url: resume.file_url,
            text: null
          };

          // If sections are missing but file exists, extract text
          if (!resumeData.sections && resume.file_url) {
            const filePath = path.join(__dirname, "..", resume.file_url);
            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              if (resume.format === 'pdf') {
                resumeData.text = await extractPdfText(buffer);
              } else if (resume.format === 'docx' || resume.format === 'doc') {
                resumeData.text = await extractDocxText(buffer);
              } else if (resume.format === 'txt') {
                resumeData.text = buffer.toString('utf-8');
              }
            }
          }
        }
      }

      // Fetch cover letter data
      let coverLetterData = null;
      if (materials.cover_letter_id) {
        console.log(`✉️ [QUALITY SCORING] Fetching cover letter ${materials.cover_letter_id} for job ${jobId}`);
        
        // Try uploaded_cover_letters table first (newer table structure)
        let coverLetterResult;
        try {
          coverLetterResult = await pool.query(
            `SELECT id, title, content, format, file_url 
             FROM uploaded_cover_letters 
             WHERE id = $1 AND user_id = $2`,
            [materials.cover_letter_id, userId]
          );
          console.log(`✅ [QUALITY SCORING] Found cover letter in uploaded_cover_letters table`);
        } catch (err) {
          // If uploaded_cover_letters doesn't exist or fails, try cover_letters table
          if (err.code === '42P01' || err.code === '42703' || err.message?.includes('does not exist')) {
            console.log(`⚠️ [QUALITY SCORING] uploaded_cover_letters query failed, trying cover_letters table...`);
            try {
              // Try with title column first
              coverLetterResult = await pool.query(
                `SELECT id, title, content, format, file_url 
                 FROM cover_letters 
                 WHERE id = $1 AND user_id = $2`,
                [materials.cover_letter_id, userId]
              );
              console.log(`✅ [QUALITY SCORING] Found cover letter in cover_letters table (with title)`);
            } catch (err2) {
              // If title doesn't exist, try with name column
              if (err2.code === '42703') {
                console.log(`⚠️ [QUALITY SCORING] title column not found, trying with name column...`);
                coverLetterResult = await pool.query(
                  `SELECT id, name as title, content, format, file_url 
                   FROM cover_letters 
                   WHERE id = $1 AND user_id = $2`,
                  [materials.cover_letter_id, userId]
                );
                console.log(`✅ [QUALITY SCORING] Found cover letter in cover_letters table (with name)`);
              } else {
                throw err2;
              }
            }
          } else {
            throw err;
          }
        }

        if (coverLetterResult.rows.length > 0) {
          const coverLetter = coverLetterResult.rows[0];
          coverLetterData = {
            id: coverLetter.id,
            title: coverLetter.title || `Cover Letter ${coverLetter.id}`,
            content: coverLetter.content,
            format: coverLetter.format || 'pdf',
            file_url: coverLetter.file_url,
            text: coverLetter.content || null
          };

          // If content is missing but file exists, extract text
          if (!coverLetterData.text && coverLetter.file_url) {
            try {
              const filePath = path.join(__dirname, "..", coverLetter.file_url);
              console.log(`✉️ [QUALITY SCORING] Attempting to read cover letter file: ${filePath}`);
              if (fs.existsSync(filePath)) {
                const buffer = fs.readFileSync(filePath);
                if (coverLetter.format === 'pdf') {
                  coverLetterData.text = await extractPdfText(buffer);
                } else if (coverLetter.format === 'docx' || coverLetter.format === 'doc') {
                  coverLetterData.text = await extractDocxText(buffer);
                } else if (coverLetter.format === 'txt') {
                  coverLetterData.text = buffer.toString('utf-8');
                }
                console.log(`✅ [QUALITY SCORING] Extracted ${coverLetterData.text?.length || 0} characters from cover letter file`);
              } else {
                console.warn(`⚠️ [QUALITY SCORING] Cover letter file not found at: ${filePath}`);
              }
            } catch (fileErr) {
              console.error(`❌ [QUALITY SCORING] Error reading cover letter file:`, fileErr);
              // Continue without text extraction
            }
          }
        }
      }

      // TODO: Fetch LinkedIn profile data (if available)
      let linkedInData = null;

      // Log what materials were found
      if (!resumeData && !coverLetterData) {
        console.warn(`⚠️ [QUALITY SCORING] No application materials found for job ${jobId}. Analysis may be incomplete.`);
      } else {
        console.log(`✅ [QUALITY SCORING] Materials found: Resume=${resumeData ? `Yes (ID: ${resumeData.id})` : 'No'}, Cover Letter=${coverLetterData ? `Yes (ID: ${coverLetterData.id})` : 'No'}`);
      }

      return {
        job,
        resume: resumeData,
        coverLetter: coverLetterData,
        linkedIn: linkedInData
      };
    } catch (err) {
      console.error("❌ [QUALITY SCORING] Error aggregating application materials:", err);
      console.error("❌ [QUALITY SCORING] Error stack:", err.stack);
      throw err;
    }
  }

  /**
   * 2.2 Analyze Job Description
   * Extracts keywords, skills, and requirements from job description
   */
  function analyzeJobDescription(jobDescription, requiredSkills = []) {
    if (!jobDescription) {
      return {
        keywords: [],
        skills: requiredSkills || [],
        requirements: [],
        qualifications: []
      };
    }

    // Basic keyword extraction (can be enhanced with NLP)
    const text = jobDescription.toLowerCase();
    
    // Common technical skills keywords
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'docker',
      'kubernetes', 'typescript', 'angular', 'vue', 'mongodb', 'postgresql',
      'git', 'agile', 'scrum', 'ci/cd', 'rest', 'api', 'graphql', 'microservices'
    ];

    // Extract mentioned skills
    const foundSkills = techKeywords.filter(keyword => text.includes(keyword));
    
    // Combine with required_skills from database
    const allSkills = [...new Set([...requiredSkills, ...foundSkills])];

    // Extract common requirement patterns
    const requirements = [];
    const requirementPatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?experience/gi,
      /bachelor'?s?\s*(?:degree|in)/gi,
      /master'?s?\s*(?:degree|in)/gi,
      /phd|doctorate/gi,
      /certification/gi
    ];

    requirementPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern);
      if (matches) {
        requirements.push(...matches);
      }
    });

    return {
      keywords: foundSkills,
      skills: allSkills,
      requirements: [...new Set(requirements)],
      qualifications: [] // Can be enhanced with AI extraction
    };
  }

  /**
   * 2.3 Generate Quality Score Messages for OpenAI
   */
  async function generateQualityScoreMessages(materials, jobDescription) {
    const { job, resume, coverLetter, linkedIn } = materials;
    
    // Check if resume has PDF file and convert to images
    let resumeImages = [];
    let resumeText = resume?.sections 
      ? JSON.stringify(resume.sections, null, 2)
      : resume?.text || "Resume not provided";
    
    // If resume has a PDF file_url, convert it to images for vision API
    if (resume?.file_url && resume?.format === 'pdf') {
      try {
        const filePath = path.join(__dirname, "..", resume.file_url);
        if (fs.existsSync(filePath)) {
          console.log(`🖼️ [QUALITY SCORING] Converting resume PDF to images for vision analysis`);
          resumeImages = await convertPdfToImages(filePath);
          
          // Also extract text as fallback/context
          if (!resumeText || resumeText === "Resume not provided" || resumeText === "{}") {
            const buffer = fs.readFileSync(filePath);
            resumeText = await extractPdfText(buffer);
          }
        }
      } catch (err) {
        console.error(`❌ [QUALITY SCORING] Error processing resume PDF:`, err);
        // Continue with text extraction
      }
    }
    
    const coverLetterText = coverLetter?.content || coverLetter?.text || "Cover letter not provided";
    
    // Count skills and experiences from resume sections
    let skillCount = 0;
    let experienceCount = 0;
    let totalBullets = 0;
    
    if (resume?.sections) {
      // Count skills - extract all skills first to get accurate count
      const allSkills = extractSkillsFromResume(resume);
      skillCount = allSkills.length;
      
      // Fallback: if extraction didn't work, try manual counting
      if (skillCount === 0 && resume.sections.skills) {
        if (Array.isArray(resume.sections.skills)) {
          skillCount = resume.sections.skills.length;
        } else if (typeof resume.sections.skills === 'string') {
          skillCount = resume.sections.skills.split(',').length;
        } else if (typeof resume.sections.skills === 'object') {
          // Count skills in categorized format
          Object.values(resume.sections.skills).forEach(category => {
            if (Array.isArray(category)) {
              skillCount += category.length;
            } else if (typeof category === 'string') {
              skillCount += category.split(',').length;
            }
          });
        }
      }
      
      // Count work experiences
      if (resume.sections.experience && Array.isArray(resume.sections.experience)) {
        experienceCount = resume.sections.experience.length;
        resume.sections.experience.forEach(exp => {
          if (exp.description) {
            const bullets = typeof exp.description === 'string' 
              ? exp.description.split('\n').filter(b => b.trim())
              : Array.isArray(exp.description) ? exp.description : [];
            totalBullets += bullets.length;
          }
        });
      }
    }
    
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst and career coach specializing in application package quality assessment. You provide comprehensive, actionable feedback to help candidates improve their job applications. You MUST be very strict and differentiate clearly between sparse and comprehensive resumes.`;

    const userPrompt = `Analyze the following job application package and provide a comprehensive quality score with detailed feedback.

**CRITICAL ANALYSIS REQUIREMENTS:**
1. COUNT the actual number of skills in the resume (found: ${skillCount} skills)
2. COUNT the actual number of work experiences (found: ${experienceCount} experiences)
3. COUNT the total bullet points across all jobs (found: ${totalBullets} total bullets)
4. Base ALL scoring on how well the resume matches THIS SPECIFIC JOB DESCRIPTION
5. **MINIMUM SCORE RULES - CRITICAL**:
   - If resume has ${skillCount} skills (even if not all match), skills_alignment MUST be at least 30 (NEVER give 0 unless resume has ZERO skills)
   - If resume has ${experienceCount} experience(s) (even if not perfectly relevant), experience_relevance MUST be at least 30 (NEVER give 0 unless resume has ZERO experience)
   - Only give 0 scores when there is ABSOLUTELY NO content (no skills at all = 0 for skills_alignment, no experience at all = 0 for experience_relevance)
6. A resume with ${experienceCount} experience(s) and ${totalBullets} bullet points is ${experienceCount === 1 && totalBullets < 5 ? 'SPARSE' : experienceCount >= 3 && totalBullets >= 15 ? 'COMPREHENSIVE' : 'MODERATE'}

**CRITICAL: SKILL AND KEYWORD MATCHING RULES:**
- BEFORE listing a skill as "missing", you MUST search the ENTIRE resume text thoroughly
- Skills can appear in: skills section, technical_skills section, experience descriptions, project descriptions, education section
- Use CASE-INSENSITIVE matching (e.g., "Python" matches "python", "PYTHON", "Python programming")
- Use PARTIAL matching (e.g., "React" matches "React.js", "React Native", "React development")
- Use VARIATION matching (e.g., "AWS" matches "Amazon Web Services", "AWS Cloud", "AWS services")
- If a skill appears ANYWHERE in the resume (even once), it is NOT missing
- Keywords are 2-5 word phrases - search for the ENTIRE phrase in the resume text
- Only list skills/keywords as missing if you are ABSOLUTELY CERTAIN they are not present

JOB INFORMATION:
Title: ${job.title}
Company: ${job.company}
Job Description:
${job.description}

REQUIRED SKILLS: ${job.required_skills ? JSON.stringify(job.required_skills) : "Not specified"}

APPLICATION MATERIALS:

RESUME:
${resumeText}

COVER LETTER:
${coverLetterText}

${linkedIn ? `LINKEDIN PROFILE:\n${JSON.stringify(linkedIn, null, 2)}` : "LinkedIn profile not provided."}

TASK:
Analyze the application package and provide a JSON response with the following exact structure:

{
  "overall_score": 75,
  "resume_score": 80,
  "cover_letter_score": 70,
  "linkedin_score": null,
  "score_breakdown": {
    "keyword_match": 85,
    "skills_alignment": 70,
    "experience_relevance": 80,
    "formatting_quality": 90,
    "quantification": 75,
    "ats_optimization": 80,
    "cover_letter_customization": 70,
    "professional_tone": 85
  },
  "missing_keywords": ["React development", "TypeScript programming", "Agile methodology", "RESTful API design"],
  "missing_skills": ["AWS", "Docker", "Kubernetes", "PostgreSQL"],
  "formatting_issues": [
    {
      "type": "typo",
      "location": "resume.summary",
      "issue": "Incorrect spelling: 'expirience' should be 'experience'",
      "severity": "high"
    },
    {
      "type": "inconsistency",
      "location": "resume.dates",
      "issue": "Date format inconsistent (some use MM/YYYY, others use YYYY-MM)",
      "severity": "medium"
    }
  ],
  "inconsistencies": [
    {
      "type": "date_mismatch",
      "location": "resume vs cover_letter",
      "issue": "Employment dates don't match between resume and cover letter",
      "severity": "medium"
    }
  ],
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "keywords",
      "suggestion": "Add 'React' and 'TypeScript' to resume skills section to match job requirements",
      "impact": "Could increase keyword match by 10 points",
      "estimated_score_improvement": 5
    },
    {
      "priority": "high",
      "category": "formatting",
      "suggestion": "Fix typo in summary: 'expirience' → 'experience'",
      "impact": "Improves professionalism and ATS parsing",
      "estimated_score_improvement": 2
    },
    {
      "priority": "medium",
      "category": "quantification",
      "suggestion": "Add metrics to 'Led team' bullet point (e.g., 'Led team of 5 engineers')",
      "impact": "Improves ATS parsing and demonstrates impact",
      "estimated_score_improvement": 3
    },
    {
      "priority": "medium",
      "category": "cover_letter",
      "suggestion": "Mention specific company values or recent news to show research",
      "impact": "Demonstrates genuine interest and customization",
      "estimated_score_improvement": 4
    }
  ]
}

SCORING CRITERIA (BE VERY STRICT - Score must be based on JOB DESCRIPTION requirements and resume comprehensiveness):
1. **Keyword Match (0-100)**: Percentage of job description KEYWORD PHRASES (2-5 words) found in application materials
   - Keywords are PHRASES like "machine learning", "data pipeline", "cloud infrastructure", "agile development", "RESTful API design"
   - Keywords are NOT single words - those are skills
   - Extract 2-5 word phrases from job description that represent concepts, methodologies, or domain knowledge
   - 90-100: 90%+ keyword phrases present, excellent match
   - 70-89: 70-89% keyword phrases present, good match
   - 50-69: 50-69% keyword phrases present, moderate match
   - 30-49: 30-49% keyword phrases present, weak match
   - 0-29: Less than 30% keyword phrases present, poor match

2. **Skills Alignment (0-100)**: How well applicant's TECHNICAL SKILLS (single words/tools) match required skills FROM THE JOB DESCRIPTION
   - Skills are SINGLE WORDS or TOOL NAMES like "Python", "React", "AWS", "Docker", "SQL", "JavaScript"
   - Skills are NOT phrases - those are keywords
   - Extract specific technical tools, languages, frameworks, and technologies from job description
   - **IMPORTANT**: Calculate percentage of required skills present: (matched_skills / required_skills) × 100
   - **MINIMUM SCORE RULE**: If resume has skills present, minimum score is 30 (never give 0 unless resume has NO skills at all)
   - 90-100: All or nearly all required skills present (90%+ match), plus additional relevant skills (15+ total skills)
   - 70-89: Most required skills present (70-89% match), 10-14 total skills, good alignment
   - 50-69: Some required skills present (50-69% match), 6-9 total skills, moderate alignment
   - 30-49: Few required skills present (30-49% match), 3-5 total skills, weak alignment
   - 20-29: Very few required skills present (10-29% match), 2-3 total skills
   - 0-19: No required skills present (0-9% match) OR resume has <2 total skills

3. **Experience Relevance (0-100)**: How relevant past experience is to the job
   - **MINIMUM SCORE RULE**: If resume has ANY work experience, minimum score is 30 (never give 0 unless resume has NO experience at all)
   - 90-100: Highly relevant, direct experience in same role/industry, 3+ detailed work experiences (5+ bullets each)
   - 70-89: Relevant, transferable experience, 2-3 work experiences with good detail (3-4 bullets each)
   - 50-69: Somewhat relevant, some transferable skills, 1-2 work experiences with basic detail (2-3 bullets each)
   - 30-49: Limited relevance, minimal transferable skills, 1 work experience with sparse detail (<2 bullets)
   - 20-29: Not very relevant, unrelated experience, but some transferable skills present
   - 0-19: No work experience at all OR completely unrelated with no transferable skills

4. **Formatting Quality (0-100)**: Professional formatting, no typos, consistent style
   - 90-100: Perfect formatting, no errors, professional appearance
   - 70-89: Good formatting, minor issues
   - 50-69: Acceptable formatting, some issues present
   - 30-49: Poor formatting, multiple issues
   - 0-29: Very poor formatting, many errors, unprofessional

5. **Quantification (0-100)**: Presence of metrics and quantified achievements
   - 90-100: Extensive use of metrics, numbers, percentages throughout
   - 70-89: Good use of metrics in most sections
   - 50-69: Some metrics present, but inconsistent
   - 30-49: Few metrics, mostly qualitative descriptions
   - 0-29: No metrics, all qualitative descriptions

6. **ATS Optimization (0-100)**: How well formatted for ATS parsing
   - 90-100: Perfect ATS formatting, standard sections, clean structure
   - 70-89: Good ATS formatting, minor issues
   - 50-69: Acceptable ATS formatting, some issues
   - 30-49: Poor ATS formatting, may not parse well
   - 0-29: Very poor ATS formatting, likely to be rejected

7. **Cover Letter Customization (0-100)**: Job-specific content vs generic template
   - 90-100: Highly customized, mentions specific company details, role requirements
   - 70-89: Well customized, some company-specific content
   - 50-69: Some customization, mostly generic
   - 30-49: Minimal customization, very generic
   - 0-29: No customization, clearly a template

8. **Professional Tone (0-100)**: Appropriate language and tone
   - 90-100: Excellent professional tone, polished language
   - 70-89: Good professional tone, minor issues
   - 50-69: Acceptable tone, some issues
   - 30-49: Unprofessional tone, multiple issues
   - 0-29: Very unprofessional tone, inappropriate language

SCORING PENALTIES (Apply these STRICTLY to reduce scores - These are MANDATORY):
- **CRITICAL**: Resume with only 5 or fewer skills: -40 to -50 points from overall score (MAX overall score 55)
- **CRITICAL**: Resume with fewer than 8 skills: -30 to -40 points from overall score (MAX overall score 65)
- **CRITICAL**: Resume with only 1 work experience: -25 to -35 points from overall score
- **CRITICAL**: Resume with fewer than 3 bullet points per job: -15 to -20 points
- **CRITICAL**: If job requires many skills but resume has few: -20 to -30 additional points
- **CRITICAL**: If resume skills don't match job requirements: -15 to -25 points
- Each formatting issue (typo, inconsistency): -5 to -10 points
- Each missing critical keyword: -3 to -5 points
- Each missing required skill: -5 to -10 points
- Generic cover letter (no customization): -15 to -20 points
- Poor formatting quality: -10 to -20 points
- Lack of quantification: -10 to -15 points
- Missing education section: -5 to -10 points
- Missing projects/certifications when relevant: -5 to -10 points

SCORING REWARDS (Apply these to increase scores):
- Resume with 15+ skills: +10 to +15 points
- Resume with 3+ detailed work experiences (5+ bullets each): +10 to +15 points
- Resume with 5+ quantified achievements: +10 to +15 points
- Comprehensive resume (all sections filled, detailed content): +10 to +20 points

IMPORTANT SCORING RULES (MANDATORY - Follow these exactly):
- **CRITICAL**: A sparse resume (5 skills, 1 job, minimal detail) should score 40-55, NEVER above 60
- **CRITICAL**: A comprehensive resume (15+ skills, 3+ jobs, detailed bullets) should score 75-90, significantly higher than sparse resumes
- **DIFFERENTIATION**: There MUST be a clear 30-40 point difference between sparse and comprehensive resumes
- **JOB-SPECIFIC**: Score must be based on how well resume matches THIS SPECIFIC job description and required skills
- **MANDATORY CALCULATION**: 
  * Count required skills from job description: ${job.required_skills ? job.required_skills.length : 'unknown'}
  * Count skills in resume: ${skillCount}
  * If resume has fewer than 50% of required skills, overall score cannot exceed 60
  * If resume has fewer than 30% of required skills, overall score cannot exceed 50
- BE VERY STRICT: Most average resumes should score 50-65, good resumes 65-75, excellent resumes 75-85, exceptional resumes 85-95
- Sparse/incomplete resumes should score 40-55
- If resume doesn't match job requirements well, score should be 50-65 even if formatting is good
- All scores must be integers between 0 and 100
- Overall score should be a weighted average (resume 60%, cover letter 30%, LinkedIn 10% if available)
- Apply penalties for formatting issues, missing keywords, and poor customization
- **CRITICAL**: Missing keywords must be 2-5 word PHRASES representing concepts/methodologies (e.g., "machine learning", "data pipeline", "cloud infrastructure", "agile development", "RESTful API design")
- **CRITICAL**: Missing skills must be SINGLE WORDS or TOOL NAMES (e.g., "Python", "AWS", "Docker", "SQL", "React", "JavaScript")
- **CRITICAL**: Keywords and skills must NOT overlap - if "Python" is a missing skill, do NOT also include "Python programming" as a missing keyword
- **CRITICAL**: Extract keywords as phrases from job description (2-5 words), extract skills as single technical terms
- Missing keywords and skills should be specific and actionable
- Formatting issues should include exact location and fix
- Improvement suggestions must be prioritized (high/medium/low) and include estimated impact
- Return ONLY valid JSON, no markdown formatting or additional text`;

    // Build user message content
    const userMessageContent = [];
    
    // Add text content
    userMessageContent.push({
      type: "text",
      text: userPrompt
    });
    
    // Add resume images if available
    if (resumeImages.length > 0) {
      console.log(`🖼️ [QUALITY SCORING] Adding ${resumeImages.length} resume image(s) to vision API`);
      userMessageContent.push(...resumeImages);
    }
    
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessageContent.length === 1 ? userPrompt : userMessageContent }
    ];
  }

  /**
   * Helper: Extract all skills from resume (from sections or text)
   */
  function extractSkillsFromResume(resume) {
    const skills = [];
    
    // Helper to add skill(s) to array
    const addSkill = (skill) => {
      if (!skill) return;
      if (typeof skill === 'string') {
        // Handle comma-separated skills
        skill.split(/[,;|•\n]/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed && trimmed.length > 1) {
            skills.push(trimmed);
          }
        });
      } else if (skill.name) {
        skills.push(skill.name);
      }
    };
    
    // Extract from sections.skills if available
    if (resume.sections?.skills) {
      if (Array.isArray(resume.sections.skills)) {
        resume.sections.skills.forEach(addSkill);
      } else if (typeof resume.sections.skills === 'string') {
        addSkill(resume.sections.skills);
      } else if (typeof resume.sections.skills === 'object') {
        // Handle categorized skills (e.g., { "Programming Languages": ["Python", "Java"], ... })
        Object.values(resume.sections.skills).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(addSkill);
          } else if (typeof category === 'string') {
            addSkill(category);
          }
        });
      }
    }
    
    // Extract from technical_skills if present (often categorized)
    if (resume.sections?.technical_skills) {
      if (Array.isArray(resume.sections.technical_skills)) {
        resume.sections.technical_skills.forEach(addSkill);
      } else if (typeof resume.sections.technical_skills === 'object') {
        // Handle categorized technical skills
        Object.values(resume.sections.technical_skills).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(addSkill);
          } else if (typeof category === 'string') {
            addSkill(category);
          }
        });
      } else if (typeof resume.sections.technical_skills === 'string') {
        addSkill(resume.sections.technical_skills);
      }
    }
    
    // Extract from text if available (look for common skill patterns)
    if (resume.text) {
      // Common skill patterns in resumes - look for categorized sections
      const skillPatterns = [
        /(?:programming languages?|languages?)[:\s]+([^:]+?)(?:\n|$)/i,
        /(?:libraries?\s*&\s*frameworks?|frameworks?|libraries?)[:\s]+([^:]+?)(?:\n|$)/i,
        /(?:data tools?\s*&\s*platforms?|tools?\s*&\s*platforms?|platforms?)[:\s]+([^:]+?)(?:\n|$)/i,
        /(?:technologies?|tools?)[:\s]+([^:]+?)(?:\n|$)/i,
        /(?:skills?)[:\s]+([^:]+?)(?:\n|$)/i,
      ];
      
      skillPatterns.forEach(pattern => {
        const matches = resume.text.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
          if (match[1]) {
            match[1].split(/[,;|•\n]/).forEach(s => {
              const trimmed = s.trim();
              if (trimmed && trimmed.length > 1 && trimmed.length < 50) {
                skills.push(trimmed);
              }
            });
          }
        }
      });
    }
    
    return [...new Set(skills)]; // Remove duplicates
  }
  
  /**
   * Helper: Get full resume text for keyword matching
   */
  function getResumeText(resume) {
    if (resume.text) return resume.text;
    
    // Build text from sections
    let text = '';
    if (resume.sections) {
      if (resume.sections.summary?.bio) text += resume.sections.summary.bio + ' ';
      if (resume.sections.summary?.title) text += resume.sections.summary.title + ' ';
      
      // Extract all skills (including categorized)
      const allSkills = extractSkillsFromResume(resume);
      if (allSkills.length > 0) {
        text += allSkills.join(' ') + ' ';
      }
      
      if (resume.sections.experience) {
        resume.sections.experience.forEach(exp => {
          if (exp.title) text += exp.title + ' ';
          if (exp.company) text += exp.company + ' ';
          if (exp.description) {
            const desc = typeof exp.description === 'string' ? exp.description : (Array.isArray(exp.description) ? exp.description.join(' ') : '');
            text += desc + ' ';
          }
        });
      }
      if (resume.sections.projects) {
        resume.sections.projects.forEach(proj => {
          if (proj.name) text += proj.name + ' ';
          if (proj.description) {
            const desc = typeof proj.description === 'string' ? proj.description : (Array.isArray(proj.description) ? proj.description.join(' ') : '');
            text += desc + ' ';
          }
        });
      }
      if (resume.sections.education) {
        resume.sections.education.forEach(edu => {
          if (edu.degree) text += edu.degree + ' ';
          if (edu.field) text += edu.field + ' ';
          if (edu.school) text += edu.school + ' ';
        });
      }
    }
    
    return text;
  }
  
  /**
   * Helper: Normalize skill name for comparison
   */
  function normalizeSkill(skill) {
    if (!skill) return '';
    return skill.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * 2.3.5 Clean Missing Keywords and Skills
   * Ensures keywords are 2-5 word phrases and skills are single terms, with no overlap
   */
  function cleanMissingKeywordsAndSkills(keywords, skills) {
    // Normalize arrays
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const skillsArray = Array.isArray(skills) ? skills : [];

    // Helper to count words
    const wordCount = (str) => (str || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    
    // Helper to normalize for comparison (lowercase, trim)
    const normalize = (str) => (str || '').toLowerCase().trim();
    
    // Clean keywords: must be 2-5 words, remove single words
    const cleanedKeywords = keywordsArray
      .map(k => (k || '').trim())
      .filter(k => {
        const words = wordCount(k);
        return words >= 2 && words <= 5;
      })
      .filter((k, idx, arr) => arr.indexOf(k) === idx); // Remove duplicates

    // Clean skills: should be single words or short tool names (1-2 words max for tool names like "React.js")
    const cleanedSkills = skillsArray
      .map(s => (s || '').trim())
      .filter(s => {
        const words = wordCount(s);
        // Allow single words, or 2-word tool names (e.g., "React.js", "Node.js")
        if (words === 1) return true;
        if (words === 2) {
          // Allow 2-word skills only if they're common tech stack items (e.g., "React.js", "Node.js", "ASP.NET")
          const twoWordTechPattern = /^[a-z]+\.(js|net|py|ts|jsx|tsx)$/i;
          return twoWordTechPattern.test(s);
        }
        return false; // 3+ words should be keywords, not skills
      })
      .filter((s, idx, arr) => arr.indexOf(s) === idx); // Remove duplicates

    // Remove overlap: if a skill appears in a keyword (or vice versa), remove it from skills
    const normalizedKeywords = cleanedKeywords.map(normalize);
    const finalSkills = cleanedSkills.filter(skill => {
      const normalizedSkill = normalize(skill);
      // Check if this skill is contained in any keyword
      const isInKeyword = normalizedKeywords.some(kw => 
        kw.includes(normalizedSkill) || normalizedSkill.includes(kw)
      );
      return !isInKeyword;
    });

    // Remove overlap: if a keyword is a single word that's also a skill, remove it from keywords
    const normalizedSkills = finalSkills.map(normalize);
    const finalKeywords = cleanedKeywords.filter(keyword => {
      const normalizedKeyword = normalize(keyword);
      const words = wordCount(keyword);
      // If keyword is only 1 word and it's in skills, remove it
      if (words === 1 && normalizedSkills.includes(normalizedKeyword)) {
        return false;
      }
      // If keyword contains a skill word, keep it (it's a phrase)
      return true;
    });

    return {
      keywords: finalKeywords,
      skills: finalSkills
    };
  }

  /**
   * 2.4 Calculate Overall Score
   * Normalizes and calculates weighted overall score
   */
  function calculateOverallScore(aiResponse) {
    try {
      const data = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
      
      // Weighted average: Resume 60%, Cover Letter 30%, LinkedIn 10% (if available)
      let overallScore = 0;
      let totalWeight = 0;

      if (data.resume_score !== null && data.resume_score !== undefined) {
        overallScore += data.resume_score * 0.6;
        totalWeight += 0.6;
      }

      if (data.cover_letter_score !== null && data.cover_letter_score !== undefined) {
        overallScore += data.cover_letter_score * 0.3;
        totalWeight += 0.3;
      }

      if (data.linkedin_score !== null && data.linkedin_score !== undefined) {
        overallScore += data.linkedin_score * 0.1;
        totalWeight += 0.1;
      }

      // If no materials provided, return 0
      if (totalWeight === 0) {
        return 0;
      }

      // Normalize if weights don't add up to 1.0
      const normalizedScore = Math.round(overallScore / totalWeight);
      
      // Ensure score is between 0-100
      return Math.max(0, Math.min(100, normalizedScore));
    } catch (err) {
      console.error("❌ Error calculating overall score:", err);
      return 0;
    }
  }

  /**
   * Main Analysis Function
   * Orchestrates the entire quality scoring process
   */
  async function analyzeApplicationQuality(jobId, userId, minimumThreshold = 70) {
    try {
      console.log(`🔍 [QUALITY SCORING] Starting analysis for job ${jobId}, user ${userId}`);
      
      // Check OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set in environment variables");
      }

      // 1. Aggregate materials
      const materials = await aggregateApplicationMaterials(jobId, userId);
      console.log(`✅ [QUALITY SCORING] Materials aggregated`);
      
      // Validate materials exist
      if (!materials.resume && !materials.coverLetter) {
        const errorMsg = "No application materials found. Please link a resume or cover letter to this job in the Application Materials section.";
        console.error(`❌ [QUALITY SCORING] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ [QUALITY SCORING] Materials validated: Resume=${materials.resume ? 'Yes' : 'No'}, Cover Letter=${materials.coverLetter ? 'Yes' : 'No'}`);

      // 2. Analyze job description
      const jobAnalysis = analyzeJobDescription(
        materials.job.description,
        materials.job.required_skills || []
      );
      console.log(`✅ [QUALITY SCORING] Job description analyzed`);

      // 3. Generate messages (async - may convert PDF to images)
      const messages = await generateQualityScoreMessages(materials, materials.job.description);
      console.log(`✅ [QUALITY SCORING] Messages generated`);

      // 4. Call OpenAI API
      console.log(`🤖 [QUALITY SCORING] Calling OpenAI API...`);
      const aiResponseText = await callOpenAIWithRetry(messages);
      
      // Parse JSON response (OpenAI returns JSON directly with response_format)
      let scoreData;
      
      try {
        scoreData = JSON.parse(aiResponseText);
      } catch (parseErr) {
        console.error("❌ [QUALITY SCORING] Failed to parse AI response:", parseErr);
        console.error("Raw response:", aiResponseText.substring(0, 500));
        throw new Error("Failed to parse AI response");
      }

      console.log(`✅ [QUALITY SCORING] OpenAI response received`);
      console.log(`📊 [QUALITY SCORING] Raw AI scores - Resume: ${scoreData.resume_score}, Cover Letter: ${scoreData.cover_letter_score}, LinkedIn: ${scoreData.linkedin_score}`);

      // Post-process missing keywords and skills to ensure proper distinction
      if (scoreData.missing_keywords || scoreData.missing_skills) {
        const processed = cleanMissingKeywordsAndSkills(
          scoreData.missing_keywords || [],
          scoreData.missing_skills || []
        );
        scoreData.missing_keywords = processed.keywords;
        scoreData.missing_skills = processed.skills;
        console.log(`✅ [QUALITY SCORING] Cleaned missing items - Keywords: ${processed.keywords.length}, Skills: ${processed.skills.length}`);
      }
      
      // Validate missing skills against actual resume content
      if (scoreData.missing_skills && materials.resume) {
        const actualSkills = extractSkillsFromResume(materials.resume);
        const resumeText = getResumeText(materials.resume).toLowerCase();
        
        console.log(`🔍 [QUALITY SCORING] Validating ${scoreData.missing_skills.length} missing skills`);
        console.log(`📋 [QUALITY SCORING] Extracted ${actualSkills.length} skills from resume: ${actualSkills.slice(0, 15).join(', ')}${actualSkills.length > 15 ? '...' : ''}`);
        
        const initialCount = scoreData.missing_skills.length;
        scoreData.missing_skills = scoreData.missing_skills.filter(missingSkill => {
          const normalizedMissing = normalizeSkill(missingSkill);
          
          // Check 1: Exact match in extracted skills list
          const foundInSkills = actualSkills.some(actualSkill => {
            const normalizedActual = normalizeSkill(actualSkill);
            return normalizedMissing === normalizedActual || 
                   normalizedActual.includes(normalizedMissing) || 
                   normalizedMissing.includes(normalizedActual);
          });
          
          // Check 2: Check if skill appears anywhere in resume text (case-insensitive, partial match)
          const foundInText = resumeText.includes(normalizedMissing);
          
          // Check 3: Handle variations (e.g., "Node.js" vs "Nodejs" vs "node", "React" vs "React.js")
          const skillVariations = [
            normalizedMissing,
            normalizedMissing.replace(/\./g, ''), // Remove dots: "node.js" -> "nodejs"
            normalizedMissing.replace(/\s+/g, ''), // Remove spaces: "react native" -> "reactnative"
            normalizedMissing.split(' ')[0], // First word only: "react native" -> "react"
            normalizedMissing.replace(/\.js$/, ''), // Remove .js suffix: "react.js" -> "react"
            normalizedMissing.replace(/\./g, '').replace(/js$/, ''), // "node.js" -> "node"
          ].filter(v => v.length >= 2); // Only keep variations with at least 2 characters
          
          const foundVariation = skillVariations.some(variation => {
            return resumeText.includes(variation) || 
                   actualSkills.some(s => {
                     const normalizedS = normalizeSkill(s);
                     return normalizedS.includes(variation) || variation.includes(normalizedS);
                   });
          });
          
          const found = foundInSkills || foundInText || foundVariation;
          
          if (found) {
            console.log(`✅ [QUALITY SCORING] Removed false positive missing skill: "${missingSkill}"`);
          } else {
            console.log(`⚠️ [QUALITY SCORING] Confirmed missing skill: "${missingSkill}" (not found in resume)`);
          }
          return !found; // Keep only skills that are actually missing
        });
        const removedCount = initialCount - scoreData.missing_skills.length;
        console.log(`✅ [QUALITY SCORING] Validated missing skills - Removed ${removedCount} false positives, ${scoreData.missing_skills.length} remain`);
      }
      
      // Validate missing keywords against actual resume content
      if (scoreData.missing_keywords && materials.resume) {
        const resumeText = getResumeText(materials.resume).toLowerCase();
        const initialCount = scoreData.missing_keywords.length;
        
        console.log(`🔍 [QUALITY SCORING] Validating ${initialCount} missing keywords`);
        
        scoreData.missing_keywords = scoreData.missing_keywords.filter(missingKeyword => {
          const normalizedMissing = missingKeyword.toLowerCase().trim();
          
          // Check if keyword phrase appears in resume text (case-insensitive)
          // Also check for partial matches (e.g., "backend development" matches "backend API development")
          const found = resumeText.includes(normalizedMissing) ||
                       normalizedMissing.split(' ').every(word => {
                         // Check if all words in the keyword phrase appear in resume (even if not together)
                         return word.length > 2 && resumeText.includes(word.toLowerCase());
                       });
          
          if (found) {
            console.log(`✅ [QUALITY SCORING] Removed false positive missing keyword: "${missingKeyword}"`);
          } else {
            console.log(`⚠️ [QUALITY SCORING] Confirmed missing keyword: "${missingKeyword}"`);
          }
          return !found; // Keep only keywords that are actually missing
        });
        const removedCount = initialCount - scoreData.missing_keywords.length;
        console.log(`✅ [QUALITY SCORING] Validated missing keywords - Removed ${removedCount} false positives, ${scoreData.missing_keywords.length} remain`);
      }

      // Post-process scores to ensure they're not 0 when content exists
      if (scoreData.score_breakdown) {
        // Ensure skills_alignment is not 0 if resume has skills
        const skillsAlignmentScore = scoreData.score_breakdown.skills_alignment;
        if (materials.resume && (skillsAlignmentScore === 0 || skillsAlignmentScore === null || skillsAlignmentScore === undefined)) {
          const actualSkills = extractSkillsFromResume(materials.resume);
          if (actualSkills.length > 0) {
            console.log(`⚠️ [QUALITY SCORING] Fixing skills_alignment score: was ${skillsAlignmentScore}, but resume has ${actualSkills.length} skills. Setting to minimum 30.`);
            scoreData.score_breakdown.skills_alignment = 30;
          }
        }
        
        // Ensure experience_relevance is not 0 if resume has experience
        const experienceRelevanceScore = scoreData.score_breakdown.experience_relevance;
        if (materials.resume && (experienceRelevanceScore === 0 || experienceRelevanceScore === null || experienceRelevanceScore === undefined)) {
          const hasExperience = materials.resume.sections?.experience && 
                               Array.isArray(materials.resume.sections.experience) && 
                               materials.resume.sections.experience.length > 0;
          if (hasExperience) {
            console.log(`⚠️ [QUALITY SCORING] Fixing experience_relevance score: was ${experienceRelevanceScore}, but resume has ${materials.resume.sections.experience.length} work experience(s). Setting to minimum 30.`);
            scoreData.score_breakdown.experience_relevance = 30;
          }
        }
        
        // Ensure all scores are within valid range (0-100) and are integers
        Object.keys(scoreData.score_breakdown).forEach(key => {
          const score = scoreData.score_breakdown[key];
          if (score !== null && score !== undefined) {
            scoreData.score_breakdown[key] = Math.max(0, Math.min(100, Math.round(score)));
          }
        });
      }

      // 5. Calculate overall score as weighted average (Resume 60%, Cover Letter 30%, LinkedIn 10%)
      // IGNORE the AI's overall_score - we calculate it ourselves from component scores
      let overallScore = 0;
      let totalWeight = 0;

      if (scoreData.resume_score !== null && scoreData.resume_score !== undefined) {
        const resumeContribution = scoreData.resume_score * 0.6;
        overallScore += resumeContribution;
        totalWeight += 0.6;
        console.log(`  Resume: ${scoreData.resume_score} × 0.6 = ${resumeContribution}`);
      }

      if (scoreData.cover_letter_score !== null && scoreData.cover_letter_score !== undefined) {
        const coverContribution = scoreData.cover_letter_score * 0.3;
        overallScore += coverContribution;
        totalWeight += 0.3;
        console.log(`  Cover Letter: ${scoreData.cover_letter_score} × 0.3 = ${coverContribution}`);
      }

      if (scoreData.linkedin_score !== null && scoreData.linkedin_score !== undefined) {
        const linkedinContribution = scoreData.linkedin_score * 0.1;
        overallScore += linkedinContribution;
        totalWeight += 0.1;
        console.log(`  LinkedIn: ${scoreData.linkedin_score} × 0.1 = ${linkedinContribution}`);
      }

      // If no materials provided, return 0
      if (totalWeight === 0) {
        overallScore = 0;
        console.log(`  No materials, overall score = 0`);
      } else {
        // Calculate weighted average
        const rawScore = overallScore / totalWeight;
        overallScore = Math.round(rawScore);
        console.log(`  Weighted sum: ${overallScore / totalWeight * totalWeight}, Total weight: ${totalWeight}, Raw average: ${rawScore.toFixed(2)}`);
      }
      
      // Ensure score is between 0-100
      overallScore = Math.max(0, Math.min(100, overallScore));
      
      // Count skills and experiences from resume for post-processing validation
      let skillCount = 0;
      let experienceCount = 0;
      let totalBullets = 0;
      
      if (materials.resume?.sections) {
        // Count skills
        if (materials.resume.sections.skills) {
          if (Array.isArray(materials.resume.sections.skills)) {
            skillCount = materials.resume.sections.skills.length;
          } else if (typeof materials.resume.sections.skills === 'string') {
            skillCount = materials.resume.sections.skills.split(',').filter(s => s.trim()).length;
          }
        }
        
        // Count work experiences
        if (materials.resume.sections.experience && Array.isArray(materials.resume.sections.experience)) {
          experienceCount = materials.resume.sections.experience.length;
          materials.resume.sections.experience.forEach(exp => {
            if (exp.description) {
              const bullets = typeof exp.description === 'string' 
                ? exp.description.split('\n').filter(b => b.trim())
                : Array.isArray(exp.description) ? exp.description : [];
              totalBullets += bullets.length;
            }
          });
        }
      }
      
      // Count required skills from job
      const requiredSkillsCount = Array.isArray(materials.job.required_skills) 
        ? materials.job.required_skills.length 
        : 0;
      
      console.log(`📊 [QUALITY SCORING] Resume analysis: ${skillCount} skills, ${experienceCount} experiences, ${totalBullets} bullets`);
      console.log(`📊 [QUALITY SCORING] Job requires: ${requiredSkillsCount} skills`);
      
      // POST-PROCESSING: Apply strict penalties based on resume comprehensiveness
      let adjustedScore = overallScore;
      
      // Penalty for sparse skills
      if (skillCount <= 5) {
        adjustedScore = Math.min(adjustedScore, 55);
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${skillCount} skills, capping score at 55`);
      } else if (skillCount < 8) {
        adjustedScore = Math.min(adjustedScore, 65);
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${skillCount} skills, capping score at 65`);
      }
      
      // Penalty for sparse experience
      if (experienceCount === 1) {
        adjustedScore = Math.max(0, adjustedScore - 20);
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only 1 experience, reducing score by 20`);
      } else if (experienceCount === 2) {
        adjustedScore = Math.max(0, adjustedScore - 10);
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only 2 experiences, reducing score by 10`);
      }
      
      // Penalty for sparse bullet points
      if (experienceCount > 0 && totalBullets < experienceCount * 3) {
        const penalty = Math.max(0, (experienceCount * 3 - totalBullets) * 3);
        adjustedScore = Math.max(0, adjustedScore - penalty);
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${totalBullets} bullets for ${experienceCount} jobs, reducing score by ${penalty}`);
      }
      
      // Penalty for not matching job requirements
      if (requiredSkillsCount > 0 && skillCount > 0) {
        const matchPercentage = (skillCount / requiredSkillsCount) * 100;
        if (matchPercentage < 50) {
          adjustedScore = Math.min(adjustedScore, 60);
          console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${(matchPercentage).toFixed(0)}% of required skills, capping score at 60`);
        } else if (matchPercentage < 70) {
          adjustedScore = Math.min(adjustedScore, 70);
          console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${(matchPercentage).toFixed(0)}% of required skills, capping score at 70`);
        }
      }
      
      // Reward for comprehensive resume
      if (skillCount >= 15 && experienceCount >= 3 && totalBullets >= 15) {
        adjustedScore = Math.min(100, adjustedScore + 15);
        console.log(`✅ [QUALITY SCORING] Applying reward: Comprehensive resume (${skillCount} skills, ${experienceCount} jobs, ${totalBullets} bullets), adding 15 points`);
      } else if (skillCount >= 10 && experienceCount >= 2 && totalBullets >= 10) {
        adjustedScore = Math.min(100, adjustedScore + 10);
        console.log(`✅ [QUALITY SCORING] Applying reward: Good resume (${skillCount} skills, ${experienceCount} jobs, ${totalBullets} bullets), adding 10 points`);
      }
      
      // Ensure score is between 0-100
      adjustedScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));
      
      // OVERRIDE the AI's overall_score with our calculated and adjusted one
      scoreData.overall_score = adjustedScore;
      overallScore = adjustedScore;
      
      console.log(`✅ [QUALITY SCORING] Final overall score: ${overallScore} (calculated from component scores with post-processing adjustments)`);

      // 6. Check if meets threshold
      const meetsThreshold = overallScore >= minimumThreshold;

      // 7. Prepare final score object
      const qualityScore = {
        overall_score: overallScore,
        resume_score: scoreData.resume_score || 0,
        cover_letter_score: scoreData.cover_letter_score || 0,
        linkedin_score: scoreData.linkedin_score || null,
        score_breakdown: scoreData.score_breakdown || {},
        missing_keywords: scoreData.missing_keywords || [],
        missing_skills: scoreData.missing_skills || [],
        formatting_issues: scoreData.formatting_issues || [],
        inconsistencies: scoreData.inconsistencies || [],
        improvement_suggestions: scoreData.improvement_suggestions || [],
        meets_threshold: meetsThreshold,
        minimum_threshold: minimumThreshold
      };

      console.log(`✅ [QUALITY SCORING] Analysis complete. Score: ${overallScore}/100`);

      return qualityScore;
    } catch (err) {
      console.error("❌ [QUALITY SCORING] Analysis failed:", err);
      throw err;
    }
  }

  return {
    aggregateApplicationMaterials,
    analyzeJobDescription,
    generateQualityScoreMessages,
    calculateOverallScore,
    analyzeApplicationQuality
  };
}

// Export default service instance
export default createQualityScoringService();

