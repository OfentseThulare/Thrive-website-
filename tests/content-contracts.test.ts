import assert from "node:assert/strict";
import test from "node:test";

import { safeHrefSchema, safeImageSourceSchema } from "../lib/content/contracts.ts";

test("CMS links accept safe local and explicit external destinations", () => {
  const accepted = [
    "/book",
    "/services/cancer-health-coaching?from=home#programme",
    "https://example.org/resource",
    "http://localhost:3000/preview",
    "mailto:care@example.org",
    "tel:+27 82 555 0100",
  ];

  for (const href of accepted) {
    assert.equal(safeHrefSchema.parse(href), href);
  }
});

test("CMS links reject executable, ambiguous and credential-bearing destinations", () => {
  const rejected = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//malicious.example/path",
    "/\\malicious.example/path",
    "https://user:password@example.org/private",
    "ftp://example.org/file",
    "relative/path",
    "\u0000/book",
  ];

  for (const href of rejected) {
    assert.equal(safeHrefSchema.safeParse(href).success, false, href);
  }
});

test("CMS images accept only local image assets", () => {
  const accepted = [
    "/images/renny-portrait-seated.jpg",
    "/images/resources/quiet-room.webp",
    "/images/landscape_01.avif",
  ];

  for (const src of accepted) {
    assert.equal(safeImageSourceSchema.parse(src), src);
  }
});

test("CMS images reject remote, executable and ambiguous sources", () => {
  const rejected = [
    "https://example.org/image.jpg",
    "https://user:password@example.org/image.jpg",
    "//example.org/image.jpg",
    "data:image/svg+xml,<svg></svg>",
    "javascript:alert(1)",
    "/images/../private.jpg",
    "/images/%2e%2e/private.jpg",
    "/images\\portrait.jpg",
    "/public/images/portrait.jpg",
    "/images/portrait.svg",
    "/images/portrait.jpg?cache=1",
  ];

  for (const src of rejected) {
    assert.equal(safeImageSourceSchema.safeParse(src).success, false, src);
  }
});
