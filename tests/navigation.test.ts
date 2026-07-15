import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerUrl = new URL("../components/site-header.tsx", import.meta.url);

test("mobile navigation exposes an explicit modal trigger and close controls", async () => {
  const header = await readFile(headerUrl, "utf8");

  assert.match(header, /aria-expanded=\{menuOpen\}/);
  assert.match(header, /aria-controls="mobile-navigation-dialog"/);
  assert.match(header, /aria-haspopup="dialog"/);
  assert.match(header, /role="dialog"/);
  assert.match(header, /aria-modal="true"/);
  assert.match(header, /hidden=\{!menuOpen\}/);
  assert.match(header, /mobile-menu-backdrop/);
  assert.match(header, /aria-label="Close navigation menu"/);
});

test("mobile navigation supports focus entry, trapping, Escape and restoration", async () => {
  const header = await readFile(headerUrl, "utf8");

  assert.match(header, /firstLinkRef\.current\?\.focus\(\)/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /event\.key !== "Tab"/);
  assert.match(header, /event\.shiftKey/);
  assert.match(header, /lastItem\.focus\(\)/);
  assert.match(header, /firstItem\.focus\(\)/);
  assert.match(header, /menuButtonRef\.current\?\.focus\(\)/);
});

test("mobile navigation closes on route selection and desktop breakpoint changes", async () => {
  const header = await readFile(headerUrl, "utf8");

  assert.match(header, /onClick=\{\(\) => closeMenu\(false\)\}/);
  assert.match(header, /matchMedia\("\(min-width: 1081px\)"\)/);
  assert.match(header, /document\.body\.classList\.remove\("mobile-menu-open"\)/);
});
