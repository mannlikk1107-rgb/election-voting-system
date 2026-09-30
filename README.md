# Campus Ballot

A locally runnable university election prototype built with Node.js, Express, PostgreSQL, Prisma, EJS, Bootstrap, and server-side sessions. The prototype supports accounts, election-specific voter approval, candidate nominations, one-vote-per-election enforcement, administrator review, and published results.

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL 14 or newer
- Windows PowerShell, macOS, or Linux shell

## Local setup

1. Create a PostgreSQL database named `election_system` and a local database role with access to it.
2. Copy `.env.example` to `.env` and replace the placeholders for `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, and `SEED_ADMIN_PASSWORD` with private local values.
3. Install dependencies and generate Prisma Client:

   ```sh
   npm ci
   npm run prisma:generate
   ```

4. Create/update the local schema and insert demo data:

   ```sh
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. Start the server and open http://localhost:8888:

   ```sh
   npm run dev
   ```

The homepage and `/health` endpoint do not require a live database connection. Database-backed pages will need PostgreSQL.

The seed creates demonstration administrator, candidate, and voter accounts. Set `SEED_ADMIN_PASSWORD` to a private policy-compliant value in the ignored local `.env` before seeding. Demonstration credentials and records are for a disposable local database only and must never be used with real participants.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the production server on `PORT` or 8888 |
| `npm run dev` | Start with nodemon |
| `npm test` | Run Jest and Supertest |
| `npm run test:watch` | Watch test files |
| `npm run test:coverage` | Run tests with coverage |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:format` | Format the schema |
| `npm run prisma:validate` | Validate the schema |
| `npm run prisma:migrate` | Apply a local development migration |
| `npm run prisma:deploy` | Apply committed migrations |
| `npm run prisma:seed` | Insert demonstration records |
| `npm run db:studio` | Open Prisma Studio |

## Project map

- `src/`: Express app, middleware, routes, services, controllers, EJS views, and static assets
- `prisma/`: PostgreSQL schema, migrations, and seed script
- `tests/`: unit and HTTP tests
- `docs/`: requirements, data model, test, user, deployment, and security notes
- `render.yaml`: Render web service and PostgreSQL blueprint

## Deployment

Follow [docs/POSTGRESQL_SETUP.md](docs/POSTGRESQL_SETUP.md) for local database setup and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render. This is a teaching prototype, not a certified election platform; review [docs/SECURITY.md](docs/SECURITY.md) before handling real elections or personal data.