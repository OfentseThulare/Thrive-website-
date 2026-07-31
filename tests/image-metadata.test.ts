import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { seedPages } from "../lib/content/seed.ts";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);

function readJpegDimensions(bytes: Buffer) {
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  for (let index = 0; index < bytes.length - 8; index += 1) {
    if (bytes[index] === 0xff && startOfFrameMarkers.has(bytes[index + 1])) {
      return {
        height: bytes.readUInt16BE(index + 5),
        width: bytes.readUInt16BE(index + 7),
      };
    }
  }

  throw new Error("JPEG dimensions could not be read");
}

test("every site photograph has complete provenance and usage metadata", async () => {
  const metadata = JSON.parse(
    await readFile(path.join(projectRoot, "public/images/metadata.json"), "utf8"),
  ) as {
    assets: Array<Record<string, unknown>>;
  };

  const publicImageFiles = (await readdir(path.join(projectRoot, "public/images")))
    .filter((file) => /\.(jpe?g|webp)$/i.test(file));

  assert.equal(metadata.assets.length, publicImageFiles.length);

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

    if (asset.assetType === "AI-generated editorial image") {
      assert.equal(asset.provider, "Higgsfield Seedream 5.0 Pro and Bytedance Image Upscale");
      assert.equal(asset.downloadDate, "15/07/2026");
      assert.match(String(asset.assetIdentifier), /^seedream:[0-9a-f-]+; upscale:[0-9a-f-]+$/);
      await access(path.join(projectRoot, String(asset.sourceAssetPath)));
      await access(path.join(projectRoot, String(asset.baseSourceAssetPath)));
    }
  }
});

test("the human readable licence note is independently complete for every stock asset", async () => {
  const [note, rawMetadata] = await Promise.all([
    readFile(path.join(projectRoot, "docs/IMAGE-LICENCES.md"), "utf8"),
    readFile(path.join(projectRoot, "public/images/metadata.json"), "utf8"),
  ]);
  const metadata = JSON.parse(rawMetadata) as { assets: Array<Record<string, unknown>> };
  const stockAssets = metadata.assets.filter(
    (asset) => asset.assetType === "licensed stock photograph",
  );

  assert.equal(stockAssets.length, 3);

  for (const asset of stockAssets) {
    assert.ok(note.includes(`Creator: ${String(asset.creator)}`));
    assert.ok(note.includes(`Provider: ${String(asset.provider)}`));
    assert.ok(note.includes(`Asset identifier: \`${String(asset.assetIdentifier)}\``));
    assert.ok(note.includes(`Original source: ${String(asset.originalSourceUrl)}`));
    assert.ok(note.includes(`Download date: ${String(asset.downloadDate)}`));
    assert.ok(note.includes(`Licence: ${String(asset.licenceUrl)}`));
    assert.ok(note.includes(`Alt text: ${String(asset.altText)}`));
    assert.ok(note.includes(`Decorative: ${asset.decorative === false ? "No" : "Yes"}`));
    assert.ok(note.includes(`Crop: ${String(asset.crop)}`));
    assert.ok(note.includes(`Focal point: ${String(asset.focalPoint)}`));
    assert.ok(note.includes(`Usage restrictions: ${String(asset.usageRestrictions)}`));
  }
});

test("standing portrait content dimensions match the served JPEG", async () => {
  const aboutPage = seedPages.get("about");
  const standingHero = aboutPage?.sections.find(
    (section) =>
      section.blockType === "hero" && section.image.src === "/images/renny-portrait-outdoors.jpg",
  );

  assert.ok(standingHero && standingHero.blockType === "hero");

  const imageBytes = await readFile(
    path.join(projectRoot, "public", standingHero.image.src.replace(/^\//, "")),
  );
  const actual = readJpegDimensions(imageBytes);

  assert.deepEqual(
    { width: standingHero.image.width, height: standingHero.image.height },
    actual,
  );
});
