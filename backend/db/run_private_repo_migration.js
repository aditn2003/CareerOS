// backend/db/run_private_repo_migration.js
// Run migration to add private repository preference column
import dotenv from "dotenv";
import pool from "./pool.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Running private repository preference migration...");

    // Read SQL file
    const sqlPath = path.join(__dirname, "add_private_repo_preference.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute SQL
    await pool.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("  - Added 'include_private_repos' column to github_user_settings");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

