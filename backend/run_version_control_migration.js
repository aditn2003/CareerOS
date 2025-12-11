// Script to run resume version control schema migration
// Run from backend directory: node run_version_control_migration.js

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import pool from "./db/pool.js";

dotenv.config();

async function runMigration() {
  try {
    console.log("📦 Running resume version control schema migration...");
    
    // Read the SQL file
    const sqlPath = join(process.cwd(), "db", "enhance_resume_versions_schema.sql");
    const sql = readFileSync(sqlPath, "utf8");
    
    // Execute the migration
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("Added columns to resume_versions:");
    console.log("  - description (TEXT)");
    console.log("  - job_id (INTEGER)");
    console.log("  - is_default (BOOLEAN)");
    console.log("  - is_archived (BOOLEAN)");
    console.log("  - parent_version_number (INTEGER)");
    console.log("  - tags (TEXT[])");
    console.log("Created indexes and constraints");
    
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

