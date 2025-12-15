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

          // Always extract text from file if available (for better parsing)
          if (resume.file_url) {
            const filePath = path.join(__dirname, "..", resume.file_url);
            if (fs.existsSync(filePath)) {
              try {
              const buffer = fs.readFileSync(filePath);
              if (resume.format === 'pdf') {
                resumeData.text = await extractPdfText(buffer);
                  console.log(`📄 [QUALITY SCORING] Extracted ${resumeData.text.length} characters from PDF`);
              } else if (resume.format === 'docx' || resume.format === 'doc') {
                resumeData.text = await extractDocxText(buffer);
                  console.log(`📄 [QUALITY SCORING] Extracted ${resumeData.text.length} characters from DOCX`);
              } else if (resume.format === 'txt') {
                resumeData.text = buffer.toString('utf-8');
                  console.log(`📄 [QUALITY SCORING] Extracted ${resumeData.text.length} characters from TXT`);
                }
              } catch (fileErr) {
                console.error(`❌ [QUALITY SCORING] Error extracting text from file:`, fileErr);
              }
            } else {
              console.warn(`⚠️ [QUALITY SCORING] Resume file not found at: ${filePath}`);
            }
          }
          
          // Log what we have
          console.log(`📋 [QUALITY SCORING] Resume ${resume.id} data:`, {
            hasSections: !!parsedSections,
            sectionsKeys: parsedSections ? Object.keys(parsedSections) : [],
            hasText: !!resumeData.text,
            textLength: resumeData.text?.length || 0,
            fileUrl: resume.file_url
          });
          
          // Debug: Log section structure if available
          if (parsedSections) {
            console.log(`📋 [QUALITY SCORING] Resume sections structure:`, {
              hasSkills: !!parsedSections.skills,
              skillsType: parsedSections.skills ? typeof parsedSections.skills : 'none',
              skillsIsArray: Array.isArray(parsedSections.skills),
              skillsValue: parsedSections.skills ? (Array.isArray(parsedSections.skills) ? parsedSections.skills.slice(0, 5) : typeof parsedSections.skills === 'object' ? Object.keys(parsedSections.skills).slice(0, 5) : String(parsedSections.skills).substring(0, 100)) : 'none',
              hasExperience: !!parsedSections.experience,
              hasEmployment: !!parsedSections.employment,
              experienceType: parsedSections.experience ? typeof parsedSections.experience : 'none',
              experienceIsArray: Array.isArray(parsedSections.experience),
              experienceCount: parsedSections.experience ? (Array.isArray(parsedSections.experience) ? parsedSections.experience.length : typeof parsedSections.experience === 'object' ? Object.keys(parsedSections.experience).length : 0) : 0
            });
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
    
    // Build comprehensive resume text from sections using getResumeText helper
    // getResumeText will combine extracted file text with sections to ensure ALL content is included
    let resumeText = resume ? getResumeText(resume) : "Resume not provided";
    
    // If resume has a PDF file_url, convert it to images for vision API
    if (resume?.file_url && resume?.format === 'pdf') {
      try {
        const filePath = path.join(__dirname, "..", resume.file_url);
        if (fs.existsSync(filePath)) {
          console.log(`🖼️ [QUALITY SCORING] Converting resume PDF to images for vision analysis`);
          resumeImages = await convertPdfToImages(filePath);
          
          // Ensure we have extracted text from PDF (getResumeText should have it, but double-check)
          if (!resume.text || resume.text.trim().length < 50) {
            const buffer = fs.readFileSync(filePath);
            const extractedText = await extractPdfText(buffer);
            if (extractedText && extractedText.trim().length > 50) {
              // Update resume.text so getResumeText can use it
              resume.text = extractedText;
              // Rebuild resumeText with the extracted text
              resumeText = getResumeText(resume);
              console.log(`📄 [QUALITY SCORING] Extracted PDF text and rebuilt resume text (${resumeText.length} chars)`);
            }
          }
        }
      } catch (err) {
        console.error(`❌ [QUALITY SCORING] Error processing resume PDF:`, err);
        // Continue with text extraction
      }
    }
    
    // If resumeText is still empty or too short, try to build from sections JSON as last resort
    if (!resumeText || resumeText.trim().length < 50) {
      if (resume?.sections) {
        resumeText = JSON.stringify(resume.sections, null, 2);
        console.log(`📄 [QUALITY SCORING] Using sections JSON as resume text (fallback)`);
      }
    }
    
    // Log final resume text length for debugging
    console.log(`📄 [QUALITY SCORING] Final resume text length: ${resumeText.length} characters`);
    if (resumeText.length < 200) {
      console.warn(`⚠️ [QUALITY SCORING] Resume text is very short (${resumeText.length} chars). AI may not have enough content to analyze.`);
    }
    
    const coverLetterText = coverLetter?.content || coverLetter?.text || "Cover letter not provided";
    
    // Count skills, experiences, and projects from resume sections
    // Use comprehensive extraction to handle all formats
    let skillCount = 0;
    let experienceCount = 0;
    let totalBullets = 0;
    let projectCount = 0;
    
    if (resume) {
      console.log(`🔍 [QUALITY SCORING] Analyzing resume structure:`, {
        hasSections: !!resume.sections,
        sectionsKeys: resume.sections ? Object.keys(resume.sections) : [],
        hasText: !!resume.text,
        textLength: resume.text?.length || 0
      });
      
      // Extract all skills using the comprehensive extraction function
      const allSkills = extractSkillsFromResume(resume);
      skillCount = allSkills.length;
      console.log(`🔍 [QUALITY SCORING] Extracted ${skillCount} skills from resume: ${allSkills.slice(0, 15).join(', ')}${allSkills.length > 15 ? '...' : ''}`);
      
      // If no skills found from sections, try extracting from text
      if (skillCount === 0 && resume.text) {
        console.log(`⚠️ [QUALITY SCORING] No skills found in sections, attempting text extraction...`);
        // Extract skills from text using patterns
        const textSkills = extractSkillsFromText(resume.text);
        if (textSkills.length > 0) {
          skillCount = textSkills.length;
          console.log(`✅ [QUALITY SCORING] Extracted ${skillCount} skills from text: ${textSkills.slice(0, 15).join(', ')}${textSkills.length > 15 ? '...' : ''}`);
        }
      }
      
      // Count work experiences - check both 'experience' and 'employment' sections
      const experienceSection = resume.sections?.experience || resume.sections?.employment;
      
      if (experienceSection) {
        if (Array.isArray(experienceSection)) {
          experienceCount = experienceSection.length;
          experienceSection.forEach((exp, idx) => {
            if (exp && typeof exp === 'object') {
              // Track bullets to avoid double-counting
              const countedBullets = new Set();
              let bulletsFromDescription = 0;
              
              // Count bullets from description (only actual bullet points, not all lines)
              if (exp.description) {
                if (typeof exp.description === 'string') {
                  // Split by newlines and filter for actual bullet points
                  const lines = exp.description.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                  // Only count lines that look like bullet points (start with •, -, *, or are indented)
                  const actualBullets = lines.filter(line => {
                    // Bullet markers: •, -, *, or lines that start with common bullet patterns
                    return /^[•\-\*]\s/.test(line) || 
                           /^\d+[\.\)]\s/.test(line) || // Numbered bullets: 1. or 1)
                           (line.length > 10 && /^[A-Z]/.test(line) && line.match(/\b(?:built|developed|created|designed|implemented|managed|led|improved|increased|reduced|optimized|achieved|delivered)\b/i)); // Action verb bullets
                  });
                  bulletsFromDescription = actualBullets.length;
                  actualBullets.forEach(b => countedBullets.add(b.toLowerCase().trim()));
                } else if (Array.isArray(exp.description)) {
                  bulletsFromDescription = exp.description.filter(b => b && b.trim().length > 0).length;
                  exp.description.forEach(b => countedBullets.add(String(b).toLowerCase().trim()));
                }
                totalBullets += bulletsFromDescription;
                console.log(`  Experience ${idx + 1}: ${exp.title || exp.position || 'Untitled'} at ${exp.company || 'Unknown'} - ${bulletsFromDescription} bullets from description`);
              }
              
              // Count bullets array (only if not already counted in description)
              if (exp.bullets && Array.isArray(exp.bullets)) {
                const newBullets = exp.bullets.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const bulletText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = bulletText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newBullets.length;
                if (newBullets.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newBullets.length} bullets from bullets array (${exp.bullets.length} total, ${exp.bullets.length - newBullets.length} duplicates skipped)`);
                }
              }
              
              // Count achievements array (only if not already counted)
              if (exp.achievements && Array.isArray(exp.achievements)) {
                const newAchievements = exp.achievements.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const achievementText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = achievementText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newAchievements.length;
                if (newAchievements.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newAchievements.length} bullets from achievements array (${exp.achievements.length} total, ${exp.achievements.length - newAchievements.length} duplicates skipped)`);
                }
              }
            }
          });
        } else if (typeof experienceSection === 'object' && !Array.isArray(experienceSection)) {
          // Handle object format where keys might be job IDs or indices
          const expArray = Object.values(experienceSection).filter(exp => exp && typeof exp === 'object');
          experienceCount = expArray.length;
            expArray.forEach((exp, idx) => {
              // Track bullets to avoid double-counting
              const countedBullets = new Set();
              let bulletsFromDescription = 0;
              
              // Count bullets from description (only actual bullet points, not all lines)
          if (exp.description) {
                if (typeof exp.description === 'string') {
                  // Split by newlines and filter for actual bullet points
                  const lines = exp.description.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                  // Only count lines that look like bullet points (start with •, -, *, or are indented)
                  const actualBullets = lines.filter(line => {
                    // Bullet markers: •, -, *, or lines that start with common bullet patterns
                    return /^[•\-\*]\s/.test(line) || 
                           /^\d+[\.\)]\s/.test(line) || // Numbered bullets: 1. or 1)
                           (line.length > 10 && /^[A-Z]/.test(line) && line.match(/\b(?:built|developed|created|designed|implemented|managed|led|improved|increased|reduced|optimized|achieved|delivered)\b/i)); // Action verb bullets
                  });
                  bulletsFromDescription = actualBullets.length;
                  actualBullets.forEach(b => countedBullets.add(b.toLowerCase().trim()));
                } else if (Array.isArray(exp.description)) {
                  bulletsFromDescription = exp.description.filter(b => b && b.trim().length > 0).length;
                  exp.description.forEach(b => countedBullets.add(String(b).toLowerCase().trim()));
                }
                totalBullets += bulletsFromDescription;
                console.log(`  Experience ${idx + 1}: ${exp.title || exp.position || 'Untitled'} at ${exp.company || 'Unknown'} - ${bulletsFromDescription} bullets from description`);
              }
              
              // Count bullets array (only if not already counted in description)
              if (exp.bullets && Array.isArray(exp.bullets)) {
                const newBullets = exp.bullets.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const bulletText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = bulletText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newBullets.length;
                if (newBullets.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newBullets.length} bullets from bullets array (${exp.bullets.length} total, ${exp.bullets.length - newBullets.length} duplicates skipped)`);
                }
              }
              
              // Count achievements array (only if not already counted)
              if (exp.achievements && Array.isArray(exp.achievements)) {
                const newAchievements = exp.achievements.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const achievementText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = achievementText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newAchievements.length;
                if (newAchievements.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newAchievements.length} bullets from achievements array (${exp.achievements.length} total, ${exp.achievements.length - newAchievements.length} duplicates skipped)`);
                }
              }
            });
        }
      }
      
      // If no experiences found in sections, try extracting from text
      if (experienceCount === 0 && resume.text) {
        console.log(`⚠️ [QUALITY SCORING] No experiences found in sections, attempting text extraction...`);
        const textExperiences = extractExperiencesFromText(resume.text);
        if (textExperiences.length > 0) {
          experienceCount = textExperiences.length;
          totalBullets = textExperiences.reduce((sum, exp) => sum + (exp.bullets || 0), 0);
          console.log(`✅ [QUALITY SCORING] Extracted ${experienceCount} experiences from text with ${totalBullets} total bullets`);
        }
      }
      
      // Count projects - check 'projects' section
      const projectsSection = resume.sections?.projects;
      if (projectsSection) {
        if (Array.isArray(projectsSection)) {
          projectCount = projectsSection.length;
          projectsSection.forEach((proj, idx) => {
            if (proj && typeof proj === 'object') {
              console.log(`  Project ${idx + 1}: ${proj.name || proj.title || 'Untitled'}`);
            }
          });
        } else if (typeof projectsSection === 'object' && !Array.isArray(projectsSection)) {
          const projArray = Object.values(projectsSection).filter(proj => proj && typeof proj === 'object');
          projectCount = projArray.length;
          projArray.forEach((proj, idx) => {
            console.log(`  Project ${idx + 1}: ${proj.name || proj.title || 'Untitled'}`);
          });
        }
      }
      
      // If no projects found in sections, try extracting from text
      if (projectCount === 0 && resume.text) {
        console.log(`⚠️ [QUALITY SCORING] No projects found in sections, attempting text extraction...`);
        // Look for projects section in text with more comprehensive patterns
        const projectSectionPatterns = [
          /(?:projects?|personal\s+projects?|side\s+projects?|portfolio\s+projects?|academic\s+projects?)[:\s]*\n(.*?)(?=\n\n|\n[A-Z]{2,}|\nEDUCATION|\nEXPERIENCE|\nWORK\s+EXPERIENCE|\nSKILLS|\nTECHNICAL\s+SKILLS|\nCERTIFICATIONS|$)/is,
          /PROJECTS[:\s]*\n(.*?)(?=\n\n|\n[A-Z]{2,}|\nEDUCATION|\nEXPERIENCE|\nWORK\s+EXPERIENCE|\nSKILLS|\nTECHNICAL\s+SKILLS|\nCERTIFICATIONS|$)/is,
        ];
        
        let foundProjects = [];
        
        projectSectionPatterns.forEach(pattern => {
          const matches = resume.text.match(pattern);
          if (matches && matches[1]) {
            const projectText = matches[1];
            const lines = projectText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            // Look for project entries - projects usually have:
            // 1. A project name/title (often bold or on its own line)
            // 2. Description/bullet points
            // 3. Technologies mentioned
            let currentProject = null;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Detect project name (line that looks like a title: starts with capital, no bullet, might have colon or be followed by description)
              const looksLikeProjectName = /^[A-Z][A-Za-z0-9\s\-&]+(?:\s*[:\-]|\s*$)/.test(line) && 
                                          line.length < 80 && 
                                          !line.match(/^(?:built|developed|created|designed|implemented|technologies?|tech|stack|tools?):/i);
              
              // Detect if line mentions technologies (common tech keywords)
              const hasTechnologies = /\b(?:Python|Java|JavaScript|React|Node\.?js|SQL|AWS|Docker|MongoDB|PostgreSQL|Git|HTML|CSS|TypeScript|Angular|Vue|Flask|Django|Spring|TensorFlow|Pandas|NumPy|Spark|Hadoop)\b/i.test(line);
              
              // Detect project action words
              const hasProjectActions = /\b(?:built|developed|created|designed|implemented|deployed|architected|engineered)\b/i.test(line);
              
              if (looksLikeProjectName || (hasTechnologies && hasProjectActions)) {
                // Start of a new project
                if (currentProject) {
                  foundProjects.push(currentProject);
                }
                currentProject = {
                  name: looksLikeProjectName ? line.replace(/[:\-]$/, '').trim() : 'Project',
                  hasDescription: false,
                  hasTechnologies: hasTechnologies
                };
              } else if (currentProject) {
                // Continuation of current project
                if (hasTechnologies) currentProject.hasTechnologies = true;
                if (line.length > 20) currentProject.hasDescription = true;
              }
            }
            
            if (currentProject) {
              foundProjects.push(currentProject);
            }
            
            // Also count by looking for project-like patterns (bullet points with tech keywords)
            const bulletPattern = /^[\s]*[•\-\*]\s+(.+)$/gm;
            const bullets = [];
            let bulletMatch;
            while ((bulletMatch = bulletPattern.exec(projectText)) !== null) {
              const bulletText = bulletMatch[1];
              if (/\b(?:built|developed|created|designed|implemented|Python|Java|JavaScript|React|Node|SQL|AWS|Docker)\b/i.test(bulletText)) {
                bullets.push(bulletText);
              }
            }
            
            // Estimate projects from bullets (roughly 2-3 bullets per project)
            if (bullets.length > 0 && foundProjects.length === 0) {
              const estimatedFromBullets = Math.max(1, Math.floor(bullets.length / 2.5));
              foundProjects = Array(estimatedFromBullets).fill(null).map(() => ({ name: 'Project', hasDescription: true, hasTechnologies: true }));
            }
          }
        });
        
        if (foundProjects.length > 0) {
          projectCount = foundProjects.length;
          console.log(`✅ [QUALITY SCORING] Extracted ${projectCount} projects from text: ${foundProjects.map(p => p.name).join(', ')}`);
        }
      }
      
      console.log(`📊 [QUALITY SCORING] Resume analysis complete: ${skillCount} skills, ${experienceCount} experiences, ${totalBullets} total bullets, ${projectCount} projects`);
    }
    
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst and career coach specializing in application package quality assessment. You provide comprehensive, actionable feedback to help candidates improve their job applications. You MUST be very strict and differentiate clearly between sparse and comprehensive resumes.`;

    const userPrompt = `# RESUME AND COVER LETTER QUALITY ANALYSIS

