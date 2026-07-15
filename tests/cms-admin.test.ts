import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CmsAuthorisationError, hasCmsRole, requireCmsRole } from "../lib/cms/permissions.ts";
import {
  navigationInputSchema,
  pageDraftInputSchema,
  publishPageInputSchema,
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
