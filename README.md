# Thrive Through Cancer

The multi page application and constrained content platform for Thrive Through Cancer, a division of Inheritance Academy.

## Foundation

The application uses Next.js App Router, React, TypeScript and custom CSS. Supabase provides the planned Postgres, Auth and Storage foundation. Public content remains reviewable through validated seed data when Supabase has not been configured.

No service role key belongs in this repository or in a browser visible environment variable.

## Local development

Use Node.js 22 or newer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

The complete public site works without Supabase settings. It includes Home, About, Services, three dedicated service pages, Our Approach, PEMS, Pricing, Booking Preparation and Resources. Set both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use published database content. A partial or malformed pair is rejected.

Public pages use validated seed content whenever the CMS has no published record for that route. This keeps early review reliable without weakening the publication boundary for content that does exist in Supabase.

## Content and imagery records

The source content audit is recorded in `docs/CONTENT-COVERAGE.md`. Stock image provenance and use restrictions are recorded in `public/images/metadata.json` and `docs/IMAGE-LICENCES.md`. Original stock downloads are retained outside the public output in `docs/image-sources`, while optimised WebP derivatives are served through `next/image`.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

`npm test` verifies the environment boundary and migration safety invariants. The executable database assertions in `supabase/tests/001_foundation.sql` are intended to run after applying the migration to a local or preview Supabase database.

## Deferred integrations

CMS mutations, booking persistence, Google Calendar synchronisation and PayFast checkout remain disabled until their implementation tasks and production credentials are complete. The application must not simulate successful bookings or payments.

Approved design and implementation decisions are in `docs/plans`.