## YOUR TASK
Analyze the job application package (resume + cover letter) and provide a comprehensive quality score with detailed feedback. You MUST check EVERY section of the resume systematically.

---

## STEP 1: VERIFY RESUME CONTENT COUNTS
Before scoring, verify these counts from the resume text:

**Skills Count**: ${skillCount} skills found
- Check: Skills section, Technical Skills section, skills mentioned in experience bullets, project technologies
- If you find MORE skills than ${skillCount}, use YOUR count (the resume text may have more)

**Work Experience Count**: ${experienceCount} experiences found
- Check: Work Experience section, Employment section
- Count each job/position separately
- If you find MORE experiences than ${experienceCount}, use YOUR count

**Bullet Points Count**: ${totalBullets} total bullets found
- Check: ALL bullet points under each work experience
- Count bullets in descriptions, achievements, responsibilities
- If you find MORE bullets than ${totalBullets}, use YOUR count

**Projects Count**: ${projectCount} projects found
- **CRITICAL**: Check for a "Projects" section in the resume text
- Look for: "PROJECTS", "PROJECTS:", "Personal Projects", "Side Projects", "Portfolio Projects"
- Count each project entry (each project should have a name/title and description)
- Projects may be listed with names like "Project Name", "Project Title", or bullet points describing projects
- **IF YOU SEE PROJECTS IN THE RESUME TEXT BUT COUNT IS 0, YOU MUST COUNT THEM YOURSELF**
- If you find MORE projects than ${projectCount}, use YOUR count

