// backend/routes/successAnalysis.js

import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";
import { getRoleTypeFromTitle } from "../utils/roleTypeMapper.js";

const router = express.Router();

// Helper function to ensure numeric values
const ensureNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Helper function to categorize company size
const categorizeCompanySize = (size) => {
  if (!size) return "unknown";
  const s = String(size).toLowerCase();
  if (s.includes("startup") || s.includes("1-50") || s.includes("1-10")) return "startup";
  if (s.includes("mid") || s.includes("51-500") || s.includes("51-200") || s.includes("201-500")) return "mid-size";
  if (s.includes("enterprise") || s.includes("large") || s.includes("501+") || s.includes("1000+") || s.includes("5000+")) return "enterprise";
  // Try to parse numeric values
  const numMatch = s.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0]);
    if (num <= 50) return "startup";
    if (num <= 500) return "mid-size";
    return "enterprise";
  }
  return "unknown";
};

// Helper function to normalize application source
const normalizeSource = (source) => {
  if (!source) return "other";
  const s = String(source).toLowerCase();
  if (s.includes("linkedin")) return "LinkedIn";
  if (s.includes("indeed")) return "Indeed";
  if (s.includes("referral") || s.includes("refer")) return "Referral";
  if (s.includes("company") || s.includes("portal") || s.includes("website") || s.includes("careers")) return "Company Portal";
  if (s.includes("glassdoor")) return "Glassdoor";
  if (s.includes("monster")) return "Monster";
  return "Other";
};

// Chi-square test for independence
const chiSquareTest = (observed) => {
  // observed is a 2x2 contingency table: [[a, b], [c, d]]
  // where a = success in group 1, b = failure in group 1
  //       c = success in group 2, d = failure in group 2
  if (observed.length !== 2 || observed[0].length !== 2 || observed[1].length !== 2) {
    return { significant: false, pValue: 1, chiSquare: 0 };
  }
  
  const a = observed[0][0]; // success group 1
  const b = observed[0][1]; // failure group 1
  const c = observed[1][0]; // success group 2
  const d = observed[1][1]; // failure group 2
  
  const n = a + b + c + d;
  if (n === 0) return { significant: false, pValue: 1, chiSquare: 0 };
  
  const expected = [
    [(a + c) * (a + b) / n, (a + c) * (c + d) / n],
    [(b + d) * (a + b) / n, (b + d) * (c + d) / n]
  ];
  
  let chiSquare = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const obs = observed[i][j];
      const exp = expected[i][j];
      if (exp > 0) {
        chiSquare += Math.pow(obs - exp, 2) / exp;
      }
    }
  }
  
  // For 2x2 table, degrees of freedom = 1
  // Critical value for p < 0.05 is 3.84, for p < 0.01 is 6.63
  const pValue = chiSquare > 6.63 ? 0.01 : (chiSquare > 3.84 ? 0.05 : 1);
  const significant = chiSquare > 3.84;
  
  return { significant, pValue, chiSquare };
};

// T-test for comparing means
const tTest = (group1, group2) => {
  if (group1.length === 0 || group2.length === 0) {
    return { significant: false, pValue: 1, tStat: 0 };
  }
  
  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length;
  const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length;
  
  const var1 = group1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (group1.length - 1);
  const var2 = group2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (group2.length - 1);
  
  const pooledStd = Math.sqrt((var1 / group1.length) + (var2 / group2.length));
  if (pooledStd === 0) return { significant: false, pValue: 1, tStat: 0 };
  
  const tStat = Math.abs((mean1 - mean2) / pooledStd);
  const df = group1.length + group2.length - 2;
  
  // Simplified: t > 2.0 is roughly p < 0.05 for large samples
  const significant = tStat > 2.0;
  const pValue = significant ? 0.05 : 1;
  
  return { significant, pValue, tStat };
};

/* ============================================================
   UC-097: APPLICATION SUCCESS RATE ANALYSIS
   Route: GET /success-analysis/full
   ============================================================ */
