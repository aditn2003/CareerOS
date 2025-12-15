/**
 * Geocoding Routes Tests
 * Tests routes/geocoding.js - location services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import geocodingRoutes from '../../routes/geocoding.js';
import { createTestUser } from '../helpers/auth.js';
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

describe('Geocoding Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/geocoding', geocodingRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
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
        .set('Authorization', `Bearer ${user.token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return cached result if available', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          latitude: 40.7128,
          longitude: -74.0060,
          display_name: 'New York, NY, USA',
          location_type: 'on_site',
          country_code: 'US',
        }],
      });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(axios.get).not.toHaveBeenCalled(); // Should use cache
    });

    it('should return 400 if location is missing', async () => {
      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 if location not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      axios.get.mockResolvedValueOnce({ data: [] });

      const response = await request(app)
        .post('/api/geocoding/geocode')
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
        .send({ locations: ['New York, NY', 'Los Angeles, CA'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.length).toBe(2);
    });

    it('should return 400 if locations is not an array', async () => {
      const response = await request(app)
        .post('/api/geocoding/geocode/batch')
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
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
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/geocoding/commute')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobId: 999 });

      expect(response.status).toBe(404);
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
        .set('Authorization', `Bearer ${user.token}`)
        .send({ location: 'New York, NY' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if location is missing', async () => {
      const response = await request(app)
        .post('/api/geocoding/home-location')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});

