# User Guide

## Voters

Create an account, open Elections, and request voter approval for each election. After an administrator approves the request and voting opens, choose one approved candidate, review the selection, and submit the final ballot. The system does not offer vote changes after submission.

## Candidates

During an election's nomination window, submit a display name, biography, and manifesto from the election page. An administrator reviews the nomination. Rejected nominations can be corrected and resubmitted before the deadline. Approved candidates can see their nomination status from the candidate dashboard.

Only accounts holding the `VOTER` role may request voter approval or cast a ballot, so candidates cannot request approval or vote while they hold the `CANDIDATE` role. If a nomination is rejected, or its election is archived, the account returns to the `VOTER` role once it holds no other approved nomination.

## Administrators

Create an election with ordered nomination and voting windows. Move the election through its allowed lifecycle, review voter and candidate requests, and close the election before previewing and publishing results. The voter list shows only whether a ballot was recorded, not the chosen candidate.

## Demo account

For a local seeded database, the administrator account is `admin@example.edu`; all demo accounts use the `SEED_ADMIN_PASSWORD` configured privately before seeding. Demonstration credentials must never be used with real participants.