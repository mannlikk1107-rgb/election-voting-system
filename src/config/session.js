const crypto = require('crypto');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { Pool } = require('pg');

function createSessionMiddleware() {
  const production = process.env.NODE_ENV === 'production';
  if (production && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production.');
  }
  if (production && process.env.SESSION_SECRET.length < 64) {
    throw new Error('SESSION_SECRET must be at least 64 characters in production.');
  }
  const settings = {
    name: 'election.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      maxAge: 1000 * 60 * 60 * 8
    }
  };

  if (production) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for production sessions.');
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const PgStore = connectPgSimple(session);
    settings.store = new PgStore({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    });
  }

  return session(settings);
}

module.exports = createSessionMiddleware;