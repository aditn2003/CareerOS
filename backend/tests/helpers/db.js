/**
 * Database Setup and Teardown Utilities
 * Handles test database connection, schema setup, and cleanup
 */

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
const { Pool } = pkg;

let testPool = null;

/**
 * Creates a test database connection pool
 * Uses the test schema as specified in the environment
 */
export async function setupTestDatabase() {
  if (testPool) {
    return testPool;
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const isSupabase = dbUrl.includes('supabase') || 
                     dbUrl.includes('pooler.supabase') ||
                     (dbUrl.includes('aws-') && dbUrl.includes('pooler'));

  const poolConfig = {
    connectionString: dbUrl,
    max: 1, // OPTIMIZED: Single connection for transaction-based tests
    min: 0, // OPTIMIZED: No minimum - create on demand
    idleTimeoutMillis: 30000, // OPTIMIZED: 30s idle timeout
    connectionTimeoutMillis: 5000, // OPTIMIZED: 5s for faster failure
    allowExitOnIdle: false, // OPTIMIZED: Keep pool alive during test run
    // Performance optimizations for faster connection reuse
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000, // OPTIMIZED: Faster keepalive
    // Disable statement timeout for long-running test setup
    statement_timeout: 0,
    query_timeout: 0,
  };

  // Force SSL for Supabase connections
  if (isSupabase) {
    poolConfig.ssl = { 
      rejectUnauthorized: false 
    };
  }

  testPool = new Pool(poolConfig);

  // Handle pool errors
  testPool.on('error', (err) => {
    console.error('Test database pool error:', err);
  });

  // Verify connection and set search path to test schema
  // OPTIMIZED: Single retry with fast timeout for immediate failure detection
  let client = null;
  let retries = 1;
  let lastError = null;
  
  while (retries >= 0) {
    try {
      client = await Promise.race([
        testPool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000) // OPTIMIZED: 5s timeout
        )
      ]);
      await client.query('SET search_path TO test, public');
      lastError = null;
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      retries--;
      if (retries >= 0) {
        // OPTIMIZED: No retry delay - fail fast
        console.warn(`⚠️ Database connection failed, retrying immediately... (${retries} attempts remaining)`);
      }
    }
  }
  
  if (lastError) {
    // If all retries failed, throw the last error
    throw lastError;
  }
  
  try {
    
    // Add missing columns to jobs table if they don't exist
    try {
      await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "applicationDate" DATE`);
      await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT FALSE`);
      await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "offerDate" DATE`);
      await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_date DATE`);
    } catch (migrationError) {
      // Ignore errors if columns already exist or table doesn't exist
      if (!migrationError.message.includes('already exists') && !migrationError.message.includes('does not exist')) {
        console.warn('⚠️ Warning: Could not add columns to jobs table:', migrationError.message);
      }
    }
    
    // Ensure cover_letters table has correct schema
    try {
      // Check if cover_letters table exists, if not create it
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'test' AND table_name = 'cover_letters'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Create cover_letters table with correct schema
        await client.query(`
          CREATE TABLE IF NOT EXISTS cover_letters (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            format VARCHAR(10) DEFAULT 'pdf',
            content TEXT,
            file_url TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
      } else {
        // Ensure title column exists (migrate from name if needed)
        const columnCheck = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = 'test' AND table_name = 'cover_letters' AND column_name = 'title'
        `);
        
        if (columnCheck.rows.length === 0) {
          // Check if name column exists
          const nameCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'test' AND table_name = 'cover_letters' AND column_name = 'name'
          `);
          
          if (nameCheck.rows.length > 0) {
            // Migrate name to title
            await client.query(`ALTER TABLE cover_letters RENAME COLUMN name TO title`);
          } else {
            // Add title column
            await client.query(`ALTER TABLE cover_letters ADD COLUMN title VARCHAR(255)`);
          }
        }
        
        // Ensure file_url column exists
        await client.query(`ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS file_url TEXT`);
        await client.query(`ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS format VARCHAR(10) DEFAULT 'pdf'`);
        await client.query(`ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
      }
      
      // Ensure uploaded_cover_letters table exists
      const uploadedTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'test' AND table_name = 'uploaded_cover_letters'
        )
      `);
      
      if (!uploadedTableCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS uploaded_cover_letters (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            format VARCHAR(10) NOT NULL DEFAULT 'pdf',
            file_url TEXT NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
      }
      
      // Ensure job_materials table exists
      const jobMaterialsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'test' AND table_name = 'job_materials'
        )
      `);
      
      if (!jobMaterialsCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS job_materials (
            id SERIAL PRIMARY KEY,
            job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
            cover_letter_id INTEGER REFERENCES uploaded_cover_letters(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_job_materials UNIQUE(job_id)
          )
        `);
      }
    } catch (migrationError) {
      // Ignore errors if table/columns already exist
      if (!migrationError.message.includes('already exists') && !migrationError.message.includes('does not exist')) {
        console.warn('⚠️ Warning: Could not setup cover_letters table:', migrationError.message);
      }
    }
    
    client.release();
    console.log('✅ Test database pool connected');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    console.error('💡 Make sure .env.test exists with DATABASE_URL pointing to your test database');
    console.error('💡 The test database should have a "test" schema with all tables');
    throw error;
  }

  return testPool;
}

/**
 * Closes the test database connection pool
 */
export async function teardownTestDatabase(pool = testPool) {
  if (!pool) {
    return;
  }

  try {
    await pool.end();
    testPool = null;
    console.log('✅ Test database pool closed');
  } catch (error) {
    console.error('❌ Error closing test database pool:', error.message);
    throw error;
  }
}

/**
 * Gets a client from the test pool
 */
export async function getTestClient() {
  if (!testPool) {
    await setupTestDatabase();
  }
  return await testPool.connect();
}

/**
 * Executes a query in the test schema
 * OPTIMIZED: Uses transaction client if available (from vitest-setup.js)
 * Falls back to regular connection if no transaction
 */
export async function queryTestDb(query, params = []) {
  // Try to use transaction client if available (from vitest-setup.js)
  // This ensures all queries in a test are part of the same transaction
  if (global.transactionClient) {
    try {
      const result = await global.transactionClient.query(query, params);
      return result;
    } catch (error) {
      // Check if transaction is aborted - PostgreSQL aborts transactions on error
      if (error.message && error.message.includes('current transaction is aborted')) {
        // Rollback the aborted transaction immediately
        try {
          await global.transactionClient.query('ROLLBACK');
          // Release the client
          global.transactionClient.release();
        } catch (rollbackError) {
          // Ignore rollback errors - client might already be released
        }
        // Clear the aborted transaction client - vitest-setup will start new one
        global.transactionClient = null;
        // Throw original error so test fails appropriately
        throw error;
      }
      // If transaction client fails, fall back to regular connection
      if (error.message.includes('connection') || error.message.includes('closed')) {
        global.transactionClient = null;
      } else {
        throw error;
      }
    }
  }
  
  // Fallback to regular connection (for setup/teardown outside tests)
  if (!testPool) {
    await setupTestDatabase();
  }
  
  const client = await getTestClient();
  try {
    await client.query('SET search_path TO test, public');
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Releases the query client (called after each test)
 * Kept for compatibility but no-op since we release immediately
 */
export function releaseQueryClient() {
  // No-op - connections are released immediately after each query
}

/**
 * Begins a transaction for test isolation
 * OPTIMIZED: Uses dedicated connection for transaction
 * @param {Pool} pool - Database pool (optional, uses testPool if not provided)
 * @returns {Promise<Client>} Database client with active transaction
 */
export async function beginTransaction(pool = testPool) {
  if (!pool) {
    pool = await setupTestDatabase();
  }
  
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO test, public');
    await client.query('BEGIN');
    return client;
  } catch (error) {
    // If transaction setup fails, release client
    client.release();
    throw error;
  }
}

/**
 * Rolls back a transaction
 * OPTIMIZED: Fast rollback instead of data cleanup
 * @param {Client} client - Database client with active transaction
 */
export async function rollbackTransaction(client) {
  if (client) {
    try {
      await client.query('ROLLBACK');
    } catch (error) {
      // Ignore rollback errors (transaction might already be closed)
      if (!error.message.includes('no transaction') && 
          !error.message.includes('not in a transaction')) {
        console.warn('Transaction rollback warning:', error.message);
      }
    } finally {
      client.release();
    }
  }
}

/**
 * Commits a transaction
 * @param {Client} client - Database client with active transaction
 */
export async function commitTransaction(client) {
  if (client) {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }
}

/**
 * Cleans up test data from all tables
 * This should be run after each test to ensure isolation
 * OPTIMIZED: Uses TRUNCATE CASCADE for much faster cleanup
 */
export async function cleanupTestData(pool = testPool) {
  if (!pool) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('SET search_path TO test, public');
    
    // Use TRUNCATE CASCADE for much faster cleanup (10-100x faster than DELETE)
    // Order matters - truncate child tables first, then parent tables
    const tablesToClean = [
      // Child tables first
      'application_materials_history',
      'application_materials',
      'resume_versions',
      'job_application_materials',
      'match_history',
      'networking_contacts',
      'referrals',
      'informational_interviews',
      'mentor_feedback',
      'event_contacts',
      'job_search_activities',
      'practiced_questions',
      'tasks',
      'team_members',
      // Parent tables
      'resumes',
      'cover_letters',
      'uploaded_cover_letters',
      'job_descriptions',
      'jobs',
      'mentors',
      'industry_contacts',
      'networking_events',
      'contacts',
      'certifications',
      'projects',
      'employment',
      'education',
      'skills',
      'profiles',
      'user_goals',
      'career_goals',
      'section_presets',
      'resume_presets',
      'cover_letter_templates',
      'company_research',
      'compensation_history',
      'compensation_analytics',
      'market_benchmarks',
      'salary_cache',
      'timing_optimizer_ab_tests',
      'references',
      'teams',
      'users',
      'geocoding_cache', // Add geocoding cache cleanup
    ];

    // Use TRUNCATE CASCADE for much faster cleanup
    // Batch truncate operations for better performance
    const quotedTables = tablesToClean.map(table => 
      table === 'references' ? `"references"` : table
    );
    
    // Try to truncate all tables in one go (faster)
    try {
      await client.query(`TRUNCATE TABLE ${quotedTables.join(', ')} CASCADE`);
    } catch (error) {
      // If batch truncate fails, try individual tables
      for (const table of tablesToClean) {
        try {
          const quotedTable = table === 'references' ? `"references"` : table;
          await client.query(`TRUNCATE TABLE ${quotedTable} CASCADE`);
        } catch (truncateError) {
          // Ignore if table doesn't exist
          if (!truncateError.message.includes('does not exist') && 
              !truncateError.message.includes('cannot truncate')) {
            // Fallback to DELETE if TRUNCATE fails
            try {
              await client.query(`DELETE FROM ${quotedTable} WHERE true`);
            } catch (deleteError) {
              // Silently ignore - table might not exist or have constraints
            }
          }
        }
      }
    }

    // Skip sequence reset for speed - IDs don't matter for test isolation
    // Sequence resets are slow (~1-2s per cleanup) and unnecessary since we truncate all data
    // This optimization saves ~1-2 seconds per test
  } catch (error) {
    console.error('Error cleaning test data:', error.message);
    // Don't throw - allow tests to continue
  } finally {
    client.release();
  }
}

/**
 * Runs a migration file in the test schema
 */
export async function runMigration(pool, migrationFile) {
  const fs = await import('fs');
  const path = await import('path');
  
  const migrationPath = path.default.join(process.cwd(), 'db', migrationFile);
  const migrationSQL = fs.default.readFileSync(migrationPath, 'utf8');
  
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO test, public');
    await client.query(migrationSQL);
  } finally {
    client.release();
  }
}

export default {
  setupTestDatabase,
  teardownTestDatabase,
  getTestClient,
  queryTestDb,
  beginTransaction,
  rollbackTransaction,
  commitTransaction,
  cleanupTestData,
  runMigration,
};

