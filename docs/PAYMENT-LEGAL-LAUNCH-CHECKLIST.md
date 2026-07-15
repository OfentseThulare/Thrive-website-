# Payment and legal launch checklist

Live PayFast and EFT must remain disabled until every applicable item is approved and recorded. A successful build is not launch approval.

## Client facts requiring written confirmation

- Full legal contracting entity and trading name relationship.
- Registration number, physical address, service address and monitored contact channels.
- VAT registration status, VAT number if applicable, and whether displayed ZAR prices include VAT.
- POPIA responsible party, Information Officer, deputy if applicable, and privacy request contact.
- Practitioner qualifications, registrations, lawful service scope and professional indemnity position.
- Intended age range, guardian consent and whether minors may book.
- Booking support hours, complaint process, escalation route and approved South African urgent-care wording.
- Cancellation channel, notice periods, reasonable charges, no-show and late-arrival rules.
- Hospitalisation and death exception evidence, discretion and outcome.
- Rescheduling limits, provider cancellation, duplicate payment and refund timing rules.
- ECTA seven-day applicability and the exact early-performance consent wording where a session may begin earlier.
- CPA direct-marketing process and separate marketing consent wording.
- Data retention schedule, cross-border assessment and processor agreements for Vercel, Supabase, Google and PayFast.

## Credentials and platform configuration

- Set a public HTTPS `NEXT_PUBLIC_SITE_URL` with no path, query or credentials.
- Configure production Supabase keys, booking secrets, migrations and pgTAP checks.
- Configure Google Calendar OAuth, correct calendar ID and an end-to-end availability and event reconciliation test.
- Set `PAYFAST_MODE=live` only with approved live merchant ID, merchant key and passphrase in Vercel server secrets.
- Confirm PayFast webhook delivery reaches `/api/payment/payfast/itn` through Vercel and that the documented provider CIDRs are still current.
- Complete a controlled live minimum-value transaction, confirm exact amount/reference matching, event creation, outbox creation and duplicate ITN idempotency.
- Confirm the notification outbox has a real email provider worker before promising email delivery.
- Approve banking instructions, proof-of-payment storage, reference rules and reconciliation ownership before enabling EFT. No EFT details are currently published.

## Operational checks

- Review all four legal pages with South African counsel and the client, then publish approved CMS versions.
- Confirm finance and owner access, owner AAL2 enforcement, refund reconciliation and audit visibility.
- Confirm late PayFast completions after an expired or cancelled booking become paid reconciliation cases and never create a conflicting calendar event automatically.
- Test a payment cancellation, invalid signature, invalid source IP, remote validation timeout, duplicate provider event and calendar failure retry.
- Document responsible staff for failed calendar sync, unmatched payment, duplicate payment, refund, privacy request and security incident queues.
