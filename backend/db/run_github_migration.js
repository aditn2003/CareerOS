// Run GitHub Integration Schema Migration
// Usage: node backend/db/run_github_migration.js

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import pool from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runMigration() {
  try {
    console.log("📦 Running GitHub integration schema migration...");
    
    // Read the SQL file
    const sqlPath = join(__dirname, "add_github_schema.sql");
    const sql = readFileSync(sqlPath, "utf8");
    
    // Execute the migration
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("Created tables:");
    console.log("  - github_user_settings");
    console.log("  - github_repositories");
    console.log("  - github_contributions");
    console.log("  - github_repository_skills");
    console.log("Created indexes and triggers");
    
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

