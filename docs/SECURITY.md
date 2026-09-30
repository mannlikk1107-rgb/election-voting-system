# Security Notes

## Implemented controls

- bcrypt password hashes; password hashes are never passed to templates.
- Server-side role and election-eligibility checks on protected routes.
- PostgreSQL unique constraints as the final duplicate-vote barrier.
- Session regeneration at login, session destruction at logout, secure production cookies, and PostgreSQL-backed production sessions.
- Session-bound CSRF tokens for state-changing requests, Helmet headers, request-size limits, and rate limiting.
- EJS escaping for user-provided content; audit events intentionally omit selected candidate IDs.
- Production error responses do not expose stack traces or internal exception details.

## Prototype limitations

This is not a certified, end-to-end anonymous election system. The database vote row joins voter and candidate identifiers, the application does not provide cryptographic ballot secrecy, independent recount proofs, identity-provider integration, or formal penetration testing. The demo seed has a known local-only default credential. Do not use real student records or high-stakes election results without institutional security review, privacy/legal review, threat modeling, independent testing, and a verified deployment/backup process.