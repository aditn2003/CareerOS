// backend/services/qualityScoringService.js
// UC-122: Application Package Quality Scoring - AI Analysis Engine

import { Pool } from "pg";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🤖 [QUALITY SCORING] Attempting OpenAI API call (attempt ${retryCount + 1}/${maxRetries})...`);
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
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
  function generateQualityScoreMessages(materials, jobDescription) {
    const { job, resume, coverLetter, linkedIn } = materials;
    
    const resumeText = resume?.sections 
      ? JSON.stringify(resume.sections, null, 2)
      : resume?.text || "Resume not provided";
    
    const coverLetterText = coverLetter?.content || coverLetter?.text || "Cover letter not provided";
    
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst and career coach specializing in application package quality assessment. You provide comprehensive, actionable feedback to help candidates improve their job applications.`;

    const userPrompt = `Analyze the following job application package and provide a comprehensive quality score with detailed feedback.

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
  "missing_keywords": ["React", "TypeScript", "Agile"],
  "missing_skills": ["AWS", "Docker"],
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

SCORING CRITERIA (BE STRICT - Most resumes should score 50-70, only excellent ones score 80+):
1. **Keyword Match (0-100)**: Percentage of job description keywords found in application materials
   - 90-100: 90%+ keywords present, excellent match
   - 70-89: 70-89% keywords present, good match
   - 50-69: 50-69% keywords present, moderate match
   - 30-49: 30-49% keywords present, weak match
   - 0-29: Less than 30% keywords present, poor match

2. **Skills Alignment (0-100)**: How well applicant's skills match required skills
   - 90-100: All or nearly all required skills present
   - 70-89: Most required skills present (80%+)
   - 50-69: Some required skills present (50-79%)
   - 30-49: Few required skills present (30-49%)
   - 0-29: Very few or no required skills present

3. **Experience Relevance (0-100)**: How relevant past experience is to the job
   - 90-100: Highly relevant, direct experience in same role/industry
   - 70-89: Relevant, transferable experience
   - 50-69: Somewhat relevant, some transferable skills
   - 30-49: Limited relevance, minimal transferable skills
   - 0-29: Not relevant, unrelated experience

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

SCORING PENALTIES (Apply these to reduce scores):
- Each formatting issue (typo, inconsistency): -5 to -10 points
- Each missing critical keyword: -3 to -5 points
- Each missing required skill: -5 to -10 points
- Generic cover letter (no customization): -15 to -20 points
- Poor formatting quality: -10 to -20 points
- Lack of quantification: -10 to -15 points

IMPORTANT:
- BE STRICT: Most average resumes should score 50-65, good resumes 65-75, excellent resumes 75-85, exceptional resumes 85-95
- All scores must be integers between 0 and 100
- Overall score should be a weighted average (resume 60%, cover letter 30%, LinkedIn 10% if available)
- Apply penalties for formatting issues, missing keywords, and poor customization
- Missing keywords and skills should be specific and actionable
- Formatting issues should include exact location and fix
- Improvement suggestions must be prioritized (high/medium/low) and include estimated impact
- Return ONLY valid JSON, no markdown formatting or additional text`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
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

      // 3. Generate messages
      const messages = generateQualityScoreMessages(materials, materials.job.description);
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
      
      // OVERRIDE the AI's overall_score with our calculated one
      scoreData.overall_score = overallScore;
      
      console.log(`✅ [QUALITY SCORING] Final overall score: ${overallScore} (calculated from component scores, ignoring AI's overall_score)`);

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