---

## STEP 2: SYSTEMATIC RESUME CHECKLIST

### A. SKILLS SECTION CHECK
- [ ] Does resume have a Skills/Technical Skills section? YES/NO
- [ ] How many skills are listed? Count: ___
- [ ] Are skills categorized (Programming Languages, Tools, etc.)? YES/NO
- [ ] Do skills match job requirements? Check each required skill from job description

### B. WORK EXPERIENCE SECTION CHECK
- [ ] Does resume have a Work Experience/Employment section? YES/NO
- [ ] How many work experiences are listed? Count: ___
- [ ] For EACH experience, check:
  - [ ] Company name present?
  - [ ] Job title/position present?
  - [ ] Dates present?
  - [ ] Description/bullet points present?
  - [ ] How many bullet points? Count: ___
  - [ ] Are bullet points quantified (numbers, percentages, metrics)?
  - [ ] Do bullet points mention technologies/skills relevant to the job?

### C. PROJECTS SECTION CHECK (CRITICAL - OFTEN MISSED)
- [ ] Does resume have a Projects section? YES/NO
- [ ] **LOOK CAREFULLY** - Projects section may be titled:
  - "PROJECTS" or "PROJECTS:"
  - "Personal Projects"
  - "Side Projects"
  - "Portfolio Projects"
  - "Academic Projects"
  - "Projects & Portfolio"
- [ ] How many projects are listed? Count: ___
- [ ] For EACH project, check:
  - [ ] Project name/title present?
  - [ ] Description present?
  - [ ] Technologies used listed?
  - [ ] Outcomes/results mentioned?
- [ ] **IF NO PROJECTS SECTION FOUND**: This is a MAJOR weakness - score projects_score as 0-20

### D. EDUCATION SECTION CHECK
- [ ] Does resume have an Education section? YES/NO
- [ ] Degree(s) listed?
- [ ] Institution(s) listed?
- [ ] Graduation dates present?
- [ ] Relevant coursework mentioned?

### E. OTHER SECTIONS CHECK
- [ ] Summary/Objective section? YES/NO
- [ ] Certifications section? YES/NO
- [ ] Awards/Honors section? YES/NO

---

## STEP 3: SKILL AND KEYWORD MATCHING RULES

**BEFORE listing ANY skill or keyword as "missing", you MUST:**

1. **Search the ENTIRE resume text** - not just the skills section
2. **Check ALL locations**:
   - Skills section / Technical Skills section
   - **EVERY bullet point** in work experience (skills are often mentioned here)
   - **EVERY project description** (technologies used)
   - Education section (coursework, projects)
   - Summary/bio section
   - Certifications section

3. **Use flexible matching**:
   - CASE-INSENSITIVE: "Python" = "python" = "PYTHON"
   - PARTIAL: "React" matches "React.js", "React Native", "React development"
   - VARIATIONS: "AWS" = "Amazon Web Services" = "AWS Cloud"

4. **Examples**:
   - If bullet says "Developed ETL pipeline using Apache Spark and Hadoop"
     → Skills present: "Spark", "Hadoop", "ETL"
   - If project says "Built web app with React and Node.js"
     → Skills present: "React", "Node.js", "JavaScript" (implied)

5. **Only mark as missing if ABSOLUTELY CERTAIN** it's not in the resume text

---

## STEP 4: SCORING REQUIREMENTS

### Minimum Score Rules:
- Skills Alignment: If resume has ${skillCount} skills, minimum score is 30 (unless 0 skills)
- Experience Relevance: If resume has ${experienceCount} experiences, minimum score is 30 (unless 0 experiences)
- Projects Score: 
  - 0 projects = 0-20
  - 1 project = 30-50
  - 2+ projects = 60-100
  - **CRITICAL**: If you find projects in the resume but count shows 0, use YOUR count and score accordingly

