import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Industry benchmarks for networking
const NETWORKING_BENCHMARKS = {
  avgOutreachResponseRate: 0.15, // 15% response rate
  avgReferralConversionRate: 0.30, // 30% of referrals lead to interviews
  avgRelationshipStrength: 3.0, // Average relationship strength (1-5)
  avgContactsPerMonth: 20,
  avgEventROI: 2.5, // 2.5x return on event investment
  warmOutreachSuccessRate: 0.25, // 25% success for warm outreach
  coldOutreachSuccessRate: 0.05, // 5% success for cold outreach
};

// Helper functions
function ensureNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function calculateContactDecay(lastContactDate) {
  if (!lastContactDate) return 1.0; // No decay if never contacted
  
  const daysSinceContact = Math.floor(
    (new Date() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24)
  );
  
  // Relationship decays 10% per month (30 days)
  const decayRate = Math.max(0, 1 - (daysSinceContact / 30) * 0.1);
  return Math.min(1.0, Math.max(0.1, decayRate));
}

function calculateROI(investment, opportunities, conversionRate, avgOfferValue = 1) {
  if (investment === 0) return 0;
  const value = opportunities * conversionRate * avgOfferValue;
  return value / investment;
}

/* ==================================================================
   GET /api/networking-analysis/full
   Comprehensive networking analytics
================================================================== */
router.get("/full", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("========================================");
    console.log("Networking Analysis for user:", userId);
    console.log("========================================");

    // --------------------------------------------------------
    // 1. NETWORKING ACTIVITY TRACKING
    // --------------------------------------------------------
    let activityResult = { rows: [] };
    try {
      const activityQuery = `
        SELECT 
          activity_type,
          channel,
          direction,
          COUNT(*) AS total_activities,
          COUNT(*) FILTER (WHERE outcome = 'positive' OR outcome = 'referral' OR outcome = 'opportunity') AS successful,
          COUNT(*) FILTER (WHERE direction = 'inbound') AS inbound_count,
          COUNT(*) FILTER (WHERE direction = 'outbound') AS outbound_count,
          COALESCE(SUM(time_spent_minutes), 0) AS total_time_minutes,
          COALESCE(AVG(relationship_impact), 0) AS avg_relationship_impact
        FROM networking_activities
        WHERE user_id = $1
        GROUP BY activity_type, channel, direction
        ORDER BY total_activities DESC;
      `;
      activityResult = await pool.query(activityQuery, [userId]);
      console.log(`✓ Activities: ${activityResult.rows.length} activity groups found`);
    } catch (err) {
      console.warn("⚠ networking_activities table not found or query failed:", err.message);
      activityResult = { rows: [] };
    }

    const activityMetrics = {
      totalActivities: activityResult.rows.reduce((sum, r) => sum + ensureNumber(r.total_activities), 0),
      byType: {},
      byChannel: {},
      inboundVsOutbound: { inbound: 0, outbound: 0 },
      totalTimeSpent: activityResult.rows.reduce((sum, r) => sum + ensureNumber(r.total_time_minutes), 0),
      responseRate: 0
    };

    activityResult.rows.forEach(row => {
      const type = row.activity_type;
      const channel = row.channel || 'unknown';
      const direction = row.direction || 'outbound';
      const total = ensureNumber(row.total_activities);
      const successful = ensureNumber(row.successful);

      // By type
      if (!activityMetrics.byType[type]) {
        activityMetrics.byType[type] = { total: 0, successful: 0, responseRate: 0 };
      }
      activityMetrics.byType[type].total += total;
      activityMetrics.byType[type].successful += successful;

      // By channel
      if (!activityMetrics.byChannel[channel]) {
        activityMetrics.byChannel[channel] = { total: 0, successful: 0, responseRate: 0 };
      }
      activityMetrics.byChannel[channel].total += total;
      activityMetrics.byChannel[channel].successful += successful;

      // Inbound vs Outbound
      if (direction === 'inbound') {
        activityMetrics.inboundVsOutbound.inbound += total;
      } else {
        activityMetrics.inboundVsOutbound.outbound += total;
      }
    });

    // Calculate response rates
    Object.keys(activityMetrics.byType).forEach(type => {
      const data = activityMetrics.byType[type];
      data.responseRate = data.total > 0 ? data.successful / data.total : 0;
    });

    Object.keys(activityMetrics.byChannel).forEach(channel => {
      const data = activityMetrics.byChannel[channel];
      data.responseRate = data.total > 0 ? data.successful / data.total : 0;
    });

    const totalOutbound = activityMetrics.inboundVsOutbound.outbound;
    const totalInbound = activityMetrics.inboundVsOutbound.inbound;
    activityMetrics.responseRate = totalOutbound > 0 ? totalInbound / totalOutbound : 0;

    // Monthly activity trends
    let monthlyActivity = [];
    try {
      const monthlyActivityQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) AS month,
          COUNT(*) AS activities,
          COUNT(*) FILTER (WHERE direction = 'outbound') AS outbound,
          COUNT(*) FILTER (WHERE direction = 'inbound') AS inbound
        FROM networking_activities
        WHERE user_id = $1
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12;
      `;
      monthlyActivity = (await pool.query(monthlyActivityQuery, [userId])).rows.map(row => ({
      month: row.month,
      monthLabel: row.month ? new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
      activities: ensureNumber(row.activities),
      outbound: ensureNumber(row.outbound),
      inbound: ensureNumber(row.inbound),
      responseRate: ensureNumber(row.outbound) > 0 
        ? ensureNumber(row.inbound) / ensureNumber(row.outbound) 
        : 0
      }));
    } catch (err) {
      console.warn("Monthly activity query failed:", err.message);
      monthlyActivity = [];
    }

    // --------------------------------------------------------
    // 2. RELATIONSHIP DEVELOPMENT METRICS
    // --------------------------------------------------------
    let contactsResult = { rows: [] };
    try {
      // First, check if table exists and has data
      const tableCheck = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'networking_contacts'
      `);
      
      if (tableCheck.rows[0].count === '0') {
        console.warn("⚠ networking_contacts table does not exist");
        contactsResult = { rows: [] };
      } else {
        // Check total contacts for this user
        const countCheck = await pool.query(
          `SELECT COUNT(*) as count FROM networking_contacts WHERE user_id = $1`,
          [userId]
        );
        console.log(`📊 Total contacts in networking_contacts for user ${userId}: ${countCheck.rows[0].count}`);
        
        const contactsQuery = `
          SELECT 
            id,
            name,
            company,
            industry,
            COALESCE(relationship_strength, 1) AS relationship_strength,
            COALESCE(engagement_score, 0) AS engagement_score,
            COALESCE(reciprocity_score, 0) AS reciprocity_score,
            last_contact_date,
            created_at,
            (SELECT COUNT(*) FROM networking_activities WHERE contact_id = networking_contacts.id) AS interaction_count,
            (SELECT COUNT(*) FROM networking_referrals WHERE contact_id = networking_contacts.id) AS referral_count
          FROM networking_contacts
          WHERE user_id = $1
          ORDER BY created_at DESC, relationship_strength DESC, last_contact_date DESC NULLS LAST;
        `;
        contactsResult = await pool.query(contactsQuery, [userId]);
        console.log(`✓ Contacts: ${contactsResult.rows.length} contacts found`);
        if (contactsResult.rows.length > 0) {
          console.log(`📋 Sample contact (newest first):`, {
            id: contactsResult.rows[0].id,
            name: contactsResult.rows[0].name,
            strength: contactsResult.rows[0].relationship_strength,
            engagement: contactsResult.rows[0].engagement_score,
            created_at: contactsResult.rows[0].created_at
          });
          // Also log the most recently created contact
          const newestContact = contactsResult.rows.reduce((newest, contact) => {
            const newestDate = new Date(newest.created_at || 0);
            const contactDate = new Date(contact.created_at || 0);
            return contactDate > newestDate ? contact : newest;
          }, contactsResult.rows[0]);
          if (newestContact.id !== contactsResult.rows[0].id) {
            console.log(`📋 Most recently created contact:`, {
              id: newestContact.id,
              name: newestContact.name,
              created_at: newestContact.created_at
            });
          }
        }
        
        // Also check professional_contacts table as fallback
        let professionalContactsResult = { rows: [] };
        try {
          const professionalContactsCheck = await pool.query(
            `SELECT COUNT(*) as count FROM professional_contacts WHERE user_id = $1`,
            [userId]
          );
          console.log(`📊 Total contacts in professional_contacts for user ${userId}: ${professionalContactsCheck.rows[0].count}`);
          
          // If contacts exist in professional_contacts, merge them with networking_contacts
          if (professionalContactsCheck.rows[0].count > 0) {
            console.log("🔄 Found contacts in professional_contacts, merging with networking_contacts...");
            const professionalQuery = `
              SELECT 
                id,
                COALESCE(
                  NULLIF(TRIM(first_name || ' ' || last_name), ''),
                  first_name,
                  last_name,
                  'Unknown'
                ) as name,
                company,
                industry,
                COALESCE(relationship_strength, 3) AS relationship_strength,
                relationship_type,
                0 AS engagement_score,
                0 AS reciprocity_score,
                NULL AS last_contact_date,
                created_at,
                0 AS interaction_count,
                0 AS referral_count,
                email,
                phone,
                title,
                location,
                linkedin_profile,
                notes
              FROM professional_contacts
              WHERE user_id = $1
              ORDER BY created_at DESC, relationship_strength DESC NULLS LAST;
            `;
            professionalContactsResult = await pool.query(professionalQuery, [userId]);
            console.log(`✓ Found ${professionalContactsResult.rows.length} contacts in professional_contacts`);
            
            // Merge professional_contacts with networking_contacts (avoid duplicates by email or name)
            const existingContactEmails = new Set(
              contactsResult.rows
                .map(c => c.email?.toLowerCase().trim())
                .filter(e => e)
            );
            const existingContactNames = new Set(
              contactsResult.rows
                .map(c => c.name?.toLowerCase().trim())
                .filter(n => n)
            );
            
            const newContactsFromProfessional = professionalContactsResult.rows.filter(contact => {
              const contactEmail = contact.email?.toLowerCase().trim();
              const contactName = contact.name?.toLowerCase().trim();
              
              // Skip if email matches (and email exists)
              if (contactEmail && existingContactEmails.has(contactEmail)) {
                return false;
              }
              
              // Skip if name matches (and name exists)
              if (contactName && existingContactNames.has(contactName)) {
                return false;
              }
              
              return true;
            });
            
            console.log(`📊 Merging ${newContactsFromProfessional.length} new contacts from professional_contacts`);
            
            // Add new contacts from professional_contacts to the result
            contactsResult.rows = [...contactsResult.rows, ...newContactsFromProfessional];
            
            // Re-sort by created_at DESC
            contactsResult.rows.sort((a, b) => {
              const dateA = new Date(a.created_at || 0);
              const dateB = new Date(b.created_at || 0);
              return dateB.getTime() - dateA.getTime();
            });
            
            // Also try to migrate them to networking_contacts for future use
            try {
              const migrateQuery = `
                INSERT INTO networking_contacts 
                (user_id, name, email, company, title, industry, linkedin_url, 
                 relationship_strength, notes, created_at, updated_at)
                SELECT 
                  user_id,
                  COALESCE(
                    NULLIF(TRIM(first_name || ' ' || last_name), ''),
                    first_name,
                    last_name,
                    'Unknown'
                  ) as name,
                  email,
                  company,
                  title,
                  industry,
                  linkedin_profile as linkedin_url,
                  COALESCE(relationship_strength, 3) as relationship_strength,
                  notes,
                  created_at,
                  updated_at
                FROM professional_contacts
                WHERE user_id = $1
                AND NOT EXISTS (
                  SELECT 1 FROM networking_contacts nc 
                  WHERE nc.user_id = professional_contacts.user_id 
                  AND (
                    (nc.email IS NOT NULL AND professional_contacts.email IS NOT NULL AND nc.email = professional_contacts.email)
                    OR
                    (nc.email IS NULL AND professional_contacts.email IS NULL AND 
                     nc.name = COALESCE(
                       NULLIF(TRIM(professional_contacts.first_name || ' ' || professional_contacts.last_name), ''),
                       professional_contacts.first_name,
                       professional_contacts.last_name,
                       'Unknown'
                     ))
                  )
                )
                RETURNING *;
              `;
              const migrated = await pool.query(migrateQuery, [userId]);
              console.log(`✓ Migrated ${migrated.rows.length} contacts to networking_contacts`);
            } catch (migrateErr) {
              console.warn("⚠ Could not migrate contacts (this is okay if they're already migrated):", migrateErr.message);
            }
          }
        } catch (profErr) {
          console.warn("⚠ Could not check professional_contacts table:", profErr.message);
        }
      }
    } catch (err) {
      console.error("⚠ Error querying contacts:", err.message);
      console.error("Stack trace:", err.stack);
      contactsResult = { rows: [] };
    }

    console.log(`📊 Final total contacts after merging: ${contactsResult.rows.length}`);
    if (contactsResult.rows.length > 0) {
      console.log(`📋 All contact names:`, contactsResult.rows.map(c => c.name).join(', '));
    }

    const relationshipMetrics = {
      totalContacts: contactsResult.rows.length,
      avgRelationshipStrength: 0,
      avgEngagementScore: 0,
      avgReciprocityScore: 0,
      byStrengthTier: {
        strong: 0, // 4-5
        medium: 0, // 3
        weak: 0    // 1-2
      },
      warmingUp: [], // Contacts with increasing strength
      coolingDown: [], // Contacts with decay
      highValueContacts: [] // Contacts with referrals or high engagement
    };

    let totalStrength = 0;
    let totalEngagement = 0;
    let totalReciprocity = 0;

    // Calculate relationship health scores and engagement frequency
    const relationshipHealthScores = [];
    const engagementFrequencyData = {
      frequent: 0, // > 1 interaction per month
      moderate: 0, // 1 interaction per 1-3 months
      infrequent: 0, // < 1 interaction per 3 months
      never: 0 // No interactions
    };

    contactsResult.rows.forEach(contact => {
      const strength = ensureNumber(contact.relationship_strength);
      const engagement = ensureNumber(contact.engagement_score);
      const reciprocity = ensureNumber(contact.reciprocity_score);
      const interactionCount = ensureNumber(contact.interaction_count);
      const referralCount = ensureNumber(contact.referral_count);

      totalStrength += strength;
      totalEngagement += engagement;
      totalReciprocity += reciprocity;

      // Calculate relationship health score (0-100)
      // Health = (strength * 0.4) + (engagement * 0.3) + (reciprocity * 0.2) + (interaction frequency * 0.1)
      const decayFactor = calculateContactDecay(contact.last_contact_date);
      const daysSinceContact = contact.last_contact_date 
        ? Math.floor((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24))
        : null;
      
      // Calculate interaction frequency score (based on interactions per month)
      const daysSinceCreated = contact.created_at 
        ? Math.floor((new Date() - new Date(contact.created_at)) / (1000 * 60 * 60 * 24))
        : 1;
      const monthsSinceCreated = Math.max(1, daysSinceCreated / 30);
      const interactionsPerMonth = interactionCount / monthsSinceCreated;
      
      let frequencyScore = 0;
      if (interactionsPerMonth >= 1) {
        frequencyScore = 1.0;
        engagementFrequencyData.frequent++;
      } else if (interactionsPerMonth >= 0.33) {
        frequencyScore = 0.7;
        engagementFrequencyData.moderate++;
      } else if (interactionsPerMonth > 0) {
        frequencyScore = 0.4;
        engagementFrequencyData.infrequent++;
      } else {
        engagementFrequencyData.never++;
      }

      const healthScore = Math.round(
        (strength / 5 * 40) + 
        (engagement * 30) + 
        (reciprocity * 20) + 
        (frequencyScore * 10)
      );

      relationshipHealthScores.push({
        name: contact.name,
        company: contact.company,
        healthScore: healthScore,
        strength: strength,
        engagement: engagement,
        reciprocity: reciprocity,
        interactionCount: interactionCount,
        interactionsPerMonth: interactionsPerMonth.toFixed(2),
        daysSinceContact: daysSinceContact,
        lastContactDate: contact.last_contact_date
      });

      // Categorize by strength (1-5 scale)
      if (strength >= 4) relationshipMetrics.byStrengthTier.strong++;
      else if (strength >= 3) relationshipMetrics.byStrengthTier.medium++;
      else relationshipMetrics.byStrengthTier.weak++;

      // Check for decay
      if (decayFactor < 0.7 && strength > 3) {
        relationshipMetrics.coolingDown.push({
          name: contact.name,
          company: contact.company,
          strength: strength,
          healthScore: healthScore,
          daysSinceContact: daysSinceContact
        });
      }

      // High value contacts (based on health score, engagement, or reciprocity)
      if (healthScore >= 70 || engagement > 0.7 || reciprocity > 0.6 || interactionCount >= 5) {
        relationshipMetrics.highValueContacts.push({
          name: contact.name,
          company: contact.company,
          strength: strength,
          healthScore: healthScore,
          engagement: engagement,
          reciprocity: reciprocity,
          interactionCount: interactionCount,
          interactionsPerMonth: interactionsPerMonth.toFixed(2)
        });
      }
    });

    if (contactsResult.rows.length > 0) {
      relationshipMetrics.avgRelationshipStrength = totalStrength / contactsResult.rows.length;
      relationshipMetrics.avgEngagementScore = totalEngagement / contactsResult.rows.length;
      relationshipMetrics.avgReciprocityScore = totalReciprocity / contactsResult.rows.length;
    }

    // Add relationship health and engagement frequency data
    relationshipMetrics.relationshipHealthScores = relationshipHealthScores.sort((a, b) => b.healthScore - a.healthScore);
    relationshipMetrics.avgHealthScore = relationshipHealthScores.length > 0
      ? relationshipHealthScores.reduce((sum, c) => sum + c.healthScore, 0) / relationshipHealthScores.length
      : 0;
    relationshipMetrics.engagementFrequency = engagementFrequencyData;

    // --------------------------------------------------------
    // 3. OPPORTUNITY & REFERRAL ANALYTICS
    // --------------------------------------------------------
    let referralsResult = { rows: [] };
    try {
      const referralsQuery = `
        SELECT 
          r.*,
          c.name AS contact_name,
          c.company AS contact_company,
          j.title AS job_title,
          j.company AS job_company,
          j.status AS job_status
        FROM networking_referrals r
        LEFT JOIN networking_contacts c ON r.contact_id = c.id
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC;
      `;
      referralsResult = await pool.query(referralsQuery, [userId]);
      console.log(`✓ Referrals: ${referralsResult.rows.length} referrals found`);
    } catch (err) {
      console.warn("⚠ networking_referrals table not found or query failed:", err.message);
      referralsResult = { rows: [] };
    }

    const referralAnalytics = {
      totalReferrals: referralsResult.rows.length,
      byType: {},
      byContact: {},
      conversionRates: {
        referralToInterview: 0,
        referralToOffer: 0,
        overallConversion: 0
      },
      warmVsCold: {
        warm: { count: 0, converted: 0 },
        cold: { count: 0, converted: 0 }
      },
      avgQualityScore: 0,
      topReferrers: []
    };

    let totalQuality = 0;
    let interviewsFromReferrals = 0;
    let offersFromReferrals = 0;

    referralsResult.rows.forEach(ref => {
      const type = ref.referral_type || 'unknown';
      const contactName = ref.contact_name || 'Unknown';
      const quality = ensureNumber(ref.quality_score);
      const isWarm = type === 'warm_introduction' || type === 'direct_referral';

      totalQuality += quality;

      // By type
      if (!referralAnalytics.byType[type]) {
        referralAnalytics.byType[type] = { count: 0, converted: 0 };
      }
      referralAnalytics.byType[type].count++;

      // By contact
      if (!referralAnalytics.byContact[contactName]) {
        referralAnalytics.byContact[contactName] = { count: 0, converted: 0, company: ref.contact_company };
      }
      referralAnalytics.byContact[contactName].count++;

      // Warm vs Cold
      if (isWarm) {
        referralAnalytics.warmVsCold.warm.count++;
        if (ref.converted_to_interview || ref.converted_to_offer) {
          referralAnalytics.warmVsCold.warm.converted++;
        }
      } else {
        referralAnalytics.warmVsCold.cold.count++;
        if (ref.converted_to_interview || ref.converted_to_offer) {
          referralAnalytics.warmVsCold.cold.converted++;
        }
      }

      // Conversion tracking
      if (ref.converted_to_interview) interviewsFromReferrals++;
      if (ref.converted_to_offer) offersFromReferrals++;
    });

    if (referralsResult.rows.length > 0) {
      referralAnalytics.avgQualityScore = totalQuality / referralsResult.rows.length;
      referralAnalytics.conversionRates.referralToInterview = interviewsFromReferrals / referralsResult.rows.length;
      referralAnalytics.conversionRates.referralToOffer = offersFromReferrals / referralsResult.rows.length;
      referralAnalytics.conversionRates.overallConversion = offersFromReferrals / referralsResult.rows.length;
    }

    // Top referrers
    referralAnalytics.topReferrers = Object.entries(referralAnalytics.byContact)
      .map(([name, data]) => ({
        name,
        company: data.company,
        referrals: data.count,
        conversionRate: data.converted / data.count
      }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10);

    // Warm vs Cold effectiveness
    if (referralAnalytics.warmVsCold.warm.count > 0) {
      referralAnalytics.warmVsCold.warm.conversionRate = 
        referralAnalytics.warmVsCold.warm.converted / referralAnalytics.warmVsCold.warm.count;
    }
    if (referralAnalytics.warmVsCold.cold.count > 0) {
      referralAnalytics.warmVsCold.cold.conversionRate = 
        referralAnalytics.warmVsCold.cold.converted / referralAnalytics.warmVsCold.cold.count;
    }

    // --------------------------------------------------------
    // 4. NETWORKING ROI MODEL
    // --------------------------------------------------------
    // Check if networking_events table exists and has the expected columns
    let eventsResult = { rows: [] };
    try {
      // First check which columns exist in the table
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'networking_events' 
        AND column_name IN ('event_start_time', 'event_end_time', 'actual_connections_made', 'expected_connections', 'networking_roi_score', 'contacts_met', 'roi_score', 'duration_hours')
        AND table_schema = 'public'
      `);
      
      const availableColumns = new Set(columnCheck.rows.map(r => r.column_name));
      
      // Build query based on available columns
      let eventsQuery = `
        SELECT 
          id,
          event_name,
          event_type,
          event_date,
          COALESCE(cost, 0) AS cost
      `;
      
      // Add time columns if they exist
      if (availableColumns.has('event_start_time')) {
        eventsQuery += `, event_start_time`;
      } else {
        eventsQuery += `, NULL AS event_start_time`;
      }
      
      if (availableColumns.has('event_end_time')) {
        eventsQuery += `, event_end_time`;
      } else {
        eventsQuery += `, NULL AS event_end_time`;
      }
      
      // Add connections columns - prefer actual_connections_made, fallback to contacts_met
      if (availableColumns.has('actual_connections_made')) {
        eventsQuery += `, COALESCE(actual_connections_made, 0) AS contacts_met`;
      } else if (availableColumns.has('contacts_met')) {
        eventsQuery += `, COALESCE(contacts_met, 0) AS contacts_met`;
      } else {
        eventsQuery += `, 0 AS contacts_met`;
      }
      
      if (availableColumns.has('expected_connections')) {
        eventsQuery += `, COALESCE(expected_connections, 0) AS expected_connections`;
      } else {
        eventsQuery += `, 0 AS expected_connections`;
      }
      
      // Add ROI score - prefer networking_roi_score, fallback to roi_score
      if (availableColumns.has('networking_roi_score')) {
        eventsQuery += `, networking_roi_score AS roi_score`;
      } else if (availableColumns.has('roi_score')) {
        eventsQuery += `, roi_score`;
      } else {
        eventsQuery += `, NULL AS roi_score`;
      }
      
      // Add duration_hours if available
      if (availableColumns.has('duration_hours')) {
        eventsQuery += `, duration_hours`;
      } else {
        eventsQuery += `, NULL AS duration_hours`;
      }
      
      eventsQuery += `
        FROM networking_events
        WHERE user_id = $1
        ORDER BY created_at DESC, event_date DESC;
      `;
      
      eventsResult = await pool.query(eventsQuery, [userId]);
      console.log(`✓ Events: ${eventsResult.rows.length} events found`);
      if (eventsResult.rows.length > 0) {
        console.log(`📅 Sample event:`, {
          id: eventsResult.rows[0].id,
          name: eventsResult.rows[0].event_name,
          date: eventsResult.rows[0].event_date,
          created: eventsResult.rows[0].created_at || 'N/A'
        });
      }
    } catch (tableError) {
      // Table might not exist yet - return empty results
      console.warn("⚠ networking_events table not found or query failed:", tableError.message);
      eventsResult = { rows: [] };
    }

    const roiMetrics = {
      totalEvents: eventsResult.rows.length,
      totalInvestment: 0,
      totalOpportunities: 0,
      avgROI: 0,
      byEventType: {},
      topROIEvents: [],
      outreachROI: {
        timeInvested: activityMetrics.totalTimeSpent / 60, // Convert to hours
        opportunities: 0,
        roi: 0
      }
    };

    let totalCost = 0;
    let totalOpportunities = 0;
    let totalROI = 0;

    eventsResult.rows.forEach(event => {
      const cost = ensureNumber(event.cost);
      const opportunities = ensureNumber(event.contacts_met); // Use actual_connections_made or contacts_met
      // Calculate duration from start/end time, or use duration_hours if available
      let duration = 2; // default 2 hours
      if (event.duration_hours) {
        duration = ensureNumber(event.duration_hours);
      } else if (event.event_start_time && event.event_end_time) {
        try {
          const start = event.event_start_time.split(':').map(Number);
          const end = event.event_end_time.split(':').map(Number);
          const startMinutes = start[0] * 60 + (start[1] || 0);
          const endMinutes = end[0] * 60 + (end[1] || 0);
          duration = Math.max(0, (endMinutes - startMinutes) / 60);
        } catch (timeErr) {
          // If time parsing fails, use default
          duration = 2;
        }
      }
      const type = event.event_type || 'other';

      totalCost += cost;
      totalOpportunities += opportunities;

      // Calculate ROI if not already set
      let eventROI = ensureNumber(event.roi_score);
      if (!eventROI && cost > 0) {
        // Simple ROI: opportunities per dollar spent
        eventROI = opportunities / cost;
      }
      totalROI += eventROI;

      // By event type
      if (!roiMetrics.byEventType[type]) {
        roiMetrics.byEventType[type] = {
          count: 0,
          totalCost: 0,
          totalOpportunities: 0,
          avgROI: 0
        };
      }
      roiMetrics.byEventType[type].count++;
      roiMetrics.byEventType[type].totalCost += cost;
      roiMetrics.byEventType[type].totalOpportunities += opportunities;

      // All events (for display) - include all events, not just those with ROI > 0
      roiMetrics.topROIEvents.push({
        name: event.event_name,
        type: type,
        date: event.event_date,
        cost: cost,
        opportunities: opportunities,
        roi: eventROI || 0,
        created_at: event.created_at || null
      });
    });

    roiMetrics.totalInvestment = totalCost;
    roiMetrics.totalOpportunities = totalOpportunities;
    roiMetrics.avgROI = eventsResult.rows.length > 0 ? totalROI / eventsResult.rows.length : 0;

    // Calculate average ROI by event type
    Object.keys(roiMetrics.byEventType).forEach(type => {
      const data = roiMetrics.byEventType[type];
      data.avgROI = data.totalCost > 0 ? data.totalOpportunities / data.totalCost : 0;
    });

    // Sort events by creation date (newest first), then by ROI
    roiMetrics.topROIEvents.sort((a, b) => {
      // First sort by created_at if available (newest first)
      if (a.created_at && b.created_at) {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
      }
      // Then by ROI (highest first)
      return b.roi - a.roi;
    });

    // Outreach ROI (time-based) - Calculate based on activities and contacts
    const outreachOpportunities = activityResult.rows
      .filter(r => {
        const outcome = r.outcome || '';
        return outcome === 'opportunity' || outcome === 'positive' || outcome === 'referral';
      })
      .reduce((sum, r) => sum + ensureNumber(r.total_activities), 0);
    
    // Calculate networking ROI: opportunities generated per hour invested
    roiMetrics.outreachROI.opportunities = outreachOpportunities;
    if (roiMetrics.outreachROI.timeInvested > 0) {
      roiMetrics.outreachROI.roi = outreachOpportunities / roiMetrics.outreachROI.timeInvested;
    } else if (activityMetrics.totalActivities > 0) {
      // If no time tracked, estimate based on activities (assume 30 min per activity)
      const estimatedHours = activityMetrics.totalActivities * 0.5;
      roiMetrics.outreachROI.roi = estimatedHours > 0 ? outreachOpportunities / estimatedHours : 0;
    }

    // Calculate contact-based ROI (value of relationships)
    const contactROI = {
      totalContacts: relationshipMetrics.totalContacts,
      highValueContacts: relationshipMetrics.highValueContacts.length,
      avgHealthScore: relationshipMetrics.avgHealthScore || 0,
      totalInteractions: relationshipMetrics.relationshipHealthScores?.reduce((sum, c) => sum + (c.interactionCount || 0), 0) || 0,
      roiScore: 0 // Opportunities per contact
    };
    
    if (contactROI.totalContacts > 0) {
      contactROI.roiScore = outreachOpportunities / contactROI.totalContacts;
    }
    
    roiMetrics.contactROI = contactROI;

    // Relationship tier ROI
    const relationshipTierROI = {
      strong: { contacts: 0, referrals: 0, conversionRate: 0 },
      medium: { contacts: 0, referrals: 0, conversionRate: 0 },
      weak: { contacts: 0, referrals: 0, conversionRate: 0 }
    };

    contactsResult.rows.forEach(contact => {
      const strength = ensureNumber(contact.relationship_strength);
      const referrals = ensureNumber(contact.referral_count);
      let tier = 'weak';
      if (strength >= 4) tier = 'strong';
      else if (strength >= 3) tier = 'medium';

      relationshipTierROI[tier].contacts++;
      relationshipTierROI[tier].referrals += referrals;
    });

    Object.keys(relationshipTierROI).forEach(tier => {
      const data = relationshipTierROI[tier];
      data.conversionRate = data.contacts > 0 ? data.referrals / data.contacts : 0;
    });

    roiMetrics.relationshipTierROI = relationshipTierROI;

    // --------------------------------------------------------
    // 5. STRATEGY INSIGHTS
    // --------------------------------------------------------
    const insights = [];

    // Top-performing channels
    const topChannel = Object.entries(activityMetrics.byChannel)
      .sort((a, b) => b[1].responseRate - a[1].responseRate)[0];
    if (topChannel && topChannel[1].total >= 5) {
      insights.push({
        type: "channel",
        priority: "high",
        message: `**${topChannel[0].charAt(0).toUpperCase() + topChannel[0].slice(1)}** is your top-performing networking channel with ${(topChannel[1].responseRate * 100).toFixed(1)}% response rate. Focus more efforts here.`,
        action: `Increase ${topChannel[0]} outreach activities`
      });
    }

    // Warming up relationships
    if (relationshipMetrics.highValueContacts.length > 0) {
      insights.push({
        type: "relationship",
        priority: "medium",
        message: `You have ${relationshipMetrics.highValueContacts.length} high-value contacts with strong engagement or referrals. Nurture these relationships.`,
        action: "Schedule follow-ups with high-value contacts"
      });
    }

    // Cooling down relationships
    if (relationshipMetrics.coolingDown.length > 0) {
      insights.push({
        type: "relationship",
        priority: "medium",
        message: `${relationshipMetrics.coolingDown.length} strong relationships are cooling down due to lack of contact. Re-engage soon.`,
        action: `Reach out to ${relationshipMetrics.coolingDown.slice(0, 3).map(c => c.name).join(', ')} and others`
      });
    }

    // Weak outreach cadence
    const avgActivitiesPerMonth = activityMetrics.totalActivities / Math.max(monthlyActivity.length, 1);
    if (avgActivitiesPerMonth < 10) {
      insights.push({
        type: "cadence",
        priority: "high",
        message: `Your average networking activity is ${avgActivitiesPerMonth.toFixed(1)} per month. Industry average is 20+. Increase your outreach frequency.`,
        action: "Set a goal of 20+ networking activities per month"
      });
    }

    // Industry performance
    let industryContacts = [];
    try {
      const industryContactsQuery = `
        SELECT 
          industry,
          COUNT(*) AS contacts,
          AVG(COALESCE(relationship_strength, 1)) AS avg_strength,
          SUM((SELECT COUNT(*) FROM networking_referrals WHERE contact_id = networking_contacts.id)) AS referrals
        FROM networking_contacts
        WHERE user_id = $1 AND industry IS NOT NULL
        GROUP BY industry
        HAVING COUNT(*) >= 2
        ORDER BY referrals DESC, avg_strength DESC;
      `;
      industryContacts = (await pool.query(industryContactsQuery, [userId])).rows;
    } catch (err) {
      console.warn("Industry contacts query failed:", err.message);
      industryContacts = [];
    }

    if (industryContacts.length > 0) {
      const topIndustry = industryContacts[0];
      insights.push({
        type: "industry",
        priority: "low",
        message: `**${topIndustry.industry}** industry contacts show the best results (${ensureNumber(topIndustry.referrals)} referrals, ${ensureNumber(topIndustry.avg_strength).toFixed(1)} avg strength).`,
        action: `Expand your network in ${topIndustry.industry}`
      });
    }

    // Referral quality
    if (referralAnalytics.avgQualityScore < 6 && referralAnalytics.totalReferrals > 0) {
      insights.push({
        type: "referral",
        priority: "medium",
        message: `Your average referral quality score is ${referralAnalytics.avgQualityScore.toFixed(1)}/10. Focus on building stronger relationships for better referrals.`,
        action: "Invest more time in relationship building before asking for referrals"
      });
    }

    // Event ROI
    if (roiMetrics.avgROI < NETWORKING_BENCHMARKS.avgEventROI && roiMetrics.totalEvents > 0) {
      insights.push({
        type: "events",
        priority: "low",
        message: `Your event ROI (${roiMetrics.avgROI.toFixed(1)}x) is below industry average (${NETWORKING_BENCHMARKS.avgEventROI}x). Be more selective about events.`,
        action: "Focus on events with higher networking potential"
      });
    }

    // Sort insights by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // --------------------------------------------------------
    // 6. INDUSTRY BENCHMARKING
    // --------------------------------------------------------
    const benchmarkComparison = {
      responseRate: {
        user: activityMetrics.responseRate,
        industry: NETWORKING_BENCHMARKS.avgOutreachResponseRate,
        status: activityMetrics.responseRate >= NETWORKING_BENCHMARKS.avgOutreachResponseRate ? 'above' : 'below'
      },
      referralConversion: {
        user: referralAnalytics.conversionRates.referralToInterview,
        industry: NETWORKING_BENCHMARKS.avgReferralConversionRate,
        status: referralAnalytics.conversionRates.referralToInterview >= NETWORKING_BENCHMARKS.avgReferralConversionRate ? 'above' : 'below'
      },
      relationshipStrength: {
        user: relationshipMetrics.avgRelationshipStrength,
        industry: NETWORKING_BENCHMARKS.avgRelationshipStrength,
        status: relationshipMetrics.avgRelationshipStrength >= NETWORKING_BENCHMARKS.avgRelationshipStrength ? 'above' : 'below'
      },
      monthlyContacts: {
        user: avgActivitiesPerMonth,
        industry: NETWORKING_BENCHMARKS.avgContactsPerMonth,
        status: avgActivitiesPerMonth >= NETWORKING_BENCHMARKS.avgContactsPerMonth ? 'above' : 'below'
      },
      eventROI: {
        user: roiMetrics.avgROI,
        industry: NETWORKING_BENCHMARKS.avgEventROI,
        status: roiMetrics.avgROI >= NETWORKING_BENCHMARKS.avgEventROI ? 'above' : 'below'
      },
      warmVsCold: {
        userWarm: referralAnalytics.warmVsCold.warm.conversionRate || 0,
        userCold: referralAnalytics.warmVsCold.cold.conversionRate || 0,
        industryWarm: NETWORKING_BENCHMARKS.warmOutreachSuccessRate,
        industryCold: NETWORKING_BENCHMARKS.coldOutreachSuccessRate
      }
    };

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------
    const dataQuality = {
      hasContacts: relationshipMetrics.totalContacts > 0,
      hasActivities: activityMetrics.totalActivities > 0,
      hasReferrals: referralAnalytics.totalReferrals > 0,
      hasEvents: roiMetrics.totalEvents > 0,
      sufficientData: relationshipMetrics.totalContacts >= 10 || activityMetrics.totalActivities >= 20
    };
    
    console.log("========================================");
    console.log("Networking Analysis Summary:");
    console.log(`  Contacts: ${relationshipMetrics.totalContacts}`);
    console.log(`  Activities: ${activityMetrics.totalActivities}`);
    console.log(`  Referrals: ${referralAnalytics.totalReferrals}`);
    console.log(`  Events: ${roiMetrics.totalEvents}`);
    console.log(`  Data Quality: ${dataQuality.sufficientData ? 'Sufficient' : 'Limited'}`);
    console.log("========================================");
    
    res.json({
      activityMetrics,
      monthlyActivity,
      relationshipMetrics,
      referralAnalytics,
      roiMetrics,
      insights,
      benchmarkComparison,
      summaryCards: {
        totalContacts: relationshipMetrics.totalContacts,
        totalActivities: activityMetrics.totalActivities,
        totalReferrals: referralAnalytics.totalReferrals,
        avgResponseRate: activityMetrics.responseRate,
        avgRelationshipStrength: relationshipMetrics.avgRelationshipStrength,
        avgHealthScore: relationshipMetrics.avgHealthScore || 0,
        avgEngagementScore: relationshipMetrics.avgEngagementScore,
        totalEventInvestment: roiMetrics.totalInvestment,
        totalEventOpportunities: roiMetrics.totalOpportunities,
        networkingROI: roiMetrics.outreachROI.roi || 0,
        contactROI: roiMetrics.contactROI?.roiScore || 0
      },
      dataQuality
    });

  } catch (err) {
    console.error("========================================");
    console.error("Networking analysis error:", err);
    console.error("Stack trace:", err.stack);
    console.error("========================================");
    res.status(500).json({ 
      error: "Failed to compute networking analysis", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;

