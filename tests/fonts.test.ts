import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fontAssets = new Map([
  ["AlegreyaSans-Regular.ttf", "2c9b0c50cd08e872a68d3b11587a40d59efc4fb9"],
  ["AlegreyaSans-Medium.ttf", "25efd0dee46c4b5f125d970171c58cdc613635e9"],
  ["AlegreyaSans-Bold.ttf", "5eb6c87008e255bb58a0488fed4641420d97ba1d"],
  ["CormorantGaramond-Variable.ttf", "d992a83ce525c330fad3a19087746bcb2dc038ee"],
]);

function gitBlobHash(content: Buffer) {
  return createHash("sha1")
    .update(`blob ${content.byteLength}\0`)
    .update(content)
    .digest("hex");
}

test("layout uses only locally bundled Next.js fonts", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(layout, /from "next\/font\/local"/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.match(layout, /AlegreyaSans-Regular\.ttf/);
  assert.match(layout, /CormorantGaramond-Variable\.ttf/);
});

test("font binaries match the documented official Google Fonts blobs", async () => {
  for (const [filename, expectedHash] of fontAssets) {
    const content = await readFile(new URL(`../app/fonts/${filename}`, import.meta.url));
    assert.equal(gitBlobHash(content), expectedHash, filename);
  }
});

test("each bundled family includes its OFL licence and upstream metadata", async () => {
  for (const family of ["AlegreyaSans", "CormorantGaramond"]) {
    const licence = await readFile(
      new URL(`../app/fonts/licenses/${family}-OFL.txt`, import.meta.url),
      "utf8",
    );
    const metadata = await readFile(
      new URL(`../app/fonts/licenses/${family}-METADATA.pb`, import.meta.url),
      "utf8",
    );

    assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(metadata, /license: "OFL"/);
  }
});
