import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);

test("every site photograph has complete provenance and usage metadata", async () => {
  const metadata = JSON.parse(
    await readFile(path.join(projectRoot, "public/images/metadata.json"), "utf8"),
  ) as {
    assets: Array<Record<string, unknown>>;
  };

  assert.equal(metadata.assets.length, 5);

  for (const asset of metadata.assets) {
    const publicPath = String(asset.path);
    await access(path.join(projectRoot, "public", publicPath));
    assert.equal(typeof asset.provider, "string");
    assert.equal(typeof asset.creator, "string");
    assert.equal(typeof asset.assetIdentifier, "string");
    assert.equal(typeof asset.altText, "string");
    assert.equal(typeof asset.decorative, "boolean");
    assert.equal(typeof asset.focalPoint, "string");
    assert.equal(typeof asset.crop, "string");
    assert.equal(typeof asset.usageRestrictions, "string");

    if (asset.assetType === "licensed stock photograph") {
      assert.equal(asset.provider, "Unsplash");
      assert.equal(asset.downloadDate, "15/07/2026");
      assert.equal(asset.licenceUrl, "https://unsplash.com/license");
      assert.match(String(asset.originalSourceUrl), /^https:\/\/unsplash\.com\/photos\//);
      await access(path.join(projectRoot, String(asset.sourceAssetPath)));
    }
  }
});

test("the human readable licence note names all stock identifiers", async () => {
  const note = await readFile(path.join(projectRoot, "docs/IMAGE-LICENCES.md"), "utf8");
  for (const identifier of ["n0TUzExwAQI", "U1uKv55AbQg", "atUjuLuFEcc"]) {
    assert.ok(note.includes(identifier));
  }
  assert.match(note, /must not be represented as a cancer patient/i);
});
