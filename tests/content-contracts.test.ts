import assert from "node:assert/strict";
import test from "node:test";

import { safeHrefSchema } from "../lib/content/contracts.ts";

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
