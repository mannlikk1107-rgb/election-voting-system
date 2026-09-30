# PostgreSQL Setup

This application uses PostgreSQL for election records and production sessions. Do not substitute SQLite or test against a production database during development.

## Neon PostgreSQL with Render

1. Create a Neon project and database. In Neon's **Connect** panel, select the pooled connection string for the running application and the direct connection string for Prisma migrations.
2. In the Render Web Service environment settings, set `DATABASE_URL` to the Neon pooled URL and `DIRECT_URL` to the Neon direct URL. Use the URLs as provided by Neon, including their TLS parameters. `prisma/schema.prisma` maps `DATABASE_URL` to runtime queries and `DIRECT_URL` to migrations.
3. Set `NODE_ENV=production`. Render's Blueprint generates `SESSION_SECRET`; confirm it is at least 64 random characters.
4. Deploy. The build command runs `npm ci`, `npm run prisma:generate`, and `npm run prisma:deploy`; it applies committed migrations and does not seed demo records.
5. Confirm `/health` is healthy before opening database-backed pages.

For local development against Neon, use the Neon pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL` in the ignored local `.env`. Prefer a local PostgreSQL instance for routine development. Never put either URL in source control, documentation, terminal output, or chat.

Do not put database URLs or seed passwords in `render.yaml`; `DATABASE_URL` and `DIRECT_URL` are `sync: false` inputs configured privately in the Render dashboard. Before a schema migration, create and verify a Neon backup using the options available for the selected plan.

## Local Windows PostgreSQL

1. Install PostgreSQL for Windows using the official PostgreSQL installer, or use an existing trusted local PostgreSQL installation. Ensure the PostgreSQL service is running and `psql` is available in PowerShell.
2. Connect to the local server as its database administrator:

   ```powershell
   psql -U postgres -h localhost
   ```

3. At the `psql` prompt, create a dedicated application role and database. Set its password interactively so it is not written into shell history:

   ```sql
   CREATE ROLE election_app LOGIN;
   \password election_app
   CREATE DATABASE election_system OWNER election_app;
   \q
   ```

4. Create an ignored `.env` file in the workspace root and set private values for `DATABASE_URL`, `DIRECT_URL`, a random `SESSION_SECRET` of at least 64 characters, and `SEED_ADMIN_PASSWORD`. For local PostgreSQL, use this URL shape:

   ```text
   postgresql://<role>:<percent-encoded-password>@localhost:5432/election_system?schema=public
   ```

   For a direct local PostgreSQL connection, both variables can use the same URL. Percent-encode reserved characters in the password. Never paste the resulting URL into a terminal command, logs, Git, or a support request.

5. Validate and apply only committed migrations, then seed the local demonstration database:

   ```powershell
   npm run prisma:validate
   npm run prisma:generate
   npm run prisma:deploy
   npm run prisma:seed
   ```

   `npm run prisma:migrate` is for creating a new development migration after a schema change; review and commit that migration before deploying it. Never run `prisma migrate reset` against a database containing data.

## Safe, Repeatable Seeding

`npm run prisma:seed` uses upserts and a stable demo-election ID. Re-running it updates the known demo accounts, election, eligibility rows, and nominations instead of adding duplicate rows. It sets the demo election to its sample voting state and rewrites those demo records; therefore, run it only against a disposable/local demo database, never against a real election database.

Set a private policy-compliant `SEED_ADMIN_PASSWORD` in the ignored local `.env` before seeding. Seeding refuses to run when the variable is missing. On Render, provide it only through a protected one-off environment/job, run the seed only against a dedicated demo database, then remove the temporary secret. Do not run the seed as part of every deploy.

The seed creates one administrator, three candidate accounts, two approved voters, one pending voter, one sample election, three approved nominations, and the corresponding voter eligibility records. All demo accounts use the configured seed password.

## Backups

Before migrations or maintenance, take a PostgreSQL custom-format backup to a protected location outside the repository. Create that secure folder first, then `pg_dump` prompts for the database password when required:

```powershell
New-Item -ItemType Directory -Force -Path C:\SecureBackups
pg_dump --format=custom --host localhost --port 5432 --username election_app --dbname election_system --file C:\SecureBackups\election_system.dump
```

Encrypt and access-control backups because they contain user and election data. Verify backups by restoring into a new, empty test database (not over the source):

```powershell
createdb -h localhost -U postgres election_system_restore
pg_restore --host localhost --username election_app --dbname election_system_restore --no-owner C:\SecureBackups\election_system.dump
```

Do not commit backup files. For Neon, use the project's supported backup/restore options and store exports outside the repository with equivalent protection.

## Troubleshooting

- **`Environment variable not found: DATABASE_URL`:** confirm the ignored local `.env` exists and contains a non-empty `DATABASE_URL`; restart the server after editing it. Do not print the URL to check it.
- **Connection refused:** confirm the PostgreSQL Windows service is running, the host/port are correct, and local port 5432 is reachable.
- **Authentication failed:** reset the dedicated local role password interactively and update the private `.env`; percent-encode reserved URL characters.
- **Prisma migration cannot connect:** run `npm run prisma:validate` first; confirm `DIRECT_URL` points to a direct PostgreSQL connection, then retry `npm run prisma:deploy`. Do not reset or drop the database to work around migration errors.
- **Render deploy fails on migration:** inspect the migration error without exposing connection strings; confirm `DIRECT_URL` is the Neon direct endpoint and the database role can create schema objects. Back up before repairing or retrying a failed migration.
- **Missing schema after deploy:** verify the committed migration directory and Render build output; `prisma migrate deploy` applies committed migrations but does not create new migration files or insert seed data.