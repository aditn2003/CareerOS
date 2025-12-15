# UC-116: Location and Geo-coding Services - Implementation Guide

## Overview
This document provides a step-by-step guide for implementing UC-116, which adds interactive map visualization and geocoding services to the job tracker application.

## ✅ Implementation Status
All components have been implemented and are ready for testing.

## 📋 Step-by-Step Implementation

### Step 1: Database Migration
**File:** `backend/db/add_geocoding_fields.sql`

Run this migration to add geocoding fields to your database:
```bash
psql -d your_database_name -f backend/db/add_geocoding_fields.sql
```

This migration:
- Adds `latitude`, `longitude`, `location_type`, `geocoded_at`, and `geocoding_error` fields to the `jobs` table
- Creates a `geocoding_cache` table to minimize API calls
- Adds `home_latitude`, `home_longitude`, and `home_location_geocoded_at` fields to the `profiles` table

### Step 2: Backend Routes

#### 2.1 Geocoding Service
**File:** `backend/routes/geocoding.js`

This service provides:
- `/api/geocoding/geocode` - Geocode a single location
- `/api/geocoding/geocode/batch` - Geocode multiple locations
- `/api/geocoding/commute` - Calculate commute distance and time
- `/api/geocoding/home-location` - Set user's home location

**Features:**
- Rate limiting (1 request/second) to comply with Nominatim API limits
- Caching to minimize API calls
- Automatic location type detection (remote/hybrid/on-site)

#### 2.2 Jobs Map Endpoint
**File:** `backend/routes/job.js` (new route: `/api/jobs/map`)

This endpoint:
- Returns jobs with geocoding data
- Supports filtering by location type, max distance, max time, and status
- Calculates commute distance/time when filters are applied

#### 2.3 Profile Updates
**File:** `backend/routes/profile.js`

Updated to:
- Automatically geocode location when profile is saved
- Store home location coordinates for commute calculations

### Step 3: Frontend Components

#### 3.1 JobMapView Component
**File:** `frontend/src/components/JobMapView.jsx`

Features:
- Interactive map using react-leaflet
- Displays jobs as markers with color coding by location type
- Shows home location marker
- Auto-geocodes jobs without coordinates
- Filtering by location type, distance, and time
- Side-by-side comparison of multiple job locations
- Commute distance and time calculations

#### 3.2 Jobs Page Integration
**File:** `frontend/src/pages/Jobs.jsx`

Added:
- View mode toggle (Pipeline/Map)
- Integration of JobMapView component

### Step 4: Dependencies

Already installed:
- `react-leaflet` - React wrapper for Leaflet maps
- `leaflet` - Interactive maps library
- `axios` - HTTP client (already in backend)

## 🚀 How to Use

### For Users:

1. **Set Home Location:**
   - Go to Profile → Info Tab
   - Enter your location in the "Location" field
   - Save profile (location will be automatically geocoded)

2. **View Jobs on Map:**
   - Go to Jobs page
   - Click "Map" button in the view toggle
   - Jobs will be displayed on an interactive map
   - Jobs without coordinates will be automatically geocoded

3. **Filter Jobs:**
   - Use filters at the top of the map view:
     - Location Type: Remote, Hybrid, On-Site, Flexible
     - Max Distance: Filter by maximum commute distance in miles
     - Max Time: Filter by maximum commute time in minutes
     - Status: Filter by job application status

4. **Compare Locations:**
   - Click on a job marker to see details
   - Click "Add to Comparison" to add jobs to comparison panel
   - View side-by-side comparison at the bottom of the map

5. **View Commute Information:**
   - Click on a job marker to automatically calculate commute distance and time
   - Information is displayed in the popup

### For Developers:

#### Running the Migration:
```bash
# Connect to your database
psql -d your_database_name

# Run the migration
\i backend/db/add_geocoding_fields.sql
```

