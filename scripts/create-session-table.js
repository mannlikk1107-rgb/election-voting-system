'use strict';

// Provisions the PostgreSQL table used by connect-pg-simple for production
// sessions. The application no longer creates this table on startup (to avoid
// running DDL at runtime), so run this once per database before the first
// production boot:
//
//   npm run db:session-store
//
// The script is idempotent and prefers DIRECT_URL (used for schema changes)
// over DATABASE_URL.

const { Pool } = require('pg');

const CREATE_SESSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
`;

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set DIRECT_URL or DATABASE_URL before running this script.');
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(CREATE_SESSION_TABLE_SQL);
    console.log('Session store table "user_sessions" is ready.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to provision the session store table:', error.message);
  process.exitCode = 1;
});
