import { z } from "zod";

import { cmsHrefSchema } from "./cms-href.ts";
import type { ContentBlock } from "./contracts.ts";

const safePlainText = z.string().trim().min(1).max(3000).refine(
  (value) => !/<\s*\/?\s*(?:script|iframe|style|link|object|embed|html)\b|javascript\s*:|data\s*:\s*text\/html/i.test(value),
  "HTML, executable URLs and embedded layout are not allowed",
);

export const reusableContentSchemas = {
  faq: z.object({ question: safePlainText.max(180), answer: safePlainText }).strict(),
  resource: z.object({ title: safePlainText.max(180), body: safePlainText, href: cmsHrefSchema.optional() }).strict(),
  credential: z.object({
    title: safePlainText.max(180),
    body: safePlainText,
    issuer: safePlainText.max(180).optional(),
    verificationStatus: z.enum(["pending", "verified"]).optional(),
  }).strict(),
  testimonial: z.object({
    quote: safePlainText,
    attribution: safePlainText.max(180),
    consentConfirmed: z.literal(true),
  }).strict(),
  pricing_note: z.object({ title: safePlainText.max(180), body: safePlainText }).strict(),
  legal_notice: z.object({
    title: safePlainText.max(180),
    body: z.array(safePlainText.max(1200)).min(1).max(20),
    effectiveDate: z.string().date().optional(),
  }).strict(),
  service: z.object({ title: safePlainText.max(180), body: safePlainText, href: cmsHrefSchema.optional() }).strict(),
  pricing: z.object({
    title: safePlainText.max(180),
    duration: safePlainText.max(100),
    price: safePlainText.max(80),
    body: safePlainText,
  }).strict(),
} as const;

export type ReusableEntryType = keyof typeof reusableContentSchemas;

export type ResolvedReusableEntry = {
  [EntryType in ReusableEntryType]: {
    key: string;
    entryType: EntryType;
    content: z.infer<(typeof reusableContentSchemas)[EntryType]>;
  };
}[ReusableEntryType];

export type PublishedReusableSource = {
  getPublishedEntries(
    entryTypes: readonly ReusableEntryType[],
    keys: readonly string[],
  ): Promise<{
    data: readonly unknown[] | null;
    error: { code: string } | null;
  }>;
};

const reusableRowSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  entry_type: z.enum([
    "faq",
    "resource",
    "credential",
    "testimonial",
    "pricing_note",
    "legal_notice",
    "service",
    "pricing",
  ]),
  status: z.literal("published"),
  content: z.unknown(),
}).strict();

type ReusableCollectionBlock = Extract<ContentBlock, { blockType: "reusable_collection" }>;

export function resolveReusableCollection(
  block: ReusableCollectionBlock,
  rows: readonly unknown[],
): ResolvedReusableEntry[] {
  const requestedKeys = new Set(block.keys);
  const entriesByKey = new Map<string, ResolvedReusableEntry>();
  const contentSchema = reusableContentSchemas[block.entryType];

  for (const candidate of rows) {
    const row = reusableRowSchema.safeParse(candidate);
    if (!row.success) continue;
    if (row.data.entry_type !== block.entryType || !requestedKeys.has(row.data.key)) continue;

    const content = contentSchema.safeParse(row.data.content);
    if (!content.success || entriesByKey.has(row.data.key)) continue;

    entriesByKey.set(row.data.key, {
      key: row.data.key,
      entryType: block.entryType,
      content: content.data,
    } as ResolvedReusableEntry);
  }

  const emittedKeys = new Set<string>();
  return block.keys.flatMap((key) => {
    const entry = entriesByKey.get(key);
    if (!entry || emittedKeys.has(key)) return [];
    emittedKeys.add(key);
    return [entry];
  });
}

export async function resolveReusableCollections(
  blocks: readonly ContentBlock[],
  source: PublishedReusableSource | null,
): Promise<ResolvedReusableEntry[][]> {
  const emptyCollections = blocks.map(() => [] as ResolvedReusableEntry[]);
  const referencedCollections = blocks.filter(
    (block): block is ReusableCollectionBlock => block.blockType === "reusable_collection",
  );

  if (!source || referencedCollections.length === 0) return emptyCollections;

  const entryTypes = [...new Set(referencedCollections.map((block) => block.entryType))];
  const keys = [...new Set(referencedCollections.flatMap((block) => block.keys))];

  try {
    const { data, error } = await source.getPublishedEntries(entryTypes, keys);
    if (error || !data) return emptyCollections;

    return blocks.map((block) =>
      block.blockType === "reusable_collection" ? resolveReusableCollection(block, data) : [],
    );
  } catch {
    return emptyCollections;
  }
}
