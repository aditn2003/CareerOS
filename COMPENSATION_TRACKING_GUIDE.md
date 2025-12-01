# Compensation & Offer Tracking System - Implementation Guide

## Overview

This system provides comprehensive salary and compensation tracking, negotiation analytics, market benchmarking, and career progression insights.

## Features Implemented

### 1. ✅ Salary & Offer Tracking

**Database Tables:**
- `offers` - Tracks all job offers with full compensation details
- `compensation_history` - Tracks accepted roles over time
- `negotiation_history` - Records all negotiation attempts and outcomes

**Key Capabilities:**
- Track base salary offers by role, company, location, level
- Calculate total compensation (base + bonus + equity + benefits)
- Store accepted vs rejected offers
- Track negotiation outcomes (e.g., "negotiated +10% base")
- Handle multiple competing offers for the same role

**API Endpoints:**
- `GET /api/offers` - Get all offers
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update offer
- `POST /api/offers/:id/negotiate` - Record negotiation
- `POST /api/offers/:id/accept` - Accept offer (creates compensation history)

### 2. ✅ Negotiation Analytics

**Metrics Calculated:**
- **Negotiation Success Rate**: Offers improved vs total negotiations
- **Typical Improvement Size**: Average % increase in base/total comp
- **Patterns Over Time**: Track if you're getting better at negotiating
- **Context-Based Analysis**: Which contexts lead to better outcomes (industry, role type, company size, remote vs on-site)

**API Endpoints:**
- `GET /api/compensation-analytics/full` - Full analytics dashboard
- `GET /api/compensation-analytics/negotiation-success` - Success rate metrics

**Analytics Provided:**
- Total negotiations vs successful negotiations
- Average and median improvement percentages
- Monthly negotiation trends
- Success rates by industry, company size, location type, role level

### 3. ✅ Market Benchmark Comparison

**Benchmark Data Structure:**
- Role title, level, industry, company size
- Location and location type (remote/on-site/hybrid)
- Percentile data (10th, 25th, 50th, 75th, 90th)
- Years of experience ranges
- Sample size and data source

**Comparison Features:**
- Calculate percentile position of user's compensation
- Flag if under/over-paid
- Market bucketing (NYC SWE vs Midwest SWE vs Remote Data Analyst)
- Approximation strategies when exact benchmark not found

**API Endpoints:**
- `GET /api/compensation-analytics/market-comparison/:offerId` - Compare offer to market

**Approximation Strategies:**
1. Find similar role/level in same location
2. Find same role/level in different location, adjust for COL
3. Use role-level averages across all locations

### 4. ✅ Total Compensation Evolution

**Analytics Provided:**
- Evolution of total comp as roles change (intern → junior → mid → senior)
- Trends in benefits and perks (PTO, health, bonus %, equity refreshers)
- Visual representation of comp progression over time
- Detection of plateau vs growth phases

**API Endpoints:**
- `GET /api/compensation-analytics/evolution` - Get compensation timeline

**Features:**
- Milestone detection (first $100k, $150k, $200k TC, promotions)
- Plateau detection (periods with <3% annualized increase)
- Role transition analysis
- Salary increase tracking

### 5. ✅ Career Progression & Earning Potential

**Capabilities:**
- Link roles, titles, and seniority levels to expected salary bands
- Track progression path (intern → entry → junior → mid → senior → staff)
- Calculate salary increases between roles
- Identify inflection points (big salary jumps >15%)

**Data Structure:**
- Role level mapping (intern, entry, junior, mid, senior, staff, principal, lead, manager, director, vp)
- Compensation history tracks progression
- Promotion tracking with salary increase percentages

### 6. ✅ Strategy Recommendations

**Recommendations Engine:**
- Suggests when to negotiate vs when offer is already strong
- Identifies high-value opportunities (roles/locations/industries)
- Flags if user is significantly under market
- Recommends optimal timing for career moves

**Implementation:**
- Market comparison provides negotiation recommendations
- Analytics identify underpaid situations
- Context analysis shows best-performing negotiation scenarios

### 7. ✅ Industry & Location-Specific Positioning

**Features:**
- Cost of living normalization (stored in `cost_of_living_index` table)
- "Your pay vs peers" comparison by city/industry/level
- Industry and location-specific salary bands
- Remote role handling (location-based vs HQ-based vs fixed remote bands)

**Database Tables:**
- `market_benchmarks` - Industry and location-specific data
- `cost_of_living_index` - COL adjustments for different locations

## Database Setup

Run the migration file to create all necessary tables:

