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
// For local performance testing we can safely use up to 4 connections; in production
// you may want to tune this based on your Supabase plan/limits.
const poolSize = isSupabase ? 4 : 20;
const minPoolSize = isSupabase ? 0 : 2; // No minimum for Supabase

const pool = new Pool({
  ...poolConfig,
  max: poolSize, // Maximum connections (4 for Supabase Session mode)
  min: minPoolSize, // Minimum connections (0 for Supabase)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Increased to 30 seconds for Render cold starts
  allowExitOnIdle: isSupabase ? true : false, // Allow pool to close when idle for Supabase
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// In test mode, set search_path to test schema for all connections
if (process.env.NODE_ENV === 'test') {
  pool.on('connect', async (client) => {
    await client.query('SET search_path TO test, public');
  });
}

// Handle pool errors gracefully
pool.on('error', (err) => {
  // Log the error but don't crash the application
  // The pool will automatically attempt to reconnect
  const errorMessage = err.message || String(err);
  const errorCode = err.code || 'UNKNOWN';
  const errorStr = String(err);
  
  // Check for connection termination/timeout errors (common with Supabase and Render)
  // Handle various formats including Elixir/Erlang tuple format {:shutdown, :db_termination}
  if (errorCode === 'XX000' || 
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ECONNRESET' ||
      errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('shutdown') || 
      errorMessage.includes('termination') ||
      errorMessage.includes('terminate_received') ||
      errorMessage.includes('db_termination') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Connection terminated') ||
      errorStr.includes('shutdown') ||
      errorStr.includes('termination') ||
      errorStr.includes('db_termination') ||
      errorStr.includes('timeout')) {
    // These are expected with Supabase connection limits or Render cold starts
    // Log once then suppress to reduce noise - the pool will reconnect automatically
    console.warn('⚠️ DB connection error:', errorMessage.substring(0, 100), '- Pool will reconnect.');
  } else {
    // For other errors, log more details
    console.error('⚠️ Unexpected error on idle client in shared pool:', errorMessage);
    console.error('   Error code:', errorCode);
    console.error('   The pool will attempt to reconnect automatically.');
  }
  // Don't throw - let the pool handle reconnection automatically
});

// Handle process-level unhandled errors to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object') {
    const errorCode = reason.code;
    const errorMessage = reason.message || String(reason);
    const reasonStr = String(reason);
    
    // Database termination errors - log but don't crash
    // Handle various formats including Elixir/Erlang tuple format {:shutdown, :db_termination}
    if (errorCode === 'XX000' || 
        errorMessage.includes('shutdown') || 
        errorMessage.includes('termination') ||
        errorMessage.includes('terminate_received') ||
        errorMessage.includes('db_termination') ||
        reasonStr.includes('shutdown') ||
        reasonStr.includes('termination') ||
        reasonStr.includes('db_termination')) {
      // These are expected - suppress log to reduce noise
      // Uncomment the line below if you want to see these warnings:
      // console.warn('⚠️ Database connection terminated (expected). Pool will reconnect on next query.');
      return;
    }
  }
  // For other unhandled rejections, log them
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log(`📊 Database pool initialized (max: ${poolSize}, Supabase: ${isSupabase})`);

export default pool;
