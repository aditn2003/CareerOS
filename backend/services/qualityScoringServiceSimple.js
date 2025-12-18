// backend/services/qualityScoringServiceSimple.js
// Simplified Quality Scoring Service - AI-based job-resume matching

import { Pool } from "pg";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

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
 * Simple Quality Scoring Service
 */
export function createSimpleQualityScoringService(openaiClient = null, dbPool = null) {
  const pool = dbPool || new Pool({ connectionString: process.env.DATABASE_URL });
  const openai = openaiClient || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  /**
   * Extract text from PDF
   */
  async function extractPdfText(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text.trim();
    } catch (err) {
      console.error("❌ PDF extraction error:", err);
      return "";
    }
  }

  /**
   * Extract text from DOCX
   */
  async function extractDocxText(buffer) {
    if (!mammoth) return "";
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    } catch (err) {
      console.error("❌ DOCX extraction error:", err);
      return "";
    }
  }

  /**
   * Get resume text from all sources
   */
  function getResumeText(resume) {
    if (!resume) return "";
    
    let text = "";
    
    // Use extracted text if available (from PDF/DOCX)
    if (resume.text && resume.text.trim().length > 0) {
      text = resume.text.trim();
      console.log(`📄 [QUALITY] Using extracted file text (${text.length} chars)`);
    }
    
    // Add/supplement with sections content
    if (resume.sections) {
      const sections = resume.sections;
      let sectionsText = "";
      
      // Profile/Summary
      if (sections.profile || sections.summary) {
        const profile = sections.profile || sections.summary;
        if (typeof profile === 'string') {
          sectionsText += "\n\nSUMMARY:\n" + profile;
        } else if (profile.bio || profile.summary) {
          sectionsText += "\n\nSUMMARY:\n" + (profile.bio || profile.summary);
        }
      }
      
      // Skills - handle various formats
      if (sections.skills) {
        sectionsText += "\n\nSKILLS:\n";
        if (Array.isArray(sections.skills)) {
          sectionsText += sections.skills.map(s => {
            if (typeof s === 'string') return s;
            if (s.name) return s.name;
            if (s.skill) return s.skill;
            return JSON.stringify(s);
          }).join(", ");
        } else if (typeof sections.skills === 'object') {
          // Handle categorized skills: { "Programming": ["Python", "Java"], ... }
          Object.entries(sections.skills).forEach(([category, skills]) => {
            if (Array.isArray(skills)) {
              sectionsText += `${category}: ${skills.join(", ")}\n`;
            }
          });
        }
      }
      
      // Experience/Employment
      const exp = sections.experience || sections.employment;
      if (exp) {
        sectionsText += "\n\nWORK EXPERIENCE:\n";
        const expArray = Array.isArray(exp) ? exp : Object.values(exp);
        expArray.forEach(e => {
          if (!e || typeof e !== 'object') return;
          sectionsText += `\n${e.title || e.position || 'Position'} at ${e.company || 'Company'}`;
          if (e.start_date || e.startDate) {
            sectionsText += ` (${e.start_date || e.startDate} - ${e.end_date || e.endDate || 'Present'})`;
          }
          sectionsText += "\n";
          if (e.description) {
            sectionsText += typeof e.description === 'string' ? e.description : e.description.join("\n");
            sectionsText += "\n";
          }
          if (e.bullets && Array.isArray(e.bullets)) {
            sectionsText += e.bullets.map(b => `• ${typeof b === 'string' ? b : b.text || b}`).join("\n") + "\n";
          }
          if (e.achievements && Array.isArray(e.achievements)) {
            sectionsText += e.achievements.map(a => `• ${a}`).join("\n") + "\n";
          }
        });
      }
      
      // Education
      if (sections.education) {
        sectionsText += "\n\nEDUCATION:\n";
        const eduArray = Array.isArray(sections.education) ? sections.education : [sections.education];
        eduArray.forEach(e => {
          if (!e || typeof e !== 'object') return;
          sectionsText += `${e.degree || e.degree_type || ''} in ${e.field_of_study || e.major || ''}`;
          sectionsText += ` - ${e.institution || e.school || 'Institution'}`;
          if (e.graduation_date || e.graduationDate) {
            sectionsText += ` (${e.graduation_date || e.graduationDate})`;
          }
          sectionsText += "\n";
        });
      }
      
      // Projects
      if (sections.projects) {
        sectionsText += "\n\nPROJECTS:\n";
        const projArray = Array.isArray(sections.projects) ? sections.projects : Object.values(sections.projects);
        projArray.forEach(p => {
          if (!p || typeof p !== 'object') return;
          sectionsText += `\n${p.name || p.title || 'Project'}`;
          if (p.technologies || p.tech) {
            const tech = p.technologies || p.tech;
            sectionsText += ` [${Array.isArray(tech) ? tech.join(", ") : tech}]`;
          }
          sectionsText += "\n";
          if (p.description) sectionsText += p.description + "\n";
        });
      }
      
      // Certifications
      if (sections.certifications) {
        sectionsText += "\n\nCERTIFICATIONS:\n";
        const certArray = Array.isArray(sections.certifications) ? sections.certifications : [sections.certifications];
        certArray.forEach(c => {
          if (typeof c === 'string') {
            sectionsText += c + "\n";
          } else if (c && typeof c === 'object') {
            sectionsText += `${c.name || c.title || ''} - ${c.organization || c.issuer || ''}\n`;
          }
        });
      }
      
      // If we have sections text, either use it alone or append to existing text
      if (sectionsText.trim().length > 0) {
        if (text.length < 100) {
          // File text is too short, use sections instead
          text = sectionsText.trim();
          console.log(`📄 [QUALITY] Using sections text (${text.length} chars)`);
        } else {
          // Append sections to supplement file text
          text += "\n\n--- STRUCTURED DATA ---" + sectionsText;
          console.log(`📄 [QUALITY] Combined file + sections text (${text.length} chars)`);
        }
      }
    }
    
    return text.trim();
  }

  /**
   * Get materials for a job application
   */
  async function getMaterials(jobId, userId) {
    // Get job details
    const jobResult = await pool.query(
      `SELECT id, title, company, description, required_skills, location, industry
       FROM jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    
    if (jobResult.rows.length === 0) {
      throw new Error("Job not found");
    }
    
    const job = jobResult.rows[0];
    
    // Check if job description exists
    if (!job.description || job.description.trim().length < 20) {
      return { job, resume: null, coverLetter: null, hasJobDescription: false };
    }
    
    // Get linked materials
    const materialsResult = await pool.query(
      `SELECT jm.resume_id, jm.cover_letter_id,
              r.title as resume_title, r.sections as resume_sections, 
              r.file_url as resume_file_url, r.format as resume_format,
              cl.content as cover_letter_content
       FROM job_materials jm
       LEFT JOIN resumes r ON r.id = jm.resume_id
       LEFT JOIN cover_letters cl ON cl.id = jm.cover_letter_id
       WHERE jm.job_id = $1 AND jm.user_id = $2`,
      [jobId, userId]
    );
    
    let resume = null;
    let coverLetter = null;
    
    console.log(`📋 [QUALITY] Found ${materialsResult.rows.length} linked materials for job ${jobId}`);
    
    if (materialsResult.rows.length > 0) {
      const row = materialsResult.rows[0];
      console.log(`📋 [QUALITY] Resume ID: ${row.resume_id}, Cover Letter ID: ${row.cover_letter_id}`);
      
      if (row.resume_id) {
        resume = {
          id: row.resume_id,
          title: row.resume_title,
          sections: row.resume_sections,
          file_url: row.resume_file_url,
          format: row.resume_format,
          text: ""
        };
        console.log(`📋 [QUALITY] Resume sections keys: ${row.resume_sections ? Object.keys(row.resume_sections).join(', ') : 'none'}`);
        
        // Extract text from PDF/DOCX if available
        if (resume.file_url) {
          try {
            const filePath = path.join(__dirname, "..", resume.file_url);
            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              if (resume.format === "pdf") {
                resume.text = await extractPdfText(buffer);
              } else if (resume.format === "docx") {
                resume.text = await extractDocxText(buffer);
              }
            }
          } catch (err) {
            console.error("Error extracting resume text:", err);
          }
        }
      }
      
      if (row.cover_letter_content) {
        coverLetter = { content: row.cover_letter_content };
      }
    }
    
    return { job, resume, coverLetter, hasJobDescription: true };
  }

  /**
   * Main scoring function - Simple AI-based analysis
   */
  async function analyzeApplicationQuality(jobId, userId, minimumThreshold = 70) {
    console.log(`🔍 [QUALITY] Starting simple analysis for job ${jobId}`);
    
    // Get materials
    const materials = await getMaterials(jobId, userId);
    
    // Check for job description
    if (!materials.hasJobDescription) {
      console.log(`⚠️ [QUALITY] No job description available`);
      return {
        overall_score: null,
        resume_score: null,
        cover_letter_score: null,
        error: "Cannot calculate score: Job description is missing. Please add a job description to analyze your application materials.",
        missing_job_description: true,
        meets_threshold: false
      };
    }
    
    // Check for resume
    const resumeText = getResumeText(materials.resume);
    console.log(`📄 [QUALITY] Resume text length: ${resumeText?.length || 0} chars`);
    console.log(`📄 [QUALITY] Resume preview: ${resumeText?.substring(0, 200)}...`);
    console.log(`📄 [QUALITY] Job description length: ${materials.job.description?.length || 0} chars`);
    
    if (!resumeText || resumeText.length < 50) {
      throw new Error("No resume found or resume is empty. Please link a resume to this job.");
    }
    
    const coverLetterText = materials.coverLetter?.content || "";
    
    // Simple AI prompt
    const prompt = `You are a job application reviewer. Score how well this resume matches the job.

JOB TITLE: ${materials.job.title}
COMPANY: ${materials.job.company}

JOB DESCRIPTION:
${materials.job.description}

RESUME:
${resumeText}

${coverLetterText ? `COVER LETTER:\n${coverLetterText}` : "No cover letter provided."}

SCORING TASK:
Rate the resume's fit for this specific job on a scale of 0-100.

Consider:
1. Does the resume have the skills mentioned in the job description?
2. Is the work experience relevant to this role?
3. Would this candidate likely get an interview for this specific job?

A score of:
- 80-100: Excellent match, has most required skills and relevant experience
- 60-79: Good match, has many relevant skills but missing some key ones
- 40-59: Moderate match, some relevant experience but significant gaps
- 20-39: Weak match, few matching skills or relevant experience
- 0-19: Poor match, wrong field or completely unqualified

Respond in this exact JSON format:
{
  "overall_score": <number 0-100>,
  "resume_score": <number 0-100>,
  "cover_letter_score": <number 0-100 or null if no cover letter>,
  "matching_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvement_suggestions": [
    {"priority": "high", "suggestion": "specific actionable advice"},
    {"priority": "medium", "suggestion": "specific actionable advice"}
  ]
}`;

    try {
      console.log(`🤖 [QUALITY] Calling OpenAI...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional recruiter and ATS expert. Be honest and accurate in your scoring." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI");
      }
      
      console.log(`🤖 [QUALITY] Raw AI response: ${content.substring(0, 500)}...`);
      
      const scoreData = JSON.parse(content);
      console.log(`✅ [QUALITY] Parsed scores - Overall: ${scoreData.overall_score}, Resume: ${scoreData.resume_score}`);
      console.log(`✅ [QUALITY] Matching skills: ${JSON.stringify(scoreData.matching_skills)}`);
      console.log(`✅ [QUALITY] Missing skills: ${JSON.stringify(scoreData.missing_skills)}`);
      
      // Ensure scores are valid numbers between 0-100
      const overall = Math.max(0, Math.min(100, Math.round(scoreData.overall_score || 0)));
      const resumeScore = Math.max(0, Math.min(100, Math.round(scoreData.resume_score || overall)));
      const coverLetterScore = coverLetterText 
        ? Math.max(0, Math.min(100, Math.round(scoreData.cover_letter_score || 50)))
        : null;
      
      return {
        overall_score: overall,
        resume_score: resumeScore,
        cover_letter_score: coverLetterScore,
        linkedin_score: null,
        score_breakdown: {
          skills_alignment: overall,
          experience_relevance: overall,
          keyword_match: overall,
          formatting_quality: 80, // Default since we're not doing detailed format analysis
          quantification: 70,
          ats_optimization: 75
        },
        matching_skills: scoreData.matching_skills || [],
        missing_skills: scoreData.missing_skills || [],
        missing_keywords: [],
        formatting_issues: [],
        inconsistencies: [],
        strengths: scoreData.strengths || [],
        weaknesses: scoreData.weaknesses || [],
        improvement_suggestions: (scoreData.improvement_suggestions || []).map(s => ({
          priority: s.priority || "medium",
          category: "general",
          suggestion: s.suggestion || s,
          impact: "Would improve your application",
          estimated_score_improvement: s.priority === "high" ? 10 : 5
        })),
        meets_threshold: overall >= minimumThreshold
      };
      
    } catch (err) {
      console.error("❌ [QUALITY] AI analysis failed:", err);
      throw err;
    }
  }

  return {
    analyzeApplicationQuality,
    getMaterials
  };
}

export default createSimpleQualityScoringService();

