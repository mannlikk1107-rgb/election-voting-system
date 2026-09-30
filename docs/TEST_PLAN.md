# Test Plan

Run `npm test` for the automated suite. It does not require a PostgreSQL server.

## Automated coverage

- Homepage and authentication form responses, CSRF token presence, and invalid registration rejection.
- Anonymous route protection and role middleware.
- Election date ordering, transition gating, and ended-election status.
- Nomination and voting time-window boundaries.
- Result percentages, turnout, ties, and zero-vote/zero-eligibility behavior.

## Database integration checks

With a disposable local PostgreSQL database configured in `.env`, run `npm run prisma:validate`, `npm run prisma:migrate`, and `npm run prisma:seed`. Verify that a second vote for the same election/voter is rejected by the unique constraint and that a vote cannot reference a nomination from a different election.

## Manual acceptance

1. Register a voter and request eligibility for an election.
2. Sign in as administrator, approve the voter, create an election, and transition its status as time windows allow.
3. Submit and review a candidate nomination; confirm only approved candidates appear on the ballot.
4. Cast one vote; attempt a second submission and verify it is rejected.
5. Close the election, preview results as administrator, publish, then verify normal visitors can view the results.
6. Confirm the admin voter list shows participation but never candidate choice.