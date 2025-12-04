# Gemini-Powered Market Benchmark Data

## Overview

Instead of manually looking up salary data from Levels.fyi or Glassdoor, you can now use **Google Gemini AI** to automatically fetch and populate market benchmark data!

The system uses your existing `GOOGLE_API_KEY` to query Gemini for current market salary data based on role, level, location, and other criteria.

## API Endpoints

### 1. Fetch Single Benchmark

**POST** `/api/market-benchmarks/fetch`

Request body:
```json
{
  "role_title": "Software Engineer",
  "role_level": "senior",
  "location": "San Francisco, CA",
  "industry": "Technology",  // optional
  "company_size": "large",  // optional
  "location_type": "on_site"  // optional: 'remote', 'hybrid', 'on_site', 'flexible'
}
```

Response:
```json
{
  "success": true,
  "message": "Market benchmark data fetched and saved",
  "benchmark": {
    "id": 1,
    "role_title": "Software Engineer",
    "role_level": "senior",
    "location": "San Francisco, CA",
    "percentile_10": 150000,
    "percentile_25": 170000,
    "percentile_50": 190000,
    "percentile_75": 220000,
    "percentile_90": 260000,
    "data_source": "gemini_estimate",
    ...
  },
  "ai_notes": "Based on 2024-2025 market data from Levels.fyi and industry standards"
}
```

### 2. Batch Fetch Multiple Benchmarks

**POST** `/api/market-benchmarks/batch-fetch`

Request body:
```json
{
  "benchmarks": [
    {
      "role_title": "Software Engineer",
      "role_level": "senior",
      "location": "San Francisco, CA"
    },
    {
      "role_title": "Data Scientist",
      "role_level": "mid",
      "location": "New York, NY"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [...],
  "errors": []
}
```

### 3. Auto-Fetch for Existing Offer

**POST** `/api/market-benchmarks/auto-fetch-for-offer`

Request body:
```json
{
  "offer_id": 123
}
```

This automatically fetches benchmark data based on the offer's role, level, location, etc. It checks if a benchmark already exists first to avoid duplicate API calls.

## Frontend Usage

### Using the API Functions

```javascript
import { fetchMarketBenchmark, batchFetchMarketBenchmarks, autoFetchBenchmarkForOffer } from './api';

// Fetch a single benchmark
const result = await fetchMarketBenchmark({
  role_title: "Software Engineer",
  role_level: "senior",
  location: "San Francisco, CA",
  industry: "Technology",
  company_size: "large"
});

// Auto-fetch for an offer
const offerBenchmark = await autoFetchBenchmarkForOffer(offerId);
```

### Example: Add to Compensation Analytics Page

You could add a button to automatically fetch benchmarks for all offers:

```javascript
const handleAutoFetchBenchmarks = async () => {
  try {
    setLoading(true);
    const offers = await getOffers(); // Your existing function
    
    for (const offer of offers) {
      if (offer.id) {
        await autoFetchBenchmarkForOffer(offer.id);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    alert('Benchmarks fetched successfully!');
    // Refresh the analytics page
    loadData();
  } catch (err) {
    console.error('Error fetching benchmarks:', err);
    alert('Some benchmarks failed to fetch. Check console for details.');
  } finally {
    setLoading(false);
  }
};
```

## How It Works

1. **Gemini AI Query**: The system sends a detailed prompt to Gemini asking for market salary data
2. **Data Parsing**: Gemini returns structured JSON with salary percentiles
3. **Database Storage**: The data is automatically inserted/updated in the `market_benchmarks` table
4. **Conflict Handling**: Uses `ON CONFLICT` to update existing benchmarks instead of creating duplicates

## Data Quality

- **Source**: Gemini uses its training data which includes information from Levels.fyi, Glassdoor, PayScale, and other sources
- **Accuracy**: Data is based on 2024-2025 market conditions
- **Validation**: The system validates that required percentiles are present before saving
- **Notes**: Gemini provides notes about the data source/methodology when available

## Rate Limiting

- Batch requests are limited to 10 benchmarks at a time
- There's a 1-second delay between requests in batch operations
- Consider caching results to avoid repeated API calls for the same role/location combinations

## Cost Considerations

- Gemini API calls are relatively inexpensive
- Each benchmark fetch = 1 API call
- Consider fetching benchmarks once and reusing them rather than fetching on every page load

## Tips

1. **Fetch benchmarks when creating offers**: Automatically fetch benchmark data when a user creates a new offer
2. **Cache results**: Check if a benchmark exists before fetching (the auto-fetch endpoint does this)
3. **Batch operations**: Use batch fetch for multiple roles at once
4. **Update periodically**: Market data changes, so consider refreshing benchmarks quarterly

## Example: Integration with Offer Creation

You could modify the offer creation flow to automatically fetch benchmarks:

```javascript
// In OfferForm.jsx or similar
const handleSubmit = async (formData) => {
  // ... existing offer creation logic ...
  
  // After creating the offer, auto-fetch benchmark
  try {
    await autoFetchBenchmarkForOffer(newOfferId);
    console.log('Market benchmark fetched automatically');
  } catch (err) {
    console.warn('Could not fetch benchmark:', err);
    // Don't fail the offer creation if benchmark fetch fails
  }
};
```

## Troubleshooting

- **"Missing GOOGLE_API_KEY"**: Make sure `GOOGLE_API_KEY` is set in your `.env` file
- **"Invalid JSON response"**: Gemini sometimes wraps JSON in markdown - the system handles this automatically
- **Rate limiting**: If you hit rate limits, reduce batch sizes or add longer delays between requests

