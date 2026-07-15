import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { pageDraftInputSchema } from "../lib/cms/schemas.ts";

const migration = new URL("../supabase/migrations/202607150006_cms_audit_and_bootstrap_rotation.sql", import.meta.url);

async function sha256(relativePath: string) {
  const contents = await readFile(new URL(relativePath, import.meta.url));
  return createHash("sha256").update(contents).digest("hex");
}

test("released CMS migrations retain their original checksums", async () => {
  assert.equal(
    await sha256("../supabase/migrations/202607150003_cms_admin.sql"),
    "447ebab9871ada5cd8083f4ced81cf8f75fff8f015240e767caa87165e2a3e64",
  );
  assert.equal(
    await sha256("../supabase/migrations/202607150004_cms_security_hardening.sql"),
    "88e1712ea614c4df18c2940d7fbe5c1a58fc26f0959d51e82c4089b833488cb9",
  );
});

test("the forward migration carries every post-release schema delta", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /sections_block_type_check[\s\S]*?'reusable_collection'/);
  assert.match(sql, /create table public\.cms_owner_bootstrap/);
  assert.match(sql, /create function public\.rotate_first_owner_invitation/);
  assert.match(sql, /create or replace function public\.provision_invited_staff/);
  assert.match(sql, /create or replace function public\.create_staff_invitation/);
  assert.match(sql, /lower\(email\) = normalised_email[\s\S]*?CMS_INVITATION_USER_EXISTS/);
});

test("direct draft DML is attributed and audited by non-recursive pinned triggers", async () => {
  const sql = await readFile(migration, "utf8");
  for (const table of ["page_drafts", "sections", "navigation_items", "reusable_entries", "assets"]) {
    assert.match(sql, new RegExp(`create trigger ${table}_(?:protect_attribution|audit_dml)`));
  }
  assert.match(sql, /function public\.protect_cms_draft_attribution[\s\S]*?set search_path = ''/);
  assert.match(sql, /CMS_FORGED_CREATOR/);
  assert.match(sql, /CMS_CREATOR_IMMUTABLE/);
  assert.match(sql, /function public\.audit_cms_draft_dml[\s\S]*?security definer[\s\S]*?set search_path = ''/);
  assert.match(sql, /insert into public\.content_audit_log/);
  assert.match(sql, /revoke execute on function public\.record_content_audit\(text,text,text,jsonb\) from authenticated/);
  assert.doesNotMatch(sql, /create trigger [^;]+ on public\.content_audit_log[^;]+audit_cms_draft_dml/);
});

test("application mutations rely on database audit and give existing users safe guidance", async () => {
  const actions = await readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actions, /function audit\(|await audit\(|rpc\("record_content_audit"/);
  assert.match(actions, /CMS_INVITATION_USER_EXISTS/);
  assert.match(actions, /Use Role management/);
  assert.match(actions, /CMS_INVITATION_USER_EXISTS[\s\S]*?if \(error \|\| !data\)[\s\S]*?signInWithOtp/);
});

test("canonical validation is identical at form, publication and metadata boundaries", async () => {
  const schemas = await readFile(new URL("../lib/cms/schemas.ts", import.meta.url), "utf8");
  const sql = await readFile(migration, "utf8");
  assert.match(schemas, /canonical site path without repeated or trailing slashes/);
  assert.match(sql, /canonicalPath[\s\S]*?\^\/\(\[a-z0-9\]/);
  assert.doesNotMatch(schemas, /\^\\\/[a-z0-9\/-]\*\$/);
  const base = {
    pageId: "72000000-0000-4000-8000-000000000001",
    title: "Canonical page",
    description: "Canonical description",
  };
  assert.equal(pageDraftInputSchema.safeParse({ ...base, canonicalPath: "/services/coaching" }).success, true);
  assert.equal(pageDraftInputSchema.safeParse({ ...base, canonicalPath: "/services//coaching" }).success, false);
});

test("the executable final pgTAP suite covers the upgrade and security cases", async () => {
  const suite = await readFile(new URL("../supabase/tests/006_cms_audit_and_bootstrap_rotation.sql", import.meta.url), "utf8");
  assert.match(suite, /direct editor DML creates complete audit history/);
  assert.match(suite, /forged creator attribution is rejected/);
  assert.match(suite, /rotation preserves the previous invitation/);
  assert.match(suite, /rotation is permanently refused after completion/);
  assert.match(suite, /CMS_INVITATION_USER_EXISTS/);
  assert.match(suite, /repeated slash canonical paths are rejected/);
});
