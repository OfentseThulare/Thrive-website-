import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildPostgresEnvironment, parseBootstrapInput } from "../scripts/bootstrap-owner.mjs";

const connection = "postgresql://operator:secret-value@db.example.org:6543/postgres?sslmode=verify-full";

test("owner bootstrap validates and normalises operator input without exposing the URL", () => {
  const parsed = parseBootstrapInput([" Owner@Example.org ", "24"], { SUPABASE_DB_URL: connection });
  assert.equal(parsed.email, "owner@example.org");
  assert.equal(parsed.hours, 24);
  const childEnvironment = buildPostgresEnvironment(parsed.databaseUrl, { PATH: "/usr/bin", LANG: "en_ZA.UTF-8" });
  assert.equal(childEnvironment.PGHOST, "db.example.org");
  assert.equal(childEnvironment.PGPORT, "6543");
  assert.equal(childEnvironment.PGPASSWORD, "secret-value");
  assert.equal(childEnvironment.PGSSLMODE, "verify-full");
  assert.equal("SUPABASE_DB_URL" in childEnvironment, false);
});

test("owner bootstrap rejects unsafe or incomplete input", () => {
  assert.throws(() => parseBootstrapInput(["not-an-email"], { SUPABASE_DB_URL: connection }));
  assert.throws(() => parseBootstrapInput(["owner@example.org", "0"], { SUPABASE_DB_URL: connection }));
  assert.throws(() => parseBootstrapInput(["owner@example.org", "721"], { SUPABASE_DB_URL: connection }));
  assert.throws(() => parseBootstrapInput(["owner@example.org"], {}));
  assert.throws(() => parseBootstrapInput(["owner@example.org"], { SUPABASE_DB_URL: "https://example.org" }));
});

test("bootstrap SQL is Postgres only, locked, one time and never granted to application roles", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202607150004_cms_security_hardening.sql", import.meta.url), "utf8");
  assert.match(migration, /function public\.bootstrap_first_owner_invitation[\s\S]*?security definer[\s\S]*?set search_path = ''/);
  assert.match(migration, /session_user <> 'postgres'/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /CMS_BOOTSTRAP_ALREADY_USED/);
  assert.match(migration, /create table public\.cms_owner_bootstrap/);
  assert.match(migration, /completed_at = now\(\), completed_by = new\.id/);
  assert.match(migration, /revoke all on function public\.bootstrap_first_owner_invitation[^;]+from anon, authenticated, service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.bootstrap_first_owner_invitation/);
});
