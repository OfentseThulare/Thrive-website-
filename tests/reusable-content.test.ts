import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { ContentBlock } from "../lib/content/contracts.ts";
import {
  resolveReusableCollection,
  resolveReusableCollections,
  type ReusableEntryType,
} from "../lib/content/reusable.ts";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
type ReusableCollectionBlock = Extract<ContentBlock, { blockType: "reusable_collection" }>;

function collection(entryType: ReusableEntryType, keys: string[]): ReusableCollectionBlock {
  return {
    blockType: "reusable_collection",
    heading: "Selected content",
    entryType,
    keys,
    tone: "mist",
  };
}

const validContent = {
  faq: { question: "Can coaching replace medical care?", answer: "No. Coaching works alongside your clinical team." },
  resource: { title: "Preparing for a session", body: "A practical guide for your first conversation.", href: "/book" },
  credential: { title: "Health coaching qualification", body: "Training supplied by the client.", issuer: "Training institute", verificationStatus: "verified" },
  testimonial: { quote: "The conversations helped me find steadier ground.", attribution: "Coaching client", consentConfirmed: true },
  pricing_note: { title: "Package pricing", body: "Ask about the twelve session package." },
  legal_notice: { title: "Scope of support", body: ["This service does not diagnose or treat disease."], effectiveDate: "2026-07-15" },
  service: { title: "Cancer health coaching", body: "Practical support for daily wellbeing.", href: "/services/cancer-health-coaching" },
  pricing: { title: "Foundation Session", duration: "3 hours", price: "R1 785", body: "An extended first conversation." },
} as const;

test("the resolver accepts every current reusable entry type", () => {
  for (const entryType of Object.keys(validContent) as ReusableEntryType[]) {
    const entry = resolveReusableCollection(collection(entryType, [`${entryType.replaceAll("_", "-")}-entry`]), [
      {
        key: `${entryType.replaceAll("_", "-")}-entry`,
        entry_type: entryType,
        status: "published",
        content: validContent[entryType],
      },
    ]);

    assert.equal(entry.length, 1, entryType);
    assert.equal(entry[0]?.entryType, entryType);
    assert.deepEqual(entry[0]?.content, validContent[entryType]);
  }
});

test("the resolver filters unsafe rows, removes duplicate references and preserves key order", () => {
  const entries = resolveReusableCollection(
    collection("resource", ["second", "first", "second", "missing", "draft", "wrong-type", "invalid"]),
    [
      { key: "first", entry_type: "resource", status: "published", content: validContent.resource },
      { key: "second", entry_type: "resource", status: "published", content: { ...validContent.resource, title: "Second resource" } },
      { key: "draft", entry_type: "resource", status: "draft", content: validContent.resource },
      { key: "wrong-type", entry_type: "service", status: "published", content: validContent.service },
      { key: "invalid", entry_type: "resource", status: "published", content: { ...validContent.resource, layout: "wide" } },
      { key: "not-requested", entry_type: "resource", status: "published", content: validContent.resource },
    ],
  );

  assert.deepEqual(entries.map((entry) => entry.key), ["second", "first"]);
});

test("page resolution batches references once and keeps entries aligned with their sections", async () => {
  const blocks = [
    collection("resource", ["guide"]),
    collection("faq", ["scope-question"]),
  ];
  const calls: Array<{ entryTypes: readonly ReusableEntryType[]; keys: readonly string[] }> = [];

  const resolved = await resolveReusableCollections(blocks, {
    async getPublishedEntries(entryTypes, keys) {
      calls.push({ entryTypes, keys });
      return {
        data: [
          { key: "scope-question", entry_type: "faq", status: "published", content: validContent.faq },
          { key: "guide", entry_type: "resource", status: "published", content: validContent.resource },
        ],
        error: null,
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { entryTypes: ["resource", "faq"], keys: ["guide", "scope-question"] });
  assert.deepEqual(resolved.map((entries) => entries.map((entry) => entry.key)), [["guide"], ["scope-question"]]);
});

test("missing or unavailable reusable data produces empty collections", async () => {
  const blocks = [collection("resource", ["guide"])];

  assert.deepEqual(await resolveReusableCollections(blocks, null), [[]]);
  assert.deepEqual(
    await resolveReusableCollections(blocks, {
      async getPublishedEntries() {
        return { data: null, error: { code: "PGRST500" } };
      },
    }),
    [[]],
  );
  assert.deepEqual(
    await resolveReusableCollections(blocks, {
      async getPublishedEntries() {
        throw new Error("unavailable");
      },
    }),
    [[]],
  );
});

test("the public renderer provides semantic presentations for all eight entry types", async () => {
  const renderer = await readFile(path.join(projectRoot, "components/reusable-collection.tsx"), "utf8");

  for (const entryType of Object.keys(validContent)) {
    assert.match(renderer, new RegExp(`case ["']${entryType}["']`), entryType);
  }

  assert.match(renderer, /<details className="reusable-faq">[\s\S]*?<summary>/);
  assert.match(renderer, /<figure className="reusable-testimonial">[\s\S]*?<blockquote>[\s\S]*?<figcaption>/);
  assert.match(renderer, /<time dateTime=/);
  assert.match(renderer, /<article className="reusable-card reusable-resource">/);
  assert.match(renderer, /<article className="reusable-card reusable-credential">/);
  assert.match(renderer, /<aside className="reusable-card reusable-pricing-note" aria-label=/);
  assert.match(renderer, /<article className="reusable-card reusable-service">/);
  assert.match(renderer, /<article className="reusable-card reusable-price-card">/);
  assert.match(renderer, /if \(entries\.length === 0\) return null/);
});
