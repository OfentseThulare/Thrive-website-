import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePublishedPage,
  type PublishedPageSource,
} from "../lib/content/published-page.ts";
import { seedPages } from "../lib/content/seed.ts";

test("seed mode serves validated seed content", async () => {
  const page = await resolvePublishedPage({ slug: "about", source: null, seedPages });

  assert.equal(page, seedPages.get("about"));
});

test("configured CMS does not revive a missing or unpublished seeded route", async () => {
  let versionQueried = false;
  const source: PublishedPageSource = {
    async getPublishedPage() {
      return { data: null, error: { code: "PGRST116" } };
    },
    async getPublishedVersion() {
      versionQueried = true;
      return { data: null, error: { code: "PGRST116" } };
    },
  };

  assert.ok(seedPages.has("about"));
  assert.equal(
    await resolvePublishedPage({ slug: "about", source, seedPages }),
    null,
  );
  assert.equal(versionQueried, false);
});
