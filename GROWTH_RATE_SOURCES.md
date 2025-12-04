# Salary Growth Rate Estimates - Sources & Methodology

## Current Implementation

The system uses **estimated growth rates** when you have only one role in your compensation history. These are conservative estimates based on typical career progression patterns.

## Growth Rates by Level

| Level | Estimated Annual Growth | Notes |
|-------|------------------------|-------|
| Intern | 15% | High growth when transitioning to entry-level |
| Entry | 12% | Typical 10-15% range for early career |
| Junior | 10% | Typical 8-12% range |
| Mid | 8% | Industry reports suggest 8-12% for mid-level (3-7 YOE) |
| Senior | 6% | Slower growth at higher levels, typically 5-8% |
| Staff | 5% | Typically 4-6% annual growth |
| Principal | 4% | Typically 3-5% annual growth |
| Lead | 5% | Typically 4-6% annual growth |
| Manager | 7% | Management track, typically 6-10% |
| Director | 6% | Typically 5-8% annual growth |
| VP | 5% | Typically 4-6% annual growth |

## Sources & Methodology

### Industry Reports
- **Salary Solver (2025)**: Mid-level professionals (3-7 YOE) typically see 8-12% annual salary increases
- **General Career Progression Studies**: Show that growth rates decrease as seniority increases
- **Tech Industry Patterns**: Based on typical promotion cycles and salary increases

### Important Notes

1. **These are ESTIMATES**: Actual growth rates vary significantly based on:
   - Industry (tech vs finance vs healthcare)
   - Geographic location (HCOL vs LCOL)
   - Company size and type
   - Individual performance
   - Market conditions
   - Job switching vs staying

2. **For Accurate Projections**: 
   - Add multiple roles to your compensation history
   - The system will calculate your actual growth rate from your career progression
   - Personalized projections are always more accurate than estimates

3. **Job Switching Impact**:
   - Switching jobs typically yields 10-30% increases
   - Staying at the same company: 3-8% annual increases
   - Promotions: 10-25% increases

## How to Get Personalized Growth Rates

1. **Accept multiple offers** to create compensation history entries
2. **Add past roles** to your compensation history
3. The system will automatically calculate your actual growth rate
4. Projections will be based on your real career progression

## Customization

If you want to adjust these estimates, you can modify the `estimatedGrowthRates` object in:
- `backend/routes/compensationAnalytics.js` (line ~943)

Or better yet, add more roles to your compensation history for personalized calculations!

