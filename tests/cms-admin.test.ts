import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CmsAuthorisationError, hasCmsRole, requireCmsRole } from "../lib/cms/permissions.ts";
import {
  cmsHrefSchema,
  navigationInputSchema,
  pageDraftInputSchema,
  publishPageInputSchema,
  reusableEntryInputSchema,
  sectionInputSchema,
  validateAssetFile,
} from "../lib/cms/schemas.ts";
import { buildPublishedSnapshot } from "../lib/cms/snapshot.ts";

const pageId = "10000000-0000-4000-8000-000000000001";
const section = {
  blockType: "introduction" as const,
  eyebrow: "Support",
  heading: "A considered approach",
  body: ["Approved copy remains plain text and React escapes it."],
  align: "left" as const,
};

test("anonymous and non-content roles cannot pass CMS mutation authorisation", () => {
  assert.equal(hasCmsRole([], ["editor"]), false);
  assert.equal(hasCmsRole(["scheduler"], ["owner", "publisher", "editor"]), false);
  assert.throws(() => requireCmsRole([], ["owner"]), CmsAuthorisationError);
  assert.throws(() => requireCmsRole(["finance"], ["publisher"]), CmsAuthorisationError);
});

test("editors can draft but cannot publish or manage roles", () => {
  assert.doesNotThrow(() => requireCmsRole(["editor"], ["owner", "publisher", "editor"]));
  assert.throws(() => requireCmsRole(["editor"], ["owner", "publisher"]), CmsAuthorisationError);
  assert.throws(() => requireCmsRole(["editor"], ["owner"]), CmsAuthorisationError);
});

test("publishers can publish and restore but cannot manage owner roles", () => {
  assert.doesNotThrow(() => requireCmsRole(["publisher"], ["owner", "publisher"]));
  assert.throws(() => requireCmsRole(["publisher"], ["owner"]), CmsAuthorisationError);
});

test("CMS payloads reject invalid identifiers, unsafe navigation and unvalidated blocks", () => {
  assert.equal(pageDraftInputSchema.safeParse({ pageId: "bad", title: "Page", description: "Summary" }).success, false);
  assert.equal(navigationInputSchema.safeParse({ location: "primary", label: "Bad", href: "javascript:alert(1)", position: 0 }).success, false);
  assert.equal(sectionInputSchema.safeParse({ pageSlug: "home", position: 0, visible: true, variant: "default", content: '{"blockType":"raw_html","html":"<script>"}' }).success, false);
  assert.equal(publishPageInputSchema.safeParse({ pageId, expectedSnapshot: "not json" }).success, false);
});

test("CMS navigation and reusable links share the exact database-safe subset", () => {
  const accepted = [
    "/",
    "/?from=cms",
    "/about?from=cms#team",
    "https://example.org/resource",
    "http://localhost:1/preview",
    "https://example.org:65535/resource?from=cms#details",
    "mailto:care@example.org",
    "tel:+27825550100",
  ];
  const rejected = [
    "/about us",
    " /about",
    "/about\n",
    "//malicious.example/path",
    "/\\malicious.example/path",
    "https://user:password@example.org/private",
    "https://münich.example/resource",
    "https://[2001:db8::1]/resource",
    "https://example.org:0/resource",
    "https://example.org:99999/resource",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ];

  for (const href of accepted) {
    assert.equal(cmsHrefSchema.safeParse(href).success, true, href);
    assert.equal(navigationInputSchema.safeParse({ location: "primary", label: "Link", href, position: 0 }).success, true, href);
    assert.equal(reusableEntryInputSchema.safeParse({ key: "resource-link", status: "draft", entryType: "resource", content: { title: "Resource", body: "Approved body", href } }).success, true, href);
  }

  for (const href of rejected) {
    assert.equal(cmsHrefSchema.safeParse(href).success, false, href);
    assert.equal(navigationInputSchema.safeParse({ location: "primary", label: "Link", href, position: 0 }).success, false, href);
    assert.equal(reusableEntryInputSchema.safeParse({ key: "resource-link", status: "draft", entryType: "resource", content: { title: "Resource", body: "Approved body", href } }).success, false, href);
  }
});

test("reusable entries use discriminated schemas and recursively reject executable content", () => {
  const base = { key: "helpful-faq", status: "draft" };
  assert.equal(reusableEntryInputSchema.safeParse({ ...base, entryType: "faq", content: { question: "Can I book?", answer: "Yes, after reviewing the service scope." } }).success, true);
  assert.equal(reusableEntryInputSchema.safeParse({ ...base, entryType: "resource", content: { title: "Guide", body: "Useful reading", href: "https://example.org/guide" } }).success, true);
  assert.equal(reusableEntryInputSchema.safeParse({ ...base, entryType: "faq", content: { question: "Unsafe", answer: "Answer", nested: { script: "bad" } } }).success, false);
  assert.equal(reusableEntryInputSchema.safeParse({ ...base, entryType: "resource", content: { title: "Unsafe", body: "<iframe src=x></iframe>" } }).success, false);
  assert.equal(reusableEntryInputSchema.safeParse({ ...base, entryType: "unknown", content: { title: "No" } }).success, false);
});

