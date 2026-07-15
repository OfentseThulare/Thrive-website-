# Thrive Through Cancer Multi Page CMS Design

Date: 15/07/2026
Status: Approved

## Outcome

Replace the single page static prototype with a production structured, multi page application. The new system must restore the depth of the supplied copy, preserve the Quiet Vitality design direction, provide a secure client managed CMS, support calendar based booking, prepare a formal PayFast checkout, and retain a fast Vercel hosted public experience.

## Approved Architecture

The application will use Next.js App Router, React, TypeScript and the existing custom visual system. Vercel will host the public application and server routes. Supabase will provide Postgres, Auth, Storage, Row Level Security and audit data.

The CMS is a constrained block system. Authorised users may edit copy, imagery, SEO, navigation, pricing, services, credentials, FAQs, resources, legal pages, section order, visibility and approved variants. Users may not inject scripts, edit arbitrary HTML, change application code, alter authentication, modify payment logic or bypass the design system.

## Information Architecture

The public application contains:

1. Home
2. About Renny
3. Services overview
4. Cancer Health Coaching
5. Psycho-Oncology Counselling
6. Cancer Prevention Coaching
7. Our Approach
8. PEMS Conditioning Gems
9. Pricing
10. Book a Session
11. Resources
12. Privacy and POPIA Notice
13. Terms of Service
14. Cancellation and Refund Policy
15. Medical Disclaimer
16. Booking confirmation and cancellation states

The Home page remains a concise orientation and conversion page. Detailed source copy belongs on dedicated service and methodology pages.

## Content Coverage

The rebuild restores or explicitly accounts for every source section:

* Full mission and audience context
* Full Renny biography and approved credentials
* Complete cancer health coaching programme and inclusions
* Radical Remission explanation and resources
* Functional Medicine, positive psychology, PERMA, behavioural science, neuroscience and mind body methods
* PEMS explanation, twelve gem structure and future questionnaire
* Full Psycho-Oncology counselling scope and outcomes
* Full cancer prevention coaching outcomes
* Coaching and counselling comparison
* Session pricing and financial accessibility
* Calendar booking, PayFast, card and EFT options
* Certification logo area
* Resources and legal information

Claims or credentials that require verification remain clearly marked in CMS metadata and are not strengthened beyond the approved evidence.

## CMS Model

Core content tables:

* `profiles`
* `user_roles`
* `site_settings`
* `navigation_items`
* `pages`
* `page_versions`
* `sections`
* `reusable_entries`
* `assets`
* `redirects`
* `content_audit_log`

Each section stores a validated `block_type`, `schema_version`, `position`, `visible`, `variant` and `content jsonb`. Publishing creates an immutable version snapshot and refreshes the affected public route. The application never renders arbitrary CMS supplied scripts or unsanitised HTML.

## CMS Roles

* Owner: manages roles and integrations
* Publisher: previews, publishes and restores revisions
* Editor: manages draft content and assets
* Scheduler: manages services, availability and booking operations
* Finance: manages payment references, reconciliation and refunds without health information
* Auditor: read only access to histories and events

Privileged users must authenticate through Supabase Auth. Production owner and publisher accounts require MFA. Every mutation rechecks identity and role on the server.

## Booking Design

The booking flow is:

1. Select service
2. Select session type
3. Select an available slot
4. Create an expiring database hold
5. Enter minimum contact and consent information
6. Select PayFast or EFT
7. Complete payment when required
8. Confirm the booking
9. Create or finalise the Google Calendar event
10. Send confirmation and reminders

Booking states are `HELD`, `PAYMENT_PENDING`, `PAID`, `CALENDAR_SYNC_PENDING`, `CONFIRMED`, `COMPLETED`, `EXPIRED`, `CANCELLED`, `CALENDAR_FAILED` and `NO_SHOW`.

Postgres must prevent double bookings with a database level exclusion rule for overlapping active holds and confirmed bookings. All timestamps are stored in UTC and displayed in Africa/Johannesburg.

Google Calendar is an adapter, not the source of truth. The adapter checks FreeBusy, creates tentative events, finalises confirmed events and periodically reconciles external changes.

## Payment Design

PayFast hosted checkout is the card payment surface. No card data enters the application.

The application generates payment signatures server side, redirects to PayFast, accepts return and cancellation navigation, and validates Instant Transaction Notifications. A browser return never marks a payment paid. Only an idempotent ITN that passes signature, merchant, reference, amount, status and source validation can complete a payment.

EFT bookings use a defined reservation window and reconciliation state. Banking details and proof of payment handling remain disabled until approved operational information is supplied.

## Privacy And Security

The booking flow collects only name, email and optional telephone number. It does not collect diagnosis, cancer stage, treatment notes or symptoms. Any future health intake or PEMS questionnaire requires its own purpose, consent, access, retention and deletion policy.

Required controls include:

* HTTPS only production traffic
* Row Level Security on all exposed tables and Storage buckets
* Service credentials restricted to server code
* Zod validation at every external boundary
* Parameterised database access
* Rate limits for authentication, booking and payment endpoints
* Idempotency for holds, payments, webhooks and notifications
* Append only booking, payment and content event logs
* No secrets or personal information in URLs, analytics or routine logs
* Versioned consent records
* Separate preview and production environments

## Stock Imagery

The site may use free stock imagery from reputable sources. Approved subjects include South African landscapes, nature, journals, calm interiors, nutrition preparation, walking, rest rituals and non identifiable human detail.

The site must not portray identifiable stock models as cancer patients, use staged hospital distress, imply cures, use pink ribbons for an all cancer service, present stock models as testimonials, show visible medical information or use literal crystals for PEMS.

Every stock asset record includes its original source URL, photographer, download date, licence source, identifier, release evidence where relevant, alt text, focal point and restrictions. Images are optimised and self hosted.

## Environment Strategy

The repository includes a functional seed content mode so the public multi page site can be reviewed before Supabase credentials exist. CMS mutations, real booking persistence, Google Calendar synchronisation and PayFast checkout only activate when their required server environment variables are present.

The production application must fail closed for unavailable payment or calendar services. It must never simulate a successful payment or booking.

## Production Inputs

Live completion requires PayFast merchant credentials, Google Calendar OAuth information, Supabase production ownership, admin role assignments, service availability rules, final prices and VAT treatment, cancellation and refund rules, verified practitioner credentials, certification logos, PEMS logic, public contact information and approved legal wording.

## Acceptance Criteria

* Every approved route renders and is linked through global navigation
* Source content coverage is documented and materially restored
* Public pages remain functional without CMS credentials through seed content
* CMS roles, RLS, revisions, preview and publishing are implemented
* Booking holds are concurrency safe
* PayFast signing and ITN validation have automated tests
* Calendar and payment failures produce truthful recoverable states
* Privacy, terms, cancellation and medical disclaimer routes are real pages
* Stock imagery complies with the approved subject and licensing rules
* Desktop, tablet, mobile, keyboard and reduced motion checks pass
* The production deployment contains no secrets or fabricated professional claims
