import { z } from "zod";

import { contentBlockSchema, pageContentSchema } from "../content/contracts.ts";
import { cmsRoleSchema } from "./permissions.ts";

const uuid = z.string().uuid();
const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);

const cmsHostLabel = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?";
const cmsInternalHref = /^\/(?!\/)[A-Za-z0-9._~!$&()*+,;=:@%/?#-]*$/;
const cmsHttpHref = new RegExp(
  `^https?://${cmsHostLabel}(?:\\.${cmsHostLabel})*(?::([0-9]{1,5}))?(?:[/?#][A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$`,
);
const cmsMailtoHref = new RegExp(`^mailto:[A-Za-z0-9._%+-]+@${cmsHostLabel}(?:\\.${cmsHostLabel})*$`);
const cmsTelephoneHref = /^tel:\+?[0-9][0-9()-]{6,24}$/;

export function isSafeCmsHref(value: string) {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x21 || codePoint > 0x7e) return false;
  }
  if (cmsInternalHref.test(value)) return true;
  const httpMatch = cmsHttpHref.exec(value);
  if (httpMatch) {
    if (!httpMatch[1]) return true;
    const port = Number(httpMatch[1]);
    return Number.isInteger(port) && port >= 1 && port <= 65_535;
  }
  return cmsMailtoHref.test(value) || cmsTelephoneHref.test(value);
}

export const cmsHrefSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(isSafeCmsHref, "Use an approved CMS path or explicit lowercase http, https, mailto or tel link");

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

const safePlainText = z.string().trim().min(1).max(3000).refine(
  (value) => !/<\s*\/?\s*(?:script|iframe|style|link|object|embed|html)\b|javascript\s*:|data\s*:\s*text\/html/i.test(value),
  "HTML, executable URLs and embedded layout are not allowed",
);

const reusableBase = {
  entryId: uuid.optional(),
  key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  status: z.literal("draft"),
};

function jsonContent<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value) as unknown; } catch { return value; }
  }, schema);
}

export const reusableEntryInputSchema = z.discriminatedUnion("entryType", [
  z.object({ ...reusableBase, entryType: z.literal("faq"), content: jsonContent(z.object({ question: safePlainText.max(180), answer: safePlainText }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("resource"), content: jsonContent(z.object({ title: safePlainText.max(180), body: safePlainText, href: cmsHrefSchema.optional() }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("credential"), content: jsonContent(z.object({ title: safePlainText.max(180), body: safePlainText, issuer: safePlainText.max(180).optional(), verificationStatus: z.enum(["pending", "verified"]).optional() }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("testimonial"), content: jsonContent(z.object({ quote: safePlainText, attribution: safePlainText.max(180), consentConfirmed: z.literal(true) }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("pricing_note"), content: jsonContent(z.object({ title: safePlainText.max(180), body: safePlainText }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("legal_notice"), content: jsonContent(z.object({ title: safePlainText.max(180), body: z.array(safePlainText.max(1200)).min(1).max(20), effectiveDate: z.string().date().optional() }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("service"), content: jsonContent(z.object({ title: safePlainText.max(180), body: safePlainText, href: cmsHrefSchema.optional() }).strict()) }),
  z.object({ ...reusableBase, entryType: z.literal("pricing"), content: jsonContent(z.object({ title: safePlainText.max(180), duration: safePlainText.max(100), price: safePlainText.max(80), body: safePlainText }).strict()) }),
]);

export const navigationInputSchema = z.object({
  itemId: uuid.optional(),
  location: z.enum(["primary", "footer", "legal"]),
  label: z.string().trim().min(1).max(80),
  href: cmsHrefSchema,
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

export const mfaFactorInputSchema = z.object({ factorId: uuid });
export const mfaVerifyInputSchema = z.object({
  factorId: uuid,
  code: z.string().trim().regex(/^\d{6}$/),
});
export const mfaEnrolInputSchema = z.object({
  friendlyName: z.string().trim().min(1).max(60).default("Thrive CMS"),
});
export const mfaUnenrolInputSchema = mfaFactorInputSchema.extend({ confirmation: z.literal("REMOVE") });

const staffRoleSchema = z.enum(["publisher", "editor", "scheduler", "finance", "auditor"]);
export const staffInvitationInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: staffRoleSchema,
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});
export const revokeInvitationInputSchema = z.object({ invitationId: uuid });

export type PageDraftInput = z.infer<typeof pageDraftInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;
