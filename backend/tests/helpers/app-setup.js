/**
 * Test App Setup Helper
 * Creates an Express app instance with all routes configured for testing
 */

import express from 'express';
import cors from 'cors';
import { setupTestDatabase } from './db.js';

/**
 * Creates a test Express app with all routes
 * Uses test database pool instead of production pool
 */
export async function createTestServer() {
  const app = express();
  
  // Apply middleware
  app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }));
  app.use(express.json());
  
  // Get test database pool
  const testPool = await setupTestDatabase();
  
  // Mock the pool import for routes
  // We'll need to inject the test pool into routes that use it
  // For now, routes will use the test schema via search_path
  
  // Import and set up routes
  // Note: Routes will need to be modified to accept pool injection for full testing
  // For now, we'll test routes that use the shared pool from db/pool.js
  
  return { app, testPool };
}

/**
 * Creates a minimal Express app for route testing
 * Routes should be added manually in tests
 */
export function createMinimalTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  return app;
}

export default {
  createTestServer,
  createMinimalTestApp,
};

