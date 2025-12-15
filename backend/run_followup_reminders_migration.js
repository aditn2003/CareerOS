// Migration script for Follow-Up Reminders Schema (UC-118)
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runMigration() {
  try {
    console.log("📦 Running Follow-Up Reminders schema migration...");
    
    // Read the SQL file
    const sqlPath = join(__dirname, "db", "add_followup_reminders_schema.sql");
    const sql = readFileSync(sqlPath, "utf8");
    
    // Execute the migration
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("Created tables:");
    console.log("  - followup_reminders");
    console.log("  - followup_history");
    console.log("  - followup_etiquette_tips (with default tips)");
    console.log("Created indexes for performance");
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

