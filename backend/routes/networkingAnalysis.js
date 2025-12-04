import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";

const router = express.Router();
router.use(auth);

// Industry benchmarks for networking
const NETWORKING_BENCHMARKS = {
  avgOutreachResponseRate: 0.15, // 15% response rate
  avgReferralConversionRate: 0.30, // 30% of referrals lead to interviews
  avgRelationshipStrength: 5.0, // Average relationship strength (1-10)
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
    } catch (err) {
      console.warn("networking_activities table not found:", err.message);
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
        ORDER BY relationship_strength DESC, last_contact_date DESC NULLS LAST;
      `;
      contactsResult = await pool.query(contactsQuery, [userId]);
    } catch (err) {
      console.warn("networking_contacts table not found:", err.message);
      contactsResult = { rows: [] };
    }

    const relationshipMetrics = {
      totalContacts: contactsResult.rows.length,
      avgRelationshipStrength: 0,
      avgEngagementScore: 0,
      avgReciprocityScore: 0,
      byStrengthTier: {
        strong: 0, // 8-10
        medium: 0, // 5-7
        weak: 0    // 1-4
      },
      warmingUp: [], // Contacts with increasing strength
      coolingDown: [], // Contacts with decay
      highValueContacts: [] // Contacts with referrals or high engagement
    };

    let totalStrength = 0;
    let totalEngagement = 0;
    let totalReciprocity = 0;

    contactsResult.rows.forEach(contact => {
      const strength = ensureNumber(contact.relationship_strength);
      const engagement = ensureNumber(contact.engagement_score);
      const reciprocity = ensureNumber(contact.reciprocity_score);
      const interactionCount = ensureNumber(contact.interaction_count);
      const referralCount = ensureNumber(contact.referral_count);

      totalStrength += strength;
      totalEngagement += engagement;
      totalReciprocity += reciprocity;

      // Categorize by strength
      if (strength >= 8) relationshipMetrics.byStrengthTier.strong++;
      else if (strength >= 5) relationshipMetrics.byStrengthTier.medium++;
      else relationshipMetrics.byStrengthTier.weak++;

      // Check for decay
      const decayFactor = calculateContactDecay(contact.last_contact_date);
      if (decayFactor < 0.7 && strength > 5) {
        relationshipMetrics.coolingDown.push({
          name: contact.name,
          company: contact.company,
          strength: strength,
          daysSinceContact: contact.last_contact_date 
            ? Math.floor((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24))
            : null
        });
      }

      // High value contacts
      if (referralCount > 0 || engagement > 0.7 || reciprocity > 0.6) {
        relationshipMetrics.highValueContacts.push({
          name: contact.name,
          company: contact.company,
          strength: strength,
          referrals: referralCount,
          engagement: engagement,
          reciprocity: reciprocity
        });
      }
    });

    if (contactsResult.rows.length > 0) {
      relationshipMetrics.avgRelationshipStrength = totalStrength / contactsResult.rows.length;
      relationshipMetrics.avgEngagementScore = totalEngagement / contactsResult.rows.length;
      relationshipMetrics.avgReciprocityScore = totalReciprocity / contactsResult.rows.length;
    }

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
    } catch (err) {
      console.warn("networking_referrals table not found:", err.message);
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
      const eventsQuery = `
        SELECT 
          id,
          event_name,
          event_type,
          event_date,
          event_start_time,
          event_end_time,
          COALESCE(cost, 0) AS cost,
          COALESCE(actual_connections_made, 0) AS contacts_met,
          COALESCE(expected_connections, 0) AS expected_connections,
          networking_roi_score AS roi_score
        FROM networking_events
        WHERE user_id = $1
        ORDER BY event_date DESC;
      `;
      eventsResult = await pool.query(eventsQuery, [userId]);
    } catch (tableError) {
      // Table might not exist yet - return empty results
      console.warn("networking_events table not found or missing columns:", tableError.message);
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
      const opportunities = ensureNumber(event.contacts_met); // Use actual_connections_made
      // Calculate duration from start/end time
      let duration = 2; // default 2 hours
      if (event.event_start_time && event.event_end_time) {
        const start = event.event_start_time.split(':').map(Number);
        const end = event.event_end_time.split(':').map(Number);
        const startMinutes = start[0] * 60 + (start[1] || 0);
        const endMinutes = end[0] * 60 + (end[1] || 0);
        duration = Math.max(0, (endMinutes - startMinutes) / 60);
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

      // Top ROI events
      if (eventROI > 0) {
        roiMetrics.topROIEvents.push({
          name: event.event_name,
          type: type,
          date: event.event_date,
          cost: cost,
          opportunities: opportunities,
          roi: eventROI
        });
      }
    });

    roiMetrics.totalInvestment = totalCost;
    roiMetrics.totalOpportunities = totalOpportunities;
    roiMetrics.avgROI = eventsResult.rows.length > 0 ? totalROI / eventsResult.rows.length : 0;

    // Calculate average ROI by event type
    Object.keys(roiMetrics.byEventType).forEach(type => {
      const data = roiMetrics.byEventType[type];
      data.avgROI = data.totalCost > 0 ? data.totalOpportunities / data.totalCost : 0;
    });

    // Sort top ROI events
    roiMetrics.topROIEvents.sort((a, b) => b.roi - a.roi).slice(0, 10);

    // Outreach ROI (time-based)
    const outreachOpportunities = referralsResult.rows.length + 
      activityResult.rows.filter(r => r.outcome === 'opportunity').reduce((sum, r) => sum + ensureNumber(r.total_activities), 0);
    roiMetrics.outreachROI.opportunities = outreachOpportunities;
    if (roiMetrics.outreachROI.timeInvested > 0) {
      roiMetrics.outreachROI.roi = outreachOpportunities / roiMetrics.outreachROI.timeInvested;
    }

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
      if (strength >= 8) tier = 'strong';
      else if (strength >= 5) tier = 'medium';

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
        totalEventInvestment: roiMetrics.totalInvestment,
        totalEventOpportunities: roiMetrics.totalOpportunities
      },
      dataQuality: {
        hasContacts: relationshipMetrics.totalContacts > 0,
        hasActivities: activityMetrics.totalActivities > 0,
        hasReferrals: referralAnalytics.totalReferrals > 0,
        hasEvents: roiMetrics.totalEvents > 0,
        sufficientData: relationshipMetrics.totalContacts >= 10 || activityMetrics.totalActivities >= 20
      }
    });

  } catch (err) {
    console.error("Networking analysis error:", err);
    res.status(500).json({ error: "Failed to compute networking analysis", details: err.message });
  }
});

export default router;