test("asset validation accepts only controlled types, sizes and filenames", () => {
  assert.deepEqual(validateAssetFile({ name: "calm-garden.webp", type: "image/webp", size: 2048 }), {
    name: "calm-garden.webp",
    type: "image/webp",
    size: 2048,
  });
  assert.throws(() => validateAssetFile({ name: "payload.svg", type: "image/svg+xml", size: 2048 }));
  assert.throws(() => validateAssetFile({ name: "../photo.jpg", type: "image/jpeg", size: 2048 }));
  assert.throws(() => validateAssetFile({ name: "large.jpg", type: "image/jpeg", size: 16 * 1024 * 1024 }));
});

test("published CMS image references use the controlled media route", async () => {
  const route = await readFile(new URL("../app/media/[assetId]/route.ts", import.meta.url), "utf8");
  assert.match(route, /\.eq\("status", "published"\)/);
  assert.match(route, /X-Content-Type-Options/);
  assert.doesNotMatch(route, /service_role|SERVICE_ROLE/);
});

test("published snapshots are validated copies and never alias the mutable draft", () => {
  const draftSections = [structuredClone(section)];
  const snapshot = buildPublishedSnapshot({ slug: "home", title: "Home", description: "Summary", sections: draftSections });
  draftSections[0].heading = "Changed after validation";
  assert.equal(snapshot.sections[0].blockType, "introduction");
  assert.equal(snapshot.sections[0].heading, "A considered approach");
  assert.equal(snapshot.status, "published");
});

