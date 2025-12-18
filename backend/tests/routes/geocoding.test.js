/**
 * Geocoding Routes Tests
 * Tests routes/geocoding.js - location services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import geocodingRoutes from '../../routes/geocoding.js';
import pool from '../../db/pool.js';
import axios from 'axios';

// Mock dependencies
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../utils/apiTrackingService.js', () => ({
  trackApiCall: vi.fn((name, fn) => fn()),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token && secret) {
        return { id: 1 };
      }
      throw new Error('Invalid token');
    }),
  },
}));

describe('Geocoding Routes', () => {
  let app;
  let token;
  let userId = 1;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    
    // Create a test token (any string will work since jwt.verify is mocked)
    token = 'test-token';
    
    app = express();
    app.use(express.json());
    app.use('/api/geocoding', geocodingRoutes);
    
    vi.clearAllMocks();
  });

  describe('POST /api/geocoding/geocode', () => {
    it('should geocode a location successfully', async () => {
      const mockGeocodeResult = {
        latitude: 40.7128,
        longitude: -74.0060,
        display_name: 'New York, NY, USA',
        location_type: 'on_site',
        country_code: 'US',
      };

      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT latitude, longitude FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] }); // Cache miss
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: {
            city: 'New York',
            country_code: 'us',
          },
        }],
      });

      // Mock timezone API
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'OK',
          zoneName: 'America/New_York',
          gmtOffset: -18000,
        },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return cached result if available', async () => {
      // First query: ensureTimezoneColumns checks for column existence
      pool.query.mockResolvedValueOnce({ rows: [{ column_name: 'timezone' }] });
      // Second query: cache lookup returns cached data
      pool.query.mockResolvedValueOnce({
        rows: [{
          latitude: 40.7128,
          longitude: -74.0060,
          display_name: 'New York, NY, USA',
          location_type: 'on_site',
          country_code: 'US',
          timezone: 'America/New_York',
          utc_offset: -300,
        }],
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(axios.get).not.toHaveBeenCalled(); // Should use cache
    });

    it('should return 400 if location is missing', async () => {
      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 if location not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      axios.get.mockResolvedValueOnce({ data: [] });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'InvalidLocation12345' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/geocoding/geocode/batch', () => {
    it('should geocode multiple locations', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT latitude, longitude FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockImplementation(() => {
        return Promise.resolve({
          data: [{
            lat: '40.7128',
            lon: '-74.0060',
            display_name: 'New York, NY, USA',
            address: { city: 'New York', country_code: 'us' },
          }],
        });
      });

      // Mock timezone API
      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ locations: ['New York, NY', 'Los Angeles, CA'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.length).toBe(2);
    });

    it('should return 400 if locations is not an array', async () => {
      const response = await request(app)
        .post('/api/geocoding/geocode/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ locations: 'not-an-array' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/geocoding/commute', () => {
    it('should calculate commute distance', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query - check for both the SELECT columns and WHERE clause
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match the profile query
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: 34.0522,
              home_longitude: -118.2437,
              location: 'Los Angeles, CA',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.distance).toBeDefined();
      expect(response.body.data.drivingTime).toBeDefined();
      expect(response.body.data.planeTime).toBeDefined();
    });

    it('should geocode job location if coordinates missing', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: null,
              longitude: null,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match geocoding cache queries
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        // Match UPDATE jobs query
        if (query.includes('UPDATE jobs SET latitude')) {
          return Promise.resolve({ rows: [] });
        }
        // Match the profile query
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: 34.0522,
              home_longitude: -118.2437,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 999 });

      expect(response.status).toBe(404);
    });

    it('should geocode profile location when coordinates missing', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match the profile query - no coordinates, but has location
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: null,
              home_longitude: null,
              location: 'Los Angeles, CA',
            }],
          });
        }
        // Match geocoding cache queries
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        // Match UPDATE profiles query for home location
        if (query.includes('UPDATE profiles SET home_latitude')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '34.0522',
          lon: '-118.2437',
          display_name: 'Los Angeles, CA, USA',
          address: { city: 'Los Angeles', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/Los_Angeles', gmtOffset: -28800 },
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when home location is not set', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match the profile query - no coordinates and no location
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: null,
              home_longitude: null,
              location: null,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Home location not set');
    });

    it('should handle errors in commute calculation', async () => {
      pool.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when job location is not available', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query - no location and no coordinates
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: null,
              latitude: null,
              longitude: null,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Job location not available');
    });

    it('should return 404 when job location cannot be geocoded', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query - has location but no coordinates
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'InvalidLocation12345',
              latitude: null,
              longitude: null,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match geocoding cache queries
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({ data: [] });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Could not geocode job location');
    });

    it('should return 404 when provided homeLocation cannot be geocoded', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match geocoding cache queries for home location
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({ data: [] });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1, homeLocation: 'InvalidLocation12345' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Could not geocode home location');
    });

    it('should use provided homeLocation parameter', async () => {
      pool.query.mockImplementation((query, params) => {
        // Match the job query
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        // Match geocoding cache queries for home location
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '34.0522',
          lon: '-118.2437',
          display_name: 'Los Angeles, CA, USA',
          address: { city: 'Los Angeles', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/Los_Angeles', gmtOffset: -28800 },
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1, homeLocation: 'Los Angeles, CA' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should calculate commute for short distance (< 500km) - covers short flight branches', async () => {
      // Short distance: Boston to New York (~300km)
      // This should trigger: flightDistanceMultiplier = 1.15, avgPlaneSpeedKmh = 600, airportTimeMinutes = 180
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: 42.3601, // Boston
              home_longitude: -71.0589,
              location: 'Boston, MA',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.planeTime).toBeDefined();
      expect(response.body.data.planeTime.flightMinutes).toBeDefined();
      // Short flights should have 180 minutes (3 hours) airport time
      expect(response.body.data.planeTime.minutes).toBeGreaterThan(180);
    });

    it('should calculate commute for medium distance (500-2000km) - covers medium flight branches', async () => {
      // Medium distance: New York to Chicago (~1200km)
      // This should trigger: flightDistanceMultiplier = 1.10, avgPlaneSpeedKmh = 750, airportTimeMinutes = 150
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'Chicago, IL',
              latitude: 41.8781,
              longitude: -87.6298,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: 40.7128, // New York
              home_longitude: -74.0060,
              location: 'New York, NY',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.planeTime).toBeDefined();
      // Medium flights should have 150 minutes (2.5 hours) airport time
      expect(response.body.data.planeTime.minutes).toBeGreaterThan(150);
    });

    it('should calculate commute for medium-long distance (500-1500km) - covers medium flight speed branch', async () => {
      // Medium-long distance: San Francisco to Denver (~1300km)
      // This should trigger: avgPlaneSpeedKmh = 750 (medium flights 500-1500km)
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, location, latitude, longitude, company, title') && 
            query.includes('FROM jobs') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              location: 'Denver, CO',
              latitude: 39.7392,
              longitude: -104.9903,
              company: 'Tech Corp',
              title: 'Software Engineer',
            }],
          });
        }
        if (query.includes('SELECT home_latitude, home_longitude, location') && 
            query.includes('FROM profiles') && 
            query.includes('WHERE user_id = $1') &&
            params && params[0] === userId) {
          return Promise.resolve({
            rows: [{
              home_latitude: 37.7749, // San Francisco
              home_longitude: -122.4194,
              location: 'San Francisco, CA',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.planeTime).toBeDefined();
    });

    it('should handle timezone lookup failure gracefully', async () => {
      // Mock ensureTimezoneColumns
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [{ column_name: 'timezone' }] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock geocoding API success
      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      // Mock timezone API failure
      axios.get.mockRejectedValueOnce(new Error('Timezone API error'));

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should still succeed even if timezone lookup fails
    });

    it('should handle timezone API returning invalid response', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [{ column_name: 'timezone' }] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      // Timezone API returns invalid response (no status OK or zoneName)
      axios.get.mockResolvedValueOnce({
        data: { status: 'FAIL', message: 'Invalid request' },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle cache query error when timezone columns missing (fallback query)', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [] }); // Columns don't exist
        }
        if (query.includes('ALTER TABLE geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        // First cache query fails with column error
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          const error = new Error('column "timezone" does not exist');
          error.code = '42703';
          return Promise.reject(error);
        }
        // Fallback query succeeds
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code') && 
            query.includes('FROM geocoding_cache') &&
            !query.includes('timezone')) {
          return Promise.resolve({
            rows: [{
              latitude: 40.7128,
              longitude: -74.0060,
              display_name: 'New York, NY, USA',
              location_type: 'on_site',
              country_code: 'US',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle cache insert error when timezone columns missing (fallback insert)', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('ALTER TABLE geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        // Insert with timezone fails
        if (query.includes('INSERT INTO geocoding_cache') && query.includes('timezone')) {
          const error = new Error('column "timezone" does not exist');
          error.code = '42703';
          return Promise.reject(error);
        }
        // Fallback insert succeeds
        if (query.includes('INSERT INTO geocoding_cache') && !query.includes('timezone')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle ensureTimezoneColumns error and retry', async () => {
      let callCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          callCount++;
          if (callCount === 1) {
            // First call fails
            return Promise.reject(new Error('Database error'));
          }
          // Second call succeeds (columns exist)
          return Promise.resolve({ rows: [{ column_name: 'timezone' }] });
        }
        if (query.includes('ALTER TABLE geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle remote location (skips timezone lookup)', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [{ column_name: 'timezone' }] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'Remote',
          address: { country_code: 'us' },
        }],
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'Remote' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Timezone API should not be called for remote locations
      expect(axios.get).toHaveBeenCalledTimes(1); // Only geocoding, not timezone
    });

    it('should handle hybrid location', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('timezone')) {
          return Promise.resolve({ rows: [{ column_name: 'timezone' }] });
        }
        if (query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset') && 
            query.includes('FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'Hybrid',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'Hybrid' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.location_type).toBe('hybrid');
    });
  });

  describe('POST /api/geocoding/home-location', () => {
    it('should set user home location', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT latitude, longitude FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE profiles SET location')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: 'New York, NY, USA',
          address: { city: 'New York', country_code: 'us' },
        }],
      });

      axios.get.mockResolvedValueOnce({
        data: { status: 'OK', zoneName: 'America/New_York', gmtOffset: -18000 },
      });

      const response = await request(app)
        .post('/api/geocoding/home-location')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if location is missing', async () => {
      const response = await request(app)
        .post('/api/geocoding/home-location')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 if location cannot be geocoded', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT latitude, longitude FROM geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      axios.get.mockResolvedValueOnce({ data: [] });

      const response = await request(app)
        .post('/api/geocoding/home-location')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'InvalidLocation12345' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Location not found');
    });

    it('should handle errors when setting home location', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT latitude, longitude FROM geocoding_cache') ||
            query.includes('SELECT latitude, longitude, display_name, location_type, country_code, timezone, utc_offset')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO geocoding_cache')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE profiles SET location')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Make axios throw an error to trigger the catch block
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .post('/api/geocoding/home-location')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });
});