router.get("/full", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    /* ------------------------------------------------------------------
       1. SUCCESS BY INDUSTRY
       (Try to infer industry from company name if missing)
    ------------------------------------------------------------------ */
    const industryQuery = `
      SELECT 
        j.industry,
        j.company,
        j.title,
        COUNT(*)::INTEGER AS total,
        SUM(CASE WHEN LOWER(j.status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
        SUM(CASE WHEN LOWER(j.status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
        SUM(CASE WHEN LOWER(j.status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
      FROM jobs j
      WHERE j.user_id = $1 
        AND (j."isarchived" IS NULL OR j."isarchived" = false)
      GROUP BY j.industry, j.company, j.title;
    `;
    const industryDataRaw = (await pool.query(industryQuery, [userId])).rows;
    
    // Helper to infer industry from company name or job title
    const inferIndustry = (industry, company, title) => {
      if (industry && industry.trim() && industry.toLowerCase() !== 'unknown') {
        return industry.trim();
      }
      const combined = `${company || ''} ${title || ''}`.toLowerCase();
      
      // Tech companies
      if (combined.match(/\b(google|microsoft|apple|amazon|meta|facebook|netflix|tesla|nvidia|intel|amd|oracle|salesforce|adobe|ibm|cisco|vmware|palantir|uber|lyft|airbnb|stripe|square|paypal|twilio|atlassian|slack|zoom|dropbox|box|splunk|databricks|snowflake|mongodb|elastic|gitlab|github|docker|kubernetes)\b/)) {
        return 'Technology';
      }
      // Finance
      if (combined.match(/\b(jpmorgan|chase|bank of america|goldman sachs|morgan stanley|wells fargo|citibank|citigroup|blackrock|fidelity|vanguard|bloomberg|fintech|trading|investment|banking)\b/)) {
        return 'Finance';
      }
      // Healthcare
      if (combined.match(/\b(johnson|pfizer|merck|novartis|roche|bayer|pharma|healthcare|medical|hospital|biotech)\b/)) {
        return 'Healthcare';
      }
      // Consulting
      if (combined.match(/\b(mckinsey|bain|boston consulting|bcg|deloitte|pwc|ey|kpmg|accenture|consulting)\b/)) {
        return 'Consulting';
      }
      // Retail/E-commerce
      if (combined.match(/\b(walmart|target|costco|amazon|retail|e-commerce|ecommerce)\b/)) {
        return 'Retail';
      }
      // Software/Engineering keywords
      if (combined.match(/\b(software|developer|engineer|programming|coding|tech|it|information technology)\b/)) {
        return 'Technology';
      }
      
      return 'Unknown';
    };
    
    // Group by inferred industry
    const industryMap = {};
    industryDataRaw.forEach(row => {
      const inferred = inferIndustry(row.industry, row.company, row.title);
      if (!industryMap[inferred]) {
        industryMap[inferred] = {
          industry: inferred,
          total: 0,
          interviews: 0,
          offers: 0,
          rejections: 0
        };
      }
      industryMap[inferred].total += ensureNumber(row.total);
      industryMap[inferred].interviews += ensureNumber(row.interviews);
      industryMap[inferred].offers += ensureNumber(row.offers);
      industryMap[inferred].rejections += ensureNumber(row.rejections);
    });
    
    const industryData = Object.values(industryMap).map(row => ({
      industry: row.industry,
      total: ensureNumber(row.total),
      interviews: ensureNumber(row.interviews),
      offers: ensureNumber(row.offers),
      rejections: ensureNumber(row.rejections),
      successRate: ensureNumber(row.total) > 0 
        ? ensureNumber(row.offers) / ensureNumber(row.total) 
        : 0,
      rejectionRate: ensureNumber(row.total) > 0 
        ? ensureNumber(row.rejections) / ensureNumber(row.total) 
        : 0,
      responseRate: ensureNumber(row.total) > 0 
        ? (ensureNumber(row.offers) + ensureNumber(row.interviews)) / ensureNumber(row.total) 
        : 0
    }));

    /* ------------------------------------------------------------------
       2. SUCCESS BY ROLE TYPE (using roleTypeMapper)
    ------------------------------------------------------------------ */
    // First, let's check what status values actually exist in the database
    const statusCheckQuery = `
      SELECT DISTINCT status, COUNT(*) as count
      FROM jobs
      WHERE user_id = $1 
        AND ("isarchived" IS NULL OR "isarchived" = false)
      GROUP BY status
      ORDER BY count DESC;
    `;
    const statusCheck = (await pool.query(statusCheckQuery, [userId])).rows;
    console.log("🔍 Available job statuses:", statusCheck);

    const roleTypeQuery = `
  SELECT 
        title,
        company,
        COUNT(*)::INTEGER AS total,
        SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
        SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
        SUM(CASE WHEN LOWER(status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
  FROM jobs
  WHERE user_id = $1
        AND ("isarchived" IS NULL OR "isarchived" = false)
      GROUP BY title, company;
    `;
    const roleTypeDataRaw = (await pool.query(roleTypeQuery, [userId])).rows;
    
    console.log("🔍 Role Type Raw Data (all rows with rejections):", 
      roleTypeDataRaw.filter(row => ensureNumber(row.rejections) > 0).map(row => ({
        title: row.title,
        company: row.company,
        rejections: row.rejections
      })));
    
    // Group by normalized role type and track job titles
    const roleTypeMap = {};
    roleTypeDataRaw.forEach(row => {
      const roleType = getRoleTypeFromTitle(row.title || "");
      const title = row.title || "";
      const company = row.company || "";
      const rejections = ensureNumber(row.rejections);
      
      // Debug logging for rejected jobs
      if (rejections > 0) {
        console.log(`⚠️ Rejected job found: Title="${title}", Company="${company}", Mapped to role type="${roleType}", Rejections=${rejections}`);
      }
      
      if (!roleTypeMap[roleType]) {
        roleTypeMap[roleType] = {
          role_type: roleType,
          total: 0,
          interviews: 0,
          offers: 0,
          rejections: 0,
          jobTitles: [],        // Track all job titles in this category
          rejectedTitles: []    // Track rejected job titles specifically
        };
      }
      roleTypeMap[roleType].total += ensureNumber(row.total);
      roleTypeMap[roleType].interviews += ensureNumber(row.interviews);
      roleTypeMap[roleType].offers += ensureNumber(row.offers);
      roleTypeMap[roleType].rejections += ensureNumber(row.rejections);
      
      // Track job titles
      if (title && !roleTypeMap[roleType].jobTitles.includes(title)) {
        roleTypeMap[roleType].jobTitles.push(title);
      }
      // Track rejected job titles
      if (rejections > 0 && title && !roleTypeMap[roleType].rejectedTitles.includes(title)) {
        roleTypeMap[roleType].rejectedTitles.push(title);
      }
    });
    
    console.log("🔍 Role Type Map after aggregation:", roleTypeMap);
    
    const roleTypeData = Object.values(roleTypeMap).map(row => {
      const total = ensureNumber(row.total);
      const rejections = ensureNumber(row.rejections);
      const rejectionRate = total > 0 ? rejections / total : 0;
      
      // Detailed logging for software_engineering
      if (row.role_type === 'software_engineering') {
        console.log(`📊 Software Engineering Calculation:`, {
          total,
          rejections,
          calculatedRejectionRate: rejectionRate,
          rejectionRatePercent: (rejectionRate * 100).toFixed(1) + '%'
        });
      }
      
      return {
        role_type: row.role_type,
        total,
        interviews: ensureNumber(row.interviews),
        offers: ensureNumber(row.offers),
        rejections,
        successRate: total > 0 
          ? ensureNumber(row.offers) / total 
          : 0,
        rejectionRate,
        jobTitles: row.jobTitles || [],
        rejectedTitles: row.rejectedTitles || []
      };
    });
    
    console.log("🔍 Final Role Type Data:", roleTypeData.map(r => ({
      role_type: r.role_type,
      total: r.total,
      rejections: r.rejections,
      rejectionRate: (r.rejectionRate * 100).toFixed(1) + '%'
    })));

    /* ------------------------------------------------------------------
       3. SUCCESS BY COMPANY SIZE
    ------------------------------------------------------------------ */
    const companySizeQuery = `
  SELECT 
        j.company,
        c.size AS company_size,
        COUNT(*)::INTEGER AS total,
        SUM(CASE WHEN LOWER(j.status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
        SUM(CASE WHEN LOWER(j.status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
        SUM(CASE WHEN LOWER(j.status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
      FROM jobs j
      LEFT JOIN companies c ON LOWER(TRIM(c.name)) = LOWER(TRIM(j.company))
      WHERE j.user_id = $1 
        AND (j."isarchived" IS NULL OR j."isarchived" = false)
      GROUP BY j.company, c.size;
    `;
    const companySizeDataRaw = (await pool.query(companySizeQuery, [userId])).rows;
    
    // Group by categorized size
    const sizeMap = {};
    companySizeDataRaw.forEach(row => {
      const sizeCategory = categorizeCompanySize(row.company_size);
      if (!sizeMap[sizeCategory]) {
        sizeMap[sizeCategory] = {
          company_size: sizeCategory,
          total: 0,
          interviews: 0,
          offers: 0,
          rejections: 0
        };
      }
      sizeMap[sizeCategory].total += ensureNumber(row.total);
      sizeMap[sizeCategory].interviews += ensureNumber(row.interviews);
      sizeMap[sizeCategory].offers += ensureNumber(row.offers);
      sizeMap[sizeCategory].rejections += ensureNumber(row.rejections);
    });
    
    const companySizeData = Object.values(sizeMap).map(row => ({
      company_size: row.company_size,
      total: ensureNumber(row.total),
      interviews: ensureNumber(row.interviews),
      offers: ensureNumber(row.offers),
      rejections: ensureNumber(row.rejections),
      successRate: ensureNumber(row.total) > 0 
        ? ensureNumber(row.offers) / ensureNumber(row.total) 
        : 0,
      rejectionRate: ensureNumber(row.total) > 0 
        ? ensureNumber(row.rejections) / ensureNumber(row.total) 
        : 0
    }));

    /* ------------------------------------------------------------------
       4A. SUCCESS BY APPLICATION SOURCE
    ------------------------------------------------------------------ */
    let sourceData = [];
    try {
      // Check if application_source column exists
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'application_source';
      `;
      const columnCheck = await pool.query(checkColumnQuery);
      
      if (columnCheck.rows.length > 0) {
    const sourceQuery = `
      SELECT 
        application_source,
            COUNT(*)::INTEGER AS total,
            SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
            SUM(CASE WHEN LOWER(status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
      FROM jobs
      WHERE user_id = $1
            AND application_source IS NOT NULL
            AND ("isarchived" IS NULL OR "isarchived" = false)
      GROUP BY application_source;
    `;
        const sourceDataRaw = (await pool.query(sourceQuery, [userId])).rows;
        
        // Normalize sources
        const sourceMap = {};
        sourceDataRaw.forEach(row => {
          const normalizedSource = normalizeSource(row.application_source);
          if (!sourceMap[normalizedSource]) {
            sourceMap[normalizedSource] = {
              application_source: normalizedSource,
              total: 0,
              interviews: 0,
              offers: 0
            };
          }
          sourceMap[normalizedSource].total += ensureNumber(row.total);
          sourceMap[normalizedSource].interviews += ensureNumber(row.interviews);
          sourceMap[normalizedSource].offers += ensureNumber(row.offers);
          sourceMap[normalizedSource].rejections += ensureNumber(row.rejections);
        });
        
        sourceData = Object.values(sourceMap).map(row => ({
          application_source: row.application_source,
          total: ensureNumber(row.total),
          interviews: ensureNumber(row.interviews),
          offers: ensureNumber(row.offers),
          rejections: ensureNumber(row.rejections),
          successRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.total) 
            : 0,
          rejectionRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.rejections) / ensureNumber(row.total) 
            : 0
        }));
      }
    } catch (err) {
      console.warn("Application source analysis skipped:", err.message);
      sourceData = [];
    }

    /* ------------------------------------------------------------------
       4B. SUCCESS BY APPLICATION METHOD
       (Online Form, Email, Referral, etc.)
    ------------------------------------------------------------------ */
    let methodData = [];
    try {
      // Check if application_method column exists
      const checkMethodColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'application_method';
      `;
      const methodColumnCheck = await pool.query(checkMethodColumnQuery);
      
      if (methodColumnCheck.rows.length > 0) {
        const methodQuery = `
          SELECT 
            application_method,
            COUNT(*)::INTEGER AS total,
            SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
            SUM(CASE WHEN LOWER(status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
          FROM jobs
          WHERE user_id = $1 
            AND application_method IS NOT NULL
            AND ("isarchived" IS NULL OR "isarchived" = false)
          GROUP BY application_method;
        `;
        const methodDataRaw = (await pool.query(methodQuery, [userId])).rows;
        
        // Normalize methods
        const normalizeMethod = (method) => {
          if (!method) return "Other";
          const m = String(method).toLowerCase();
          if (m.includes("online") || m.includes("form") || m.includes("portal") || m.includes("website")) return "Online Form";
          if (m.includes("email") || m.includes("direct")) return "Direct Email";
          if (m.includes("referral") || m.includes("refer")) return "Referral";
          if (m.includes("recruiter") || m.includes("headhunter")) return "Recruiter";
          if (m.includes("job fair") || m.includes("career fair")) return "Job Fair";
          return "Other";
        };
        
        const methodMap = {};
        methodDataRaw.forEach(row => {
          const normalizedMethod = normalizeMethod(row.application_method);
          if (!methodMap[normalizedMethod]) {
            methodMap[normalizedMethod] = {
              application_method: normalizedMethod,
              total: 0,
              interviews: 0,
              offers: 0,
              rejections: 0
            };
          }
          methodMap[normalizedMethod].total += ensureNumber(row.total);
          methodMap[normalizedMethod].interviews += ensureNumber(row.interviews);
          methodMap[normalizedMethod].offers += ensureNumber(row.offers);
          methodMap[normalizedMethod].rejections += ensureNumber(row.rejections);
        });
        
        methodData = Object.values(methodMap).map(row => ({
          application_method: row.application_method,
          total: ensureNumber(row.total),
          interviews: ensureNumber(row.interviews),
          offers: ensureNumber(row.offers),
          rejections: ensureNumber(row.rejections),
          successRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.total) 
            : 0,
          rejectionRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.rejections) / ensureNumber(row.total) 
            : 0
        }));
      }
    } catch (err) {
      console.warn("Application method analysis skipped:", err.message);
      methodData = [];
    }

    /* ------------------------------------------------------------------
       5. MATERIALS IMPACT (resume + cover letter correlation)
       Note: Joins with resumes and cover_letters tables to get names
    ------------------------------------------------------------------ */
    // First, let's check how many jobs have resume_id set
    const resumeCheckQuery = `
      SELECT COUNT(*) as with_resume, 
             (SELECT COUNT(*) FROM jobs WHERE user_id = $1 AND (\"isarchived\" IS NULL OR \"isarchived\" = false)) as total_jobs
      FROM jobs 
      WHERE user_id = $1 
        AND resume_id IS NOT NULL 
        AND (\"isarchived\" IS NULL OR \"isarchived\" = false);
    `;
    const resumeCheck = (await pool.query(resumeCheckQuery, [userId])).rows[0];
    console.log("Resume check:", resumeCheck);

    const materialsQuery = `
      SELECT 
        j.resume_id,
        r.title AS resume_name,
        j.cover_letter_id,
        cl.name AS cover_letter_name,
        COUNT(*)::INTEGER AS total,
        SUM(CASE WHEN LOWER(j.status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
        SUM(CASE WHEN LOWER(j.status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
        SUM(CASE WHEN LOWER(j.status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
      FROM jobs j
      LEFT JOIN resumes r ON j.resume_id = r.id
      LEFT JOIN cover_letters cl ON j.cover_letter_id = cl.id
      WHERE j.user_id = $1 
        AND j.resume_id IS NOT NULL
        AND (j."isarchived" IS NULL OR j."isarchived" = false)
      GROUP BY 
        j.resume_id,
        r.title,
        j.cover_letter_id,
        cl.name
      HAVING COUNT(*) > 0
      ORDER BY 
        SUM(CASE WHEN LOWER(j.status)='offer' THEN 1 ELSE 0 END)::INTEGER DESC, 
        SUM(CASE WHEN LOWER(j.status)='interview' THEN 1 ELSE 0 END)::INTEGER DESC;
    `;
    const materialsDataRaw = (await pool.query(materialsQuery, [userId])).rows;
    console.log("Materials data raw:", JSON.stringify(materialsDataRaw, null, 2));
    
    // Process the data - use resume title from join
    const materialsData = materialsDataRaw.map(row => ({
      resume_id: row.resume_id,
      resume_name: row.resume_name || `Resume #${row.resume_id}`,
      cover_letter_id: row.cover_letter_id,
      cover_letter_name: row.cover_letter_name || 'No Cover Letter',
      total: ensureNumber(row.total),
      offers: ensureNumber(row.offers),
      interviews: ensureNumber(row.interviews),
      rejections: ensureNumber(row.rejections),
      successRate: ensureNumber(row.total) > 0 
        ? ensureNumber(row.offers) / ensureNumber(row.total) 
        : 0,
      responseRate: ensureNumber(row.total) > 0 
        ? (ensureNumber(row.offers) + ensureNumber(row.interviews)) / ensureNumber(row.total) 
        : 0
    }));
    
    console.log("Materials data processed:", JSON.stringify(materialsData, null, 2));

    /* ------------------------------------------------------------------
       5B. CUSTOMIZATION IMPACT ANALYSIS
       Track how resume/cover letter customization affects success rates
    ------------------------------------------------------------------ */
    let customizationData = { resume: [], coverLetter: [], combined: [] };
    
    try {
      // Check if customization columns exist
      const checkCustomizationQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name IN ('resume_customization', 'cover_letter_customization');
      `;
      const customizationColumnCheck = await pool.query(checkCustomizationQuery);
      
      if (customizationColumnCheck.rows.length > 0) {
        // Resume customization analysis
        const resumeCustomizationQuery = `
          SELECT 
            COALESCE(resume_customization, 'none') AS customization_level,
            COUNT(*)::INTEGER AS total,
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
            SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
            SUM(CASE WHEN LOWER(status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
          FROM jobs
          WHERE user_id = $1 
            AND ("isarchived" IS NULL OR "isarchived" = false)
          GROUP BY COALESCE(resume_customization, 'none')
          ORDER BY 
            CASE COALESCE(resume_customization, 'none')
              WHEN 'tailored' THEN 1
              WHEN 'heavy' THEN 2
              WHEN 'light' THEN 3
              WHEN 'none' THEN 4
              ELSE 5
            END;
        `;
        const resumeCustomizationRaw = (await pool.query(resumeCustomizationQuery, [userId])).rows;
        
        customizationData.resume = resumeCustomizationRaw.map(row => ({
          level: row.customization_level,
          label: formatCustomizationLevel(row.customization_level),
          total: ensureNumber(row.total),
          offers: ensureNumber(row.offers),
          interviews: ensureNumber(row.interviews),
          rejections: ensureNumber(row.rejections),
          successRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.total) 
            : 0,
          responseRate: ensureNumber(row.total) > 0 
            ? (ensureNumber(row.offers) + ensureNumber(row.interviews)) / ensureNumber(row.total) 
            : 0
        }));

        // Cover letter customization analysis
        const coverLetterCustomizationQuery = `
          SELECT 
            COALESCE(cover_letter_customization, 'none') AS customization_level,
            COUNT(*)::INTEGER AS total,
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
            SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews,
            SUM(CASE WHEN LOWER(status) IN ('rejected', 'rejection') THEN 1 ELSE 0 END)::INTEGER AS rejections
          FROM jobs
          WHERE user_id = $1 
            AND ("isarchived" IS NULL OR "isarchived" = false)
          GROUP BY COALESCE(cover_letter_customization, 'none')
          ORDER BY 
            CASE COALESCE(cover_letter_customization, 'none')
              WHEN 'tailored' THEN 1
              WHEN 'heavy' THEN 2
              WHEN 'light' THEN 3
              WHEN 'none' THEN 4
              ELSE 5
            END;
        `;
        const coverLetterCustomizationRaw = (await pool.query(coverLetterCustomizationQuery, [userId])).rows;
        
        customizationData.coverLetter = coverLetterCustomizationRaw.map(row => ({
          level: row.customization_level,
          label: formatCustomizationLevel(row.customization_level),
          total: ensureNumber(row.total),
          offers: ensureNumber(row.offers),
          interviews: ensureNumber(row.interviews),
          rejections: ensureNumber(row.rejections),
          successRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.total) 
            : 0,
          responseRate: ensureNumber(row.total) > 0 
            ? (ensureNumber(row.offers) + ensureNumber(row.interviews)) / ensureNumber(row.total) 
            : 0
        }));

        // Combined customization analysis (resume + cover letter together)
        const combinedCustomizationQuery = `
          SELECT 
            COALESCE(resume_customization, 'none') AS resume_level,
            COALESCE(cover_letter_customization, 'none') AS cover_letter_level,
            COUNT(*)::INTEGER AS total,
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
            SUM(CASE WHEN LOWER(status) = 'interview' THEN 1 ELSE 0 END)::INTEGER AS interviews
          FROM jobs
          WHERE user_id = $1 
            AND ("isarchived" IS NULL OR "isarchived" = false)
          GROUP BY 
            COALESCE(resume_customization, 'none'),
            COALESCE(cover_letter_customization, 'none')
          HAVING COUNT(*) >= 2
          ORDER BY 
            SUM(CASE WHEN LOWER(status) = 'offer' THEN 1 ELSE 0 END)::INTEGER DESC;
        `;
        const combinedCustomizationRaw = (await pool.query(combinedCustomizationQuery, [userId])).rows;
        
        customizationData.combined = combinedCustomizationRaw.map(row => ({
          resumeLevel: row.resume_level,
          coverLetterLevel: row.cover_letter_level,
          label: `Resume: ${formatCustomizationLevel(row.resume_level)}, Cover Letter: ${formatCustomizationLevel(row.cover_letter_level)}`,
          total: ensureNumber(row.total),
          offers: ensureNumber(row.offers),
          interviews: ensureNumber(row.interviews),
          successRate: ensureNumber(row.total) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.total) 
            : 0
        }));
      }
    } catch (err) {
      console.warn("Customization analysis skipped:", err.message);
    }

    // Helper function for customization level formatting
    function formatCustomizationLevel(level) {
      const labels = {
        'none': 'No Customization',
        'light': 'Light Customization',
        'heavy': 'Heavy Customization',
        'tailored': 'Fully Tailored'
      };
      return labels[level] || level;
    }

    /* ------------------------------------------------------------------
       6. TIMING PATTERNS (weekday + hour heatmap)
       Note: Uses applicationDate field, NOT status_updated_at or created_at
       This shows when you actually applied, not when you updated the status
    ------------------------------------------------------------------ */
    // First, check if all hours are 0 (meaning hour data is not meaningful)
    const hourCheckQuery = `
      SELECT DISTINCT EXTRACT(HOUR FROM "applicationDate"::timestamp)::INTEGER AS hour
      FROM jobs
      WHERE user_id = $1 
        AND "applicationDate" IS NOT NULL
        AND ("isarchived" IS NULL OR "isarchived" = false);
    `;
    const hourCheckResult = (await pool.query(hourCheckQuery, [userId])).rows;
    const allHoursZero = hourCheckResult.length > 0 && hourCheckResult.every(row => ensureNumber(row.hour) === 0);
    
    let timingData;
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    if (allHoursZero) {
      // Aggregate by weekday only when all hours are 0
      const timingQuery = `
        SELECT 
          EXTRACT(DOW FROM "applicationDate"::timestamp)::INTEGER AS weekday,
          COUNT(*)::INTEGER AS applications,
          SUM(CASE WHEN status='Offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
          SUM(CASE WHEN status='Interview' THEN 1 ELSE 0 END)::INTEGER AS interviews
        FROM jobs
        WHERE user_id = $1 
          AND "applicationDate" IS NOT NULL
          AND ("isarchived" IS NULL OR "isarchived" = false)
        GROUP BY weekday
        ORDER BY weekday;
      `;
      const timingDataRaw = (await pool.query(timingQuery, [userId])).rows;
      timingData = timingDataRaw.map(row => {
        const weekdayNum = ensureNumber(row.weekday);
        const weekdayName = weekdayNames[weekdayNum] || "Unknown";
        return {
          weekday: weekdayNum,
          hour: 0, // Set to 0 since all hours are 0
          applications: ensureNumber(row.applications),
          offers: ensureNumber(row.offers),
          interviews: ensureNumber(row.interviews),
          successRate: ensureNumber(row.applications) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.applications) 
            : 0,
          weekdayName: String(weekdayName) // Ensure it's always a string
        };
      });
    } else {
      // Group by both weekday and hour when hour data is meaningful
    const timingQuery = `
      SELECT 
          EXTRACT(DOW FROM "applicationDate"::timestamp)::INTEGER AS weekday,
          EXTRACT(HOUR FROM "applicationDate"::timestamp)::INTEGER AS hour,
          COUNT(*)::INTEGER AS applications,
          SUM(CASE WHEN status='Offer' THEN 1 ELSE 0 END)::INTEGER AS offers,
          SUM(CASE WHEN status='Interview' THEN 1 ELSE 0 END)::INTEGER AS interviews
      FROM jobs
      WHERE user_id = $1 
        AND "applicationDate" IS NOT NULL
        AND ("isarchived" IS NULL OR "isarchived" = false)
      GROUP BY weekday, hour
      ORDER BY weekday, hour;
    `;
      const timingDataRaw = (await pool.query(timingQuery, [userId])).rows;
      timingData = timingDataRaw.map(row => {
        const weekdayNum = ensureNumber(row.weekday);
        const weekdayName = weekdayNames[weekdayNum] || "Unknown";
        return {
          weekday: weekdayNum,
          hour: ensureNumber(row.hour),
          applications: ensureNumber(row.applications),
          offers: ensureNumber(row.offers),
          interviews: ensureNumber(row.interviews),
          successRate: ensureNumber(row.applications) > 0 
            ? ensureNumber(row.offers) / ensureNumber(row.applications) 
            : 0,
          weekdayName: String(weekdayName) // Ensure it's always a string
        };
      });
    }

    // Create heatmap data structure
    const heatmapData = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const entry = timingData.find(t => t.weekday === day && t.hour === hour);
        heatmapData.push({
          weekday: day,
          hour: hour,
          weekdayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
          applications: entry ? ensureNumber(entry.applications) : 0,
          offers: entry ? ensureNumber(entry.offers) : 0,
          interviews: entry ? ensureNumber(entry.interviews) : 0,
          successRate: entry ? entry.successRate : 0
        });
      }
    }

    /* ------------------------------------------------------------------
       7. STATISTICAL ANALYSIS & RECOMMENDATIONS
    ------------------------------------------------------------------ */
    const recommendations = [];

    // Calculate overall statistics
    const allJobs = industryData.reduce((sum, ind) => sum + ind.total, 0);
    const allOffers = industryData.reduce((sum, ind) => sum + ind.offers, 0);
    const allInterviews = industryData.reduce((sum, ind) => sum + ind.interviews, 0);
    const allRejections = industryData.reduce((sum, ind) => sum + (ind.rejections || 0), 0);
    const overallOfferRate = allJobs > 0 ? allOffers / allJobs : 0;
    const overallInterviewRate = allJobs > 0 ? allInterviews / allJobs : 0;
    const overallRejectionRate = allJobs > 0 ? allRejections / allJobs : 0;

    // Industry recommendations with chi-square test
    // Only generate if sample size is sufficient
    if (industryData.length > 1 && allJobs >= 10) {
    industryData.forEach(ind => {
        if (ind.total < 3) return; // Skip if sample size too small
        if (ind.industry === 'Unknown') return; // Skip unknown industries for recommendations
        
        const rate = ind.successRate;
        const otherOffers = allOffers - ind.offers;
        const otherTotal = allJobs - ind.total;
        
        // Chi-square test: this industry vs all others
        const chiSquare = chiSquareTest([
          [ind.offers, ind.total - ind.offers],
          [otherOffers, otherTotal - otherOffers]
        ]);
        
        if (chiSquare.significant && rate > overallOfferRate * 1.2) {
          recommendations.push({
            type: "industry",
            priority: "high",
            message: `You perform significantly better in **${ind.industry}** (${(rate * 100).toFixed(1)}% offer rate vs ${(overallOfferRate * 100).toFixed(1)}% overall). Consider focusing more applications here.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        } else if (chiSquare.significant && rate < overallOfferRate * 0.8) {
          recommendations.push({
            type: "industry",
            priority: "medium",
            message: `Your success rate in **${ind.industry}** is lower (${(rate * 100).toFixed(1)}% vs ${(overallOfferRate * 100).toFixed(1)}% overall). Consider improving resume tailoring for this industry.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Role type recommendations
    if (roleTypeData.length > 1) {
      roleTypeData.forEach(role => {
        if (role.total < 5) return;
        
        const rate = role.successRate;
        const otherOffers = allOffers - role.offers;
        const otherTotal = allJobs - role.total;
        
        const chiSquare = chiSquareTest([
          [role.offers, role.total - role.offers],
          [otherOffers, otherTotal - otherOffers]
        ]);
        
        if (chiSquare.significant && rate > overallOfferRate * 1.2) {
          const roleName = role.role_type; // Already properly formatted by roleTypeMapper
          recommendations.push({
            type: "role_type",
            priority: "high",
            message: `**${roleName}** roles show significantly higher success rates (${(rate * 100).toFixed(1)}%). Focus your job search on these positions.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Company size recommendations
    if (companySizeData.length > 1) {
      companySizeData.forEach(size => {
        if (size.total < 5) return;
        
        const rate = size.successRate;
        const otherOffers = allOffers - size.offers;
        const otherTotal = allJobs - size.total;
        
        const chiSquare = chiSquareTest([
          [size.offers, size.total - size.offers],
          [otherOffers, otherTotal - otherOffers]
        ]);
        
        if (chiSquare.significant && rate > overallOfferRate * 1.2) {
          const sizeName = size.company_size.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          recommendations.push({
            type: "company_size",
            priority: "medium",
            message: `**${sizeName}** companies show better results (${(rate * 100).toFixed(1)}% offer rate). Consider targeting more companies of this size.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Application source recommendations
    if (sourceData.length > 1) {
      sourceData.forEach(source => {
        if (source.total < 5) return;
        
        const rate = source.successRate;
        const otherOffers = allOffers - source.offers;
        const otherTotal = allJobs - source.total;
        
        const chiSquare = chiSquareTest([
          [source.offers, source.total - source.offers],
          [otherOffers, otherTotal - otherOffers]
        ]);
        
        if (chiSquare.significant && rate > overallOfferRate * 1.2) {
          recommendations.push({
            type: "source",
            priority: "high",
            message: `Applications from **${source.application_source}** lead to significantly more offers (${(rate * 100).toFixed(1)}%). Prioritize this application channel.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Application method recommendations
    if (methodData.length > 1) {
      methodData.forEach(method => {
        if (method.total < 5) return;
        
        const rate = method.successRate;
        const otherOffers = allOffers - method.offers;
        const otherTotal = allJobs - method.total;
        
        const chiSquare = chiSquareTest([
          [method.offers, method.total - method.offers],
          [otherOffers, otherTotal - otherOffers]
        ]);
        
        if (chiSquare.significant && rate > overallOfferRate * 1.2) {
          recommendations.push({
            type: "method",
            priority: "high",
            message: `**${method.application_method}** applications show significantly higher success rates (${(rate * 100).toFixed(1)}%). Consider using this application method more often.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Rejection pattern analysis and recommendations
    if (allRejections > 0) {
      // Industry rejection patterns
      industryData.forEach(ind => {
        if (ind.total < 5 || ind.industry === 'Unknown') return;
        if (!ind.rejections || ind.rejections === 0) return;
        
        const rejectionRate = ind.rejectionRate;
        const otherRejections = allRejections - ind.rejections;
        const otherTotal = allJobs - ind.total;
        
        const chiSquare = chiSquareTest([
          [ind.rejections, ind.total - ind.rejections],
          [otherRejections, otherTotal - otherRejections]
        ]);
        
        if (chiSquare.significant && rejectionRate > overallRejectionRate * 1.2) {
          recommendations.push({
            type: "rejection",
            priority: "medium",
            message: `You experience higher rejection rates in **${ind.industry}** (${(rejectionRate * 100).toFixed(1)}% vs ${(overallRejectionRate * 100).toFixed(1)}% overall). Consider improving your resume tailoring or targeting different companies in this industry.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });

      // Role type rejection patterns
      roleTypeData.forEach(role => {
        if (role.total < 5) return;
        if (!role.rejections || role.rejections === 0) return;
        
        const rejectionRate = role.rejectionRate;
        const otherRejections = allRejections - role.rejections;
        const otherTotal = allJobs - role.total;
        
        const chiSquare = chiSquareTest([
          [role.rejections, role.total - role.rejections],
          [otherRejections, otherTotal - otherRejections]
        ]);
        
        if (chiSquare.significant && rejectionRate > overallRejectionRate * 1.2) {
          const roleName = role.role_type; // Already properly formatted by roleTypeMapper
          
          // Get the specific job titles that were rejected
          const rejectedTitles = role.rejectedTitles || [];
          const allTitles = role.jobTitles || [];
          
          // Build the message with specific job titles
          let titleInfo = "";
          if (rejectedTitles.length > 0) {
            titleInfo = ` Rejected positions: **${rejectedTitles.join(", ")}**.`;
          } else if (allTitles.length > 0 && allTitles.length <= 5) {
            titleInfo = ` Positions in this category: ${allTitles.join(", ")}.`;
          }
          
          recommendations.push({
            type: "rejection",
            priority: "medium",
            message: `**${roleName}** roles show higher rejection rates (${(rejectionRate * 100).toFixed(1)}%).${titleInfo} Review your qualifications or consider additional training/certifications for these positions.`,
            statisticalSignificance: `p < ${chiSquare.pValue === 0.01 ? '0.01' : '0.05'}`
          });
        }
      });
    }

    // Materials effectiveness recommendations
    if (materialsData.length > 1) {
      const topMaterials = materialsData
        .filter(m => m.total >= 3)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3);
      
      topMaterials.forEach(m => {
        if (m.successRate > overallOfferRate * 1.15) {
          const resumeLabel = m.resume_name || `Resume #${m.resume_id}`;
          const coverLetterLabel = m.cover_letter_name && m.cover_letter_name !== 'No Cover Letter' 
            ? m.cover_letter_name 
            : 'No Cover Letter';
          
          recommendations.push({
            type: "materials",
            priority: "medium",
            message: `Your resume **"${resumeLabel}"**${coverLetterLabel !== 'No Cover Letter' ? ` with cover letter "${coverLetterLabel}"` : ''} shows ${(m.successRate * 100).toFixed(1)}% success rate. Consider using this combination more often.`,
            statisticalSignificance: "Based on performance comparison"
          });
        }
      });
    }

    // Customization impact recommendations
    if (customizationData.resume.length > 1) {
      const tailoredResume = customizationData.resume.find(c => c.level === 'tailored' || c.level === 'heavy');
      const noCustomization = customizationData.resume.find(c => c.level === 'none');
      
      if (tailoredResume && noCustomization && tailoredResume.total >= 3 && noCustomization.total >= 3) {
        const tailoredRate = tailoredResume.successRate;
        const noCustomRate = noCustomization.successRate;
        
        if (tailoredRate > noCustomRate * 1.2) {
          recommendations.push({
            type: "customization",
            priority: "high",
            message: `**Customized resumes** show ${(tailoredRate * 100).toFixed(1)}% success rate vs ${(noCustomRate * 100).toFixed(1)}% for non-customized. Tailoring your resume to each job significantly improves your chances.`,
            statisticalSignificance: "Based on performance comparison"
          });
        }
      }
      
      // Check if no customization is being done
      const allNone = customizationData.resume.every(c => c.level === 'none');
      if (allNone && allJobs >= 5) {
        recommendations.push({
          type: "customization",
          priority: "medium",
          message: `You haven't tracked resume customization levels yet. Start marking your applications with customization levels (None, Light, Heavy, Tailored) to see how customization impacts your success rate.`,
          statisticalSignificance: "Data collection recommendation"
        });
      }
    }

    if (customizationData.coverLetter.length > 1) {
      const tailoredCL = customizationData.coverLetter.find(c => c.level === 'tailored' || c.level === 'heavy');
      const noCL = customizationData.coverLetter.find(c => c.level === 'none');
      
      if (tailoredCL && noCL && tailoredCL.total >= 3 && noCL.total >= 3) {
        const tailoredRate = tailoredCL.successRate;
        const noRate = noCL.successRate;
        
        if (tailoredRate > noRate * 1.2) {
          recommendations.push({
            type: "customization",
            priority: "high",
            message: `**Customized cover letters** show ${(tailoredRate * 100).toFixed(1)}% success rate vs ${(noRate * 100).toFixed(1)}% without. A tailored cover letter makes a significant difference.`,
            statisticalSignificance: "Based on performance comparison"
          });
        }
      }
    }

    // Timing recommendations - aggregate by weekday only (ignore hour if all are 0)
    if (timingData.length > 0) {
      // Check if all hours are 0 (meaning hour data is not meaningful)
      const allHoursZero = timingData.every(t => t.hour === 0);
      
      if (allHoursZero) {
        // Aggregate by weekday only
        const weekdayMap = {};
        timingData.forEach(t => {
          const weekdayName = t.weekdayName || ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][t.weekday] || "Unknown";
          if (!weekdayMap[weekdayName]) {
            weekdayMap[weekdayName] = {
              weekdayName,
              applications: 0,
              offers: 0,
              successRate: 0
            };
          }
          weekdayMap[weekdayName].applications += ensureNumber(t.applications);
          weekdayMap[weekdayName].offers += ensureNumber(t.offers);
        });
        
        // Calculate success rates
        Object.values(weekdayMap).forEach(w => {
          w.successRate = w.applications > 0 ? w.offers / w.applications : 0;
        });
        
        const bestWeekday = Object.values(weekdayMap)
          .filter(w => w.applications >= 3)
          .sort((a, b) => b.successRate - a.successRate)[0];
        
        if (bestWeekday && bestWeekday.successRate > overallOfferRate * 1.1) {
          recommendations.push({
            type: "timing",
            priority: "low",
            message: `Best application timing: **${bestWeekday.weekdayName}** shows ${(bestWeekday.successRate * 100).toFixed(1)}% success rate (${bestWeekday.offers} offers from ${bestWeekday.applications} applications). Consider applying on this day of the week.`,
            statisticalSignificance: "Based on observed patterns"
          });
        }
      } else {
        // Use hour-based recommendations if hours are meaningful
        const bestTimeSlot = timingData
          .filter(t => t.applications >= 3)
          .sort((a, b) => b.successRate - a.successRate)[0];
        
        if (bestTimeSlot && bestTimeSlot.successRate > overallOfferRate * 1.1) {
          recommendations.push({
            type: "timing",
            priority: "low",
            message: `Best application timing: **${bestTimeSlot.weekdayName} at ${bestTimeSlot.hour}:00** shows ${(bestTimeSlot.successRate * 100).toFixed(1)}% success rate. Consider applying during this time window.`,
            statisticalSignificance: "Based on observed patterns"
          });
        }
      }
    }

    // Default recommendation if none generated
    if (recommendations.length === 0) {
      if (allJobs < 10) {
        recommendations.push({
          type: "general",
          priority: "low",
          message: `You have ${allJobs} application${allJobs !== 1 ? 's' : ''} in your system. Continue applying and tracking your applications. Once you reach 20+ applications, you'll receive more statistically meaningful insights.`,
          statisticalSignificance: "Sample size too small for statistical analysis"
        });
      } else {
        recommendations.push({
          type: "general",
          priority: "low",
          message: "Continue applying consistently across industries and optimize resume/cover-letter tailoring for each application.",
          statisticalSignificance: "General best practice"
        });
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    /* ----------------------------------------------------------------------
       FINAL COMBINED RESPONSE
    ---------------------------------------------------------------------- */
    res.json({
      industryData,
      roleTypeData,
      companySizeData,
      sourceData,
      materialsData,
      timingData,
      heatmapData,
      overallStats: {
        totalApplications: allJobs,
        totalOffers: allOffers,
        totalInterviews: allInterviews,
        totalRejections: allRejections,
        overallOfferRate,
        overallInterviewRate,
        overallRejectionRate
      },
      methodData, // Application method data
      customizationData, // Resume/cover letter customization impact
      rejectionAnalysis: {
        overallRejectionRate,
        totalRejections: allRejections,
        rejectionRateByIndustry: industryData.map(ind => ({
          industry: ind.industry,
          rejectionRate: ind.rejectionRate,
          rejections: ind.rejections,
          total: ind.total
        })).filter(ind => ind.rejections > 0),
        rejectionRateByRoleType: roleTypeData.map(role => ({
          role_type: role.role_type,
          rejectionRate: role.rejectionRate,
          rejections: role.rejections,
          total: role.total
        })).filter(role => role.rejections > 0)
      },
      recommendations: recommendations.map(r => r.message), // Keep backward compatibility
      recommendationsDetailed: recommendations // New detailed format
    });

  } catch (err) {
    console.error("❌ Success analysis error:", err);
    res.status(500).json({ error: "Failed to compute success analysis", details: err.message });
  }
});

export default router;
