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
  // Log the error but don't crash the application
  // The pool will automatically attempt to reconnect
  const errorMessage = err.message || String(err);
  const errorCode = err.code || 'UNKNOWN';
  
  // Check for connection termination errors (common with Supabase)
  if (errorCode === 'XX000' || 
      errorMessage.includes('shutdown') || 
      errorMessage.includes('termination') ||
      errorMessage.includes('terminate_received') ||
      String(err).includes('shutdown') ||
      String(err).includes('termination')) {
    // These are expected with Supabase connection limits - just log quietly
    console.warn('⚠️ Database connection terminated (expected with Supabase). Pool will reconnect automatically.');
    if (errorCode !== 'UNKNOWN') {
      console.warn('   Error code:', errorCode);
    }
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
    
    // Database termination errors - log but don't crash
    if (errorCode === 'XX000' || 
        errorMessage.includes('shutdown') || 
        errorMessage.includes('termination') ||
        errorMessage.includes('terminate_received') ||
        String(reason).includes('shutdown') ||
        String(reason).includes('termination')) {
      console.warn('⚠️ Database connection terminated (expected). Pool will reconnect on next query.');
      if (errorCode) {
        console.warn('   Error code:', errorCode);
      }
      return;
    }
  }
  // For other unhandled rejections, log them
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log(`📊 Database pool initialized (max: ${poolSize}, Supabase: ${isSupabase})`);

export default pool;
