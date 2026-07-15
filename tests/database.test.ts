import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202607150001_foundation.sql",
  import.meta.url,
);

const expectedTables = [
  "profiles",
  "user_roles",
  "site_settings",
  "navigation_items",
  "pages",
  "page_versions",
  "sections",
  "reusable_entries",
  "assets",
  "redirects",
  "content_audit_log",
  "services",
  "availability_rules",
  "availability_exceptions",
  "consent_versions",
  "bookings",
  "booking_consents",
  "booking_events",
  "payments",
  "payment_events",
  "webhook_receipts",
  "notification_outbox",
  "calendar_sync_events",
] as const;

test("every application table is created, forced behind RLS and has a policy", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const table of expectedTables) {
    assert.match(migration, new RegExp(`create table public\\.${table}\\s*\\(`));
    assert.match(migration, new RegExp(`['\"]${table}['\"]`));
    assert.match(migration, new RegExp(`create policy [\\s\\S]*? on public\\.${table}\\b`));
  }

  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
});

test("booking overlap and integration idempotency are enforced in Postgres", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /exclude using gist/);
  assert.match(migration, /tstzrange\(starts_at, ends_at, '\[\)'\) with &&/);
  assert.match(migration, /idempotency_key uuid not null unique/);
  assert.match(migration, /unique \(provider, provider_event_id\)/);
});

test("site asset storage has explicit read and staff mutation policies", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /site_assets_public_read on storage\.objects for select/);
  assert.match(migration, /site_assets_editor_insert on storage\.objects for insert/);
  assert.match(migration, /site_assets_editor_update on storage\.objects for update/);
  assert.match(migration, /site_assets_editor_delete on storage\.objects for delete/);
});

test("database execution test checks catalog RLS, policies and overlap protection", async () => {
  const sql = await readFile(new URL("../supabase/tests/001_foundation.sql", import.meta.url), "utf8");

  assert.match(sql, /pg_class/);
  assert.match(sql, /pg_policies/);
  assert.match(sql, /contype = 'x'/);
  assert.match(sql, /storage.*objects/s);
});
