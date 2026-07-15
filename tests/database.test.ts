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
  assert.match(migration, /exclude using gist \(\s*tstzrange\(starts_at, ends_at, '\[\)'\) with &&/s);
  assert.doesNotMatch(migration, /exclude using gist \(\s*service_id with =/s);
  assert.match(migration, /idempotency_key uuid not null unique/);
  assert.match(migration, /unique \(provider, provider_event_id\)/);
});

test("published page reads are memoised per React server request", async () => {
  const repository = await readFile(
    new URL("../lib/content/repository.ts", import.meta.url),
    "utf8",
  );

  assert.match(repository, /import \{ cache \} from "react"/);
  assert.match(repository, /getPublishedPage = cache\(/);
});

test("site asset storage has explicit read and staff mutation policies", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /site_assets_public_read on storage\.objects for select/);
  assert.match(migration, /site_assets_editor_insert on storage\.objects for insert/);
  assert.match(migration, /site_assets_editor_update on storage\.objects for update/);
  assert.match(migration, /site_assets_editor_delete on storage\.objects for delete/);
});

test("public content is served only from immutable published page versions", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const repository = await readFile(
    new URL("../lib/content/repository.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /page_versions_public_read on public\.page_versions for select/);
  assert.match(migration, /pages\.published_version_id = page_versions\.id/);
  assert.match(migration, /page_versions_immutable before update or delete/);
  assert.match(migration, /pages_validate_publication before insert or update/);
  assert.match(migration, /snapshot ->> 'status'\) is distinct from 'published'/);
  assert.doesNotMatch(migration, /sections_public_read/);
  assert.match(repository, /\.from\("page_versions"\)/);
  assert.doesNotMatch(repository, /\.from\("sections"\)/);
});

test("editors cannot transition draft content into public state", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.doesNotMatch(migration, /pages_cms_write/);
  assert.doesNotMatch(migration, /reusable_cms_write/);
  assert.doesNotMatch(migration, /assets_cms_write/);
  assert.match(migration, /pages_editor_update_draft[\s\S]*?status = 'draft'/);
  assert.match(migration, /reusable_editor_update_draft[\s\S]*?status = 'draft'/);
  assert.match(migration, /assets_editor_update_draft[\s\S]*?status = 'draft'/);
  assert.match(migration, /navigation_editor_update_hidden[\s\S]*?not visible/);
});

test("auditors have no mutation policy", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const allPolicies = migration.match(/create policy [\s\S]*?;/g) ?? [];

  for (const policy of allPolicies) {
    if (/for (all|insert|update|delete)/.test(policy)) {
      assert.doesNotMatch(policy, /'auditor'/);
    }
  }

  assert.match(migration, /availability_rules_read[\s\S]*?'auditor'/);
  assert.match(migration, /availability_exceptions_read[\s\S]*?'auditor'/);
});

test("database execution test checks catalog RLS, policies and overlap protection", async () => {
  const sql = await readFile(new URL("../supabase/tests/001_foundation.sql", import.meta.url), "utf8");

  assert.match(sql, /pg_class/);
  assert.match(sql, /pg_policies/);
  assert.match(sql, /contype = 'x'/);
  assert.match(sql, /storage.*objects/s);
});

test("Supabase behavioural suite exercises every operational role and cross-service overlap", async () => {
  const sql = await readFile(new URL("../supabase/tests/002_behaviour.sql", import.meta.url), "utf8");

  assert.match(sql, /create extension if not exists pgtap/);
  assert.match(sql, /set local role anon/);
  assert.match(sql, /set local role authenticated/);
  for (const role of ["editor", "publisher", "auditor", "scheduler", "finance"]) {
    assert.match(sql, new RegExp(`'${role}'`));
  }
  assert.match(sql, /test_operation_is_denied/);
  assert.match(sql, /test_operation_has_overlap/);
  assert.match(sql, /different services for the single practitioner/);
  assert.match(sql, /'health-coaching'/);
  assert.match(sql, /'counselling'/);
  assert.match(sql, /select plan\(21\)/);
  assert.match(sql, /select \* from finish\(\)/);
  assert.match(sql, /rollback/);
});
