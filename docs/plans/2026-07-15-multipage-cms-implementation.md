# Thrive Through Cancer Multi Page CMS Implementation Plan

Date: 15/07/2026

## Task 1: Application And Data Foundation

Migrate the static site to Next.js App Router with TypeScript. Establish the application shell, design tokens, metadata, environment validation, Supabase browser and server clients, content contracts, seed content fallback, SQL migrations, RLS policies, Storage policies and database tests.

Validation:

* Production build succeeds
* Type checking succeeds
* Environment validation fails closed
* SQL contains explicit RLS for every exposed table
* Seed content renders without Supabase credentials

## Task 2: Multi Page Public Experience

Build the approved sitemap and reusable page components. Restore the source copy depth across dedicated pages. Reuse the supplied Renny portraits, add licensed stock imagery, and record its source and usage metadata. Preserve Quiet Vitality while creating distinct page compositions.

Validation:

* All approved routes exist
* Navigation and calls to action use real routes
* Content coverage matrix has no unaccounted source section
* No false legal links or placeholder navigation
* Responsive and accessibility checks pass

## Task 3: CMS And Admin

Build Supabase Auth protected admin routes, role checks, page and section editing, reusable entries, assets, SEO fields, navigation management, preview, publishing, revision history and audit display. Use validated block schemas and never arbitrary HTML.

Validation:

* Anonymous visitors cannot access admin data
* Editors cannot publish or manage roles
* Publishers can publish and restore versions
* Every mutation validates input and rechecks authorisation
* Draft preview never leaks unpublished content into public queries

## Task 4: Booking And Calendar

Build services, availability, exceptions, slot generation, database holds, expiration, contact and consent collection, booking state transitions, confirmation views, Google Calendar adapter, mock adapter and reconciliation interfaces.

Validation:

* Slot calculation respects Africa/Johannesburg presentation
* Concurrent holds cannot overlap
* Expired holds release availability
* Calendar failures remain recoverable and do not claim confirmation
* Booking flow avoids health information collection

## Task 5: Payments And Legal Operations

Build PayFast hosted checkout fields and signing, return and cancellation routes, validated ITN processing, payment states, EFT operational state, idempotency, webhook receipts, notification outbox and legal pages.

Validation:

* Signature fixtures pass
* Incorrect amount, merchant, reference or signature fails
* Duplicate ITNs are idempotent
* Return routes never mark payments paid
* No card fields or secrets reach the client

## Task 6: Verification And Publication

Run complete type, lint, unit, database, build and browser testing. Review content, security, responsive behaviour, CMS boundaries, booking states and payment states. Commit the approved branch, push it, deploy a Vercel preview and promote only after final checks.

Validation:

* All automated checks pass
* No high severity dependency findings remain
* No secrets appear in the commit or client bundle
* Desktop, tablet and mobile browser checks pass
* Production blockers are listed explicitly rather than simulated