test("public content and navigation repositories never query private draft records", async () => {
  const repository = await readFile(new URL("../lib/content/repository.ts", import.meta.url), "utf8");
  const navigation = await readFile(new URL("../lib/content/navigation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(repository, /page_drafts|\.from\("sections"\)/);
  assert.match(repository, /published_version_id/);
  assert.match(navigation, /\.eq\("status", "published"\)/);
  assert.match(navigation, /\.eq\("visible", true\)/);
});

test("every CMS mutation rechecks identity and role while publication uses audited RPCs", async () => {
  const actions = await readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  for (const action of [
    "savePageDraftAction",
    "saveSectionAction",
    "deleteSectionAction",
    "publishPageAction",
    "restoreVersionAction",
    "saveReusableEntryAction",
    "saveNavigationAction",
    "publishNavigationAction",
    "uploadAssetAction",
    "manageRoleAction",
    "setContentPublicationAction",
    "initialiseCmsContentAction",
    "createStaffInvitationAction",
    "revokeStaffInvitationAction",
  ]) {
    const start = actions.indexOf(`function ${action}`);
    assert.notEqual(start, -1, `${action} should exist`);
    const body = actions.slice(start, actions.indexOf("\n}", start) + 2);
    assert.match(body, /authorisedClient\(/, `${action} must recheck authorisation`);
  }
  assert.match(actions, /\.rpc\("publish_page"/);
  assert.match(actions, /\.rpc\("restore_page_version"/);
  assert.match(actions, /page\.draft_updated/);
  assert.match(actions, /asset\.draft_uploaded/);
  assert.doesNotMatch(actions, /SERVICE_ROLE|service[_-]?role/i);
});

test("the admin preview sits under the authenticated layout", async () => {
  const layout = await readFile(new URL("../app/admin/(protected)/layout.tsx", import.meta.url), "utf8");
  const preview = await readFile(new URL("../app/admin/(protected)/preview/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(layout, /requireCmsIdentity\(\)/);
  assert.match(preview, /getDraftPreview/);
  assert.match(preview, /Private draft preview/);
});

test("CMS migration pins security definer search paths and grants RPCs narrowly", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202607150003_cms_admin.sql", import.meta.url), "utf8");
  const foundation = await readFile(new URL("../supabase/migrations/202607150001_foundation.sql", import.meta.url), "utf8");
  for (const name of ["publish_page", "restore_page_version", "set_navigation_publication", "manage_user_role", "record_content_audit"]) {
    assert.match(migration, new RegExp(`function public\\.${name}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`));
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}[\\s\\S]*?to authenticated`));
  }
  assert.match(foundation, /page_versions_immutable/);
  assert.match(migration, /page\.version_restored/);
  assert.match(migration, /page\.published/);
  assert.match(migration, /cms_json_has_forbidden_keys/);
  assert.match(migration, /drop policy content_audit_append/);
});

test("MFA and invitation onboarding are complete and fail closed", async () => {
  const actions = await readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  const security = await readFile(new URL("../app/admin/(protected)/security/page.tsx", import.meta.url), "utf8");
  const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const hardening = await readFile(new URL("../supabase/migrations/202607150004_cms_security_hardening.sql", import.meta.url), "utf8");
  assert.match(config, /\[auth\.mfa\.totp\][\s\S]*?enroll_enabled = true[\s\S]*?verify_enabled = true/);
  assert.match(actions, /auth\.mfa\.enroll/);
  assert.match(actions, /auth\.mfa\.challengeAndVerify/);
  assert.match(actions, /auth\.mfa\.unenroll/);
  assert.match(actions, /listFactors\(\)[\s\S]*?status === "unverified"/);
  assert.match(actions, /cancelPendingMfaAction/);
  assert.match(security, /Two-step verification/);
  assert.match(security, /factors\?\.all/);
  assert.match(security, /Pending authenticator setup/);
  assert.match(actions, /shouldCreateUser: true/);
  assert.doesNotMatch(actions, /invitation_email_is_eligible|invitationEligible/);
  assert.match(actions, /rpc\("create_staff_invitation"/);
  assert.match(actions, /rpc\("revoke_staff_invitation"/);
  assert.match(hardening, /create table public\.staff_invitations/);
  assert.match(hardening, /alter table public\.staff_invitations enable row level security/);
  assert.match(hardening, /alter table public\.staff_invitations force row level security/);
  assert.match(hardening, /create policy staff_invitations_owner_read/);
  assert.match(hardening, /role public\.app_role not null check \(role <> 'owner'\)/);
  assert.match(hardening, /INVITATION_REQUIRED/);
  assert.match(hardening, /provision_invited_staff_after_signup/);
  assert.doesNotMatch(hardening, /invitation_email_is_eligible/);
  assert.doesNotMatch(hardening, /grant execute[^;]+to anon[^;]*invitation/i);
  assert.match(hardening, /current_session_is_aal2/);
  for (const name of ["current_session_is_aal2", "can_mutate_cms_draft", "set_reusable_publication", "set_asset_publication", "provision_invited_staff", "protect_staff_invitation_update", "create_staff_invitation", "revoke_staff_invitation"]) {
    assert.match(hardening, new RegExp(`function public\\.${name}[\\s\\S]*?set search_path = ''`));
    assert.match(hardening, new RegExp(`revoke all on function public\\.${name}`));
  }
  assert.match(hardening, /drop policy page_versions_publish on public\.page_versions/);
  assert.match(hardening, /not public\.has_any_role\(array\['owner','publisher'\]/);
  for (const policy of ["page_drafts_cms_manage", "sections_cms_manage_draft", "navigation_cms_insert_draft", "reusable_cms_insert_draft", "assets_cms_insert_draft", "site_assets_cms_insert"]) {
    assert.match(hardening, new RegExp(`create policy ${policy}[\\s\\S]*?can_mutate_cms_draft`));
  }
});

test("database navigation validation covers ambiguous and executable href forms", async () => {
  const hardening = await readFile(new URL("../supabase/migrations/202607150004_cms_security_hardening.sql", import.meta.url), "utf8");
  const navigation = await readFile(new URL("../lib/content/navigation.ts", import.meta.url), "utf8");
  assert.match(hardening, /navigation_items_safe_href_check/);
  assert.match(hardening, /is_safe_cms_href/);
  assert.match(hardening, /javascript/);
  assert.match(hardening, /data/);
  assert.match(hardening, /value !~ '\^\/\/'/);
  assert.match(navigation, /safeHrefSchema\.safeParse/);
  assert.doesNotMatch(navigation, /safeHrefSchema\.parse\(item\.href\)/);
});

test("security hardening pgTAP suite exercises MFA, invitations, reusable schemas and href validation", async () => {
  const sql = await readFile(new URL("../supabase/tests/004_cms_security_hardening.sql", import.meta.url), "utf8");
  assert.match(sql, /select plan\(51\)/);
  assert.match(sql, /AAL1 cannot call the publication RPC directly/);
  assert.match(sql, /AAL2 can call the publication RPC directly/);
  assert.match(sql, /editor at AAL1 can mutate drafts/);
  assert.match(sql, /multi-role publisher and editor at AAL1 cannot mutate drafts/);
  assert.match(sql, /direct page version insertion is denied/);
  assert.match(sql, /nested unsupported keys are rejected/);
  assert.match(sql, /uninvited account creation is atomic/);
  assert.match(sql, /eligibility oracle does not exist/);
  assert.match(sql, /object issuer is rejected/);
  assert.match(sql, /boolean verification status is rejected/);
  assert.match(sql, /invalid ISO date is rejected/);
  assert.match(sql, /javascript URL is rejected/);
  assert.match(sql, /credential-bearing URL is rejected/);
  assert.match(sql, /root path with a query is safe/);
  assert.match(sql, /lowest explicit port is safe/);
  assert.match(sql, /highest explicit port is safe/);
  assert.match(sql, /Unicode hostname is rejected/);
  assert.match(sql, /IPv6 hostname is rejected/);
  assert.match(sql, /out of range port is rejected/);
});

test("no application source references a Supabase service role credential", async () => {
  const files = [
    "../app/admin/actions.ts",
    "../lib/cms/auth.ts",
    "../lib/cms/queries.ts",
    "../lib/supabase/server.ts",
    "../lib/supabase/browser.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /SUPABASE_SERVICE|service_role|serviceRole/);
  }
});
