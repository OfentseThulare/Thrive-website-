import { z } from "zod";

import { contentBlockSchema, pageContentSchema, safeHrefSchema } from "../content/contracts.ts";
import { cmsRoleSchema } from "./permissions.ts";

const uuid = z.string().uuid();
const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);

export const pageDraftInputSchema = z.object({
  pageId: uuid,
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(320),
  metaTitle: z.string().trim().max(70).optional().default(""),
  metaDescription: z.string().trim().max(160).optional().default(""),
  canonicalPath: z.union([
    z.literal(""),
    z.string().trim().max(180).regex(/^\/[a-z0-9/-]*$/, "Use a safe site path beginning with a forward slash"),
  ]).optional().default(""),
  noIndex: z.coerce.boolean().default(false),
  visible: z.coerce.boolean().default(false),
});

export const sectionInputSchema = z.object({
  sectionId: uuid.optional(),
  pageSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  position: z.coerce.number().int().min(0).max(100),
  visible: z.coerce.boolean().default(false),
  variant: z.enum(["default", "quiet", "emphasis", "compact"]).default("default"),
  content: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }, contentBlockSchema),
});

export const deleteSectionInputSchema = z.object({ sectionId: uuid, pageSlug: z.string().min(1) });

export const publishPageInputSchema = z.object({
  pageId: uuid,
  changeSummary: z.string().trim().max(500).optional().default(""),
  expectedSnapshot: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }, pageContentSchema.extend({ status: z.literal("published") })),
});

export const restoreVersionInputSchema = z.object({ pageId: uuid, versionId: uuid });

export const reusableEntryInputSchema = z.object({
  entryId: uuid.optional(),
  entryType: z.enum(["credential", "faq", "resource", "testimonial", "pricing_note", "legal_notice"]),
  key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  status: z.literal("draft"),
  content: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }, z.record(z.string(), z.union([z.string().trim().max(3000), z.array(z.string().trim().max(800)).max(20)]))),
});

export const navigationInputSchema = z.object({
  itemId: uuid.optional(),
  location: z.enum(["primary", "footer", "legal"]),
  label: z.string().trim().min(1).max(80),
  href: safeHrefSchema,
  position: z.coerce.number().int().min(0).max(100),
});

export const navigationPublicationInputSchema = z.object({
  itemId: uuid,
  makePublic: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const assetMetadataSchema = z.object({
  altText: z.string().trim().min(1).max(240),
  decorative: z.preprocess((value) => value ?? "false", z.enum(["true", "false"])).transform((value) => value === "true"),
  focalX: z.coerce.number().min(0).max(1),
  focalY: z.coerce.number().min(0).max(1),
  sourceUrl: optionalUrl,
  photographer: z.string().trim().max(160).optional().default(""),
  licenceSource: z.string().trim().max(300).optional().default(""),
  sourceIdentifier: z.string().trim().max(160).optional().default(""),
  restrictions: z.string().trim().max(1000).optional().default(""),
});

const safeAssetMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"] as const;
export const maximumAssetBytes = 15 * 1024 * 1024;

export function validateAssetFile(file: Pick<File, "name" | "type" | "size">) {
  return z
    .object({
      name: z.string().trim().min(1).max(240).refine((name) => !/[\\/\u0000-\u001f]/.test(name), "Unsafe filename"),
      type: z.enum(safeAssetMimeTypes),
      size: z.number().int().positive().max(maximumAssetBytes),
    })
    .parse(file);
}

export const roleManagementInputSchema = z.object({
  userId: uuid,
  role: cmsRoleSchema,
  operation: z.enum(["grant", "revoke"]),
});

export const contentPublicationInputSchema = z.object({
  entity: z.enum(["asset", "reusable_entry"]),
  entityId: uuid,
  makePublic: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type PageDraftInput = z.infer<typeof pageDraftInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;
