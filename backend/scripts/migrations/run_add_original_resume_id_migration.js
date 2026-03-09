// Script to add original_resume_id columns to resumes table
// Run from backend directory: node run_add_original_resume_id_migration.js

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import pool from "../../db/pool.js";

dotenv.config();

async function runMigration() {
  try {
    console.log("📦 Running add_original_resume_id migration...");
    
    // Read the SQL file
    const sqlPath = join(process.cwd(), "db", "add_original_resume_id.sql");
    const sql = readFileSync(sqlPath, "utf8");
    
    // Execute the migration
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("Added columns to resumes table:");
    console.log("  - original_resume_id (INTEGER)");
    console.log("  - version_number (INTEGER)");
    console.log("  - is_version (BOOLEAN)");
    console.log("Created indexes");
    
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

