# Booking And Calendar Operations

## Production readiness

Public booking is deliberately unavailable until all of the following exist:

* A migrated Supabase production project with active services, working hours and one active booking consent version.
* `BOOKING_CALENDAR_MODE=google`.
* Server-only `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` values.
* Server-only `SUPABASE_SERVICE_ROLE_KEY` and a random `BOOKING_RATE_LIMIT_SECRET` containing at least 32 characters.
* A Google OAuth client authorised for the Calendar FreeBusy and Events APIs. The selected calendar must be shared with the authorised Google account.

Use `BOOKING_CALENDAR_MODE=disabled` before launch. `mock` is deterministic and intended only for automated tests or local development. The application rejects mock mode when `NODE_ENV=production`.

## Privacy and access

The public form accepts full name, email and optional telephone only. Do not add diagnosis, cancer type, stage, treatment, symptoms, notes or questionnaire responses to this workflow. Booking access uses a random token stored only in a secure HttpOnly cookie. Postgres stores its SHA-256 hash. The public reference is not an access credential.

Availability, status and contact pages use `Cache-Control: no-store`. Hold, status and release RPCs are callable only through the server-only booking client, so direct Supabase callers cannot bypass the Google FreeBusy check. A database-backed limiter stores only a secret-peppered SHA-256 network fingerprint. Platform firewall limits remain recommended as an additional layer before opening production traffic.

Each hold lasts exactly 15 minutes. The browser retains one random UUID idempotency key while a selected slot is being submitted. If the response is lost, a rate-limited retry with that same high-entropy key atomically rotates a new access token for the existing live hold. The private recovery RPC returns no contact information and is executable only by the server role.

## Time and concurrency

All stored timestamps are UTC. PostgreSQL generates slots using `Africa/Johannesburg`; the interface labels every public and admin time as Johannesburg time or SAST. A database exclusion constraint covers the current single practitioner across every service. Service buffer time is part of the protected range. An advisory transaction lock, stale hold expiry and exclusion handling make hold creation safe under concurrency.

Scheduler accounts may manage services, weekly rules and exceptions at AAL1. An account holding the owner role must be at AAL2 for every schedule mutation, including direct RLS-protected writes and state transition RPCs. Adding a scheduler role to an owner does not bypass this requirement.

## Calendar recovery

Google Calendar supplies external busy periods, while Postgres remains the booking source of truth. If FreeBusy cannot be verified, the public API offers no times. A hold does not create an event. Task 5 will invoke idempotent event operations only after the paid confirmation transition. Calendar failures must enter `CALENDAR_FAILED` or remain pending; they never claim `CONFIRMED`. Use the protected Calendar health and booking audit views for reconciliation.

## Local verification

Run `npm run typecheck`, `npm test` and a production build. Run the SQL tests with a local Supabase stack when Docker is available. Live Google calls are not part of the automated suite; adapter tests inject deterministic HTTP responses and never use credentials.
