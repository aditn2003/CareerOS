import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
   // require: true,
    rejectUnauthorized: false,   // required on MacOS & Node
  },
});

export default pool;