const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

async function drop() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await pool.query('DROP TABLE IF EXISTS gift_codes CASCADE;');
  await pool.query('DROP TABLE IF EXISTS used_gift_codes CASCADE;');
  console.log('Tables dropped');
  process.exit(0);
}
drop();
