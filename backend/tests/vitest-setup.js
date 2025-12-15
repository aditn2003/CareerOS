/**
 * Global Vitest Setup File
 * Runs before each test file to configure the test environment
 * OPTIMIZED: Uses transaction-based isolation for much faster tests
 */

import dotenv from 'dotenv';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, beginTransaction, rollbackTransaction, releaseQueryClient } from './helpers/db.js';
import { resetMocks } from './helpers/mocks.js';
import pool from '../db/pool.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test database connection pool
let testPool = null;
// Transaction client for current test
let transactionClient = null;
// Original pool.query method (for restoration)
let originalPoolQuery = null;

/**
 * Setup before all tests run
 */
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Ensure JWT_SECRET is set for all tests
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-key';
  }
  
  // Setup test database connection
  testPool = await setupTestDatabase();
  
  // Set test schema search path
  if (testPool) {
    await testPool.query('SET search_path TO test, public');
  }
  
  // Store original pool.query method
  originalPoolQuery = pool.query.bind(pool);
  
  console.log('✅ Test environment initialized (transaction-based isolation)');
});

/**
 * Cleanup after all tests complete
 */
afterAll(async () => {
  // Restore original pool.query if it was patched
  if (originalPoolQuery && pool.query !== originalPoolQuery) {
    pool.query = originalPoolQuery;
  }
  
  // Ensure any pending transaction is rolled back
  if (transactionClient) {
    await rollbackTransaction(transactionClient);
    transactionClient = null;
  }
  
  // Cleanup test database
  if (testPool) {
    await teardownTestDatabase(testPool);
  }
  
  console.log('✅ Test environment cleaned up');
});

/**
 * Setup before each test - Start transaction for isolation
 */
beforeEach(async () => {
  // Reset all mocks
  resetMocks();
  
  // Release any previous query client
  releaseQueryClient();
  
  // Start a new transaction for this test
  // All database operations will be rolled back automatically
  if (testPool) {
    transactionClient = await beginTransaction(testPool);
    
    // Patch pool.query to use transaction client during tests
    // This ensures routes that use pool.query() also use the transaction
    pool.query = function(text, params, callback) {
      if (transactionClient) {
        // Use transaction client for all queries
        if (callback) {
          return transactionClient.query(text, params, callback);
        }
        return transactionClient.query(text, params);
      }
      // Fallback to original if no transaction
      return originalPoolQuery(text, params, callback);
    };
    
    // Also patch pool.connect to return transaction client
    const originalPoolConnect = pool.connect.bind(pool);
    pool.connect = async function() {
      if (transactionClient) {
        // Return a proxy that uses transaction client
        return {
          query: transactionClient.query.bind(transactionClient),
          release: () => {}, // No-op for transaction client
        };
      }
      return originalPoolConnect();
    };
    
    // Make transaction client available globally for queryTestDb
    global.transactionClient = transactionClient;
  }
});

/**
 * Cleanup after each test - Rollback transaction (much faster than DELETE/TRUNCATE)
 */
afterEach(async () => {
  // Release query client
  releaseQueryClient();
  
  // Rollback transaction - this is MUCH faster than cleaning up data
  // All changes made during the test are automatically undone
  if (transactionClient) {
    await rollbackTransaction(transactionClient);
    transactionClient = null;
    global.transactionClient = null;
  }
  
  // Restore original pool methods
  if (originalPoolQuery) {
    pool.query = originalPoolQuery;
  }
});

// Export test pool and transaction client for use in tests
export { testPool, transactionClient };

