/**
 * Debug script to check API tracking status
 * Run with: node backend/debug_api_tracking.js
 */

import pool from "./db/pool.js";
import dotenv from "dotenv";

dotenv.config();

async function checkTrackingStatus() {
  try {
    console.log("🔍 Checking API tracking status...\n");
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('api_services', 'api_usage_logs', 'api_error_logs', 'api_quotas')
      ORDER BY table_name
    `);
    
    console.log("📊 Tables found:");
    tablesCheck.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));
    
    if (tablesCheck.rows.length < 4) {
      console.log("\n⚠️  Missing tables! Please run: backend/db/add_api_monitoring_schema.sql\n");
      return;
    }
    
    // Check services
    const services = await pool.query("SELECT service_name, enabled FROM api_services ORDER BY service_name");
    console.log(`\n📦 Services configured (${services.rows.length}):`);
    services.rows.forEach(row => console.log(`  ${row.enabled ? '✅' : '❌'} ${row.service_name}`));
    
    // Check usage logs
    const usageCount = await pool.query("SELECT COUNT(*) as count FROM api_usage_logs");
    console.log(`\n📝 Total API usage logs: ${usageCount.rows[0].count}`);
    
    if (parseInt(usageCount.rows[0].count) > 0) {
      const recentLogs = await pool.query(`
        SELECT service_name, endpoint, method, success, created_at, user_id
        FROM api_usage_logs 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      console.log("\n🕐 Recent API calls:");
      recentLogs.rows.forEach(log => {
        console.log(`  ${log.success ? '✅' : '❌'} ${log.service_name} ${log.method} ${log.endpoint} (user: ${log.user_id || 'null'}) - ${log.created_at}`);
      });
    }
    
    // Check errors
    const errorCount = await pool.query("SELECT COUNT(*) as count FROM api_error_logs");
    console.log(`\n❌ Total API errors: ${errorCount.rows[0].count}`);
    
    if (parseInt(errorCount.rows[0].count) > 0) {
      const recentErrors = await pool.query(`
        SELECT service_name, error_type, error_message, created_at
        FROM api_error_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log("\n🕐 Recent errors:");
      recentErrors.rows.forEach(err => {
        console.log(`  ❌ ${err.service_name}: ${err.error_type} - ${err.error_message.substring(0, 50)}...`);
      });
    }
    
    // Check quotas
    const quotaCount = await pool.query("SELECT COUNT(*) as count FROM api_quotas");
    console.log(`\n📊 Quota records: ${quotaCount.rows[0].count}`);
    
  } catch (error) {
    console.error("❌ Error checking tracking status:", error.message);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log("\n⚠️  Database tables don't exist! Please run: backend/db/add_api_monitoring_schema.sql");
    }
  } finally {
    await pool.end();
  }
}

checkTrackingStatus();
