# Requirements

## Scope

The prototype provides account registration and sign-in, administrator-managed elections, per-election voter eligibility, candidate nominations, a confidential-to-normal-UI ballot, result publication, and audit events. It is intended for local evaluation and Render deployment.

## Roles

- `VOTER`: requests election-specific approval and votes only after approval. Only accounts holding the `VOTER` role may request voter approval or cast a ballot.
- `CANDIDATE`: manages approved nomination records through the candidate dashboard. New accounts start as voters; an approved nomination grants this role. Losing the last active nomination, whether the nomination is rejected or its election is archived, restores the `VOTER` role. An active nomination is an `APPROVED` nomination whose election is not yet `ARCHIVED`.
- `ADMINISTRATOR`: creates and manages elections, reviews eligibility and nominations, previews results, publishes results, and inspects audit events.

## Election lifecycle

`DRAFT -> NOMINATION -> VOTING -> CLOSED -> PUBLISHED -> ARCHIVED`

Each transition is checked server-side. Nomination and voting endpoints also compare server time with the configured phase boundaries. Voting is rejected outside the voting window regardless of the displayed status.

## Data and integrity

PostgreSQL is the source of truth. Prisma enforces unique emails/usernames, one eligibility request and nomination per election/user, and one vote per election/voter. See [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## User experience

Views are responsive EJS pages styled with Bootstrap 5. Major navigation labels include English and Traditional Chinese. User-entered text is rendered with EJS escaping.

## Operational constraints

The home and health routes do not query PostgreSQL. The app requires PostgreSQL for authentication and election operations. Sessions use PostgreSQL storage in production and Express's in-memory store only for local development/test use.