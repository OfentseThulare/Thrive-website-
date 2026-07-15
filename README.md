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

The public home page works without Supabase settings. Set both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use published database content. A partial or malformed pair is rejected.

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