```sql
-- Run this file:
backend/db/add_compensation_tracking.sql
```

This creates:
- `offers` table
- `compensation_history` table
- `negotiation_history` table
- `market_benchmarks` table
- `cost_of_living_index` table
- All necessary indexes

## API Usage Examples

### Create an Offer

```javascript
POST /api/offers
{
  "company": "Google",
  "role_title": "Software Engineer",
  "role_level": "senior",
  "location": "San Francisco, CA",
  "location_type": "on_site",
  "industry": "Technology",
  "company_size": "large",
  "base_salary": 180000,
  "signing_bonus": 50000,
  "annual_bonus_percent": 15,
  "annual_bonus_guaranteed": false,
  "equity_type": "rsu",
  "equity_value": 200000,
  "equity_vesting_schedule": "4 years, 1 year cliff",
  "pto_days": 20,
  "health_insurance_value": 12000,
  "retirement_match_percent": 6,
  "other_benefits_value": 5000,
  "offer_date": "2024-01-15",
  "expiration_date": "2024-02-15",
  "offer_status": "pending",
  "years_of_experience": 5.5
}
```

### Record a Negotiation

```javascript
POST /api/offers/:id/negotiate
{
  "negotiated_base_salary": 195000,
  "negotiation_notes": "Negotiated based on market data and competing offer",
  "negotiation_type": "base_salary",
  "outcome": "accepted",
  "leverage_points": ["competing_offer", "market_data"]
}
```

### Get Full Analytics

```javascript
GET /api/compensation-analytics/full

Response includes:
- All offers
- Compensation history
- Negotiation history
- Negotiation metrics (success rate, avg improvement)
- Compensation evolution
- Offer statistics
- Negotiation trends
- Context-based metrics
```

### Compare Offer to Market

```javascript
GET /api/compensation-analytics/market-comparison/:offerId

Response includes:
- Offer details
- Market benchmark data
- Percentile position
- Flags (underpaid, atMarket, overpaid, significantlyUnderpaid)
- Recommendations
```

## Frontend Usage

### Access the Compensation Page

Navigate to `/compensation` in your application.

### Features Available:

1. **Add New Offer**: Click "Add New Offer" button
2. **View All Offers**: See all offers in a grid layout
3. **Edit Offer**: Click "Edit" on any offer card
4. **Accept Offer**: Click "Accept" to create compensation history entry
5. **Record Negotiation**: Click "Negotiate" to record negotiation attempt
6. **Market Comparison**: Click "Market Compare" to see how offer compares to market
7. **View Analytics**: See summary cards and charts for:
   - Total offers and acceptance rates
   - Average salaries
   - Negotiation success rates
   - Negotiation trends over time

## Total Compensation Calculation

The system automatically calculates total compensation:

**Year 1 Total Comp:**
```
base_salary + signing_bonus + annual_bonus + (equity_value / 4) + benefits
```

**Year 4 Total Comp:**
```
(base_salary * 4) + signing_bonus + (annual_bonus * 4) + equity_value + (benefits * 4)
```

Where:
- `annual_bonus` = base_salary × annual_bonus_percent (or 70% if not guaranteed)
- `equity` = equity_value / 4 (assuming 4-year vesting)
- `benefits` = health_insurance_value + other_benefits_value

## Market Benchmark Data

To populate market benchmarks, you'll need to:

1. **Import benchmark data** into the `market_benchmarks` table
2. **Add cost of living indices** to the `cost_of_living_index` table

Example benchmark entry:
```sql
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  150000, 170000, 190000, 220000, 260000,
  500, 'levels.fyi', '2024-01-01'
);
```

## Next Steps

1. **Run the database migration**: Execute `add_compensation_tracking.sql`
2. **Populate market benchmarks**: Add benchmark data for your target roles/locations
3. **Add cost of living data**: Populate `cost_of_living_index` table
4. **Start tracking offers**: Use the frontend to add your first offer
5. **Record negotiations**: Track all negotiation attempts for analytics

## Future Enhancements

Potential additions:
- Integration with external salary data APIs (Glassdoor, Levels.fyi, etc.)
- Automated market benchmark updates
- Career move timing recommendations based on peer data
- "Stay vs Switch" scenario modeling
- Industry-specific negotiation strategies
- Location-based salary normalization visualizations

## Support

For issues or questions, check:
- Backend routes: `backend/routes/offers.js` and `backend/routes/compensationAnalytics.js`
- Frontend component: `frontend/src/pages/Compensation.jsx`
- API functions: `frontend/src/api.js` (compensation section)

