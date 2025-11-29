// Shared database connection pool for all routes
// This prevents creating multiple pools that exceed Supabase's connection limits
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const dbUrl = process.env.DATABASE_URL || '';
const isSupabase = dbUrl.includes('supabase') || 
                   dbUrl.includes('pooler.supabase') ||
                   (dbUrl.includes('aws-') && dbUrl.includes('pooler'));

const poolConfig = {
  connectionString: dbUrl,
};

// Force SSL for Supabase connections
if (isSupabase) {
  poolConfig.ssl = { 
    rejectUnauthorized: false 
  };
  console.log("🔒 SSL enabled for Supabase connection (shared pool)");
}

// Supabase Session mode has strict connection limits (typically 4-5 concurrent connections)
// Use very small pool size for Supabase to avoid "MaxClientsInSessionMode" errors
const poolSize = isSupabase ? 2 : 20; // Very conservative: 2 connections max for Supabase
const minPoolSize = isSupabase ? 0 : 2; // No minimum for Supabase

const pool = new Pool({
  ...poolConfig,
  max: poolSize, // Maximum connections (2 for Supabase Session mode)
  min: minPoolSize, // Minimum connections (0 for Supabase)
  idleTimeoutMillis: 60000, // Close idle clients after 1 minute (aggressive to free connections)
  connectionTimeoutMillis: 5000, // Return error after 5 seconds
  allowExitOnIdle: isSupabase ? true : false, // Allow pool to close when idle for Supabase
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle client in shared pool:', err.message);
  // Don't throw - let the pool handle reconnection automatically
});

export default pool;