### Base Scoring on Job Match:
- ALL scores must reflect how well the resume matches THIS SPECIFIC job description
- A well-formatted resume that doesn't match the job should score 50-65, not 80+
- A resume that matches the job well should score 70-85+

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
    "projects_score": 75,
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
      "category": "skills_alignment",
      "suggestion": "Add missing critical skills 'AWS' and 'Docker' to skills section. These are required by the job description and are not currently mentioned anywhere in the resume.",
      "impact": "Would significantly improve skills alignment score and ATS keyword matching. These are core requirements for the role.",
      "estimated_score_improvement": 8
    },
    {
      "priority": "high",
      "category": "experience_relevance",
      "suggestion": "Add 2-3 more bullet points to your most recent work experience describing specific projects and achievements using technologies mentioned in the job description (e.g., 'Built scalable microservices using React and Node.js' or 'Optimized database queries reducing response time by 40%').",
      "impact": "Would demonstrate relevant experience and improve experience relevance score. Shows practical application of required skills.",
      "estimated_score_improvement": 10
    },
    {
      "priority": "high",
      "category": "quantification",
      "suggestion": "Add quantified metrics to at least 3-4 bullet points across your work experience. Include numbers for: team size, project scale, performance improvements (%), cost savings ($), users impacted, etc. Example: 'Led team of 5 engineers to build API serving 1M+ requests daily'.",
      "impact": "Would significantly improve quantification score and make achievements more impactful. Quantified results are highly valued by recruiters.",
      "estimated_score_improvement": 7
    },
    {
      "priority": "medium",
      "category": "cover_letter",
      "suggestion": "Customize cover letter to mention 2-3 specific requirements from the job description and explain how your experience addresses them. Reference company values or recent initiatives if mentioned in job posting.",
      "impact": "Would improve cover letter customization score and demonstrate genuine interest. Shows you've researched the role and company.",
      "estimated_score_improvement": 5
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

4. **Projects Score (0-100)**: Presence and quality of projects demonstrating practical application of skills
   - **CRITICAL**: Projects are IMPORTANT - they show practical application of skills beyond work experience
   - **YOU MUST CHECK FOR PROJECTS SECTION**: Look for "PROJECTS", "Personal Projects", "Side Projects", "Portfolio Projects" in the resume text
   - **IF PROJECTS EXIST BUT COUNT SHOWS 0**: Use YOUR count from the resume text, not the provided count
   - Scoring based on YOUR actual count from resume:
     - 90-100: 3+ well-documented projects with clear descriptions, technologies used, and outcomes
     - 70-89: 2 well-documented projects with good descriptions and relevant technologies
     - 50-69: 2 projects but with basic descriptions or limited detail
     - 30-49: Only 1 project present, or projects lack detail/description
     - 20-29: Projects mentioned but very sparse or unclear
     - 0-19: No projects section found in resume text OR no projects listed
   - **VERIFICATION**: Before scoring, explicitly verify: "I found X projects in the resume" (where X is YOUR count from reading the resume text)

5. **Formatting Quality (0-100)**: Professional formatting, no typos, consistent style
   - 90-100: Perfect formatting, no errors, professional appearance
   - 70-89: Good formatting, minor issues
   - 50-69: Acceptable formatting, some issues present
   - 30-49: Poor formatting, multiple issues
   - 0-29: Very poor formatting, many errors, unprofessional

6. **Quantification (0-100)**: Presence of metrics and quantified achievements
   - 90-100: Extensive use of metrics, numbers, percentages throughout
   - 70-89: Good use of metrics in most sections
   - 50-69: Some metrics present, but inconsistent
   - 30-49: Few metrics, mostly qualitative descriptions
   - 0-29: No metrics, all qualitative descriptions

7. **ATS Optimization (0-100)**: How well formatted for ATS parsing
   - 90-100: Perfect ATS formatting, standard sections, clean structure
   - 70-89: Good ATS formatting, minor issues
   - 50-69: Acceptable ATS formatting, some issues
   - 30-49: Poor ATS formatting, may not parse well
   - 0-29: Very poor ATS formatting, likely to be rejected

8. **Cover Letter Customization (0-100)**: Job-specific content vs generic template
   - 90-100: Highly customized, mentions specific company details, role requirements
   - 70-89: Well customized, some company-specific content
   - 50-69: Some customization, mostly generic
   - 30-49: Minimal customization, very generic
   - 0-29: No customization, clearly a template

9. **Professional Tone (0-100)**: Appropriate language and tone
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
- Missing certifications when relevant: -5 to -10 points

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
- Overall score should be a weighted average (resume 60%, cover letter 40% if LinkedIn not available, otherwise resume 60%, cover letter 30%, LinkedIn 10%)
- Apply penalties for formatting issues, missing keywords, and poor customization
- **CRITICAL**: Missing keywords must be 2-5 word PHRASES representing concepts/methodologies (e.g., "machine learning", "data pipeline", "cloud infrastructure", "agile development", "RESTful API design")
- **CRITICAL**: Missing skills must be SINGLE WORDS or TOOL NAMES (e.g., "Python", "AWS", "Docker", "SQL", "React", "JavaScript")
- **CRITICAL**: Keywords and skills must NOT overlap - if "Python" is a missing skill, do NOT also include "Python programming" as a missing keyword
- **CRITICAL**: Extract keywords as phrases from job description (2-5 words), extract skills as single technical terms
- Missing keywords and skills should be specific and actionable
- Formatting issues should include exact location and fix

**IMPROVEMENT SUGGESTIONS GUIDELINES (CRITICAL - Follow these exactly):**
- **Focus on SUBSTANTIAL improvements** that will meaningfully improve job match and career prospects
- **DO NOT include minor suggestions** like typos, formatting inconsistencies, or trivial fixes unless they are CRITICAL errors
- **Prioritize suggestions** that address:
  1. Missing critical skills or keywords that are job requirements
  2. Lack of quantified achievements/metrics in work experience
  3. Insufficient detail in work experience bullet points
  4. Poor cover letter customization
  5. Lack of relevant experience examples
- **IMPORTANT**: Only suggest adding projects if projects are TRULY missing (not detected in resume text). If projects exist in the resume but weren't counted, DO NOT suggest adding them - instead, the AI should detect them itself.
- **Each suggestion must be:**
  - Specific and actionable (tell them WHAT to add/change and WHERE)
  - Include an example or template when helpful
  - Explain WHY it matters (impact on score and job match)
  - Have realistic estimated_score_improvement (5-15 points for high priority, 3-8 for medium)
- **Categories should be**: "skills_alignment", "experience_relevance", "quantification", "projects", "cover_letter", "keywords", "ats_optimization"
- **Priority levels**:
  - "high": Critical improvements that address missing job requirements or major gaps (estimated 8-15 point improvement)
  - "medium": Important improvements that enhance resume quality (estimated 3-8 point improvement)
  - "low": Nice-to-have improvements (rarely use, only if resume is already strong)
- **Limit to 3-5 suggestions maximum** - focus on the most impactful improvements
- **DO NOT suggest**: Minor typos, formatting inconsistencies, date format issues, or other trivial fixes unless they are severe

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
   * Handles multiple formats: arrays, strings, categorized objects, etc.
   */
  function extractSkillsFromResume(resume) {
    const skills = [];
    
    // Helper to add skill(s) to array
    const addSkill = (skill) => {
      if (!skill) return;
      if (typeof skill === 'string') {
        // Handle comma-separated, semicolon-separated, pipe-separated, or newline-separated skills
        skill.split(/[,;|•\n\r]/).forEach(s => {
          const trimmed = s.trim();
          // Only add if it's a meaningful skill (at least 2 chars, not just punctuation)
          if (trimmed && trimmed.length > 1 && trimmed.length < 50 && !/^[^\w]+$/.test(trimmed)) {
            skills.push(trimmed);
          }
        });
      } else if (skill && typeof skill === 'object') {
        // Handle object format: { name: "Python", proficiency: "Expert" } or { skill: "Python" }
        if (skill.name) {
          addSkill(skill.name);
        } else if (skill.skill) {
          addSkill(skill.skill);
        } else if (skill.title) {
          addSkill(skill.title);
        }
      }
    };
    
    if (!resume) return skills;
    
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
          } else if (category && typeof category === 'object') {
            // Handle nested objects in categories
            Object.values(category).forEach(addSkill);
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
          } else if (category && typeof category === 'object') {
            Object.values(category).forEach(addSkill);
          }
        });
      } else if (typeof resume.sections.technical_skills === 'string') {
        addSkill(resume.sections.technical_skills);
      }
    }
    
    // Extract from other possible skill section names
    const skillSectionNames = ['programming_skills', 'languages', 'tools', 'technologies', 'competencies'];
    skillSectionNames.forEach(sectionName => {
      if (resume.sections?.[sectionName]) {
        if (Array.isArray(resume.sections[sectionName])) {
          resume.sections[sectionName].forEach(addSkill);
        } else if (typeof resume.sections[sectionName] === 'string') {
          addSkill(resume.sections[sectionName]);
        } else if (typeof resume.sections[sectionName] === 'object') {
          Object.values(resume.sections[sectionName]).forEach(category => {
            if (Array.isArray(category)) {
              category.forEach(addSkill);
            } else if (typeof category === 'string') {
              addSkill(category);
            }
          });
        }
      }
    });
    
    // Extract from experience descriptions (skills mentioned in job descriptions)
    const experienceSection = resume.sections?.experience || resume.sections?.employment;
    if (experienceSection && Array.isArray(experienceSection)) {
      experienceSection.forEach(exp => {
        if (exp && exp.description) {
          const desc = typeof exp.description === 'string' ? exp.description : (Array.isArray(exp.description) ? exp.description.join(' ') : '');
          // Look for common skill patterns in descriptions
          const skillKeywords = ['Python', 'JavaScript', 'React', 'Node', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Java', 'C++', 'TypeScript', 'Angular', 'Vue', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST', 'API'];
          skillKeywords.forEach(keyword => {
            if (desc.toLowerCase().includes(keyword.toLowerCase()) && !skills.some(s => s.toLowerCase() === keyword.toLowerCase())) {
              skills.push(keyword);
            }
          });
        }
      });
    }
    
    // Extract from projects (technologies used)
    if (resume.sections?.projects && Array.isArray(resume.sections.projects)) {
      resume.sections.projects.forEach(proj => {
        if (proj && proj.technologies) {
          if (Array.isArray(proj.technologies)) {
            proj.technologies.forEach(addSkill);
          } else if (typeof proj.technologies === 'string') {
            addSkill(proj.technologies);
          }
        }
        if (proj && proj.description) {
          const desc = typeof proj.description === 'string' ? proj.description : (Array.isArray(proj.description) ? proj.description.join(' ') : '');
          // Extract technologies mentioned in project descriptions
          const techPattern = /\b(?:Python|JavaScript|React|Node\.?js|SQL|AWS|Docker|Kubernetes|Git|Java|TypeScript|Angular|Vue|MongoDB|PostgreSQL|Redis|GraphQL|REST|API)\b/gi;
          const matches = desc.match(techPattern);
          if (matches) {
            matches.forEach(match => {
              const normalized = match.replace(/\./g, '').trim();
              if (normalized && !skills.some(s => s.toLowerCase() === normalized.toLowerCase())) {
                skills.push(normalized);
              }
            });
          }
        }
      });
    }
    
    // Extract from text if available (look for common skill patterns)
    if (resume.text) {
      // Common skill patterns in resumes - look for categorized sections
      const skillPatterns = [
        /(?:programming languages?|languages?)[:\s]+([^:\n]+?)(?:\n|$)/i,
        /(?:libraries?\s*&\s*frameworks?|frameworks?|libraries?)[:\s]+([^:\n]+?)(?:\n|$)/i,
        /(?:data tools?\s*&\s*platforms?|tools?\s*&\s*platforms?|platforms?)[:\s]+([^:\n]+?)(?:\n|$)/i,
        /(?:technologies?|tools?)[:\s]+([^:\n]+?)(?:\n|$)/i,
        /(?:skills?)[:\s]+([^:\n]+?)(?:\n|$)/i,
      ];
      
      skillPatterns.forEach(pattern => {
        try {
        const matches = resume.text.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
          if (match[1]) {
              match[1].split(/[,;|•\n\r]/).forEach(s => {
              const trimmed = s.trim();
                if (trimmed && trimmed.length > 1 && trimmed.length < 50 && !/^[^\w]+$/.test(trimmed)) {
                skills.push(trimmed);
              }
            });
          }
          }
        } catch (err) {
          // Skip invalid patterns
        }
      });
    }
    
    // Remove duplicates and return
    return [...new Set(skills.map(s => s.trim()).filter(s => s.length > 0))];
  }
  
  /**
   * Helper: Extract skills from plain text (fallback when sections aren't available)
   */
  function extractSkillsFromText(text) {
    if (!text) return [];
    const skills = [];
    const textLower = text.toLowerCase();
    
    // Common technical skills to look for (expanded list)
    const commonSkills = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'Kotlin', 'Bash', 'SQL',
      'React', 'Node.js', 'Node', 'Angular', 'Vue', 'Flask', 'Django',
      'Pandas', 'NumPy', 'Scikit-learn', 'Scikit', 'TensorFlow', 'Keras', 'Matplotlib', 'Seaborn', 'Dash',
      'Tableau', 'Power BI', 'PowerBI', 'Hadoop', 'Spark', 'MongoDB', 'PostgreSQL', 'AWS', 'Git', 'REST',
      'Docker', 'Kubernetes', 'Redis', 'GraphQL', 'CI/CD', 'Agile', 'Scrum',
      'Postgres', 'MySQL', 'Oracle', 'NoSQL', 'Linux', 'Unix', 'Windows',
      'HTML', 'CSS', 'SASS', 'LESS', 'jQuery', 'Express', 'Next.js', 'Next',
      'Spring', 'Hibernate', 'JPA', 'Maven', 'Gradle', 'Jenkins', 'Travis', 'CircleCI',
      'Elasticsearch', 'Kibana', 'Logstash', 'ELK', 'Prometheus', 'Grafana',
      'Microservices', 'API', 'RESTful', 'SOAP', 'JSON', 'XML', 'YAML'
    ];
    
    // Check for each skill in text (case-insensitive, with word boundaries)
    commonSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      // Escape special regex characters
      const escapedSkill = skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Check for skill name (with word boundaries, but handle dots specially)
      const pattern = skill.includes('.') 
        ? new RegExp(`\\b${escapedSkill}\\b|${escapedSkill.replace(/\./g, '\\.')}`, 'i')
        : new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (pattern.test(text)) {
        if (!skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
          skills.push(skill);
        }
      }
    });
    
    // Also look for skill sections in text (more comprehensive patterns)
    const skillSectionPatterns = [
      /(?:technical\s+)?skills?[:\s]+([^:]+?)(?:\n\n|\n[A-Z]{2,}|\nEDUCATION|\nSUMMARY|\nWORK|\nTECHNICAL|$)/is,
      /(?:programming\s+)?languages?[:\s]+([^:]+?)(?:\n|$)/i,
      /(?:libraries?\s*[&|]\s*frameworks?|frameworks?|libraries?)[:\s]+([^:]+?)(?:\n|$)/i,
      /(?:data\s+)?tools?\s*[&|]\s*platforms?[:\s]+([^:]+?)(?:\n|$)/i,
      /(?:certifications?)[:\s]+([^:]+?)(?:\n|$)/i,
    ];
    
    skillSectionPatterns.forEach(pattern => {
      try {
        const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
          if (match[1]) {
            // Split on commas, semicolons, pipes, bullets, newlines
            match[1].split(/[,;|•\n\r]/).forEach(s => {
              const trimmed = s.trim();
              // Only add if it's a meaningful skill (at least 2 chars, not just punctuation, reasonable length)
              if (trimmed && trimmed.length > 1 && trimmed.length < 50 && !/^[^\w]+$/.test(trimmed)) {
                // Check if it's already in our common skills list (normalize)
                const normalized = trimmed.replace(/[^\w\s]/g, '').trim();
                if (normalized && !skills.some(existing => existing.toLowerCase() === normalized.toLowerCase() || existing.toLowerCase() === trimmed.toLowerCase())) {
                  skills.push(trimmed);
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️ [QUALITY SCORING] Error matching skill pattern:`, err);
      }
    });
    
    // Remove duplicates and return
    const uniqueSkills = [];
    skills.forEach(skill => {
      if (!uniqueSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
        uniqueSkills.push(skill);
      }
    });
    
    return uniqueSkills;
  }
  
  /**
   * Helper: Extract experiences from plain text (fallback when sections aren't available)
   */
  function extractExperiencesFromText(text) {
    if (!text) {
      console.log(`⚠️ [QUALITY SCORING] extractExperiencesFromText: No text provided`);
      return [];
    }
    
    console.log(`🔍 [QUALITY SCORING] extractExperiencesFromText: Analyzing ${text.length} characters of text`);
    const experiences = [];
    
    // Count bullet points first (lines starting with • or - or *)
    const bulletPattern = /^[\s]*[•\-\*]\s+(.+)$/gm;
    const bullets = [];
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      bullets.push(match[1].trim());
    }
    console.log(`  Found ${bullets.length} bullet points in text`);
    
    // Try to find experience entries by looking for "Company | Position" pattern
    // This pattern works even outside of a "WORK EXPERIENCE" section
    const companyPositionPattern = /([A-Z][A-Za-z0-9\s&,\.\-]+?)\s*\|\s*([A-Z][A-Za-z\s&,\.\-]+)/g;
    const companyMatches = [];
    let companyMatch;
    while ((companyMatch = companyPositionPattern.exec(text)) !== null) {
      companyMatches.push({
        company: companyMatch[1].trim(),
        title: companyMatch[2].trim(),
        index: companyMatch.index,
        fullMatch: companyMatch[0]
      });
    }
    console.log(`  Found ${companyMatches.length} "Company | Position" patterns`);
    
    // Try to find experience entries
    const lines = text.split(/\r?\n/);
    let currentExp = null;
    let inExperienceSection = false;
    let experienceSectionStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();
      
      // Detect start of experience section (more flexible)
      if (/^(work\s+)?experience/i.test(line) || lineLower.includes('work experience')) {
        inExperienceSection = true;
        experienceSectionStart = i;
        console.log(`  Found WORK EXPERIENCE section at line ${i + 1}`);
        continue;
      }
      
      // Detect end of experience section
      if (inExperienceSection && /^(education|summary|technical|projects|skills|certifications|awards|honors)/i.test(line)) {
        inExperienceSection = false;
        if (currentExp) {
          experiences.push(currentExp);
          console.log(`  Completed experience: ${currentExp.company} | ${currentExp.title} (${currentExp.bullets} bullets)`);
          currentExp = null;
        }
        console.log(`  Exited WORK EXPERIENCE section at line ${i + 1}`);
        continue;
      }
      
      // Look for company | position pattern anywhere (not just in section)
      const companyMatch = line.match(/([A-Z][A-Za-z0-9\s&,\.\-]+?)\s*\|\s*([A-Z][A-Za-z\s&,\.\-]+)/);
      if (companyMatch) {
        // If we're in experience section or this looks like an experience entry
        if (inExperienceSection || i > experienceSectionStart) {
          if (currentExp) {
            experiences.push(currentExp);
            console.log(`  Completed experience: ${currentExp.company} | ${currentExp.title} (${currentExp.bullets} bullets)`);
          }
          currentExp = {
            company: companyMatch[1].trim(),
            title: companyMatch[2].trim(),
            bullets: 0
          };
          console.log(`  Found experience at line ${i + 1}: ${currentExp.company} | ${currentExp.title}`);
        }
      }
      
      // Count bullets for current experience
      if (currentExp && /^[\s]*[•\-\*]/.test(line)) {
        currentExp.bullets = (currentExp.bullets || 0) + 1;
      }
      
      // Also check for date patterns that might indicate a new experience entry
      // Pattern: "Month Year – Present" or "Month Year – Month Year" or "Month YYYY – Month YYYY"
      const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*[–\-]\s*(?:Present|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i;
      if (datePattern.test(line)) {
        // If we have a date but no current experience, try to find company/position from previous lines
        if (!currentExp && (inExperienceSection || i > experienceSectionStart)) {
          // Look back up to 3 lines for company | position pattern
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const prevLine = lines[j].trim();
            const prevCompanyMatch = prevLine.match(/([A-Z][A-Za-z0-9\s&,\.\-]+?)\s*\|\s*([A-Z][A-Za-z\s&,\.\-]+)/);
            if (prevCompanyMatch) {
              currentExp = {
                company: prevCompanyMatch[1].trim(),
                title: prevCompanyMatch[2].trim(),
                bullets: 0
              };
              console.log(`  Found experience from date line ${i + 1}: ${currentExp.company} | ${currentExp.title}`);
              break;
            }
          }
        }
      }
    }
    
    // Add the last experience if we have one
    if (currentExp) {
      experiences.push(currentExp);
      console.log(`  Completed final experience: ${currentExp.company} | ${currentExp.title} (${currentExp.bullets} bullets)`);
    }
    
    // If we found company|position patterns but no structured experiences, create experiences from them
    if (experiences.length === 0 && companyMatches.length > 0) {
      console.log(`  No structured experiences found, creating from ${companyMatches.length} company|position patterns`);
      companyMatches.forEach((match, idx) => {
        // Estimate bullets: count bullets between this match and the next match (or end)
        const nextMatchIndex = idx < companyMatches.length - 1 ? companyMatches[idx + 1].index : text.length;
        const sectionText = text.substring(match.index, nextMatchIndex);
        const sectionBullets = (sectionText.match(/[•\-\*]/g) || []).length;
        
        experiences.push({
          company: match.company,
          title: match.title,
          bullets: Math.max(1, sectionBullets) // At least 1 bullet
        });
        console.log(`  Created experience: ${match.company} | ${match.title} (${sectionBullets} bullets)`);
      });
    }
    
    // If still no experiences found but we have bullets, estimate from bullet points
    if (experiences.length === 0 && bullets.length > 0) {
      console.log(`  Still no experiences found, estimating from ${bullets.length} bullet points`);
      // Assume roughly 3-5 bullets per experience
      const estimatedExperiences = Math.max(1, Math.floor(bullets.length / 4));
      const bulletsPerExp = Math.floor(bullets.length / estimatedExperiences);
      for (let i = 0; i < estimatedExperiences; i++) {
        experiences.push({
          title: 'Work Experience',
          company: 'Unknown',
          bullets: bulletsPerExp
        });
      }
      console.log(`  Estimated ${estimatedExperiences} experiences with ${bulletsPerExp} bullets each`);
    }
    
    console.log(`✅ [QUALITY SCORING] extractExperiencesFromText: Found ${experiences.length} experiences with ${experiences.reduce((sum, exp) => sum + (exp.bullets || 0), 0)} total bullets`);
    return experiences;
  }
  
  /**
   * Helper: Get full resume text for keyword matching
   * IMPORTANT: This text is used by the AI to analyze the resume, so it MUST include ALL content
   * including experience bullet points, descriptions, achievements, etc.
   */
  function getResumeText(resume) {
    if (!resume) return '';
    
    // Start with extracted text from file (this contains ALL content including bullets)
    let text = resume.text && resume.text.trim().length > 50 ? resume.text.trim() : '';
    
    // Build comprehensive text from sections (to supplement or replace if no file text)
    let sectionsText = '';
    if (resume.sections) {
      if (resume.sections.summary?.bio) sectionsText += resume.sections.summary.bio + ' ';
      if (resume.sections.summary?.title) sectionsText += resume.sections.summary.title + ' ';
      if (resume.sections.summary?.full_name) sectionsText += resume.sections.summary.full_name + ' ';
      
      // Extract all skills (including categorized)
      const allSkills = extractSkillsFromResume(resume);
      if (allSkills.length > 0) {
        sectionsText += allSkills.join(' ') + ' ';
      }
      
      // Check both 'experience' and 'employment' sections - CRITICAL: Include ALL bullet content
      const experienceSection = resume.sections.experience || resume.sections.employment;
      if (experienceSection) {
        const expArray = Array.isArray(experienceSection) ? experienceSection : Object.values(experienceSection);
        expArray.forEach((exp, idx) => {
          if (exp && typeof exp === 'object') {
            // Add company, title, position
            if (exp.company) sectionsText += exp.company + ' ';
            if (exp.title) sectionsText += exp.title + ' ';
            if (exp.position) sectionsText += exp.position + ' ';
            
            // CRITICAL: Include description (often contains bullet points as text)
          if (exp.description) {
              const desc = typeof exp.description === 'string' 
                ? exp.description 
                : (Array.isArray(exp.description) ? exp.description.join(' ') : '');
              sectionsText += desc + ' ';
            }
            
            // CRITICAL: Include bullets array (each bullet point)
            if (exp.bullets && Array.isArray(exp.bullets)) {
              exp.bullets.forEach(bullet => {
                if (bullet && typeof bullet === 'string' && bullet.trim().length > 0) {
                  sectionsText += bullet.trim() + ' ';
                } else if (bullet && typeof bullet === 'object' && bullet.text) {
                  sectionsText += bullet.text.trim() + ' ';
          }
        });
      }
            
            // CRITICAL: Include achievements array
            if (exp.achievements && Array.isArray(exp.achievements)) {
              exp.achievements.forEach(achievement => {
                if (achievement && typeof achievement === 'string' && achievement.trim().length > 0) {
                  sectionsText += achievement.trim() + ' ';
                } else if (achievement && typeof achievement === 'object' && achievement.text) {
                  sectionsText += achievement.text.trim() + ' ';
                }
              });
            }
            
            // Also check for other possible fields that might contain bullet content
            if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
              exp.responsibilities.forEach(resp => {
                if (resp && typeof resp === 'string') sectionsText += resp.trim() + ' ';
              });
            }
            
            if (exp.duties && Array.isArray(exp.duties)) {
              exp.duties.forEach(duty => {
                if (duty && typeof duty === 'string') sectionsText += duty.trim() + ' ';
              });
            }
          }
        });
      }
      
      if (resume.sections.projects) {
        const projArray = Array.isArray(resume.sections.projects) ? resume.sections.projects : Object.values(resume.sections.projects);
        projArray.forEach(proj => {
          if (proj && typeof proj === 'object') {
            if (proj.name) sectionsText += proj.name + ' ';
            if (proj.title) sectionsText += proj.title + ' ';
          if (proj.description) {
              const desc = typeof proj.description === 'string' 
                ? proj.description 
                : (Array.isArray(proj.description) ? proj.description.join(' ') : '');
              sectionsText += desc + ' ';
            }
            if (proj.technologies && Array.isArray(proj.technologies)) {
              sectionsText += proj.technologies.join(' ') + ' ';
            }
          }
        });
      }
      
      if (resume.sections.education) {
        const eduArray = Array.isArray(resume.sections.education) ? resume.sections.education : Object.values(resume.sections.education);
        eduArray.forEach(edu => {
          if (edu && typeof edu === 'object') {
            if (edu.degree) sectionsText += edu.degree + ' ';
            if (edu.degree_type) sectionsText += edu.degree_type + ' ';
            if (edu.field) sectionsText += edu.field + ' ';
            if (edu.field_of_study) sectionsText += edu.field_of_study + ' ';
            if (edu.school) sectionsText += edu.school + ' ';
            if (edu.institution) sectionsText += edu.institution + ' ';
          }
        });
      }
    }
    
    // Combine extracted text with sections text
    // Prefer extracted text (from PDF) as it contains the full formatted content
    // But also include sections text to ensure nothing is missed
    if (text && sectionsText) {
      // If we have both, combine them (extracted text first, then sections)
      // This ensures the AI sees ALL content
      const combined = text + ' ' + sectionsText.trim();
      console.log(`📋 [QUALITY SCORING] getResumeText: Combined ${text.length} chars from file + ${sectionsText.length} chars from sections = ${combined.length} total`);
      return combined;
    } else if (text) {
      console.log(`📋 [QUALITY SCORING] getResumeText: Using extracted file text (${text.length} chars)`);
    return text;
    } else if (sectionsText) {
      console.log(`📋 [QUALITY SCORING] getResumeText: Using sections text (${sectionsText.length} chars)`);
      return sectionsText.trim();
    }
    
    return '';
  }
  
  /**
   * Helper: Normalize skill name for comparison
   * Handles variations like "REST API" vs "RESTful API" vs "restful api"
   */
  function normalizeSkill(skill) {
    if (!skill) return '';
    let normalized = skill.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    // Handle REST API variations: "rest api", "restful api", "restful", "rest" should all match
    if (normalized.includes('rest')) {
      // Normalize all REST variations to "rest api"
      normalized = normalized.replace(/\brestful\b/g, 'rest');
      normalized = normalized.replace(/\brest\s+api\b/g, 'rest api');
      normalized = normalized.replace(/\brest\b(?!\s+api)/g, 'rest api'); // If just "rest" without "api", add "api"
    }
    
    // Handle other common variations
    // "node.js" -> "nodejs", "node" -> "nodejs"
    if (normalized.includes('node') && !normalized.includes('nodejs')) {
      normalized = normalized.replace(/\bnode\.?js\b/g, 'nodejs');
      normalized = normalized.replace(/\bnode\b(?!js)/g, 'nodejs');
    }
    
    return normalized;
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
      
      // Weighted average: Resume 60%, Cover Letter 40% (if LinkedIn not available, otherwise Resume 60%, Cover Letter 30%, LinkedIn 10%)
      let overallScore = 0;
      let totalWeight = 0;

      const hasLinkedIn = data.linkedin_score !== null && data.linkedin_score !== undefined;

      if (data.resume_score !== null && data.resume_score !== undefined) {
        overallScore += data.resume_score * 0.6;
        totalWeight += 0.6;
      }

      if (data.cover_letter_score !== null && data.cover_letter_score !== undefined) {
        // If LinkedIn is available, cover letter is 30%, otherwise 40%
        const coverWeight = hasLinkedIn ? 0.3 : 0.4;
        overallScore += data.cover_letter_score * coverWeight;
        totalWeight += coverWeight;
      }

      if (hasLinkedIn) {
        overallScore += data.linkedin_score * 0.1;
        totalWeight += 0.1;
      }

      // If no materials provided, return 0
      if (totalWeight === 0) {
        return 0;
      }

      // Normalize if weights don't add up to 1.0 (shouldn't happen with new logic, but keep for safety)
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
          
          // Check 1: Exact match in extracted skills list (using improved normalization)
          const foundInSkills = actualSkills.some(actualSkill => {
            const normalizedActual = normalizeSkill(actualSkill);
            return normalizedMissing === normalizedActual || 
                   normalizedActual.includes(normalizedMissing) || 
                   normalizedMissing.includes(normalizedActual);
          });
          
          // Check 2: Check if skill appears anywhere in resume text (case-insensitive, partial match)
          const foundInText = resumeText.includes(normalizedMissing);
          
          // Check 3: Handle variations (e.g., "Node.js" vs "Nodejs" vs "node", "REST API" vs "RESTful API")
          const skillVariations = [
            normalizedMissing,
            normalizedMissing.replace(/\./g, ''), // Remove dots: "node.js" -> "nodejs"
            normalizedMissing.replace(/\s+/g, ''), // Remove spaces: "react native" -> "reactnative"
            normalizedMissing.split(' ')[0], // First word only: "react native" -> "react"
            normalizedMissing.replace(/\.js$/, ''), // Remove .js suffix: "react.js" -> "react"
            normalizedMissing.replace(/\./g, '').replace(/js$/, ''), // "node.js" -> "node"
            // Handle REST API variations: "rest api", "restful api", "restful" should all match
            normalizedMissing.replace(/\brestful\b/g, 'rest'), // "restful api" -> "rest api"
            normalizedMissing.replace(/\brest\s+api\b/g, 'rest api'), // Normalize "rest api"
            normalizedMissing.replace(/\brest\b(?!\s+api)/g, 'rest api'), // "rest" -> "rest api"
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

      // 5. Calculate overall score as weighted average (Resume 60%, Cover Letter 40% if no LinkedIn, otherwise Resume 60%, Cover Letter 30%, LinkedIn 10%)
      // IGNORE the AI's overall_score - we calculate it ourselves from component scores
      let overallScore = 0;
      let totalWeight = 0;

      const hasLinkedIn = scoreData.linkedin_score !== null && scoreData.linkedin_score !== undefined;

      if (scoreData.resume_score !== null && scoreData.resume_score !== undefined) {
        const resumeContribution = scoreData.resume_score * 0.6;
        overallScore += resumeContribution;
        totalWeight += 0.6;
        console.log(`  Resume: ${scoreData.resume_score} × 0.6 = ${resumeContribution}`);
      }

      if (scoreData.cover_letter_score !== null && scoreData.cover_letter_score !== undefined) {
        // If LinkedIn is available, cover letter is 30%, otherwise 40%
        const coverWeight = hasLinkedIn ? 0.3 : 0.4;
        const coverContribution = scoreData.cover_letter_score * coverWeight;
        overallScore += coverContribution;
        totalWeight += coverWeight;
        console.log(`  Cover Letter: ${scoreData.cover_letter_score} × ${coverWeight} = ${coverContribution}`);
      }

      if (hasLinkedIn) {
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
        // Calculate weighted average (should be exactly 1.0 now, but keep division for safety)
        const rawScore = overallScore / totalWeight;
        overallScore = Math.round(rawScore);
        console.log(`  Weighted calculation: ${overallScore / totalWeight * totalWeight} / ${totalWeight} = ${rawScore.toFixed(2)}, Final: ${overallScore}`);
      }
      
      // Ensure score is between 0-100
      overallScore = Math.max(0, Math.min(100, overallScore));
      
      // Count skills and experiences from resume for post-processing validation
      // Use the extraction function to get accurate counts
      let skillCount = 0;
      let experienceCount = 0;
      let totalBullets = 0;
      
      if (materials.resume) {
        console.log(`🔍 [QUALITY SCORING] Analyzing resume structure:`, {
          hasSections: !!materials.resume.sections,
          sectionsKeys: materials.resume.sections ? Object.keys(materials.resume.sections) : [],
          hasText: !!materials.resume.text,
          textLength: materials.resume.text?.length || 0
        });
        
        // Extract all skills using the comprehensive extraction function
        const allSkills = extractSkillsFromResume(materials.resume);
        skillCount = allSkills.length;
        console.log(`🔍 [QUALITY SCORING] Extracted ${skillCount} skills from resume: ${allSkills.slice(0, 15).join(', ')}${allSkills.length > 15 ? '...' : ''}`);
        
        // If no skills found from sections, try extracting from text
        if (skillCount === 0 && materials.resume.text) {
          console.log(`⚠️ [QUALITY SCORING] No skills found in sections, attempting text extraction...`);
          const textSkills = extractSkillsFromText(materials.resume.text);
          if (textSkills.length > 0) {
            skillCount = textSkills.length;
            console.log(`✅ [QUALITY SCORING] Extracted ${skillCount} skills from text: ${textSkills.slice(0, 15).join(', ')}${textSkills.length > 15 ? '...' : ''}`);
          }
        }
        
        // Count work experiences - check both 'experience' and 'employment' sections
        const experienceSection = materials.resume.sections?.experience || materials.resume.sections?.employment;
        
        if (experienceSection) {
          if (Array.isArray(experienceSection)) {
            experienceCount = experienceSection.length;
            experienceSection.forEach((exp, idx) => {
              if (exp && typeof exp === 'object') {
                // Check description field
            if (exp.description) {
              const bullets = typeof exp.description === 'string' 
                    ? exp.description.split(/\n|•|\r/).filter(b => b.trim() && b.trim().length > 0)
                    : Array.isArray(exp.description) ? exp.description.filter(b => b && b.trim().length > 0) : [];
              totalBullets += bullets.length;
                  console.log(`  Experience ${idx + 1}: ${exp.title || exp.position || 'Untitled'} at ${exp.company || 'Unknown'} - ${bullets.length} bullets`);
                }
                // Check bullets array field
                if (exp.bullets && Array.isArray(exp.bullets)) {
                  const bulletCount = exp.bullets.filter(b => b && b.trim().length > 0).length;
                  totalBullets += bulletCount;
                  console.log(`  Experience ${idx + 1}: Additional ${bulletCount} bullets from bullets array`);
                }
                // Check achievements array field
                if (exp.achievements && Array.isArray(exp.achievements)) {
                  const achievementCount = exp.achievements.filter(b => b && b.trim().length > 0).length;
                  totalBullets += achievementCount;
                  console.log(`  Experience ${idx + 1}: Additional ${achievementCount} bullets from achievements array`);
                }
              }
            });
          } else if (typeof experienceSection === 'object' && !Array.isArray(experienceSection)) {
            // Handle object format where keys might be job IDs or indices
            const expArray = Object.values(experienceSection).filter(exp => exp && typeof exp === 'object');
            experienceCount = expArray.length;
            expArray.forEach((exp, idx) => {
              // Track bullets to avoid double-counting
              const countedBullets = new Set();
              let bulletsFromDescription = 0;
              
              // Count bullets from description (only actual bullet points, not all lines)
              if (exp.description) {
                if (typeof exp.description === 'string') {
                  // Split by newlines and filter for actual bullet points
                  const lines = exp.description.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                  // Only count lines that look like bullet points (start with •, -, *, or are indented)
                  const actualBullets = lines.filter(line => {
                    // Bullet markers: •, -, *, or lines that start with common bullet patterns
                    return /^[•\-\*]\s/.test(line) || 
                           /^\d+[\.\)]\s/.test(line) || // Numbered bullets: 1. or 1)
                           (line.length > 10 && /^[A-Z]/.test(line) && line.match(/\b(?:built|developed|created|designed|implemented|managed|led|improved|increased|reduced|optimized|achieved|delivered)\b/i)); // Action verb bullets
                  });
                  bulletsFromDescription = actualBullets.length;
                  actualBullets.forEach(b => countedBullets.add(b.toLowerCase().trim()));
                } else if (Array.isArray(exp.description)) {
                  bulletsFromDescription = exp.description.filter(b => b && b.trim().length > 0).length;
                  exp.description.forEach(b => countedBullets.add(String(b).toLowerCase().trim()));
                }
                totalBullets += bulletsFromDescription;
                console.log(`  Experience ${idx + 1}: ${exp.title || exp.position || 'Untitled'} at ${exp.company || 'Unknown'} - ${bulletsFromDescription} bullets from description`);
              }
              
              // Count bullets array (only if not already counted in description)
              if (exp.bullets && Array.isArray(exp.bullets)) {
                const newBullets = exp.bullets.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const bulletText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = bulletText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newBullets.length;
                if (newBullets.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newBullets.length} bullets from bullets array (${exp.bullets.length} total, ${exp.bullets.length - newBullets.length} duplicates skipped)`);
                }
              }
              
              // Count achievements array (only if not already counted)
              if (exp.achievements && Array.isArray(exp.achievements)) {
                const newAchievements = exp.achievements.filter(b => {
                  if (!b || !b.trim().length) return false;
                  const achievementText = typeof b === 'string' ? b.trim() : (b.text || String(b)).trim();
                  const key = achievementText.toLowerCase();
                  // Only count if not already counted
                  if (!countedBullets.has(key)) {
                    countedBullets.add(key);
                    return true;
                  }
                  return false;
                });
                totalBullets += newAchievements.length;
                if (newAchievements.length > 0) {
                  console.log(`  Experience ${idx + 1}: Additional ${newAchievements.length} bullets from achievements array (${exp.achievements.length} total, ${exp.achievements.length - newAchievements.length} duplicates skipped)`);
                }
              }
            });
          }
        }
        
        // If no experiences found in sections, try extracting from text
        if (experienceCount === 0 && materials.resume.text) {
          console.log(`⚠️ [QUALITY SCORING] No experiences found in sections, attempting text extraction...`);
          const textExperiences = extractExperiencesFromText(materials.resume.text);
          if (textExperiences.length > 0) {
            experienceCount = textExperiences.length;
            totalBullets = textExperiences.reduce((sum, exp) => sum + (exp.bullets || 0), 0);
            console.log(`✅ [QUALITY SCORING] Extracted ${experienceCount} experiences from text with ${totalBullets} total bullets`);
          }
        }
        
        // Count projects - check 'projects' section
        let projectCount = 0;
        const projectsSection = materials.resume.sections?.projects;
        if (projectsSection) {
          if (Array.isArray(projectsSection)) {
            projectCount = projectsSection.length;
          } else if (typeof projectsSection === 'object' && !Array.isArray(projectsSection)) {
            const projArray = Object.values(projectsSection).filter(proj => proj && typeof proj === 'object');
            projectCount = projArray.length;
          }
        }
        
        console.log(`📊 [QUALITY SCORING] Parsed resume: ${skillCount} skills, ${experienceCount} experiences, ${totalBullets} bullets, ${projectCount} projects`);
      }
      
      // Count required skills from job
      const requiredSkillsCount = Array.isArray(materials.job.required_skills) 
        ? materials.job.required_skills.length 
        : 0;
      
      // Get project count for post-processing (reuse from above if available, otherwise count again)
      let projectCount = 0;
      if (materials.resume) {
        const projectsSection = materials.resume.sections?.projects;
        if (projectsSection) {
          if (Array.isArray(projectsSection)) {
            projectCount = projectsSection.length;
          } else if (typeof projectsSection === 'object' && !Array.isArray(projectsSection)) {
            const projArray = Object.values(projectsSection).filter(proj => proj && typeof proj === 'object');
            projectCount = projArray.length;
          }
        }
      }
      
      console.log(`📊 [QUALITY SCORING] Resume analysis: ${skillCount} skills, ${experienceCount} experiences, ${totalBullets} bullets, ${projectCount} projects`);
      console.log(`📊 [QUALITY SCORING] Job requires: ${requiredSkillsCount} skills`);
      if (experienceCount > 0) {
        console.log(`📊 [QUALITY SCORING] Bullet analysis: ${totalBullets} total bullets ÷ ${experienceCount} jobs = ${(totalBullets/experienceCount).toFixed(1)} bullets per job (industry standard: 4-6 bullets per job is good)`);
      }
      
      // POST-PROCESSING: Apply penalties and rewards based on resume comprehensiveness
      // SCORING METRICS SUMMARY:
      // - Skills: 8+ is good, 15+ is excellent, <8 gets penalty (reduced by 5 points)
      // - Experience: 3+ is good, 2 gets -5 penalty, 1 gets -15 penalty (reduced by 5 points)
      // - Bullets: No penalty applied (removed)
      // - Projects: 2+ is good, gets +5 reward
      // - Skill match: <50% match caps score at 65, <70% caps at 75 (reduced by 5 points)
      let adjustedScore = overallScore;
      
      // Penalty for sparse skills (reduced by 5 points)
      if (skillCount <= 5) {
        adjustedScore = Math.min(adjustedScore, 60); // Was 55, now 60
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${skillCount} skills, capping score at 60`);
      } else if (skillCount < 8) {
        adjustedScore = Math.min(adjustedScore, 70); // Was 65, now 70
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${skillCount} skills, capping score at 70`);
      }
      
      // Penalty for sparse experience (reduced by 5 points)
      if (experienceCount === 1) {
        adjustedScore = Math.max(0, adjustedScore - 15); // Was 20, now 15
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only 1 experience, reducing score by 15`);
      } else if (experienceCount === 2) {
        adjustedScore = Math.max(0, adjustedScore - 5); // Was 10, now 5
        console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only 2 experiences, reducing score by 5`);
      }
      
      // Bullet points penalty REMOVED - no longer penalizing based on bullet count
      if (experienceCount > 0) {
        const avgBulletsPerJob = totalBullets / experienceCount;
        console.log(`✅ [QUALITY SCORING] Bullet count: ${totalBullets} bullets for ${experienceCount} jobs (avg ${avgBulletsPerJob.toFixed(1)} per job) - no penalty applied`);
      }
      
      // Penalty for not matching job requirements (reduced by 5 points)
      if (requiredSkillsCount > 0 && skillCount > 0) {
        const matchPercentage = (skillCount / requiredSkillsCount) * 100;
        if (matchPercentage < 50) {
          adjustedScore = Math.min(adjustedScore, 65); // Was 60, now 65
          console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${(matchPercentage).toFixed(0)}% of required skills, capping score at 65`);
        } else if (matchPercentage < 70) {
          adjustedScore = Math.min(adjustedScore, 75); // Was 70, now 75
          console.log(`⚠️ [QUALITY SCORING] Applying penalty: Resume has only ${(matchPercentage).toFixed(0)}% of required skills, capping score at 75`);
        }
      }
      
      // Reward for comprehensive resume
      if (skillCount >= 15 && experienceCount >= 3 && totalBullets >= 15 && projectCount >= 2) {
        adjustedScore = Math.min(100, adjustedScore + 15);
        console.log(`✅ [QUALITY SCORING] Applying reward: Comprehensive resume (${skillCount} skills, ${experienceCount} jobs, ${totalBullets} bullets, ${projectCount} projects), adding 15 points`);
      } else if (skillCount >= 10 && experienceCount >= 2 && totalBullets >= 10 && projectCount >= 2) {
        adjustedScore = Math.min(100, adjustedScore + 10);
        console.log(`✅ [QUALITY SCORING] Applying reward: Good resume (${skillCount} skills, ${experienceCount} jobs, ${totalBullets} bullets, ${projectCount} projects), adding 10 points`);
      } else if (projectCount >= 2) {
        adjustedScore = Math.min(100, adjustedScore + 5);
        console.log(`✅ [QUALITY SCORING] Applying reward: Resume has 2+ projects, adding 5 points`);
      }
      
      // Add bonus to skills_alignment: 2 points per matched skill
      if (materials.resume && materials.job && materials.job.required_skills && Array.isArray(materials.job.required_skills) && materials.job.required_skills.length > 0) {
        const resumeSkills = extractSkillsFromResume(materials.resume);
        const requiredSkills = materials.job.required_skills.map(s => s.toLowerCase().trim());
        
        // Normalize resume skills for comparison
        const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase().trim());
        
        // Count matched skills (skills that appear in both lists)
        const matchedSkills = requiredSkills.filter(reqSkill => {
          const reqNormalized = normalizeSkill(reqSkill);
          
          // Check exact match using normalized function
          if (normalizedResumeSkills.some(resSkill => normalizeSkill(resSkill) === reqNormalized)) {
            return true;
          }
          
          // Check partial match (e.g., "node.js" matches "nodejs" or "node")
          return normalizedResumeSkills.some(resSkill => {
            const resNormalized = normalizeSkill(resSkill);
            return reqNormalized === resNormalized || 
                   reqNormalized.includes(resNormalized) || 
                   resNormalized.includes(reqNormalized);
          });
        });
        
        if (matchedSkills.length > 0 && scoreData.score_breakdown && scoreData.score_breakdown.skills_alignment !== null && scoreData.score_breakdown.skills_alignment !== undefined) {
          const currentScore = scoreData.score_breakdown.skills_alignment;
          const bonus = matchedSkills.length * 2; // 2 points per matched skill
          const newScore = Math.min(100, currentScore + bonus);
          scoreData.score_breakdown.skills_alignment = newScore;
          console.log(`✅ [QUALITY SCORING] Skills alignment bonus: ${matchedSkills.length} matched skills (${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? '...' : ''}), adding ${bonus} points. Score: ${currentScore} → ${newScore}`);
        }
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


