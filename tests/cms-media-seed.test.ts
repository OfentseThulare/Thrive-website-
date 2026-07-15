import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateAssetFile } from "../lib/cms/schemas.ts";

test("CMS media validation accepts supported images and rejects documents", () => {
  for (const [name, type] of [
    ["portrait.jpg", "image/jpeg"],
    ["portrait.png", "image/png"],
    ["portrait.webp", "image/webp"],
    ["portrait.avif", "image/avif"],
  ] as const) {
    assert.doesNotThrow(() => validateAssetFile({ name, type, size: 2048 }));
  }

  assert.throws(() => validateAssetFile({ name: "guide.pdf", type: "application/pdf", size: 2048 }));
  assert.throws(() => validateAssetFile({ name: "vector.svg", type: "image/svg+xml", size: 2048 }));
});

test("database and storage contracts allow the same four image types only", async () => {
  const foundation = await readFile(new URL("../supabase/migrations/202607150001_foundation.sql", import.meta.url), "utf8");
  const production = await readFile(new URL("../supabase/migrations/202607150005_cms_production_readiness.sql", import.meta.url), "utf8");
  const expected = "array['image/jpeg', 'image/png', 'image/webp', 'image/avif']";

  assert.match(foundation, /mime_type text not null check \(mime_type in \('image\/jpeg', 'image\/png', 'image\/webp', 'image\/avif'\)\)/);
  assert.ok(foundation.includes(expected));
  assert.doesNotMatch(foundation, /application\/pdf/);
  assert.match(production, /drop constraint if exists assets_mime_type_check/);
  assert.match(production, /CMS_NON_IMAGE_ASSETS_PRESENT/);
  assert.ok(production.includes(`set allowed_mime_types = ${expected}`));
  assert.doesNotMatch(production, /application\/pdf/);
});

test("admin upload and media delivery remain image only", async () => {
  const forms = await readFile(new URL("../components/admin/cms-forms.tsx", import.meta.url), "utf8");
  const assetsPage = await readFile(new URL("../app/admin/(protected)/assets/page.tsx", import.meta.url), "utf8");
  const mediaRoute = await readFile(new URL("../app/media/[assetId]/route.ts", import.meta.url), "utf8");

  assert.match(forms, /accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
  assert.doesNotMatch(forms, /application\/pdf|Image or PDF/);
  assert.match(assetsPage, /<h1>Image library<\/h1>/);
  assert.doesNotMatch(assetsPage, /PDF|application\/pdf/);
  assert.match(mediaRoute, /supportedImageTypes\.has\(asset\.mime_type\)/);
});

test("seed import uses action state and exposes server feedback", async () => {
  const action = await readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  const form = await readFile(new URL("../components/admin/seed-import-form.tsx", import.meta.url), "utf8");
  const pages = await readFile(new URL("../app/admin/(protected)/pages/page.tsx", import.meta.url), "utf8");

  assert.match(action, /initialiseCmsContentAction\(\s*_previous: CmsActionState,\s*_formData: FormData/);
  assert.match(form, /useActionState\(initialiseCmsContentAction, initialCmsActionState\)/);
  assert.match(form, /<ActionFeedback state=\{state\}/);
  assert.match(form, /<SubmitButton>Import approved seed content<\/SubmitButton>/);
  assert.match(pages, /<SeedImportForm \/>/);
  assert.doesNotMatch(pages, /<form action=\{initialiseCmsContentAction\}/);
});
