# Deployment

## Architecture

Browser -> Render Web Service -> Neon PostgreSQL

Render hosts the Node.js/Express application. Neon provides persistent PostgreSQL independently of Render's expiring free database. The app and Prisma schema remain compatible with other PostgreSQL providers.

## Neon Configuration

1. Create a Neon project/database. In Neon **Connect**, use the pooled connection URL for the application and the direct connection URL for Prisma migrations.
2. In the Render Web Service environment settings, set `DATABASE_URL` to Neon's pooled URL and `DIRECT_URL` to Neon's direct URL. Keep both secret values in Render's protected environment settings, never in `render.yaml`, source, documentation, or Git.
3. Set `NODE_ENV=production`. `render.yaml` generates `SESSION_SECRET`; verify it is at least 64 random characters. Add `SEED_ADMIN_PASSWORD` only for a deliberate one-off seed of a dedicated demo database.

## Render Web Service

Connect the GitHub repository to Render as a Blueprint and apply `render.yaml`. The service uses:

- Build: `npm ci && npm run prisma:generate && npm run prisma:deploy`
- Start: `npm start`
- Health check: `/health`

The build applies committed migrations and never runs the seed. The server uses Render's `PORT`, binds to `0.0.0.0`, and enables `trust proxy` in production. Confirm `/health` before opening database-backed pages. Back up Neon before schema changes and review the backup/restore options available for the selected plan.

## Local Development

Follow [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) to configure a private `.env` for local PostgreSQL or Neon. Apply migrations only to the intended development database; seed only a disposable demo database. Start with `npm run dev` and open http://localhost:8888.