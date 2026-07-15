import { z } from "zod";

function isSafeHref(value: string) {
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes("\\")) return false;

  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol === "http:" || url.protocol === "https:") {
    return Boolean(url.hostname) && !url.username && !url.password;
  }

  if (url.protocol === "mailto:") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname);
  }

  if (url.protocol === "tel:") {
    return /^\+?[0-9 ()-]{7,25}$/.test(url.pathname);
  }

  return false;
}

export const safeHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(isSafeHref, "Link must use a safe internal path or an approved external scheme");

function isSafeLocalImageSource(value: string) {
  if (/^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }
  if (!/^\/images\/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(avif|jpe?g|png|webp)$/i.test(value)) {
    return false;
  }

  return !value.split("/").some((segment) => segment === ".." || segment === ".");
}

export const safeImageSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(isSafeLocalImageSource, "Image must use a safe local path under /images or an approved CMS asset reference");

const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: safeHrefSchema,
});

const imageSchema = z.object({
  src: safeImageSourceSchema,
  alt: z.string().trim().min(1).max(240),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const richImageSchema = imageSchema.extend({
  caption: z.string().trim().min(1).max(240).optional(),
  position: z.enum(["centre", "top", "bottom", "left", "right"]).default("centre"),
});

const heroBlockSchema = z.object({
  blockType: z.literal("hero"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(800),
  primaryAction: linkSchema,
  secondaryAction: linkSchema.optional(),
  image: richImageSchema,
  aside: z.string().trim().min(1).max(220).optional(),
  tone: z.enum(["cream", "mist", "teal"]).default("cream"),
});

const introductionBlockSchema = z.object({
  blockType: z.literal("introduction"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  body: z.array(z.string().trim().min(1).max(1200)).min(1).max(6),
  align: z.enum(["left", "centre"]).default("left"),
});

const cardCollectionBlockSchema = z.object({
  blockType: z.literal("card_collection"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  cards: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(600),
        kicker: z.string().trim().min(1).max(80).optional(),
        link: linkSchema.optional(),
      }),
    )
    .min(1)
    .max(8),
  tone: z.enum(["cream", "mist", "white", "teal"]).default("mist"),
});

const editorialSplitBlockSchema = z.object({
  blockType: z.literal("editorial_split"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  body: z.array(z.string().trim().min(1).max(1200)).min(1).max(8),
  image: richImageSchema.optional(),
  imageSide: z.enum(["left", "right"]).default("right"),
  action: linkSchema.optional(),
  note: z.string().trim().min(1).max(500).optional(),
  tone: z.enum(["cream", "mist", "white", "teal"]).default("white"),
});

const featureListBlockSchema = z.object({
  blockType: z.literal("feature_list"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  introduction: z.string().trim().min(1).max(800).optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(700),
      }),
    )
    .min(2)
    .max(12),
  layout: z.enum(["grid", "stack", "gems"]).default("grid"),
  tone: z.enum(["cream", "mist", "white", "teal"]).default("cream"),
});

const processBlockSchema = z.object({
  blockType: z.literal("process"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  introduction: z.string().trim().min(1).max(800).optional(),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(600),
      }),
    )
    .min(2)
    .max(8),
});

const comparisonBlockSchema = z.object({
  blockType: z.literal("comparison"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  introduction: z.string().trim().min(1).max(800).optional(),
  columns: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(700),
        points: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        link: linkSchema.optional(),
      }),
    )
    .min(2)
    .max(3),
});

const pricingBlockSchema = z.object({
  blockType: z.literal("pricing"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  plans: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        duration: z.string().trim().min(1).max(100),
        price: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(600),
      }),
    )
    .min(2)
    .max(4),
  notes: z.array(z.string().trim().min(1).max(800)).min(1).max(6),
});

const faqBlockSchema = z.object({
  blockType: z.literal("faq"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  items: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(180),
        answer: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(12),
});

const noticeBlockSchema = z.object({
  blockType: z.literal("notice"),
  heading: z.string().trim().min(1).max(180),
  body: z.array(z.string().trim().min(1).max(1000)).min(1).max(5),
  tone: z.enum(["scope", "verification", "status"]).default("scope"),
});

const callToActionBlockSchema = z.object({
  blockType: z.literal("call_to_action"),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(600),
  action: linkSchema,
});

export const contentBlockSchema = z.discriminatedUnion("blockType", [
  heroBlockSchema,
  introductionBlockSchema,
  cardCollectionBlockSchema,
  editorialSplitBlockSchema,
  featureListBlockSchema,
  processBlockSchema,
  comparisonBlockSchema,
  pricingBlockSchema,
  faqBlockSchema,
  noticeBlockSchema,
  callToActionBlockSchema,
]);

export const pageSeoSchema = z.object({
  title: z.string().trim().max(70).nullable().optional(),
  description: z.string().trim().max(160).nullable().optional(),
  canonicalPath: z.string().trim().max(180).nullable().optional(),
  noIndex: z.boolean().optional(),
});

export const pageContentSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(320),
  status: z.enum(["draft", "published"]),
  seo: pageSeoSchema.optional(),
  sections: z.array(contentBlockSchema).min(1),
});

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type PageContentInput = z.input<typeof pageContentSchema>;
