// ======================================
// UC-119: Application Success Optimization Dashboard
// ======================================

import express from 'express';
import pool from '../db/pool.js';
import { auth } from '../auth.js';

const router = express.Router();
router.use(auth);

// GET optimization dashboard data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const startDate = req.query.startDate ? `${req.query.startDate} 00:00:00` : '2000-01-01 00:00:00';
    const endDate = req.query.endDate ? `${req.query.endDate} 23:59:59` : '2100-12-31 23:59:59';

    // 1. Success Metrics (Response Rate, Interview Conversion, Offer Rate)
    const successMetrics = await pool.query(
      `SELECT
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') AS total_responses,
        COUNT(*) FILTER (WHERE status = 'Interview') AS total_interviews,
        COUNT(*) FILTER (WHERE status = 'Offer') AS total_offers,
        COUNT(*) FILTER (WHERE first_response_date IS NOT NULL) AS applications_with_response,
        ROUND(
          COUNT(*) FILTER (WHERE first_response_date IS NOT NULL)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) AS response_rate,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Interview')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) AS interview_rate,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Offer')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) AS offer_rate,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Offer')::numeric / 
          NULLIF(COUNT(*) FILTER (WHERE status = 'Interview'), 0) * 100, 
          2
        ) AS interview_to_offer_rate
      FROM jobs
      WHERE user_id = $1
        AND ("isArchived" = false OR "isArchived" IS NULL)
        AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp`,
      [userId, startDate, endDate]
    );

    // 2. Resume/Cover Letter Version Performance
    // Check if job_materials table exists, otherwise try jobs table directly
    let resumePerformance, coverLetterPerformance;
    
    try {
      const materialsTableCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'job_materials'
        )`
      );

      if (materialsTableCheck.rows[0].exists) {
        // Use job_materials table
        resumePerformance = await pool.query(
          `SELECT
            jm.resume_id,
            r.name as resume_name,
            COUNT(*) as total_applications,
            COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
            ROUND(
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
              NULLIF(COUNT(*), 0) * 100, 
              2
            ) as success_rate
          FROM jobs j
          INNER JOIN job_materials jm ON j.id = jm.job_id
          LEFT JOIN resumes r ON jm.resume_id = r.id
          WHERE j.user_id = $1
            AND ("isArchived" = false OR "isArchived" IS NULL)
            AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
            AND jm.resume_id IS NOT NULL
          GROUP BY jm.resume_id, r.name
          HAVING COUNT(*) >= 2
          ORDER BY success_rate DESC, total_applications DESC`,
          [userId, startDate, endDate]
        );

        // Check if cover_letters or uploaded_cover_letters table exists
        const coverLetterTableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('cover_letters', 'uploaded_cover_letters')
          )`
        );

        if (coverLetterTableCheck.rows[0].exists) {
          // Try uploaded_cover_letters first, then cover_letters
          try {
            coverLetterPerformance = await pool.query(
              `SELECT
                jm.cover_letter_id,
                COALESCE(ucl.title, cl.title, 'Cover Letter #' || jm.cover_letter_id) as cover_letter_name,
                COUNT(*) as total_applications,
                COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
                ROUND(
                  COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
                  NULLIF(COUNT(*), 0) * 100, 
                  2
                ) as success_rate
              FROM jobs j
              INNER JOIN job_materials jm ON j.id = jm.job_id
              LEFT JOIN uploaded_cover_letters ucl ON jm.cover_letter_id = ucl.id
              LEFT JOIN cover_letters cl ON jm.cover_letter_id = cl.id
              WHERE j.user_id = $1
                AND ("isArchived" = false OR "isArchived" IS NULL)
                AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
                AND jm.cover_letter_id IS NOT NULL
              GROUP BY jm.cover_letter_id, ucl.title, cl.title
              HAVING COUNT(*) >= 2
              ORDER BY success_rate DESC, total_applications DESC`,
              [userId, startDate, endDate]
            );
          } catch (err) {
            console.warn('Error fetching cover letter performance from job_materials:', err.message);
            coverLetterPerformance = { rows: [] };
          }
        } else {
          coverLetterPerformance = { rows: [] };
        }
      } else {
        // Fallback: check if columns exist in jobs table
        const jobsColumnsCheck = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'jobs' 
           AND column_name IN ('resume_id', 'cover_letter_id')
           AND table_schema = 'public'`
        );
        const hasResumeId = jobsColumnsCheck.rows.some(r => r.column_name === 'resume_id');
        const hasCoverLetterId = jobsColumnsCheck.rows.some(r => r.column_name === 'cover_letter_id');

        if (hasResumeId) {
          resumePerformance = await pool.query(
            `SELECT
              j.resume_id,
              r.name as resume_name,
              COUNT(*) as total_applications,
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
              ROUND(
                COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
                NULLIF(COUNT(*), 0) * 100, 
                2
              ) as success_rate
            FROM jobs j
            LEFT JOIN resumes r ON j.resume_id = r.id
            WHERE j.user_id = $1
              AND ("isArchived" = false OR "isArchived" IS NULL)
              AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
              AND j.resume_id IS NOT NULL
            GROUP BY j.resume_id, r.name
            HAVING COUNT(*) >= 2
            ORDER BY success_rate DESC, total_applications DESC`,
            [userId, startDate, endDate]
          );
        } else {
          resumePerformance = { rows: [] };
        }

        if (hasCoverLetterId) {
          coverLetterPerformance = await pool.query(
            `SELECT
              j.cover_letter_id,
              COALESCE(ucl.title, cl.title, 'Cover Letter #' || j.cover_letter_id) as cover_letter_name,
              COUNT(*) as total_applications,
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
              ROUND(
                COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
                NULLIF(COUNT(*), 0) * 100, 
                2
              ) as success_rate
            FROM jobs j
            LEFT JOIN uploaded_cover_letters ucl ON j.cover_letter_id = ucl.id
            LEFT JOIN cover_letters cl ON j.cover_letter_id = cl.id
            WHERE j.user_id = $1
              AND ("isArchived" = false OR "isArchived" IS NULL)
              AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
              AND j.cover_letter_id IS NOT NULL
            GROUP BY j.cover_letter_id, ucl.title, cl.title
            HAVING COUNT(*) >= 2
            ORDER BY success_rate DESC, total_applications DESC`,
            [userId, startDate, endDate]
          );
        } else {
          coverLetterPerformance = { rows: [] };
        }
      }
    } catch (err) {
      console.warn('Error fetching resume/cover letter performance:', err.message);
      resumePerformance = { rows: [] };
      coverLetterPerformance = { rows: [] };
    }

    // 3. Customization Level Performance
    // Check if customization columns exist in jobs or job_application_materials
    let customizationPerformance;
    try {
      // Check for columns in jobs table
      const jobsCustomizationCheck = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'jobs'
         AND column_name IN ('resume_customization', 'cover_letter_customization')
         AND table_schema = 'public'`
      );
      
      // Check for columns in job_application_materials table
      const materialsCustomizationCheck = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'job_application_materials'
         AND column_name IN ('resume_customization', 'cover_letter_customization')
         AND table_schema = 'public'`
      );

      const jobsColumns = new Set(jobsCustomizationCheck.rows.map(r => r.column_name));
      const materialsColumns = new Set(materialsCustomizationCheck.rows.map(r => r.column_name));
      
      const hasResumeCustomInJobs = jobsColumns.has('resume_customization');
      const hasCoverCustomInJobs = jobsColumns.has('cover_letter_customization');
      const hasResumeCustomInMaterials = materialsColumns.has('resume_customization');
      const hasCoverCustomInMaterials = materialsColumns.has('cover_letter_customization');

      if (hasResumeCustomInJobs || hasCoverCustomInJobs) {
        // Build query dynamically based on which columns exist
        let selectClause = '';
        let groupByClause = '';
        
        if (hasResumeCustomInJobs && hasCoverCustomInJobs) {
          selectClause = `COALESCE(resume_customization, 'none') as resume_customization,
            COALESCE(cover_letter_customization, 'none') as cover_letter_customization`;
          groupByClause = 'resume_customization, cover_letter_customization';
        } else if (hasResumeCustomInJobs) {
          selectClause = `COALESCE(resume_customization, 'none') as resume_customization,
            'none' as cover_letter_customization`;
          groupByClause = 'resume_customization';
        } else if (hasCoverCustomInJobs) {
          selectClause = `'none' as resume_customization,
            COALESCE(cover_letter_customization, 'none') as cover_letter_customization`;
          groupByClause = 'cover_letter_customization';
        }
        
        // Safety check: ensure we have valid clauses before executing
        if (!selectClause || !groupByClause) {
          console.warn('Customization query clauses are empty, skipping query');
          customizationPerformance = { rows: [] };
        } else {
          customizationPerformance = await pool.query(
          `SELECT
            ${selectClause},
            COUNT(*) as total_applications,
            COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') as successful,
            ROUND(
              COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer')::numeric / 
              NULLIF(COUNT(*), 0) * 100, 
              2
            ) as success_rate
          FROM jobs
          WHERE user_id = $1
            AND ("isArchived" = false OR "isArchived" IS NULL)
            AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp
          GROUP BY ${groupByClause}
          HAVING COUNT(*) >= 2
          ORDER BY success_rate DESC`,
            [userId, startDate, endDate]
          );
        }
      } else if (hasResumeCustomInMaterials || hasCoverCustomInMaterials) {
        // Build query dynamically based on which columns exist
        let selectClause = '';
        let groupByClause = '';
        
        if (hasResumeCustomInMaterials && hasCoverCustomInMaterials) {
          selectClause = `COALESCE(jam.resume_customization, 'none') as resume_customization,
            COALESCE(jam.cover_letter_customization, 'none') as cover_letter_customization`;
          groupByClause = 'jam.resume_customization, jam.cover_letter_customization';
        } else if (hasResumeCustomInMaterials) {
          selectClause = `COALESCE(jam.resume_customization, 'none') as resume_customization,
            'none' as cover_letter_customization`;
          groupByClause = 'jam.resume_customization';
        } else if (hasCoverCustomInMaterials) {
          selectClause = `'none' as resume_customization,
            COALESCE(jam.cover_letter_customization, 'none') as cover_letter_customization`;
          groupByClause = 'jam.cover_letter_customization';
        }
        
        // Safety check: ensure we have valid clauses before executing
        if (!selectClause || !groupByClause) {
          console.warn('Customization query clauses are empty, skipping query');
          customizationPerformance = { rows: [] };
        } else {
          customizationPerformance = await pool.query(
          `SELECT
            ${selectClause},
            COUNT(*) as total_applications,
            COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
            ROUND(
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
              NULLIF(COUNT(*), 0) * 100, 
              2
            ) as success_rate
          FROM jobs j
          LEFT JOIN job_application_materials jam ON j.id = jam.job_id
          WHERE j.user_id = $1
            AND ("isArchived" = false OR "isArchived" IS NULL)
            AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
          GROUP BY ${groupByClause}
          HAVING COUNT(*) >= 2
          ORDER BY success_rate DESC`,
            [userId, startDate, endDate]
          );
        }
      } else {
        // No customization columns found
        customizationPerformance = { rows: [] };
      }
    } catch (err) {
      console.warn('Error fetching customization performance:', err.message);
      customizationPerformance = { rows: [] };
    }

    // 4. Application Approach Performance (Direct vs Referral)
    // Check if referral_requests table exists first
    let approachPerformance;
    try {
      const tableCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'referral_requests'
        )`
      );
      
      if (tableCheck.rows[0].exists) {
        approachPerformance = await pool.query(
          `SELECT
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM referral_requests rr 
                WHERE rr.user_id = $1
                  AND (
                    -- Match by job_id if available (most reliable)
                    (rr.job_id IS NOT NULL AND rr.job_id = j.id)
                    OR
                    -- Fallback: match by job title and company if job_id is null
                    (rr.job_id IS NULL 
                     AND LOWER(TRIM(rr.job_title)) = LOWER(TRIM(j.title))
                     AND LOWER(TRIM(rr.company)) = LOWER(TRIM(j.company)))
                  )
              ) THEN 'Referral'
              WHEN j.contact_email IS NOT NULL OR j.contact_name IS NOT NULL THEN 'Direct Contact'
              ELSE 'Standard Application'
            END as application_approach,
            COUNT(*) as total_applications,
            COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
            ROUND(
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
              NULLIF(COUNT(*), 0) * 100, 
              2
            ) as success_rate
          FROM jobs j
          WHERE j.user_id = $1
            AND ("isArchived" = false OR "isArchived" IS NULL)
            AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
          GROUP BY application_approach
          ORDER BY success_rate DESC`,
          [userId, startDate, endDate]
        );
      } else {
        // Fallback if referral_requests table doesn't exist
        approachPerformance = await pool.query(
          `SELECT
            CASE 
              WHEN j.contact_email IS NOT NULL OR j.contact_name IS NOT NULL THEN 'Direct Contact'
              ELSE 'Standard Application'
            END as application_approach,
            COUNT(*) as total_applications,
            COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
            ROUND(
              COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
              NULLIF(COUNT(*), 0) * 100, 
              2
            ) as success_rate
          FROM jobs j
          WHERE j.user_id = $1
            AND ("isArchived" = false OR "isArchived" IS NULL)
            AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
          GROUP BY application_approach
          ORDER BY success_rate DESC`,
          [userId, startDate, endDate]
        );
        
        // Debug logging
        console.log('📊 Application Approach Performance:', {
          totalRows: approachPerformance.rows.length,
          approaches: approachPerformance.rows.map(r => ({
            approach: r.application_approach,
            total: r.total_applications,
            successful: r.successful,
            successRate: r.success_rate
          }))
        });
      }
    } catch (err) {
      console.warn('Error checking referral_requests table, using fallback:', err.message);
      // Fallback query
      approachPerformance = await pool.query(
        `SELECT
          CASE 
            WHEN j.contact_email IS NOT NULL OR j.contact_name IS NOT NULL THEN 'Direct Contact'
            ELSE 'Standard Application'
          END as application_approach,
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer') as successful,
          ROUND(
            COUNT(*) FILTER (WHERE j.status = 'Interview' OR j.status = 'Offer')::numeric / 
            NULLIF(COUNT(*), 0) * 100, 
            2
          ) as success_rate
        FROM jobs j
        WHERE j.user_id = $1
          AND ("isArchived" = false OR "isArchived" IS NULL)
          AND COALESCE("applicationDate"::timestamp, j.created_at) BETWEEN $2::timestamp AND $3::timestamp
        GROUP BY application_approach
        ORDER BY success_rate DESC`,
        [userId, startDate, endDate]
      );
    }

    // 5. Optimal Application Timing (from timing data)
    const timingAnalysis = await pool.query(
      `SELECT
        EXTRACT(DOW FROM COALESCE("applicationDate"::timestamp, created_at)) as day_of_week,
        EXTRACT(HOUR FROM COALESCE("applicationDate"::timestamp, created_at)) as hour_of_day,
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') as successful,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as success_rate
      FROM jobs
      WHERE user_id = $1
        AND ("isArchived" = false OR "isArchived" IS NULL)
        AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp
      GROUP BY day_of_week, hour_of_day
      HAVING COUNT(*) >= 2
      ORDER BY success_rate DESC, total_applications DESC
      LIMIT 10`,
      [userId, startDate, endDate]
    );

    // 6. Role Type Performance
    const roleTypePerformance = await pool.query(
      `SELECT
        type as role_type,
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') as successful,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as success_rate
      FROM jobs
      WHERE user_id = $1
        AND ("isArchived" = false OR "isArchived" IS NULL)
        AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp
        AND type IS NOT NULL
      GROUP BY type
      HAVING COUNT(*) >= 2
      ORDER BY success_rate DESC, total_applications DESC`,
      [userId, startDate, endDate]
    );

    // 7. Industry Performance
    const industryPerformance = await pool.query(
      `SELECT
        industry,
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') as successful,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as success_rate
      FROM jobs
      WHERE user_id = $1
        AND ("isArchived" = false OR "isArchived" IS NULL)
        AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp
        AND industry IS NOT NULL
      GROUP BY industry
      HAVING COUNT(*) >= 2
      ORDER BY success_rate DESC, total_applications DESC
      LIMIT 10`,
      [userId, startDate, endDate]
    );

    // 8. Trend Over Time (Monthly success rates)
    const trendOverTime = await pool.query(
      `SELECT
        DATE_TRUNC('month', COALESCE("applicationDate"::timestamp, created_at)) as month,
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer') as successful,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Interview' OR status = 'Offer')::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as success_rate
      FROM jobs
      WHERE user_id = $1
        AND ("isArchived" = false OR "isArchived" IS NULL)
        AND COALESCE("applicationDate"::timestamp, created_at) BETWEEN $2::timestamp AND $3::timestamp
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12`,
      [userId, startDate, endDate]
    );

    // 9. Generate Actionable Recommendations
    const recommendations = [];
    const metrics = successMetrics.rows[0];

    if (metrics.response_rate < 20) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Low Response Rate',
        message: `Your response rate is ${metrics.response_rate}%. Consider improving your resume keywords, tailoring applications better, or applying to better-fit roles.`,
        action: 'Review resume and job descriptions for better alignment'
      });
    }

    if (metrics.interview_rate < 15) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Low Interview Conversion',
        message: `Only ${metrics.interview_rate}% of applications lead to interviews. Focus on quality over quantity and better role matching.`,
        action: 'Use Job Match feature to find better-fit positions'
      });
    }

    if (metrics.interview_to_offer_rate < 20 && metrics.total_interviews > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Interview Performance',
        message: `Your interview-to-offer rate is ${metrics.interview_to_offer_rate}%. Consider improving interview preparation and follow-up.`,
        action: 'Review interview analytics and practice more'
      });
    }

    // Check for best performing resume
    if (resumePerformance.rows.length > 0) {
      const bestResume = resumePerformance.rows[0];
      if (bestResume.success_rate > metrics.interview_rate + 10) {
        recommendations.push({
          type: 'success',
          priority: 'medium',
          title: 'Best Performing Resume',
          message: `"${bestResume.resume_name || 'Resume #' + bestResume.resume_id}" has a ${bestResume.success_rate}% success rate. Consider using it more often.`,
          action: `Use this resume for similar roles`
        });
      }
    }

    // Check for best performing approach
    if (approachPerformance.rows.length > 0) {
      const bestApproach = approachPerformance.rows[0];
      if (bestApproach.success_rate > metrics.interview_rate + 15) {
        recommendations.push({
          type: 'success',
          priority: 'high',
          title: 'Best Application Approach',
          message: `${bestApproach.application_approach} applications have a ${bestApproach.success_rate}% success rate. Focus on this approach.`,
          action: `Prioritize ${bestApproach.application_approach.toLowerCase()} applications`
        });
      }
    }

    // Check for best timing
    if (timingAnalysis.rows.length > 0) {
      const bestTiming = timingAnalysis.rows[0];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      recommendations.push({
        type: 'info',
        priority: 'low',
        title: 'Optimal Application Timing',
        message: `Applications submitted on ${dayNames[Math.floor(bestTiming.day_of_week)]} at ${Math.floor(bestTiming.hour_of_day)}:00 have a ${bestTiming.success_rate}% success rate.`,
        action: 'Schedule applications for this time'
      });
    }

    // Check for best industry
    if (industryPerformance.rows.length > 0) {
      const bestIndustry = industryPerformance.rows[0];
      if (bestIndustry.success_rate > metrics.interview_rate + 10) {
        recommendations.push({
          type: 'success',
          priority: 'medium',
          title: 'Best Performing Industry',
          message: `${bestIndustry.industry} roles have a ${bestIndustry.success_rate}% success rate. Consider focusing more on this industry.`,
          action: `Apply to more ${bestIndustry.industry} positions`
        });
      }
    }

    // 10. A/B Test Results (compare different strategies)
    const abTestResults = {
      resumeVersions: resumePerformance.rows.slice(0, 3).map(r => ({
        variant: r.resume_name || `Resume #${r.resume_id}`,
        applications: parseInt(r.total_applications),
        successRate: parseFloat(r.success_rate),
        winner: r === resumePerformance.rows[0]
      })),
      customizationLevels: customizationPerformance.rows.slice(0, 3).map(c => ({
        variant: `${c.resume_customization} resume + ${c.cover_letter_customization} cover letter`,
        applications: parseInt(c.total_applications),
        successRate: parseFloat(c.success_rate),
        winner: c === customizationPerformance.rows[0]
      })),
      applicationApproaches: approachPerformance.rows.map(a => ({
        variant: a.application_approach,
        applications: parseInt(a.total_applications),
        successRate: parseFloat(a.success_rate),
        winner: a === approachPerformance.rows[0]
      }))
    };

    res.json({
      successMetrics: {
        totalApplications: parseInt(metrics.total_applications) || 0,
        totalResponses: parseInt(metrics.total_responses) || 0,
        totalInterviews: parseInt(metrics.total_interviews) || 0,
        totalOffers: parseInt(metrics.total_offers) || 0,
        responseRate: parseFloat(metrics.response_rate) || 0,
        interviewRate: parseFloat(metrics.interview_rate) || 0,
        offerRate: parseFloat(metrics.offer_rate) || 0,
        interviewToOfferRate: parseFloat(metrics.interview_to_offer_rate) || 0
      },
      resumePerformance: resumePerformance.rows.map(r => ({
        resumeId: r.resume_id,
        resumeName: r.resume_name || `Resume #${r.resume_id}`,
        totalApplications: parseInt(r.total_applications),
        successful: parseInt(r.successful),
        successRate: parseFloat(r.success_rate)
      })),
      coverLetterPerformance: coverLetterPerformance.rows.map(c => ({
        coverLetterId: c.cover_letter_id,
        coverLetterName: c.cover_letter_name || `Cover Letter #${c.cover_letter_id}`,
        totalApplications: parseInt(c.total_applications),
        successful: parseInt(c.successful),
        successRate: parseFloat(c.success_rate)
      })),
      customizationPerformance: customizationPerformance.rows.map(c => ({
        resumeCustomization: c.resume_customization,
        coverLetterCustomization: c.cover_letter_customization,
        totalApplications: parseInt(c.total_applications),
        successful: parseInt(c.successful),
        successRate: parseFloat(c.success_rate)
      })),
      approachPerformance: approachPerformance.rows.map(a => ({
        approach: a.application_approach,
        totalApplications: parseInt(a.total_applications),
        successful: parseInt(a.successful),
        successRate: parseFloat(a.success_rate)
      })),
      timingAnalysis: timingAnalysis.rows.map(t => ({
        dayOfWeek: parseInt(t.day_of_week),
        hourOfDay: parseInt(t.hour_of_day),
        totalApplications: parseInt(t.total_applications),
        successful: parseInt(t.successful),
        successRate: parseFloat(t.success_rate)
      })),
      roleTypePerformance: roleTypePerformance.rows.map(r => ({
        roleType: r.role_type,
        totalApplications: parseInt(r.total_applications),
        successful: parseInt(r.successful),
        successRate: parseFloat(r.success_rate)
      })),
      industryPerformance: industryPerformance.rows.map(i => ({
        industry: i.industry,
        totalApplications: parseInt(i.total_applications),
        successful: parseInt(i.successful),
        successRate: parseFloat(i.success_rate)
      })),
      trendOverTime: trendOverTime.rows.map(t => ({
        month: t.month,
        totalApplications: parseInt(t.total_applications),
        successful: parseInt(t.successful),
        successRate: parseFloat(t.success_rate)
      })),
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      abTestResults
    });
  } catch (err) {
    console.error('Error fetching optimization dashboard:', err);
    res.status(500).json({ error: 'Failed to load optimization dashboard', details: err.message });
  }
});

export default router;

