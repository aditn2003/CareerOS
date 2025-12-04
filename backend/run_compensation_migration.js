// Script to run compensation tracking migration
// Run from backend directory: node run_compensation_migration.js
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import pool from "./db/pool.js";

dotenv.config();

async function runMigration() {
  try {
    console.log("📦 Running compensation tracking migration...");
    
    // Read the SQL file
    const sqlPath = join(process.cwd(), "db/add_compensation_tracking.sql");
    const sql = readFileSync(sqlPath, "utf8");
    
    // Execute the migration
    await pool.query(sql);
    
    console.log("✅ Migration completed successfully!");
    console.log("Created tables: offers, compensation_history, negotiation_history, market_benchmarks, cost_of_living_index");
    
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