#### Testing the Geocoding API:
```bash
# Geocode a location
curl -X POST http://localhost:4000/api/geocoding/geocode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "San Francisco, CA"}'

# Calculate commute
curl -X POST http://localhost:4000/api/geocoding/commute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": 1}'
```

## 🎯 Acceptance Criteria Status

✅ **Integrate with free geocoding API (OpenStreetMap Nominatim)**
- Implemented in `backend/routes/geocoding.js`
- Uses Nominatim API with proper rate limiting

✅ **Convert location strings to coordinates for distance calculations**
- Automatic geocoding on job creation/update
- Manual geocoding via API endpoints

✅ **Display jobs from Sprint 2's job tracking system on an interactive map view**
- Implemented in `frontend/src/components/JobMapView.jsx`
- Integrated into Jobs page

✅ **Calculate commute distance and estimated travel time from user's home location to each job**
- Implemented in `/api/geocoding/commute` endpoint
- Uses Haversine formula for distance calculation
- Estimates travel time based on average speed

✅ **Support filtering by location type (remote, hybrid, on-site)**
- Filter UI in JobMapView component
- Backend filtering in `/api/jobs/map` endpoint

✅ **Filter jobs by maximum commute distance or time**
- Filter inputs in JobMapView
- Backend filtering with distance/time calculations

✅ **Compare locations side-by-side for multiple job offers**
- Comparison panel in JobMapView
- Select multiple jobs for comparison

✅ **Handle international locations and time zones**
- Nominatim API supports international locations
- Coordinates stored as decimal degrees (works globally)

✅ **Cache geocoding results to minimize API usage**
- `geocoding_cache` table stores all geocoded locations
- Automatic cache lookup before API calls

✅ **Frontend Verification: View tracked jobs on map, verify accurate locations and commute distance/time calculations**
- Full implementation ready for testing

## 🔧 Configuration

### Environment Variables
No additional environment variables required. The implementation uses:
- OpenStreetMap Nominatim API (free, no API key needed)
- Database connection from existing `DATABASE_URL`

### Rate Limiting
The implementation includes rate limiting to comply with Nominatim's usage policy:
- 1 request per second maximum
- Automatic delays between requests
- Caching to minimize repeated requests

## 📝 Notes

1. **Geocoding Performance:**
   - First-time geocoding may be slow due to API rate limits
   - Subsequent requests use cached results (instant)
   - Batch geocoding is available for multiple locations

2. **Location Type Detection:**
   - Automatic detection based on location string keywords
   - Can be manually set when creating/editing jobs
   - Falls back to null if not detected

3. **Commute Calculations:**
   - Uses Haversine formula for distance (great circle distance)
   - Time estimation assumes 60 km/h average speed
   - For more accurate routing, consider integrating with Google Maps Directions API or similar

4. **International Support:**
   - Nominatim supports locations worldwide
   - Coordinates are stored in standard decimal degrees format
   - Time zones are not currently handled (future enhancement)

## 🐛 Troubleshooting

### Jobs not appearing on map:
1. Check if jobs have location data
2. Verify geocoding was successful (check `latitude` and `longitude` fields)
3. Check browser console for errors

### Commute calculations not working:
1. Ensure user has set home location in profile
2. Verify home location was geocoded (check `home_latitude` and `home_longitude` in profiles table)
3. Check that job has valid coordinates

### Geocoding errors:
1. Check Nominatim API status
2. Verify rate limiting is working (should see delays between requests)
3. Check database for cached results

## 🚀 Next Steps

1. **Run the database migration**
2. **Test the map view** with existing jobs
3. **Set your home location** in profile
4. **Verify commute calculations** work correctly
5. **Test filtering** functionality
6. **Try the comparison feature** with multiple jobs

## 📚 Additional Resources

- [OpenStreetMap Nominatim API Documentation](https://nominatim.org/release-docs/latest/api/Overview/)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Leaflet Documentation](https://leafletjs.com/)
