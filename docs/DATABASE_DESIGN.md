# Database Design

PostgreSQL is managed through Prisma. `prisma/schema.prisma` defines the application contract; committed SQL migrations are used for deployment.

## Relationships

- A user may create elections, request eligibility for elections, submit nominations, vote, and perform audited actions.
- Each election owns eligibility requests, nominations, and votes.
- Eligibility and nomination reviews optionally reference the administrator who reviewed them.
- A vote references its election, voter, and an approved nomination belonging to that same election.
- Audit entries record actor, action, entity, and non-sensitive details.

## Integrity rules

- `User.email` and `User.username` are unique.
- `(VoterEligibility.electionId, userId)` prevents duplicate eligibility requests.
- `(Nomination.electionId, userId)` prevents duplicate nominations.
- `(Vote.electionId, voterId)` is a database-enforced one-vote limit, including concurrent submissions.
- A composite foreign key from `(Vote.electionId, nominationId)` prevents votes for a nomination in another election.

Indexes cover election status/time queries, review queues, and vote aggregation.

## Privacy note

The normal administrator interface reports only whether an approved voter has voted, and vote audit events do not store candidate choice. The relational vote record still contains both voter and nomination identifiers to enforce constraints; a database administrator with direct SQL access can correlate them. This prototype is not end-to-end anonymous and should not be used for high-stakes or legally binding elections.