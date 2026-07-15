import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { seedPages } from "../lib/content/seed.ts";
import { publicRoutes } from "../lib/site-routes.ts";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const routePaths = new Set(publicRoutes.map((route) => route.path));

function pageFileFor(route: (typeof publicRoutes)[number]) {
  if (route.path === "/") return path.join(projectRoot, "app/page.tsx");
  return path.join(projectRoot, "app", route.path.slice(1), "page.tsx");
}

test("every approved public route has a page, seed content and sitemap entry", async () => {
  assert.equal(publicRoutes.length, 11);

  for (const route of publicRoutes) {
    await access(pageFileFor(route));
    assert.ok(seedPages.has(route.slug), `missing seed page for ${route.slug}`);
  }

  const sitemap = await readFile(path.join(projectRoot, "app/sitemap.ts"), "utf8");
  assert.match(sitemap, /publicRoutes\.map/);
});

test("all internal seed calls to action resolve to approved routes", () => {
  const hrefs: string[] = [];

  for (const page of seedPages.values()) {
    for (const block of page.sections) {
      if (block.blockType === "hero") {
        hrefs.push(block.primaryAction.href);
        if (block.secondaryAction) hrefs.push(block.secondaryAction.href);
      }
      if (block.blockType === "card_collection") {
        for (const card of block.cards) if (card.link) hrefs.push(card.link.href);
      }
      if (block.blockType === "editorial_split" && block.action) hrefs.push(block.action.href);
      if (block.blockType === "comparison") {
        for (const column of block.columns) if (column.link) hrefs.push(column.link.href);
      }
      if (block.blockType === "call_to_action") hrefs.push(block.action.href);
    }
  }

  for (const href of hrefs) {
    assert.ok(routePaths.has(href as (typeof publicRoutes)[number]["path"]), `dead CTA: ${href}`);
  }
});

test("navigation does not expose legal placeholders and links every approved route", async () => {
  const [header, footer] = await Promise.all([
    readFile(path.join(projectRoot, "components/site-header.tsx"), "utf8"),
    readFile(path.join(projectRoot, "components/site-footer.tsx"), "utf8"),
  ]);
  const globalNavigation = `${header}\n${footer}`;

  for (const route of publicRoutes) {
    if (route.path === "/") continue;
    assert.ok(globalNavigation.includes(`"${route.path}"`), `route absent from global nav: ${route.path}`);
  }

  assert.doesNotMatch(globalNavigation, /href="\/(privacy|terms|medical-disclaimer|refund|cancellation)/);
});

test("public copy excludes unsupported statistics, fabricated quotation marks and dash punctuation", () => {
  const copy = JSON.stringify([...seedPages.values()]);

  assert.doesNotMatch(copy, /30%|30 to 50%|30–50%/i);
  assert.doesNotMatch(copy, /Clinical insight/i);
  assert.doesNotMatch(copy, /[—–]/);
});

test("booking content remains informational and avoids health data collection", () => {
  const booking = seedPages.get("book");
  assert.ok(booking);
  const copy = JSON.stringify(booking);

  assert.match(copy, /does not reserve or confirm an appointment/i);
  assert.match(copy, /does not collect personal or health information/i);
  assert.doesNotMatch(copy, /type=["'](?:date|datetime-local|email|tel)/i);
});

test("coverage matrix accounts for every source heading and flags verification", async () => {
  const coverage = await readFile(path.join(projectRoot, "docs/CONTENT-COVERAGE.md"), "utf8");
  const requiredSections = [
    "Facing a cancer diagnosis",
    "Meet Renny",
    "Health Coaching programme",
    "Radical Remission definition",
    "Functional Medicine holistic approach",
    "PEMS Physical, Emotional, Mental and Spiritual areas",
    "Psycho-Oncology Counselling overview",
    "Cancer Prevention Coaching overview",
    "Coaching versus counselling",
    "Foundation Session, 3 hours, R1785",
    "PayFast, card and direct EFT",
    "Certification logos",
  ];

  for (const section of requiredSections) assert.ok(coverage.includes(section), `unmapped: ${section}`);
  assert.match(coverage, /Remaining Client Verification/);
  assert.doesNotMatch(coverage, /\|\s*Unaccounted\s*\|/i);
});
