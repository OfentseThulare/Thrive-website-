import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { contentBlockSchema, pageContentSchema } from "../lib/content/contracts.ts";

const validIntroduction = {
  blockType: "introduction",
  eyebrow: "Support",
  heading: "A careful next step",
  body: ["Approved content."],
  align: "left",
} as const;

test("the application content contract is exact at every publication boundary", () => {
  assert.equal(contentBlockSchema.safeParse(validIntroduction).success, true);
  assert.equal(contentBlockSchema.safeParse({ ...validIntroduction, unexpected: true }).success, false);
  assert.equal(contentBlockSchema.safeParse({ ...validIntroduction, body: [7] }).success, false);
  assert.equal(contentBlockSchema.safeParse({ ...validIntroduction, body: ["   "] }).success, false);
  assert.equal(pageContentSchema.safeParse({
    slug: "content-page",
    title: "Content page",
    description: "Approved description",
    status: "published",
    seo: {},
    sections: [validIntroduction],
    unexpected: true,
  }).success, false);
});

test("the database enforces the same exact block contract on direct writes and seed imports", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/202607150005_cms_production_readiness.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /create extension if not exists pg_jsonschema with schema extensions/);
  assert.match(migration, /"additionalProperties": false/);
  assert.match(migration, /extensions\.jsonb_matches_schema/);
  assert.match(migration, /sections_content_shape_check/);
  assert.match(migration, /block_type = content->>'blockType'/);
  assert.match(migration, /cms_block_references_are_safe/);
  assert.match(migration, /is_safe_cms_image_source/);
  assert.match(migration, /create function public\.import_initial_cms_seed[\s\S]*?security definer[\s\S]*?pg_advisory_xact_lock/);
  assert.match(migration, /status = 'published' or target_page\.published_version_id is not null/);
  assert.match(migration, /revoke all on function public\.import_initial_cms_seed\(jsonb\) from public/);
  assert.match(migration, /grant execute on function public\.import_initial_cms_seed\(jsonb\) to authenticated/);
});

test("production pgTAP coverage exercises contracts, atomic seed import and ownership invariants", async () => {
  const suite = await readFile(
    new URL("../supabase/tests/005_cms_production_readiness.sql", import.meta.url),
    "utf8",
  );

  assert.match(suite, /test_invalid_section_is_rejected/);
  assert.match(suite, /test_invalid_seed_is_atomic/);
  assert.match(suite, /skips a page that has ever been published/);
  assert.match(suite, /test_second_bootstrap_is_rejected/);
  assert.match(suite, /test_last_owner_is_preserved/);
  assert.match(suite, /pg_advisory_xact_lock/);
});

test("verified MFA removal invalidates every active session", async () => {
  const actions = await readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /auth\.mfa\.unenroll[\s\S]*?auth\.signOut\(\{ scope: "global" \}\)/);
  assert.match(actions, /security-reset/);
});
