import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addCollectionMember,
  createReusableEditorValues,
  getAvailableOptionalFields,
  getCollectionLimits,
  type JsonValue,
  removeCollectionMember,
  removeJsonValueAtPath,
  serialiseReusableContent,
  setJsonValueAtPath,
} from "../lib/cms/editor-values.ts";

test("reusable editor values preserve every schema-specific field", () => {
  const cases = [
    ["faq", { question: "Can I book?", answer: "Yes." }],
    ["resource", { title: "Guide", body: "Read this.", href: "/resources" }],
    ["credential", { title: "Training", body: "Completed.", issuer: "Institute", verificationStatus: "verified" }],
    ["testimonial", { quote: "Considered care.", attribution: "Client", consentConfirmed: true }],
    ["pricing_note", { title: "Payment", body: "Payment is due before a session." }],
    ["legal_notice", { title: "Terms", body: ["First paragraph.", "Second paragraph."], effectiveDate: "2026-07-15" }],
    ["service", { title: "Support", body: "A private session.", href: "/book" }],
    ["pricing", { title: "Single session", duration: "60 minutes", price: "R900", body: "One private session." }],
  ] as const;

  for (const [entryType, content] of cases) {
    const values = createReusableEditorValues(entryType, content);
    assert.deepEqual(serialiseReusableContent(entryType, values), content, entryType);
  }
});

test("reusable editor omits untouched optional values", () => {
  const values = createReusableEditorValues("credential", { title: "Training", body: "Completed." });
  assert.deepEqual(serialiseReusableContent("credential", values), { title: "Training", body: "Completed." });
  assert.deepEqual(serialiseReusableContent("resource", values), { title: "Training", body: "Completed." });
});

test("collection operations enforce schema minimums and maximums", () => {
  let content: JsonValue = { blockType: "card_collection", cards: [{ title: "First", body: "Detail" }] };
  const limits = getCollectionLimits("card_collection", ["cards"]);
  assert.deepEqual(limits, { label: "card", min: 1, max: 8 });

  for (let index = 1; index < 10; index += 1) {
    content = addCollectionMember(content, "card_collection", ["cards"]);
  }
  assert.equal((content as Record<string, JsonValue>).cards instanceof Array, true);
  assert.equal(((content as Record<string, JsonValue>).cards as JsonValue[]).length, 8);

  for (let index = 0; index < 10; index += 1) {
    content = removeCollectionMember(content, "card_collection", ["cards"], 0);
  }
  assert.equal(((content as Record<string, JsonValue>).cards as JsonValue[]).length, 1);
});

test("nested and reusable collections use their own limits", () => {
  let comparison: JsonValue = {
    blockType: "comparison",
    columns: [
      { title: "One", body: "Detail", points: ["First"] },
      { title: "Two", body: "Detail", points: ["First"] },
    ],
  };
  comparison = addCollectionMember(comparison, "comparison", ["columns", 0, "points"]);
  assert.equal((((comparison as Record<string, JsonValue>).columns as JsonValue[])[0] as Record<string, JsonValue>).points instanceof Array, true);
  assert.equal(((((comparison as Record<string, JsonValue>).columns as JsonValue[])[0] as Record<string, JsonValue>).points as JsonValue[]).length, 2);

  let reusable: JsonValue = { blockType: "reusable_collection", heading: "Resources", entryType: "resource", keys: ["first-resource"], tone: "mist" };
  reusable = addCollectionMember(reusable, "reusable_collection", ["keys"]);
  assert.deepEqual((reusable as Record<string, JsonValue>).keys, ["first-resource", "new-entry-key"]);
});

test("optional section fields can be discovered, added and removed without disturbing siblings", () => {
  const hero: JsonValue = {
    blockType: "hero",
    eyebrow: "Welcome",
    heading: "Support",
    body: "Approved copy.",
    primaryAction: { label: "Book", href: "/book" },
    image: { src: "/images/photo.jpg", alt: "Portrait", width: 1200, height: 800, position: "centre" },
    tone: "cream",
  };
  const available = getAvailableOptionalFields("hero", [], hero as Record<string, JsonValue>);
  assert.deepEqual(available.map((field) => field.key), ["secondaryAction", "aside"]);

  const withAside = setJsonValueAtPath(hero, ["aside"], "Additional context.");
  assert.equal((withAside as Record<string, JsonValue>).aside, "Additional context.");
  const withoutAside = removeJsonValueAtPath(withAside, ["aside"]);
  assert.equal("aside" in (withoutAside as Record<string, JsonValue>), false);
  assert.equal((withoutAside as Record<string, JsonValue>).heading, "Support");
});

test("published reusable and navigation records expose no editor form", async () => {
  const reusable = await readFile(new URL("../app/admin/(protected)/reusable/page.tsx", import.meta.url), "utf8");
  const navigation = await readFile(new URL("../app/admin/(protected)/navigation/page.tsx", import.meta.url), "utf8");

  assert.match(reusable, /canEdit && entry\.status === "draft"/);
  assert.match(reusable, /Unpublish this entry to draft before editing it/);
  assert.match(navigation, /canEdit && item\.status === "draft"/);
  assert.match(navigation, /Unpublish this item to draft before editing its details/);
});

test("section editor exposes accessible collection and optional-field controls", async () => {
  const forms = await readFile(new URL("../components/admin/cms-forms.tsx", import.meta.url), "utf8");
  assert.match(forms, /aria-label={`Remove \${limits\.label} \${index \+ 1}`}/);
  assert.match(forms, /Add {limits\.label}/);
  assert.match(forms, /Remove optional field/);
  assert.match(forms, /reusable_collection: \{ blockType: "reusable_collection"/);
});
